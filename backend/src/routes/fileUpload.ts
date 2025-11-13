import { Router } from 'express';
import { uploadFiles, uploadMiddleware } from '../controllers/fileUploadController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All upload routes require authentication
router.use(authenticate);

/**
 * POST /api/upload
 * Upload multiple files
 */
router.post('/', uploadMiddleware, uploadFiles);

export default router;
