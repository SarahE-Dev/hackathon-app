import { Router } from 'express';
import {
  getLeaderboard,
  refreshLeaderboard,
  toggleLeaderboardPublic,
} from '../controllers/leaderboardController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/leaderboard
 * Get the current leaderboard
 */
router.get('/', getLeaderboard);

/**
 * POST /api/leaderboard/refresh
 * Refresh leaderboard standings (admin only)
 */
router.post('/refresh', refreshLeaderboard);

/**
 * PATCH /api/leaderboard/toggle-public
 * Toggle leaderboard public visibility (admin only)
 */
router.patch('/toggle-public', toggleLeaderboardPublic);

export default router;
