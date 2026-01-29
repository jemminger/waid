import { save, open } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile, remove, BaseDirectory } from '@tauri-apps/plugin-fs';
import { relaunch } from '@tauri-apps/plugin-process';

const DB_FILENAME = 'waid.db';

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
  await remove(DB_FILENAME, { baseDir: BaseDirectory.AppData });
  await relaunch();
}

export async function importDb(): Promise<void> {
  const selected = await open({
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    multiple: false,
  });
  if (!selected) return;

  const data = await readFile(selected);
  await writeFile(DB_FILENAME, data, { baseDir: BaseDirectory.AppData });
  await relaunch();
}
