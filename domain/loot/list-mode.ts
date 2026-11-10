/**
 * List mode: whether a raid tier's loot list is made of named items ('known')
 * or of generic needs ('discovery'). Two pure rules decide when an officer may
 * switch, and both fail closed.
 *
 * D-03: a Discovery tier may go back to Known only while nobody has ranked a
 * need on it and no need award exists. Counts come from the server; anything
 * that is not exactly the integer 0 blocks the switch, so a malformed count
 * can never open it.
 *
 * D-17: in Phase 3 only tiers of the Forever expansion may enter Discovery.
 * canSwitchToDiscovery is the only application-side guard, and the database
 * mirrors both rules in enforce_raid_tier_list_mode_rules (migration
 * 20261020120000, plan 03-01). Lifting D-17 therefore means editing
 * canSwitchToDiscovery and replacing that function in a migration together,
 * and nothing else.
 *
 * Pure and client-safe: no database, no server imports.
 */
import { FOREVER_EXPANSION_NAME } from '@/domain/expansion/game'

export type ListMode = 'known' | 'discovery'

export const LIST_MODES: readonly ListMode[] = ['known', 'discovery']

export function isListMode(value: unknown): value is ListMode {
  return value === 'known' || value === 'discovery'
}

// Proposed copy; the owner signs off user-facing copy on Oct 26.
export const KNOWN_SWITCH_BLOCKED_REASON =
  'This raid stays in Discovery mode because raiders have already ranked or won needs on it.'

export const DISCOVERY_FOREVER_ONLY_REASON = 'Discovery mode is only available for WoW Forever raids.'

export type SwitchDecision = { allowed: true } | { allowed: false; reason: string }

function isZero(count: unknown): boolean {
  return typeof count === 'number' && Number.isInteger(count) && count === 0
}

export function canSwitchToKnown(input: {
  rankedNeedCount: number
  needAwardCount: number
}): SwitchDecision {
  if (isZero(input.rankedNeedCount) && isZero(input.needAwardCount)) return { allowed: true }
  return { allowed: false, reason: KNOWN_SWITCH_BLOCKED_REASON }
}

export function canSwitchToDiscovery(input: { expansionName: string | null | undefined }): SwitchDecision {
  if (input.expansionName === FOREVER_EXPANSION_NAME) return { allowed: true }
  return { allowed: false, reason: DISCOVERY_FOREVER_ONLY_REASON }
}
