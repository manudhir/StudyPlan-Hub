import * as userModel from '../models/user.model';

export const getUserProfile = async (userId: number) => {
  const user = await userModel.findUserById(userId);
  if (!user) {
    throw { status: 404, message: 'User not found' };
  }

  const createdPlans = await userModel.getUserCreatedPlans(userId);
  const followedPlans = await userModel.getUserFollowedPlans(userId);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.created_at,
    createdPlans,
    followedPlans,
  };
};
