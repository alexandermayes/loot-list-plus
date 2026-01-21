/**
 * Boss Image URLs from Wowhead
 * Maps boss names to their Wowhead NPC IDs for portrait images
 */

// Wowhead NPC portrait URL format
const getWowheadBossImage = (npcId: number): string => {
  return `https://wow.zamimg.com/images/wow/icons/large/boss_${npcId}.jpg`
}

// Alternative: Use creature display portraits
const getCreaturePortrait = (displayId: number): string => {
  return `https://wow.zamimg.com/modelviewer/live/webthumbs/npc/${Math.floor(displayId / 256)}/${displayId}.png`
}

// Map boss names to their creature display IDs (more reliable for portraits)
const bossDisplayIds: Record<string, number> = {
  // Molten Core
  'Lucifron': 12148,
  'Magmadar': 10193,
  'Gehennas': 13030,
  'Garr': 12057,
  'Baron Geddon': 12056,
  'Shazzrah': 13032,
  'Sulfuron Harbinger': 13030,
  'Golemagg the Incinerator': 11988,
  'Majordomo Executus': 12018,
  'Ragnaros': 11121,

  // Onyxia's Lair
  'Onyxia': 8570,

  // Blackwing Lair
  'Razorgore the Untamed': 10115,
  'Vaelastrasz the Corrupt': 13020,
  'Broodlord Lashlayer': 14449,
  'Firemaw': 6377,
  'Ebonroc': 6377,
  'Flamegor': 6377,
  'Chromaggus': 14367,
  'Nefarian': 11380,

  // Zul'Gurub
  'High Priestess Jeklik': 15218,
  'High Priest Venoxis': 15219,
  'High Priestess Mar\'li': 15220,
  'Bloodlord Mandokir': 11288,
  'High Priest Thekal': 15216,
  'High Priestess Arlokk': 15217,
  'Jin\'do the Hexxer': 11311,
  'Hakkar': 15295,

  // AQ20
  'Kurinnaxx': 15348,
  'General Rajaxx': 15341,
  'Moam': 15340,
  'Buru the Gorger': 15349,
  'Ayamiss the Hunter': 15369,
  'Ossirian the Unscarred': 15432,

  // AQ40
  'The Prophet Skeram': 15345,
  'Silithid Royalty': 15543,
  'Battleguard Sartura': 15516,
  'Fankriss the Unyielding': 15510,
  'Viscidus': 15299,
  'Princess Huhuran': 15509,
  'Twin Emperors': 15276,
  'Ouro': 15517,
  'C\'Thun': 15556,

  // Naxxramas
  'Anub\'Rekhan': 15931,
  'Grand Widow Faerlina': 15940,
  'Maexxna': 15952,
  'Noth the Plaguebringer': 16143,
  'Heigan the Unclean': 16142,
  'Loatheb': 16110,
  'Instructor Razuvious': 16582,
  'Gothik the Harvester': 16279,
  'The Four Horsemen': 16064,
  'Patchwerk': 16028,
  'Grobbulus': 16035,
  'Gluth': 16064,
  'Thaddius': 16137,
  'Sapphiron': 16033,
  'Kel\'Thuzad': 15945
}

// Alternative simpler approach: Use Wowhead's raid boss icons
const bossIconNames: Record<string, string> = {
  // Molten Core
  'Lucifron': 'spell_shadow_unholyfrenzy',
  'Magmadar': 'ability_hunter_pet_corehound',
  'Gehennas': 'spell_shadow_rainoffire',
  'Garr': 'spell_fire_volcano',
  'Baron Geddon': 'spell_fire_fire',
  'Shazzrah': 'spell_arcane_blink',
  'Sulfuron Harbinger': 'spell_fire_incinerate',
  'Golemagg the Incinerator': 'spell_fire_lavaspawn',
  'Majordomo Executus': 'inv_staff_30',
  'Ragnaros': 'inv_hammer_unique_sulfuras',

  // Onyxia
  'Onyxia': 'inv_misc_head_dragon_black',

  // BWL
  'Razorgore the Untamed': 'inv_misc_monsterscales_15',
  'Vaelastrasz the Corrupt': 'spell_fire_burnout',
  'Broodlord Lashlayer': 'ability_warrior_cleave',
  'Firemaw': 'spell_fire_windsofwoe',
  'Ebonroc': 'spell_shadow_shadowbolt',
  'Flamegor': 'ability_warrior_battleshout',
  'Chromaggus': 'inv_misc_head_dragon_01',
  'Nefarian': 'inv_misc_head_dragon_black',

  // ZG
  'High Priestess Jeklik': 'ability_hunter_pet_bat',
  'High Priest Venoxis': 'ability_hunter_pet_spider',
  'High Priestess Mar\'li': 'ability_hunter_pet_spider',
  'Bloodlord Mandokir': 'ability_mount_raptor',
  'High Priest Thekal': 'ability_mount_jungletiger',
  'High Priestess Arlokk': 'ability_mount_blackpanther',
  'Jin\'do the Hexxer': 'spell_shadow_shadowwordpain',
  'Hakkar': 'spell_shadow_lifedrain02',

  // AQ20
  'Kurinnaxx': 'inv_misc_ahnqaborgorb',
  'General Rajaxx': 'inv_qiraj_carapaceoldgod',
  'Moam': 'inv_misc_stonetablet_03',
  'Buru the Gorger': 'inv_misc_ahnqaborgerb',
  'Ayamiss the Hunter': 'inv_misc_ahnqaborgerb',
  'Ossirian the Unscarred': 'inv_qiraj_carapaceoldgod',

  // AQ40
  'The Prophet Skeram': 'inv_qiraj_carapaceoldgod',
  'Silithid Royalty': 'inv_misc_ahnqaborgerb',
  'Battleguard Sartura': 'inv_qiraj_carapaceoldgod',
  'Fankriss the Unyielding': 'inv_qiraj_carapaceoldgod',
  'Viscidus': 'inv_misc_slime_01',
  'Princess Huhuran': 'inv_misc_ahnqaborgerb',
  'Twin Emperors': 'inv_qiraj_carapaceoldgod',
  'Ouro': 'inv_misc_monsterscales_07',
  'C\'Thun': 'spell_nature_eyeofthestorm',

  // Naxxramas
  'Anub\'Rekhan': 'inv_misc_monsterscales_14',
  'Grand Widow Faerlina': 'spell_shadow_possession',
  'Maexxna': 'ability_hunter_pet_spider',
  'Noth the Plaguebringer': 'spell_shadow_raisedead',
  'Heigan the Unclean': 'spell_nature_removedisease',
  'Loatheb': 'spell_nature_abolishmagic',
  'Instructor Razuvious': 'inv_sword_29',
  'Gothik the Harvester': 'spell_shadow_metamorphosis',
  'The Four Horsemen': 'inv_sword_39',
  'Patchwerk': 'ability_warrior_cleave',
  'Grobbulus': 'ability_creature_poison_06',
  'Gluth': 'ability_druid_ferociousbite',
  'Thaddius': 'spell_lightning_lightningbolt01',
  'Sapphiron': 'spell_frost_frostbolt02',
  'Kel\'Thuzad': 'inv_staff_17',

  // ==================== TBC ====================

  // Karazhan
  'Servant\'s Quarters': 'ability_hunter_pet_spider',
  'Attumen the Huntsman': 'ability_mount_undeadhorse',
  'Moroes': 'inv_weapon_shortblade_22',
  'Maiden of Virtue': 'spell_holy_holybolt',
  'Opera Event': 'inv_helmet_28',
  'The Big Bad Wolf': 'ability_druid_primalprecision',
  'Romulo & Julianne': 'inv_misc_flower_01',
  'Wizard of Oz': 'inv_helmet_13',
  'The Curator': 'inv_enchant_essencearcanelarge',
  'Terestian Illhoof': 'spell_shadow_summonimp',
  'Shade of Aran': 'inv_staff_13',
  'Netherspite': 'inv_misc_monsterscales_10',
  'Chess Event': 'inv_staff_medivh',
  'Prince Malchezaar': 'inv_sword_59',
  'Nightbane': 'spell_shadow_raisedead',

  // Gruul's Lair
  'Gruul the Dragonkiller': 'achievement_boss_gruulthedragonkiller',
  'High King Maulgar': 'spell_nature_shamanrage',

  // Magtheridon's Lair
  'Magtheridon': 'achievement_boss_magtheridon',

  // Serpentshrine Cavern
  'Morogrim Tidewalker': 'spell_frost_summonwaterelemental_2',
  'Hydross the Unstable': 'spell_nature_acid_01',
  'The Lurker Below': 'inv_misc_fish_35',
  'Leotheras the Blind': 'spell_shadow_metamorphosis',
  'Fathom-Lord Karathress': 'spell_nature_earthquake',
  'Lady Vashj': 'achievement_boss_ladyvashj',

  // Tempest Keep: The Eye
  'Al\'ar': 'inv_misc_birdbeck_02',
  'High Astromancer Solarian': 'spell_arcane_starfire',
  'Void Reaver': 'spell_shadow_shadowandflame',
  'Kael\'thas Sunstrider': 'achievement_boss_kael-thassunstrider_01',
  'Trash': 'inv_misc_bag_10_blue',

  // Mount Hyjal
  'Rage Winterchill': 'spell_frost_glacier',
  'Anetheron': 'spell_shadow_carrionswarm',
  'Kaz\'rogal': 'spell_shadow_deathcoil',
  'Azgalor': 'spell_fire_fireball02',
  'Archimonde': 'achievement_boss_archimonde-',

  // Black Temple
  'High Warlord Naj\'entus': 'inv_spear_06',
  'Supremus': 'spell_fire_volcano',
  'Shade of Akama': 'spell_shadow_shadowform',
  'Teron Gorefiend': 'spell_shadow_deathcoil',
  'Gurtogg Bloodboil': 'ability_warrior_bloodfrenzy',
  'Reliquary of Souls': 'spell_shadow_auraofdarkness',
  'Mother Shahraz': 'spell_shadow_shadowbolt',
  'The Illidari Council': 'spell_arcane_portaldarnassus',
  'Illidan Stormrage': 'achievement_boss_illidan',

  // Zul'Aman
  'Nalorakk': 'ability_druid_challangingroar',
  'Akil\'zon': 'spell_nature_cyclone',
  'Halazzi': 'ability_mount_jungletiger',
  'Hex Lord Malacrass': 'spell_shadow_painspike',
  'Jan\'alai': 'spell_fire_flamebolt',
  'Zul\'jin': 'inv_axe_09',
  'Timed Event': 'ability_mount_jungletiger',

  // Sunwell Plateau
  'Kalecgos': 'spell_arcane_arcane03',
  'Brutallus': 'ability_warrior_bloodnova',
  'Felmyst': 'spell_shadow_demonicfortitude',
  'Eredar Twins': 'spell_shadow_shadowfury',
  'M\'uru': 'spell_holy_circleofrenewal',
  'Kil\'jaeden': 'achievement_boss_kiljaedan'
}

/**
 * Get boss image URL
 * Uses Wowhead's icon system for reliable images
 */
export function getBossImage(bossName: string): string | null {
  const iconName = bossIconNames[bossName]
  if (iconName) {
    return `https://wow.zamimg.com/images/wow/icons/medium/${iconName}.jpg`
  }
  return null
}

/**
 * Get boss portrait (creature model thumbnail)
 * May not work for all bosses
 */
export function getBossPortrait(bossName: string): string | null {
  const displayId = bossDisplayIds[bossName]
  if (displayId) {
    return getCreaturePortrait(displayId)
  }
  return null
}
