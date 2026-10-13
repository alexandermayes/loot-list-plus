/**
 * Pure status shape and wording for the sync engine (GH #320). It has no
 * Electron, chokidar or file system dependency, so the root vitest suite can
 * test it directly (companion/src/main/__tests__), like addon-format.ts.
 */

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'watching' | 'error'
  lastSync: string | null
  lastError: string | null
  pendingAwards: number
  pendingAttendance: number
}

/**
 * The sentence shown in the renderer's lastError line and in the tray when
 * the server did not accept some pending entries in a pass. It is built from
 * the two counts only, so no server error text, character name or token ever
 * reaches the status. Null when nothing was rejected.
 */
export function describeRejected(awards: number, attendance: number): string | null {
  const parts: string[] = []
  if (awards > 0) parts.push(`${awards} ${awards === 1 ? 'award' : 'awards'}`)
  if (attendance > 0) parts.push(`${attendance} ${attendance === 1 ? 'attendance record' : 'attendance records'}`)
  if (parts.length === 0) return null

  const single = awards + attendance === 1
  const verb = single ? 'was' : 'were'
  const stays = single ? 'It stays' : 'They stay'
  return `${parts.join(' and ')} ${verb} not accepted by the server. ${stays} in the addon and will be retried on the next sync.`
}

/** The one-line status text for the tray. */
export function statusText(status: SyncStatus): string {
  if (status.state === 'syncing') return 'Syncing...'
  if (status.state === 'error') return `Error: ${status.lastError}`
  if (status.lastSync && status.lastError) return `Last sync: ${status.lastSync} (${status.lastError})`
  if (status.lastSync) return `Last sync: ${status.lastSync}`
  return 'Not synced yet'
}
