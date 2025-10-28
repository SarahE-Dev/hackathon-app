import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ApiError } from '../middleware/errorHandler';
import Organization from '../models/Organization';
import { logger } from '../utils/logger';

/**
 * Create a new organization
 * POST /api/organizations
 * Admin only
 */
export const createOrganization = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, slug, settings } = req.body;

    if (!name || !slug) {
      throw new ApiError(400, 'Name and slug are required');
    }

    // Check if slug already exists
    const existing = await Organization.findOne({ slug: slug.toLowerCase() });
    if (existing) {
      throw new ApiError(409, 'Organization with this slug already exists');
    }

    const organization = new Organization({
      name,
      slug: slug.toLowerCase(),
      settings: settings || {
        allowSelfRegistration: false,
        defaultRetakePolicy: 'none',
        timezone: 'America/New_York',
      },
    });

    await organization.save();

    logger.info(`Organization created: ${organization.name} (${organization.slug})`);

    res.status(201).json({
      success: true,
      data: {
        message: 'Organization created successfully',
        organization,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all organizations
 * GET /api/organizations
 */
export const getAllOrganizations = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const organizations = await Organization.find();

    res.json({
      success: true,
      data: {
        organizations,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get organization by ID
 * GET /api/organizations/:id
 */
export const getOrganizationById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const organization = await Organization.findById(id);
    if (!organization) {
      throw new ApiError(404, 'Organization not found');
    }

    res.json({
      success: true,
      data: {
        organization,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update organization
 * PUT /api/organizations/:id
 * Admin only
 */
export const updateOrganization = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { name, settings } = req.body;

    const organization = await Organization.findByIdAndUpdate(
      id,
      {
        ...(name && { name }),
        ...(settings && { settings }),
      },
      { new: true }
    );

    if (!organization) {
      throw new ApiError(404, 'Organization not found');
    }

    logger.info(`Organization updated: ${organization.name}`);

    res.json({
      success: true,
      data: {
        message: 'Organization updated successfully',
        organization,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete organization
 * DELETE /api/organizations/:id
 * Admin only
 */
export const deleteOrganization = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const organization = await Organization.findByIdAndDelete(id);
    if (!organization) {
      throw new ApiError(404, 'Organization not found');
    }

    logger.info(`Organization deleted: ${organization.name}`);

    res.json({
      success: true,
      data: {
        message: 'Organization deleted successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};
