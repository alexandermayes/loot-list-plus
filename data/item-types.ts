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
  30022: { armor_type: 'Mail' },              // Pendant of the Perilous
  30023: { armor_type: 'Plate' },             // Totem of the Maelstrom
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
  32254: { weapon_type: 'One-Handed Axe' },   // The Brutalizer
  32330: { armor_type: 'Leather' },           // Totem of Ancestral Guidance
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
  34206: { armor_type: 'Plate' },             // Book of Highborne Hymns
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

  // Additional TK items
  30236: { armor_type: 'Leather' },           // Chestguard of the Vanquished Champion

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
}

/**
 * Get item type info for a given wowhead_id
 */
export function getItemTypeInfo(wowheadId: number): ItemTypeInfo | undefined {
  return ITEM_TYPES[wowheadId]
}

/**
 * Infer armor type from item slot and name patterns
 * This is a fallback for items not in the mapping
 */
export function inferArmorType(slot: string, name: string): ArmorType | undefined {
  const nameLower = name.toLowerCase()

  // Armor slot check
  const armorSlots = ['Head', 'Shoulder', 'Chest', 'Wrist', 'Hands', 'Waist', 'Legs', 'Feet']
  if (!armorSlots.includes(slot)) {
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
  if (nameLower.includes('plate') || nameLower.includes('breastplate') ||
      nameLower.includes('sabatons') || nameLower.includes('greaves') ||
      nameLower.includes('vambraces')) {
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
