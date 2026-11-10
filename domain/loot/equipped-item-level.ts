/**
 * Equipped item level comparison for the officer item candidate panel
 * (quick task 261026-wpw). Pure rules: which equipped slots a loot item is
 * compared against, how a tier token resolves to a slot, and how one
 * character's synced gear reads for that item. Display only: nothing here
 * feeds LootScore.
 */

/** Stored slot values of SLOT_MAPPING in lib/battlenet.ts, without Shirt and Tabard. */
export type EquippedSlotName =
  | 'Head'
  | 'Neck'
  | 'Shoulder'
  | 'Chest'
  | 'Waist'
  | 'Legs'
  | 'Feet'
  | 'Wrist'
  | 'Hands'
  | 'Finger 1'
  | 'Finger 2'
  | 'Trinket 1'
  | 'Trinket 2'
  | 'Back'
  | 'Main Hand'
  | 'Off Hand'
  | 'Ranged'

export type TierTokenSlot = 'Head' | 'Shoulder' | 'Chest' | 'Hands' | 'Legs' | 'Wrist' | 'Waist' | 'Feet'

export interface EquippedSlotRule {
  /** Slots the item would replace; the shown level is the lowest of them. */
  primary: EquippedSlotName[]
  /** Slots listed alongside for context, never part of the shown level. */
  context: EquippedSlotName[]
  /** Slots compared instead when a primary slot has no synced row. */
  fallback: EquippedSlotName[]
  /** 'lowest' for paired slots (rings, trinkets), 'single' otherwise. */
  basis: 'lowest' | 'single'
}

/** One character's synced gear: slot name to item level, where a key means a row exists. */
export interface EquippedCharacterLevels {
  synced_at: string | null
  slots: Record<string, number | null>
}

export type EquippedItemLevelSummary =
  | { kind: 'not-comparable' }
  | { kind: 'not-synced' }
  | { kind: 'empty-slot' }
  | { kind: 'no-item-level' }
  | {
      kind: 'ok'
      itemLevel: number
      perSlot: Array<{ slot: EquippedSlotName; level: number }>
      syncedAt: string | null
    }

const SINGLE_ARMOR_SLOTS: Record<string, EquippedSlotName> = {
  head: 'Head',
  neck: 'Neck',
  shoulder: 'Shoulder',
  back: 'Back',
  chest: 'Chest',
  wrist: 'Wrist',
  hands: 'Hands',
  waist: 'Waist',
  legs: 'Legs',
  feet: 'Feet',
}

/** Whole words in a tier token name that name its slot. */
const TIER_TOKEN_WORDS: Record<string, TierTokenSlot> = {
  helm: 'Head',
  helmet: 'Head',
  crown: 'Head',
  circlet: 'Head',
  headpiece: 'Head',
  diadem: 'Head',
  shoulders: 'Shoulder',
  shoulderpads: 'Shoulder',
  mantle: 'Shoulder',
  pauldrons: 'Shoulder',
  spaulders: 'Shoulder',
  chest: 'Chest',
  chestguard: 'Chest',
  breastplate: 'Chest',
  robe: 'Chest',
  tunic: 'Chest',
  gauntlets: 'Hands',
  gloves: 'Hands',
  handguards: 'Hands',
  leggings: 'Legs',
  legguards: 'Legs',
  legplates: 'Legs',
  bracers: 'Wrist',
  bindings: 'Wrist',
  wristguards: 'Wrist',
  armsplint: 'Wrist',
  belt: 'Waist',
  girdle: 'Waist',
  waistguard: 'Waist',
  sash: 'Waist',
  boots: 'Feet',
  sabatons: 'Feet',
  sandals: 'Feet',
}

/** WowSims stores paired slots without the space; Battle.net stores them with it. */
const STORED_SLOT_ALIASES: Record<string, EquippedSlotName> = {
  Finger1: 'Finger 1',
  Finger2: 'Finger 2',
  Trinket1: 'Trinket 1',
  Trinket2: 'Trinket 2',
}

function single(slot: EquippedSlotName): EquippedSlotRule {
  return { primary: [slot], context: [], fallback: [], basis: 'single' }
}

/**
 * The slot a tier token turns into, read from the slot word in its name.
 * Qiraji and Primal Hakkari tokens give null because they turn into a
 * different slot per class.
 */
export function tierTokenSlot(name: string): TierTokenSlot | null {
  const lower = name.toLowerCase()
  if (lower.includes('qiraji') || lower.includes('primal hakkari')) return null
  for (const word of lower.split(/[^a-z]+/)) {
    const slot = TIER_TOKEN_WORDS[word]
    if (slot) return slot
  }
  return null
}

/**
 * Which equipped slots a loot item is compared against, or null when the
 * item has no comparable slot (mounts, recipes, quest items and so on).
 */
export function equippedSlotsForLootItem(itemSlot: string, itemName: string): EquippedSlotRule | null {
  const slot = itemSlot.trim().toLowerCase()
  switch (slot) {
    // Paired slots compare against the lower one, the piece the drop most likely replaces.
    case 'finger':
      return { primary: ['Finger 1', 'Finger 2'], context: [], fallback: [], basis: 'lowest' }
    case 'trinket':
      return { primary: ['Trinket 1', 'Trinket 2'], context: [], fallback: [], basis: 'lowest' }
    // A One-Hand drop compares against the main hand, with the off hand as
    // context only: tanks and casters replace the main hand, and the off hand
    // can be a shield or a frill whose level says nothing about the upgrade.
    // A Two-Hand drop replaces the main hand and empties the off hand.
    case 'one-hand':
    case 'two-hand':
      return { primary: ['Main Hand'], context: ['Off Hand'], fallback: [], basis: 'single' }
    case 'main hand':
    case 'weapon':
      return single('Main Hand')
    case 'off-hand':
    case 'off hand':
    case 'shield':
    case 'held in off-hand':
      return single('Off Hand')
    // MoP removed the ranged slot for melee, so a synced MoP character has no
    // Ranged row and a Ranged drop compares against the main hand instead.
    case 'ranged':
    case 'wand':
    case 'thrown':
      return { primary: ['Ranged'], context: [], fallback: ['Main Hand'], basis: 'single' }
    case 'relic':
    case 'idol':
    case 'totem':
    case 'libram':
    case 'sigil':
      return single('Ranged')
    case 'token': {
      const tokenSlot = tierTokenSlot(itemName)
      return tokenSlot ? single(tokenSlot) : null
    }
    default: {
      const armor = SINGLE_ARMOR_SLOTS[slot]
      return armor ? single(armor) : null
    }
  }
}

function normalizeStoredSlots(slots: Record<string, number | null>): Record<string, number | null> {
  const normalized: Record<string, number | null> = {}
  for (const [key, level] of Object.entries(slots)) {
    const trimmed = key.trim()
    normalized[STORED_SLOT_ALIASES[trimmed] ?? trimmed] = level
  }
  return normalized
}

/**
 * One character's equipped item level for a loot item, from their synced
 * gear. An empty paired slot reads as empty rather than borrowing the other
 * slot's level, because the drop would fill the empty one.
 */
export function summarizeEquippedItemLevel(
  itemSlot: string,
  itemName: string,
  equipped: EquippedCharacterLevels | null
): EquippedItemLevelSummary {
  const rule = equippedSlotsForLootItem(itemSlot, itemName)
  if (!rule) return { kind: 'not-comparable' }
  if (!equipped) return { kind: 'not-synced' }

  const slots = normalizeStoredSlots(equipped.slots)
  if (Object.keys(slots).length === 0) return { kind: 'not-synced' }

  const hasRow = (slot: EquippedSlotName) => slots[slot] !== undefined
  let primary = rule.primary
  if (rule.fallback.length > 0 && primary.some(slot => !hasRow(slot))) primary = rule.fallback

  if (primary.some(slot => !hasRow(slot))) return { kind: 'empty-slot' }
  if (primary.some(slot => slots[slot] === null)) return { kind: 'no-item-level' }

  const perSlot = primary.map(slot => ({ slot, level: slots[slot] as number }))
  const itemLevel = Math.min(...perSlot.map(entry => entry.level))
  for (const slot of rule.context) {
    const level = slots[slot]
    if (typeof level === 'number') perSlot.push({ slot, level })
  }

  return { kind: 'ok', itemLevel, perSlot, syncedAt: equipped.synced_at }
}

/** Whole days since the sync, never below 0; null without a readable sync time. */
export function daysSinceSync(syncedAt: string | null, now: Date): number | null {
  if (!syncedAt) return null
  const synced = new Date(syncedAt).getTime()
  if (Number.isNaN(synced)) return null
  return Math.max(0, Math.floor((now.getTime() - synced) / 86_400_000))
}
