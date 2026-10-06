/**
 * Item Type Mappings
 *
 * Maps wowhead_id to armor_type and weapon_type for class proficiency filtering.
 * Sourced from Wowhead and the item data comments in tbc-raids.ts.
 */

import type { ArmorType, WeaponType } from './class-proficiencies'

export interface ItemTypeInfo {
  armor_type?: ArmorType
  weapon_type?: WeaponType
}

/**
 * Item type mappings by wowhead_id
 *
 * armor_type: Cloth | Leather | Mail | Plate (for armor slots)
 * weapon_type: Dagger | One-Handed Sword | Two-Handed Axe | Staff | etc (for weapon slots)
 *
 * Items with no armor or weapon type (tokens, quest items, and recipes such
 * as the GH-284 Classic raid recipes) intentionally have no entry here. For
 * a slot 'Recipe' row the picker (lib/loot-items-query.ts) infers no type
 * and treats the slot as class-agnostic, so every class sees it. A
 * weapon_type entry on a recipe would hide it from classes without that
 * proficiency, because the picker's weapon check runs before the
 * class-agnostic check. Any entry here also fails the package-agreement
 * check in data/__tests__/classic-catalog-completeness.test.ts, since the
 * package attributes no armor or weapon type to a Recipe-class item.
 *
 * Every Classic, TBC and Wrath raid armor piece (an armor slot other than
 * Back) has an entry taken from the wow-classic-items package subclass. The
 * 'Classic raid armor types (#388)' checks in
 * data/__tests__/classic-catalog-completeness.test.ts and the TBC and Wrath
 * checks in data/__tests__/item-types.test.ts fail when one is missing or
 * disagrees with the package, so the picker never falls back to
 * inferArmorType for raid armor from those expansions. Two TBC catalog
 * items in armor slots, Grip of Mannoroth (34203) and Mounting Vengeance
 * (34346), are fist weapons in the item data and have a weapon_type entry.
 */
export const ITEM_TYPES: Record<number, ItemTypeInfo> = {
  // ============================================================================
  // KARAZHAN
  // ============================================================================

  // Servant's Quarters - Waist items (one of each armor type)
  30675: { armor_type: 'Cloth' },    // Lurker's Cord (Cloth)
  30676: { armor_type: 'Leather' },  // Lurker's Grasp (Leather)
  30677: { armor_type: 'Mail' },     // Lurker's Belt (Mail)
  30678: { armor_type: 'Plate' },    // Lurker's Girdle (Plate)

  // Servant's Quarters - Wrist items
  30684: { armor_type: 'Cloth' },    // Ravager's Cuffs (Cloth)
  30685: { armor_type: 'Leather' },  // Ravager's Wrist-Wraps (Leather)
  30686: { armor_type: 'Mail' },     // Ravager's Bands (Mail)
  30687: { armor_type: 'Plate' },    // Ravager's Bracers (Plate)

  // Servant's Quarters - Feet items
  30680: { armor_type: 'Cloth' },    // Glider's Foot-Wraps (Cloth)
  30681: { armor_type: 'Leather' },  // Glider's Boots (Leather)
  30682: { armor_type: 'Mail' },     // Glider's Sabatons (Mail)
  30683: { armor_type: 'Plate' },    // Glider's Greaves (Plate)

  // Attumen the Huntsman - Cloth
  28508: { armor_type: 'Cloth' },    // Gloves of Saintly Blessings
  28507: { armor_type: 'Cloth' },    // Handwraps of Flowing Thought
  28477: { armor_type: 'Cloth' },    // Harbinger Bands

  // Attumen - Leather
  28506: { armor_type: 'Leather' },  // Gloves of Dexterous Manipulation
  28453: { armor_type: 'Leather' },  // Bracers of the White Stag

  // Attumen - Mail
  28503: { armor_type: 'Mail' },     // Whirlwind Bracers
  28454: { armor_type: 'Mail' },     // Stalker's War Bands

  // Attumen - Plate
  28505: { armor_type: 'Plate' },    // Gauntlets of Renewed Hope
  28502: { armor_type: 'Plate' },    // Vambraces of Courage

  // Attumen - Ranged
  28504: { weapon_type: 'Crossbow' }, // Steelhawk Crossbow

  // Moroes
  28524: { weapon_type: 'Dagger' },   // Emerald Ripper
  28545: { armor_type: 'Leather' },   // Edgewalker Longboots
  28565: { armor_type: 'Cloth' },     // Nethershard Girdle
  28566: { armor_type: 'Plate' },     // Crimson Girdle of the Indomitable
  28567: { armor_type: 'Mail' },      // Belt of Gale Force
  28569: { armor_type: 'Plate' },     // Boots of Valiance

  // Maiden of Virtue
  28511: { armor_type: 'Cloth' },     // Bands of Indwelling
  28512: { armor_type: 'Plate' },     // Bracers of Justice
  28514: { armor_type: 'Leather' },   // Bracers of Maliciousness
  28515: { armor_type: 'Cloth' },     // Bands of Nefarious Deeds
  28517: { armor_type: 'Cloth' },     // Boots of Foretelling
  28518: { armor_type: 'Plate' },     // Iron Gauntlets of the Maiden
  28519: { armor_type: 'Mail' },   // Gloves of Quickening
  28520: { armor_type: 'Mail' },   // Gloves of Centering
  28521: { armor_type: 'Leather' },   // Mitts of the Treemender
  28522: { weapon_type: 'One-Handed Mace' }, // Shard of the Virtuous

  // Opera Event
  28572: { weapon_type: 'Dagger' },           // Blade of the Unrequited
  28573: { weapon_type: 'Two-Handed Sword' }, // Despair
  28578: { armor_type: 'Cloth' },             // Masquerade Gown
  28583: { armor_type: 'Mail' },           // Big Bad Wolf's Head
  28581: { weapon_type: 'Gun' },              // Wolfslayer Sniper Rifle
  28584: { weapon_type: 'Fist Weapon' },      // Big Bad Wolf's Paw
  28585: { armor_type: 'Cloth' },             // Ruby Slippers
  28586: { armor_type: 'Cloth' },             // Wicked Witch's Hat
  28588: { weapon_type: 'Wand' },             // Blue Diamond Witchwand
  28587: { weapon_type: 'Two-Handed Axe' },            // Legacy

  // The Curator
  28612: { armor_type: 'Cloth' },             // Pauldrons of the Solace-Giver
  28621: { armor_type: 'Plate' },             // Wrynn Dynasty Greaves
  28633: { weapon_type: 'Staff' },            // Staff of Infinite Mysteries
  28631: { armor_type: 'Mail' },              // Dragon-Quake Shoulderguards
  28647: { armor_type: 'Leather' },           // Forest Wind Shoulderpads

  // Terestian Illhoof
  28658: { weapon_type: 'Staff' },            // Terestian's Stranglestaff
  28652: { armor_type: 'Cloth' },             // Cincture of Will
  28654: { armor_type: 'Cloth' },             // Malefic Girdle
  28655: { armor_type: 'Leather' },           // Cord of Nature's Sustenance
  28657: { weapon_type: 'One-Handed Mace' },  // Fool's Bane
  28656: { armor_type: 'Mail' },           // Girdle of the Prowler
  28662: { armor_type: 'Plate' },             // Breastplate of the Lightbinder

  // Shade of Aran
  28663: { armor_type: 'Cloth' },             // Boots of the Incorrupt
  28666: { armor_type: 'Plate' },             // Pauldrons of the Justice-Seeker
  28673: { weapon_type: 'Wand' },             // Tirisfal Wand of Ascendancy
  28670: { armor_type: 'Cloth' },             // Boots of the Infernal Coven
  28669: { armor_type: 'Leather' },           // Rapscallion Boots
  28671: { armor_type: 'Mail' },              // Steelspine Faceguard
  28726: { armor_type: 'Cloth' },             // Mantle of the Mind Flayer

  // Netherspite
  28732: { armor_type: 'Leather' },           // Cowl of Defiance
  28729: { weapon_type: 'One-Handed Sword' }, // Spiteblade
  28735: { armor_type: 'Mail' },           // Earthblood Chestguard
  28733: { armor_type: 'Plate' },             // Girdle of Truth
  28741: { armor_type: 'Leather' },           // Skulker's Greaves
  28740: { armor_type: 'Mail' },              // Rip-Flayer Leggings
  28743: { armor_type: 'Plate' },             // Mantle of Abrahmis
  28742: { armor_type: 'Cloth' },             // Pantaloons of Repentance
  28744: { armor_type: 'Cloth' },             // Uni-Mind Headdress

  // Chess Event
  28756: { armor_type: 'Cloth' },             // Headdress of the High Potentate
  28755: { armor_type: 'Leather' },           // Bladed Shoulderpads of the Merciless
  28752: { armor_type: 'Leather' },           // Forestlord Striders
  28750: { armor_type: 'Leather' },           // Girdle of Treachery
  28746: { armor_type: 'Mail' },              // Fiend Slayer Boots
  28751: { armor_type: 'Mail' },              // Heart-Flame Leggings
  28748: { armor_type: 'Plate' },             // Legplates of the Innocent
  28747: { armor_type: 'Plate' },             // Battlescar Boots
  28749: { weapon_type: 'One-Handed Sword' }, // King's Defender

  // Prince Malchezaar
  28770: { weapon_type: 'Dagger' },           // Nathrezim Mindblade
  28771: { weapon_type: 'One-Handed Mace' },  // Light's Justice
  28768: { weapon_type: 'Dagger' },           // Malchazeen
  28767: { weapon_type: 'One-Handed Axe' },   // The Decapitator
  28772: { weapon_type: 'Bow' },              // Sunfury Bow of the Phoenix
  28773: { weapon_type: 'Two-Handed Axe' },   // Gorehowl

  // Nightbane
  28599: { armor_type: 'Mail' },              // Scaled Breastplate of Carnage
  28597: { armor_type: 'Plate' },             // Panzar'Thar Breastplate
  28601: { armor_type: 'Leather' },           // Chestguard of the Conniver
  28600: { armor_type: 'Leather' },           // Stonebough Jerkin
  28602: { armor_type: 'Cloth' },             // Robe of the Elder Scribes
  28604: { weapon_type: 'Staff' },            // Nightstaff of the Everliving
  28608: { armor_type: 'Plate' },             // Ironstriders of Urgency
  28610: { armor_type: 'Mail' },           // Ferocious Swift-Kickers

  // ============================================================================
  // GRUUL'S LAIR
  // ============================================================================

  // High King Maulgar
  28795: { armor_type: 'Plate' },             // Bladespire Warbands
  28796: { armor_type: 'Leather' },           // Malefic Mask of the Shadows
  28799: { armor_type: 'Cloth' },             // Belt of Divine Inspiration
  28800: { weapon_type: 'Two-Handed Mace' },  // Hammer of the Naaru
  28801: { armor_type: 'Mail' },             // Maulgar's Warhelm

  // Gruul the Dragonkiller
  28794: { weapon_type: 'Two-Handed Axe' },   // Axe of the Gronn Lords
  28802: { weapon_type: 'One-Handed Sword' }, // Bloodmaw Magus-Blade
  28804: { armor_type: 'Cloth' },             // Collar of Cho'gall
  28803: { armor_type: 'Leather' },           // Cowl of Nature's Breath
  28810: { armor_type: 'Mail' },              // Windshear Boots
  28824: { armor_type: 'Plate' },             // Gauntlets of Martial Perfection
  28827: { armor_type: 'Mail' },              // Gauntlets of the Dragonslayer
  28828: { armor_type: 'Leather' },              // Gronn-Stitched Girdle

  // ============================================================================
  // MAGTHERIDON'S LAIR
  // ============================================================================

  // Magtheridon
  28774: { weapon_type: 'Polearm' },          // Glaive of the Pit
  28775: { armor_type: 'Plate' },             // Thundering Greathelm
  28776: { armor_type: 'Leather' },           // Liar's Tongue Gloves
  28779: { armor_type: 'Plate' },              // Girdle of the Endless Pit
  28780: { armor_type: 'Cloth' },             // Soul-Eater's Handwraps
  28782: { weapon_type: 'Staff' },            // Crystalheart Pulse-Staff
  28778: { armor_type: 'Mail' },             // Terror Pit Girdle
  28783: { weapon_type: 'Wand' },             // Eredar Wand of Obliteration
  29458: { weapon_type: 'Shield' },           // Aegis of the Vindicator

  // TBC Shields (Karazhan)
  28754: { weapon_type: 'Shield' },           // Triptych Shield of the Ancients (Nightbane)
  28606: { weapon_type: 'Shield' },           // Shield of Impenetrable Darkness (Nightbane)
  28825: { weapon_type: 'Shield' },           // Aldori Legacy Defender (The Curator)

  // ============================================================================
  // SERPENTSHRINE CAVERN
  // ============================================================================

  // Hydross the Unstable
  30047: { armor_type: 'Mail' },             // Blackfathom Warbands
  30048: { armor_type: 'Plate' },             // Brighthelm of Justice
  30054: { armor_type: 'Mail' },              // Ranger-General's Chestguard
  30050: { armor_type: 'Cloth' },           // Boots of the Shifting Nightmare
  30056: { armor_type: 'Cloth' },             // Robe of Hateful Echoes
  30053: { armor_type: 'Plate' },           // Pauldrons of the Wardancer
  30055: { armor_type: 'Leather' },             // Shoulderpads of the Stranger
  32516: { armor_type: 'Cloth' },             // Wraps of Purification

  // The Lurker Below
  30057: { armor_type: 'Plate' },             // Bracers of Eradication
  30058: { weapon_type: 'One-Handed Mace' },  // Mallet of the Tides
  30060: { armor_type: 'Leather' },           // Boots of Effortless Striking
  30062: { armor_type: 'Leather' },           // Grove-Bands of Remulos
  30064: { armor_type: 'Cloth' },             // Cord of Screaming Terrors
  30065: { armor_type: 'Plate' },             // Glowing Breastplate of Truth
  30066: { armor_type: 'Mail' },              // Tempest-Strider Boots
  30067: { armor_type: 'Cloth' },             // Velvet Boots of the Guardian

  // Leotheras the Blind
  30096: { armor_type: 'Plate' },             // Girdle of the Invulnerable
  30091: { armor_type: 'Mail' },              // True-Aim Stalker Bands
  30092: { armor_type: 'Leather' },           // Orca-Hide Boots
  30095: { weapon_type: 'One-Handed Sword' },           // Fang of the Leviathan
  30097: { armor_type: 'Mail' },           // Coral-Barbed Shoulderpads

  // Fathom-Lord Karathress
  30090: { weapon_type: 'Two-Handed Mace' },  // World Breaker
  30100: { armor_type: 'Cloth' },             // Soul-Strider Boots
  30101: { armor_type: 'Leather' },           // Bloodsea Brigand's Vest

  // Morogrim Tidewalker
  30068: { armor_type: 'Mail' },              // Girdle of the Tidal Call
  30079: { armor_type: 'Cloth' },           // Illidari Shoulderpads
  30075: { armor_type: 'Leather' },           // Gnarled Chestpiece of the Ancients
  30080: { weapon_type: 'Wand' },             // Luminescent Rod of the Naaru
  30081: { armor_type: 'Plate' },             // Warboots of Obliteration
  30082: { weapon_type: 'One-Handed Sword' },           // Talon of Azshara
  30084: { armor_type: 'Plate' },             // Pauldrons of the Argent Sentinel
  30085: { armor_type: 'Mail' },              // Mantle of the Tireless Tracker

  // Lady Vashj
  30102: { armor_type: 'Plate' },              // Krakken-Heart Breastplate
  30104: { armor_type: 'Mail' },           // Cobra-Lash Boots
  30103: { weapon_type: 'Dagger' },           // Fang of Vashj
  30105: { weapon_type: 'Bow' },              // Serpent Spine Longbow
  30106: { armor_type: 'Leather' },           // Belt of One-Hundred Deaths
  30107: { armor_type: 'Cloth' },             // Vestments of the Sea-Witch
  30108: { weapon_type: 'One-Handed Mace' },  // Lightfathom Scepter
  30111: { armor_type: 'Leather' },           // Runetotem's Mantle
  30112: { armor_type: 'Plate' },             // Glorious Gauntlets of Crestfall

  // ============================================================================
  // TEMPEST KEEP: THE EYE
  // ============================================================================

  // Al'ar
  29918: { armor_type: 'Cloth' },             // Mindstorm Wristbands
  29921: { armor_type: 'Mail' },              // Fire Crest Breastplate
  29924: { weapon_type: 'One-Handed Axe' },   // Netherbane
  29947: { armor_type: 'Leather' },              // Gloves of the Searing Grip
  29949: { weapon_type: 'Gun' },              // Arcanite Steam-Pistol
  32944: { weapon_type: 'Fist Weapon' },      // Talon of the Phoenix

  // Void Reaver
  29983: { armor_type: 'Plate' },             // Fel-Steel Warhelm
  29984: { armor_type: 'Leather' },           // Girdle of Zaetar
  29985: { armor_type: 'Mail' },              // Void Reaver Greaves
  29986: { armor_type: 'Cloth' },           // Cowl of the Grand Engineer
  29987: { armor_type: 'Cloth' },             // Gauntlets of the Sun King
  29988: { weapon_type: 'Staff' },             // The Nexus Key
  // 29989: Sunshower Light Cloak (Back slot, class-agnostic — no type needed)
  29990: { armor_type: 'Cloth' },              // Crown of the Sun
  29991: { armor_type: 'Mail' },               // Sunhawk Leggings
  // 29992: Royal Cloak of the Sunstriders (Back slot, class-agnostic — no type needed)
  29993: { weapon_type: 'Two-Handed Sword' },  // Twinblade of the Phoenix

  // High Astromancer Solarian
  29962: { weapon_type: 'Dagger' },           // Heartrazor
  29963: { armor_type: 'Leather' },           // Enraged Fiery Soul
  29964: { armor_type: 'Leather' },             // Blackstorm Leggings
  29965: { armor_type: 'Plate' },              // Girdle of the Righteous Path
  29966: { armor_type: 'Leather' },             // Vambraces of Ending
  29967: { armor_type: 'Leather' },           // Nether Vest
  29968: { armor_type: 'Mail' },              // Nether Leggings
  29969: { armor_type: 'Plate' },             // Sparky's Discarded Helmet
  29970: { armor_type: 'Leather' },           // Wildfeather Leggings
  29971: { armor_type: 'Mail' },              // Dragonstrike Leggings
  29972: { armor_type: 'Cloth' },             // Trousers of the Astromancer
  29973: { armor_type: 'Leather' },             // Primalstorm Breastplate
  29974: { armor_type: 'Leather' },           // Living Crystal Breastplate
  29975: { armor_type: 'Mail' },             // Golden Dragonstrike Breastplate

  // Kael'thas Sunstrider
  30015: { armor_type: 'Cloth' },             // The Sun King's Talisman
  30016: { armor_type: 'Plate' },              // X-52 Technician's Helm
  30017: { armor_type: 'Plate' },             // Telonicus' Pendant of Mayhem
  30018: { armor_type: 'Leather' },           // Lord Sanguinar's Claim
  30019: { armor_type: 'Mail' },              // Area 52 Defender's Pants
  30020: { armor_type: 'Cloth' },             // Fire-Cord of the Magus
  30021: { weapon_type: 'Staff' },           // Wildfury Greatstaff
  30024: { armor_type: 'Cloth' },             // Mantle of the Elven Kings
  30027: { armor_type: 'Plate' },             // Boots of Courage Unending
  // 30028: Seventh Ring of the Tirisfalen — removed (class-agnostic slot, no type needed)
  30029: { armor_type: 'Leather' },           // Bark-Gloves of Ancient Wisdom
  30030: { armor_type: 'Mail' },              // Girdle of Fallen Stars
  30031: { armor_type: 'Plate' },             // Red Havoc Boots
  30032: { armor_type: 'Plate' },              // Red Belt of Battle
  30033: { armor_type: 'Plate' },             // Boots of the Protector

  // ============================================================================
  // HYJAL SUMMIT
  // ============================================================================

  // Rage Winterchill
  30863: { armor_type: 'Leather' },             // Deadly Cuffs
  30868: { armor_type: 'Leather' },             // Rejuvenating Bracers
  30864: { armor_type: 'Mail' },           // Bracers of the Pathfinder
  30869: { armor_type: 'Mail' },           // Howling Wind Bracers
  30865: { weapon_type: 'Dagger' }, // Tracker's Blade
  30870: { armor_type: 'Cloth' },              // Cuffs of Devastation
  30866: { armor_type: 'Plate' },             // Blood-stained Pauldrons
  30871: { armor_type: 'Cloth' },             // Bracers of Martyrdom

  // Anetheron
  30878: { armor_type: 'Plate' },             // Glimmering Steel Mantle
  30879: { armor_type: 'Leather' },           // Don Alejandro's Money Belt
  30880: { armor_type: 'Mail' },              // Quickstrider Moccasins
  30881: { weapon_type: 'One-Handed Sword' }, // Blade of Infamy
  30882: { weapon_type: 'Shield' }, // Bastion of Light
  30883: { weapon_type: 'Staff' },            // Pillar of Ferocity
  30884: { armor_type: 'Cloth' },           // Hatefury Mantle
  30885: { armor_type: 'Cloth' },              // Archbishop's Slippers
  30886: { armor_type: 'Leather' },             // Enchanted Leather Sandals
  30887: { armor_type: 'Mail' },             // Golden Links of Restoration
  30888: { armor_type: 'Cloth' },           // Anetheron's Noose

  // Kaz'rogal
  30889: { weapon_type: 'Shield' },             // Kaz'rogal's Hardened Heart
  30890: { armor_type: 'Leather' },           // Collection of Souls
  30891: { armor_type: 'Leather' },              // Black Featherlight Boots
  30892: { armor_type: 'Mail' },             // Beast-Tamer's Shoulders
  30893: { armor_type: 'Mail' },             // Sun-Touched Chain Leggings
  30894: { armor_type: 'Cloth' },           // Blue Suede Shoes
  30895: { armor_type: 'Cloth' },              // Angelista's Sash
  30896: { armor_type: 'Plate' },             // Glory of the Defender

  // Azgalor
  30897: { armor_type: 'Plate' },             // Girdle of Hope
  30898: { armor_type: 'Leather' },           // Shady Dealer's Pantaloons
  30899: { armor_type: 'Leather' },              // Don Rodrigo's Poncho
  30900: { armor_type: 'Mail' },             // Bow-Stitched Leggings
  30901: { weapon_type: 'Dagger' },           // Boundless Agony
  30902: { weapon_type: 'Two-Handed Sword' }, // Cataclysm's Edge

  // Archimonde
  30903: { armor_type: 'Plate' },             // Legguards of Endless Rage
  30904: { armor_type: 'Plate' },           // Savior's Grasp
  30905: { armor_type: 'Leather' },              // Midnight Chestguard
  30906: { weapon_type: 'Bow' },              // Bristleblitz Striker
  30907: { armor_type: 'Mail' },             // Mail of Fevered Pursuit
  30908: { weapon_type: 'Staff' },            // Apostle of Argus
  30909: { weapon_type: 'Shield' },              // Antonidas' Aegis of Rapt Concentration
  30910: { weapon_type: 'One-Handed Sword' },      // Tempest of Chaos
  // 30911: Scepter of Purification — removed (class-agnostic slot, no type needed)
  30912: { armor_type: 'Cloth' },           // Leggings of Eternity (duplicate)
  30913: { armor_type: 'Cloth' },             // Robes of Rhonin
  30914: { armor_type: 'Leather' },             // Belt of the Crescent Moon

  // ============================================================================
  // BLACK TEMPLE
  // ============================================================================

  32515: { armor_type: 'Plate' },             // Wristguards of Determination
  32267: { armor_type: 'Plate' },             // Boots of the Resilient
  32237: { weapon_type: 'Dagger' },  // The Maelstrom's Fury
  32234: { armor_type: 'Mail' },           // Fists of Mukoa
  32241: { armor_type: 'Mail' },              // Helm of Soothing Currents
  32239: { armor_type: 'Cloth' },             // Slippers of the Seacaller
  32232: { armor_type: 'Plate' },             // Eternium Shell Bracers
  32236: { weapon_type: 'One-Handed Axe' },  // Rising Tide
  32242: { armor_type: 'Mail' },              // Boots of Oceanic Fury
  32265: { armor_type: 'Leather' },           // Shadow-walker's Cord
  32338: { armor_type: 'Cloth' },             // Blood-cursed Shoulderpads
  32340: { armor_type: 'Cloth' },             // Garments of Temperance
  32252: { armor_type: 'Leather' },           // Nether Shadow Tunic
  32268: { armor_type: 'Plate' },             // Myrmidon's Treads
  32243: { armor_type: 'Plate' },             // Pearl Inlaid Boots
  32280: { armor_type: 'Plate' },           // Gauntlets of Enforcement
  32278: { armor_type: 'Plate' },           // Grips of Silent Justice
  32263: { armor_type: 'Plate' },             // Praetorian's Legguards
  32377: { armor_type: 'Leather' },           // Mantle of Darkness
  32250: { armor_type: 'Plate' },             // Pauldrons of Abyssal Fury
  32264: { armor_type: 'Mail' },           // Shoulders of the Hidden Predator
  32276: { armor_type: 'Mail' },             // Flashfire Girdle
  32333: { armor_type: 'Plate' },             // Girdle of Stability
  32328: { armor_type: 'Leather' },             // Botanist's Gloves of Growth
  32259: { armor_type: 'Mail' },              // Bands of the Coming Storm
  32270: { armor_type: 'Cloth' },             // Focused Mana Bindings
  32281: { armor_type: 'Leather' },           // Design: Brilliant Crimson Spinel
  32279: { armor_type: 'Plate' },           // The Seeker's Wristguards
  32253: { weapon_type: 'Crossbow' },         // Legionkiller
  32240: { armor_type: 'Leather' },           // Guise of the Tidal Lurker
  32271: { armor_type: 'Leather' },           // Kilt of Immortal Nature
  32273: { armor_type: 'Cloth' },             // Amice of Brilliant Light
  32324: { armor_type: 'Leather' },             // Insidious Bands
  32258: { armor_type: 'Mail' },           // Naturalist's Preserving Cinch
  32251: { armor_type: 'Mail' },           // Wraps of Precise Flight
  32513: { armor_type: 'Cloth' },             // Wristbands of Divine Influence
  32262: { weapon_type: 'One-Handed Mace' }, // Syphon of the Nathrezim
  32256: { armor_type: 'Cloth' },             // Waistwrap of Infinity
  32248: { weapon_type: 'Polearm' },          // Halberd of Desolation
  32269: { weapon_type: 'Dagger' }, // Messenger of Fate
  28826: { weapon_type: 'Thrown' },            // Shuriken of Negation
  30025: { weapon_type: 'Thrown' },            // Serpentshrine Shuriken
  32326: { weapon_type: 'Thrown' },            // Twisted Blades of Zarak
  32325: { weapon_type: 'Gun' },               // Rifle of the Stoic Guardian
  32254: { weapon_type: 'One-Handed Axe' },   // The Brutalizer
  32345: { armor_type: 'Plate' },             // Dreadboots of the Legion
  32352: { armor_type: 'Leather' },           // Naturewarden's Treads
  32353: { armor_type: 'Cloth' },             // Gloves of Unfailing Faith
  32347: { armor_type: 'Leather' },           // Grips of Damnation
  32373: { armor_type: 'Plate' },             // Helm of the Illidari Shatterer
  32367: { armor_type: 'Cloth' },             // Leggings of Devastation
  32341: { armor_type: 'Plate' },             // Leggings of Divine Retribution
  32517: { armor_type: 'Mail' },              // The Wavemender's Mantle
  32519: { armor_type: 'Cloth' },             // Belt of Divine Guidance
  32339: { armor_type: 'Leather' },           // Belt of Primal Majesty
  32346: { armor_type: 'Mail' },           // Boneweave Girdle
  32342: { armor_type: 'Plate' },             // Girdle of Mighty Resolve
  32354: { armor_type: 'Plate' },             // Crown of Empowered Fate
  32351: { armor_type: 'Leather' },             // Elunite Empowered Bracers
  32366: { armor_type: 'Leather' },           // Shadowmaster's Boots
  32471: { weapon_type: 'Dagger' }, // Shard of Azzinoth
  32332: { weapon_type: 'Two-Handed Mace' },  // Torch of the Damned
  32235: { armor_type: 'Leather' },           // Cursed Vision of Sargeras
  32376: { armor_type: 'Mail' },              // Forest Prowler's Helm
  32363: { weapon_type: 'Wand' },             // Naaru-Blessed Life Rod
  32609: { armor_type: 'Cloth' },             // Boots of the Divine Light
  32837: { weapon_type: 'One-Handed Sword' }, // Warglaive of Azzinoth (Main Hand)
  32838: { weapon_type: 'One-Handed Sword' }, // Warglaive of Azzinoth (Off Hand)
  32500: { weapon_type: 'One-Handed Mace' },  // Crystal Spire of Karabor

  // ============================================================================
  // SUNWELL PLATEAU
  // ============================================================================

  34437: { armor_type: 'Mail' },              // Skyshatter Bands
  34195: { armor_type: 'Leather' },           // Shoulderpads of Vehemence
  34352: { armor_type: 'Plate' },             // Borderland Fortress Grips
  34181: { armor_type: 'Cloth' },             // Leggings of Calamity
  34167: { armor_type: 'Plate' },             // Legplates of the Holy Juggernaut
  34202: { armor_type: 'Cloth' },           // Shawl of Wonderment
  34168: { armor_type: 'Mail' },           // Starstalker Legguards
  34208: { armor_type: 'Mail' },             // Equilibrium Epaulets
  34190: { armor_type: 'Cloth' },             // Crimson Paragon's Cover
  34165: { weapon_type: 'Dagger' },           // Fang of Kalecgos
  34210: { armor_type: 'Cloth' },             // Amice of the Convoker
  34176: { weapon_type: 'One-Handed Mace' },  // Reign of Misery
  34188: { armor_type: 'Leather' },           // Leggings of the Immortal Night
  34199: { weapon_type: 'One-Handed Mace' }, // Archon's Gavel
  34341: { armor_type: 'Plate' },           // Borderland Paingrips
  34344: { armor_type: 'Cloth' },             // Handguards of Defiled Worlds
  34340: { armor_type: 'Cloth' },             // Dark Conjuror's Collar
  34342: { armor_type: 'Cloth' },             // Handguards of the Dawn
  34333: { armor_type: 'Mail' },              // Coif of Alleria
  34245: { armor_type: 'Leather' },           // Cover of Ursol the Wise
  34345: { armor_type: 'Plate' },             // Crown of Anasterian
  34244: { armor_type: 'Leather' },           // Duplicitous Guise
  34243: { armor_type: 'Plate' },             // Helm of Burning Righteousness
  34329: { weapon_type: 'Dagger' },           // Crux of the Apocalypse
  34247: { weapon_type: 'Two-Handed Sword' }, // Apolyon, the Soul-Render
  34331: { weapon_type: 'Fist Weapon' },           // Hand of the Deceiver
  34336: { weapon_type: 'Dagger' }, // Sunflare (duplicate ID?)
  34334: { weapon_type: 'Bow' },              // Thori'dal, the Stars' Fury
  34233: { armor_type: 'Cloth' },           // Robes of Faltered Light
  34445: { armor_type: 'Leather' },           // Thunderheart Bracers

  // ============================================================================
  // ZUL'AMAN
  // ============================================================================

  30917: { armor_type: 'Leather' },           // Razorfury Mantle
  30915: { armor_type: 'Plate' },           // Belt of Seething Fury
  30919: { armor_type: 'Mail' },           // Valestalker Girdle
  30873: { armor_type: 'Mail' },             // Stillwater Boots
  30916: { armor_type: 'Cloth' },             // Leggings of Channeled Elements
  30874: { weapon_type: 'One-Handed Sword' }, // The Unbreakable Will
  33286: { armor_type: 'Mail' },           // Mojo-Mender's Mask
  33322: { armor_type: 'Leather' },           // Shimmer-pelt Vest
  33446: { armor_type: 'Plate' },             // Girdle of Stromgarde's Hope
  33328: { armor_type: 'Mail' },              // Arrow-fall Chestguard
  33471: { armor_type: 'Cloth' },             // Two-toed Sandals
  33533: { armor_type: 'Mail' },              // Avalanche Leggings
  33211: { armor_type: 'Leather' },           // Bladeangel's Money Belt
  33432: { armor_type: 'Mail' },              // Coif of the Jungle Stalker
  33479: { armor_type: 'Leather' },             // Grimgrin Faceguard
  33356: { armor_type: 'Leather' },           // Helm of Natural Regeneration
  33453: { armor_type: 'Cloth' },             // Hood of Hexing
  33464: { armor_type: 'Mail' },              // Hex Lord's Voodoo Pauldrons
  33206: { armor_type: 'Mail' },              // Pauldrons of Primal Fury
  33191: { armor_type: 'Plate' },              // Jungle Stompers
  33216: { armor_type: 'Plate' },           // Chestguard of Hidden Purpose
  33473: { armor_type: 'Plate' },             // Chestguard of the Warlord
  33469: { armor_type: 'Mail' },              // Hauberk of the Empire's Champion
  33329: { armor_type: 'Leather' },           // Shadowtooth Trollskin Cuirass
  33357: { armor_type: 'Cloth' },           // Footpads of Madness
  33303: { armor_type: 'Plate' },             // Skullshatter Warboots
  33463: { armor_type: 'Cloth' },             // Hood of the Third Eye
  33327: { armor_type: 'Plate' },             // Mask of Introspection
  33285: { armor_type: 'Cloth' },           // Fury of the Ursine
  33283: { weapon_type: 'One-Handed Mace' },  // Amani Punisher
  33421: { armor_type: 'Plate' },             // Battleworn Tuskguard
  33468: { weapon_type: 'One-Handed Mace' },  // Dark Blessing
  33388: { weapon_type: 'One-Handed Sword' }, // Heartless
  33215: { armor_type: 'Plate' },           // Bloodstained Elven Battlevest
  33476: { weapon_type: 'One-Handed Axe' },   // Cleaver of the Unforgiving
  33478: { weapon_type: 'Two-Handed Sword' }, // Jin'rohk, The Great Apocalypse

  // ============================================================================
  // TBC GH-388 ADDITIONS (every other TBC raid armor piece). Types from the
  // wow-classic-items package subclass, so no TBC raid armor piece falls
  // back to a guess from its name. Grip of Mannoroth and Mounting Vengeance
  // are listed in Hands and Waist, but the item data says they are fist
  // weapons, so they get a weapon type. Back items (class-agnostic in the
  // picker) and tokens need none.
  // ============================================================================

  // Karazhan
  28594: { armor_type: 'Cloth' },             // Trial-Fire Trousers (Opera Event)
  28591: { armor_type: 'Leather' },           // Earthsoul Leggings (Opera Event)
  28589: { armor_type: 'Mail' },              // Beastmaw Pauldrons (Opera Event)
  28593: { armor_type: 'Plate' },             // Eternium Greathelm (Opera Event)
  30668: { armor_type: 'Cloth' },             // Grasp of the Dead (Trash)
  30673: { armor_type: 'Cloth' },             // Inferno Waist Cord (Trash)
  30644: { armor_type: 'Leather' },           // Grips of Deftness (Trash)
  30674: { armor_type: 'Leather' },           // Zierhut's Lost Treads (Trash)
  30643: { armor_type: 'Mail' },              // Belt of the Tracker (Trash)
  30641: { armor_type: 'Plate' },             // Boots of Elusion (Trash)

  // Tempest Keep: The Eye
  29950: { armor_type: 'Plate' },             // Greaves of the Bloodwarder (High Astromancer Solarian)
  29976: { armor_type: 'Mail' },              // Worldstorm Gauntlets (High Astromancer Solarian)
  29995: { armor_type: 'Leather' },           // Leggings of Murderous Intent (Kael'thas Sunstrider)
  29998: { armor_type: 'Plate' },             // Royal Gauntlets of Silvermoon (Kael'thas Sunstrider)

  // Hyjal Summit
  32592: { armor_type: 'Mail' },              // Chestguard of Relentless Storms (Trash)

  // Black Temple
  32245: { armor_type: 'Plate' },             // Tide-stomper's Greaves (High Warlord Naj'entus)
  32275: { armor_type: 'Mail' },              // Spiritwalker Gauntlets (Shade of Akama)
  32510: { armor_type: 'Mail' },              // Softstep Boots of Tracking (Teron Gorefiend)
  32327: { armor_type: 'Cloth' },             // Robe of the Shadow Council (Teron Gorefiend)
  32512: { armor_type: 'Plate' },             // Girdle of Lordaeron's Fallen (Teron Gorefiend)
  32606: { armor_type: 'Plate' },             // Girdle of the Lightbearer (Teron Gorefiend)
  32329: { armor_type: 'Cloth' },             // Cowl of Benevolence (Teron Gorefiend)
  32334: { armor_type: 'Mail' },              // Vest of Mounting Assault (Gurtogg Bloodboil)
  32365: { armor_type: 'Plate' },             // Heartshatter Breastplate (Mother Shahraz)
  32518: { armor_type: 'Leather' },           // Veil of Turning Leaves (The Illidari Council)
  32521: { armor_type: 'Plate' },             // Faceplate of the Impenetrable (Illidan Stormrage)
  32525: { armor_type: 'Cloth' },             // Cowl of the Illidari High Lord (Illidan Stormrage)
  32608: { armor_type: 'Plate' },             // Pillager's Gauntlets (Trash)
  32593: { armor_type: 'Leather' },           // Treads of the Den Mother (Trash)

  // Zul'Aman
  33203: { armor_type: 'Cloth' },             // Robes of Heavenly Purpose (Nalorakk)
  33299: { armor_type: 'Plate' },             // Spaulders of the Advocate (Halazzi)
  33300: { armor_type: 'Leather' },           // Shoulderpads of Dancing Blades (Halazzi)
  33317: { armor_type: 'Cloth' },             // Robe of Departed Spirits (Halazzi)

  // Sunwell Plateau
  34170: { armor_type: 'Cloth' },             // Pantaloons of Calming Strife (Kalecgos)
  34438: { armor_type: 'Mail' },              // Skyshatter Bracers (Kalecgos)
  34169: { armor_type: 'Leather' },           // Breeches of Natural Aggression (Kalecgos)
  34180: { armor_type: 'Plate' },             // Felfury Legplates (Brutallus)
  34186: { armor_type: 'Mail' },              // Chain Links of the Tumultuous Storm (Felmyst)
  34203: { weapon_type: 'Fist Weapon' },      // Grip of Mannoroth (Eredar Twins)
  34209: { armor_type: 'Leather' },           // Spaulders of Reclamation (Eredar Twins)
  34240: { armor_type: 'Plate' },             // Gauntlets of the Soothed Soul (M'uru)
  34346: { weapon_type: 'Fist Weapon' },      // Mounting Vengeance (M'uru)
  34212: { armor_type: 'Leather' },           // Sunglow Vest (M'uru)
  34234: { armor_type: 'Leather' },           // Shadowed Gauntlets of Paroxysm (M'uru)
  34211: { armor_type: 'Leather' },           // Harness of Carnal Instinct (M'uru)
  34575: { armor_type: 'Leather' },           // Slayer's Boots (M'uru)
  34332: { armor_type: 'Mail' },              // Cowl of Gul'dan (Kil'jaeden)
  34339: { armor_type: 'Cloth' },             // Cowl of Light's Purity (Kil'jaeden)
  34343: { armor_type: 'Mail' },              // Thalassian Ranger Gauntlets (Kil'jaeden)
  34350: { armor_type: 'Mail' },              // Gauntlets of the Ancient Shadowmoon (Trash)
  34351: { armor_type: 'Leather' },           // Tranquil Majesty Wraps (Trash)

  // ============================================================================
  // WRATH OF THE LICH KING GH-388 ADDITIONS (every Wrath raid armor piece).
  // Types from the wow-classic-items package subclass, so no Wrath raid
  // armor piece falls back to a guess from its name; heroic versions have
  // their own ids and their own lines. Back items (class-agnostic in the
  // picker) and tokens need none.
  // ============================================================================

  // Naxxramas (Wrath)
  39701: { armor_type: 'Leather' },           // Dawnwalkers (Anub'Rekhan)
  39717: { armor_type: 'Plate' },             // Inexorable Sabatons (Anub'Rekhan)
  39706: { armor_type: 'Plate' },             // Sabatons of Sudden Reprisal (Anub'Rekhan)
  39718: { armor_type: 'Mail' },              // Corpse Scarab Handguards (Anub'Rekhan)
  39703: { armor_type: 'Plate' },             // Rescinding Grips (Anub'Rekhan)
  39720: { armor_type: 'Cloth' },             // Leggings of Atrophy (Anub'Rekhan)
  39719: { armor_type: 'Cloth' },             // Mantle of the Locusts (Anub'Rekhan)
  39704: { armor_type: 'Plate' },             // Pauldrons of Unnatural Death (Anub'Rekhan)
  39721: { armor_type: 'Cloth' },             // Sash of the Parlor (Anub'Rekhan)
  39702: { armor_type: 'Mail' },              // Arachnoid Gold Band (Anub'Rekhan)
  39722: { armor_type: 'Leather' },           // Swarm Bindings (Anub'Rekhan)
  39724: { armor_type: 'Mail' },              // Cult's Chestguard (Grand Widow Faerlina)
  39756: { armor_type: 'Leather' },           // Tunic of Prejudice (Grand Widow Faerlina)
  39734: { armor_type: 'Mail' },              // Atonement Greaves (Grand Widow Faerlina)
  39726: { armor_type: 'Plate' },             // Callous-Hearted Gauntlets (Grand Widow Faerlina)
  39727: { armor_type: 'Leather' },           // Dislocating Handguards (Grand Widow Faerlina)
  39733: { armor_type: 'Cloth' },             // Gloves of Token Respect (Grand Widow Faerlina)
  39732: { armor_type: 'Cloth' },             // Faerlina's Madness (Grand Widow Faerlina)
  39723: { armor_type: 'Plate' },             // Fire-Scorched Greathelm (Grand Widow Faerlina)
  39725: { armor_type: 'Plate' },             // Epaulets of the Grieving Servant (Grand Widow Faerlina)
  39735: { armor_type: 'Cloth' },             // Belt of False Dignity (Grand Widow Faerlina)
  39729: { armor_type: 'Plate' },             // Bracers of the Tyrant (Grand Widow Faerlina)
  39731: { armor_type: 'Cloth' },             // Punctilious Bindings (Grand Widow Faerlina)
  40062: { armor_type: 'Cloth' },             // Digested Silken Robes (Maexxna)
  40061: { armor_type: 'Mail' },              // Quivering Tunic (Maexxna)
  39767: { armor_type: 'Plate' },             // Undiminished Battleplate (Maexxna)
  39768: { armor_type: 'Leather' },           // Cowl of the Perished (Maexxna)
  39760: { armor_type: 'Plate' },             // Helm of Diminished Pride (Maexxna)
  40060: { armor_type: 'Cloth' },             // Distorted Limbs (Maexxna)
  39761: { armor_type: 'Leather' },           // Infectious Skitterer Leggings (Maexxna)
  40063: { armor_type: 'Leather' },           // Mantle of Shattered Kinship (Maexxna)
  39759: { armor_type: 'Plate' },             // Ablative Chitin Girdle (Maexxna)
  39762: { armor_type: 'Mail' },              // Torn Web Wrapping (Maexxna)
  39764: { armor_type: 'Plate' },             // Bindings of the Hapless Prey (Maexxna)
  39765: { armor_type: 'Leather' },           // Sinner's Bindings (Maexxna)
  40602: { armor_type: 'Cloth' },             // Robes of Mutation (Noth the Plaguebringer)
  40193: { armor_type: 'Mail' },              // Tunic of Masked Suffering (Noth the Plaguebringer)
  40184: { armor_type: 'Mail' },              // Crippled Treads (Noth the Plaguebringer)
  40187: { armor_type: 'Plate' },             // Poignant Sabatons (Noth the Plaguebringer)
  40188: { armor_type: 'Plate' },             // Gauntlets of the Disobedient (Noth the Plaguebringer)
  40197: { armor_type: 'Cloth' },             // Gloves of the Fallen Wizard (Noth the Plaguebringer)
  40196: { armor_type: 'Mail' },              // Legguards of the Undisturbed (Noth the Plaguebringer)
  40185: { armor_type: 'Plate' },             // Shoulderguards of Opportunity (Noth the Plaguebringer)
  40200: { armor_type: 'Leather' },           // Belt of Potent Chanting (Noth the Plaguebringer)
  40198: { armor_type: 'Cloth' },             // Bands of Impurity (Noth the Plaguebringer)
  40186: { armor_type: 'Leather' },           // Thrusting Bands (Noth the Plaguebringer)
  40203: { armor_type: 'Plate' },             // Breastplate of Tormented Rage (Heigan the Unclean)
  40210: { armor_type: 'Plate' },             // Chestguard of Bitter Charms (Heigan the Unclean)
  40234: { armor_type: 'Cloth' },             // Heigan's Putrid Vestments (Heigan the Unclean)
  40237: { armor_type: 'Mail' },              // Eruption-Scarred Boots (Heigan the Unclean)
  40206: { armor_type: 'Plate' },             // Iron-Spring Jumpers (Heigan the Unclean)
  40236: { armor_type: 'Cloth' },             // Serene Echoes (Heigan the Unclean)
  40238: { armor_type: 'Leather' },           // Gloves of the Dancing Bear (Heigan the Unclean)
  40235: { armor_type: 'Mail' },              // Helm of Pilgrimage (Heigan the Unclean)
  40201: { armor_type: 'Mail' },              // Leggings of Colossal Strides (Heigan the Unclean)
  40204: { armor_type: 'Plate' },             // Legguards of the Apostle (Heigan the Unclean)
  40205: { armor_type: 'Leather' },           // Stalk-Skin Belt (Heigan the Unclean)
  40209: { armor_type: 'Mail' },              // Bindings of the Decrepit (Heigan the Unclean)
  40249: { armor_type: 'Leather' },           // Vest of Vitality (Loatheb)
  40246: { armor_type: 'Cloth' },             // Boots of Impetuous Ideals (Loatheb)
  40243: { armor_type: 'Leather' },           // Footwraps of Vile Deceit (Loatheb)
  40242: { armor_type: 'Mail' },              // Grotesque Handgrips (Loatheb)
  40247: { armor_type: 'Cloth' },             // Cowl of Innocent Delight (Loatheb)
  40240: { armor_type: 'Plate' },             // Greaves of Turbulence (Loatheb)
  40241: { armor_type: 'Plate' },             // Girdle of Unity (Loatheb)
  40319: { armor_type: 'Leather' },           // Chestpiece of Suspicion (Instructor Razuvious)
  40326: { armor_type: 'Cloth' },             // Boots of Forlorn Wishes (Instructor Razuvious)
  40320: { armor_type: 'Plate' },             // Faithful Steel Sabatons (Instructor Razuvious)
  40316: { armor_type: 'Plate' },             // Gauntlets of Guiding Touch (Instructor Razuvious)
  40318: { armor_type: 'Plate' },             // Legplates of Double Strikes (Instructor Razuvious)
  40315: { armor_type: 'Mail' },              // Shoulderpads of Secret Arts (Instructor Razuvious)
  40305: { armor_type: 'Leather' },           // Spaulders of Egotism (Instructor Razuvious)
  40317: { armor_type: 'Plate' },             // Girdle of Razuvious (Instructor Razuvious)
  40327: { armor_type: 'Mail' },              // Girdle of Recuperation (Instructor Razuvious)
  40324: { armor_type: 'Mail' },              // Bands of Mutual Respect (Instructor Razuvious)
  40325: { armor_type: 'Cloth' },             // Bindings of the Expansive Mind (Instructor Razuvious)
  40306: { armor_type: 'Plate' },             // Bracers of the Unholy Knight (Instructor Razuvious)
  40323: { armor_type: 'Leather' },           // Esteemed Bindings (Instructor Razuvious)
  40339: { armor_type: 'Cloth' },             // Gothik's Cowl (Gothik the Harvester)
  40340: { armor_type: 'Mail' },              // Helm of Unleashed Energy (Gothik the Harvester)
  40328: { armor_type: 'Plate' },             // Helm of Vital Protection (Gothik the Harvester)
  40329: { armor_type: 'Leather' },           // Hood of the Exodus (Gothik the Harvester)
  40331: { armor_type: 'Mail' },              // Leggings of Failed Escape (Gothik the Harvester)
  40333: { armor_type: 'Leather' },           // Leggings of Fleeting Moments (Gothik the Harvester)
  40334: { armor_type: 'Plate' },             // Burdened Shoulderplates (Gothik the Harvester)
  40341: { armor_type: 'Leather' },           // Shackled Cinch (Gothik the Harvester)
  40332: { armor_type: 'Plate' },             // Abetment Bracers (Gothik the Harvester)
  40338: { armor_type: 'Cloth' },             // Bindings of Yearning (Gothik the Harvester)
  40330: { armor_type: 'Plate' },             // Bracers of Unrelenting Attack (Gothik the Harvester)
  40349: { armor_type: 'Leather' },           // Gloves of Peaceful Death (Four Horsemen)
  40347: { armor_type: 'Plate' },             // Zeliek's Gauntlets (Four Horsemen)
  40344: { armor_type: 'Mail' },              // Helm of the Grave (Four Horsemen)
  40352: { armor_type: 'Mail' },              // Leggings of Voracious Shadows (Four Horsemen)
  40286: { armor_type: 'Cloth' },             // Mantle of the Corrupted (Four Horsemen)
  40269: { armor_type: 'Cloth' },             // Boots of Persuasion (Patchwerk)
  40270: { armor_type: 'Leather' },           // Boots of Septic Wounds (Patchwerk)
  40261: { armor_type: 'Plate' },             // Crude Discolored Battlegrips (Patchwerk)
  40262: { armor_type: 'Mail' },              // Gloves of Calculated Risk (Patchwerk)
  40260: { armor_type: 'Leather' },           // Belt of the Tortured (Patchwerk)
  40263: { armor_type: 'Plate' },             // Fleshless Girdle (Patchwerk)
  40272: { armor_type: 'Mail' },              // Girdle of the Gambit (Patchwerk)
  40271: { armor_type: 'Cloth' },             // Sash of Solitude (Patchwerk)
  40259: { armor_type: 'Plate' },             // Waistguard of Divine Grace (Patchwerk)
  40279: { armor_type: 'Plate' },             // Chestguard of the Exhausted (Grobbulus)
  40283: { armor_type: 'Mail' },              // Fallout Impervious Tunic (Grobbulus)
  40277: { armor_type: 'Leather' },           // Tunic of Indulgence (Grobbulus)
  40287: { armor_type: 'Cloth' },             // Cowl of Vanity (Grobbulus)
  40285: { armor_type: 'Leather' },           // Desecrated Past (Grobbulus)
  40351: { armor_type: 'Cloth' },             // Mantle of the Fatigued Sage (Grobbulus)
  40288: { armor_type: 'Mail' },              // Spaulders of Incoherence (Grobbulus)
  40289: { armor_type: 'Cloth' },             // Sympathetic Amice (Grobbulus)
  40275: { armor_type: 'Mail' },              // Depraved Linked Belt (Grobbulus)
  40278: { armor_type: 'Plate' },             // Girdle of Chivalry (Grobbulus)
  40274: { armor_type: 'Plate' },             // Bracers of Liberation (Grobbulus)
  40282: { armor_type: 'Mail' },              // Slime Stream Bands (Grobbulus)
  40297: { armor_type: 'Plate' },             // Sabatons of Endurance (Thaddius)
  40302: { armor_type: 'Mail' },              // Benefactor's Gauntlets (Thaddius)
  40303: { armor_type: 'Cloth' },             // Wraps of the Persecuted (Thaddius)
  40296: { armor_type: 'Leather' },           // Cover of Silence (Thaddius)
  40298: { armor_type: 'Plate' },             // Faceguard of the Succumbed (Thaddius)
  40304: { armor_type: 'Leather' },           // Headpiece of Fungal Bloom (Thaddius)
  40294: { armor_type: 'Plate' },             // Riveted Abomination Leggings (Thaddius)
  40299: { armor_type: 'Mail' },              // Pauldrons of the Abandoned (Thaddius)
  40301: { armor_type: 'Cloth' },             // Cincture of Polarity (Thaddius)
  40365: { armor_type: 'Plate' },             // Breastplate of Frozen Pain (Sapphiron)
  40381: { armor_type: 'Cloth' },             // Sympathy (Sapphiron)
  40367: { armor_type: 'Mail' },              // Boots of the Great Construct (Sapphiron)
  40362: { armor_type: 'Leather' },           // Gloves of Fast Reactions (Sapphiron)
  40380: { armor_type: 'Cloth' },             // Gloves of Grandeur (Sapphiron)
  40366: { armor_type: 'Plate' },             // Platehelm of the Great Wyrm (Sapphiron)
  40363: { armor_type: 'Plate' },             // Bone-Inlaid Legguards (Sapphiron)
  40379: { armor_type: 'Leather' },           // Legguards of the Boneyard (Sapphiron)
  40376: { armor_type: 'Cloth' },             // Legwraps of the Defeated Dragon (Sapphiron)
  40377: { armor_type: 'Plate' },             // Noble Birthright Pauldrons (Sapphiron)
  40398: { armor_type: 'Cloth' },             // Leggings of Mortal Arrogance (Kel'Thuzad)

  // Eye of Eternity
  40194: { armor_type: 'Cloth' },             // Blanketing Robes of Snow (Malygos)
  40539: { armor_type: 'Leather' },           // Chestguard of the Recluse (Malygos)
  40588: { armor_type: 'Mail' },              // Tunic of the Artifact Guardian (Malygos)
  40558: { armor_type: 'Cloth' },             // Arcanic Tramplers (Malygos)
  40592: { armor_type: 'Plate' },             // Boots of Healing Energies (Malygos)
  40549: { armor_type: 'Mail' },              // Boots of the Renewed Flight (Malygos)
  40591: { armor_type: 'Plate' },             // Melancholy Sabatons (Malygos)
  40541: { armor_type: 'Leather' },           // Frosted Adroit Handguards (Malygos)
  40564: { armor_type: 'Mail' },              // Winter Spectacle Gloves (Malygos)
  40543: { armor_type: 'Mail' },              // Blue Aspect Helm (Malygos)
  40562: { armor_type: 'Cloth' },             // Hood of Rationality (Malygos)
  40560: { armor_type: 'Cloth' },             // Leggings of the Wanton Spellcaster (Malygos)
  40589: { armor_type: 'Plate' },             // Legplates of Sovereignty (Malygos)
  40590: { armor_type: 'Plate' },             // Elevated Lair Pauldrons (Malygos)
  40555: { armor_type: 'Cloth' },             // Mantle of Dissemination (Malygos)
  40594: { armor_type: 'Leather' },           // Spaulders of Catatonia (Malygos)
  40561: { armor_type: 'Cloth' },             // Leash of Heedless Magic (Malygos)
  40566: { armor_type: 'Leather' },           // Unravelling Strands of Sanity (Malygos)

  // Obsidian Sanctum
  40453: { armor_type: 'Plate' },             // Chestplate of the Great Aspects (Sartharion)
  44000: { armor_type: 'Plate' },             // Dragonstorm Breastplate (Sartharion)
  44002: { armor_type: 'Cloth' },             // The Sanctum's Flowing Vestments (Sartharion)
  44004: { armor_type: 'Mail' },              // Bountiful Gauntlets (Sartharion)
  44007: { armor_type: 'Leather' },           // Headpiece of Reconciliation (Sartharion)
  40451: { armor_type: 'Mail' },              // Hyaline Helm of the Sniper (Sartharion)
  44006: { armor_type: 'Plate' },             // Obsidian Greathelm (Sartharion)
  40446: { armor_type: 'Plate' },             // Dragon Brood Legguards (Sartharion)
  44011: { armor_type: 'Leather' },           // Leggings of the Honored (Sartharion)
  40437: { armor_type: 'Leather' },           // Concealment Shoulderpads (Sartharion)
  40438: { armor_type: 'Mail' },              // Council Chamber Epaulets (Sartharion)
  40439: { armor_type: 'Leather' },           // Mantle of the Eternal Sentinel (Sartharion)
  44003: { armor_type: 'Mail' },              // Upstanding Spaulders (Sartharion)
  44008: { armor_type: 'Cloth' },             // Unsullied Cuffs (Sartharion)

  // Ulduar
  45135: { armor_type: 'Cloth' },             // Boots of Fiery Resolution (Flame Leviathan)
  45117: { armor_type: 'Cloth' },             // Constructor's Handwraps (Flame Leviathan)
  45109: { armor_type: 'Mail' },              // Gloves of the Fiery Behemoth (Flame Leviathan)
  45107: { armor_type: 'Plate' },             // Iron Riveted War Helm (Flame Leviathan)
  45118: { armor_type: 'Mail' },              // Steamworker's Goggles (Flame Leviathan)
  45134: { armor_type: 'Plate' },             // Plated Leggings of Ruination (Flame Leviathan)
  45136: { armor_type: 'Leather' },           // Shoulderpads of Dormant Energies (Flame Leviathan)
  45119: { armor_type: 'Cloth' },             // Embrace of the Leviathan (Flame Leviathan)
  45108: { armor_type: 'Leather' },           // Mechanist's Bindings (Flame Leviathan)
  45111: { armor_type: 'Plate' },             // Mimiron's Inferno Couplings (Flame Leviathan)
  45167: { armor_type: 'Plate' },             // Lifeforge Breastplate (Ignis the Furnace Master)
  45166: { armor_type: 'Plate' },             // Charred Saronite Greaves (Ignis the Furnace Master)
  45162: { armor_type: 'Leather' },           // Flamestalker Boots (Ignis the Furnace Master)
  45164: { armor_type: 'Mail' },              // Helm of the Furnace Master (Ignis the Furnace Master)
  45186: { armor_type: 'Cloth' },             // Soot-Covered Mantle (Ignis the Furnace Master)
  45185: { armor_type: 'Leather' },           // Flamewrought Cinch (Ignis the Furnace Master)
  45161: { armor_type: 'Plate' },             // Girdle of Embers (Ignis the Furnace Master)
  45187: { armor_type: 'Mail' },              // Wristguards of the Firetender (Ignis the Furnace Master)
  45150: { armor_type: 'Cloth' },             // Collar of the Wyrmhunter (Razorscale)
  45141: { armor_type: 'Leather' },           // Proto-hide Leggings (Razorscale)
  45143: { armor_type: 'Mail' },              // Saronite Mesh Legguards (Razorscale)
  45140: { armor_type: 'Plate' },             // Razorscale Shoulderguards (Razorscale)
  45151: { armor_type: 'Mail' },              // Belt of the Fallen Wyrm (Razorscale)
  45139: { armor_type: 'Plate' },             // Dragonslayer's Brace (Razorscale)
  45149: { armor_type: 'Leather' },           // Bracers of the Broodmother (Razorscale)
  45146: { armor_type: 'Cloth' },             // Shackles of the Odalisque (Razorscale)
  45445: { armor_type: 'Plate' },             // Breastplate of the Devoted (XT-002 Deconstructor)
  45259: { armor_type: 'Mail' },              // Quartz-studded Harness (XT-002 Deconstructor)
  45260: { armor_type: 'Leather' },           // Boots of Hasty Revival (XT-002 Deconstructor)
  45249: { armor_type: 'Mail' },              // Brass-lined Boots (XT-002 Deconstructor)
  45258: { armor_type: 'Cloth' },             // Sandals of Rash Temperament (XT-002 Deconstructor)
  45444: { armor_type: 'Mail' },              // Gloves of the Steady Hand (XT-002 Deconstructor)
  45248: { armor_type: 'Plate' },             // Clockwork Legplates (XT-002 Deconstructor)
  45253: { armor_type: 'Cloth' },             // Mantle of Wavering Calm (XT-002 Deconstructor)
  45251: { armor_type: 'Plate' },             // Shoulderplates of the Deconstructor (XT-002 Deconstructor)
  45446: { armor_type: 'Cloth' },             // Grasps of Reason (XT-002 Deconstructor)
  45252: { armor_type: 'Plate' },             // Horologist's Wristguards (XT-002 Deconstructor)
  45237: { armor_type: 'Leather' },           // Phaelia's Vestments of the Sprouting Seed (Assembly of Iron)
  45240: { armor_type: 'Cloth' },             // Raiments of the Iron Council (Assembly of Iron)
  45225: { armor_type: 'Plate' },             // Steelbreaker's Embrace (Assembly of Iron)
  45244: { armor_type: 'Mail' },              // Greaves of Swift Vengeance (Assembly of Iron)
  45232: { armor_type: 'Leather' },           // Runed Ironhide Boots (Assembly of Iron)
  45228: { armor_type: 'Plate' },             // Handguards of the Enclave (Assembly of Iron)
  45239: { armor_type: 'Mail' },              // Runeshaper's Gloves (Assembly of Iron)
  45226: { armor_type: 'Plate' },             // Ancient Iron Heaume (Assembly of Iron)
  45238: { armor_type: 'Cloth' },             // Overload Legwraps (Assembly of Iron)
  45227: { armor_type: 'Mail' },              // Iron-studded Mantle (Assembly of Iron)
  45245: { armor_type: 'Leather' },           // Shoulderpads of the Intruder (Assembly of Iron)
  45241: { armor_type: 'Plate' },             // Belt of Colossal Rage (Assembly of Iron)
  45272: { armor_type: 'Cloth' },             // Robes of the Umbral Brute (Kologarn)
  45701: { armor_type: 'Mail' },              // Greaves of the Earthbinder (Kologarn)
  45698: { armor_type: 'Plate' },             // Sabatons of the Iron Watcher (Kologarn)
  45268: { armor_type: 'Plate' },             // Gloves of the Pythonic Guardian (Kologarn)
  45273: { armor_type: 'Cloth' },             // Handwraps of Plentiful Recovery (Kologarn)
  45274: { armor_type: 'Mail' },              // Leggings of the Stoneweaver (Kologarn)
  45267: { armor_type: 'Plate' },             // Saronite Plated Legguards (Kologarn)
  45697: { armor_type: 'Plate' },             // Shoulderguards of the Solemn Watch (Kologarn)
  45265: { armor_type: 'Leather' },           // Shoulderpads of the Monolith (Kologarn)
  45275: { armor_type: 'Cloth' },             // Bracers of Unleashed Magic (Kologarn)
  45264: { armor_type: 'Plate' },             // Decimator's Armguards (Kologarn)
  45269: { armor_type: 'Plate' },             // Unfaltering Armguards (Kologarn)
  45334: { armor_type: 'Plate' },             // Unbreakable Chestguard (Auriaya)
  45434: { armor_type: 'Plate' },             // Greaves of the Rockmender (Auriaya)
  45441: { armor_type: 'Cloth' },             // Sandals of the Ancient Keeper (Auriaya)
  45325: { armor_type: 'Leather' },           // Gloves of the Stonereaper (Auriaya)
  45435: { armor_type: 'Cloth' },             // Cowl of the Absolute (Auriaya)
  45439: { armor_type: 'Leather' },           // Unwavering Stare (Auriaya)
  45440: { armor_type: 'Mail' },              // Amice of the Stoic Watch (Auriaya)
  45320: { armor_type: 'Plate' },             // Shoulderplates of the Eternal (Auriaya)
  45453: { armor_type: 'Leather' },           // Winter's Icy Embrace (Hodir)
  45462: { armor_type: 'Leather' },           // Gloves of the Frozen Glade (Hodir)
  45464: { armor_type: 'Cloth' },             // Cowl of Icy Breaths (Hodir)
  45452: { armor_type: 'Plate' },             // Frostplate Greaves (Hodir)
  45460: { armor_type: 'Mail' },              // Bindings of Winter Gale (Hodir)
  45888: { armor_type: 'Plate' },             // Bitter Cold Armguards (Hodir)
  45454: { armor_type: 'Mail' },              // Frost-Bound Chain Bracers (Hodir)
  45473: { armor_type: 'Leather' },           // Embrace of the Gladiator (Thorim)
  45928: { armor_type: 'Plate' },             // Gauntlets of the Thunder God (Thorim)
  45927: { armor_type: 'Cloth' },             // Handwraps of Resonance (Thorim)
  45893: { armor_type: 'Leather' },           // Guise of the Midgard Serpent (Thorim)
  45472: { armor_type: 'Plate' },             // Warhelm of the Champion (Thorim)
  45468: { armor_type: 'Cloth' },             // Leggings of Lost Love (Thorim)
  45894: { armor_type: 'Cloth' },             // Leggings of Unstable Discharge (Thorim)
  45474: { armor_type: 'Mail' },              // Pauldrons of the Combatant (Thorim)
  45467: { armor_type: 'Mail' },              // Belt of the Betrayed (Thorim)
  45895: { armor_type: 'Mail' },              // Belt of the Blood Pit (Thorim)
  45941: { armor_type: 'Mail' },              // Chestguard of the Lasher (Freya)
  45940: { armor_type: 'Leather' },           // Tunic of the Limber Stalker (Freya)
  45483: { armor_type: 'Cloth' },             // Boots of the Servant (Freya)
  45481: { armor_type: 'Plate' },             // Gauntlets of Ruthless Reprisal (Freya)
  45943: { armor_type: 'Mail' },              // Gloves of Whispering Winds (Freya)
  45487: { armor_type: 'Plate' },             // Handguards of Revitalization (Freya)
  45935: { armor_type: 'Plate' },             // Ironbark Faceguard (Freya)
  45488: { armor_type: 'Cloth' },             // Leggings of the Enslaved Idol (Freya)
  45482: { armor_type: 'Leather' },           // Leggings of the Lifetender (Freya)
  45936: { armor_type: 'Plate' },             // Legplates of Flourishing Resolve (Freya)
  45988: { armor_type: 'Plate' },             // Greaves of the Iron Army (Mimiron)
  45989: { armor_type: 'Mail' },              // Tempered Mercury Greaves (Mimiron)
  45976: { armor_type: 'Cloth' },             // Static Charge Handwraps (Mimiron)
  45497: { armor_type: 'Cloth' },             // Crown of Luminescence (Mimiron)
  45993: { armor_type: 'Leather' },           // Mimiron's Flight Goggles (Mimiron)
  45982: { armor_type: 'Plate' },             // Fused Alloy Legplates (Mimiron)
  45492: { armor_type: 'Leather' },           // Malleable Steelweave Mantle (Mimiron)
  45974: { armor_type: 'Leather' },           // Shoulderguards of Assimilation (Mimiron)
  45975: { armor_type: 'Plate' },             // Cable of the Metrognome (Mimiron)
  45491: { armor_type: 'Leather' },           // Waistguard of the Creator (Mimiron)
  45663: { armor_type: 'Plate' },             // Armbands of Bedlam (Mimiron)
  45519: { armor_type: 'Leather' },           // Vestments of the Blind Denizen (General Vezax)
  45513: { armor_type: 'Mail' },              // Boots of the Forgotten Depths (General Vezax)
  45501: { armor_type: 'Plate' },             // Boots of the Underdweller (General Vezax)
  45512: { armor_type: 'Leather' },           // Grips of the Unbroken (General Vezax)
  45520: { armor_type: 'Cloth' },             // Handwraps of the Vigilant (General Vezax)
  45502: { armor_type: 'Plate' },             // Helm of the Faceless (General Vezax)
  45504: { armor_type: 'Mail' },              // Darkcore Leggings (General Vezax)
  45514: { armor_type: 'Cloth' },             // Mantle of the Unknowing (General Vezax)
  45505: { armor_type: 'Plate' },             // Belt of Clinging Hope (General Vezax)
  45508: { armor_type: 'Cloth' },             // Belt of the Darkspeaker (General Vezax)
  45524: { armor_type: 'Mail' },              // Chestguard of Insidious Intent (Yogg-Saron)
  45531: { armor_type: 'Mail' },              // Chestguard of the Fallen God (Yogg-Saron)
  45537: { armor_type: 'Cloth' },             // Treads of the False Oracle (Yogg-Saron)
  45532: { armor_type: 'Cloth' },             // Cowl of Dark Whispers (Yogg-Saron)
  45523: { armor_type: 'Leather' },           // Garona's Guise (Yogg-Saron)
  45536: { armor_type: 'Leather' },           // Legguards of Cunning Deception (Yogg-Saron)
  46039: { armor_type: 'Plate' },             // Breastplate of the Timeless (Algalon the Observer)
  45615: { armor_type: 'Mail' },              // Planewalker Treads (Algalon the Observer)
  45599: { armor_type: 'Plate' },             // Sabatons of Lifeless Night (Algalon the Observer)
  46050: { armor_type: 'Cloth' },             // Starlight Treads (Algalon the Observer)
  46043: { armor_type: 'Leather' },           // Gloves of the Endless Dark (Algalon the Observer)
  45665: { armor_type: 'Cloth' },             // Pharos Gloves (Algalon the Observer)
  46045: { armor_type: 'Cloth' },             // Pulsar Gloves (Algalon the Observer)
  45610: { armor_type: 'Mail' },              // Boundless Gaze (Algalon the Observer)
  45594: { armor_type: 'Plate' },             // Legplates of the Endless Void (Algalon the Observer)
  46049: { armor_type: 'Leather' },           // Zodiac Leggings (Algalon the Observer)
  46044: { armor_type: 'Mail' },              // Observer's Mantle (Algalon the Observer)
  46037: { armor_type: 'Plate' },             // Shoulderplates of the Celestial Watch (Algalon the Observer)
  45616: { armor_type: 'Leather' },           // Star-Beaded Clutch (Algalon the Observer)
  46041: { armor_type: 'Plate' },             // Starfall Girdle (Algalon the Observer)
  45619: { armor_type: 'Cloth' },             // Starwatcher's Binding (Algalon the Observer)
  45611: { armor_type: 'Leather' },           // Solar Bindings (Algalon the Observer)

  // Trial of the Crusader
  46960: { armor_type: 'Mail' },              // Breastplate of Cruel Intent (Northrend Beasts)
  46965: { armor_type: 'Mail' },              // Breastplate of Cruel Intent (Heroic) (Northrend Beasts)
  46962: { armor_type: 'Plate' },             // Chestplate of the Towering Monstrosity (Northrend Beasts)
  46968: { armor_type: 'Plate' },             // Chestplate of the Towering Monstrosity (Heroic) (Northrend Beasts)
  47251: { armor_type: 'Mail' },              // Cuirass of Cruel Intent (Northrend Beasts)
  47412: { armor_type: 'Mail' },              // Cuirass of Cruel Intent (Heroic) (Northrend Beasts)
  47264: { armor_type: 'Cloth' },             // Flowing Robes of Ascent (Northrend Beasts)
  47425: { armor_type: 'Cloth' },             // Flowing Robes of Ascent (Heroic) (Northrend Beasts)
  46992: { armor_type: 'Cloth' },             // Flowing Vestments of Ascent (Northrend Beasts)
  46993: { armor_type: 'Cloth' },             // Flowing Vestments of Ascent (Heroic) (Northrend Beasts)
  47254: { armor_type: 'Plate' },             // Hauberk of the Towering Monstrosity (Northrend Beasts)
  47415: { armor_type: 'Plate' },             // Hauberk of the Towering Monstrosity (Heroic) (Northrend Beasts)
  46985: { armor_type: 'Plate' },             // Boots of the Courageous (Northrend Beasts)
  46986: { armor_type: 'Plate' },             // Boots of the Courageous (Heroic) (Northrend Beasts)
  47262: { armor_type: 'Leather' },           // Boots of the Harsh Winter (Northrend Beasts)
  47423: { armor_type: 'Leather' },           // Boots of the Harsh Winter (Heroic) (Northrend Beasts)
  46988: { armor_type: 'Leather' },           // Boots of the Unrelenting Storm (Northrend Beasts)
  46989: { armor_type: 'Leather' },           // Boots of the Unrelenting Storm (Heroic) (Northrend Beasts)
  47263: { armor_type: 'Plate' },             // Sabatons of the Courageous (Northrend Beasts)
  47424: { armor_type: 'Plate' },             // Sabatons of the Courageous (Heroic) (Northrend Beasts)
  46974: { armor_type: 'Leather' },           // Leggings of the Broken Beast (Northrend Beasts)
  46975: { armor_type: 'Leather' },           // Leggings of the Broken Beast (Heroic) (Northrend Beasts)
  47259: { armor_type: 'Leather' },           // Legwraps of the Broken Beast (Northrend Beasts)
  47420: { armor_type: 'Leather' },           // Legwraps of the Broken Beast (Heroic) (Northrend Beasts)
  46990: { armor_type: 'Mail' },              // Belt of the Ice Burrower (Northrend Beasts)
  46991: { armor_type: 'Mail' },              // Belt of the Ice Burrower (Heroic) (Northrend Beasts)
  47258: { armor_type: 'Cloth' },             // Belt of the Tenebrous Mist (Northrend Beasts)
  47419: { armor_type: 'Cloth' },             // Belt of the Tenebrous Mist (Heroic) (Northrend Beasts)
  47265: { armor_type: 'Mail' },              // Binding of the Ice Burrower (Northrend Beasts)
  47426: { armor_type: 'Mail' },              // Binding of the Ice Burrower (Heroic) (Northrend Beasts)
  46972: { armor_type: 'Cloth' },             // Cord of the Tenebrous Mist (Northrend Beasts)
  46973: { armor_type: 'Cloth' },             // Cord of the Tenebrous Mist (Heroic) (Northrend Beasts)
  46961: { armor_type: 'Plate' },             // Boneshatter Armplates (Northrend Beasts)
  46967: { armor_type: 'Plate' },             // Boneshatter Armplates (Heroic) (Northrend Beasts)
  47253: { armor_type: 'Plate' },             // Boneshatter Vambraces (Northrend Beasts)
  47414: { armor_type: 'Plate' },             // Boneshatter Vambraces (Heroic) (Northrend Beasts)
  47000: { armor_type: 'Leather' },           // Cuirass of Calamitous Fate (Lord Jaraxxus)
  47004: { armor_type: 'Leather' },           // Cuirass of Calamitous Fate (Heroic) (Lord Jaraxxus)
  47270: { armor_type: 'Leather' },           // Vest of Calamitous Fate (Lord Jaraxxus)
  47431: { armor_type: 'Leather' },           // Vest of Calamitous Fate (Heroic) (Lord Jaraxxus)
  46997: { armor_type: 'Plate' },             // Dawnbreaker Greaves (Lord Jaraxxus)
  47003: { armor_type: 'Plate' },             // Dawnbreaker Greaves (Heroic) (Lord Jaraxxus)
  47269: { armor_type: 'Plate' },             // Dawnbreaker Sabatons (Lord Jaraxxus)
  47430: { armor_type: 'Plate' },             // Dawnbreaker Sabatons (Heroic) (Lord Jaraxxus)
  47279: { armor_type: 'Plate' },             // Leggings of Failing Light (Lord Jaraxxus)
  47440: { armor_type: 'Plate' },             // Leggings of Failing Light (Heroic) (Lord Jaraxxus)
  47051: { armor_type: 'Cloth' },             // Leggings of the Soothing Touch (Lord Jaraxxus)
  47062: { armor_type: 'Cloth' },             // Leggings of the Soothing Touch (Heroic) (Lord Jaraxxus)
  47052: { armor_type: 'Plate' },             // Legguards of Feverish Dedication (Lord Jaraxxus)
  47061: { armor_type: 'Plate' },             // Legguards of Feverish Dedication (Heroic) (Lord Jaraxxus)
  47057: { armor_type: 'Plate' },             // Legplates of Failing Light (Lord Jaraxxus)
  47067: { armor_type: 'Plate' },             // Legplates of Failing Light (Heroic) (Lord Jaraxxus)
  47273: { armor_type: 'Plate' },             // Legplates of Feverish Dedication (Lord Jaraxxus)
  47434: { armor_type: 'Plate' },             // Legplates of Feverish Dedication (Heroic) (Lord Jaraxxus)
  47274: { armor_type: 'Cloth' },             // Pants of the Soothing Touch (Lord Jaraxxus)
  47435: { armor_type: 'Cloth' },             // Pants of the Soothing Touch (Heroic) (Lord Jaraxxus)
  46999: { armor_type: 'Plate' },             // Bloodbath Belt (Lord Jaraxxus)
  47002: { armor_type: 'Plate' },             // Bloodbath Belt (Heroic) (Lord Jaraxxus)
  47268: { armor_type: 'Plate' },             // Bloodbath Girdle (Lord Jaraxxus)
  47429: { armor_type: 'Plate' },             // Bloodbath Girdle (Heroic) (Lord Jaraxxus)
  47277: { armor_type: 'Leather' },           // Bindings of the Autumn Willow (Lord Jaraxxus)
  47438: { armor_type: 'Leather' },           // Bindings of the Autumn Willow (Heroic) (Lord Jaraxxus)
  47056: { armor_type: 'Mail' },              // Bracers of Cloudy Omen (Lord Jaraxxus)
  47068: { armor_type: 'Mail' },              // Bracers of Cloudy Omen (Heroic) (Lord Jaraxxus)
  47055: { armor_type: 'Leather' },           // Bracers of the Autumn Willow (Lord Jaraxxus)
  47066: { armor_type: 'Leather' },           // Bracers of the Autumn Willow (Heroic) (Lord Jaraxxus)
  47280: { armor_type: 'Mail' },              // Wristwraps of Cloudy Omen (Lord Jaraxxus)
  47441: { armor_type: 'Mail' },              // Wristwraps of Cloudy Omen (Heroic) (Lord Jaraxxus)
  47082: { armor_type: 'Plate' },             // Chestplate of the Frostborn Hero (Faction Champions)
  47086: { armor_type: 'Plate' },             // Chestplate of the Frostborn Hero (Heroic) (Faction Champions)
  47288: { armor_type: 'Plate' },             // Chestplate of the Frostwolf Hero (Faction Champions)
  47449: { armor_type: 'Plate' },             // Chestplate of the Frostwolf Hero (Heroic) (Faction Champions)
  47292: { armor_type: 'Leather' },           // Robes of the Shattered Fellowship (Faction Champions)
  47453: { armor_type: 'Leather' },           // Robes of the Shattered Fellowship (Heroic) (Faction Champions)
  47094: { armor_type: 'Leather' },           // Vestments of the Shattered Fellowship (Faction Champions)
  47096: { armor_type: 'Leather' },           // Vestments of the Shattered Fellowship (Heroic) (Faction Champions)
  47092: { armor_type: 'Cloth' },             // Boots of the Mourning Widow (Faction Champions)
  47097: { armor_type: 'Cloth' },             // Boots of the Mourning Widow (Heroic) (Faction Champions)
  47090: { armor_type: 'Mail' },              // Boots of Tremoring Earth (Faction Champions)
  47099: { armor_type: 'Mail' },              // Boots of Tremoring Earth (Heroic) (Faction Champions)
  47284: { armor_type: 'Leather' },           // Icewalker Treads (Faction Champions)
  47445: { armor_type: 'Leather' },           // Icewalker Treads (Heroic) (Faction Champions)
  47295: { armor_type: 'Mail' },              // Sabatons of Tremoring Earth (Faction Champions)
  47456: { armor_type: 'Mail' },              // Sabatons of Tremoring Earth (Heroic) (Faction Champions)
  47293: { armor_type: 'Cloth' },             // Sandals of the Mourning Widow (Faction Champions)
  47454: { armor_type: 'Cloth' },             // Sandals of the Mourning Widow (Heroic) (Faction Champions)
  47071: { armor_type: 'Leather' },           // Treads of the Icewalker (Faction Champions)
  47077: { armor_type: 'Leather' },           // Treads of the Icewalker (Heroic) (Faction Champions)
  47289: { armor_type: 'Mail' },              // Leggings of Concealed Hatred (Faction Champions)
  47450: { armor_type: 'Mail' },              // Leggings of Concealed Hatred (Heroic) (Faction Champions)
  47083: { armor_type: 'Mail' },              // Legguards of Concealed Hatred (Faction Champions)
  47087: { armor_type: 'Mail' },              // Legguards of Concealed Hatred (Heroic) (Faction Champions)
  47286: { armor_type: 'Cloth' },             // Belt of Biting Cold (Faction Champions)
  47447: { armor_type: 'Cloth' },             // Belt of Biting Cold (Heroic) (Faction Champions)
  47283: { armor_type: 'Plate' },             // Belt of Bloodied Scars (Faction Champions)
  47444: { armor_type: 'Plate' },             // Belt of Bloodied Scars (Heroic) (Faction Champions)
  47081: { armor_type: 'Cloth' },             // Cord of Biting Cold (Faction Champions)
  47084: { armor_type: 'Cloth' },             // Cord of Biting Cold (Heroic) (Faction Champions)
  47072: { armor_type: 'Plate' },             // Girdle of Bloodied Scars (Faction Champions)
  47076: { armor_type: 'Plate' },             // Girdle of Bloodied Scars (Heroic) (Faction Champions)
  47294: { armor_type: 'Plate' },             // Bracers of the Broken Bond (Faction Champions)
  47455: { armor_type: 'Plate' },             // Bracers of the Broken Bond (Heroic) (Faction Champions)
  47281: { armor_type: 'Mail' },              // Bracers of the Silent Massacre (Faction Champions)
  47442: { armor_type: 'Mail' },              // Bracers of the Silent Massacre (Heroic) (Faction Champions)
  47073: { armor_type: 'Mail' },              // Bracers of the Untold Massacre (Faction Champions)
  47074: { armor_type: 'Mail' },              // Bracers of the Untold Massacre (Heroic) (Faction Champions)
  47093: { armor_type: 'Plate' },             // Vambraces of the Broken Bond (Faction Champions)
  47098: { armor_type: 'Plate' },             // Vambraces of the Broken Bond (Heroic) (Faction Champions)
  47142: { armor_type: 'Plate' },             // Breastplate of the Frozen Lake (Twin Val'kyr)
  47147: { armor_type: 'Plate' },             // Breastplate of the Frozen Lake (Heroic) (Twin Val'kyr)
  47310: { armor_type: 'Plate' },             // Chestplate of the Frozen Lake (Twin Val'kyr)
  47471: { armor_type: 'Plate' },             // Chestplate of the Frozen Lake (Heroic) (Twin Val'kyr)
  47126: { armor_type: 'Cloth' },             // Skyweaver Robes (Twin Val'kyr)
  47129: { armor_type: 'Cloth' },             // Skyweaver Robes (Heroic) (Twin Val'kyr)
  47301: { armor_type: 'Cloth' },             // Skyweaver Vestments (Twin Val'kyr)
  47462: { armor_type: 'Cloth' },             // Skyweaver Vestments (Heroic) (Twin Val'kyr)
  47296: { armor_type: 'Mail' },              // Greaves of Ruthless Judgment (Twin Val'kyr)
  47457: { armor_type: 'Mail' },              // Greaves of Ruthless Judgment (Heroic) (Twin Val'kyr)
  47106: { armor_type: 'Mail' },              // Sabatons of Ruthless Judgment (Twin Val'kyr)
  47109: { armor_type: 'Mail' },              // Sabatons of Ruthless Judgment (Heroic) (Twin Val'kyr)
  47121: { armor_type: 'Plate' },             // Legguards of Ascension (Twin Val'kyr)
  47132: { armor_type: 'Plate' },             // Legguards of Ascension (Heroic) (Twin Val'kyr)
  47304: { armor_type: 'Plate' },             // Legplates of Ascension (Twin Val'kyr)
  47465: { armor_type: 'Plate' },             // Legplates of Ascension (Heroic) (Twin Val'kyr)
  47308: { armor_type: 'Leather' },           // Belt of Pale Thorns (Twin Val'kyr)
  47469: { armor_type: 'Leather' },           // Belt of Pale Thorns (Heroic) (Twin Val'kyr)
  47107: { armor_type: 'Leather' },           // Belt of the Merciless Killer (Twin Val'kyr)
  47112: { armor_type: 'Leather' },           // Belt of the Merciless Killer (Heroic) (Twin Val'kyr)
  47299: { armor_type: 'Leather' },           // Belt of the Pitiless Killer (Twin Val'kyr)
  47460: { armor_type: 'Leather' },           // Belt of the Pitiless Killer (Heroic) (Twin Val'kyr)
  47140: { armor_type: 'Leather' },           // Cord of Pale Thorns (Twin Val'kyr)
  47145: { armor_type: 'Leather' },           // Cord of Pale Thorns (Heroic) (Twin Val'kyr)
  47298: { armor_type: 'Plate' },             // Armguards of the Shieldmaiden (Twin Val'kyr)
  47459: { armor_type: 'Plate' },             // Armguards of the Shieldmaiden (Heroic) (Twin Val'kyr)
  47141: { armor_type: 'Cloth' },             // Bindings of Dark Essence (Twin Val'kyr)
  47143: { armor_type: 'Cloth' },             // Bindings of Dark Essence (Heroic) (Twin Val'kyr)
  47108: { armor_type: 'Plate' },             // Bracers of the Shieldmaiden (Twin Val'kyr)
  47111: { armor_type: 'Plate' },             // Bracers of the Shieldmaiden (Heroic) (Twin Val'kyr)
  47306: { armor_type: 'Cloth' },             // Dark Essence Bindings (Twin Val'kyr)
  47467: { armor_type: 'Cloth' },             // Dark Essence Bindings (Heroic) (Twin Val'kyr)
  47204: { armor_type: 'Mail' },              // Chestguard of Flowing Elements (Anub'arak)
  47209: { armor_type: 'Mail' },              // Chestguard of Flowing Elements (Heroic) (Anub'arak)
  47325: { armor_type: 'Mail' },              // Cuirass of Flowing Elements (Anub'arak)
  47486: { armor_type: 'Mail' },              // Cuirass of Flowing Elements (Heroic) (Anub'arak)
  47321: { armor_type: 'Cloth' },             // Boots of the Icy Floe (Anub'arak)
  47482: { armor_type: 'Cloth' },             // Boots of the Icy Floe (Heroic) (Anub'arak)
  47194: { armor_type: 'Cloth' },             // Footpads of the Icy Floe (Anub'arak)
  47205: { armor_type: 'Cloth' },             // Footpads of the Icy Floe (Heroic) (Anub'arak)
  47150: { armor_type: 'Plate' },             // Greaves of the 7th Legion (Anub'arak)
  47154: { armor_type: 'Plate' },             // Greaves of the 7th Legion (Heroic) (Anub'arak)
  47312: { armor_type: 'Plate' },             // Greaves of the Saronite Citadel (Anub'arak)
  47473: { armor_type: 'Plate' },             // Greaves of the Saronite Citadel (Heroic) (Anub'arak)
  47330: { armor_type: 'Plate' },             // Gauntlets of Bitter Reprisal (Anub'arak)
  47492: { armor_type: 'Plate' },             // Gauntlets of Bitter Reprisal (Heroic) (Anub'arak)
  47234: { armor_type: 'Plate' },             // Gloves of Bitter Reprisal (Anub'arak)
  47240: { armor_type: 'Plate' },             // Gloves of Bitter Reprisal (Heroic) (Anub'arak)
  47235: { armor_type: 'Cloth' },             // Gloves of the Lifeless Touch (Anub'arak)
  47236: { armor_type: 'Cloth' },             // Gloves of the Lifeless Touch (Heroic) (Anub'arak)
  47326: { armor_type: 'Cloth' },             // Handwraps of the Lifeless Touch (Anub'arak)
  47487: { armor_type: 'Cloth' },             // Handwraps of the Lifeless Touch (Heroic) (Anub'arak)
  47317: { armor_type: 'Cloth' },             // Breeches of the Deepening Void (Anub'arak)
  47478: { armor_type: 'Cloth' },             // Breeches of the Deepening Void (Heroic) (Anub'arak)
  47318: { armor_type: 'Leather' },           // Leggings of the Awakening (Anub'arak)
  47479: { armor_type: 'Leather' },           // Leggings of the Awakening (Heroic) (Anub'arak)
  47187: { armor_type: 'Cloth' },             // Leggings of the Deepening Void (Anub'arak)
  47189: { armor_type: 'Cloth' },             // Leggings of the Deepening Void (Heroic) (Anub'arak)
  47319: { armor_type: 'Mail' },              // Leggings of the Lurking Threat (Anub'arak)
  47480: { armor_type: 'Mail' },              // Leggings of the Lurking Threat (Heroic) (Anub'arak)
  47184: { armor_type: 'Mail' },              // Legguards of the Lurking Threat (Anub'arak)
  47191: { armor_type: 'Mail' },              // Legguards of the Lurking Threat (Heroic) (Anub'arak)
  47186: { armor_type: 'Leather' },           // Legwraps of the Awakening (Anub'arak)
  47190: { armor_type: 'Leather' },           // Legwraps of the Awakening (Heroic) (Anub'arak)
  47152: { armor_type: 'Mail' },              // Belt of Deathly Dominion (Anub'arak)
  47153: { armor_type: 'Mail' },              // Belt of Deathly Dominion (Heroic) (Anub'arak)
  47195: { armor_type: 'Plate' },             // Belt of the Forgotten Martyr (Anub'arak)
  47207: { armor_type: 'Plate' },             // Belt of the Forgotten Martyr (Heroic) (Anub'arak)
  47323: { armor_type: 'Plate' },             // Girdle of the Forgotten Martyr (Anub'arak)
  47484: { armor_type: 'Plate' },             // Girdle of the Forgotten Martyr (Heroic) (Anub'arak)
  47311: { armor_type: 'Mail' },              // Waistguard of Deathly Dominion (Anub'arak)
  47472: { armor_type: 'Mail' },              // Waistguard of Deathly Dominion (Heroic) (Anub'arak)
  47313: { armor_type: 'Leather' },           // Armbands of Dark Determination (Anub'arak)
  47474: { armor_type: 'Leather' },           // Armbands of Dark Determination (Heroic) (Anub'arak)
  47203: { armor_type: 'Cloth' },             // Armbands of the Ashen Saint (Anub'arak)
  47208: { armor_type: 'Cloth' },             // Armbands of the Ashen Saint (Heroic) (Anub'arak)
  47324: { armor_type: 'Cloth' },             // Bindings of the Ashen Saint (Anub'arak)
  47485: { armor_type: 'Cloth' },             // Bindings of the Ashen Saint (Heroic) (Anub'arak)
  47151: { armor_type: 'Leather' },           // Bracers of Dark Determination (Anub'arak)
  47155: { armor_type: 'Leather' },           // Bracers of Dark Determination (Heroic) (Anub'arak)

  // Onyxia's Lair (Wrath)
  49482: { armor_type: 'Cloth' },             // Aurora of Transcendence (Onyxia)
  49477: { armor_type: 'Leather' },           // Bloodfang Hood (Onyxia)
  49469: { armor_type: 'Mail' },              // Crown of Ten Storms (Onyxia)
  49480: { armor_type: 'Mail' },              // Dragonstalker's Helm (Onyxia)
  49467: { armor_type: 'Plate' },             // Frostforged Greathelm (Onyxia)
  49466: { armor_type: 'Plate' },             // Frostforged Helm (Onyxia)
  49483: { armor_type: 'Cloth' },             // Halo of Transcendence (Onyxia)
  49468: { armor_type: 'Mail' },              // Helm of Ten Storms (Onyxia)
  49479: { armor_type: 'Plate' },             // Helm of Wrath (Onyxia)
  49470: { armor_type: 'Mail' },              // Helmet of Ten Storms (Onyxia)
  49478: { armor_type: 'Plate' },             // Helmet of Wrath (Onyxia)
  49476: { armor_type: 'Plate' },             // Judgement Crown (Onyxia)
  49475: { armor_type: 'Plate' },             // Judgement Heaume (Onyxia)
  49474: { armor_type: 'Plate' },             // Judgement Hood (Onyxia)
  49484: { armor_type: 'Cloth' },             // Nemesis Skullcap (Onyxia)
  49481: { armor_type: 'Cloth' },             // Netherwind Crown (Onyxia)
  49473: { armor_type: 'Leather' },           // Stormrage Cover (Onyxia)
  49471: { armor_type: 'Leather' },           // Stormrage Coverlet (Onyxia)
  49472: { armor_type: 'Leather' },           // Stormrage Crown (Onyxia)

  // Icecrown Citadel
  49951: { armor_type: 'Plate' },             // Gendarme's Cuirass (Lord Marrowgar)
  50606: { armor_type: 'Plate' },             // Gendarme's Cuirass (Heroic) (Lord Marrowgar)
  49950: { armor_type: 'Leather' },           // Frostbitten Fur Boots (Lord Marrowgar)
  50607: { armor_type: 'Leather' },           // Frostbitten Fur Boots (Heroic) (Lord Marrowgar)
  49979: { armor_type: 'Leather' },           // Handguards of Winter's Respite (Lord Marrowgar)
  50615: { armor_type: 'Leather' },           // Handguards of Winter's Respite (Heroic) (Lord Marrowgar)
  49952: { armor_type: 'Mail' },              // Snowserpent Mail Helm (Lord Marrowgar)
  50605: { armor_type: 'Mail' },              // Snowserpent Mail Helm (Heroic) (Lord Marrowgar)
  49964: { armor_type: 'Plate' },             // Legguards of Lost Hope (Lord Marrowgar)
  50612: { armor_type: 'Plate' },             // Legguards of Lost Hope (Heroic) (Lord Marrowgar)
  49980: { armor_type: 'Plate' },             // Rusted Bonespike Pauldrons (Lord Marrowgar)
  50617: { armor_type: 'Plate' },             // Rusted Bonespike Pauldrons (Heroic) (Lord Marrowgar)
  49978: { armor_type: 'Cloth' },             // Crushing Coldwraith Belt (Lord Marrowgar)
  50613: { armor_type: 'Cloth' },             // Crushing Coldwraith Belt (Heroic) (Lord Marrowgar)
  49960: { armor_type: 'Plate' },             // Bracers of Dark Reckoning (Lord Marrowgar)
  50611: { armor_type: 'Plate' },             // Bracers of Dark Reckoning (Heroic) (Lord Marrowgar)
  49996: { armor_type: 'Leather' },           // Deathwhisper Raiment (Lady Deathwhisper)
  50649: { armor_type: 'Leather' },           // Deathwhisper Raiment (Heroic) (Lady Deathwhisper)
  49983: { armor_type: 'Plate' },             // Blood-Soaked Saronite Stompers (Lady Deathwhisper)
  50639: { armor_type: 'Plate' },             // Blood-Soaked Saronite Stompers (Heroic) (Lady Deathwhisper)
  49993: { armor_type: 'Mail' },              // Necrophotic Greaves (Lady Deathwhisper)
  50652: { armor_type: 'Mail' },              // Necrophotic Greaves (Heroic) (Lady Deathwhisper)
  49995: { armor_type: 'Plate' },             // Fallen Lord's Handguards (Lady Deathwhisper)
  50650: { armor_type: 'Plate' },             // Fallen Lord's Handguards (Heroic) (Lady Deathwhisper)
  49986: { armor_type: 'Plate' },             // Broken Ram Skull Helm (Lady Deathwhisper)
  50640: { armor_type: 'Plate' },             // Broken Ram Skull Helm (Heroic) (Lady Deathwhisper)
  49988: { armor_type: 'Mail' },              // Leggings of Northern Lights (Lady Deathwhisper)
  50645: { armor_type: 'Mail' },              // Leggings of Northern Lights (Heroic) (Lady Deathwhisper)
  49987: { armor_type: 'Leather' },           // Cultist's Bloodsoaked Spaulders (Lady Deathwhisper)
  50646: { armor_type: 'Leather' },           // Cultist's Bloodsoaked Spaulders (Heroic) (Lady Deathwhisper)
  49991: { armor_type: 'Cloth' },             // Shoulders of Mercy Killing (Lady Deathwhisper)
  50643: { armor_type: 'Cloth' },             // Shoulders of Mercy Killing (Heroic) (Lady Deathwhisper)
  49994: { armor_type: 'Cloth' },             // The Lady's Brittle Bracers (Lady Deathwhisper)
  50651: { armor_type: 'Cloth' },             // The Lady's Brittle Bracers (Heroic) (Lady Deathwhisper)
  50001: { armor_type: 'Leather' },           // Ikfirus' Sack of Wonder (Gunship Battle)
  50656: { armor_type: 'Leather' },           // Ikfirus' Sack of Wonder (Heroic) (Gunship Battle)
  50009: { armor_type: 'Leather' },           // Boots of Unnatural Growth (Gunship Battle)
  50665: { armor_type: 'Leather' },           // Boots of Unnatural Growth (Heroic) (Gunship Battle)
  50011: { armor_type: 'Cloth' },             // Gunship Captain's Mittens (Gunship Battle)
  50663: { armor_type: 'Cloth' },             // Gunship Captain's Mittens (Heroic) (Gunship Battle)
  50006: { armor_type: 'Cloth' },             // Corp'rethar Ceremonial Crown (Gunship Battle)
  50661: { armor_type: 'Cloth' },             // Corp'rethar Ceremonial Crown (Heroic) (Gunship Battle)
  50003: { armor_type: 'Plate' },             // Boneguard Commander's Pauldrons (Gunship Battle)
  50660: { armor_type: 'Plate' },             // Boneguard Commander's Pauldrons (Heroic) (Gunship Battle)
  50010: { armor_type: 'Plate' },             // Waistband of Righteous Fury (Gunship Battle)
  50667: { armor_type: 'Plate' },             // Waistband of Righteous Fury (Heroic) (Gunship Battle)
  50002: { armor_type: 'Plate' },             // Polar Bear Claw Bracers (Gunship Battle)
  50659: { armor_type: 'Plate' },             // Polar Bear Claw Bracers (Heroic) (Gunship Battle)
  50000: { armor_type: 'Mail' },              // Scourge Hunter's Vambraces (Gunship Battle)
  50655: { armor_type: 'Mail' },              // Scourge Hunter's Vambraces (Heroic) (Gunship Battle)
  50015: { armor_type: 'Mail' },              // Belt of the Blood Nova (Deathbringer Saurfang)
  50671: { armor_type: 'Mail' },              // Belt of the Blood Nova (Heroic) (Deathbringer Saurfang)
  50333: { armor_type: 'Leather' },           // Toskk's Maximized Wristguards (Deathbringer Saurfang)
  50670: { armor_type: 'Leather' },           // Toskk's Maximized Wristguards (Heroic) (Deathbringer Saurfang)
  50038: { armor_type: 'Mail' },              // Carapace of Forgotten Kings (Festergut)
  50689: { armor_type: 'Mail' },              // Carapace of Forgotten Kings (Heroic) (Festergut)
  50062: { armor_type: 'Cloth' },             // Plague Scientist's Boots (Festergut)
  50699: { armor_type: 'Cloth' },             // Plague Scientist's Boots (Heroic) (Festergut)
  50037: { armor_type: 'Plate' },             // Fleshrending Gauntlets (Festergut)
  50690: { armor_type: 'Plate' },             // Fleshrending Gauntlets (Heroic) (Festergut)
  50064: { armor_type: 'Mail' },              // Unclean Surgical Gloves (Festergut)
  50703: { armor_type: 'Mail' },              // Unclean Surgical Gloves (Heroic) (Festergut)
  50060: { armor_type: 'Plate' },             // Faceplate of the Forgotten (Festergut)
  50701: { armor_type: 'Plate' },             // Faceplate of the Forgotten (Heroic) (Festergut)
  50042: { armor_type: 'Leather' },           // Gangrenous Leggings (Festergut)
  50697: { armor_type: 'Leather' },           // Gangrenous Leggings (Heroic) (Festergut)
  50041: { armor_type: 'Leather' },           // Leather of Stitched Scourge Parts (Festergut)
  50696: { armor_type: 'Leather' },           // Leather of Stitched Scourge Parts (Heroic) (Festergut)
  50056: { armor_type: 'Cloth' },             // Plaguebringer's Stained Pants (Festergut)
  50694: { armor_type: 'Cloth' },             // Plaguebringer's Stained Pants (Heroic) (Festergut)
  50059: { armor_type: 'Mail' },              // Horrific Flesh Epaulets (Festergut)
  50698: { armor_type: 'Mail' },              // Horrific Flesh Epaulets (Heroic) (Festergut)
  50036: { armor_type: 'Plate' },             // Belt of Broken Bones (Festergut)
  50691: { armor_type: 'Plate' },             // Belt of Broken Bones (Heroic) (Festergut)
  50063: { armor_type: 'Cloth' },             // Lingering Illness (Festergut)
  50702: { armor_type: 'Cloth' },             // Lingering Illness (Heroic) (Festergut)
  50413: { armor_type: 'Mail' },              // Nerub'ar Stalker's Cord (Festergut)
  50688: { armor_type: 'Mail' },              // Nerub'ar Stalker's Cord (Heroic) (Festergut)
  50024: { armor_type: 'Plate' },             // Blightborne Warplate (Rotface)
  50681: { armor_type: 'Plate' },             // Blightborne Warplate (Heroic) (Rotface)
  50027: { armor_type: 'Plate' },             // Rot-Resistant Breastplate (Rotface)
  50680: { armor_type: 'Plate' },             // Rot-Resistant Breastplate (Heroic) (Rotface)
  50021: { armor_type: 'Leather' },           // Aldriana's Gloves of Secrecy (Rotface)
  50675: { armor_type: 'Leather' },           // Aldriana's Gloves of Secrecy (Heroic) (Rotface)
  50026: { armor_type: 'Leather' },           // Helm of the Elder Moon (Rotface)
  50679: { armor_type: 'Leather' },           // Helm of the Elder Moon (Heroic) (Rotface)
  50022: { armor_type: 'Mail' },              // Dual-Bladed Pauldrons (Rotface)
  50673: { armor_type: 'Mail' },              // Dual-Bladed Pauldrons (Heroic) (Rotface)
  50020: { armor_type: 'Plate' },             // Raging Behemoth's Shoulderplates (Rotface)
  50674: { armor_type: 'Plate' },             // Raging Behemoth's Shoulderplates (Heroic) (Rotface)
  50030: { armor_type: 'Mail' },              // Bloodsunder's Bracers (Rotface)
  50687: { armor_type: 'Mail' },              // Bloodsunder's Bracers (Heroic) (Rotface)
  50032: { armor_type: 'Cloth' },             // Death Surgeon's Sleeves (Rotface)
  50686: { armor_type: 'Cloth' },             // Death Surgeon's Sleeves (Heroic) (Rotface)
  50067: { armor_type: 'Leather' },           // Astrylian's Sutured Cinch (Professor Putricide)
  50707: { armor_type: 'Leather' },           // Astrylian's Sutured Cinch (Heroic) (Professor Putricide)
  50069: { armor_type: 'Leather' },           // Professor's Bloodied Smock (Professor Putricide)
  50705: { armor_type: 'Leather' },           // Professor's Bloodied Smock (Heroic) (Professor Putricide)
  50177: { armor_type: 'Mail' },              // Mail of Crimson Coins (Blood Prince Council)
  50723: { armor_type: 'Mail' },              // Mail of Crimson Coins (Heroic) (Blood Prince Council)
  50172: { armor_type: 'Cloth' },             // Sanguine Silk Robes (Blood Prince Council)
  50717: { armor_type: 'Cloth' },             // Sanguine Silk Robes (Heroic) (Blood Prince Council)
  50071: { armor_type: 'Mail' },              // Treads of the Wasteland (Blood Prince Council)
  50711: { armor_type: 'Mail' },              // Treads of the Wasteland (Heroic) (Blood Prince Council)
  50176: { armor_type: 'Cloth' },             // San'layn Ritualist Gloves (Blood Prince Council)
  50722: { armor_type: 'Cloth' },             // San'layn Ritualist Gloves (Heroic) (Blood Prince Council)
  50075: { armor_type: 'Plate' },             // Taldaram's Plated Fists (Blood Prince Council)
  50716: { armor_type: 'Plate' },             // Taldaram's Plated Fists (Heroic) (Blood Prince Council)
  50073: { armor_type: 'Leather' },           // Geistlord's Punishment Sack (Blood Prince Council)
  50713: { armor_type: 'Leather' },           // Geistlord's Punishment Sack (Heroic) (Blood Prince Council)
  50072: { armor_type: 'Plate' },             // Landsoul's Horned Greathelm (Blood Prince Council)
  50712: { armor_type: 'Plate' },             // Landsoul's Horned Greathelm (Heroic) (Blood Prince Council)
  50171: { armor_type: 'Leather' },           // Shoulders of Frost-Tipped Thorns (Blood Prince Council)
  50715: { armor_type: 'Leather' },           // Shoulders of Frost-Tipped Thorns (Heroic) (Blood Prince Council)
  50175: { armor_type: 'Plate' },             // Crypt Keeper's Bracers (Blood Prince Council)
  50721: { armor_type: 'Plate' },             // Crypt Keeper's Bracers (Heroic) (Blood Prince Council)
  50418: { armor_type: 'Cloth' },             // Robe of the Waking Nightmare (Valithria Dreamwalker)
  50629: { armor_type: 'Cloth' },             // Robe of the Waking Nightmare (Heroic) (Valithria Dreamwalker)
  50416: { armor_type: 'Plate' },             // Boots of the Funeral March (Valithria Dreamwalker)
  50632: { armor_type: 'Plate' },             // Boots of the Funeral March (Heroic) (Valithria Dreamwalker)
  50190: { armor_type: 'Plate' },             // Grinning Skull Greatboots (Valithria Dreamwalker)
  50625: { armor_type: 'Plate' },             // Grinning Skull Greatboots (Heroic) (Valithria Dreamwalker)
  50188: { armor_type: 'Mail' },              // Anub'ar Stalker's Gloves (Valithria Dreamwalker)
  50619: { armor_type: 'Mail' },              // Anub'ar Stalker's Gloves (Heroic) (Valithria Dreamwalker)
  50202: { armor_type: 'Mail' },              // Snowstorm Helm (Valithria Dreamwalker)
  50626: { armor_type: 'Mail' },              // Snowstorm Helm (Heroic) (Valithria Dreamwalker)
  50199: { armor_type: 'Plate' },             // Leggings of Dying Candles (Valithria Dreamwalker)
  50623: { armor_type: 'Plate' },             // Leggings of Dying Candles (Heroic) (Valithria Dreamwalker)
  50192: { armor_type: 'Plate' },             // Scourge Reaver's Legplates (Valithria Dreamwalker)
  50624: { armor_type: 'Plate' },             // Scourge Reaver's Legplates (Heroic) (Valithria Dreamwalker)
  50187: { armor_type: 'Plate' },             // Coldwraith Links (Valithria Dreamwalker)
  50620: { armor_type: 'Plate' },             // Coldwraith Links (Heroic) (Valithria Dreamwalker)
  50417: { armor_type: 'Leather' },           // Bracers of Eternal Dreaming (Valithria Dreamwalker)
  50630: { armor_type: 'Leather' },           // Bracers of Eternal Dreaming (Heroic) (Valithria Dreamwalker)

  // Ruby Sanctum
  44309: { armor_type: 'Cloth' },             // Sash of Jordan (Saviana Ragefire)
  53125: { armor_type: 'Plate' },             // Apocalypse's Advance (Halion)
  54578: { armor_type: 'Plate' },             // Apocalypse's Advance (Heroic) (Halion)
  53487: { armor_type: 'Plate' },             // Foreshadow Steps (Halion)
  54586: { armor_type: 'Plate' },             // Foreshadow Steps (Heroic) (Halion)
  53127: { armor_type: 'Mail' },              // Returning Footfalls (Halion)
  54577: { armor_type: 'Mail' },              // Returning Footfalls (Heroic) (Halion)
  53129: { armor_type: 'Plate' },             // Treads of Impending Resurrection (Halion)
  54579: { armor_type: 'Plate' },             // Treads of Impending Resurrection (Heroic) (Halion)
  53488: { armor_type: 'Mail' },              // Split Shape Belt (Halion)
  54587: { armor_type: 'Mail' },              // Split Shape Belt (Heroic) (Halion)
  53486: { armor_type: 'Cloth' },             // Bracers of Fiery Night (Halion)
  54582: { armor_type: 'Cloth' },             // Bracers of Fiery Night (Heroic) (Halion)
  53134: { armor_type: 'Leather' },           // Phaseshifter's Bracers (Halion)
  54584: { armor_type: 'Leather' },           // Phaseshifter's Bracers (Heroic) (Halion)
  53126: { armor_type: 'Leather' },           // Umbrage Armbands (Halion)
  54580: { armor_type: 'Leather' },           // Umbrage Armbands (Heroic) (Halion)

  // ============================================================================
  // CLASSIC TIER 1 (MOLTEN CORE)
  // ============================================================================

  // Arcanist (Mage) - Cloth
  16795: { armor_type: 'Cloth' },             // Arcanist Crown
  16796: { armor_type: 'Cloth' },             // Arcanist Leggings
  16797: { armor_type: 'Cloth' },             // Arcanist Mantle
  16800: { armor_type: 'Cloth' },             // Arcanist Boots
  16801: { armor_type: 'Cloth' },             // Arcanist Gloves

  // Felheart (Warlock) - Cloth
  16803: { armor_type: 'Cloth' },             // Felheart Slippers
  16805: { armor_type: 'Cloth' },             // Felheart Gloves
  16807: { armor_type: 'Cloth' },             // Felheart Shoulder Pads
  16808: { armor_type: 'Cloth' },             // Felheart Horns
  16810: { armor_type: 'Cloth' },             // Felheart Pants

  // Prophecy (Priest) - Cloth
  16811: { armor_type: 'Cloth' },             // Boots of Prophecy
  16812: { armor_type: 'Cloth' },             // Gloves of Prophecy
  16813: { armor_type: 'Cloth' },             // Circlet of Prophecy
  16814: { armor_type: 'Cloth' },             // Pants of Prophecy
  16816: { armor_type: 'Cloth' },             // Mantle of Prophecy

  // Netherwind Belt (Mage T2) - Cloth
  16818: { armor_type: 'Cloth' },             // Netherwind Belt

  // Nightslayer (Rogue) - Leather
  16820: { armor_type: 'Leather' },           // Nightslayer Chestpiece
  16821: { armor_type: 'Leather' },           // Nightslayer Cover
  16822: { armor_type: 'Leather' },           // Nightslayer Pants
  16823: { armor_type: 'Leather' },           // Nightslayer Shoulder Pads
  16824: { armor_type: 'Leather' },           // Nightslayer Boots
  16826: { armor_type: 'Leather' },           // Nightslayer Gloves

  // Cenarion (Druid) - Leather
  16829: { armor_type: 'Leather' },           // Cenarion Boots
  16831: { armor_type: 'Leather' },           // Cenarion Gloves
  16833: { armor_type: 'Leather' },           // Cenarion Vestments
  16834: { armor_type: 'Leather' },           // Cenarion Helm
  16835: { armor_type: 'Leather' },           // Cenarion Leggings
  16836: { armor_type: 'Leather' },           // Cenarion Spaulders
  16832: { armor_type: 'Leather' },           // Bloodfang Spaulders (T2 Rogue)

  // Earthfury (Shaman) - Mail
  16837: { armor_type: 'Mail' },              // Earthfury Boots
  16841: { armor_type: 'Mail' },              // Earthfury Vestments
  16842: { armor_type: 'Mail' },              // Earthfury Helmet
  16843: { armor_type: 'Mail' },              // Earthfury Legguards
  16844: { armor_type: 'Mail' },              // Earthfury Epaulets

  // Giantstalker (Hunter) - Mail
  16846: { armor_type: 'Mail' },              // Giantstalker's Helmet
  16847: { armor_type: 'Mail' },              // Giantstalker's Leggings
  16848: { armor_type: 'Mail' },              // Giantstalker's Epaulets
  16849: { armor_type: 'Mail' },              // Giantstalker's Boots
  16852: { armor_type: 'Mail' },              // Giantstalker's Gloves

  // Lawbringer (Paladin) - Plate
  16853: { armor_type: 'Plate' },             // Lawbringer Chestguard
  16854: { armor_type: 'Plate' },             // Lawbringer Helm
  16856: { armor_type: 'Plate' },             // Lawbringer Spaulders
  16859: { armor_type: 'Plate' },             // Lawbringer Boots

  // Might (Warrior) - Plate
  16866: { armor_type: 'Plate' },             // Helm of Might
  16868: { armor_type: 'Plate' },             // Pauldrons of Might

  // ============================================================================
  // CLASSIC TIER 2 (BWL)
  // ============================================================================

  // Stormrage (Druid) - Leather
  16897: { armor_type: 'Leather' },           // Stormrage Chestguard
  16898: { armor_type: 'Leather' },           // Stormrage Boots
  16899: { armor_type: 'Leather' },           // Stormrage Handguards
  16900: { armor_type: 'Leather' },           // Stormrage Cover
  16901: { armor_type: 'Leather' },           // Stormrage Legguards
  16902: { armor_type: 'Leather' },           // Stormrage Pauldrons
  16903: { armor_type: 'Leather' },           // Stormrage Belt
  16904: { armor_type: 'Leather' },           // Stormrage Bracers

  // Bloodfang (Rogue) - Leather
  16905: { armor_type: 'Leather' },           // Bloodfang Chestpiece
  16906: { armor_type: 'Leather' },           // Bloodfang Boots
  16907: { armor_type: 'Leather' },           // Bloodfang Gloves
  16908: { armor_type: 'Leather' },           // Bloodfang Hood
  16909: { armor_type: 'Leather' },           // Bloodfang Pants
  16910: { armor_type: 'Leather' },           // Bloodfang Belt
  16911: { armor_type: 'Leather' },           // Bloodfang Bracers

  // Netherwind (Mage) - Cloth
  16912: { armor_type: 'Cloth' },             // Netherwind Boots
  16913: { armor_type: 'Cloth' },             // Netherwind Gloves
  16914: { armor_type: 'Cloth' },             // Netherwind Crown
  16915: { armor_type: 'Cloth' },             // Netherwind Pants
  16917: { armor_type: 'Cloth' },             // Netherwind Mantle
  16918: { armor_type: 'Cloth' },             // Netherwind Bindings

  // Transcendence (Priest) - Cloth
  16919: { armor_type: 'Cloth' },             // Boots of Transcendence
  16920: { armor_type: 'Cloth' },             // Handguards of Transcendence
  16921: { armor_type: 'Cloth' },             // Halo of Transcendence
  16922: { armor_type: 'Cloth' },             // Leggings of Transcendence
  16924: { armor_type: 'Cloth' },             // Pauldrons of Transcendence
  16925: { armor_type: 'Cloth' },             // Belt of Transcendence
  16926: { armor_type: 'Cloth' },             // Bindings of Transcendence

  // Nemesis (Warlock) - Cloth
  16927: { armor_type: 'Cloth' },             // Nemesis Boots
  16928: { armor_type: 'Cloth' },             // Nemesis Gloves
  16929: { armor_type: 'Cloth' },             // Nemesis Skullcap
  16930: { armor_type: 'Cloth' },             // Nemesis Leggings
  16932: { armor_type: 'Cloth' },             // Nemesis Spaulders
  16933: { armor_type: 'Cloth' },             // Nemesis Belt
  16934: { armor_type: 'Cloth' },             // Nemesis Bracers

  // Dragonstalker (Hunter) - Mail
  16935: { armor_type: 'Mail' },              // Dragonstalker's Bracers
  16936: { armor_type: 'Mail' },              // Dragonstalker's Belt
  16937: { armor_type: 'Mail' },              // Dragonstalker's Spaulders
  16938: { armor_type: 'Mail' },              // Dragonstalker's Legguards
  16939: { armor_type: 'Mail' },              // Dragonstalker's Helm

  // Ten Storms (Shaman) - Mail
  16943: { armor_type: 'Mail' },              // Bracers of Ten Storms
  16944: { armor_type: 'Mail' },              // Belt of Ten Storms
  16945: { armor_type: 'Mail' },              // Epaulets of Ten Storms
  16947: { armor_type: 'Mail' },              // Helmet of Ten Storms

  // Judgement (Paladin) - Plate
  16951: { armor_type: 'Plate' },             // Judgment Bindings
  16952: { armor_type: 'Plate' },             // Judgment Belt
  16953: { armor_type: 'Plate' },             // Judgment Spaulders
  16955: { armor_type: 'Plate' },             // Judgment Crown

  // Wrath (Warrior) - Plate
  16959: { armor_type: 'Plate' },             // Bracelets of Wrath
  16960: { armor_type: 'Plate' },             // Waistband of Wrath
  16961: { armor_type: 'Plate' },             // Pauldrons of Wrath
  16963: { armor_type: 'Plate' },             // Helm of Wrath

  // ============================================================================
  // CLASSIC MC/BWL WEAPONS & MISC
  // ============================================================================

  17066: { weapon_type: 'Shield' },           // Drillborer Disk
  // 17067: Ancient Cornerstone Grimoire — removed (class-agnostic slot, no type needed)
  17068: { weapon_type: 'One-Handed Axe' }, // Deathbringer
  17069: { weapon_type: 'Bow' },              // Striker's Mark
  17071: { weapon_type: 'Dagger' },           // Gutgore Ripper
  17072: { weapon_type: 'Gun' },              // Blastershot Launcher
  17073: { weapon_type: 'Two-Handed Mace' },  // Earthshaker
  17074: { weapon_type: 'Polearm' }, // Shadowstrike
  17075: { weapon_type: 'One-Handed Sword' }, // Vis'kag the Bloodletter
  17076: { weapon_type: 'Two-Handed Sword' }, // Bonereaver's Edge
  17077: { weapon_type: 'Wand' },             // Crimson Shocker
  17103: { weapon_type: 'One-Handed Sword' }, // Azuresong Mageblade
  17104: { weapon_type: 'Two-Handed Axe' },   // Spinal Reaper
  17105: { weapon_type: 'One-Handed Mace' },  // Aurastone Hammer
  17106: { weapon_type: 'Shield' },           // Malistar's Defender
  18203: { weapon_type: 'Fist Weapon' },      // Eskhandar's Right Claw
  18803: { weapon_type: 'Two-Handed Mace' },  // Hyperthermically Insulated Lava Dredger
  18805: { weapon_type: 'Dagger' },           // Core Hound Tooth
  18816: { weapon_type: 'Dagger' },           // Perdition's Blade
  18832: { weapon_type: 'One-Handed Sword' }, // Brutality Blade

  // Classic armor drops
  18809: { armor_type: 'Cloth' },             // Sash of Whispered Secrets
  18810: { armor_type: 'Leather' },           // Wild Growth Spaulders
  18812: { armor_type: 'Mail' },           // Wristguards of True Flight
  18817: { armor_type: 'Mail' },             // Crown of Destruction
  18823: { armor_type: 'Leather' },           // Aged Core Leather Gloves
  18824: { armor_type: 'Plate' },             // Magma Tempered Boots
  18829: { armor_type: 'Mail' },           // Deep Earth Spaulders
  18870: { armor_type: 'Mail' },           // Helm of the Lifegiver
  18872: { armor_type: 'Cloth' },             // Manastorm Leggings
  18875: { armor_type: 'Leather' },           // Salamander Scale Pants
  18878: { weapon_type: 'Dagger' },           // Sorcerous Dagger

  // Classic belts/misc
  19136: { armor_type: 'Cloth' },             // Mana Igniting Cord
  19137: { armor_type: 'Plate' },             // Onslaught Girdle
  19146: { armor_type: 'Leather' },           // Wristguards of Stability

  // BWL Weapons
  19335: { weapon_type: 'One-Handed Mace' },  // Spineshatter
  19346: { weapon_type: 'Dagger' },           // Dragonfang Blade
  19347: { weapon_type: 'Dagger' },      // Claw of Chromaggus
  19348: { weapon_type: 'Shield' },           // Red Dragonscale Protector
  19349: { weapon_type: 'Shield' },           // Elementium Reinforced Bulwark
  19350: { weapon_type: 'Bow' },              // Heartstriker
  19351: { weapon_type: 'One-Handed Sword' }, // Maladath, Runed Blade of the Black Flight
  19352: { weapon_type: 'One-Handed Sword' }, // Chromatically Tempered Sword
  19353: { weapon_type: 'Two-Handed Axe' },   // Drake Talon Cleaver
  19357: { weapon_type: 'Two-Handed Mace' },  // Herald of Woe
  19360: { weapon_type: 'One-Handed Mace' },  // Lok'amir il Romathis
  19363: { weapon_type: 'One-Handed Axe' },   // Crul'shorukh, Edge of Chaos
  19365: { weapon_type: 'Fist Weapon' },      // Claw of the Black Drake
  19367: { weapon_type: 'Wand' },             // Dragon's Touch
  19368: { weapon_type: 'Gun' },              // Dragonbreath Hand Cannon

  // BWL Armor
  19369: { armor_type: 'Cloth' },           // Gloves of Rapid Evolution
  19370: { armor_type: 'Cloth' },             // Mantle of the Blackwing Cabal
  19372: { armor_type: 'Plate' },             // Helm of Endless Rage
  19373: { armor_type: 'Mail' },              // Black Brood Pauldrons
  19374: { armor_type: 'Cloth' },             // Bracers of Arcane Accuracy
  19375: { armor_type: 'Cloth' },             // Mish'undare, Circlet of the Mind Flayer
  19380: { armor_type: 'Mail' },              // Therazane's Link
  19381: { armor_type: 'Leather' },           // Boots of the Shadow Flame
  19385: { armor_type: 'Cloth' },             // Empowered Leggings
  19387: { armor_type: 'Plate' },             // Chromatic Boots
  19388: { armor_type: 'Cloth' },             // Angelista's Grasp
  19389: { armor_type: 'Leather' },           // Taut Dragonhide Shoulderpads
  19390: { armor_type: 'Leather' },           // Taut Dragonhide Gloves
  19391: { armor_type: 'Cloth' },             // Shimmering Geta
  19392: { armor_type: 'Plate' },             // Girdle of the Fallen Crusader
  19393: { armor_type: 'Mail' },              // Primalist's Linked Waistguard
  19394: { armor_type: 'Plate' },              // Drake Talon Pauldrons
  19396: { armor_type: 'Leather' },           // Taut Dragonhide Belt
  19400: { armor_type: 'Cloth' },           // Firemaw's Clutch
  19401: { armor_type: 'Mail' },              // Primalist's Linked Legguards
  19402: { armor_type: 'Plate' },             // Legguards of the Fallen Crusader
  19405: { armor_type: 'Leather' },           // Malfurion's Blessed Bulwark
  19407: { armor_type: 'Cloth' },           // Ebony Flame Gloves
  19433: { armor_type: 'Mail' },           // Emberweave Leggings

  // ============================================================================
  // AQ20/AQ40
  // ============================================================================

  21492: { weapon_type: 'Two-Handed Sword' }, // Manslayer of the Qiraji
  21493: { armor_type: 'Leather' },             // Boots of the Vanguard
  21494: { armor_type: 'Leather' },             // Southwind's Grasp
  21496: { armor_type: 'Cloth' },             // Bracers of Qiraji Command
  21497: { armor_type: 'Mail' },             // Boots of the Qiraji General
  21498: { weapon_type: 'Dagger' },           // Qiraji Sacrificial Dagger
  21499: { armor_type: 'Cloth' },             // Vestments of the Shifting Sands
  21500: { armor_type: 'Cloth' },           // Belt of the Inquisition
  21501: { armor_type: 'Leather' },           // Toughened Silithid Hide Gloves
  21502: { armor_type: 'Mail' },              // Sand Reaver Wristguards
  21503: { armor_type: 'Plate' },           // Belt of the Sand Reaver

  // ============================================================================
  // HYJAL SUMMIT ADDITIONS
  // ============================================================================

  29977: { armor_type: 'Cloth' },             // Star-Soul Breeches
  29951: { armor_type: 'Mail' },           // Star-Strider Boots
  30861: { armor_type: 'Plate' },             // Furious Shackles
  30862: { armor_type: 'Plate' },             // Blessed Adamantite Bracers
  30026: { armor_type: 'Mail' },              // Bands of the Celestial Archer
  29996: { weapon_type: 'One-Handed Mace' },  // Rod of the Sun King

  // ============================================================================
  // ZUL'GURUB (Classic)
  // ============================================================================

  19896: { weapon_type: 'Fist Weapon' },      // Thekal's Grasp
  19897: { armor_type: 'Cloth' },           // Betrayer's Boots
  19899: { armor_type: 'Cloth' },              // Ritualistic Legguards
  19901: { weapon_type: 'One-Handed Sword' }, // Zulian Slicer
  19903: { weapon_type: 'Dagger' },           // Fang of Venoxis
  19904: { armor_type: 'Mail' },              // Runed Bloodstained Hauberk
  19906: { armor_type: 'Leather' },           // Blooddrenched Footpads
  19909: { weapon_type: 'Staff' },            // Will of Arlokk
  19910: { weapon_type: 'Fist Weapon' },      // Arlokk's Grasp
  19915: { weapon_type: 'Shield' },           // Zulian Defender
  19918: { weapon_type: 'Two-Handed Mace' },  // Jeklik's Crusher
  19927: { weapon_type: 'Wand' },             // Mar'li's Touch
  19928: { armor_type: 'Leather' },           // Animist's Spaulders
  20260: { armor_type: 'Mail' },              // Seafury Leggings
  20262: { armor_type: 'Mail' },              // Seafury Boots
  20265: { armor_type: 'Plate' },             // Peacekeeper Boots
  20266: { armor_type: 'Plate' },             // Peacekeeper Leggings

  // Additional ZG items
  19852: { weapon_type: 'One-Handed Axe' },   // Ancient Hakkari Manslayer
  19853: { weapon_type: 'Gun' },              // Gurubashi Dwarf Destroyer
  19854: { weapon_type: 'Two-Handed Sword' }, // Zin'rokh, Destroyer of Worlds
  19859: { weapon_type: 'Dagger' },           // Fang of the Faceless
  19861: { weapon_type: 'Wand' },             // Touch of Chaos
  19862: { weapon_type: 'Shield' },           // Aegis of the Blood God
  19864: { weapon_type: 'One-Handed Sword' },           // Bloodcaller
  19865: { weapon_type: 'One-Handed Sword' }, // Warblade of the Hakkari (Main Hand)
  19866: { weapon_type: 'One-Handed Sword' }, // Warblade of the Hakkari
  19867: { weapon_type: 'One-Handed Sword' },           // Bloodlord's Defender
  19869: { armor_type: 'Leather' },           // Blooddrenched Grips
  19874: { weapon_type: 'Polearm' },          // Halberd of Smiting
  19877: { armor_type: 'Leather' },           // Animist's Leggings
  19878: { armor_type: 'Plate' },              // Bloodsoaked Pauldrons
  19895: { armor_type: 'Cloth' },           // Bloodtinged Kilt
  19944: { weapon_type: 'Staff' },            // Nat Pagle's Fish Terminator
  19945: { armor_type: 'Leather' },           // Lizardscale Eyepatch
  19946: { weapon_type: 'Polearm' },          // Tigule's Harpoon
  19961: { weapon_type: 'One-Handed Mace' },  // Gri'lek's Grinder
  19962: { weapon_type: 'Two-Handed Axe' },   // Gri'lek's Carver
  19963: { weapon_type: 'Polearm' },          // Pitchfork of Madness
  19967: { weapon_type: 'Wand' },             // Thoughtblighter
  19875: { armor_type: 'Mail' },              // Bloodstained Coif
  19884: { weapon_type: 'Staff' },            // Jin'do's Judgment
  19886: { armor_type: 'Cloth' },             // The Hexxer's Cover
  19889: { armor_type: 'Leather' },           // Blooddrenched Leggings
  19890: { weapon_type: 'One-Handed Mace' },  // Jin'do's Hexxer
  19929: { armor_type: 'Cloth' },           // Bloodtinged Gloves
  19964: { weapon_type: 'One-Handed Sword' },             // Renataki's Soul Conduit
  19965: { weapon_type: 'Dagger' },           // Wushoolay's Poker
  19968: { weapon_type: 'One-Handed Sword' },  // Fiery Retributer
  20038: { weapon_type: 'Bow' },              // Mandokir's Sting

  // ============================================================================
  // CLASSIC GH-273 ADDITIONS (trash epics, Tier 1 belts/bracers, missing boss
  // drops). Types from the wow-classic-items package subclass; class-agnostic
  // slots (Back, Finger, Trinket) and tokens need none.
  // ============================================================================

  // Molten Core trash: Tier 1 belts and bracers
  16799: { armor_type: 'Cloth' },             // Arcanist Bindings
  16802: { armor_type: 'Cloth' },             // Arcanist Belt
  16804: { armor_type: 'Cloth' },             // Felheart Bracers
  16806: { armor_type: 'Cloth' },             // Felheart Belt
  16817: { armor_type: 'Cloth' },             // Girdle of Prophecy
  16819: { armor_type: 'Cloth' },             // Vambraces of Prophecy
  16825: { armor_type: 'Leather' },           // Nightslayer Bracelets
  16827: { armor_type: 'Leather' },           // Nightslayer Belt
  16828: { armor_type: 'Leather' },           // Cenarion Belt
  16830: { armor_type: 'Leather' },           // Cenarion Bracers
  16838: { armor_type: 'Mail' },              // Earthfury Belt
  16840: { armor_type: 'Mail' },              // Earthfury Bracers
  16850: { armor_type: 'Mail' },              // Giantstalker's Bracers
  16851: { armor_type: 'Mail' },              // Giantstalker's Belt
  16857: { armor_type: 'Plate' },             // Lawbringer Bracers
  16858: { armor_type: 'Plate' },             // Lawbringer Belt
  16861: { armor_type: 'Plate' },             // Bracers of Might
  16864: { armor_type: 'Plate' },             // Belt of Might

  // Molten Core: Majordomo Executus (Cache of the Firelord)
  19139: { armor_type: 'Leather' },           // Fireguard Shoulders
  18808: { armor_type: 'Cloth' },             // Gloves of the Hypnotic Flame

  // Blackwing Lair trash
  19437: { armor_type: 'Cloth' },             // Boots of Pure Thought
  19438: { armor_type: 'Cloth' },             // Ringo's Blizzard Boots
  19439: { armor_type: 'Leather' },           // Interlaced Shadow Jerkin
  19435: { weapon_type: 'Wand' },             // Essence Gatherer
  19362: { weapon_type: 'One-Handed Axe' },   // Doom's Edge
  19358: { weapon_type: 'Two-Handed Mace' },  // Draconic Maul
  19354: { weapon_type: 'Two-Handed Axe' },   // Draconic Avenger

  // Temple of Ahn'Qiraj boss drops
  21705: { armor_type: 'Mail' },              // Boots of the Fallen Prophet (The Prophet Skeram)
  21693: { armor_type: 'Leather' },           // Guise of the Devourer (Silithid Royalty)
  21682: { armor_type: 'Leather' },           // Bile-Covered Gauntlets (Silithid Royalty)
  21684: { armor_type: 'Mail' },              // Mantle of the Desert's Fury (Silithid Royalty)
  21675: { armor_type: 'Leather' },           // Thick Qirajihide Belt (Battleguard Sartura)

  // Temple of Ahn'Qiraj trash
  21838: { armor_type: 'Cloth' },             // Garb of Royal Ascension
  21888: { armor_type: 'Cloth' },             // Gloves of the Immortal
  21889: { armor_type: 'Plate' },             // Gloves of the Redeemed Prophecy
  21856: { weapon_type: 'Two-Handed Axe' },   // Neretzek, The Blood Drinker
  21837: { weapon_type: 'One-Handed Mace' },  // Anubisath Warhammer

  // ============================================================================
  // CLASSIC GH-388 ADDITIONS (every other Classic raid armor piece). Types
  // from the wow-classic-items package subclass, so no Classic raid armor
  // piece falls back to a guess from its name. Back items (class-agnostic
  // in the picker), tokens, quest items and recipes need none.
  // ============================================================================

  // Molten Core
  16863: { armor_type: 'Plate' },             // Gauntlets of Might (Lucifron)
  18861: { armor_type: 'Plate' },             // Flamewaker Legplates (Lucifron)
  19145: { armor_type: 'Cloth' },             // Robe of Volatile Power (Lucifron)
  16855: { armor_type: 'Plate' },             // Lawbringer Legplates (Magmadar)
  16867: { armor_type: 'Plate' },             // Legplates of Might (Magmadar)
  19143: { armor_type: 'Plate' },             // Flameguard Gauntlets (Magmadar)
  19144: { armor_type: 'Mail' },              // Sabatons of the Flamewalker (Magmadar)
  16839: { armor_type: 'Mail' },              // Earthfury Gauntlets (Gehennas)
  16860: { armor_type: 'Plate' },             // Lawbringer Gauntlets (Gehennas)
  16862: { armor_type: 'Plate' },             // Sabatons of Might (Gehennas)
  16798: { armor_type: 'Cloth' },             // Arcanist Robes (Golemagg the Incinerator)
  16809: { armor_type: 'Cloth' },             // Felheart Robes (Golemagg the Incinerator)
  16815: { armor_type: 'Cloth' },             // Robes of Prophecy (Golemagg the Incinerator)
  16845: { armor_type: 'Mail' },              // Giantstalker's Breastplate (Golemagg the Incinerator)
  16865: { armor_type: 'Plate' },             // Breastplate of Might (Golemagg the Incinerator)
  18806: { armor_type: 'Plate' },             // Core Forged Greaves (Majordomo Executus)
  16946: { armor_type: 'Mail' },              // Legplates of Ten Storms (Ragnaros)
  16954: { armor_type: 'Plate' },             // Judgement Legplates (Ragnaros)
  16962: { armor_type: 'Plate' },             // Legplates of Wrath (Ragnaros)

  // Blackwing Lair
  16941: { armor_type: 'Mail' },              // Dragonstalker's Greaves (Broodlord Lashlayer)
  16949: { armor_type: 'Mail' },              // Greaves of Ten Storms (Broodlord Lashlayer)
  16957: { armor_type: 'Plate' },             // Judgement Sabatons (Broodlord Lashlayer)
  16965: { armor_type: 'Plate' },             // Sabatons of Wrath (Broodlord Lashlayer)
  16940: { armor_type: 'Mail' },              // Dragonstalker's Gauntlets (Firemaw)
  16948: { armor_type: 'Mail' },              // Gauntlets of Ten Storms (Firemaw)
  16956: { armor_type: 'Plate' },             // Judgement Gauntlets (Firemaw)
  16964: { armor_type: 'Plate' },             // Gauntlets of Wrath (Firemaw)
  19399: { armor_type: 'Cloth' },             // Black Ash Robe (Firemaw)
  16916: { armor_type: 'Cloth' },             // Netherwind Robes (Nefarian)
  16923: { armor_type: 'Cloth' },             // Robes of Transcendence (Nefarian)
  16931: { armor_type: 'Cloth' },             // Nemesis Robes (Nefarian)
  16942: { armor_type: 'Mail' },              // Dragonstalker's Breastplate (Nefarian)
  16950: { armor_type: 'Mail' },              // Breastplate of Ten Storms (Nefarian)
  16958: { armor_type: 'Plate' },             // Judgement Breastplate (Nefarian)
  16966: { armor_type: 'Plate' },             // Breastplate of Wrath (Nefarian)

  // Zul'Gurub
  20032: { armor_type: 'Cloth' },             // Flowing Ritual Robes (High Priestess Mar'li)
  19919: { armor_type: 'Mail' },              // Bloodstained Greaves (High Priestess Mar'li)
  19913: { armor_type: 'Plate' },             // Bloodsoaked Greaves (High Priestess Arlokk)
  19894: { armor_type: 'Plate' },             // Bloodsoaked Gauntlets (Jin'do the Hexxer)
  19887: { armor_type: 'Mail' },              // Bloodstained Legplates (Jin'do the Hexxer)
  20257: { armor_type: 'Mail' },              // Seafury Gauntlets (Hakkar the Soulflayer)
  19855: { armor_type: 'Plate' },             // Bloodsoaked Legplates (Hakkar the Soulflayer)
  20264: { armor_type: 'Plate' },             // Peacekeeper Gauntlets (Hakkar the Soulflayer)

  // Ruins of Ahn'Qiraj
  21495: { armor_type: 'Plate' },             // Legplates of the Qiraji Command (General Rajaxx)
  21810: { armor_type: 'Cloth' },             // Treads of the Wandering Nomad (General Rajaxx)
  21489: { armor_type: 'Cloth' },             // Quicksand Waders (Buru the Gorger)
  21491: { armor_type: 'Leather' },           // Scaled Bracers of the Gorger (Buru the Gorger)
  21487: { armor_type: 'Mail' },              // Slimy Scaled Gauntlets (Buru the Gorger)
  21486: { armor_type: 'Plate' },             // Gloves of the Swarm (Buru the Gorger)
  21490: { armor_type: 'Plate' },             // Slime Kickers (Buru the Gorger)
  21484: { armor_type: 'Leather' },           // Helm of Regrowth (Ayamiss the Hunter)
  21480: { armor_type: 'Mail' },              // Scaled Silithid Gauntlets (Ayamiss the Hunter)
  21482: { armor_type: 'Mail' },              // Boots of the Fiery Sands (Ayamiss the Hunter)
  21472: { armor_type: 'Cloth' },             // Dustwind Turban (Moam)
  21468: { armor_type: 'Cloth' },             // Mantle of Maz'Nadir (Moam)
  21455: { armor_type: 'Leather' },           // Southwind Helm (Moam)
  21474: { armor_type: 'Leather' },           // Chitinous Shoulderguards (Moam)
  21467: { armor_type: 'Leather' },           // Thick Silithid Chestguard (Moam)
  21469: { armor_type: 'Leather' },           // Gauntlets of Southwind (Moam)
  21479: { armor_type: 'Plate' },             // Gauntlets of the Immovable (Moam)
  21476: { armor_type: 'Mail' },              // Obsidian Scaled Leggings (Moam)
  21475: { armor_type: 'Plate' },             // Legplates of the Destroyer (Moam)
  21453: { armor_type: 'Plate' },             // Mantle of the Horusath (Ossirian the Unscarred)
  21454: { armor_type: 'Mail' },              // Runic Stone Shoulders (Ossirian the Unscarred)
  21457: { armor_type: 'Plate' },             // Bracers of Brutality (Ossirian the Unscarred)
  21458: { armor_type: 'Leather' },           // Gauntlets of New Life (Ossirian the Unscarred)
  21460: { armor_type: 'Plate' },             // Helm of Domination (Ossirian the Unscarred)
  21461: { armor_type: 'Cloth' },             // Leggings of the Black Blizzard (Ossirian the Unscarred)
  21462: { armor_type: 'Cloth' },             // Gloves of Dark Wisdom (Ossirian the Unscarred)
  21463: { armor_type: 'Mail' },              // Ossirian's Binding (Ossirian the Unscarred)
  21464: { armor_type: 'Cloth' },             // Shackles of the Unscarred (Ossirian the Unscarred)

  // Temple of Ahn'Qiraj
  21814: { armor_type: 'Plate' },             // Breastplate of Annihilation (The Prophet Skeram)
  21698: { armor_type: 'Leather' },           // Leggings of Immersion (The Prophet Skeram)
  21708: { armor_type: 'Leather' },           // Beetle Scaled Wristguards (The Prophet Skeram)
  21699: { armor_type: 'Mail' },              // Barrage Shoulders (The Prophet Skeram)
  21704: { armor_type: 'Plate' },             // Boots of the Redeemed Prophecy (The Prophet Skeram)
  21706: { armor_type: 'Plate' },             // Boots of the Unwavering Will (The Prophet Skeram)
  21686: { armor_type: 'Cloth' },             // Mantle of Phrenic Power (Silithid Royalty)
  21694: { armor_type: 'Cloth' },             // Ternary Mantle (Silithid Royalty)
  21696: { armor_type: 'Cloth' },             // Robes of the Triumvirate (Silithid Royalty)
  21683: { armor_type: 'Plate' },             // Mantle of the Desert Crusade (Silithid Royalty)
  21692: { armor_type: 'Plate' },             // Triad Girdle (Silithid Royalty)
  21680: { armor_type: 'Leather' },           // Vest of Swift Execution (Silithid Royalty)
  21689: { armor_type: 'Leather' },           // Gloves of Ebru (Silithid Royalty)
  21691: { armor_type: 'Plate' },             // Ooze-Ridden Gauntlets (Silithid Royalty)
  21688: { armor_type: 'Plate' },             // Boots of the Fallen Hero (Silithid Royalty)
  21669: { armor_type: 'Leather' },           // Creeping Vine Helm (Battleguard Sartura)
  21676: { armor_type: 'Cloth' },             // Leggings of the Festering Swarm (Battleguard Sartura)
  21648: { armor_type: 'Cloth' },             // Recomposed Boots (Battleguard Sartura)
  21671: { armor_type: 'Cloth' },             // Robes of the Battleguard (Battleguard Sartura)
  21672: { armor_type: 'Leather' },           // Gloves of Enforcement (Battleguard Sartura)
  21668: { armor_type: 'Mail' },              // Scaled Leggings of Qiraji Fury (Battleguard Sartura)
  21674: { armor_type: 'Plate' },             // Gauntlets of Steadfast Determination (Battleguard Sartura)
  21667: { armor_type: 'Plate' },             // Legplates of Blazing Light (Battleguard Sartura)
  21663: { armor_type: 'Cloth' },             // Robes of the Guardian Saint (Fankriss the Unyielding)
  21665: { armor_type: 'Leather' },           // Mantle of Wicked Revenge (Fankriss the Unyielding)
  21639: { armor_type: 'Plate' },             // Pauldrons of the Unrelenting (Fankriss the Unyielding)
  21652: { armor_type: 'Plate' },             // Silithid Carapace Chestguard (Fankriss the Unyielding)
  21645: { armor_type: 'Leather' },           // Hive Tunneler's Boots (Fankriss the Unyielding)
  21651: { armor_type: 'Mail' },              // Scaled Sand Reaver Leggings (Fankriss the Unyielding)
  21624: { armor_type: 'Mail' },              // Gauntlets of Kalimdor (Viscidus)
  21623: { armor_type: 'Plate' },             // Gauntlets of the Righteous Champion (Viscidus)
  21626: { armor_type: 'Mail' },              // Slime-Coated Leggings (Viscidus)
  21619: { armor_type: 'Cloth' },             // Gloves of the Messiah (Princess Huhuran)
  21617: { armor_type: 'Leather' },           // Wasphide Gauntlets (Princess Huhuran)
  21618: { armor_type: 'Plate' },             // Hive Defiler Wristguards (Princess Huhuran)
  21600: { armor_type: 'Cloth' },             // Boots of Epiphany (Twin Emperors)
  21602: { armor_type: 'Leather' },           // Qiraji Execution Bracers (Twin Emperors)
  21598: { armor_type: 'Plate' },             // Royal Qiraji Belt (Twin Emperors)
  21599: { armor_type: 'Mail' },              // Vek'lor's Gloves of Devastation (Twin Emperors)
  21604: { armor_type: 'Cloth' },             // Bracelets of Royal Redemption (Twin Emperors)
  21605: { armor_type: 'Leather' },           // Gloves of the Hidden Temple (Twin Emperors)
  21606: { armor_type: 'Plate' },             // Belt of the Fallen Emperor (Twin Emperors)
  21607: { armor_type: 'Mail' },              // Grasp of the Fallen Emperor (Twin Emperors)
  21609: { armor_type: 'Leather' },           // Regenerating Belt of Vek'nilash (Twin Emperors)
  21611: { armor_type: 'Cloth' },             // Burrower Bracers (Ouro)
  21615: { armor_type: 'Cloth' },             // Don Rigoberto's Lost Hat (Ouro)
  21585: { armor_type: 'Cloth' },             // Dark Storm Gauntlets (C'Thun)
  22730: { armor_type: 'Cloth' },             // Eyestalk Waist Cord (C'Thun)
  21582: { armor_type: 'Cloth' },             // Grasp of the Old God (C'Thun)
  21586: { armor_type: 'Leather' },           // Belt of Never-Ending Agony (C'Thun)
  21581: { armor_type: 'Plate' },             // Gauntlets of Annihilation (C'Thun)

  // Naxxramas
  22936: { armor_type: 'Plate' },             // Wristguards of Vengeance (Anub'Rekhan)
  22941: { armor_type: 'Leather' },           // Polar Shoulder Pads (Grand Widow Faerlina)
  22940: { armor_type: 'Plate' },             // Icebane Pauldrons (Grand Widow Faerlina)
  23220: { armor_type: 'Cloth' },             // Crystal Webbed Robe (Maexxna)
  23035: { armor_type: 'Cloth' },             // Preceptor's Hat (Heigan the Unclean)
  23033: { armor_type: 'Mail' },              // Icy Scale Coif (Heigan the Unclean)
  23019: { armor_type: 'Plate' },             // Icebane Helmet (Heigan the Unclean)
  23068: { armor_type: 'Plate' },             // Legplates of Carnage (Heigan the Unclean)
  23219: { armor_type: 'Plate' },             // Girdle of the Mentor (Instructor Razuvious)
  23032: { armor_type: 'Cloth' },             // Glacial Headdress (Gothik the Harvester)
  23020: { armor_type: 'Leather' },           // Polar Helmet (Gothik the Harvester)
  23021: { armor_type: 'Cloth' },             // The Soul Harvester's Bindings (Gothik the Harvester)
  23073: { armor_type: 'Leather' },           // Boots of Displacement (Gothik the Harvester)
  23071: { armor_type: 'Leather' },           // Leggings of Apocalypse (Four Horsemen)
  22968: { armor_type: 'Cloth' },             // Glacial Mantle (Grobbulus)
  22967: { armor_type: 'Mail' },              // Icy Scale Spaulders (Grobbulus)
  22983: { armor_type: 'Cloth' },             // Rime Covered Mantle (Gluth)
  23000: { armor_type: 'Plate' },             // Plated Abomination Ribcage (Thaddius)
  23070: { armor_type: 'Cloth' },             // Leggings of Polarity (Thaddius)
  23069: { armor_type: 'Cloth' },             // Necro-Knight's Garb (Trash)
  23226: { armor_type: 'Leather' },           // Ghoul Skin Tunic (Trash)
  23664: { armor_type: 'Mail' },              // Pauldrons of Elemental Fury (Trash)
  23663: { armor_type: 'Mail' },              // Girdle of Elemental Fury (Trash)
  23665: { armor_type: 'Mail' },              // Leggings of Elemental Fury (Trash)
  23666: { armor_type: 'Plate' },             // Belt of the Grand Crusader (Trash)
  23667: { armor_type: 'Plate' },             // Spaulders of the Grand Crusader (Trash)
  23668: { armor_type: 'Plate' },             // Leggings of the Grand Crusader (Trash)

  // ============================================================================
  // MISTS OF PANDARIA — Siege of Orgrimmar "Shared Boss Loot"
  // ============================================================================
  // The shared loot pool drops one glove per armor type. Their names are
  // generic ("Crimson Gauntlets of Death") so name inference can't classify
  // them. Explicit entries here drive the runtime proficiency filter for both
  // new guilds (DB armor_type unset) and existing guilds. Normal + Heroic ids.
  103854: { armor_type: 'Cloth' },    // Kalaena's Arcane Handwraps
  105841: { armor_type: 'Cloth' },    // Kalaena's Arcane Handwraps (Heroic)
  103753: { armor_type: 'Cloth' },    // Seebo's Sainted Touch
  105842: { armor_type: 'Cloth' },    // Seebo's Sainted Touch (Heroic)
  103859: { armor_type: 'Leather' },  // Crimson Gauntlets of Death
  105846: { armor_type: 'Leather' },  // Crimson Gauntlets of Death (Heroic)
  103832: { armor_type: 'Leather' },  // Siid's Silent Stranglers
  105845: { armor_type: 'Leather' },  // Siid's Silent Stranglers (Heroic)
  103781: { armor_type: 'Mail' },     // Keengrip Arrowpullers
  105847: { armor_type: 'Mail' },     // Keengrip Arrowpullers (Heroic)
  103764: { armor_type: 'Mail' },     // Marco's Crackling Gloves
  105848: { armor_type: 'Mail' },     // Marco's Crackling Gloves (Heroic)
  103791: { armor_type: 'Plate' },    // Gauntlets of Discarded Time
  105851: { armor_type: 'Plate' },    // Gauntlets of Discarded Time (Heroic)
  103818: { armor_type: 'Plate' },    // Romy's Reliable Grips
  105849: { armor_type: 'Plate' },    // Romy's Reliable Grips (Heroic)
  103734: { armor_type: 'Plate' },    // Zoid's Molten Gauntlets
  105850: { armor_type: 'Plate' },    // Zoid's Molten Gauntlets (Heroic)
}

/**
 * Get item type info for a given wowhead_id
 */
export function getItemTypeInfo(wowheadId: number): ItemTypeInfo | undefined {
  return ITEM_TYPES[wowheadId]
}

/**
 * The slots inferArmorType and the raid armor guards treat as armor. Back
 * is class-agnostic in the picker, so it is not in this list.
 */
export const ARMOR_SLOTS = ['Head', 'Shoulder', 'Chest', 'Wrist', 'Hands', 'Waist', 'Legs', 'Feet'] as const

/**
 * A fallback for items with no ITEM_TYPES entry and no stored type. A wrong
 * guess heavier than the real type hides the item from a class that can
 * wear it (GH #388; the same happened with "gauntlets", removed on
 * 2026-03-29). Checked against the wow-classic-items package for the
 * Classic, TBC and Wrath raid catalogs, "breastplate", "greaves",
 * "sabatons" and "vambraces" name mail and plate pieces alike (73, 57, 71
 * and 56 percent plate), while other names containing "plate" were plate 57
 * times out of 59 (both misses are Classic legplates that now have
 * entries). A name with no reliable hint returns undefined, which shows the
 * item to every class.
 */
export function inferArmorType(slot: string, name: string): ArmorType | undefined {
  const nameLower = name.toLowerCase()

  // Armor slot check
  if (!(ARMOR_SLOTS as readonly string[]).includes(slot)) {
    return undefined  // Not an armor piece
  }

  // Name-based inference (not 100% reliable)
  // Cloth indicators
  if (nameLower.includes('robe') || nameLower.includes('cloth') ||
      nameLower.includes('cowl') && !nameLower.includes('leather')) {
    return 'Cloth'
  }

  // Plate indicators
  // Note: "gauntlets" excluded — used across all armor types (Mail, Leather, Plate)
  // "breastplate", "greaves", "sabatons" and "vambraces" excluded too (GH #388),
  // since those words name mail and plate pieces alike; a bare "plate" is the
  // only reliable signal, and only when the name is not "breastplate".
  if (nameLower.includes('plate') && !nameLower.includes('breastplate')) {
    return 'Plate'
  }

  // Mail indicators
  if (nameLower.includes('mail') || nameLower.includes('chain')) {
    return 'Mail'
  }

  // Default: can't determine
  return undefined
}

/**
 * Infer weapon type from item slot and name patterns
 * This is a fallback for items not in the mapping
 */
export function inferWeaponType(slot: string, name: string): WeaponType | undefined {
  const nameLower = name.toLowerCase()

  // Handle explicit weapon slots
  if (slot === 'Wand') return 'Wand'
  if (slot === 'Shield') return 'Shield'
  if (slot === 'Legendary') return 'One-Handed Sword'  // Warglaives

  // Detect shields from name patterns (even in Off Hand slots)
  // Shields can be in 'Off Hand' slot in TBC data
  if (slot === 'Off Hand' || slot === 'Off-Hand' || slot === 'Held In Off-hand') {
    if (nameLower.includes('shield') ||
        nameLower.includes('aegis') ||
        nameLower.includes('defender') ||
        nameLower.includes('buckler') ||
        nameLower.includes('bulwark') ||
        nameLower.includes('protector') ||
        nameLower.includes('barricade') ||
        nameLower.includes('barrier')) {
      return 'Shield'
    }
  }

  // Check if it's a weapon slot
  const weaponSlots = ['One-Hand', 'Two-Hand', 'Main Hand', 'Ranged', 'Thrown', 'Weapon']
  if (!weaponSlots.includes(slot)) {
    return undefined  // Not a weapon
  }

  // Thrown weapons (item_slot = 'Thrown')
  if (slot === 'Thrown') {
    return 'Thrown'
  }

  // Ranged weapons
  if (slot === 'Ranged') {
    if (nameLower.includes('bow')) return 'Bow'
    if (nameLower.includes('gun') || nameLower.includes('rifle') || nameLower.includes('pistol')) return 'Gun'
    if (nameLower.includes('crossbow')) return 'Crossbow'
    if (nameLower.includes('wand')) return 'Wand'
    if (nameLower.includes('thrown') || nameLower.includes('shuriken')) return 'Thrown'
  }

  // Melee weapons
  const isTwoHand = slot === 'Two-Hand'

  if (nameLower.includes('staff')) return 'Staff'
  if (nameLower.includes('polearm') || nameLower.includes('glaive') || nameLower.includes('spear')) return 'Polearm'
  if (nameLower.includes('dagger') || nameLower.includes('shiv') || nameLower.includes('kris')) return 'Dagger'
  if (nameLower.includes('fist') || nameLower.includes('claw') || nameLower.includes('paw')) return 'Fist Weapon'

  if (nameLower.includes('axe') || nameLower.includes('chopper') || nameLower.includes('hatchet')) {
    return isTwoHand ? 'Two-Handed Axe' : 'One-Handed Axe'
  }

  if (
    nameLower.includes('sword') || nameLower.includes('blade') || nameLower.includes('slicer') ||
    nameLower.includes('scimitar') || nameLower.includes('saber') || nameLower.includes('sabre') ||
    nameLower.includes('cutlass') || nameLower.includes('falchion') || nameLower.includes('rapier')
  ) {
    return isTwoHand ? 'Two-Handed Sword' : 'One-Handed Sword'
  }

  if (nameLower.includes('mace') || nameLower.includes('hammer') || nameLower.includes('scepter')) {
    return isTwoHand ? 'Two-Handed Mace' : 'One-Handed Mace'
  }

  return undefined
}
