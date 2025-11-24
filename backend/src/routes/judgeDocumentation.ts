import { Router } from 'express';
import {
  getDocumentation,
  getAllDocumentation,
  getDocumentationById,
  createDocumentation,
  updateDocumentation,
  deleteDocumentation,
  toggleDocumentationStatus,
  duplicateDocumentation,
} from '../controllers/judgeDocumentationController';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '../../../shared/src/types/common';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/judge-documentation
 * Get documentation (judges can view active docs)
 */
router.get('/', requireRole(UserRole.JUDGE, UserRole.ADMIN, UserRole.PROCTOR), getDocumentation);

/**
 * GET /api/judge-documentation/all
 * Get all documentation including inactive (admin only)
 */
router.get('/all', requireRole(UserRole.ADMIN), getAllDocumentation);

/**
 * GET /api/judge-documentation/:id
 * Get a specific documentation by ID
 */
router.get('/:id', requireRole(UserRole.JUDGE, UserRole.ADMIN, UserRole.PROCTOR), getDocumentationById);

/**
 * POST /api/judge-documentation
 * Create new documentation (admin only)
 */
router.post('/', requireRole(UserRole.ADMIN), createDocumentation);

/**
 * PUT /api/judge-documentation/:id
 * Update documentation (admin only)
 */
router.put('/:id', requireRole(UserRole.ADMIN), updateDocumentation);

/**
 * DELETE /api/judge-documentation/:id
 * Delete documentation (admin only)
 */
router.delete('/:id', requireRole(UserRole.ADMIN), deleteDocumentation);

/**
 * PATCH /api/judge-documentation/:id/toggle
 * Toggle documentation active status (admin only)
 */
router.patch('/:id/toggle', requireRole(UserRole.ADMIN), toggleDocumentationStatus);

/**
 * POST /api/judge-documentation/:id/duplicate
 * Duplicate documentation (admin only)
 */
router.post('/:id/duplicate', requireRole(UserRole.ADMIN), duplicateDocumentation);

export default router;
