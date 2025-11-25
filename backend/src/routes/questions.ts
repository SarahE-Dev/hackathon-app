import { Router } from 'express';
import {
  getAllQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  publishQuestion,
  deleteQuestion,
  archiveQuestion,
  duplicateQuestion,
} from '../controllers/questionController';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '../../../shared/src/types/common';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Questions Routes
 */

// Get all questions
router.get('/', getAllQuestions);

// Get single question
router.get('/:id', getQuestionById);

// Create question (admin only)
router.post(
  '/',
  requireRole(UserRole.ADMIN),
  createQuestion
);

// Update question (admin only)
router.put(
  '/:id',
  requireRole(UserRole.ADMIN),
  updateQuestion
);

// Publish question (admin only)
router.patch(
  '/:id/publish',
  requireRole(UserRole.ADMIN),
  publishQuestion
);

// Delete question (admin only)
router.delete(
  '/:id',
  requireRole(UserRole.ADMIN),
  deleteQuestion
);

// Archive question (admin only)
router.patch(
  '/:id/archive',
  requireRole(UserRole.ADMIN),
  archiveQuestion
);

// Duplicate question (admin only)
router.post(
  '/:id/duplicate',
  requireRole(UserRole.ADMIN),
  duplicateQuestion
);

export default router;
