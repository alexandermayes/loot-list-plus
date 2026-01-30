/**
 * TBC Best-in-Slot Lists
 *
 * This file contains BIS item wowhead_ids for each class/spec combination.
 * Data sourced from community consensus (Wowhead, LoonBestInSlot addon).
 *
 * Structure: spec name -> tier name -> slot -> wowhead_id[]
 * Each slot can have multiple BIS options (e.g., soft BIS vs hard BIS)
 */

// Equipment slots that can be ranked
export type EquipmentSlot =
  | 'Head' | 'Neck' | 'Shoulder' | 'Back' | 'Chest'
  | 'Wrist' | 'Hands' | 'Waist' | 'Legs' | 'Feet'
  | 'Finger' | 'Trinket'
  | 'Main Hand' | 'Off Hand' | 'Two-Hand' | 'One-Hand'
  | 'Ranged' | 'Relic' | 'Held In Off-hand'

export interface BisItem {
  wowhead_id: number
  priority: 'bis' | 'alt'  // BIS = best, Alt = alternative/soft BIS
}

export type BisSlotItems = BisItem[]
export type BisTierData = Partial<Record<EquipmentSlot, BisSlotItems>>
export type BisSpecData = Record<string, BisTierData>  // tier name -> slots
export type BisExpansionData = Record<string, BisSpecData>  // spec name -> tiers

/**
 * TBC BIS Data
 * Organized by spec -> tier -> slot -> items
 */
export const TBC_BIS: BisExpansionData = {
  // ============================================================================
  // HOLY PALADIN
  // ============================================================================
  'Holy Paladin': {
    'Karazhan': {
      'Head': [{ wowhead_id: 28804, priority: 'bis' }],  // Helm of the Fallen Defender (T4)
      'Neck': [{ wowhead_id: 28731, priority: 'bis' }],  // Shining Chain of the Afterworld
      'Shoulder': [{ wowhead_id: 28612, priority: 'bis' }],  // Pauldrons of the Solace-Giver
      'Back': [{ wowhead_id: 28765, priority: 'bis' }],  // Stainless Cloak of the Pure Hearted
      'Chest': [{ wowhead_id: 28662, priority: 'bis' }],  // Breastplate of the Lightbinder
      'Wrist': [{ wowhead_id: 28511, priority: 'bis' }],  // Bands of Indwelling
      'Hands': [{ wowhead_id: 28780, priority: 'bis' }],  // Gloves of the Fallen Defender (T4)
      'Waist': [{ wowhead_id: 28799, priority: 'bis' }],  // Belt of the Fallen Hero (not in Kara)
      'Legs': [{ wowhead_id: 28621, priority: 'bis' }],  // Wrynn Dynasty Greaves
      'Feet': [{ wowhead_id: 28517, priority: 'bis' }],  // Boots of Foretelling
      'Finger': [
        { wowhead_id: 28661, priority: 'bis' },  // Mender's Heart-Ring
        { wowhead_id: 28790, priority: 'bis' }   // Ring of the Fallen Defender (not in Kara)
      ],
      'Trinket': [
        { wowhead_id: 28528, priority: 'bis' },  // Moroes' Lucky Pocket Watch
        { wowhead_id: 28727, priority: 'alt' }   // Pendant of the Violet Eye
      ],
      'Main Hand': [{ wowhead_id: 28522, priority: 'bis' }],  // Shard of the Virtuous
      'Held In Off-hand': [{ wowhead_id: 28525, priority: 'bis' }],  // Signet of Unshakable Faith
      'Relic': [{ wowhead_id: 28568, priority: 'bis' }]  // Idol of the Avian Heart
    },
    'Serpentshrine Cavern': {
      'Head': [{ wowhead_id: 30136, priority: 'bis' }],  // Helm of the Fallen Champion (T5)
      'Neck': [{ wowhead_id: 30018, priority: 'bis' }],  // Lord Sanguinar's Claim
      'Shoulder': [{ wowhead_id: 30137, priority: 'bis' }],  // Pauldrons of the Fallen Champion (T5)
      'Chest': [{ wowhead_id: 30134, priority: 'bis' }],  // Chestguard of the Fallen Champion (T5)
      'Waist': [{ wowhead_id: 30038, priority: 'bis' }],  // Belt of One-Hundred Deaths
      'Legs': [{ wowhead_id: 30135, priority: 'bis' }],  // Leggings of the Fallen Champion (T5)
      'Hands': [{ wowhead_id: 30133, priority: 'bis' }],  // Gloves of the Fallen Champion (T5)
      'Trinket': [
        { wowhead_id: 30664, priority: 'bis' }  // Living Root of the Wildheart
      ]
    },
    'Black Temple': {
      'Head': [{ wowhead_id: 31097, priority: 'bis' }],  // Helm of the Forgotten Conqueror (T6)
      'Shoulder': [{ wowhead_id: 31101, priority: 'bis' }],  // Pauldrons of the Forgotten Conqueror (T6)
      'Chest': [{ wowhead_id: 31089, priority: 'bis' }],  // Chestguard of the Forgotten Conqueror (T6)
      'Waist': [{ wowhead_id: 32528, priority: 'bis' }],  // Girdle of Hope
      'Legs': [{ wowhead_id: 31095, priority: 'bis' }],  // Leggings of the Forgotten Conqueror (T6)
      'Hands': [{ wowhead_id: 31093, priority: 'bis' }],  // Gloves of the Forgotten Conqueror (T6)
      'Feet': [{ wowhead_id: 32517, priority: 'bis' }],  // The Seeker's Wristguards
      'Back': [{ wowhead_id: 32524, priority: 'bis' }],  // Shroud of the Highborne
      'Trinket': [
        { wowhead_id: 32496, priority: 'bis' }  // Memento of Tyrande
      ]
    }
  },

  // ============================================================================
  // RETRIBUTION PALADIN
  // ============================================================================
  'Retribution Paladin': {
    'Karazhan': {
      'Head': [{ wowhead_id: 28583, priority: 'bis' }],  // Big Bad Wolf's Head
      'Neck': [{ wowhead_id: 28530, priority: 'bis' }],  // Brooch of Unquenchable Fury
      'Shoulder': [{ wowhead_id: 28631, priority: 'bis' }],  // Dragon-Quake Shoulderguards
      'Back': [{ wowhead_id: 28672, priority: 'bis' }],  // Drape of the Dark Reavers
      'Chest': [{ wowhead_id: 28746, priority: 'bis' }],  // Fiend Slayer Breastplate
      'Wrist': [{ wowhead_id: 28502, priority: 'bis' }],  // Vambraces of Courage
      'Hands': [{ wowhead_id: 28505, priority: 'alt' }],  // Gauntlets of Renewed Hope
      'Waist': [{ wowhead_id: 28566, priority: 'bis' }],  // Crimson Girdle of the Indomitable
      'Legs': [{ wowhead_id: 28741, priority: 'bis' }],  // Skulker's Greaves
      'Feet': [{ wowhead_id: 28608, priority: 'bis' }],  // Ironstriders of Urgency
      'Finger': [
        { wowhead_id: 28649, priority: 'bis' },  // Garona's Signet Ring
        { wowhead_id: 28730, priority: 'alt' }   // Mithril Band of the Unscarred
      ],
      'Trinket': [
        { wowhead_id: 28830, priority: 'bis' },  // Dragonspine Trophy
        { wowhead_id: 28579, priority: 'alt' }   // Romulo's Poison Vial
      ],
      'Two-Hand': [{ wowhead_id: 28573, priority: 'bis' }],  // Despair
      'Relic': [{ wowhead_id: 27484, priority: 'bis' }]  // Libram of Avengement
    }
  },

  // ============================================================================
  // PROTECTION PALADIN
  // ============================================================================
  'Protection Paladin': {
    'Karazhan': {
      'Head': [{ wowhead_id: 28803, priority: 'bis' }],  // Helm of the Fallen Defender (T4)
      'Neck': [{ wowhead_id: 28516, priority: 'bis' }],  // Barbed Choker of Discipline
      'Shoulder': [{ wowhead_id: 28666, priority: 'bis' }],  // Pauldrons of the Justice-Seeker
      'Back': [{ wowhead_id: 28529, priority: 'bis' }],  // Royal Cloak of Arathi Kings
      'Chest': [{ wowhead_id: 28746, priority: 'bis' }],  // Fiend Slayer Breastplate
      'Wrist': [{ wowhead_id: 28502, priority: 'bis' }],  // Vambraces of Courage
      'Hands': [{ wowhead_id: 28518, priority: 'bis' }],  // Iron Gauntlets of the Maiden
      'Waist': [{ wowhead_id: 28566, priority: 'bis' }],  // Crimson Girdle of the Indomitable
      'Legs': [{ wowhead_id: 28621, priority: 'bis' }],  // Wrynn Dynasty Greaves
      'Feet': [{ wowhead_id: 28747, priority: 'bis' }],  // Battlescar Boots
      'Finger': [
        { wowhead_id: 28675, priority: 'bis' },  // Shermanar Great-Ring
        { wowhead_id: 28730, priority: 'alt' }   // Mithril Band of the Unscarred
      ],
      'Trinket': [
        { wowhead_id: 28528, priority: 'bis' },  // Moroes' Lucky Pocket Watch
        { wowhead_id: 28789, priority: 'alt' }   // Eye of the Beast
      ],
      'Main Hand': [{ wowhead_id: 28749, priority: 'bis' }],  // King's Defender
      'Off Hand': [{ wowhead_id: 28825, priority: 'bis' }],  // Aldori Legacy Defender
      'Relic': [{ wowhead_id: 27917, priority: 'bis' }]  // Libram of Repentance
    }
  },

  // ============================================================================
  // RESTORATION SHAMAN
  // ============================================================================
  'Restoration Shaman': {
    'Karazhan': {
      'Head': [{ wowhead_id: 28804, priority: 'bis' }],  // Helm of the Fallen Defender (T4)
      'Neck': [{ wowhead_id: 28731, priority: 'bis' }],  // Shining Chain of the Afterworld
      'Shoulder': [{ wowhead_id: 28647, priority: 'bis' }],  // Forest Wind Shoulderpads
      'Back': [{ wowhead_id: 28765, priority: 'bis' }],  // Stainless Cloak of the Pure Hearted
      'Chest': [{ wowhead_id: 28735, priority: 'bis' }],  // Earthblood Chestguard
      'Wrist': [{ wowhead_id: 28511, priority: 'alt' }],  // Bands of Indwelling
      'Hands': [{ wowhead_id: 28780, priority: 'bis' }],  // Gloves of the Fallen Defender (T4)
      'Waist': [{ wowhead_id: 28655, priority: 'bis' }],  // Cord of Nature's Sustenance
      'Legs': [{ wowhead_id: 28740, priority: 'bis' }],  // Rip-Flayer Leggings
      'Feet': [{ wowhead_id: 28752, priority: 'bis' }],  // Forestlord Striders
      'Finger': [
        { wowhead_id: 28661, priority: 'bis' },  // Mender's Heart-Ring
        { wowhead_id: 28792, priority: 'alt' }   // Ring from badges
      ],
      'Trinket': [
        { wowhead_id: 28523, priority: 'bis' },  // Totem of Healing Rains
        { wowhead_id: 28727, priority: 'alt' }   // Pendant of the Violet Eye
      ],
      'Main Hand': [{ wowhead_id: 28771, priority: 'bis' }],  // Light's Justice
      'Off Hand': [{ wowhead_id: 28753, priority: 'bis' }],  // Ring of Unrelenting Storms
      'Relic': [{ wowhead_id: 28523, priority: 'bis' }]  // Totem of Healing Rains
    }
  },

  // ============================================================================
  // ELEMENTAL SHAMAN
  // ============================================================================
  'Elemental Shaman': {
    'Karazhan': {
      'Head': [{ wowhead_id: 28804, priority: 'bis' }],  // Helm of the Fallen Defender (T4)
      'Neck': [{ wowhead_id: 28762, priority: 'bis' }],  // Adornment of Stolen Souls
      'Shoulder': [{ wowhead_id: 28726, priority: 'bis' }],  // Mantle of the Mind Flayer
      'Back': [{ wowhead_id: 28766, priority: 'bis' }],  // Ruby Drape of the Mysticant
      'Chest': [{ wowhead_id: 28802, priority: 'bis' }],  // Chestguard of the Fallen Defender (T4)
      'Wrist': [{ wowhead_id: 28515, priority: 'bis' }],  // Bands of Nefarious Deeds
      'Hands': [{ wowhead_id: 28780, priority: 'bis' }],  // Gloves of the Fallen Defender (T4)
      'Waist': [{ wowhead_id: 28654, priority: 'bis' }],  // Malefic Girdle
      'Legs': [{ wowhead_id: 28740, priority: 'bis' }],  // Rip-Flayer Leggings
      'Feet': [{ wowhead_id: 28752, priority: 'bis' }],  // Forestlord Striders
      'Finger': [
        { wowhead_id: 28753, priority: 'bis' },  // Ring of Recurrence
        { wowhead_id: 28727, priority: 'alt' }   // Pendant of the Violet Eye
      ],
      'Trinket': [
        { wowhead_id: 28785, priority: 'bis' },  // The Lightning Capacitor
        { wowhead_id: 28727, priority: 'alt' }   // Pendant of the Violet Eye
      ],
      'Main Hand': [{ wowhead_id: 28770, priority: 'bis' }],  // Nathrezim Mindblade
      'Off Hand': [{ wowhead_id: 28734, priority: 'bis' }],  // Jewel of Infinite Possibilities
      'Relic': [{ wowhead_id: 29389, priority: 'bis' }]  // Totem of the Void
    }
  },

  // ============================================================================
  // ENHANCEMENT SHAMAN
  // ============================================================================
  'Enhancement Shaman': {
    'Karazhan': {
      'Head': [{ wowhead_id: 28804, priority: 'bis' }],  // Helm of the Fallen Defender (T4)
      'Neck': [{ wowhead_id: 28530, priority: 'bis' }],  // Brooch of Unquenchable Fury
      'Shoulder': [{ wowhead_id: 28631, priority: 'bis' }],  // Dragon-Quake Shoulderguards
      'Back': [{ wowhead_id: 28672, priority: 'bis' }],  // Drape of the Dark Reavers
      'Chest': [{ wowhead_id: 28802, priority: 'bis' }],  // Chestguard of the Fallen Defender (T4)
      'Wrist': [{ wowhead_id: 28503, priority: 'bis' }],  // Whirlwind Bracers
      'Hands': [{ wowhead_id: 28780, priority: 'bis' }],  // Gloves of the Fallen Defender (T4)
      'Waist': [{ wowhead_id: 28567, priority: 'bis' }],  // Belt of Gale Force
      'Legs': [{ wowhead_id: 28741, priority: 'bis' }],  // Skulker's Greaves
      'Feet': [{ wowhead_id: 28545, priority: 'bis' }],  // Edgewalker Longboots
      'Finger': [
        { wowhead_id: 28649, priority: 'bis' },  // Garona's Signet Ring
        { wowhead_id: 28730, priority: 'alt' }   // Mithril Band of the Unscarred
      ],
      'Trinket': [
        { wowhead_id: 28830, priority: 'bis' },  // Dragonspine Trophy
        { wowhead_id: 28579, priority: 'alt' }   // Romulo's Poison Vial
      ],
      'One-Hand': [
        { wowhead_id: 28729, priority: 'bis' },  // Spiteblade
        { wowhead_id: 28524, priority: 'alt' }   // Emerald Ripper
      ],
      'Relic': [{ wowhead_id: 27815, priority: 'bis' }]  // Totem of the Astral Winds
    }
  },

  // ============================================================================
  // RESTORATION DRUID
  // ============================================================================
  'Restoration Druid': {
    'Karazhan': {
      'Head': [{ wowhead_id: 28803, priority: 'bis' }],  // Helm of the Fallen Defender (T4)
      'Neck': [{ wowhead_id: 28731, priority: 'bis' }],  // Shining Chain of the Afterworld
      'Shoulder': [{ wowhead_id: 28647, priority: 'bis' }],  // Forest Wind Shoulderpads
      'Back': [{ wowhead_id: 28765, priority: 'bis' }],  // Stainless Cloak of the Pure Hearted
      'Chest': [{ wowhead_id: 28735, priority: 'bis' }],  // Earthblood Chestguard
      'Wrist': [{ wowhead_id: 28511, priority: 'alt' }],  // Bands of Indwelling
      'Hands': [{ wowhead_id: 28521, priority: 'bis' }],  // Mitts of the Treemender
      'Waist': [{ wowhead_id: 28655, priority: 'bis' }],  // Cord of Nature's Sustenance
      'Legs': [{ wowhead_id: 28740, priority: 'bis' }],  // Rip-Flayer Leggings
      'Feet': [{ wowhead_id: 28752, priority: 'bis' }],  // Forestlord Striders
      'Finger': [
        { wowhead_id: 28661, priority: 'bis' },  // Mender's Heart-Ring
        { wowhead_id: 28792, priority: 'alt' }   // Ring from badges
      ],
      'Trinket': [
        { wowhead_id: 28568, priority: 'bis' },  // Idol of the Avian Heart
        { wowhead_id: 28727, priority: 'alt' }   // Pendant of the Violet Eye
      ],
      'Two-Hand': [{ wowhead_id: 28633, priority: 'bis' }],  // Staff of Infinite Mysteries
      'Relic': [{ wowhead_id: 28568, priority: 'bis' }]  // Idol of the Avian Heart
    }
  },

  // ============================================================================
  // FERAL DRUID
  // ============================================================================
  'Feral Druid': {
    'Karazhan': {
      'Head': [{ wowhead_id: 28803, priority: 'bis' }],  // Helm of the Fallen Defender (T4)
      'Neck': [{ wowhead_id: 28674, priority: 'bis' }],  // Saberclaw Talisman
      'Shoulder': [{ wowhead_id: 28631, priority: 'bis' }],  // Dragon-Quake Shoulderguards
      'Back': [{ wowhead_id: 28672, priority: 'bis' }],  // Drape of the Dark Reavers
      'Chest': [{ wowhead_id: 28601, priority: 'bis' }],  // Chestguard of the Fallen Defender (T4)
      'Wrist': [{ wowhead_id: 28453, priority: 'bis' }],  // Bracers of the White Stag
      'Hands': [{ wowhead_id: 28506, priority: 'bis' }],  // Gloves of Dexterous Manipulation
      'Waist': [{ wowhead_id: 28656, priority: 'bis' }],  // Girdle of the Prowler
      'Legs': [{ wowhead_id: 28741, priority: 'bis' }],  // Skulker's Greaves
      'Feet': [{ wowhead_id: 28545, priority: 'bis' }],  // Edgewalker Longboots
      'Finger': [
        { wowhead_id: 28649, priority: 'bis' },  // Garona's Signet Ring
        { wowhead_id: 28730, priority: 'alt' }   // Mithril Band of the Unscarred
      ],
      'Trinket': [
        { wowhead_id: 28579, priority: 'bis' }   // Romulo's Poison Vial
      ],
      'Two-Hand': [{ wowhead_id: 28658, priority: 'bis' }],  // Terestian's Stranglestaff
      'Relic': [{ wowhead_id: 28372, priority: 'bis' }]  // Idol of the Wild
    },
    "Gruul's Lair": {
      'Neck': [{ wowhead_id: 28822, priority: 'bis' }],  // Teeth of Gruul
      'Hands': [{ wowhead_id: 28827, priority: 'bis' }],  // Gauntlets of the Dragonslayer (leather)
      'Trinket': [{ wowhead_id: 28830, priority: 'bis' }],  // Dragonspine Trophy
      'Two-Hand': [{ wowhead_id: 28794, priority: 'bis' }]  // Axe of the Gronn Lords (for bear)
    }
  },

  // ============================================================================
  // BALANCE DRUID
  // ============================================================================
  'Balance Druid': {
    'Karazhan': {
      'Head': [{ wowhead_id: 28803, priority: 'bis' }],  // Helm of the Fallen Defender (T4)
      'Neck': [{ wowhead_id: 28762, priority: 'bis' }],  // Adornment of Stolen Souls
      'Shoulder': [{ wowhead_id: 28726, priority: 'bis' }],  // Mantle of the Mind Flayer
      'Back': [{ wowhead_id: 28766, priority: 'bis' }],  // Ruby Drape of the Mysticant
      'Chest': [{ wowhead_id: 28601, priority: 'bis' }],  // Chestguard of the Fallen Defender (T4)
      'Wrist': [{ wowhead_id: 28515, priority: 'bis' }],  // Bands of Nefarious Deeds
      'Hands': [{ wowhead_id: 28521, priority: 'bis' }],  // Mitts of the Treemender
      'Waist': [{ wowhead_id: 28654, priority: 'bis' }],  // Malefic Girdle
      'Legs': [{ wowhead_id: 28740, priority: 'bis' }],  // Rip-Flayer Leggings
      'Feet': [{ wowhead_id: 28752, priority: 'bis' }],  // Forestlord Striders
      'Finger': [
        { wowhead_id: 28793, priority: 'bis' },  // Band of Crimson Fury
        { wowhead_id: 28753, priority: 'alt' }   // Ring of Recurrence
      ],
      'Trinket': [
        { wowhead_id: 28785, priority: 'bis' },  // The Lightning Capacitor
        { wowhead_id: 28727, priority: 'alt' }   // Pendant of the Violet Eye
      ],
      'Two-Hand': [{ wowhead_id: 28633, priority: 'bis' }],  // Staff of Infinite Mysteries
      'Relic': [{ wowhead_id: 27518, priority: 'bis' }]  // Ivory Idol of the Moongoddess
    }
  },

  // ============================================================================
  // PROTECTION WARRIOR
  // ============================================================================
  'Protection Warrior': {
    'Karazhan': {
      'Head': [{ wowhead_id: 28803, priority: 'bis' }],  // Helm of the Fallen Defender (T4)
      'Neck': [{ wowhead_id: 28509, priority: 'bis' }],  // Worgen Claw Necklace
      'Shoulder': [{ wowhead_id: 28666, priority: 'bis' }],  // Pauldrons of the Justice-Seeker
      'Back': [{ wowhead_id: 28529, priority: 'bis' }],  // Royal Cloak of Arathi Kings
      'Chest': [{ wowhead_id: 28746, priority: 'bis' }],  // Fiend Slayer Breastplate
      'Wrist': [{ wowhead_id: 28502, priority: 'bis' }],  // Vambraces of Courage
      'Hands': [{ wowhead_id: 28518, priority: 'bis' }],  // Iron Gauntlets of the Maiden
      'Waist': [{ wowhead_id: 28566, priority: 'bis' }],  // Crimson Girdle of the Indomitable
      'Legs': [{ wowhead_id: 28621, priority: 'bis' }],  // Wrynn Dynasty Greaves
      'Feet': [{ wowhead_id: 28747, priority: 'bis' }],  // Battlescar Boots
      'Finger': [
        { wowhead_id: 28675, priority: 'bis' },  // Shermanar Great-Ring
        { wowhead_id: 28730, priority: 'alt' }   // Mithril Band of the Unscarred
      ],
      'Trinket': [
        { wowhead_id: 28528, priority: 'bis' },  // Moroes' Lucky Pocket Watch
        { wowhead_id: 28789, priority: 'alt' }   // Eye of the Beast
      ],
      'Main Hand': [{ wowhead_id: 28749, priority: 'bis' }],  // King's Defender
      'Off Hand': [{ wowhead_id: 28825, priority: 'bis' }],  // Aldori Legacy Defender
      'Ranged': [{ wowhead_id: 28504, priority: 'bis' }]  // Steelhawk Crossbow
    }
  },

  // ============================================================================
  // ARMS/FURY WARRIOR
  // ============================================================================
  'Arms/Fury Warrior': {
    'Karazhan': {
      'Head': [{ wowhead_id: 28803, priority: 'bis' }],  // Helm of the Fallen Defender (T4)
      'Neck': [{ wowhead_id: 28530, priority: 'bis' }],  // Brooch of Unquenchable Fury
      'Shoulder': [{ wowhead_id: 28631, priority: 'bis' }],  // Dragon-Quake Shoulderguards
      'Back': [{ wowhead_id: 28672, priority: 'bis' }],  // Drape of the Dark Reavers
      'Chest': [{ wowhead_id: 28746, priority: 'bis' }],  // Fiend Slayer Breastplate
      'Wrist': [{ wowhead_id: 28502, priority: 'bis' }],  // Vambraces of Courage
      'Hands': [{ wowhead_id: 28505, priority: 'bis' }],  // Gauntlets of Renewed Hope
      'Waist': [{ wowhead_id: 28566, priority: 'bis' }],  // Crimson Girdle of the Indomitable
      'Legs': [{ wowhead_id: 28741, priority: 'bis' }],  // Skulker's Greaves
      'Feet': [{ wowhead_id: 28608, priority: 'bis' }],  // Ironstriders of Urgency
      'Finger': [
        { wowhead_id: 28649, priority: 'bis' },  // Garona's Signet Ring
        { wowhead_id: 28730, priority: 'alt' }   // Mithril Band of the Unscarred
      ],
      'Trinket': [
        { wowhead_id: 28830, priority: 'bis' },  // Dragonspine Trophy
        { wowhead_id: 28579, priority: 'alt' }   // Romulo's Poison Vial
      ],
      'Two-Hand': [{ wowhead_id: 28573, priority: 'bis' }],  // Despair
      'Ranged': [{ wowhead_id: 28504, priority: 'bis' }]  // Steelhawk Crossbow
    }
  },

  // ============================================================================
  // HOLY/DISC PRIEST
  // ============================================================================
  'Holy/Disc Priest': {
    'Karazhan': {
      'Head': [{ wowhead_id: 28804, priority: 'bis' }],  // Helm of the Fallen Defender (T4)
      'Neck': [{ wowhead_id: 28731, priority: 'bis' }],  // Shining Chain of the Afterworld
      'Shoulder': [{ wowhead_id: 28612, priority: 'bis' }],  // Pauldrons of the Solace-Giver
      'Back': [{ wowhead_id: 28765, priority: 'bis' }],  // Stainless Cloak of the Pure Hearted
      'Chest': [{ wowhead_id: 28578, priority: 'bis' }],  // Masquerade Gown
      'Wrist': [{ wowhead_id: 28511, priority: 'bis' }],  // Bands of Indwelling
      'Hands': [{ wowhead_id: 28507, priority: 'bis' }],  // Handwraps of Flowing Thought
      'Waist': [{ wowhead_id: 28652, priority: 'bis' }],  // Cincture of Will
      'Legs': [{ wowhead_id: 28742, priority: 'bis' }],  // Pantaloons of Repentence
      'Feet': [{ wowhead_id: 28517, priority: 'bis' }],  // Boots of Foretelling
      'Finger': [
        { wowhead_id: 28661, priority: 'bis' },  // Mender's Heart-Ring
        { wowhead_id: 28510, priority: 'alt' }   // Spectral Band of Innervation
      ],
      'Trinket': [
        { wowhead_id: 28727, priority: 'bis' },  // Pendant of the Violet Eye
        { wowhead_id: 28528, priority: 'alt' }   // Moroes' Lucky Pocket Watch
      ],
      'Main Hand': [{ wowhead_id: 28771, priority: 'bis' }],  // Light's Justice
      'Held In Off-hand': [{ wowhead_id: 28728, priority: 'bis' }],  // Aran's Soothing Sapphire
      'Ranged': [{ wowhead_id: 28673, priority: 'bis' }]  // Tirisfal Wand of Ascendancy
    }
  },

  // ============================================================================
  // SHADOW PRIEST
  // ============================================================================
  'Shadow Priest': {
    'Karazhan': {
      'Head': [{ wowhead_id: 28804, priority: 'bis' }],  // Helm of the Fallen Defender (T4)
      'Neck': [{ wowhead_id: 28762, priority: 'bis' }],  // Adornment of Stolen Souls
      'Shoulder': [{ wowhead_id: 28726, priority: 'bis' }],  // Mantle of the Mind Flayer
      'Back': [{ wowhead_id: 28766, priority: 'bis' }],  // Ruby Drape of the Mysticant
      'Chest': [{ wowhead_id: 28578, priority: 'bis' }],  // Masquerade Gown
      'Wrist': [{ wowhead_id: 28515, priority: 'bis' }],  // Bands of Nefarious Deeds
      'Hands': [{ wowhead_id: 28507, priority: 'bis' }],  // Handwraps of Flowing Thought
      'Waist': [{ wowhead_id: 28654, priority: 'bis' }],  // Malefic Girdle
      'Legs': [{ wowhead_id: 28742, priority: 'bis' }],  // Pantaloons of Repentence
      'Feet': [{ wowhead_id: 28663, priority: 'bis' }],  // Boots of the Incorrupt
      'Finger': [
        { wowhead_id: 28753, priority: 'bis' },  // Ring of Recurrence
        { wowhead_id: 28793, priority: 'alt' }   // Band of Crimson Fury
      ],
      'Trinket': [
        { wowhead_id: 28789, priority: 'bis' },  // Eye of Magtheridon
        { wowhead_id: 28727, priority: 'alt' }   // Pendant of the Violet Eye
      ],
      'Main Hand': [{ wowhead_id: 28770, priority: 'bis' }],  // Nathrezim Mindblade
      'Held In Off-hand': [{ wowhead_id: 28734, priority: 'bis' }],  // Jewel of Infinite Possibilities
      'Ranged': [{ wowhead_id: 28673, priority: 'bis' }]  // Tirisfal Wand of Ascendancy
    }
  },

  // ============================================================================
  // MAGE
  // ============================================================================
  'Mage': {
    'Karazhan': {
      'Head': [{ wowhead_id: 28804, priority: 'bis' }],  // Helm of the Fallen Defender (T4)
      'Neck': [{ wowhead_id: 28762, priority: 'bis' }],  // Adornment of Stolen Souls
      'Shoulder': [{ wowhead_id: 28726, priority: 'bis' }],  // Mantle of the Mind Flayer
      'Back': [{ wowhead_id: 28766, priority: 'bis' }],  // Ruby Drape of the Mysticant
      'Chest': [{ wowhead_id: 28578, priority: 'bis' }],  // Masquerade Gown
      'Wrist': [{ wowhead_id: 28515, priority: 'bis' }],  // Bands of Nefarious Deeds
      'Hands': [{ wowhead_id: 28507, priority: 'bis' }],  // Handwraps of Flowing Thought
      'Waist': [{ wowhead_id: 28654, priority: 'bis' }],  // Malefic Girdle
      'Legs': [{ wowhead_id: 28742, priority: 'bis' }],  // Pantaloons of Repentence
      'Feet': [{ wowhead_id: 28670, priority: 'bis' }],  // Boots of the Infernal Coven
      'Finger': [
        { wowhead_id: 28753, priority: 'bis' },  // Ring of Recurrence
        { wowhead_id: 28793, priority: 'alt' }   // Band of Crimson Fury
      ],
      'Trinket': [
        { wowhead_id: 28785, priority: 'bis' },  // The Lightning Capacitor
        { wowhead_id: 28727, priority: 'alt' }   // Pendant of the Violet Eye
      ],
      'Main Hand': [{ wowhead_id: 28770, priority: 'bis' }],  // Nathrezim Mindblade
      'Held In Off-hand': [{ wowhead_id: 28734, priority: 'bis' }],  // Jewel of Infinite Possibilities
      'Ranged': [{ wowhead_id: 28673, priority: 'bis' }]  // Tirisfal Wand of Ascendancy
    }
  },

  // ============================================================================
  // HUNTER
  // ============================================================================
  'Hunter': {
    'Karazhan': {
      'Head': [{ wowhead_id: 28804, priority: 'bis' }],  // Helm of the Fallen Defender (T4)
      'Neck': [{ wowhead_id: 28530, priority: 'bis' }],  // Brooch of Unquenchable Fury
      'Shoulder': [{ wowhead_id: 28631, priority: 'bis' }],  // Dragon-Quake Shoulderguards
      'Back': [{ wowhead_id: 28672, priority: 'bis' }],  // Drape of the Dark Reavers
      'Chest': [{ wowhead_id: 28802, priority: 'bis' }],  // Chestguard of the Fallen Defender (T4)
      'Wrist': [{ wowhead_id: 28454, priority: 'bis' }],  // Stalker's War Bands
      'Hands': [{ wowhead_id: 28780, priority: 'bis' }],  // Gloves of the Fallen Defender (T4)
      'Waist': [{ wowhead_id: 28567, priority: 'bis' }],  // Belt of Gale Force
      'Legs': [{ wowhead_id: 28741, priority: 'bis' }],  // Skulker's Greaves
      'Feet': [{ wowhead_id: 28545, priority: 'bis' }],  // Edgewalker Longboots
      'Finger': [
        { wowhead_id: 28649, priority: 'bis' },  // Garona's Signet Ring
        { wowhead_id: 28730, priority: 'alt' }   // Mithril Band of the Unscarred
      ],
      'Trinket': [
        { wowhead_id: 28830, priority: 'bis' },  // Dragonspine Trophy
        { wowhead_id: 28579, priority: 'alt' }   // Romulo's Poison Vial
      ],
      'Two-Hand': [{ wowhead_id: 28587, priority: 'bis' }],  // Legacy
      'Ranged': [{ wowhead_id: 28772, priority: 'bis' }]  // Sunfury Bow of the Phoenix
    }
  },

  // ============================================================================
  // WARLOCK
  // ============================================================================
  'Warlock': {
    'Karazhan': {
      'Head': [{ wowhead_id: 28804, priority: 'bis' }],  // Helm of the Fallen Defender (T4)
      'Neck': [{ wowhead_id: 28762, priority: 'bis' }],  // Adornment of Stolen Souls
      'Shoulder': [{ wowhead_id: 28726, priority: 'bis' }],  // Mantle of the Mind Flayer
      'Back': [{ wowhead_id: 28766, priority: 'bis' }],  // Ruby Drape of the Mysticant
      'Chest': [{ wowhead_id: 28578, priority: 'bis' }],  // Masquerade Gown
      'Wrist': [{ wowhead_id: 28515, priority: 'bis' }],  // Bands of Nefarious Deeds
      'Hands': [{ wowhead_id: 28507, priority: 'bis' }],  // Handwraps of Flowing Thought
      'Waist': [{ wowhead_id: 28654, priority: 'bis' }],  // Malefic Girdle
      'Legs': [{ wowhead_id: 28742, priority: 'bis' }],  // Pantaloons of Repentence
      'Feet': [{ wowhead_id: 28670, priority: 'bis' }],  // Boots of the Infernal Coven
      'Finger': [
        { wowhead_id: 28753, priority: 'bis' },  // Ring of Recurrence
        { wowhead_id: 28793, priority: 'alt' }   // Band of Crimson Fury
      ],
      'Trinket': [
        { wowhead_id: 28789, priority: 'bis' },  // Eye of Magtheridon
        { wowhead_id: 28727, priority: 'alt' }   // Pendant of the Violet Eye
      ],
      'Main Hand': [{ wowhead_id: 28770, priority: 'bis' }],  // Nathrezim Mindblade
      'Held In Off-hand': [{ wowhead_id: 28734, priority: 'bis' }],  // Jewel of Infinite Possibilities
      'Ranged': [{ wowhead_id: 28673, priority: 'bis' }]  // Tirisfal Wand of Ascendancy
    }
  },

  // ============================================================================
  // ROGUE
  // ============================================================================
  'Rogue': {
    'Karazhan': {
      'Head': [{ wowhead_id: 28804, priority: 'bis' }],  // Helm of the Fallen Defender (T4)
      'Neck': [{ wowhead_id: 28674, priority: 'bis' }],  // Saberclaw Talisman
      'Shoulder': [{ wowhead_id: 28755, priority: 'bis' }],  // Bladed Shoulderpads of the Merciless
      'Back': [{ wowhead_id: 28672, priority: 'bis' }],  // Drape of the Dark Reavers
      'Chest': [{ wowhead_id: 28601, priority: 'bis' }],  // Chestguard of the Fallen Hero (T4)
      'Wrist': [{ wowhead_id: 28453, priority: 'bis' }],  // Bracers of the White Stag
      'Hands': [{ wowhead_id: 28506, priority: 'bis' }],  // Gloves of Dexterous Manipulation
      'Waist': [{ wowhead_id: 28656, priority: 'bis' }],  // Girdle of the Prowler
      'Legs': [{ wowhead_id: 28741, priority: 'bis' }],  // Skulker's Greaves
      'Feet': [{ wowhead_id: 28545, priority: 'bis' }],  // Edgewalker Longboots
      'Finger': [
        { wowhead_id: 28649, priority: 'bis' },  // Garona's Signet Ring
        { wowhead_id: 28730, priority: 'alt' }   // Mithril Band of the Unscarred
      ],
      'Trinket': [
        { wowhead_id: 28830, priority: 'bis' },  // Dragonspine Trophy
        { wowhead_id: 28579, priority: 'alt' }   // Romulo's Poison Vial
      ],
      'One-Hand': [
        { wowhead_id: 28729, priority: 'bis' },  // Spiteblade
        { wowhead_id: 28524, priority: 'alt' }   // Emerald Ripper
      ],
      'Ranged': [{ wowhead_id: 28504, priority: 'bis' }]  // Steelhawk Crossbow
    }
  }
}

/**
 * Get BIS items for a spec and tier
 */
export function getBisItems(specName: string, tierName: string): BisTierData | null {
  const specData = TBC_BIS[specName]
  if (!specData) return null
  return specData[tierName] || null
}

/**
 * Get all BIS wowhead IDs for a spec and tier (flattened)
 */
export function getBisWowheadIds(specName: string, tierName: string): number[] {
  const tierData = getBisItems(specName, tierName)
  if (!tierData) return []

  const ids: number[] = []
  Object.values(tierData).forEach(items => {
    items.forEach(item => ids.push(item.wowhead_id))
  })
  return ids
}
