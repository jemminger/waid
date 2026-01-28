import Database from '@tauri-apps/plugin-sql';

let db: Database | null = null;

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    details TEXT NOT NULL DEFAULT '',
    position REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    closed_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`
];

async function seedSampleData(database: Database): Promise<void> {
  const result = await database.select<{ count: number }[]>('SELECT COUNT(*) as count FROM tasks');
  if (result[0].count > 0) return;

  const now = new Date();
  function daysAgo(n: number): string {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
  }

  const tasks: { name: string | null; details: string; closed_days_ago: number }[] = [
    // Today
    { name: 'Fix login redirect', details: 'Users were getting stuck on /auth after login', closed_days_ago: 0 },
    { name: 'Update dependencies', details: 'Ran bun update, fixed breaking changes in svelte-kit', closed_days_ago: 0 },
    { name: null, details: 'Review PR #42 for the new dashboard layout', closed_days_ago: 0 },
    // Yesterday
    { name: 'Write unit tests for buckets', details: 'Cover edge cases: empty list, single task, boundary dates', closed_days_ago: 1 },
    { name: 'Add loading spinner', details: 'Show skeleton UI while tasks load from SQLite', closed_days_ago: 1 },
    // 2 days ago
    { name: 'Design card layout', details: 'Settled on 5:4 aspect ratio with truncated details', closed_days_ago: 2 },
    { name: null, details: 'Investigate why drag-drop flickers on mobile', closed_days_ago: 2 },
    // 3 days ago
    { name: 'Set up Tauri SQL plugin', details: 'Configured permissions in capabilities/default.json', closed_days_ago: 3 },
    { name: 'Create database schema', details: 'Tasks table with name, details, position, timestamps', closed_days_ago: 3 },
    { name: 'Configure dark mode', details: 'System preference detection with manual toggle, persisted to localStorage', closed_days_ago: 3 },
    // 4 days ago
    { name: 'Scaffold SvelteKit project', details: 'Used create-svelte with TypeScript, adapter-static for Tauri', closed_days_ago: 4 },
    { name: null, details: 'Research shadcn-svelte component library options', closed_days_ago: 4 },
    // 5 days ago
    { name: 'Set up Tailwind v4', details: 'Migrated from v3 config to CSS-based theme', closed_days_ago: 5 },
    { name: 'Install shadcn-svelte', details: 'Added Button, Card, Dialog, Input, Textarea components', closed_days_ago: 5 },
    // 6 days ago
    { name: 'Write project specs', details: 'Defined layout, task attributes, interactions, and UI requirements', closed_days_ago: 6 },
    // ~1 week ago
    { name: 'Initialize git repo', details: 'Set up .gitignore for node_modules, build output, env files', closed_days_ago: 8 },
    { name: 'Plan data model', details: 'Decided on SQLite with position field for ordering', closed_days_ago: 9 },
    { name: null, details: 'Compare Tauri vs Electron for desktop packaging', closed_days_ago: 10 },
    // ~2 weeks ago
    { name: 'Prototype kanban layout', details: 'Built initial vertical column layout with hardcoded data', closed_days_ago: 14 },
    { name: 'Add date-fns', details: 'For relative date formatting and bucket grouping logic', closed_days_ago: 15 },
    { name: 'Implement CRUD operations', details: 'getAllTasks, createTask, updateTask, closeTask, reopenTask, deleteTask', closed_days_ago: 16 },
    // ~3 weeks ago
    { name: 'Set up bun', details: 'Switched from npm to bun for faster installs and scripts', closed_days_ago: 20 },
    { name: 'Wire up drag and drop', details: 'Used svelte-dnd-action for reordering open tasks', closed_days_ago: 21 },
    { name: null, details: 'Debug position field not persisting after reorder', closed_days_ago: 22 },
    // ~1 month ago
    { name: 'Initial Tauri setup', details: 'Created Rust backend with cargo, configured tauri.conf.json', closed_days_ago: 32 },
    { name: 'Research task tracker apps', details: 'Looked at Todoist, Things, Linear for inspiration on minimal UI', closed_days_ago: 35 },
    { name: 'Define MVP scope', details: 'Decided on: tasks with open/closed states, time-based history, drag reorder', closed_days_ago: 37 },
    // ~2 months ago
    { name: 'Brainstorm app concept', details: 'Personal task tracker focused on "what am I doing right now"', closed_days_ago: 60 },
    { name: null, details: 'Sketch wireframes for vertical kanban with time buckets', closed_days_ago: 62 },
    { name: 'Evaluate tech stacks', details: 'Considered React+Electron, Svelte+Tauri, Flutter. Chose Svelte+Tauri for performance.', closed_days_ago: 65 },
    // ~3 months ago
    { name: 'Project kickoff', details: 'Created repo, wrote initial README with project goals', closed_days_ago: 90 },
    { name: null, details: 'Set up development environment: VS Code, Rust toolchain, Node.js', closed_days_ago: 92 },
  ];

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const createdAt = daysAgo(t.closed_days_ago + 1);
    const closedAt = daysAgo(t.closed_days_ago);
    await database.execute(
      'INSERT INTO tasks (name, details, position, created_at, updated_at, closed_at) VALUES (?, ?, ?, ?, ?, ?)',
      [t.name, t.details, i, createdAt, closedAt, closedAt]
    );
  }

  // Open tasks
  const openTasks: { name: string | null; details: string; created_days_ago: number }[] = [
    { name: 'Add keyboard shortcuts', details: 'Escape to close modal, Cmd+N to create new task', created_days_ago: 0 },
    { name: 'Animate task completion', details: 'Slide completed task from open bucket into the today bucket', created_days_ago: 1 },
    { name: null, details: 'Look into swipe-to-complete gesture for mobile/trackpad', created_days_ago: 2 },
    { name: 'Add search/filter', details: 'Quick filter bar to search across task names and details', created_days_ago: 3 },
    { name: 'Persist window position', details: 'Remember window size and position between app launches', created_days_ago: 5 },
  ];

  for (let i = 0; i < openTasks.length; i++) {
    const t = openTasks[i];
    const createdAt = daysAgo(t.created_days_ago);
    await database.execute(
      'INSERT INTO tasks (name, details, position, created_at, updated_at, closed_at) VALUES (?, ?, ?, ?, ?, ?)',
      [t.name, t.details, i, createdAt, createdAt, null]
    );
  }
}

async function initialize(): Promise<Database> {
  if (db) return db;

  db = await Database.load('sqlite:waid.db');
  for (const sql of MIGRATIONS) {
    await db.execute(sql);
  }
  if (import.meta.env.DEV) {
    await seedSampleData(db);
  }

  return db;
}

export async function getDb(): Promise<Database> {
  return initialize();
}
