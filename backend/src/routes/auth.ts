import { Router } from 'express';
import { register, login, refreshToken, logout, getCurrentUser } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public routes with rate limiting
router.post('/register', authRateLimiter, register);
router.post('/login', authRateLimiter, login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

// Protected route
router.get('/me', authenticate, getCurrentUser);

export default router;
