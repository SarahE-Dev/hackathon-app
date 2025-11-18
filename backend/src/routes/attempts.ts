import { Router } from 'express';
import {
  startAttempt,
  getAttempt,
  saveAnswer,
  submitAttempt,
  getMyAttempts,
  addProctorEvent,
  uploadFile,
} from '../controllers/attemptController';
import {
  batchLogEvents,
  getBehavioralMetrics,
  getNavigationPatterns,
  getAuditTrail,
} from '../controllers/auditTrailController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get my attempts (with optional filters)
router.get('/my-attempts', getMyAttempts);

// Start a new attempt (or resume existing)
router.post('/start', startAttempt);

// Get specific attempt
router.get('/:id', getAttempt);

// Save answer (autosave)
router.put('/:id/answer', saveAnswer);

// Submit attempt
router.post('/:id/submit', submitAttempt);

// Add proctor event (tab switch, focus loss, etc.)
router.post('/:id/event', addProctorEvent);

// Upload file for file-upload questions
router.post('/:id/upload', uploadFile);

// Audit trail endpoints
router.post('/:attemptId/audit-events', batchLogEvents);
router.get('/:attemptId/behavioral-metrics', getBehavioralMetrics);
router.get('/:attemptId/navigation-patterns', getNavigationPatterns);
router.get('/:attemptId/audit-trail', getAuditTrail);

export default router;
