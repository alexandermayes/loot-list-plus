/**
 * Master Sheet Phase Gate
 *
 * Decides which raid tiers a raider may see rankings for.
 *
 * Two conditions must both hold (GH #202):
 *   1. the tier is `master_sheet_visible`, and
 *   2. the raider already has an approved submission for that tier's phase.
 *
 * (2) is what stops a raider scouting everyone else's picks before committing
 * their own list. It is scoped to the *phase*, not the expansion: an approved
 * Phase 1 list must not unlock the Phase 3 rankings.
 *
 * Merged phases share a group, so an approved list for any phase in the group
 * counts — after a merge, submissions are rewritten to the group's canonical
 * (lowest) phase, so the raider's approved row will often sit on a different
 * phase number than the tier being viewed.
 *
 * Officers and holders of `view_master_sheet` bypass this gate entirely; that
 * decision is made by the caller, not here.
 */

import { resolvePhaseGroups } from '@/domain/expansion/phase-groups'

export interface GateTier {
  id: string
  phase: number | null
  master_sheet_visible: boolean | null
  expansion_id: string | null
}

export interface GateExpansion {
  id: string
  /** The expansion's phase_groups JSONB (null = no merging) */
  phaseGroups: number[][] | null
  /**
   * Every phase that exists for this expansion — NOT just the phases of the
   * tiers being requested. resolvePhaseGroups() drops group members that
   * aren't in the list it's given, which would silently split a merged group
   * and deny a raider whose approved list sits on the group's canonical phase.
   */
  availablePhases: number[]
  /** Phases this raider has an approved submission for, in this expansion */
  approvedPhases: number[]
}

/**
 * Narrow `tiers` to those the raider has earned access to.
 *
 * @param tiers - Candidate tiers (typically the tiers of the requested items)
 * @param expansions - Phase-group context, keyed by expansion, for those tiers
 * @returns The ids of tiers the raider may see, as a Set
 */
export function allowedMasterSheetTierIds(
  tiers: GateTier[],
  expansions: GateExpansion[],
): Set<string> {
  const allowed = new Set<string>()
  const byId = new Map(expansions.map(e => [e.id, e]))

  for (const tier of tiers) {
    if (!tier.master_sheet_visible) continue
    if (tier.phase == null || tier.expansion_id == null) continue

    const expansion = byId.get(tier.expansion_id)
    if (!expansion) continue

    const groups = resolvePhaseGroups(expansion.phaseGroups, expansion.availablePhases)
    const group = groups.find(g => g.phases.includes(tier.phase!))
    const groupPhases = group ? group.phases : [tier.phase]

    const approved = new Set(expansion.approvedPhases)
    if (groupPhases.some(p => approved.has(p))) allowed.add(tier.id)
  }

  return allowed
}
