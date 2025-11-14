import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import Attempt from '../models/Attempt';
import Assessment from '../models/Assessment';
import User from '../models/User';
import { AttemptStatus } from '../../../shared/src/types/common';
import { logger } from '../utils/logger';

/**
 * Get all active assessment attempts for proctoring
 */
export const getActiveAttempts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { assessmentId, page = 1, limit = 50 } = req.query;

    const query: any = {
      status: AttemptStatus.IN_PROGRESS,
    };

    if (assessmentId) {
      query.assessmentId = assessmentId;
    }

    const attempts = await Attempt.find(query)
      .populate('userId', 'name email')
      .populate('assessmentId', 'title settings')
      .sort({ startedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Attempt.countDocuments(query);

    // Enrich with event statistics
    const enrichedAttempts = attempts.map((attempt) => {
      const tabSwitchCount = attempt.events.filter(
        (e) => e.type === 'tab-hidden'
      ).length;
      const copyPasteCount = attempt.events.filter(
        (e) => e.type === 'copy-detected' || e.type === 'paste-detected'
      ).length;
      const fullscreenExitCount = attempt.events.filter(
        (e) => e.type === 'fullscreen-exit'
      ).length;
      const totalViolations = tabSwitchCount + copyPasteCount + fullscreenExitCount;

      return {
        ...attempt.toObject(),
        violations: {
          tabSwitch: tabSwitchCount,
          copyPaste: copyPasteCount,
          fullscreenExit: fullscreenExitCount,
          total: totalViolations,
        },
      };
    });

    res.json({
      success: true,
      data: {
        attempts: enrichedAttempts,
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
 * Get detailed attempt information for proctoring
 */
export const getAttemptDetails = async (
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
      .populate('assessmentId', 'title description settings');

    if (!attempt) {
      throw new ApiError(404, 'Attempt not found');
    }

    // Calculate time elapsed and remaining
    const now = new Date();
    const timeLimit = attempt.assessmentSnapshot?.settings?.totalTimeLimit;
    let timeRemaining = null;

    if (timeLimit && attempt.startedAt) {
      const elapsedMinutes = Math.floor(
        (now.getTime() - new Date(attempt.startedAt).getTime()) / 1000 / 60
      );
      timeRemaining = Math.max(0, timeLimit - elapsedMinutes);
    }

    // Get violation counts
    const violations = {
      tabSwitch: attempt.events.filter((e) => e.type === 'tab-hidden').length,
      copyPaste: attempt.events.filter(
        (e) => e.type === 'copy-detected' || e.type === 'paste-detected'
      ).length,
      fullscreenExit: attempt.events.filter((e) => e.type === 'fullscreen-exit')
        .length,
      webcamIssues: attempt.events.filter(
        (e) => e.type === 'webcam-stopped' || e.type === 'webcam-error'
      ).length,
    };

    // Get recent events (last 50)
    const recentEvents = attempt.events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);

    res.json({
      success: true,
      data: {
        attempt,
        timeRemaining,
        violations,
        recentEvents,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Force submit an attempt
 */
export const forceSubmitAttempt = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { attemptId } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      throw new ApiError(400, 'Reason for force submit is required');
    }

    const attempt = await Attempt.findById(attemptId);

    if (!attempt) {
      throw new ApiError(404, 'Attempt not found');
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new ApiError(400, 'Attempt is not in progress');
    }

    // Add force submit event
    attempt.events.push({
      type: 'force-submitted',
      timestamp: new Date(),
      metadata: {
        proctorId: req.user.id,
        proctorName: req.user.name,
        reason: reason.trim(),
      },
    });

    // Update attempt status
    attempt.status = AttemptStatus.SUBMITTED;
    attempt.submittedAt = new Date();

    await attempt.save();

    logger.info(
      `Attempt ${attemptId} force submitted by proctor ${req.user.id} (${req.user.name}). Reason: ${reason}`
    );

    res.json({
      success: true,
      data: attempt,
      message: 'Attempt force submitted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add an incident report to an attempt
 */
export const addIncidentReport = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { attemptId } = req.params;
    const { incidentType, severity, description } = req.body;

    if (!incidentType || !severity || !description) {
      throw new ApiError(
        400,
        'Incident type, severity, and description are required'
      );
    }

    if (!['low', 'medium', 'high', 'critical'].includes(severity)) {
      throw new ApiError(400, 'Invalid severity level');
    }

    const attempt = await Attempt.findById(attemptId);

    if (!attempt) {
      throw new ApiError(404, 'Attempt not found');
    }

    // Add incident event
    attempt.events.push({
      type: 'incident-reported',
      timestamp: new Date(),
      metadata: {
        incidentType,
        severity,
        description,
        proctorId: req.user.id,
        proctorName: req.user.name,
      },
    });

    await attempt.save();

    logger.warn(
      `Incident reported for attempt ${attemptId} by proctor ${req.user.id}: ${incidentType} (${severity})`
    );

    res.json({
      success: true,
      message: 'Incident report added successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get proctoring statistics
 */
export const getProctoringStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { assessmentId } = req.query;

    const query: any = {};
    if (assessmentId) {
      query.assessmentId = assessmentId;
    }

    const [
      inProgress,
      submitted,
      totalViolations,
      recentIncidents,
    ] = await Promise.all([
      Attempt.countDocuments({ ...query, status: AttemptStatus.IN_PROGRESS }),
      Attempt.countDocuments({ ...query, status: AttemptStatus.SUBMITTED }),
      Attempt.aggregate([
        { $match: query },
        { $unwind: '$events' },
        {
          $match: {
            'events.type': {
              $in: [
                'tab-hidden',
                'copy-detected',
                'paste-detected',
                'fullscreen-exit',
                'webcam-stopped',
              ],
            },
          },
        },
        { $count: 'total' },
      ]),
      Attempt.aggregate([
        { $match: query },
        { $unwind: '$events' },
        { $match: { 'events.type': 'incident-reported' } },
        { $sort: { 'events.timestamp': -1 } },
        { $limit: 10 },
        {
          $project: {
            attemptId: '$_id',
            type: '$events.type',
            timestamp: '$events.timestamp',
            metadata: '$events.metadata',
          },
        },
      ]),
    ]);

    // Get high-risk attempts (many violations)
    const highRiskAttempts = await Attempt.aggregate([
      { $match: { ...query, status: AttemptStatus.IN_PROGRESS } },
      {
        $addFields: {
          violationCount: {
            $size: {
              $filter: {
                input: '$events',
                as: 'event',
                cond: {
                  $in: [
                    '$$event.type',
                    [
                      'tab-hidden',
                      'copy-detected',
                      'paste-detected',
                      'fullscreen-exit',
                    ],
                  ],
                },
              },
            },
          },
        },
      },
      { $match: { violationCount: { $gte: 5 } } },
      { $count: 'total' },
    ]);

    res.json({
      success: true,
      data: {
        activeAttempts: inProgress,
        submittedAttempts: submitted,
        totalViolations: totalViolations[0]?.total || 0,
        highRiskAttempts: highRiskAttempts[0]?.total || 0,
        recentIncidents,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a message/alert to a student
 */
export const sendStudentAlert = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated');
    }

    const { attemptId } = req.params;
    const { message, severity = 'medium' } = req.body;

    if (!message || !message.trim()) {
      throw new ApiError(400, 'Message is required');
    }

    const attempt = await Attempt.findById(attemptId);

    if (!attempt) {
      throw new ApiError(404, 'Attempt not found');
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new ApiError(400, 'Can only send alerts to in-progress attempts');
    }

    // Add alert event
    attempt.events.push({
      type: 'proctor-alert',
      timestamp: new Date(),
      metadata: {
        message: message.trim(),
        severity,
        proctorId: req.user.id,
        proctorName: req.user.name,
      },
    });

    await attempt.save();

    // In a real implementation, this would also emit via WebSocket to the student
    // io.to(`attempt:${attemptId}`).emit('proctor-alert', { message, severity });

    logger.info(
      `Alert sent to attempt ${attemptId} by proctor ${req.user.id}: ${message}`
    );

    res.json({
      success: true,
      message: 'Alert sent to student successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get assessments available for proctoring
 */
export const getActiveAssessments = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated');
    }

    // Get all active attempts and group by assessment
    const activeAssessments = await Attempt.aggregate([
      {
        $match: {
          status: { $in: [AttemptStatus.IN_PROGRESS, AttemptStatus.SUBMITTED] },
        },
      },
      {
        $group: {
          _id: '$assessmentId',
          inProgressCount: {
            $sum: {
              $cond: [{ $eq: ['$status', AttemptStatus.IN_PROGRESS] }, 1, 0],
            },
          },
          submittedCount: {
            $sum: {
              $cond: [{ $eq: ['$status', AttemptStatus.SUBMITTED] }, 1, 0],
            },
          },
          lastActivity: { $max: '$updatedAt' },
        },
      },
    ]);

    // Populate assessment details
    const enrichedAssessments = await Promise.all(
      activeAssessments.map(async (agg) => {
        const assessment = await Assessment.findById(agg._id).select(
          'title description settings'
        );
        return {
          assessment,
          inProgressCount: agg.inProgressCount,
          submittedCount: agg.submittedCount,
          lastActivity: agg.lastActivity,
        };
      })
    );

    res.json({
      success: true,
      data: enrichedAssessments.filter((a) => a.assessment !== null),
    });
  } catch (error) {
    next(error);
  }
};
