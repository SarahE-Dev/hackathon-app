import express from 'express';
import * as plagiarismController from '../controllers/plagiarismController';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '../../../shared/src/types/common';

const router = express.Router();

// All routes require authentication and admin/proctor role
router.use(authenticate);
router.use(requireRole(UserRole.ADMIN));
router.use(requireRole(UserRole.PROCTOR));
router.use(requireRole(UserRole.GRADER));

// Detect similarity between submissions
router.post('/similarity', plagiarismController.detectSimilarity);

// Detect timing anomalies for an attempt
router.get('/anomalies/:attemptId', plagiarismController.detectTimingAnomalies);

// Check if code is AI-generated
router.post('/ai-detection', plagiarismController.detectAIGenerated);

// Get comprehensive integrity report for an assessment
router.get('/report/:assessmentId', plagiarismController.getIntegrityReport);

export default router;
