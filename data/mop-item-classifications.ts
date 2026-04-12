/**
 * Item Classifications for Mists of Pandaria
 *
 * This mapping defines the classification (Reserved, Limited, or Unlimited) for each
 * loot item in MoP raids. Items not listed default to Unlimited.
 *
 * Classifications:
 * - Reserved: Highly sought-after items with strict distribution rules (legendaries, mounts)
 * - Limited: Valuable items with controlled distribution (tier tokens)
 * - Unlimited: Standard loot items available to all eligible players
 */

export const MOP_ITEM_CLASSIFICATIONS: Record<string, 'Reserved' | 'Limited' | 'Unlimited'> = {
  // ============================================================================
  // MOUNTS - Always Reserved
  // ============================================================================
  'Clutch of Ji-Kun': 'Reserved',

  // ============================================================================
  // TIER 14 TOKENS - Limited (Mogu'shan Vaults, Heart of Fear, Terrace of Endless Spring)
  // ============================================================================
  'Helm of the Shadowy Conqueror': 'Limited',
  'Helm of the Shadowy Protector': 'Limited',
  'Helm of the Shadowy Vanquisher': 'Limited',
  'Helm of the Shadowy Conqueror (Heroic)': 'Limited',
  'Helm of the Shadowy Protector (Heroic)': 'Limited',
  'Helm of the Shadowy Vanquisher (Heroic)': 'Limited',
  'Shoulders of the Shadowy Conqueror': 'Limited',
  'Shoulders of the Shadowy Protector': 'Limited',
  'Shoulders of the Shadowy Vanquisher': 'Limited',
  'Shoulders of the Shadowy Conqueror (Heroic)': 'Limited',
  'Shoulders of the Shadowy Protector (Heroic)': 'Limited',
  'Shoulders of the Shadowy Vanquisher (Heroic)': 'Limited',
  'Chest of the Shadowy Conqueror': 'Limited',
  'Chest of the Shadowy Protector': 'Limited',
  'Chest of the Shadowy Vanquisher': 'Limited',
  'Chest of the Shadowy Conqueror (Heroic)': 'Limited',
  'Chest of the Shadowy Protector (Heroic)': 'Limited',
  'Chest of the Shadowy Vanquisher (Heroic)': 'Limited',
  'Gauntlets of the Shadowy Conqueror': 'Limited',
  'Gauntlets of the Shadowy Protector': 'Limited',
  'Gauntlets of the Shadowy Vanquisher': 'Limited',
  'Gauntlets of the Shadowy Conqueror (Heroic)': 'Limited',
  'Gauntlets of the Shadowy Protector (Heroic)': 'Limited',
  'Gauntlets of the Shadowy Vanquisher (Heroic)': 'Limited',
  'Leggings of the Shadowy Conqueror': 'Limited',
  'Leggings of the Shadowy Protector': 'Limited',
  'Leggings of the Shadowy Vanquisher': 'Limited',
  'Leggings of the Shadowy Conqueror (Heroic)': 'Limited',
  'Leggings of the Shadowy Protector (Heroic)': 'Limited',
  'Leggings of the Shadowy Vanquisher (Heroic)': 'Limited',

  // ============================================================================
  // TIER 15 TOKENS - Limited (Throne of Thunder)
  // ============================================================================
  'Helm of the Crackling Conqueror': 'Limited',
  'Helm of the Crackling Protector': 'Limited',
  'Helm of the Crackling Vanquisher': 'Limited',
  'Helm of the Crackling Conqueror (Heroic)': 'Limited',
  'Helm of the Crackling Protector (Heroic)': 'Limited',
  'Helm of the Crackling Vanquisher (Heroic)': 'Limited',
  'Shoulders of the Crackling Conqueror': 'Limited',
  'Shoulders of the Crackling Protector': 'Limited',
  'Shoulders of the Crackling Vanquisher': 'Limited',
  'Shoulders of the Crackling Conqueror (Heroic)': 'Limited',
  'Shoulders of the Crackling Protector (Heroic)': 'Limited',
  'Shoulders of the Crackling Vanquisher (Heroic)': 'Limited',
  'Chest of the Crackling Conqueror': 'Limited',
  'Chest of the Crackling Protector': 'Limited',
  'Chest of the Crackling Vanquisher': 'Limited',
  'Chest of the Crackling Conqueror (Heroic)': 'Limited',
  'Chest of the Crackling Protector (Heroic)': 'Limited',
  'Chest of the Crackling Vanquisher (Heroic)': 'Limited',
  'Gauntlets of the Crackling Conqueror': 'Limited',
  'Gauntlets of the Crackling Protector': 'Limited',
  'Gauntlets of the Crackling Vanquisher': 'Limited',
  'Gauntlets of the Crackling Conqueror (Heroic)': 'Limited',
  'Gauntlets of the Crackling Protector (Heroic)': 'Limited',
  'Gauntlets of the Crackling Vanquisher (Heroic)': 'Limited',
  'Leggings of the Crackling Conqueror': 'Limited',
  'Leggings of the Crackling Protector': 'Limited',
  'Leggings of the Crackling Vanquisher': 'Limited',
  'Leggings of the Crackling Conqueror (Heroic)': 'Limited',
  'Leggings of the Crackling Protector (Heroic)': 'Limited',
  'Leggings of the Crackling Vanquisher (Heroic)': 'Limited',

  // ============================================================================
  // TIER 16 TOKENS - Limited (Siege of Orgrimmar)
  // ============================================================================
  'Helm of the Cursed Conqueror': 'Limited',
  'Helm of the Cursed Protector': 'Limited',
  'Helm of the Cursed Vanquisher': 'Limited',
  'Shoulders of the Cursed Conqueror': 'Limited',
  'Shoulders of the Cursed Protector': 'Limited',
  'Shoulders of the Cursed Vanquisher': 'Limited',
  'Chest of the Cursed Conqueror': 'Limited',
  'Chest of the Cursed Protector': 'Limited',
  'Chest of the Cursed Vanquisher': 'Limited',
  'Gauntlets of the Cursed Conqueror': 'Limited',
  'Gauntlets of the Cursed Protector': 'Limited',
  'Gauntlets of the Cursed Vanquisher': 'Limited',
  'Leggings of the Cursed Conqueror': 'Limited',
  'Leggings of the Cursed Protector': 'Limited',
  'Leggings of the Cursed Vanquisher': 'Limited',
  'Essence of the Cursed Conqueror': 'Limited',
  'Essence of the Cursed Protector': 'Limited',
  'Essence of the Cursed Vanquisher': 'Limited',
}
