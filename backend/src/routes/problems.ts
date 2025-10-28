import { Router } from 'express';
import {
  importCodewarseProblem,
  checkCodewarsStatus,
  previewCodewarsProblem,
} from '../controllers/problemImportController';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '../../../shared/src/types/common';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Problem Import Routes
 */

// Check Codewars API availability
router.get('/codewars/status', checkCodewarsStatus);

// Preview a Codewars problem before importing
router.get('/codewars/preview/:id', previewCodewarsProblem);

// Import a problem from Codewars
router.post(
  '/import',
  requireRole(UserRole.ADMIN, UserRole.PROCTOR),
  importCodewarseProblem
);

export default router;
