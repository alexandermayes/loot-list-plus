/**
 * COMPLETE Classic WoW Raid Loot Tables
 * Data sourced from Wowhead Classic Database (wowhead.com/classic)
 * Generated: 2026-01-09
 *
 * This file contains ALL epic quality items that drop from ALL bosses in Classic WoW raids:
 * - Molten Core (10 bosses) - COMPLETE
 * - Blackwing Lair (8 bosses) - COMPLETE
 * - Onyxia's Lair (1 boss) - COMPLETE
 * - Zul'Gurub (10 bosses) - From existing data
 * - Ruins of Ahn'Qiraj (6 bosses) - From existing data
 * - Temple of Ahn'Qiraj (9 bosses) - From existing data
 * - Naxxramas (15 bosses) - From existing data
 */

export interface LootItem {
  name: string
  slot: string
  wowhead_id: number
}

export interface RaidBoss {
  name: string
  items: LootItem[]
}

export interface Raid {
  name: string
  tier: string
  bosses: RaidBoss[]
}

// ============================================================================
// MOLTEN CORE - 10 Bosses - COMPLETE LOOT TABLES
// ============================================================================

export const moltenCore: Raid = {
  name: 'Molten Core',
  tier: 'Tier 1',
  bosses: [
    {
      name: 'Lucifron',
      items: [
        // Tier 1 Pieces
        { name: 'Arcanist Boots', slot: 'Feet', wowhead_id: 16800 },
        { name: 'Felheart Gloves', slot: 'Hands', wowhead_id: 16805 },
        { name: 'Cenarion Boots', slot: 'Feet', wowhead_id: 16829 },
        { name: 'Earthfury Boots', slot: 'Feet', wowhead_id: 16837 },
        { name: 'Lawbringer Boots', slot: 'Feet', wowhead_id: 16859 },
        { name: 'Gauntlets of Might', slot: 'Hands', wowhead_id: 16863 },
        // Non-Tier Epic Drops
        { name: 'Crimson Shocker', slot: 'Wand', wowhead_id: 17077 },
        { name: 'Choker of Enlightenment', slot: 'Neck', wowhead_id: 17109 },
        { name: 'Flamewaker Legplates', slot: 'Legs', wowhead_id: 18861 },
        { name: 'Helm of the Lifegiver', slot: 'Head', wowhead_id: 18870 },
        { name: 'Manastorm Leggings', slot: 'Legs', wowhead_id: 18872 },
        { name: 'Salamander Scale Pants', slot: 'Legs', wowhead_id: 18875 },
        { name: 'Sorcerous Dagger', slot: 'Weapon', wowhead_id: 18878 },
        { name: 'Heavy Dark Iron Ring', slot: 'Finger', wowhead_id: 18879 },
        { name: 'Robe of Volatile Power', slot: 'Chest', wowhead_id: 19145 },
        { name: 'Wristguards of Stability', slot: 'Wrist', wowhead_id: 19146 },
        { name: 'Ring of Spell Power', slot: 'Finger', wowhead_id: 19147 },
      ],
    },
    {
      name: 'Magmadar',
      items: [
        // Tier 1 Legs - ALL Classes
        { name: 'Arcanist Leggings', slot: 'Legs', wowhead_id: 16796 },
        { name: 'Felheart Pants', slot: 'Legs', wowhead_id: 16810 },
        { name: 'Pants of Prophecy', slot: 'Legs', wowhead_id: 16814 },
        { name: 'Nightslayer Pants', slot: 'Legs', wowhead_id: 16822 },
        { name: 'Cenarion Leggings', slot: 'Legs', wowhead_id: 16835 },
        { name: 'Earthfury Legguards', slot: 'Legs', wowhead_id: 16843 },
        { name: "Giantstalker's Leggings", slot: 'Legs', wowhead_id: 16847 },
        { name: 'Lawbringer Legplates', slot: 'Legs', wowhead_id: 16855 },
        { name: 'Legplates of Might', slot: 'Legs', wowhead_id: 16867 },
        // Non-Tier Epic Drops
        { name: 'Medallion of Steadfast Might', slot: 'Neck', wowhead_id: 17065 },
        { name: "Striker's Mark", slot: 'Ranged', wowhead_id: 17069 },
        { name: 'Earthshaker', slot: 'Two-Hand', wowhead_id: 17073 },
        { name: "Eskhandar's Right Claw", slot: 'Weapon', wowhead_id: 18203 },
        { name: 'Talisman of Ephemeral Power', slot: 'Trinket', wowhead_id: 18820 },
        { name: 'Quick Strike Ring', slot: 'Finger', wowhead_id: 18821 },
        { name: 'Obsidian Edged Blade', slot: 'Two-Hand', wowhead_id: 18822 },
        { name: 'Aged Core Leather Gloves', slot: 'Hands', wowhead_id: 18823 },
        { name: 'Magma Tempered Boots', slot: 'Feet', wowhead_id: 18824 },
        { name: 'Deep Earth Spaulders', slot: 'Shoulder', wowhead_id: 18829 },
        { name: 'Flamewaker Legplates', slot: 'Legs', wowhead_id: 18861 },
        { name: 'Mana Igniting Cord', slot: 'Waist', wowhead_id: 19136 },
        { name: 'Fire Runed Grimoire', slot: 'Off-Hand', wowhead_id: 19142 },
        { name: 'Flameguard Gauntlets', slot: 'Hands', wowhead_id: 19143 },
        { name: 'Sabatons of the Flamewalker', slot: 'Feet', wowhead_id: 19144 },
      ],
    },
    {
      name: 'Gehennas',
      items: [
        // Tier 1 Pieces
        { name: 'Gloves of Prophecy', slot: 'Hands', wowhead_id: 16812 },
        { name: 'Nightslayer Gloves', slot: 'Hands', wowhead_id: 16826 },
        { name: 'Earthfury Gauntlets', slot: 'Hands', wowhead_id: 16839 },
        { name: "Giantstalker's Boots", slot: 'Feet', wowhead_id: 16849 },
        { name: 'Lawbringer Gauntlets', slot: 'Hands', wowhead_id: 16860 },
        { name: 'Sabatons of Might', slot: 'Feet', wowhead_id: 16862 },
        // Non-Tier Epic Drops
        { name: 'Crimson Shocker', slot: 'Wand', wowhead_id: 17077 },
        { name: 'Flamewaker Legplates', slot: 'Legs', wowhead_id: 18861 },
        { name: 'Helm of the Lifegiver', slot: 'Head', wowhead_id: 18870 },
        { name: 'Manastorm Leggings', slot: 'Legs', wowhead_id: 18872 },
        { name: 'Salamander Scale Pants', slot: 'Legs', wowhead_id: 18875 },
        { name: 'Sorcerous Dagger', slot: 'Weapon', wowhead_id: 18878 },
        { name: 'Heavy Dark Iron Ring', slot: 'Finger', wowhead_id: 18879 },
        { name: 'Robe of Volatile Power', slot: 'Chest', wowhead_id: 19145 },
        { name: 'Wristguards of Stability', slot: 'Wrist', wowhead_id: 19146 },
        { name: 'Ring of Spell Power', slot: 'Finger', wowhead_id: 19147 },
      ],
    },
    {
      name: 'Garr',
      items: [
        // Tier 1 Helms - ALL Classes
        { name: 'Arcanist Crown', slot: 'Head', wowhead_id: 16795 },
        { name: 'Felheart Horns', slot: 'Head', wowhead_id: 16808 },
        { name: 'Circlet of Prophecy', slot: 'Head', wowhead_id: 16813 },
        { name: 'Nightslayer Cover', slot: 'Head', wowhead_id: 16821 },
        { name: 'Cenarion Helm', slot: 'Head', wowhead_id: 16834 },
        { name: 'Earthfury Helmet', slot: 'Head', wowhead_id: 16842 },
        { name: "Giantstalker's Helmet", slot: 'Head', wowhead_id: 16846 },
        { name: 'Lawbringer Helm', slot: 'Head', wowhead_id: 16854 },
        { name: 'Helm of Might', slot: 'Head', wowhead_id: 16866 },
        // Non-Tier Epic Drops
        { name: 'Drillborer Disk', slot: 'Shield', wowhead_id: 17066 },
        { name: 'Gutgore Ripper', slot: 'Weapon', wowhead_id: 17071 },
        { name: 'Aurastone Hammer', slot: 'Weapon', wowhead_id: 17105 },
        { name: 'Bindings of the Windseeker', slot: 'Quest', wowhead_id: 18564 },
        { name: 'Talisman of Ephemeral Power', slot: 'Trinket', wowhead_id: 18820 },
        { name: 'Quick Strike Ring', slot: 'Finger', wowhead_id: 18821 },
        { name: 'Obsidian Edged Blade', slot: 'Two-Hand', wowhead_id: 18822 },
        { name: 'Aged Core Leather Gloves', slot: 'Hands', wowhead_id: 18823 },
        { name: 'Magma Tempered Boots', slot: 'Feet', wowhead_id: 18824 },
        { name: 'Deep Earth Spaulders', slot: 'Shoulder', wowhead_id: 18829 },
        { name: 'Brutality Blade', slot: 'Weapon', wowhead_id: 18832 },
        { name: 'Flamewaker Legplates', slot: 'Legs', wowhead_id: 18861 },
        { name: 'Mana Igniting Cord', slot: 'Waist', wowhead_id: 19136 },
        { name: 'Fire Runed Grimoire', slot: 'Off-Hand', wowhead_id: 19142 },
        { name: 'Flameguard Gauntlets', slot: 'Hands', wowhead_id: 19143 },
        { name: 'Sabatons of the Flamewalker', slot: 'Feet', wowhead_id: 19144 },
      ],
    },
    {
      name: 'Shazzrah',
      items: [
        // Tier 1 Pieces
        { name: 'Arcanist Gloves', slot: 'Hands', wowhead_id: 16801 },
        { name: 'Felheart Slippers', slot: 'Feet', wowhead_id: 16803 },
        { name: 'Boots of Prophecy', slot: 'Feet', wowhead_id: 16811 },
        { name: 'Nightslayer Boots', slot: 'Feet', wowhead_id: 16824 },
        { name: 'Cenarion Gloves', slot: 'Hands', wowhead_id: 16831 },
        { name: "Giantstalker's Gloves", slot: 'Hands', wowhead_id: 16852 },
        // Non-Tier Epic Drops
        { name: 'Crimson Shocker', slot: 'Wand', wowhead_id: 17077 },
        { name: 'Flamewaker Legplates', slot: 'Legs', wowhead_id: 18861 },
        { name: 'Helm of the Lifegiver', slot: 'Head', wowhead_id: 18870 },
        { name: 'Manastorm Leggings', slot: 'Legs', wowhead_id: 18872 },
        { name: 'Salamander Scale Pants', slot: 'Legs', wowhead_id: 18875 },
        { name: 'Sorcerous Dagger', slot: 'Weapon', wowhead_id: 18878 },
        { name: 'Heavy Dark Iron Ring', slot: 'Finger', wowhead_id: 18879 },
        { name: 'Robe of Volatile Power', slot: 'Chest', wowhead_id: 19145 },
        { name: 'Wristguards of Stability', slot: 'Wrist', wowhead_id: 19146 },
        { name: 'Ring of Spell Power', slot: 'Finger', wowhead_id: 19147 },
      ],
    },
    {
      name: 'Baron Geddon',
      items: [
        // Tier 1 Shoulders
        { name: 'Arcanist Mantle', slot: 'Shoulder', wowhead_id: 16797 },
        { name: 'Felheart Shoulder Pads', slot: 'Shoulder', wowhead_id: 16807 },
        { name: 'Cenarion Spaulders', slot: 'Shoulder', wowhead_id: 16836 },
        { name: 'Earthfury Epaulets', slot: 'Shoulder', wowhead_id: 16844 },
        { name: 'Lawbringer Spaulders', slot: 'Shoulder', wowhead_id: 16856 },
        // Non-Tier Epic Drops
        { name: 'Seal of the Archmagus', slot: 'Finger', wowhead_id: 17110 },
        { name: 'Talisman of Ephemeral Power', slot: 'Trinket', wowhead_id: 18820 },
        { name: 'Quick Strike Ring', slot: 'Finger', wowhead_id: 18821 },
        { name: 'Obsidian Edged Blade', slot: 'Two-Hand', wowhead_id: 18822 },
        { name: 'Aged Core Leather Gloves', slot: 'Hands', wowhead_id: 18823 },
        { name: 'Magma Tempered Boots', slot: 'Feet', wowhead_id: 18824 },
        { name: 'Deep Earth Spaulders', slot: 'Shoulder', wowhead_id: 18829 },
        { name: 'Flamewaker Legplates', slot: 'Legs', wowhead_id: 18861 },
        { name: 'Mana Igniting Cord', slot: 'Waist', wowhead_id: 19136 },
        { name: 'Fire Runed Grimoire', slot: 'Off-Hand', wowhead_id: 19142 },
        { name: 'Flameguard Gauntlets', slot: 'Hands', wowhead_id: 19143 },
        { name: 'Sabatons of the Flamewalker', slot: 'Feet', wowhead_id: 19144 },
      ],
    },
    {
      name: 'Sulfuron Harbinger',
      items: [
        // Tier 1 Shoulders
        { name: 'Mantle of Prophecy', slot: 'Shoulder', wowhead_id: 16816 },
        { name: 'Nightslayer Shoulder Pads', slot: 'Shoulder', wowhead_id: 16823 },
        { name: "Giantstalker's Epaulets", slot: 'Shoulder', wowhead_id: 16848 },
        { name: 'Pauldrons of Might', slot: 'Shoulder', wowhead_id: 16868 },
        // Non-Tier Epic Drops
        { name: 'Shadowstrike', slot: 'Weapon', wowhead_id: 17074 },
        { name: 'Crimson Shocker', slot: 'Wand', wowhead_id: 17077 },
        { name: 'Choker of Enlightenment', slot: 'Neck', wowhead_id: 17109 },
        { name: 'Flamewaker Legplates', slot: 'Legs', wowhead_id: 18861 },
        { name: 'Helm of the Lifegiver', slot: 'Head', wowhead_id: 18870 },
        { name: 'Manastorm Leggings', slot: 'Legs', wowhead_id: 18872 },
        { name: 'Salamander Scale Pants', slot: 'Legs', wowhead_id: 18875 },
        { name: 'Sorcerous Dagger', slot: 'Weapon', wowhead_id: 18878 },
        { name: 'Heavy Dark Iron Ring', slot: 'Finger', wowhead_id: 18879 },
        { name: 'Robe of Volatile Power', slot: 'Chest', wowhead_id: 19145 },
        { name: 'Wristguards of Stability', slot: 'Wrist', wowhead_id: 19146 },
        { name: 'Ring of Spell Power', slot: 'Finger', wowhead_id: 19147 },
      ],
    },
    {
      name: 'Golemagg the Incinerator',
      items: [
        // Tier 1 Chests - ALL Classes
        { name: 'Arcanist Robes', slot: 'Chest', wowhead_id: 16798 },
        { name: 'Felheart Robes', slot: 'Chest', wowhead_id: 16809 },
        { name: 'Robes of Prophecy', slot: 'Chest', wowhead_id: 16815 },
        { name: 'Nightslayer Chestpiece', slot: 'Chest', wowhead_id: 16820 },
        { name: 'Cenarion Vestments', slot: 'Chest', wowhead_id: 16833 },
        { name: 'Earthfury Vestments', slot: 'Chest', wowhead_id: 16841 },
        { name: "Giantstalker's Breastplate", slot: 'Chest', wowhead_id: 16845 },
        { name: 'Lawbringer Chestguard', slot: 'Chest', wowhead_id: 16853 },
        { name: 'Breastplate of Might', slot: 'Chest', wowhead_id: 16865 },
        // Non-Tier Epic Drops
        { name: 'Blastershot Launcher', slot: 'Ranged', wowhead_id: 17072 },
        { name: 'Azuresong Mageblade', slot: 'Weapon', wowhead_id: 17103 },
        { name: 'Sulfuron Ingot', slot: 'Quest', wowhead_id: 17203 },
        { name: 'Talisman of Ephemeral Power', slot: 'Trinket', wowhead_id: 18820 },
        { name: 'Quick Strike Ring', slot: 'Finger', wowhead_id: 18821 },
        { name: 'Obsidian Edged Blade', slot: 'Two-Hand', wowhead_id: 18822 },
        { name: 'Aged Core Leather Gloves', slot: 'Hands', wowhead_id: 18823 },
        { name: 'Magma Tempered Boots', slot: 'Feet', wowhead_id: 18824 },
        { name: 'Deep Earth Spaulders', slot: 'Shoulder', wowhead_id: 18829 },
        { name: 'Staff of Dominance', slot: 'Two-Hand', wowhead_id: 18842 },
        { name: 'Flamewaker Legplates', slot: 'Legs', wowhead_id: 18861 },
        { name: 'Mana Igniting Cord', slot: 'Waist', wowhead_id: 19136 },
        { name: 'Fire Runed Grimoire', slot: 'Off-Hand', wowhead_id: 19142 },
        { name: 'Flameguard Gauntlets', slot: 'Hands', wowhead_id: 19143 },
        { name: 'Sabatons of the Flamewalker', slot: 'Feet', wowhead_id: 19144 },
      ],
    },
    {
      name: 'Majordomo Executus',
      items: [
        { name: 'The Eye of Divinity', slot: 'Quest', wowhead_id: 18646 },
        { name: 'Ancient Petrified Leaf', slot: 'Quest', wowhead_id: 18703 },
        { name: 'Hyperthermically Insulated Lava Dredger', slot: 'Two-Hand', wowhead_id: 18803 },
        { name: 'Core Hound Tooth', slot: 'Weapon', wowhead_id: 18805 },
        { name: 'Core Forged Greaves', slot: 'Feet', wowhead_id: 18806 },
        { name: 'Sash of Whispered Secrets', slot: 'Waist', wowhead_id: 18809 },
        { name: 'Wild Growth Spaulders', slot: 'Shoulder', wowhead_id: 18810 },
        { name: 'Fireproof Cloak', slot: 'Back', wowhead_id: 18811 },
        { name: 'Wristguards of True Flight', slot: 'Wrist', wowhead_id: 18812 },
      ],
    },
    {
      name: 'Ragnaros',
      items: [
        // Tier 2 Legs - ALL Classes
        { name: 'Stormrage Legguards', slot: 'Legs', wowhead_id: 16901 },
        { name: 'Bloodfang Pants', slot: 'Legs', wowhead_id: 16909 },
        { name: 'Netherwind Pants', slot: 'Legs', wowhead_id: 16915 },
        { name: 'Leggings of Transcendence', slot: 'Legs', wowhead_id: 16922 },
        { name: 'Nemesis Leggings', slot: 'Legs', wowhead_id: 16930 },
        { name: "Dragonstalker's Legguards", slot: 'Legs', wowhead_id: 16938 },
        { name: 'Legplates of Ten Storms', slot: 'Legs', wowhead_id: 16946 },
        { name: 'Judgement Legplates', slot: 'Legs', wowhead_id: 16954 },
        { name: 'Legplates of Wrath', slot: 'Legs', wowhead_id: 16962 },
        // Weapons
        { name: 'Band of Accuria', slot: 'Finger', wowhead_id: 17063 },
        { name: "Bonereaver's Edge", slot: 'Two-Hand', wowhead_id: 17076 },
        { name: 'Shard of the Flame', slot: 'Trinket', wowhead_id: 17082 },
        { name: 'Cloak of the Shrouded Mists', slot: 'Back', wowhead_id: 17102 },
        { name: 'Spinal Reaper', slot: 'Two-Hand', wowhead_id: 17104 },
        { name: "Malistar's Defender", slot: 'Shield', wowhead_id: 17106 },
        { name: "Dragon's Blood Cape", slot: 'Back', wowhead_id: 17107 },
        { name: 'Choker of the Fire Lord', slot: 'Neck', wowhead_id: 18814 },
        { name: 'Essence of the Pure Flame', slot: 'Trinket', wowhead_id: 18815 },
        { name: "Perdition's Blade", slot: 'Weapon', wowhead_id: 18816 },
        { name: 'Crown of Destruction', slot: 'Head', wowhead_id: 18817 },
        { name: 'Onslaught Girdle', slot: 'Waist', wowhead_id: 19137 },
        { name: 'Band of Sulfuras', slot: 'Finger', wowhead_id: 19138 },
        // Legendary Quest Items
        { name: 'Eye of Sulfuras', slot: 'Quest', wowhead_id: 17204 },
        { name: 'Essence of the Firelord', slot: 'Quest', wowhead_id: 19017 },
      ],
    },
  ],
}

// ============================================================================
// BLACKWING LAIR - 8 Bosses - COMPLETE LOOT TABLES
// ============================================================================

export const blackwingLair: Raid = {
  name: 'Blackwing Lair',
  tier: 'Tier 2',
  bosses: [
    {
      name: 'Razorgore the Untamed',
      items: [
        // Tier 2 Bracers - ALL Classes
        { name: 'Stormrage Bracers', slot: 'Wrist', wowhead_id: 16904 },
        { name: 'Bloodfang Bracers', slot: 'Wrist', wowhead_id: 16911 },
        { name: 'Netherwind Bindings', slot: 'Wrist', wowhead_id: 16918 },
        { name: 'Bindings of Transcendence', slot: 'Wrist', wowhead_id: 16926 },
        { name: 'Nemesis Bracers', slot: 'Wrist', wowhead_id: 16934 },
        { name: "Dragonstalker's Bracers", slot: 'Wrist', wowhead_id: 16935 },
        { name: 'Bracers of Ten Storms', slot: 'Wrist', wowhead_id: 16943 },
        { name: 'Judgement Bindings', slot: 'Wrist', wowhead_id: 16951 },
        { name: 'Bracelets of Wrath', slot: 'Wrist', wowhead_id: 16959 },
        // Non-Tier Epic Drops
        { name: 'The Untamed Blade', slot: 'Two-Hand', wowhead_id: 19334 },
        { name: 'Spineshatter', slot: 'Weapon', wowhead_id: 19335 },
        { name: 'Arcane Infused Gem', slot: 'Trinket', wowhead_id: 19336 },
        { name: 'The Black Book', slot: 'Trinket', wowhead_id: 19337 },
        { name: 'Gloves of Rapid Evolution', slot: 'Hands', wowhead_id: 19369 },
        { name: 'Mantle of the Blackwing Cabal', slot: 'Shoulder', wowhead_id: 19370 },
      ],
    },
    {
      name: 'Vaelastrasz the Corrupt',
      items: [
        // Tier 2 Belts - ALL Classes
        { name: 'Netherwind Belt', slot: 'Waist', wowhead_id: 16818 },
        { name: 'Stormrage Belt', slot: 'Waist', wowhead_id: 16903 },
        { name: 'Bloodfang Belt', slot: 'Waist', wowhead_id: 16910 },
        { name: 'Belt of Transcendence', slot: 'Waist', wowhead_id: 16925 },
        { name: 'Nemesis Belt', slot: 'Waist', wowhead_id: 16933 },
        { name: "Dragonstalker's Belt", slot: 'Waist', wowhead_id: 16936 },
        { name: 'Belt of Ten Storms', slot: 'Waist', wowhead_id: 16944 },
        { name: 'Judgement Belt', slot: 'Waist', wowhead_id: 16952 },
        { name: 'Waistband of Wrath', slot: 'Waist', wowhead_id: 16960 },
        // Non-Tier Epic Drops
        { name: 'Mind Quickening Gem', slot: 'Trinket', wowhead_id: 19339 },
        { name: 'Rune of Metamorphosis', slot: 'Trinket', wowhead_id: 19340 },
        { name: 'Dragonfang Blade', slot: 'Weapon', wowhead_id: 19346 },
        { name: 'Red Dragonscale Protector', slot: 'Shield', wowhead_id: 19348 },
        { name: 'Pendant of the Fallen Dragon', slot: 'Neck', wowhead_id: 19371 },
        { name: 'Helm of Endless Rage', slot: 'Head', wowhead_id: 19372 },
      ],
    },
    {
      name: 'Broodlord Lashlayer',
      items: [
        // Tier 2 Boots - ALL Classes
        { name: 'Stormrage Boots', slot: 'Feet', wowhead_id: 16898 },
        { name: 'Bloodfang Boots', slot: 'Feet', wowhead_id: 16906 },
        { name: 'Netherwind Boots', slot: 'Feet', wowhead_id: 16912 },
        { name: 'Boots of Transcendence', slot: 'Feet', wowhead_id: 16919 },
        { name: 'Nemesis Boots', slot: 'Feet', wowhead_id: 16927 },
        { name: "Dragonstalker's Greaves", slot: 'Feet', wowhead_id: 16941 },
        { name: 'Greaves of Ten Storms', slot: 'Feet', wowhead_id: 16949 },
        { name: 'Judgement Sabatons', slot: 'Feet', wowhead_id: 16957 },
        { name: 'Sabatons of Wrath', slot: 'Feet', wowhead_id: 16965 },
        // Non-Tier Epic Drops
        { name: 'Black Brood Pauldrons', slot: 'Shoulder', wowhead_id: 19373 },
        { name: 'Bracers of Arcane Accuracy', slot: 'Wrist', wowhead_id: 19374 },
        { name: 'Lifegiving Gem', slot: 'Trinket', wowhead_id: 19341 },
        { name: 'Venomous Totem', slot: 'Trinket', wowhead_id: 19342 },
        { name: 'Heartstriker', slot: 'Ranged', wowhead_id: 19350 },
        { name: 'Maladath, Runed Blade of the Black Flight', slot: 'Weapon', wowhead_id: 19351 },
      ],
    },
    {
      name: 'Firemaw',
      items: [
        // Tier 2 Gloves - ALL Classes (shared with Ebonroc & Flamegor)
        { name: 'Stormrage Handguards', slot: 'Hands', wowhead_id: 16899 },
        { name: 'Bloodfang Gloves', slot: 'Hands', wowhead_id: 16907 },
        { name: 'Netherwind Gloves', slot: 'Hands', wowhead_id: 16913 },
        { name: 'Handguards of Transcendence', slot: 'Hands', wowhead_id: 16920 },
        { name: 'Nemesis Gloves', slot: 'Hands', wowhead_id: 16928 },
        { name: "Dragonstalker's Gauntlets", slot: 'Hands', wowhead_id: 16940 },
        { name: 'Gauntlets of Ten Storms', slot: 'Hands', wowhead_id: 16948 },
        { name: 'Judgement Gauntlets', slot: 'Hands', wowhead_id: 16956 },
        { name: 'Gauntlets of Wrath', slot: 'Hands', wowhead_id: 16964 },
        // Non-Tier Epic Drops
        { name: 'Scrolls of Blinding Light', slot: 'Trinket', wowhead_id: 19343 },
        { name: 'Natural Alignment Crystal', slot: 'Trinket', wowhead_id: 19344 },
        { name: 'Drake Talon Cleaver', slot: 'Weapon', wowhead_id: 19353 },
        { name: 'Shadow Wing Focus Staff', slot: 'Two-Hand', wowhead_id: 19355 },
        { name: 'Claw of the Black Drake', slot: 'Weapon', wowhead_id: 19365 },
        { name: 'Drake Talon Pauldrons', slot: 'Shoulder', wowhead_id: 19394 },
        { name: 'Rejuvenating Gem', slot: 'Trinket', wowhead_id: 19395 },
        { name: 'Taut Dragonhide Belt', slot: 'Waist', wowhead_id: 19396 },
        { name: 'Ring of Blackrock', slot: 'Finger', wowhead_id: 19397 },
        { name: 'Cloak of Firemaw', slot: 'Back', wowhead_id: 19398 },
        { name: 'Black Ash Robe', slot: 'Chest', wowhead_id: 19399 },
        { name: "Firemaw's Clutch", slot: 'Waist', wowhead_id: 19400 },
        { name: "Primalist's Linked Legguards", slot: 'Legs', wowhead_id: 19401 },
        { name: 'Legguards of the Fallen Crusader', slot: 'Legs', wowhead_id: 19402 },
      ],
    },
    {
      name: 'Ebonroc',
      items: [
        // Tier 2 Gloves - ALL Classes (shared drop table)
        { name: 'Stormrage Handguards', slot: 'Hands', wowhead_id: 16899 },
        { name: 'Bloodfang Gloves', slot: 'Hands', wowhead_id: 16907 },
        { name: 'Netherwind Gloves', slot: 'Hands', wowhead_id: 16913 },
        { name: 'Handguards of Transcendence', slot: 'Hands', wowhead_id: 16920 },
        { name: 'Nemesis Gloves', slot: 'Hands', wowhead_id: 16928 },
        { name: "Dragonstalker's Gauntlets", slot: 'Hands', wowhead_id: 16940 },
        { name: 'Gauntlets of Ten Storms', slot: 'Hands', wowhead_id: 16948 },
        { name: 'Judgement Gauntlets', slot: 'Hands', wowhead_id: 16956 },
        { name: 'Gauntlets of Wrath', slot: 'Hands', wowhead_id: 16964 },
        // Non-Tier Epic Drops
        { name: 'Aegis of Preservation', slot: 'Trinket', wowhead_id: 19345 },
        { name: 'Drake Talon Cleaver', slot: 'Weapon', wowhead_id: 19353 },
        { name: 'Shadow Wing Focus Staff', slot: 'Two-Hand', wowhead_id: 19355 },
        { name: 'Dragonbreath Hand Cannon', slot: 'Ranged', wowhead_id: 19368 },
        { name: 'Drake Talon Pauldrons', slot: 'Shoulder', wowhead_id: 19394 },
        { name: 'Rejuvenating Gem', slot: 'Trinket', wowhead_id: 19395 },
        { name: 'Taut Dragonhide Belt', slot: 'Waist', wowhead_id: 19396 },
        { name: 'Ring of Blackrock', slot: 'Finger', wowhead_id: 19397 },
        { name: 'Band of Forced Concentration', slot: 'Finger', wowhead_id: 19403 },
        { name: "Malfurion's Blessed Bulwark", slot: 'Chest', wowhead_id: 19405 },
        { name: 'Drake Fang Talisman', slot: 'Trinket', wowhead_id: 19406 },
        { name: 'Ebony Flame Gloves', slot: 'Hands', wowhead_id: 19407 },
      ],
    },
    {
      name: 'Flamegor',
      items: [
        // Tier 2 Gloves - ALL Classes (shared drop table)
        { name: 'Stormrage Handguards', slot: 'Hands', wowhead_id: 16899 },
        { name: 'Bloodfang Gloves', slot: 'Hands', wowhead_id: 16907 },
        { name: 'Netherwind Gloves', slot: 'Hands', wowhead_id: 16913 },
        { name: 'Handguards of Transcendence', slot: 'Hands', wowhead_id: 16920 },
        { name: 'Nemesis Gloves', slot: 'Hands', wowhead_id: 16928 },
        { name: "Dragonstalker's Gauntlets", slot: 'Hands', wowhead_id: 16940 },
        { name: 'Gauntlets of Ten Storms', slot: 'Hands', wowhead_id: 16948 },
        { name: 'Judgement Gauntlets', slot: 'Hands', wowhead_id: 16956 },
        { name: 'Gauntlets of Wrath', slot: 'Hands', wowhead_id: 16964 },
        // Non-Tier Epic Drops
        { name: 'Drake Talon Cleaver', slot: 'Weapon', wowhead_id: 19353 },
        { name: 'Shadow Wing Focus Staff', slot: 'Two-Hand', wowhead_id: 19355 },
        { name: 'Herald of Woe', slot: 'Weapon', wowhead_id: 19357 },
        { name: "Dragon's Touch", slot: 'Wand', wowhead_id: 19367 },
        { name: 'Drake Talon Pauldrons', slot: 'Shoulder', wowhead_id: 19394 },
        { name: 'Rejuvenating Gem', slot: 'Trinket', wowhead_id: 19395 },
        { name: 'Taut Dragonhide Belt', slot: 'Waist', wowhead_id: 19396 },
        { name: 'Ring of Blackrock', slot: 'Finger', wowhead_id: 19397 },
        { name: 'Shroud of Pure Thought', slot: 'Back', wowhead_id: 19430 },
        { name: "Styleen's Impeding Scarab", slot: 'Trinket', wowhead_id: 19431 },
        { name: 'Circle of Applied Force', slot: 'Finger', wowhead_id: 19432 },
        { name: 'Emberweave Leggings', slot: 'Legs', wowhead_id: 19433 },
      ],
    },
    {
      name: 'Chromaggus',
      items: [
        // Tier 2 Shoulders - ALL Classes
        { name: 'Bloodfang Spaulders', slot: 'Shoulder', wowhead_id: 16832 },
        { name: 'Stormrage Pauldrons', slot: 'Shoulder', wowhead_id: 16902 },
        { name: 'Netherwind Mantle', slot: 'Shoulder', wowhead_id: 16917 },
        { name: 'Pauldrons of Transcendence', slot: 'Shoulder', wowhead_id: 16924 },
        { name: 'Nemesis Spaulders', slot: 'Shoulder', wowhead_id: 16932 },
        { name: "Dragonstalker's Spaulders", slot: 'Shoulder', wowhead_id: 16937 },
        { name: 'Epaulets of Ten Storms', slot: 'Shoulder', wowhead_id: 16945 },
        { name: 'Judgement Spaulders', slot: 'Shoulder', wowhead_id: 16953 },
        { name: 'Pauldrons of Wrath', slot: 'Shoulder', wowhead_id: 16961 },
        // Non-Tier Epic Drops
        { name: 'Claw of Chromaggus', slot: 'Weapon', wowhead_id: 19347 },
        { name: 'Elementium Reinforced Bulwark', slot: 'Shield', wowhead_id: 19349 },
        { name: 'Chromatically Tempered Sword', slot: 'Weapon', wowhead_id: 19352 },
        { name: "Ashjre'thul, Crossbow of Smiting", slot: 'Ranged', wowhead_id: 19361 },
        { name: 'Empowered Leggings', slot: 'Legs', wowhead_id: 19385 },
        { name: 'Elementium Threaded Cloak', slot: 'Back', wowhead_id: 19386 },
        { name: 'Chromatic Boots', slot: 'Feet', wowhead_id: 19387 },
        { name: "Angelista's Grasp", slot: 'Waist', wowhead_id: 19388 },
        { name: 'Taut Dragonhide Shoulderpads', slot: 'Shoulder', wowhead_id: 19389 },
        { name: 'Taut Dragonhide Gloves', slot: 'Hands', wowhead_id: 19390 },
        { name: 'Shimmering Geta', slot: 'Feet', wowhead_id: 19391 },
        { name: 'Girdle of the Fallen Crusader', slot: 'Waist', wowhead_id: 19392 },
        { name: "Primalist's Linked Waistguard", slot: 'Waist', wowhead_id: 19393 },
      ],
    },
    {
      name: 'Nefarian',
      items: [
        // Tier 2 Chests - ALL Classes
        { name: 'Stormrage Chestguard', slot: 'Chest', wowhead_id: 16897 },
        { name: 'Bloodfang Chestpiece', slot: 'Chest', wowhead_id: 16905 },
        { name: 'Netherwind Robes', slot: 'Chest', wowhead_id: 16916 },
        { name: 'Robes of Transcendence', slot: 'Chest', wowhead_id: 16923 },
        { name: 'Nemesis Robes', slot: 'Chest', wowhead_id: 16931 },
        { name: "Dragonstalker's Breastplate", slot: 'Chest', wowhead_id: 16942 },
        { name: 'Breastplate of Ten Storms', slot: 'Chest', wowhead_id: 16950 },
        { name: 'Judgement Breastplate', slot: 'Chest', wowhead_id: 16958 },
        { name: 'Breastplate of Wrath', slot: 'Chest', wowhead_id: 16966 },
        // Weapons
        { name: "Lok'amir il Romathis", slot: 'Weapon', wowhead_id: 19360 },
        { name: "Crul'shorukh, Edge of Chaos", slot: 'Weapon', wowhead_id: 19363 },
        { name: 'Ashkandi, Greatsword of the Brotherhood', slot: 'Two-Hand', wowhead_id: 19364 },
        { name: 'Staff of the Shadow Flame', slot: 'Two-Hand', wowhead_id: 19356 },
        // Armor
        { name: "Mish'undare, Circlet of the Mind Flayer", slot: 'Head', wowhead_id: 19375 },
        { name: "Therazane's Link", slot: 'Waist', wowhead_id: 19380 },
        { name: 'Boots of the Shadow Flame', slot: 'Feet', wowhead_id: 19381 },
        // Accessories
        { name: "Archimtiros' Ring of Reckoning", slot: 'Finger', wowhead_id: 19376 },
        { name: "Prestor's Talisman of Connivery", slot: 'Neck', wowhead_id: 19377 },
        { name: 'Cloak of the Brood Lord', slot: 'Back', wowhead_id: 19378 },
        { name: "Neltharion's Tear", slot: 'Trinket', wowhead_id: 19379 },
        { name: 'Pure Elementium Band', slot: 'Finger', wowhead_id: 19382 },
        // Quest Item
        { name: 'Head of Nefarian', slot: 'Quest', wowhead_id: 19003 },
      ],
    },
  ],
}

// ============================================================================
// ONYXIA'S LAIR - 1 Boss - COMPLETE LOOT TABLE
// ============================================================================

export const onyxiasLair: Raid = {
  name: "Onyxia's Lair",
  tier: 'Tier 2',
  bosses: [
    {
      name: 'Onyxia',
      items: [
        // Tier 2 Helms - ALL Classes
        { name: 'Stormrage Cover', slot: 'Head', wowhead_id: 16900 },
        { name: 'Bloodfang Hood', slot: 'Head', wowhead_id: 16908 },
        { name: 'Netherwind Crown', slot: 'Head', wowhead_id: 16914 },
        { name: 'Halo of Transcendence', slot: 'Head', wowhead_id: 16921 },
        { name: 'Nemesis Skullcap', slot: 'Head', wowhead_id: 16929 },
        { name: "Dragonstalker's Helm", slot: 'Head', wowhead_id: 16939 },
        { name: 'Helmet of Ten Storms', slot: 'Head', wowhead_id: 16947 },
        { name: 'Judgement Crown', slot: 'Head', wowhead_id: 16955 },
        { name: 'Helm of Wrath', slot: 'Head', wowhead_id: 16963 },
        // Weapons
        { name: 'Ancient Cornerstone Grimoire', slot: 'Off-Hand', wowhead_id: 17067 },
        { name: 'Deathbringer', slot: 'Weapon', wowhead_id: 17068 },
        { name: "Vis'kag the Bloodletter", slot: 'Weapon', wowhead_id: 17075 },
        // Accessories
        { name: 'Shard of the Scale', slot: 'Trinket', wowhead_id: 17064 },
        { name: 'Sapphiron Drape', slot: 'Back', wowhead_id: 17078 },
        { name: "Eskhandar's Collar", slot: 'Neck', wowhead_id: 18205 },
        { name: 'Ring of Binding', slot: 'Finger', wowhead_id: 18813 },
        // Quest Item
        { name: 'Head of Onyxia', slot: 'Quest', wowhead_id: 18423 },
      ],
    },
  ],
}

// ============================================================================
// REMAINING RAIDS - From Existing Data
// ============================================================================

export const zulGurub: Raid = {
  name: "Zul'Gurub",
  tier: 'Tier 1.5',
  bosses: [
    {
      name: 'High Priest Venoxis',
      items: [
        { name: 'Zulian Stone Axe', slot: 'Two-Hand', wowhead_id: 19900 },
        { name: 'Fang of Venoxis', slot: 'Weapon', wowhead_id: 19903 },
        { name: 'Zulian Tigerhide Cloak', slot: 'Back', wowhead_id: 19907 },
        { name: 'Runed Bloodstained Hauberk', slot: 'Chest', wowhead_id: 19904 },
        { name: 'Blooddrenched Footpads', slot: 'Feet', wowhead_id: 19906 },
        { name: "Zanzil's Band", slot: 'Finger', wowhead_id: 19905 },
      ],
    },
    {
      name: 'High Priestess Jeklik',
      items: [
        { name: "Jeklik's Crusher", slot: 'Two-Hand', wowhead_id: 19918 },
        { name: 'Zulian Defender', slot: 'Shield', wowhead_id: 19915 },
        { name: "Primalist's Band", slot: 'Finger', wowhead_id: 19920 },
        { name: "Jeklik's Opaline Talisman", slot: 'Neck', wowhead_id: 19923 },
        { name: "Animist's Spaulders", slot: 'Shoulder', wowhead_id: 19928 },
        { name: 'Seafury Boots', slot: 'Feet', wowhead_id: 20262 },
        { name: 'Peacekeeper Boots', slot: 'Feet', wowhead_id: 20265 },
      ],
    },
    {
      name: "High Priestess Mar'li",
      items: [
        { name: "Mar'li's Touch", slot: 'Wand', wowhead_id: 19927 },
        { name: 'Flowing Ritual Robes', slot: 'Chest', wowhead_id: 20032 },
        { name: 'Band of Jin', slot: 'Finger', wowhead_id: 19925 },
        { name: 'Talisman of Protection', slot: 'Neck', wowhead_id: 19871 },
        { name: 'Bloodstained Greaves', slot: 'Feet', wowhead_id: 19919 },
        { name: "Mar'li's Eye", slot: 'Trinket', wowhead_id: 19930 },
      ],
    },
    {
      name: 'High Priest Thekal',
      items: [
        { name: 'Zulian Slicer', slot: 'Weapon', wowhead_id: 19901 },
        { name: "Thekal's Grasp", slot: 'Weapon', wowhead_id: 19896 },
        { name: 'Seal of Jin', slot: 'Finger', wowhead_id: 19898 },
        { name: 'Ritualistic Legguards', slot: 'Legs', wowhead_id: 19899 },
        { name: "Betrayer's Boots", slot: 'Feet', wowhead_id: 19897 },
        { name: 'Seafury Leggings', slot: 'Legs', wowhead_id: 20260 },
        { name: 'Peacekeeper Leggings', slot: 'Legs', wowhead_id: 20266 },
        { name: 'Band of Servitude', slot: 'Finger', wowhead_id: 22721 },
        { name: 'Swift Zulian Tiger', slot: 'Mount', wowhead_id: 19902 },
      ],
    },
    {
      name: 'High Priestess Arlokk',
      items: [
        { name: 'Will of Arlokk', slot: 'Two-Hand', wowhead_id: 19909 },
        { name: "Arlokk's Grasp", slot: 'Weapon', wowhead_id: 19910 },
        { name: "Arlokk's Hoodoo Stick", slot: 'Off-Hand', wowhead_id: 19922 },
        { name: "Overlord's Onyx Band", slot: 'Finger', wowhead_id: 19912 },
        { name: 'Panther Hide Sack', slot: 'Bag', wowhead_id: 19914 },
        { name: 'Bloodsoaked Greaves', slot: 'Feet', wowhead_id: 19913 },
      ],
    },
    {
      name: "Gahz'ranka",
      items: [
        { name: "Tigule's Harpoon", slot: 'Two-Hand', wowhead_id: 19946 },
        { name: "Nat Pagle's Fish Terminator", slot: 'Two-Hand', wowhead_id: 19944 },
        { name: 'Lizardscale Eyepatch', slot: 'Head', wowhead_id: 19945 },
        { name: "Nat Pagle's Broken Reel", slot: 'Trinket', wowhead_id: 19947 },
        { name: 'Tome of Polymorph: Turtle', slot: 'Book', wowhead_id: 22739 },
      ],
    },
    {
      name: 'Bloodlord Mandokir',
      items: [
        { name: 'Halberd of Smiting', slot: 'Two-Hand', wowhead_id: 19874 },
        { name: 'Warblade of the Hakkari', slot: 'Weapon', wowhead_id: 19866 },
        { name: "Bloodlord's Defender", slot: 'Weapon', wowhead_id: 19867 },
        { name: "Mandokir's Sting", slot: 'Ranged', wowhead_id: 20038 },
        { name: 'Bloodsoaked Pauldrons', slot: 'Shoulder', wowhead_id: 19878 },
        { name: 'Bloodtinged Kilt', slot: 'Legs', wowhead_id: 19895 },
        { name: 'Blooddrenched Grips', slot: 'Hands', wowhead_id: 19869 },
        { name: "Animist's Leggings", slot: 'Legs', wowhead_id: 19877 },
        { name: "Primalist's Seal", slot: 'Finger', wowhead_id: 19863 },
        { name: "Overlord's Crimson Band", slot: 'Finger', wowhead_id: 19873 },
        { name: "Zanzil's Seal", slot: 'Finger', wowhead_id: 19893 },
        { name: 'Hakkari Loa Cloak', slot: 'Back', wowhead_id: 19870 },
        { name: 'Swift Razzashi Raptor', slot: 'Mount', wowhead_id: 19872 },
      ],
    },
    {
      name: 'Edge of Madness',
      items: [
        { name: "Gri'lek's Carver", slot: 'Two-Hand', wowhead_id: 19962 },
        { name: "Gri'lek's Grinder", slot: 'Weapon', wowhead_id: 19961 },
        { name: "Gri'lek's Blood", slot: 'Quest', wowhead_id: 19939 },
        { name: 'Fiery Retributer', slot: 'Weapon', wowhead_id: 19968 },
        { name: 'Thoughtblighter', slot: 'Wand', wowhead_id: 19967 },
        { name: "Hazza'rah's Dream Thread", slot: 'Quest', wowhead_id: 19942 },
        { name: 'Pitchfork of Madness', slot: 'Two-Hand', wowhead_id: 19963 },
        { name: "Renataki's Soul Conduit", slot: 'Weapon', wowhead_id: 19964 },
        { name: "Renataki's Tooth", slot: 'Quest', wowhead_id: 19940 },
        { name: 'Hoodoo Hunting Bow', slot: 'Ranged', wowhead_id: 19993 },
        { name: "Wushoolay's Poker", slot: 'Weapon', wowhead_id: 19965 },
        { name: "Wushoolay's Mane", slot: 'Quest', wowhead_id: 19941 },
      ],
    },
    {
      name: "Jin'do the Hexxer",
      items: [
        { name: "Jin'do's Judgment", slot: 'Two-Hand', wowhead_id: 19884 },
        { name: "Jin'do's Hexxer", slot: 'Weapon', wowhead_id: 19890 },
        { name: "Jin'do's Bag of Whammies", slot: 'Off-Hand', wowhead_id: 19891 },
        { name: "The Hexxer's Cover", slot: 'Head', wowhead_id: 19886 },
        { name: 'Bloodtinged Gloves', slot: 'Hands', wowhead_id: 19929 },
        { name: 'Bloodsoaked Gauntlets', slot: 'Hands', wowhead_id: 19894 },
        { name: 'Bloodstained Coif', slot: 'Head', wowhead_id: 19875 },
        { name: 'Bloodstained Legplates', slot: 'Legs', wowhead_id: 19887 },
        { name: 'Blooddrenched Leggings', slot: 'Legs', wowhead_id: 19889 },
        { name: "Overlord's Embrace", slot: 'Back', wowhead_id: 19888 },
        { name: "Jin'do's Evil Eye", slot: 'Neck', wowhead_id: 19885 },
        { name: 'Primal Hakkari Idol', slot: 'Idol', wowhead_id: 22637 },
      ],
    },
    {
      name: 'Hakkar the Soulflayer',
      items: [
        { name: "Zin'rokh, Destroyer of Worlds", slot: 'Two-Hand', wowhead_id: 19854 },
        { name: 'Bloodcaller', slot: 'Weapon', wowhead_id: 19864 },
        { name: 'Warblade of the Hakkari', slot: 'Weapon', wowhead_id: 19865 },
        { name: 'Fang of the Faceless', slot: 'Weapon', wowhead_id: 19859 },
        { name: 'Ancient Hakkari Manslayer', slot: 'Weapon', wowhead_id: 19852 },
        { name: 'Touch of Chaos', slot: 'Wand', wowhead_id: 19861 },
        { name: 'Gurubashi Dwarf Destroyer', slot: 'Ranged', wowhead_id: 19853 },
        { name: 'Aegis of the Blood God', slot: 'Shield', wowhead_id: 19862 },
        { name: "Soul Corrupter's Necklace", slot: 'Neck', wowhead_id: 19876 },
        { name: 'The Eye of Hakkar', slot: 'Neck', wowhead_id: 19856 },
        { name: 'Cloak of Consumption', slot: 'Back', wowhead_id: 19857 },
        { name: 'Seafury Gauntlets', slot: 'Hands', wowhead_id: 20257 },
        { name: 'Bloodsoaked Legplates', slot: 'Legs', wowhead_id: 19855 },
        { name: 'Peacekeeper Gauntlets', slot: 'Hands', wowhead_id: 20264 },
        { name: 'Heart of Hakkar', slot: 'Quest', wowhead_id: 19802 },
      ],
    },
  ],
}

export const ruinsOfAhnQiraj: Raid = {
  name: "Ruins of Ahn'Qiraj",
  tier: 'Tier 1.5',
  bosses: [
    {
      name: 'Kurinnaxx',
      items: [
        { name: 'Qiraji Sacrificial Dagger', slot: 'Weapon', wowhead_id: 21498 },
        { name: 'Vestments of the Shifting Sands', slot: 'Chest', wowhead_id: 21499 },
        { name: 'Belt of the Inquisition', slot: 'Waist', wowhead_id: 21500 },
        { name: 'Toughened Silithid Hide Gloves', slot: 'Hands', wowhead_id: 21501 },
        { name: 'Sand Reaver Wristguards', slot: 'Wrist', wowhead_id: 21502 },
        { name: 'Belt of the Sand Reaver', slot: 'Waist', wowhead_id: 21503 },
      ],
    },
    {
      name: 'General Rajaxx',
      items: [
        { name: 'Manslayer of the Qiraji', slot: 'Two-Hand', wowhead_id: 21492 },
        { name: 'Bracers of Qiraji Command', slot: 'Wrist', wowhead_id: 21496 },
        { name: "Southwind's Grasp", slot: 'Waist', wowhead_id: 21494 },
        { name: 'Boots of the Vanguard', slot: 'Feet', wowhead_id: 21493 },
        { name: 'Legplates of the Qiraji Command', slot: 'Legs', wowhead_id: 21495 },
        { name: 'Boots of the Qiraji General', slot: 'Feet', wowhead_id: 21497 },
        { name: 'Gavel of Qiraji Authority', slot: 'Two-Hand', wowhead_id: 21806 },
        { name: 'Treads of the Wandering Nomad', slot: 'Feet', wowhead_id: 21810 },
        { name: 'Fury of the Forgotten Swarm', slot: 'Neck', wowhead_id: 21809 },
      ],
    },
    {
      name: 'Buru the Gorger',
      items: [
        { name: "Buru's Skull Fragment", slot: 'Shield', wowhead_id: 21485 },
        { name: 'Quicksand Waders', slot: 'Feet', wowhead_id: 21489 },
        { name: 'Scaled Bracers of the Gorger', slot: 'Wrist', wowhead_id: 21491 },
        { name: 'Slimy Scaled Gauntlets', slot: 'Hands', wowhead_id: 21487 },
        { name: 'Gloves of the Swarm', slot: 'Hands', wowhead_id: 21486 },
        { name: 'Slime Kickers', slot: 'Feet', wowhead_id: 21490 },
        { name: 'Fetish of Chitinous Spikes', slot: 'Trinket', wowhead_id: 21488 },
      ],
    },
    {
      name: 'Ayamiss the Hunter',
      items: [
        { name: 'Bow of Taut Sinew', slot: 'Ranged', wowhead_id: 21478 },
        { name: 'Stinger of Ayamiss', slot: 'Weapon', wowhead_id: 21466 },
        { name: 'Helm of Regrowth', slot: 'Head', wowhead_id: 21484 },
        { name: 'Scaled Silithid Gauntlets', slot: 'Hands', wowhead_id: 21480 },
        { name: 'Boots of the Fiery Sands', slot: 'Feet', wowhead_id: 21482 },
        { name: 'Ring of the Desert Winds', slot: 'Finger', wowhead_id: 21483 },
      ],
    },
    {
      name: 'Moam',
      items: [
        { name: 'Talon of Furious Concentration', slot: 'Off-Hand', wowhead_id: 21471 },
        { name: 'Dustwind Turban', slot: 'Head', wowhead_id: 21472 },
        { name: "Mantle of Maz'Nadir", slot: 'Shoulder', wowhead_id: 21468 },
        { name: 'Eye of Moam', slot: 'Trinket', wowhead_id: 21473 },
        { name: 'Southwind Helm', slot: 'Head', wowhead_id: 21455 },
        { name: 'Chitinous Shoulderguards', slot: 'Shoulder', wowhead_id: 21474 },
        { name: 'Thick Silithid Chestguard', slot: 'Chest', wowhead_id: 21467 },
        { name: 'Gauntlets of Southwind', slot: 'Hands', wowhead_id: 21469 },
        { name: 'Gauntlets of the Immovable', slot: 'Hands', wowhead_id: 21479 },
        { name: 'Obsidian Scaled Leggings', slot: 'Legs', wowhead_id: 21476 },
        { name: 'Legplates of the Destroyer', slot: 'Legs', wowhead_id: 21475 },
        { name: 'Cloak of the Savior', slot: 'Back', wowhead_id: 21470 },
        { name: 'Ring of Fury', slot: 'Finger', wowhead_id: 21477 },
      ],
    },
    {
      name: 'Ossirian the Unscarred',
      items: [
        { name: 'Staff of the Ruins', slot: 'Two-Hand', wowhead_id: 21452 },
        { name: 'Sand Polished Hammer', slot: 'Weapon', wowhead_id: 21715 },
        { name: 'Crossbow of Imminent Doom', slot: 'Ranged', wowhead_id: 21459 },
        { name: 'Mantle of the Horusath', slot: 'Shoulder', wowhead_id: 21453 },
        { name: 'Runic Stone Shoulders', slot: 'Shoulder', wowhead_id: 21454 },
        { name: 'Bracers of Brutality', slot: 'Wrist', wowhead_id: 21457 },
        { name: 'Gauntlets of New Life', slot: 'Hands', wowhead_id: 21458 },
        { name: 'Helm of Domination', slot: 'Head', wowhead_id: 21460 },
        { name: 'Leggings of the Black Blizzard', slot: 'Legs', wowhead_id: 21461 },
        { name: 'Gloves of Dark Wisdom', slot: 'Hands', wowhead_id: 21462 },
        { name: "Ossirian's Binding", slot: 'Waist', wowhead_id: 21463 },
        { name: 'Shackles of the Unscarred', slot: 'Wrist', wowhead_id: 21464 },
        { name: 'Sandstorm Cloak', slot: 'Back', wowhead_id: 21456 },
        { name: 'Head of Ossirian the Unscarred', slot: 'Quest', wowhead_id: 21220 },
      ],
    },
  ],
}

export const templeOfAhnQiraj: Raid = {
  name: "Temple of Ahn'Qiraj",
  tier: 'Tier 2.5',
  bosses: [
    {
      name: 'The Prophet Skeram',
      items: [
        { name: 'Staff of the Qiraji Prophets', slot: 'Two-Hand', wowhead_id: 21128 },
        { name: "Hammer of Ji'zhi", slot: 'Two-Hand', wowhead_id: 21703 },
        { name: 'Breastplate of Annihilation', slot: 'Chest', wowhead_id: 21814 },
        { name: 'Ring of Swarming Thought', slot: 'Finger', wowhead_id: 21707 },
        { name: 'Amulet of Foul Warding', slot: 'Neck', wowhead_id: 21702 },
        { name: 'Pendant of the Qiraji Guardian', slot: 'Neck', wowhead_id: 21700 },
        { name: 'Cloak of Concentrated Hatred', slot: 'Back', wowhead_id: 21701 },
        { name: 'Leggings of Immersion', slot: 'Legs', wowhead_id: 21698 },
        { name: 'Beetle Scaled Wristguards', slot: 'Wrist', wowhead_id: 21708 },
        { name: 'Barrage Shoulders', slot: 'Shoulder', wowhead_id: 21699 },
        { name: 'Boots of the Redeemed Prophecy', slot: 'Feet', wowhead_id: 21704 },
        { name: 'Boots of the Unwavering Will', slot: 'Feet', wowhead_id: 21706 },
      ],
    },
    {
      name: 'Silithid Royalty',
      items: [
        { name: 'Mantle of Phrenic Power', slot: 'Shoulder', wowhead_id: 21686 },
        { name: 'Ternary Mantle', slot: 'Shoulder', wowhead_id: 21694 },
        { name: 'Robes of the Triumvirate', slot: 'Chest', wowhead_id: 21696 },
        { name: 'Cape of the Trinity', slot: 'Back', wowhead_id: 21697 },
        { name: "Ukko's Ring of Darkness", slot: 'Finger', wowhead_id: 21687 },
        { name: "Angelista's Touch", slot: 'Finger', wowhead_id: 21695 },
        { name: 'Mantle of the Desert Crusade', slot: 'Shoulder', wowhead_id: 21683 },
        { name: 'Triad Girdle', slot: 'Waist', wowhead_id: 21692 },
        { name: 'Vest of Swift Execution', slot: 'Chest', wowhead_id: 21680 },
        { name: 'Wand of Qiraji Nobility', slot: 'Wand', wowhead_id: 21603 },
        { name: 'Ring of the Devoured', slot: 'Finger', wowhead_id: 21681 },
        { name: 'Petrified Scarab', slot: 'Trinket', wowhead_id: 21685 },
        { name: 'Gloves of Ebru', slot: 'Hands', wowhead_id: 21689 },
        { name: "Angelista's Charm", slot: 'Neck', wowhead_id: 21690 },
        { name: 'Ooze-Ridden Gauntlets', slot: 'Hands', wowhead_id: 21691 },
        { name: 'Boots of the Fallen Hero', slot: 'Feet', wowhead_id: 21688 },
      ],
    },
    {
      name: 'Battleguard Sartura',
      items: [
        { name: 'Silithid Claw', slot: 'Weapon', wowhead_id: 21673 },
        { name: "Sartura's Might", slot: 'Off-Hand', wowhead_id: 21666 },
        { name: 'Creeping Vine Helm', slot: 'Head', wowhead_id: 21669 },
        { name: 'Leggings of the Festering Swarm', slot: 'Legs', wowhead_id: 21676 },
        { name: 'Recomposed Boots', slot: 'Feet', wowhead_id: 21648 },
        { name: 'Badge of the Swarmguard', slot: 'Trinket', wowhead_id: 21670 },
        { name: 'Robes of the Battleguard', slot: 'Chest', wowhead_id: 21671 },
        { name: 'Gloves of Enforcement', slot: 'Hands', wowhead_id: 21672 },
        { name: 'Scaled Leggings of Qiraji Fury', slot: 'Legs', wowhead_id: 21668 },
        { name: 'Necklace of Purity', slot: 'Neck', wowhead_id: 21678 },
        { name: 'Gauntlets of Steadfast Determination', slot: 'Hands', wowhead_id: 21674 },
        { name: 'Legplates of Blazing Light', slot: 'Legs', wowhead_id: 21667 },
      ],
    },
    {
      name: 'Fankriss the Unyielding',
      items: [
        { name: 'Barb of the Sand Reaver', slot: 'Two-Hand', wowhead_id: 21635 },
        { name: 'Ancient Qiraji Ripper', slot: 'Weapon', wowhead_id: 21650 },
        { name: 'Robes of the Guardian Saint', slot: 'Chest', wowhead_id: 21663 },
        { name: 'Mantle of Wicked Revenge', slot: 'Shoulder', wowhead_id: 21665 },
        { name: 'Pauldrons of the Unrelenting', slot: 'Shoulder', wowhead_id: 21639 },
        { name: 'Silithid Carapace Chestguard', slot: 'Chest', wowhead_id: 21652 },
        { name: 'Fetish of the Sand Reaver', slot: 'Trinket', wowhead_id: 21647 },
        { name: 'Cloak of Untold Secrets', slot: 'Back', wowhead_id: 21627 },
        { name: "Hive Tunneler's Boots", slot: 'Feet', wowhead_id: 21645 },
        { name: 'Scaled Sand Reaver Leggings', slot: 'Legs', wowhead_id: 21651 },
        { name: 'Barbed Choker', slot: 'Neck', wowhead_id: 21664 },
        { name: 'Libram of Grace', slot: 'Libram', wowhead_id: 22402 },
        { name: 'Totem of Life', slot: 'Totem', wowhead_id: 22396 },
      ],
    },
    {
      name: 'Viscidus',
      items: [
        { name: 'Sharpened Silithid Femur', slot: 'Weapon', wowhead_id: 21622 },
        { name: 'Gauntlets of Kalimdor', slot: 'Hands', wowhead_id: 21624 },
        { name: 'Ring of the Qiraji Fury', slot: 'Finger', wowhead_id: 21677 },
        { name: 'Scarab Brooch', slot: 'Trinket', wowhead_id: 21625 },
        { name: 'Gauntlets of the Righteous Champion', slot: 'Hands', wowhead_id: 21623 },
        { name: 'Slime-Coated Leggings', slot: 'Legs', wowhead_id: 21626 },
        { name: 'Idol of Health', slot: 'Idol', wowhead_id: 22399 },
      ],
    },
    {
      name: 'Princess Huhuran',
      items: [
        { name: "Huhuran's Stinger", slot: 'Ranged', wowhead_id: 21616 },
        { name: 'Gloves of the Messiah', slot: 'Hands', wowhead_id: 21619 },
        { name: 'Wasphide Gauntlets', slot: 'Hands', wowhead_id: 21617 },
        { name: 'Hive Defiler Wristguards', slot: 'Wrist', wowhead_id: 21618 },
        { name: 'Cloak of the Golden Hive', slot: 'Back', wowhead_id: 21621 },
      ],
    },
    {
      name: 'Twin Emperors',
      items: [
        { name: "Royal Scepter of Vek'lor", slot: 'Off-Hand', wowhead_id: 21597 },
        { name: 'Boots of Epiphany', slot: 'Feet', wowhead_id: 21600 },
        { name: "Ring of Emperor Vek'lor", slot: 'Finger', wowhead_id: 21601 },
        { name: 'Qiraji Execution Bracers', slot: 'Wrist', wowhead_id: 21602 },
        { name: 'Royal Qiraji Belt', slot: 'Waist', wowhead_id: 21598 },
        { name: "Vek'lor's Gloves of Devastation", slot: 'Hands', wowhead_id: 21599 },
        { name: "Kalimdor's Revenge", slot: 'Two-Hand', wowhead_id: 21679 },
        { name: 'Bracelets of Royal Redemption', slot: 'Wrist', wowhead_id: 21604 },
        { name: 'Gloves of the Hidden Temple', slot: 'Hands', wowhead_id: 21605 },
        { name: 'Belt of the Fallen Emperor', slot: 'Waist', wowhead_id: 21606 },
        { name: 'Grasp of the Fallen Emperor', slot: 'Waist', wowhead_id: 21607 },
        { name: "Amulet of Vek'nilash", slot: 'Neck', wowhead_id: 21608 },
        { name: "Regenerating Belt of Vek'nilash", slot: 'Waist', wowhead_id: 21609 },
      ],
    },
    {
      name: 'Ouro',
      items: [
        { name: 'Larvae of the Great Worm', slot: 'Ranged', wowhead_id: 23557 },
        { name: 'Wormscale Blocker', slot: 'Shield', wowhead_id: 21610 },
        { name: 'Burrower Bracers', slot: 'Wrist', wowhead_id: 21611 },
        { name: "Don Rigoberto's Lost Hat", slot: 'Head', wowhead_id: 21615 },
        { name: "The Burrower's Shell", slot: 'Trinket', wowhead_id: 23558 },
        { name: 'Jom Gabbar', slot: 'Trinket', wowhead_id: 23570 },
      ],
    },
    {
      name: "C'Thun",
      items: [
        { name: 'Dark Edge of Insanity', slot: 'Two-Hand', wowhead_id: 21134 },
        { name: "Death's Sting", slot: 'Weapon', wowhead_id: 21126 },
        { name: 'Scepter of the False Prophet', slot: 'Weapon', wowhead_id: 21839 },
        { name: 'Dark Storm Gauntlets', slot: 'Hands', wowhead_id: 21585 },
        { name: 'Eyestalk Waist Cord', slot: 'Waist', wowhead_id: 22730 },
        { name: 'Grasp of the Old God', slot: 'Waist', wowhead_id: 21582 },
        { name: 'Belt of Never-Ending Agony', slot: 'Waist', wowhead_id: 21586 },
        { name: 'Gauntlets of Annihilation', slot: 'Hands', wowhead_id: 21581 },
        { name: 'Cloak of Clarity', slot: 'Back', wowhead_id: 21583 },
        { name: 'Cloak of the Devoured', slot: 'Back', wowhead_id: 22731 },
        { name: 'Ring of the Godslayer', slot: 'Finger', wowhead_id: 21596 },
        { name: "Mark of C'Thun", slot: 'Neck', wowhead_id: 22732 },
        { name: "Vanquished Tentacle of C'Thun", slot: 'Trinket', wowhead_id: 21579 },
        { name: "Eye of C'Thun", slot: 'Quest', wowhead_id: 21221 },
      ],
    },
  ],
}

export const naxxramas: Raid = {
  name: 'Naxxramas',
  tier: 'Tier 3',
  bosses: [
    {
      name: "Anub'Rekhan",
      items: [
        { name: 'Gem of Nerubis', slot: 'Off-Hand', wowhead_id: 22937 },
        { name: 'Band of Unanswered Prayers', slot: 'Finger', wowhead_id: 22939 },
        { name: 'Cryptfiend Silk Cloak', slot: 'Back', wowhead_id: 22938 },
        { name: 'Touch of Frost', slot: 'Neck', wowhead_id: 22935 },
        { name: 'Wristguards of Vengeance', slot: 'Wrist', wowhead_id: 22936 },
      ],
    },
    {
      name: 'Grand Widow Faerlina',
      items: [
        { name: "Widow's Remorse", slot: 'Weapon', wowhead_id: 22806 },
        { name: 'Malice Stone Pendant', slot: 'Neck', wowhead_id: 22943 },
        { name: "The Widow's Embrace", slot: 'Weapon', wowhead_id: 22942 },
        { name: 'Polar Shoulder Pads', slot: 'Shoulder', wowhead_id: 22941 },
        { name: 'Icebane Pauldrons', slot: 'Shoulder', wowhead_id: 22940 },
      ],
    },
    {
      name: 'Maexxna',
      items: [
        { name: 'Wraith Blade', slot: 'Weapon', wowhead_id: 22807 },
        { name: "Maexxna's Fang", slot: 'Weapon', wowhead_id: 22804 },
        { name: 'Kiss of the Spider', slot: 'Trinket', wowhead_id: 22954 },
        { name: 'Pendant of Forgotten Names', slot: 'Neck', wowhead_id: 22947 },
        { name: 'Crystal Webbed Robe', slot: 'Chest', wowhead_id: 23220 },
      ],
    },
    {
      name: 'Noth the Plaguebringer',
      items: [
        { name: 'Hatchet of Sundered Bone', slot: 'Weapon', wowhead_id: 22816 },
        { name: "Noth's Frigid Heart", slot: 'Off-Hand', wowhead_id: 23029 },
        { name: 'Hailstone Band', slot: 'Finger', wowhead_id: 23028 },
        { name: 'Band of the Inevitable', slot: 'Finger', wowhead_id: 23031 },
        { name: 'Cloak of the Scourge', slot: 'Back', wowhead_id: 23030 },
        { name: 'Libram of Light', slot: 'Libram', wowhead_id: 23006 },
        { name: 'Totem of Flowing Water', slot: 'Totem', wowhead_id: 23005 },
      ],
    },
    {
      name: 'Heigan the Unclean',
      items: [
        { name: "Preceptor's Hat", slot: 'Head', wowhead_id: 23035 },
        { name: 'Icy Scale Coif', slot: 'Head', wowhead_id: 23033 },
        { name: 'Icebane Helmet', slot: 'Head', wowhead_id: 23019 },
        { name: 'Necklace of Necropsy', slot: 'Neck', wowhead_id: 23036 },
        { name: 'Legplates of Carnage', slot: 'Legs', wowhead_id: 23068 },
      ],
    },
    {
      name: 'Loatheb',
      items: [
        { name: 'The Eye of Nerub', slot: 'Two-Hand', wowhead_id: 23039 },
        { name: 'Brimstone Staff', slot: 'Two-Hand', wowhead_id: 22800 },
        { name: "Loatheb's Reflection", slot: 'Trinket', wowhead_id: 23042 },
        { name: 'Ring of Spiritual Fervor', slot: 'Finger', wowhead_id: 23037 },
        { name: 'Band of Unnatural Forces', slot: 'Finger', wowhead_id: 23038 },
      ],
    },
    {
      name: 'Instructor Razuvious',
      items: [
        { name: 'Iblis, Blade of the Fallen Seraph', slot: 'Weapon', wowhead_id: 23014 },
        { name: 'Wand of the Whispering Dead', slot: 'Wand', wowhead_id: 23009 },
        { name: 'Signet of the Fallen Defender', slot: 'Finger', wowhead_id: 23018 },
        { name: 'Veil of Eclipse', slot: 'Back', wowhead_id: 23017 },
        { name: 'Idol of Longevity', slot: 'Idol', wowhead_id: 23004 },
      ],
    },
    {
      name: 'Gothik the Harvester',
      items: [
        { name: 'Glacial Headdress', slot: 'Head', wowhead_id: 23032 },
        { name: 'Polar Helmet', slot: 'Head', wowhead_id: 23020 },
        { name: "The Soul Harvester's Bindings", slot: 'Wrist', wowhead_id: 23021 },
        { name: "Sadist's Collar", slot: 'Neck', wowhead_id: 23023 },
        { name: 'Boots of Displacement', slot: 'Feet', wowhead_id: 23073 },
      ],
    },
    {
      name: 'Four Horsemen',
      items: [
        { name: 'Corrupted Ashbringer', slot: 'Two-Hand', wowhead_id: 22691 },
        { name: 'Maul of the Redeemed Crusader', slot: 'Two-Hand', wowhead_id: 22809 },
        { name: 'Soulstring', slot: 'Ranged', wowhead_id: 22811 },
        { name: 'Leggings of Apocalypse', slot: 'Legs', wowhead_id: 23071 },
        { name: 'Warmth of Forgiveness', slot: 'Trinket', wowhead_id: 23027 },
        { name: 'Seal of the Damned', slot: 'Finger', wowhead_id: 23025 },
      ],
    },
    {
      name: 'Patchwerk',
      items: [
        { name: 'Severance', slot: 'Two-Hand', wowhead_id: 22815 },
        { name: 'Wand of Fates', slot: 'Wand', wowhead_id: 22820 },
        { name: 'The Plague Bearer', slot: 'Shield', wowhead_id: 22818 },
        { name: 'Band of Reanimation', slot: 'Finger', wowhead_id: 22961 },
        { name: 'Cloak of Suturing', slot: 'Back', wowhead_id: 22960 },
      ],
    },
    {
      name: 'Grobbulus',
      items: [
        { name: 'Midnight Haze', slot: 'Weapon', wowhead_id: 22803 },
        { name: 'The End of Dreams', slot: 'Weapon', wowhead_id: 22988 },
        { name: 'Toxin Injector', slot: 'Ranged', wowhead_id: 22810 },
        { name: 'Glacial Mantle', slot: 'Shoulder', wowhead_id: 22968 },
        { name: 'Icy Scale Spaulders', slot: 'Shoulder', wowhead_id: 22967 },
      ],
    },
    {
      name: 'Gluth',
      items: [
        { name: 'Claymore of Unholy Might', slot: 'Two-Hand', wowhead_id: 22813 },
        { name: "Death's Bargain", slot: 'Shield', wowhead_id: 23075 },
        { name: 'Digested Hand of Power', slot: 'Off-Hand', wowhead_id: 22994 },
        { name: "Gluth's Missing Collar", slot: 'Neck', wowhead_id: 22981 },
        { name: 'Rime Covered Mantle', slot: 'Shoulder', wowhead_id: 22983 },
      ],
    },
    {
      name: 'Thaddius',
      items: [
        { name: 'Spire of Twilight', slot: 'Two-Hand', wowhead_id: 22801 },
        { name: 'The Castigator', slot: 'Weapon', wowhead_id: 22808 },
        { name: 'Eye of Diminution', slot: 'Trinket', wowhead_id: 23001 },
        { name: 'Plated Abomination Ribcage', slot: 'Chest', wowhead_id: 23000 },
        { name: 'Leggings of Polarity', slot: 'Legs', wowhead_id: 23070 },
      ],
    },
    {
      name: 'Sapphiron',
      items: [
        { name: 'Claw of the Frost Wyrm', slot: 'Weapon', wowhead_id: 23242 },
        { name: 'The Face of Death', slot: 'Shield', wowhead_id: 23043 },
        { name: 'Glyph of Deflection', slot: 'Trinket', wowhead_id: 23040 },
        { name: "Slayer's Crest", slot: 'Trinket', wowhead_id: 23041 },
        { name: 'The Restrained Essence of Sapphiron', slot: 'Trinket', wowhead_id: 23046 },
        { name: 'Eye of the Dead', slot: 'Trinket', wowhead_id: 23047 },
        { name: "Sapphiron's Right Eye", slot: 'Off-Hand', wowhead_id: 23048 },
        { name: "Sapphiron's Left Eye", slot: 'Off-Hand', wowhead_id: 23049 },
        { name: 'Shroud of Dominion', slot: 'Back', wowhead_id: 23045 },
        { name: 'Cloak of the Necropolis', slot: 'Back', wowhead_id: 23050 },
      ],
    },
    {
      name: "Kel'Thuzad",
      items: [
        { name: 'Soulseeker', slot: 'Two-Hand', wowhead_id: 22799 },
        { name: 'Might of Menethil', slot: 'Two-Hand', wowhead_id: 22798 },
        { name: 'Gressil, Dawn of Ruin', slot: 'Weapon', wowhead_id: 23054 },
        { name: 'The Hungering Cold', slot: 'Weapon', wowhead_id: 23577 },
        { name: 'Kingsfall', slot: 'Weapon', wowhead_id: 22802 },
        { name: 'Hammer of the Twisting Nether', slot: 'Weapon', wowhead_id: 23056 },
        { name: 'Doomfinger', slot: 'Wand', wowhead_id: 22821 },
        { name: 'Nerubian Slavemaker', slot: 'Ranged', wowhead_id: 22812 },
        { name: 'Shield of Condemnation', slot: 'Shield', wowhead_id: 22819 },
        // Tier 3 Rings - ALL Classes
        { name: 'Ring of the Dreadnaught', slot: 'Finger', wowhead_id: 23059 },
        { name: 'Bonescythe Ring', slot: 'Finger', wowhead_id: 23060 },
        { name: 'Ring of Faith', slot: 'Finger', wowhead_id: 23061 },
        { name: 'Frostfire Ring', slot: 'Finger', wowhead_id: 23062 },
        { name: 'Plagueheart Ring', slot: 'Finger', wowhead_id: 23063 },
        { name: 'Ring of the Dreamwalker', slot: 'Finger', wowhead_id: 23064 },
        { name: 'Ring of the Earthshatterer', slot: 'Finger', wowhead_id: 23065 },
        { name: 'Ring of Redemption', slot: 'Finger', wowhead_id: 23066 },
        { name: 'Ring of the Cryptstalker', slot: 'Finger', wowhead_id: 23067 },
        // Necklaces
        { name: "Stormrage's Talisman of Seething", slot: 'Neck', wowhead_id: 23053 },
        { name: 'Gem of Trapped Innocents', slot: 'Neck', wowhead_id: 23057 },
        // Quest Item
        { name: "The Phylactery of Kel'Thuzad", slot: 'Quest', wowhead_id: 22520 },
      ],
    },
  ],
}

// Export all raids as a single array
export const classicRaids: Raid[] = [
  moltenCore,
  blackwingLair,
  onyxiasLair,
  zulGurub,
  ruinsOfAhnQiraj,
  templeOfAhnQiraj,
  naxxramas,
]
