import { Request, Response, NextFunction } from 'express';
import * as aiService from '../services/ai.service';

export const suggestPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const suggestion = aiService.suggestStudyPlan({
      subject: req.body.subject,
      duration: req.body.duration,
      level: req.body.level,
    });

    res.status(200).json({
      success: true,
      data: suggestion,
    });
  } catch (error) {
    next(error);
  }
};
