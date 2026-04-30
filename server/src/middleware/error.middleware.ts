import { NextFunction, Request, Response } from 'express';
import logger from '../utils/logger';

interface CustomError extends Error {
  status?: number;
  details?: any;
  retryable?: boolean;
}

export const errorHandler = (error: CustomError, req: Request, res: Response, next: NextFunction) => {
  const status = error.status || 500;
  const message = error.message || 'Internal server error';
  const details = error.details || undefined;

  // Determine if error is retryable (client should retry)
  const isRetryable = error.retryable === true || (status >= 500 && status !== 501);

  // Log error with request context
  logger.error({
    requestId: req.id,
    status,
    message,
    details,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    retryable: isRetryable,
    error: error.stack,
  });

  // Prevent leaking sensitive error details in production
  const publicMessage = status >= 500 && process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred. Please try again later.'
    : message;

  res.status(status).json({
    success: false,
    error: publicMessage,
    message: publicMessage,
    details: process.env.NODE_ENV === 'development' ? details : undefined,
    retryable: isRetryable,
    timestamp: new Date().toISOString(),
  });
};
