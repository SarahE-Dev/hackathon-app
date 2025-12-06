import { Router } from 'express';
import {
  getTeamSubmissions,
  getSubmission,
  saveSubmission,
  runTests,
  submitSolution,
  getSessionLeaderboard,
  getAllSessionSubmissions,
  addJudgeFeedback,
  getLeaderboard,
  getMyTeamReviews,
  clearTeamSubmissions,
  getProblemStatuses,
  updateProblemStatus,
} from '../controllers/teamSubmissionController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ===== STATIC ROUTES FIRST (before parameterized routes) =====

/**
 * GET /api/team-submissions/session/:sessionId/all
 * Get all submissions for a session (judges/admins only)
 */
router.get('/session/:sessionId/all', getAllSessionSubmissions);

/**
 * GET /api/team-submissions/leaderboard/:sessionId
 * Get leaderboard for a session (old endpoint)
 */
router.get('/leaderboard/:sessionId', getSessionLeaderboard);

/**
 * GET /api/team-submissions/hackathon-leaderboard/:sessionId
 * Get hackathon leaderboard with judge scores
 */
router.get('/hackathon-leaderboard/:sessionId', getLeaderboard);

/**
 * GET /api/team-submissions/my-reviews/:teamId
 * Get a team's own submissions with judge feedback
 */
router.get('/my-reviews/:teamId', getMyTeamReviews);

// ===== PARAMETERIZED ROUTES =====

/**
 * POST /api/team-submissions/:submissionId/feedback
 * Add judge feedback to a submission
 */
router.post('/:submissionId/feedback', addJudgeFeedback);

/**
 * GET /api/team-submissions/:teamId/:sessionId
 * Get all submissions for a team in a session
 */
router.get('/:teamId/:sessionId', getTeamSubmissions);

/**
 * GET /api/team-submissions/:teamId/:sessionId/statuses
 * Get problem statuses for a team in a session
 */
router.get('/:teamId/:sessionId/statuses', getProblemStatuses);

/**
 * PUT /api/team-submissions/:teamId/:sessionId/:problemId/status
 * Update problem status (in-progress or completed)
 */
router.put('/:teamId/:sessionId/:problemId/status', updateProblemStatus);

/**
 * DELETE /api/team-submissions/:teamId/:sessionId/dev-reset
 * Clear all submissions for a team (DEV ONLY)
 */
router.delete('/:teamId/:sessionId/dev-reset', clearTeamSubmissions);

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

export default router;
