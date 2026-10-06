/**
 * Raid catalog names used to decide which of a guild's raid tiers an addon
 * or companion award belongs to, when the item sits in more than one tier
 * (GH #307).
 *
 * Two exports:
 * - RAID_INSTANCE_NAMES: for a catalog raid name, the in-game instance
 *   names (the map name GetInstanceInfo returns, which the addon stores as
 *   a session's raidName) that differ from it. A Classic client may also
 *   report the catalog name itself, which already matches a raid_tiers.name
 *   row directly, so listing the map name here too is harmless.
 * - CATALOG_GROUP_LABELS: the boss_name labels the raid catalogs use for a
 *   group of items rather than a single encounter (for example 'Shared Boss
 *   Loot' or 'Trash'). A row under one of these labels is never a boss
 *   signal on its own, and counts as a group row for the boss-tier rule in
 *   lib/loot/guild-scoped-lookup.ts.
 *
 * Every name here is matched with normalizeCatalogName from
 * lib/loot/guild-scoped-lookup.ts: trimmed, curly apostrophes straightened
 * to a plain one, whitespace collapsed, case-insensitive. Matching only
 * ever chooses among the rows already scoped to one guild for one item; it
 * never widens which rows a lookup can see.
 */

/**
 * Catalog raid name to the in-game instance names (GetInstanceInfo map
 * names) that differ from it. Source: the instance id from
 * warcraft.wiki.gg InstanceID, noted per entry.
 */
export const RAID_INSTANCE_NAMES: Readonly<Record<string, readonly string[]>> = {
  "Temple of Ahn'Qiraj": ["Ahn'Qiraj Temple"], // InstanceID 531
  'Serpentshrine Cavern': ['Coilfang: Serpentshrine Cavern'], // InstanceID 548
  'Tempest Keep: The Eye': ['Tempest Keep'], // InstanceID 550
  'Hyjal Summit': ['The Battle for Mount Hyjal'], // InstanceID 534
  'Sunwell Plateau': ['The Sunwell'], // InstanceID 580
  'Naxxramas (Wrath)': ['Naxxramas'], // InstanceID 533
  'Eye of Eternity': ['The Eye of Eternity'], // InstanceID 616
  'Obsidian Sanctum': ['The Obsidian Sanctum'], // InstanceID 615
  "Onyxia's Lair (Wrath)": ["Onyxia's Lair"], // InstanceID 249
  'Ruby Sanctum': ['The Ruby Sanctum'], // InstanceID 724
}

/**
 * The boss_name labels the raid catalogs use for a group of items rather
 * than naming a single encounter. Never a boss signal on its own: the
 * boss-tier rule in lib/loot/guild-scoped-lookup.ts treats a row under one
 * of these labels as a group row (CATALOG_GROUP_LABELS), decided by which
 * of its candidate tiers has the live boss, not by the label itself.
 */
export const CATALOG_GROUP_LABELS: readonly string[] = [
  'Shared Boss Loot',
  'Trash',
  'Crafting Materials',
  'Tier 3 Tokens',
]
