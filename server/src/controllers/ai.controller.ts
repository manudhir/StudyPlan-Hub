import { Request, Response, NextFunction } from 'express';
import * as aiService from '../services/ai.service';

export const suggestPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subject, duration, level } = req.body;

    // Validate input
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Subject is required and must be a non-empty string',
      });
    }

    if (!duration || typeof duration !== 'number' || duration < 1 || duration > 365) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be a number between 1 and 365',
      });
    }

    if (!level || !['beginner', 'intermediate', 'advanced'].includes(level)) {
      return res.status(400).json({
        success: false,
        message: 'Level must be one of: beginner, intermediate, advanced',
      });
    }

    const suggestion = aiService.suggestStudyPlan({
      subject: subject.trim(),
      duration: Math.floor(duration),
      level,
    });

    res.status(200).json({
      success: true,
      data: suggestion,
    });
  } catch (error) {
    next(error);
  }
};
