import { Router } from 'express';
import {
  getUngradedAttempts,
  getAttemptForGrading,
  submitGrade,
  getGradeByAttemptId,
  releaseGrade,
  getGradesByJudge,
  deleteGrade,
  getGradingStatistics,
} from '../controllers/gradeController';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '../../../shared/src/types/common';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/grades/ungraded
 * Get all ungraded/pending attempts (judge/admin only)
 */
router.get(
  '/ungraded',
  requireRole([UserRole.JUDGE, UserRole.ADMIN, UserRole.PROCTOR]),
  getUngradedAttempts
);

/**
 * GET /api/grades/attempt/:attemptId
 * Get a specific attempt for grading with all details (judge/admin only)
 */
router.get(
  '/attempt/:attemptId',
  requireRole([UserRole.JUDGE, UserRole.ADMIN, UserRole.PROCTOR]),
  getAttemptForGrading
);

/**
 * POST /api/grades
 * Submit or update a grade (judge/admin only)
 */
router.post(
  '/',
  requireRole([UserRole.JUDGE, UserRole.ADMIN]),
  submitGrade
);

/**
 * GET /api/grades/by-attempt/:attemptId
 * Get grade for a specific attempt
 * Students can only see released grades, judges/admins see all
 */
router.get('/by-attempt/:attemptId', getGradeByAttemptId);

/**
 * PUT /api/grades/:gradeId/release
 * Release a grade to student (judge/admin only)
 */
router.put(
  '/:gradeId/release',
  requireRole([UserRole.JUDGE, UserRole.ADMIN]),
  releaseGrade
);

/**
 * GET /api/grades/by-judge/:judgeId
 * Get all grades by a specific judge (judge can see own, admin can see all)
 */
router.get(
  '/by-judge/:judgeId',
  requireRole([UserRole.JUDGE, UserRole.ADMIN]),
  getGradesByJudge
);

/**
 * DELETE /api/grades/:gradeId
 * Delete a grade (admin only)
 */
router.delete(
  '/:gradeId',
  requireRole([UserRole.ADMIN]),
  deleteGrade
);

/**
 * GET /api/grades/statistics
 * Get grading statistics (admin/judge only)
 */
router.get(
  '/statistics',
  requireRole([UserRole.JUDGE, UserRole.ADMIN, UserRole.PROCTOR]),
  getGradingStatistics
);

export default router;
