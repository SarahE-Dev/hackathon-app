import { Router } from 'express';
import {
  getRoster,
  addToRoster,
  bulkAddToRoster,
  updateRosterEntry,
  removeFromRoster,
  assignToTeam,
  bulkAssignToTeams,
  checkEmailOnRoster,
  createTeamsFromRoster,
} from '../controllers/hackathonRosterController';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '../../../shared/src/types/common';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/hackathon-roster/check/:email
 * Check if email is on any roster (public for registration flow)
 */
router.get('/check/:email', checkEmailOnRoster);

/**
 * GET /api/hackathon-roster/:sessionId
 * Get roster for a hackathon session
 */
router.get('/:sessionId', requireRole(UserRole.ADMIN, UserRole.PROCTOR), getRoster);

/**
 * POST /api/hackathon-roster/:sessionId
 * Add a single entry to roster
 */
router.post('/:sessionId', requireRole(UserRole.ADMIN), addToRoster);

/**
 * POST /api/hackathon-roster/:sessionId/bulk
 * Bulk add entries to roster
 */
router.post('/:sessionId/bulk', requireRole(UserRole.ADMIN), bulkAddToRoster);

/**
 * PUT /api/hackathon-roster/entry/:id
 * Update a roster entry
 */
router.put('/entry/:id', requireRole(UserRole.ADMIN), updateRosterEntry);

/**
 * DELETE /api/hackathon-roster/entry/:id
 * Remove from roster
 */
router.delete('/entry/:id', requireRole(UserRole.ADMIN), removeFromRoster);

/**
 * POST /api/hackathon-roster/entry/:id/assign-team
 * Assign a fellow to a team
 */
router.post('/entry/:id/assign-team', requireRole(UserRole.ADMIN), assignToTeam);

/**
 * POST /api/hackathon-roster/:sessionId/bulk-assign
 * Bulk assign fellows to teams
 */
router.post('/:sessionId/bulk-assign', requireRole(UserRole.ADMIN), bulkAssignToTeams);

/**
 * POST /api/hackathon-roster/:sessionId/create-teams
 * Auto-create teams from unassigned fellows
 */
router.post('/:sessionId/create-teams', requireRole(UserRole.ADMIN), createTeamsFromRoster);

export default router;
