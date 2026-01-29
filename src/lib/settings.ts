import { appDataDir } from '@tauri-apps/api/path';
import { save, open } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile, remove } from '@tauri-apps/plugin-fs';
import { relaunch } from '@tauri-apps/plugin-process';

const DB_FILENAME = 'waid.db';

export async function exportDb(): Promise<void> {
  const dataDir = await appDataDir();
  const dbPath = `${dataDir}${DB_FILENAME}`;

  const dest = await save({
    defaultPath: DB_FILENAME,
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
  });
  if (!dest) return;

  const data = await readFile(dbPath);
  await writeFile(dest, data);
}

export async function resetDb(): Promise<void> {
  const dataDir = await appDataDir();
  const dbPath = `${dataDir}${DB_FILENAME}`;

  await remove(dbPath);
  await relaunch();
}

export async function importDb(): Promise<void> {
  const selected = await open({
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    multiple: false,
  });
  if (!selected) return;

  const dataDir = await appDataDir();
  const dbPath = `${dataDir}${DB_FILENAME}`;

  const data = await readFile(selected);
  await writeFile(dbPath, data);
  await relaunch();
}
