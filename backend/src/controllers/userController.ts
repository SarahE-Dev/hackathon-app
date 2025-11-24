import { Response, NextFunction } from 'express';
import User from '../models/User';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { hashPassword } from '../utils/password';
import { UserRole } from '../../../shared/src/types/common';

export const getAllUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId, role, page = 1, limit = 50 } = req.query;

    const query: any = {};

    if (organizationId) {
      query['roles.organizationId'] = organizationId;
    }

    if (role) {
      query['roles.role'] = role;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash')
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-passwordHash');
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, firstName, lastName, roles, organizationId } = req.body;

    if (!email || !password || !firstName || !lastName) {
      throw new ApiError(400, 'All fields are required');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(409, 'User with this email already exists');
    }

    const passwordHash = await hashPassword(password);

    const user = new User({
      email: email.toLowerCase(),
      firstName,
      lastName,
      passwordHash,
      roles: roles || (organizationId ? [{ role: UserRole.FELLOW, organizationId }] : []),
      isActive: true,
      emailVerified: false,
    });

    await user.save();

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
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, isActive, emailVerified } = req.body;

    const user = await User.findById(id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Update allowed fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (isActive !== undefined) user.isActive = isActive;
    if (emailVerified !== undefined) user.emailVerified = emailVerified;

    await user.save();

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roles: user.roles,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    res.json({
      success: true,
      data: {
        message: 'User deleted successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const addUserRole = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { role, organizationId, cohortId } = req.body;

    if (!role || !organizationId) {
      throw new ApiError(400, 'Role and organizationId are required');
    }

    const user = await User.findById(id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Check if role already exists
    const existingRole = user.roles.find(
      (r) => r.role === role && r.organizationId.toString() === organizationId
    );

    if (existingRole) {
      throw new ApiError(409, 'User already has this role in this organization');
    }

    user.roles.push({ role, organizationId, cohortId });
    await user.save();

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          roles: user.roles,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const removeUserRole = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { role, organizationId } = req.body;

    if (!role || !organizationId) {
      throw new ApiError(400, 'Role and organizationId are required');
    }

    const user = await User.findById(id);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    user.roles = user.roles.filter(
      (r) => !(r.role === role && r.organizationId.toString() === organizationId)
    );

    await user.save();

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          roles: user.roles,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
