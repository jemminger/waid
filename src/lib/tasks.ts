import { getProvider } from './providers';
import type { Task } from './types';

export async function getAllTasks(): Promise<Task[]> {
  return getProvider().getAll();
}

export async function createTask({ name, details }: { name?: string | null; details?: string }): Promise<Task> {
  return getProvider().create({ name, details });
}

export async function updateTask(id: number, { name, details }: { name?: string | null; details?: string }): Promise<Task> {
  return getProvider().update(id, { name, details });
}

export async function closeTask(id: number): Promise<Task> {
  return getProvider().close(id);
}

export async function reopenTask(id: number): Promise<Task> {
  return getProvider().reopen(id);
}

export async function deleteTask(id: number): Promise<void> {
  return getProvider().delete(id);
}

export async function reorderTask(id: number, newPosition: number): Promise<Task> {
  return getProvider().reorder(id, newPosition);
}
