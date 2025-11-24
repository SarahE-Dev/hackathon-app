import { Router } from 'express';
import multer from 'multer';
import {
  startRecording,
  uploadChunk,
  uploadSnapshot,
  completeRecording,
  getRecordings,
  getRecording,
  deleteRecording,
  failRecording,
  serveRecordingFile,
  getRecordingStats,
} from '../controllers/recordingController';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '../../../shared/src/types/common';

const router = Router();

// Configure multer for file uploads (memory storage for chunks)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max per chunk
  },
});

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/recordings/start
 * Start a new recording session
 * Body: { sourceType, sourceId, type, teamId?, consent, metadata? }
 */
router.post('/start', startRecording);

/**
 * POST /api/recordings/:recordingId/chunk
 * Upload a recording chunk
 * Body: multipart/form-data with 'chunk' file, chunkIndex, duration
 */
router.post('/:recordingId/chunk', upload.single('chunk'), uploadChunk);

/**
 * POST /api/recordings/:recordingId/snapshot
 * Upload a snapshot image
 * Body: multipart/form-data with 'snapshot' file
 */
router.post('/:recordingId/snapshot', upload.single('snapshot'), uploadSnapshot);

/**
 * POST /api/recordings/:recordingId/complete
 * Mark recording as complete
 * Body: { totalSize?, duration? }
 */
router.post('/:recordingId/complete', completeRecording);

/**
 * POST /api/recordings/:recordingId/fail
 * Mark recording as failed
 * Body: { errorMessage? }
 */
router.post('/:recordingId/fail', failRecording);

/**
 * GET /api/recordings/:sourceType/:sourceId
 * Get all recordings for an assessment attempt or hackathon session
 */
router.get('/:sourceType/:sourceId', getRecordings);

/**
 * GET /api/recordings/detail/:recordingId
 * Get a single recording with full details
 */
router.get('/detail/:recordingId', getRecording);

/**
 * DELETE /api/recordings/:recordingId
 * Delete a recording (admin only)
 */
router.delete('/:recordingId', requireRole(UserRole.ADMIN), deleteRecording);

/**
 * GET /api/recordings/file/*
 * Serve local recording files (for local storage only)
 */
router.get('/file/*', serveRecordingFile);

/**
 * GET /api/recordings/stats
 * Get recording statistics (admin only)
 */
router.get('/stats', requireRole(UserRole.ADMIN), getRecordingStats);

export default router;
