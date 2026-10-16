/**
 * Raid nights in the guild's raid time zone (GH #355 item 2).
 *
 * The addon stamps every timestamp in UTC, so the UTC date of a late evening
 * award or session is the next day for a guild west of Greenwich: a 22:30 EDT
 * award is 02:30 UTC the next morning. These helpers turn a UTC instant into
 * the raid night the guild thinks of it as.
 *
 * D1 Rollover is wall clock: a local time from 00:00 to 05:59 belongs to the
 *    previous date's night. It is read from the zone's own clock (Intl parts),
 *    not "instant minus 6 hours", which would move the cutoff by an hour on a
 *    DST night.
 * D2 Zone: the guild's active expansion timezone, trimmed. Null, empty, no
 *    active expansion or no row gives America/New_York (the column default).
 *    A name Intl rejects gives UTC, since the expansions route stores the
 *    timezone without validating it.
 * D3 Legacy fallback for awards: nights an older companion created from a UTC
 *    date still exist, so an award whose zoned night does not exist yet links
 *    to the UTC-dated night when that one does. Nights already created on a
 *    UTC date are never moved.
 */
import type { createServiceRoleClient } from '@/utils/supabase/service-role'
import {
  findAwardRaidEvent,
  toRaidNightDate,
  type AwardRaidNightResult,
} from '@/utils/raid-events/team-routing'

type Service = ReturnType<typeof createServiceRoleClient>

/** Local hours before this belong to the previous date's raid night (D1). */
export const RAID_NIGHT_ROLLOVER_HOURS = 6

/** The expansions.timezone column default, used when no zone is stored (D2). */
export const DEFAULT_RAID_TIME_ZONE = 'America/New_York'

const UTC_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/

/**
 * True for an ISO timestamp with an explicit zone (Z or an offset) that
 * parses to a real instant. The zone is required so parsing never depends on
 * the server's own time zone.
 */
export function isUtcTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  return UTC_TIMESTAMP.test(trimmed) && !Number.isNaN(Date.parse(trimmed))
}

/**
 * Normalises a stored zone name (D2): trimmed, the default for nullish or
 * empty values, UTC for a name Intl rejects.
 */
function resolveRaidTimeZone(timeZone: string | null | undefined): string {
  const trimmed = typeof timeZone === 'string' ? timeZone.trim() : ''
  if (trimmed === '') return DEFAULT_RAID_TIME_ZONE
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: trimmed })
  } catch {
    return 'UTC'
  }
  return trimmed
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** The zone's wall clock year, month, day and hour (0 to 23) at an instant. */
function zonedParts(
  epochMs: number,
  timeZone: string,
): { year: number; month: number; day: number; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(epochMs))
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') % 24 }
}

/**
 * The raid night (YYYY-MM-DD) a UTC instant belongs to in the guild's time
 * zone (D1, D2). Returns null when utcIso is not a timestamp with an
 * explicit zone.
 */
export function raidNightDate(utcIso: unknown, timeZone: string | null | undefined): string | null {
  if (!isUtcTimestamp(utcIso)) return null
  const p = zonedParts(Date.parse(utcIso.trim()), resolveRaidTimeZone(timeZone))
  const day = new Date(Date.UTC(p.year, p.month - 1, p.day - (p.hour < RAID_NIGHT_ROLLOVER_HOURS ? 1 : 0)))
  return `${day.getUTCFullYear()}-${pad2(day.getUTCMonth() + 1)}-${pad2(day.getUTCDate())}`
}

/**
 * Reads the guild's raid time zone from its active expansion (D2). Returns
 * the trimmed stored value, or the default when there is none. A query error
 * throws; callers carry on with UTC dates rather than fail the request.
 */
export async function guildRaidTimeZone(supabase: Service, guildId: string): Promise<string> {
  const { data, error } = await supabase
    .from('guilds')
    .select('active_expansion_id, expansions:expansions!guilds_active_expansion_id_fkey(timezone)')
    .eq('id', guildId)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to read the guild raid time zone: ${error.message}`)
  }

  const row = data as { expansions?: { timezone?: string | null } | Array<{ timezone?: string | null }> | null } | null
  const embedded = Array.isArray(row?.expansions) ? row?.expansions[0] : row?.expansions
  const zone = typeof embedded?.timezone === 'string' ? embedded.timezone.trim() : ''
  return zone === '' ? DEFAULT_RAID_TIME_ZONE : zone
}

/**
 * Finds the raid night for an award (D3). Looks up zonedDate first; any
 * outcome but no_raid_night is final. On no_raid_night, when the legacy (UTC)
 * date differs, that night is looked up too and used only if it links. The
 * returned date is the night the award should be stored under: the legacy
 * date only when it linked, otherwise the zoned date. With no zoned date this
 * is one lookup on the legacy date.
 */
export async function findRaidNightForAward(
  supabase: Service,
  guildId: string,
  { zonedDate, legacyDate }: { zonedDate: string | null; legacyDate: unknown },
  characterId: string | null,
): Promise<AwardRaidNightResult & { date: string | null }> {
  const legacy = toRaidNightDate(legacyDate)
  if (zonedDate === null) {
    const result = await findAwardRaidEvent(supabase, guildId, legacyDate, characterId)
    return { ...result, date: legacy }
  }

  const zoned = await findAwardRaidEvent(supabase, guildId, zonedDate, characterId)
  if (zoned.outcome !== 'no_raid_night') return { ...zoned, date: zonedDate }
  if (legacy === null || legacy === zonedDate) return { ...zoned, date: zonedDate }

  const old = await findAwardRaidEvent(supabase, guildId, legacy, characterId)
  if (old.outcome === 'linked') return { ...old, date: legacy }
  return { ...zoned, date: zonedDate }
}
