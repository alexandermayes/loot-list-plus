/**
 * GH-273 core scope: the Epic Classic raid drops that were never in
 * data/classic-wow-raids.ts, so no Classic (Era) guild could list them, plus
 * the left Bindings of the Windseeker (Legendary, added on review).
 *
 * Transcribed independently of the catalog from two loot sources that agree:
 * the wow-classic-items package (name, slot, quality) and AtlasLootClassic
 * (which boss drops it). Items that drop from several bosses go under
 * 'Shared Boss Loot' and trash drops under 'Trash', the same non-encounter
 * groups the TBC, MoP and Naxxramas data already use, so every id appears once
 * per raid and the backfill migration's NOT EXISTS guard stays exact.
 *
 * Shared by the catalog completeness suite and the backfill migration suite
 * (app/services/__tests__/classic-loot-backfill-migration.test.ts, which ships
 * with the migration) so both assert against the same list.
 */

export interface Gh273CoreItem {
  raid: string
  boss: string
  id: number
  name: string
  slot: string
}

export const GH273_CORE: Gh273CoreItem[] = [
  // Temple of Ahn'Qiraj (23)
  { raid: "Temple of Ahn'Qiraj", boss: "C'Thun", id: 20929, name: 'Carapace of the Old God', slot: 'Token' },
  { raid: "Temple of Ahn'Qiraj", boss: "C'Thun", id: 20933, name: 'Husk of the Old God', slot: 'Token' },
  { raid: "Temple of Ahn'Qiraj", boss: 'Twin Emperors', id: 20930, name: "Vek'lor's Diadem", slot: 'Token' },
  { raid: "Temple of Ahn'Qiraj", boss: 'Twin Emperors', id: 20926, name: "Vek'nilash's Circlet", slot: 'Token' },
  { raid: "Temple of Ahn'Qiraj", boss: 'Ouro', id: 20927, name: "Ouro's Intact Hide", slot: 'Token' },
  { raid: "Temple of Ahn'Qiraj", boss: 'Ouro', id: 20931, name: 'Skin of the Great Sandworm', slot: 'Token' },
  // Viscidus and Princess Huhuran
  { raid: "Temple of Ahn'Qiraj", boss: 'Shared Boss Loot', id: 20928, name: 'Qiraji Bindings of Command', slot: 'Token' },
  { raid: "Temple of Ahn'Qiraj", boss: 'Shared Boss Loot', id: 20932, name: 'Qiraji Bindings of Dominance', slot: 'Token' },
  // Every AQ40 boss except C'Thun
  { raid: "Temple of Ahn'Qiraj", boss: 'Shared Boss Loot', id: 21232, name: 'Imperial Qiraji Armaments', slot: 'Token' },
  { raid: "Temple of Ahn'Qiraj", boss: 'Shared Boss Loot', id: 21237, name: 'Imperial Qiraji Regalia', slot: 'Token' },
  { raid: "Temple of Ahn'Qiraj", boss: 'Princess Huhuran', id: 21620, name: 'Ring of the Martyr', slot: 'Finger' },
  { raid: "Temple of Ahn'Qiraj", boss: 'Battleguard Sartura', id: 21675, name: 'Thick Qirajihide Belt', slot: 'Waist' },
  { raid: "Temple of Ahn'Qiraj", boss: 'The Prophet Skeram', id: 21705, name: 'Boots of the Fallen Prophet', slot: 'Feet' },
  { raid: "Temple of Ahn'Qiraj", boss: 'Silithid Royalty', id: 21693, name: 'Guise of the Devourer', slot: 'Head' },
  { raid: "Temple of Ahn'Qiraj", boss: 'Silithid Royalty', id: 21682, name: 'Bile-Covered Gauntlets', slot: 'Hands' },
  { raid: "Temple of Ahn'Qiraj", boss: 'Silithid Royalty', id: 21684, name: "Mantle of the Desert's Fury", slot: 'Shoulder' },
  { raid: "Temple of Ahn'Qiraj", boss: 'Trash', id: 21838, name: 'Garb of Royal Ascension', slot: 'Chest' },
  { raid: "Temple of Ahn'Qiraj", boss: 'Trash', id: 21888, name: 'Gloves of the Immortal', slot: 'Hands' },
  { raid: "Temple of Ahn'Qiraj", boss: 'Trash', id: 21889, name: 'Gloves of the Redeemed Prophecy', slot: 'Hands' },
  { raid: "Temple of Ahn'Qiraj", boss: 'Trash', id: 21856, name: 'Neretzek, The Blood Drinker', slot: 'Two-Hand' },
  { raid: "Temple of Ahn'Qiraj", boss: 'Trash', id: 21837, name: 'Anubisath Warhammer', slot: 'Weapon' },
  { raid: "Temple of Ahn'Qiraj", boss: 'Trash', id: 21836, name: "Ritssyn's Ring of Chaos", slot: 'Finger' },
  { raid: "Temple of Ahn'Qiraj", boss: 'Trash', id: 21891, name: 'Shard of the Fallen Star', slot: 'Trinket' },

  // Blackwing Lair (9)
  { raid: 'Blackwing Lair', boss: 'Trash', id: 19437, name: 'Boots of Pure Thought', slot: 'Feet' },
  { raid: 'Blackwing Lair', boss: 'Trash', id: 19436, name: 'Cloak of Draconic Might', slot: 'Back' },
  { raid: 'Blackwing Lair', boss: 'Trash', id: 19434, name: 'Band of Dark Dominion', slot: 'Finger' },
  { raid: 'Blackwing Lair', boss: 'Trash', id: 19435, name: 'Essence Gatherer', slot: 'Wand' },
  { raid: 'Blackwing Lair', boss: 'Trash', id: 19362, name: "Doom's Edge", slot: 'Weapon' },
  { raid: 'Blackwing Lair', boss: 'Trash', id: 19358, name: 'Draconic Maul', slot: 'Two-Hand' },
  { raid: 'Blackwing Lair', boss: 'Trash', id: 19354, name: 'Draconic Avenger', slot: 'Two-Hand' },
  { raid: 'Blackwing Lair', boss: 'Trash', id: 19438, name: "Ringo's Blizzard Boots", slot: 'Feet' },
  { raid: 'Blackwing Lair', boss: 'Trash', id: 19439, name: 'Interlaced Shadow Jerkin', slot: 'Chest' },

  // Molten Core (22): Tier 1 belts and bracers drop from trash, three items
  // from the Cache of the Firelord that Majordomo Executus leaves, and the
  // left Bindings of the Windseeker from Baron Geddon. The right half shares
  // the name but is 18564 under Garr, already in the catalog.
  { raid: 'Molten Core', boss: 'Trash', id: 16799, name: 'Arcanist Bindings', slot: 'Wrist' },
  { raid: 'Molten Core', boss: 'Trash', id: 16802, name: 'Arcanist Belt', slot: 'Waist' },
  { raid: 'Molten Core', boss: 'Trash', id: 16804, name: 'Felheart Bracers', slot: 'Wrist' },
  { raid: 'Molten Core', boss: 'Trash', id: 16806, name: 'Felheart Belt', slot: 'Waist' },
  { raid: 'Molten Core', boss: 'Trash', id: 16817, name: 'Girdle of Prophecy', slot: 'Waist' },
  { raid: 'Molten Core', boss: 'Trash', id: 16819, name: 'Vambraces of Prophecy', slot: 'Wrist' },
  { raid: 'Molten Core', boss: 'Trash', id: 16825, name: 'Nightslayer Bracelets', slot: 'Wrist' },
  { raid: 'Molten Core', boss: 'Trash', id: 16827, name: 'Nightslayer Belt', slot: 'Waist' },
  { raid: 'Molten Core', boss: 'Trash', id: 16828, name: 'Cenarion Belt', slot: 'Waist' },
  { raid: 'Molten Core', boss: 'Trash', id: 16830, name: 'Cenarion Bracers', slot: 'Wrist' },
  { raid: 'Molten Core', boss: 'Trash', id: 16838, name: 'Earthfury Belt', slot: 'Waist' },
  { raid: 'Molten Core', boss: 'Trash', id: 16840, name: 'Earthfury Bracers', slot: 'Wrist' },
  { raid: 'Molten Core', boss: 'Trash', id: 16850, name: "Giantstalker's Bracers", slot: 'Wrist' },
  { raid: 'Molten Core', boss: 'Trash', id: 16851, name: "Giantstalker's Belt", slot: 'Waist' },
  { raid: 'Molten Core', boss: 'Trash', id: 16857, name: 'Lawbringer Bracers', slot: 'Wrist' },
  { raid: 'Molten Core', boss: 'Trash', id: 16858, name: 'Lawbringer Belt', slot: 'Waist' },
  { raid: 'Molten Core', boss: 'Trash', id: 16861, name: 'Bracers of Might', slot: 'Wrist' },
  { raid: 'Molten Core', boss: 'Trash', id: 16864, name: 'Belt of Might', slot: 'Waist' },
  { raid: 'Molten Core', boss: 'Majordomo Executus', id: 19139, name: 'Fireguard Shoulders', slot: 'Shoulder' },
  { raid: 'Molten Core', boss: 'Majordomo Executus', id: 18808, name: 'Gloves of the Hypnotic Flame', slot: 'Hands' },
  { raid: 'Molten Core', boss: 'Majordomo Executus', id: 19140, name: 'Cauterizing Band', slot: 'Finger' },
  { raid: 'Molten Core', boss: 'Baron Geddon', id: 18563, name: 'Bindings of the Windseeker', slot: 'Quest' },

  // Zul'Gurub (10): the Primal Hakkari tokens drop from the five High Priests,
  // Bloodlord Mandokir and Jin'do; the Seal from the five High Priests.
  { raid: "Zul'Gurub", boss: 'Shared Boss Loot', id: 19716, name: 'Primal Hakkari Bindings', slot: 'Token' },
  { raid: "Zul'Gurub", boss: 'Shared Boss Loot', id: 19717, name: 'Primal Hakkari Armsplint', slot: 'Token' },
  { raid: "Zul'Gurub", boss: 'Shared Boss Loot', id: 19718, name: 'Primal Hakkari Stanchion', slot: 'Token' },
  { raid: "Zul'Gurub", boss: 'Shared Boss Loot', id: 19719, name: 'Primal Hakkari Girdle', slot: 'Token' },
  { raid: "Zul'Gurub", boss: 'Shared Boss Loot', id: 19720, name: 'Primal Hakkari Sash', slot: 'Token' },
  { raid: "Zul'Gurub", boss: 'Shared Boss Loot', id: 19721, name: 'Primal Hakkari Shawl', slot: 'Token' },
  { raid: "Zul'Gurub", boss: 'Shared Boss Loot', id: 19722, name: 'Primal Hakkari Tabard', slot: 'Token' },
  { raid: "Zul'Gurub", boss: 'Shared Boss Loot', id: 19723, name: 'Primal Hakkari Kossack', slot: 'Token' },
  { raid: "Zul'Gurub", boss: 'Shared Boss Loot', id: 19724, name: 'Primal Hakkari Aegis', slot: 'Token' },
  { raid: "Zul'Gurub", boss: 'Shared Boss Loot', id: 22722, name: 'Seal of the Gurubashi Berserker', slot: 'Finger' },

  // Ruins of Ahn'Qiraj (2): Moam, Buru, Ayamiss and Ossirian.
  { raid: "Ruins of Ahn'Qiraj", boss: 'Shared Boss Loot', id: 20886, name: 'Qiraji Spiked Hilt', slot: 'Quest' },
  { raid: "Ruins of Ahn'Qiraj", boss: 'Shared Boss Loot', id: 20890, name: 'Qiraji Ornate Hilt', slot: 'Quest' },

  // Onyxia's Lair (1): a Hunter-only quest item, slot 'Token' so the token
  // class rules restrict it to Hunters.
  { raid: "Onyxia's Lair", boss: 'Onyxia', id: 18705, name: 'Mature Black Dragon Sinew', slot: 'Token' },
]
