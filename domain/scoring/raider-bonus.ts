/**
 * Raider bonuses: pure helpers for the per-raider score modifier map
 * (guild_settings.single_raider_modifiers).
 *
 * Covers reading, tidying, validating and editing the map, plus the display
 * helpers the officer list and the raider breakdown share. Pure functions.
 * No I/O, and no imports from app/, lib/ or utils/.
 *
 * Two readers exist on purpose:
 * - `normalizeRaiderModifiers` is lenient. The client uses it on whatever is
 *   stored, so a legacy row (a flat number, a stray field) still displays and
 *   can be edited instead of breaking the page.
 * - `validateRaiderModifiers` is strict. PUT /api/guild-settings uses it so
 *   malformed input (for example a string amount, which would turn every
 *   score into NaN) is rejected with a clear message and never stored.
 */

import type { RaiderBonusEntry } from '../types'
import { getCurrentResetWeekEnd, getNextResetWeek } from './attendance'

export const RAIDER_BONUS_LABEL_MAX = 60
export const RAIDER_BONUS_MAX_RAIDERS = 1000
export const RAIDER_BONUS_MAX_ENTRIES_PER_RAIDER = 50

export type RaiderBonusMap = Record<string, RaiderBonusEntry[]>
export type RaiderBonusStatus = 'active' | 'upcoming' | 'ended'
export type BonusWindowMode = 'this-week' | 'next-week' | 'custom'

/** One pasted bonus (entries sharing a batch_id), shown as a single row. */
export interface RaiderBonusBatchView {
  batchId: string
  label: string | null
  amount: number
  starts_at: string | null
  expires_at: string | null
  status: RaiderBonusStatus
  raiders: { characterId: string; index: number }[]
}

/** One entry with no batch, shown as its own row. */
export interface RaiderBonusSingleView {
  characterId: string
  index: number
  entry: RaiderBonusEntry
  status: RaiderBonusStatus
}

// ─── Validation messages (signed-off copy C-27 to C-34) ─────

const ERR_GROUPED = 'Raider bonuses must be grouped by raider.'
const ERR_RAIDER = 'A raider bonus has an unknown raider.'
const ERR_AMOUNT = 'Each raider bonus needs a number for its amount.'
const ERR_DATE = 'Raider bonus dates must be real dates (YYYY-MM-DD).'
const ERR_ORDER = "A raider bonus can't end before it starts."
const ERR_LABEL = 'A raider bonus reason can be up to 60 characters.'
const ERR_BATCH = 'A raider bonus has an invalid batch id.'
const ERR_SIZE = 'Too many raider bonuses. Remove some and try again.'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const BATCH_ID_RE = /^[A-Za-z0-9-]{8,64}$/

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const STATUS_ORDER: Record<RaiderBonusStatus, number> = { active: 0, upcoming: 1, ended: 2 }

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/** A YYYY-MM-DD string naming a day that exists (rejects 2026-02-30). */
function isRealDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

/** Copy of an entry with only the fields that are set. */
function buildEntry(
  amount: number,
  expires_at: string | null,
  starts_at: string | null | undefined,
  label: string | null | undefined,
  batch_id: string | null | undefined,
): RaiderBonusEntry {
  const entry: RaiderBonusEntry = { amount, expires_at }
  if (starts_at != null) entry.starts_at = starts_at
  if (label != null && label !== '') entry.label = label
  if (batch_id != null) entry.batch_id = batch_id
  return entry
}

/** Drop raiders whose entry list is empty. */
function withoutEmpty(mods: RaiderBonusMap): RaiderBonusMap {
  const out: RaiderBonusMap = {}
  for (const [characterId, entries] of Object.entries(mods)) {
    if (entries.length) out[characterId] = entries
  }
  return out
}

// ─── Reading and tidying ────────────────────────────────────

/**
 * Coerce the stored single_raider_modifiers value into the canonical
 * Record<charId, RaiderBonusEntry[]> shape. Lenient: tolerates a missing value,
 * a legacy flat number map ({ charId: 20 }) from the first iteration of this
 * feature, and entries with stray fields. Keeps starts_at, label and batch_id
 * when they are strings. Drops entries whose amount is not a number.
 */
export function normalizeRaiderModifiers(raw: unknown): RaiderBonusMap {
  if (!isPlainObject(raw)) return {}
  const out: RaiderBonusMap = {}
  for (const [charId, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      const entries = value
        .filter((e): e is Record<string, unknown> => isPlainObject(e) && typeof e.amount === 'number')
        .map((e) => buildEntry(
          e.amount as number,
          typeof e.expires_at === 'string' ? e.expires_at : null,
          typeof e.starts_at === 'string' ? e.starts_at : null,
          typeof e.label === 'string' ? e.label : null,
          typeof e.batch_id === 'string' ? e.batch_id : null,
        ))
      if (entries.length) out[charId] = entries
    } else if (typeof value === 'number' && value !== 0) {
      out[charId] = [{ amount: value, expires_at: null }]
    }
  }
  return out
}

/**
 * Drop entries that ended before `today` (YYYY-MM-DD) and raiders left with
 * none. Permanent and upcoming entries stay. Does not mutate its input.
 */
export function tidyRaiderModifiers(mods: RaiderBonusMap, today: string): RaiderBonusMap {
  const out: RaiderBonusMap = {}
  for (const [characterId, entries] of Object.entries(mods)) {
    if (!Array.isArray(entries)) continue
    const kept = entries.filter((e) => !!e && (e.expires_at == null || e.expires_at >= today))
    if (kept.length) out[characterId] = kept
  }
  return out
}

// ─── Server validation ──────────────────────────────────────

/**
 * Strictly check a single_raider_modifiers payload. On success returns a
 * sanitised copy built from known keys only: amount, expires_at (always
 * present, null when absent), and starts_at, label (trimmed) and batch_id when
 * set. On failure returns the first problem as a user-facing message.
 */
export function validateRaiderModifiers(
  raw: unknown,
): { ok: true; value: RaiderBonusMap } | { ok: false; error: string } {
  if (!isPlainObject(raw)) return { ok: false, error: ERR_GROUPED }

  const keys = Object.keys(raw)
  if (keys.length > RAIDER_BONUS_MAX_RAIDERS) return { ok: false, error: ERR_SIZE }

  const value: RaiderBonusMap = {}
  for (const characterId of keys) {
    if (!UUID_RE.test(characterId)) return { ok: false, error: ERR_RAIDER }
    const entries = raw[characterId]
    if (!Array.isArray(entries)) return { ok: false, error: ERR_GROUPED }
    if (entries.length > RAIDER_BONUS_MAX_ENTRIES_PER_RAIDER) return { ok: false, error: ERR_SIZE }

    const clean: RaiderBonusEntry[] = []
    for (const entry of entries) {
      if (!isPlainObject(entry)) return { ok: false, error: ERR_AMOUNT }
      const { amount, expires_at, starts_at, label, batch_id } = entry
      if (typeof amount !== 'number' || !Number.isFinite(amount)) return { ok: false, error: ERR_AMOUNT }

      if (expires_at != null && !isRealDate(expires_at)) return { ok: false, error: ERR_DATE }
      if (starts_at != null && !isRealDate(starts_at)) return { ok: false, error: ERR_DATE }
      const end = (expires_at as string | null | undefined) ?? null
      const start = (starts_at as string | null | undefined) ?? null
      if (start != null && end != null && start > end) return { ok: false, error: ERR_ORDER }

      let cleanLabel: string | null = null
      if (label != null) {
        if (typeof label !== 'string') return { ok: false, error: ERR_LABEL }
        cleanLabel = label.trim()
        if (cleanLabel.length > RAIDER_BONUS_LABEL_MAX) return { ok: false, error: ERR_LABEL }
      }

      if (batch_id != null && (typeof batch_id !== 'string' || !BATCH_ID_RE.test(batch_id))) {
        return { ok: false, error: ERR_BATCH }
      }

      clean.push(buildEntry(amount, end, start, cleanLabel, (batch_id as string | null | undefined) ?? null))
    }
    if (clean.length) value[characterId] = clean
  }
  return { ok: true, value }
}

// ─── Editing ────────────────────────────────────────────────

/**
 * Add one entry per unique raider, all sharing `batchId`. Appends to existing
 * entries. Omits starts_at and label when they are null. Does not mutate.
 */
export function addRaiderBonusBatch(
  mods: RaiderBonusMap,
  characterIds: string[],
  entry: { amount: number; starts_at: string | null; expires_at: string | null; label: string | null },
  batchId: string,
): RaiderBonusMap {
  const out: RaiderBonusMap = { ...mods }
  for (const characterId of new Set(characterIds)) {
    const added = buildEntry(entry.amount, entry.expires_at, entry.starts_at, entry.label, batchId)
    out[characterId] = [...(mods[characterId] || []), added]
  }
  return out
}

/** Remove every entry from one batch. Drops raiders left with none. Does not mutate. */
export function removeRaiderBonusBatch(mods: RaiderBonusMap, batchId: string): RaiderBonusMap {
  const out: RaiderBonusMap = {}
  for (const [characterId, entries] of Object.entries(mods)) {
    out[characterId] = entries.filter((e) => e.batch_id !== batchId)
  }
  return withoutEmpty(out)
}

/** Remove one entry by index. Drops the raider when none are left. Does not mutate. */
export function removeRaiderBonusEntry(mods: RaiderBonusMap, characterId: string, index: number): RaiderBonusMap {
  const out: RaiderBonusMap = { ...mods }
  out[characterId] = (mods[characterId] || []).filter((_, i) => i !== index)
  return withoutEmpty(out)
}

// ─── Display ────────────────────────────────────────────────

/** Whether an entry is active, upcoming (starts after today) or ended (ended before today). */
export function raiderBonusStatus(entry: RaiderBonusEntry, today: string): RaiderBonusStatus {
  if (entry.starts_at != null && today < entry.starts_at) return 'upcoming'
  if (entry.expires_at != null && today > entry.expires_at) return 'ended'
  return 'active'
}

/**
 * Split the map into batch rows and single rows for the officer list.
 * Batch raiders and singles are sorted by `nameOf`; batches are ordered
 * active, upcoming, then ended. A batch takes its label, amount and dates from
 * its first entry. `endedCount` counts every ended entry.
 */
export function groupRaiderBonuses(
  mods: RaiderBonusMap,
  today: string,
  nameOf: (characterId: string) => string,
): { batches: RaiderBonusBatchView[]; singles: RaiderBonusSingleView[]; endedCount: number } {
  const batchMap = new Map<string, RaiderBonusBatchView>()
  const singles: RaiderBonusSingleView[] = []
  let endedCount = 0

  for (const [characterId, entries] of Object.entries(mods)) {
    if (!Array.isArray(entries)) continue
    entries.forEach((entry, index) => {
      if (!entry) return
      const status = raiderBonusStatus(entry, today)
      if (status === 'ended') endedCount++
      if (entry.batch_id) {
        let batch = batchMap.get(entry.batch_id)
        if (!batch) {
          batch = {
            batchId: entry.batch_id,
            label: entry.label ?? null,
            amount: entry.amount,
            starts_at: entry.starts_at ?? null,
            expires_at: entry.expires_at ?? null,
            status,
            raiders: [],
          }
          batchMap.set(entry.batch_id, batch)
        }
        batch.raiders.push({ characterId, index })
      } else {
        singles.push({ characterId, index, entry, status })
      }
    })
  }

  const byName = (a: string, b: string) => nameOf(a).localeCompare(nameOf(b))
  const batches = [...batchMap.values()]
  for (const batch of batches) batch.raiders.sort((a, b) => byName(a.characterId, b.characterId))
  batches.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
  singles.sort((a, b) => byName(a.characterId, b.characterId) || a.index - b.index)

  return { batches, singles, endedCount }
}

/**
 * Resolve the dates for a new bonus. This week ends at the current reset
 * week's last day and starts now (starts_at null). Next week is the next full
 * reset week. Custom needs both dates, a start on or before the end, and an
 * end from today on; the start is kept as given. Returns reason codes only;
 * the caller maps them to copy.
 */
export function resolveBonusWindow(
  mode: BonusWindowMode,
  today: string,
  weekResetDay: number | null,
  custom?: { start: string; end: string },
): { ok: true; starts_at: string | null; expires_at: string } | { ok: false; reason: 'missing' | 'end-before-start' | 'end-in-past' } {
  if (mode === 'this-week') {
    return { ok: true, starts_at: null, expires_at: getCurrentResetWeekEnd(today, weekResetDay) }
  }
  if (mode === 'next-week') {
    const week = getNextResetWeek(today, weekResetDay)
    return { ok: true, starts_at: week.starts_at, expires_at: week.expires_at }
  }
  if (!custom || !isRealDate(custom.start) || !isRealDate(custom.end)) return { ok: false, reason: 'missing' }
  if (custom.end < custom.start) return { ok: false, reason: 'end-before-start' }
  if (custom.end < today) return { ok: false, reason: 'end-in-past' }
  return { ok: true, starts_at: custom.start, expires_at: custom.end }
}

/**
 * '2026-10-06' to 'Oct 6'. Fixed English month names and no locale, so the
 * output is identical in tests and every browser.
 */
export function formatBonusDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d || m < 1 || m > 12) return date
  return `${MONTHS[m - 1]} ${d}`
}

/**
 * Raider-facing description of active entries, for example
 * "Full enchants: +2 until Oct 12. Officer bonus: +5". An entry with no
 * reason reads "Officer bonus" (or "Officer penalty" below 0).
 */
export function describeRaiderBonusEntries(entries: RaiderBonusEntry[]): string {
  return entries
    .map((entry) => {
      const reason = entry.label?.trim() || (entry.amount < 0 ? 'Officer penalty' : 'Officer bonus')
      const signed = entry.amount > 0 ? `+${entry.amount}` : String(entry.amount)
      const until = entry.expires_at ? ` until ${formatBonusDate(entry.expires_at)}` : ''
      return `${reason}: ${signed}${until}`
    })
    .join('. ')
}
