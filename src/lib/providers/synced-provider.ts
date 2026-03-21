import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseFirestore } from '../firebase';
import { getDb } from '../db';
import type { Task, TaskProvider } from '../types';
import { SqliteProvider } from './sqlite-provider';

export class SyncedProvider implements TaskProvider {
  private sqlite = new SqliteProvider();
  private uid: string;
  private unsubscribeSnapshot: Unsubscribe | null = null;
  private subscribers: Set<() => void> = new Set();
  private processingRemote = false;

  constructor(uid: string) {
    this.uid = uid;
    this.startListener();
  }

  private tasksCollection() {
    const db = getFirebaseFirestore();
    return collection(db, 'users', this.uid, 'tasks');
  }

  private async pushToFirestore(task: Task): Promise<Task> {
    const data = {
      name: task.name,
      details: task.details,
      position: task.position,
      created_at: task.created_at,
      updated_at: task.updated_at,
      closed_at: task.closed_at,
      deleted_at: task.deleted_at,
    };

    if (task.sync_id) {
      await setDoc(doc(this.tasksCollection(), task.sync_id), data, { merge: true });
      return task;
    }

    // New task: create Firestore doc and save sync_id back to SQLite
    const docRef = doc(this.tasksCollection());
    await setDoc(docRef, data);

    const db = await getDb();
    await db.execute('UPDATE tasks SET sync_id = ? WHERE id = ?', [docRef.id, task.id]);
    task.sync_id = docRef.id;
    return task;
  }

  private startListener() {
    this.unsubscribeSnapshot = onSnapshot(this.tasksCollection(), async (snapshot) => {
      this.processingRemote = true;
      try {
        const db = await getDb();

        for (const change of snapshot.docChanges()) {
          const syncId = change.doc.id;
          const remote = change.doc.data();

          if (change.type === 'removed') {
            await db.execute(
              "UPDATE tasks SET deleted_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE sync_id = ?",
              [syncId]
            );
            continue;
          }

          // Check if local task exists with this sync_id
          const existing = await db.select<Task[]>(
            'SELECT * FROM tasks WHERE sync_id = ?',
            [syncId]
          );

          if (existing.length > 0) {
            const local = existing[0];
            // Last-write-wins by updated_at
            if (remote.updated_at > local.updated_at) {
              await db.execute(
                `UPDATE tasks SET name = ?, details = ?, position = ?,
                 updated_at = ?, closed_at = ?, deleted_at = ? WHERE sync_id = ?`,
                [
                  remote.name ?? null,
                  remote.details ?? '',
                  remote.position ?? local.position,
                  remote.updated_at,
                  remote.closed_at ?? null,
                  remote.deleted_at ?? null,
                  syncId,
                ]
              );
            }
          } else {
            // New task from another device
            const rows = await db.select<{ next_pos: number }[]>(
              'SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM tasks'
            );
            await db.execute(
              `INSERT INTO tasks (name, details, position, created_at, updated_at, closed_at, deleted_at, sync_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                remote.name ?? null,
                remote.details ?? '',
                remote.position ?? rows[0].next_pos,
                remote.created_at,
                remote.updated_at,
                remote.closed_at ?? null,
                remote.deleted_at ?? null,
                syncId,
              ]
            );
          }
        }

        this.notifySubscribers();
      } finally {
        this.processingRemote = false;
      }
    });
  }

  private notifySubscribers() {
    for (const cb of this.subscribers) {
      cb();
    }
  }

  async getAll(): Promise<Task[]> {
    return this.sqlite.getAll();
  }

  async create(params: { name?: string | null; details?: string }): Promise<Task> {
    const task = await this.sqlite.create(params);
    await this.pushToFirestore(task);
    return task;
  }

  async update(id: number, params: { name?: string | null; details?: string }): Promise<Task> {
    const task = await this.sqlite.update(id, params);
    await this.pushToFirestore(task);
    return task;
  }

  async close(id: number): Promise<Task> {
    const task = await this.sqlite.close(id);
    await this.pushToFirestore(task);
    return task;
  }

  async reopen(id: number): Promise<Task> {
    const task = await this.sqlite.reopen(id);
    await this.pushToFirestore(task);
    return task;
  }

  async delete(id: number): Promise<void> {
    // Soft delete: set deleted_at, then sync
    const db = await getDb();
    const tasks = await db.select<Task[]>('SELECT * FROM tasks WHERE id = ?', [id]);
    if (tasks.length > 0) {
      const task = tasks[0];
      await db.execute(
        "UPDATE tasks SET deleted_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = ?",
        [id]
      );
      if (task.sync_id) {
        const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
        await setDoc(
          doc(this.tasksCollection(), task.sync_id),
          { deleted_at: now, updated_at: now },
          { merge: true }
        );
      }
    }
  }

  async reorder(id: number, newPosition: number): Promise<Task> {
    const task = await this.sqlite.reorder(id, newPosition);
    await this.pushToFirestore(task);
    return task;
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  async initialUpload(): Promise<void> {
    const db = await getDb();
    const tasks = await db.select<Task[]>(
      'SELECT * FROM tasks WHERE sync_id IS NULL AND deleted_at IS NULL'
    );

    const firestore = getFirebaseFirestore();
    const BATCH_SIZE = 500;

    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
      const batch = writeBatch(firestore);
      const chunk = tasks.slice(i, i + BATCH_SIZE);

      for (const task of chunk) {
        const docRef = doc(this.tasksCollection());
        batch.set(docRef, {
          name: task.name,
          details: task.details,
          position: task.position,
          created_at: task.created_at,
          updated_at: task.updated_at,
          closed_at: task.closed_at,
          deleted_at: null,
        });
        // Save sync_id locally after batch commits
        task.sync_id = docRef.id;
      }

      await batch.commit();

      // Update sync_ids in SQLite
      for (const task of chunk) {
        await db.execute('UPDATE tasks SET sync_id = ? WHERE id = ?', [task.sync_id, task.id]);
      }
    }
  }

  destroy() {
    if (this.unsubscribeSnapshot) {
      this.unsubscribeSnapshot();
      this.unsubscribeSnapshot = null;
    }
    this.subscribers.clear();
  }
}
