import { NextFunction, Request, Response } from 'express';
import logger from '../utils/logger';

export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  const status = error.status || 500;
  const message = error.message || 'Internal server error';
  const details = error.details || undefined;

  // Log error with request context
  logger.error({
    requestId: req.id,
    status,
    message,
    details,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    error: error.stack,
  });

  res.status(status).json({
    success: false,
    error: message,
    message: message,
    details,
    timestamp: new Date().toISOString(),
  });
};
