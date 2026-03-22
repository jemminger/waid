import { save, open } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile, remove, rename, BaseDirectory } from '@tauri-apps/plugin-fs';
import { relaunch } from '@tauri-apps/plugin-process';
import { closeDb } from './db';

const DB_FILENAME = import.meta.env.DEV ? 'waid-dev.db' : 'waid.db';
const DB_IMPORT_TMP = DB_FILENAME + '.import';

export async function exportDb(): Promise<void> {
  const dest = await save({
    defaultPath: DB_FILENAME,
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
  });
  if (!dest) return;

  const data = await readFile(DB_FILENAME, { baseDir: BaseDirectory.AppData });
  await writeFile(dest, data);
}

export async function resetDb(): Promise<void> {
  await closeDb();
  await remove(DB_FILENAME, { baseDir: BaseDirectory.AppData });
  window.location.reload();
}

export async function importDb(): Promise<void> {
  const selected = await open({
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    multiple: false,
  });
  if (!selected) return;

  const data = await readFile(selected);
  await writeFile(DB_IMPORT_TMP, data, { baseDir: BaseDirectory.AppData });
  await closeDb();
  await remove(DB_FILENAME, { baseDir: BaseDirectory.AppData });
  await rename(DB_IMPORT_TMP, DB_FILENAME, { oldPathBaseDir: BaseDirectory.AppData, newPathBaseDir: BaseDirectory.AppData });
  window.location.reload();
}
