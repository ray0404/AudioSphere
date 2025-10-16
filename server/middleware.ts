import { type Request, type Response, type NextFunction } from 'express';

// Wrapper for async route handlers to catch errors and pass them to the error-handling middleware
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};