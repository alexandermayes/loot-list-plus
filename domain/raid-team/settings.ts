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
 */
export function resolveRollingWeeks(
  guildRollingWeeks: number,
  teamOverride: number | null | undefined
): number {
  if (teamOverride != null) return teamOverride
  return guildRollingWeeks
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
