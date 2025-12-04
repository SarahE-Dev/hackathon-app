import { Request, Response, NextFunction } from 'express';

// Rate limiting disabled for small hackathon (~20 users)
// Can be re-enabled with express-rate-limit if needed for larger deployments

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  next(); // No-op - just pass through
};

export const authRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  next(); // No-op - just pass through
};
