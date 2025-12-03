import { Router } from 'express';
import {
  getTeamSubmissions,
  getSubmission,
  saveSubmission,
  runTests,
  submitSolution,
  getSessionLeaderboard,
} from '../controllers/teamSubmissionController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/team-submissions/:teamId/:sessionId
 * Get all submissions for a team in a session
 */
router.get('/:teamId/:sessionId', getTeamSubmissions);

/**
 * GET /api/team-submissions/:teamId/:sessionId/:problemId
 * Get a specific submission
 */
router.get('/:teamId/:sessionId/:problemId', getSubmission);

/**
 * PUT /api/team-submissions/:teamId/:sessionId/:problemId/save
 * Save/auto-save a submission (while coding)
 */
router.put('/:teamId/:sessionId/:problemId/save', saveSubmission);

/**
 * POST /api/team-submissions/:teamId/:sessionId/:problemId/run
 * Run tests for a submission
 */
router.post('/:teamId/:sessionId/:problemId/run', runTests);

/**
 * POST /api/team-submissions/:teamId/:sessionId/:problemId/submit
 * Submit final solution
 */
router.post('/:teamId/:sessionId/:problemId/submit', submitSolution);

/**
 * GET /api/team-submissions/leaderboard/:sessionId
 * Get leaderboard for a session
 */
router.get('/leaderboard/:sessionId', getSessionLeaderboard);

export default router;

