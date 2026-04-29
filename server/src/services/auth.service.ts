import * as userModel from '../models/user.model';
import * as refreshTokenModel from '../models/refreshToken.model';
import { hashPassword, comparePassword } from '../utils/password.util';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.util';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

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
  const familyId = uuidv4();

  await refreshTokenModel.saveRefreshToken(user.id, refreshToken, familyId);

  logger.info({
    event: 'user_login',
    userId: user.id,
    email: user.email,
  });

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

  // SECURITY: Detect token reuse attack
  if (stored.revoked) {
    // Token reuse detected - revoke entire family
    await refreshTokenModel.revokeFamilyTokens(stored.family_id);
    logger.warn({
      event: 'TOKEN_REUSE_DETECTED',
      userId: stored.user_id,
      familyId: stored.family_id,
    });
    throw {
      status: 401,
      message: 'Token reuse detected. Possible security breach. Please login again.'
    };
  }

  const userId = Number(payload.sub);
  const newFamilyId = uuidv4();

  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);

  // Revoke old token and save new one with new family ID
  await refreshTokenModel.revokeRefreshToken(token);
  await refreshTokenModel.saveRefreshToken(userId, refreshToken, newFamilyId);

  logger.info({
    event: 'token_refreshed',
    userId,
  });

  return { accessToken, refreshToken };
};

export const logoutUser = async (token: string) => {
  const stored = await refreshTokenModel.findRefreshToken(token);
  if (stored) {
    // Revoke entire token family on logout
    await refreshTokenModel.revokeFamilyTokens(stored.family_id);
    logger.info({
      event: 'user_logout',
      userId: stored.user_id,
    });
  }
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
