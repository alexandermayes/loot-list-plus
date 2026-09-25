/**
 * Shared expansion-era gating for character classes.
 *
 * WoW Forever is a separate Classic-era branch, not a successor to Mists of
 * Pandaria, so it (and the legacy 'Classic WoW' name) is aliased to the
 * Classic era before any ordering comparison below. Every other consumer of
 * this module (CreateCharacterModal, the reserve join page, LootSettingsContent)
 * shares this single source of truth instead of maintaining its own copy.
 */

// Expansion names that are really the Classic era for class-gating purposes.
const ERA_ALIASES: Record<string, string> = {
  'Forever': 'Classic',
  'Classic WoW': 'Classic',
}

// Linear expansion progression used to compare "is this expansion at or
// after the class's debut expansion".
const EXPANSION_ORDER = [
  'Classic',
  'The Burning Crusade',
  'Wrath of the Lich King',
  'Cataclysm',
  'Mists of Pandaria',
  'Warlords of Draenor',
  'Legion',
  'Battle for Azeroth',
  'Shadowlands',
  'Dragonflight',
  'The War Within',
]

// Expansion each class debuted in. Classes with no entry here are available
// from Classic on.
const CLASS_DEBUT: Record<string, string> = {
  'Death Knight': 'Wrath of the Lich King',
  'Monk': 'Mists of Pandaria',
}

// All known class names, Classic through Mists of Pandaria.
const ALL_CLASS_NAMES = [
  'Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Death Knight',
  'Shaman', 'Mage', 'Warlock', 'Monk', 'Druid',
]

/**
 * Resolve an expansion name to the era used for class-gating comparisons.
 * 'Forever' and 'Classic WoW' both resolve to 'Classic'; every other name
 * comes back unchanged.
 */
export function resolveExpansionEra(name: string): string {
  return ERA_ALIASES[name] ?? name
}

/**
 * Is `className` available for `expansionName`? Unknown or missing
 * expansions default to true (permissive) so a not-yet-recognized expansion
 * never hides every class.
 */
export function isClassAvailableForExpansion(
  className: string,
  expansionName: string | null | undefined
): boolean {
  const gate = CLASS_DEBUT[className]
  if (!gate) return true // Most classes available everywhere
  if (!expansionName) return true // No expansion set, show all

  const era = resolveExpansionEra(expansionName)
  const gateIndex = EXPANSION_ORDER.indexOf(gate)
  const currentIndex = EXPANSION_ORDER.indexOf(era)
  if (gateIndex === -1 || currentIndex === -1) return true

  return currentIndex >= gateIndex
}

/**
 * All class names available for `expansionName`, or null when the resolved
 * era isn't a recognized expansion (e.g. a future expansion with no data).
 */
export function getExpansionClassNames(expansionName: string): string[] | null {
  const era = resolveExpansionEra(expansionName)
  if (EXPANSION_ORDER.indexOf(era) === -1) return null

  return ALL_CLASS_NAMES.filter((className) => isClassAvailableForExpansion(className, expansionName))
}
