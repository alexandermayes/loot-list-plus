import { describe, it, expect } from 'vitest'
import { SUPPORTED_EXPANSIONS, getExpansionDefinition } from '../expansionSeeder'
import { EXPANSION_PHASES } from '@/data/expansion-phases'
import { getExpansionMeta } from '@/data/expansions/registry'

// GH-279-R3: AQ20 silently seeded with a NULL phase for over seven months
// because data/expansion-phases.ts named it "Ahn'Qiraj" while the catalog
// names it "Ruins of Ahn'Qiraj" -- an orphan phase-list name that getRaidPhase
// matched against nothing. This suite makes that class of mismatch fail loud:
// every raid the seeder can produce for a supported expansion must resolve to
// a phase through the seeder's own lookup (getExpansionDefinition().raids[].phase,
// which getRaidPhase populates and seedExpansionForGuild writes verbatim into
// raid_tiers -- proven end to end by aq20-phase-backfill-migration.test.ts),
// unless the raid is named in the exception list below.
//
// (a) A raid listed in INTENTIONALLY_UNPHASED_RAIDS seeds with phase NULL,
// which hides it from the phase picker, the Phase cards and their on/off
// toggles, the raid-tiers route and the loot list. Only list a raid here if
// it really must stay hidden.
// (b) Each entry needs a trailing comment with the reason and an issue link.
// (c) The audit on 2026-09-27 across Classic, TBC, Wrath, Cata and MoP found
// exactly one mismatch, AQ20 (GH #279), fixed in data/expansion-phases.ts.
// No intentional exceptions exist today.
// (d) Retail phase lists (wod, legion, bfa, sl, df, tww) have no seeder data
// and are out of scope. Forever's three manifest raids are covered through the
// registry slug 'forever'. EXPANSION_NAME_TO_SLUG intentionally has no Forever
// key, because the public reserve-run route keys off that map (research
// Pitfall 1), so every slug lookup here goes through getExpansionMeta instead.
const INTENTIONALLY_UNPHASED_RAIDS: Record<string, readonly string[]> = {}

// Phase-list problems for one expansion, as messages that name the stored
// name and the slug. Takes the phase list as an argument so a test can hand it
// a mutated copy and prove the check fires, rather than trusting that the
// real data happens to be clean.
function phaseListProblems(
  expansionName: string,
  slug: string,
  phases: typeof EXPANSION_PHASES[string],
): string[] {
  const definition = getExpansionDefinition(expansionName)!
  const catalogNames = new Set(definition.raids.map(r => r.name))
  const phasedNames = new Set(phases.flatMap(p => p.raids))
  const problems: string[] = []

  for (const phase of phases) {
    for (const raidName of phase.raids) {
      if (!catalogNames.has(raidName)) {
        problems.push(`${expansionName} (slug "${slug}") phase ${phase.phase}: "${raidName}" is not a raid in the catalog (orphan phase-list name)`)
      }
    }
  }
  for (const raidName of catalogNames) {
    if (!phasedNames.has(raidName)) {
      problems.push(`${expansionName} (slug "${slug}"): catalog raid "${raidName}" is in no phase of EXPANSION_PHASES.${slug}, so it would seed with a NULL phase`)
    }
  }
  return problems
}

describe('Every seeded raid resolves to a phase (GH-279-R3)', () => {
  it.each(SUPPORTED_EXPANSIONS)('%s: every catalog raid has a positive integer phase, unless intentionally excepted', (expansionName) => {
    const definition = getExpansionDefinition(expansionName)
    expect(definition, `no ExpansionDefinition for ${expansionName}`).not.toBeNull()

    const exceptions = INTENTIONALLY_UNPHASED_RAIDS[expansionName] ?? []

    for (const raid of definition!.raids) {
      if (exceptions.includes(raid.name)) continue
      expect(
        Number.isInteger(raid.phase) && (raid.phase as number) > 0,
        `${expansionName}: "${raid.name}" resolved to phase ${raid.phase}, expected a positive integer (or an entry in INTENTIONALLY_UNPHASED_RAIDS)`,
      ).toBe(true)
    }
  })

  it('every INTENTIONALLY_UNPHASED_RAIDS entry is hygienic: real expansion, real raid, really unphased', () => {
    for (const [expansionName, raidNames] of Object.entries(INTENTIONALLY_UNPHASED_RAIDS)) {
      expect(SUPPORTED_EXPANSIONS, `stale exception key: "${expansionName}" is not in SUPPORTED_EXPANSIONS`).toContain(expansionName)

      const definition = getExpansionDefinition(expansionName)
      expect(definition).not.toBeNull()

      for (const raidName of raidNames) {
        const raid = definition!.raids.find(r => r.name === raidName)
        expect(raid, `stale exception: "${raidName}" is not in the ${expansionName} catalog`).toBeDefined()
        expect(raid!.phase, `stale exception: "${raidName}" in ${expansionName} actually resolves to phase ${raid!.phase}, not null`).toBeNull()
      }
    }
  })

  const expansionsWithRaids = SUPPORTED_EXPANSIONS.filter((name) => {
    const definition = getExpansionDefinition(name)
    return !!definition && definition.raids.length > 0
  })

  it.each(expansionsWithRaids)('%s: has a resolvable slug with a non-empty EXPANSION_PHASES entry', (expansionName) => {
    const definition = getExpansionDefinition(expansionName)!
    const slug = getExpansionMeta(expansionName)?.slug
    expect(slug, `${expansionName}: the registry has no slug for "${definition.displayName}"`).toBeDefined()
    expect(EXPANSION_PHASES[slug as string], `${expansionName}: EXPANSION_PHASES has no entry for slug "${slug}"`).toBeDefined()
  })

  it.each(expansionsWithRaids)('%s: every phase-list raid name exists in the catalog (no orphans)', (expansionName) => {
    const slug = getExpansionMeta(expansionName)!.slug
    const orphans = phaseListProblems(expansionName, slug, EXPANSION_PHASES[slug]).filter(p => p.includes('orphan'))
    expect(orphans).toEqual([])
  })

  it.each(expansionsWithRaids)('%s: every catalog raid is named by a phase entry', (expansionName) => {
    const slug = getExpansionMeta(expansionName)!.slug
    const unphased = phaseListProblems(expansionName, slug, EXPANSION_PHASES[slug]).filter(p => p.includes('NULL phase'))
    expect(unphased).toEqual([])
  })

  describe('the Forever path is checked, not skipped', () => {
    it('Forever is in the checked set and resolves to the registry slug forever', () => {
      expect(expansionsWithRaids).toContain('Forever')
      expect(getExpansionMeta('Forever')?.slug).toBe('forever')
    })

    it('a Forever phase list without Hyjal Summit is reported, naming the raid and the slug', () => {
      const mutated = structuredClone(EXPANSION_PHASES.forever)
      for (const phase of mutated) phase.raids = phase.raids.filter(r => r !== 'Hyjal Summit')

      const problems = phaseListProblems('Forever', 'forever', mutated)
      expect(problems).toHaveLength(1)
      expect(problems[0]).toContain('Hyjal Summit')
      expect(problems[0]).toContain('"forever"')
    })

    it('a Forever phase list naming a raid the catalog lacks is reported as an orphan, naming the slug', () => {
      const mutated = structuredClone(EXPANSION_PHASES.forever)
      mutated[0].raids.push('Not A Forever Raid')

      const problems = phaseListProblems('Forever', 'forever', mutated)
      expect(problems).toHaveLength(1)
      expect(problems[0]).toContain('Not A Forever Raid')
      expect(problems[0]).toContain('orphan')
      expect(problems[0]).toContain('"forever"')
    })
  })

  it.each(expansionsWithRaids)('%s: every phase entry names at least one catalog raid', (expansionName) => {
    const slug = getExpansionMeta(expansionName)!.slug
    const phases = EXPANSION_PHASES[slug]

    for (const phase of phases) {
      expect(phase.raids.length, `${expansionName} phase ${phase.phase} ("${phase.name}") names no raids -- it would never be offered by the phase picker`).toBeGreaterThan(0)
    }
  })

  it.each(expansionsWithRaids)('%s: no raid name appears in two phase entries', (expansionName) => {
    const slug = getExpansionMeta(expansionName)!.slug
    const phases = EXPANSION_PHASES[slug]

    const seen = new Map<string, number>()
    for (const phase of phases) {
      for (const raidName of phase.raids) {
        expect(seen.has(raidName), `${expansionName}: "${raidName}" appears in both phase ${seen.get(raidName)} and phase ${phase.phase} -- getRaidPhase silently takes the first match`).toBe(false)
        seen.set(raidName, phase.phase)
      }
    }
  })
})
