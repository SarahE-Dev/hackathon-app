import { Response, NextFunction } from 'express';
import Question from '../models/Question';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { AssessmentStatus } from '../../../shared/src/types/common';

export const getAllQuestions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      organizationId,
      type,
      difficulty,
      tags,
      status = AssessmentStatus.PUBLISHED,
      page = 1,
      limit = 50,
    } = req.query;

    const query: any = {};

    if (organizationId) {
      query.organizationId = organizationId;
    }

    if (type) {
      query.type = type;
    }

    if (difficulty) {
      query.difficulty = difficulty;
    }

    if (tags) {
      const tagArray = typeof tags === 'string' ? tags.split(',') : tags;
      query.tags = { $in: tagArray };
    }

    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [questions, total] = await Promise.all([
      Question.find(query)
        .populate('authorId', 'firstName lastName email')
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      Question.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        questions,
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

export const getQuestionById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const question = await Question.findById(id).populate('authorId', 'firstName lastName email');

    if (!question) {
      throw new ApiError(404, 'Question not found');
    }

    res.json({
      success: true,
      data: { question },
    });
  } catch (error) {
    next(error);
  }
};

export const createQuestion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { type, title, content, tags, difficulty, organizationId, points } = req.body;

    if (!type || !title || !content || !organizationId || points === undefined) {
      throw new ApiError(400, 'Missing required fields');
    }

    const question = new Question({
      type,
      title,
      content,
      tags: tags || [],
      difficulty,
      organizationId,
      authorId: req.user!.userId,
      points,
      version: 1,
      status: AssessmentStatus.DRAFT,
    });

    await question.save();

    res.status(201).json({
      success: true,
      data: { question },
    });
  } catch (error) {
    next(error);
  }
};

export const updateQuestion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const question = await Question.findById(id);

    if (!question) {
      throw new ApiError(404, 'Question not found');
    }

    // Don't allow updates to published questions (create new version instead)
    if (question.status === AssessmentStatus.PUBLISHED) {
      throw new ApiError(400, 'Cannot update published question. Create a new version instead.');
    }

    // Update allowed fields
    const allowedUpdates = ['title', 'content', 'tags', 'difficulty', 'points'];
    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        (question as any)[field] = updates[field];
      }
    });

    await question.save();

    res.json({
      success: true,
      data: { question },
    });
  } catch (error) {
    next(error);
  }
};

export const publishQuestion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const question = await Question.findById(id);

    if (!question) {
      throw new ApiError(404, 'Question not found');
    }

    if (question.status === AssessmentStatus.PUBLISHED) {
      throw new ApiError(400, 'Question is already published');
    }

    question.status = AssessmentStatus.PUBLISHED;
    await question.save();

    res.json({
      success: true,
      data: { question },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteQuestion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const question = await Question.findById(id);

    if (!question) {
      throw new ApiError(404, 'Question not found');
    }

    // Don't allow deletion of published questions
    if (question.status === AssessmentStatus.PUBLISHED) {
      throw new ApiError(400, 'Cannot delete published question. Archive it instead.');
    }

    await Question.findByIdAndDelete(id);

    res.json({
      success: true,
      data: {
        message: 'Question deleted successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const archiveQuestion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const question = await Question.findById(id);

    if (!question) {
      throw new ApiError(404, 'Question not found');
    }

    question.status = AssessmentStatus.ARCHIVED;
    await question.save();

    res.json({
      success: true,
      data: { question },
    });
  } catch (error) {
    next(error);
  }
};

export const duplicateQuestion = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const originalQuestion = await Question.findById(id);

    if (!originalQuestion) {
      throw new ApiError(404, 'Question not found');
    }

    const duplicate = new Question({
      type: originalQuestion.type,
      title: `${originalQuestion.title} (Copy)`,
      content: originalQuestion.content,
      tags: originalQuestion.tags,
      difficulty: originalQuestion.difficulty,
      organizationId: originalQuestion.organizationId,
      authorId: req.user!.userId,
      points: originalQuestion.points,
      version: 1,
      status: AssessmentStatus.DRAFT,
    });

    await duplicate.save();

    res.status(201).json({
      success: true,
      data: { question: duplicate },
    });
  } catch (error) {
    next(error);
  }
};
