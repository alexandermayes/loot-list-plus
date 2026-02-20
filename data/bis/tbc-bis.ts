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
  dps_gain?: number  // Expected DPS/HPS gain from this item (from WoWSims data)
  stat_weight?: number  // Weighted stat value for ranking
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
      'Head': [{ wowhead_id: 29760, priority: 'bis' }],  // Helm of the Fallen Champion (T4 token)
      'Neck': [{ wowhead_id: 28731, priority: 'bis' }],  // Shining Chain of the Afterworld
      'Shoulder': [{ wowhead_id: 28612, priority: 'bis' }],  // Pauldrons of the Solace-Giver
      'Back': [{ wowhead_id: 28765, priority: 'bis' }],  // Stainless Cloak of the Pure Hearted
      'Chest': [{ wowhead_id: 28662, priority: 'bis' }],  // Breastplate of the Lightbinder
      'Wrist': [{ wowhead_id: 28511, priority: 'bis' }],  // Bands of Indwelling
      'Hands': [{ wowhead_id: 29757, priority: 'bis' }],  // Gloves of the Fallen Champion (T4 token)
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
    "Gruul's Lair": {
      'Shoulder': [{ wowhead_id: 29763, priority: 'bis' }],  // Pauldrons of the Fallen Champion (T4 token)
      'Legs': [{ wowhead_id: 29766, priority: 'bis' }]  // Leggings of the Fallen Champion (T4 token)
    },
    "Magtheridon's Lair": {
      'Chest': [{ wowhead_id: 29754, priority: 'bis' }],  // Chestguard of the Fallen Champion (T4 token)
      'Neck': [{ wowhead_id: 28781, priority: 'alt' }]  // Karaborian Talisman
    },
    'Serpentshrine Cavern': {
      'Head': [{ wowhead_id: 30242, priority: 'bis' }],  // Helm of the Vanquished Champion (T5 token)
      'Neck': [{ wowhead_id: 30018, priority: 'bis' }],  // Lord Sanguinar's Claim
      'Shoulder': [{ wowhead_id: 30248, priority: 'bis' }],  // Pauldrons of the Vanquished Champion (T5 token)
      'Chest': [{ wowhead_id: 30236, priority: 'bis' }],  // Chestguard of the Vanquished Champion (T5 token)
      'Waist': [{ wowhead_id: 30038, priority: 'bis' }],  // Belt of One-Hundred Deaths
      'Legs': [{ wowhead_id: 30245, priority: 'bis' }],  // Leggings of the Vanquished Champion (T5 token)
      'Hands': [{ wowhead_id: 30239, priority: 'bis' }],  // Gloves of the Vanquished Champion (T5 token)
      'Trinket': [
        { wowhead_id: 30664, priority: 'bis' }  // Living Root of the Wildheart
      ]
    },
    'Tempest Keep': {
      'Head': [{ wowhead_id: 30242, priority: 'bis' }],  // Helm of the Vanquished Champion (T5 token)
      'Shoulder': [{ wowhead_id: 30248, priority: 'bis' }],  // Pauldrons of the Vanquished Champion (T5 token)
      'Chest': [{ wowhead_id: 30236, priority: 'bis' }],  // Chestguard of the Vanquished Champion (T5 token)
      'Wrist': [{ wowhead_id: 29918, priority: 'alt' }],  // Mindstorm Wristbands
      'Waist': [{ wowhead_id: 30038, priority: 'alt' }],  // Belt of Blasting (crafted, but useful)
      'Main Hand': [{ wowhead_id: 30723, priority: 'bis' }]  // Talon of the Phoenix
    },
    'Hyjal Summit': {
      'Head': [{ wowhead_id: 31097, priority: 'bis' }],  // Helm of the Forgotten Conqueror (T6 token)
      'Hands': [{ wowhead_id: 31092, priority: 'bis' }],  // Gloves of the Forgotten Conqueror (T6 token)
      'Main Hand': [{ wowhead_id: 30885, priority: 'bis' }],  // Hammer of Atonement
      'Waist': [{ wowhead_id: 30914, priority: 'alt' }]  // Belt of the Crescent Moon
    },
    'Black Temple': {
      'Head': [{ wowhead_id: 30987, priority: 'bis' }],  // Lightbringer Faceguard (T6)
      'Neck': [{ wowhead_id: 32370, priority: 'bis' }],  // Nadina's Pendant of Purity
      'Shoulder': [{ wowhead_id: 31101, priority: 'bis' }],  // Pauldrons of the Forgotten Conqueror (T6 token)
      'Back': [{ wowhead_id: 32524, priority: 'bis' }],  // Shroud of the Highborne
      'Chest': [{ wowhead_id: 31089, priority: 'bis' }],  // Chestguard of the Forgotten Conqueror (T6 token)
      'Wrist': [{ wowhead_id: 32516, priority: 'bis' }],  // Wristbands of Divine Influence
      'Hands': [{ wowhead_id: 30985, priority: 'bis' }],  // Lightbringer Gauntlets (T6)
      'Waist': [{ wowhead_id: 32528, priority: 'bis' }],  // Belt of Divine Inspiration
      'Legs': [{ wowhead_id: 31098, priority: 'bis' }],  // Leggings of the Forgotten Conqueror (T6 token)
      'Feet': [{ wowhead_id: 32517, priority: 'bis' }],  // Treads of the Den Mother
      'Finger': [
        { wowhead_id: 32528, priority: 'bis' },  // Ring of Ancient Knowledge
        { wowhead_id: 32247, priority: 'alt' }   // Ring of Captured Storms
      ],
      'Trinket': [
        { wowhead_id: 32496, priority: 'bis' },  // Memento of Tyrande
        { wowhead_id: 34429, priority: 'alt' }   // Shifting Naaru Sliver
      ],
      'Main Hand': [{ wowhead_id: 32500, priority: 'bis' }],  // Crystal Spire of Karabor
      'Held In Off-hand': [{ wowhead_id: 32361, priority: 'bis' }],  // Blade of Savagery
      'Relic': [{ wowhead_id: 32368, priority: 'bis' }]  // Tome of Fiery Redemption
    },
    "Zul'Aman": {
      'Head': [{ wowhead_id: 33453, priority: 'alt' }],  // Mojo-mender's Mask
      'Trinket': [{ wowhead_id: 33829, priority: 'alt' }],  // Hex Shrunken Head
      'Main Hand': [{ wowhead_id: 33354, priority: 'alt' }]  // Amani Divining Staff (2H, use as MH equivalent)
    },
    'Sunwell Plateau': {
      'Two-Hand': [{ wowhead_id: 34337, priority: 'bis' }],  // Golden Staff of the Sin'dorei
      'Trinket': [{ wowhead_id: 34430, priority: 'bis' }],  // Glimmering Naaru Sliver
      'Chest': [{ wowhead_id: 34215, priority: 'bis' }]  // Robes of Faltered Light
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
    },
    "Gruul's Lair": {
      'Shoulder': [{ wowhead_id: 29763, priority: 'bis' }],  // Pauldrons of the Fallen Champion (T4 token)
      'Legs': [{ wowhead_id: 29766, priority: 'bis' }],  // Leggings of the Fallen Champion (T4 token)
      'Trinket': [{ wowhead_id: 28830, priority: 'bis' }],  // Dragonspine Trophy
      'Hands': [{ wowhead_id: 28827, priority: 'alt' }]  // Gauntlets of Martial Perfection
    },
    "Magtheridon's Lair": {
      'Chest': [{ wowhead_id: 29754, priority: 'bis' }],  // Chestguard of the Fallen Champion (T4 token)
      'Waist': [{ wowhead_id: 28778, priority: 'alt' }]  // Terror Pit Girdle
    },
    'Serpentshrine Cavern': {
      'Head': [{ wowhead_id: 32461, priority: 'bis' }],  // Furious Gizmatic Goggles
      'Neck': [{ wowhead_id: 30022, priority: 'bis' }],  // Pendant of the Perilous
      'Shoulder': [{ wowhead_id: 30055, priority: 'bis' }],  // Shoulderpads of the Stranger
      'Back': [{ wowhead_id: 30098, priority: 'bis' }],  // Razor-Scale Battlecloak
      'Chest': [{ wowhead_id: 30236, priority: 'bis' }],  // Chestguard of the Vanquished Champion (T5 token)
      'Wrist': [{ wowhead_id: 30057, priority: 'bis' }],  // Bracers of Eradication
      'Hands': [{ wowhead_id: 29947, priority: 'bis' }],  // Gloves of the Searing Grip
      'Waist': [{ wowhead_id: 30106, priority: 'bis' }],  // Belt of One-Hundred Deaths
      'Legs': [{ wowhead_id: 29950, priority: 'bis' }],  // Greaves of the Bloodwarder
      'Feet': [{ wowhead_id: 30081, priority: 'bis' }],  // Warboots of Obliteration
      'Finger': [
        { wowhead_id: 30834, priority: 'bis' },  // Shapeshifter's Signet
        { wowhead_id: 29997, priority: 'alt' }   // Band of the Ranger-General
      ],
      'Trinket': [
        { wowhead_id: 29383, priority: 'bis' },  // Bloodlust Brooch
        { wowhead_id: 28830, priority: 'bis' }   // Dragonspine Trophy
      ],
      'Two-Hand': [
        { wowhead_id: 28430, priority: 'bis' },  // Lionheart Executioner
        { wowhead_id: 29993, priority: 'alt' }   // Twinblade of the Phoenix
      ],
      'Relic': [{ wowhead_id: 27484, priority: 'bis' }]  // Libram of Avengement
    },
    'Tempest Keep': {
      'Head': [{ wowhead_id: 30242, priority: 'bis' }],  // Helm of the Vanquished Champion (T5 token)
      'Shoulder': [{ wowhead_id: 30248, priority: 'bis' }],  // Pauldrons of the Vanquished Champion (T5 token)
      'Chest': [{ wowhead_id: 30236, priority: 'bis' }],  // Chestguard of the Vanquished Champion (T5 token)
      'Back': [{ wowhead_id: 30098, priority: 'bis' }],  // Razor-Scale Battlecloak
      'Trinket': [{ wowhead_id: 30627, priority: 'bis' }],  // Tsunami Talisman
      'Two-Hand': [{ wowhead_id: 30311, priority: 'bis' }]  // Warp Slicer
    },
    'Hyjal Summit': {
      'Head': [{ wowhead_id: 31097, priority: 'bis' }],  // Helm of the Forgotten Conqueror (T6)
      'Hands': [{ wowhead_id: 31092, priority: 'bis' }],  // Gloves of the Forgotten Conqueror (T6)
      'Shoulder': [{ wowhead_id: 30884, priority: 'alt' }],  // Hatefury Mantle
      'Two-Hand': [{ wowhead_id: 30910, priority: 'bis' }]  // Cataclysm's Edge
    },
    'Black Temple': {
      'Head': [{ wowhead_id: 30989, priority: 'bis' }],  // Lightbringer War-Helm (T6)
      'Neck': [{ wowhead_id: 32362, priority: 'bis' }],  // Pendant of the Titans
      'Shoulder': [{ wowhead_id: 31101, priority: 'bis' }],  // Pauldrons of the Forgotten Conqueror (T6 token)
      'Back': [{ wowhead_id: 32323, priority: 'bis' }],  // Shadowmoon Destroyer's Drape
      'Chest': [{ wowhead_id: 31089, priority: 'bis' }],  // Chestguard of the Forgotten Conqueror (T6 token)
      'Wrist': [{ wowhead_id: 32574, priority: 'bis' }],  // Bindings of Lightning Reflexes
      'Hands': [{ wowhead_id: 30982, priority: 'bis' }],  // Lightbringer Gloves (T6)
      'Waist': [{ wowhead_id: 32232, priority: 'bis' }],  // Belt of Primal Majesty
      'Legs': [{ wowhead_id: 31098, priority: 'bis' }],  // Leggings of the Forgotten Conqueror (T6 token)
      'Feet': [{ wowhead_id: 32510, priority: 'bis' }],  // Shadowmaster's Boots
      'Finger': [
        { wowhead_id: 32526, priority: 'bis' },  // Band of the Eternal Champion
        { wowhead_id: 32261, priority: 'alt' }   // Ring of Deceitful Intent
      ],
      'Trinket': [
        { wowhead_id: 32505, priority: 'bis' },  // Madness of the Betrayer
        { wowhead_id: 28830, priority: 'bis' }   // Dragonspine Trophy
      ],
      'Two-Hand': [{ wowhead_id: 32332, priority: 'bis' }],  // Torch of the Damned
      'Relic': [{ wowhead_id: 27484, priority: 'bis' }]  // Libram of Avengement
    },
    "Zul'Aman": {
      'Two-Hand': [{ wowhead_id: 33478, priority: 'alt' }],  // Jin'rokh, The Great Apocalypse
      'Neck': [{ wowhead_id: 33296, priority: 'alt' }],  // Brooch of Nature's Mercy
      'Waist': [{ wowhead_id: 33211, priority: 'alt' }]  // Blood-Stained Pauldrons
    },
    'Sunwell Plateau': {
      'Two-Hand': [{ wowhead_id: 34247, priority: 'bis' }],  // Apolyon, the Soul-Render
      'Trinket': [{ wowhead_id: 34427, priority: 'bis' }],  // Blackened Naaru Sliver
      'Neck': [{ wowhead_id: 34358, priority: 'bis' }]  // Hard Khorium Choker
    }
  },

  // ============================================================================
  // PROTECTION PALADIN
  // ============================================================================
  'Protection Paladin': {
    'Karazhan': {
      'Head': [{ wowhead_id: 29760, priority: 'bis' }],  // Helm of the Fallen Champion (T4 token)
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
    },
    "Gruul's Lair": {
      'Shoulder': [{ wowhead_id: 29763, priority: 'bis' }],  // Pauldrons of the Fallen Champion (T4 token)
      'Legs': [{ wowhead_id: 29766, priority: 'bis' }],  // Leggings of the Fallen Champion (T4 token)
      'Head': [{ wowhead_id: 28795, priority: 'alt' }]  // Maulgar's Warhelm
    },
    "Magtheridon's Lair": {
      'Chest': [{ wowhead_id: 29754, priority: 'bis' }],  // Chestguard of the Fallen Champion (T4 token)
      'Waist': [{ wowhead_id: 28779, priority: 'alt' }]  // Girdle of the Endless Pit
    },
    'Serpentshrine Cavern': {
      'Head': [
        { wowhead_id: 30242, priority: 'bis' },  // Helm of the Vanquished Champion (T5 token)
        { wowhead_id: 32473, priority: 'alt' }   // Tankatronic Goggles
      ],
      'Neck': [{ wowhead_id: 30007, priority: 'bis' }],  // The Darkener's Grasp
      'Shoulder': [{ wowhead_id: 30248, priority: 'bis' }],  // Pauldrons of the Vanquished Champion (T5 token)
      'Back': [{ wowhead_id: 30084, priority: 'bis' }],  // Crimson Paragon's Cover
      'Chest': [{ wowhead_id: 30236, priority: 'bis' }],  // Chestguard of the Vanquished Champion (T5 token)
      'Wrist': [{ wowhead_id: 29463, priority: 'bis' }],  // Sha'tari Vindicator's Waistguard
      'Hands': [{ wowhead_id: 30239, priority: 'bis' }],  // Gloves of the Vanquished Champion (T5 token)
      'Waist': [{ wowhead_id: 30096, priority: 'bis' }],  // Girdle of the Invulnerable
      'Legs': [{ wowhead_id: 30245, priority: 'bis' }],  // Leggings of the Vanquished Champion (T5 token)
      'Feet': [{ wowhead_id: 30020, priority: 'bis' }],  // Fire Crest Breastplate
      'Finger': [
        { wowhead_id: 30834, priority: 'bis' },  // Shapeshifter's Signet
        { wowhead_id: 29279, priority: 'alt' }   // Band of Eternity
      ],
      'Trinket': [
        { wowhead_id: 32534, priority: 'bis' },  // Brooch of the Immortal King
        { wowhead_id: 30629, priority: 'alt' }   // Scarab of Displacement
      ],
      'Main Hand': [{ wowhead_id: 30058, priority: 'bis' }],  // Mallet of the Tides
      'Off Hand': [{ wowhead_id: 29176, priority: 'bis' }],  // Aegis of the Vindicator
      'Relic': [{ wowhead_id: 27917, priority: 'bis' }]  // Libram of Repentance
    },
    'Tempest Keep': {
      'Head': [{ wowhead_id: 30242, priority: 'bis' }],  // Helm of the Vanquished Champion (T5 token)
      'Shoulder': [{ wowhead_id: 30248, priority: 'bis' }],  // Pauldrons of the Vanquished Champion (T5 token)
      'Chest': [{ wowhead_id: 30236, priority: 'bis' }],  // Chestguard of the Vanquished Champion (T5 token)
      'Trinket': [{ wowhead_id: 30629, priority: 'bis' }],  // Scarab of Displacement
      'Main Hand': [{ wowhead_id: 30058, priority: 'alt' }]  // Mallet of the Tides
    },
    'Hyjal Summit': {
      'Head': [{ wowhead_id: 31097, priority: 'bis' }],  // Helm of the Forgotten Conqueror (T6)
      'Hands': [{ wowhead_id: 31092, priority: 'bis' }],  // Gloves of the Forgotten Conqueror (T6)
      'Off Hand': [{ wowhead_id: 30881, priority: 'bis' }],  // Kaz'rogal's Hardened Heart
      'Shoulder': [{ wowhead_id: 30894, priority: 'alt' }]  // Glimmering Steel Mantle
    },
    'Black Temple': {
      'Head': [{ wowhead_id: 30988, priority: 'bis' }],  // Lightbringer Greathelm (T6)
      'Neck': [{ wowhead_id: 32362, priority: 'bis' }],  // Pendant of the Titans
      'Shoulder': [{ wowhead_id: 31101, priority: 'bis' }],  // Pauldrons of the Forgotten Conqueror (T6 token)
      'Back': [{ wowhead_id: 32331, priority: 'bis' }],  // Cloak of the Pit Stalker
      'Chest': [{ wowhead_id: 31089, priority: 'bis' }],  // Chestguard of the Forgotten Conqueror (T6 token)
      'Wrist': [{ wowhead_id: 32515, priority: 'bis' }],  // Swiftsteel Bracers
      'Hands': [{ wowhead_id: 30983, priority: 'bis' }],  // Lightbringer Handguards (T6)
      'Waist': [{ wowhead_id: 32232, priority: 'bis' }],  // Belt of Primal Majesty
      'Legs': [{ wowhead_id: 31098, priority: 'bis' }],  // Leggings of the Forgotten Conqueror (T6 token)
      'Feet': [{ wowhead_id: 32268, priority: 'bis' }],  // Boots of the Protector
      'Finger': [
        { wowhead_id: 32526, priority: 'bis' },  // Band of the Eternal Champion
        { wowhead_id: 32335, priority: 'alt' }   // Ring of Ancient Knowledge
      ],
      'Trinket': [
        { wowhead_id: 32501, priority: 'bis' },  // Shadowmoon Insignia
        { wowhead_id: 32534, priority: 'alt' }   // Brooch of the Immortal King
      ],
      'Main Hand': [{ wowhead_id: 32262, priority: 'bis' }],  // Siphon of the Nathrezim
      'Off Hand': [{ wowhead_id: 32375, priority: 'bis' }],  // Bulwark of Azzinoth
      'Relic': [{ wowhead_id: 27917, priority: 'bis' }]  // Libram of Repentance
    },
    "Zul'Aman": {
      'Off Hand': [{ wowhead_id: 33463, priority: 'alt' }],  // Amani Punisher (can be used as tank weapon)
      'Neck': [{ wowhead_id: 33278, priority: 'alt' }],  // Choker of Serrated Blades
      'Back': [{ wowhead_id: 33592, priority: 'alt' }]  // Cloak of Fiends
    },
    'Sunwell Plateau': {
      'Off Hand': [{ wowhead_id: 34185, priority: 'bis' }],  // Sword Breaker's Bulwark
      'Trinket': [{ wowhead_id: 34428, priority: 'bis' }],  // Steely Naaru Sliver
      'Shoulder': [{ wowhead_id: 34164, priority: 'bis' }]  // Pauldrons of Perseverance
    }
  },

  // ============================================================================
  // RESTORATION SHAMAN
  // ============================================================================
  'Restoration Shaman': {
    'Karazhan': {
      'Head': [{ wowhead_id: 29760, priority: 'bis' }],  // Helm of the Fallen Champion (T4 token)
      'Neck': [{ wowhead_id: 28731, priority: 'bis' }],  // Shining Chain of the Afterworld
      'Shoulder': [{ wowhead_id: 28647, priority: 'bis' }],  // Forest Wind Shoulderpads
      'Back': [{ wowhead_id: 28765, priority: 'bis' }],  // Stainless Cloak of the Pure Hearted
      'Chest': [{ wowhead_id: 28735, priority: 'bis' }],  // Earthblood Chestguard
      'Wrist': [{ wowhead_id: 28511, priority: 'alt' }],  // Bands of Indwelling
      'Hands': [{ wowhead_id: 29757, priority: 'bis' }],  // Gloves of the Fallen Champion (T4 token)
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
    },
    "Gruul's Lair": {
      'Shoulder': [{ wowhead_id: 29763, priority: 'bis' }],  // Pauldrons of the Fallen Champion (T4 token)
      'Legs': [{ wowhead_id: 29766, priority: 'bis' }]  // Leggings of the Fallen Champion (T4 token)
    },
    "Magtheridon's Lair": {
      'Chest': [{ wowhead_id: 29754, priority: 'bis' }],  // Chestguard of the Fallen Champion (T4 token)
      'Neck': [{ wowhead_id: 28781, priority: 'alt' }]  // Karaborian Talisman
    },
    'Serpentshrine Cavern': {
      'Head': [{ wowhead_id: 30242, priority: 'bis' }],  // Helm of the Vanquished Champion (T5 token)
      'Neck': [{ wowhead_id: 30018, priority: 'bis' }],  // Lord Sanguinar's Claim
      'Shoulder': [{ wowhead_id: 30248, priority: 'bis' }],  // Pauldrons of the Vanquished Champion (T5 token)
      'Back': [{ wowhead_id: 30008, priority: 'bis' }],  // Devastation
      'Chest': [{ wowhead_id: 30236, priority: 'bis' }],  // Chestguard of the Vanquished Champion (T5 token)
      'Wrist': [{ wowhead_id: 29918, priority: 'bis' }],  // Mindstorm Wristbands
      'Hands': [{ wowhead_id: 30239, priority: 'bis' }],  // Gloves of the Vanquished Champion (T5 token)
      'Waist': [{ wowhead_id: 30038, priority: 'bis' }],  // Belt of Blasting
      'Legs': [{ wowhead_id: 30245, priority: 'bis' }],  // Leggings of the Vanquished Champion (T5 token)
      'Feet': [{ wowhead_id: 30037, priority: 'bis' }],  // Boots of Blasting
      'Finger': [
        { wowhead_id: 30109, priority: 'bis' },  // Ring of Endless Coils
        { wowhead_id: 29309, priority: 'alt' }   // Ring of Unrelenting Storms
      ],
      'Trinket': [
        { wowhead_id: 30664, priority: 'bis' },  // Living Root of the Wildheart
        { wowhead_id: 29376, priority: 'alt' }   // Essence of the Martyr
      ],
      'Main Hand': [{ wowhead_id: 30095, priority: 'bis' }],  // Fang of the Leviathan
      'Off Hand': [{ wowhead_id: 30049, priority: 'bis' }],  // Fathomstone
      'Relic': [{ wowhead_id: 30023, priority: 'bis' }]  // Totem of the Maelstrom
    },
    'Tempest Keep': {
      'Head': [{ wowhead_id: 30242, priority: 'bis' }],  // Helm of the Vanquished Champion (T5 token)
      'Shoulder': [{ wowhead_id: 30248, priority: 'bis' }],  // Pauldrons of the Vanquished Champion (T5 token)
      'Chest': [{ wowhead_id: 30236, priority: 'bis' }],  // Chestguard of the Vanquished Champion (T5 token)
      'Main Hand': [{ wowhead_id: 30723, priority: 'bis' }],  // Talon of the Phoenix
      'Off Hand': [{ wowhead_id: 30049, priority: 'alt' }]  // Fathomstone
    },
    'Hyjal Summit': {
      'Head': [{ wowhead_id: 31095, priority: 'bis' }],  // Helm of the Forgotten Protector (T6)
      'Hands': [{ wowhead_id: 31094, priority: 'bis' }],  // Gloves of the Forgotten Protector (T6)
      'Main Hand': [{ wowhead_id: 30885, priority: 'bis' }],  // Hammer of Atonement
      'Waist': [{ wowhead_id: 30914, priority: 'alt' }]  // Belt of the Crescent Moon
    },
    'Black Temple': {
      'Head': [{ wowhead_id: 31015, priority: 'bis' }],  // Skyshatter Headguard (T6)
      'Neck': [{ wowhead_id: 32370, priority: 'bis' }],  // Nadina's Pendant of Purity
      'Shoulder': [{ wowhead_id: 31103, priority: 'bis' }],  // Pauldrons of the Forgotten Protector (T6 token)
      'Back': [{ wowhead_id: 32524, priority: 'bis' }],  // Shroud of the Highborne
      'Chest': [{ wowhead_id: 31091, priority: 'bis' }],  // Chestguard of the Forgotten Protector (T6 token)
      'Wrist': [{ wowhead_id: 32516, priority: 'bis' }],  // Wristbands of Divine Influence
      'Hands': [{ wowhead_id: 31007, priority: 'bis' }],  // Skyshatter Gloves (T6)
      'Waist': [{ wowhead_id: 32528, priority: 'bis' }],  // Belt of Divine Inspiration
      'Legs': [{ wowhead_id: 31100, priority: 'bis' }],  // Leggings of the Forgotten Protector (T6 token)
      'Feet': [{ wowhead_id: 32517, priority: 'bis' }],  // Treads of the Den Mother
      'Finger': [
        { wowhead_id: 32247, priority: 'bis' },  // Ring of Captured Storms
        { wowhead_id: 32528, priority: 'alt' }   // Ring of Ancient Knowledge
      ],
      'Trinket': [
        { wowhead_id: 32496, priority: 'bis' },  // Memento of Tyrande
        { wowhead_id: 34429, priority: 'alt' }   // Shifting Naaru Sliver
      ],
      'Main Hand': [{ wowhead_id: 32500, priority: 'bis' }],  // Crystal Spire of Karabor
      'Off Hand': [{ wowhead_id: 32361, priority: 'bis' }],  // Blind-Seers Icon
      'Relic': [{ wowhead_id: 32368, priority: 'bis' }]  // Totem of the Maelstrom
    },
    "Zul'Aman": {
      'Head': [{ wowhead_id: 33453, priority: 'alt' }],  // Mojo-mender's Mask
      'Trinket': [{ wowhead_id: 33829, priority: 'alt' }],  // Hex Shrunken Head
      'Main Hand': [{ wowhead_id: 33354, priority: 'alt' }]  // Amani Divining Staff
    },
    'Sunwell Plateau': {
      'Two-Hand': [{ wowhead_id: 34337, priority: 'bis' }],  // Golden Staff of the Sin'dorei
      'Trinket': [{ wowhead_id: 34430, priority: 'bis' }],  // Glimmering Naaru Sliver
      'Chest': [{ wowhead_id: 34233, priority: 'bis' }]  // Robes of Faltered Light
    }
  },

  // ============================================================================
  // ELEMENTAL SHAMAN
  // ============================================================================
  'Elemental Shaman': {
    'Karazhan': {
      'Head': [{ wowhead_id: 29760, priority: 'bis' }],  // Helm of the Fallen Champion (T4 token)
      'Neck': [{ wowhead_id: 28762, priority: 'bis' }],  // Adornment of Stolen Souls
      'Shoulder': [{ wowhead_id: 28726, priority: 'bis' }],  // Mantle of the Mind Flayer
      'Back': [{ wowhead_id: 28766, priority: 'bis' }],  // Ruby Drape of the Mysticant
      'Chest': [{ wowhead_id: 29754, priority: 'bis' }],  // Chestguard of the Fallen Champion (T4 token)
      'Wrist': [{ wowhead_id: 28515, priority: 'bis' }],  // Bands of Nefarious Deeds
      'Hands': [{ wowhead_id: 29757, priority: 'bis' }],  // Gloves of the Fallen Champion (T4 token)
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
    },
    "Gruul's Lair": {
      'Shoulder': [{ wowhead_id: 29763, priority: 'bis' }],  // Pauldrons of the Fallen Champion (T4 token)
      'Legs': [{ wowhead_id: 29766, priority: 'bis' }],  // Leggings of the Fallen Champion (T4 token)
      'Finger': [{ wowhead_id: 28823, priority: 'alt' }]  // Eye of Gruul
    },
    "Magtheridon's Lair": {
      'Chest': [{ wowhead_id: 29754, priority: 'bis' }],  // Chestguard of the Fallen Champion (T4 token)
      'Trinket': [{ wowhead_id: 28789, priority: 'bis' }],  // Eye of Magtheridon
      'Ranged': [{ wowhead_id: 28782, priority: 'bis' }]  // Eredar Wand of Obliteration
    },
    'Serpentshrine Cavern': {
      'Head': [
        { wowhead_id: 30242, priority: 'bis' },  // Helm of the Vanquished Champion (T5 token)
        { wowhead_id: 29035, priority: 'alt' }   // Cyclone Faceguard (T4)
      ],
      'Neck': [{ wowhead_id: 30015, priority: 'bis' }],  // The Sun King's Talisman
      'Shoulder': [
        { wowhead_id: 30248, priority: 'bis' },  // Pauldrons of the Vanquished Champion (T5 token)
        { wowhead_id: 29037, priority: 'alt' }   // Cyclone Shoulderguards (T4)
      ],
      'Back': [{ wowhead_id: 29992, priority: 'bis' }],  // Royal Cloak of the Sunstriders
      'Chest': [
        { wowhead_id: 30236, priority: 'bis' },  // Chestguard of the Vanquished Champion (T5 token)
        { wowhead_id: 30107, priority: 'alt' }   // Vestments of the Sea-Witch
      ],
      'Wrist': [{ wowhead_id: 29918, priority: 'bis' }],  // Mindstorm Wristbands
      'Hands': [{ wowhead_id: 30239, priority: 'bis' }],  // Gloves of the Vanquished Champion (T5 token)
      'Waist': [{ wowhead_id: 30038, priority: 'bis' }],  // Belt of Blasting
      'Legs': [{ wowhead_id: 30245, priority: 'bis' }],  // Leggings of the Vanquished Champion (T5 token)
      'Feet': [{ wowhead_id: 30037, priority: 'bis' }],  // Boots of Blasting
      'Finger': [
        { wowhead_id: 30109, priority: 'bis' },  // Ring of Endless Coils
        { wowhead_id: 29922, priority: 'alt' }   // Band of Al'ar
      ],
      'Trinket': [
        { wowhead_id: 30626, priority: 'bis' },  // Sextant of Unstable Currents
        { wowhead_id: 29370, priority: 'bis' }   // Icon of the Silver Crescent
      ],
      'Main Hand': [{ wowhead_id: 30095, priority: 'bis' }],  // Fang of the Leviathan
      'Off Hand': [{ wowhead_id: 30049, priority: 'bis' }],  // Fathomstone
      'Relic': [{ wowhead_id: 29389, priority: 'bis' }]  // Totem of the Void
    },
    'Tempest Keep': {
      'Head': [{ wowhead_id: 30242, priority: 'bis' }],  // Helm of the Vanquished Champion (T5 token)
      'Shoulder': [{ wowhead_id: 30248, priority: 'bis' }],  // Pauldrons of the Vanquished Champion (T5 token)
      'Chest': [{ wowhead_id: 30236, priority: 'bis' }],  // Chestguard of the Vanquished Champion (T5 token)
      'Trinket': [{ wowhead_id: 30626, priority: 'bis' }],  // Sextant of Unstable Currents
      'Main Hand': [{ wowhead_id: 30723, priority: 'bis' }]  // Talon of the Phoenix
    },
    'Hyjal Summit': {
      'Head': [{ wowhead_id: 31095, priority: 'bis' }],  // Helm of the Forgotten Protector (T6)
      'Hands': [{ wowhead_id: 31094, priority: 'bis' }],  // Gloves of the Forgotten Protector (T6)
      'Two-Hand': [{ wowhead_id: 30910, priority: 'bis' }],  // Tempest of Chaos
      'Legs': [{ wowhead_id: 30912, priority: 'alt' }]  // Leggings of Eternity
    },
    'Black Temple': {
      'Head': [{ wowhead_id: 31014, priority: 'bis' }],  // Skyshatter Helmet (T6)
      'Neck': [{ wowhead_id: 32349, priority: 'bis' }],  // Amulet of Unfettered Magics
      'Shoulder': [{ wowhead_id: 31103, priority: 'bis' }],  // Pauldrons of the Forgotten Protector (T6 token)
      'Back': [{ wowhead_id: 32337, priority: 'bis' }],  // Cloak of the Illidari Council
      'Chest': [{ wowhead_id: 31091, priority: 'bis' }],  // Chestguard of the Forgotten Protector (T6 token)
      'Wrist': [{ wowhead_id: 32586, priority: 'bis' }],  // Bracers of Nimble Thought
      'Hands': [{ wowhead_id: 31008, priority: 'bis' }],  // Skyshatter Gauntlets (T6)
      'Waist': [{ wowhead_id: 32256, priority: 'bis' }],  // Waistwrap of Infinity
      'Legs': [{ wowhead_id: 31100, priority: 'bis' }],  // Leggings of the Forgotten Protector (T6 token)
      'Feet': [{ wowhead_id: 32239, priority: 'bis' }],  // Slippers of the Seacaller
      'Finger': [
        { wowhead_id: 32527, priority: 'bis' },  // Ring of Captured Storms
        { wowhead_id: 32247, priority: 'alt' }   // Band of the Eternal Sage
      ],
      'Trinket': [
        { wowhead_id: 32483, priority: 'bis' },  // The Skull of Gul'dan
        { wowhead_id: 34429, priority: 'alt' }   // Shifting Naaru Sliver
      ],
      'Two-Hand': [{ wowhead_id: 32374, priority: 'bis' }],  // Zhar'doom, Greatstaff of the Devourer
      'Relic': [{ wowhead_id: 29389, priority: 'bis' }]  // Totem of the Void
    },
    "Zul'Aman": {
      'Two-Hand': [{ wowhead_id: 33354, priority: 'alt' }],  // Amani Divining Staff
      'Trinket': [{ wowhead_id: 33829, priority: 'alt' }],  // Hex Shrunken Head
      'Finger': [{ wowhead_id: 33497, priority: 'alt' }]  // Signet of Eternal Life
    },
    'Sunwell Plateau': {
      'Two-Hand': [{ wowhead_id: 34182, priority: 'bis' }],  // Grand Magister's Staff of Torrents
      'Trinket': [{ wowhead_id: 34429, priority: 'bis' }],  // Shifting Naaru Sliver
      'Finger': [{ wowhead_id: 34362, priority: 'bis' }]  // Loop of Forged Power
    }
  },

  // ============================================================================
  // ENHANCEMENT SHAMAN
  // ============================================================================
  'Enhancement Shaman': {
    'Karazhan': {
      'Head': [{ wowhead_id: 29760, priority: 'bis' }],  // Helm of the Fallen Champion (T4 token)
      'Neck': [{ wowhead_id: 28530, priority: 'bis' }],  // Brooch of Unquenchable Fury
      'Shoulder': [{ wowhead_id: 28631, priority: 'bis' }],  // Dragon-Quake Shoulderguards
      'Back': [{ wowhead_id: 28672, priority: 'bis' }],  // Drape of the Dark Reavers
      'Chest': [{ wowhead_id: 29754, priority: 'bis' }],  // Chestguard of the Fallen Champion (T4 token)
      'Wrist': [{ wowhead_id: 28503, priority: 'bis' }],  // Whirlwind Bracers
      'Hands': [{ wowhead_id: 29757, priority: 'bis' }],  // Gloves of the Fallen Champion (T4 token)
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
    },
    "Gruul's Lair": {
      'Shoulder': [{ wowhead_id: 29763, priority: 'bis' }],  // Pauldrons of the Fallen Champion (T4 token)
      'Legs': [{ wowhead_id: 29766, priority: 'bis' }],  // Leggings of the Fallen Champion (T4 token)
      'Trinket': [{ wowhead_id: 28830, priority: 'bis' }],  // Dragonspine Trophy
      'Hands': [{ wowhead_id: 28824, priority: 'alt' }]  // Gauntlets of the Dragonslayer
    },
    "Magtheridon's Lair": {
      'Chest': [{ wowhead_id: 29754, priority: 'bis' }],  // Chestguard of the Fallen Champion (T4 token)
      'Back': [{ wowhead_id: 28797, priority: 'alt' }]  // Cloak of the Pit Stalker
    },
    'Serpentshrine Cavern': {
      'Head': [{ wowhead_id: 30242, priority: 'bis' }],  // Helm of the Vanquished Champion (T5 token)
      'Neck': [{ wowhead_id: 30017, priority: 'bis' }],  // Telonicus's Pendant of Mayhem
      'Shoulder': [{ wowhead_id: 30055, priority: 'bis' }],  // Shoulderpads of the Stranger
      'Back': [{ wowhead_id: 29994, priority: 'bis' }],  // Thalassian Wildercloak
      'Chest': [{ wowhead_id: 30236, priority: 'bis' }],  // Chestguard of the Vanquished Champion (T5 token)
      'Wrist': [{ wowhead_id: 29966, priority: 'bis' }],  // Vambraces of Ending
      'Hands': [{ wowhead_id: 30239, priority: 'bis' }],  // Gloves of the Vanquished Champion (T5 token)
      'Waist': [{ wowhead_id: 30106, priority: 'bis' }],  // Belt of One-Hundred Deaths
      'Legs': [{ wowhead_id: 29995, priority: 'bis' }],  // Leggings of Murderous Intent
      'Feet': [{ wowhead_id: 30104, priority: 'bis' }],  // Cobra-Lash Boots
      'Finger': [
        { wowhead_id: 30052, priority: 'bis' },  // Ring of Lethality
        { wowhead_id: 29997, priority: 'bis' }   // Band of the Ranger-General
      ],
      'Trinket': [
        { wowhead_id: 28830, priority: 'bis' },  // Dragonspine Trophy
        { wowhead_id: 29383, priority: 'bis' }   // Bloodlust Brooch
      ],
      'Main Hand': [{ wowhead_id: 30082, priority: 'bis' }],  // Talon of Azshara
      'Off Hand': [{ wowhead_id: 29996, priority: 'bis' }],  // Rod of the Sun King
      'Relic': [{ wowhead_id: 27815, priority: 'bis' }]  // Totem of the Astral Winds
    },
    'Tempest Keep': {
      'Head': [{ wowhead_id: 30242, priority: 'bis' }],  // Helm of the Vanquished Champion (T5 token)
      'Shoulder': [{ wowhead_id: 30248, priority: 'bis' }],  // Pauldrons of the Vanquished Champion (T5 token)
      'Chest': [{ wowhead_id: 30236, priority: 'bis' }],  // Chestguard of the Vanquished Champion (T5 token)
      'Trinket': [{ wowhead_id: 30627, priority: 'bis' }],  // Tsunami Talisman
      'Main Hand': [{ wowhead_id: 30311, priority: 'bis' }],  // Warp Slicer
      'Off Hand': [{ wowhead_id: 30312, priority: 'bis' }]  // Infinity Blade
    },
    'Hyjal Summit': {
      'Head': [{ wowhead_id: 31095, priority: 'bis' }],  // Helm of the Forgotten Protector (T6)
      'Hands': [{ wowhead_id: 31094, priority: 'bis' }],  // Gloves of the Forgotten Protector (T6)
      'Shoulder': [{ wowhead_id: 30880, priority: 'bis' }],  // Razorfury Mantle
      'Waist': [{ wowhead_id: 30879, priority: 'alt' }]  // Don Alejandro's Money Belt
    },
    'Black Temple': {
      'Head': [{ wowhead_id: 32235, priority: 'bis' }],  // Cursed Vision of Sargeras
      'Neck': [{ wowhead_id: 32362, priority: 'bis' }],  // Pendant of the Titans
      'Shoulder': [{ wowhead_id: 31103, priority: 'bis' }],  // Pauldrons of the Forgotten Protector (T6 token)
      'Back': [{ wowhead_id: 32323, priority: 'bis' }],  // Shadowmoon Destroyer's Drape
      'Chest': [{ wowhead_id: 31091, priority: 'bis' }],  // Chestguard of the Forgotten Protector (T6 token)
      'Wrist': [{ wowhead_id: 32324, priority: 'bis' }],  // Insidious Bands
      'Hands': [{ wowhead_id: 31011, priority: 'bis' }],  // Skyshatter Grips (T6)
      'Waist': [{ wowhead_id: 32256, priority: 'bis' }],  // Waistwrap of Infinity
      'Legs': [{ wowhead_id: 31100, priority: 'bis' }],  // Leggings of the Forgotten Protector (T6 token)
      'Feet': [{ wowhead_id: 32510, priority: 'bis' }],  // Shadowmaster's Boots
      'Finger': [
        { wowhead_id: 32526, priority: 'bis' },  // Band of the Eternal Champion
        { wowhead_id: 32261, priority: 'alt' }   // Ring of Deceitful Intent
      ],
      'Trinket': [
        { wowhead_id: 32505, priority: 'bis' },  // Madness of the Betrayer
        { wowhead_id: 28830, priority: 'bis' }   // Dragonspine Trophy
      ],
      'Main Hand': [{ wowhead_id: 32262, priority: 'bis' }],  // Siphon of the Nathrezim
      'Off Hand': [{ wowhead_id: 32262, priority: 'bis' }],  // Siphon of the Nathrezim
      'Relic': [{ wowhead_id: 27815, priority: 'bis' }]  // Totem of the Astral Winds
    },
    "Zul'Aman": {
      'Main Hand': [{ wowhead_id: 33214, priority: 'alt' }],  // Akil'zon's Talonblade
      'Off Hand': [{ wowhead_id: 33214, priority: 'alt' }],  // Akil'zon's Talonblade
      'Waist': [{ wowhead_id: 33359, priority: 'alt' }],  // Wub's Cursed Hexblade
      'Trinket': [{ wowhead_id: 33831, priority: 'alt' }]  // Berserker's Call
    },
    'Sunwell Plateau': {
      'Main Hand': [{ wowhead_id: 34331, priority: 'bis' }],  // Hand of the Deceiver
      'Off Hand': [{ wowhead_id: 34203, priority: 'bis' }],  // Grip of Mannoroth
      'Trinket': [{ wowhead_id: 34427, priority: 'bis' }]  // Blackened Naaru Sliver
    }
  },

  // ============================================================================
  // RESTORATION DRUID
  // ============================================================================
  'Restoration Druid': {
    'Karazhan': {
      'Head': [{ wowhead_id: 29761, priority: 'bis' }],  // Helm of the Fallen Defender (T4 token)
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
    },
    "Gruul's Lair": {
      'Shoulder': [{ wowhead_id: 29764, priority: 'bis' }],  // Pauldrons of the Fallen Defender (T4 token)
      'Legs': [{ wowhead_id: 29767, priority: 'bis' }]  // Leggings of the Fallen Defender (T4 token)
    },
    "Magtheridon's Lair": {
      'Chest': [{ wowhead_id: 29753, priority: 'bis' }],  // Chestguard of the Fallen Defender (T4 token)
      'Neck': [{ wowhead_id: 28781, priority: 'alt' }]  // Karaborian Talisman
    },
    'Serpentshrine Cavern': {
      'Head': [{ wowhead_id: 30243, priority: 'bis' }],  // Helm of the Vanquished Defender (T5 token)
      'Neck': [{ wowhead_id: 30018, priority: 'bis' }],  // Lord Sanguinar's Claim
      'Shoulder': [{ wowhead_id: 30249, priority: 'bis' }],  // Pauldrons of the Vanquished Defender (T5 token)
      'Back': [{ wowhead_id: 30008, priority: 'bis' }],  // Devastation
      'Chest': [{ wowhead_id: 30237, priority: 'bis' }],  // Chestguard of the Vanquished Defender (T5 token)
      'Wrist': [{ wowhead_id: 29918, priority: 'bis' }],  // Mindstorm Wristbands
      'Hands': [{ wowhead_id: 30240, priority: 'bis' }],  // Gloves of the Vanquished Defender (T5 token)
      'Waist': [{ wowhead_id: 30038, priority: 'bis' }],  // Belt of Blasting
      'Legs': [{ wowhead_id: 30246, priority: 'bis' }],  // Leggings of the Vanquished Defender (T5 token)
      'Feet': [{ wowhead_id: 30037, priority: 'bis' }],  // Boots of Blasting
      'Finger': [
        { wowhead_id: 30109, priority: 'bis' },  // Ring of Endless Coils
        { wowhead_id: 29309, priority: 'alt' }   // Ring of Unrelenting Storms
      ],
      'Trinket': [
        { wowhead_id: 30664, priority: 'bis' },  // Living Root of the Wildheart
        { wowhead_id: 29376, priority: 'alt' }   // Essence of the Martyr
      ],
      'Main Hand': [{ wowhead_id: 30095, priority: 'bis' }],  // Fang of the Leviathan
      'Off Hand': [{ wowhead_id: 30049, priority: 'bis' }],  // Fathomstone
      'Relic': [{ wowhead_id: 28568, priority: 'bis' }]  // Idol of the Avian Heart
    },
    'Tempest Keep': {
      'Head': [{ wowhead_id: 30243, priority: 'bis' }],  // Helm of the Vanquished Defender (T5 token)
      'Shoulder': [{ wowhead_id: 30249, priority: 'bis' }],  // Pauldrons of the Vanquished Defender (T5 token)
      'Chest': [{ wowhead_id: 30237, priority: 'bis' }],  // Chestguard of the Vanquished Defender (T5 token)
      'Main Hand': [{ wowhead_id: 30723, priority: 'bis' }],  // Talon of the Phoenix
      'Off Hand': [{ wowhead_id: 30049, priority: 'alt' }]  // Fathomstone
    },
    'Hyjal Summit': {
      'Head': [{ wowhead_id: 31096, priority: 'bis' }],  // Helm of the Forgotten Vanquisher (T6)
      'Hands': [{ wowhead_id: 31093, priority: 'bis' }],  // Gloves of the Forgotten Vanquisher (T6)
      'Main Hand': [{ wowhead_id: 30891, priority: 'bis' }],  // Archon's Gavel
      'Waist': [{ wowhead_id: 30914, priority: 'alt' }]  // Belt of the Crescent Moon
    },
    'Black Temple': {
      'Head': [{ wowhead_id: 31037, priority: 'bis' }],  // Thunderheart Headguard (T6)
      'Neck': [{ wowhead_id: 32370, priority: 'bis' }],  // Nadina's Pendant of Purity
      'Shoulder': [{ wowhead_id: 31102, priority: 'bis' }],  // Pauldrons of the Forgotten Vanquisher (T6 token)
      'Back': [{ wowhead_id: 32524, priority: 'bis' }],  // Shroud of the Highborne
      'Chest': [{ wowhead_id: 31090, priority: 'bis' }],  // Chestguard of the Forgotten Vanquisher (T6 token)
      'Wrist': [{ wowhead_id: 32516, priority: 'bis' }],  // Wristbands of Divine Influence
      'Hands': [{ wowhead_id: 31032, priority: 'bis' }],  // Thunderheart Gauntlets (T6)
      'Waist': [{ wowhead_id: 32528, priority: 'bis' }],  // Belt of Divine Inspiration
      'Legs': [{ wowhead_id: 31099, priority: 'bis' }],  // Leggings of the Forgotten Vanquisher (T6 token)
      'Feet': [{ wowhead_id: 32517, priority: 'bis' }],  // Treads of the Den Mother
      'Finger': [
        { wowhead_id: 32247, priority: 'bis' },  // Ring of Captured Storms
        { wowhead_id: 32528, priority: 'alt' }   // Ring of Ancient Knowledge
      ],
      'Trinket': [
        { wowhead_id: 32496, priority: 'bis' },  // Memento of Tyrande
        { wowhead_id: 34429, priority: 'alt' }   // Shifting Naaru Sliver
      ],
      'Main Hand': [{ wowhead_id: 32500, priority: 'bis' }],  // Crystal Spire of Karabor
      'Held In Off-hand': [{ wowhead_id: 32361, priority: 'bis' }],  // Blind-Seers Icon
      'Relic': [{ wowhead_id: 32387, priority: 'bis' }]  // Idol of the Raven Goddess
    },
    "Zul'Aman": {
      'Head': [{ wowhead_id: 33453, priority: 'alt' }],  // Mojo-mender's Mask
      'Trinket': [{ wowhead_id: 33829, priority: 'alt' }],  // Hex Shrunken Head
      'Main Hand': [{ wowhead_id: 33354, priority: 'alt' }]  // Amani Divining Staff
    },
    'Sunwell Plateau': {
      'Two-Hand': [{ wowhead_id: 34337, priority: 'bis' }],  // Golden Staff of the Sin'dorei
      'Trinket': [{ wowhead_id: 34430, priority: 'bis' }],  // Glimmering Naaru Sliver
      'Head': [{ wowhead_id: 34339, priority: 'bis' }]  // Crown of Anasterian
    }
  },

  // ============================================================================
  // FERAL DRUID
  // ============================================================================
  'Feral Druid': {
    'Karazhan': {
      'Head': [{ wowhead_id: 29761, priority: 'bis' }],  // Helm of the Fallen Defender (T4 token)
      'Neck': [{ wowhead_id: 28674, priority: 'bis' }],  // Saberclaw Talisman
      'Shoulder': [{ wowhead_id: 28631, priority: 'bis' }],  // Dragon-Quake Shoulderguards
      'Back': [{ wowhead_id: 28672, priority: 'bis' }],  // Drape of the Dark Reavers
      'Chest': [{ wowhead_id: 29753, priority: 'bis' }],  // Chestguard of the Fallen Defender (T4 token)
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
      'Shoulder': [{ wowhead_id: 29764, priority: 'bis' }],  // Pauldrons of the Fallen Defender (T4 token)
      'Legs': [{ wowhead_id: 29767, priority: 'bis' }],  // Leggings of the Fallen Defender (T4 token)
      'Neck': [{ wowhead_id: 28822, priority: 'bis' }],  // Teeth of Gruul
      'Hands': [{ wowhead_id: 28827, priority: 'bis' }],  // Gauntlets of the Dragonslayer (leather)
      'Trinket': [{ wowhead_id: 28830, priority: 'bis' }],  // Dragonspine Trophy
      'Two-Hand': [{ wowhead_id: 28794, priority: 'bis' }]  // Axe of the Gronn Lords (for bear)
    },
    "Magtheridon's Lair": {
      'Chest': [{ wowhead_id: 29753, priority: 'bis' }],  // Chestguard of the Fallen Defender (T4 token)
      'Back': [{ wowhead_id: 28797, priority: 'alt' }]  // Cloak of the Pit Stalker
    },
    'Serpentshrine Cavern': {
      'Head': [{ wowhead_id: 8345, priority: 'bis' }],  // Wolfshead Helm
      'Neck': [{ wowhead_id: 30017, priority: 'bis' }],  // Telonicus's Pendant of Mayhem
      'Shoulder': [{ wowhead_id: 30055, priority: 'bis' }],  // Shoulderpads of the Stranger
      'Back': [{ wowhead_id: 29994, priority: 'bis' }],  // Thalassian Wildercloak
      'Chest': [{ wowhead_id: 30101, priority: 'bis' }],  // Bloodsea Brigand's Vest
      'Wrist': [{ wowhead_id: 29966, priority: 'bis' }],  // Vambraces of Ending
      'Hands': [{ wowhead_id: 30240, priority: 'bis' }],  // Gloves of the Vanquished Defender (T5 token)
      'Waist': [{ wowhead_id: 30106, priority: 'bis' }],  // Belt of One-Hundred Deaths
      'Legs': [{ wowhead_id: 29995, priority: 'bis' }],  // Leggings of Murderous Intent
      'Feet': [{ wowhead_id: 30104, priority: 'bis' }],  // Cobra-Lash Boots
      'Finger': [
        { wowhead_id: 30052, priority: 'bis' },  // Ring of Lethality
        { wowhead_id: 29997, priority: 'bis' }   // Band of the Ranger-General
      ],
      'Trinket': [
        { wowhead_id: 28830, priority: 'bis' },  // Dragonspine Trophy
        { wowhead_id: 29383, priority: 'alt' }   // Bloodlust Brooch
      ],
      'Two-Hand': [{ wowhead_id: 30020, priority: 'bis' }],  // Fire Crest Choker (Staff of the Leviathan)
      'Relic': [{ wowhead_id: 28372, priority: 'bis' }]  // Idol of the Wild
    },
    'Tempest Keep': {
      'Head': [{ wowhead_id: 30243, priority: 'bis' }],  // Helm of the Vanquished Defender (T5 token)
      'Shoulder': [{ wowhead_id: 30249, priority: 'bis' }],  // Pauldrons of the Vanquished Defender (T5 token)
      'Chest': [{ wowhead_id: 30237, priority: 'bis' }],  // Chestguard of the Vanquished Defender (T5 token)
      'Trinket': [{ wowhead_id: 30627, priority: 'bis' }],  // Tsunami Talisman
      'Two-Hand': [{ wowhead_id: 30318, priority: 'bis' }]  // Netherstrand Longbow (for stat stick)
    },
    'Hyjal Summit': {
      'Head': [{ wowhead_id: 31096, priority: 'bis' }],  // Helm of the Forgotten Vanquisher (T6)
      'Hands': [{ wowhead_id: 31093, priority: 'bis' }],  // Gloves of the Forgotten Vanquisher (T6)
      'Two-Hand': [{ wowhead_id: 30883, priority: 'bis' }],  // Pillar of Ferocity
      'Shoulder': [{ wowhead_id: 30880, priority: 'alt' }]  // Razorfury Mantle
    },
    'Black Temple': {
      'Head': [{ wowhead_id: 32235, priority: 'bis' }],  // Cursed Vision of Sargeras
      'Neck': [{ wowhead_id: 32362, priority: 'bis' }],  // Pendant of the Titans
      'Shoulder': [{ wowhead_id: 31102, priority: 'bis' }],  // Pauldrons of the Forgotten Vanquisher (T6 token)
      'Back': [{ wowhead_id: 32323, priority: 'bis' }],  // Shadowmoon Destroyer's Drape
      'Chest': [{ wowhead_id: 31090, priority: 'bis' }],  // Chestguard of the Forgotten Vanquisher (T6 token)
      'Wrist': [{ wowhead_id: 32324, priority: 'bis' }],  // Insidious Bands
      'Hands': [{ wowhead_id: 31034, priority: 'bis' }],  // Thunderheart Handguards (T6)
      'Waist': [{ wowhead_id: 32256, priority: 'bis' }],  // Waistwrap of Infinity
      'Legs': [{ wowhead_id: 31099, priority: 'bis' }],  // Leggings of the Forgotten Vanquisher (T6 token)
      'Feet': [{ wowhead_id: 32510, priority: 'bis' }],  // Shadowmaster's Boots
      'Finger': [
        { wowhead_id: 32526, priority: 'bis' },  // Band of the Eternal Champion
        { wowhead_id: 32261, priority: 'alt' }   // Ring of Deceitful Intent
      ],
      'Trinket': [
        { wowhead_id: 32505, priority: 'bis' },  // Madness of the Betrayer
        { wowhead_id: 28830, priority: 'bis' }   // Dragonspine Trophy
      ],
      'Two-Hand': [{ wowhead_id: 32332, priority: 'bis' }],  // Torch of the Damned
      'Relic': [{ wowhead_id: 32387, priority: 'bis' }]  // Idol of the Raven Goddess
    },
    "Zul'Aman": {
      'Two-Hand': [{ wowhead_id: 33491, priority: 'alt' }],  // Trollbane
      'Waist': [{ wowhead_id: 33359, priority: 'alt' }],  // Wub's Cursed Hexblade
      'Trinket': [{ wowhead_id: 33831, priority: 'alt' }]  // Berserker's Call
    },
    'Sunwell Plateau': {
      'Two-Hand': [{ wowhead_id: 34247, priority: 'bis' }],  // Apolyon, the Soul-Render
      'Trinket': [{ wowhead_id: 34427, priority: 'bis' }],  // Blackened Naaru Sliver
      'Neck': [{ wowhead_id: 34186, priority: 'bis' }]  // Chain of Unleashed Rage
    }
  },

  // ============================================================================
  // BALANCE DRUID
  // ============================================================================
  'Balance Druid': {
    'Karazhan': {
      'Head': [{ wowhead_id: 29761, priority: 'bis' }],  // Helm of the Fallen Defender (T4 token)
      'Neck': [{ wowhead_id: 28762, priority: 'bis' }],  // Adornment of Stolen Souls
      'Shoulder': [{ wowhead_id: 28726, priority: 'bis' }],  // Mantle of the Mind Flayer
      'Back': [{ wowhead_id: 28766, priority: 'bis' }],  // Ruby Drape of the Mysticant
      'Chest': [{ wowhead_id: 29753, priority: 'bis' }],  // Chestguard of the Fallen Defender (T4 token)
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
    },
    "Gruul's Lair": {
      'Shoulder': [{ wowhead_id: 29764, priority: 'bis' }],  // Pauldrons of the Fallen Defender (T4 token)
      'Legs': [{ wowhead_id: 29767, priority: 'bis' }],  // Leggings of the Fallen Defender (T4 token)
      'Trinket': [{ wowhead_id: 28830, priority: 'alt' }]  // Dragonspine Trophy
    },
    "Magtheridon's Lair": {
      'Chest': [{ wowhead_id: 29753, priority: 'bis' }],  // Chestguard of the Fallen Defender (T4 token)
      'Trinket': [{ wowhead_id: 28789, priority: 'bis' }]  // Eye of Magtheridon
    },
    'Serpentshrine Cavern': {
      'Head': [{ wowhead_id: 30243, priority: 'bis' }],  // Helm of the Vanquished Defender (T5 token)
      'Neck': [{ wowhead_id: 30015, priority: 'bis' }],  // The Sun King's Talisman
      'Shoulder': [{ wowhead_id: 30249, priority: 'bis' }],  // Pauldrons of the Vanquished Defender (T5 token)
      'Back': [{ wowhead_id: 29992, priority: 'bis' }],  // Royal Cloak of the Sunstriders
      'Chest': [{ wowhead_id: 30237, priority: 'bis' }],  // Chestguard of the Vanquished Defender (T5 token)
      'Wrist': [{ wowhead_id: 29918, priority: 'bis' }],  // Mindstorm Wristbands
      'Hands': [{ wowhead_id: 30240, priority: 'bis' }],  // Gloves of the Vanquished Defender (T5 token)
      'Waist': [{ wowhead_id: 30038, priority: 'bis' }],  // Belt of Blasting
      'Legs': [{ wowhead_id: 30246, priority: 'bis' }],  // Leggings of the Vanquished Defender (T5 token)
      'Feet': [{ wowhead_id: 30037, priority: 'bis' }],  // Boots of Blasting
      'Finger': [
        { wowhead_id: 30109, priority: 'bis' },  // Ring of Endless Coils
        { wowhead_id: 29922, priority: 'alt' }   // Band of Al'ar
      ],
      'Trinket': [
        { wowhead_id: 30626, priority: 'bis' },  // Sextant of Unstable Currents
        { wowhead_id: 29370, priority: 'bis' }   // Icon of the Silver Crescent
      ],
      'Main Hand': [{ wowhead_id: 30095, priority: 'bis' }],  // Fang of the Leviathan
      'Off Hand': [{ wowhead_id: 30049, priority: 'bis' }],  // Fathomstone
      'Relic': [{ wowhead_id: 27518, priority: 'bis' }]  // Ivory Idol of the Moongoddess
    },
    'Tempest Keep': {
      'Head': [{ wowhead_id: 30243, priority: 'bis' }],  // Helm of the Vanquished Defender (T5 token)
      'Shoulder': [{ wowhead_id: 30249, priority: 'bis' }],  // Pauldrons of the Vanquished Defender (T5 token)
      'Chest': [{ wowhead_id: 30237, priority: 'bis' }],  // Chestguard of the Vanquished Defender (T5 token)
      'Trinket': [{ wowhead_id: 30626, priority: 'bis' }],  // Sextant of Unstable Currents
      'Two-Hand': [{ wowhead_id: 30316, priority: 'bis' }]  // Staff of Disintegration
    },
    'Hyjal Summit': {
      'Head': [{ wowhead_id: 31096, priority: 'bis' }],  // Helm of the Forgotten Vanquisher (T6)
      'Hands': [{ wowhead_id: 31093, priority: 'bis' }],  // Gloves of the Forgotten Vanquisher (T6)
      'Two-Hand': [{ wowhead_id: 30910, priority: 'bis' }],  // Tempest of Chaos
      'Legs': [{ wowhead_id: 30912, priority: 'alt' }]  // Leggings of Eternity
    },
    'Black Temple': {
      'Head': [{ wowhead_id: 31040, priority: 'bis' }],  // Thunderheart Helmet (T6)
      'Neck': [{ wowhead_id: 32349, priority: 'bis' }],  // Amulet of Unfettered Magics
      'Shoulder': [{ wowhead_id: 31102, priority: 'bis' }],  // Pauldrons of the Forgotten Vanquisher (T6 token)
      'Back': [{ wowhead_id: 32337, priority: 'bis' }],  // Cloak of the Illidari Council
      'Chest': [{ wowhead_id: 31090, priority: 'bis' }],  // Chestguard of the Forgotten Vanquisher (T6 token)
      'Wrist': [{ wowhead_id: 32586, priority: 'bis' }],  // Bracers of Nimble Thought
      'Hands': [{ wowhead_id: 31035, priority: 'bis' }],  // Thunderheart Gloves (T6)
      'Waist': [{ wowhead_id: 32256, priority: 'bis' }],  // Waistwrap of Infinity
      'Legs': [{ wowhead_id: 31099, priority: 'bis' }],  // Leggings of the Forgotten Vanquisher (T6 token)
      'Feet': [{ wowhead_id: 32239, priority: 'bis' }],  // Slippers of the Seacaller
      'Finger': [
        { wowhead_id: 32527, priority: 'bis' },  // Ring of Captured Storms
        { wowhead_id: 32247, priority: 'alt' }   // Band of the Eternal Sage
      ],
      'Trinket': [
        { wowhead_id: 32483, priority: 'bis' },  // The Skull of Gul'dan
        { wowhead_id: 34429, priority: 'alt' }   // Shifting Naaru Sliver
      ],
      'Two-Hand': [{ wowhead_id: 32374, priority: 'bis' }],  // Zhar'doom, Greatstaff of the Devourer
      'Relic': [{ wowhead_id: 32387, priority: 'bis' }]  // Idol of the Raven Goddess
    },
    "Zul'Aman": {
      'Two-Hand': [{ wowhead_id: 33354, priority: 'alt' }],  // Amani Divining Staff
      'Trinket': [{ wowhead_id: 33829, priority: 'alt' }],  // Hex Shrunken Head
      'Finger': [{ wowhead_id: 33497, priority: 'alt' }]  // Signet of Eternal Life
    },
    'Sunwell Plateau': {
      'Two-Hand': [{ wowhead_id: 34182, priority: 'bis' }],  // Grand Magister's Staff of Torrents
      'Trinket': [{ wowhead_id: 34429, priority: 'bis' }],  // Shifting Naaru Sliver
      'Finger': [{ wowhead_id: 34362, priority: 'bis' }]  // Loop of Forged Power
    }
  },

  // ============================================================================
  // PROTECTION WARRIOR
  // ============================================================================
  'Protection Warrior': {
    'Karazhan': {
      'Head': [{ wowhead_id: 29761, priority: 'bis' }],  // Helm of the Fallen Defender (T4 token)
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
    },
    "Gruul's Lair": {
      'Shoulder': [{ wowhead_id: 29764, priority: 'bis' }],  // Pauldrons of the Fallen Defender (T4 token)
      'Legs': [{ wowhead_id: 29767, priority: 'bis' }],  // Leggings of the Fallen Defender (T4 token)
      'Off Hand': [{ wowhead_id: 28825, priority: 'bis' }],  // Aldori Legacy Defender (also drops here)
      'Trinket': [{ wowhead_id: 28830, priority: 'alt' }]  // Dragonspine Trophy
    },
    "Magtheridon's Lair": {
      'Chest': [{ wowhead_id: 29753, priority: 'bis' }],  // Chestguard of the Fallen Defender (T4 token)
      'Finger': [{ wowhead_id: 28790, priority: 'bis' }]  // Naaru Lightwarden's Band
    },
    'Serpentshrine Cavern': {
      'Head': [
        { wowhead_id: 30243, priority: 'bis' },  // Helm of the Vanquished Defender (T5 token)
        { wowhead_id: 32473, priority: 'alt' }   // Tankatronic Goggles
      ],
      'Neck': [{ wowhead_id: 30007, priority: 'bis' }],  // The Darkener's Grasp
      'Shoulder': [{ wowhead_id: 30249, priority: 'bis' }],  // Pauldrons of the Vanquished Defender (T5 token)
      'Back': [{ wowhead_id: 30084, priority: 'bis' }],  // Crimson Paragon's Cover
      'Chest': [{ wowhead_id: 30237, priority: 'bis' }],  // Chestguard of the Vanquished Defender (T5 token)
      'Wrist': [{ wowhead_id: 29463, priority: 'bis' }],  // Sha'tari Vindicator's Waistguard
      'Hands': [{ wowhead_id: 30240, priority: 'bis' }],  // Gloves of the Vanquished Defender (T5 token)
      'Waist': [{ wowhead_id: 30096, priority: 'bis' }],  // Girdle of the Invulnerable
      'Legs': [{ wowhead_id: 30246, priority: 'bis' }],  // Leggings of the Vanquished Defender (T5 token)
      'Feet': [{ wowhead_id: 30018, priority: 'bis' }],  // Lord Sanguinar's Claim
      'Finger': [
        { wowhead_id: 30834, priority: 'bis' },  // Shapeshifter's Signet
        { wowhead_id: 29279, priority: 'alt' }   // Band of Eternity
      ],
      'Trinket': [
        { wowhead_id: 32534, priority: 'bis' },  // Brooch of the Immortal King
        { wowhead_id: 30629, priority: 'alt' }   // Scarab of Displacement
      ],
      'Main Hand': [{ wowhead_id: 30058, priority: 'bis' }],  // Mallet of the Tides
      'Off Hand': [{ wowhead_id: 30073, priority: 'bis' }],  // Serpentshrine Shuriken
      'Ranged': [{ wowhead_id: 30105, priority: 'bis' }]  // Serpent Spine Longbow
    },
    'Tempest Keep': {
      'Head': [{ wowhead_id: 30243, priority: 'bis' }],  // Helm of the Vanquished Defender (T5 token)
      'Shoulder': [{ wowhead_id: 30249, priority: 'bis' }],  // Pauldrons of the Vanquished Defender (T5 token)
      'Chest': [{ wowhead_id: 30237, priority: 'bis' }],  // Chestguard of the Vanquished Defender (T5 token)
      'Trinket': [{ wowhead_id: 30629, priority: 'bis' }],  // Scarab of Displacement
      'Main Hand': [{ wowhead_id: 30058, priority: 'alt' }]  // Mallet of the Tides
    },
    'Hyjal Summit': {
      'Head': [{ wowhead_id: 31095, priority: 'bis' }],  // Helm of the Forgotten Protector (T6)
      'Hands': [{ wowhead_id: 31094, priority: 'bis' }],  // Gloves of the Forgotten Protector (T6)
      'Off Hand': [{ wowhead_id: 30881, priority: 'bis' }],  // Kaz'rogal's Hardened Heart
      'Shoulder': [{ wowhead_id: 30894, priority: 'alt' }]  // Glimmering Steel Mantle
    },
    'Black Temple': {
      'Head': [{ wowhead_id: 30972, priority: 'bis' }],  // Onslaught Greathelm (T6)
      'Neck': [{ wowhead_id: 32362, priority: 'bis' }],  // Pendant of the Titans
      'Shoulder': [{ wowhead_id: 31103, priority: 'bis' }],  // Pauldrons of the Forgotten Protector (T6 token)
      'Back': [{ wowhead_id: 32331, priority: 'bis' }],  // Cloak of the Pit Stalker
      'Chest': [{ wowhead_id: 31091, priority: 'bis' }],  // Chestguard of the Forgotten Protector (T6 token)
      'Wrist': [{ wowhead_id: 32515, priority: 'bis' }],  // Swiftsteel Bracers
      'Hands': [{ wowhead_id: 30969, priority: 'bis' }],  // Onslaught Handguards (T6)
      'Waist': [{ wowhead_id: 32232, priority: 'bis' }],  // Belt of Primal Majesty
      'Legs': [{ wowhead_id: 31100, priority: 'bis' }],  // Leggings of the Forgotten Protector (T6 token)
      'Feet': [{ wowhead_id: 32268, priority: 'bis' }],  // Boots of the Protector
      'Finger': [
        { wowhead_id: 32526, priority: 'bis' },  // Band of the Eternal Champion
        { wowhead_id: 32335, priority: 'alt' }   // Ring of Ancient Knowledge
      ],
      'Trinket': [
        { wowhead_id: 32501, priority: 'bis' },  // Shadowmoon Insignia
        { wowhead_id: 32534, priority: 'alt' }   // Brooch of the Immortal King
      ],
      'Main Hand': [{ wowhead_id: 32262, priority: 'bis' }],  // Siphon of the Nathrezim
      'Off Hand': [{ wowhead_id: 32375, priority: 'bis' }],  // Bulwark of Azzinoth
      'Ranged': [{ wowhead_id: 32336, priority: 'bis' }]  // Black Bow of the Betrayer
    },
    "Zul'Aman": {
      'Off Hand': [{ wowhead_id: 33463, priority: 'alt' }],  // Amani Punisher
      'Back': [{ wowhead_id: 33592, priority: 'alt' }],  // Cloak of Fiends
      'Neck': [{ wowhead_id: 33278, priority: 'alt' }]  // Choker of Serrated Blades
    },
    'Sunwell Plateau': {
      'Off Hand': [{ wowhead_id: 34185, priority: 'bis' }],  // Sword Breaker's Bulwark
      'Trinket': [{ wowhead_id: 34428, priority: 'bis' }],  // Steely Naaru Sliver
      'Shoulder': [{ wowhead_id: 34164, priority: 'bis' }]  // Pauldrons of Perseverance
    }
  },

  // ============================================================================
  // ARMS/FURY WARRIOR
  // ============================================================================
  'Arms/Fury Warrior': {
    'Karazhan': {
      'Head': [{ wowhead_id: 29761, priority: 'bis' }],  // Helm of the Fallen Defender (T4 token)
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
    },
    "Gruul's Lair": {
      'Shoulder': [{ wowhead_id: 29764, priority: 'bis' }],  // Pauldrons of the Fallen Defender (T4 token)
      'Legs': [{ wowhead_id: 29767, priority: 'bis' }],  // Leggings of the Fallen Defender (T4 token)
      'Hands': [{ wowhead_id: 28827, priority: 'bis' }],  // Gauntlets of Martial Perfection
      'Trinket': [{ wowhead_id: 28830, priority: 'bis' }]  // Dragonspine Trophy
    },
    "Magtheridon's Lair": {
      'Chest': [{ wowhead_id: 29753, priority: 'bis' }],  // Chestguard of the Fallen Defender (T4 token)
      'Waist': [{ wowhead_id: 28779, priority: 'alt' }]  // Girdle of the Endless Pit
    },
    'Serpentshrine Cavern': {
      'Head': [{ wowhead_id: 30243, priority: 'bis' }],  // Helm of the Vanquished Defender (T5 token)
      'Neck': [{ wowhead_id: 30022, priority: 'bis' }],  // Pendant of the Perilous
      'Shoulder': [{ wowhead_id: 30055, priority: 'bis' }],  // Shoulderpads of the Stranger
      'Back': [{ wowhead_id: 30098, priority: 'bis' }],  // Razor-Scale Battlecloak
      'Chest': [
        { wowhead_id: 30237, priority: 'bis' },  // Chestguard of the Vanquished Defender (T5 token)
        { wowhead_id: 30101, priority: 'alt' }   // Bloodsea Brigand's Vest
      ],
      'Wrist': [{ wowhead_id: 30057, priority: 'bis' }],  // Bracers of Eradication
      'Hands': [{ wowhead_id: 30240, priority: 'bis' }],  // Gloves of the Vanquished Defender (T5 token)
      'Waist': [{ wowhead_id: 30106, priority: 'bis' }],  // Belt of One-Hundred Deaths
      'Legs': [{ wowhead_id: 29995, priority: 'bis' }],  // Leggings of Murderous Intent
      'Feet': [{ wowhead_id: 30081, priority: 'bis' }],  // Warboots of Obliteration
      'Finger': [
        { wowhead_id: 30052, priority: 'bis' },  // Ring of Lethality
        { wowhead_id: 30834, priority: 'alt' }   // Shapeshifter's Signet
      ],
      'Trinket': [
        { wowhead_id: 28830, priority: 'bis' },  // Dragonspine Trophy
        { wowhead_id: 29383, priority: 'bis' }   // Bloodlust Brooch
      ],
      'Two-Hand': [{ wowhead_id: 29993, priority: 'bis' }],  // Twinblade of the Phoenix
      'Ranged': [{ wowhead_id: 30105, priority: 'bis' }]  // Serpent Spine Longbow
    },
    'Tempest Keep': {
      'Head': [{ wowhead_id: 30243, priority: 'bis' }],  // Helm of the Vanquished Defender (T5 token)
      'Shoulder': [{ wowhead_id: 30249, priority: 'bis' }],  // Pauldrons of the Vanquished Defender (T5 token)
      'Chest': [{ wowhead_id: 30237, priority: 'bis' }],  // Chestguard of the Vanquished Defender (T5 token)
      'Trinket': [{ wowhead_id: 30627, priority: 'bis' }],  // Tsunami Talisman
      'Two-Hand': [{ wowhead_id: 30311, priority: 'bis' }]  // Warp Slicer
    },
    'Hyjal Summit': {
      'Head': [{ wowhead_id: 31095, priority: 'bis' }],  // Helm of the Forgotten Protector (T6)
      'Hands': [{ wowhead_id: 31094, priority: 'bis' }],  // Gloves of the Forgotten Protector (T6)
      'Two-Hand': [{ wowhead_id: 30910, priority: 'bis' }],  // Cataclysm's Edge
      'Shoulder': [{ wowhead_id: 30884, priority: 'alt' }]  // Hatefury Mantle
    },
    'Black Temple': {
      'Head': [{ wowhead_id: 30974, priority: 'bis' }],  // Onslaught Battle-Helm (T6)
      'Neck': [{ wowhead_id: 32362, priority: 'bis' }],  // Pendant of the Titans
      'Shoulder': [{ wowhead_id: 31103, priority: 'bis' }],  // Pauldrons of the Forgotten Protector (T6 token)
      'Back': [{ wowhead_id: 32323, priority: 'bis' }],  // Shadowmoon Destroyer's Drape
      'Chest': [{ wowhead_id: 31091, priority: 'bis' }],  // Chestguard of the Forgotten Protector (T6 token)
      'Wrist': [{ wowhead_id: 32574, priority: 'bis' }],  // Bindings of Lightning Reflexes
      'Hands': [{ wowhead_id: 30970, priority: 'bis' }],  // Onslaught Gauntlets (T6)
      'Waist': [{ wowhead_id: 32232, priority: 'bis' }],  // Belt of Primal Majesty
      'Legs': [{ wowhead_id: 31100, priority: 'bis' }],  // Leggings of the Forgotten Protector (T6 token)
      'Feet': [{ wowhead_id: 32510, priority: 'bis' }],  // Shadowmaster's Boots
      'Finger': [
        { wowhead_id: 32526, priority: 'bis' },  // Band of the Eternal Champion
        { wowhead_id: 32261, priority: 'alt' }   // Ring of Deceitful Intent
      ],
      'Trinket': [
        { wowhead_id: 32505, priority: 'bis' },  // Madness of the Betrayer
        { wowhead_id: 28830, priority: 'bis' }   // Dragonspine Trophy
      ],
      'Two-Hand': [{ wowhead_id: 32332, priority: 'bis' }],  // Torch of the Damned
      'Ranged': [{ wowhead_id: 32336, priority: 'bis' }]  // Black Bow of the Betrayer
    },
    "Zul'Aman": {
      'Two-Hand': [{ wowhead_id: 33478, priority: 'alt' }],  // Jin'rokh, The Great Apocalypse
      'Trinket': [{ wowhead_id: 33831, priority: 'alt' }],  // Berserker's Call
      'Waist': [{ wowhead_id: 33211, priority: 'alt' }]  // Blood-Stained Pauldrons
    },
    'Sunwell Plateau': {
      'Two-Hand': [{ wowhead_id: 34247, priority: 'bis' }],  // Apolyon, the Soul-Render
      'Trinket': [{ wowhead_id: 34427, priority: 'bis' }],  // Blackened Naaru Sliver
      'Neck': [{ wowhead_id: 34358, priority: 'bis' }]  // Hard Khorium Choker
    }
  },

  // ============================================================================
  // HOLY/DISC PRIEST
  // ============================================================================
  'Holy/Disc Priest': {
    'Karazhan': {
      'Head': [{ wowhead_id: 29761, priority: 'bis' }],  // Helm of the Fallen Defender (T4 token)
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
    },
    "Gruul's Lair": {
      'Shoulder': [{ wowhead_id: 29764, priority: 'bis' }],  // Pauldrons of the Fallen Defender (T4 token)
      'Legs': [{ wowhead_id: 29767, priority: 'bis' }],  // Leggings of the Fallen Defender (T4 token)
      'Trinket': [{ wowhead_id: 28823, priority: 'alt' }]  // Eye of Gruul
    },
    "Magtheridon's Lair": {
      'Chest': [{ wowhead_id: 29753, priority: 'bis' }],  // Chestguard of the Fallen Defender (T4 token)
      'Trinket': [{ wowhead_id: 28789, priority: 'alt' }]  // Eye of Magtheridon
    },
    'Serpentshrine Cavern': {
      'Head': [{ wowhead_id: 30243, priority: 'bis' }],  // Helm of the Vanquished Defender (T5 token)
      'Neck': [{ wowhead_id: 30018, priority: 'bis' }],  // Lord Sanguinar's Claim
      'Shoulder': [{ wowhead_id: 30249, priority: 'bis' }],  // Pauldrons of the Vanquished Defender (T5 token)
      'Back': [{ wowhead_id: 30008, priority: 'bis' }],  // Devastation
      'Chest': [{ wowhead_id: 30237, priority: 'bis' }],  // Chestguard of the Vanquished Defender (T5 token)
      'Wrist': [{ wowhead_id: 29918, priority: 'bis' }],  // Mindstorm Wristbands
      'Hands': [{ wowhead_id: 30240, priority: 'bis' }],  // Gloves of the Vanquished Defender (T5 token)
      'Waist': [{ wowhead_id: 30038, priority: 'bis' }],  // Belt of Blasting
      'Legs': [{ wowhead_id: 30246, priority: 'bis' }],  // Leggings of the Vanquished Defender (T5 token)
      'Feet': [{ wowhead_id: 30037, priority: 'bis' }],  // Boots of Blasting
      'Finger': [
        { wowhead_id: 30109, priority: 'bis' },  // Ring of Endless Coils
        { wowhead_id: 29309, priority: 'alt' }   // Ring of Unrelenting Storms
      ],
      'Trinket': [
        { wowhead_id: 30664, priority: 'bis' },  // Living Root of the Wildheart
        { wowhead_id: 29376, priority: 'alt' }   // Essence of the Martyr
      ],
      'Main Hand': [{ wowhead_id: 30095, priority: 'bis' }],  // Fang of the Leviathan
      'Held In Off-hand': [{ wowhead_id: 30049, priority: 'bis' }],  // Fathomstone
      'Ranged': [{ wowhead_id: 29982, priority: 'bis' }]  // Wand of the Forgotten Star
    },
    'Tempest Keep': {
      'Head': [{ wowhead_id: 30243, priority: 'bis' }],  // Helm of the Vanquished Defender (T5 token)
      'Shoulder': [{ wowhead_id: 30249, priority: 'bis' }],  // Pauldrons of the Vanquished Defender (T5 token)
      'Chest': [{ wowhead_id: 30237, priority: 'bis' }],  // Chestguard of the Vanquished Defender (T5 token)
      'Trinket': [{ wowhead_id: 30664, priority: 'bis' }],  // Living Root of the Wildheart
      'Main Hand': [{ wowhead_id: 30723, priority: 'bis' }]  // Talon of the Phoenix
    },
    'Hyjal Summit': {
      'Head': [{ wowhead_id: 31097, priority: 'bis' }],  // Helm of the Forgotten Conqueror (T6 token)
      'Hands': [{ wowhead_id: 31092, priority: 'bis' }],  // Gloves of the Forgotten Conqueror (T6 token)
      'Main Hand': [{ wowhead_id: 30891, priority: 'bis' }],  // Archon's Gavel
      'Feet': [{ wowhead_id: 30894, priority: 'alt' }]  // Archbishop's Slippers
    },
    'Black Temple': {
      'Head': [{ wowhead_id: 31063, priority: 'bis' }],  // Cowl of Absolution (T6)
      'Neck': [{ wowhead_id: 32370, priority: 'bis' }],  // Nadina's Pendant of Purity
      'Shoulder': [{ wowhead_id: 31101, priority: 'bis' }],  // Pauldrons of the Forgotten Conqueror (T6 token)
      'Back': [{ wowhead_id: 32524, priority: 'bis' }],  // Shroud of the Highborne
      'Chest': [{ wowhead_id: 31089, priority: 'bis' }],  // Chestguard of the Forgotten Conqueror (T6 token)
      'Wrist': [{ wowhead_id: 32516, priority: 'bis' }],  // Wristbands of Divine Influence
      'Hands': [{ wowhead_id: 31060, priority: 'bis' }],  // Gloves of Absolution (T6)
      'Waist': [{ wowhead_id: 32528, priority: 'bis' }],  // Belt of Divine Inspiration
      'Legs': [{ wowhead_id: 31098, priority: 'bis' }],  // Leggings of the Forgotten Conqueror (T6 token)
      'Feet': [{ wowhead_id: 32517, priority: 'bis' }],  // Treads of the Den Mother
      'Finger': [
        { wowhead_id: 32247, priority: 'bis' },  // Ring of Captured Storms
        { wowhead_id: 32528, priority: 'alt' }   // Ring of Ancient Knowledge
      ],
      'Trinket': [
        { wowhead_id: 32496, priority: 'bis' },  // Memento of Tyrande
        { wowhead_id: 34429, priority: 'alt' }   // Shifting Naaru Sliver
      ],
      'Main Hand': [{ wowhead_id: 32500, priority: 'bis' }],  // Crystal Spire of Karabor
      'Held In Off-hand': [{ wowhead_id: 32361, priority: 'bis' }],  // Blind-Seers Icon
      'Ranged': [{ wowhead_id: 32374, priority: 'bis' }]  // Wand of Prismatic Focus
    },
    "Zul'Aman": {
      'Head': [{ wowhead_id: 33453, priority: 'alt' }],  // Mojo-mender's Mask
      'Trinket': [{ wowhead_id: 33829, priority: 'alt' }],  // Hex Shrunken Head
      'Main Hand': [{ wowhead_id: 33354, priority: 'alt' }]  // Amani Divining Staff
    },
    'Sunwell Plateau': {
      'Two-Hand': [{ wowhead_id: 34337, priority: 'bis' }],  // Golden Staff of the Sin'dorei
      'Trinket': [{ wowhead_id: 34430, priority: 'bis' }],  // Glimmering Naaru Sliver
      'Chest': [{ wowhead_id: 34233, priority: 'bis' }]  // Robes of Faltered Light
    }
  },

  // ============================================================================
  // SHADOW PRIEST
  // ============================================================================
  'Shadow Priest': {
    'Karazhan': {
      'Head': [{ wowhead_id: 29761, priority: 'bis' }],  // Helm of the Fallen Defender (T4 token)
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
    },
    "Gruul's Lair": {
      'Shoulder': [{ wowhead_id: 29764, priority: 'bis' }],  // Pauldrons of the Fallen Defender (T4 token)
      'Legs': [{ wowhead_id: 29767, priority: 'bis' }],  // Leggings of the Fallen Defender (T4 token)
      'Trinket': [{ wowhead_id: 28830, priority: 'alt' }]  // Dragonspine Trophy (still good for spriest)
    },
    "Magtheridon's Lair": {
      'Chest': [{ wowhead_id: 29753, priority: 'bis' }],  // Chestguard of the Fallen Defender (T4 token)
      'Trinket': [{ wowhead_id: 28789, priority: 'bis' }]  // Eye of Magtheridon
    },
    'Serpentshrine Cavern': {
      'Head': [
        { wowhead_id: 32494, priority: 'bis' },  // Destruction Holo-gogs
        { wowhead_id: 30243, priority: 'alt' }   // Helm of the Vanquished Defender (T5 token)
      ],
      'Neck': [{ wowhead_id: 30015, priority: 'bis' }],  // The Sun King's Talisman
      'Shoulder': [{ wowhead_id: 30249, priority: 'bis' }],  // Pauldrons of the Vanquished Defender (T5 token)
      'Back': [{ wowhead_id: 29992, priority: 'bis' }],  // Royal Cloak of the Sunstriders
      'Chest': [
        { wowhead_id: 30107, priority: 'bis' },  // Vestments of the Sea-Witch
        { wowhead_id: 30237, priority: 'alt' }   // Chestguard of the Vanquished Defender (T5 token)
      ],
      'Wrist': [{ wowhead_id: 29918, priority: 'bis' }],  // Mindstorm Wristbands
      'Hands': [{ wowhead_id: 30240, priority: 'bis' }],  // Gloves of the Vanquished Defender (T5 token)
      'Waist': [{ wowhead_id: 30038, priority: 'bis' }],  // Belt of Blasting
      'Legs': [{ wowhead_id: 30246, priority: 'bis' }],  // Leggings of the Vanquished Defender (T5 token)
      'Feet': [{ wowhead_id: 30037, priority: 'bis' }],  // Boots of Blasting
      'Finger': [
        { wowhead_id: 30109, priority: 'bis' },  // Ring of Endless Coils
        { wowhead_id: 29922, priority: 'alt' }   // Band of Al'ar
      ],
      'Trinket': [
        { wowhead_id: 30626, priority: 'bis' },  // Sextant of Unstable Currents
        { wowhead_id: 29370, priority: 'bis' }   // Icon of the Silver Crescent
      ],
      'Main Hand': [{ wowhead_id: 30095, priority: 'bis' }],  // Fang of the Leviathan
      'Held In Off-hand': [{ wowhead_id: 30049, priority: 'bis' }],  // Fathomstone
      'Ranged': [{ wowhead_id: 29982, priority: 'bis' }]  // Wand of the Forgotten Star
    },
    'Tempest Keep': {
      'Head': [{ wowhead_id: 30243, priority: 'bis' }],  // Helm of the Vanquished Defender (T5 token)
      'Shoulder': [{ wowhead_id: 30249, priority: 'bis' }],  // Pauldrons of the Vanquished Defender (T5 token)
      'Chest': [{ wowhead_id: 30237, priority: 'bis' }],  // Chestguard of the Vanquished Defender (T5 token)
      'Trinket': [{ wowhead_id: 30626, priority: 'bis' }],  // Sextant of Unstable Currents
      'Main Hand': [{ wowhead_id: 30723, priority: 'bis' }]  // Talon of the Phoenix
    },
    'Hyjal Summit': {
      'Head': [{ wowhead_id: 31097, priority: 'bis' }],  // Helm of the Forgotten Conqueror (T6 token)
      'Hands': [{ wowhead_id: 31092, priority: 'bis' }],  // Gloves of the Forgotten Conqueror (T6 token)
      'Two-Hand': [{ wowhead_id: 30910, priority: 'bis' }],  // Tempest of Chaos
      'Legs': [{ wowhead_id: 30912, priority: 'alt' }]  // Leggings of Eternity
    },
    'Black Temple': {
      'Head': [{ wowhead_id: 31064, priority: 'bis' }],  // Hood of Absolution (T6)
      'Neck': [{ wowhead_id: 32349, priority: 'bis' }],  // Amulet of Unfettered Magics
      'Shoulder': [{ wowhead_id: 31101, priority: 'bis' }],  // Pauldrons of the Forgotten Conqueror (T6 token)
      'Back': [{ wowhead_id: 32337, priority: 'bis' }],  // Cloak of the Illidari Council
      'Chest': [{ wowhead_id: 31089, priority: 'bis' }],  // Chestguard of the Forgotten Conqueror (T6 token)
      'Wrist': [{ wowhead_id: 32586, priority: 'bis' }],  // Bracers of Nimble Thought
      'Hands': [{ wowhead_id: 31061, priority: 'bis' }],  // Handguards of Absolution (T6)
      'Waist': [{ wowhead_id: 32256, priority: 'bis' }],  // Waistwrap of Infinity
      'Legs': [{ wowhead_id: 31098, priority: 'bis' }],  // Leggings of the Forgotten Conqueror (T6 token)
      'Feet': [{ wowhead_id: 32239, priority: 'bis' }],  // Slippers of the Seacaller
      'Finger': [
        { wowhead_id: 32527, priority: 'bis' },  // Ring of Captured Storms
        { wowhead_id: 32247, priority: 'alt' }   // Band of the Eternal Sage
      ],
      'Trinket': [
        { wowhead_id: 32483, priority: 'bis' },  // The Skull of Gul'dan
        { wowhead_id: 34429, priority: 'alt' }   // Shifting Naaru Sliver
      ],
      'Two-Hand': [{ wowhead_id: 32374, priority: 'bis' }],  // Zhar'doom, Greatstaff of the Devourer
      'Ranged': [{ wowhead_id: 32348, priority: 'bis' }]  // Wand of Prismatic Focus
    },
    "Zul'Aman": {
      'Two-Hand': [{ wowhead_id: 33354, priority: 'alt' }],  // Amani Divining Staff
      'Trinket': [{ wowhead_id: 33829, priority: 'alt' }],  // Hex Shrunken Head
      'Finger': [{ wowhead_id: 33497, priority: 'alt' }]  // Signet of Eternal Life
    },
    'Sunwell Plateau': {
      'Two-Hand': [{ wowhead_id: 34182, priority: 'bis' }],  // Grand Magister's Staff of Torrents
      'Trinket': [{ wowhead_id: 34429, priority: 'bis' }],  // Shifting Naaru Sliver
      'Finger': [{ wowhead_id: 34362, priority: 'bis' }]  // Loop of Forged Power
    }
  },

  // ============================================================================
  // MAGE
  // ============================================================================
  'Mage': {
    'Karazhan': {
      'Head': [{ wowhead_id: 29759, priority: 'bis' }],  // Helm of the Fallen Hero (T4 token)
      'Neck': [{ wowhead_id: 28762, priority: 'bis' }],  // Adornment of Stolen Souls
      'Shoulder': [{ wowhead_id: 28726, priority: 'bis' }],  // Mantle of the Mind Flayer
      'Back': [{ wowhead_id: 28766, priority: 'bis' }],  // Ruby Drape of the Mysticant
      'Chest': [{ wowhead_id: 28578, priority: 'bis' }],  // Masquerade Gown
      'Wrist': [{ wowhead_id: 28515, priority: 'bis' }],  // Bands of Nefarious Deeds
      'Hands': [{ wowhead_id: 29756, priority: 'bis' }],  // Gloves of the Fallen Hero (T4 token)
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
    },
    "Gruul's Lair": {
      'Shoulder': [{ wowhead_id: 29762, priority: 'bis' }],  // Pauldrons of the Fallen Hero (T4 token)
      'Legs': [{ wowhead_id: 29765, priority: 'bis' }],  // Leggings of the Fallen Hero (T4 token)
      'Trinket': [{ wowhead_id: 28830, priority: 'bis' }],  // Dragonspine Trophy
      'Finger': [{ wowhead_id: 28823, priority: 'alt' }]  // Eye of Gruul
    },
    "Magtheridon's Lair": {
      'Chest': [{ wowhead_id: 29755, priority: 'bis' }],  // Chestguard of the Fallen Hero (T4 token)
      'Trinket': [{ wowhead_id: 28789, priority: 'alt' }],  // Eye of Magtheridon
      'Ranged': [{ wowhead_id: 28782, priority: 'bis' }]  // Eredar Wand of Obliteration
    },
    'Serpentshrine Cavern': {
      'Head': [{ wowhead_id: 30244, priority: 'bis' }],  // Helm of the Vanquished Hero (T5 token)
      'Neck': [
        { wowhead_id: 30015, priority: 'bis' },  // The Sun King's Talisman
        { wowhead_id: 29368, priority: 'alt' }   // Manasurge Pendant
      ],
      'Back': [
        { wowhead_id: 28766, priority: 'bis' },  // Ruby Drape of the Mysticant
        { wowhead_id: 29992, priority: 'alt' }   // Royal Cloak of the Sunstriders
      ],
      'Chest': [{ wowhead_id: 30107, priority: 'bis' }],  // Vestments of the Sea-Witch
      'Wrist': [
        { wowhead_id: 29918, priority: 'bis' },  // Mindstorm Wristbands
        { wowhead_id: 28515, priority: 'alt' }   // Bands of Nefarious Deeds
      ],
      'Hands': [{ wowhead_id: 30241, priority: 'bis' }],  // Gloves of the Vanquished Hero (T5 token)
      'Waist': [
        { wowhead_id: 30038, priority: 'bis' },  // Belt of Blasting
        { wowhead_id: 30064, priority: 'alt' }   // Cord of Screaming Terrors
      ],
      'Legs': [{ wowhead_id: 30246, priority: 'bis' }],  // Leggings of the Vanquished Hero (T5 token)
      'Feet': [
        { wowhead_id: 30037, priority: 'bis' },  // Boots of Blasting
        { wowhead_id: 28585, priority: 'alt' }   // Ruby Slippers
      ],
      'Finger': [
        { wowhead_id: 30109, priority: 'bis' },  // Ring of Endless Coils
        { wowhead_id: 29922, priority: 'alt' }   // Band of Al'ar
      ],
      'Trinket': [
        { wowhead_id: 30626, priority: 'bis' },  // Sextant of Unstable Currents
        { wowhead_id: 29370, priority: 'bis' }   // Icon of the Silver Crescent
      ],
      'Main Hand': [
        { wowhead_id: 30095, priority: 'bis' },  // Fang of the Leviathan
        { wowhead_id: 30723, priority: 'alt' }   // Talon of the Tempest
      ],
      'Held In Off-hand': [{ wowhead_id: 30049, priority: 'bis' }]  // Fathomstone
    },
    'Tempest Keep': {
      'Shoulder': [{ wowhead_id: 30250, priority: 'bis' }],  // Pauldrons of the Vanquished Hero (T5 token)
      'Chest': [{ wowhead_id: 30238, priority: 'bis' }],  // Chestguard of the Vanquished Hero (T5 token)
      'Trinket': [{ wowhead_id: 30626, priority: 'bis' }],  // Sextant of Unstable Currents
      'Main Hand': [{ wowhead_id: 30723, priority: 'bis' }]  // Talon of the Phoenix
    },
    'Hyjal Summit': {
      'Head': [{ wowhead_id: 31096, priority: 'bis' }],  // Helm of the Forgotten Vanquisher (T6)
      'Hands': [{ wowhead_id: 31093, priority: 'bis' }],  // Gloves of the Forgotten Vanquisher (T6)
      'Two-Hand': [{ wowhead_id: 30910, priority: 'bis' }],  // Tempest of Chaos
      'Chest': [{ wowhead_id: 30913, priority: 'alt' }]  // Robes of Rhonin
    },
    'Black Temple': {
      'Head': [{ wowhead_id: 31056, priority: 'bis' }],  // Cowl of the Tempest (T6)
      'Neck': [{ wowhead_id: 32349, priority: 'bis' }],  // Amulet of Unfettered Magics
      'Shoulder': [{ wowhead_id: 31102, priority: 'bis' }],  // Pauldrons of the Forgotten Vanquisher (T6 token)
      'Back': [{ wowhead_id: 32337, priority: 'bis' }],  // Cloak of the Illidari Council
      'Chest': [{ wowhead_id: 31090, priority: 'bis' }],  // Chestguard of the Forgotten Vanquisher (T6 token)
      'Wrist': [{ wowhead_id: 32586, priority: 'bis' }],  // Bracers of Nimble Thought
      'Hands': [{ wowhead_id: 31055, priority: 'bis' }],  // Gloves of the Tempest (T6)
      'Waist': [{ wowhead_id: 32256, priority: 'bis' }],  // Waistwrap of Infinity
      'Legs': [{ wowhead_id: 31099, priority: 'bis' }],  // Leggings of the Forgotten Vanquisher (T6 token)
      'Feet': [{ wowhead_id: 32239, priority: 'bis' }],  // Slippers of the Seacaller
      'Finger': [
        { wowhead_id: 32527, priority: 'bis' },  // Ring of Captured Storms
        { wowhead_id: 32247, priority: 'alt' }   // Band of the Eternal Sage
      ],
      'Trinket': [
        { wowhead_id: 32483, priority: 'bis' },  // The Skull of Gul'dan
        { wowhead_id: 34429, priority: 'alt' }   // Shifting Naaru Sliver
      ],
      'Two-Hand': [{ wowhead_id: 32374, priority: 'bis' }],  // Zhar'doom, Greatstaff of the Devourer
      'Ranged': [{ wowhead_id: 32348, priority: 'bis' }]  // Wand of Prismatic Focus
    },
    "Zul'Aman": {
      'Two-Hand': [{ wowhead_id: 33354, priority: 'alt' }],  // Amani Divining Staff
      'Trinket': [{ wowhead_id: 33829, priority: 'alt' }],  // Hex Shrunken Head
      'Finger': [{ wowhead_id: 33497, priority: 'alt' }]  // Signet of Eternal Life
    },
    'Sunwell Plateau': {
      'Two-Hand': [{ wowhead_id: 34182, priority: 'bis' }],  // Grand Magister's Staff of Torrents
      'Trinket': [{ wowhead_id: 34429, priority: 'bis' }],  // Shifting Naaru Sliver
      'Finger': [{ wowhead_id: 34362, priority: 'bis' }],  // Loop of Forged Power
      'Chest': [{ wowhead_id: 34364, priority: 'bis' }]  // Sunfire Robe
    }
  },

  // ============================================================================
  // HUNTER
  // ============================================================================
  'Hunter': {
    'Karazhan': {
      'Head': [{ wowhead_id: 29759, priority: 'bis' }],  // Helm of the Fallen Hero (T4 token)
      'Neck': [{ wowhead_id: 28530, priority: 'bis' }],  // Brooch of Unquenchable Fury
      'Shoulder': [{ wowhead_id: 28631, priority: 'bis' }],  // Dragon-Quake Shoulderguards
      'Back': [{ wowhead_id: 28672, priority: 'bis' }],  // Drape of the Dark Reavers
      'Chest': [{ wowhead_id: 28621, priority: 'bis' }],  // Hauberk of the Shadow Hunter
      'Wrist': [{ wowhead_id: 28454, priority: 'bis' }],  // Stalker's War Bands
      'Hands': [{ wowhead_id: 29756, priority: 'bis' }],  // Gloves of the Fallen Hero (T4 token)
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
    },
    "Gruul's Lair": {
      'Shoulder': [{ wowhead_id: 29762, priority: 'bis' }],  // Pauldrons of the Fallen Hero (T4 token)
      'Legs': [{ wowhead_id: 29765, priority: 'bis' }],  // Leggings of the Fallen Hero (T4 token)
      'Trinket': [{ wowhead_id: 28830, priority: 'bis' }],  // Dragonspine Trophy
      'Finger': [{ wowhead_id: 28823, priority: 'alt' }]  // Eye of Gruul
    },
    "Magtheridon's Lair": {
      'Chest': [{ wowhead_id: 29755, priority: 'bis' }],  // Chestguard of the Fallen Hero (T4 token)
      'Back': [{ wowhead_id: 28797, priority: 'alt' }]  // Cloak of the Pit Stalker
    },
    'Serpentshrine Cavern': {
      'Head': [{ wowhead_id: 30244, priority: 'bis' }],  // Helm of the Vanquished Hero (T5 token)
      'Neck': [{ wowhead_id: 30017, priority: 'bis' }],  // Telonicus's Pendant of Mayhem
      'Shoulder': [{ wowhead_id: 30250, priority: 'bis' }],  // Pauldrons of the Vanquished Hero (T5 token)
      'Back': [{ wowhead_id: 29994, priority: 'bis' }],  // Thalassian Wildercloak
      'Chest': [{ wowhead_id: 30238, priority: 'bis' }],  // Chestguard of the Vanquished Hero (T5 token)
      'Wrist': [{ wowhead_id: 29966, priority: 'bis' }],  // Vambraces of Ending
      'Hands': [{ wowhead_id: 30241, priority: 'bis' }],  // Gloves of the Vanquished Hero (T5 token)
      'Waist': [{ wowhead_id: 30040, priority: 'bis' }],  // Belt of Deep Shadow
      'Legs': [{ wowhead_id: 29995, priority: 'bis' }],  // Leggings of Murderous Intent
      'Feet': [{ wowhead_id: 30104, priority: 'bis' }],  // Cobra-Lash Boots
      'Finger': [
        { wowhead_id: 29997, priority: 'bis' },  // Band of the Ranger-General
        { wowhead_id: 30052, priority: 'bis' }   // Ring of Lethality
      ],
      'Trinket': [
        { wowhead_id: 29383, priority: 'bis' },  // Bloodlust Brooch
        { wowhead_id: 28830, priority: 'bis' }   // Dragonspine Trophy
      ],
      'Main Hand': [{ wowhead_id: 32944, priority: 'bis' }],  // Talon of the Phoenix
      'Off Hand': [{ wowhead_id: 29948, priority: 'bis' }],  // Claw of the Phoenix
      'Ranged': [{ wowhead_id: 30318, priority: 'bis' }]  // Netherstrand Longbow
    },
    'Tempest Keep': {
      'Head': [{ wowhead_id: 30244, priority: 'bis' }],  // Helm of the Vanquished Hero (T5 token)
      'Shoulder': [{ wowhead_id: 30250, priority: 'bis' }],  // Pauldrons of the Vanquished Hero (T5 token)
      'Chest': [{ wowhead_id: 30238, priority: 'bis' }],  // Chestguard of the Vanquished Hero (T5 token)
      'Trinket': [{ wowhead_id: 30627, priority: 'bis' }],  // Tsunami Talisman
      'Ranged': [{ wowhead_id: 30318, priority: 'bis' }]  // Netherstrand Longbow
    },
    'Hyjal Summit': {
      'Head': [{ wowhead_id: 31095, priority: 'bis' }],  // Helm of the Forgotten Protector (T6 token)
      'Hands': [{ wowhead_id: 31094, priority: 'bis' }],  // Gloves of the Forgotten Protector (T6 token)
      'Shoulder': [{ wowhead_id: 30880, priority: 'alt' }],  // Razorfury Mantle
      'Waist': [{ wowhead_id: 30879, priority: 'alt' }]  // Don Alejandro's Money Belt
    },
    'Black Temple': {
      'Head': [{ wowhead_id: 31003, priority: 'bis' }],  // Gronnstalker's Helmet (T6)
      'Neck': [{ wowhead_id: 32362, priority: 'bis' }],  // Pendant of the Titans
      'Shoulder': [{ wowhead_id: 31103, priority: 'bis' }],  // Pauldrons of the Forgotten Protector (T6 token)
      'Back': [{ wowhead_id: 32323, priority: 'bis' }],  // Shadowmoon Destroyer's Drape
      'Chest': [{ wowhead_id: 31091, priority: 'bis' }],  // Chestguard of the Forgotten Protector (T6 token)
      'Wrist': [{ wowhead_id: 32324, priority: 'bis' }],  // Insidious Bands
      'Hands': [{ wowhead_id: 31001, priority: 'bis' }],  // Gronnstalker's Gloves (T6)
      'Waist': [{ wowhead_id: 32256, priority: 'bis' }],  // Waistwrap of Infinity
      'Legs': [{ wowhead_id: 31100, priority: 'bis' }],  // Leggings of the Forgotten Protector (T6 token)
      'Feet': [{ wowhead_id: 32510, priority: 'bis' }],  // Shadowmaster's Boots
      'Finger': [
        { wowhead_id: 32526, priority: 'bis' },  // Band of the Eternal Champion
        { wowhead_id: 32261, priority: 'alt' }   // Ring of Deceitful Intent
      ],
      'Trinket': [
        { wowhead_id: 32505, priority: 'bis' },  // Madness of the Betrayer
        { wowhead_id: 28830, priority: 'bis' }   // Dragonspine Trophy
      ],
      'Main Hand': [{ wowhead_id: 32945, priority: 'bis' }],  // Claw of Molten Fury
      'Off Hand': [{ wowhead_id: 32946, priority: 'bis' }],  // Claw of Molten Fury
      'Ranged': [{ wowhead_id: 32336, priority: 'bis' }]  // Black Bow of the Betrayer
    },
    "Zul'Aman": {
      'Neck': [{ wowhead_id: 33278, priority: 'alt' }],  // Choker of Serrated Blades
      'Back': [{ wowhead_id: 33592, priority: 'alt' }],  // Cloak of Fiends
      'Trinket': [{ wowhead_id: 33831, priority: 'alt' }]  // Berserker's Call
    },
    'Sunwell Plateau': {
      'Ranged': [{ wowhead_id: 34334, priority: 'bis' }],  // Thori'dal, the Stars' Fury
      'Trinket': [{ wowhead_id: 34427, priority: 'bis' }],  // Blackened Naaru Sliver
      'Finger': [{ wowhead_id: 34189, priority: 'bis' }],  // Band of Ruinous Delight
      'Chest': [{ wowhead_id: 34211, priority: 'bis' }]  // Harness of Carnal Instinct
    }
  },

  // ============================================================================
  // WARLOCK
  // ============================================================================
  'Warlock': {
    'Karazhan': {
      'Head': [{ wowhead_id: 29759, priority: 'bis' }],  // Helm of the Fallen Hero (T4 token)
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
    },
    "Gruul's Lair": {
      'Shoulder': [{ wowhead_id: 29762, priority: 'bis' }],  // Pauldrons of the Fallen Hero (T4 token)
      'Legs': [{ wowhead_id: 29765, priority: 'bis' }],  // Leggings of the Fallen Hero (T4 token)
      'Neck': [{ wowhead_id: 28822, priority: 'alt' }]  // Collar of Cho'gall
    },
    "Magtheridon's Lair": {
      'Chest': [{ wowhead_id: 29755, priority: 'bis' }],  // Chestguard of the Fallen Hero (T4 token)
      'Ranged': [{ wowhead_id: 28782, priority: 'bis' }]  // Eredar Wand of Obliteration
    },
    'Serpentshrine Cavern': {
      'Head': [
        { wowhead_id: 32494, priority: 'bis' },  // Destruction Holo-gogs
        { wowhead_id: 30244, priority: 'alt' }   // Helm of the Vanquished Hero (T5 token)
      ],
      'Neck': [{ wowhead_id: 30015, priority: 'bis' }],  // The Sun King's Talisman
      'Shoulder': [
        { wowhead_id: 28967, priority: 'bis' },  // Voidheart Mantle (T4)
        { wowhead_id: 30215, priority: 'alt' }   // Mantle of the Corruptor (T5)
      ],
      'Back': [
        { wowhead_id: 28766, priority: 'bis' },  // Ruby Drape of the Mysticant
        { wowhead_id: 30735, priority: 'alt' }   // Ancient Spellcloak of the Highborne
      ],
      'Chest': [
        { wowhead_id: 30107, priority: 'bis' },  // Vestments of the Sea-Witch
        { wowhead_id: 30238, priority: 'alt' }   // Chestguard of the Vanquished Hero (T5 token)
      ],
      'Wrist': [
        { wowhead_id: 29918, priority: 'bis' },  // Mindstorm Wristbands
        { wowhead_id: 30684, priority: 'alt' }   // Ravager's Cuffs
      ],
      'Hands': [
        { wowhead_id: 28968, priority: 'bis' },  // Voidheart Gloves (T4)
        { wowhead_id: 30725, priority: 'alt' }   // Anger-Spark Gloves
      ],
      'Waist': [
        { wowhead_id: 30038, priority: 'bis' },  // Belt of Blasting
        { wowhead_id: 30064, priority: 'alt' }   // Cord of Screaming Terrors
      ],
      'Legs': [
        { wowhead_id: 30247, priority: 'bis' },  // Leggings of the Vanquished Hero (T5 token)
        { wowhead_id: 30734, priority: 'alt' }   // Leggings of the Seventh Circle
      ],
      'Feet': [
        { wowhead_id: 30037, priority: 'bis' },  // Boots of Blasting
        { wowhead_id: 30050, priority: 'alt' }   // Boots of the Shifting Nightmare
      ],
      'Finger': [
        { wowhead_id: 30109, priority: 'bis' },  // Ring of Endless Coils
        { wowhead_id: 29302, priority: 'alt' }   // Band of Eternity
      ],
      'Trinket': [
        { wowhead_id: 27683, priority: 'bis' },  // Quagmirran's Eye
        { wowhead_id: 29370, priority: 'bis' }   // Icon of the Silver Crescent
      ],
      'Main Hand': [
        { wowhead_id: 32053, priority: 'bis' },  // Merciless Gladiator's Spellblade
        { wowhead_id: 30095, priority: 'alt' }   // Fang of the Leviathan
      ],
      'Held In Off-hand': [
        { wowhead_id: 30049, priority: 'bis' },  // Fathomstone
        { wowhead_id: 29273, priority: 'alt' }   // Khadgar's Knapsack
      ],
      'Ranged': [{ wowhead_id: 29982, priority: 'bis' }]  // Wand of the Forgotten Star
    },
    'Tempest Keep': {
      'Head': [{ wowhead_id: 30244, priority: 'bis' }],  // Helm of the Vanquished Hero (T5 token)
      'Shoulder': [{ wowhead_id: 30215, priority: 'bis' }],  // Voidheart Mantle (T5)
      'Chest': [{ wowhead_id: 30238, priority: 'bis' }],  // Chestguard of the Vanquished Hero (T5 token)
      'Trinket': [{ wowhead_id: 30626, priority: 'bis' }],  // Sextant of Unstable Currents
      'Main Hand': [{ wowhead_id: 30723, priority: 'bis' }]  // Talon of the Phoenix
    },
    'Hyjal Summit': {
      'Head': [{ wowhead_id: 31097, priority: 'bis' }],  // Helm of the Forgotten Conqueror (T6 token)
      'Hands': [{ wowhead_id: 31092, priority: 'bis' }],  // Gloves of the Forgotten Conqueror (T6 token)
      'Two-Hand': [{ wowhead_id: 30910, priority: 'bis' }],  // Tempest of Chaos
      'Legs': [{ wowhead_id: 30916, priority: 'alt' }]  // Leggings of Eternity
    },
    'Black Temple': {
      'Head': [{ wowhead_id: 31051, priority: 'bis' }],  // Hood of the Malefic (T6)
      'Neck': [{ wowhead_id: 32349, priority: 'bis' }],  // Amulet of Unfettered Magics
      'Shoulder': [{ wowhead_id: 31101, priority: 'bis' }],  // Pauldrons of the Forgotten Conqueror (T6 token)
      'Back': [{ wowhead_id: 32337, priority: 'bis' }],  // Cloak of the Illidari Council
      'Chest': [{ wowhead_id: 31089, priority: 'bis' }],  // Chestguard of the Forgotten Conqueror (T6 token)
      'Wrist': [{ wowhead_id: 32586, priority: 'bis' }],  // Bracers of Nimble Thought
      'Hands': [{ wowhead_id: 31050, priority: 'bis' }],  // Gloves of the Malefic (T6)
      'Waist': [{ wowhead_id: 32256, priority: 'bis' }],  // Waistwrap of Infinity
      'Legs': [{ wowhead_id: 31098, priority: 'bis' }],  // Leggings of the Forgotten Conqueror (T6 token)
      'Feet': [{ wowhead_id: 32239, priority: 'bis' }],  // Slippers of the Seacaller
      'Finger': [
        { wowhead_id: 32527, priority: 'bis' },  // Ring of Captured Storms
        { wowhead_id: 32247, priority: 'alt' }   // Band of the Eternal Sage
      ],
      'Trinket': [
        { wowhead_id: 32483, priority: 'bis' },  // The Skull of Gul'dan
        { wowhead_id: 34429, priority: 'alt' }   // Shifting Naaru Sliver
      ],
      'Two-Hand': [{ wowhead_id: 32374, priority: 'bis' }],  // Zhar'doom, Greatstaff of the Devourer
      'Ranged': [{ wowhead_id: 32348, priority: 'bis' }]  // Wand of Prismatic Focus
    },
    "Zul'Aman": {
      'Two-Hand': [{ wowhead_id: 33354, priority: 'alt' }],  // Amani Divining Staff
      'Trinket': [{ wowhead_id: 33829, priority: 'alt' }],  // Hex Shrunken Head
      'Finger': [{ wowhead_id: 33497, priority: 'alt' }]  // Signet of Eternal Life
    },
    'Sunwell Plateau': {
      'Two-Hand': [{ wowhead_id: 34182, priority: 'bis' }],  // Grand Magister's Staff of Torrents
      'Trinket': [{ wowhead_id: 34429, priority: 'bis' }],  // Shifting Naaru Sliver
      'Finger': [{ wowhead_id: 34362, priority: 'bis' }],  // Loop of Forged Power
      'Chest': [{ wowhead_id: 34364, priority: 'bis' }]  // Sunfire Robe
    }
  },

  // ============================================================================
  // ROGUE
  // ============================================================================
  'Rogue': {
    'Karazhan': {
      'Head': [{ wowhead_id: 29760, priority: 'bis' }],  // Helm of the Fallen Champion (T4 token)
      'Neck': [{ wowhead_id: 28674, priority: 'bis' }],  // Saberclaw Talisman
      'Shoulder': [{ wowhead_id: 28755, priority: 'bis' }],  // Bladed Shoulderpads of the Merciless
      'Back': [{ wowhead_id: 28672, priority: 'bis' }],  // Drape of the Dark Reavers
      'Chest': [{ wowhead_id: 28746, priority: 'bis' }],  // Fiend Slayer Breastplate
      'Wrist': [{ wowhead_id: 28453, priority: 'bis' }],  // Bracers of the White Stag
      'Hands': [{ wowhead_id: 29757, priority: 'bis' }],  // Gloves of the Fallen Champion (T4 token)
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
    },
    "Gruul's Lair": {
      'Shoulder': [{ wowhead_id: 29763, priority: 'bis' }],  // Pauldrons of the Fallen Champion (T4 token)
      'Legs': [{ wowhead_id: 29766, priority: 'bis' }],  // Leggings of the Fallen Champion (T4 token)
      'Trinket': [{ wowhead_id: 28830, priority: 'bis' }],  // Dragonspine Trophy
      'Waist': [{ wowhead_id: 28828, priority: 'alt' }]  // Gronn-Stitched Girdle
    },
    "Magtheridon's Lair": {
      'Chest': [{ wowhead_id: 29754, priority: 'bis' }],  // Chestguard of the Fallen Champion (T4 token)
      'Back': [{ wowhead_id: 28797, priority: 'alt' }]  // Cloak of the Pit Stalker
    },
    'Serpentshrine Cavern': {
      'Head': [{ wowhead_id: 30242, priority: 'bis' }],  // Helm of the Vanquished Champion (T5 token)
      'Neck': [{ wowhead_id: 29381, priority: 'bis' }],  // Choker of Vile Intent
      'Shoulder': [
        { wowhead_id: 30248, priority: 'bis' },  // Pauldrons of the Vanquished Champion (T5 token)
        { wowhead_id: 30055, priority: 'alt' }   // Shoulderpads of the Stranger
      ],
      'Back': [{ wowhead_id: 28672, priority: 'bis' }],  // Drape of the Dark Reavers
      'Chest': [
        { wowhead_id: 30101, priority: 'bis' },  // Bloodsea Brigand's Vest
        { wowhead_id: 30236, priority: 'alt' }   // Chestguard of the Vanquished Champion (T5 token)
      ],
      'Wrist': [{ wowhead_id: 29966, priority: 'bis' }],  // Vambraces of Ending
      'Hands': [{ wowhead_id: 30239, priority: 'bis' }],  // Gloves of the Vanquished Champion (T5 token)
      'Waist': [{ wowhead_id: 30106, priority: 'bis' }],  // Belt of One-Hundred Deaths
      'Legs': [{ wowhead_id: 30245, priority: 'bis' }],  // Leggings of the Vanquished Champion (T5 token)
      'Feet': [{ wowhead_id: 28545, priority: 'bis' }],  // Edgewalker Longboots
      'Finger': [
        { wowhead_id: 30052, priority: 'bis' },  // Ring of Lethality
        { wowhead_id: 29997, priority: 'bis' }   // Band of the Ranger-General
      ],
      'Trinket': [
        { wowhead_id: 28830, priority: 'bis' },  // Dragonspine Trophy
        { wowhead_id: 30450, priority: 'bis' }   // Warp-Spring Coil
      ],
      'Main Hand': [{ wowhead_id: 30082, priority: 'bis' }],  // Talon of Azshara
      'Off Hand': [{ wowhead_id: 32027, priority: 'bis' }],  // Merciless Gladiator's Quickblade
      'Ranged': [{ wowhead_id: 29949, priority: 'bis' }]  // Arcanite Steam-Pistol
    },
    'Tempest Keep': {
      'Head': [{ wowhead_id: 30242, priority: 'bis' }],  // Helm of the Vanquished Champion (T5 token)
      'Shoulder': [{ wowhead_id: 30248, priority: 'bis' }],  // Pauldrons of the Vanquished Champion (T5 token)
      'Chest': [{ wowhead_id: 30236, priority: 'bis' }],  // Chestguard of the Vanquished Champion (T5 token)
      'Trinket': [{ wowhead_id: 30627, priority: 'bis' }],  // Tsunami Talisman
      'Main Hand': [{ wowhead_id: 30311, priority: 'bis' }],  // Warp Slicer
      'Off Hand': [{ wowhead_id: 30312, priority: 'bis' }]  // Infinity Blade
    },
    'Hyjal Summit': {
      'Head': [{ wowhead_id: 31096, priority: 'bis' }],  // Helm of the Forgotten Vanquisher (T6)
      'Hands': [{ wowhead_id: 31093, priority: 'bis' }],  // Gloves of the Forgotten Vanquisher (T6)
      'Shoulder': [{ wowhead_id: 30880, priority: 'alt' }]  // Razorfury Mantle
    },
    'Black Temple': {
      'Head': [{ wowhead_id: 32235, priority: 'bis' }],  // Cursed Vision of Sargeras
      'Neck': [{ wowhead_id: 32361, priority: 'bis' }],  // Choker of Serrated Blades
      'Shoulder': [{ wowhead_id: 31102, priority: 'bis' }],  // Pauldrons of the Forgotten Vanquisher (T6 token)
      'Back': [{ wowhead_id: 32323, priority: 'bis' }],  // Shadowmoon Destroyer's Drape
      'Chest': [{ wowhead_id: 31090, priority: 'bis' }],  // Chestguard of the Forgotten Vanquisher (T6 token)
      'Wrist': [{ wowhead_id: 32324, priority: 'bis' }],  // Insidious Bands
      'Hands': [{ wowhead_id: 31026, priority: 'bis' }],  // Slayer's Handguards (T6)
      'Waist': [{ wowhead_id: 32256, priority: 'bis' }],  // Waistwrap of Infinity
      'Legs': [{ wowhead_id: 31099, priority: 'bis' }],  // Leggings of the Forgotten Vanquisher (T6 token)
      'Feet': [{ wowhead_id: 32510, priority: 'bis' }],  // Shadowmaster's Boots
      'Finger': [
        { wowhead_id: 32526, priority: 'bis' },  // Band of the Eternal Champion
        { wowhead_id: 32261, priority: 'alt' }   // Ring of Deceitful Intent
      ],
      'Trinket': [
        { wowhead_id: 32505, priority: 'bis' },  // Madness of the Betrayer
        { wowhead_id: 28830, priority: 'bis' }   // Dragonspine Trophy
      ],
      'Main Hand': [{ wowhead_id: 32837, priority: 'bis' }],  // Warglaive of Azzinoth (MH)
      'Off Hand': [{ wowhead_id: 32838, priority: 'bis' }],  // Warglaive of Azzinoth (OH)
      'Ranged': [{ wowhead_id: 34003, priority: 'bis' }]  // Legionkiller
    },
    "Zul'Aman": {
      'Neck': [{ wowhead_id: 33278, priority: 'alt' }],  // Choker of Serrated Blades
      'One-Hand': [{ wowhead_id: 33214, priority: 'alt' }],  // Akil'zon's Talonblade
      'Trinket': [{ wowhead_id: 33831, priority: 'alt' }]  // Berserker's Call
    },
    'Sunwell Plateau': {
      'Main Hand': [{ wowhead_id: 34329, priority: 'bis' }],  // Crux of the Apocalypse
      'Off Hand': [{ wowhead_id: 34197, priority: 'bis' }],  // Shiv of Exsanguination
      'Trinket': [{ wowhead_id: 34427, priority: 'bis' }],  // Blackened Naaru Sliver
      'Finger': [{ wowhead_id: 34189, priority: 'bis' }]  // Band of Ruinous Delight
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
