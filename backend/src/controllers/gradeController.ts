import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import Grade from '../models/Grade';
import Attempt from '../models/Attempt';
import User from '../models/User';
import { GradeStatus, AttemptStatus } from '../../../shared/src/types/common';
import { logger } from '../utils/logger';

/**
 * Get all attempts that need grading
 * For judges to see ungraded/pending attempts
 */
export const getUngradedAttempts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { status, assessmentId, page = 1, limit = 20 } = req.query;

    // Build query
    const query: any = {
      status: AttemptStatus.SUBMITTED,
    };

    if (assessmentId) {
      query.assessmentId = assessmentId;
    }

    // Find attempts that are submitted
    const attempts = await Attempt.find(query)
      .populate('userId', 'name email')
      .populate('assessmentId', 'title')
      .sort({ submittedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    // Get grading status for each attempt
    const attemptsWithGradeStatus = await Promise.all(
      attempts.map(async (attempt) => {
        const grade = await Grade.findOne({ attemptId: attempt._id });
        return {
          ...attempt.toObject(),
          gradeStatus: grade?.status || GradeStatus.PENDING,
          gradeId: grade?._id,
        };
      })
    );

    // Filter by grade status if specified
    let filteredAttempts = attemptsWithGradeStatus;
    if (status) {
      filteredAttempts = attemptsWithGradeStatus.filter(
        (a) => a.gradeStatus === status
      );
    }

    const total = await Attempt.countDocuments(query);

    res.json({
      success: true,
      data: {
        attempts: filteredAttempts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific attempt for grading
 * Includes all answers, files, and student info
 */
export const getAttemptForGrading = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { attemptId } = req.params;

    const attempt = await Attempt.findById(attemptId)
      .populate('userId', 'name email')
      .populate('assessmentId', 'title description totalPoints');

    if (!attempt) {
      throw new ApiError(404, 'Attempt not found');
    }

    // Check if attempt is submitted
    if (attempt.status !== AttemptStatus.SUBMITTED) {
      throw new ApiError(400, 'Attempt has not been submitted yet');
    }

    // Get existing grade if any
    const existingGrade = await Grade.findOne({ attemptId: attempt._id });

    res.json({
      success: true,
      data: {
        attempt,
        existingGrade,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create or update a grade
 * Judges can save drafts or submit final grades
 */
export const submitGrade = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated');
    }

    const {
      attemptId,
      questionScores,
      feedback,
      status = GradeStatus.DRAFT,
    } = req.body;

    // Validate required fields
    if (!attemptId || !questionScores || !Array.isArray(questionScores)) {
      throw new ApiError(400, 'Attempt ID and question scores are required');
    }

    // Verify attempt exists and is submitted
    const attempt = await Attempt.findById(attemptId);
    if (!attempt) {
      throw new ApiError(404, 'Attempt not found');
    }

    if (attempt.status !== AttemptStatus.SUBMITTED) {
      throw new ApiError(400, 'Attempt has not been submitted yet');
    }

    // Calculate overall score
    const overallScore = questionScores.reduce(
      (sum, qs) => sum + qs.points,
      0
    );
    const maxScore = questionScores.reduce(
      (sum, qs) => sum + qs.maxPoints,
      0
    );

    // Check if grade already exists
    const existingGrade = await Grade.findOne({ attemptId });

    let grade;
    if (existingGrade) {
      // Update existing grade
      existingGrade.questionScores = questionScores;
      existingGrade.overallScore = overallScore;
      existingGrade.maxScore = maxScore;
      existingGrade.feedback = feedback;
      existingGrade.status = status;
      existingGrade.graderId = req.user.id;

      if (status === GradeStatus.SUBMITTED) {
        existingGrade.gradedAt = new Date();
      }

      grade = await existingGrade.save();
    } else {
      // Create new grade
      grade = new Grade({
        attemptId,
        graderId: req.user.id,
        questionScores,
        overallScore,
        maxScore,
        feedback,
        status,
        gradedAt: status === GradeStatus.SUBMITTED ? new Date() : undefined,
      });

      await grade.save();
    }

    // Update attempt with score if grade is submitted
    if (status === GradeStatus.SUBMITTED) {
      attempt.score = overallScore;
      attempt.maxScore = maxScore;
      await attempt.save();
    }

    logger.info(
      `Grade ${existingGrade ? 'updated' : 'created'} for attempt ${attemptId} by judge ${req.user.id}`
    );

    res.json({
      success: true,
      data: grade,
      message: `Grade ${status === GradeStatus.SUBMITTED ? 'submitted' : 'saved as draft'} successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a grade by attempt ID
 */
export const getGradeByAttemptId = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { attemptId } = req.params;

    const grade = await Grade.findOne({ attemptId })
      .populate('graderId', 'name email')
      .populate({
        path: 'attemptId',
        populate: [
          { path: 'userId', select: 'name email' },
          { path: 'assessmentId', select: 'title' },
        ],
      });

    if (!grade) {
      throw new ApiError(404, 'Grade not found');
    }

    // Check access: student can only see released grades, judges/admins can see all
    const attempt = await Attempt.findById(attemptId);
    if (!attempt) {
      throw new ApiError(404, 'Attempt not found');
    }

    const isStudent = attempt.userId.toString() === req.user.id;
    const isJudgeOrAdmin = ['judge', 'admin', 'proctor'].includes(req.user.role);

    if (isStudent && grade.status !== GradeStatus.RELEASED) {
      throw new ApiError(403, 'Grade has not been released yet');
    }

    if (!isStudent && !isJudgeOrAdmin) {
      throw new ApiError(403, 'Access denied');
    }

    res.json({
      success: true,
      data: grade,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Release a grade to student
 * Changes status from SUBMITTED to RELEASED
 */
export const releaseGrade = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { gradeId } = req.params;

    const grade = await Grade.findById(gradeId);
    if (!grade) {
      throw new ApiError(404, 'Grade not found');
    }

    if (grade.status !== GradeStatus.SUBMITTED) {
      throw new ApiError(400, 'Grade must be submitted before releasing');
    }

    grade.status = GradeStatus.RELEASED;
    grade.releasedAt = new Date();
    await grade.save();

    logger.info(`Grade ${gradeId} released by ${req.user.id}`);

    res.json({
      success: true,
      data: grade,
      message: 'Grade released successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all grades by a specific judge
 */
export const getGradesByJudge = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { judgeId } = req.params;
    const { page = 1, limit = 20, status } = req.query;

    // Check access: judges can see their own, admins can see all
    if (req.user.role !== 'admin' && req.user.id !== judgeId) {
      throw new ApiError(403, 'Access denied');
    }

    const query: any = { graderId: judgeId };
    if (status) {
      query.status = status;
    }

    const grades = await Grade.find(query)
      .populate('graderId', 'name email')
      .populate({
        path: 'attemptId',
        populate: [
          { path: 'userId', select: 'name email' },
          { path: 'assessmentId', select: 'title' },
        ],
      })
      .sort({ updatedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Grade.countDocuments(query);

    res.json({
      success: true,
      data: {
        grades,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a grade (admin only)
 */
export const deleteGrade = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { gradeId } = req.params;

    const grade = await Grade.findByIdAndDelete(gradeId);
    if (!grade) {
      throw new ApiError(404, 'Grade not found');
    }

    logger.info(`Grade ${gradeId} deleted by admin ${req.user.id}`);

    res.json({
      success: true,
      message: 'Grade deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get grading statistics
 * For admins to see overview of grading progress
 */
export const getGradingStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { assessmentId } = req.query;

    // Get all submitted attempts
    const query: any = { status: AttemptStatus.SUBMITTED };
    if (assessmentId) {
      query.assessmentId = assessmentId;
    }

    const totalSubmitted = await Attempt.countDocuments(query);

    // Get grade counts by status
    const gradeQuery: any = {};
    if (assessmentId) {
      const attempts = await Attempt.find(query).select('_id');
      gradeQuery.attemptId = { $in: attempts.map((a) => a._id) };
    }

    const [pending, draft, submitted, released] = await Promise.all([
      Grade.countDocuments({ ...gradeQuery, status: GradeStatus.PENDING }),
      Grade.countDocuments({ ...gradeQuery, status: GradeStatus.DRAFT }),
      Grade.countDocuments({ ...gradeQuery, status: GradeStatus.SUBMITTED }),
      Grade.countDocuments({ ...gradeQuery, status: GradeStatus.RELEASED }),
    ]);

    // Pending = submitted attempts without grades
    const actualPending = totalSubmitted - (draft + submitted + released);

    res.json({
      success: true,
      data: {
        totalSubmitted,
        pending: actualPending,
        draft,
        submitted,
        released,
        gradingProgress: totalSubmitted > 0 ? ((submitted + released) / totalSubmitted) * 100 : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
