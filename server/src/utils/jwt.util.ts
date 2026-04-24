import jwt, { JwtPayload } from 'jsonwebtoken';

const accessSecret = process.env.JWT_ACCESS_SECRET || 'access-secret';
const refreshSecret = process.env.JWT_REFRESH_SECRET || 'refresh-secret';

export const signAccessToken = (userId: number) => {
  return jwt.sign({ sub: String(userId) }, accessSecret, { expiresIn: '15m' });
};

export const signRefreshToken = (userId: number) => {
  return jwt.sign({ sub: String(userId) }, refreshSecret, { expiresIn: '7d' });
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, accessSecret) as JwtPayload;
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, refreshSecret) as JwtPayload;
};
