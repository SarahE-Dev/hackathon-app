import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { injectOrganization } from '../middleware/organization';
import {
  createTeam,
  getAllTeams,
  getTeamById,
  updateTeam,
  addTeamMember,
  removeTeamMember,
  submitTeamProject,
  deleteTeam,
} from '../controllers/teamController';

const router = Router();

// All endpoints require authentication
router.use(authenticate);

// Inject organization for all team routes
router.use(injectOrganization);

// Get all teams
router.get('/', getAllTeams);

// Get team by ID
router.get('/:id', getTeamById);

// Create team
router.post('/', createTeam);

// Update team
router.put('/:id', updateTeam);

// Add member to team
router.post('/:id/members', addTeamMember);

// Remove member from team
router.delete('/:id/members/:userId', removeTeamMember);

// Submit team project
router.post('/:id/submit', submitTeamProject);

// Delete team
router.delete('/:id', deleteTeam);

export default router;
