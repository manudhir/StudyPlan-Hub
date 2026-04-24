import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const taskSchema = Joi.object({
  day: Joi.number().integer().min(1).required(),
  title: Joi.string().min(1).required(),
  description: Joi.string().allow('').required(),
});

export const planSchema = Joi.object({
  title: Joi.string().min(5).max(200).required(),
  description: Joi.string().min(10).required(),
  category: Joi.string().min(2).max(100).required(),
  durationDays: Joi.number().integer().min(1).required(),
  tasks: Joi.array().items(taskSchema).min(1).required(),
});

export const planUpdateSchema = Joi.object({
  title: Joi.string().min(5).max(200),
  description: Joi.string().min(10),
  category: Joi.string().min(2).max(100),
  durationDays: Joi.number().integer().min(1),
  tasks: Joi.array().items(taskSchema).min(1),
});

export const progressSchema = Joi.object({
  completedTaskIds: Joi.array().items(Joi.number().integer().positive()).required(),
});

export const ratingSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
});
