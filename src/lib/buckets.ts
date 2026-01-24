import {
  differenceInCalendarDays,
  differenceInCalendarWeeks,
  format
} from 'date-fns';
import type { Task, Bucket } from './types';
import { utcToLocal } from './dates';

function getBucketKey(closedAt: Date, now: Date): string {
  const days = differenceInCalendarDays(now, closedAt);

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days >= 2 && days <= 6) return `${days} days ago`;

  const weeks = differenceInCalendarWeeks(now, closedAt, { weekStartsOn: 0 });
  if (weeks === 1) return 'Last week';
  if (weeks >= 2 && weeks <= 4) return `${weeks} weeks ago`;

  return format(closedAt, 'MMMM yyyy');
}

export default function groupCompletedTasks(tasks: Task[]): Bucket[] {
  const now = new Date();
  const closedTasks = tasks.filter((t) => t.closed_at != null);

  const bucketMap = new Map<string, { label: string; tasks: Task[]; sortDate: Date }>();

  for (const task of closedTasks) {
    const closedDate = utcToLocal(task.closed_at!);
    const key = getBucketKey(closedDate, now);

    if (!bucketMap.has(key)) {
      bucketMap.set(key, { label: key, tasks: [], sortDate: closedDate });
    }

    const bucket = bucketMap.get(key)!;
    bucket.tasks.push(task);

    if (closedDate > bucket.sortDate) {
      bucket.sortDate = closedDate;
    }
  }

  for (const bucket of bucketMap.values()) {
    bucket.tasks.sort((a, b) => utcToLocal(b.closed_at!).getTime() - utcToLocal(a.closed_at!).getTime());
  }

  return Array.from(bucketMap.values())
    .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime())
    .map(({ label, tasks }) => ({ label, tasks }));
}

export function getOpenTasks(tasks: Task[]): Task[] {
  return tasks
    .filter((t) => t.closed_at == null)
    .sort((a, b) => a.position - b.position);
}
