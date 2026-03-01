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
      name: 'Servant\'s Quarters',
      items: [
        // Hyakiss the Lurker - Waist items
        { name: 'Lurker\'s Cord', slot: 'Waist', wowhead_id: 30675 },
        { name: 'Lurker\'s Grasp', slot: 'Waist', wowhead_id: 30676 },
        { name: 'Lurker\'s Belt', slot: 'Waist', wowhead_id: 30677 },
        { name: 'Lurker\'s Girdle', slot: 'Waist', wowhead_id: 30678 },
        // Rokad the Ravager - Wrist items
        { name: 'Ravager\'s Cuffs', slot: 'Wrist', wowhead_id: 30684 },
        { name: 'Ravager\'s Wrist-Wraps', slot: 'Wrist', wowhead_id: 30685 },
        { name: 'Ravager\'s Bands', slot: 'Wrist', wowhead_id: 30686 },
        { name: 'Ravager\'s Bracers', slot: 'Wrist', wowhead_id: 30687 },
        // Shadikith the Glider - Feet items
        { name: 'Glider\'s Foot-Wraps', slot: 'Feet', wowhead_id: 30680 },
        { name: 'Glider\'s Boots', slot: 'Feet', wowhead_id: 30681 },
        { name: 'Glider\'s Sabatons', slot: 'Feet', wowhead_id: 30682 },
        { name: 'Glider\'s Greaves', slot: 'Feet', wowhead_id: 30683 },
      ],
    },
    {
      name: 'Attumen the Huntsman',
      items: [
        // Rings & Amulets
        { name: 'Spectral Band of Innervation', slot: 'Finger', wowhead_id: 28510 },
        { name: 'Worgen Claw Necklace', slot: 'Neck', wowhead_id: 28509 },
        // Cloth
        { name: 'Gloves of Saintly Blessings', slot: 'Hands', wowhead_id: 28508 },
        { name: 'Handwraps of Flowing Thought', slot: 'Hands', wowhead_id: 28507 },
        { name: 'Harbinger Bands', slot: 'Wrist', wowhead_id: 28477 },
        // Leather
        { name: 'Gloves of Dexterous Manipulation', slot: 'Hands', wowhead_id: 28506 },
        { name: 'Bracers of the White Stag', slot: 'Wrist', wowhead_id: 28453 },
        // Mail
        { name: 'Whirlwind Bracers', slot: 'Wrist', wowhead_id: 28503 },
        { name: 'Stalker\'s War Bands', slot: 'Wrist', wowhead_id: 28454 },
        // Plate
        { name: 'Gauntlets of Renewed Hope', slot: 'Hands', wowhead_id: 28505 },
        { name: 'Vambraces of Courage', slot: 'Wrist', wowhead_id: 28502 },
        // Weapons & Other
        { name: 'Steelhawk Crossbow', slot: 'Ranged', wowhead_id: 28504 },
        { name: 'Fiery Warhorse\'s Reins', slot: 'Mount', wowhead_id: 30480 },
        // Recipe
        { name: 'Schematic: Stabilized Eternium Scope', slot: 'Recipe', wowhead_id: 23809 },
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
        // Recipe
        { name: 'Formula: Enchant Weapon - Mongoose', slot: 'Recipe', wowhead_id: 22559 },
      ],
    },
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
      name: 'Opera Event',
      items: [
        // Romulo & Julianne
        { name: 'Blade of the Unrequited', slot: 'One-Hand', wowhead_id: 28572 },
        { name: 'Despair', slot: 'Two-Hand', wowhead_id: 28573 },
        { name: 'Romulo\'s Poison Vial', slot: 'Trinket', wowhead_id: 28579 },
        { name: 'Masquerade Gown', slot: 'Chest', wowhead_id: 28578 },
        // Big Bad Wolf
        { name: 'Red Riding Hood\'s Cloak', slot: 'Back', wowhead_id: 28582 },
        { name: 'Big Bad Wolf\'s Head', slot: 'Head', wowhead_id: 28583 },
        { name: 'Wolfslayer Sniper Rifle', slot: 'Ranged', wowhead_id: 28581 },
        { name: 'Big Bad Wolf\'s Paw', slot: 'Main Hand', wowhead_id: 28584 },
        // Wizard of Oz
        { name: 'Ruby Slippers', slot: 'Feet', wowhead_id: 28585 },
        { name: 'Wicked Witch\'s Hat', slot: 'Head', wowhead_id: 28586 },
        { name: 'Blue Diamond Witchwand', slot: 'Ranged', wowhead_id: 28588 },
        { name: 'Legacy', slot: 'Two-Hand', wowhead_id: 28587 },
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
        // Tier 4 Glove Tokens
        { name: 'Gloves of the Fallen Hero', slot: 'Token', wowhead_id: 29756 },
        { name: 'Gloves of the Fallen Champion', slot: 'Token', wowhead_id: 29757 },
        { name: 'Gloves of the Fallen Defender', slot: 'Token', wowhead_id: 29758 },
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
        // Recipe
        { name: 'Formula: Enchant Weapon - Soulfrost', slot: 'Recipe', wowhead_id: 22561 },
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
        // Recipe
        { name: 'Formula: Enchant Weapon - Sunfire', slot: 'Recipe', wowhead_id: 22560 },
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
      name: 'Chess Event',
      items: [
        // Rings & Amulets
        { name: 'Ring of Recurrence', slot: 'Finger', wowhead_id: 28753 },
        { name: 'Mithril Chain of Heroism', slot: 'Neck', wowhead_id: 28745 },
        // Cloth
        { name: 'Headdress of the High Potentate', slot: 'Head', wowhead_id: 28756 },
        // Leather
        { name: 'Bladed Shoulderpads of the Merciless', slot: 'Shoulder', wowhead_id: 28755 },
        { name: 'Forestlord Striders', slot: 'Feet', wowhead_id: 28752 },
        { name: 'Girdle of Treachery', slot: 'Waist', wowhead_id: 28750 },
        // Mail
        { name: 'Fiend Slayer Boots', slot: 'Feet', wowhead_id: 28746 },
        { name: 'Heart-Flame Leggings', slot: 'Legs', wowhead_id: 28751 },
        // Plate
        { name: 'Legplates of the Innocent', slot: 'Legs', wowhead_id: 28748 },
        { name: 'Battlescar Boots', slot: 'Feet', wowhead_id: 28747 },
        // Weapons & Shields
        { name: 'Triptych Shield of the Ancients', slot: 'Off Hand', wowhead_id: 28754 },
        { name: 'King\'s Defender', slot: 'One-Hand', wowhead_id: 28749 },
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
        // Tier 4 Head Tokens
        { name: 'Helm of the Fallen Hero', slot: 'Token', wowhead_id: 29759 },
        { name: 'Helm of the Fallen Champion', slot: 'Token', wowhead_id: 29760 },
        { name: 'Helm of the Fallen Defender', slot: 'Token', wowhead_id: 29761 },
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
      name: 'High King Maulgar',
      items: [
        { name: 'Bladespire Warbands', slot: 'Wrist', wowhead_id: 28795 },
        { name: 'Malefic Mask of the Shadows', slot: 'Head', wowhead_id: 28796 },
        { name: 'Brute Cloak of the Ogre-Magi', slot: 'Back', wowhead_id: 28797 },
        { name: 'Belt of Divine Inspiration', slot: 'Waist', wowhead_id: 28799 },
        { name: 'Hammer of the Naaru', slot: 'Two-Hand', wowhead_id: 28800 },
        { name: 'Maulgar\'s Warhelm', slot: 'Head', wowhead_id: 28801 },
        // Tier 4 Shoulder Tokens
        { name: 'Pauldrons of the Fallen Hero', slot: 'Token', wowhead_id: 29762 },
        { name: 'Pauldrons of the Fallen Champion', slot: 'Token', wowhead_id: 29763 },
        { name: 'Pauldrons of the Fallen Defender', slot: 'Token', wowhead_id: 29764 },
      ],
    },
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
        { name: 'Shuriken of Negation', slot: 'Thrown', wowhead_id: 28826 },
        // Tier 4 Leg Tokens
        { name: 'Leggings of the Fallen Hero', slot: 'Token', wowhead_id: 29765 },
        { name: 'Leggings of the Fallen Champion', slot: 'Token', wowhead_id: 29766 },
        { name: 'Leggings of the Fallen Defender', slot: 'Token', wowhead_id: 29767 },
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
        // Tier 4 Chest Tokens
        { name: 'Chestguard of the Fallen Hero', slot: 'Token', wowhead_id: 29755 },
        { name: 'Chestguard of the Fallen Champion', slot: 'Token', wowhead_id: 29754 },
        { name: 'Chestguard of the Fallen Defender', slot: 'Token', wowhead_id: 29753 },
        // Quest Item
        { name: 'Magtheridon\'s Head', slot: 'Quest', wowhead_id: 32385 },
        // 20-Slot Bag
        { name: 'Pit Lord\'s Satchel', slot: 'Bag', wowhead_id: 34845 },
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
        { name: 'Pendant of the Perilous', slot: 'Neck', wowhead_id: 30022 },
        { name: 'Totem of the Maelstrom', slot: 'Relic', wowhead_id: 30023 },
        { name: 'Serpentshrine Shuriken', slot: 'Thrown', wowhead_id: 30025 },
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
        { name: 'Boots of Courage Unending', slot: 'Feet', wowhead_id: 30027 },
        { name: 'Spyglass of the Hidden Fleet', slot: 'Trinket', wowhead_id: 30620 },
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
        // Tier 5 Glove Tokens
        { name: 'Gloves of the Vanquished Hero', slot: 'Token', wowhead_id: 30241 },
        { name: 'Gloves of the Vanquished Champion', slot: 'Token', wowhead_id: 30239 },
        { name: 'Gloves of the Vanquished Defender', slot: 'Token', wowhead_id: 30240 },
        { name: 'Wildfury Greatstaff', slot: 'Two-Hand', wowhead_id: 30021 },
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
        // Tier 5 Leg Tokens
        { name: 'Leggings of the Vanquished Hero', slot: 'Token', wowhead_id: 30247 },
        { name: 'Leggings of the Vanquished Champion', slot: 'Token', wowhead_id: 30245 },
        { name: 'Leggings of the Vanquished Defender', slot: 'Token', wowhead_id: 30246 },
      ],
    },
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
        // Tier 5 Helm Tokens
        { name: 'Helm of the Vanquished Hero', slot: 'Token', wowhead_id: 30244 },
        { name: 'Helm of the Vanquished Champion', slot: 'Token', wowhead_id: 30242 },
        { name: 'Helm of the Vanquished Defender', slot: 'Token', wowhead_id: 30243 },
        // Quest Item
        { name: 'Vashj\'s Vial Remnant', slot: 'Quest', wowhead_id: 29906 },
      ],
    }
  ],
}

// ============================================================================
// TEMPEST KEEP: THE EYE - Tier 5
// ============================================================================

export const tempestkeep: Raid = {
  name: 'Tempest Keep: The Eye',
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
      name: 'Void Reaver',
      items: [
        { name: 'Fel-Steel Warhelm', slot: 'Head', wowhead_id: 29983 },
        { name: 'Girdle of Zaetar', slot: 'Waist', wowhead_id: 29984 },
        { name: 'Void Reaver Greaves', slot: 'Legs', wowhead_id: 29985 },
        { name: 'Cowl of the Grand Engineer', slot: 'Head', wowhead_id: 29986 },
        { name: 'Warp-Spring Coil', slot: 'Trinket', wowhead_id: 30450 },
        { name: 'Fel Reaver\'s Piston', slot: 'Trinket', wowhead_id: 30619 },
        { name: 'Wristguards of Determination', slot: 'Wrist', wowhead_id: 32515 },
        // Tier 5 Shoulder Tokens
        { name: 'Pauldrons of the Vanquished Hero', slot: 'Token', wowhead_id: 30250 },
        { name: 'Pauldrons of the Vanquished Champion', slot: 'Token', wowhead_id: 30248 },
        { name: 'Pauldrons of the Vanquished Defender', slot: 'Token', wowhead_id: 30249 },
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
        { name: 'Sunhawk Leggings', slot: 'Legs', wowhead_id: 29991 },
        { name: 'Thalassian Wildercloak', slot: 'Back', wowhead_id: 29994 },
      ],
    },
    {
      name: 'Kael\'thas Sunstrider',
      items: [
        { name: 'Ashes of Al\'ar', slot: 'Mount', wowhead_id: 32458 },
        { name: 'Crown of the Sun', slot: 'Head', wowhead_id: 29990 },
        { name: 'Gauntlets of the Sun King', slot: 'Hands', wowhead_id: 29987 },
        { name: 'Royal Cloak of the Sunstriders', slot: 'Back', wowhead_id: 29992 },
        { name: 'Leggings of Murderous Intent', slot: 'Legs', wowhead_id: 29995 },
        { name: 'Sunshower Light Cloak', slot: 'Back', wowhead_id: 29989 },
        { name: 'Rod of the Sun King', slot: 'Main Hand', wowhead_id: 29996 },
        { name: 'The Nexus Key', slot: 'Main Hand', wowhead_id: 29988 },
        { name: 'Royal Gauntlets of Silvermoon', slot: 'Hands', wowhead_id: 29998 },
        { name: 'Twinblade of the Phoenix', slot: 'One-Hand', wowhead_id: 29993 },
        { name: 'Verdant Sphere', slot: 'Quest', wowhead_id: 32405 },
        // Tier 5 Chest Tokens
        { name: 'Chestguard of the Vanquished Hero', slot: 'Token', wowhead_id: 30238 },
        { name: 'Chestguard of the Vanquished Champion', slot: 'Token', wowhead_id: 30236 },
        { name: 'Chestguard of the Vanquished Defender', slot: 'Token', wowhead_id: 30237 },
      ],
    },
    {
      name: 'Trash',
      items: [
        // Trash Drops
        { name: 'Seventh Ring of the Tirisfalen', slot: 'Finger', wowhead_id: 30028 },
        { name: 'Mantle of the Elven Kings', slot: 'Shoulder', wowhead_id: 30024 },
        { name: 'Fire-Cord of the Magus', slot: 'Waist', wowhead_id: 30020 },
        { name: 'Bark-Gloves of Ancient Wisdom', slot: 'Hands', wowhead_id: 30029 },
        { name: 'Girdle of Fallen Stars', slot: 'Waist', wowhead_id: 30030 },
        { name: 'Bands of the Celestial Archer', slot: 'Wrist', wowhead_id: 30026 },
        // Blacksmithing Recipes
        { name: 'Plans: Belt of the Guardian', slot: 'Recipe', wowhead_id: 30321 },
        { name: 'Plans: Boots of the Protector', slot: 'Recipe', wowhead_id: 30323 },
        { name: 'Plans: Red Belt of Battle', slot: 'Recipe', wowhead_id: 30322 },
        { name: 'Plans: Red Havoc Boots', slot: 'Recipe', wowhead_id: 30324 },
        // Leatherworking Recipes
        { name: 'Pattern: Belt of Deep Shadow', slot: 'Recipe', wowhead_id: 30302 },
        { name: 'Pattern: Belt of Natural Power', slot: 'Recipe', wowhead_id: 30301 },
        { name: 'Pattern: Belt of the Black Eagle', slot: 'Recipe', wowhead_id: 30303 },
        { name: 'Pattern: Boots of Natural Grace', slot: 'Recipe', wowhead_id: 30305 },
        { name: 'Pattern: Boots of the Crimson Hawk', slot: 'Recipe', wowhead_id: 30307 },
        { name: 'Pattern: Boots of Utter Darkness', slot: 'Recipe', wowhead_id: 30306 },
        { name: 'Pattern: Hurricane Boots', slot: 'Recipe', wowhead_id: 30308 },
        { name: 'Pattern: Monsoon Belt', slot: 'Recipe', wowhead_id: 30304 },
        // Tailoring Recipes
        { name: 'Pattern: Belt of Blasting', slot: 'Recipe', wowhead_id: 30280 },
        { name: 'Pattern: Belt of the Long Road', slot: 'Recipe', wowhead_id: 30281 },
        { name: 'Pattern: Boots of Blasting', slot: 'Recipe', wowhead_id: 30282 },
        { name: 'Pattern: Boots of the Long Road', slot: 'Recipe', wowhead_id: 30283 },
      ],
    }
  ],
}

// ============================================================================
// HYJAL SUMMIT - Tier 6
// ============================================================================

export const mounthyjal: Raid = {
  name: 'Hyjal Summit',
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
        // Tier 6 Glove Tokens
        { name: 'Gloves of the Forgotten Conqueror', slot: 'Token', wowhead_id: 31092 },
        { name: 'Gloves of the Forgotten Protector', slot: 'Token', wowhead_id: 31094 },
        { name: 'Gloves of the Forgotten Vanquisher', slot: 'Token', wowhead_id: 31093 },
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
        // Tier 6 Helm Tokens
        { name: 'Helm of the Forgotten Conqueror', slot: 'Token', wowhead_id: 31097 },
        { name: 'Helm of the Forgotten Protector', slot: 'Token', wowhead_id: 31095 },
        { name: 'Helm of the Forgotten Vanquisher', slot: 'Token', wowhead_id: 31096 },
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
      name: 'Teron Gorefiend',
      items: [
        { name: 'Softstep Boots of Tracking', slot: 'Feet', wowhead_id: 32280 },
        { name: 'Insidious Bands', slot: 'Wrist', wowhead_id: 32281 },
        { name: 'Shadowmoon Destroyer\'s Drape', slot: 'Back', wowhead_id: 32323 },
        { name: 'Robe of the Shadow Council', slot: 'Chest', wowhead_id: 32327 },
        { name: 'Girdle of Lordaeron\'s Fallen', slot: 'Waist', wowhead_id: 32324 },
        { name: 'Girdle of the Lightbearer', slot: 'Waist', wowhead_id: 32328 },
        { name: 'Soul Cleaver', slot: 'Two-Hand', wowhead_id: 32326 },
        { name: 'Gauntlets of Enforcement', slot: 'Hands', wowhead_id: 32329 },
        { name: 'Botanist\'s Gloves of Growth', slot: 'Hands', wowhead_id: 32330 },
        { name: 'Totem of Ancestral Guidance', slot: 'Relic', wowhead_id: 32330 },
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
        // Tier 6 Chest Tokens
        { name: 'Chestguard of the Forgotten Conqueror', slot: 'Token', wowhead_id: 31089 },
        { name: 'Chestguard of the Forgotten Protector', slot: 'Token', wowhead_id: 31091 },
        { name: 'Chestguard of the Forgotten Vanquisher', slot: 'Token', wowhead_id: 31090 },
      ],
    },
    {
      name: 'Reliquary of Souls',
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
        // Tier 6 Leg Tokens
        { name: 'Leggings of the Forgotten Conqueror', slot: 'Token', wowhead_id: 31098 },
        { name: 'Leggings of the Forgotten Protector', slot: 'Token', wowhead_id: 31100 },
        { name: 'Leggings of the Forgotten Vanquisher', slot: 'Token', wowhead_id: 31099 },
      ],
    },
    {
      name: 'The Illidari Council',
      items: [
        { name: 'Cloak of the Illidari Council', slot: 'Back', wowhead_id: 32331 },
        { name: 'Helm of the Illidari Shatterer', slot: 'Head', wowhead_id: 32373 },
        { name: 'Forest Prowler\'s Helm', slot: 'Head', wowhead_id: 32376 },
        { name: 'Madness of the Betrayer', slot: 'Trinket', wowhead_id: 32505 },
        { name: 'Belt of Divine Guidance', slot: 'Waist', wowhead_id: 32519 },
        { name: 'Veil of Turning Leaves', slot: 'Shoulder', wowhead_id: 32518 },
        { name: 'Choker of Serrated Blades', slot: 'Neck', wowhead_id: 32591 },
        { name: 'Boots of the Divine Light', slot: 'Feet', wowhead_id: 32609 },
        // Tier 6 Shoulder Tokens
        { name: 'Pauldrons of the Forgotten Conqueror', slot: 'Token', wowhead_id: 31101 },
        { name: 'Pauldrons of the Forgotten Protector', slot: 'Token', wowhead_id: 31103 },
        { name: 'Pauldrons of the Forgotten Vanquisher', slot: 'Token', wowhead_id: 31102 },
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
        // Warglaives of Azzinoth (Legendary)
        { name: 'Warglaive of Azzinoth (Main Hand)', slot: 'Legendary', wowhead_id: 32837 },
        { name: 'Warglaive of Azzinoth (Off Hand)', slot: 'Legendary', wowhead_id: 32838 },
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
        // Recipe
        { name: 'Formula: Enchant Weapon - Executioner', slot: 'Recipe', wowhead_id: 33307 },
      ],
    },
    {
      name: 'Timed Event',
      items: [
        // Rewards from completing the timed event (4 bosses before timer)
        { name: 'Amani War Bear', slot: 'Mount', wowhead_id: 33809 },
        { name: 'Mana Attuned Band', slot: 'Finger', wowhead_id: 33494 },
        { name: 'Signet of Primal Wrath', slot: 'Finger', wowhead_id: 33496 },
        { name: 'Band of the Ranger-General', slot: 'Finger', wowhead_id: 33495 },
        { name: 'Ring of Flowing Light', slot: 'Finger', wowhead_id: 33497 },
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
      name: 'Kalecgos',
      items: [
        { name: 'Bracers of the Forgotten Conqueror', slot: 'Token', wowhead_id: 34848 },
        { name: 'Bracers of the Forgotten Protector', slot: 'Token', wowhead_id: 34851 },
        { name: 'Bracers of the Forgotten Vanquisher', slot: 'Token', wowhead_id: 34852 },
        { name: 'Band of Lucent Beams', slot: 'Finger', wowhead_id: 34164 },
        { name: 'Fang of Kalecgos', slot: 'One-Hand', wowhead_id: 34165 },
        { name: 'Dragonscale-Encrusted Longblade', slot: 'One-Hand', wowhead_id: 34166 },
        { name: 'Pantaloons of Calming Strife', slot: 'Legs', wowhead_id: 34167 },
        { name: 'Shoulderpads of Vehemence', slot: 'Shoulder', wowhead_id: 34168 },
        { name: 'Skyshatter Bracers', slot: 'Wrist', wowhead_id: 34437 },
      ],
    },
    {
      name: 'Brutallus',
      items: [
        { name: 'Belt of the Forgotten Conqueror', slot: 'Token', wowhead_id: 34853 },
        { name: 'Belt of the Forgotten Protector', slot: 'Token', wowhead_id: 34854 },
        { name: 'Belt of the Forgotten Vanquisher', slot: 'Token', wowhead_id: 34855 },
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
        { name: 'Boots of the Forgotten Conqueror', slot: 'Token', wowhead_id: 34856 },
        { name: 'Boots of the Forgotten Protector', slot: 'Token', wowhead_id: 34857 },
        { name: 'Boots of the Forgotten Vanquisher', slot: 'Token', wowhead_id: 34858 },
        { name: 'Grand Magister\'s Staff of Torrents', slot: 'Two-Hand', wowhead_id: 34182 },
        { name: 'Brooch of the Highborne', slot: 'Neck', wowhead_id: 34184 },
        { name: 'Sword Breaker\'s Bulwark', slot: 'Off Hand', wowhead_id: 34185 },
        { name: 'Leggings of the Immortal Night', slot: 'Legs', wowhead_id: 34188 },
        { name: 'Chain Links of the Tumultuous Storm', slot: 'Legs', wowhead_id: 34186 },
        { name: 'Borderland Fortress Grips', slot: 'Hands', wowhead_id: 34352 },
      ],
    },
    {
      name: 'Eredar Twins',
      items: [
        { name: 'Shiv of Exsanguination', slot: 'One-Hand', wowhead_id: 34189 },
        { name: 'Crimson Paragon\'s Cover', slot: 'Head', wowhead_id: 34190 },
        { name: 'Sin\'dorei Pendant of Conquest', slot: 'Neck', wowhead_id: 34193 },
        { name: 'Sin\'dorei Pendant of Salvation', slot: 'Neck', wowhead_id: 34191 },
        { name: 'Sin\'dorei Pendant of Triumph', slot: 'Neck', wowhead_id: 34192 },
        { name: 'Grip of Mannoroth', slot: 'Hands', wowhead_id: 34206 },
        { name: 'Shroud of Redeemed Souls', slot: 'Back', wowhead_id: 34209 },
        { name: 'Sunflare', slot: 'Main Hand', wowhead_id: 34199 },
        { name: 'Book of Highborne Hymns', slot: 'Held In Off-hand', wowhead_id: 34204 },
        { name: 'Equilibrium Epaulets', slot: 'Shoulder', wowhead_id: 34202 },
        { name: 'Spaulders of Reclamation', slot: 'Shoulder', wowhead_id: 34208 },
        { name: 'Belt of the Wastelands', slot: 'Waist', wowhead_id: 34195 },
        { name: 'Golden Bow of Quel\'Thalas', slot: 'Ranged', wowhead_id: 34196 },
      ],
    },
    {
      name: 'M\'uru',
      items: [
        { name: 'Gauntlets of the Soothed Soul', slot: 'Hands', wowhead_id: 34212 },
        { name: 'Mounting Vengeance', slot: 'Waist', wowhead_id: 34210 },
        { name: 'Sin\'dorei Band of Dominance', slot: 'Finger', wowhead_id: 34230 },
        { name: 'Sin\'dorei Band of Salvation', slot: 'Finger', wowhead_id: 34231 },
        { name: 'Sin\'dorei Band of Triumph', slot: 'Finger', wowhead_id: 34229 },
        { name: 'Sunglow Vest', slot: 'Chest', wowhead_id: 34233 },
        { name: 'Shadowed Gauntlets of Paroxysm', slot: 'Hands', wowhead_id: 34214 },
        { name: 'Harness of Carnal Instinct', slot: 'Chest', wowhead_id: 34211 },
        { name: 'Slayer\'s Boots', slot: 'Feet', wowhead_id: 34445 },
        { name: 'Rhythmic Cloak of Change', slot: 'Back', wowhead_id: 34232 },
        // Naaru Sliver Trinkets
        { name: 'Commendation of Kael\'thas', slot: 'Trinket', wowhead_id: 34473 },
        { name: 'Shard of Contempt', slot: 'Trinket', wowhead_id: 34472 },
        { name: 'Vial of the Sunwell', slot: 'Trinket', wowhead_id: 34471 },
        { name: 'Shifting Naaru Sliver', slot: 'Trinket', wowhead_id: 34429 },
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
        { name: 'Thori\'dal, the Stars\' Fury', slot: 'Ranged', wowhead_id: 34334 },
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
