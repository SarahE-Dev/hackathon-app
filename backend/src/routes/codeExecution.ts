import { Router } from 'express';
import { executeCode, validateCode } from '../controllers/codeExecutionController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All code execution routes require authentication
router.use(authenticate);

/**
 * POST /api/code/execute
 * Execute code with test cases
 */
router.post('/execute', executeCode);

/**
 * POST /api/code/validate
 * Validate code syntax
 */
router.post('/validate', validateCode);

export default router;
