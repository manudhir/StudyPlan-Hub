import { NextFunction, Request, Response } from 'express';
import { ObjectSchema } from 'joi';

export const validateBody = (schema: ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        details: error.details.map((detail) => detail.message),
      });
    }

    req.body = value;
    next();
  };
};
