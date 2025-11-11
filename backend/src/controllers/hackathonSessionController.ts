import { Response, NextFunction } from 'express';
import HackathonSession from '../models/HackathonSession';
import TeamSession from '../models/TeamSession';
import Team from '../models/Team';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

/**
 * Create a new hackathon session
 */
export const createSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const sessionData = req.body;

    const session = new HackathonSession({
      ...sessionData,
      createdBy: userId,
    });

    await session.save();

    logger.info(`Hackathon session created: ${session._id} by user ${userId}`);

    res.status(201).json({
      success: true,
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all hackathon sessions
 */
export const getAllSessions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status, organizationId } = req.query;

    const filter: any = {};
    if (status) filter.status = status;
    if (organizationId) filter.organizationId = organizationId;

    const sessions = await HackathonSession.find(filter)
      .populate('teams', 'name memberIds')
      .populate('createdBy', 'firstName lastName email')
      .sort({ startTime: -1 });

    res.json({
      success: true,
      data: { sessions },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get session by ID
 */
export const getSessionById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const session = await HackathonSession.findById(id)
      .populate('teams', 'name memberIds projectTitle')
      .populate('createdBy', 'firstName lastName email')
      .populate('problems.problemId');

    if (!session) {
      throw new ApiError(404, 'Hackathon session not found');
    }

    res.json({
      success: true,
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update hackathon session
 */
export const updateSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const session = await HackathonSession.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!session) {
      throw new ApiError(404, 'Hackathon session not found');
    }

    logger.info(`Hackathon session updated: ${id}`);

    res.json({
      success: true,
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Start hackathon session
 */
export const startSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const session = await HackathonSession.findById(id);

    if (!session) {
      throw new ApiError(404, 'Hackathon session not found');
    }

    if (session.status !== 'scheduled') {
      throw new ApiError(400, 'Session can only be started from scheduled status');
    }

    session.status = 'active';
    session.isActive = true;
    session.startedAt = new Date();

    await session.save();

    // Initialize team sessions for all registered teams
    for (const teamId of session.teams) {
      const existingTeamSession = await TeamSession.findOne({
        sessionId: session._id,
        teamId,
      });

      if (!existingTeamSession) {
        const teamSession = new TeamSession({
          sessionId: session._id,
          teamId,
          maxScore: session.problems.reduce((sum, p) => sum + p.points, 0),
          problemProgress: session.problems.map(p => ({
            problemId: p.problemId,
            status: 'not-started',
            code: '',
            language: 'python',
            testResults: [],
            passedTests: 0,
            totalTests: 0,
            score: 0,
          })),
        });

        await teamSession.save();
      }
    }

    logger.info(`Hackathon session started: ${id}`);

    res.json({
      success: true,
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Pause hackathon session
 */
export const pauseSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const session = await HackathonSession.findById(id);

    if (!session) {
      throw new ApiError(404, 'Hackathon session not found');
    }

    if (session.status !== 'active') {
      throw new ApiError(400, 'Only active sessions can be paused');
    }

    session.status = 'paused';
    await session.save();

    // Pause all team sessions
    await TeamSession.updateMany(
      { sessionId: id, status: 'in-progress' },
      {
        $set: {
          isPaused: true,
          pausedAt: new Date(),
          pauseReason: reason || 'Session paused by proctor',
        },
        $push: {
          events: {
            type: 'pause',
            timestamp: new Date(),
            details: reason || 'Session paused by proctor',
            severity: 'medium',
          },
        },
      }
    );

    logger.info(`Hackathon session paused: ${id}`);

    res.json({
      success: true,
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resume hackathon session
 */
export const resumeSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const session = await HackathonSession.findById(id);

    if (!session) {
      throw new ApiError(404, 'Hackathon session not found');
    }

    if (session.status !== 'paused') {
      throw new ApiError(400, 'Only paused sessions can be resumed');
    }

    session.status = 'active';
    await session.save();

    // Resume all team sessions
    await TeamSession.updateMany(
      { sessionId: id, isPaused: true },
      {
        $set: {
          isPaused: false,
          pausedAt: null,
          pauseReason: null,
        },
        $push: {
          events: {
            type: 'resume',
            timestamp: new Date(),
            details: 'Session resumed by proctor',
            severity: 'low',
          },
        },
      }
    );

    logger.info(`Hackathon session resumed: ${id}`);

    res.json({
      success: true,
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete hackathon session
 */
export const completeSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const session = await HackathonSession.findById(id);

    if (!session) {
      throw new ApiError(404, 'Hackathon session not found');
    }

    session.status = 'completed';
    session.isActive = false;
    session.completedAt = new Date();

    await session.save();

    // Auto-submit all in-progress team sessions
    await TeamSession.updateMany(
      { sessionId: id, status: 'in-progress' },
      {
        $set: {
          status: 'submitted',
          submittedAt: new Date(),
        },
      }
    );

    logger.info(`Hackathon session completed: ${id}`);

    res.json({
      success: true,
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get session leaderboard
 */
export const getSessionLeaderboard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const session = await HackathonSession.findById(id);

    if (!session) {
      throw new ApiError(404, 'Hackathon session not found');
    }

    const teamSessions = await TeamSession.find({ sessionId: id })
      .populate('teamId', 'name memberIds')
      .sort({ totalScore: -1, submittedAt: 1 });

    const leaderboard = teamSessions.map((ts, index) => ({
      rank: index + 1,
      teamId: ts.teamId,
      teamName: (ts.teamId as any).name,
      totalScore: ts.totalScore,
      maxScore: ts.maxScore,
      problemsSolved: ts.problemProgress.filter(p => p.status === 'passed').length,
      totalProblems: ts.problemProgress.length,
      submittedAt: ts.submittedAt,
      incidentCount: ts.tabSwitchCount + ts.copyPasteCount + ts.fullscreenExitCount,
    }));

    res.json({
      success: true,
      data: { leaderboard },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete hackathon session
 */
export const deleteSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const session = await HackathonSession.findByIdAndDelete(id);

    if (!session) {
      throw new ApiError(404, 'Hackathon session not found');
    }

    // Delete associated team sessions
    await TeamSession.deleteMany({ sessionId: id });

    logger.info(`Hackathon session deleted: ${id}`);

    res.json({
      success: true,
      message: 'Hackathon session deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
