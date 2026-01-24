/**
 * Date utilities for converting UTC database timestamps to local timezone.
 *
 * All timestamps are stored in the database as UTC ISO 8601 with Z suffix.
 * These helpers convert them to the user's local timezone for display and bucketing.
 */

/** Parse a UTC ISO 8601 string into a local Date object. */
export function utcToLocal(utcString: string): Date {
  return new Date(utcString);
}

/** Format a UTC timestamp string for display in local timezone (e.g. "Jun 15"). */
export function formatTimestamp(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = utcToLocal(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
