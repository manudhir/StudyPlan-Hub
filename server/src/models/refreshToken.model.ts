import pool from '../config/db';

export const saveRefreshToken = async (userId: number, token: string) => {
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '7 days')
     ON CONFLICT (token) DO NOTHING`,
    [userId, token],
  );
};

export const findRefreshToken = async (token: string) => {
  const result = await pool.query(
    'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
    [token],
  );
  return result.rows[0] || null;
};

export const revokeRefreshToken = async (token: string) => {
  await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
};
