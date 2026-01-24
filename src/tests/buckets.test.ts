import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import groupCompletedTasks, { getOpenTasks } from '$lib/buckets';
import type { Task } from '$lib/types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: Math.floor(Math.random() * 10000),
    name: 'Test task',
    details: '',
    position: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    closed_at: null,
    ...overrides,
  };
}

describe('getOpenTasks', () => {
  it('returns only tasks without closed_at', () => {
    const tasks: Task[] = [
      makeTask({ id: 1, closed_at: null, position: 0 }),
      makeTask({ id: 2, closed_at: '2024-06-01T12:00:00Z', position: 1 }),
      makeTask({ id: 3, closed_at: null, position: 2 }),
    ];
    const open = getOpenTasks(tasks);
    expect(open).toHaveLength(2);
    expect(open.map(t => t.id)).toEqual([1, 3]);
  });

  it('sorts by position ascending', () => {
    const tasks: Task[] = [
      makeTask({ id: 1, closed_at: null, position: 3 }),
      makeTask({ id: 2, closed_at: null, position: 1 }),
      makeTask({ id: 3, closed_at: null, position: 2 }),
    ];
    const open = getOpenTasks(tasks);
    expect(open.map(t => t.id)).toEqual([2, 3, 1]);
  });

  it('returns empty array when all tasks are closed', () => {
    const tasks: Task[] = [
      makeTask({ id: 1, closed_at: '2024-06-01T12:00:00Z' }),
    ];
    expect(getOpenTasks(tasks)).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(getOpenTasks([])).toHaveLength(0);
  });
});

describe('groupCompletedTasks', () => {
  // Fix "now" to 2024-06-15 12:00:00 UTC (Saturday)
  const NOW = new Date('2024-06-15T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty array when no tasks are closed', () => {
    const tasks: Task[] = [makeTask({ closed_at: null })];
    expect(groupCompletedTasks(tasks)).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(groupCompletedTasks([])).toEqual([]);
  });

  it('groups task closed today into "Today" bucket', () => {
    const tasks: Task[] = [
      makeTask({ id: 1, closed_at: '2024-06-15T08:00:00Z' }),
    ];
    const buckets = groupCompletedTasks(tasks);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].label).toBe('Today');
    expect(buckets[0].tasks).toHaveLength(1);
  });

  it('groups task closed yesterday into "Yesterday" bucket', () => {
    const tasks: Task[] = [
      makeTask({ id: 1, closed_at: '2024-06-14T18:00:00Z' }),
    ];
    const buckets = groupCompletedTasks(tasks);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].label).toBe('Yesterday');
  });

  it('groups tasks 2-6 days ago into individual day buckets', () => {
    const tasks: Task[] = [
      makeTask({ id: 1, closed_at: '2024-06-13T12:00:00Z' }), // 2 days ago
      makeTask({ id: 2, closed_at: '2024-06-12T12:00:00Z' }), // 3 days ago
      makeTask({ id: 3, closed_at: '2024-06-11T12:00:00Z' }), // 4 days ago
      makeTask({ id: 4, closed_at: '2024-06-10T12:00:00Z' }), // 5 days ago
      makeTask({ id: 5, closed_at: '2024-06-09T12:00:00Z' }), // 6 days ago
    ];
    const buckets = groupCompletedTasks(tasks);
    expect(buckets).toHaveLength(5);
    expect(buckets.map(b => b.label)).toEqual([
      '2 days ago',
      '3 days ago',
      '4 days ago',
      '5 days ago',
      '6 days ago',
    ]);
  });

  it('groups tasks ~1 week ago into "Last week" bucket', () => {
    // 1 calendar week ago from Saturday June 15 (week starts Sunday)
    // Last week: Sunday June 2 - Saturday June 8
    const tasks: Task[] = [
      makeTask({ id: 1, closed_at: '2024-06-05T12:00:00Z' }), // Wednesday of last week
    ];
    const buckets = groupCompletedTasks(tasks);
    expect(buckets.some(b => b.label === 'Last week')).toBe(true);
  });

  it('groups tasks 2-4 weeks ago into week buckets', () => {
    const tasks: Task[] = [
      makeTask({ id: 1, closed_at: '2024-06-01T12:00:00Z' }), // ~2 weeks ago
      makeTask({ id: 2, closed_at: '2024-05-25T12:00:00Z' }), // ~3 weeks ago
    ];
    const buckets = groupCompletedTasks(tasks);
    const weekBuckets = buckets.filter(b => b.label.includes('weeks ago'));
    expect(weekBuckets.length).toBeGreaterThanOrEqual(1);
  });

  it('groups older tasks by month name', () => {
    const tasks: Task[] = [
      makeTask({ id: 1, closed_at: '2024-03-15T12:00:00Z' }), // March
      makeTask({ id: 2, closed_at: '2024-01-10T12:00:00Z' }), // January
    ];
    const buckets = groupCompletedTasks(tasks);
    expect(buckets.some(b => b.label === 'March 2024')).toBe(true);
    expect(buckets.some(b => b.label === 'January 2024')).toBe(true);
  });

  it('sorts buckets from most recent to oldest', () => {
    const tasks: Task[] = [
      makeTask({ id: 1, closed_at: '2024-06-15T08:00:00Z' }), // Today
      makeTask({ id: 2, closed_at: '2024-06-14T12:00:00Z' }), // Yesterday
      makeTask({ id: 3, closed_at: '2024-03-15T12:00:00Z' }), // March
    ];
    const buckets = groupCompletedTasks(tasks);
    expect(buckets[0].label).toBe('Today');
    expect(buckets[1].label).toBe('Yesterday');
    expect(buckets[buckets.length - 1].label).toBe('March 2024');
  });

  it('sorts tasks within a bucket by closed_at descending', () => {
    const tasks: Task[] = [
      makeTask({ id: 1, closed_at: '2024-06-15T08:00:00Z' }),
      makeTask({ id: 2, closed_at: '2024-06-15T14:00:00Z' }),
      makeTask({ id: 3, closed_at: '2024-06-15T10:00:00Z' }),
    ];
    const buckets = groupCompletedTasks(tasks);
    expect(buckets[0].tasks.map(t => t.id)).toEqual([2, 3, 1]);
  });

  it('multiple tasks in the same day bucket', () => {
    const tasks: Task[] = [
      makeTask({ id: 1, closed_at: '2024-06-13T08:00:00Z' }),
      makeTask({ id: 2, closed_at: '2024-06-13T16:00:00Z' }),
    ];
    const buckets = groupCompletedTasks(tasks);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].label).toBe('2 days ago');
    expect(buckets[0].tasks).toHaveLength(2);
  });

  it('ignores open tasks', () => {
    const tasks: Task[] = [
      makeTask({ id: 1, closed_at: '2024-06-15T08:00:00Z' }),
      makeTask({ id: 2, closed_at: null }),
    ];
    const buckets = groupCompletedTasks(tasks);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].tasks).toHaveLength(1);
  });
});
