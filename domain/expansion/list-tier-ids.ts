/**
 * The raid tiers a saved loot list covers: every tier in its phase group that
 * the editor would show (guild-active, phase at or below the expansion's
 * current phase). Mirrors the tier selection in
 * app/api/loot-list/bootstrap/route.ts, so a server check over these tiers
 * sees the same items the raider saw in the editor.
 */

import { resolvePhaseGroups } from './phase-groups'

export interface ListTierRow {
  id: string
  phase: number | null
}

/**
 * @param tiers Guild-active tiers of the list's expansion.
 * @param canonicalPhase The list's phase (loot_submissions.phase), the lowest phase of its group.
 */
export function listTierIds(
  tiers: readonly ListTierRow[],
  currentPhase: number,
  phaseGroups: number[][] | null,
  canonicalPhase: number,
): string[] {
  // Linear unlock: later phases are hidden from raiders until they open.
  const visible = tiers.filter(t => t.phase != null && t.phase <= currentPhase)
  const uniquePhases = [...new Set(visible.map(t => t.phase as number))]

  const group = resolvePhaseGroups(phaseGroups, uniquePhases).find(g => g.canonicalPhase === canonicalPhase)
  // A list keyed by a phase that is no longer a group's first phase covers
  // only its own phase, rather than borrowing another group's items.
  const phases = new Set(group ? group.phases : [canonicalPhase])

  return visible.filter(t => phases.has(t.phase as number)).map(t => t.id)
}
