import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import Team from '../models/Team';
import User from '../models/User';
import { logger } from '../utils/logger';

/**
 * Create a new team
 * POST /api/teams
 */
export const createTeam = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, projectTitle, description, memberIds } = req.body;
    // Use organizationId from body, or from middleware (injected)
    const organizationId = req.body.organizationId || req.organizationId;

    if (!name) {
      throw new ApiError(400, 'Team name is required');
    }
    
    if (!organizationId) {
      throw new ApiError(400, 'Organization ID is required');
    }

    // Validate that all member IDs exist
    if (memberIds && memberIds.length > 0) {
      const users = await User.find({ _id: { $in: memberIds } });
      if (users.length !== memberIds.length) {
        throw new ApiError(400, 'One or more member IDs do not exist');
      }
    }

    const team = new Team({
      organizationId,
      name,
      projectTitle: projectTitle || name, // Default to team name if not provided
      description: description || `Hackathon team: ${name}`, // Default description
      memberIds: memberIds || [],
    });

    await team.save();

    // Populate member data
    await team.populate('memberIds', 'email firstName lastName');

    logger.info(`Team created: ${team.name} in organization ${organizationId}`);

    res.status(201).json({
      success: true,
      data: {
        message: 'Team created successfully',
        team,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all teams in an organization
 * GET /api/teams?organizationId=xxx
 */
export const getAllTeams = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId } = req.query;

    const query: any = {};
    if (organizationId) {
      query.organizationId = organizationId;
    }

    const teams = await Team.find(query)
      .populate('memberIds', 'email firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        teams,
        count: teams.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get team by ID
 * GET /api/teams/:id
 */
export const getTeamById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const team = await Team.findById(id)
      .populate('memberIds', 'email firstName lastName')
      .populate('organizationId', 'name slug');

    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    res.json({
      success: true,
      data: {
        team,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update team
 * PUT /api/teams/:id
 */
export const updateTeam = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const {
      name, projectTitle, description, track, repoUrl, demoUrl, videoUrl,
      projectExplanation, technicalApproach, challengesOvercome, codeSnippets
    } = req.body;

    const team = await Team.findByIdAndUpdate(
      id,
      {
        ...(name && { name }),
        ...(projectTitle && { projectTitle }),
        ...(description && { description }),
        ...(track && { track }),
        ...(repoUrl && { repoUrl }),
        ...(demoUrl && { demoUrl }),
        ...(videoUrl && { videoUrl }),
        ...(projectExplanation !== undefined && { projectExplanation }),
        ...(technicalApproach !== undefined && { technicalApproach }),
        ...(challengesOvercome !== undefined && { challengesOvercome }),
        ...(codeSnippets !== undefined && { codeSnippets }),
      },
      { new: true }
    ).populate('memberIds', 'email firstName lastName');

    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    logger.info(`Team updated: ${team.name}`);

    res.json({
      success: true,
      data: {
        message: 'Team updated successfully',
        team,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add member to team
 * POST /api/teams/:id/members
 */
export const addTeamMember = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      throw new ApiError(400, 'userId is required');
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const team = await Team.findById(id);
    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    // Check if user is already a member
    if (team.memberIds.includes(userId)) {
      throw new ApiError(409, 'User is already a member of this team');
    }

    team.memberIds.push(userId);
    await team.save();
    await team.populate('memberIds', 'email firstName lastName');

    logger.info(`User ${userId} added to team ${team.name}`);

    res.json({
      success: true,
      data: {
        message: 'Member added to team successfully',
        team,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove member from team
 * DELETE /api/teams/:id/members/:userId
 */
export const removeTeamMember = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id, userId } = req.params;

    const team = await Team.findById(id);
    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    team.memberIds = team.memberIds.filter((memberId) => memberId.toString() !== userId);
    await team.save();
    await team.populate('memberIds', 'email firstName lastName');

    logger.info(`User ${userId} removed from team ${team.name}`);

    res.json({
      success: true,
      data: {
        message: 'Member removed from team successfully',
        team,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit team project
 * POST /api/teams/:id/submit
 */
export const submitTeamProject = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const {
      repoUrl, demoUrl, videoUrl, track,
      projectExplanation, technicalApproach, challengesOvercome, codeSnippets
    } = req.body;

    const team = await Team.findByIdAndUpdate(
      id,
      {
        repoUrl,
        demoUrl,
        videoUrl,
        track,
        projectExplanation,
        technicalApproach,
        challengesOvercome,
        codeSnippets,
        submittedAt: new Date(),
      },
      { new: true }
    ).populate('memberIds', 'email firstName lastName');

    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    logger.info(`Team ${team.name} submitted their project`);

    res.json({
      success: true,
      data: {
        message: 'Project submitted successfully',
        team,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete team
 * DELETE /api/teams/:id
 */
export const deleteTeam = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const team = await Team.findByIdAndDelete(id);
    if (!team) {
      throw new ApiError(404, 'Team not found');
    }

    logger.info(`Team deleted: ${team.name}`);

    res.json({
      success: true,
      data: {
        message: 'Team deleted successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};
