import { Router } from 'express';
import {
  getAllAssessments,
  getAssessmentById,
  createAssessment,
  updateAssessment,
  publishAssessment,
  deleteAssessment,
  getAssessmentLeaderboard,
} from '../controllers/assessmentController';
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

// Assessment routes
router.get('/', getAllAssessments);
router.get('/:id', getAssessmentById);
router.get('/:id/leaderboard', getAssessmentLeaderboard);
router.post(
  '/',
  requireRole(UserRole.ADMIN, UserRole.PROCTOR),
  createAssessment
);
router.put(
  '/:id',
  requireRole(UserRole.ADMIN, UserRole.PROCTOR),
  updateAssessment
);
router.post(
  '/:id/publish',
  requireRole(UserRole.ADMIN),
  publishAssessment
);
router.delete(
  '/:id',
  requireRole(UserRole.ADMIN),
  deleteAssessment
);

// Question routes
router.get('/questions/list', getAllQuestions);
router.get('/questions/:id', getQuestionById);
router.post(
  '/questions',
  requireRole(UserRole.ADMIN, UserRole.PROCTOR),
  createQuestion
);
router.put(
  '/questions/:id',
  requireRole(UserRole.ADMIN, UserRole.PROCTOR),
  updateQuestion
);
router.post(
  '/questions/:id/publish',
  requireRole(UserRole.ADMIN),
  publishQuestion
);
router.post(
  '/questions/:id/duplicate',
  requireRole(UserRole.ADMIN, UserRole.PROCTOR),
  duplicateQuestion
);
router.post(
  '/questions/:id/archive',
  requireRole(UserRole.ADMIN),
  archiveQuestion
);
router.delete(
  '/questions/:id',
  requireRole(UserRole.ADMIN),
  deleteQuestion
);

export default router;
