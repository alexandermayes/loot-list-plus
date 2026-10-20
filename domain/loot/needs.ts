/**
 * The Discovery need taxonomy: every generic need a raider can rank on a
 * Discovery tier, as one frozen list (D-12). Seeding, the picker and the Drop
 * Desk all read this file and nothing else.
 *
 * Keys never change once shipped, because rankings, submissions, bad luck
 * protection and pins reference them. A change to a shipped key is an alias,
 * never a rename: the old key moves into previousKeys and the old display name
 * into previousNames, the way raid previousNames work in the expansion
 * manifest. domain/loot/__tests__/needs.test.ts holds an independent
 * transcription of the keys (__fixtures__/need-keys.json), so adding, dropping
 * or renaming a key means editing both files on purpose.
 *
 * Costs follow the 10-point budget (Big 3, Medium 2, Standard 1; D-06) and are
 * stored in allocation_cost. The restriction class mirrors the tier (D-08), so
 * the bracket and restriction readers keep working on need rows. Shield,
 * Off-hand item and Relic are Medium and wands fold into the Ranged weapon rows
 * (owner decision D-23); the Oct 26 review covers display names only.
 *
 * Client-safe: type-only imports, no server code, so the Phase 4 picker can
 * import it in the browser.
 */
import type { Role } from '@/domain/loot/spec-role-mapping'
import type { ItemClassification } from '@/data/expansions/types'
import type { ArmorType } from '@/data/class-proficiencies'

export type NeedSlotKey =
  | 'two-hand-weapon'
  | 'main-hand-weapon'
  | 'off-hand-weapon'
  | 'ranged-weapon'
  | 'trinket'
  | 'ring'
  | 'neck'
  | 'back'
  | 'shield'
  | 'off-hand-item'
  | 'relic'
  | 'head'
  | 'shoulders'
  | 'chest'
  | 'wrist'
  | 'hands'
  | 'waist'
  | 'legs'
  | 'feet'

export type NeedArmourKey = 'cloth' | 'leather' | 'mail' | 'plate'

export type NeedStatKey = 'strength' | 'agility' | 'tank' | 'spell-damage' | 'healing' | 'physical'

export type NeedCostTier = 'big' | 'medium' | 'standard'

export interface NeedDefinition {
  /** slot[.armour].stat, lowercase kebab segments joined by dots. */
  readonly key: string
  /** Slot, optional armour and stat joined by comma and space. */
  readonly name: string
  readonly slot: NeedSlotKey
  readonly armour: NeedArmourKey | null
  readonly stat: NeedStatKey
  readonly tier: NeedCostTier
  readonly cost: 1 | 2 | 3
  readonly classification: ItemClassification
  /** Keys this row used to be called; each still resolves to this row (D-12). */
  readonly previousKeys: readonly string[]
  /** Display names this row used to carry. */
  readonly previousNames: readonly string[]
}

/** The loot_items columns a need row carries, before the seeder adds raid_tier_id. */
export interface NeedRowColumns {
  name: string
  boss_name: typeof NEED_BOSS_NAME
  item_slot: string
  kind: 'need'
  need_key: string
  classification: ItemClassification
  allocation_cost: number
  armor_type: ArmorType | null
  roles: Role[]
  primary_stat: 'Strength' | 'Agility' | null
  is_available: true
  is_loot_council: false
}

/**
 * A string sentinel keeps every boss_name-typed component working and groups
 * all needs under one "Needs" heading per tier (D-13).
 */
export const NEED_BOSS_NAME = 'Needs'

export const NEED_COST_BY_TIER: Readonly<Record<NeedCostTier, 1 | 2 | 3>> = Object.freeze({
  big: 3,
  medium: 2,
  standard: 1,
})

export const NEED_CLASSIFICATION_BY_TIER: Readonly<Record<NeedCostTier, ItemClassification>> =
  Object.freeze({
    big: 'Reserved',
    medium: 'Limited',
    standard: 'Unlimited',
  })

const STAT_DISPLAY: Record<NeedStatKey, string> = {
  strength: 'Strength',
  agility: 'Agility',
  tank: 'Tank',
  'spell-damage': 'Spell damage',
  healing: 'Healing',
  physical: 'Physical',
}

const ARMOUR_DISPLAY: Record<NeedArmourKey, string> = {
  cloth: 'Cloth',
  leather: 'Leather',
  mail: 'Mail',
  plate: 'Plate',
}

interface NonArmourSlot {
  key: NeedSlotKey
  display: string
  itemSlot: string
  tier: NeedCostTier
  families: readonly NeedStatKey[]
}

interface ArmourSlot {
  key: NeedSlotKey
  display: string
  itemSlot: string
}

// Order matters: NEED_DEFINITIONS follows this table top to bottom, so two
// builds produce identical arrays (DISC-01).
const NON_ARMOUR_SLOTS: readonly NonArmourSlot[] = [
  { key: 'two-hand-weapon', display: 'Two-hand weapon', itemSlot: 'Two-Hand', tier: 'big', families: ['strength', 'agility', 'tank', 'spell-damage', 'healing'] },
  { key: 'main-hand-weapon', display: 'Main hand weapon', itemSlot: 'Main Hand', tier: 'big', families: ['strength', 'agility', 'tank', 'spell-damage', 'healing'] },
  { key: 'off-hand-weapon', display: 'Off-hand weapon', itemSlot: 'Off Hand', tier: 'big', families: ['strength', 'agility'] },
  // Wands have no slot of their own: caster ranged needs are these rows (D-23).
  { key: 'ranged-weapon', display: 'Ranged weapon', itemSlot: 'Ranged', tier: 'big', families: ['agility', 'spell-damage', 'healing'] },
  { key: 'trinket', display: 'Trinket', itemSlot: 'Trinket', tier: 'big', families: ['physical', 'spell-damage', 'healing', 'tank'] },
  { key: 'ring', display: 'Ring', itemSlot: 'Finger', tier: 'medium', families: ['physical', 'spell-damage', 'healing', 'tank'] },
  { key: 'neck', display: 'Neck', itemSlot: 'Neck', tier: 'medium', families: ['physical', 'spell-damage', 'healing', 'tank'] },
  { key: 'back', display: 'Back', itemSlot: 'Back', tier: 'medium', families: ['physical', 'spell-damage', 'healing', 'tank'] },
  { key: 'shield', display: 'Shield', itemSlot: 'Shield', tier: 'medium', families: ['tank', 'healing', 'spell-damage'] },
  { key: 'off-hand-item', display: 'Off-hand item', itemSlot: 'Held In Off-hand', tier: 'medium', families: ['spell-damage', 'healing'] },
  { key: 'relic', display: 'Relic', itemSlot: 'Relic', tier: 'medium', families: ['strength', 'agility', 'tank', 'spell-damage', 'healing'] },
]

const ARMOUR_SLOTS: readonly ArmourSlot[] = [
  { key: 'head', display: 'Head', itemSlot: 'Head' },
  { key: 'shoulders', display: 'Shoulders', itemSlot: 'Shoulder' },
  { key: 'chest', display: 'Chest', itemSlot: 'Chest' },
  { key: 'wrist', display: 'Wrist', itemSlot: 'Wrist' },
  { key: 'hands', display: 'Hands', itemSlot: 'Hands' },
  { key: 'waist', display: 'Waist', itemSlot: 'Waist' },
  { key: 'legs', display: 'Legs', itemSlot: 'Legs' },
  { key: 'feet', display: 'Feet', itemSlot: 'Feet' },
]

// Armour class appears only on the eight armour slots, in this order.
const ARMOUR_MATRIX: ReadonlyArray<readonly [NeedArmourKey, readonly NeedStatKey[]]> = [
  ['cloth', ['spell-damage', 'healing']],
  ['leather', ['agility', 'tank', 'healing', 'spell-damage']],
  ['mail', ['agility', 'strength', 'spell-damage', 'healing']],
  ['plate', ['strength', 'tank', 'healing']],
]

// item_slot per slot key, so needRowColumns needs no second lookup table.
const ITEM_SLOT_BY_SLOT: Record<string, string> = {}
for (const slot of NON_ARMOUR_SLOTS) ITEM_SLOT_BY_SLOT[slot.key] = slot.itemSlot
for (const slot of ARMOUR_SLOTS) ITEM_SLOT_BY_SLOT[slot.key] = slot.itemSlot

function buildDefinition(
  slot: NeedSlotKey,
  slotDisplay: string,
  armour: NeedArmourKey | null,
  stat: NeedStatKey,
  tier: NeedCostTier,
): NeedDefinition {
  const key = armour ? `${slot}.${armour}.${stat}` : `${slot}.${stat}`
  const nameParts = armour
    ? [slotDisplay, ARMOUR_DISPLAY[armour], STAT_DISPLAY[stat]]
    : [slotDisplay, STAT_DISPLAY[stat]]
  return Object.freeze({
    key,
    name: nameParts.join(', '),
    slot,
    armour,
    stat,
    tier,
    cost: NEED_COST_BY_TIER[tier],
    classification: NEED_CLASSIFICATION_BY_TIER[tier],
    previousKeys: Object.freeze([] as string[]),
    previousNames: Object.freeze([] as string[]),
  })
}

function buildDefinitions(): readonly NeedDefinition[] {
  const rows: NeedDefinition[] = []
  for (const slot of NON_ARMOUR_SLOTS) {
    for (const stat of slot.families) {
      rows.push(buildDefinition(slot.key, slot.display, null, stat, slot.tier))
    }
  }
  for (const slot of ARMOUR_SLOTS) {
    for (const [armour, stats] of ARMOUR_MATRIX) {
      for (const stat of stats) {
        rows.push(buildDefinition(slot.key, slot.display, armour, stat, 'standard'))
      }
    }
  }
  return Object.freeze(rows)
}

export const NEED_DEFINITIONS: readonly NeedDefinition[] = buildDefinitions()

// Looked up through a Map, never by indexing an object with the input, so
// 'constructor' and '__proto__' cannot answer from the prototype (T-03-03-02).
// Previous keys go in first so a current key always wins over an alias.
const DEFINITION_BY_KEY: ReadonlyMap<string, NeedDefinition> = (() => {
  const map = new Map<string, NeedDefinition>()
  for (const definition of NEED_DEFINITIONS) {
    for (const previous of definition.previousKeys) map.set(previous, definition)
  }
  for (const definition of NEED_DEFINITIONS) map.set(definition.key, definition)
  return map
})()

/** The definition for a current or previous key, else null. */
export function findNeedDefinition(key: unknown): NeedDefinition | null {
  if (typeof key !== 'string') return null
  return DEFINITION_BY_KEY.get(key) ?? null
}

/** The current key for a current or previous key, else null. */
export function resolveNeedKey(key: unknown): string | null {
  return findNeedDefinition(key)?.key ?? null
}

function rolesForStat(stat: NeedStatKey): Role[] {
  switch (stat) {
    case 'tank':
      return ['tank']
    case 'healing':
      return ['healer']
    case 'spell-damage':
      return ['caster']
    case 'strength':
    case 'agility':
    case 'physical':
      return ['physical']
  }
}

/**
 * The loot_items columns for one need row. The seeder adds raid_tier_id;
 * wowhead_id stays null by column default, so it is not part of the payload.
 */
export function needRowColumns(definition: NeedDefinition): NeedRowColumns {
  return {
    name: definition.name,
    boss_name: NEED_BOSS_NAME,
    item_slot: ITEM_SLOT_BY_SLOT[definition.slot],
    kind: 'need',
    need_key: definition.key,
    classification: definition.classification,
    allocation_cost: definition.cost,
    armor_type: definition.armour ? ARMOUR_DISPLAY[definition.armour] as ArmorType : null,
    roles: rolesForStat(definition.stat),
    primary_stat:
      definition.stat === 'strength' ? 'Strength' : definition.stat === 'agility' ? 'Agility' : null,
    is_available: true,
    is_loot_council: false,
  }
}
