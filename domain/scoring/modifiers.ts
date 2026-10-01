import type { ScoringConfig, RaiderBonusEntry } from '../types'
import { DEFAULT_SETTINGS } from './defaults'

/**
 * Get rank modifier from settings.
 * Returns the bonus/penalty for a character's guild rank (e.g., Officer: 0, Trial: -1).
 */
export function getRankModifier(role: string, settings: Partial<ScoringConfig> = {}): number {
  const config = { ...DEFAULT_SETTINGS, ...settings } as ScoringConfig

  if (!config.guild_rank_bonuses_enabled) {
    return 0
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
 * Whether one raider-bonus entry counts on `asOfDate` (YYYY-MM-DD).
 * An entry counts when it has no start date or `asOfDate` is on or after it,
 * and it has no end date or `asOfDate` is on or before it. Both ends are
 * inclusive. Dates are compared as YYYY-MM-DD strings.
 *
 * When `asOfDate` is omitted, an entry with either date set is inactive, so a
 * caller that forgets to pass the date fails toward not granting a timed bonus.
 * This is the one rule shared by the score engine and the addon export.
 */
export function isRaiderBonusEntryActive(entry: RaiderBonusEntry, asOfDate?: string): boolean {
  const startsAt = entry.starts_at ?? null
  const expiresAt = entry.expires_at ?? null
  if (asOfDate == null) return startsAt == null && expiresAt == null
  if (startsAt != null && asOfDate < startsAt) return false
  if (expiresAt != null && asOfDate > expiresAt) return false
  return true
}

/**
 * The raider-bonus entries that count for one raider on `asOfDate`.
 * Returns [] when the single_raider_overall_bonus toggle is off, when there is
 * no character, or when the stored value is not an entry list (a legacy flat
 * number would otherwise break the loop).
 */
export function getActiveRaiderBonusEntries(
  characterId: string | null,
  settings: Partial<ScoringConfig> = {},
  asOfDate?: string,
): RaiderBonusEntry[] {
  const config = { ...DEFAULT_SETTINGS, ...settings } as ScoringConfig

  if (!config.single_raider_overall_bonus || !characterId) {
    return []
  }

  const entries: unknown = config.single_raider_modifiers?.[characterId]
  if (!Array.isArray(entries)) return []

  return (entries as (RaiderBonusEntry | null | undefined)[]).filter(
    (entry): entry is RaiderBonusEntry => !!entry && isRaiderBonusEntryActive(entry, asOfDate),
  )
}

/**
 * Sum the active per-character score modifiers for one raider.
 * Officers can stack entries (e.g. a permanent +20 plus a -2 penalty for the
 * week). Permanent entries (no start or end date) always count; dated entries
 * count only while `asOfDate` is inside their start and end dates (see
 * {@link isRaiderBonusEntryActive}). Returns 0 when the
 * single_raider_overall_bonus toggle is off or the raider has no active entries.
 *
 * When `asOfDate` is omitted, dated entries are treated as inactive so a caller
 * that forgets to pass the date fails toward not granting a temporary boost.
 */
export function getRaiderBonus(
  characterId: string | null,
  settings: Partial<ScoringConfig> = {},
  asOfDate?: string,
): number {
  let sum = 0
  for (const entry of getActiveRaiderBonusEntries(characterId, settings, asOfDate)) {
    sum += entry.amount || 0
  }
  return sum
}

/**
 * Collapse the per-raider entry map into a flat { characterId: activeSum } map,
 * dropping entries that are not active on `asOfDate` (not started yet or
 * ended) and raiders whose net is 0. Uses the same rule as the score engine.
 * Used by the addon export so the Lua engine can read a simple number map and
 * stay free of date logic.
 */
export function resolveActiveRaiderModifiers(
  modifiers: Record<string, RaiderBonusEntry[]> | null | undefined,
  asOfDate: string,
): Record<string, number> {
  const out: Record<string, number> = {}
  if (!modifiers) return out
  for (const [characterId, entries] of Object.entries(modifiers)) {
    if (!Array.isArray(entries)) continue
    let sum = 0
    for (const entry of entries) {
      if (!entry) continue
      if (isRaiderBonusEntryActive(entry, asOfDate)) sum += entry.amount || 0
    }
    if (sum !== 0) out[characterId] = sum
  }
  return out
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
