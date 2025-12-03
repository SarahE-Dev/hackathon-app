import { Request, Response, NextFunction } from 'express';
import { Organization } from '../models';

let cachedOrgId: string | null = null;

/**
 * Middleware to inject default organization ID into request
 * Since this is a single-organization platform (Justice Through Code),
 * we automatically inject the org ID so controllers don't need to worry about it
 */
export const injectOrganization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Use cached org ID if available
    if (!cachedOrgId) {
      const org = await Organization.findOne().lean();
      if (!org) {
        return res.status(500).json({
          error: {
            message: 'No organization found. Please run database seed.'
          }
        });
      }
      cachedOrgId = org._id.toString();
    }

    // Inject organization ID into request for use by controllers
    req.organizationId = cachedOrgId;
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
