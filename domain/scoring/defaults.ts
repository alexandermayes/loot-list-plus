import type { ScoringConfig } from '../types'

export const DEFAULT_SETTINGS: Partial<ScoringConfig> = {
  attendance_type: 'points-per-raid',
  rolling_attendance_weeks: 4,
  use_signups: true,
  signup_weight: 0.25,
  max_attendance_bonus: 4,
  max_attendance_threshold: 0.9,
  middle_attendance_bonus: 2,
  middle_attendance_threshold: 0.5,
  bottom_attendance_bonus: 1,
  bottom_attendance_threshold: 0.25,
  raid_roles_overall_bonus_priority: false,
  role_modifiers: {},
  guild_rank_bonuses_enabled: true,
  rank_modifiers: {
    'Pro Yiker': 0,
    'Raid Yiker': 0,
    'Yiker': -1,
    'Alt Yiker': -4,
    'New Yiker': -1
  },
  character_rank_overrides: {},
  minimum_raid_days_enabled: true,
  minimum_raid_days: 2,
  late_early_penalty_enabled: true,
  late_early_penalty_value: 0.25,
  trial_penalty_enabled: false,
  trial_penalty_value: -2,
  trial_auto_promote_enabled: false,
  trial_auto_promote_weeks: 4,
  new_members_start_as_trial: false,
  blp_enabled: false,
  blp_increment: 1,
  blp_maximum: 5
}

export function withDefaults(partial: Partial<ScoringConfig>): ScoringConfig {
  return { ...DEFAULT_SETTINGS, ...partial } as ScoringConfig
}

export function getDefaultSettings(): Partial<ScoringConfig> {
  return DEFAULT_SETTINGS
}
