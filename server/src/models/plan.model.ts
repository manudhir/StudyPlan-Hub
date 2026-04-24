import pool from '../config/db';

export interface PlanRecord {
  id: number;
  creator_id: number;
  title: string;
  description: string;
  category: string;
  duration_days: number;
  average_rating: number;
  follower_count: number;
  created_at: string;
  updated_at: string;
}

export const createStudyPlan = async (
  creatorId: number,
  title: string,
  description: string,
  category: string,
  durationDays: number,
): Promise<PlanRecord> => {
  const result = await pool.query(
    `INSERT INTO study_plans (creator_id, title, description, category, duration_days)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [creatorId, title, description, category, durationDays],
  );

  return result.rows[0];
};

export const updateStudyPlan = async (
  planId: number,
  updates: Partial<{
    title: string;
    description: string;
    category: string;
    durationDays: number;
  }>,
): Promise<PlanRecord | null> => {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.title) {
    fields.push('title = $' + (values.length + 1));
    values.push(updates.title);
  }
  if (updates.description) {
    fields.push('description = $' + (values.length + 1));
    values.push(updates.description);
  }
  if (updates.category) {
    fields.push('category = $' + (values.length + 1));
    values.push(updates.category);
  }
  if (typeof updates.durationDays === 'number') {
    fields.push('duration_days = $' + (values.length + 1));
    values.push(updates.durationDays);
  }

  if (!fields.length) {
    const existing = await pool.query('SELECT * FROM study_plans WHERE id = $1', [planId]);
    return existing.rows[0] || null;
  }

  values.push(planId);
  const result = await pool.query(
    `UPDATE study_plans SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${
      values.length
    } RETURNING *`,
    values,
  );

  return result.rows[0] || null;
};

export const deleteStudyPlan = async (planId: number) => {
  await pool.query('DELETE FROM study_plans WHERE id = $1', [planId]);
};

export const findPlanById = async (planId: number): Promise<PlanRecord | null> => {
  const result = await pool.query('SELECT * FROM study_plans WHERE id = $1', [planId]);
  return result.rows[0] || null;
};

export const findPlanOwner = async (planId: number): Promise<number | null> => {
  const result = await pool.query('SELECT creator_id FROM study_plans WHERE id = $1', [planId]);
  return result.rows[0]?.creator_id || null;
};

export const listStudyPlans = async (filters: {
  search?: string;
  category?: string;
  minRating?: number;
  maxDuration?: number;
  sortBy?: 'popular' | 'rating' | 'duration';
}) => {
  const conditions: string[] = [];
  const values: any[] = [];

  if (filters.search) {
    values.push(`%${filters.search.toLowerCase()}%`);
    conditions.push('LOWER(title) LIKE $' + values.length);
  }

  if (filters.category) {
    values.push(filters.category);
    conditions.push('category = $' + values.length);
  }

  if (typeof filters.minRating === 'number') {
    values.push(filters.minRating);
    conditions.push('average_rating >= $' + values.length);
  }

  if (typeof filters.maxDuration === 'number') {
    values.push(filters.maxDuration);
    conditions.push('duration_days <= $' + values.length);
  }

  let orderBy = 'created_at DESC';
  if (filters.sortBy === 'popular') {
    orderBy = 'follower_count DESC, average_rating DESC';
  } else if (filters.sortBy === 'rating') {
    orderBy = 'average_rating DESC, follower_count DESC';
  } else if (filters.sortBy === 'duration') {
    orderBy = 'duration_days ASC';
  }

  const query = `SELECT id, title, description, category, duration_days AS "durationDays", average_rating AS "averageRating", follower_count AS "followerCount", creator_id AS "creatorId"
    FROM study_plans
    ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}
    ORDER BY ${orderBy}`;

  const result = await pool.query(query, values);
  return result.rows;
};

export const getPopularStudyPlans = async () => {
  const result = await pool.query(
    `SELECT id, title, description, category, duration_days AS "durationDays", average_rating AS "averageRating", follower_count AS "followerCount", creator_id AS "creatorId"
     FROM study_plans
     ORDER BY follower_count DESC, average_rating DESC
     LIMIT 12`,
  );
  return result.rows;
};

export const updateFollowerCount = async (planId: number, delta: number) => {
  await pool.query(
    'UPDATE study_plans SET follower_count = GREATEST(follower_count + $1, 0) WHERE id = $2',
    [delta, planId],
  );
};

export const updateAverageRating = async (planId: number, averageRating: number) => {
  await pool.query('UPDATE study_plans SET average_rating = $1 WHERE id = $2', [averageRating, planId]);
};
