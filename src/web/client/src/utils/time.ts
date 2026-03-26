export function parseLogTimestamp(value: string): Date {
  // SQLite datetime('now') stores UTC without timezone (e.g. 2026-03-26 05:52:18).
  // Normalize to ISO UTC so browsers render correctly in local timezone.
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return new Date(value.replace(' ', 'T') + 'Z');
  }

  return new Date(value);
}
