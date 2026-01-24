import { getCurrentWindow, availableMonitors } from '@tauri-apps/api/window';
import { LogicalPosition, LogicalSize } from '@tauri-apps/api/dpi';
import { getDb } from './db';

interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
}


async function save(state: WindowState): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT OR REPLACE INTO settings (key, value) VALUES ('window_state', ?)`,
    [JSON.stringify(state)]
  );
}

async function load(): Promise<WindowState | null> {
  const db = await getDb();
  const rows = await db.select<{ value: string }[]>(
    `SELECT value FROM settings WHERE key = 'window_state'`
  );
  if (rows.length === 0) return null;
  try {
    return JSON.parse(rows[0].value);
  } catch {
    return null;
  }
}

async function isOnScreen(state: WindowState): Promise<boolean> {
  const monitors = await availableMonitors();
  for (const monitor of monitors) {
    const pos = monitor.position;
    const size = monitor.size;
    const monRight = pos.x + size.width;
    const monBottom = pos.y + size.height;

    const overlapX = Math.min(state.x + state.width, monRight) - Math.max(state.x, pos.x);
    const overlapY = Math.min(state.y + state.height, monBottom) - Math.max(state.y, pos.y);

    if (overlapX >= 100 && overlapY >= 100) {
      return true;
    }
  }
  return false;
}


export async function initWindowState(): Promise<void> {
  const win = getCurrentWindow();

  const state = await load();
  if (state && await isOnScreen(state)) {
    const monitors = await availableMonitors();
    const targetMonitor = monitors.find(m => {
      const r = m.position.x + m.size.width;
      const b = m.position.y + m.size.height;
      return state.x >= m.position.x && state.x < r && state.y >= m.position.y && state.y < b;
    });
    const scale = targetMonitor?.scaleFactor ?? 1;

    // Delay to let Tauri finish its own window positioning, use logical coords for cross-monitor
    await new Promise(r => setTimeout(r, 100));
    await win.setPosition(new LogicalPosition(state.x / scale, state.y / scale));
    await win.setSize(new LogicalSize(state.width / scale, state.height / scale));
  }

  win.onMoved(async ({ payload }) => {
    const size = await win.outerSize();
    save({ x: payload.x, y: payload.y, width: size.width, height: size.height });
  });

  win.onResized(async ({ payload }) => {
    const pos = await win.outerPosition();
    save({ x: pos.x, y: pos.y, width: payload.width, height: payload.height });
  });
}
