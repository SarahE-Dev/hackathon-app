import { Router } from 'express';
import { uploadFiles, uploadMiddleware, downloadFile, deleteFile } from '../controllers/fileUploadController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All upload routes require authentication
router.use(authenticate);

/**
 * POST /api/upload
 * Upload multiple files
 */
router.post('/', uploadMiddleware, uploadFiles);

/**
 * GET /api/upload/:filename
 * Download a file (with access control)
 */
router.get('/:filename', downloadFile);

/**
 * DELETE /api/upload/:filename
 * Delete a file (owner only)
 */
router.delete('/:filename', deleteFile);

export default router;
