interface GuildSettings {
  attendance_type: 'linear' | 'breakpoint'
  rolling_attendance_weeks: number
  use_signups: boolean
  signup_weight: number
  max_attendance_bonus: number
  max_attendance_threshold: number
  middle_attendance_bonus: number
  middle_attendance_threshold: number
  bottom_attendance_bonus: number
  bottom_attendance_threshold: number
  rank_modifiers: Record<string, number>
  see_item_bonus: boolean
  see_item_bonus_value: number
  pass_item_bonus: boolean
  pass_item_bonus_value: number
}

interface AttendanceRecord {
  signed_up: boolean
  attended: boolean
  no_call_no_show: boolean
}

const DEFAULT_SETTINGS: Partial<GuildSettings> = {
  attendance_type: 'linear',
  rolling_attendance_weeks: 4,
  use_signups: true,
  signup_weight: 0.25,
  max_attendance_bonus: 4,
  max_attendance_threshold: 0.9,
  middle_attendance_bonus: 2,
  middle_attendance_threshold: 0.5,
  bottom_attendance_bonus: 1,
  bottom_attendance_threshold: 0.25,
  rank_modifiers: {
    'Pro Yiker': 0,
    'Raid Yiker': 0,
    'Yiker': -1,
    'Alt Yiker': -4,
    'New Yiker': -1
  },
  see_item_bonus: true,
  see_item_bonus_value: 1,
  pass_item_bonus: false,
  pass_item_bonus_value: 0
}

/**
 * Calculate attendance score based on guild settings
 */
export function calculateAttendanceScore(
  records: AttendanceRecord[],
  totalRaids: number,
  settings: Partial<GuildSettings> = {}
): number {
  const config = { ...DEFAULT_SETTINGS, ...settings } as GuildSettings

  if (records.length === 0 || totalRaids === 0) return 0

  // Check for NCNS - if any, return 0
  const hasNCNS = records.some(r => r.no_call_no_show)
  if (hasNCNS) return 0

  // Calculate base attendance percentage
  let attendedCount = 0
  let signedUpCount = 0

  records.forEach(r => {
    if (r.attended) attendedCount++
    if (r.signed_up) signedUpCount++
  })

  const attendancePercentage = attendedCount / totalRaids

  if (config.attendance_type === 'linear') {
    // Linear scaling: 0% attendance = 0 bonus, 100% attendance = max bonus
    const baseScore = attendancePercentage * config.max_attendance_bonus

    // Add signup bonus if enabled
    if (config.use_signups) {
      const signupPercentage = signedUpCount / totalRaids
      const signupBonus = signupPercentage * config.max_attendance_bonus * config.signup_weight
      return Math.min(baseScore + signupBonus, config.max_attendance_bonus)
    }

    return Math.min(baseScore, config.max_attendance_bonus)
  } else {
    // Breakpoint system
    if (attendancePercentage >= config.max_attendance_threshold) {
      return config.max_attendance_bonus
    } else if (attendancePercentage >= config.middle_attendance_threshold) {
      return config.middle_attendance_bonus
    } else if (attendancePercentage >= config.bottom_attendance_threshold) {
      return config.bottom_attendance_bonus
    }
    return 0
  }
}

/**
 * Get rank modifier from settings
 */
export function getRankModifier(role: string, settings: Partial<GuildSettings> = {}): number {
  const config = { ...DEFAULT_SETTINGS, ...settings } as GuildSettings
  return config.rank_modifiers[role] || 0
}

/**
 * Calculate loot score
 */
export function calculateLootScore(
  itemRank: number,
  attendanceScore: number,
  rankModifier: number,
  badLuckBonus: number = 0
): number {
  return itemRank + attendanceScore + rankModifier + badLuckBonus
}

/**
 * Get default settings for a new guild
 */
export function getDefaultSettings(): Partial<GuildSettings> {
  return DEFAULT_SETTINGS
}
