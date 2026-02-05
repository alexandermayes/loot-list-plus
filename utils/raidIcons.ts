// Mapping of raid names to their Wowhead icon names
const raidIconMap: Record<string, string> = {
  // Classic
  'Molten Core': 'achievement_boss_ragnaros',
  'MC': 'achievement_boss_ragnaros',
  'Onyxia\'s Lair': 'achievement_boss_onyxia',
  'Onyxia': 'achievement_boss_onyxia',
  'Blackwing Lair': 'achievement_boss_nefarion',
  'BWL': 'achievement_boss_nefarion',
  'Zul\'Gurub': 'achievement_boss_hakkar',
  'ZG': 'achievement_boss_hakkar',
  'Ruins of Ahn\'Qiraj': 'achievement_boss_ossiriantheunscarred',
  'AQ20': 'achievement_boss_ossiriantheunscarred',
  'Temple of Ahn\'Qiraj': 'achievement_boss_cthun',
  'AQ40': 'achievement_boss_cthun',
  'Naxxramas': 'achievement_boss_kelthuzad_01',
  'Naxx': 'achievement_boss_kelthuzad_01',

  // TBC
  'Karazhan': 'achievement_boss_princemalchezaar_02',
  'Kara': 'achievement_boss_princemalchezaar_02',
  'Gruul\'s Lair': 'achievement_boss_gruulthedragonkiller',
  'Gruul': 'achievement_boss_gruulthedragonkiller',
  'Magtheridon\'s Lair': 'achievement_boss_magtheridon',
  'Magtheridon': 'achievement_boss_magtheridon',
  'Mag': 'achievement_boss_magtheridon',
  'Serpentshrine Cavern': 'achievement_boss_ladyvashj',
  'SSC': 'achievement_boss_ladyvashj',
  'Tempest Keep: The Eye': 'achievement_boss_kael-thassunstrider_01',
  'Tempest Keep': 'achievement_boss_kael-thassunstrider_01',
  'The Eye': 'achievement_boss_kael-thassunstrider_01',
  'TK': 'achievement_boss_kael-thassunstrider_01',
  'Hyjal Summit': 'achievement_boss_archimonde-',
  'Mount Hyjal': 'achievement_boss_archimonde-',
  'Hyjal': 'achievement_boss_archimonde-',
  'Black Temple': 'achievement_boss_illidan',
  'BT': 'achievement_boss_illidan',
  'Zul\'Aman': 'inv_axe_09',
  'ZA': 'inv_axe_09',
  'Sunwell Plateau': 'achievement_boss_kiljaedan',
  'Sunwell': 'achievement_boss_kiljaedan',
  'SWP': 'achievement_boss_kiljaedan',

  // WotLK
  'Vault of Archavon': 'spell_frost_arcticwinds',
  'VoA': 'spell_frost_arcticwinds',
  'Obsidian Sanctum': 'achievement_dungeon_inthenorthcaverns',
  'OS': 'achievement_dungeon_inthenorthcaverns',
  'Eye of Eternity': 'achievement_dungeon_inthenorthcaverns',
  'EoE': 'achievement_dungeon_inthenorthcaverns',
  'Ulduar': 'achievement_boss_inthenorthyogg_saron_01',
  'Trial of the Crusader': 'achievement_reputation_argentchampion',
  'ToC': 'achievement_reputation_argentchampion',
  'Icecrown Citadel': 'achievement_dungeon_inthenorthlichking_10man',
  'ICC': 'achievement_dungeon_inthenorthlichking_10man',
  'Ruby Sanctum': 'achievement_dungeon_inthenorthlichking_10man',
  'RS': 'achievement_dungeon_inthenorthlichking_10man',
}

export function getRaidIcon(raidName: string): string {
  const iconName = raidIconMap[raidName] || 'inv_misc_questionmark'
  return `https://wow.zamimg.com/images/wow/icons/medium/${iconName}.jpg`
}

export function getRaidIconLarge(raidName: string): string {
  const iconName = raidIconMap[raidName] || 'inv_misc_questionmark'
  return `https://wow.zamimg.com/images/wow/icons/large/${iconName}.jpg`
}

// Mapping of full raid names to shorthand abbreviations
const raidShorthandMap: Record<string, string> = {
  // Classic
  'Molten Core': 'MC',
  'Onyxia\'s Lair': 'Onyxia',
  'Blackwing Lair': 'BWL',
  'Zul\'Gurub': 'ZG',
  'Ruins of Ahn\'Qiraj': 'AQ20',
  'Temple of Ahn\'Qiraj': 'AQ40',
  'Naxxramas': 'Naxx',
  // TBC
  'Karazhan': 'Kara',
  'Gruul\'s Lair': 'Gruul',
  'Magtheridon\'s Lair': 'Mag',
  'Serpentshrine Cavern': 'SSC',
  'Tempest Keep: The Eye': 'TK',
  'Tempest Keep': 'TK',
  'The Eye': 'TK',
  'Hyjal Summit': 'Hyjal',
  'Mount Hyjal': 'Hyjal',
  'Black Temple': 'BT',
  'Zul\'Aman': 'ZA',
  'Sunwell Plateau': 'SWP',
  // WotLK
  'Vault of Archavon': 'VoA',
  'Obsidian Sanctum': 'OS',
  'Eye of Eternity': 'EoE',
  'Ulduar': 'Ulduar',
  'Trial of the Crusader': 'ToC',
  'Trial of the Grand Crusader': 'ToGC',
  'Icecrown Citadel': 'ICC',
  'Ruby Sanctum': 'RS',
}

/**
 * Get the shorthand abbreviation for a raid name
 * e.g., "Serpentshrine Cavern" → "SSC"
 */
export function getRaidShorthand(raidName: string): string {
  return raidShorthandMap[raidName] || raidName
}
