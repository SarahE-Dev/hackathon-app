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

export default router;
