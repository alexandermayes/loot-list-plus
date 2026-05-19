import type { ScoringConfig } from '../types'
import { DEFAULT_SETTINGS } from './defaults'

/**
 * Get rank modifier from settings.
 * Returns the bonus/penalty for a character's guild rank (e.g., Officer: 0, Trial: -1).
 *
 * When `characterId` is provided and a per-character override exists in
 * `character_rank_overrides`, the override replaces the role-based bonus
 * (even when the override is 0).
 */
export function getRankModifier(
  role: string,
  settings: Partial<ScoringConfig> = {},
  characterId?: string | null
): number {
  const config = { ...DEFAULT_SETTINGS, ...settings } as ScoringConfig

  if (!config.guild_rank_bonuses_enabled) {
    return 0
  }

  if (characterId && config.character_rank_overrides && characterId in config.character_rank_overrides) {
    return config.character_rank_overrides[characterId]
  }

  return config.rank_modifiers[role] || 0
}

/**
 * Get role modifier from settings.
 * Accepts a single role or array of roles (for dual-role specs like Feral Druid).
 * When multiple roles match, returns the highest bonus.
 */
export function getRoleModifier(roles: string | string[] | null, settings: Partial<ScoringConfig> = {}): number {
  const config = { ...DEFAULT_SETTINGS, ...settings } as ScoringConfig

  if (!config.raid_roles_overall_bonus_priority || !roles) {
    return 0
  }

  const roleList = Array.isArray(roles) ? roles : [roles]
  if (roleList.length === 0) return 0

  let best = 0
  for (const role of roleList) {
    const val = config.role_modifiers[role] || 0
    if (val > best || (best === 0 && val !== 0)) best = val
  }
  return best
}

/**
 * Get role modifier with the matched role name.
 * Returns { bonus, matchedRole } so callers can display which role provided the bonus.
 */
export function getRoleModifierWithLabel(roles: string | string[] | null, settings: Partial<ScoringConfig> = {}): { bonus: number; matchedRole: string | null } {
  const config = { ...DEFAULT_SETTINGS, ...settings } as ScoringConfig

  if (!config.raid_roles_overall_bonus_priority || !roles) {
    return { bonus: 0, matchedRole: null }
  }

  const roleList = Array.isArray(roles) ? roles : [roles]
  if (roleList.length === 0) return { bonus: 0, matchedRole: null }

  let best = 0
  let matchedRole: string | null = roleList[0] || null
  for (const role of roleList) {
    const val = config.role_modifiers[role] || 0
    if (val > best || (best === 0 && val !== 0)) {
      best = val
      matchedRole = role
    }
  }
  return { bonus: best, matchedRole }
}

/**
 * Get trial penalty based on membership status and guild settings.
 * Returns a negative number (penalty) or 0 if not applicable.
 */
export function getTrialPenalty(
  membershipStatus: string,
  settings: Partial<ScoringConfig> = {}
): number {
  const config = { ...DEFAULT_SETTINGS, ...settings } as ScoringConfig

  if (!config.trial_penalty_enabled || membershipStatus !== 'trial') {
    return 0
  }

  return config.trial_penalty_value
}

/**
 * Calculate Bad Luck Protection bonus based on times passed and guild settings.
 * Formula: min(timesPassed × blp_increment, blp_maximum)
 */
export function calculateBadLuckBonus(
  timesPassed: number,
  settings: Partial<ScoringConfig> = {}
): number {
  const config = { ...DEFAULT_SETTINGS, ...settings } as ScoringConfig

  if (!config.blp_enabled || timesPassed <= 0) {
    return 0
  }

  const bonus = timesPassed * config.blp_increment
  return Math.min(bonus, config.blp_maximum)
}
