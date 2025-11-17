import { Request, Response } from 'express';
import { auditTrailService } from '../services/auditTrailService';
import { logger } from '../utils/logger';

/**
 * Batch log audit events
 */
export const batchLogEvents = async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    const { events } = req.body;

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'events array is required',
        },
      });
    }

    await auditTrailService.batchLogEvents(attemptId, events);

    return res.json({
      success: true,
      data: {
        eventsLogged: events.length,
      },
    });
  } catch (error) {
    logger.error('Error batch logging events:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to log events',
      },
    });
  }
};

/**
 * Get behavioral metrics for an attempt
 */
export const getBehavioralMetrics = async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;

    const metrics = await auditTrailService.analyzeBehavioralMetrics(attemptId);

    return res.json({
      success: true,
      data: { metrics },
    });
  } catch (error) {
    logger.error('Error getting behavioral metrics:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get behavioral metrics',
      },
    });
  }
};

/**
 * Get navigation patterns for an attempt
 */
export const getNavigationPatterns = async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;

    const patterns = await auditTrailService.analyzeNavigationPatterns(attemptId);

    return res.json({
      success: true,
      data: { patterns },
    });
  } catch (error) {
    logger.error('Error getting navigation patterns:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get navigation patterns',
      },
    });
  }
};

/**
 * Get comprehensive audit trail
 */
export const getAuditTrail = async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;

    const auditTrail = await auditTrailService.getAuditTrail(attemptId);

    return res.json({
      success: true,
      data: auditTrail,
    });
  } catch (error) {
    logger.error('Error getting audit trail:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get audit trail',
      },
    });
  }
};
