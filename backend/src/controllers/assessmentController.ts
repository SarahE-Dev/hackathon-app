import { Response, NextFunction } from 'express';
import Assessment from '../models/Assessment';
import Question from '../models/Question';
import Attempt from '../models/Attempt';
import Grade from '../models/Grade';
import User from '../models/User';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { AssessmentStatus } from '../../../shared/src/types/common';

export const getAllAssessments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId, status, page = 1, limit = 50 } = req.query;

    const query: any = {};

    if (organizationId) {
      query.organizationId = organizationId;
    } else {
      // If no organizationId is specified, only show published assessments
      // OR assessments created by the current user
      query.$or = [
        { status: AssessmentStatus.PUBLISHED },
        { authorId: req.user!.userId }
      ];
    }

    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [assessments, total] = await Promise.all([
      Assessment.find(query)
        .populate('authorId', 'firstName lastName email')
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      Assessment.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        assessments,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAssessmentById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const assessment = await Assessment.findById(id)
      .populate('authorId', 'firstName lastName email')
      .populate('sections.questionIds');

    if (!assessment) {
      throw new ApiError(404, 'Assessment not found');
    }

    res.json({
      success: true,
      data: { assessment },
    });
  } catch (error) {
    next(error);
  }
};

export const createAssessment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { title, description, organizationId, sections, settings } = req.body;

    if (!title || !organizationId || !settings) {
      throw new ApiError(400, 'Missing required fields');
    }

    const assessment = new Assessment({
      title,
      description,
      organizationId,
      authorId: req.user!.userId,
      sections: sections || [],
      settings,
      status: AssessmentStatus.DRAFT,
    });

    await assessment.save();

    res.status(201).json({
      success: true,
      data: { assessment },
    });
  } catch (error) {
    next(error);
  }
};

export const updateAssessment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const assessment = await Assessment.findById(id);

    if (!assessment) {
      throw new ApiError(404, 'Assessment not found');
    }

    // Allow status changes (archive/unarchive) even for published assessments
    // But block other updates to published assessments
    const isOnlyStatusUpdate = Object.keys(updates).length === 1 && updates.status !== undefined;
    
    if (assessment.status === AssessmentStatus.PUBLISHED && !isOnlyStatusUpdate) {
      throw new ApiError(400, 'Cannot update published assessment (except status)');
    }

    // Update allowed fields - include status for archiving
    const allowedUpdates = ['title', 'description', 'sections', 'settings', 'status'];
    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        // Special handling for sections - convert populated question objects back to ObjectIds
        if (field === 'sections' && Array.isArray(updates[field])) {
          (assessment as any)[field] = updates[field].map((section: any) => ({
            ...section,
            questionIds: (section.questionIds || []).map((q: any) => 
              typeof q === 'object' ? (q._id || q.id) : q
            ),
          }));
        } else {
          (assessment as any)[field] = updates[field];
        }
      }
    });

    await assessment.save();

    res.json({
      success: true,
      data: { assessment },
    });
  } catch (error) {
    next(error);
  }
};

export const publishAssessment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const assessment = await Assessment.findById(id).populate('sections.questionIds');

    if (!assessment) {
      throw new ApiError(404, 'Assessment not found');
    }

    if (assessment.status === AssessmentStatus.PUBLISHED) {
      throw new ApiError(400, 'Assessment is already published');
    }

    // Validate that all questions exist and are published
    const allQuestionIds = assessment.sections.flatMap((section) => section.questionIds);
    const questions = await Question.find({ _id: { $in: allQuestionIds } });

    if (questions.length !== allQuestionIds.length) {
      throw new ApiError(400, 'Some questions in this assessment do not exist');
    }

    const unpublishedQuestions = questions.filter(
      (q) => q.status !== AssessmentStatus.PUBLISHED
    );

    if (unpublishedQuestions.length > 0) {
      throw new ApiError(
        400,
        'All questions must be published before publishing the assessment'
      );
    }

    // Create immutable snapshot
    assessment.publishedSnapshot = {
      version: 1,
      assessment: assessment.toObject(),
      questions: questions.map((q) => q.toObject()),
      publishedAt: new Date(),
      publishedBy: req.user!.userId as any,
    };

    assessment.status = AssessmentStatus.PUBLISHED;
    assessment.publishedAt = new Date();

    await assessment.save();

    res.json({
      success: true,
      data: { assessment },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAssessment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const assessment = await Assessment.findById(id);

    if (!assessment) {
      throw new ApiError(404, 'Assessment not found');
    }

    if (assessment.status === AssessmentStatus.PUBLISHED) {
      throw new ApiError(400, 'Cannot delete published assessment. Archive it instead.');
    }

    await Assessment.findByIdAndDelete(id);

    res.json({
      success: true,
      data: {
        message: 'Assessment deleted successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAssessmentLeaderboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { limit = 100 } = req.query;

    const assessment = await Assessment.findById(id);

    if (!assessment) {
      throw new ApiError(404, 'Assessment not found');
    }

    // Get all submitted attempts for this assessment
    const attempts = await Attempt.find({
      assessmentId: id,
      status: { $in: ['submitted', 'graded'] },
    })
      .populate('userId', 'firstName lastName email')
      .sort({ submittedAt: -1 });

    // Get grades for these attempts
    const attemptIds = attempts.map((a) => a._id);
    const grades = await Grade.find({
      attemptId: { $in: attemptIds },
    });

    // Build leaderboard entries
    const leaderboardMap = new Map();

    for (const attempt of attempts) {
      const userId = (attempt.userId as any)._id.toString();

      // Skip if we already have a better attempt for this user
      if (leaderboardMap.has(userId)) {
        const existing = leaderboardMap.get(userId);
        const grade = grades.find((g) => g.attemptId.toString() === (attempt._id as any).toString());
        const currentScore = grade?.overallScore || 0;

        if (currentScore <= existing.score) {
          continue;
        }
      }

      const grade = grades.find((g) => g.attemptId.toString() === (attempt._id as any).toString());
      const totalScore = grade?.overallScore || 0;
      const maxScore = grade?.maxScore || assessment.totalPoints || 0;
      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

      leaderboardMap.set(userId, {
        userId,
        firstName: (attempt.userId as any).firstName,
        lastName: (attempt.userId as any).lastName,
        email: (attempt.userId as any).email,
        score: totalScore,
        maxScore,
        percentage: Math.round(percentage * 100) / 100,
        attemptId: attempt._id,
        submittedAt: attempt.submittedAt,
        timeTaken: attempt.submittedAt && attempt.startedAt
          ? Math.round((new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000)
          : null,
      });
    }

    // Convert to array and sort by score (descending), then by time taken (ascending)
    const leaderboard = Array.from(leaderboardMap.values())
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        // If scores are equal, sort by time taken (faster is better)
        if (a.timeTaken !== null && b.timeTaken !== null) {
          return a.timeTaken - b.timeTaken;
        }
        return 0;
      })
      .slice(0, Number(limit))
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    res.json({
      success: true,
      data: {
        leaderboard,
        assessmentTitle: assessment.title,
        totalParticipants: leaderboardMap.size,
      },
    });
  } catch (error) {
    next(error);
  }
};
