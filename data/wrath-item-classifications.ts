/**
 * Item Classifications for WotLK (Wrath of the Lich King)
 *
 * This mapping defines the classification (Reserved, Limited, or Unlimited) for each
 * loot item in WotLK raids. Items not listed default to Unlimited.
 *
 * Classifications:
 * - Reserved: Highly sought-after items with strict distribution rules (legendaries, mounts, BiS trinkets)
 * - Limited: Valuable items with controlled distribution (tier tokens, strong weapons, coveted off-pieces)
 * - Unlimited: Standard loot items available to all eligible players
 */

export const WOTLK_ITEM_CLASSIFICATIONS: Record<string, 'Reserved' | 'Limited' | 'Unlimited'> = {
  // ============================================================================
  // LEGENDARY ITEMS - Always Reserved
  // ============================================================================
  "Fragment of Val'anyr": 'Reserved',
  "Val'anyr, Hammer of Ancient Kings": 'Reserved',
  'Shadowfrost Shard': 'Reserved',
  'Shadowmourne': 'Reserved',

  // ============================================================================
  // MOUNTS - Always Reserved
  // ============================================================================
  "Reins of the Blue Drake": 'Reserved',
  "Reins of the Azure Drake": 'Reserved',
  "Reins of the Grand Black War Mammoth": 'Reserved',
  "Reins of the Twilight Drake": 'Reserved',
  "Reins of the Black Drake": 'Reserved',
  "Mimiron's Head": 'Reserved',
  "Invincible's Reins": 'Reserved',

  // ============================================================================
  // ICECROWN CITADEL - Reserved Items
  // ============================================================================
  // The Lich King drops
  "Archus, Greatstaff of Antonidas": 'Reserved',
  "Havoc's Call, Blade of Lordaeron Kings": 'Reserved',
  "Heaven's Fall, Kryss of a Thousand Lies": 'Reserved',
  "Mithrios, Bronzebeard's Legacy": 'Reserved',
  "Oathbinder, Charge of the Ranger-General": 'Reserved',
  "Pugius, Fist of Defiance": 'Reserved',
  "Tainted Twig of Nordrassil": 'Reserved',
  "Troggbane, Axe of the Frostborne King": 'Reserved',
  "Windrunner's Heartseeker": 'Reserved',
  "Royal Scepter of Terenas II": 'Reserved',
  "Fal'inrush, Defender of Quel'thalas": 'Reserved',

  // Sindragosa
  "Sundial of Eternal Dusk": 'Reserved',

  // Professor Putricide
  "Unidentifiable Organ": 'Reserved',
  "Last Word": 'Reserved',

  // Blood-Queen Lana'thel
  "Bloodfall": 'Reserved',

  // Deathbringer Saurfang
  "Deathbringer's Will": 'Reserved',

  // ============================================================================
  // ULDUAR - Reserved Items
  // ============================================================================
  // Algalon
  "Reply-Code Alpha": 'Reserved',
  "Starshard Edge": 'Reserved',

  // Yogg-Saron
  "Pulse Baton": 'Reserved',
  "Hammer of Crushing Whispers": 'Reserved',

  // General Vezax
  "Tortured Earth": 'Reserved',

  // ============================================================================
  // TRIAL OF THE CRUSADER - Reserved Items
  // ============================================================================
  // Anub'arak
  "Death's Verdict": 'Reserved',
  "Death's Choice": 'Reserved',
  "Reign of the Dead": 'Reserved',
  "Reign of the Unliving": 'Reserved',

  // ============================================================================
  // NAXXRAMAS - Reserved Items
  // ============================================================================
  // Kel'Thuzad
  "Calamity's Grasp": 'Reserved',
  'The Turning Tide': 'Reserved',

  // Sapphiron
  'Sapphiron\'s Left Eye': 'Reserved',
  'Sapphiron\'s Right Eye': 'Reserved',

  // ============================================================================
  // TIER TOKENS - All Limited
  // ============================================================================
  // T7 Tokens (Naxxramas 25 / OS / EoE)
  'Crown of the Lost Conqueror': 'Limited',
  'Crown of the Lost Protector': 'Limited',
  'Crown of the Lost Vanquisher': 'Limited',
  'Breastplate of the Lost Conqueror': 'Limited',
  'Breastplate of the Lost Protector': 'Limited',
  'Breastplate of the Lost Vanquisher': 'Limited',
  'Gauntlets of the Lost Conqueror': 'Limited',
  'Gauntlets of the Lost Protector': 'Limited',
  'Gauntlets of the Lost Vanquisher': 'Limited',
  'Leggings of the Lost Conqueror': 'Limited',
  'Leggings of the Lost Protector': 'Limited',
  'Leggings of the Lost Vanquisher': 'Limited',
  'Mantle of the Lost Conqueror': 'Limited',
  'Mantle of the Lost Protector': 'Limited',
  'Mantle of the Lost Vanquisher': 'Limited',

  // Valorous variants (also T7 25-man in some listings)
  'Crown of the Wayward Conqueror': 'Limited',
  'Crown of the Wayward Protector': 'Limited',
  'Crown of the Wayward Vanquisher': 'Limited',

  // T8 Tokens (Ulduar)
  'Crown of the Conqueror': 'Limited',
  'Crown of the Protector': 'Limited',
  'Crown of the Vanquisher': 'Limited',
  'Breastplate of the Conqueror': 'Limited',
  'Breastplate of the Protector': 'Limited',
  'Breastplate of the Vanquisher': 'Limited',
  'Gauntlets of the Conqueror': 'Limited',
  'Gauntlets of the Protector': 'Limited',
  'Gauntlets of the Vanquisher': 'Limited',
  'Leggings of the Conqueror': 'Limited',
  'Leggings of the Protector': 'Limited',
  'Leggings of the Vanquisher': 'Limited',
  'Mantle of the Conqueror': 'Limited',
  'Mantle of the Protector': 'Limited',
  'Mantle of the Vanquisher': 'Limited',

  // T9 Tokens (Trial of the Crusader)
  'Trophy of the Crusade': 'Limited',
  'Regalia of the Grand Conqueror': 'Limited',
  'Regalia of the Grand Protector': 'Limited',
  'Regalia of the Grand Vanquisher': 'Limited',

  // T10 Tokens (Icecrown Citadel)
  "Conqueror's Mark of Sanctification": 'Limited',
  "Protector's Mark of Sanctification": 'Limited',
  "Vanquisher's Mark of Sanctification": 'Limited',
  "Conqueror's Mark of Sanctification (Heroic)": 'Limited',
  "Protector's Mark of Sanctification (Heroic)": 'Limited',
  "Vanquisher's Mark of Sanctification (Heroic)": 'Limited',
}
