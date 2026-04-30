import pool from '../config/db';

export interface PlanRecord {
  id: number;
  creatorId: number;
  title: string;
  description: string;
  category: string;
  durationDays: number;
  averageRating: number;
  followerCount: number;
  createdAt: string;
  updatedAt: string;
}

const toNumber = (value: unknown, fallback = 0): number => {
  if (value === null || value === undefined) return fallback;
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  // Round to 2 decimal places for ratings
  return Math.round(numericValue * 100) / 100;
};

export const mapPlanRow = (row: any): PlanRecord => ({
  id: toNumber(row.id),
  creatorId: toNumber(row.creatorId ?? row.creator_id),
  title: row.title ?? '',
  description: row.description ?? '',
  category: row.category ?? '',
  durationDays: toNumber(row.durationDays ?? row.duration_days),
  averageRating: toNumber(row.averageRating ?? row.average_rating),
  followerCount: toNumber(row.followerCount ?? row.follower_count),
  createdAt: row.createdAt ?? row.created_at ?? '',
  updatedAt: row.updatedAt ?? row.updated_at ?? '',
});

const planSelect = `
  SELECT
    sp.id,
    sp.creator_id AS "creatorId",
    sp.title,
    sp.description,
    sp.category,
    sp.duration_days::int AS "durationDays",
    COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0)::numeric AS "averageRating",
    COUNT(DISTINCT f.user_id)::int AS "followerCount",
    sp.created_at AS "createdAt",
    sp.updated_at AS "updatedAt"
  FROM study_plans sp
  LEFT JOIN ratings r ON r.plan_id = sp.id
  LEFT JOIN followers f ON f.plan_id = sp.id
`;

const planGroupBy = `
  GROUP BY
    sp.id,
    sp.creator_id,
    sp.title,
    sp.description,
    sp.category,
    sp.duration_days,
    sp.created_at,
    sp.updated_at
`;

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
     RETURNING id`,
    [creatorId, title, description, category, durationDays],
  );

  const plan = await findPlanById(result.rows[0].id);
  if (!plan) {
    throw new Error('Failed to create study plan');
  }

  return plan;
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
    return findPlanById(planId);
  }

  values.push(planId);
  const result = await pool.query(
    `UPDATE study_plans SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${
      values.length
    } RETURNING id`,
    values,
  );

  if (!result.rows[0]) {
    return null;
  }

  return findPlanById(result.rows[0].id);
};

export const deleteStudyPlan = async (planId: number) => {
  await pool.query('DELETE FROM study_plans WHERE id = $1', [planId]);
};

export const findPlanById = async (planId: number): Promise<PlanRecord | null> => {
  const result = await pool.query(
    `${planSelect}
     WHERE sp.id = $1
     ${planGroupBy}`,
    [planId],
  );
  return result.rows[0] ? mapPlanRow(result.rows[0]) : null;
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
    conditions.push(
      `(LOWER(sp.title) LIKE $${values.length} OR LOWER(sp.description) LIKE $${
        values.length
      } OR LOWER(sp.category) LIKE $${values.length})`,
    );
  }

  if (filters.category) {
    values.push(filters.category);
    conditions.push('sp.category = $' + values.length);
  }

  const having: string[] = [];
  if (typeof filters.minRating === 'number') {
    values.push(filters.minRating);
    having.push('COALESCE(AVG(r.rating), 0) >= $' + values.length);
  }

  if (typeof filters.maxDuration === 'number') {
    values.push(filters.maxDuration);
    conditions.push('sp.duration_days <= $' + values.length);
  }

  let orderBy = 'sp.created_at DESC';
  if (filters.sortBy === 'popular') {
    orderBy = '"followerCount" DESC, "averageRating" DESC';
  } else if (filters.sortBy === 'rating') {
    orderBy = '"averageRating" DESC, "followerCount" DESC';
  } else if (filters.sortBy === 'duration') {
    orderBy = '"durationDays" ASC';
  }

  const query = `${planSelect}
    ${conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''}
    ${planGroupBy}
    ${having.length ? 'HAVING ' + having.join(' AND ') : ''}
    ORDER BY ${orderBy}`;

  const result = await pool.query(query, values);
  return result.rows.map(mapPlanRow);
};

export const getPopularStudyPlans = async () => {
  const result = await pool.query(
    `${planSelect}
     ${planGroupBy}
     ORDER BY "followerCount" DESC, "averageRating" DESC
     LIMIT 12`,
  );
  return result.rows.map(mapPlanRow);
};

export const updateFollowerCount = async (planId: number, delta: number) => {
  await pool.query(
    'UPDATE study_plans SET follower_count = GREATEST(follower_count + $1, 0) WHERE id = $2',
    [delta, planId],
  );
};

export const updateAverageRating = async (planId: number, averageRating: number) => {
  await pool.query('UPDATE study_plans SET average_rating = $1::numeric WHERE id = $2', [
    averageRating,
    planId,
  ]);
};
