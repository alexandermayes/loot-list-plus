/**
 * GH-278 scope: the Epic Classic raid drops the wow-classic-items package
 * (2.0.1) records no source for, so the completeness gate in
 * classic-catalog-completeness.test.ts, which only sees package items with a
 * source.zone, never required them. Cache of the Firelord and the Four
 * Horsemen Chest are game objects rather than NPC loot, and the package has
 * no item at all in Onyxia's Lair (zone 2159), so every Onyxia drop, the five
 * Cache items outside the wider Molten Core zone coverage and the nine chest
 * items in Naxxramas could leave data/classic-wow-raids.ts without a test
 * noticing.
 *
 * The package has no boss or NPC name for these ids to key on, so the mapping
 * is keyed by the in-game drop source, with the catalog boss group recorded
 * per row because the three chest Desecrated tokens sit under 'Tier 3 Tokens'
 * while the other six chest items sit under 'Four Horsemen'.
 *
 * Provenance: AtlasLootClassic and Wowhead Classic for the drop source and
 * the boss group; name, quality and icon are confirmed against the package by
 * classic-gh278-zoneless.test.ts, which also fails the moment the package
 * starts attributing one of these ids, so the row leaves this fixture and the
 * zone gate takes over. Four ids (18705, 18808, 19139, 19140) also appear in
 * GH273_CORE, which pins the #273 additions while this fixture pins the zone
 * gap. The eight zone-less Rare recipes are gated by #284 and deliberately
 * absent here.
 */

// regression for #278

export type ZonelessSource = 'Cache of the Firelord' | 'Onyxia' | 'Four Horsemen Chest'

export const ZONELESS_SOURCE_RAID: Record<ZonelessSource, string> = {
  'Cache of the Firelord': 'Molten Core',
  'Onyxia': "Onyxia's Lair",
  'Four Horsemen Chest': 'Naxxramas',
}

export interface Gh278ZonelessItem {
  source: ZonelessSource
  boss: string
  id: number
  name: string
  slot: string
}

export const GH278_ZONELESS: Gh278ZonelessItem[] = [
]

export interface Gh278PlacedItem extends Gh278ZonelessItem {
  raid: string
}

export const GH278_PLACED: Gh278PlacedItem[] = GH278_ZONELESS.map(item => ({
  ...item,
  raid: ZONELESS_SOURCE_RAID[item.source],
}))
