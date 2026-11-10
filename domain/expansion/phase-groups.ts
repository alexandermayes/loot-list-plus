/**
 * Phase Groups Utility
 *
 * Resolves phase merge configuration into structured groups.
 * When phase_groups is null (default), each phase is its own group.
 * When set, phases in the same array are merged into one loot list.
 *
 * The "canonical phase" is the lowest phase number in a group.
 * It's used as the submission key (loot_submissions.phase).
 */

export interface PhaseGroup {
  /** The submission key — lowest phase number in the group */
  canonicalPhase: number
  /** All phase numbers in this group (sorted ascending) */
  phases: number[]
}

/**
 * Resolve phase groups config into structured PhaseGroup objects.
 *
 * @param config - The phase_groups JSONB from expansions table (null = no merging)
 * @param availablePhases - All phase numbers that exist for this expansion (from raid_tiers)
 * @returns Array of PhaseGroup, sorted by canonicalPhase
 */
export function resolvePhaseGroups(
  config: number[][] | null,
  availablePhases: number[]
): PhaseGroup[] {
  const sorted = [...availablePhases].sort((a, b) => a - b)

  // No config = each phase is its own group (default behavior)
  if (!config || config.length === 0) {
    return sorted.map(phase => ({
      canonicalPhase: phase,
      phases: [phase],
    }))
  }

  // Build groups from config
  const assignedPhases = new Set<number>()
  const groups: PhaseGroup[] = []

  for (const group of config) {
    // Only include phases that actually exist
    const validPhases = group
      .filter(p => availablePhases.includes(p))
      .sort((a, b) => a - b)

    if (validPhases.length === 0) continue

    validPhases.forEach(p => assignedPhases.add(p))
    groups.push({
      canonicalPhase: validPhases[0],
      phases: validPhases,
    })
  }

  // Any available phases not in any group become standalone
  for (const phase of sorted) {
    if (!assignedPhases.has(phase)) {
      groups.push({
        canonicalPhase: phase,
        phases: [phase],
      })
    }
  }

  return groups.sort((a, b) => a.canonicalPhase - b.canonicalPhase)
}

/**
 * Get the canonical phase for a given raw phase number.
 * Returns the phase itself if not part of any merged group.
 */
export function getCanonicalPhase(
  phase: number,
  groups: PhaseGroup[]
): number {
  const group = groups.find(g => g.phases.includes(phase))
  return group ? group.canonicalPhase : phase
}

/**
 * Get all raw phases for a canonical phase (the full group).
 * Returns [canonicalPhase] if not part of a merged group.
 */
export function getPhasesForCanonical(
  canonicalPhase: number,
  groups: PhaseGroup[]
): number[] {
  const group = groups.find(g => g.canonicalPhase === canonicalPhase)
  return group ? group.phases : [canonicalPhase]
}

/**
 * Build a display label for a phase group.
 * Single phase: "Phase 1"
 * Merged: "Phase 1-2" (contiguous) or "Phase 1, 3" (non-contiguous)
 */
export function getPhaseGroupLabel(group: PhaseGroup): string {
  if (group.phases.length === 1) {
    return `Phase ${group.phases[0]}`
  }

  // Check if phases are contiguous (1,2,3)
  const isContiguous = group.phases.every((p, i) =>
    i === 0 || p === group.phases[i - 1] + 1
  )

  if (isContiguous) {
    return `Phase ${group.phases[0]}-${group.phases[group.phases.length - 1]}`
  }

  return `Phase ${group.phases.join(', ')}`
}

/**
 * Build a short label for phase tabs.
 * Single phase: "P1"
 * Merged: "P1+P2" or "P1+P2+P3"
 */
export function getPhaseGroupShortLabel(group: PhaseGroup): string {
  return group.phases.map(p => `P${p}`).join('+')
}

/**
 * Check if a phase group is merged (contains more than one phase).
 */
export function isMergedGroup(group: PhaseGroup): boolean {
  return group.phases.length > 1
}

/**
 * Phase groups as the loot-list editor offers them. Callers pass the phases of
 * the guild-active tiers; phases past the expansion's current phase stay hidden
 * (linear unlock), so a configured group only covers the phases unlocked so far.
 */
export function resolveUnlockedPhaseGroups(
  config: number[][] | null,
  tierPhases: Array<number | null | undefined>,
  currentPhase: number
): PhaseGroup[] {
  // resolvePhaseGroups emits one group per entry when unconfigured, so the
  // phases must be unique or a phase with two raids would appear twice.
  const unlocked = [
    ...new Set(
      tierPhases.filter((p): p is number => p != null && p <= currentPhase)
    ),
  ]
  return resolvePhaseGroups(config, unlocked)
}

/**
 * Every raw phase whose raids belong on the list keyed by `canonicalPhase`.
 * The client keys a list by its group's canonical phase, so a lookup by that
 * phase alone misses the later phases of a merged group (#484). Falls back to
 * [canonicalPhase] when no unlocked group has that key, which is what a single
 * phase lookup did before.
 */
export function resolveListPhases(
  canonicalPhase: number,
  config: number[][] | null,
  tierPhases: Array<number | null | undefined>,
  currentPhase: number
): number[] {
  const groups = resolveUnlockedPhaseGroups(config, tierPhases, currentPhase)
  return getPhasesForCanonical(canonicalPhase, groups)
}

/**
 * Phases of the unlocked group that contains `phase`, or [phase] when none
 * does. Pass every tier's phase, enabled or not, to learn which phases a list
 * would span if the guild switched its disabled raids back on; that is what
 * names a disabled raid from a later phase when an import comes back empty.
 */
export function resolvePhasesSharingGroup(
  phase: number,
  config: number[][] | null,
  tierPhases: Array<number | null | undefined>,
  currentPhase: number
): number[] {
  const groups = resolveUnlockedPhaseGroups(config, tierPhases, currentPhase)
  return groups.find(g => g.phases.includes(phase))?.phases ?? [phase]
}
