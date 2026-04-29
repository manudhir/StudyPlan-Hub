import pool from '../config/db';
import { v4 as uuidv4 } from 'uuid';

export interface RefreshTokenRecord {
  id: number;
  user_id: number;
  token: string;
  family_id: string;
  revoked: boolean;
  created_at: string;
  expires_at: string;
}

export const saveRefreshToken = async (
  userId: number,
  token: string,
  familyId?: string
): Promise<RefreshTokenRecord> => {
  const fId = familyId || uuidv4();
  const result = await pool.query(
    `INSERT INTO refresh_tokens (user_id, token, family_id, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')
     RETURNING *`,
    [userId, token, fId]
  );
  return result.rows[0];
};

export const findRefreshToken = async (token: string): Promise<RefreshTokenRecord | null> => {
  const result = await pool.query(
    `SELECT * FROM refresh_tokens
     WHERE token = $1 AND expires_at > NOW()`,
    [token]
  );
  return result.rows[0] || null;
};

export const revokeRefreshToken = async (token: string): Promise<void> => {
  await pool.query(
    `UPDATE refresh_tokens SET revoked = true WHERE token = $1`,
    [token]
  );
};

export const revokeFamilyTokens = async (familyId: string): Promise<void> => {
  await pool.query(
    `UPDATE refresh_tokens SET revoked = true WHERE family_id = $1`,
    [familyId]
  );
};

export const revokeUserTokens = async (userId: number): Promise<void> => {
  await pool.query(
    `UPDATE refresh_tokens SET revoked = true WHERE user_id = $1`,
    [userId]
  );
};
