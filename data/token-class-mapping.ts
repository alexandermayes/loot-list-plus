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
  // CLASSIC TIER 3 TOKENS (Naxxramas - Desecrated items) - GH-269
  // Verified against Wowhead: three class-restricted armor sets, 8 tokens each.
  // ============================================================================
  // Plate set (Warrior, Rogue)
  'Desecrated Breastplate': ['Warrior', 'Rogue'],
  'Desecrated Legplates': ['Warrior', 'Rogue'],
  'Desecrated Helmet': ['Warrior', 'Rogue'],
  'Desecrated Pauldrons': ['Warrior', 'Rogue'],
  'Desecrated Bracers': ['Warrior', 'Rogue'],
  'Desecrated Waistguard': ['Warrior', 'Rogue'],
  'Desecrated Gauntlets': ['Warrior', 'Rogue'],
  'Desecrated Sabatons': ['Warrior', 'Rogue'],

  // Mail set (Paladin, Hunter, Shaman, Druid)
  'Desecrated Tunic': ['Paladin', 'Hunter', 'Shaman', 'Druid'],
  'Desecrated Legguards': ['Paladin', 'Hunter', 'Shaman', 'Druid'],
  'Desecrated Headpiece': ['Paladin', 'Hunter', 'Shaman', 'Druid'],
  'Desecrated Spaulders': ['Paladin', 'Hunter', 'Shaman', 'Druid'],
  'Desecrated Wristguards': ['Paladin', 'Hunter', 'Shaman', 'Druid'],
  'Desecrated Girdle': ['Paladin', 'Hunter', 'Shaman', 'Druid'],
  'Desecrated Handguards': ['Paladin', 'Hunter', 'Shaman', 'Druid'],
  'Desecrated Boots': ['Paladin', 'Hunter', 'Shaman', 'Druid'],

  // Cloth set (Priest, Mage, Warlock)
  'Desecrated Robe': ['Priest', 'Mage', 'Warlock'],
  'Desecrated Leggings': ['Priest', 'Mage', 'Warlock'],
  'Desecrated Circlet': ['Priest', 'Mage', 'Warlock'],
  'Desecrated Shoulderpads': ['Priest', 'Mage', 'Warlock'],
  'Desecrated Bindings': ['Priest', 'Mage', 'Warlock'],
  'Desecrated Belt': ['Priest', 'Mage', 'Warlock'],
  'Desecrated Gloves': ['Priest', 'Mage', 'Warlock'],
  'Desecrated Sandals': ['Priest', 'Mage', 'Warlock'],

  // ============================================================================
  // CLASSIC AQ40 TOKENS (Temple of Ahn'Qiraj) - GH-273
  // Class lists come from the "Classes:" line each token carries in the
  // wow-classic-items package, cross-checked against AtlasLootClassic's
  // per-class reward table. data/__tests__/classic-catalog-completeness.test.ts
  // re-derives them from the package.
  // ============================================================================
  // Tier 2.5 helm tokens (Twin Emperors)
  'Vek\'lor\'s Diadem': ['Paladin', 'Hunter', 'Rogue', 'Shaman', 'Druid'],
  'Vek\'nilash\'s Circlet': ['Warrior', 'Priest', 'Mage', 'Warlock'],
  // Tier 2.5 leg tokens (Ouro)
  'Ouro\'s Intact Hide': ['Warrior', 'Rogue', 'Priest', 'Mage'],
  'Skin of the Great Sandworm': ['Paladin', 'Hunter', 'Shaman', 'Warlock', 'Druid'],
  // Tier 2.5 chest tokens (C'Thun)
  'Carapace of the Old God': ['Warrior', 'Paladin', 'Hunter', 'Rogue', 'Shaman'],
  'Husk of the Old God': ['Priest', 'Mage', 'Warlock', 'Druid'],
  // Tier 2.5 shoulder and boot tokens (Viscidus, Princess Huhuran)
  'Qiraji Bindings of Command': ['Warrior', 'Hunter', 'Rogue', 'Priest'],
  'Qiraji Bindings of Dominance': ['Paladin', 'Shaman', 'Mage', 'Warlock', 'Druid'],

  // Imperial Qiraji Armaments and Regalia carry no class restriction. Each is
  // turned in at a quest of the same name for one weapon, so eligibility is
  // every class proficient with at least one reward (per class-proficiencies.ts):
  // - Armaments: Blessed Qiraji War Axe (1H axe), Pugio (dagger), Bulwark
  //   (shield), Musket (gun). The dagger alone covers all but Paladin, who
  //   takes the axe or the shield.
  // - Regalia: Blessed Qiraji War Hammer (1H mace), Acolyte Staff and Augur
  //   Staff (staves). The mace covers Paladin and Rogue, the staves the rest.
  // Both therefore list every Classic class. The earlier lists (Armaments
  // W/Pa/H/R, Regalia Pr/Ma/Wl/Dr/Sh) hid the Pugio from five classes and the
  // War Hammer from Paladins and Rogues.
  'Imperial Qiraji Armaments': ['Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Shaman', 'Mage', 'Warlock', 'Druid'],
  'Imperial Qiraji Regalia': ['Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Shaman', 'Mage', 'Warlock', 'Druid'],

  // ============================================================================
  // CLASSIC ZUL'GURUB TOKENS (Primal Hakkari) - GH-273
  // Each is a Paragon of Power turned in for a class set piece. Class lists
  // from the package "Classes:" line, matching AtlasLootClassic.
  // ============================================================================
  'Primal Hakkari Bindings': ['Paladin', 'Hunter', 'Mage'],
  'Primal Hakkari Armsplint': ['Warrior', 'Rogue', 'Shaman'],
  'Primal Hakkari Stanchion': ['Priest', 'Warlock', 'Druid'],
  'Primal Hakkari Girdle': ['Warrior', 'Rogue', 'Shaman'],
  'Primal Hakkari Sash': ['Priest', 'Warlock', 'Druid'],
  'Primal Hakkari Shawl': ['Paladin', 'Hunter', 'Mage'],
  'Primal Hakkari Tabard': ['Paladin', 'Shaman', 'Druid'],
  'Primal Hakkari Kossack': ['Warrior', 'Mage', 'Warlock'],
  'Primal Hakkari Aegis': ['Hunter', 'Rogue', 'Priest'],

  // ============================================================================
  // CLASSIC ONYXIA'S LAIR - GH-273
  // Not a tier token, but a Hunter-only quest item (Rhok'delar). Its catalog
  // slot is 'Token' so this entry hides it from other classes in the picker
  // and the seeder gives it a Hunter class row. Class from the package
  // "Classes: Hunter" tooltip line.
  // ============================================================================
  'Mature Black Dragon Sinew': ['Hunter'],

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
  // Ulduar T8 tokens use the "Wayward" prefix in item names.
  'Wayward Conqueror': ['Paladin', 'Priest', 'Warlock'],
  'Wayward Protector': ['Hunter', 'Shaman', 'Warrior'],
  'Wayward Vanquisher': ['Death Knight', 'Druid', 'Mage', 'Rogue'],

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
