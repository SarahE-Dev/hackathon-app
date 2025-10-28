import { Response, NextFunction } from 'express';
import Assessment from '../models/Assessment';
import Question from '../models/Question';
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

    if (assessment.status === AssessmentStatus.PUBLISHED) {
      throw new ApiError(400, 'Cannot update published assessment');
    }

    // Update allowed fields
    const allowedUpdates = ['title', 'description', 'sections', 'settings'];
    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        (assessment as any)[field] = updates[field];
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
