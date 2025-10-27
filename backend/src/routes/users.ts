import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  addUserRole,
  removeUserRole,
} from '../controllers/userController';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '../../../shared/src/types/common';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// Admin-only routes
router.get('/', requireRole(UserRole.ADMIN), getAllUsers);
router.post('/', requireRole(UserRole.ADMIN), createUser);
router.put('/:id', requireRole(UserRole.ADMIN), updateUser);
router.delete('/:id', requireRole(UserRole.ADMIN), deleteUser);
router.post('/:id/roles', requireRole(UserRole.ADMIN), addUserRole);
router.delete('/:id/roles', requireRole(UserRole.ADMIN), removeUserRole);

// Any authenticated user can view user details
router.get('/:id', getUserById);

export default router;
