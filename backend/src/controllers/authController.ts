import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import HackathonRoster from '../models/HackathonRoster';
import Team from '../models/Team';
import { hashPassword, comparePassword, validatePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

// Helper function to process roster entries for a user
async function processRosterEntriesForUser(user: any) {
  const rosterEntries = await HackathonRoster.find({
    email: user.email.toLowerCase(),
    status: 'pending',
  });

  const rolesAdded: string[] = [];

  for (const entry of rosterEntries) {
    // Update roster entry status
    entry.status = 'registered';
    entry.userId = user._id;
    entry.registeredAt = new Date();
    await entry.save();

    // Add role if not already present
    const roleToAdd = entry.role === 'judge' ? 'judge' : 'fellow';
    const hasRole = user.roles?.some((r: any) => r.role === roleToAdd);
    if (!hasRole) {
      user.roles = user.roles || [];
      user.roles.push({ role: roleToAdd });
      rolesAdded.push(roleToAdd);
    }

    // If fellow is assigned to a team, add them to the team
    if (entry.role === 'fellow' && entry.teamId) {
      const team = await Team.findById(entry.teamId);
      if (team && !team.memberIds.includes(user._id)) {
        team.memberIds.push(user._id);
        await team.save();
      }
    }
  }

  if (rolesAdded.length > 0) {
    await user.save();
    logger.info(`Auto-assigned roles to ${user.email}: ${rolesAdded.join(', ')}`);
  }

  return rosterEntries.length;
}

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, firstName, lastName, organizationId } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      throw new ApiError(400, 'All fields are required');
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new ApiError(400, passwordValidation.errors.join(', '));
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(409, 'User with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Assign user to organization (either provided or default demo organization)
    const assignedOrgId = organizationId || '68f630a085934e56f1df9b86'; // Default to demo organization

    // Check if email is on any roster to determine initial roles
    const rosterEntries = await HackathonRoster.find({
      email: email.toLowerCase(),
      status: 'pending',
    });

    // Build initial roles based on roster entries
    const initialRoles: Array<{ role: string; organizationId?: string }> = [];
    const roleTypes = new Set<string>();

    for (const entry of rosterEntries) {
      const roleType = entry.role === 'judge' ? 'judge' : 'fellow';
      if (!roleTypes.has(roleType)) {
        roleTypes.add(roleType);
        initialRoles.push({ role: roleType, organizationId: assignedOrgId });
      }
    }

    // If no roster entries, default to fellow
    if (initialRoles.length === 0) {
      initialRoles.push({ role: 'fellow', organizationId: assignedOrgId });
    }

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      firstName,
      lastName,
      passwordHash,
      roles: initialRoles,
      isActive: true,
      emailVerified: false,
    });

    await user.save();

    // Process roster entries - update status and team assignments
    for (const entry of rosterEntries) {
      entry.status = 'registered';
      entry.userId = user._id as any;
      entry.registeredAt = new Date();
      await entry.save();

      // If fellow is assigned to a team, add them to the team
      if (entry.role === 'fellow' && entry.teamId) {
        const team = await Team.findById(entry.teamId);
        if (team && !team.memberIds.includes(user._id as any)) {
          team.memberIds.push(user._id as any);
          await team.save();
        }
      }
    }

    logger.info(`New user registered: ${user.email}${rosterEntries.length > 0 ? ` (matched ${rosterEntries.length} roster entries)` : ''}`);

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: user.roles,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      throw new ApiError(400, 'Email and password are required');
    }

    // Find user with password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ApiError(403, 'Account is disabled');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new ApiError(401, 'Invalid email or password');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Check for any new roster entries added since last login
    const newRosterMatches = await processRosterEntriesForUser(user);

    logger.info(`User logged in: ${user.email}${newRosterMatches > 0 ? ` (matched ${newRosterMatches} new roster entries)` : ''}`);

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: user.roles,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ApiError(400, 'Refresh token is required');
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Find user
    const user = await User.findById(payload.userId);
    if (!user || !user.isActive) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({
      success: true,
      data: {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // In a more advanced implementation, you would invalidate the token
    // by storing it in a blacklist (Redis) until it expires

    res.json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: user.roles,
          lastLogin: user.lastLogin,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
