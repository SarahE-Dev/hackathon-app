import { Router } from 'express';
import {
  getJudgeScore,
  createOrUpdateJudgeScore,
  getTeamScores,
  getJudgeScores,
  deleteJudgeScore,
} from '../controllers/judgeScoreController';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '../../../shared/src/types/common';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/judge-scores
 * Create or update a judge score (judges and admins only)
 */
router.post('/', requireRole(UserRole.JUDGE, UserRole.ADMIN), createOrUpdateJudgeScore);

/**
 * GET /api/judge-scores/team/:teamId
 * Get all scores for a specific team
 */
router.get('/team/:teamId', getTeamScores);

/**
 * GET /api/judge-scores/judge/:judgeId
 * Get all scores submitted by a specific judge
 */
router.get('/judge/:judgeId', getJudgeScores);

/**
 * GET /api/judge-scores/:teamId/:judgeId
 * Get a specific judge score for a team
 */
router.get('/:teamId/:judgeId', getJudgeScore);

/**
 * DELETE /api/judge-scores/:teamId/:judgeId
 * Delete a judge score (judges and admins only)
 */
router.delete('/:teamId/:judgeId', requireRole(UserRole.JUDGE, UserRole.ADMIN), deleteJudgeScore);

export default router;
