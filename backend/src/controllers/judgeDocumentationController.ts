import { Response, NextFunction } from 'express';
import JudgeDocumentation from '../models/JudgeDocumentation';
import { ApiError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

/**
 * Get all documentation for an organization (optionally filtered by hackathon session)
 */
export const getDocumentation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId, hackathonSessionId, type, includeDefaults } = req.query;

    const query: any = {};

    if (organizationId) {
      query.organizationId = organizationId;
    }

    if (hackathonSessionId) {
      // Get session-specific docs or default org-wide docs
      if (includeDefaults === 'true') {
        query.$or = [
          { hackathonSessionId },
          { isDefault: true, organizationId },
        ];
      } else {
        query.hackathonSessionId = hackathonSessionId;
      }
    }

    if (type) {
      query.type = type;
    }

    // Only show active docs by default
    query.isActive = true;

    const documentation = await JudgeDocumentation.find(query)
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName')
      .populate('hackathonSessionId', 'title')
      .sort({ type: 1, createdAt: -1 });

    res.json({
      success: true,
      data: { documentation },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all documentation (admin view - includes inactive)
 */
export const getAllDocumentation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId, hackathonSessionId, type } = req.query;

    const query: any = {};

    if (organizationId) {
      query.organizationId = organizationId;
    }

    if (hackathonSessionId) {
      query.hackathonSessionId = hackathonSessionId;
    }

    if (type) {
      query.type = type;
    }

    const documentation = await JudgeDocumentation.find(query)
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName')
      .populate('hackathonSessionId', 'title')
      .populate('organizationId', 'name')
      .sort({ type: 1, updatedAt: -1 });

    res.json({
      success: true,
      data: { documentation },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single documentation by ID
 */
export const getDocumentationById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const documentation = await JudgeDocumentation.findById(id)
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName')
      .populate('hackathonSessionId', 'title')
      .populate('organizationId', 'name');

    if (!documentation) {
      throw new ApiError(404, 'Documentation not found');
    }

    res.json({
      success: true,
      data: { documentation },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new documentation
 */
export const createDocumentation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      hackathonSessionId,
      organizationId,
      title,
      type,
      rubricCriteria,
      faqs,
      content,
      isActive,
      isDefault,
    } = req.body;

    // Validate required fields
    if (!organizationId || !title || !type) {
      throw new ApiError(400, 'Organization ID, title, and type are required');
    }

    // Validate type-specific content
    if (type === 'rubric' && (!rubricCriteria || rubricCriteria.length === 0)) {
      throw new ApiError(400, 'Rubric documentation requires at least one criterion');
    }

    if (type === 'faq' && (!faqs || faqs.length === 0)) {
      throw new ApiError(400, 'FAQ documentation requires at least one FAQ entry');
    }

    if ((type === 'guide' || type === 'general') && !content) {
      throw new ApiError(400, 'Guide/General documentation requires content');
    }

    const documentation = new JudgeDocumentation({
      hackathonSessionId,
      organizationId,
      title,
      type,
      rubricCriteria,
      faqs,
      content,
      isActive: isActive !== false,
      isDefault: isDefault || false,
      createdBy: req.user!.userId,
      lastUpdatedBy: req.user!.userId,
    });

    await documentation.save();

    const populated = await JudgeDocumentation.findById(documentation._id)
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName')
      .populate('hackathonSessionId', 'title')
      .populate('organizationId', 'name');

    res.status(201).json({
      success: true,
      data: { documentation: populated },
      message: 'Documentation created successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update existing documentation
 */
export const updateDocumentation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const {
      hackathonSessionId,
      title,
      type,
      rubricCriteria,
      faqs,
      content,
      isActive,
      isDefault,
    } = req.body;

    const documentation = await JudgeDocumentation.findById(id);

    if (!documentation) {
      throw new ApiError(404, 'Documentation not found');
    }

    // Update fields
    if (hackathonSessionId !== undefined) documentation.hackathonSessionId = hackathonSessionId;
    if (title) documentation.title = title;
    if (type) documentation.type = type;
    if (rubricCriteria !== undefined) documentation.rubricCriteria = rubricCriteria;
    if (faqs !== undefined) documentation.faqs = faqs;
    if (content !== undefined) documentation.content = content;
    if (isActive !== undefined) documentation.isActive = isActive;
    if (isDefault !== undefined) documentation.isDefault = isDefault;

    documentation.lastUpdatedBy = req.user!.userId as any;

    await documentation.save();

    const populated = await JudgeDocumentation.findById(documentation._id)
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName')
      .populate('hackathonSessionId', 'title')
      .populate('organizationId', 'name');

    res.json({
      success: true,
      data: { documentation: populated },
      message: 'Documentation updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete documentation
 */
export const deleteDocumentation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const documentation = await JudgeDocumentation.findByIdAndDelete(id);

    if (!documentation) {
      throw new ApiError(404, 'Documentation not found');
    }

    res.json({
      success: true,
      message: 'Documentation deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle documentation active status
 */
export const toggleDocumentationStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const documentation = await JudgeDocumentation.findById(id);

    if (!documentation) {
      throw new ApiError(404, 'Documentation not found');
    }

    documentation.isActive = !documentation.isActive;
    documentation.lastUpdatedBy = req.user!.userId as any;
    await documentation.save();

    res.json({
      success: true,
      data: { documentation },
      message: `Documentation ${documentation.isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Duplicate documentation (useful for creating session-specific from defaults)
 */
export const duplicateDocumentation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { hackathonSessionId, title } = req.body;

    const original = await JudgeDocumentation.findById(id);

    if (!original) {
      throw new ApiError(404, 'Documentation not found');
    }

    const duplicate = new JudgeDocumentation({
      hackathonSessionId: hackathonSessionId || original.hackathonSessionId,
      organizationId: original.organizationId,
      title: title || `${original.title} (Copy)`,
      type: original.type,
      rubricCriteria: original.rubricCriteria,
      faqs: original.faqs,
      content: original.content,
      isActive: true,
      isDefault: false,
      createdBy: req.user!.userId,
      lastUpdatedBy: req.user!.userId,
    });

    await duplicate.save();

    const populated = await JudgeDocumentation.findById(duplicate._id)
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName')
      .populate('hackathonSessionId', 'title')
      .populate('organizationId', 'name');

    res.status(201).json({
      success: true,
      data: { documentation: populated },
      message: 'Documentation duplicated successfully',
    });
  } catch (error) {
    next(error);
  }
};
