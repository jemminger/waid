import { describe, it, expect } from 'vitest';
import { formatTimestamp } from '$lib/dates';
import type { Task } from '$lib/types';

// These helpers are defined in +page.svelte, replicated here for testing
function getTaskTitle(task: Task): string {
  if (task.name) return task.name;
  if (task.details) return task.details.split('\n')[0];
  return 'Untitled';
}

function getTruncatedDetails(task: Task): string {
  if (!task.details) return '';
  const lines = task.details.split('\n');
  const detailText = task.name ? task.details : lines.slice(1).join('\n');
  if (!detailText.trim()) return '';
  return detailText.length > 120 ? detailText.slice(0, 120) + '...' : detailText;
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    name: null,
    details: '',
    position: 0,
    created_at: '2024-06-15T12:00:00Z',
    updated_at: '2024-06-15T12:00:00Z',
    closed_at: null,
    ...overrides,
  };
}

describe('getTaskTitle', () => {
  it('returns name when present', () => {
    expect(getTaskTitle(makeTask({ name: 'My Task' }))).toBe('My Task');
  });

  it('returns first line of details when name is null', () => {
    expect(getTaskTitle(makeTask({ name: null, details: 'First line\nSecond line' }))).toBe('First line');
  });

  it('returns "Untitled" when both name and details are empty', () => {
    expect(getTaskTitle(makeTask({ name: null, details: '' }))).toBe('Untitled');
  });

  it('returns details as title when single line and no name', () => {
    expect(getTaskTitle(makeTask({ name: null, details: 'Just one line' }))).toBe('Just one line');
  });
});

describe('getTruncatedDetails', () => {
  it('returns empty string when no details', () => {
    expect(getTruncatedDetails(makeTask({ details: '' }))).toBe('');
  });

  it('returns full details when task has name and details are short', () => {
    expect(getTruncatedDetails(makeTask({ name: 'Title', details: 'Some details' }))).toBe('Some details');
  });

  it('excludes first line from details when task has no name', () => {
    const task = makeTask({ name: null, details: 'Title line\nDetail line' });
    expect(getTruncatedDetails(task)).toBe('Detail line');
  });

  it('truncates at 120 characters with ellipsis', () => {
    const longDetails = 'x'.repeat(200);
    const task = makeTask({ name: 'Title', details: longDetails });
    const result = getTruncatedDetails(task);
    expect(result).toHaveLength(123); // 120 + '...'
    expect(result.endsWith('...')).toBe(true);
  });

  it('returns empty when no name and details is single line', () => {
    const task = makeTask({ name: null, details: 'Only one line' });
    expect(getTruncatedDetails(task)).toBe('');
  });

  it('returns empty for whitespace-only detail text', () => {
    const task = makeTask({ name: 'Title', details: '   ' });
    expect(getTruncatedDetails(task)).toBe('');
  });
});

describe('formatTimestamp', () => {
  it('returns empty string for null', () => {
    expect(formatTimestamp(null)).toBe('');
  });

  it('formats a UTC date string to local short month and day', () => {
    // Construct a UTC string that maps to a known local date
    const local = new Date(2024, 5, 15, 12, 0, 0); // June 15 noon local
    const result = formatTimestamp(local.toISOString());
    expect(result).toContain('Jun');
    expect(result).toContain('15');
  });

  it('handles ISO format dates without Z suffix', () => {
    const result = formatTimestamp('2024-01-03T08:30:00');
    expect(result).toContain('Jan');
    expect(result).toContain('3');
  });
});
