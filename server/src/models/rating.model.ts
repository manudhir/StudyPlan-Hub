import pool from '../config/db';

export const getRatingByUserAndPlan = async (userId: number, planId: number) => {
  const result = await pool.query(
    'SELECT * FROM ratings WHERE user_id = $1 AND plan_id = $2',
    [userId, planId],
  );
  return result.rows[0] || null;
};

export const upsertRating = async (
  userId: number,
  planId: number,
  rating: number,
) => {
  const result = await pool.query(
    `INSERT INTO ratings (user_id, plan_id, rating)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, plan_id)
     DO UPDATE SET rating = EXCLUDED.rating, updated_at = NOW()
     RETURNING *`,
    [userId, planId, rating],
  );
  return result.rows[0];
};

export const calculateAverageRating = async (planId: number) => {
  const result = await pool.query(
    'SELECT AVG(rating)::numeric(10,2) AS average_rating FROM ratings WHERE plan_id = $1',
    [planId],
  );
  return Number(result.rows[0]?.average_rating || 0);
};
