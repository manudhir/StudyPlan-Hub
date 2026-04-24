import pool from '../config/db';

export const getCompletedTaskIds = async (userId: number, planId: number) => {
  const result = await pool.query(
    `SELECT task_id FROM progress WHERE user_id = $1 AND plan_id = $2 AND completed = true`,
    [userId, planId],
  );
  return result.rows.map((row: { task_id: number }) => row.task_id);
};

export const deleteProgressForPlan = async (userId: number, planId: number) => {
  await pool.query('DELETE FROM progress WHERE user_id = $1 AND plan_id = $2', [userId, planId]);
};

export const insertProgress = async (userId: number, planId: number, taskIds: number[]) => {
  if (!taskIds.length) {
    return;
  }

  const inserts: string[] = [];
  const values: any[] = [];
  taskIds.forEach((taskId, index) => {
    inserts.push(`($1, $2, $${index + 3}, true)`);
    values.push(taskId);
  });

  await pool.query(
    `INSERT INTO progress (user_id, plan_id, task_id, completed)
     VALUES ${inserts.join(', ')}
     ON CONFLICT (user_id, plan_id, task_id) DO UPDATE SET completed = EXCLUDED.completed`,
    [userId, planId, ...values],
  );
};

export const countCompletedTasks = async (userId: number, planId: number) => {
  const result = await pool.query(
    'SELECT COUNT(*) FROM progress WHERE user_id = $1 AND plan_id = $2 AND completed = true',
    [userId, planId],
  );
  return Number(result.rows[0]?.count || 0);
};
