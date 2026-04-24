import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt.util';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const token = authorization.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: Number(payload.sub) };
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};
