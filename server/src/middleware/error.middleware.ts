import { NextFunction, Request, Response } from 'express';

export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error(error);

  const status = error.status || 500;
  const message = error.message || 'Internal server error';
  const details = error.details || undefined;

  res.status(status).json({ success: false, message, details });
};
