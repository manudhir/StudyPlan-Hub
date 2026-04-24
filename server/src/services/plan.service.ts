import * as planModel from '../models/plan.model';
import * as taskModel from '../models/task.model';
import * as followModel from '../models/follow.model';
import * as progressModel from '../models/progress.model';
import * as ratingModel from '../models/rating.model';

export const createPlan = async (
  userId: number,
  payload: {
    title: string;
    description: string;
    category: string;
    durationDays: number;
    tasks: Array<{ day: number; title: string; description: string }>;
  },
) => {
  const plan = await planModel.createStudyPlan(
    userId,
    payload.title,
    payload.description,
    payload.category,
    payload.durationDays,
  );

  const tasks = await taskModel.insertPlanTasks(plan.id, payload.tasks);
  return { ...plan, tasks };
};

export const getPlans = async (query: {
  search?: string;
  category?: string;
  minRating?: number;
  sortBy?: string;
  maxDuration?: number;
}) => {
  return planModel.listStudyPlans({
    search: query.search,
    category: query.category,
    minRating: query.minRating,
    sortBy: query.sortBy as 'popular' | 'rating' | 'duration' | undefined,
    maxDuration: query.maxDuration,
  });
};

export const getPopularPlans = async () => {
  return planModel.getPopularStudyPlans();
};

export const getPlanById = async (planId: number) => {
  const plan = await planModel.findPlanById(planId);
  if (!plan) {
    throw { status: 404, message: 'Study plan not found' };
  }

  const tasks = await taskModel.getPlanTasks(planId);
  return { ...plan, tasks };
};

export const updatePlan = async (
  userId: number,
  planId: number,
  updates: Partial<{
    title: string;
    description: string;
    category: string;
    durationDays: number;
    tasks: Array<{ day: number; title: string; description: string }>;
  }>,
) => {
  const ownerId = await planModel.findPlanOwner(planId);
  if (!ownerId || ownerId !== userId) {
    throw { status: 403, message: 'Forbidden' };
  }

  const plan = await planModel.updateStudyPlan(planId, updates);
  if (!plan) {
    throw { status: 404, message: 'Study plan not found' };
  }

  if (updates.tasks) {
    await taskModel.deletePlanTasks(planId);
    await taskModel.insertPlanTasks(planId, updates.tasks);
  }

  const tasks = await taskModel.getPlanTasks(planId);
  return { ...plan, tasks };
};

export const deletePlan = async (userId: number, planId: number) => {
  const ownerId = await planModel.findPlanOwner(planId);
  if (!ownerId || ownerId !== userId) {
    throw { status: 403, message: 'Forbidden' };
  }

  await planModel.deleteStudyPlan(planId);
};

export const followPlan = async (userId: number, planId: number) => {
  const existing = await followModel.isFollowingPlan(userId, planId);
  if (existing) {
    throw { status: 400, message: 'Already following this plan' };
  }

  await followModel.addFollower(userId, planId);
  await planModel.updateFollowerCount(planId, 1);
  return { success: true };
};

export const unfollowPlan = async (userId: number, planId: number) => {
  const existing = await followModel.isFollowingPlan(userId, planId);
  if (!existing) {
    throw { status: 400, message: 'Not following this plan' };
  }

  await followModel.removeFollower(userId, planId);
  await planModel.updateFollowerCount(planId, -1);
  return { success: true };
};

export const getPlanProgress = async (userId: number, planId: number) => {
  const plan = await planModel.findPlanById(planId);
  if (!plan) {
    throw { status: 404, message: 'Study plan not found' };
  }

  const tasks = await taskModel.getPlanTasks(planId);
  const completedTaskIds = await progressModel.getCompletedTaskIds(userId, planId);
  const completedCount = completedTaskIds.length;
  const completionRate = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  return {
    planId,
    totalTasks: tasks.length,
    completedTaskIds,
    completionRate,
    tasks,
  };
};

export const updateProgress = async (
  userId: number,
  planId: number,
  completedTaskIds: number[],
) => {
  const plan = await planModel.findPlanById(planId);
  if (!plan) {
    throw { status: 404, message: 'Study plan not found' };
  }

  const tasks = await taskModel.getPlanTasks(planId);
  const validTaskIds = tasks.map((task) => task.id);
  const sanitizedTaskIds = completedTaskIds.filter((id) => validTaskIds.includes(id));

  await progressModel.deleteProgressForPlan(userId, planId);
  await progressModel.insertProgress(userId, planId, sanitizedTaskIds);

  const completionRate = tasks.length
    ? Math.round((sanitizedTaskIds.length / tasks.length) * 100)
    : 0;

  return {
    planId,
    completedTaskIds: sanitizedTaskIds,
    completionRate,
  };
};

export const ratePlan = async (userId: number, planId: number, rating: number) => {
  const plan = await planModel.findPlanById(planId);
  if (!plan) {
    throw { status: 404, message: 'Study plan not found' };
  }

  await ratingModel.upsertRating(userId, planId, rating);
  const averageRating = await ratingModel.calculateAverageRating(planId);
  await planModel.updateAverageRating(planId, averageRating);

  return { planId, rating, averageRating };
};
