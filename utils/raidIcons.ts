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
  'Tempest Keep: The Eye': 'achievement_boss_inthenorthkaelthas',
  'Tempest Keep': 'achievement_boss_inthenorthkaelthas',
  'The Eye': 'achievement_boss_inthenorthkaelthas',
  'TK': 'achievement_boss_inthenorthkaelthas',
  'Hyjal Summit': 'achievement_boss_archimonde',
  'Mount Hyjal': 'achievement_boss_archimonde',
  'Hyjal': 'achievement_boss_archimonde',
  'Black Temple': 'achievement_boss_inthenorthdarnavan',
  'BT': 'achievement_boss_inthenorthdarnavan',
  'Zul\'Aman': 'achievement_boss_zuljin',
  'ZA': 'achievement_boss_zuljin',
  'Sunwell Plateau': 'achievement_boss_inthenorthkiljaeden',
  'Sunwell': 'achievement_boss_inthenorthkiljaeden',
  'SWP': 'achievement_boss_inthenorthkiljaeden',

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
