/**
 * Item Classifications for TBC (The Burning Crusade)
 *
 * This mapping defines the classification (Reserved, Limited, or Unlimited) for each
 * loot item in TBC raids. Items not listed default to Unlimited.
 *
 * Classifications:
 * - Reserved: Highly sought-after items with strict distribution rules (legendaries, BiS trinkets, top weapons)
 * - Limited: Valuable items with controlled distribution (tier tokens, strong off-pieces)
 * - Unlimited: Standard loot items available to all eligible players
 */

export const TBC_ITEM_CLASSIFICATIONS: Record<string, 'Reserved' | 'Limited' | 'Unlimited'> = {
  // ============================================================================
  // LEGENDARY ITEMS - Always Reserved
  // ============================================================================
  'Warglaive of Azzinoth (Main Hand)': 'Reserved',
  'Warglaive of Azzinoth (Off Hand)': 'Reserved',
  "Thori'dal, the Stars' Fury": 'Reserved',

  // ============================================================================
  // MOUNTS - Always Reserved
  // ============================================================================
  "Ashes of Al'ar": 'Reserved',
  'Amani War Bear': 'Reserved',
  "Fiery Warhorse's Reins": 'Reserved',

  // ============================================================================
  // BLACK TEMPLE - Reserved Items
  // ============================================================================
  // Illidan drops - top tier items
  'Bulwark of Azzinoth': 'Reserved',
  "Zhar'doom, Greatstaff of the Devourer": 'Reserved',
  "The Skull of Gul'dan": 'Reserved',
  'Black Bow of the Betrayer': 'Reserved',
  'Crystal Spire of Karabor': 'Reserved',
  'Cursed Vision of Sargeras': 'Reserved',
  'Memento of Tyrande': 'Reserved',
  'Stormrage Signet Ring': 'Reserved',
  'Shard of Azzinoth': 'Reserved',
  'Shroud of the Highborne': 'Reserved',
  'Faceplate of the Impenetrable': 'Reserved',
  'Cowl of the Illidari High Lord': 'Reserved',

  // Illidari Council
  'Madness of the Betrayer': 'Reserved',

  // Mother Shahraz
  'Leggings of Devastation': 'Reserved',

  // Reliquary of Souls
  'Pendant of Titans': 'Reserved',

  // Gurtogg Bloodboil
  'Staff of Immaculate Recovery': 'Reserved',

  // ============================================================================
  // SUNWELL PLATEAU - Reserved Items
  // ============================================================================
  // Kil'jaeden drops
  'Apolyon, the Soul-Render': 'Reserved',
  'Crown of Anasterian': 'Reserved',
  "Cowl of Gul'dan": 'Reserved',
  'Cover of Ursol the Wise': 'Reserved',
  'Coif of Alleria': 'Reserved',
  'Hand of the Deceiver': 'Reserved',
  'Crux of the Apocalypse': 'Reserved',
  'Duplicitous Guise': 'Reserved',
  'Helm of Burning Righteousness': 'Reserved',
  'Golden Staff of the Sin\'dorei': 'Reserved',
  'Hammer of Sanctification': 'Reserved',
  "Cowl of Light's Purity": 'Reserved',
  'Tattered Cape of Antonidas': 'Reserved',
  'Cloak of Unforgivable Sin': 'Reserved',

  // M'uru drops
  'Shifting Naaru Sliver': 'Reserved',
  "Commendation of Kael'thas": 'Reserved',
  'Shard of Contempt': 'Reserved',
  'Vial of the Sunwell': 'Reserved',
  'Harness of Carnal Instinct': 'Reserved',
  'Shadowed Gauntlets of Paroxysm': 'Reserved',

  // Eredar Twins
  'Golden Bow of Quel\'Thalas': 'Reserved',
  'Grip of Mannoroth': 'Reserved',
  'Sunflare': 'Reserved',

  // Felmyst
  "Grand Magister's Staff of Torrents": 'Reserved',
  "Sword Breaker's Bulwark": 'Reserved',

  // Brutallus
  'Reign of Misery': 'Reserved',

  // ============================================================================
  // TEMPEST KEEP - Reserved Items
  // ============================================================================
  // Kael'thas drops
  'Cosmic Infuser': 'Reserved',
  'Devastation': 'Reserved',
  'Infinity Blade': 'Reserved',
  'Warp Slicer': 'Reserved',
  'Phaseshift Bulwark': 'Reserved',
  'Staff of Disintegration': 'Reserved',
  'Netherstrand Longbow': 'Reserved',
  'Twinblade of the Phoenix': 'Reserved',
  'Rod of the Sun King': 'Reserved',

  // ============================================================================
  // HYJAL SUMMIT - Reserved Items
  // ============================================================================
  // Archimonde drops
  "Cataclysm's Edge": 'Reserved',
  'Tempest of Chaos': 'Reserved',
  'Apostle of Argus': 'Reserved',
  'Robes of Rhonin': 'Reserved',
  'Leggings of Eternity': 'Reserved',
  "Antonidas's Aegis of Rapt Concentration": 'Reserved',

  // ============================================================================
  // SERPENTSHRINE CAVERN - Reserved Items
  // ============================================================================
  // Lady Vashj
  'Serpent Spine Longbow': 'Reserved',
  'Lightfathom Scepter': 'Reserved',
  'Fang of Vashj': 'Reserved',
  'Vestments of the Sea-Witch': 'Reserved',
  'Glorious Gauntlets of Crestfall': 'Reserved',

  // Other SSC bosses
  'Tsunami Talisman': 'Reserved',
  'Sextant of Unstable Currents': 'Reserved',
  'Fang of the Leviathan': 'Reserved',
  'World Breaker': 'Reserved',

  // ============================================================================
  // GRUUL'S LAIR - Reserved Items
  // ============================================================================
  'Dragonspine Trophy': 'Reserved',
  'Axe of the Gronn Lords': 'Reserved',
  'Aldori Legacy Defender': 'Reserved',

  // ============================================================================
  // KARAZHAN - Reserved Items
  // ============================================================================
  'Gorehowl': 'Reserved',
  'Sunfury Bow of the Phoenix': 'Reserved',
  'The Lightning Capacitor': 'Reserved',
  'Pendant of the Violet Eye': 'Reserved',
  'Staff of Infinite Mysteries': 'Reserved',
  "Garona's Signet Ring": 'Reserved',
  'Shield of Impenetrable Darkness': 'Reserved',
  "King's Defender": 'Reserved',
  "Nathrezim Mindblade": 'Reserved',
  "Light's Justice": 'Reserved',
  'Nightstaff of the Everliving': 'Reserved',

  // ============================================================================
  // ZUL'AMAN - Reserved Items
  // ============================================================================
  "Jin'rohk, The Great Apocalypse": 'Reserved',
  'Hex Shrunken Head': 'Reserved',
  "Berserker's Call": 'Reserved',
  'Ancient Aqir Artifact': 'Reserved',
  'Tiny Voodoo Mask': 'Reserved',
  'Tome of Diabolic Remedy': 'Reserved',

  // ============================================================================
  // TIER 6 TOKENS - Limited
  // ============================================================================
  // Sunwell tokens
  'Bracers of the Forgotten Conqueror': 'Limited',
  'Bracers of the Forgotten Protector': 'Limited',
  'Bracers of the Forgotten Vanquisher': 'Limited',
  'Belt of the Forgotten Conqueror': 'Limited',
  'Belt of the Forgotten Protector': 'Limited',
  'Belt of the Forgotten Vanquisher': 'Limited',
  'Boots of the Forgotten Conqueror': 'Limited',
  'Boots of the Forgotten Protector': 'Limited',
  'Boots of the Forgotten Vanquisher': 'Limited',

  // Black Temple / Hyjal tokens
  'Gloves of the Forgotten Conqueror': 'Limited',
  'Gloves of the Forgotten Protector': 'Limited',
  'Gloves of the Forgotten Vanquisher': 'Limited',
  'Helm of the Forgotten Conqueror': 'Limited',
  'Helm of the Forgotten Protector': 'Limited',
  'Helm of the Forgotten Vanquisher': 'Limited',
  'Leggings of the Forgotten Conqueror': 'Limited',
  'Leggings of the Forgotten Protector': 'Limited',
  'Leggings of the Forgotten Vanquisher': 'Limited',
  'Chestguard of the Forgotten Conqueror': 'Limited',
  'Chestguard of the Forgotten Protector': 'Limited',
  'Chestguard of the Forgotten Vanquisher': 'Limited',
  'Pauldrons of the Forgotten Conqueror': 'Limited',
  'Pauldrons of the Forgotten Protector': 'Limited',
  'Pauldrons of the Forgotten Vanquisher': 'Limited',

  // ============================================================================
  // TIER 5 TOKENS - Limited
  // ============================================================================
  'Gloves of the Vanquished Hero': 'Limited',
  'Gloves of the Vanquished Champion': 'Limited',
  'Gloves of the Vanquished Defender': 'Limited',
  'Helm of the Vanquished Hero': 'Limited',
  'Helm of the Vanquished Champion': 'Limited',
  'Helm of the Vanquished Defender': 'Limited',
  'Leggings of the Vanquished Hero': 'Limited',
  'Leggings of the Vanquished Champion': 'Limited',
  'Leggings of the Vanquished Defender': 'Limited',
  'Chestguard of the Vanquished Hero': 'Limited',
  'Chestguard of the Vanquished Champion': 'Limited',
  'Chestguard of the Vanquished Defender': 'Limited',
  'Pauldrons of the Vanquished Hero': 'Limited',
  'Pauldrons of the Vanquished Champion': 'Limited',
  'Pauldrons of the Vanquished Defender': 'Limited',

  // ============================================================================
  // TIER 4 TOKENS - Limited
  // ============================================================================
  'Gloves of the Fallen Hero': 'Limited',
  'Gloves of the Fallen Champion': 'Limited',
  'Gloves of the Fallen Defender': 'Limited',
  'Helm of the Fallen Hero': 'Limited',
  'Helm of the Fallen Champion': 'Limited',
  'Helm of the Fallen Defender': 'Limited',
  'Leggings of the Fallen Hero': 'Limited',
  'Leggings of the Fallen Champion': 'Limited',
  'Leggings of the Fallen Defender': 'Limited',
  'Chestguard of the Fallen Hero': 'Limited',
  'Chestguard of the Fallen Champion': 'Limited',
  'Chestguard of the Fallen Defender': 'Limited',
  'Pauldrons of the Fallen Hero': 'Limited',
  'Pauldrons of the Fallen Champion': 'Limited',
  'Pauldrons of the Fallen Defender': 'Limited',

  // ============================================================================
  // BLACK TEMPLE - Limited Items
  // ============================================================================
  'Blade of Savagery': 'Limited',
  'Heartshatter Breastplate': 'Limited',
  'Shadowmaster\'s Boots': 'Limited',
  'Torch of the Damned': 'Limited',
  'Soul Cleaver': 'Limited',
  'The Brutalizer': 'Limited',
  'Legionkiller': 'Limited',
  'Nether Shadow Tunic': 'Limited',
  'Halberd of Desolation': 'Limited',

  // ============================================================================
  // SUNWELL PLATEAU - Limited Items
  // ============================================================================
  'Leggings of Calamity': 'Limited',
  'Felfury Legplates': 'Limited',
  'Leggings of the Immortal Night': 'Limited',
  'Shroud of Redeemed Souls': 'Limited',
  'Book of Highborne Hymns': 'Limited',
  "Sin'dorei Pendant of Conquest": 'Limited',
  "Sin'dorei Pendant of Salvation": 'Limited',
  "Sin'dorei Pendant of Triumph": 'Limited',
  "Sin'dorei Band of Dominance": 'Limited',
  "Sin'dorei Band of Salvation": 'Limited',
  "Sin'dorei Band of Triumph": 'Limited',

  // ============================================================================
  // HYJAL SUMMIT - Limited Items
  // ============================================================================
  'Legguards of Endless Rage': 'Limited',
  'Midnight Chestguard': 'Limited',
  "Savior's Grasp": 'Limited',
  'Mail of Fevered Pursuit': 'Limited',
  'Bristleblitz Striker': 'Limited',
  'Pillar of Ferocity': 'Limited',
  'Bastion of Light': 'Limited',

  // ============================================================================
  // SERPENTSHRINE CAVERN - Limited Items
  // ============================================================================
  'Krakken-Heart Breastplate': 'Limited',
  'Belt of One-Hundred Deaths': 'Limited',
  "Runetotem's Mantle": 'Limited',
  'Prism of Inner Calm': 'Limited',
  "Fathom-Brooch of the Tidewalker": 'Limited',
  'Earring of Soulful Meditation': 'Limited',
  'Living Root of the Wildheart': 'Limited',
  'Scarab of Displacement': 'Limited',

  // ============================================================================
  // TEMPEST KEEP - Limited Items
  // ============================================================================
  'Warp-Spring Coil': 'Limited',
  "Fel Reaver's Piston": 'Limited',
  'Tome of Fiery Redemption': 'Limited',
  "Talon of Al'ar": 'Limited',
  'Talon of the Phoenix': 'Limited',
  "Solarian's Sapphire": 'Limited',
  'Void Star Talisman': 'Limited',
  'Ethereum Life-Staff': 'Limited',

  // ============================================================================
  // GRUUL'S LAIR - Limited Items
  // ============================================================================
  'Eye of Gruul': 'Limited',
  'Bloodmaw Magus-Blade': 'Limited',
  "Collar of Cho'gall": 'Limited',
  "Cowl of Nature's Breath": 'Limited',
  'Hammer of the Naaru': 'Limited',
  'Teeth of Gruul': 'Limited',

  // ============================================================================
  // MAGTHERIDON'S LAIR - Limited Items
  // ============================================================================
  'Eye of Magtheridon': 'Limited',
  'Crystalheart Pulse-Staff': 'Limited',
  'Glaive of the Pit': 'Limited',
  'Aegis of the Vindicator': 'Limited',

  // ============================================================================
  // KARAZHAN - Limited Items
  // ============================================================================
  "Romulo's Poison Vial": 'Limited',
  "Moroes' Lucky Pocket Watch": 'Limited',
  'Wolfslayer Sniper Rifle': 'Limited',
  'Legacy': 'Limited',
  'Despair': 'Limited',
  'The Decapitator': 'Limited',
  'Malchazeen': 'Limited',
  "Terestian's Stranglestaff": 'Limited',
  'Dragonheart Flameshield': 'Limited',
  'Triptych Shield of the Ancients': 'Limited',
  'Ruby Drape of the Mysticant': 'Limited',
  'Stainless Cloak of the Pure Hearted': 'Limited',
  'Formula: Enchant Weapon - Mongoose': 'Limited',

  // ============================================================================
  // ZUL'AMAN - Limited Items
  // ============================================================================
  'Ancient Amani Longbow': 'Limited',
  'Staff of Primal Fury': 'Limited',
  'Cleaver of the Unforgiving': 'Limited',
  "Hauberk of the Empire's Champion": 'Limited',
  'Chestguard of the Warlord': 'Limited',
  'Mana Attuned Band': 'Limited',
  'Signet of Primal Wrath': 'Limited',
  'Band of the Ranger-General': 'Limited',
  'Ring of Flowing Light': 'Limited',
  'Formula: Enchant Weapon - Executioner': 'Limited',
}
