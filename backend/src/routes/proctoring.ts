import { Router } from 'express';
import {
  getActiveAttempts,
  getAttemptDetails,
  forceSubmitAttempt,
  addIncidentReport,
  getProctoringStatistics,
  sendStudentAlert,
  getActiveAssessments,
} from '../controllers/proctoringController';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '../../../shared/src/types/common';

const router = Router();

// All routes require authentication and proctor/admin role
router.use(authenticate);
router.use(requireRole(UserRole.PROCTOR, UserRole.ADMIN));

/**
 * GET /api/proctoring/assessments
 * Get all assessments with active attempts
 */
router.get('/assessments', getActiveAssessments);

/**
 * GET /api/proctoring/attempts
 * Get all active attempts being monitored
 */
router.get('/attempts', getActiveAttempts);

/**
 * GET /api/proctoring/attempts/:attemptId
 * Get detailed information about a specific attempt
 */
router.get('/attempts/:attemptId', getAttemptDetails);

/**
 * POST /api/proctoring/attempts/:attemptId/force-submit
 * Force submit an attempt
 */
router.post('/attempts/:attemptId/force-submit', forceSubmitAttempt);

/**
 * POST /api/proctoring/attempts/:attemptId/incident
 * Add an incident report to an attempt
 */
router.post('/attempts/:attemptId/incident', addIncidentReport);

/**
 * POST /api/proctoring/attempts/:attemptId/alert
 * Send an alert message to a student
 */
router.post('/attempts/:attemptId/alert', sendStudentAlert);

/**
 * GET /api/proctoring/statistics
 * Get proctoring statistics
 */
router.get('/statistics', getProctoringStatistics);

export default router;
