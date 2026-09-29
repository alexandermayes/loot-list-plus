/**
 * GH-284 scope: the raid-specific profession recipes of Molten Core, Ruins of
 * Ahn'Qiraj and Temple of Ahn'Qiraj, which data/classic-wow-raids.ts never
 * listed, so no Classic guild could put them on a loot list.
 *
 * Provenance: copied byte-for-byte from classic-gh284-recipes.json, which is
 * the research JSON committed on branch docs/273-debug-resolved (commit
 * 631475d0), confirmed by Wowhead and AtlasLoot, with 13 of the 21 unique ids
 * also confirmed by the wow-classic-items package. Every entry is quality Rare
 * and confidence confirmed.
 *
 * The placement rule below (a recipe that drops from more than one boss goes
 * under 'Shared Boss Loot'; a single-boss recipe goes under its boss) is the
 * user's decision D-01. The 69 generic world-drop recipes are excluded on
 * purpose, per D-02.
 *
 * Shared by the catalog completeness suite (classic-catalog-completeness.test.ts)
 * and PR 2's migration parity suite (app/services/__tests__/classic-recipe-backfill-migration.test.ts),
 * so both assert against the same list. Nothing in this module reads
 * data/classic-wow-raids.ts, so the gate stays independent of the catalog.
 */

import researchData from './classic-gh284-recipes.json'

export interface Gh284ResearchEntry {
  wowhead_id: number
  name: string
  raid: string
  boss_or_trash: string
  bosses: string[]
  quality: string
  profession: string
  sources: string[]
  confidence: string
  notes: string
}

/**
 * The catalog models the Bug Trio and the Twin Emperors as one boss group
 * each (Silithid Royalty and Twin Emperors respectively), not as separate
 * groups per NPC. A research boss name in this map is rewritten to the
 * catalog's group name; every other research boss name already matches a
 * real catalog boss group name (OD-02).
 */
export const CATALOG_BOSS_GROUP: Record<string, string> = {
  'Bug Trio (Lord Kri, Princess Yauj, Vem)': 'Silithid Royalty',
  "Emperor Vek'nilash": 'Twin Emperors',
  "Emperor Vek'lor": 'Twin Emperors',
}

export function catalogBossName(researchBoss: string): string {
  return CATALOG_BOSS_GROUP[researchBoss] ?? researchBoss
}

export interface Gh284Recipe {
  raid: string
  boss: string
  id: number
  name: string
  slot: string
  sourceBosses: string[]
}

export const GH284_RESEARCH: Gh284ResearchEntry[] = researchData as Gh284ResearchEntry[]

export const GH284_RECIPES: Gh284Recipe[] = GH284_RESEARCH.map(entry => ({
  raid: entry.raid,
  boss: entry.bosses.length > 1 ? 'Shared Boss Loot' : catalogBossName(entry.bosses[0]),
  id: entry.wowhead_id,
  name: entry.name,
  slot: 'Recipe',
  sourceBosses: entry.bosses.map(catalogBossName),
}))
