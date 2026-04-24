import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await userService.getUserProfile(req.user!.id);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};
