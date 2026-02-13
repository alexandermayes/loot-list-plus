#!/usr/bin/env node

/**
 * Applies verified corrections to item-types.ts based on Wowhead data.
 * Run generate-corrected-items.mjs first to verify the corrections.
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'

const filePath = fileURLToPath(new URL('../data/item-types.ts', import.meta.url))
let content = readFileSync(filePath, 'utf8')

// TYPE CORRECTIONS: { id, oldField, oldValue, newField, newValue, newComment }
// These correct the armor_type or weapon_type based on actual Wowhead data
const typeCorrections = [
  // Karazhan
  { id: 28519, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Mail' },
  { id: 28520, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Mail' },
  { id: 28583, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Mail' },
  { id: 28612, oldField: 'armor_type', oldValue: 'Plate', newField: 'armor_type', newValue: 'Cloth' },
  { id: 28656, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Mail' },
  { id: 28735, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Mail' },
  { id: 28743, oldField: 'armor_type', oldValue: 'Cloth', newField: 'armor_type', newValue: 'Plate' },
  { id: 28610, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Mail' },
  // Gruul's Lair
  { id: 28801, oldField: 'armor_type', oldValue: 'Plate', newField: 'armor_type', newValue: 'Mail' },
  { id: 28828, oldField: 'armor_type', oldValue: 'Mail', newField: 'armor_type', newValue: 'Leather' },
  // Magtheridon's Lair
  { id: 28779, oldField: 'armor_type', oldValue: 'Mail', newField: 'armor_type', newValue: 'Plate' },
  { id: 28778, oldField: 'armor_type', oldValue: 'Plate', newField: 'armor_type', newValue: 'Mail' },
  // SSC
  { id: 30047, oldField: 'armor_type', oldValue: 'Plate', newField: 'armor_type', newValue: 'Mail' },
  { id: 30050, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Cloth' },
  { id: 30053, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Plate' },
  { id: 30055, oldField: 'armor_type', oldValue: 'Cloth', newField: 'armor_type', newValue: 'Leather' },
  { id: 30097, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Mail' },
  { id: 30079, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Cloth' },
  { id: 30102, oldField: 'armor_type', oldValue: 'Mail', newField: 'armor_type', newValue: 'Plate' },
  { id: 30104, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Mail' },
  // TK - Al'ar
  { id: 29947, oldField: 'armor_type', oldValue: 'Mail', newField: 'armor_type', newValue: 'Leather' },
  // TK - Void Reaver
  { id: 29986, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Cloth' },
  { id: 29988, oldField: 'weapon_type', oldValue: 'One-Handed Mace', newField: 'weapon_type', newValue: 'Staff' },
  { id: 29990, oldField: 'weapon_type', oldValue: 'One-Handed Sword', newField: 'armor_type', newValue: 'Cloth' },
  { id: 29991, oldField: 'weapon_type', oldValue: 'One-Handed Sword', newField: 'armor_type', newValue: 'Mail' },
  // TK - Solarian
  { id: 29964, oldField: 'armor_type', oldValue: 'Cloth', newField: 'armor_type', newValue: 'Leather' },
  { id: 29965, oldField: 'armor_type', oldValue: 'Mail', newField: 'armor_type', newValue: 'Plate' },
  { id: 29966, oldField: 'armor_type', oldValue: 'Plate', newField: 'armor_type', newValue: 'Leather' },
  { id: 29972, oldField: 'armor_type', oldValue: 'Plate', newField: 'armor_type', newValue: 'Cloth' },
  { id: 29973, oldField: 'armor_type', oldValue: 'Cloth', newField: 'armor_type', newValue: 'Leather' },
  { id: 29975, oldField: 'armor_type', oldValue: 'Plate', newField: 'armor_type', newValue: 'Mail' },
  // TK - Kael'thas
  { id: 30016, oldField: 'armor_type', oldValue: 'Mail', newField: 'armor_type', newValue: 'Plate' },
  { id: 30020, oldField: 'armor_type', oldValue: 'Plate', newField: 'armor_type', newValue: 'Cloth' },
  { id: 30021, oldField: 'armor_type', oldValue: 'Leather', newField: 'weapon_type', newValue: 'Staff' },
  { id: 30032, oldField: 'weapon_type', oldValue: 'Bow', newField: 'armor_type', newValue: 'Plate' },
  // Hyjal - Rage Winterchill
  { id: 30863, oldField: 'armor_type', oldValue: 'Cloth', newField: 'armor_type', newValue: 'Leather' },
  { id: 30868, oldField: 'armor_type', oldValue: 'Cloth', newField: 'armor_type', newValue: 'Leather' },
  { id: 30864, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Mail' },
  { id: 30869, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Mail' },
  { id: 30865, oldField: 'weapon_type', oldValue: 'One-Handed Sword', newField: 'weapon_type', newValue: 'Dagger' },
  { id: 30870, oldField: 'armor_type', oldValue: 'Mail', newField: 'armor_type', newValue: 'Cloth' },
  { id: 30871, oldField: 'armor_type', oldValue: 'Plate', newField: 'armor_type', newValue: 'Cloth' },
  // Hyjal - Anetheron
  { id: 30878, oldField: 'armor_type', oldValue: 'Cloth', newField: 'armor_type', newValue: 'Plate' },
  { id: 30882, oldField: 'weapon_type', oldValue: 'Two-Handed Sword', newField: 'weapon_type', newValue: 'Shield' },
  { id: 30884, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Cloth' },
  { id: 30885, oldField: 'armor_type', oldValue: 'Mail', newField: 'armor_type', newValue: 'Cloth' },
  { id: 30886, oldField: 'armor_type', oldValue: 'Plate', newField: 'armor_type', newValue: 'Leather' },
  { id: 30887, oldField: 'armor_type', oldValue: 'Cloth', newField: 'armor_type', newValue: 'Mail' },
  { id: 30888, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Cloth' },
  // Hyjal - Kaz'rogal
  { id: 30889, oldField: 'armor_type', oldValue: 'Cloth', newField: 'weapon_type', newValue: 'Shield' },
  { id: 30891, oldField: 'armor_type', oldValue: 'Mail', newField: 'armor_type', newValue: 'Leather' },
  { id: 30892, oldField: 'armor_type', oldValue: 'Plate', newField: 'armor_type', newValue: 'Mail' },
  { id: 30893, oldField: 'armor_type', oldValue: 'Cloth', newField: 'armor_type', newValue: 'Mail' },
  { id: 30894, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Cloth' },
  { id: 30895, oldField: 'armor_type', oldValue: 'Mail', newField: 'armor_type', newValue: 'Cloth' },
  // Hyjal - Azgalor
  { id: 30897, oldField: 'armor_type', oldValue: 'Cloth', newField: 'armor_type', newValue: 'Plate' },
  { id: 30899, oldField: 'armor_type', oldValue: 'Mail', newField: 'armor_type', newValue: 'Leather' },
  { id: 30900, oldField: 'armor_type', oldValue: 'Plate', newField: 'armor_type', newValue: 'Mail' },
  // Hyjal - Archimonde
  { id: 30903, oldField: 'armor_type', oldValue: 'Cloth', newField: 'armor_type', newValue: 'Plate' },
  { id: 30904, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Plate' },
  { id: 30905, oldField: 'armor_type', oldValue: 'Mail', newField: 'armor_type', newValue: 'Leather' },
  { id: 30907, oldField: 'armor_type', oldValue: 'Cloth', newField: 'armor_type', newValue: 'Mail' },
  { id: 30909, oldField: 'armor_type', oldValue: 'Mail', newField: 'weapon_type', newValue: 'Shield' },
  { id: 30912, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Cloth' },
  { id: 30914, oldField: 'armor_type', oldValue: 'Cloth', newField: 'armor_type', newValue: 'Leather' },
  // Black Temple
  { id: 32237, oldField: 'weapon_type', oldValue: 'One-Handed Mace', newField: 'weapon_type', newValue: 'Dagger' },
  { id: 32234, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Mail' },
  { id: 32243, oldField: 'armor_type', oldValue: 'Cloth', newField: 'armor_type', newValue: 'Plate' },
  { id: 32280, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Plate' },
  { id: 32278, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Plate' },
  { id: 32264, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Mail' },
  { id: 32276, oldField: 'armor_type', oldValue: 'Cloth', newField: 'armor_type', newValue: 'Mail' },
  { id: 32328, oldField: 'armor_type', oldValue: 'Plate', newField: 'armor_type', newValue: 'Leather' },
  { id: 32279, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Plate' },
  { id: 32324, oldField: 'armor_type', oldValue: 'Plate', newField: 'armor_type', newValue: 'Leather' },
  { id: 32258, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Mail' },
  { id: 32251, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Mail' },
  { id: 32269, oldField: 'weapon_type', oldValue: 'One-Handed Sword', newField: 'weapon_type', newValue: 'Dagger' },
  { id: 32326, oldField: 'weapon_type', oldValue: 'Two-Handed Axe', newField: 'weapon_type', newValue: 'Thrown' },
  { id: 32346, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Mail' },
  { id: 32354, oldField: 'armor_type', oldValue: 'Cloth', newField: 'armor_type', newValue: 'Plate' },
  { id: 32351, oldField: 'armor_type', oldValue: 'Cloth', newField: 'armor_type', newValue: 'Leather' },
  { id: 32471, oldField: 'weapon_type', oldValue: 'One-Handed Sword', newField: 'weapon_type', newValue: 'Dagger' },
  { id: 32609, oldField: 'armor_type', oldValue: 'Plate', newField: 'armor_type', newValue: 'Cloth' },
  // Sunwell Plateau
  { id: 34167, oldField: 'armor_type', oldValue: 'Cloth', newField: 'armor_type', newValue: 'Plate' },
  { id: 34202, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Cloth' },
  { id: 34168, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Mail' },
  { id: 34208, oldField: 'armor_type', oldValue: 'Cloth', newField: 'armor_type', newValue: 'Mail' },
  { id: 34210, oldField: 'armor_type', oldValue: 'Plate', newField: 'armor_type', newValue: 'Cloth' },
  { id: 34341, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Plate' },
  { id: 34345, oldField: 'armor_type', oldValue: 'Cloth', newField: 'armor_type', newValue: 'Plate' },
  { id: 34331, oldField: 'weapon_type', oldValue: 'Dagger', newField: 'weapon_type', newValue: 'Fist Weapon' },
  { id: 34336, oldField: 'weapon_type', oldValue: 'One-Handed Sword', newField: 'weapon_type', newValue: 'Dagger' },
  { id: 34233, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Cloth' },
  // Zul'Aman
  { id: 30915, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Plate' },
  { id: 30919, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Mail' },
  { id: 30873, oldField: 'armor_type', oldValue: 'Cloth', newField: 'armor_type', newValue: 'Mail' },
  { id: 33286, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Mail' },
  { id: 33479, oldField: 'armor_type', oldValue: 'Plate', newField: 'armor_type', newValue: 'Leather' },
  { id: 33191, oldField: 'armor_type', oldValue: 'Mail', newField: 'armor_type', newValue: 'Plate' },
  { id: 33216, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Plate' },
  { id: 33357, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Cloth' },
  { id: 33327, oldField: 'armor_type', oldValue: 'Cloth', newField: 'armor_type', newValue: 'Plate' },
  { id: 33285, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Cloth' },
  { id: 33215, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Plate' },
  // Classic MC/BWL
  { id: 17074, oldField: 'weapon_type', oldValue: 'Two-Handed Sword', newField: 'weapon_type', newValue: 'Polearm' },
  { id: 18812, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Mail' },
  { id: 18817, oldField: 'armor_type', oldValue: 'Plate', newField: 'armor_type', newValue: 'Mail' },
  { id: 18829, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Mail' },
  { id: 18870, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Mail' },
  { id: 19347, oldField: 'weapon_type', oldValue: 'Fist Weapon', newField: 'weapon_type', newValue: 'Dagger' },
  { id: 19369, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Cloth' },
  { id: 19394, oldField: 'armor_type', oldValue: 'Mail', newField: 'armor_type', newValue: 'Plate' },
  { id: 19400, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Cloth' },
  { id: 19407, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Cloth' },
  { id: 19433, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Mail' },
  // AQ
  { id: 21493, oldField: 'armor_type', oldValue: 'Plate', newField: 'armor_type', newValue: 'Leather' },
  { id: 21494, oldField: 'armor_type', oldValue: 'Cloth', newField: 'armor_type', newValue: 'Leather' },
  { id: 21496, oldField: 'armor_type', oldValue: 'Plate', newField: 'armor_type', newValue: 'Cloth' },
  { id: 21497, oldField: 'armor_type', oldValue: 'Plate', newField: 'armor_type', newValue: 'Mail' },
  { id: 21500, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Cloth' },
  { id: 21503, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Plate' },
  // Hyjal additions
  { id: 29951, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Mail' },
  { id: 30861, oldField: 'armor_type', oldValue: 'Cloth', newField: 'armor_type', newValue: 'Plate' },
  { id: 30862, oldField: 'armor_type', oldValue: 'Cloth', newField: 'armor_type', newValue: 'Plate' },
  // ZG
  { id: 19897, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Cloth' },
  { id: 19899, oldField: 'armor_type', oldValue: 'Mail', newField: 'armor_type', newValue: 'Cloth' },
  { id: 19878, oldField: 'armor_type', oldValue: 'Mail', newField: 'armor_type', newValue: 'Plate' },
  { id: 19895, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Cloth' },
  { id: 19929, oldField: 'armor_type', oldValue: 'Leather', newField: 'armor_type', newValue: 'Cloth' },
]

// NAME-ONLY CORRECTIONS: update the comment to match actual Wowhead name
// These entries have the right wowhead_id but the comment name is wrong
const nameCorrections = [
  // Items where the Wowhead name differs from the comment (actual name for that ID)
  { id: 29985, oldName: 'Pauldrons of the Vanquished Hero', newName: 'Void Reaver Greaves' },
  { id: 29987, oldName: 'Girdle of Fallen Stars', newName: 'Gauntlets of the Sun King' },
  { id: 29989, oldName: 'Warp-Spring Coil', newName: 'Sunshower Light Cloak' },
  { id: 29992, oldName: 'Royal Gauntlets of Silvermoon', newName: 'Royal Cloak of the Sunstriders' },
  { id: 29993, oldName: 'Staff of Disintegration', newName: 'Twinblade of the Phoenix' },
  { id: 29963, oldName: 'Void Star Talisman', newName: 'Enraged Fiery Soul' },
  { id: 29967, oldName: 'Ethereum Life-Staff', newName: 'Nether Vest' },
  { id: 29968, oldName: 'Boots of the Protector', newName: 'Nether Leggings' },
  { id: 29969, oldName: 'Vestments of the Sea-Witch', newName: "Sparky's Discarded Helmet" },
  { id: 29970, oldName: 'Light-Collar of the Incarnate', newName: 'Wildfeather Leggings' },
  { id: 29971, oldName: "Solarian's Sapphire", newName: 'Dragonstrike Leggings' },
  { id: 29974, oldName: 'Greaves of the Penitent Knight', newName: 'Living Crystal Breastplate' },
  { id: 30015, oldName: 'The Nexus Key', newName: "The Sun King's Talisman" },
  { id: 30017, oldName: 'Sunshower Light Cloak', newName: "Telonicus' Pendant of Mayhem" },
  { id: 30019, oldName: 'Twinblade of the Phoenix', newName: "Area 52 Defender's Pants" },
  { id: 30022, oldName: 'Leggings of Murderous Intent', newName: 'Pendant of the Perilous' },
  { id: 30023, oldName: 'Gauntlets of the Sun-King', newName: 'Totem of the Maelstrom' },
  { id: 30027, oldName: 'Royal Cloak of the Sunstriders', newName: 'Boots of Courage Unending' },
  { id: 30028, oldName: 'Devastation', newName: 'Seventh Ring of the Tirisfalen' },
  { id: 30029, oldName: 'Thalassian Wildercloak', newName: 'Bark-Gloves of Ancient Wisdom' },
  { id: 30030, oldName: 'Sunstrider Warboots', newName: 'Girdle of Fallen Stars' },
  { id: 30031, oldName: 'Axe of the Nexus-Kings', newName: 'Red Havoc Boots' },
  { id: 30033, oldName: 'Crown of the Sun', newName: 'Boots of the Protector' },
  { id: 30879, oldName: "Don Rodrigo's Poncho", newName: "Don Alejandro's Money Belt" },
  { id: 30880, oldName: 'Chronicle of Dark Secrets', newName: 'Quickstrider Moccasins' },
  { id: 30883, oldName: 'Enchanted Leather Sandals', newName: 'Pillar of Ferocity' },
  { id: 30890, oldName: 'Boneweave Girdle', newName: 'Collection of Souls' },
  { id: 30911, oldName: 'Syphon of the Nathrezim', newName: 'Scepter of Purification' },
  { id: 32281, oldName: 'Insidious Bands', newName: 'Design: Brilliant Crimson Spinel' },
  { id: 32330, oldName: "Botanist's Gloves of Growth", newName: 'Totem of Ancestral Guidance' },
  { id: 34437, oldName: 'Skyshatter Bracers', newName: 'Skyshatter Bands' },
  { id: 34195, oldName: 'Belt of the Wastelands', newName: 'Shoulderpads of Vehemence' },
  { id: 34206, oldName: 'Grip of Mannoroth', newName: 'Book of Highborne Hymns' },
  { id: 34199, oldName: 'Sunflare', newName: "Archon's Gavel" },
  { id: 34445, oldName: "Slayer's Boots", newName: 'Thunderheart Bracers' },
  { id: 16951, oldName: 'Judgement Bindings', newName: 'Judgment Bindings' },
  { id: 16952, oldName: 'Judgement Belt', newName: 'Judgment Belt' },
  { id: 16953, oldName: 'Judgement Spaulders', newName: 'Judgment Spaulders' },
  { id: 16955, oldName: 'Judgement Crown', newName: 'Judgment Crown' },
  { id: 30236, oldName: 'Leggings of Murderous Intent', newName: 'Chestguard of the Vanquished Champion' },
]

// Also update comments that have correct type but wrong name from type corrections
const typeWithNameCorrections = [
  { id: 28656, newName: 'Girdle of the Prowler' }, // name same, Wowhead confirmed
  { id: 30863, newName: 'Deadly Cuffs' },
  { id: 30871, newName: 'Bracers of Martyrdom' },
  { id: 30886, newName: 'Enchanted Leather Sandals' },
  { id: 30887, newName: 'Golden Links of Restoration' },
  { id: 30889, newName: "Kaz'rogal's Hardened Heart" },
  { id: 30892, newName: "Beast-Tamer's Shoulders" },
  { id: 30893, newName: 'Sun-Touched Chain Leggings' },
  { id: 30899, newName: "Don Rodrigo's Poncho" },
  { id: 30900, newName: 'Bow-Stitched Leggings' },
  { id: 30903, newName: 'Legguards of Endless Rage' },
  { id: 30905, newName: 'Midnight Chestguard' },
  { id: 30909, newName: "Antonidas' Aegis of Rapt Concentration" },
  { id: 30914, newName: 'Belt of the Crescent Moon' },
  { id: 32280, newName: 'Gauntlets of Enforcement' },
  { id: 32328, newName: "Botanist's Gloves of Growth" },
  { id: 32324, newName: 'Insidious Bands' },
  { id: 32326, newName: 'Twisted Blades of Zarak' },
  { id: 34167, newName: 'Legplates of the Holy Juggernaut' },
  { id: 34202, newName: 'Shawl of Wonderment' },
  { id: 34168, newName: 'Starstalker Legguards' },
  { id: 34208, newName: 'Equilibrium Epaulets' },
  { id: 34210, newName: 'Amice of the Convoker' },
  { id: 34233, newName: 'Robes of Faltered Light' },
  { id: 33286, newName: "Mojo-Mender's Mask" },
  { id: 30016, newName: "X-52 Technician's Helm" },
  { id: 30021, newName: 'Wildfury Greatstaff' },
  { id: 30032, newName: 'Red Belt of Battle' },
  { id: 30882, newName: 'Bastion of Light' },
]

let applied = 0
let failed = 0

// Apply type corrections
for (const fix of typeCorrections) {
  // Build regex to find the line
  const oldType = `${fix.oldField}: '${fix.oldValue}'`
  const newType = `${fix.newField}: '${fix.newValue}'`
  const lineRegex = new RegExp(`(\\s+${fix.id}:\\s*\\{\\s*)${fix.oldField}: '${fix.oldValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'(\\s*\\})`)

  if (lineRegex.test(content)) {
    content = content.replace(lineRegex, `$1${fix.newField}: '${fix.newValue}'$2`)
    applied++
  } else {
    console.log(`FAILED to match type fix for ${fix.id}: ${oldType} → ${newType}`)
    failed++
  }
}

// Apply name corrections for type fixes that also have wrong names
for (const fix of typeWithNameCorrections) {
  const lineRegex = new RegExp(`(${fix.id}:.*\\/\\/\\s*)(.+)$`, 'm')
  const match = content.match(lineRegex)
  if (match && match[2].trim() !== fix.newName) {
    content = content.replace(lineRegex, `$1${fix.newName}`)
    applied++
  }
}

// Apply name-only corrections (update comments)
for (const fix of nameCorrections) {
  const escaped = fix.oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const lineRegex = new RegExp(`(${fix.id}:.*\\/\\/\\s*)${escaped}`)

  if (lineRegex.test(content)) {
    content = content.replace(lineRegex, `$1${fix.newName}`)
    applied++
  } else {
    console.log(`FAILED to match name fix for ${fix.id}: "${fix.oldName}" → "${fix.newName}"`)
    failed++
  }
}

writeFileSync(filePath, content, 'utf8')

console.log(`\nDone! Applied ${applied} corrections, ${failed} failures.`)
