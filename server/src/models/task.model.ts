import pool from '../config/db';

export interface TaskRecord {
  id: number;
  plan_id: number;
  day_number: number;
  title: string;
  description: string;
}

export const insertPlanTasks = async (
  planId: number,
  tasks: Array<{ day: number; title: string; description: string }>,
) => {
  if (!tasks.length) {
    return [];
  }

  const values: any[] = [];
  const inserts: string[] = tasks.map((task, index) => {
    const offset = index * 4;
    values.push(planId, task.day, task.title, task.description);
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
  });

  const result = await pool.query(
    `INSERT INTO tasks (plan_id, day_number, title, description)
     VALUES ${inserts.join(', ')} RETURNING *`,
    values,
  );

  return result.rows;
};

export const getPlanTasks = async (planId: number) => {
  const result = await pool.query(
    `SELECT id, day_number AS day, title, description
     FROM tasks
     WHERE plan_id = $1
     ORDER BY day_number ASC`,
    [planId],
  );
  return result.rows;
};

export const deletePlanTasks = async (planId: number) => {
  await pool.query('DELETE FROM tasks WHERE plan_id = $1', [planId]);
};

export const countPlanTasks = async (planId: number) => {
  const result = await pool.query('SELECT COUNT(*) FROM tasks WHERE plan_id = $1', [planId]);
  return Number(result.rows[0]?.count || 0);
};
