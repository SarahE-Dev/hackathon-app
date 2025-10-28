import { Router } from 'express';
import {
  getJudgeScore,
  createOrUpdateJudgeScore,
  getTeamScores,
  getJudgeScores,
  deleteJudgeScore,
} from '../controllers/judgeScoreController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/judge-scores
 * Create or update a judge score
 */
router.post('/', createOrUpdateJudgeScore);

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
 * Delete a judge score
 */
router.delete('/:teamId/:judgeId', deleteJudgeScore);

export default router;
