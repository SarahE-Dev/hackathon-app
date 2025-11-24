import { Response, NextFunction } from 'express';
import HackathonRoster from '../models/HackathonRoster';
import User from '../models/User';
import Team from '../models/Team';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

/**
 * Get roster entries for a hackathon session
 */
export const getRoster = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params;
    const { role, status } = req.query;

    const query: any = { hackathonSessionId: sessionId };
    if (role) query.role = role;
    if (status) query.status = status;

    const roster = await HackathonRoster.find(query)
      .populate('userId', 'firstName lastName email')
      .populate('teamId', 'name')
      .populate('invitedBy', 'firstName lastName')
      .sort({ role: 1, lastName: 1, firstName: 1 });

    // Get stats
    const stats = {
      totalJudges: await HackathonRoster.countDocuments({ hackathonSessionId: sessionId, role: 'judge' }),
      registeredJudges: await HackathonRoster.countDocuments({ hackathonSessionId: sessionId, role: 'judge', status: 'registered' }),
      totalFellows: await HackathonRoster.countDocuments({ hackathonSessionId: sessionId, role: 'fellow' }),
      registeredFellows: await HackathonRoster.countDocuments({ hackathonSessionId: sessionId, role: 'fellow', status: 'registered' }),
      assignedToTeams: await HackathonRoster.countDocuments({ hackathonSessionId: sessionId, role: 'fellow', teamId: { $ne: null } }),
    };

    res.json({
      success: true,
      data: { roster, stats },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a single entry to the roster
 */
export const addToRoster = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params;
    const { email, firstName, lastName, role, notes } = req.body;

    if (!email || !role) {
      throw new ApiError(400, 'Email and role are required');
    }

    if (!['judge', 'fellow'].includes(role)) {
      throw new ApiError(400, 'Role must be either "judge" or "fellow"');
    }

    // Check if already exists
    const existing = await HackathonRoster.findOne({
      hackathonSessionId: sessionId,
      email: email.toLowerCase(),
      role,
    });

    if (existing) {
      throw new ApiError(400, `This email is already on the ${role} roster`);
    }

    // Check if user already exists in system
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    const rosterEntry = new HackathonRoster({
      hackathonSessionId: sessionId,
      organizationId: req.body.organizationId || '000000000000000000000001',
      email: email.toLowerCase(),
      firstName,
      lastName,
      role,
      notes,
      status: existingUser ? 'registered' : 'pending',
      userId: existingUser?._id,
      invitedBy: req.user!.userId,
    });

    if (existingUser) {
      rosterEntry.registeredAt = new Date();

      // Auto-assign role to existing user if they don't have it
      const roleToAdd = role === 'judge' ? 'judge' : 'fellow';
      const hasRole = existingUser.roles?.some(r => r.role === roleToAdd);
      if (!hasRole) {
        existingUser.roles = existingUser.roles || [];
        existingUser.roles.push({ role: roleToAdd });
        await existingUser.save();
      }
    }

    await rosterEntry.save();

    const populated = await HackathonRoster.findById(rosterEntry._id)
      .populate('userId', 'firstName lastName email')
      .populate('invitedBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      data: { rosterEntry: populated },
      message: existingUser
        ? `${email} found in system and added to roster`
        : `${email} added to roster (pending registration)`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk add entries to the roster (from CSV or paste)
 */
export const bulkAddToRoster = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params;
    const { entries, role } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      throw new ApiError(400, 'Entries array is required');
    }

    if (!['judge', 'fellow'].includes(role)) {
      throw new ApiError(400, 'Role must be either "judge" or "fellow"');
    }

    const results = {
      added: 0,
      skipped: 0,
      autoRegistered: 0,
      errors: [] as string[],
    };

    for (const entry of entries) {
      const email = (entry.email || entry).toString().toLowerCase().trim();

      if (!email || !email.includes('@')) {
        results.errors.push(`Invalid email: ${email}`);
        results.skipped++;
        continue;
      }

      // Check if already exists
      const existing = await HackathonRoster.findOne({
        hackathonSessionId: sessionId,
        email,
        role,
      });

      if (existing) {
        results.skipped++;
        continue;
      }

      // Check if user exists
      const existingUser = await User.findOne({ email });

      const rosterEntry = new HackathonRoster({
        hackathonSessionId: sessionId,
        organizationId: req.body.organizationId || '000000000000000000000001',
        email,
        firstName: entry.firstName || '',
        lastName: entry.lastName || '',
        role,
        status: existingUser ? 'registered' : 'pending',
        userId: existingUser?._id,
        registeredAt: existingUser ? new Date() : undefined,
        invitedBy: req.user!.userId,
      });

      await rosterEntry.save();
      results.added++;

      if (existingUser) {
        results.autoRegistered++;
        // Auto-assign role
        const roleToAdd = role === 'judge' ? 'judge' : 'fellow';
        const hasRole = existingUser.roles?.some(r => r.role === roleToAdd);
        if (!hasRole) {
          existingUser.roles = existingUser.roles || [];
          existingUser.roles.push({ role: roleToAdd });
          await existingUser.save();
        }
      }
    }

    res.json({
      success: true,
      data: { results },
      message: `Added ${results.added} entries (${results.autoRegistered} auto-registered, ${results.skipped} skipped)`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a roster entry
 */
export const updateRosterEntry = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, notes, teamId, status } = req.body;

    const entry = await HackathonRoster.findById(id);
    if (!entry) {
      throw new ApiError(404, 'Roster entry not found');
    }

    if (firstName !== undefined) entry.firstName = firstName;
    if (lastName !== undefined) entry.lastName = lastName;
    if (notes !== undefined) entry.notes = notes;
    if (teamId !== undefined) entry.teamId = teamId;
    if (status !== undefined) entry.status = status;

    await entry.save();

    const populated = await HackathonRoster.findById(entry._id)
      .populate('userId', 'firstName lastName email')
      .populate('teamId', 'name')
      .populate('invitedBy', 'firstName lastName');

    res.json({
      success: true,
      data: { rosterEntry: populated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove from roster
 */
export const removeFromRoster = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const entry = await HackathonRoster.findByIdAndDelete(id);
    if (!entry) {
      throw new ApiError(404, 'Roster entry not found');
    }

    res.json({
      success: true,
      message: 'Removed from roster',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign fellow to a team
 */
export const assignToTeam = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { teamId } = req.body;

    const entry = await HackathonRoster.findById(id);
    if (!entry) {
      throw new ApiError(404, 'Roster entry not found');
    }

    if (entry.role !== 'fellow') {
      throw new ApiError(400, 'Only fellows can be assigned to teams');
    }

    entry.teamId = teamId || null;
    await entry.save();

    // If user is registered, also add them to the team
    if (entry.userId && teamId) {
      const team = await Team.findById(teamId);
      if (team && !team.memberIds.includes(entry.userId)) {
        team.memberIds.push(entry.userId);
        await team.save();
      }
    }

    const populated = await HackathonRoster.findById(entry._id)
      .populate('userId', 'firstName lastName email')
      .populate('teamId', 'name');

    res.json({
      success: true,
      data: { rosterEntry: populated },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk assign fellows to teams
 */
export const bulkAssignToTeams = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params;
    const { assignments } = req.body; // Array of { rosterId, teamId }

    if (!Array.isArray(assignments)) {
      throw new ApiError(400, 'Assignments array is required');
    }

    let updated = 0;

    for (const { rosterId, teamId } of assignments) {
      const entry = await HackathonRoster.findOne({
        _id: rosterId,
        hackathonSessionId: sessionId,
        role: 'fellow',
      });

      if (entry) {
        entry.teamId = teamId || null;
        await entry.save();

        // If user is registered, also add them to the team
        if (entry.userId && teamId) {
          const team = await Team.findById(teamId);
          if (team && !team.memberIds.includes(entry.userId)) {
            team.memberIds.push(entry.userId);
            await team.save();
          }
        }
        updated++;
      }
    }

    res.json({
      success: true,
      message: `Updated ${updated} assignments`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check if an email is on any roster (used during registration)
 */
export const checkEmailOnRoster = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.params;

    const entries = await HackathonRoster.find({
      email: email.toLowerCase(),
      status: 'pending',
    }).populate('hackathonSessionId', 'title');

    res.json({
      success: true,
      data: {
        isOnRoster: entries.length > 0,
        entries: entries.map(e => ({
          hackathonTitle: (e.hackathonSessionId as any)?.title,
          role: e.role,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create teams from roster with auto-assignment
 */
export const createTeamsFromRoster = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { sessionId } = req.params;
    const { teamSize, teamNamePrefix } = req.body;

    const size = teamSize || 4;
    const prefix = teamNamePrefix || 'Team';

    // Get all unassigned fellows for this session
    const unassignedFellows = await HackathonRoster.find({
      hackathonSessionId: sessionId,
      role: 'fellow',
      teamId: null,
    });

    if (unassignedFellows.length === 0) {
      throw new ApiError(400, 'No unassigned fellows to create teams from');
    }

    // Get existing team count for naming
    const existingTeamCount = await Team.countDocuments({});

    const teamsCreated: any[] = [];
    let teamNumber = existingTeamCount + 1;

    // Shuffle fellows for random assignment
    const shuffled = [...unassignedFellows].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffled.length; i += size) {
      const teamMembers = shuffled.slice(i, i + size);

      const team = new Team({
        name: `${prefix} ${teamNumber}`,
        organizationId: req.body.organizationId || '000000000000000000000001',
        memberIds: teamMembers.filter(m => m.userId).map(m => m.userId),
      });

      await team.save();

      // Update roster entries with team assignment
      for (const member of teamMembers) {
        member.teamId = team._id as any;
        await member.save();
      }

      teamsCreated.push({
        team,
        members: teamMembers.length,
      });

      teamNumber++;
    }

    res.json({
      success: true,
      data: { teamsCreated },
      message: `Created ${teamsCreated.length} teams from ${unassignedFellows.length} fellows`,
    });
  } catch (error) {
    next(error);
  }
};
