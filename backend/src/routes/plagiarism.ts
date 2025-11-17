import express from 'express';
import * as plagiarismController from '../controllers/plagiarismController';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = express.Router();

// All routes require authentication and admin/proctor role
router.use(authenticateJWT);
router.use(requireRole(['admin', 'proctor', 'grader']));

// Detect similarity between submissions
router.post('/similarity', plagiarismController.detectSimilarity);

// Detect timing anomalies for an attempt
router.get('/anomalies/:attemptId', plagiarismController.detectTimingAnomalies);

// Check if code is AI-generated
router.post('/ai-detection', plagiarismController.detectAIGenerated);

// Get comprehensive integrity report for an assessment
router.get('/report/:assessmentId', plagiarismController.getIntegrityReport);

export default router;
