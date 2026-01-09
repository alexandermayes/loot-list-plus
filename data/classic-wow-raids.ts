/**
 * Classic WoW Raid and Loot Data
 * Data sourced from Wowhead Classic
 */

export interface RaidData {
  name: string
  tier: string
  bosses: BossData[]
}

export interface BossData {
  name: string
  items: LootItemData[]
}

export interface LootItemData {
  name: string
  slot: string
  wowhead_id: number
}

export const classicRaids: RaidData[] = [
  {
    name: 'Molten Core',
    tier: 'Tier 1',
    bosses: [
      {
        name: 'Lucifron',
        items: [
          { name: 'Arcanist Boots', slot: 'Feet', wowhead_id: 16800 },
          { name: 'Felheart Gloves', slot: 'Hands', wowhead_id: 16805 },
          { name: 'Cenarion Boots', slot: 'Feet', wowhead_id: 16829 },
          { name: 'Earthfury Boots', slot: 'Feet', wowhead_id: 16837 },
          { name: 'Lawbringer Boots', slot: 'Feet', wowhead_id: 16859 },
          { name: "Giantstalker's Boots", slot: 'Feet', wowhead_id: 16849 },
        ],
      },
      {
        name: 'Magmadar',
        items: [
          { name: 'Arcanist Leggings', slot: 'Legs', wowhead_id: 16796 },
          { name: 'Felheart Pants', slot: 'Legs', wowhead_id: 16810 },
          { name: 'Cenarion Leggings', slot: 'Legs', wowhead_id: 16835 },
          { name: 'Earthfury Legguards', slot: 'Legs', wowhead_id: 16843 },
          { name: 'Medallion of Steadfast Might', slot: 'Neck', wowhead_id: 17065 },
          { name: 'Earthshaker', slot: 'Weapon', wowhead_id: 17073 },
          { name: "Striker's Mark", slot: 'Ranged', wowhead_id: 17069 },
        ],
      },
      {
        name: 'Garr',
        items: [
          { name: 'Arcanist Crown', slot: 'Head', wowhead_id: 16795 },
          { name: 'Nightslayer Cover', slot: 'Head', wowhead_id: 16821 },
          { name: 'Cenarion Helm', slot: 'Head', wowhead_id: 16834 },
          { name: 'Helm of Might', slot: 'Head', wowhead_id: 16866 },
          { name: 'Circlet of Prophecy', slot: 'Head', wowhead_id: 16813 },
          { name: 'Drillborer Disk', slot: 'Off Hand', wowhead_id: 17066 },
          { name: 'Aurastone Hammer', slot: 'Weapon', wowhead_id: 17105 },
          { name: 'Gutgore Ripper', slot: 'Weapon', wowhead_id: 17071 },
          { name: 'Brutality Blade', slot: 'Weapon', wowhead_id: 18832 },
        ],
      },
      {
        name: 'Baron Geddon',
        items: [
          { name: 'Arcanist Mantle', slot: 'Shoulder', wowhead_id: 16797 },
          { name: 'Felheart Shoulder Pads', slot: 'Shoulder', wowhead_id: 16807 },
          { name: 'Cenarion Spaulders', slot: 'Shoulder', wowhead_id: 16836 },
          { name: 'Earthfury Epaulets', slot: 'Shoulder', wowhead_id: 16844 },
          { name: 'Lawbringer Spaulders', slot: 'Shoulder', wowhead_id: 16856 },
          { name: 'Seal of the Archmagus', slot: 'Finger', wowhead_id: 17110 },
        ],
      },
      {
        name: 'Shazzrah',
        items: [
          { name: 'Arcanist Gloves', slot: 'Hands', wowhead_id: 16801 },
          { name: 'Felheart Slippers', slot: 'Feet', wowhead_id: 16803 },
          { name: 'Nightslayer Boots', slot: 'Feet', wowhead_id: 16824 },
          { name: 'Cenarion Gloves', slot: 'Hands', wowhead_id: 16831 },
          { name: 'Boots of Prophecy', slot: 'Feet', wowhead_id: 16811 },
          { name: "Giantstalker's Gloves", slot: 'Hands', wowhead_id: 16852 },
        ],
      },
      {
        name: 'Golemagg the Incinerator',
        items: [
          { name: 'Arcanist Robes', slot: 'Chest', wowhead_id: 16798 },
          { name: 'Felheart Robes', slot: 'Chest', wowhead_id: 16809 },
          { name: 'Cenarion Vestments', slot: 'Chest', wowhead_id: 16833 },
          { name: 'Earthfury Vestments', slot: 'Chest', wowhead_id: 16841 },
          { name: "Giantstalker's Breastplate", slot: 'Chest', wowhead_id: 16845 },
          { name: 'Breastplate of Might', slot: 'Chest', wowhead_id: 16865 },
          { name: 'Blastershot Launcher', slot: 'Ranged', wowhead_id: 17072 },
          { name: 'Azuresong Mageblade', slot: 'Weapon', wowhead_id: 17103 },
          { name: 'Staff of Dominance', slot: 'Weapon', wowhead_id: 18842 },
        ],
      },
      {
        name: 'Sulfuron Harbinger',
        items: [
          { name: 'Nightslayer Shoulder Pads', slot: 'Shoulder', wowhead_id: 16823 },
          { name: 'Mantle of Prophecy', slot: 'Shoulder', wowhead_id: 16816 },
          { name: 'Shadowstrike', slot: 'Weapon', wowhead_id: 17074 },
        ],
      },
      {
        name: 'Ragnaros',
        items: [
          { name: 'Stormrage Legguards', slot: 'Legs', wowhead_id: 16901 },
          { name: 'Bloodfang Pants', slot: 'Legs', wowhead_id: 16909 },
          { name: 'Netherwind Pants', slot: 'Legs', wowhead_id: 16915 },
          { name: 'Leggings of Transcendence', slot: 'Legs', wowhead_id: 16922 },
          { name: 'Nemesis Leggings', slot: 'Legs', wowhead_id: 16930 },
          { name: "Dragonstalker's Legguards", slot: 'Legs', wowhead_id: 16938 },
          { name: 'Legplates of Ten Storms', slot: 'Legs', wowhead_id: 16946 },
          { name: 'Judgement Legplates', slot: 'Legs', wowhead_id: 16954 },
          { name: 'Legplates of Wrath', slot: 'Legs', wowhead_id: 16962 },
          { name: 'Band of Accuria', slot: 'Finger', wowhead_id: 17063 },
          { name: "Bonereaver's Edge", slot: 'Weapon', wowhead_id: 17076 },
          { name: 'Spinal Reaper', slot: 'Weapon', wowhead_id: 17104 },
          { name: "Malistar's Defender", slot: 'Off Hand', wowhead_id: 17106 },
          { name: "Dragon's Blood Cape", slot: 'Back', wowhead_id: 17107 },
          { name: 'Cloak of the Shrouded Mists', slot: 'Back', wowhead_id: 17102 },
          { name: 'Choker of the Fire Lord', slot: 'Neck', wowhead_id: 18814 },
          { name: 'Essence of the Pure Flame', slot: 'Trinket', wowhead_id: 18815 },
          { name: "Perdition's Blade", slot: 'Weapon', wowhead_id: 18816 },
          { name: 'Crown of Destruction', slot: 'Head', wowhead_id: 18817 },
          { name: 'Onslaught Girdle', slot: 'Waist', wowhead_id: 19137 },
          { name: 'Band of Sulfuras', slot: 'Finger', wowhead_id: 19138 },
          { name: 'Eye of Sulfuras', slot: 'Quest', wowhead_id: 17204 },
        ],
      },
    ],
  },
  {
    name: 'Blackwing Lair',
    tier: 'Tier 2',
    bosses: [
      {
        name: 'Razorgore the Untamed',
        items: [
          { name: 'The Untamed Blade', slot: 'Weapon', wowhead_id: 19334 },
          { name: 'Spineshatter', slot: 'Weapon', wowhead_id: 19335 },
        ],
      },
      {
        name: 'Vaelastrasz the Corrupt',
        items: [
          { name: 'Dragonfang Blade', slot: 'Weapon', wowhead_id: 19346 },
          { name: 'Red Dragonscale Protector', slot: 'Off Hand', wowhead_id: 19348 },
          { name: 'Mind Quickening Gem', slot: 'Trinket', wowhead_id: 19339 },
        ],
      },
      {
        name: 'Broodlord Lashlayer',
        items: [
          { name: 'Maladath, Runed Blade of the Black Flight', slot: 'Weapon', wowhead_id: 19351 },
          { name: 'Heartstriker', slot: 'Ranged', wowhead_id: 19350 },
          { name: 'Lifegiving Gem', slot: 'Trinket', wowhead_id: 19341 },
        ],
      },
      {
        name: 'Firemaw',
        items: [
          { name: 'Claw of the Black Drake', slot: 'Weapon', wowhead_id: 19365 },
          { name: 'Dragonbreath Hand Cannon', slot: 'Ranged', wowhead_id: 19368 },
        ],
      },
      {
        name: 'Ebonroc',
        items: [
          { name: 'Malfurion\'s Blessed Bulwark', slot: 'Off Hand', wowhead_id: 19349 },
        ],
      },
      {
        name: 'Flamegor',
        items: [
          { name: 'Dragon\'s Touch', slot: 'Weapon', wowhead_id: 19353 },
        ],
      },
      {
        name: 'Chromaggus',
        items: [
          { name: 'Chromatically Tempered Sword', slot: 'Weapon', wowhead_id: 19352 },
          { name: 'Ashjre\'thul, Crossbow of Smiting', slot: 'Ranged', wowhead_id: 19361 },
        ],
      },
      {
        name: 'Nefarian',
        items: [
          { name: 'Staff of the Shadow Flame', slot: 'Weapon', wowhead_id: 19356 },
          { name: 'Ashkandi, Greatsword of the Brotherhood', slot: 'Weapon', wowhead_id: 19364 },
        ],
      },
    ],
  },
  {
    name: "Onyxia's Lair",
    tier: 'Tier 2',
    bosses: [
      {
        name: 'Onyxia',
        items: [
          { name: 'Drakefire Amulet', slot: 'Neck', wowhead_id: 16309 },
          { name: "Quel'Serrar", slot: 'Weapon', wowhead_id: 18348 },
        ],
      },
    ],
  },
  {
    name: "Zul'Gurub",
    tier: 'Tier 1.5',
    bosses: [
      {
        name: 'High Priest Venoxis',
        items: [
          { name: 'Zanzil\'s Band', slot: 'Finger', wowhead_id: 19893 },
        ],
      },
      {
        name: 'High Priestess Jeklik',
        items: [
          { name: 'Jeklik\'s Crusher', slot: 'Weapon', wowhead_id: 19918 },
        ],
      },
      {
        name: 'High Priestess Mar\'li',
        items: [
          { name: 'Mar\'li\'s Touch', slot: 'Weapon', wowhead_id: 19871 },
        ],
      },
      {
        name: 'High Priest Thekal',
        items: [
          { name: 'Thekal\'s Grasp', slot: 'Weapon', wowhead_id: 19896 },
        ],
      },
      {
        name: 'High Priestess Arlokk',
        items: [
          { name: 'Arlokk\'s Grasp', slot: 'Weapon', wowhead_id: 19910 },
        ],
      },
      {
        name: 'Bloodlord Mandokir',
        items: [
          { name: 'Bloodlord\'s Defender', slot: 'Off Hand', wowhead_id: 19867 },
        ],
      },
      {
        name: 'Jin\'do the Hexxer',
        items: [
          { name: 'Jin\'do\'s Judgement', slot: 'Weapon', wowhead_id: 19884 },
        ],
      },
      {
        name: 'Hakkar',
        items: [
          { name: 'Zin\'rokh, Destroyer of Worlds', slot: 'Weapon', wowhead_id: 19854 },
          { name: 'Seal of the Gurubashi Berserker', slot: 'Finger', wowhead_id: 22722 },
          { name: 'Band of Servitude', slot: 'Finger', wowhead_id: 22721 },
        ],
      },
    ],
  },
  {
    name: 'Temple of Ahn\'Qiraj',
    tier: 'Tier 2.5',
    bosses: [
      {
        name: 'The Prophet Skeram',
        items: [
          { name: 'Boots of the Fallen Prophet', slot: 'Feet', wowhead_id: 21701 },
          { name: 'Hammer of Ji\'zhi', slot: 'Weapon', wowhead_id: 21715 },
        ],
      },
      {
        name: 'Silithid Royalty',
        items: [
          { name: 'Ring of Emperor Vek\'lor', slot: 'Finger', wowhead_id: 21602 },
        ],
      },
      {
        name: 'Battleguard Sartura',
        items: [
          { name: 'Sartura\'s Might', slot: 'Weapon', wowhead_id: 21635 },
        ],
      },
      {
        name: 'Fankriss the Unyielding',
        items: [
          { name: 'Scepter of the False Prophet', slot: 'Weapon', wowhead_id: 21673 },
        ],
      },
      {
        name: 'Viscidus',
        items: [
          { name: 'Gauntlets of Kalimdor', slot: 'Hands', wowhead_id: 21618 },
        ],
      },
      {
        name: 'Princess Huhuran',
        items: [
          { name: 'Hive Defiler Wristbands', slot: 'Wrist', wowhead_id: 21618 },
        ],
      },
      {
        name: 'Twin Emperors',
        items: [
          { name: 'Kalimdor\'s Revenge', slot: 'Weapon', wowhead_id: 21679 },
        ],
      },
      {
        name: 'Ouro',
        items: [
          { name: 'Ouro\'s Intact Hide', slot: 'Back', wowhead_id: 21710 },
        ],
      },
      {
        name: 'C\'Thun',
        items: [
          { name: 'Eye of C\'Thun', slot: 'Quest', wowhead_id: 21221 },
          { name: 'Carapace of the Old God', slot: 'Chest', wowhead_id: 21680 },
        ],
      },
    ],
  },
  {
    name: 'Ruins of Ahn\'Qiraj',
    tier: 'Tier 1.5',
    bosses: [
      {
        name: 'Kurinnaxx',
        items: [
          { name: 'Qiraji Ornate Hilt', slot: 'Quest', wowhead_id: 20886 },
        ],
      },
      {
        name: 'General Rajaxx',
        items: [
          { name: 'Boots of the Desert Protector', slot: 'Feet', wowhead_id: 21492 },
        ],
      },
      {
        name: 'Moam',
        items: [
          { name: 'Sharpened Silithid Femur', slot: 'Weapon', wowhead_id: 21268 },
        ],
      },
      {
        name: 'Buru the Gorger',
        items: [
          { name: 'Buru\'s Skull Fragment', slot: 'Off Hand', wowhead_id: 21258 },
        ],
      },
      {
        name: 'Ayamiss the Hunter',
        items: [
          { name: 'Bow of Taut Sinew', slot: 'Ranged', wowhead_id: 21242 },
        ],
      },
      {
        name: 'Ossirian the Unscarred',
        items: [
          { name: 'Ossirian\'s Binding', slot: 'Waist', wowhead_id: 21461 },
        ],
      },
    ],
  },
  {
    name: 'Naxxramas',
    tier: 'Tier 3',
    bosses: [
      {
        name: 'Anub\'Rekhan',
        items: [
          { name: 'Cryptfiend Silk Cloak', slot: 'Back', wowhead_id: 22676 },
        ],
      },
      {
        name: 'Grand Widow Faerlina',
        items: [
          { name: 'Widow\'s Embrace', slot: 'Chest', wowhead_id: 22806 },
        ],
      },
      {
        name: 'Maexxna',
        items: [
          { name: 'Maexxna\'s Fang', slot: 'Weapon', wowhead_id: 22804 },
        ],
      },
      {
        name: 'Noth the Plaguebringer',
        items: [
          { name: 'Thane\'s Resolve', slot: 'Weapon', wowhead_id: 22816 },
        ],
      },
      {
        name: 'Heigan the Unclean',
        items: [
          { name: 'Heigan\'s Cloak', slot: 'Back', wowhead_id: 23068 },
        ],
      },
      {
        name: 'Loatheb',
        items: [
          { name: 'The End of Dreams', slot: 'Weapon', wowhead_id: 23014 },
        ],
      },
      {
        name: 'Instructor Razuvious',
        items: [
          { name: 'Kingsfall', slot: 'Weapon', wowhead_id: 23017 },
        ],
      },
      {
        name: 'Gothik the Harvester',
        items: [
          { name: 'Sadist\'s Collar', slot: 'Neck', wowhead_id: 23021 },
        ],
      },
      {
        name: 'Four Horsemen',
        items: [
          { name: 'Doomfinger', slot: 'Weapon', wowhead_id: 23000 },
        ],
      },
      {
        name: 'Patchwerk',
        items: [
          { name: 'Ghoul Skin Tunic', slot: 'Chest', wowhead_id: 22960 },
        ],
      },
      {
        name: 'Grobbulus',
        items: [
          { name: 'Stinger of Ayamiss', slot: 'Weapon', wowhead_id: 21242 },
        ],
      },
      {
        name: 'Gluth',
        items: [
          { name: 'The Larval Acid', slot: 'Trinket', wowhead_id: 23047 },
        ],
      },
      {
        name: 'Thaddius',
        items: [
          { name: 'Spire of Twilight', slot: 'Weapon', wowhead_id: 23070 },
        ],
      },
      {
        name: 'Sapphiron',
        items: [
          { name: 'Claw of the Frost Wyrm', slot: 'Weapon', wowhead_id: 23549 },
        ],
      },
      {
        name: 'Kel\'Thuzad',
        items: [
          { name: 'The Phylactery of Kel\'Thuzad', slot: 'Quest', wowhead_id: 22520 },
          { name: 'Gressil, Dawn of Ruin', slot: 'Weapon', wowhead_id: 23054 },
        ],
      },
    ],
  },
]
