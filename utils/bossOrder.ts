/**
 * Boss Name Normalization
 * Merges multiple boss encounters into a single display name
 * (e.g., Opera Event sub-bosses → "Opera Event")
 */
const BOSS_NAME_ALIASES: Record<string, string> = {
  // Karazhan Opera Event (Big Bad Wolf, Romulo & Julianne, Wizard of Oz)
  'The Big Bad Wolf': 'Opera Event',
  'Big Bad Wolf': 'Opera Event',
  'Romulo & Julianne': 'Opera Event',
  'Romulo and Julianne': 'Opera Event',
  'Julianne': 'Opera Event',
  'Wizard of Oz': 'Opera Event',
  'The Wizard of Oz': 'Opera Event',
  'The Crone': 'Opera Event',

  // Karazhan Chess Event
  'Echo of Medivh': 'Chess Event',

  // Karazhan Servant's Quarters (combines 3 rare spawns)
  'Hyakiss the Lurker': 'Servant\'s Quarters',
  'Rokad the Ravager': 'Servant\'s Quarters',
  'Shadikith the Glider': 'Servant\'s Quarters',
}

/**
 * Normalizes boss names to merge multi-boss encounters
 * e.g., "The Big Bad Wolf" → "Opera Event"
 */
export function normalizeBossName(bossName: string): string {
  return BOSS_NAME_ALIASES[bossName] || bossName
}

/**
 * WoW Boss Order
 * Returns a numeric order for each boss based on raid progression
 * Classic: 1-57, TBC: 100-199
 */
export function getBossOrder(bossName: string): number {
  // Normalize boss name first to handle aliases
  const normalizedName = normalizeBossName(bossName)
  const order: Record<string, number> = {
    // ==================== CLASSIC ====================

    // Molten Core
    'Lucifron': 1,
    'Magmadar': 2,
    'Gehennas': 3,
    'Garr': 4,
    'Baron Geddon': 5,
    'Shazzrah': 6,
    'Sulfuron Harbinger': 7,
    'Golemagg the Incinerator': 8,
    'Majordomo Executus': 9,
    'Ragnaros': 10,

    // Onyxia's Lair
    'Onyxia': 11,

    // Blackwing Lair
    'Razorgore the Untamed': 12,
    'Vaelastrasz the Corrupt': 13,
    'Broodlord Lashlayer': 14,
    'Firemaw': 15,
    'Ebonroc': 16,
    'Flamegor': 17,
    'Chromaggus': 18,
    'Nefarian': 19,

    // Zul'Gurub
    'High Priestess Jeklik': 20,
    'High Priest Venoxis': 21,
    'High Priestess Mar\'li': 22,
    'Bloodlord Mandokir': 23,
    'High Priest Thekal': 24,
    'High Priestess Arlokk': 25,
    'Jin\'do the Hexxer': 26,
    'Hakkar': 27,

    // Ruins of Ahn'Qiraj (AQ20)
    'Kurinnaxx': 28,
    'General Rajaxx': 29,
    'Moam': 30,
    'Buru the Gorger': 31,
    'Ayamiss the Hunter': 32,
    'Ossirian the Unscarred': 33,

    // Temple of Ahn'Qiraj (AQ40)
    'The Prophet Skeram': 34,
    'Silithid Royalty': 35,
    'Battleguard Sartura': 36,
    'Fankriss the Unyielding': 37,
    'Viscidus': 38,
    'Princess Huhuran': 39,
    'Twin Emperors': 40,
    'Ouro': 41,
    'C\'Thun': 42,

    // Naxxramas
    'Anub\'Rekhan': 43,
    'Grand Widow Faerlina': 44,
    'Maexxna': 45,
    'Noth the Plaguebringer': 46,
    'Heigan the Unclean': 47,
    'Loatheb': 48,
    'Instructor Razuvious': 49,
    'Gothik the Harvester': 50,
    'The Four Horsemen': 51,
    'Patchwerk': 52,
    'Grobbulus': 53,
    'Gluth': 54,
    'Thaddius': 55,
    'Sapphiron': 56,
    'Kel\'Thuzad': 57,

    // ==================== TBC ====================

    // Karazhan (Tier 4)
    'Servant\'s Quarters': 100,
    'Attumen the Huntsman': 101,
    'Moroes': 102,
    'Maiden of Virtue': 103,
    'Opera Event': 104,
    'The Curator': 105,
    'Terestian Illhoof': 106,
    'Shade of Aran': 107,
    'Netherspite': 108,
    'Chess Event': 109,
    'Prince Malchezaar': 110,
    'Nightbane': 111,

    // Gruul's Lair (Tier 4)
    'High King Maulgar': 112,
    'Gruul the Dragonkiller': 113,

    // Magtheridon's Lair (Tier 4)
    'Magtheridon': 114,

    // Serpentshrine Cavern (Tier 5)
    'Hydross the Unstable': 120,
    'The Lurker Below': 121,
    'Leotheras the Blind': 122,
    'Fathom-Lord Karathress': 123,
    'Morogrim Tidewalker': 124,
    'Lady Vashj': 125,

    // Tempest Keep: The Eye (Tier 5)
    'Al\'ar': 130,
    'Void Reaver': 131,
    'High Astromancer Solarian': 132,
    'Kael\'thas Sunstrider': 133,

    // Hyjal Summit (Tier 6)
    'Rage Winterchill': 140,
    'Anetheron': 141,
    'Kaz\'rogal': 142,
    'Azgalor': 143,
    'Archimonde': 144,

    // Black Temple (Tier 6)
    'High Warlord Naj\'entus': 150,
    'Supremus': 151,
    'Shade of Akama': 152,
    'Teron Gorefiend': 153,
    'Gurtogg Bloodboil': 154,
    'Reliquary of Souls': 155,
    'Mother Shahraz': 156,
    'The Illidari Council': 157,
    'Illidan Stormrage': 158,

    // Zul'Aman (Tier 6)
    'Nalorakk': 160,
    'Akil\'zon': 161,
    'Halazzi': 162,
    'Hex Lord Malacrass': 163,
    'Jan\'alai': 164,
    'Zul\'jin': 165,
    'Timed Event': 166,

    // Sunwell Plateau (Tier 6)
    'Kalecgos': 170,
    'Brutallus': 171,
    'Felmyst': 172,
    'Eredar Twins': 173,
    'M\'uru': 174,
    'Kil\'jaeden': 175
  }

  return order[normalizedName] || 999 // Unknown bosses go to the end
}
