/**
 * Schedule source resolution: expansion first, guild settings fallback.
 *
 * Raid Tracking's client-side date generator resolves a guild's raid
 * schedule from the guild's `expansions` row first, and only falls back to
 * `guild_settings` when the expansion row has no configured schedule. Any
 * server-side recheck of that same schedule (for example, the ensure
 * route's team-day filter) must resolve the identical source, or it silently
 * drops every candidate date the client legitimately generated and creates
 * no events at all. That mismatch is GH-267 Path A.
 */

import type { RaidDaySettings } from './settings'

/**
 * Partial, nullable raid-schedule row shape shared by `expansions` and
 * `guild_settings`. Both callers may pass a full database row (with extra,
 * unrelated columns) or `null` when the row does not exist.
 */
export interface RaidScheduleRow {
  raid_days_per_week?: number | null
  first_raid_day?: number | null
  second_raid_day?: number | null
  third_raid_day?: number | null
  fourth_raid_day?: number | null
  fifth_raid_day?: number | null
}

function normalize(row: RaidScheduleRow): RaidDaySettings {
  return {
    raid_days_per_week: row.raid_days_per_week ?? 0,
    first_raid_day: row.first_raid_day ?? null,
    second_raid_day: row.second_raid_day ?? null,
    third_raid_day: row.third_raid_day ?? null,
    fourth_raid_day: row.fourth_raid_day ?? null,
    fifth_raid_day: row.fifth_raid_day ?? null,
  }
}

/**
 * Resolve which row supplies the base raid schedule: the guild's expansion
 * row when it has a configured `raid_days_per_week`, otherwise the guild's
 * `guild_settings` row, otherwise nothing. Mirrors the client guard in
 * `app/(app)/raid-tracking/_client.tsx`:
 * `expansion?.raid_days_per_week != null ? expansion : settings` (GH-267).
 *
 * The returned object exposes only the six schedule fields, dropping any
 * extra columns present on a real database row (`id`, `guild_id`,
 * `current_phase`, `timezone`, etc).
 */
export function pickScheduleSource(
  expansion: RaidScheduleRow | null | undefined,
  guildSettings: RaidScheduleRow | null | undefined
): RaidDaySettings | null {
  if (expansion != null && expansion.raid_days_per_week != null) {
    return normalize(expansion)
  }
  if (guildSettings != null) {
    return normalize(guildSettings)
  }
  return null
}
