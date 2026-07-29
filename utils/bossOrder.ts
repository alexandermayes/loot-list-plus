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
    // Ragnaros: shared name with Cata Firelands. Value (336) sorts him last in
    // Firelands; Classic MC bosses are 1-9 so he still sorts last in MC.
    'Ragnaros': 336,

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
    // Nefarian: shared name with Cata Blackwing Descent. Value (305) sorts him last
    // in BWD; Classic BWL bosses are 12-18 so he still sorts last in BWL.
    'Nefarian': 305,

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
    'Kil\'jaeden': 175,

    // ==================== WRATH OF THE LICH KING ====================

    // Naxxramas (Wrath) - Tier 7
    // Most boss names are shared with Classic Naxx (orders 43-57). Only new key:
    'Four Horsemen': 51,

    // Eye of Eternity (Tier 7)
    'Malygos': 220,

    // Obsidian Sanctum (Tier 7)
    'Sartharion': 225,

    // Ulduar (Tier 8)
    'Flame Leviathan': 230,
    'Ignis the Furnace Master': 231,
    'Razorscale': 232,
    'XT-002 Deconstructor': 233,
    'Assembly of Iron': 234,
    'Kologarn': 235,
    'Auriaya': 236,
    'Hodir': 237,
    'Thorim': 238,
    'Freya': 239,
    'Mimiron': 240,
    'General Vezax': 241,
    'Yogg-Saron': 242,
    'Algalon the Observer': 243,

    // Trial of the Crusader (Tier 9)
    'Northrend Beasts': 250,
    'Lord Jaraxxus': 251,
    'Faction Champions': 252,
    'Twin Val\'kyr': 253,
    'Anub\'arak': 254,

    // Onyxia's Lair (Wrath) - sole boss "Onyxia" inherits Classic order 11

    // Icecrown Citadel (Tier 10)
    'Lord Marrowgar': 270,
    'Lady Deathwhisper': 271,
    'Gunship Battle': 272,
    'Deathbringer Saurfang': 273,
    'Festergut': 274,
    'Rotface': 275,
    'Professor Putricide': 276,
    'Blood Prince Council': 277,
    'Blood-Queen Lana\'thel': 278,
    'Valithria Dreamwalker': 279,
    'Sindragosa': 280,
    'The Lich King': 281,

    // Ruby Sanctum (Tier 10)
    'Saviana Ragefire': 290,
    'Halion': 291,

    // ==================== CATACLYSM ====================

    // Blackwing Descent (Tier 11) - Nefarian (305) defined in Classic BWL section
    'Magmaw': 300,
    'Omnotron Defense System': 301,
    'Chimaeron': 302,
    'Atramedes': 303,
    'Maloriak': 304,

    // The Bastion of Twilight (Tier 11)
    'Halfus Wyrmbreaker': 310,
    'Theralion and Valiona': 311,
    'Ascendant Council': 312,
    'Cho\'gall': 313,
    'Sinestra': 314,

    // Throne of the Four Winds (Tier 11)
    'Conclave of Wind': 320,
    'Al\'Akir': 321,

    // Firelands (Tier 12) - Ragnaros (336) defined in Classic MC section
    'Beth\'tilac': 330,
    'Lord Rhyolith': 331,
    'Alysrazor': 332,
    'Shannox': 333,
    'Baleroc': 334,
    'Majordomo Staghelm': 335,

    // Dragon Soul (Tier 13)
    'Morchok': 340,
    'Warlord Zon\'ozz': 341,
    'Yor\'sahj the Unsleeping': 342,
    'Hagara the Stormbinder': 343,
    'Ultraxion': 344,
    'Warmaster Blackhorn': 345,
    'Spine of Deathwing': 346,
    'Madness of Deathwing': 347,

    // ==================== MISTS OF PANDARIA ====================

    // Mogu'shan Vaults (Tier 14)
    'The Stone Guard': 400,
    'Feng the Accursed': 401,
    'Gara\'jal the Spiritbinder': 402,
    'The Spirit Kings': 403,
    'Elegon': 404,
    'Will of the Emperor': 405,

    // Heart of Fear (Tier 14)
    'Imperial Vizier Zor\'lok': 410,
    'Blade Lord Ta\'yak': 411,
    'Garalon': 412,
    'Wind Lord Mel\'jarak': 413,
    'Amber-Shaper Un\'sok': 414,
    'Grand Empress Shek\'zeer': 415,

    // Terrace of Endless Spring (Tier 14)
    'Protectors of the Endless': 420,
    'Tsulong': 421,
    'Lei Shi': 422,
    'Sha of Fear': 423,

    // Throne of Thunder (Tier 15)
    'Jin\'rokh the Breaker': 430,
    'Horridon': 431,
    'Council of Elders': 432,
    'Tortos': 433,
    'Megaera': 434,
    'Ji-Kun': 435,
    'Durumu the Forgotten': 436,
    'Primordius': 437,
    'Dark Animus': 438,
    'Iron Qon': 439,
    'Twin Consorts': 440,
    'Lei Shen': 441,
    'Ra-den': 442,

    // Siege of Orgrimmar (Tier 16)
    'Immerseus': 450,
    'The Fallen Protectors': 451,
    'Norushen': 452,
    'Sha of Pride': 453,
    'Galakras': 454,
    'Iron Juggernaut': 455,
    'Kor\'kron Dark Shaman': 456,
    'General Nazgrim': 457,
    'Malkorok': 458,
    'Spoils of Pandaria': 459,
    'Thok the Bloodthirsty': 460,
    'Siegecrafter Blackfuse': 461,
    'Paragons of the Klaxxi': 462,
    'Garrosh Hellscream': 463,

    // Non-encounter buckets, sorted after every real boss in any raid.
    // Previously all four fell through to the 999 default and tied with each
    // other, leaving their relative order unspecified. Boss-drop pools come
    // first, then trash, then crafting mats — matching the order they're
    // written in the raid data files. 999 stays the unknown-name fallback, so
    // an unrecognised boss still sorts after these.
    'Shared Boss Loot': 995,
    'Tier 3 Tokens': 996,
    'Trash': 997,
    'Crafting Materials': 998
  }

  return order[normalizedName] || 999 // Unknown bosses go to the end
}
