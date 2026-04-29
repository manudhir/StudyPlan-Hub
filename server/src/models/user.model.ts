import pool from '../config/db';
import { mapPlanRow } from './plan.model';

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
    `SELECT
       sp.id,
       sp.creator_id AS "creatorId",
       sp.title,
       sp.description,
       sp.category,
       sp.duration_days::int AS "durationDays",
       COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0)::float8 AS "averageRating",
       COUNT(DISTINCT f.user_id)::int AS "followerCount",
       sp.created_at AS "createdAt",
       sp.updated_at AS "updatedAt"
     FROM study_plans sp
     LEFT JOIN ratings r ON r.plan_id = sp.id
     LEFT JOIN followers f ON f.plan_id = sp.id
     WHERE sp.creator_id = $1
     GROUP BY sp.id, sp.creator_id, sp.title, sp.description, sp.category, sp.duration_days, sp.created_at, sp.updated_at
     ORDER BY sp.created_at DESC`,
    [userId],
  );

  return result.rows.map(mapPlanRow);
};

export const getUserFollowedPlans = async (userId: number) => {
  const result = await pool.query(
    `SELECT
       sp.id,
       sp.creator_id AS "creatorId",
       sp.title,
       sp.description,
       sp.category,
       sp.duration_days::int AS "durationDays",
       COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0)::float8 AS "averageRating",
       COUNT(DISTINCT all_follows.user_id)::int AS "followerCount",
       sp.created_at AS "createdAt",
       sp.updated_at AS "updatedAt"
     FROM study_plans sp
     JOIN followers user_follows ON user_follows.plan_id = sp.id AND user_follows.user_id = $1
     LEFT JOIN ratings r ON r.plan_id = sp.id
     LEFT JOIN followers all_follows ON all_follows.plan_id = sp.id
     GROUP BY sp.id, sp.creator_id, sp.title, sp.description, sp.category, sp.duration_days, sp.created_at, sp.updated_at, user_follows.created_at
     ORDER BY user_follows.created_at DESC`,
    [userId],
  );

  return result.rows.map(mapPlanRow);
};
