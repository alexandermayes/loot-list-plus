/**
 * Raid team domain types.
 *
 * Raid teams are a Pro feature that lets guilds split their roster
 * into multiple teams with separate raid schedules and attendance tracking.
 */

export interface ScheduleHistoryEntry {
  /** Day-of-week numbers active in this period (0=Sun..6=Sat) */
  days: number[]
  /** ISO date string "YYYY-MM-DD" when this schedule became effective */
  effective_from: string
}

export interface RaidTeam {
  id: string
  guild_id: string
  name: string
  color_hex: string
  is_default: boolean
  sort_order: number
  raid_days_override: RaidDaysOverride | null
  rolling_weeks_override: number | null
  schedule_history: ScheduleHistoryEntry[] | null
  created_at: string
  updated_at: string
}

export interface RaidTeamMember {
  id: string
  raid_team_id: string
  character_id: string
  guild_id: string
  role: string
  joined_at: string
}

/**
 * Shape of raid_days_override JSONB column.
 * Only includes the fields being overridden.
 */
export interface RaidDaysOverride {
  raid_days_per_week?: number
  first_raid_day?: number | null
  second_raid_day?: number | null
  third_raid_day?: number | null
  fourth_raid_day?: number | null
  fifth_raid_day?: number | null
}
