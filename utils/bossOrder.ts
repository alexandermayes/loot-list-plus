/**
 * Classic WoW Boss Order
 * Returns a numeric order for each boss based on Classic raid progression
 */
export function getBossOrder(bossName: string): number {
  const order: Record<string, number> = {
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
    'Kel\'Thuzad': 57
  }

  return order[bossName] || 999 // Unknown bosses go to the end
}
