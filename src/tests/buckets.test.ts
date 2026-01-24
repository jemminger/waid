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
  // Use a fixed "now" at local noon to avoid timezone boundary issues
  const NOW = new Date(2024, 5, 15, 12, 0, 0); // June 15, 2024 12:00 local

  /** Create an ISO timestamp for N local days ago at the given local hour. */
  function daysAgoIso(days: number, hour: number = 12): string {
    const d = new Date(NOW);
    d.setDate(d.getDate() - days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  }

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
      makeTask({ id: 1, closed_at: daysAgoIso(0, 8) }),
    ];
    const buckets = groupCompletedTasks(tasks);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].label).toBe('Today');
    expect(buckets[0].tasks).toHaveLength(1);
  });

  it('groups task closed yesterday into "Yesterday" bucket', () => {
    const tasks: Task[] = [
      makeTask({ id: 1, closed_at: daysAgoIso(1, 18) }),
    ];
    const buckets = groupCompletedTasks(tasks);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].label).toBe('Yesterday');
  });

  it('groups tasks 2-6 days ago into individual day buckets', () => {
    const tasks: Task[] = [
      makeTask({ id: 1, closed_at: daysAgoIso(2) }),
      makeTask({ id: 2, closed_at: daysAgoIso(3) }),
      makeTask({ id: 3, closed_at: daysAgoIso(4) }),
      makeTask({ id: 4, closed_at: daysAgoIso(5) }),
      makeTask({ id: 5, closed_at: daysAgoIso(6) }),
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
    // Use a date 10 days back to ensure it falls in "last week" regardless of day-of-week
    const tasks: Task[] = [
      makeTask({ id: 1, closed_at: daysAgoIso(10) }),
    ];
    const buckets = groupCompletedTasks(tasks);
    expect(buckets.some(b => b.label === 'Last week')).toBe(true);
  });

  it('groups tasks 2-4 weeks ago into week buckets', () => {
    const tasks: Task[] = [
      makeTask({ id: 1, closed_at: daysAgoIso(15) }),
      makeTask({ id: 2, closed_at: daysAgoIso(22) }),
    ];
    const buckets = groupCompletedTasks(tasks);
    const weekBuckets = buckets.filter(b => b.label.includes('weeks ago'));
    expect(weekBuckets.length).toBeGreaterThanOrEqual(1);
  });

  it('groups older tasks by month name', () => {
    const tasks: Task[] = [
      makeTask({ id: 1, closed_at: daysAgoIso(90) }),
      makeTask({ id: 2, closed_at: daysAgoIso(160) }),
    ];
    const buckets = groupCompletedTasks(tasks);
    // Each bucket label should be "Month YYYY" format
    for (const bucket of buckets) {
      expect(bucket.label).toMatch(/^[A-Z][a-z]+ \d{4}$/);
    }
  });

  it('sorts buckets from most recent to oldest', () => {
    const tasks: Task[] = [
      makeTask({ id: 1, closed_at: daysAgoIso(0, 8) }),
      makeTask({ id: 2, closed_at: daysAgoIso(1) }),
      makeTask({ id: 3, closed_at: daysAgoIso(90) }),
    ];
    const buckets = groupCompletedTasks(tasks);
    expect(buckets[0].label).toBe('Today');
    expect(buckets[1].label).toBe('Yesterday');
    expect(buckets[buckets.length - 1].label).toMatch(/^[A-Z][a-z]+ \d{4}$/);
  });

  it('sorts tasks within a bucket by closed_at descending', () => {
    const tasks: Task[] = [
      makeTask({ id: 1, closed_at: daysAgoIso(0, 8) }),
      makeTask({ id: 2, closed_at: daysAgoIso(0, 14) }),
      makeTask({ id: 3, closed_at: daysAgoIso(0, 10) }),
    ];
    const buckets = groupCompletedTasks(tasks);
    expect(buckets[0].tasks.map(t => t.id)).toEqual([2, 3, 1]);
  });

  it('multiple tasks in the same day bucket', () => {
    const tasks: Task[] = [
      makeTask({ id: 1, closed_at: daysAgoIso(2, 8) }),
      makeTask({ id: 2, closed_at: daysAgoIso(2, 16) }),
    ];
    const buckets = groupCompletedTasks(tasks);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].label).toBe('2 days ago');
    expect(buckets[0].tasks).toHaveLength(2);
  });

  it('ignores open tasks', () => {
    const tasks: Task[] = [
      makeTask({ id: 1, closed_at: daysAgoIso(0, 8) }),
      makeTask({ id: 2, closed_at: null }),
    ];
    const buckets = groupCompletedTasks(tasks);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].tasks).toHaveLength(1);
  });
});
