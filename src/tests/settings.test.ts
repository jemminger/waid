import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Tauri plugins
const mockJoin = vi.fn();
const mockSave = vi.fn();
const mockOpen = vi.fn();
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockRemove = vi.fn();
const mockRelaunch = vi.fn();

vi.mock('@tauri-apps/api/path', () => ({
  join: (...args: unknown[]) => mockJoin(...args),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: (...args: unknown[]) => mockSave(...args),
  open: (...args: unknown[]) => mockOpen(...args),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
  writeFile: (...args: unknown[]) => mockWriteFile(...args),
  remove: (...args: unknown[]) => mockRemove(...args),
  BaseDirectory: { AppData: 26 },
}));

vi.mock('@tauri-apps/plugin-process', () => ({
  relaunch: (...args: unknown[]) => mockRelaunch(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockJoin.mockImplementation((...parts: string[]) => Promise.resolve(parts.join('/')));
});

describe('exportDb', () => {
  it('reads db from AppData and writes to user-chosen destination', async () => {
    const { exportDb } = await import('$lib/settings');

    const fakeData = new Uint8Array([1, 2, 3]);
    mockSave.mockResolvedValue('/users/me/Desktop/backup.db');
    mockReadFile.mockResolvedValue(fakeData);
    mockWriteFile.mockResolvedValue(undefined);

    await exportDb();

    expect(mockSave).toHaveBeenCalledWith({
      defaultPath: 'waid.db',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    });
    expect(mockReadFile).toHaveBeenCalledWith('waid.db', { baseDir: 26 });
    expect(mockWriteFile).toHaveBeenCalledWith(
      '/users/me/Desktop/backup.db',
      fakeData,
    );
  });

  it('does nothing when user cancels save dialog', async () => {
    const { exportDb } = await import('$lib/settings');

    mockSave.mockResolvedValue(null);

    await exportDb();

    expect(mockReadFile).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });
});

describe('importDb', () => {
  it('reads user-chosen file and writes to AppData, then relaunches', async () => {
    const { importDb } = await import('$lib/settings');

    const fakeData = new Uint8Array([4, 5, 6]);
    mockOpen.mockResolvedValue('/users/me/backup.db');
    mockReadFile.mockResolvedValue(fakeData);
    mockWriteFile.mockResolvedValue(undefined);

    await importDb();

    expect(mockOpen).toHaveBeenCalledWith({
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      multiple: false,
    });
    expect(mockReadFile).toHaveBeenCalledWith('/users/me/backup.db');
    expect(mockWriteFile).toHaveBeenCalledWith('waid.db', fakeData, { baseDir: 26 });
    expect(mockRelaunch).toHaveBeenCalled();
  });

  it('does nothing when user cancels open dialog', async () => {
    const { importDb } = await import('$lib/settings');

    mockOpen.mockResolvedValue(null);

    await importDb();

    expect(mockReadFile).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(mockRelaunch).not.toHaveBeenCalled();
  });
});

describe('resetDb', () => {
  it('removes db file from AppData and relaunches', async () => {
    const { resetDb } = await import('$lib/settings');

    mockRemove.mockResolvedValue(undefined);

    await resetDb();

    expect(mockRemove).toHaveBeenCalledWith('waid.db', { baseDir: 26 });
    expect(mockRelaunch).toHaveBeenCalled();
  });
});
