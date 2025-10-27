import { Router } from 'express';
import {
  getAllSessions,
  getSessionById,
  createSession,
  updateSession,
  pauseSession,
  resumeSession,
  getActiveSessionsForUser,
  deleteSession,
} from '../controllers/sessionController';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '../../../shared/src/types/common';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get active sessions for current user
router.get('/my-sessions', getActiveSessionsForUser);

// Admin/Proctor routes
router.get('/', requireRole(UserRole.ADMIN, UserRole.PROCTOR), getAllSessions);
router.get('/:id', getSessionById);
router.post('/', requireRole(UserRole.ADMIN, UserRole.PROCTOR), createSession);
router.put('/:id', requireRole(UserRole.ADMIN, UserRole.PROCTOR), updateSession);
router.post('/:id/pause', requireRole(UserRole.ADMIN, UserRole.PROCTOR), pauseSession);
router.post('/:id/resume', requireRole(UserRole.ADMIN, UserRole.PROCTOR), resumeSession);
router.delete('/:id', requireRole(UserRole.ADMIN), deleteSession);

export default router;
