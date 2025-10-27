import { Response, NextFunction } from 'express';
import Session from '../models/Session';
import Assessment from '../models/Assessment';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export const getAllSessions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId, isActive, page = 1, limit = 50 } = req.query;

    const query: any = {};

    if (organizationId) {
      query.organizationId = organizationId;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [sessions, total] = await Promise.all([
      Session.find(query)
        .populate('assessmentId', 'title description')
        .populate('organizationId', 'name')
        .skip(skip)
        .limit(Number(limit))
        .sort({ windowStart: -1 }),
      Session.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        sessions,
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

export const getSessionById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const session = await Session.findById(id)
      .populate('assessmentId')
      .populate('organizationId', 'name');

    if (!session) {
      throw new ApiError(404, 'Session not found');
    }

    res.json({
      success: true,
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

export const createSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      assessmentId,
      organizationId,
      cohortId,
      title,
      windowStart,
      windowEnd,
      policies,
      accommodations,
    } = req.body;

    // Validate assessment exists and is published
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      throw new ApiError(404, 'Assessment not found');
    }

    if (assessment.status !== 'published') {
      throw new ApiError(400, 'Can only create sessions for published assessments');
    }

    // Validate dates
    const start = new Date(windowStart);
    const end = new Date(windowEnd);

    if (start >= end) {
      throw new ApiError(400, 'Window end must be after window start');
    }

    const session = new Session({
      assessmentId,
      organizationId,
      cohortId,
      title: title || assessment.title,
      windowStart: start,
      windowEnd: end,
      policies: policies || {
        allowLateSubmission: false,
        autoStartOnJoin: false,
        showLeaderboard: false,
      },
      accommodations: accommodations || [],
      isActive: true,
    });

    await session.save();

    logger.info(`Session created: ${session._id} for assessment ${assessmentId}`);

    res.status(201).json({
      success: true,
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

export const updateSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const session = await Session.findById(id);

    if (!session) {
      throw new ApiError(404, 'Session not found');
    }

    // Update allowed fields
    const allowedUpdates = ['title', 'windowStart', 'windowEnd', 'policies', 'accommodations', 'isActive'];
    allowedUpdates.forEach((field) => {
      if (updates[field] !== undefined) {
        (session as any)[field] = updates[field];
      }
    });

    await session.save();

    res.json({
      success: true,
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

export const pauseSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const session = await Session.findById(id);

    if (!session) {
      throw new ApiError(404, 'Session not found');
    }

    session.isActive = false;
    await session.save();

    logger.info(`Session paused: ${session._id}`);

    res.json({
      success: true,
      data: { session, message: 'Session paused' },
    });
  } catch (error) {
    next(error);
  }
};

export const resumeSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const session = await Session.findById(id);

    if (!session) {
      throw new ApiError(404, 'Session not found');
    }

    session.isActive = true;
    await session.save();

    logger.info(`Session resumed: ${session._id}`);

    res.json({
      success: true,
      data: { session, message: 'Session resumed' },
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveSessionsForUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const now = new Date();

    // Find active sessions that the user can access
    const sessions = await Session.find({
      isActive: true,
      windowStart: { $lte: now },
      windowEnd: { $gte: now },
    })
      .populate('assessmentId', 'title description')
      .sort({ windowStart: 1 });

    res.json({
      success: true,
      data: { sessions },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const session = await Session.findByIdAndDelete(id);

    if (!session) {
      throw new ApiError(404, 'Session not found');
    }

    logger.info(`Session deleted: ${id}`);

    res.json({
      success: true,
      data: { message: 'Session deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
};
