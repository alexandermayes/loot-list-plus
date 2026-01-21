/**
 * Item Classifications for TBC (The Burning Crusade)
 *
 * This mapping defines the classification (Reserved, Limited, or Unlimited) for each
 * loot item in TBC raids. Items not listed default to Unlimited.
 *
 * Classifications:
 * - Reserved: Highly sought-after items with strict distribution rules
 * - Limited: Valuable items with controlled distribution
 * - Unlimited: Standard loot items available to all eligible players
 *
 * TODO: Populate this file with actual TBC item classifications based on your guild's loot rules
 */

export const TBC_ITEM_CLASSIFICATIONS: Record<string, 'Reserved' | 'Limited' | 'Unlimited'> = {
  // Example Reserved items (these should be updated based on actual guild policy)
  // 'Warglaives of Azzinoth': 'Reserved',
  // 'Ashes of Al\'ar': 'Reserved',
  // 'Thori\'dal, the Stars\' Fury': 'Reserved',

  // Example Limited items
  // Add your limited items here

  // All other items will default to Unlimited
  // You can explicitly set items to Unlimited if desired, but it's not necessary
}
