/**
 * Server-side guild checks for the raid events, attendance rows and
 * characters that /api/attendance/bulk writes.
 *
 * The route writes with the service role, which bypasses RLS, so these
 * checks are what keep a write inside the guild the officer was verified
 * for; every query error is thrown, never treated as "not found"; quick
 * task 261003-she.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { findInvalidRaidEventIds } from '@/lib/loot/guild-award-refs'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryClient = SupabaseClient<any, any, any>

// Identical to UUID_PATTERN in lib/loot/guild-award-refs.ts, duplicated
// rather than exported so that module stays unchanged.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Maximum records, ids or names accepted in one /api/attendance/bulk request. */
export const ATTENDANCE_BULK_MAX_ITEMS = 1000

/** Chunk size for guild-membership and attendance-row lookups. */
export const ATTENDANCE_LOOKUP_CHUNK_SIZE = 100

/** The six attendance status flags accepted on a record or an update. */
export const ATTENDANCE_FLAG_KEYS = [
  'signed_up',
  'attended',
  'no_call_no_show',
  'was_late',
  'was_benched',
  'is_excused',
] as const

/** One of the six attendance status flags, each optional. */
export type AttendanceFlags = {
  [K in (typeof ATTENDANCE_FLAG_KEYS)[number]]?: boolean
}

/** 400 from /api/attendance/bulk when a raid event or attendance row it names is not in the officer's guild (COPY C-1). */
export const ATTENDANCE_OUTSIDE_GUILD_ERROR = "This attendance belongs to a raid that isn't in this guild. Refresh the page, then try again."

/** 400 from POST /api/attendance/bulk when a character has never had a membership in the guild (COPY C-2). */
export const ATTENDANCE_CHARACTER_NOT_IN_GUILD_ERROR = 'One or more raiders were never members of this guild. Refresh the page, then try again.'

/** 400 from /api/attendance/bulk for a malformed request (COPY C-3, reused from 261003-0ru). */
export const ATTENDANCE_REQUEST_INVALID_ERROR = 'This page is out of date. Refresh it, then try again.'

/** One attendance record as accepted by POST /api/attendance/bulk. */
export interface AttendanceRecordInput extends AttendanceFlags {
  raid_event_id: string
  character_id?: string | null
  character_name?: string | null
  user_id?: string | null
}

const RECORD_KEYS = new Set<string>([
  'raid_event_id',
  'character_id',
  'character_name',
  'user_id',
  ...ATTENDANCE_FLAG_KEYS,
])

function isNonEmptyTrimmedString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length <= maxLength && value.trim().length > 0
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

/**
 * Parses and validates the `records` array of a POST /api/attendance/bulk
 * body (D-01). An array of 1 to ATTENDANCE_BULK_MAX_ITEMS plain objects
 * whose keys are all among raid_event_id, character_id, character_name,
 * user_id and the six flags; raid_event_id a UUID string; character_id
 * absent, null or a UUID string; character_name absent, null or a string of
 * at most 255 characters that is not empty after trimming (kept as sent);
 * at least one of a non-null character_id and a non-empty character_name
 * (mirrors attendance_records_character_identifier_check); user_id absent,
 * null or a UUID string; each flag absent or a boolean. Returns new objects
 * holding only the keys present (null values kept); never mutates the
 * input. Anything else returns null.
 */
export function parseAttendanceRecords(value: unknown): AttendanceRecordInput[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > ATTENDANCE_BULK_MAX_ITEMS) return null

  const result: AttendanceRecordInput[] = []
  for (const item of value) {
    if (!isPlainObject(item)) return null
    for (const key of Object.keys(item)) {
      if (!RECORD_KEYS.has(key)) return null
    }

    if (!isUuid(item.raid_event_id)) return null

    const record: AttendanceRecordInput = { raid_event_id: item.raid_event_id }

    if ('character_id' in item) {
      const characterId = item.character_id
      if (characterId !== null && !isUuid(characterId)) return null
      record.character_id = characterId as string | null
    }

    if ('character_name' in item) {
      const characterName = item.character_name
      if (characterName !== null && !isNonEmptyTrimmedString(characterName, 255)) return null
      record.character_name = characterName as string | null
    }

    const hasCharacterId = record.character_id !== undefined && record.character_id !== null
    const hasCharacterName = record.character_name !== undefined && record.character_name !== null
      && isNonEmptyTrimmedString(record.character_name, 255)
    if (!hasCharacterId && !hasCharacterName) return null

    if ('user_id' in item) {
      const userId = item.user_id
      if (userId !== null && !isUuid(userId)) return null
      record.user_id = userId as string | null
    }

    for (const flagKey of ATTENDANCE_FLAG_KEYS) {
      if (flagKey in item) {
        const flagValue = item[flagKey]
        if (typeof flagValue !== 'boolean') return null
        record[flagKey] = flagValue
      }
    }

    result.push(record)
  }

  return result
}

/**
 * Parses and validates the `updates` object of a PATCH /api/attendance/bulk
 * body (D-01). A plain object with at least one key, every key one of the
 * six flags, every value a boolean. Returns a copy.
 */
export function parseAttendanceUpdates(value: unknown): AttendanceFlags | null {
  if (!isPlainObject(value)) return null
  const keys = Object.keys(value)
  if (keys.length === 0) return null

  const result: AttendanceFlags = {}
  for (const key of keys) {
    if (!(ATTENDANCE_FLAG_KEYS as readonly string[]).includes(key)) return null
    const flagValue = value[key]
    if (typeof flagValue !== 'boolean') return null
    result[key as keyof AttendanceFlags] = flagValue
  }
  return result
}

/** The `filters` object of a PATCH /api/attendance/bulk body. */
export interface AttendanceFiltersInput {
  raid_event_id?: string
  expected_updated_at?: string
  id?: string
  character_ids?: string[]
  ids?: string[]
}

const FILTER_KEYS = new Set(['raid_event_id', 'expected_updated_at', 'character_ids', 'ids', 'id'])

function isUuidArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length >= 1 && value.length <= ATTENDANCE_BULK_MAX_ITEMS
    && value.every(isUuid)
}

/**
 * Parses and validates the `filters` object of a PATCH /api/attendance/bulk
 * body (D-01). A plain object whose keys are among raid_event_id,
 * expected_updated_at, character_ids, ids, id; raid_event_id and id UUID
 * strings when present; ids and character_ids arrays of 1 to
 * ATTENDANCE_BULK_MAX_ITEMS UUID strings when present; expected_updated_at
 * a non-empty string when present; and at least one of raid_event_id, id,
 * ids present. Returns a copy.
 */
export function parseAttendanceFilters(value: unknown): AttendanceFiltersInput | null {
  if (!isPlainObject(value)) return null
  for (const key of Object.keys(value)) {
    if (!FILTER_KEYS.has(key)) return null
  }

  const result: AttendanceFiltersInput = {}

  if ('raid_event_id' in value) {
    if (!isUuid(value.raid_event_id)) return null
    result.raid_event_id = value.raid_event_id
  }
  if ('id' in value) {
    if (!isUuid(value.id)) return null
    result.id = value.id
  }
  if ('ids' in value) {
    if (!isUuidArray(value.ids)) return null
    result.ids = value.ids
  }
  if ('character_ids' in value) {
    if (!isUuidArray(value.character_ids)) return null
    result.character_ids = value.character_ids
  }
  if ('expected_updated_at' in value) {
    const expected = value.expected_updated_at
    if (typeof expected !== 'string' || expected.length === 0) return null
    result.expected_updated_at = expected
  }

  if (!result.raid_event_id && !result.id && !result.ids) return null

  return result
}

/** The body of a DELETE /api/attendance/bulk request. */
export interface AttendanceDeleteInput {
  raid_event_id?: string
  character_id?: string
  ids?: string[]
  character_names?: string[]
  character_id_is_null?: boolean
}

const DELETE_BODY_KEYS = new Set([
  'guild_id',
  'raid_event_id',
  'ids',
  'character_id',
  'character_id_is_null',
  'character_names',
])

/**
 * Parses and validates the body of a DELETE /api/attendance/bulk request
 * (D-01). A plain object whose keys are among guild_id, raid_event_id, ids,
 * character_id, character_id_is_null, character_names (guild_id is accepted
 * and left out of the result); raid_event_id and character_id UUID strings
 * when present; ids an array of 1 to ATTENDANCE_BULK_MAX_ITEMS UUID strings
 * when present (an empty array is invalid, so it can never fall through to
 * a whole-raid delete); character_id_is_null a boolean when present;
 * character_names an array of 1 to ATTENDANCE_BULK_MAX_ITEMS strings, each
 * at most 255 characters and not empty after trimming, when present.
 * Returns a copy.
 */
export function parseAttendanceDeleteBody(body: unknown): AttendanceDeleteInput | null {
  if (!isPlainObject(body)) return null
  for (const key of Object.keys(body)) {
    if (!DELETE_BODY_KEYS.has(key)) return null
  }

  const result: AttendanceDeleteInput = {}

  if ('raid_event_id' in body) {
    if (!isUuid(body.raid_event_id)) return null
    result.raid_event_id = body.raid_event_id
  }
  if ('character_id' in body) {
    if (!isUuid(body.character_id)) return null
    result.character_id = body.character_id
  }
  if ('ids' in body) {
    if (!isUuidArray(body.ids)) return null
    result.ids = body.ids
  }
  if ('character_id_is_null' in body) {
    if (typeof body.character_id_is_null !== 'boolean') return null
    result.character_id_is_null = body.character_id_is_null
  }
  if ('character_names' in body) {
    const names = body.character_names
    if (!Array.isArray(names) || names.length === 0 || names.length > ATTENDANCE_BULK_MAX_ITEMS) return null
    if (!names.every(name => isNonEmptyTrimmedString(name, 255))) return null
    result.character_names = names
  }

  return result
}

function dedupeFirstSeen(ids: string[]): string[] {
  const seen = new Set<string>()
  const deduped: string[] = []
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    deduped.push(id)
  }
  return deduped
}

/**
 * Finds every id in `ids` that has NO character_guild_memberships row
 * (active or not) in guildId (D-01, 261003-m45 OD-1 A: a raider who has
 * left keeps a membership row with is_active false, and their past nights
 * stay editable). Ids that fail the UUID shape check are returned without a
 * query. Deduped in first-seen order before querying, in chunks of
 * ATTENDANCE_LOOKUP_CHUNK_SIZE. Empty input makes no query.
 *
 * Throws if the underlying query errors.
 */
export async function findCharacterIdsWithoutGuildMembership(
  supabase: QueryClient,
  guildId: string,
  ids: string[],
): Promise<string[]> {
  const dedupedIds = dedupeFirstSeen(ids)
  if (dedupedIds.length === 0) return []

  const wellFormedIds = dedupedIds.filter(isUuid)
  const found = new Set<string>()

  for (let i = 0; i < wellFormedIds.length; i += ATTENDANCE_LOOKUP_CHUNK_SIZE) {
    const chunk = wellFormedIds.slice(i, i + ATTENDANCE_LOOKUP_CHUNK_SIZE)
    const { data, error } = await supabase
      .from('character_guild_memberships')
      .select('character_id')
      .eq('guild_id', guildId)
      .in('character_id', chunk)

    if (error) {
      throw new Error(`Failed to look up character_guild_memberships for guild ${guildId}: ${error.message}`)
    }

    for (const row of (data ?? []) as Array<{ character_id: string }>) {
      found.add(row.character_id)
    }
  }

  return dedupedIds.filter(id => !found.has(id))
}

/** One attendance_records row resolved to its raid event. */
export interface AttendanceRowRef {
  id: string
  raid_event_id: string
}

/** Result of resolving attendance row ids against a guild's raid events. */
export interface ResolveAttendanceRowsResult {
  rows: AttendanceRowRef[]
  outsideGuildIds: string[]
}

/**
 * Resolves attendance_records ids to their raid event, and separates out
 * any id whose row belongs to another guild's raid event (or has no
 * raid_event_id at all) (D-01). Ids that fail the UUID shape check go to
 * outsideGuildIds without a query. Deduped in first-seen order before
 * querying, in chunks of ATTENDANCE_LOOKUP_CHUNK_SIZE. An id with no
 * matching row is in neither list (it was already removed). Empty input
 * makes no query.
 *
 * Throws if an underlying query errors.
 */
export async function resolveAttendanceRowsInGuild(
  supabase: QueryClient,
  guildId: string,
  ids: string[],
): Promise<ResolveAttendanceRowsResult> {
  const dedupedIds = dedupeFirstSeen(ids)
  const outsideGuildIds: string[] = []
  if (dedupedIds.length === 0) return { rows: [], outsideGuildIds }

  const wellFormedIds = dedupedIds.filter(isUuid)
  for (const id of dedupedIds) {
    if (!isUuid(id)) outsideGuildIds.push(id)
  }

  const foundRows: Array<{ id: string; raid_event_id: string | null }> = []
  for (let i = 0; i < wellFormedIds.length; i += ATTENDANCE_LOOKUP_CHUNK_SIZE) {
    const chunk = wellFormedIds.slice(i, i + ATTENDANCE_LOOKUP_CHUNK_SIZE)
    const { data, error } = await supabase
      .from('attendance_records')
      .select('id, raid_event_id')
      .in('id', chunk)

    if (error) {
      throw new Error(`Failed to look up attendance_records: ${error.message}`)
    }

    for (const row of (data ?? []) as Array<{ id: string; raid_event_id: string | null }>) {
      foundRows.push(row)
    }
  }

  const raidEventIdsToCheck = [...new Set(
    foundRows.map(row => row.raid_event_id).filter((id): id is string => id !== null),
  )]
  const invalidRaidEventIds = await findInvalidRaidEventIds(supabase, guildId, raidEventIdsToCheck)
  const invalidSet = new Set(invalidRaidEventIds)

  const rows: AttendanceRowRef[] = []
  for (const row of foundRows) {
    if (!row.raid_event_id || invalidSet.has(row.raid_event_id)) {
      outsideGuildIds.push(row.id)
    } else {
      rows.push({ id: row.id, raid_event_id: row.raid_event_id })
    }
  }

  return { rows, outsideGuildIds }
}
