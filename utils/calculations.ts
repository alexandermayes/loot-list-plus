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
  guild_rank_bonuses_enabled: boolean
  rank_modifiers: Record<string, number>
  minimum_raid_days_enabled: boolean
  minimum_raid_days: number
  late_early_penalty_enabled: boolean
  late_early_penalty_value: number
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
  guild_rank_bonuses_enabled: true,
  rank_modifiers: {
    'Pro Yiker': 0,
    'Raid Yiker': 0,
    'Yiker': -1,
    'Alt Yiker': -4,
    'New Yiker': -1
  },
  minimum_raid_days_enabled: true,
  minimum_raid_days: 2,
  late_early_penalty_enabled: true,
  late_early_penalty_value: 0.25,
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

  // If guild rank bonuses are disabled, return 0
  if (!config.guild_rank_bonuses_enabled) {
    return 0
  }

  return config.rank_modifiers[role] || 0
}

/**
 * Calculate loot score
 */
export function calculateLootScore(
  itemRank: number,
  attendanceScore: number,
  rankModifier: number,
  badLuckBonus: number = 0,
  priorityBonus: number = 0
): number {
  return itemRank + attendanceScore + rankModifier + badLuckBonus + priorityBonus
}

/**
 * Item Priority configuration
 */
export interface ItemPriority {
  role_priorities: Record<string, number | null>
  class_priorities: Record<string, number | null>
  character_priorities: Record<string, number | null>
  priority_bonuses: { role: number; class: number; character: number }
}

/**
 * Calculate priority bonus for a character on a specific item
 * @param priority - The item's priority configuration
 * @param characterId - The character's ID
 * @param specId - The character's spec ID
 * @param role - The character's role ('tank', 'healer', 'physical', 'caster')
 * @returns The total priority bonus
 */
export function calculatePriorityBonus(
  priority: ItemPriority | null | undefined,
  characterId: string,
  specId: string | null,
  role: string | null
): number {
  if (!priority) return 0

  let bonus = 0
  const bonuses = priority.priority_bonuses || { role: 5, class: 3, character: 2 }

  // Check role priority
  if (role && priority.role_priorities && priority.role_priorities[role] != null) {
    const rolePriority = priority.role_priorities[role] as number
    // Higher priority (lower number) = higher bonus
    // Priority 1 gets full bonus, priority 2 gets half, etc.
    bonus += bonuses.role / rolePriority
  }

  // Check class/spec priority
  if (specId && priority.class_priorities && priority.class_priorities[specId] != null) {
    const classPriority = priority.class_priorities[specId] as number
    bonus += bonuses.class / classPriority
  }

  // Check individual character priority
  if (characterId && priority.character_priorities && priority.character_priorities[characterId] != null) {
    const charPriority = priority.character_priorities[characterId] as number
    bonus += bonuses.character / charPriority
  }

  return bonus
}

/**
 * Get default settings for a new guild
 */
export function getDefaultSettings(): Partial<GuildSettings> {
  return DEFAULT_SETTINGS
}
