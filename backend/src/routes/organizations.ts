import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '../../../shared/src/types/common';
import {
  createOrganization,
  getAllOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
} from '../controllers/organizationController';

const router = Router();

// All endpoints require authentication
router.use(authenticate);

// Get all organizations
router.get('/', getAllOrganizations);

// Get organization by ID
router.get('/:id', getOrganizationById);

// Create organization (admin only)
router.post(
  '/',
  requireRole(UserRole.ADMIN),
  createOrganization
);

// Update organization (admin only)
router.put(
  '/:id',
  requireRole(UserRole.ADMIN),
  updateOrganization
);

// Delete organization (admin only)
router.delete(
  '/:id',
  requireRole(UserRole.ADMIN),
  deleteOrganization
);

export default router;
