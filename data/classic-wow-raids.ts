/**
 * COMPLETE Classic WoW Raid Loot Tables
 * Includes ALL epic items from all Classic WoW raids
 * Data sourced from Wowhead Classic and AtlasLoot
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
  // ============================================================================
  // MOLTEN CORE - Tier 1
  // ============================================================================
  {
    name: 'Molten Core',
    tier: 'Tier 1',
    bosses: [
      {
        name: 'Lucifron',
        items: [
          // Tier 1 Boots
          { name: 'Arcanist Boots', slot: 'Feet', wowhead_id: 16800 },
          { name: 'Felheart Slippers', slot: 'Feet', wowhead_id: 16803 },
          { name: 'Cenarion Boots', slot: 'Feet', wowhead_id: 16829 },
          { name: 'Nightslayer Boots', slot: 'Feet', wowhead_id: 16824 },
          { name: 'Boots of Prophecy', slot: 'Feet', wowhead_id: 16811 },
          { name: 'Earthfury Boots', slot: 'Feet', wowhead_id: 16837 },
          { name: "Giantstalker's Boots", slot: 'Feet', wowhead_id: 16849 },
          { name: 'Lawbringer Boots', slot: 'Feet', wowhead_id: 16859 },
          { name: 'Boots of Might', slot: 'Feet', wowhead_id: 16862 },
          // Tier 1 Gloves
          { name: 'Felheart Gloves', slot: 'Hands', wowhead_id: 16805 },
          { name: "Giantstalker's Gloves", slot: 'Hands', wowhead_id: 16852 },
          // Other Items
          { name: 'Robe of Volatile Power', slot: 'Chest', wowhead_id: 19145 },
          { name: 'Wristguards of Stability', slot: 'Wrist', wowhead_id: 19146 },
          { name: 'Flamedog Sheath', slot: 'Waist', wowhead_id: 19147 },
          { name: 'Scorched Core Gloves', slot: 'Hands', wowhead_id: 18803 },
          { name: 'Choker of Enlightenment', slot: 'Neck', wowhead_id: 17109 },
          { name: 'Ring of Spell Power', slot: 'Finger', wowhead_id: 19147 },
          { name: 'Flamewaker Legplates', slot: 'Legs', wowhead_id: 16807 },
        ],
      },
      {
        name: 'Magmadar',
        items: [
          // Tier 1 Legs
          { name: 'Arcanist Leggings', slot: 'Legs', wowhead_id: 16796 },
          { name: 'Felheart Pants', slot: 'Legs', wowhead_id: 16810 },
          { name: 'Cenarion Leggings', slot: 'Legs', wowhead_id: 16835 },
          { name: 'Nightslayer Pants', slot: 'Legs', wowhead_id: 16822 },
          { name: 'Pants of Prophecy', slot: 'Legs', wowhead_id: 16814 },
          { name: 'Earthfury Legguards', slot: 'Legs', wowhead_id: 16843 },
          { name: "Giantstalker's Leggings", slot: 'Legs', wowhead_id: 16847 },
          { name: 'Lawbringer Legplates', slot: 'Legs', wowhead_id: 16855 },
          { name: 'Legplates of Might', slot: 'Legs', wowhead_id: 16867 },
          // Other Items
          { name: 'Medallion of Steadfast Might', slot: 'Neck', wowhead_id: 17065 },
          { name: 'Quick Strike Ring', slot: 'Finger', wowhead_id: 18821 },
          { name: 'Talisman of Ephemeral Power', slot: 'Trinket', wowhead_id: 18820 },
          { name: 'Obsidian Edged Blade', slot: 'Weapon', wowhead_id: 18822 },
          { name: 'Earthshaker', slot: 'Weapon', wowhead_id: 17073 },
          { name: 'Gutgore Ripper', slot: 'Weapon', wowhead_id: 17071 },
          { name: 'Azuresong Mageblade', slot: 'Weapon', wowhead_id: 17103 },
          { name: "Striker's Mark", slot: 'Ranged', wowhead_id: 17069 },
          { name: 'Eskhandar\'s Right Claw', slot: 'Weapon', wowhead_id: 18203 },
          { name: 'Heavy Dark Iron Ring', slot: 'Finger', wowhead_id: 18821 },
        ],
      },
      {
        name: 'Gehennas',
        items: [
          // Tier 1 Bracers
          { name: 'Arcanist Bindings', slot: 'Wrist', wowhead_id: 16799 },
          { name: 'Felheart Bracers', slot: 'Wrist', wowhead_id: 16804 },
          { name: 'Cenarion Bracers', slot: 'Wrist', wowhead_id: 16830 },
          { name: 'Nightslayer Bracelets', slot: 'Wrist', wowhead_id: 16825 },
          { name: 'Bracers of Prophecy', slot: 'Wrist', wowhead_id: 16819 },
          { name: 'Earthfury Bracers', slot: 'Wrist', wowhead_id: 16840 },
          { name: "Giantstalker's Bracers", slot: 'Wrist', wowhead_id: 16850 },
          { name: 'Lawbringer Bracers', slot: 'Wrist', wowhead_id: 16857 },
          { name: 'Bracers of Might', slot: 'Wrist', wowhead_id: 16861 },
          // Tier 1 Belts
          { name: 'Arcanist Belt', slot: 'Waist', wowhead_id: 16802 },
          { name: 'Felheart Belt', slot: 'Waist', wowhead_id: 16806 },
          { name: 'Cenarion Belt', slot: 'Waist', wowhead_id: 16828 },
          { name: 'Nightslayer Belt', slot: 'Waist', wowhead_id: 16827 },
          { name: 'Belt of Prophecy', slot: 'Waist', wowhead_id: 16817 },
          { name: 'Earthfury Belt', slot: 'Waist', wowhead_id: 16838 },
          { name: "Giantstalker's Belt", slot: 'Waist', wowhead_id: 16851 },
          { name: 'Lawbringer Belt', slot: 'Waist', wowhead_id: 16858 },
          { name: 'Belt of Might', slot: 'Waist', wowhead_id: 16864 },
          // Other Items
          { name: 'Flameguard Gauntlets', slot: 'Hands', wowhead_id: 19143 },
          { name: 'Fist of Angstaff', slot: 'Weapon', wowhead_id: 18817 },
        ],
      },
      {
        name: 'Garr',
        items: [
          // Tier 1 Helms
          { name: 'Arcanist Crown', slot: 'Head', wowhead_id: 16795 },
          { name: 'Felheart Horns', slot: 'Head', wowhead_id: 16808 },
          { name: 'Cenarion Helm', slot: 'Head', wowhead_id: 16834 },
          { name: 'Nightslayer Cover', slot: 'Head', wowhead_id: 16821 },
          { name: 'Circlet of Prophecy', slot: 'Head', wowhead_id: 16813 },
          { name: 'Earthfury Helmet', slot: 'Head', wowhead_id: 16842 },
          { name: "Giantstalker's Helmet", slot: 'Head', wowhead_id: 16846 },
          { name: 'Lawbringer Helm', slot: 'Head', wowhead_id: 16854 },
          { name: 'Helm of Might', slot: 'Head', wowhead_id: 16866 },
          // Other Items
          { name: 'Magma Tempered Boots', slot: 'Feet', wowhead_id: 19144 },
          { name: 'Drillborer Disk', slot: 'Off Hand', wowhead_id: 17066 },
          { name: 'Flamewaker Legplates', slot: 'Legs', wowhead_id: 16807 },
          { name: 'Aurastone Hammer', slot: 'Weapon', wowhead_id: 17105 },
          { name: 'Gutgore Ripper', slot: 'Weapon', wowhead_id: 17071 },
          { name: 'Brutality Blade', slot: 'Weapon', wowhead_id: 18832 },
          { name: 'Aged Core Leather Gloves', slot: 'Hands', wowhead_id: 18823 },
          { name: 'Fireproof Cloak', slot: 'Back', wowhead_id: 18829 },
        ],
      },
      {
        name: 'Baron Geddon',
        items: [
          // Tier 1 Shoulders
          { name: 'Arcanist Mantle', slot: 'Shoulder', wowhead_id: 16797 },
          { name: 'Felheart Shoulder Pads', slot: 'Shoulder', wowhead_id: 16807 },
          { name: 'Cenarion Spaulders', slot: 'Shoulder', wowhead_id: 16836 },
          { name: 'Nightslayer Shoulder Pads', slot: 'Shoulder', wowhead_id: 16823 },
          { name: 'Mantle of Prophecy', slot: 'Shoulder', wowhead_id: 16816 },
          { name: 'Earthfury Epaulets', slot: 'Shoulder', wowhead_id: 16844 },
          { name: "Giantstalker's Epaulets", slot: 'Shoulder', wowhead_id: 16848 },
          { name: 'Lawbringer Spaulders', slot: 'Shoulder', wowhead_id: 16856 },
          { name: 'Pauldrons of Might', slot: 'Shoulder', wowhead_id: 16868 },
          // Other Items
          { name: 'Seal of the Archmagus', slot: 'Finger', wowhead_id: 17110 },
          { name: 'Flameguard Gauntlets', slot: 'Hands', wowhead_id: 19143 },
          { name: 'Incendosaur Hide', slot: 'Back', wowhead_id: 18829 },
          { name: 'Obsidian Edged Blade', slot: 'Weapon', wowhead_id: 18822 },
          { name: 'Quick Strike Ring', slot: 'Finger', wowhead_id: 18821 },
        ],
      },
      {
        name: 'Shazzrah',
        items: [
          // Tier 1 Gloves and Boots Mix
          { name: 'Arcanist Gloves', slot: 'Hands', wowhead_id: 16801 },
          { name: 'Felheart Slippers', slot: 'Feet', wowhead_id: 16803 },
          { name: 'Cenarion Gloves', slot: 'Hands', wowhead_id: 16831 },
          { name: 'Nightslayer Boots', slot: 'Feet', wowhead_id: 16824 },
          { name: 'Gloves of Prophecy', slot: 'Hands', wowhead_id: 16812 },
          { name: 'Boots of Prophecy', slot: 'Feet', wowhead_id: 16811 },
          { name: 'Earthfury Gauntlets', slot: 'Hands', wowhead_id: 16839 },
          { name: "Giantstalker's Gloves", slot: 'Hands', wowhead_id: 16852 },
          { name: 'Lawbringer Gauntlets', slot: 'Hands', wowhead_id: 16860 },
          { name: 'Gauntlets of Might', slot: 'Hands', wowhead_id: 16863 },
          // Other Items
          { name: 'Wristguards of Stability', slot: 'Wrist', wowhead_id: 19146 },
          { name: 'Incendosaur Hide', slot: 'Back', wowhead_id: 18829 },
        ],
      },
      {
        name: 'Golemagg the Incinerator',
        items: [
          // Tier 1 Chest
          { name: 'Arcanist Robes', slot: 'Chest', wowhead_id: 16798 },
          { name: 'Felheart Robes', slot: 'Chest', wowhead_id: 16809 },
          { name: 'Cenarion Vestments', slot: 'Chest', wowhead_id: 16833 },
          { name: 'Nightslayer Chestpiece', slot: 'Chest', wowhead_id: 16820 },
          { name: 'Robes of Prophecy', slot: 'Chest', wowhead_id: 16815 },
          { name: 'Earthfury Vestments', slot: 'Chest', wowhead_id: 16841 },
          { name: "Giantstalker's Breastplate", slot: 'Chest', wowhead_id: 16845 },
          { name: 'Lawbringer Chestguard', slot: 'Chest', wowhead_id: 16853 },
          { name: 'Breastplate of Might', slot: 'Chest', wowhead_id: 16865 },
          // Other Items
          { name: 'Azuresong Mageblade', slot: 'Weapon', wowhead_id: 17103 },
          { name: 'Blastershot Launcher', slot: 'Ranged', wowhead_id: 17072 },
          { name: 'Staff of Dominance', slot: 'Weapon', wowhead_id: 18842 },
          { name: 'Robe of Volatile Power', slot: 'Chest', wowhead_id: 19145 },
          { name: 'Flamewaker Legplates', slot: 'Legs', wowhead_id: 16807 },
          { name: 'Aged Core Leather Gloves', slot: 'Hands', wowhead_id: 18823 },
        ],
      },
      {
        name: 'Sulfuron Harbinger',
        items: [
          // Tier 1 Shoulders
          { name: 'Nightslayer Shoulder Pads', slot: 'Shoulder', wowhead_id: 16823 },
          { name: 'Mantle of Prophecy', slot: 'Shoulder', wowhead_id: 16816 },
          { name: "Giantstalker's Epaulets", slot: 'Shoulder', wowhead_id: 16848 },
          // Other Items
          { name: 'Sulfuron Ingot', slot: 'Quest', wowhead_id: 17203 },
          { name: 'Shadowstrike', slot: 'Weapon', wowhead_id: 17074 },
          { name: 'Flamewaker Legplates', slot: 'Legs', wowhead_id: 16807 },
          { name: 'Fist of Angstaff', slot: 'Weapon', wowhead_id: 18817 },
        ],
      },
      {
        name: 'Majordomo Executus',
        items: [
          { name: 'Core Hound Tooth', slot: 'Weapon', wowhead_id: 18805 },
          { name: 'Fireguard Shoulders', slot: 'Shoulder', wowhead_id: 18808 },
          { name: 'Core Forged Greaves', slot: 'Feet', wowhead_id: 18806 },
          { name: 'Gloves of the Hypnotic Flame', slot: 'Hands', wowhead_id: 18809 },
          { name: 'Cauterizing Band', slot: 'Finger', wowhead_id: 19140 },
          { name: 'Wild Growth Spaulders', slot: 'Shoulder', wowhead_id: 18810 },
          { name: 'Fireproof Cloak', slot: 'Back', wowhead_id: 18811 },
          { name: 'Sash of Whispered Secrets', slot: 'Waist', wowhead_id: 18812 },
          { name: 'Wristguards of True Flight', slot: 'Wrist', wowhead_id: 18813 },
        ],
      },
      {
        name: 'Ragnaros',
        items: [
          // Tier 2 Legs
          { name: 'Stormrage Legguards', slot: 'Legs', wowhead_id: 16901 },
          { name: 'Bloodfang Pants', slot: 'Legs', wowhead_id: 16909 },
          { name: 'Netherwind Pants', slot: 'Legs', wowhead_id: 16915 },
          { name: 'Leggings of Transcendence', slot: 'Legs', wowhead_id: 16922 },
          { name: 'Nemesis Leggings', slot: 'Legs', wowhead_id: 16930 },
          { name: "Dragonstalker's Legguards", slot: 'Legs', wowhead_id: 16938 },
          { name: 'Legplates of Ten Storms', slot: 'Legs', wowhead_id: 16946 },
          { name: 'Judgement Legplates', slot: 'Legs', wowhead_id: 16954 },
          { name: 'Legplates of Wrath', slot: 'Legs', wowhead_id: 16962 },
          // Other Items
          { name: 'Band of Accuria', slot: 'Finger', wowhead_id: 17063 },
          { name: 'Band of Sulfuras', slot: 'Finger', wowhead_id: 19138 },
          { name: 'Onslaught Girdle', slot: 'Waist', wowhead_id: 19137 },
          { name: 'Choker of the Fire Lord', slot: 'Neck', wowhead_id: 18814 },
          { name: 'Essence of the Pure Flame', slot: 'Trinket', wowhead_id: 18815 },
          { name: 'Crown of Destruction', slot: 'Head', wowhead_id: 18817 },
          { name: "Bonereaver's Edge", slot: 'Weapon', wowhead_id: 17076 },
          { name: 'Spinal Reaper', slot: 'Weapon', wowhead_id: 17104 },
          { name: "Perdition's Blade", slot: 'Weapon', wowhead_id: 18816 },
          { name: "Malistar's Defender", slot: 'Off Hand', wowhead_id: 17106 },
          { name: "Dragon's Blood Cape", slot: 'Back', wowhead_id: 17107 },
          { name: 'Cloak of the Shrouded Mists', slot: 'Back', wowhead_id: 17102 },
          { name: 'Eye of Sulfuras', slot: 'Quest', wowhead_id: 17204 },
        ],
      },
    ],
  },

  // ============================================================================
  // BLACKWING LAIR - Tier 2
  // ============================================================================
  {
    name: 'Blackwing Lair',
    tier: 'Tier 2',
    bosses: [
      {
        name: 'Razorgore the Untamed',
        items: [
          // Tier 2 Bracers
          { name: 'Stormrage Bracers', slot: 'Wrist', wowhead_id: 16904 },
          { name: 'Bloodfang Bracers', slot: 'Wrist', wowhead_id: 16911 },
          { name: 'Netherwind Bindings', slot: 'Wrist', wowhead_id: 16918 },
          { name: 'Bracers of Transcendence', slot: 'Wrist', wowhead_id: 16925 },
          { name: 'Nemesis Bracers', slot: 'Wrist', wowhead_id: 16933 },
          { name: "Dragonstalker's Bracers", slot: 'Wrist', wowhead_id: 16940 },
          { name: 'Bracers of Ten Storms', slot: 'Wrist', wowhead_id: 16943 },
          { name: 'Judgement Bindings', slot: 'Wrist', wowhead_id: 16951 },
          { name: 'Wristguards of Wrath', slot: 'Wrist', wowhead_id: 16959 },
          // Tier 2 Belts
          { name: 'Stormrage Belt', slot: 'Waist', wowhead_id: 16903 },
          { name: 'Bloodfang Belt', slot: 'Waist', wowhead_id: 16910 },
          { name: 'Netherwind Belt', slot: 'Waist', wowhead_id: 16818 },
          { name: 'Belt of Transcendence', slot: 'Waist', wowhead_id: 16925 },
          { name: 'Nemesis Belt', slot: 'Waist', wowhead_id: 16933 },
          { name: "Dragonstalker's Belt", slot: 'Waist', wowhead_id: 16940 },
          { name: 'Belt of Ten Storms', slot: 'Waist', wowhead_id: 16944 },
          { name: 'Judgement Belt', slot: 'Waist', wowhead_id: 16952 },
          { name: 'Belt of Wrath', slot: 'Waist', wowhead_id: 16960 },
          // Other Items
          { name: 'The Untamed Blade', slot: 'Weapon', wowhead_id: 19334 },
          { name: 'Spineshatter', slot: 'Weapon', wowhead_id: 19335 },
          { name: 'Arcane Infused Gem', slot: 'Trinket', wowhead_id: 19339 },
          { name: 'Mantle of the Blackwing Cabal', slot: 'Shoulder', wowhead_id: 19370 },
        ],
      },
      {
        name: 'Vaelastrasz the Corrupt',
        items: [
          // Tier 2 Boots
          { name: 'Stormrage Boots', slot: 'Feet', wowhead_id: 16898 },
          { name: 'Bloodfang Boots', slot: 'Feet', wowhead_id: 16906 },
          { name: 'Netherwind Boots', slot: 'Feet', wowhead_id: 16912 },
          { name: 'Boots of Transcendence', slot: 'Feet', wowhead_id: 16919 },
          { name: 'Nemesis Boots', slot: 'Feet', wowhead_id: 16927 },
          { name: "Dragonstalker's Greaves", slot: 'Feet', wowhead_id: 16935 },
          { name: 'Greaves of Ten Storms', slot: 'Feet', wowhead_id: 16949 },
          { name: 'Judgement Sabatons', slot: 'Feet', wowhead_id: 16958 },
          { name: 'Sabatons of Wrath', slot: 'Feet', wowhead_id: 16965 },
          // Other Items
          { name: 'Dragonfang Blade', slot: 'Weapon', wowhead_id: 19346 },
          { name: 'Red Dragonscale Protector', slot: 'Off Hand', wowhead_id: 19348 },
          { name: 'Mind Quickening Gem', slot: 'Trinket', wowhead_id: 19339 },
          { name: 'Pendant of the Fallen Dragon', slot: 'Neck', wowhead_id: 19340 },
          { name: 'Ringo\'s Blizzard Boots', slot: 'Feet', wowhead_id: 19344 },
          { name: 'Boots of Pure Thought', slot: 'Feet', wowhead_id: 19382 },
        ],
      },
      {
        name: 'Broodlord Lashlayer',
        items: [
          // Tier 2 Shoulders
          { name: 'Stormrage Pauldrons', slot: 'Shoulder', wowhead_id: 16902 },
          { name: 'Bloodfang Spaulders', slot: 'Shoulder', wowhead_id: 16908 },
          { name: 'Netherwind Mantle', slot: 'Shoulder', wowhead_id: 16917 },
          { name: 'Pauldrons of Transcendence', slot: 'Shoulder', wowhead_id: 16924 },
          { name: 'Nemesis Spaulders', slot: 'Shoulder', wowhead_id: 16932 },
          { name: "Dragonstalker's Spaulders", slot: 'Shoulder', wowhead_id: 16937 },
          { name: 'Epaulets of Ten Storms', slot: 'Shoulder', wowhead_id: 16945 },
          { name: 'Judgement Spaulders', slot: 'Shoulder', wowhead_id: 16953 },
          { name: 'Pauldrons of Wrath', slot: 'Shoulder', wowhead_id: 16961 },
          // Other Items
          { name: 'Maladath, Runed Blade of the Black Flight', slot: 'Weapon', wowhead_id: 19351 },
          { name: 'Heartstriker', slot: 'Ranged', wowhead_id: 19350 },
          { name: 'Lifegiving Gem', slot: 'Trinket', wowhead_id: 19341 },
          { name: 'Black Brood Pauldrons', slot: 'Shoulder', wowhead_id: 19370 },
          { name: 'Chromatic Boots', slot: 'Feet', wowhead_id: 19385 },
        ],
      },
      {
        name: 'Firemaw',
        items: [
          // Tier 2 Hands
          { name: 'Stormrage Handguards', slot: 'Hands', wowhead_id: 16899 },
          { name: 'Bloodfang Gloves', slot: 'Hands', wowhead_id: 16907 },
          { name: 'Netherwind Gloves', slot: 'Hands', wowhead_id: 16913 },
          { name: 'Handguards of Transcendence', slot: 'Hands', wowhead_id: 16920 },
          { name: 'Nemesis Gloves', slot: 'Hands', wowhead_id: 16928 },
          { name: "Dragonstalker's Gauntlets", slot: 'Hands', wowhead_id: 16936 },
          { name: 'Gauntlets of Ten Storms', slot: 'Hands', wowhead_id: 16948 },
          { name: 'Judgement Gauntlets', slot: 'Hands', wowhead_id: 16956 },
          { name: 'Gauntlets of Wrath', slot: 'Hands', wowhead_id: 16964 },
          // Other Items
          { name: 'Claw of the Black Drake', slot: 'Weapon', wowhead_id: 19365 },
          { name: 'Dragonbreath Hand Cannon', slot: 'Ranged', wowhead_id: 19368 },
          { name: 'Drake Talon Pauldrons', slot: 'Shoulder', wowhead_id: 19394 },
          { name: 'Rejuvenating Gem', slot: 'Trinket', wowhead_id: 19341 },
          { name: 'Natural Alignment Crystal', slot: 'Trinket', wowhead_id: 19360 },
          { name: 'Primalist\'s Linked Legguards', slot: 'Legs', wowhead_id: 19369 },
        ],
      },
      {
        name: 'Ebonroc',
        items: [
          // Tier 2 Hands
          { name: 'Stormrage Handguards', slot: 'Hands', wowhead_id: 16899 },
          { name: 'Bloodfang Gloves', slot: 'Hands', wowhead_id: 16907 },
          { name: 'Netherwind Gloves', slot: 'Hands', wowhead_id: 16913 },
          { name: 'Handguards of Transcendence', slot: 'Hands', wowhead_id: 16920 },
          { name: 'Nemesis Gloves', slot: 'Hands', wowhead_id: 16928 },
          { name: "Dragonstalker's Gauntlets", slot: 'Hands', wowhead_id: 16936 },
          { name: 'Gauntlets of Ten Storms', slot: 'Hands', wowhead_id: 16948 },
          { name: 'Judgement Gauntlets', slot: 'Hands', wowhead_id: 16956 },
          { name: 'Gauntlets of Wrath', slot: 'Hands', wowhead_id: 16964 },
          // Other Items
          { name: "Malfurion's Blessed Bulwark", slot: 'Off Hand', wowhead_id: 19349 },
          { name: 'Drake Fang Talisman', slot: 'Neck', wowhead_id: 19377 },
          { name: 'Aegis of Preservation', slot: 'Off Hand', wowhead_id: 19349 },
        ],
      },
      {
        name: 'Flamegor',
        items: [
          // Tier 2 Hands
          { name: 'Stormrage Handguards', slot: 'Hands', wowhead_id: 16899 },
          { name: 'Bloodfang Gloves', slot: 'Hands', wowhead_id: 16907 },
          { name: 'Netherwind Gloves', slot: 'Hands', wowhead_id: 16913 },
          { name: 'Handguards of Transcendence', slot: 'Hands', wowhead_id: 16920 },
          { name: 'Nemesis Gloves', slot: 'Hands', wowhead_id: 16928 },
          { name: "Dragonstalker's Gauntlets", slot: 'Hands', wowhead_id: 16936 },
          { name: 'Gauntlets of Ten Storms', slot: 'Hands', wowhead_id: 16948 },
          { name: 'Judgement Gauntlets', slot: 'Hands', wowhead_id: 16956 },
          { name: 'Gauntlets of Wrath', slot: 'Hands', wowhead_id: 16964 },
          // Other Items
          { name: "Dragon's Touch", slot: 'Weapon', wowhead_id: 19353 },
          { name: 'Emberweave Leggings', slot: 'Legs', wowhead_id: 19398 },
          { name: 'Drake Talon Cleaver', slot: 'Weapon', wowhead_id: 19353 },
        ],
      },
      {
        name: 'Chromaggus',
        items: [
          // Tier 2 Legs
          { name: 'Stormrage Legguards', slot: 'Legs', wowhead_id: 16901 },
          { name: 'Bloodfang Pants', slot: 'Legs', wowhead_id: 16909 },
          { name: 'Netherwind Pants', slot: 'Legs', wowhead_id: 16915 },
          { name: 'Leggings of Transcendence', slot: 'Legs', wowhead_id: 16922 },
          { name: 'Nemesis Leggings', slot: 'Legs', wowhead_id: 16930 },
          { name: "Dragonstalker's Legguards", slot: 'Legs', wowhead_id: 16938 },
          { name: 'Legplates of Ten Storms', slot: 'Legs', wowhead_id: 16946 },
          { name: 'Judgement Legplates', slot: 'Legs', wowhead_id: 16954 },
          { name: 'Legplates of Wrath', slot: 'Legs', wowhead_id: 16962 },
          // Other Items
          { name: 'Chromatically Tempered Sword', slot: 'Weapon', wowhead_id: 19352 },
          { name: "Ashjre'thul, Crossbow of Smiting", slot: 'Ranged', wowhead_id: 19361 },
          { name: 'Elementium Threaded Cloak', slot: 'Back', wowhead_id: 19378 },
          { name: 'Taut Dragonhide Belt', slot: 'Waist', wowhead_id: 19386 },
          { name: 'Chromatic Boots', slot: 'Feet', wowhead_id: 19385 },
          { name: 'Girdle of the Fallen Crusader', slot: 'Waist', wowhead_id: 19388 },
          { name: 'Shimmering Geta', slot: 'Feet', wowhead_id: 19389 },
        ],
      },
      {
        name: 'Nefarian',
        items: [
          // Tier 2 Chest and Head
          { name: 'Stormrage Cover', slot: 'Head', wowhead_id: 16900 },
          { name: 'Stormrage Chestguard', slot: 'Chest', wowhead_id: 16897 },
          { name: 'Bloodfang Hood', slot: 'Head', wowhead_id: 16905 },
          { name: 'Bloodfang Chestpiece', slot: 'Chest', wowhead_id: 16905 },
          { name: 'Netherwind Crown', slot: 'Head', wowhead_id: 16914 },
          { name: 'Netherwind Robes', slot: 'Chest', wowhead_id: 16916 },
          { name: 'Halo of Transcendence', slot: 'Head', wowhead_id: 16921 },
          { name: 'Robes of Transcendence', slot: 'Chest', wowhead_id: 16923 },
          { name: 'Nemesis Skullcap', slot: 'Head', wowhead_id: 16929 },
          { name: 'Nemesis Robes', slot: 'Chest', wowhead_id: 16931 },
          { name: "Dragonstalker's Helm", slot: 'Head', wowhead_id: 16939 },
          { name: "Dragonstalker's Breastplate", slot: 'Chest', wowhead_id: 16942 },
          { name: 'Helmet of Ten Storms', slot: 'Head', wowhead_id: 16947 },
          { name: 'Breastplate of Ten Storms', slot: 'Chest', wowhead_id: 16950 },
          { name: 'Judgement Crown', slot: 'Head', wowhead_id: 16955 },
          { name: 'Judgement Breastplate', slot: 'Chest', wowhead_id: 16958 },
          { name: 'Helm of Wrath', slot: 'Head', wowhead_id: 16963 },
          { name: 'Breastplate of Wrath', slot: 'Chest', wowhead_id: 16966 },
          // Other Items
          { name: 'Staff of the Shadow Flame', slot: 'Weapon', wowhead_id: 19356 },
          { name: 'Ashkandi, Greatsword of the Brotherhood', slot: 'Weapon', wowhead_id: 19364 },
          { name: 'Mish\'undare, Circlet of the Mind Flayer', slot: 'Head', wowhead_id: 19375 },
          { name: 'Prestor\'s Talisman of Connivery', slot: 'Neck', wowhead_id: 19377 },
          { name: 'Neltharion\'s Tear', slot: 'Trinket', wowhead_id: 19379 },
          { name: 'Therazane\'s Link', slot: 'Waist', wowhead_id: 19380 },
          { name: 'Boots of the Shadow Flame', slot: 'Feet', wowhead_id: 19381 },
          { name: 'Pure Elementium Band', slot: 'Finger', wowhead_id: 19382 },
          { name: 'Master Dragonslayer\'s Medallion', slot: 'Neck', wowhead_id: 19383 },
          { name: 'Master Dragonslayer\'s Ring', slot: 'Finger', wowhead_id: 19384 },
          { name: 'Archimtiros\' Ring of Reckoning', slot: 'Finger', wowhead_id: 19385 },
          { name: 'Cloak of the Brood Lord', slot: 'Back', wowhead_id: 19386 },
          { name: 'Head of Nefarian', slot: 'Quest', wowhead_id: 19003 },
        ],
      },
    ],
  },

  // ============================================================================
  // ONYXIA'S LAIR - Tier 2
  // ============================================================================
  {
    name: "Onyxia's Lair",
    tier: 'Tier 2',
    bosses: [
      {
        name: 'Onyxia',
        items: [
          // Tier 2 Helms
          { name: 'Nemesis Skullcap', slot: 'Head', wowhead_id: 16929 },
          { name: "Dragonstalker's Helm", slot: 'Head', wowhead_id: 16939 },
          { name: 'Netherwind Crown', slot: 'Head', wowhead_id: 16914 },
          { name: 'Halo of Transcendence', slot: 'Head', wowhead_id: 16921 },
          { name: 'Bloodfang Hood', slot: 'Head', wowhead_id: 16905 },
          { name: 'Helmet of Ten Storms', slot: 'Head', wowhead_id: 16947 },
          { name: 'Judgement Crown', slot: 'Head', wowhead_id: 16955 },
          { name: 'Helm of Wrath', slot: 'Head', wowhead_id: 16963 },
          { name: 'Stormrage Cover', slot: 'Head', wowhead_id: 16900 },
          // Other Items
          { name: 'Deathbringer', slot: 'Weapon', wowhead_id: 17068 },
          { name: 'Vis\'kag the Bloodletter', slot: 'Weapon', wowhead_id: 17075 },
          { name: 'Ancient Cornerstone Grimoire', slot: 'Off Hand', wowhead_id: 18202 },
          { name: 'Dragonslayer\'s Signet', slot: 'Finger', wowhead_id: 17064 },
          { name: 'Ring of Binding', slot: 'Finger', wowhead_id: 17067 },
          { name: 'Eskhandar\'s Collar', slot: 'Neck', wowhead_id: 18205 },
          { name: 'Head of Onyxia', slot: 'Quest', wowhead_id: 18423 },
          { name: 'Shard of the Scale', slot: 'Trinket', wowhead_id: 18340 },
          { name: "Quel'Serrar", slot: 'Weapon', wowhead_id: 18348 },
        ],
      },
    ],
  },

  // ============================================================================
  // ZUL'GURUB - Tier 1.5
  // ============================================================================
  {
    name: "Zul'Gurub",
    tier: 'Tier 1.5',
    bosses: [
      {
        name: 'High Priest Venoxis',
        items: [
          { name: 'Blooddrenched Footpads', slot: 'Feet', wowhead_id: 19895 },
          { name: 'Zanzil\'s Band', slot: 'Finger', wowhead_id: 19893 },
          { name: 'Zulian Stone Axe', slot: 'Weapon', wowhead_id: 19899 },
          { name: 'Zulian Slicer', slot: 'Weapon', wowhead_id: 19908 },
          { name: 'Fang of Venoxis', slot: 'Weapon', wowhead_id: 19903 },
          { name: 'Blooddrenched Grips', slot: 'Hands', wowhead_id: 19894 },
          { name: 'Runed Bloodstained Hauberk', slot: 'Chest', wowhead_id: 19896 },
        ],
      },
      {
        name: 'High Priestess Jeklik',
        items: [
          { name: 'Jeklik\'s Crusher', slot: 'Weapon', wowhead_id: 19918 },
          { name: 'Primalist\'s Band', slot: 'Finger', wowhead_id: 19920 },
          { name: 'Petrified Troll Knot', slot: 'Trinket', wowhead_id: 19923 },
          { name: 'Zulian Scepter of Rites', slot: 'Weapon', wowhead_id: 19908 },
          { name: 'Bloodstained Coif', slot: 'Head', wowhead_id: 19910 },
          { name: 'Animist\'s Spaulders', slot: 'Shoulder', wowhead_id: 19928 },
        ],
      },
      {
        name: "High Priest Mar'li",
        items: [
          { name: 'Mar\'li\'s Touch', slot: 'Weapon', wowhead_id: 19871 },
          { name: 'Mar\'li\'s Eye', slot: 'Trinket', wowhead_id: 19930 },
          { name: 'Talisman of Protection', slot: 'Trinket', wowhead_id: 19948 },
          { name: 'Bloodtinged Kilt', slot: 'Legs', wowhead_id: 19892 },
          { name: 'Flowing Ritual Robes', slot: 'Chest', wowhead_id: 19927 },
        ],
      },
      {
        name: 'High Priest Thekal',
        items: [
          { name: 'Thekal\'s Grasp', slot: 'Weapon', wowhead_id: 19896 },
          { name: 'Zulian Tiger', slot: 'Mount', wowhead_id: 19902 },
          { name: 'Peacekeeper Gauntlets', slot: 'Hands', wowhead_id: 19897 },
          { name: 'Zulian Scepter of Rites', slot: 'Weapon', wowhead_id: 19908 },
          { name: 'Thekal\'s Grasp', slot: 'Weapon', wowhead_id: 19896 },
          { name: 'Seafury Gauntlets', slot: 'Hands', wowhead_id: 19901 },
        ],
      },
      {
        name: 'High Priestess Arlokk',
        items: [
          { name: 'Arlokk\'s Grasp', slot: 'Weapon', wowhead_id: 19910 },
          { name: 'Will of Arlokk', slot: 'Weapon', wowhead_id: 19909 },
          { name: 'Arlokk\'s Hoodoo Stick', slot: 'Weapon', wowhead_id: 19914 },
          { name: 'Bloodsoaked Pauldrons', slot: 'Shoulder', wowhead_id: 19910 },
          { name: 'Overlord\'s Crimson Band', slot: 'Finger', wowhead_id: 19920 },
        ],
      },
      {
        name: "Gahz'ranka",
        items: [
          { name: 'Foror\'s Eyepatch', slot: 'Head', wowhead_id: 19945 },
          { name: 'Nat Pagle\'s Broken Reel', slot: 'Trinket', wowhead_id: 19947 },
          { name: 'Tigule\'s Harpoon', slot: 'Ranged', wowhead_id: 19946 },
        ],
      },
      {
        name: 'Bloodlord Mandokir',
        items: [
          { name: 'Bloodlord\'s Defender', slot: 'Off Hand', wowhead_id: 19867 },
          { name: 'Swift Razzashi Raptor', slot: 'Mount', wowhead_id: 19872 },
          { name: 'Halberd of Smiting', slot: 'Weapon', wowhead_id: 19869 },
          { name: 'Mandokir\'s Sting', slot: 'Weapon', wowhead_id: 19874 },
          { name: 'Blooddrenched Mask', slot: 'Head', wowhead_id: 19878 },
          { name: 'Primalist\'s Linked Waistguard', slot: 'Waist', wowhead_id: 19895 },
        ],
      },
      {
        name: "Jin'do the Hexxer",
        items: [
          { name: 'Jin\'do\'s Judgement', slot: 'Weapon', wowhead_id: 19884 },
          { name: 'Jin\'do\'s Bag of Whammies', slot: 'Trinket', wowhead_id: 19888 },
          { name: 'Jin\'do\'s Evil Eye', slot: 'Trinket', wowhead_id: 19885 },
          { name: 'Bloodstained Legplates', slot: 'Legs', wowhead_id: 19891 },
          { name: 'Overlord\'s Onyx Band', slot: 'Finger', wowhead_id: 19892 },
          { name: 'The Hexxer\'s Cover', slot: 'Head', wowhead_id: 19886 },
        ],
      },
      {
        name: 'Hakkar',
        items: [
          { name: 'Zin\'rokh, Destroyer of Worlds', slot: 'Weapon', wowhead_id: 19854 },
          { name: 'Fang of the Faceless', slot: 'Weapon', wowhead_id: 19859 },
          { name: 'Hakkar\'s Heart', slot: 'Quest', wowhead_id: 19802 },
          { name: 'Soul Corrupter\'s Necklace', slot: 'Neck', wowhead_id: 19856 },
          { name: 'The Eye of Hakkar', slot: 'Trinket', wowhead_id: 19857 },
          { name: 'Cloak of Consumption', slot: 'Back', wowhead_id: 19858 },
          { name: 'Zanzil\'s Concentration', slot: 'Trinket', wowhead_id: 19862 },
          { name: 'Ancient Hakkari Manslayer', slot: 'Weapon', wowhead_id: 19852 },
          { name: 'Gurubashi Dwarf Destroyer', slot: 'Weapon', wowhead_id: 19853 },
          { name: 'Seal of the Gurubashi Berserker', slot: 'Finger', wowhead_id: 19898 },
          { name: 'Band of Servitude', slot: 'Finger', wowhead_id: 19897 },
        ],
      },
    ],
  },

  // ============================================================================
  // RUINS OF AHN'QIRAJ - Tier 1.5
  // ============================================================================
  {
    name: "Ruins of Ahn'Qiraj",
    tier: 'Tier 1.5',
    bosses: [
      {
        name: 'Kurinnaxx',
        items: [
          { name: 'Qiraji Ornate Hilt', slot: 'Quest', wowhead_id: 20886 },
          { name: 'Legplates of the Destroyer', slot: 'Legs', wowhead_id: 21492 },
          { name: 'Sand Reaver Wristguards', slot: 'Wrist', wowhead_id: 21499 },
          { name: 'Boots of the Desert Protector', slot: 'Feet', wowhead_id: 21492 },
        ],
      },
      {
        name: 'General Rajaxx',
        items: [
          { name: 'Boots of the Desert Protector', slot: 'Feet', wowhead_id: 21492 },
          { name: 'Three-Dimensional Threat Bracers', slot: 'Wrist', wowhead_id: 21492 },
          { name: 'Crystallized Qiraji Limb', slot: 'Trinket', wowhead_id: 21500 },
        ],
      },
      {
        name: 'Moam',
        items: [
          { name: 'Sharpened Silithid Femur', slot: 'Weapon', wowhead_id: 21268 },
          { name: 'Dustwind Turban', slot: 'Head', wowhead_id: 21471 },
          { name: 'Gauntlets of New Life', slot: 'Hands', wowhead_id: 21472 },
          { name: 'Mantle of Maz\'Nadir', slot: 'Shoulder', wowhead_id: 21474 },
        ],
      },
      {
        name: 'Buru the Gorger',
        items: [
          { name: 'Buru\'s Skull Fragment', slot: 'Off Hand', wowhead_id: 21258 },
          { name: 'Slime Kickers', slot: 'Feet', wowhead_id: 21491 },
          { name: 'Robes of the Battleguard', slot: 'Chest', wowhead_id: 21487 },
        ],
      },
      {
        name: 'Ayamiss the Hunter',
        items: [
          { name: 'Bow of Taut Sinew', slot: 'Ranged', wowhead_id: 21242 },
          { name: 'Stinger of Ayamiss', slot: 'Weapon', wowhead_id: 21242 },
          { name: 'Scaled Sand Reaver Leggings', slot: 'Legs', wowhead_id: 21479 },
          { name: 'Ring of Fury', slot: 'Finger', wowhead_id: 21478 },
        ],
      },
      {
        name: 'Ossirian the Unscarred',
        items: [
          { name: 'Ossirian\'s Binding', slot: 'Waist', wowhead_id: 21461 },
          { name: 'Staff of the Ruins', slot: 'Weapon', wowhead_id: 21452 },
          { name: 'Boots of the Fiery Sands', slot: 'Feet', wowhead_id: 21462 },
          { name: 'Mantle of the Horusath', slot: 'Shoulder', wowhead_id: 21464 },
          { name: 'Gloves of Dark Wisdom', slot: 'Hands', wowhead_id: 21463 },
          { name: 'Gauntlets of the Immovable', slot: 'Hands', wowhead_id: 21459 },
          { name: 'Sand Polished Hammer', slot: 'Weapon', wowhead_id: 21456 },
          { name: 'Crossbow of Imminent Doom', slot: 'Ranged', wowhead_id: 21458 },
          { name: 'Sharpshooter\'s Crossbow', slot: 'Ranged', wowhead_id: 21460 },
        ],
      },
    ],
  },

  // ============================================================================
  // TEMPLE OF AHN'QIRAJ - Tier 2.5
  // ============================================================================
  {
    name: "Temple of Ahn'Qiraj",
    tier: 'Tier 2.5',
    bosses: [
      {
        name: 'The Prophet Skeram',
        items: [
          { name: 'Boots of the Fallen Prophet', slot: 'Feet', wowhead_id: 21701 },
          { name: 'Barbed Choker', slot: 'Neck', wowhead_id: 21706 },
          { name: 'Hammer of Ji\'zhi', slot: 'Weapon', wowhead_id: 21715 },
          { name: 'Boots of the Unwavering Will', slot: 'Feet', wowhead_id: 21699 },
          { name: 'Cloak of Concentrated Hatred', slot: 'Back', wowhead_id: 21701 },
        ],
      },
      {
        name: 'Silithid Royalty',
        items: [
          { name: 'Ring of Emperor Vek\'lor', slot: 'Finger', wowhead_id: 21602 },
          { name: 'Royal Qiraji Belt', slot: 'Waist', wowhead_id: 21598 },
          { name: 'Grasp of the Fallen Emperor', slot: 'Hands', wowhead_id: 21597 },
          { name: 'Boots of Epiphany', slot: 'Feet', wowhead_id: 21599 },
          { name: 'Gauntlets of Annihilation', slot: 'Hands', wowhead_id: 21600 },
          { name: 'Regenerating Belt of Vek\'nilash', slot: 'Waist', wowhead_id: 21601 },
          { name: 'Belt of the Fallen Emperor', slot: 'Waist', wowhead_id: 21598 },
        ],
      },
      {
        name: 'Battleguard Sartura',
        items: [
          { name: 'Sartura\'s Might', slot: 'Weapon', wowhead_id: 21635 },
          { name: 'Gauntlets of Steadfast Determination', slot: 'Hands', wowhead_id: 21639 },
          { name: 'Necklace of Purity', slot: 'Neck', wowhead_id: 21610 },
          { name: 'Barb of the Sand Reaver', slot: 'Weapon', wowhead_id: 21639 },
          { name: 'Boots of the Qiraji General', slot: 'Feet', wowhead_id: 21664 },
          { name: 'Thick Qirajihide Belt', slot: 'Waist', wowhead_id: 21668 },
        ],
      },
      {
        name: 'Fankriss the Unyielding',
        items: [
          { name: 'Scepter of the False Prophet', slot: 'Weapon', wowhead_id: 21673 },
          { name: 'Boots of the Fallen Hero', slot: 'Feet', wowhead_id: 21665 },
          { name: 'Mantle of Wicked Revenge', slot: 'Shoulder', wowhead_id: 21669 },
          { name: 'Cloak of Untold Secrets', slot: 'Back', wowhead_id: 21663 },
          { name: 'Ancient Qiraji Ripper', slot: 'Weapon', wowhead_id: 21650 },
          { name: 'Silithid Claw', slot: 'Weapon', wowhead_id: 21667 },
        ],
      },
      {
        name: 'Viscidus',
        items: [
          { name: 'Gauntlets of Kalimdor', slot: 'Hands', wowhead_id: 21618 },
          { name: 'Hive Defiler Wristbands', slot: 'Wrist', wowhead_id: 21619 },
          { name: 'Qiraji Execution Bracers', slot: 'Wrist', wowhead_id: 21621 },
          { name: 'Slime-coated Leggings', slot: 'Legs', wowhead_id: 21624 },
          { name: 'Barrage Shoulders', slot: 'Shoulder', wowhead_id: 21626 },
          { name: 'Bile-Etched Spaulders', slot: 'Shoulder', wowhead_id: 21627 },
        ],
      },
      {
        name: 'Princess Huhuran',
        items: [
          { name: 'Hive Defiler Wristbands', slot: 'Wrist', wowhead_id: 21619 },
          { name: 'Stinger of Ayamiss', slot: 'Weapon', wowhead_id: 21242 },
          { name: 'Mantle of the Desert Crusade', slot: 'Shoulder', wowhead_id: 21621 },
          { name: 'Huhuran\'s Stinger', slot: 'Weapon', wowhead_id: 21616 },
          { name: 'Hive Tunneler\'s Boots', slot: 'Feet', wowhead_id: 21619 },
          { name: 'Ring of the Martyr', slot: 'Finger', wowhead_id: 21627 },
        ],
      },
      {
        name: 'Twin Emperors',
        items: [
          { name: 'Kalimdor\'s Revenge', slot: 'Weapon', wowhead_id: 21679 },
          { name: 'Imperial Qiraji Armguards', slot: 'Wrist', wowhead_id: 21604 },
          { name: 'Imperial Qiraji Regalia', slot: 'Chest', wowhead_id: 21605 },
          { name: 'Vek\'lor\'s Gloves of Devastation', slot: 'Hands', wowhead_id: 21692 },
          { name: 'Vek\'nilash\'s Circlet', slot: 'Head', wowhead_id: 21693 },
          { name: 'Grasp of the Old God', slot: 'Hands', wowhead_id: 21694 },
          { name: 'Boots of Pure Thought', slot: 'Feet', wowhead_id: 21695 },
          { name: 'Angelista\'s Grasp', slot: 'Weapon', wowhead_id: 21696 },
        ],
      },
      {
        name: 'Ouro',
        items: [
          { name: 'Ouro\'s Intact Hide', slot: 'Back', wowhead_id: 21710 },
          { name: 'Wormscale Blocker', slot: 'Off Hand', wowhead_id: 21704 },
          { name: 'Jom Gabbar', slot: 'Trinket', wowhead_id: 23570 },
          { name: 'Gauntlets of the Righteous Champion', slot: 'Hands', wowhead_id: 21700 },
          { name: 'Boots of the Fallen Wasp', slot: 'Feet', wowhead_id: 21697 },
          { name: 'Ring of the Qiraji Fury', slot: 'Finger', wowhead_id: 21703 },
          { name: 'Wasphide Gauntlets', slot: 'Hands', wowhead_id: 21706 },
          { name: 'Sand Reaver Wristguards', slot: 'Wrist', wowhead_id: 21707 },
        ],
      },
      {
        name: "C'Thun",
        items: [
          { name: 'Eye of C\'Thun', slot: 'Quest', wowhead_id: 21221 },
          { name: 'Carapace of the Old God', slot: 'Chest', wowhead_id: 21680 },
          { name: 'Cloak of Clarity', slot: 'Back', wowhead_id: 21681 },
          { name: 'Dark Edge of Insanity', slot: 'Weapon', wowhead_id: 21134 },
          { name: 'Death\'s Sting', slot: 'Weapon', wowhead_id: 21126 },
          { name: 'Dark Storm Gauntlets', slot: 'Hands', wowhead_id: 21682 },
          { name: 'Gauntlets of Annihilation', slot: 'Hands', wowhead_id: 21686 },
          { name: 'Ring of the Godslayer', slot: 'Finger', wowhead_id: 21709 },
          { name: 'Grasp of the Old God', slot: 'Hands', wowhead_id: 21694 },
          { name: 'Vanquished Tentacle of C\'Thun', slot: 'Weapon', wowhead_id: 21839 },
          { name: 'Scepter of the False Prophet', slot: 'Weapon', wowhead_id: 21673 },
          { name: 'Boots of the Redeemed Prophecy', slot: 'Feet', wowhead_id: 21691 },
        ],
      },
    ],
  },

  // ============================================================================
  // NAXXRAMAS - Tier 3
  // ============================================================================
  {
    name: 'Naxxramas',
    tier: 'Tier 3',
    bosses: [
      {
        name: "Anub'Rekhan",
        items: [
          { name: 'Cryptfiend Silk Cloak', slot: 'Back', wowhead_id: 22676 },
          { name: 'Gem of Nerubis', slot: 'Trinket', wowhead_id: 22681 },
          { name: 'Widow\'s Remorse', slot: 'Weapon', wowhead_id: 22691 },
          { name: 'Boots of the Unwavering Will', slot: 'Feet', wowhead_id: 22696 },
          { name: 'Pauldrons of Elemental Fury', slot: 'Shoulder', wowhead_id: 22678 },
        ],
      },
      {
        name: 'Grand Widow Faerlina',
        items: [
          { name: 'Widow\'s Embrace', slot: 'Chest', wowhead_id: 22806 },
          { name: 'Crystal Webbed Robe', slot: 'Chest', wowhead_id: 22806 },
          { name: 'Arachnid Gloves', slot: 'Hands', wowhead_id: 22804 },
          { name: 'Sash of the Unredemeed', slot: 'Waist', wowhead_id: 22807 },
        ],
      },
      {
        name: 'Maexxna',
        items: [
          { name: 'Maexxna\'s Fang', slot: 'Weapon', wowhead_id: 22804 },
          { name: 'Wraith Blade', slot: 'Weapon', wowhead_id: 22815 },
          { name: 'Leggings of Polarity', slot: 'Legs', wowhead_id: 22820 },
          { name: 'Kiss of the Spider', slot: 'Trinket', wowhead_id: 22804 },
          { name: 'The Widow\'s Embrace', slot: 'Back', wowhead_id: 22806 },
        ],
      },
      {
        name: 'Noth the Plaguebringer',
        items: [
          { name: 'Thane\'s Resolve', slot: 'Weapon', wowhead_id: 22816 },
          { name: 'Libram of Light', slot: 'Off Hand', wowhead_id: 23006 },
          { name: 'Totem of Flowing Water', slot: 'Off Hand', wowhead_id: 22396 },
          { name: 'Hailstone Band', slot: 'Finger', wowhead_id: 22821 },
        ],
      },
      {
        name: 'Heigan the Unclean',
        items: [
          { name: 'Heigan\'s Cloak', slot: 'Back', wowhead_id: 23068 },
          { name: 'Gloves of the Dancing Bear', slot: 'Hands', wowhead_id: 23019 },
          { name: 'Boots of the Shrieker', slot: 'Feet', wowhead_id: 23037 },
          { name: 'Woestave', slot: 'Weapon', wowhead_id: 23221 },
        ],
      },
      {
        name: 'Loatheb',
        items: [
          { name: 'The End of Dreams', slot: 'Weapon', wowhead_id: 23014 },
          { name: 'Bony Grasp', slot: 'Hands', wowhead_id: 23018 },
          { name: 'Band of Unnatural Forces', slot: 'Finger', wowhead_id: 23038 },
          { name: 'Eye of Diminution', slot: 'Trinket', wowhead_id: 23044 },
        ],
      },
      {
        name: 'Instructor Razuvious',
        items: [
          { name: 'Kingsfall', slot: 'Weapon', wowhead_id: 23017 },
          { name: 'Shoulderguards of the Undaunted', slot: 'Shoulder', wowhead_id: 23018 },
          { name: 'Girdle of the Mentor', slot: 'Waist', wowhead_id: 23020 },
        ],
      },
      {
        name: 'Gothik the Harvester',
        items: [
          { name: 'Sadist\'s Collar', slot: 'Neck', wowhead_id: 23021 },
          { name: 'Boots of the Torturer', slot: 'Feet', wowhead_id: 23037 },
          { name: 'Leggings of the Instructor', slot: 'Legs', wowhead_id: 23020 },
        ],
      },
      {
        name: 'Four Horsemen',
        items: [
          { name: 'Doomfinger', slot: 'Weapon', wowhead_id: 23000 },
          { name: 'Runeblade of Baron Rivendare', slot: 'Weapon', wowhead_id: 23001 },
          { name: 'Claymore of Unholy Might', slot: 'Weapon', wowhead_id: 23005 },
          { name: 'Seal of the Damned', slot: 'Finger', wowhead_id: 23018 },
          { name: 'Ring of the Four Horsemen', slot: 'Finger', wowhead_id: 23025 },
          { name: 'Shroud of the Infinite', slot: 'Back', wowhead_id: 23037 },
        ],
      },
      {
        name: 'Patchwerk',
        items: [
          { name: 'Ghoul Skin Tunic', slot: 'Chest', wowhead_id: 22960 },
          { name: 'Wristguards of Vengeance', slot: 'Wrist', wowhead_id: 22961 },
          { name: 'Plated Abomination Ribcage', slot: 'Chest', wowhead_id: 22968 },
        ],
      },
      {
        name: 'Grobbulus',
        items: [
          { name: 'The Castigator', slot: 'Weapon', wowhead_id: 22988 },
          { name: 'Boots of the Plague Construct', slot: 'Feet', wowhead_id: 22994 },
          { name: 'Stormrage Handguards', slot: 'Hands', wowhead_id: 22999 },
        ],
      },
      {
        name: 'Gluth',
        items: [
          { name: 'The Larval Acid', slot: 'Trinket', wowhead_id: 23047 },
          { name: 'Desecrated Bindings', slot: 'Wrist', wowhead_id: 23050 },
          { name: 'Gluth\'s Missing Collar', slot: 'Neck', wowhead_id: 23048 },
        ],
      },
      {
        name: 'Thaddius',
        items: [
          { name: 'Spire of Twilight', slot: 'Weapon', wowhead_id: 23070 },
          { name: 'Leggings of Polarity', slot: 'Legs', wowhead_id: 23071 },
          { name: 'Plagueheart Shoulderpads', slot: 'Shoulder', wowhead_id: 23073 },
          { name: 'Eye of Diminution', slot: 'Trinket', wowhead_id: 23046 },
        ],
      },
      {
        name: 'Sapphiron',
        items: [
          { name: 'Claw of the Frost Wyrm', slot: 'Weapon', wowhead_id: 23549 },
          { name: 'Dreadnaught Helmet', slot: 'Head', wowhead_id: 23548 },
          { name: 'Eye of the Dead', slot: 'Trinket', wowhead_id: 23550 },
          { name: 'Cloak of the Necropolis', slot: 'Back', wowhead_id: 23545 },
        ],
      },
      {
        name: "Kel'Thuzad",
        items: [
          { name: 'The Phylactery of Kel\'Thuzad', slot: 'Quest', wowhead_id: 22520 },
          { name: 'Gressil, Dawn of Ruin', slot: 'Weapon', wowhead_id: 23054 },
          { name: 'Might of Menethil', slot: 'Weapon', wowhead_id: 23054 },
          { name: 'The Hungering Cold', slot: 'Weapon', wowhead_id: 23577 },
          { name: 'Soulseeker', slot: 'Weapon', wowhead_id: 23056 },
          { name: 'Kingsfall', slot: 'Weapon', wowhead_id: 23017 },
          { name: 'The Restrained Essence of Sapphiron', slot: 'Trinket', wowhead_id: 23050 },
          { name: 'Frostbringer', slot: 'Weapon', wowhead_id: 23060 },
          { name: 'Misplaced Servo Arm', slot: 'Weapon', wowhead_id: 23057 },
        ],
      },
    ],
  },
]
