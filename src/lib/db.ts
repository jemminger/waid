import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

const MIGRATIONS = `
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    details TEXT NOT NULL DEFAULT '',
    position REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    closed_at TEXT
  );
`;

async function initialize(): Promise<Database> {
  if (db) return db;

  db = await Database.load('sqlite:waid.db');
  await db.execute(MIGRATIONS);

  return db;
}

export async function getDb(): Promise<Database> {
  return initialize();
}
