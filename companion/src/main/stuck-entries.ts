/**
 * Rejection policy for pending awards and attendance, plus the small JSON
 * store that remembers how often the server has permanently rejected each
 * entry (GH #320 follow-up). Pure apart from the three file helpers at the
 * end: no Electron import, only relative imports, so the root vitest suite
 * tests it directly (companion/src/main/__tests__), like addon-format.ts.
 *
 * The store lives in the companion's userData folder, not on the entries in
 * the SavedVariables file: the addon exports profile.pendingAwards and
 * profile.pendingAttendance wholesale into the in-game export string and
 * serializes every key, so any field the companion added would ride along
 * to the server's import-string parser.
 */
import fs from 'fs'
import path from 'path'
import { pendingAttendanceIdentity, pendingAwardIdentity } from './addon-format'
import type { PendingPair, SentPending } from './addon-format'
import type { SubmitOutcome } from './api-client'

export type PendingKind = 'award' | 'attendance'
export type RejectionClass = 'permanent' | 'transient'

/** File name of the attempt store inside the userData folder. */
export const STUCK_STORE_FILE = 'stuck-entries.json'
/** File name of the log that parked entries are appended to before a clear. */
export const CLEARED_LOG_FILE = 'cleared-entries.jsonl'

// regression for #320
/**
 * Permanent rejections an entry may collect before it is parked. Three
 * rather than one: a 404 can become a 200 when an officer enables the item's
 * raid tier between passes, and three posts cost nothing. A named constant
 * keeps the limit a one-line change.
 */
export const MAX_PERMANENT_ATTEMPTS = 3

/**
 * The statuses the two addon routes answer for an entry the server will
 * never take: 400 for a malformed entry, 404 for an item the guild does not
 * own, 422 reserved for validation.
 */
export const PERMANENT_STATUSES: ReadonlySet<number> = new Set([400, 404, 422])

// regression for #320
/**
 * Permanent when the status is one of PERMANENT_STATUSES. Everything else
 * is transient and keeps retrying with no count: 401 and 403 mean the token
 * or the officer role is at fault, not the entry, so it must survive a
 * re-login; 408, 429 and every 5xx are the server's problem; null is a
 * thrown fetch (network down). Classification never reads the error text.
 */
export function classifyRejection(status: number | null): RejectionClass {
  return status !== null && PERMANENT_STATUSES.has(status) ? 'permanent' : 'transient'
}

/** One entry's permanent-rejection history. lastError is diagnostics only. */
export interface StuckRecord {
  kind: PendingKind
  attempts: number
  lastStatus: number | null
  lastError: string | null
  lastAttemptAt: string
}

export interface StuckStoreData {
  version: 1
  entries: Record<string, StuckRecord>
}

export function emptyStore(): StuckStoreData {
  return { version: 1, entries: {} }
}

/**
 * The store key of a raw pending entry: the kind, a colon, then the entry's
 * identity from addon-format.ts. The kind prefix means an award and a night
 * can never share a record. Null for a non-record entry.
 */
export function stuckKey(kind: PendingKind, entry: unknown): string | null {
  const identity = kind === 'award' ? pendingAwardIdentity(entry) : pendingAttendanceIdentity(entry)
  return identity === null ? null : `${kind}:${identity}`
}

export function isParked(record: StuckRecord | undefined): boolean {
  return record !== undefined && record.attempts >= MAX_PERMANENT_ATTEMPTS
}

/**
 * Splits pending pairs into the ones to send this pass and the parked ones,
 * keeping pair order and the pair objects themselves.
 */
export function partitionPending<T>(
  kind: PendingKind,
  pairs: readonly PendingPair<T>[],
  data: StuckStoreData,
): { sendable: PendingPair<T>[]; parked: PendingPair<T>[] } {
  const sendable: PendingPair<T>[] = []
  const parked: PendingPair<T>[] = []
  for (const pair of pairs) {
    const key = stuckKey(kind, pair.entry)
    if (key !== null && isParked(data.entries[key])) parked.push(pair)
    else sendable.push(pair)
  }
  return { sendable, parked }
}

/**
 * Applies one pass's outcomes to the store. outcomes[i] describes
 * sendable[i]. A 2xx deletes the entry's record (so an entry rejected twice
 * then accepted leaves nothing behind), a permanent rejection counts one
 * more attempt, a transient one leaves the store untouched. An entry without
 * a key is skipped.
 */
export function recordOutcomes<T>(
  kind: PendingKind,
  sendable: readonly PendingPair<T>[],
  outcomes: readonly SubmitOutcome[],
  data: StuckStoreData,
  now: string,
): void {
  for (let i = 0; i < sendable.length && i < outcomes.length; i++) {
    const key = stuckKey(kind, sendable[i].entry)
    if (key === null) continue
    const { status, error } = outcomes[i]
    if (status !== null && status >= 200 && status < 300) {
      delete data.entries[key]
      continue
    }
    if (classifyRejection(status) !== 'permanent') continue
    const previous = data.entries[key]
    data.entries[key] = {
      kind,
      attempts: (previous?.attempts ?? 0) + 1,
      lastStatus: status,
      lastError: error === null ? null : error.slice(0, 200),
      lastAttemptAt: now,
    }
  }
}

/** The store keys of every entry in the pending lists. */
function liveKeys(pending: SentPending): Set<string> {
  const keys = new Set<string>()
  for (const entry of pending.awards) {
    const key = stuckKey('award', entry)
    if (key !== null) keys.add(key)
  }
  for (const entry of pending.attendance) {
    const key = stuckKey('attendance', entry)
    if (key !== null) keys.add(key)
  }
  return keys
}

/**
 * Drops every record whose entry is no longer in the file, so the store
 * never outgrows the pending lists (the addon's own clears and the user's
 * clear both end up here).
 */
export function pruneStore(data: StuckStoreData, live: SentPending): void {
  const keep = liveKeys(live)
  for (const key of Object.keys(data.entries)) {
    if (!keep.has(key)) delete data.entries[key]
  }
}

/** The raw pending entries (by reference) whose record is parked. */
export function parkedEntries(data: StuckStoreData, pending: SentPending): SentPending {
  const pick = (kind: PendingKind, entries: readonly unknown[]): unknown[] =>
    entries.filter(entry => {
      const key = stuckKey(kind, entry)
      return key !== null && isParked(data.entries[key])
    })
  return {
    awards: pick('award', pending.awards),
    attendance: pick('attendance', pending.attendance),
  }
}

function isStuckRecord(value: unknown): value is StuckRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const r = value as Record<string, unknown>
  return (
    (r['kind'] === 'award' || r['kind'] === 'attendance') &&
    typeof r['attempts'] === 'number' &&
    Number.isFinite(r['attempts']) &&
    (r['lastStatus'] === null || typeof r['lastStatus'] === 'number') &&
    (r['lastError'] === null || typeof r['lastError'] === 'string') &&
    typeof r['lastAttemptAt'] === 'string'
  )
}

/**
 * Reads the store. A null path, a missing or unreadable file, invalid JSON,
 * another version, a non-object entries table, or any malformed record all
 * give the empty store: a hand-edited or corrupt store must never block a
 * pass (T-320-05). The cost of starting over is at most three more posts
 * per entry.
 */
export function readStuckStore(file: string | null): StuckStoreData {
  if (file === null) return emptyStore()
  let parsed: unknown
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf-8'))
  } catch {
    return emptyStore()
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return emptyStore()
  const root = parsed as Record<string, unknown>
  if (root['version'] !== 1) return emptyStore()
  const entries = root['entries']
  if (entries === null || typeof entries !== 'object' || Array.isArray(entries)) return emptyStore()
  const store = emptyStore()
  for (const [key, record] of Object.entries(entries as Record<string, unknown>)) {
    if (!isStuckRecord(record)) return emptyStore()
    store.entries[key] = record
  }
  return store
}

/** Writes the store, creating its folder. A null path is a no-op. */
export function writeStuckStore(file: string | null, data: StuckStoreData): void {
  if (file === null) return
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
}

/**
 * Appends the entries about to be removed from the SavedVariables file, one
 * JSON line each (awards first, then attendance), so a clear can be undone
 * by hand. A null path, or nothing to log, is a no-op.
 */
export function appendClearedLog(file: string | null, cleared: SentPending, now: string): void {
  if (file === null) return
  const lines: string[] = []
  for (const entry of cleared.awards) lines.push(JSON.stringify({ clearedAt: now, kind: 'award', entry }))
  for (const entry of cleared.attendance) lines.push(JSON.stringify({ clearedAt: now, kind: 'attendance', entry }))
  if (lines.length === 0) return
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.appendFileSync(file, lines.join('\n') + '\n', 'utf-8')
}
