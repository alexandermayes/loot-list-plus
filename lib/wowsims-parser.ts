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
 * Extract items array from wowsims equipment object format
 * Equipment object has slot names as keys with item objects as values
 */
function extractItemsFromEquipment(equipment: Record<string, unknown> | undefined): unknown[] {
  if (!equipment) return []

  const items: unknown[] = []
  const slotMapping: Record<string, WowSimsSlot> = {
    head: 'HEAD',
    neck: 'NECK',
    shoulder: 'SHOULDER',
    back: 'BACK',
    chest: 'CHEST',
    wrist: 'WRIST',
    hands: 'HANDS',
    waist: 'WAIST',
    legs: 'LEGS',
    feet: 'FEET',
    finger1: 'FINGER1',
    finger2: 'FINGER2',
    trinket1: 'TRINKET1',
    trinket2: 'TRINKET2',
    mainHand: 'MAIN_HAND',
    offHand: 'OFF_HAND',
    ranged: 'RANGED',
  }

  for (const [key, value] of Object.entries(equipment)) {
    if (value && typeof value === 'object') {
      const item = value as Record<string, unknown>
      const slot = slotMapping[key]
      if (slot && item.id) {
        items.push({
          ...item,
          slot,
        })
      }
    }
  }

  return items
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

  // Handle different export formats:
  // Format 1: { character: {...}, items: [...] } (standard)
  // Format 2: { name: "...", gameClass: "...", equipment: {...} } (wowsims website)
  // Format 3: { player: { character: {...}, equipment: {...} } } (full sim export)

  let character: Record<string, unknown>
  let itemsSource: unknown

  if (exportData.character && typeof exportData.character === 'object') {
    // Standard format: { character: {...}, items: [...] }
    character = exportData.character as Record<string, unknown>
    itemsSource = exportData.items
  } else if (exportData.player && typeof exportData.player === 'object') {
    // Full sim export format: { player: { character: {...}, equipment: {...} } }
    const player = exportData.player as Record<string, unknown>
    if (player.character && typeof player.character === 'object') {
      character = player.character as Record<string, unknown>
      // Equipment might be in player.equipment or player.equipment.items
      const equipment = player.equipment as Record<string, unknown> | undefined
      itemsSource = equipment?.items || extractItemsFromEquipment(equipment)
    } else if (player.name && player.class) {
      // Player object IS the character
      character = player
      const equipment = player.equipment as Record<string, unknown> | undefined
      itemsSource = equipment?.items || extractItemsFromEquipment(equipment)
    } else {
      return {
        success: false,
        error: 'Missing character data in export. Try using the WowSims Exporter addon in-game.',
      }
    }
  } else if (exportData.name && (exportData.gameClass || exportData.class)) {
    // Root is the character object
    character = exportData
    // Items might be in equipment object
    const equipment = exportData.equipment as Record<string, unknown> | undefined
    itemsSource = exportData.items || equipment?.items || extractItemsFromEquipment(equipment)
  } else {
    return {
      success: false,
      error: 'Missing character data in export. Try using the WowSims Exporter addon in-game.',
    }
  }

  // Validate character fields
  if (typeof character.name !== 'string' || !character.name) {
    return {
      success: false,
      error: 'Missing character name in export.',
    }
  }

  // Handle both 'gameClass' (addon) and 'class' (website) property names
  const classValue = character.gameClass || character.class
  if (typeof classValue !== 'string' || !classValue) {
    return {
      success: false,
      error: 'Missing character class in export.',
    }
  }

  // WowSims JSON comes in two flavors: the addon uses bare class names
  // ("Shaman"), while the website / full-sim export uses the protobuf enum
  // form ("ClassShaman"). Strip the enum prefix so both resolve. (#172)
  const normalizedClass = classValue.toUpperCase().replace(/^CLASS/, '')
  const className = WOWSIMS_CLASS_MAP[normalizedClass]
  if (!className) {
    return {
      success: false,
      error: `Unknown class: ${classValue}`,
    }
  }

  // Check for items
  if (!Array.isArray(itemsSource)) {
    return {
      success: false,
      error: 'Missing items array in export.',
    }
  }

  // Parse items
  const items: ParsedGearItem[] = []
  const seenSlots = new Set<string>()

  for (let index = 0; index < itemsSource.length; index++) {
    const item = itemsSource[index]
    if (!item || typeof item !== 'object') continue

    const itemData = item as Record<string, unknown>

    // Validate required item fields
    if (typeof itemData.id !== 'number' || itemData.id <= 0) continue

    // The addon and website object forms carry an explicit `slot`. The
    // full-sim export instead stores gear as a positional array in WowSims
    // ItemSlot order (Head, Neck, … Ranged — the same order as VALID_SLOTS)
    // with no `slot` field, so fall back to the slot implied by the array
    // index. Empty slots are serialized as `{}` and dropped by the id check
    // above, which keeps the remaining indices aligned. (#172)
    const slot =
      typeof itemData.slot === 'string'
        ? (itemData.slot.toUpperCase() as WowSimsSlot)
        : VALID_SLOTS[index]
    if (!slot || !VALID_SLOTS.includes(slot)) continue

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
      // Same enum-prefix story as class: the full-sim export uses "RaceDraenei"
      // where the addon uses "Draenei". Strip the prefix for clean display. (#172)
      race: typeof character.race === 'string' ? character.race.replace(/^Race/, '') : 'Unknown',
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
