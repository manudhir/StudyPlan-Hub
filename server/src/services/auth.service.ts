import * as userModel from '../models/user.model';
import * as refreshTokenModel from '../models/refreshToken.model';
import { hashPassword, comparePassword } from '../utils/password.util';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.util';

export const registerUser = async (input: {
  name: string;
  email: string;
  password: string;
}) => {
  const existing = await userModel.findUserByEmail(input.email);

  if (existing) {
    throw { status: 409, message: 'Email already exists' };
  }

  const passwordHash = await hashPassword(input.password);
  const user = await userModel.createUser(input.name, input.email, passwordHash);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.created_at,
  };
};

export const loginUser = async (input: { email: string; password: string }) => {
  const user = await userModel.findUserByEmail(input.email);

  if (!user) {
    throw { status: 401, message: 'Invalid credentials' };
  }

  const validPassword = await comparePassword(input.password, user.password);
  if (!validPassword) {
    throw { status: 401, message: 'Invalid credentials' };
  }

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);
  await refreshTokenModel.saveRefreshToken(user.id, refreshToken);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    accessToken,
    refreshToken,
  };
};

export const refreshUserToken = async (token: string) => {
  const payload = verifyRefreshToken(token);
  const stored = await refreshTokenModel.findRefreshToken(token);

  if (!stored) {
    throw { status: 401, message: 'Refresh token not found or expired' };
  }

  const userId = Number(payload.sub);
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);

  await refreshTokenModel.revokeRefreshToken(token);
  await refreshTokenModel.saveRefreshToken(userId, refreshToken);

  return { accessToken, refreshToken };
};

export const logoutUser = async (token: string) => {
  await refreshTokenModel.revokeRefreshToken(token);
};

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
