import pool from '../config/db';

export const isFollowingPlan = async (userId: number, planId: number) => {
  const result = await pool.query(
    'SELECT id FROM followers WHERE user_id = $1 AND plan_id = $2',
    [userId, planId],
  );
  return result.rows.length > 0;
};

export const addFollower = async (userId: number, planId: number) => {
  await pool.query(
    `INSERT INTO followers (user_id, plan_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [userId, planId],
  );
};

export const removeFollower = async (userId: number, planId: number) => {
  await pool.query('DELETE FROM followers WHERE user_id = $1 AND plan_id = $2', [userId, planId]);
};

export const getFollowerCount = async (planId: number) => {
  const result = await pool.query('SELECT COUNT(*) FROM followers WHERE plan_id = $1', [planId]);
  return Number(result.rows[0]?.count || 0);
};
