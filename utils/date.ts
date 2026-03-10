/**
 * Timezone-safe date utilities
 *
 * NEVER use `new Date(str + 'T00:00:00')` or `.toISOString().split('T')[0]`
 * for date-only strings. Both cause timezone shift (e.g., Sunday → Monday
 * in US timezones). Use these helpers instead.
 */

/** Parse a YYYY-MM-DD string into a local Date (avoids UTC timezone shift) */
export function parseDate(dateString: string): Date {
  const [y, m, d] = dateString.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Format a Date as YYYY-MM-DD in local time (avoids toISOString UTC shift) */
export function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
