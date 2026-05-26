/**
 * Token Class Mappings for WoW Classic / TBC / WotLK
 *
 * Tier tokens are class-restricted - only certain classes can use each token type.
 * This mapping defines which classes can use each token category.
 *
 * Used for:
 * - Validating token assignments
 * - Seeding loot_item_classes entries for new tokens
 * - Filtering tokens in the UI
 */

import type { WowClassName } from './class-proficiencies'

/**
 * Token type to class mapping
 * Key: Token suffix/identifier (from item name)
 * Value: Array of classes that can use tokens of this type
 */
export const TOKEN_CLASS_MAPPING: Record<string, WowClassName[]> = {
  // ============================================================================
  // TBC TIER 4 TOKENS (Karazhan, Gruul's Lair, Magtheridon's Lair)
  // ============================================================================
  'Fallen Hero': ['Hunter', 'Mage', 'Warlock'],
  'Fallen Champion': ['Paladin', 'Rogue', 'Shaman'],
  'Fallen Defender': ['Warrior', 'Priest', 'Druid'],

  // ============================================================================
  // TBC TIER 5 TOKENS (Serpentshrine Cavern, Tempest Keep)
  // ============================================================================
  'Vanquished Hero': ['Hunter', 'Mage', 'Warlock'],
  'Vanquished Champion': ['Paladin', 'Rogue', 'Shaman'],
  'Vanquished Defender': ['Warrior', 'Priest', 'Druid'],

  // ============================================================================
  // TBC TIER 6 TOKENS (Black Temple, Mount Hyjal, Sunwell Plateau)
  // ============================================================================
  'Forgotten Conqueror': ['Paladin', 'Priest', 'Warlock'],
  'Forgotten Protector': ['Hunter', 'Shaman', 'Warrior'],
  'Forgotten Vanquisher': ['Mage', 'Druid', 'Rogue'],

  // ============================================================================
  // CLASSIC TIER 3 TOKENS (Naxxramas - Desecrated items)
  // Each token type maps to specific classes
  // ============================================================================
  // Desecrated Breastplate/Pauldrons/etc - Warrior
  'Desecrated Breastplate': ['Warrior'],
  'Desecrated Pauldrons': ['Warrior'],
  'Desecrated Helmet': ['Warrior'],
  'Desecrated Gauntlets': ['Warrior'],
  'Desecrated Legplates': ['Warrior'],
  'Desecrated Waistguard': ['Warrior'],
  'Desecrated Wristguards': ['Warrior'],
  'Desecrated Sabatons': ['Warrior'],

  // Desecrated Legguards - Hunter/Shaman (mail T3 leg piece)
  'Desecrated Legguards': ['Hunter', 'Shaman'],

  // Desecrated Tunic/Spaulders/etc - Rogue
  'Desecrated Tunic': ['Rogue'],
  'Desecrated Spaulders': ['Rogue'],
  'Desecrated Headpiece': ['Rogue'],
  'Desecrated Handguards': ['Rogue'],
  'Desecrated Leggings': ['Rogue'],
  'Desecrated Belt': ['Rogue'],
  'Desecrated Bracers': ['Rogue'],
  'Desecrated Boots': ['Rogue'],

  // Desecrated Robe/Mantle/etc - Priest, Mage, Warlock
  'Desecrated Robe': ['Priest', 'Mage', 'Warlock'],
  'Desecrated Mantle': ['Priest', 'Mage', 'Warlock'],
  'Desecrated Circlet': ['Priest', 'Mage', 'Warlock'],
  'Desecrated Gloves': ['Priest', 'Mage', 'Warlock'],
  'Desecrated Pants': ['Priest', 'Mage', 'Warlock'],
  'Desecrated Bindings': ['Priest', 'Mage', 'Warlock'],
  'Desecrated Sandals': ['Priest', 'Mage', 'Warlock'],
  'Desecrated Girdle': ['Priest', 'Mage', 'Warlock'],

  // ============================================================================
  // CLASSIC AQ40 TOKENS (Temple of Ahn'Qiraj)
  // ============================================================================
  // Imperial Qiraji items - various class restrictions
  'Imperial Qiraji Armaments': ['Warrior', 'Paladin', 'Hunter', 'Rogue'],
  'Imperial Qiraji Regalia': ['Priest', 'Mage', 'Warlock', 'Druid', 'Shaman'],

  // ============================================================================
  // WOTLK TIER 7 TOKENS (Naxxramas, Obsidian Sanctum, Eye of Eternity)
  // ============================================================================
  // 10-man tokens use "Lost" prefix, 25-man tokens use "Valorous" prefix.
  // "Heroic" tokens are an additional T7 25-man variant.
  // Death Knights roll on Vanquisher tokens across all Wrath tiers.
  'Lost Conqueror': ['Paladin', 'Priest', 'Warlock'],
  'Lost Protector': ['Hunter', 'Shaman', 'Warrior'],
  'Lost Vanquisher': ['Death Knight', 'Druid', 'Mage', 'Rogue'],
  'Heroic Conqueror': ['Paladin', 'Priest', 'Warlock'],
  'Heroic Protector': ['Hunter', 'Shaman', 'Warrior'],
  'Heroic Vanquisher': ['Death Knight', 'Druid', 'Mage', 'Rogue'],
  'Valorous Conqueror': ['Paladin', 'Priest', 'Warlock'],
  'Valorous Protector': ['Hunter', 'Shaman', 'Warrior'],
  'Valorous Vanquisher': ['Death Knight', 'Druid', 'Mage', 'Rogue'],

  // ============================================================================
  // WOTLK TIER 8 TOKENS (Ulduar)
  // ============================================================================
  'Conqueror of Ulduar': ['Paladin', 'Priest', 'Warlock'],
  'Protector of Ulduar': ['Hunter', 'Shaman', 'Warrior'],
  'Vanquisher of Ulduar': ['Death Knight', 'Druid', 'Mage', 'Rogue'],

  // ============================================================================
  // WOTLK TIER 9 TOKENS (Trial of the Crusader)
  // ============================================================================
  'Regalia of the Grand Conqueror': ['Paladin', 'Priest', 'Warlock'],
  'Regalia of the Grand Protector': ['Hunter', 'Shaman', 'Warrior'],
  'Regalia of the Grand Vanquisher': ['Death Knight', 'Druid', 'Mage', 'Rogue'],
  'Trophy of the Crusade': ['Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Shaman', 'Mage', 'Warlock', 'Druid', 'Death Knight'],

  // ============================================================================
  // WOTLK TIER 10 TOKENS (Icecrown Citadel)
  // ============================================================================
  'Conqueror\'s Mark of Sanctification': ['Paladin', 'Priest', 'Warlock'],
  'Protector\'s Mark of Sanctification': ['Hunter', 'Shaman', 'Warrior'],
  'Vanquisher\'s Mark of Sanctification': ['Death Knight', 'Druid', 'Mage', 'Rogue'],

  // ============================================================================
  // CATA TIER 11 TOKENS (Blackwing Descent, Bastion of Twilight, Throne of the Four Winds)
  // ============================================================================
  'of the Forlorn Conqueror': ['Paladin', 'Priest', 'Warlock'],
  'of the Forlorn Protector': ['Hunter', 'Shaman', 'Warrior'],
  'of the Forlorn Vanquisher': ['Death Knight', 'Mage', 'Druid', 'Rogue'],

  // ============================================================================
  // CATA TIER 12 TOKENS (Firelands)
  // ============================================================================
  'of the Fiery Conqueror': ['Paladin', 'Priest', 'Warlock'],
  'of the Fiery Protector': ['Hunter', 'Shaman', 'Warrior'],
  'of the Fiery Vanquisher': ['Death Knight', 'Mage', 'Druid', 'Rogue'],

  // ============================================================================
  // CATA TIER 13 TOKENS (Dragon Soul)
  // ============================================================================
  'of the Corrupted Conqueror': ['Paladin', 'Priest', 'Warlock'],
  'of the Corrupted Protector': ['Hunter', 'Shaman', 'Warrior'],
  'of the Corrupted Vanquisher': ['Death Knight', 'Mage', 'Druid', 'Rogue'],

  // ============================================================================
  // MOP TIER 14 TOKENS (Mogu'shan Vaults, Heart of Fear, Terrace of Endless Spring)
  // ============================================================================
  'of the Shadowy Conqueror': ['Paladin', 'Priest', 'Warlock'],
  'of the Shadowy Protector': ['Hunter', 'Monk', 'Shaman', 'Warrior'],
  'of the Shadowy Vanquisher': ['Death Knight', 'Mage', 'Druid', 'Rogue'],

  // ============================================================================
  // MOP TIER 15 TOKENS (Throne of Thunder)
  // ============================================================================
  'of the Crackling Conqueror': ['Paladin', 'Priest', 'Warlock'],
  'of the Crackling Protector': ['Hunter', 'Monk', 'Shaman', 'Warrior'],
  'of the Crackling Vanquisher': ['Death Knight', 'Mage', 'Druid', 'Rogue'],

  // ============================================================================
  // MOP TIER 16 TOKENS (Siege of Orgrimmar)
  // ============================================================================
  'of the Cursed Conqueror': ['Paladin', 'Priest', 'Warlock'],
  'of the Cursed Protector': ['Hunter', 'Monk', 'Shaman', 'Warrior'],
  'of the Cursed Vanquisher': ['Death Knight', 'Mage', 'Druid', 'Rogue'],
}

/**
 * Get classes that can use a token based on its name
 * Searches for token type keywords in the item name
 */
export function getTokenClasses(tokenName: string): WowClassName[] | undefined {
  // Check each token type against the item name
  for (const [tokenType, classes] of Object.entries(TOKEN_CLASS_MAPPING)) {
    if (tokenName.includes(tokenType)) {
      return classes
    }
  }
  return undefined
}

/**
 * Check if a class can use a specific token
 */
export function canClassUseToken(tokenName: string, className: WowClassName): boolean {
  const allowedClasses = getTokenClasses(tokenName)
  if (!allowedClasses) {
    // Unknown token type - allow all classes (safe default)
    return true
  }
  return allowedClasses.includes(className)
}

/**
 * Token slot identifiers used in the database
 */
export const TOKEN_SLOTS = ['Token'] as const

/**
 * Check if an item slot is a token slot
 */
export function isTokenSlot(slot: string): boolean {
  return TOKEN_SLOTS.includes(slot as typeof TOKEN_SLOTS[number])
}
