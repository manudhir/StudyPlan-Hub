import { Request, Response, NextFunction } from 'express';
import * as planService from '../services/plan.service';

export const createPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await planService.createPlan(req.user!.id, req.body);
    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
};

export const getPlans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await planService.getPlans({
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
      minRating: req.query.minRating ? Number(req.query.minRating) : undefined,
      maxDuration: req.query.duration ? Number(req.query.duration) : undefined,
      sortBy: typeof req.query.sortBy === 'string' ? req.query.sortBy : undefined,
    });
    res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
};

export const getPopularPlans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await planService.getPopularPlans();
    res.json({ success: true, data: plans });
  } catch (error) {
    next(error);
  }
};

export const getPlanById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const planId = Number(req.params.planId);
    const plan = await planService.getPlanById(planId);
    res.json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
};

export const updatePlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const planId = Number(req.params.planId);
    const plan = await planService.updatePlan(req.user!.id, planId, req.body);
    res.json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
};

export const deletePlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const planId = Number(req.params.planId);
    await planService.deletePlan(req.user!.id, planId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const followPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const planId = Number(req.params.planId);
    await planService.followPlan(req.user!.id, planId);
    res.status(200).json({ success: true, message: 'Plan followed' });
  } catch (error) {
    next(error);
  }
};

export const unfollowPlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const planId = Number(req.params.planId);
    await planService.unfollowPlan(req.user!.id, planId);
    res.status(200).json({ success: true, message: 'Plan unfollowed' });
  } catch (error) {
    next(error);
  }
};

export const getPlanProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const planId = Number(req.params.planId);
    const progress = await planService.getPlanProgress(req.user!.id, planId);
    res.json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
};

export const updateProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const planId = Number(req.params.planId);
    const progress = await planService.updateProgress(req.user!.id, planId, req.body.completedTaskIds);
    res.json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
};

export const ratePlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const planId = Number(req.params.planId);
    const rating = Number(req.body.rating);
    const result = await planService.ratePlan(req.user!.id, planId, rating);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

