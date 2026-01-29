/**
 * Item Role Mappings for TBC (The Burning Crusade)
 *
 * This mapping defines which roles (tank/healer/physical/caster) can use each item.
 * Items not listed default to an empty array (available to all specs).
 *
 * Roles:
 * - tank: Protection Warriors, Protection Paladins, Feral Druids (bear)
 * - healer: Holy/Disc Priests, Restoration Druids, Restoration Shamans, Holy Paladins
 * - physical: Rogues, Hunters, Warriors (DPS), Enhancement Shamans, Feral Druids (cat), Ret Paladins
 * - caster: Mages, Warlocks, Shadow Priests, Elemental Shamans, Balance Druids
 */

export const TBC_ITEM_ROLES: Record<string, ('tank' | 'healer' | 'physical' | 'caster')[]> = {
  // ============================================================================
  // LEGENDARY ITEMS
  // ============================================================================
  'Warglaive of Azzinoth (Main Hand)': ['physical'],
  'Warglaive of Azzinoth (Off Hand)': ['physical'],
  "Thori'dal, the Stars' Fury": ['physical'],

  // ============================================================================
  // MOUNTS (no role restriction - available to all)
  // ============================================================================
  // Mounts intentionally have no role restriction

  // ============================================================================
  // BLACK TEMPLE - Illidan
  // ============================================================================
  'Bulwark of Azzinoth': ['tank'],
  "Zhar'doom, Greatstaff of the Devourer": ['caster'],
  "The Skull of Gul'dan": ['caster'],
  'Black Bow of the Betrayer': ['physical'],
  'Crystal Spire of Karabor': ['healer'],
  'Cursed Vision of Sargeras': ['physical'],
  'Memento of Tyrande': ['healer'],
  'Stormrage Signet Ring': ['caster', 'healer'],
  'Shard of Azzinoth': ['physical'],
  'Shroud of the Highborne': ['healer'],
  'Faceplate of the Impenetrable': ['tank'],
  'Cowl of the Illidari High Lord': ['caster'],

  // ============================================================================
  // BLACK TEMPLE - Other Bosses
  // ============================================================================
  // Illidari Council
  'Madness of the Betrayer': ['physical'],

  // Mother Shahraz
  'Leggings of Devastation': ['caster'],

  // Reliquary of Souls
  'Pendant of Titans': ['tank'],

  // Gurtogg Bloodboil
  'Staff of Immaculate Recovery': ['healer'],

  // Other Black Temple
  'Blade of Savagery': ['physical'],
  'Heartshatter Breastplate': ['physical'],
  "Shadowmaster's Boots": ['physical'],
  'Torch of the Damned': ['physical'],
  'Soul Cleaver': ['physical'],
  'The Brutalizer': ['physical'],
  'Legionkiller': ['physical'],
  'Nether Shadow Tunic': ['physical'],
  'Halberd of Desolation': ['physical'],

  // ============================================================================
  // SUNWELL PLATEAU - Kil'jaeden
  // ============================================================================
  'Apolyon, the Soul-Render': ['physical'],
  'Crown of Anasterian': ['caster'],
  "Cowl of Gul'dan": ['caster'],
  'Cover of Ursol the Wise': ['healer'],
  'Coif of Alleria': ['physical'],
  'Hand of the Deceiver': ['caster'],
  'Crux of the Apocalypse': ['physical'],
  'Duplicitous Guise': ['physical'],
  'Helm of Burning Righteousness': ['tank'],
  "Golden Staff of the Sin'dorei": ['healer'],
  'Hammer of Sanctification': ['healer'],
  "Cowl of Light's Purity": ['healer'],
  'Tattered Cape of Antonidas': ['caster'],
  'Cloak of Unforgivable Sin': ['physical'],

  // ============================================================================
  // SUNWELL PLATEAU - M'uru
  // ============================================================================
  'Shifting Naaru Sliver': ['caster', 'healer'],
  "Commendation of Kael'thas": ['tank'],
  'Shard of Contempt': ['physical'],
  'Vial of the Sunwell': ['healer'],
  'Harness of Carnal Instinct': ['physical'],
  'Shadowed Gauntlets of Paroxysm': ['physical'],

  // ============================================================================
  // SUNWELL PLATEAU - Eredar Twins
  // ============================================================================
  "Golden Bow of Quel'Thalas": ['physical'],
  'Grip of Mannoroth': ['tank'],
  'Sunflare': ['caster', 'healer'],

  // ============================================================================
  // SUNWELL PLATEAU - Felmyst
  // ============================================================================
  "Grand Magister's Staff of Torrents": ['caster'],
  "Sword Breaker's Bulwark": ['tank'],

  // ============================================================================
  // SUNWELL PLATEAU - Brutallus
  // ============================================================================
  'Reign of Misery': ['caster'],

  // ============================================================================
  // SUNWELL PLATEAU - Limited Items
  // ============================================================================
  'Leggings of Calamity': ['caster'],
  'Felfury Legplates': ['physical'],
  'Leggings of the Immortal Night': ['physical'],
  'Shroud of Redeemed Souls': ['healer'],
  'Book of Highborne Hymns': ['healer'],
  "Sin'dorei Pendant of Conquest": ['physical'],
  "Sin'dorei Pendant of Salvation": ['healer'],
  "Sin'dorei Pendant of Triumph": ['caster'],
  "Sin'dorei Band of Dominance": ['caster'],
  "Sin'dorei Band of Salvation": ['healer'],
  "Sin'dorei Band of Triumph": ['physical'],

  // ============================================================================
  // TEMPEST KEEP - Kael'thas
  // ============================================================================
  'Cosmic Infuser': ['healer'],
  'Devastation': ['physical'],
  'Infinity Blade': ['physical'],
  'Warp Slicer': ['physical'],
  'Phaseshift Bulwark': ['tank'],
  'Staff of Disintegration': ['caster'],
  'Netherstrand Longbow': ['physical'],
  'Twinblade of the Phoenix': ['physical'],
  'Rod of the Sun King': ['healer', 'caster'],

  // ============================================================================
  // TEMPEST KEEP - Limited Items
  // ============================================================================
  'Warp-Spring Coil': ['physical'],
  "Fel Reaver's Piston": ['physical'],
  'Tome of Fiery Redemption': ['healer'],
  "Talon of Al'ar": ['caster'],
  'Talon of the Phoenix': ['physical'],
  "Solarian's Sapphire": ['caster'],
  'Void Star Talisman': ['caster'],
  'Ethereum Life-Staff': ['healer'],

  // ============================================================================
  // HYJAL SUMMIT - Archimonde
  // ============================================================================
  "Cataclysm's Edge": ['physical'],
  'Tempest of Chaos': ['caster'],
  'Apostle of Argus': ['healer'],
  'Robes of Rhonin': ['caster'],
  'Leggings of Eternity': ['caster', 'healer'],
  "Antonidas's Aegis of Rapt Concentration": ['caster', 'healer'],

  // ============================================================================
  // HYJAL SUMMIT - Limited Items
  // ============================================================================
  'Legguards of Endless Rage': ['physical'],
  'Midnight Chestguard': ['physical'],
  "Savior's Grasp": ['tank'],
  'Mail of Fevered Pursuit': ['physical'],
  'Bristleblitz Striker': ['physical'],
  'Pillar of Ferocity': ['physical'],
  'Bastion of Light': ['tank'],

  // ============================================================================
  // SERPENTSHRINE CAVERN - Lady Vashj
  // ============================================================================
  'Serpent Spine Longbow': ['physical'],
  'Lightfathom Scepter': ['healer'],
  'Fang of Vashj': ['physical'],
  'Vestments of the Sea-Witch': ['caster'],
  'Glorious Gauntlets of Crestfall': ['tank'],

  // ============================================================================
  // SERPENTSHRINE CAVERN - Other Bosses
  // ============================================================================
  'Tsunami Talisman': ['physical'],
  'Sextant of Unstable Currents': ['caster'],
  'Fang of the Leviathan': ['caster', 'healer'],
  'World Breaker': ['physical'],

  // ============================================================================
  // SERPENTSHRINE CAVERN - Limited Items
  // ============================================================================
  'Krakken-Heart Breastplate': ['physical'],
  'Belt of One-Hundred Deaths': ['physical'],
  "Runetotem's Mantle": ['healer'],
  'Prism of Inner Calm': ['healer'],
  "Fathom-Brooch of the Tidewalker": ['healer'],
  'Earring of Soulful Meditation': ['healer'],
  'Living Root of the Wildheart': ['healer'],
  'Scarab of Displacement': ['tank'],

  // ============================================================================
  // GRUUL'S LAIR
  // ============================================================================
  'Dragonspine Trophy': ['physical'],
  'Axe of the Gronn Lords': ['physical'],
  'Aldori Legacy Defender': ['tank'],

  // ============================================================================
  // GRUUL'S LAIR - Limited Items
  // ============================================================================
  'Eye of Gruul': ['caster'],
  'Bloodmaw Magus-Blade': ['caster'],
  "Collar of Cho'gall": ['caster'],
  "Cowl of Nature's Breath": ['healer'],
  'Hammer of the Naaru': ['healer'],
  'Teeth of Gruul': ['physical'],

  // ============================================================================
  // MAGTHERIDON'S LAIR - Limited Items
  // ============================================================================
  'Eye of Magtheridon': ['caster'],
  'Crystalheart Pulse-Staff': ['healer'],
  'Glaive of the Pit': ['physical'],
  'Aegis of the Vindicator': ['tank'],

  // ============================================================================
  // KARAZHAN - Reserved Items
  // ============================================================================
  'Gorehowl': ['physical'],
  'Sunfury Bow of the Phoenix': ['physical'],
  'The Lightning Capacitor': ['caster'],
  'Pendant of the Violet Eye': ['caster', 'healer'],
  'Staff of Infinite Mysteries': ['caster'],
  "Garona's Signet Ring": ['physical'],
  'Shield of Impenetrable Darkness': ['tank'],
  "King's Defender": ['tank'],
  'Nathrezim Mindblade': ['caster'],
  "Light's Justice": ['healer'],
  'Nightstaff of the Everliving': ['healer'],

  // ============================================================================
  // KARAZHAN - Limited Items
  // ============================================================================
  "Romulo's Poison Vial": ['physical'],
  "Moroes' Lucky Pocket Watch": ['tank'],
  'Wolfslayer Sniper Rifle': ['physical'],
  'Legacy': ['physical'],
  'Despair': ['physical'],
  'The Decapitator': ['physical'],
  'Malchazeen': ['physical'],
  "Terestian's Stranglestaff": ['caster', 'healer'],
  'Dragonheart Flameshield': ['tank'],
  'Triptych Shield of the Ancients': ['tank'],
  'Ruby Drape of the Mysticant': ['caster'],
  'Stainless Cloak of the Pure Hearted': ['healer'],

  // ============================================================================
  // ZUL'AMAN - Reserved Items
  // ============================================================================
  "Jin'rohk, The Great Apocalypse": ['physical'],
  'Hex Shrunken Head': ['caster'],
  "Berserker's Call": ['physical'],
  'Ancient Aqir Artifact': ['caster'],
  'Tiny Voodoo Mask': ['healer'],
  'Tome of Diabolic Remedy': ['healer'],

  // ============================================================================
  // ZUL'AMAN - Limited Items
  // ============================================================================
  'Ancient Amani Longbow': ['physical'],
  'Staff of Primal Fury': ['caster', 'healer'],
  'Cleaver of the Unforgiving': ['physical'],
  "Hauberk of the Empire's Champion": ['physical'],
  'Chestguard of the Warlord': ['tank'],
  'Mana Attuned Band': ['caster', 'healer'],
  'Signet of Primal Wrath': ['physical'],
  'Band of the Ranger-General': ['physical'],
  'Ring of Flowing Light': ['healer'],

  // ============================================================================
  // TIER 6 TOKENS (no role restriction - class-specific)
  // ============================================================================
  // Tier tokens intentionally have no role restriction as they're class-specific

  // ============================================================================
  // TIER 5 TOKENS (no role restriction - class-specific)
  // ============================================================================
  // Tier tokens intentionally have no role restriction as they're class-specific

  // ============================================================================
  // TIER 4 TOKENS (no role restriction - class-specific)
  // ============================================================================
  // Tier tokens intentionally have no role restriction as they're class-specific
}
