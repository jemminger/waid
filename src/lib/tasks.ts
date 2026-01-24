import { getDb } from './db';
import type { Task } from './types';

export async function getAllTasks(): Promise<Task[]> {
  const db = await getDb();
  return db.select<Task[]>('SELECT * FROM tasks ORDER BY position ASC');
}

export async function createTask({ name, details }: { name?: string | null; details?: string }): Promise<Task> {
  const db = await getDb();
  const rows = await db.select<{ next_pos: number }[]>('SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM tasks');
  const position = rows[0].next_pos;

  const result = await db.execute(
    'INSERT INTO tasks (name, details, position) VALUES (?, ?, ?)',
    [name ?? null, details ?? '', position]
  );

  const tasks = await db.select<Task[]>('SELECT * FROM tasks WHERE id = ?', [result.lastInsertId]);
  return tasks[0];
}

export async function updateTask(id: number, { name, details }: { name?: string | null; details?: string }): Promise<Task> {
  const db = await getDb();
  await db.execute(
    "UPDATE tasks SET name = ?, details = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?",
    [name ?? null, details ?? '', id]
  );

  const tasks = await db.select<Task[]>('SELECT * FROM tasks WHERE id = ?', [id]);
  return tasks[0];
}

export async function closeTask(id: number): Promise<Task> {
  const db = await getDb();
  await db.execute(
    "UPDATE tasks SET closed_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?",
    [id]
  );

  const tasks = await db.select<Task[]>('SELECT * FROM tasks WHERE id = ?', [id]);
  return tasks[0];
}

export async function reopenTask(id: number): Promise<Task> {
  const db = await getDb();
  await db.execute(
    "UPDATE tasks SET closed_at = NULL, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?",
    [id]
  );

  const tasks = await db.select<Task[]>('SELECT * FROM tasks WHERE id = ?', [id]);
  return tasks[0];
}

export async function deleteTask(id: number): Promise<void> {
  const db = await getDb();
  await db.execute('DELETE FROM tasks WHERE id = ?', [id]);
}

export async function reorderTask(id: number, newPosition: number): Promise<Task> {
  const db = await getDb();
  await db.execute(
    "UPDATE tasks SET position = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?",
    [newPosition, id]
  );

  const tasks = await db.select<Task[]>('SELECT * FROM tasks WHERE id = ?', [id]);
  return tasks[0];
}
