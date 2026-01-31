/**
 * WowSims JSON Parser
 *
 * Parses and validates character gear exports from WowSims addon.
 * WowSims Exporter addon: https://www.curseforge.com/wow/addons/wowsimsexporter
 *
 * The addon exports character data as JSON which can be imported into
 * wowsims.github.io for simulation. We use the same format to import
 * the player's current gear.
 */

// WowSims JSON structure types
export interface WowSimsGem {
  name: string
  id: number
}

export interface WowSimsEnchant {
  name: string
  id: number
}

export interface WowSimsItem {
  name: string
  id: number
  slot: WowSimsSlot
  enchant?: WowSimsEnchant
  gems?: WowSimsGem[]
}

export interface WowSimsCharacter {
  name: string
  level: number
  gameClass: string
  race: string
}

export interface WowSimsExport {
  name?: string
  character: WowSimsCharacter
  items: WowSimsItem[]
}

// WowSims slot names
export type WowSimsSlot =
  | 'HEAD'
  | 'NECK'
  | 'SHOULDER'
  | 'BACK'
  | 'CHEST'
  | 'WRIST'
  | 'HANDS'
  | 'WAIST'
  | 'LEGS'
  | 'FEET'
  | 'FINGER1'
  | 'FINGER2'
  | 'TRINKET1'
  | 'TRINKET2'
  | 'MAIN_HAND'
  | 'OFF_HAND'
  | 'RANGED'

// Map WowSims slots to our database item_slot values
// Some slots can match multiple item_slot values
export const WOWSIMS_SLOT_MAP: Record<WowSimsSlot, string[]> = {
  HEAD: ['Head'],
  NECK: ['Neck'],
  SHOULDER: ['Shoulder'],
  BACK: ['Back'],
  CHEST: ['Chest'],
  WRIST: ['Wrist'],
  HANDS: ['Hands'],
  WAIST: ['Waist'],
  LEGS: ['Legs'],
  FEET: ['Feet'],
  FINGER1: ['Finger'],
  FINGER2: ['Finger'],
  TRINKET1: ['Trinket'],
  TRINKET2: ['Trinket'],
  MAIN_HAND: ['Main Hand', 'One-Hand', 'Two-Hand', 'Weapon'],
  OFF_HAND: ['Off Hand', 'Shield', 'Held In Off-hand', 'One-Hand'],
  RANGED: ['Ranged', 'Wand', 'Relic', 'Idol', 'Totem', 'Libram', 'Thrown'],
}

// Normalize slot for storage (use consistent slot names)
export const NORMALIZED_SLOT_MAP: Record<WowSimsSlot, string> = {
  HEAD: 'Head',
  NECK: 'Neck',
  SHOULDER: 'Shoulder',
  BACK: 'Back',
  CHEST: 'Chest',
  WRIST: 'Wrist',
  HANDS: 'Hands',
  WAIST: 'Waist',
  LEGS: 'Legs',
  FEET: 'Feet',
  FINGER1: 'Finger1',
  FINGER2: 'Finger2',
  TRINKET1: 'Trinket1',
  TRINKET2: 'Trinket2',
  MAIN_HAND: 'Main Hand',
  OFF_HAND: 'Off Hand',
  RANGED: 'Ranged',
}

// Valid WowSims slots
const VALID_SLOTS: WowSimsSlot[] = [
  'HEAD',
  'NECK',
  'SHOULDER',
  'BACK',
  'CHEST',
  'WRIST',
  'HANDS',
  'WAIST',
  'LEGS',
  'FEET',
  'FINGER1',
  'FINGER2',
  'TRINKET1',
  'TRINKET2',
  'MAIN_HAND',
  'OFF_HAND',
  'RANGED',
]

// WowSims class names mapped to our class names
export const WOWSIMS_CLASS_MAP: Record<string, string> = {
  WARRIOR: 'Warrior',
  PALADIN: 'Paladin',
  HUNTER: 'Hunter',
  ROGUE: 'Rogue',
  PRIEST: 'Priest',
  DEATH_KNIGHT: 'Death Knight',
  DEATHKNIGHT: 'Death Knight',
  SHAMAN: 'Shaman',
  MAGE: 'Mage',
  WARLOCK: 'Warlock',
  DRUID: 'Druid',
  MONK: 'Monk',
}

export interface ParsedGearItem {
  slot: string
  wowheadId: number
  itemName: string
  enchantId?: number
  gemIds?: number[]
  originalSlot: WowSimsSlot
}

export interface ParsedGear {
  characterName: string
  className: string
  level: number
  race: string
  items: ParsedGearItem[]
}

export interface ParseResult {
  success: boolean
  data?: ParsedGear
  error?: string
}

/**
 * Parse and validate WowSims JSON export
 */
export function parseWowSimsExport(jsonString: string): ParseResult {
  // Try to parse JSON
  let data: unknown
  try {
    data = JSON.parse(jsonString)
  } catch {
    return {
      success: false,
      error: 'Invalid JSON format. Please paste the complete export from WowSims.',
    }
  }

  // Validate structure
  if (!data || typeof data !== 'object') {
    return {
      success: false,
      error: 'Invalid export format. Expected an object.',
    }
  }

  const exportData = data as Record<string, unknown>

  // Check for character data
  if (!exportData.character || typeof exportData.character !== 'object') {
    return {
      success: false,
      error: 'Missing character data in export.',
    }
  }

  const character = exportData.character as Record<string, unknown>

  // Validate character fields
  if (typeof character.name !== 'string' || !character.name) {
    return {
      success: false,
      error: 'Missing character name in export.',
    }
  }

  if (typeof character.gameClass !== 'string' || !character.gameClass) {
    return {
      success: false,
      error: 'Missing character class in export.',
    }
  }

  const className = WOWSIMS_CLASS_MAP[character.gameClass.toUpperCase()]
  if (!className) {
    return {
      success: false,
      error: `Unknown class: ${character.gameClass}`,
    }
  }

  // Check for items
  if (!Array.isArray(exportData.items)) {
    return {
      success: false,
      error: 'Missing items array in export.',
    }
  }

  // Parse items
  const items: ParsedGearItem[] = []
  const seenSlots = new Set<string>()

  for (const item of exportData.items) {
    if (!item || typeof item !== 'object') continue

    const itemData = item as Record<string, unknown>

    // Validate required item fields
    if (typeof itemData.id !== 'number' || itemData.id <= 0) continue
    if (typeof itemData.slot !== 'string') continue

    const slot = itemData.slot.toUpperCase() as WowSimsSlot
    if (!VALID_SLOTS.includes(slot)) continue

    // Normalize slot name for storage
    const normalizedSlot = NORMALIZED_SLOT_MAP[slot]

    // Skip duplicate slots (shouldn't happen but be safe)
    if (seenSlots.has(normalizedSlot)) continue
    seenSlots.add(normalizedSlot)

    const parsedItem: ParsedGearItem = {
      slot: normalizedSlot,
      wowheadId: itemData.id,
      itemName: typeof itemData.name === 'string' ? itemData.name : `Item #${itemData.id}`,
      originalSlot: slot,
    }

    // Parse enchant if present
    if (itemData.enchant && typeof itemData.enchant === 'object') {
      const enchant = itemData.enchant as Record<string, unknown>
      if (typeof enchant.id === 'number' && enchant.id > 0) {
        parsedItem.enchantId = enchant.id
      }
    }

    // Parse gems if present
    if (Array.isArray(itemData.gems) && itemData.gems.length > 0) {
      const gemIds: number[] = []
      for (const gem of itemData.gems) {
        if (gem && typeof gem === 'object') {
          const gemData = gem as Record<string, unknown>
          if (typeof gemData.id === 'number' && gemData.id > 0) {
            gemIds.push(gemData.id)
          }
        }
      }
      if (gemIds.length > 0) {
        parsedItem.gemIds = gemIds
      }
    }

    items.push(parsedItem)
  }

  if (items.length === 0) {
    return {
      success: false,
      error: 'No valid items found in export. Make sure you have gear equipped.',
    }
  }

  return {
    success: true,
    data: {
      characterName: character.name as string,
      className,
      level: typeof character.level === 'number' ? character.level : 70,
      race: typeof character.race === 'string' ? character.race : 'Unknown',
      items,
    },
  }
}

/**
 * Check if an item matches a WowSims slot
 * Used to determine if a raid drop would replace an equipped item
 */
export function itemMatchesSlot(itemSlot: string, wowsimsSlot: WowSimsSlot): boolean {
  const validSlots = WOWSIMS_SLOT_MAP[wowsimsSlot]
  return validSlots.includes(itemSlot)
}

/**
 * Get the equipment slot(s) that a loot item could go in
 * Returns WowSims slot names for matching against equipped gear
 */
export function getEquipmentSlots(itemSlot: string): WowSimsSlot[] {
  const slots: WowSimsSlot[] = []

  for (const [wowsimsSlot, itemSlots] of Object.entries(WOWSIMS_SLOT_MAP)) {
    if (itemSlots.includes(itemSlot)) {
      slots.push(wowsimsSlot as WowSimsSlot)
    }
  }

  return slots
}
