import { Response, NextFunction } from 'express';
import TeamSession from '../models/TeamSession';
import HackathonSession from '../models/HackathonSession';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

/**
 * Join/start a team session
 */
export const joinSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId, teamId } = req.body;
    const userId = req.user!.userId;

    const hackathonSession = await HackathonSession.findById(sessionId);

    if (!hackathonSession) {
      throw new ApiError(404, 'Hackathon session not found');
    }

    if (!hackathonSession.isActive) {
      throw new ApiError(400, 'Hackathon session is not active');
    }

    let teamSession = await TeamSession.findOne({ sessionId, teamId });

    if (!teamSession) {
      throw new ApiError(404, 'Team not registered for this session');
    }

    // Start the session if not started
    if (teamSession.status === 'not-started') {
      teamSession.status = 'in-progress';
      teamSession.startedAt = new Date();
      teamSession.ipAddress = req.ip;
      teamSession.userAgent = req.headers['user-agent'];

      teamSession.events.push({
        type: 'session-started',
        timestamp: new Date(),
        userId,
        details: 'Team started hackathon session',
        severity: 'low',
      } as any);
    }

    await teamSession.save();

    // Populate problem details
    await teamSession.populate('problemProgress.problemId');

    res.json({
      success: true,
      data: { teamSession },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get team session details
 */
export const getTeamSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId, teamId } = req.params;

    const teamSession = await TeamSession.findOne({ sessionId, teamId })
      .populate('sessionId')
      .populate('teamId', 'name memberIds')
      .populate('problemProgress.problemId');

    if (!teamSession) {
      throw new ApiError(404, 'Team session not found');
    }

    res.json({
      success: true,
      data: { teamSession },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update problem progress (save code)
 */
export const updateProblemProgress = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId, teamId } = req.params;
    const { problemId, code, language } = req.body;

    const teamSession = await TeamSession.findOne({ sessionId, teamId });

    if (!teamSession) {
      throw new ApiError(404, 'Team session not found');
    }

    if (teamSession.isPaused) {
      throw new ApiError(400, 'Session is paused');
    }

    const problemIndex = teamSession.problemProgress.findIndex(
      p => p.problemId.toString() === problemId
    );

    if (problemIndex === -1) {
      throw new ApiError(404, 'Problem not found in session');
    }

    teamSession.problemProgress[problemIndex].code = code;
    teamSession.problemProgress[problemIndex].language = language;

    if (teamSession.problemProgress[problemIndex].status === 'not-started') {
      teamSession.problemProgress[problemIndex].status = 'in-progress';
    }

    await teamSession.save();

    res.json({
      success: true,
      data: { problemProgress: teamSession.problemProgress[problemIndex] },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit problem solution
 */
export const submitProblem = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId, teamId } = req.params;
    const { problemId, testResults } = req.body;

    const teamSession = await TeamSession.findOne({ sessionId, teamId });

    if (!teamSession) {
      throw new ApiError(404, 'Team session not found');
    }

    const problemIndex = teamSession.problemProgress.findIndex(
      p => p.problemId.toString() === problemId
    );

    if (problemIndex === -1) {
      throw new ApiError(404, 'Problem not found in session');
    }

    const problem = teamSession.problemProgress[problemIndex];
    problem.testResults = testResults;
    problem.passedTests = testResults.filter((r: any) => r.passed).length;
    problem.totalTests = testResults.length;
    problem.submittedAt = new Date();

    // Get problem points from hackathon session
    const hackathonSession = await HackathonSession.findById(sessionId);
    const problemConfig = hackathonSession?.problems.find(
      p => p.problemId.toString() === problemId
    );

    if (problem.passedTests === problem.totalTests) {
      problem.status = 'passed';
      problem.score = problemConfig?.points || 0;
    } else {
      problem.status = 'failed';
      problem.score = 0;
    }

    // Recalculate total score
    teamSession.totalScore = teamSession.problemProgress.reduce(
      (sum, p) => sum + p.score,
      0
    );

    await teamSession.save();

    res.json({
      success: true,
      data: { problemProgress: problem, totalScore: teamSession.totalScore },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log proctoring event
 */
export const logProctorEvent = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId, teamId } = req.params;
    const { type, details, severity } = req.body;
    const userId = req.user!.userId;

    const teamSession = await TeamSession.findOne({ sessionId, teamId });

    if (!teamSession) {
      throw new ApiError(404, 'Team session not found');
    }

    // Update counts
    switch (type) {
      case 'tab-switch':
        teamSession.tabSwitchCount++;
        break;
      case 'copy-paste':
        teamSession.copyPasteCount++;
        break;
      case 'idle':
        teamSession.idleCount++;
        break;
      case 'fullscreen-exit':
        teamSession.fullscreenExitCount++;
        break;
      case 'warning':
        teamSession.warningCount++;
        break;
    }

    // Add event
    teamSession.events.push({
      type,
      timestamp: new Date(),
      userId,
      details,
      severity: severity || 'low',
    } as any);

    await teamSession.save();

    logger.info(`Proctor event logged: ${type} for team ${teamId} in session ${sessionId}`);

    res.json({
      success: true,
      data: { event: teamSession.events[teamSession.events.length - 1] },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Pause team session (by proctor)
 */
export const pauseTeamSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId, teamId } = req.params;
    const { reason } = req.body;

    const teamSession = await TeamSession.findOne({ sessionId, teamId });

    if (!teamSession) {
      throw new ApiError(404, 'Team session not found');
    }

    teamSession.isPaused = true;
    teamSession.pausedAt = new Date();
    teamSession.pauseReason = reason;

    teamSession.events.push({
      type: 'pause',
      timestamp: new Date(),
      details: reason || 'Paused by proctor',
      severity: 'high',
    } as any);

    await teamSession.save();

    logger.info(`Team session paused: ${teamId} in session ${sessionId}`);

    res.json({
      success: true,
      data: { teamSession },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resume team session (by proctor)
 */
export const resumeTeamSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId, teamId } = req.params;

    const teamSession = await TeamSession.findOne({ sessionId, teamId });

    if (!teamSession) {
      throw new ApiError(404, 'Team session not found');
    }

    teamSession.isPaused = false;
    teamSession.pausedAt = undefined;
    teamSession.pauseReason = undefined;

    teamSession.events.push({
      type: 'resume',
      timestamp: new Date(),
      details: 'Resumed by proctor',
      severity: 'low',
    } as any);

    await teamSession.save();

    logger.info(`Team session resumed: ${teamId} in session ${sessionId}`);

    res.json({
      success: true,
      data: { teamSession },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all active sessions (for proctor monitoring)
 */
export const getActiveSessions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.query;

    const filter: any = { status: 'in-progress' };
    if (sessionId) filter.sessionId = sessionId;

    const teamSessions = await TeamSession.find(filter)
      .populate('teamId', 'name memberIds')
      .populate('sessionId', 'title')
      .sort({ startedAt: -1 });

    res.json({
      success: true,
      data: { teamSessions },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit final team session
 */
export const submitSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId, teamId } = req.params;

    const teamSession = await TeamSession.findOne({ sessionId, teamId });

    if (!teamSession) {
      throw new ApiError(404, 'Team session not found');
    }

    if (teamSession.status !== 'in-progress') {
      throw new ApiError(400, 'Session is not in progress');
    }

    teamSession.status = 'submitted';
    teamSession.submittedAt = new Date();

    await teamSession.save();

    logger.info(`Team session submitted: ${teamId} in session ${sessionId}`);

    res.json({
      success: true,
      data: { teamSession },
    });
  } catch (error) {
    next(error);
  }
};
