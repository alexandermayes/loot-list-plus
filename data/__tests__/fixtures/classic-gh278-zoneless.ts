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
  // Cache of the Firelord (5): the chest Majordomo Executus leaves, under his boss group
  { source: 'Cache of the Firelord', boss: 'Majordomo Executus', id: 18803, name: 'Hyperthermically Insulated Lava Dredger', slot: 'Two-Hand' },
  { source: 'Cache of the Firelord', boss: 'Majordomo Executus', id: 18806, name: 'Core Forged Greaves', slot: 'Feet' },
  { source: 'Cache of the Firelord', boss: 'Majordomo Executus', id: 19139, name: 'Fireguard Shoulders', slot: 'Shoulder' },
  { source: 'Cache of the Firelord', boss: 'Majordomo Executus', id: 18808, name: 'Gloves of the Hypnotic Flame', slot: 'Hands' },
  { source: 'Cache of the Firelord', boss: 'Majordomo Executus', id: 19140, name: 'Cauterizing Band', slot: 'Finger' },

  // Onyxia (18): the nine Tier 2 helms, then the weapons, accessories and quest items
  { source: 'Onyxia', boss: 'Onyxia', id: 16900, name: 'Stormrage Cover', slot: 'Head' },
  { source: 'Onyxia', boss: 'Onyxia', id: 16908, name: 'Bloodfang Hood', slot: 'Head' },
  { source: 'Onyxia', boss: 'Onyxia', id: 16914, name: 'Netherwind Crown', slot: 'Head' },
  { source: 'Onyxia', boss: 'Onyxia', id: 16921, name: 'Halo of Transcendence', slot: 'Head' },
  { source: 'Onyxia', boss: 'Onyxia', id: 16929, name: 'Nemesis Skullcap', slot: 'Head' },
  { source: 'Onyxia', boss: 'Onyxia', id: 16939, name: "Dragonstalker's Helm", slot: 'Head' },
  { source: 'Onyxia', boss: 'Onyxia', id: 16947, name: 'Helmet of Ten Storms', slot: 'Head' },
  { source: 'Onyxia', boss: 'Onyxia', id: 16955, name: 'Judgement Crown', slot: 'Head' },
  { source: 'Onyxia', boss: 'Onyxia', id: 16963, name: 'Helm of Wrath', slot: 'Head' },
  { source: 'Onyxia', boss: 'Onyxia', id: 17067, name: 'Ancient Cornerstone Grimoire', slot: 'Off-Hand' },
  { source: 'Onyxia', boss: 'Onyxia', id: 17068, name: 'Deathbringer', slot: 'Weapon' },
  { source: 'Onyxia', boss: 'Onyxia', id: 17075, name: "Vis'kag the Bloodletter", slot: 'Weapon' },
  { source: 'Onyxia', boss: 'Onyxia', id: 17064, name: 'Shard of the Scale', slot: 'Trinket' },
  { source: 'Onyxia', boss: 'Onyxia', id: 17078, name: 'Sapphiron Drape', slot: 'Back' },
  { source: 'Onyxia', boss: 'Onyxia', id: 18205, name: "Eskhandar's Collar", slot: 'Neck' },
  { source: 'Onyxia', boss: 'Onyxia', id: 18813, name: 'Ring of Binding', slot: 'Finger' },
  { source: 'Onyxia', boss: 'Onyxia', id: 18423, name: 'Head of Onyxia', slot: 'Quest' },
  { source: 'Onyxia', boss: 'Onyxia', id: 18705, name: 'Mature Black Dragon Sinew', slot: 'Token' },

  // Four Horsemen Chest (6 + 3): the six drops under the encounter, the three
  // Desecrated tokens under the catalog's 'Tier 3 Tokens' group
  { source: 'Four Horsemen Chest', boss: 'Four Horsemen', id: 22691, name: 'Corrupted Ashbringer', slot: 'Two-Hand' },
  { source: 'Four Horsemen Chest', boss: 'Four Horsemen', id: 22809, name: 'Maul of the Redeemed Crusader', slot: 'Two-Hand' },
  { source: 'Four Horsemen Chest', boss: 'Four Horsemen', id: 22811, name: 'Soulstring', slot: 'Ranged' },
  { source: 'Four Horsemen Chest', boss: 'Four Horsemen', id: 23071, name: 'Leggings of Apocalypse', slot: 'Legs' },
  { source: 'Four Horsemen Chest', boss: 'Four Horsemen', id: 23027, name: 'Warmth of Forgiveness', slot: 'Trinket' },
  { source: 'Four Horsemen Chest', boss: 'Four Horsemen', id: 23025, name: 'Seal of the Damned', slot: 'Finger' },
  { source: 'Four Horsemen Chest', boss: 'Tier 3 Tokens', id: 22349, name: 'Desecrated Breastplate', slot: 'Token' },
  { source: 'Four Horsemen Chest', boss: 'Tier 3 Tokens', id: 22350, name: 'Desecrated Tunic', slot: 'Token' },
  { source: 'Four Horsemen Chest', boss: 'Tier 3 Tokens', id: 22351, name: 'Desecrated Robe', slot: 'Token' },
]

export interface Gh278PlacedItem extends Gh278ZonelessItem {
  raid: string
}

export const GH278_PLACED: Gh278PlacedItem[] = GH278_ZONELESS.map(item => ({
  ...item,
  raid: ZONELESS_SOURCE_RAID[item.source],
}))
