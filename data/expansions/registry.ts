/**
 * The expansion registry: the one place that says which expansions exist, in
 * what order, with which slug, game version and seed mode.
 *
 * Client components may import this file. It imports only the game-version
 * module and, type-only, the shared types; the heavy raid catalogs live in
 * catalogs.ts, which is server-only.
 *
 * Keyed by the stored expansions.name. Key order is the order
 * getAvailableExpansions and SUPPORTED_EXPANSIONS report, so do not reorder it.
 */
import { EXPANSION_GAMES } from '@/domain/expansion/game'
import type { ExpansionMeta, SeedMode } from '@/data/expansions/types'

export type { ExpansionMeta, SeedMode }

// Expansions with hasData false have no loot data yet (shown as "coming soon"
// in the UI); they keep a slug so the phase lists can be keyed by it later.
export const EXPANSION_REGISTRY: Readonly<Record<string, ExpansionMeta>> = Object.freeze({
  'Classic': Object.freeze({ storedName: 'Classic', slug: 'classic', game: EXPANSION_GAMES.Classic, seedMode: 'legacy-insert', hasData: true }),
  'The Burning Crusade': Object.freeze({ storedName: 'The Burning Crusade', slug: 'tbc', game: EXPANSION_GAMES['The Burning Crusade'], seedMode: 'legacy-insert', hasData: true }),
  'Wrath of the Lich King': Object.freeze({ storedName: 'Wrath of the Lich King', slug: 'wrath', game: EXPANSION_GAMES['Wrath of the Lich King'], seedMode: 'legacy-insert', hasData: true }),
  'Cataclysm': Object.freeze({ storedName: 'Cataclysm', slug: 'cata', game: EXPANSION_GAMES.Cataclysm, seedMode: 'legacy-insert', hasData: true }),
  'Mists of Pandaria': Object.freeze({ storedName: 'Mists of Pandaria', slug: 'mop', game: EXPANSION_GAMES['Mists of Pandaria'], seedMode: 'legacy-insert', hasData: true }),
  'Forever': Object.freeze({ storedName: 'Forever', slug: 'forever', game: EXPANSION_GAMES.Forever, seedMode: 'sync', hasData: true }),
  'Warlords of Draenor': Object.freeze({ storedName: 'Warlords of Draenor', slug: 'wod', game: null, seedMode: null, hasData: false }),
  'Legion': Object.freeze({ storedName: 'Legion', slug: 'legion', game: null, seedMode: null, hasData: false }),
  'Battle for Azeroth': Object.freeze({ storedName: 'Battle for Azeroth', slug: 'bfa', game: null, seedMode: null, hasData: false }),
  'Shadowlands': Object.freeze({ storedName: 'Shadowlands', slug: 'sl', game: null, seedMode: null, hasData: false }),
  'Dragonflight': Object.freeze({ storedName: 'Dragonflight', slug: 'df', game: null, seedMode: null, hasData: false }),
  'The War Within': Object.freeze({ storedName: 'The War Within', slug: 'tww', game: null, seedMode: null, hasData: false }),
} satisfies Record<string, ExpansionMeta>)

/**
 * Look up a registry row by stored name. Only an own key resolves, so
 * prototype-pollution names ('constructor', '__proto__', 'toString') and
 * non-string input return null.
 */
export function getExpansionMeta(name: unknown): ExpansionMeta | null {
  if (typeof name !== 'string' || !Object.prototype.hasOwnProperty.call(EXPANSION_REGISTRY, name)) {
    return null
  }
  return EXPANSION_REGISTRY[name]
}
