import pool from '../config/db';

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  password: string;
  created_at: string;
}

export const findUserByEmail = async (email: string): Promise<UserRecord | null> => {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
};

export const findUserById = async (userId: number): Promise<UserRecord | null> => {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  return result.rows[0] || null;
};

export const createUser = async (
  name: string,
  email: string,
  password: string,
): Promise<UserRecord> => {
  const result = await pool.query(
    'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
    [name, email, password],
  );

  return result.rows[0];
};

export const getUserCreatedPlans = async (userId: number) => {
  const result = await pool.query(
    `SELECT id, title, category, duration_days AS "durationDays", average_rating AS "averageRating", follower_count AS "followerCount"
     FROM study_plans WHERE creator_id = $1 ORDER BY created_at DESC`,
    [userId],
  );

  return result.rows;
};

export const getUserFollowedPlans = async (userId: number) => {
  const result = await pool.query(
    `SELECT p.id, p.title, p.category, p.duration_days AS "durationDays", p.average_rating AS "averageRating", p.follower_count AS "followerCount"
     FROM study_plans p
     JOIN followers f ON f.plan_id = p.id
     WHERE f.user_id = $1
     ORDER BY f.created_at DESC`,
    [userId],
  );

  return result.rows;
};
