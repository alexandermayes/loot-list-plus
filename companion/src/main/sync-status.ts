/**
 * Pure status shape and wording for the sync engine (GH #320). It has no
 * Electron, chokidar or file system dependency, so the root vitest suite can
 * test it directly (companion/src/main/__tests__), like addon-format.ts.
 * The only import is the attempt limit, a plain value from the equally
 * Electron-free stuck-entries.ts, so the sentence and the policy agree.
 */
import { MAX_PERMANENT_ATTEMPTS } from './stuck-entries'

export interface SyncStatus {
  state: 'idle' | 'syncing' | 'watching' | 'error'
  lastSync: string | null
  lastError: string | null
  /** Awards the server rejected this pass; they are sent again next pass. */
  pendingAwards: number
  /** Attendance records rejected this pass; sent again next pass. */
  pendingAttendance: number
  /**
   * Awards whose permanent rejections reached MAX_PERMANENT_ATTEMPTS. They
   * stay in the addon file but are not sent again until the user clears
   * them (GH #320 follow-up).
   */
  parkedAwards: number
  /** Attendance records parked the same way. */
  parkedAttendance: number
}

/** `2 awards and 1 attendance record`, or null when both counts are 0. */
function countNouns(awards: number, attendance: number): string | null {
  const parts: string[] = []
  if (awards > 0) parts.push(`${awards} ${awards === 1 ? 'award' : 'awards'}`)
  if (attendance > 0) parts.push(`${attendance} ${attendance === 1 ? 'attendance record' : 'attendance records'}`)
  return parts.length === 0 ? null : parts.join(' and ')
}

/**
 * The sentence shown in the renderer's lastError line and in the tray when
 * the server did not accept some pending entries in a pass. It is built from
 * the two counts only, so no server error text, character name or token ever
 * reaches the status. Null when nothing was rejected.
 */
export function describeRejected(awards: number, attendance: number): string | null {
  const nouns = countNouns(awards, attendance)
  if (nouns === null) return null

  const single = awards + attendance === 1
  const verb = single ? 'was' : 'were'
  const stays = single ? 'It stays' : 'They stay'
  return `${nouns} ${verb} not accepted by the server. ${stays} in the addon and will be retried on the next sync.`
}

/**
 * The sentence for entries the companion has stopped sending, built from the
 * two counts and MAX_PERMANENT_ATTEMPTS only (the same count-only rule as
 * describeRejected). Null when nothing is parked (GH #320 follow-up).
 */
export function describeParked(awards: number, attendance: number): string | null {
  const nouns = countNouns(awards, attendance)
  if (nouns === null) return null

  const pronoun = awards + attendance === 1 ? 'it' : 'them'
  return `${nouns} will not be retried. The server rejected ${pronoun} ${MAX_PERMANENT_ATTEMPTS} times. Use "Clear stuck entries" to remove ${pronoun} from the addon.`
}

/**
 * The lastError text after a pass: the retrying sentence, then the parked
 * one, whichever are non-null, joined by a single space. Null when all four
 * counts are 0.
 */
export function describeStuck(
  retryingAwards: number,
  retryingAttendance: number,
  parkedAwards: number,
  parkedAttendance: number,
): string | null {
  const sentences = [describeRejected(retryingAwards, retryingAttendance), describeParked(parkedAwards, parkedAttendance)]
    .filter((s): s is string => s !== null)
  return sentences.length === 0 ? null : sentences.join(' ')
}

/** The one-line status text for the tray. */
export function statusText(status: SyncStatus): string {
  if (status.state === 'syncing') return 'Syncing...'
  if (status.state === 'error') return `Error: ${status.lastError}`
  if (status.lastSync && status.lastError) return `Last sync: ${status.lastSync} (${status.lastError})`
  if (status.lastSync) return `Last sync: ${status.lastSync}`
  return 'Not synced yet'
}
