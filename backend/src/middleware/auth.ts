import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { ApiError } from './errorHandler';
import { UserRole } from '../../../shared/src/types/common';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'No token provided');
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    req.user = payload;
    next();
  } catch (error) {
    next(new ApiError(401, 'Invalid or expired token'));
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    const userRoles = req.user.roles.map((r: any) => r.role);
    const hasRole = roles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return next(
        new ApiError(403, 'Insufficient permissions for this action')
      );
    }

    next();
  };
};

export const requireOrganization = (organizationIdParam: string = 'organizationId') => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }

    const organizationId = req.params[organizationIdParam] || req.body.organizationId;

    if (!organizationId) {
      return next(new ApiError(400, 'Organization ID required'));
    }

    const hasOrgAccess = req.user.roles.some(
      (r: any) => r.organizationId === organizationId
    );

    if (!hasOrgAccess) {
      return next(
        new ApiError(403, 'Access denied to this organization')
      );
    }

    next();
  };
};

export const optionalAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyAccessToken(token);
      req.user = payload;
    }

    next();
  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};
