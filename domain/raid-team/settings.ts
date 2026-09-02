/**
 * Team settings resolution.
 *
 * Teams can override specific guild settings (raid days, rolling weeks).
 * NULL overrides = inherit from guild settings.
 */

import type { RaidDaysOverride } from './types'

/**
 * Guild settings fields relevant to raid day configuration.
 */
interface RaidDaySettings {
  raid_days_per_week: number
  first_raid_day: number | null
  second_raid_day: number | null
  third_raid_day: number | null
  fourth_raid_day: number | null
  fifth_raid_day: number | null
}

/**
 * Resolve rolling attendance weeks: team override > guild setting.
 *
 * A non-positive override is treated as "no override" (inherit the guild
 * setting), not as a zero-week window. A zero-week window is not a
 * configuration — it makes the attendance denominator 0, so every raider on
 * the team silently scores "0 of 0 raids" with +0.00 credit on every
 * team-scoped surface while guild-scoped surfaces (attendance "All teams",
 * addon export, Discord bot) keep showing real numbers. The field's own
 * contract in the team editor is "leave empty to inherit from guild
 * settings", and a browser number stepper on an empty `min={0}` input lands
 * on 0, so 0 in the database means a mis-click, never an intent.
 */
export function resolveRollingWeeks(
  guildRollingWeeks: number,
  teamOverride: number | null | undefined
): number {
  if (teamOverride != null && teamOverride > 0) return teamOverride
  return guildRollingWeeks
}

/** Upper bound for a team's rolling-weeks override (mirrors the team editor input). */
export const MAX_ROLLING_WEEKS_OVERRIDE = 52

/**
 * Validate a team's `rolling_weeks_override` before it is stored.
 *
 * "Inherit the guild setting" is expressed as null — never as 0. A stored 0
 * produces a zero-length attendance window, which zeroes every raider on the
 * team without any visible error, so it is rejected at the write boundary
 * rather than normalized silently.
 */
export function validateRollingWeeksOverride(
  value: unknown
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true, value: null }
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    return { ok: false, error: 'rolling_weeks_override must be a whole number of weeks, or null to inherit the guild setting' }
  }
  if (value < 1 || value > MAX_ROLLING_WEEKS_OVERRIDE) {
    return { ok: false, error: `rolling_weeks_override must be between 1 and ${MAX_ROLLING_WEEKS_OVERRIDE} weeks, or null to inherit the guild setting` }
  }
  return { ok: true, value }
}

/**
 * Resolve raid days configuration: team override > guild settings.
 * Returns the set of day-of-week numbers (0=Sun, 6=Sat) for attendance filtering.
 */
export function resolveRaidDays(
  guildSettings: RaidDaySettings,
  teamOverride: RaidDaysOverride | null | undefined
): number[] {
  const settings = teamOverride
    ? { ...guildSettings, ...teamOverride }
    : guildSettings

  const dayFields = [
    settings.first_raid_day,
    settings.second_raid_day,
    settings.third_raid_day,
    settings.fourth_raid_day,
    settings.fifth_raid_day,
  ]

  const daysPerWeek = settings.raid_days_per_week ?? guildSettings.raid_days_per_week

  return dayFields
    .slice(0, daysPerWeek)
    .filter((d): d is number => d != null)
}

/**
 * Resolve the full raid day settings object (for UI display).
 */
export function resolveRaidDaySettings(
  guildSettings: RaidDaySettings,
  teamOverride: RaidDaysOverride | null | undefined
): RaidDaySettings {
  if (!teamOverride) return guildSettings
  return { ...guildSettings, ...teamOverride }
}
