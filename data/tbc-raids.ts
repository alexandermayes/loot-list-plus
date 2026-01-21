/**
 * TBC (The Burning Crusade) Raid Loot Tables
 * Auto-generated from wow-classic-items package
 * Generated: 2026-01-21
 *
 * This file contains epic quality items from TBC raids.
 * Source: wow-classic-items npm package
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
// KARAZHAN - Tier 4
// ============================================================================

export const karazhan: Raid = {
  name: 'Karazhan',
  tier: 'Tier 4',
  bosses: [
    {
      name: 'Maiden of Virtue',
      items: [
        { name: 'Bands of Indwelling', slot: 'Wrist', wowhead_id: 28511 },
        { name: 'Bracers of Justice', slot: 'Wrist', wowhead_id: 28512 },
        { name: 'Bracers of Maliciousness', slot: 'Wrist', wowhead_id: 28514 },
        { name: 'Bands of Nefarious Deeds', slot: 'Wrist', wowhead_id: 28515 },
        { name: 'Boots of Foretelling', slot: 'Feet', wowhead_id: 28517 },
        { name: 'Barbed Choker of Discipline', slot: 'Neck', wowhead_id: 28516 },
        { name: 'Iron Gauntlets of the Maiden', slot: 'Hands', wowhead_id: 28518 },
        { name: 'Gloves of Quickening', slot: 'Hands', wowhead_id: 28519 },
        { name: 'Gloves of Centering', slot: 'Hands', wowhead_id: 28520 },
        { name: 'Mitts of the Treemender', slot: 'Hands', wowhead_id: 28521 },
        { name: 'Totem of Healing Rains', slot: 'Relic', wowhead_id: 28523 },
        { name: 'Shard of the Virtuous', slot: 'Main Hand', wowhead_id: 28522 },
      ],
    },
    {
      name: 'Moroes',
      items: [
        { name: 'Emerald Ripper', slot: 'One-Hand', wowhead_id: 28524 },
        { name: 'Royal Cloak of Arathi Kings', slot: 'Back', wowhead_id: 28529 },
        { name: 'Signet of Unshakable Faith', slot: 'Held In Off-hand', wowhead_id: 28525 },
        { name: 'Moroes\' Lucky Pocket Watch', slot: 'Trinket', wowhead_id: 28528 },
        { name: 'Brooch of Unquenchable Fury', slot: 'Neck', wowhead_id: 28530 },
        { name: 'Edgewalker Longboots', slot: 'Feet', wowhead_id: 28545 },
        { name: 'Nethershard Girdle', slot: 'Waist', wowhead_id: 28565 },
        { name: 'Crimson Girdle of the Indomitable', slot: 'Waist', wowhead_id: 28566 },
        { name: 'Belt of Gale Force', slot: 'Waist', wowhead_id: 28567 },
        { name: 'Idol of the Avian Heart', slot: 'Relic', wowhead_id: 28568 },
        { name: 'Boots of Valiance', slot: 'Feet', wowhead_id: 28569 },
        { name: 'Shadow-Cloak of Dalaran', slot: 'Back', wowhead_id: 28570 },
      ],
    },
    {
      name: 'Julianne',
      items: [
        { name: 'Blade of the Unrequited', slot: 'One-Hand', wowhead_id: 28572 },
        { name: 'Despair', slot: 'Two-Hand', wowhead_id: 28573 },
        { name: 'Romulo\'s Poison Vial', slot: 'Trinket', wowhead_id: 28579 },
        { name: 'Masquerade Gown', slot: 'Chest', wowhead_id: 28578 },
      ],
    },
    {
      name: 'The Big Bad Wolf',
      items: [
        { name: 'Red Riding Hood\'s Cloak', slot: 'Back', wowhead_id: 28582 },
        { name: 'Big Bad Wolf\'s Head', slot: 'Head', wowhead_id: 28583 },
        { name: 'Wolfslayer Sniper Rifle', slot: 'Ranged', wowhead_id: 28581 },
        { name: 'Big Bad Wolf\'s Paw', slot: 'Main Hand', wowhead_id: 28584 },
      ],
    },
    {
      name: 'The Crone',
      items: [
        { name: 'Ruby Slippers', slot: 'Feet', wowhead_id: 28585 },
        { name: 'Wicked Witch\'s Hat', slot: 'Head', wowhead_id: 28586 },
        { name: 'Blue Diamond Witchwand', slot: 'Ranged', wowhead_id: 28588 },
        { name: 'Legacy', slot: 'Two-Hand', wowhead_id: 28587 },
      ],
    },
    {
      name: 'Nightbane',
      items: [
        { name: 'Scaled Breastplate of Carnage', slot: 'Chest', wowhead_id: 28599 },
        { name: 'Panzar\'Thar Breastplate', slot: 'Chest', wowhead_id: 28597 },
        { name: 'Chestguard of the Conniver', slot: 'Chest', wowhead_id: 28601 },
        { name: 'Stonebough Jerkin', slot: 'Chest', wowhead_id: 28600 },
        { name: 'Robe of the Elder Scribes', slot: 'Chest', wowhead_id: 28602 },
        { name: 'Talisman of Nightbane', slot: 'Held In Off-hand', wowhead_id: 28603 },
        { name: 'Nightstaff of the Everliving', slot: 'Two-Hand', wowhead_id: 28604 },
        { name: 'Shield of Impenetrable Darkness', slot: 'Off Hand', wowhead_id: 28606 },
        { name: 'Ironstriders of Urgency', slot: 'Feet', wowhead_id: 28608 },
        { name: 'Emberspur Talisman', slot: 'Neck', wowhead_id: 28609 },
        { name: 'Dragonheart Flameshield', slot: 'Off Hand', wowhead_id: 28611 },
        { name: 'Ferocious Swift-Kickers', slot: 'Feet', wowhead_id: 28610 },
      ],
    },
    {
      name: 'The Curator',
      items: [
        { name: 'Pauldrons of the Solace-Giver', slot: 'Shoulder', wowhead_id: 28612 },
        { name: 'Wrynn Dynasty Greaves', slot: 'Legs', wowhead_id: 28621 },
        { name: 'Staff of Infinite Mysteries', slot: 'Two-Hand', wowhead_id: 28633 },
        { name: 'Dragon-Quake Shoulderguards', slot: 'Shoulder', wowhead_id: 28631 },
        { name: 'Forest Wind Shoulderpads', slot: 'Shoulder', wowhead_id: 28647 },
        { name: 'Garona\'s Signet Ring', slot: 'Finger', wowhead_id: 28649 },
      ],
    },
    {
      name: 'Terestian Illhoof',
      items: [
        { name: 'Terestian\'s Stranglestaff', slot: 'Two-Hand', wowhead_id: 28658 },
        { name: 'Cincture of Will', slot: 'Waist', wowhead_id: 28652 },
        { name: 'Shadowvine Cloak of Infusion', slot: 'Back', wowhead_id: 28653 },
        { name: 'Malefic Girdle', slot: 'Waist', wowhead_id: 28654 },
        { name: 'Cord of Nature\'s Sustenance', slot: 'Waist', wowhead_id: 28655 },
        { name: 'Fool\'s Bane', slot: 'One-Hand', wowhead_id: 28657 },
        { name: 'Girdle of the Prowler', slot: 'Waist', wowhead_id: 28656 },
        { name: 'Gilded Thorium Cloak', slot: 'Back', wowhead_id: 28660 },
        { name: 'Mender\'s Heart-Ring', slot: 'Finger', wowhead_id: 28661 },
        { name: 'Breastplate of the Lightbinder', slot: 'Chest', wowhead_id: 28662 },
        { name: 'The Lightning Capacitor', slot: 'Trinket', wowhead_id: 28785 },
      ],
    },
    {
      name: 'Shade of Aran',
      items: [
        { name: 'Boots of the Incorrupt', slot: 'Feet', wowhead_id: 28663 },
        { name: 'Pauldrons of the Justice-Seeker', slot: 'Shoulder', wowhead_id: 28666 },
        { name: 'Tirisfal Wand of Ascendancy', slot: 'Ranged', wowhead_id: 28673 },
        { name: 'Boots of the Infernal Coven', slot: 'Feet', wowhead_id: 28670 },
        { name: 'Rapscallion Boots', slot: 'Feet', wowhead_id: 28669 },
        { name: 'Drape of the Dark Reavers', slot: 'Back', wowhead_id: 28672 },
        { name: 'Steelspine Faceguard', slot: 'Head', wowhead_id: 28671 },
        { name: 'Saberclaw Talisman', slot: 'Neck', wowhead_id: 28674 },
        { name: 'Shermanar Great-Ring', slot: 'Finger', wowhead_id: 28675 },
        { name: 'Pendant of the Violet Eye', slot: 'Trinket', wowhead_id: 28727 },
        { name: 'Mantle of the Mind Flayer', slot: 'Shoulder', wowhead_id: 28726 },
        { name: 'Aran\'s Soothing Sapphire', slot: 'Held In Off-hand', wowhead_id: 28728 },
      ],
    },
    {
      name: 'Netherspite',
      items: [
        { name: 'Mithril Band of the Unscarred', slot: 'Finger', wowhead_id: 28730 },
        { name: 'Shining Chain of the Afterworld', slot: 'Neck', wowhead_id: 28731 },
        { name: 'Cowl of Defiance', slot: 'Head', wowhead_id: 28732 },
        { name: 'Spiteblade', slot: 'One-Hand', wowhead_id: 28729 },
        { name: 'Earthblood Chestguard', slot: 'Chest', wowhead_id: 28735 },
        { name: 'Girdle of Truth', slot: 'Waist', wowhead_id: 28733 },
        { name: 'Jewel of Infinite Possibilities', slot: 'Held In Off-hand', wowhead_id: 28734 },
        { name: 'Skulker\'s Greaves', slot: 'Legs', wowhead_id: 28741 },
        { name: 'Rip-Flayer Leggings', slot: 'Legs', wowhead_id: 28740 },
        { name: 'Mantle of Abrahmis', slot: 'Shoulder', wowhead_id: 28743 },
        { name: 'Pantaloons of Repentance', slot: 'Legs', wowhead_id: 28742 },
        { name: 'Uni-Mind Headdress', slot: 'Head', wowhead_id: 28744 },
      ],
    },
    {
      name: 'Echo of Medivh',
      items: [
        { name: 'Mithril Chain of Heroism', slot: 'Neck', wowhead_id: 28745 },
        { name: 'Legplates of the Innocent', slot: 'Legs', wowhead_id: 28748 },
      ],
    },
    {
      name: 'Prince Malchezaar',
      items: [
        { name: 'Ring of a Thousand Marks', slot: 'Finger', wowhead_id: 28757 },
        { name: 'Adornment of Stolen Souls', slot: 'Neck', wowhead_id: 28762 },
        { name: 'Farstrider Wildercloak', slot: 'Back', wowhead_id: 28764 },
        { name: 'Jade Ring of the Everliving', slot: 'Finger', wowhead_id: 28763 },
        { name: 'Stainless Cloak of the Pure Hearted', slot: 'Back', wowhead_id: 28765 },
        { name: 'Ruby Drape of the Mysticant', slot: 'Back', wowhead_id: 28766 },
        { name: 'Nathrezim Mindblade', slot: 'Main Hand', wowhead_id: 28770 },
        { name: 'Light\'s Justice', slot: 'Main Hand', wowhead_id: 28771 },
        { name: 'Malchazeen', slot: 'One-Hand', wowhead_id: 28768 },
        { name: 'The Decapitator', slot: 'One-Hand', wowhead_id: 28767 },
        { name: 'Sunfury Bow of the Phoenix', slot: 'Ranged', wowhead_id: 28772 },
        { name: 'Gorehowl', slot: 'Two-Hand', wowhead_id: 28773 },
      ],
    },
    {
      name: 'Hyakiss the Lurker',
      items: [
        { name: 'Lurker\'s Cord', slot: 'Waist', wowhead_id: 30675 },
        { name: 'Lurker\'s Grasp', slot: 'Waist', wowhead_id: 30676 },
        { name: 'Lurker\'s Belt', slot: 'Waist', wowhead_id: 30677 },
        { name: 'Lurker\'s Girdle', slot: 'Waist', wowhead_id: 30678 },
      ],
    },
    {
      name: 'Shadikith the Glider',
      items: [
        { name: 'Glider\'s Foot-Wraps', slot: 'Feet', wowhead_id: 30680 },
        { name: 'Glider\'s Boots', slot: 'Feet', wowhead_id: 30681 },
        { name: 'Glider\'s Sabatons', slot: 'Feet', wowhead_id: 30682 },
        { name: 'Glider\'s Greaves', slot: 'Feet', wowhead_id: 30683 },
      ],
    },
    {
      name: 'Rokad the Ravager',
      items: [
        { name: 'Ravager\'s Bracers', slot: 'Wrist', wowhead_id: 30687 },
        { name: 'Ravager\'s Bands', slot: 'Wrist', wowhead_id: 30686 },
        { name: 'Ravager\'s Cuffs', slot: 'Wrist', wowhead_id: 30684 },
        { name: 'Ravager\'s Wrist-Wraps', slot: 'Wrist', wowhead_id: 30685 },
      ],
    },
    {
      name: 'Prince Tenris Mirkblood',
      items: [
        { name: 'Arcanite Ripper', slot: 'Two-Hand', wowhead_id: 39769 },
      ],
    }
  ],
}

// ============================================================================
// GRUUL\'S LAIR - Tier 4
// ============================================================================

export const gruulslair: Raid = {
  name: 'Gruul\'s Lair',
  tier: 'Tier 4',
  bosses: [
    {
      name: 'Gruul the Dragonkiller',
      items: [
        { name: 'Axe of the Gronn Lords', slot: 'Two-Hand', wowhead_id: 28794 },
        { name: 'Bloodmaw Magus-Blade', slot: 'Main Hand', wowhead_id: 28802 },
        { name: 'Collar of Cho\'gall', slot: 'Head', wowhead_id: 28804 },
        { name: 'Cowl of Nature\'s Breath', slot: 'Head', wowhead_id: 28803 },
        { name: 'Windshear Boots', slot: 'Feet', wowhead_id: 28810 },
        { name: 'Teeth of Gruul', slot: 'Neck', wowhead_id: 28822 },
        { name: 'Gauntlets of Martial Perfection', slot: 'Hands', wowhead_id: 28824 },
        { name: 'Eye of Gruul', slot: 'Trinket', wowhead_id: 28823 },
        { name: 'Aldori Legacy Defender', slot: 'Off Hand', wowhead_id: 28825 },
        { name: 'Gauntlets of the Dragonslayer', slot: 'Hands', wowhead_id: 28827 },
        { name: 'Gronn-Stitched Girdle', slot: 'Waist', wowhead_id: 28828 },
        { name: 'Dragonspine Trophy', slot: 'Trinket', wowhead_id: 28830 },
      ],
    },
    {
      name: 'High King Maulgar',
      items: [
        { name: 'Bladespire Warbands', slot: 'Wrist', wowhead_id: 28795 },
        { name: 'Malefic Mask of the Shadows', slot: 'Head', wowhead_id: 28796 },
        { name: 'Brute Cloak of the Ogre-Magi', slot: 'Back', wowhead_id: 28797 },
        { name: 'Belt of Divine Inspiration', slot: 'Waist', wowhead_id: 28799 },
        { name: 'Hammer of the Naaru', slot: 'Two-Hand', wowhead_id: 28800 },
        { name: 'Maulgar\'s Warhelm', slot: 'Head', wowhead_id: 28801 },
      ],
    }
  ],
}

// ============================================================================
// MAGTHERIDON\'S LAIR - Tier 4
// ============================================================================

export const magtheridonslair: Raid = {
  name: 'Magtheridon\'s Lair',
  tier: 'Tier 4',
  bosses: [
    {
      name: 'Magtheridon',
      items: [
        { name: 'Glaive of the Pit', slot: 'Two-Hand', wowhead_id: 28774 },
        { name: 'Thundering Greathelm', slot: 'Head', wowhead_id: 28775 },
        { name: 'Cloak of the Pit Stalker', slot: 'Back', wowhead_id: 28777 },
        { name: 'Liar\'s Tongue Gloves', slot: 'Hands', wowhead_id: 28776 },
        { name: 'Girdle of the Endless Pit', slot: 'Waist', wowhead_id: 28779 },
        { name: 'Karaborian Talisman', slot: 'Held In Off-hand', wowhead_id: 28781 },
        { name: 'Soul-Eater\'s Handwraps', slot: 'Hands', wowhead_id: 28780 },
        { name: 'Crystalheart Pulse-Staff', slot: 'Two-Hand', wowhead_id: 28782 },
        { name: 'Terror Pit Girdle', slot: 'Waist', wowhead_id: 28778 },
        { name: 'Eredar Wand of Obliteration', slot: 'Ranged', wowhead_id: 28783 },
        { name: 'Eye of Magtheridon', slot: 'Trinket', wowhead_id: 28789 },
        { name: 'Aegis of the Vindicator', slot: 'Off Hand', wowhead_id: 29458 },
      ],
    }
  ],
}

// ============================================================================
// SERPENTSHRINE CAVERN - Tier 5
// ============================================================================

export const serpentshrinecavern: Raid = {
  name: 'Serpentshrine Cavern',
  tier: 'Tier 5',
  bosses: [
    {
      name: 'Morogrim Tidewalker',
      items: [
        { name: 'Pendant of the Lost Ages', slot: 'Neck', wowhead_id: 30008 },
        { name: 'Girdle of the Tidal Call', slot: 'Waist', wowhead_id: 30068 },
        { name: 'Illidari Shoulderpads', slot: 'Shoulder', wowhead_id: 30079 },
        { name: 'Gnarled Chestpiece of the Ancients', slot: 'Chest', wowhead_id: 30075 },
        { name: 'Luminescent Rod of the Naaru', slot: 'Ranged', wowhead_id: 30080 },
        { name: 'Warboots of Obliteration', slot: 'Feet', wowhead_id: 30081 },
        { name: 'Talon of Azshara', slot: 'One-Hand', wowhead_id: 30082 },
        { name: 'Pauldrons of the Argent Sentinel', slot: 'Shoulder', wowhead_id: 30084 },
        { name: 'Ring of Sundered Souls', slot: 'Finger', wowhead_id: 30083 },
        { name: 'Mantle of the Tireless Tracker', slot: 'Shoulder', wowhead_id: 30085 },
        { name: 'Serpent-Coil Braid', slot: 'Trinket', wowhead_id: 30720 },
        { name: 'Band of the Vigilant', slot: 'Finger', wowhead_id: 33058 },
        { name: 'Razor-Scale Battlecloak', slot: 'Back', wowhead_id: 30098 },
      ],
    },
    {
      name: 'Hydross the Unstable',
      items: [
        { name: 'Idol of the Crescent Goddess', slot: 'Relic', wowhead_id: 30051 },
        { name: 'Blackfathom Warbands', slot: 'Wrist', wowhead_id: 30047 },
        { name: 'Brighthelm of Justice', slot: 'Head', wowhead_id: 30048 },
        { name: 'Ranger-General\'s Chestguard', slot: 'Chest', wowhead_id: 30054 },
        { name: 'Fathomstone', slot: 'Held In Off-hand', wowhead_id: 30049 },
        { name: 'Ring of Lethality', slot: 'Finger', wowhead_id: 30052 },
        { name: 'Boots of the Shifting Nightmare', slot: 'Feet', wowhead_id: 30050 },
        { name: 'Robe of Hateful Echoes', slot: 'Chest', wowhead_id: 30056 },
        { name: 'Pauldrons of the Wardancer', slot: 'Shoulder', wowhead_id: 30053 },
        { name: 'Shoulderpads of the Stranger', slot: 'Shoulder', wowhead_id: 30055 },
        { name: 'Scarab of Displacement', slot: 'Trinket', wowhead_id: 30629 },
        { name: 'Living Root of the Wildheart', slot: 'Trinket', wowhead_id: 30664 },
        { name: 'Wraps of Purification', slot: 'Wrist', wowhead_id: 32516 },
        { name: 'Band of Vile Aggression', slot: 'Finger', wowhead_id: 33055 },
      ],
    },
    {
      name: 'The Lurker Below',
      items: [
        { name: 'Bracers of Eradication', slot: 'Wrist', wowhead_id: 30057 },
        { name: 'Mallet of the Tides', slot: 'One-Hand', wowhead_id: 30058 },
        { name: 'Choker of Animalistic Fury', slot: 'Neck', wowhead_id: 30059 },
        { name: 'Boots of Effortless Striking', slot: 'Feet', wowhead_id: 30060 },
        { name: 'Ancestral Ring of Conquest', slot: 'Finger', wowhead_id: 30061 },
        { name: 'Grove-Bands of Remulos', slot: 'Wrist', wowhead_id: 30062 },
        { name: 'Cord of Screaming Terrors', slot: 'Waist', wowhead_id: 30064 },
        { name: 'Libram of Absolute Truth', slot: 'Relic', wowhead_id: 30063 },
        { name: 'Glowing Breastplate of Truth', slot: 'Chest', wowhead_id: 30065 },
        { name: 'Tempest-Strider Boots', slot: 'Feet', wowhead_id: 30066 },
        { name: 'Velvet Boots of the Guardian', slot: 'Feet', wowhead_id: 30067 },
        { name: 'Earring of Soulful Meditation', slot: 'Trinket', wowhead_id: 30665 },
        { name: 'The Seal of Danzalar', slot: 'Finger', wowhead_id: 33054 },
      ],
    },
    {
      name: 'Leotheras the Blind',
      items: [
        { name: 'Girdle of the Invulnerable', slot: 'Waist', wowhead_id: 30096 },
        { name: 'True-Aim Stalker Bands', slot: 'Wrist', wowhead_id: 30091 },
        { name: 'Orca-Hide Boots', slot: 'Feet', wowhead_id: 30092 },
        { name: 'Fang of the Leviathan', slot: 'Main Hand', wowhead_id: 30095 },
        { name: 'Coral-Barbed Shoulderpads', slot: 'Shoulder', wowhead_id: 30097 },
        { name: 'Tsunami Talisman', slot: 'Trinket', wowhead_id: 30627 },
      ],
    },
    {
      name: 'Fathom-Lord Karathress',
      items: [
        { name: 'World Breaker', slot: 'Two-Hand', wowhead_id: 30090 },
        { name: 'Soul-Strider Boots', slot: 'Feet', wowhead_id: 30100 },
        { name: 'Frayed Tether of the Drowned', slot: 'Neck', wowhead_id: 30099 },
        { name: 'Bloodsea Brigand\'s Vest', slot: 'Chest', wowhead_id: 30101 },
        { name: 'Sextant of Unstable Currents', slot: 'Trinket', wowhead_id: 30626 },
        { name: 'Fathom-Brooch of the Tidewalker', slot: 'Trinket', wowhead_id: 30663 },
      ],
    },
    {
      name: 'Lady Vashj',
      items: [
        { name: 'Krakken-Heart Breastplate', slot: 'Chest', wowhead_id: 30102 },
        { name: 'Cobra-Lash Boots', slot: 'Feet', wowhead_id: 30104 },
        { name: 'Fang of Vashj', slot: 'One-Hand', wowhead_id: 30103 },
        { name: 'Serpent Spine Longbow', slot: 'Ranged', wowhead_id: 30105 },
        { name: 'Belt of One-Hundred Deaths', slot: 'Waist', wowhead_id: 30106 },
        { name: 'Ring of Endless Coils', slot: 'Finger', wowhead_id: 30109 },
        { name: 'Vestments of the Sea-Witch', slot: 'Chest', wowhead_id: 30107 },
        { name: 'Lightfathom Scepter', slot: 'Main Hand', wowhead_id: 30108 },
        { name: 'Coral Band of the Revived', slot: 'Finger', wowhead_id: 30110 },
        { name: 'Runetotem\'s Mantle', slot: 'Shoulder', wowhead_id: 30111 },
        { name: 'Glorious Gauntlets of Crestfall', slot: 'Hands', wowhead_id: 30112 },
        { name: 'Prism of Inner Calm', slot: 'Trinket', wowhead_id: 30621 },
      ],
    }
  ],
}

// ============================================================================
// TEMPEST KEEP - Tier 5
// ============================================================================

export const tempestkeep: Raid = {
  name: 'Tempest Keep',
  tier: 'Tier 5',
  bosses: [
    {
      name: 'Al\'ar',
      items: [
        { name: 'Mindstorm Wristbands', slot: 'Wrist', wowhead_id: 29918 },
        { name: 'Fire Crest Breastplate', slot: 'Chest', wowhead_id: 29921 },
        { name: 'Phoenix-Ring of Rebirth', slot: 'Finger', wowhead_id: 29920 },
        { name: 'Talisman of the Sun King', slot: 'Held In Off-hand', wowhead_id: 29923 },
        { name: 'Band of Al\'ar', slot: 'Finger', wowhead_id: 29922 },
        { name: 'Phoenix-Wing Cloak', slot: 'Back', wowhead_id: 29925 },
        { name: 'Netherbane', slot: 'One-Hand', wowhead_id: 29924 },
        { name: 'Gloves of the Searing Grip', slot: 'Hands', wowhead_id: 29947 },
        { name: 'Claw of the Phoenix', slot: 'Off Hand', wowhead_id: 29948 },
        { name: 'Arcanite Steam-Pistol', slot: 'Ranged', wowhead_id: 29949 },
        { name: 'Tome of Fiery Redemption', slot: 'Trinket', wowhead_id: 30447 },
        { name: 'Talon of Al\'ar', slot: 'Trinket', wowhead_id: 30448 },
        { name: 'Talon of the Phoenix', slot: 'Main Hand', wowhead_id: 32944 },
      ],
    },
    {
      name: 'High Astromancer Solarian',
      items: [
        { name: 'Greaves of the Bloodwarder', slot: 'Legs', wowhead_id: 29950 },
        { name: 'Star-Strider Boots', slot: 'Feet', wowhead_id: 29951 },
        { name: 'Heartrazor', slot: 'One-Hand', wowhead_id: 29962 },
        { name: 'Girdle of the Righteous Path', slot: 'Waist', wowhead_id: 29965 },
        { name: 'Vambraces of Ending', slot: 'Wrist', wowhead_id: 29966 },
        { name: 'Trousers of the Astromancer', slot: 'Legs', wowhead_id: 29972 },
        { name: 'Worldstorm Gauntlets', slot: 'Hands', wowhead_id: 29976 },
        { name: 'Star-Soul Breeches', slot: 'Legs', wowhead_id: 29977 },
        { name: 'Ethereum Life-Staff', slot: 'Two-Hand', wowhead_id: 29981 },
        { name: 'Wand of the Forgotten Star', slot: 'Ranged', wowhead_id: 29982 },
        { name: 'Solarian\'s Sapphire', slot: 'Trinket', wowhead_id: 30446 },
        { name: 'Void Star Talisman', slot: 'Trinket', wowhead_id: 30449 },
        { name: 'Boots of the Resilient', slot: 'Feet', wowhead_id: 32267 },
      ],
    },
    {
      name: 'Void Reaver',
      items: [
        { name: 'Fel-Steel Warhelm', slot: 'Head', wowhead_id: 29983 },
        { name: 'Girdle of Zaetar', slot: 'Waist', wowhead_id: 29984 },
        { name: 'Void Reaver Greaves', slot: 'Legs', wowhead_id: 29985 },
        { name: 'Cowl of the Grand Engineer', slot: 'Head', wowhead_id: 29986 },
        { name: 'Warp-Spring Coil', slot: 'Trinket', wowhead_id: 30450 },
        { name: 'Fel Reaver\'s Piston', slot: 'Trinket', wowhead_id: 30619 },
        { name: 'Wristguards of Determination', slot: 'Wrist', wowhead_id: 32515 },
      ],
    },
    {
      name: 'Priestess Delrissa',
      items: [
        { name: 'Shard of Contempt', slot: 'Trinket', wowhead_id: 34472 },
        { name: 'Timbal\'s Focusing Crystal', slot: 'Trinket', wowhead_id: 34470 },
        { name: 'Commendation of Kael\'thas', slot: 'Trinket', wowhead_id: 34473 },
        { name: 'Vial of the Sunwell', slot: 'Trinket', wowhead_id: 34471 },
      ],
    },
    {
      name: 'Selin Fireheart',
      items: [
        { name: 'Shoulderplates of Everlasting Pain', slot: 'Shoulder', wowhead_id: 34601 },
        { name: 'Eversong Cuffs', slot: 'Wrist', wowhead_id: 34602 },
        { name: 'Jaded Crystal Dagger', slot: 'Main Hand', wowhead_id: 34604 },
      ],
    },
    {
      name: 'Vexallus',
      items: [
        { name: 'Edge of Oppression', slot: 'One-Hand', wowhead_id: 34606 },
        { name: 'Fel-tinged Mantle', slot: 'Shoulder', wowhead_id: 34607 },
        { name: 'Breastplate of Fierce Survival', slot: 'Chest', wowhead_id: 34605 },
        { name: 'Rod of the Blazing Light', slot: 'Two-Hand', wowhead_id: 34608 },
      ],
    },
    {
      name: 'Kael\'thas Sunstrider',
      items: [
        { name: 'Quickening Blade of the Prince', slot: 'One-Hand', wowhead_id: 34609 },
        { name: 'Scarlet Sin\'dorei Robes', slot: 'Chest', wowhead_id: 34610 },
        { name: 'Greaves of the Penitent Knight', slot: 'Feet', wowhead_id: 34612 },
        { name: 'Cudgel of Consecration', slot: 'Main Hand', wowhead_id: 34611 },
        { name: 'Shoulderpads of the Silvermoon Retainer', slot: 'Shoulder', wowhead_id: 34613 },
        { name: 'Netherforce Chestplate', slot: 'Chest', wowhead_id: 34615 },
        { name: 'Breeching Comet', slot: 'One-Hand', wowhead_id: 34616 },
        { name: 'Tunic of the Ranger Lord', slot: 'Chest', wowhead_id: 34614 },
        { name: 'Kharmaa\'s Ring of Fate', slot: 'Finger', wowhead_id: 34625 },
        { name: 'Hauberk of the War Bringer', slot: 'Chest', wowhead_id: 34799 },
        { name: 'Gloves of Arcane Acuity', slot: 'Hands', wowhead_id: 34808 },
        { name: 'Sunstrider Warboots', slot: 'Feet', wowhead_id: 34807 },
        { name: 'Sunrage Treads', slot: 'Feet', wowhead_id: 34809 },
        { name: 'Cloak of Blade Turning', slot: 'Back', wowhead_id: 34810 },
      ],
    }
  ],
}

// ============================================================================
// MOUNT HYJAL - Tier 6
// ============================================================================

export const mounthyjal: Raid = {
  name: 'Mount Hyjal',
  tier: 'Tier 6',
  bosses: [
    {
      name: 'Rage Winterchill',
      items: [
        { name: 'Furious Shackles', slot: 'Wrist', wowhead_id: 30861 },
        { name: 'Blessed Adamantite Bracers', slot: 'Wrist', wowhead_id: 30862 },
        { name: 'Deadly Cuffs', slot: 'Wrist', wowhead_id: 30863 },
        { name: 'Blood-stained Pauldrons', slot: 'Shoulder', wowhead_id: 30866 },
        { name: 'Bracers of the Pathfinder', slot: 'Wrist', wowhead_id: 30864 },
        { name: 'Tracker\'s Blade', slot: 'One-Hand', wowhead_id: 30865 },
        { name: 'Cuffs of Devastation', slot: 'Wrist', wowhead_id: 30870 },
        { name: 'Rejuvenating Bracers', slot: 'Wrist', wowhead_id: 30868 },
        { name: 'Howling Wind Bracers', slot: 'Wrist', wowhead_id: 30869 },
        { name: 'Bracers of Martyrdom', slot: 'Wrist', wowhead_id: 30871 },
        { name: 'Chronicle of Dark Secrets', slot: 'Held In Off-hand', wowhead_id: 30872 },
        { name: 'Stillwater Boots', slot: 'Feet', wowhead_id: 30873 },
      ],
    },
    {
      name: 'Anetheron',
      items: [
        { name: 'The Unbreakable Will', slot: 'One-Hand', wowhead_id: 30874 },
        { name: 'Glimmering Steel Mantle', slot: 'Shoulder', wowhead_id: 30878 },
        { name: 'Quickstrider Moccasins', slot: 'Feet', wowhead_id: 30880 },
        { name: 'Don Alejandro\'s Money Belt', slot: 'Waist', wowhead_id: 30879 },
        { name: 'Blade of Infamy', slot: 'One-Hand', wowhead_id: 30881 },
        { name: 'Bastion of Light', slot: 'Off Hand', wowhead_id: 30882 },
        { name: 'Pillar of Ferocity', slot: 'Two-Hand', wowhead_id: 30883 },
        { name: 'Enchanted Leather Sandals', slot: 'Feet', wowhead_id: 30886 },
        { name: 'Hatefury Mantle', slot: 'Shoulder', wowhead_id: 30884 },
        { name: 'Archbishop\'s Slippers', slot: 'Feet', wowhead_id: 30885 },
        { name: 'Golden Links of Restoration', slot: 'Chest', wowhead_id: 30887 },
        { name: 'Anetheron\'s Noose', slot: 'Waist', wowhead_id: 30888 },
      ],
    },
    {
      name: 'Kaz\'rogal',
      items: [
        { name: 'Beast-tamer\'s Shoulders', slot: 'Shoulder', wowhead_id: 30892 },
        { name: 'Black Featherlight Boots', slot: 'Feet', wowhead_id: 30891 },
        { name: 'Kaz\'rogal\'s Hardened Heart', slot: 'Off Hand', wowhead_id: 30889 },
        { name: 'Angelista\'s Sash', slot: 'Waist', wowhead_id: 30895 },
        { name: 'Blue Suede Shoes', slot: 'Feet', wowhead_id: 30894 },
        { name: 'Sun-touched Chain Leggings', slot: 'Legs', wowhead_id: 30893 },
        { name: 'Belt of the Crescent Moon', slot: 'Waist', wowhead_id: 30914 },
        { name: 'Belt of Seething Fury', slot: 'Waist', wowhead_id: 30915 },
        { name: 'Razorfury Mantle', slot: 'Shoulder', wowhead_id: 30917 },
        { name: 'Leggings of Channeled Elements', slot: 'Legs', wowhead_id: 30916 },
        { name: 'Hammer of Atonement', slot: 'Main Hand', wowhead_id: 30918 },
        { name: 'Valestalker Girdle', slot: 'Waist', wowhead_id: 30919 },
      ],
    },
    {
      name: 'Azgalor',
      items: [
        { name: 'Glory of the Defender', slot: 'Chest', wowhead_id: 30896 },
        { name: 'Shady Dealer\'s Pantaloons', slot: 'Legs', wowhead_id: 30898 },
        { name: 'Girdle of Hope', slot: 'Waist', wowhead_id: 30897 },
        { name: 'Bow-stitched Leggings', slot: 'Legs', wowhead_id: 30900 },
        { name: 'Don Rodrigo\'s Poncho', slot: 'Chest', wowhead_id: 30899 },
        { name: 'Boundless Agony', slot: 'One-Hand', wowhead_id: 30901 },
      ],
    },
    {
      name: 'Archimonde',
      items: [
        { name: 'Cataclysm\'s Edge', slot: 'Two-Hand', wowhead_id: 30902 },
        { name: 'Legguards of Endless Rage', slot: 'Legs', wowhead_id: 30903 },
        { name: 'Midnight Chestguard', slot: 'Chest', wowhead_id: 30905 },
        { name: 'Bristleblitz Striker', slot: 'Ranged', wowhead_id: 30906 },
        { name: 'Savior\'s Grasp', slot: 'Chest', wowhead_id: 30904 },
        { name: 'Mail of Fevered Pursuit', slot: 'Chest', wowhead_id: 30907 },
        { name: 'Apostle of Argus', slot: 'Two-Hand', wowhead_id: 30908 },
        { name: 'Scepter of Purification', slot: 'Held In Off-hand', wowhead_id: 30911 },
        { name: 'Leggings of Eternity', slot: 'Legs', wowhead_id: 30912 },
        { name: 'Antonidas\'s Aegis of Rapt Concentration', slot: 'Off Hand', wowhead_id: 30909 },
        { name: 'Tempest of Chaos', slot: 'Main Hand', wowhead_id: 30910 },
        { name: 'Robes of Rhonin', slot: 'Chest', wowhead_id: 30913 },
      ],
    }
  ],
}

// ============================================================================
// BLACK TEMPLE - Tier 6
// ============================================================================

export const blacktemple: Raid = {
  name: 'Black Temple',
  tier: 'Tier 6',
  bosses: [
    {
      name: 'High Warlord Naj\'entus',
      items: [
        { name: 'Eternium Shell Bracers', slot: 'Wrist', wowhead_id: 32232 },
        { name: 'Fists of Mukoa', slot: 'Hands', wowhead_id: 32234 },
        { name: 'Rising Tide', slot: 'One-Hand', wowhead_id: 32236 },
        { name: 'The Maelstrom\'s Fury', slot: 'Main Hand', wowhead_id: 32237 },
        { name: 'Helm of Soothing Currents', slot: 'Head', wowhead_id: 32241 },
        { name: 'Ring of Calming Waves', slot: 'Finger', wowhead_id: 32238 },
        { name: 'Slippers of the Seacaller', slot: 'Feet', wowhead_id: 32239 },
        { name: 'Boots of Oceanic Fury', slot: 'Feet', wowhead_id: 32242 },
        { name: 'Pearl Inlaid Boots', slot: 'Feet', wowhead_id: 32243 },
        { name: 'Guise of the Tidal Lurker', slot: 'Head', wowhead_id: 32240 },
        { name: 'Ring of Captured Storms', slot: 'Finger', wowhead_id: 32247 },
        { name: 'Tide-stomper\'s Greaves', slot: 'Feet', wowhead_id: 32245 },
        { name: 'Halberd of Desolation', slot: 'Two-Hand', wowhead_id: 32248 },
        { name: 'Mantle of Darkness', slot: 'Shoulder', wowhead_id: 32377 },
      ],
    },
    {
      name: 'Illidan Stormrage',
      items: [
        { name: 'Cursed Vision of Sargeras', slot: 'Head', wowhead_id: 32235 },
        { name: 'Black Bow of the Betrayer', slot: 'Ranged', wowhead_id: 32336 },
        { name: 'Zhar\'doom, Greatstaff of the Devourer', slot: 'Two-Hand', wowhead_id: 32374 },
        { name: 'Bulwark of Azzinoth', slot: 'Off Hand', wowhead_id: 32375 },
        { name: 'Shard of Azzinoth', slot: 'One-Hand', wowhead_id: 32471 },
        { name: 'The Skull of Gul\'dan', slot: 'Trinket', wowhead_id: 32483 },
        { name: 'Stormrage Signet Ring', slot: 'Finger', wowhead_id: 32497 },
        { name: 'Crystal Spire of Karabor', slot: 'Main Hand', wowhead_id: 32500 },
        { name: 'Memento of Tyrande', slot: 'Trinket', wowhead_id: 32496 },
        { name: 'Faceplate of the Impenetrable', slot: 'Head', wowhead_id: 32521 },
        { name: 'Shroud of the Highborne', slot: 'Back', wowhead_id: 32524 },
        { name: 'Cowl of the Illidari High Lord', slot: 'Head', wowhead_id: 32525 },
      ],
    },
    {
      name: 'Supremus',
      items: [
        { name: 'Pauldrons of Abyssal Fury', slot: 'Shoulder', wowhead_id: 32250 },
        { name: 'Wraps of Precise Flight', slot: 'Wrist', wowhead_id: 32251 },
        { name: 'Nether Shadow Tunic', slot: 'Chest', wowhead_id: 32252 },
        { name: 'Legionkiller', slot: 'Ranged', wowhead_id: 32253 },
        { name: 'The Brutalizer', slot: 'One-Hand', wowhead_id: 32254 },
        { name: 'Felstone Bulwark', slot: 'Off Hand', wowhead_id: 32255 },
        { name: 'Waistwrap of Infinity', slot: 'Waist', wowhead_id: 32256 },
        { name: 'Idol of the White Stag', slot: 'Relic', wowhead_id: 32257 },
        { name: 'Naturalist\'s Preserving Cinch', slot: 'Waist', wowhead_id: 32258 },
        { name: 'Band of the Abyssal Lord', slot: 'Finger', wowhead_id: 32261 },
        { name: 'Choker of Endless Nightmares', slot: 'Neck', wowhead_id: 32260 },
        { name: 'Bands of the Coming Storm', slot: 'Wrist', wowhead_id: 32259 },
        { name: 'Syphon of the Nathrezim', slot: 'One-Hand', wowhead_id: 32262 },
      ],
    },
    {
      name: 'Shade of Akama',
      items: [
        { name: 'Ring of Deceitful Intent', slot: 'Finger', wowhead_id: 32266 },
        { name: 'Praetorian\'s Legguards', slot: 'Legs', wowhead_id: 32263 },
        { name: 'Shoulders of the Hidden Predator', slot: 'Shoulder', wowhead_id: 32264 },
        { name: 'Shadow-walker\'s Cord', slot: 'Waist', wowhead_id: 32265 },
        { name: 'Myrmidon\'s Treads', slot: 'Feet', wowhead_id: 32268 },
        { name: 'Focused Mana Bindings', slot: 'Wrist', wowhead_id: 32270 },
        { name: 'Kilt of Immortal Nature', slot: 'Legs', wowhead_id: 32271 },
        { name: 'Amice of Brilliant Light', slot: 'Shoulder', wowhead_id: 32273 },
        { name: 'Spiritwalker Gauntlets', slot: 'Hands', wowhead_id: 32275 },
        { name: 'Grips of Silent Justice', slot: 'Hands', wowhead_id: 32278 },
        { name: 'The Seeker\'s Wristguards', slot: 'Wrist', wowhead_id: 32279 },
        { name: 'Flashfire Girdle', slot: 'Waist', wowhead_id: 32276 },
        { name: 'Blind-Seers Icon', slot: 'Held In Off-hand', wowhead_id: 32361 },
        { name: 'Wristbands of Divine Influence', slot: 'Wrist', wowhead_id: 32513 },
      ],
    },
    {
      name: 'Gurtogg Bloodboil',
      items: [
        { name: 'Messenger of Fate', slot: 'One-Hand', wowhead_id: 32269 },
        { name: 'Girdle of Stability', slot: 'Waist', wowhead_id: 32333 },
        { name: 'Vest of Mounting Assault', slot: 'Chest', wowhead_id: 32334 },
        { name: 'Unstoppable Aggressor\'s Ring', slot: 'Finger', wowhead_id: 32335 },
        { name: 'Shroud of Forgiveness', slot: 'Back', wowhead_id: 32337 },
        { name: 'Blood-cursed Shoulderpads', slot: 'Shoulder', wowhead_id: 32338 },
        { name: 'Garments of Temperance', slot: 'Chest', wowhead_id: 32340 },
        { name: 'Belt of Primal Majesty', slot: 'Waist', wowhead_id: 32339 },
        { name: 'Leggings of Divine Retribution', slot: 'Legs', wowhead_id: 32341 },
        { name: 'Girdle of Mighty Resolve', slot: 'Waist', wowhead_id: 32342 },
        { name: 'Wand of Prismatic Focus', slot: 'Ranged', wowhead_id: 32343 },
        { name: 'Staff of Immaculate Recovery', slot: 'Two-Hand', wowhead_id: 32344 },
        { name: 'Shadowmoon Insignia', slot: 'Trinket', wowhead_id: 32501 },
      ],
    },
    {
      name: 'High Nethermancer Zerevor',
      items: [
        { name: 'Cloak of the Illidari Council', slot: 'Back', wowhead_id: 32331 },
        { name: 'Helm of the Illidari Shatterer', slot: 'Head', wowhead_id: 32373 },
        { name: 'Forest Prowler\'s Helm', slot: 'Head', wowhead_id: 32376 },
        { name: 'Madness of the Betrayer', slot: 'Trinket', wowhead_id: 32505 },
        { name: 'Belt of Divine Guidance', slot: 'Waist', wowhead_id: 32519 },
        { name: 'Veil of Turning Leaves', slot: 'Shoulder', wowhead_id: 32518 },
      ],
    },
    {
      name: 'Essence of Anger',
      items: [
        { name: 'Torch of the Damned', slot: 'Two-Hand', wowhead_id: 32332 },
        { name: 'Dreadboots of the Legion', slot: 'Feet', wowhead_id: 32345 },
        { name: 'Boneweave Girdle', slot: 'Waist', wowhead_id: 32346 },
        { name: 'Grips of Damnation', slot: 'Hands', wowhead_id: 32347 },
        { name: 'Translucent Spellthread Necklace', slot: 'Neck', wowhead_id: 32349 },
        { name: 'Touch of Inspiration', slot: 'Held In Off-hand', wowhead_id: 32350 },
        { name: 'Elunite Empowered Bracers', slot: 'Wrist', wowhead_id: 32351 },
        { name: 'Naturewarden\'s Treads', slot: 'Feet', wowhead_id: 32352 },
        { name: 'Gloves of Unfailing Faith', slot: 'Hands', wowhead_id: 32353 },
        { name: 'Crown of Empowered Fate', slot: 'Head', wowhead_id: 32354 },
        { name: 'Pendant of Titans', slot: 'Neck', wowhead_id: 32362 },
        { name: 'Naaru-Blessed Life Rod', slot: 'Ranged', wowhead_id: 32363 },
        { name: 'The Wavemender\'s Mantle', slot: 'Shoulder', wowhead_id: 32517 },
      ],
    },
    {
      name: 'Mother Shahraz',
      items: [
        { name: 'Tome of the Lightbringer', slot: 'Relic', wowhead_id: 32368 },
        { name: 'Leggings of Devastation', slot: 'Legs', wowhead_id: 32367 },
        { name: 'Heartshatter Breastplate', slot: 'Chest', wowhead_id: 32365 },
        { name: 'Blade of Savagery', slot: 'One-Hand', wowhead_id: 32369 },
        { name: 'Shadowmaster\'s Boots', slot: 'Feet', wowhead_id: 32366 },
        { name: 'Nadina\'s Pendant of Purity', slot: 'Neck', wowhead_id: 32370 },
      ],
    },
    {
      name: 'Ashtongue Channeler',
      items: [
        { name: 'Choker of Serrated Blades', slot: 'Neck', wowhead_id: 32591 },
        { name: 'Boots of the Divine Light', slot: 'Feet', wowhead_id: 32609 },
      ],
    }
  ],
}

// ============================================================================
// ZUL\'AMAN - Tier 6
// ============================================================================

export const zulaman: Raid = {
  name: 'Zul\'Aman',
  tier: 'Tier 6',
  bosses: [
    {
      name: 'Nalorakk',
      items: [
        { name: 'Jungle Stompers', slot: 'Feet', wowhead_id: 33191 },
        { name: 'Robes of Heavenly Purpose', slot: 'Chest', wowhead_id: 33203 },
        { name: 'Pauldrons of Primal Fury', slot: 'Shoulder', wowhead_id: 33206 },
        { name: 'Bladeangel\'s Money Belt', slot: 'Waist', wowhead_id: 33211 },
        { name: 'Fury of the Ursine', slot: 'Wrist', wowhead_id: 33285 },
        { name: 'Mask of Introspection', slot: 'Head', wowhead_id: 33327 },
        { name: 'Fury', slot: 'Off Hand', wowhead_id: 33640 },
      ],
    },
    {
      name: 'Akil\'zon',
      items: [
        { name: 'Bloodstained Elven Battlevest', slot: 'Chest', wowhead_id: 33215 },
        { name: 'Akil\'zon\'s Talonblade', slot: 'One-Hand', wowhead_id: 33214 },
        { name: 'Chestguard of Hidden Purpose', slot: 'Chest', wowhead_id: 33216 },
        { name: 'Brooch of Nature\'s Mercy', slot: 'Neck', wowhead_id: 33281 },
        { name: 'Amani Punisher', slot: 'Main Hand', wowhead_id: 33283 },
        { name: 'Mojo-mender\'s Mask', slot: 'Head', wowhead_id: 33286 },
        { name: 'Signet of Ancient Magics', slot: 'Finger', wowhead_id: 33293 },
      ],
    },
    {
      name: 'Halazzi',
      items: [
        { name: 'Spaulders of the Advocate', slot: 'Shoulder', wowhead_id: 33299 },
        { name: 'Shoulderpads of Dancing Blades', slot: 'Shoulder', wowhead_id: 33300 },
        { name: 'The Savage\'s Choker', slot: 'Neck', wowhead_id: 33297 },
        { name: 'Skullshatter Warboots', slot: 'Feet', wowhead_id: 33303 },
        { name: 'Robe of Departed Spirits', slot: 'Chest', wowhead_id: 33317 },
        { name: 'Shimmer-pelt Vest', slot: 'Chest', wowhead_id: 33322 },
        { name: 'Avalanche Leggings', slot: 'Legs', wowhead_id: 33533 },
      ],
    },
    {
      name: 'Hex Lord Malacrass',
      items: [
        { name: 'Prowler\'s Strikeblade', slot: 'One-Hand', wowhead_id: 33298 },
        { name: 'Heartless', slot: 'One-Hand', wowhead_id: 33388 },
        { name: 'Dagger of Bad Mojo', slot: 'One-Hand', wowhead_id: 33389 },
        { name: 'Battleworn Tuskguard', slot: 'Head', wowhead_id: 33421 },
        { name: 'Coif of the Jungle Stalker', slot: 'Head', wowhead_id: 33432 },
        { name: 'Girdle of Stromgarde\'s Hope', slot: 'Waist', wowhead_id: 33446 },
        { name: 'Hood of Hexing', slot: 'Head', wowhead_id: 33453 },
        { name: 'Hood of the Third Eye', slot: 'Head', wowhead_id: 33463 },
        { name: 'Hex Lord\'s Voodoo Pauldrons', slot: 'Shoulder', wowhead_id: 33464 },
        { name: 'Staff of Primal Fury', slot: 'Two-Hand', wowhead_id: 33465 },
        { name: 'Cloak of Ancient Rituals', slot: 'Back', wowhead_id: 33592 },
        { name: 'Tome of Diabolic Remedy', slot: 'Trinket', wowhead_id: 33828 },
        { name: 'Hex Shrunken Head', slot: 'Trinket', wowhead_id: 33829 },
        { name: 'Tiny Voodoo Mask', slot: 'Trinket', wowhead_id: 34029 },
      ],
    },
    {
      name: 'Jan\'alai',
      items: [
        { name: 'Arrow-fall Chestguard', slot: 'Chest', wowhead_id: 33328 },
        { name: 'Bulwark of the Amani Empire', slot: 'Off Hand', wowhead_id: 33326 },
        { name: 'Shadowtooth Trollskin Cuirass', slot: 'Chest', wowhead_id: 33329 },
        { name: 'Enamelled Disc of Mojo', slot: 'Off Hand', wowhead_id: 33332 },
        { name: 'Wub\'s Cursed Hexblade', slot: 'Main Hand', wowhead_id: 33354 },
        { name: 'Footpads of Madness', slot: 'Feet', wowhead_id: 33357 },
        { name: 'Helm of Natural Regeneration', slot: 'Head', wowhead_id: 33356 },
      ],
    },
    {
      name: 'Zul\'jin',
      items: [
        { name: 'Blade of Twisted Visions', slot: 'Main Hand', wowhead_id: 33467 },
        { name: 'Hauberk of the Empire\'s Champion', slot: 'Chest', wowhead_id: 33469 },
        { name: 'Dark Blessing', slot: 'Main Hand', wowhead_id: 33468 },
        { name: 'Two-toed Sandals', slot: 'Feet', wowhead_id: 33471 },
        { name: 'Chestguard of the Warlord', slot: 'Chest', wowhead_id: 33473 },
        { name: 'Ancient Amani Longbow', slot: 'Ranged', wowhead_id: 33474 },
        { name: 'Grimgrin Faceguard', slot: 'Head', wowhead_id: 33479 },
        { name: 'Cleaver of the Unforgiving', slot: 'One-Hand', wowhead_id: 33476 },
        { name: 'Jin\'rohk, The Great Apocalypse', slot: 'Two-Hand', wowhead_id: 33478 },
        { name: 'Ancient Aqir Artifact', slot: 'Trinket', wowhead_id: 33830 },
        { name: 'Berserker\'s Call', slot: 'Trinket', wowhead_id: 33831 },
        { name: 'Loop of Cursed Bones', slot: 'Neck', wowhead_id: 33466 },
      ],
    }
  ],
}

// ============================================================================
// SUNWELL PLATEAU - Tier 6
// ============================================================================

export const sunwellplateau: Raid = {
  name: 'Sunwell Plateau',
  tier: 'Tier 6',
  bosses: [
    {
      name: 'Brutallus',
      items: [
        { name: 'Reign of Misery', slot: 'Main Hand', wowhead_id: 34176 },
        { name: 'Clutch of Demise', slot: 'Neck', wowhead_id: 34177 },
        { name: 'Collar of the Pit Lord', slot: 'Neck', wowhead_id: 34178 },
        { name: 'Leggings of Calamity', slot: 'Legs', wowhead_id: 34181 },
        { name: 'Heart of the Pit', slot: 'Held In Off-hand', wowhead_id: 34179 },
        { name: 'Felfury Legplates', slot: 'Legs', wowhead_id: 34180 },
      ],
    },
    {
      name: 'Felmyst',
      items: [
        { name: 'Grand Magister\'s Staff of Torrents', slot: 'Two-Hand', wowhead_id: 34182 },
        { name: 'Brooch of the Highborne', slot: 'Neck', wowhead_id: 34184 },
        { name: 'Sword Breaker\'s Bulwark', slot: 'Off Hand', wowhead_id: 34185 },
        { name: 'Leggings of the Immortal Night', slot: 'Legs', wowhead_id: 34188 },
        { name: 'Chain Links of the Tumultuous Storm', slot: 'Legs', wowhead_id: 34186 },
        { name: 'Borderland Fortress Grips', slot: 'Hands', wowhead_id: 34352 },
      ],
    },
    {
      name: 'Kil\'jaeden',
      items: [
        { name: 'Tattered Cape of Antonidas', slot: 'Back', wowhead_id: 34242 },
        { name: 'Helm of Burning Righteousness', slot: 'Head', wowhead_id: 34243 },
        { name: 'Cloak of Unforgivable Sin', slot: 'Back', wowhead_id: 34241 },
        { name: 'Duplicitous Guise', slot: 'Head', wowhead_id: 34244 },
        { name: 'Cover of Ursol the Wise', slot: 'Head', wowhead_id: 34245 },
        { name: 'Apolyon, the Soul-Render', slot: 'Two-Hand', wowhead_id: 34247 },
        { name: 'Crux of the Apocalypse', slot: 'One-Hand', wowhead_id: 34329 },
        { name: 'Hand of the Deceiver', slot: 'Main Hand', wowhead_id: 34331 },
        { name: 'Coif of Alleria', slot: 'Head', wowhead_id: 34333 },
        { name: 'Cowl of Gul\'dan', slot: 'Head', wowhead_id: 34332 },
        { name: 'Hammer of Sanctification', slot: 'Main Hand', wowhead_id: 34335 },
        { name: 'Sunflare', slot: 'Main Hand', wowhead_id: 34336 },
        { name: 'Golden Staff of the Sin\'dorei', slot: 'Two-Hand', wowhead_id: 34337 },
        { name: 'Borderland Paingrips', slot: 'Hands', wowhead_id: 34341 },
        { name: 'Cowl of Light\'s Purity', slot: 'Head', wowhead_id: 34339 },
        { name: 'Handguards of the Dawn', slot: 'Hands', wowhead_id: 34342 },
        { name: 'Thalassian Ranger Gauntlets', slot: 'Hands', wowhead_id: 34343 },
        { name: 'Handguards of Defiled Worlds', slot: 'Hands', wowhead_id: 34344 },
        { name: 'Crown of Anasterian', slot: 'Head', wowhead_id: 34345 },
        { name: 'Dark Conjuror\'s Collar', slot: 'Head', wowhead_id: 34340 },
      ],
    }
  ],
}

// ============================================================================
// EXPORT ALL TBC RAIDS
// ============================================================================

export const tbcRaids: Raid[] = [
  karazhan,
  gruulslair,
  magtheridonslair,
  serpentshrinecavern,
  tempestkeep,
  mounthyjal,
  blacktemple,
  zulaman,
  sunwellplateau,
]
