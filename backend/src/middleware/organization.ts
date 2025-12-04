import { Request, Response, NextFunction } from 'express';
import { Organization } from '../models';

/**
 * Middleware to inject default organization ID into request
 * Since this is a single-organization platform (Justice Through Code),
 * we automatically inject the org ID so controllers don't need to worry about it
 */
export const injectOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Always fetch fresh org ID (no caching to avoid stale IDs after re-seed)
    const org = await Organization.findOne().lean();
    if (!org) {
      return res.status(500).json({
        error: {
          message: 'No organization found. Please run database seed.'
        }
      });
    }

    // Inject organization ID into request for use by controllers
    req.organizationId = org._id.toString();
    next();
  } catch (error) {
    console.error('Organization middleware error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to load organization'
      }
    });
  }
};

// Extend Express Request type to include organizationId
declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
    }
  }
}
