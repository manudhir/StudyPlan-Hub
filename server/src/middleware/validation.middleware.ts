import { NextFunction, Request, Response } from 'express';
import { ObjectSchema } from 'joi';
import xss from 'xss';

const sanitize = (obj: any): any => {
  if (typeof obj === 'string') {
    return xss(obj, {
      whiteList: {}, // No HTML tags allowed
      stripIgnoreTag: true,
    });
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }
  if (typeof obj === 'object' && obj !== null) {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, sanitize(v)]));
  }
  return obj;
};

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
        timestamp: new Date().toISOString(),
      });
    }

    // Sanitize all string inputs against XSS
    req.body = sanitize(value);
    next();
  };
};
