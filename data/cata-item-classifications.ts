/**
 * Item Classifications for Cataclysm
 *
 * This mapping defines the classification (Reserved, Limited, or Unlimited) for each
 * loot item in Cataclysm raids. Items not listed default to Unlimited.
 *
 * Classifications:
 * - Reserved: Highly sought-after items with strict distribution rules (legendaries, mounts)
 * - Limited: Valuable items with controlled distribution (tier tokens)
 * - Unlimited: Standard loot items available to all eligible players
 */

export const CATA_ITEM_CLASSIFICATIONS: Record<string, 'Reserved' | 'Limited' | 'Unlimited'> = {
  // ============================================================================
  // MOUNTS - Always Reserved
  // ============================================================================
  'Reins of the Drake of the South Wind': 'Reserved',
  'Flametalon of Alysrazor': 'Reserved',
  'Smoldering Egg of Millagazor': 'Reserved',
  "Life-Binder's Handmaiden": 'Reserved',
  'Reins of the Blazing Drake': 'Reserved',

  // ============================================================================
  // TIER 11 TOKENS - Limited (Blackwing Descent, Bastion of Twilight, Throne of the Four Winds)
  // ============================================================================
  'Crown of the Forlorn Conqueror': 'Limited',
  'Crown of the Forlorn Protector': 'Limited',
  'Crown of the Forlorn Vanquisher': 'Limited',
  'Helm of the Forlorn Conqueror': 'Limited',
  'Helm of the Forlorn Protector': 'Limited',
  'Helm of the Forlorn Vanquisher': 'Limited',
  'Shoulders of the Forlorn Conqueror': 'Limited',
  'Shoulders of the Forlorn Protector': 'Limited',
  'Shoulders of the Forlorn Vanquisher': 'Limited',
  'Mantle of the Forlorn Conqueror': 'Limited',
  'Mantle of the Forlorn Protector': 'Limited',
  'Mantle of the Forlorn Vanquisher': 'Limited',
  'Chest of the Forlorn Conqueror': 'Limited',
  'Chest of the Forlorn Protector': 'Limited',
  'Chest of the Forlorn Vanquisher': 'Limited',
  'Gauntlets of the Forlorn Conqueror': 'Limited',
  'Gauntlets of the Forlorn Protector': 'Limited',
  'Gauntlets of the Forlorn Vanquisher': 'Limited',
  'Leggings of the Forlorn Conqueror': 'Limited',
  'Leggings of the Forlorn Protector': 'Limited',
  'Leggings of the Forlorn Vanquisher': 'Limited',

  // ============================================================================
  // TIER 12 TOKENS - Limited (Firelands)
  // ============================================================================
  'Crown of the Fiery Conqueror': 'Limited',
  'Crown of the Fiery Protector': 'Limited',
  'Crown of the Fiery Vanquisher': 'Limited',
  'Chest of the Fiery Conqueror': 'Limited',
  'Chest of the Fiery Protector': 'Limited',
  'Chest of the Fiery Vanquisher': 'Limited',
  'Gauntlets of the Fiery Conqueror': 'Limited',
  'Gauntlets of the Fiery Protector': 'Limited',
  'Gauntlets of the Fiery Vanquisher': 'Limited',
  'Leggings of the Fiery Conqueror': 'Limited',
  'Leggings of the Fiery Protector': 'Limited',
  'Leggings of the Fiery Vanquisher': 'Limited',
  'Shoulders of the Fiery Conqueror': 'Limited',
  'Shoulders of the Fiery Protector': 'Limited',
  'Shoulders of the Fiery Vanquisher': 'Limited',
  'Mantle of the Fiery Conqueror': 'Limited',
  'Mantle of the Fiery Protector': 'Limited',
  'Mantle of the Fiery Vanquisher': 'Limited',

  // ============================================================================
  // TIER 13 TOKENS - Limited (Dragon Soul)
  // ============================================================================
  'Crown of the Corrupted Conqueror': 'Limited',
  'Crown of the Corrupted Protector': 'Limited',
  'Crown of the Corrupted Vanquisher': 'Limited',
  'Crown of the Corrupted Conqueror (Heroic)': 'Limited',
  'Crown of the Corrupted Protector (Heroic)': 'Limited',
  'Crown of the Corrupted Vanquisher (Heroic)': 'Limited',
  'Chest of the Corrupted Conqueror': 'Limited',
  'Chest of the Corrupted Protector': 'Limited',
  'Chest of the Corrupted Vanquisher': 'Limited',
  'Chest of the Corrupted Conqueror (Heroic)': 'Limited',
  'Chest of the Corrupted Protector (Heroic)': 'Limited',
  'Chest of the Corrupted Vanquisher (Heroic)': 'Limited',
  'Gauntlets of the Corrupted Conqueror': 'Limited',
  'Gauntlets of the Corrupted Protector': 'Limited',
  'Gauntlets of the Corrupted Vanquisher': 'Limited',
  'Gauntlets of the Corrupted Conqueror (Heroic)': 'Limited',
  'Gauntlets of the Corrupted Protector (Heroic)': 'Limited',
  'Gauntlets of the Corrupted Vanquisher (Heroic)': 'Limited',
  'Leggings of the Corrupted Conqueror': 'Limited',
  'Leggings of the Corrupted Protector': 'Limited',
  'Leggings of the Corrupted Vanquisher': 'Limited',
  'Leggings of the Corrupted Conqueror (Heroic)': 'Limited',
  'Leggings of the Corrupted Protector (Heroic)': 'Limited',
  'Leggings of the Corrupted Vanquisher (Heroic)': 'Limited',
  'Shoulders of the Corrupted Conqueror': 'Limited',
  'Shoulders of the Corrupted Protector': 'Limited',
  'Shoulders of the Corrupted Vanquisher': 'Limited',
  'Shoulders of the Corrupted Conqueror (Heroic)': 'Limited',
  'Shoulders of the Corrupted Protector (Heroic)': 'Limited',
  'Shoulders of the Corrupted Vanquisher (Heroic)': 'Limited',
}
