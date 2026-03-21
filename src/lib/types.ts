export interface Task {
  id: number;
  name: string | null;
  details: string;
  position: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  sync_id: string | null;
  deleted_at: string | null;
}

export interface Bucket {
  label: string;
  tasks: Task[];
}

export type StorageMode = 'local' | 'remote';
export type SyncStatus = 'disconnected' | 'connected' | 'syncing' | 'offline';

export interface AuthState {
  user: { uid: string; email: string | null } | null;
  status: 'signed-out' | 'pending' | 'signed-in';
}

export interface TaskProvider {
  getAll(): Promise<Task[]>;
  create(params: { name?: string | null; details?: string }): Promise<Task>;
  update(id: number, params: { name?: string | null; details?: string }): Promise<Task>;
  close(id: number): Promise<Task>;
  reopen(id: number): Promise<Task>;
  delete(id: number): Promise<void>;
  reorder(id: number, newPosition: number): Promise<Task>;
  subscribe?(callback: () => void): () => void;
}
