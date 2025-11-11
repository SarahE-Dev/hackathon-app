import { Router } from 'express';
import {
  createSession,
  getAllSessions,
  getSessionById,
  updateSession,
  startSession,
  pauseSession,
  resumeSession,
  completeSession,
  getSessionLeaderboard,
  deleteSession,
} from '../controllers/hackathonSessionController';
import {
  joinSession,
  getTeamSession,
  updateProblemProgress,
  submitProblem,
  logProctorEvent,
  pauseTeamSession,
  resumeTeamSession,
  getActiveSessions,
  submitSession,
} from '../controllers/teamSessionController';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '../../../shared/src/types/common';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============= Hackathon Session Management (Admin/Proctor) =============

/**
 * Create hackathon session
 */
router.post(
  '/',
  requireRole(UserRole.ADMIN, UserRole.PROCTOR),
  createSession
);

/**
 * Get all hackathon sessions
 */
router.get('/', getAllSessions);

/**
 * Get session by ID
 */
router.get('/:id', getSessionById);

/**
 * Update session
 */
router.put(
  '/:id',
  requireRole(UserRole.ADMIN, UserRole.PROCTOR),
  updateSession
);

/**
 * Start session
 */
router.post(
  '/:id/start',
  requireRole(UserRole.ADMIN, UserRole.PROCTOR),
  startSession
);

/**
 * Pause session
 */
router.post(
  '/:id/pause',
  requireRole(UserRole.ADMIN, UserRole.PROCTOR),
  pauseSession
);

/**
 * Resume session
 */
router.post(
  '/:id/resume',
  requireRole(UserRole.ADMIN, UserRole.PROCTOR),
  resumeSession
);

/**
 * Complete session
 */
router.post(
  '/:id/complete',
  requireRole(UserRole.ADMIN, UserRole.PROCTOR),
  completeSession
);

/**
 * Get session leaderboard
 */
router.get('/:id/leaderboard', getSessionLeaderboard);

/**
 * Delete session
 */
router.delete(
  '/:id',
  requireRole(UserRole.ADMIN),
  deleteSession
);

// ============= Team Session Operations =============

/**
 * Join/start team session
 */
router.post('/team/join', joinSession);

/**
 * Get team session
 */
router.get('/:sessionId/team/:teamId', getTeamSession);

/**
 * Update problem progress (autosave)
 */
router.put('/:sessionId/team/:teamId/problem', updateProblemProgress);

/**
 * Submit problem solution
 */
router.post('/:sessionId/team/:teamId/problem/submit', submitProblem);

/**
 * Submit final session
 */
router.post('/:sessionId/team/:teamId/submit', submitSession);

/**
 * Log proctoring event
 */
router.post('/:sessionId/team/:teamId/event', logProctorEvent);

// ============= Proctor Operations =============

/**
 * Get all active team sessions (for monitoring)
 */
router.get(
  '/monitor/active',
  requireRole(UserRole.ADMIN, UserRole.PROCTOR),
  getActiveSessions
);

/**
 * Pause team session
 */
router.post(
  '/:sessionId/team/:teamId/pause',
  requireRole(UserRole.ADMIN, UserRole.PROCTOR),
  pauseTeamSession
);

/**
 * Resume team session
 */
router.post(
  '/:sessionId/team/:teamId/resume',
  requireRole(UserRole.ADMIN, UserRole.PROCTOR),
  resumeTeamSession
);

export default router;
