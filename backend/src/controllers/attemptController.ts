import { Response, NextFunction } from 'express';
import Attempt from '../models/Attempt';
import Session from '../models/Session';
import Assessment from '../models/Assessment';
import Question from '../models/Question';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { AttemptStatus } from '../../../shared/src/types/common';
import AutoGradingService from '../services/autoGradingService';

export const startAttempt = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { assessmentId, sessionId } = req.body;
    const userId = req.user!.userId;

    let assessment: any;

    // If sessionId is provided, use session-based approach
    if (sessionId) {
      // Get session
      const session = await Session.findById(sessionId).populate('assessmentId');
      if (!session) {
        throw new ApiError(404, 'Session not found');
      }

      if (!session.isActive) {
        throw new ApiError(400, 'Session is not active');
      }

      // Check if session is within time window
      const now = new Date();
      if (now < session.windowStart) {
        throw new ApiError(400, 'Session has not started yet');
      }

      if (now > session.windowEnd && !session.policies.allowLateSubmission) {
        throw new ApiError(400, 'Session has ended');
      }

      assessment = session.assessmentId as any;

      // Check if user already has an attempt for this session
      const existingAttempt = await Attempt.findOne({
        sessionId,
        userId,
      });

      if (existingAttempt) {
        // If not submitted, return existing attempt (resume)
        if (existingAttempt.status === AttemptStatus.IN_PROGRESS) {
          return res.json({
            success: true,
            data: { attempt: existingAttempt, resumed: true },
          });
        }

        // Check attempts allowed
        const attemptCount = await Attempt.countDocuments({
          sessionId,
          userId,
          status: { $in: [AttemptStatus.SUBMITTED, AttemptStatus.GRADED] },
        });

        if (attemptCount >= assessment.settings.attemptsAllowed) {
          throw new ApiError(400, 'Maximum attempts reached for this assessment');
        }
      }
    } else if (assessmentId) {
      // Direct assessment attempt (no session required)
      assessment = await Assessment.findById(assessmentId);
      if (!assessment) {
        throw new ApiError(404, 'Assessment not found');
      }

      // Check if user already has an in-progress attempt
      const existingAttempt = await Attempt.findOne({
        assessmentId,
        userId,
        status: AttemptStatus.IN_PROGRESS,
      });

      if (existingAttempt) {
        // Return existing attempt (resume)
        return res.json({
          success: true,
          data: { attempt: existingAttempt, resumed: true },
        });
      }
    } else {
      throw new ApiError(400, 'Either assessmentId or sessionId is required');
    }

    // Get all questions for the assessment
    const questionIds = assessment.sections?.flatMap((section: any) => section.questionIds) || [];
    const questions = await Question.find({ _id: { $in: questionIds } });

    // Create assessment snapshot
    const assessmentSnapshot = {
      ...assessment.toObject(),
      questions: questions.map((q) => q.toObject()),
    };

    // Create attempt
    const attempt = new Attempt({
      sessionId: sessionId || null,
      userId,
      assessmentId: assessment._id,
      assessmentSnapshot,
      startedAt: new Date(),
      timeSpent: 0,
      answers: [],
      files: [],
      events: [
        {
          type: 'attempt-started',
          timestamp: new Date(),
          metadata: {},
        },
      ],
      status: AttemptStatus.IN_PROGRESS,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    await attempt.save();

    logger.info(`Attempt started: ${attempt._id} by user ${userId}`);

    res.status(201).json({
      success: true,
      data: {
        id: attempt._id,
        attempt,
        timeMultiplier: 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAttempt = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const attempt = await Attempt.findById(id);

    if (!attempt) {
      throw new ApiError(404, 'Attempt not found');
    }

    // Check ownership (or if user is admin/proctor)
    if (attempt.userId.toString() !== userId) {
      const userRoles = req.user!.roles.map((r: any) => r.role);
      if (!userRoles.includes('admin') && !userRoles.includes('proctor')) {
        throw new ApiError(403, 'Access denied to this attempt');
      }
    }

    res.json({
      success: true,
      data: { attempt },
    });
  } catch (error) {
    next(error);
  }
};

export const saveAnswer = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { questionId, answer, timeSpent } = req.body;
    const userId = req.user!.userId;

    const attempt = await Attempt.findById(id);

    if (!attempt) {
      throw new ApiError(404, 'Attempt not found');
    }

    // Check ownership
    if (attempt.userId.toString() !== userId) {
      throw new ApiError(403, 'Access denied to this attempt');
    }

    // Check if already submitted
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new ApiError(400, 'Cannot modify a submitted attempt');
    }

    // Find existing answer or create new one
    const existingAnswerIndex = attempt.answers.findIndex(
      (a) => a.questionId.toString() === questionId
    );

    const answerData = {
      questionId,
      answer,
      timestamp: new Date(),
      timeSpent: timeSpent || 0,
      version: existingAnswerIndex >= 0 ? attempt.answers[existingAnswerIndex].version + 1 : 1,
    };

    if (existingAnswerIndex >= 0) {
      attempt.answers[existingAnswerIndex] = answerData;
    } else {
      attempt.answers.push(answerData);
    }

    // Add event
    attempt.events.push({
      type: 'answer-saved',
      timestamp: new Date(),
      metadata: { questionId },
    });

    await attempt.save();

    res.json({
      success: true,
      data: { attempt, message: 'Answer saved' },
    });
  } catch (error) {
    next(error);
  }
};

export const submitAttempt = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const attempt = await Attempt.findById(id);

    if (!attempt) {
      throw new ApiError(404, 'Attempt not found');
    }

    // Check ownership
    if (attempt.userId.toString() !== userId) {
      throw new ApiError(403, 'Access denied to this attempt');
    }

    // Check if already submitted (idempotent)
    if (attempt.status === AttemptStatus.SUBMITTED || attempt.status === AttemptStatus.GRADED) {
      return res.json({
        success: true,
        data: { attempt, message: 'Attempt already submitted' },
      });
    }

    // Calculate time spent
    const startTime = attempt.startedAt!.getTime();
    const endTime = Date.now();
    attempt.timeSpent = Math.floor((endTime - startTime) / 1000); // in seconds

    // Update status
    attempt.submittedAt = new Date();
    attempt.status = AttemptStatus.SUBMITTED;

    // Add event
    attempt.events.push({
      type: 'attempt-submitted',
      timestamp: new Date(),
      metadata: { timeSpent: attempt.timeSpent },
    });

    await attempt.save();

    logger.info(`Attempt submitted: ${attempt._id} by user ${userId}`);

    // Trigger auto-grading asynchronously (don't wait for it to complete)
    AutoGradingService.gradeAttemptPartial(attempt._id.toString())
      .then(() => {
        logger.info(`Auto-grading completed for attempt ${attempt._id}`);
      })
      .catch((error) => {
        logger.error(`Auto-grading failed for attempt ${attempt._id}:`, error);
      });

    res.json({
      success: true,
      data: { attempt, message: 'Attempt submitted successfully. Auto-grading in progress.' },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyAttempts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const { sessionId, status } = req.query;

    const query: any = { userId };

    if (sessionId) {
      query.sessionId = sessionId;
    }

    if (status) {
      query.status = status;
    }

    const attempts = await Attempt.find(query)
      .populate('sessionId')
      .populate('assessmentId', 'title')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { attempts },
    });
  } catch (error) {
    next(error);
  }
};

export const addProctorEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { type, metadata } = req.body;
    const userId = req.user!.userId;

    const attempt = await Attempt.findById(id);

    if (!attempt) {
      throw new ApiError(404, 'Attempt not found');
    }

    // Check ownership
    if (attempt.userId.toString() !== userId) {
      throw new ApiError(403, 'Access denied to this attempt');
    }

    // Add event
    attempt.events.push({
      type,
      timestamp: new Date(),
      metadata: metadata || {},
    });

    await attempt.save();

    res.json({
      success: true,
      data: { message: 'Event recorded' },
    });
  } catch (error) {
    next(error);
  }
};

export const uploadFile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { questionId, fileName, fileUrl, fileSize, mimeType } = req.body;
    const userId = req.user!.userId;

    const attempt = await Attempt.findById(id);

    if (!attempt) {
      throw new ApiError(404, 'Attempt not found');
    }

    // Check ownership
    if (attempt.userId.toString() !== userId) {
      throw new ApiError(403, 'Access denied to this attempt');
    }

    // Check if already submitted
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new ApiError(400, 'Cannot upload files to a submitted attempt');
    }

    // Add file
    attempt.files.push({
      questionId,
      fileName,
      fileUrl,
      fileSize,
      mimeType,
      uploadedAt: new Date(),
    });

    // Add event
    attempt.events.push({
      type: 'file-uploaded',
      timestamp: new Date(),
      metadata: { questionId, fileName },
    });

    await attempt.save();

    res.json({
      success: true,
      data: { attempt, message: 'File uploaded' },
    });
  } catch (error) {
    next(error);
  }
};
