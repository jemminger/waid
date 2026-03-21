import { getDb } from './db';
import type { StorageMode } from './types';

export async function getStorageMode(): Promise<StorageMode> {
  const db = await getDb();
  const rows = await db.select<{ value: string }[]>(
    `SELECT value FROM settings WHERE key = 'data_storage_mode'`
  );
  if (rows.length === 0) return 'local';
  return rows[0].value as StorageMode;
}

export async function setStorageMode(mode: StorageMode): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO settings (key, value) VALUES ('data_storage_mode', ?)
     ON CONFLICT(key) DO UPDATE SET value = ?`,
    [mode, mode]
  );
}

export async function getSyncEmail(): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<{ value: string }[]>(
    `SELECT value FROM settings WHERE key = 'sync_email'`
  );
  if (rows.length === 0) return null;
  return rows[0].value;
}

export async function setSyncEmail(email: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO settings (key, value) VALUES ('sync_email', ?)
     ON CONFLICT(key) DO UPDATE SET value = ?`,
    [email, email]
  );
}
