#!/usr/bin/env node

/**
 * Verify item-types.ts entries against Wowhead tooltips.
 *
 * Fetches each item's tooltip from Wowhead and checks if the assigned
 * armor_type or weapon_type matches what Wowhead reports.
 */

const ITEM_TYPES = {
  // KARAZHAN
  30675: { armor_type: 'Cloth', comment: "Lurker's Cord" },
  30676: { armor_type: 'Leather', comment: "Lurker's Grasp" },
  30677: { armor_type: 'Mail', comment: "Lurker's Belt" },
  30678: { armor_type: 'Plate', comment: "Lurker's Girdle" },
  30684: { armor_type: 'Cloth', comment: "Ravager's Cuffs" },
  30685: { armor_type: 'Leather', comment: "Ravager's Wrist-Wraps" },
  30686: { armor_type: 'Mail', comment: "Ravager's Bands" },
  30687: { armor_type: 'Plate', comment: "Ravager's Bracers" },
  30680: { armor_type: 'Cloth', comment: "Glider's Foot-Wraps" },
  30681: { armor_type: 'Leather', comment: "Glider's Boots" },
  30682: { armor_type: 'Mail', comment: "Glider's Sabatons" },
  30683: { armor_type: 'Plate', comment: "Glider's Greaves" },
  28508: { armor_type: 'Cloth', comment: "Gloves of Saintly Blessings" },
  28507: { armor_type: 'Cloth', comment: "Handwraps of Flowing Thought" },
  28477: { armor_type: 'Cloth', comment: "Harbinger Bands" },
  28506: { armor_type: 'Leather', comment: "Gloves of Dexterous Manipulation" },
  28453: { armor_type: 'Leather', comment: "Bracers of the White Stag" },
  28503: { armor_type: 'Mail', comment: "Whirlwind Bracers" },
  28454: { armor_type: 'Mail', comment: "Stalker's War Bands" },
  28505: { armor_type: 'Plate', comment: "Gauntlets of Renewed Hope" },
  28502: { armor_type: 'Plate', comment: "Vambraces of Courage" },
  28504: { weapon_type: 'Crossbow', comment: "Steelhawk Crossbow" },
  28524: { weapon_type: 'Dagger', comment: "Emerald Ripper" },
  28545: { armor_type: 'Leather', comment: "Edgewalker Longboots" },
  28565: { armor_type: 'Cloth', comment: "Nethershard Girdle" },
  28566: { armor_type: 'Plate', comment: "Crimson Girdle of the Indomitable" },
  28567: { armor_type: 'Mail', comment: "Belt of Gale Force" },
  28569: { armor_type: 'Plate', comment: "Boots of Valiance" },
  28511: { armor_type: 'Cloth', comment: "Bands of Indwelling" },
  28512: { armor_type: 'Plate', comment: "Bracers of Justice" },
  28514: { armor_type: 'Leather', comment: "Bracers of Maliciousness" },
  28515: { armor_type: 'Cloth', comment: "Bands of Nefarious Deeds" },
  28517: { armor_type: 'Cloth', comment: "Boots of Foretelling" },
  28518: { armor_type: 'Plate', comment: "Iron Gauntlets of the Maiden" },
  28519: { armor_type: 'Leather', comment: "Gloves of Quickening" },
  28520: { armor_type: 'Leather', comment: "Gloves of Centering" },
  28521: { armor_type: 'Leather', comment: "Mitts of the Treemender" },
  28522: { weapon_type: 'One-Handed Mace', comment: "Shard of the Virtuous" },
  28572: { weapon_type: 'Dagger', comment: "Blade of the Unrequited" },
  28573: { weapon_type: 'Two-Handed Sword', comment: "Despair" },
  28578: { armor_type: 'Cloth', comment: "Masquerade Gown" },
  28583: { armor_type: 'Leather', comment: "Big Bad Wolf's Head" },
  28581: { weapon_type: 'Gun', comment: "Wolfslayer Sniper Rifle" },
  28584: { weapon_type: 'Fist Weapon', comment: "Big Bad Wolf's Paw" },
  28585: { armor_type: 'Cloth', comment: "Ruby Slippers" },
  28586: { armor_type: 'Cloth', comment: "Wicked Witch's Hat" },
  28588: { weapon_type: 'Wand', comment: "Blue Diamond Witchwand" },
  28587: { weapon_type: 'Staff', comment: "Legacy" },
  28612: { armor_type: 'Plate', comment: "Pauldrons of the Solace-Giver" },
  28621: { armor_type: 'Plate', comment: "Wrynn Dynasty Greaves" },
  28633: { weapon_type: 'Staff', comment: "Staff of Infinite Mysteries" },
  28631: { armor_type: 'Mail', comment: "Dragon-Quake Shoulderguards" },
  28647: { armor_type: 'Leather', comment: "Forest Wind Shoulderpads" },
  28658: { weapon_type: 'Staff', comment: "Terestian's Stranglestaff" },
  28652: { armor_type: 'Cloth', comment: "Cincture of Will" },
  28654: { armor_type: 'Cloth', comment: "Malefic Girdle" },
  28655: { armor_type: 'Leather', comment: "Cord of Nature's Sustenance" },
  28657: { weapon_type: 'One-Handed Mace', comment: "Fool's Bane" },
  28656: { armor_type: 'Leather', comment: "Girdle of the Prowler" },
  28662: { armor_type: 'Plate', comment: "Breastplate of the Lightbinder" },
  28663: { armor_type: 'Cloth', comment: "Boots of the Incorrupt" },
  28666: { armor_type: 'Plate', comment: "Pauldrons of the Justice-Seeker" },
  28673: { weapon_type: 'Wand', comment: "Tirisfal Wand of Ascendancy" },
  28670: { armor_type: 'Cloth', comment: "Boots of the Infernal Coven" },
  28669: { armor_type: 'Leather', comment: "Rapscallion Boots" },
  28671: { armor_type: 'Mail', comment: "Steelspine Faceguard" },
  28726: { armor_type: 'Cloth', comment: "Mantle of the Mind Flayer" },
  28732: { armor_type: 'Leather', comment: "Cowl of Defiance" },
  28729: { weapon_type: 'One-Handed Sword', comment: "Spiteblade" },
  28735: { armor_type: 'Leather', comment: "Earthblood Chestguard" },
  28733: { armor_type: 'Plate', comment: "Girdle of Truth" },
  28741: { armor_type: 'Leather', comment: "Skulker's Greaves" },
  28740: { armor_type: 'Mail', comment: "Rip-Flayer Leggings" },
  28743: { armor_type: 'Cloth', comment: "Mantle of Abrahmis" },
  28742: { armor_type: 'Cloth', comment: "Pantaloons of Repentance" },
  28744: { armor_type: 'Cloth', comment: "Uni-Mind Headdress" },
  28756: { armor_type: 'Cloth', comment: "Headdress of the High Potentate" },
  28755: { armor_type: 'Leather', comment: "Bladed Shoulderpads of the Merciless" },
  28752: { armor_type: 'Leather', comment: "Forestlord Striders" },
  28750: { armor_type: 'Leather', comment: "Girdle of Treachery" },
  28746: { armor_type: 'Mail', comment: "Fiend Slayer Boots" },
  28751: { armor_type: 'Mail', comment: "Heart-Flame Leggings" },
  28748: { armor_type: 'Plate', comment: "Legplates of the Innocent" },
  28747: { armor_type: 'Plate', comment: "Battlescar Boots" },
  28749: { weapon_type: 'One-Handed Sword', comment: "King's Defender" },
  28770: { weapon_type: 'Dagger', comment: "Nathrezim Mindblade" },
  28771: { weapon_type: 'One-Handed Mace', comment: "Light's Justice" },
  28768: { weapon_type: 'Dagger', comment: "Malchazeen" },
  28767: { weapon_type: 'One-Handed Axe', comment: "The Decapitator" },
  28772: { weapon_type: 'Bow', comment: "Sunfury Bow of the Phoenix" },
  28773: { weapon_type: 'Two-Handed Axe', comment: "Gorehowl" },
  28599: { armor_type: 'Mail', comment: "Scaled Breastplate of Carnage" },
  28597: { armor_type: 'Plate', comment: "Panzar'Thar Breastplate" },
  28601: { armor_type: 'Leather', comment: "Chestguard of the Conniver" },
  28600: { armor_type: 'Leather', comment: "Stonebough Jerkin" },
  28602: { armor_type: 'Cloth', comment: "Robe of the Elder Scribes" },
  28604: { weapon_type: 'Staff', comment: "Nightstaff of the Everliving" },
  28608: { armor_type: 'Plate', comment: "Ironstriders of Urgency" },
  28610: { armor_type: 'Leather', comment: "Ferocious Swift-Kickers" },

  // GRUUL'S LAIR
  28795: { armor_type: 'Plate', comment: "Bladespire Warbands" },
  28796: { armor_type: 'Leather', comment: "Malefic Mask of the Shadows" },
  28799: { armor_type: 'Cloth', comment: "Belt of Divine Inspiration" },
  28800: { weapon_type: 'Two-Handed Mace', comment: "Hammer of the Naaru" },
  28801: { armor_type: 'Plate', comment: "Maulgar's Warhelm" },
  28794: { weapon_type: 'Two-Handed Axe', comment: "Axe of the Gronn Lords" },
  28802: { weapon_type: 'One-Handed Sword', comment: "Bloodmaw Magus-Blade" },
  28804: { armor_type: 'Cloth', comment: "Collar of Cho'gall" },
  28803: { armor_type: 'Leather', comment: "Cowl of Nature's Breath" },
  28810: { armor_type: 'Mail', comment: "Windshear Boots" },
  28824: { armor_type: 'Plate', comment: "Gauntlets of Martial Perfection" },
  28827: { armor_type: 'Mail', comment: "Gauntlets of the Dragonslayer" },
  28828: { armor_type: 'Mail', comment: "Gronn-Stitched Girdle" },

  // MAGTHERIDON'S LAIR
  28774: { weapon_type: 'Polearm', comment: "Glaive of the Pit" },
  28775: { armor_type: 'Plate', comment: "Thundering Greathelm" },
  28776: { armor_type: 'Leather', comment: "Liar's Tongue Gloves" },
  28779: { armor_type: 'Mail', comment: "Girdle of the Endless Pit" },
  28780: { armor_type: 'Cloth', comment: "Soul-Eater's Handwraps" },
  28782: { weapon_type: 'Staff', comment: "Crystalheart Pulse-Staff" },
  28778: { armor_type: 'Plate', comment: "Terror Pit Girdle" },
  28783: { weapon_type: 'Wand', comment: "Eredar Wand of Obliteration" },
  29458: { weapon_type: 'Shield', comment: "Aegis of the Vindicator" },
  28754: { weapon_type: 'Shield', comment: "Triptych Shield of the Ancients" },
  28606: { weapon_type: 'Shield', comment: "Shield of Impenetrable Darkness" },
  28825: { weapon_type: 'Shield', comment: "Aldori Legacy Defender" },

  // SSC
  30047: { armor_type: 'Plate', comment: "Blackfathom Warbands" },
  30048: { armor_type: 'Plate', comment: "Brighthelm of Justice" },
  30054: { armor_type: 'Mail', comment: "Ranger-General's Chestguard" },
  30050: { armor_type: 'Leather', comment: "Boots of the Shifting Nightmare" },
  30056: { armor_type: 'Cloth', comment: "Robe of Hateful Echoes" },
  30053: { armor_type: 'Leather', comment: "Pauldrons of the Wardancer" },
  30055: { armor_type: 'Cloth', comment: "Shoulderpads of the Stranger" },
  32516: { armor_type: 'Cloth', comment: "Wraps of Purification" },
  30057: { armor_type: 'Plate', comment: "Bracers of Eradication" },
  30058: { weapon_type: 'One-Handed Mace', comment: "Mallet of the Tides" },
  30060: { armor_type: 'Leather', comment: "Boots of Effortless Striking" },
  30062: { armor_type: 'Leather', comment: "Grove-Bands of Remulos" },
  30064: { armor_type: 'Cloth', comment: "Cord of Screaming Terrors" },
  30065: { armor_type: 'Plate', comment: "Glowing Breastplate of Truth" },
  30066: { armor_type: 'Mail', comment: "Tempest-Strider Boots" },
  30067: { armor_type: 'Cloth', comment: "Velvet Boots of the Guardian" },
  30096: { armor_type: 'Plate', comment: "Girdle of the Invulnerable" },
  30091: { armor_type: 'Mail', comment: "True-Aim Stalker Bands" },
  30092: { armor_type: 'Leather', comment: "Orca-Hide Boots" },
  30095: { weapon_type: 'Dagger', comment: "Fang of the Leviathan" },
  30097: { armor_type: 'Leather', comment: "Coral-Barbed Shoulderpads" },
  30090: { weapon_type: 'Two-Handed Mace', comment: "World Breaker" },
  30100: { armor_type: 'Cloth', comment: "Soul-Strider Boots" },
  30101: { armor_type: 'Leather', comment: "Bloodsea Brigand's Vest" },
  30068: { armor_type: 'Mail', comment: "Girdle of the Tidal Call" },
  30079: { armor_type: 'Leather', comment: "Illidari Shoulderpads" },
  30075: { armor_type: 'Leather', comment: "Gnarled Chestpiece of the Ancients" },
  30080: { weapon_type: 'Wand', comment: "Luminescent Rod of the Naaru" },
  30081: { armor_type: 'Plate', comment: "Warboots of Obliteration" },
  30082: { weapon_type: 'Dagger', comment: "Talon of Azshara" },
  30084: { armor_type: 'Plate', comment: "Pauldrons of the Argent Sentinel" },
  30085: { armor_type: 'Mail', comment: "Mantle of the Tireless Tracker" },
  30102: { armor_type: 'Mail', comment: "Krakken-Heart Breastplate" },
  30104: { armor_type: 'Leather', comment: "Cobra-Lash Boots" },
  30103: { weapon_type: 'Dagger', comment: "Fang of Vashj" },
  30105: { weapon_type: 'Bow', comment: "Serpent Spine Longbow" },
  30106: { armor_type: 'Leather', comment: "Belt of One-Hundred Deaths" },
  30107: { armor_type: 'Cloth', comment: "Vestments of the Sea-Witch" },
  30108: { weapon_type: 'One-Handed Mace', comment: "Lightfathom Scepter" },
  30111: { armor_type: 'Leather', comment: "Runetotem's Mantle" },
  30112: { armor_type: 'Plate', comment: "Glorious Gauntlets of Crestfall" },

  // TK: THE EYE
  29918: { armor_type: 'Cloth', comment: "Mindstorm Wristbands" },
  29921: { armor_type: 'Mail', comment: "Fire Crest Breastplate" },
  29924: { weapon_type: 'One-Handed Axe', comment: "Netherbane" },
  29947: { armor_type: 'Mail', comment: "Gloves of the Searing Grip" },
  29949: { weapon_type: 'Gun', comment: "Arcanite Steam-Pistol" },
  32944: { weapon_type: 'Fist Weapon', comment: "Talon of the Phoenix" },
  29983: { armor_type: 'Plate', comment: "Fel-Steel Warhelm" },
  29984: { armor_type: 'Leather', comment: "Girdle of Zaetar" },
  29985: { armor_type: 'Mail', comment: "Pauldrons of the Vanquished Hero" },
  29986: { armor_type: 'Leather', comment: "Cowl of the Grand Engineer" },
  29987: { armor_type: 'Cloth', comment: "Girdle of Fallen Stars" },
  29988: { weapon_type: 'One-Handed Mace', comment: "Cosmic Infuser" },
  29989: { weapon_type: 'Fist Weapon', comment: "Warp-Spring Coil" },
  29990: { weapon_type: 'One-Handed Sword', comment: "Infinity Blade" },
  29991: { weapon_type: 'One-Handed Sword', comment: "Warp Slicer" },
  29992: { weapon_type: 'Bow', comment: "Royal Gauntlets of Silvermoon" },
  29993: { weapon_type: 'Staff', comment: "Staff of Disintegration" },
  29962: { weapon_type: 'Dagger', comment: "Heartrazor" },
  29963: { armor_type: 'Leather', comment: "Void Star Talisman" },
  29964: { armor_type: 'Cloth', comment: "Warp Slicer" },
  29965: { armor_type: 'Mail', comment: "Girdle of the Prowler" },
  29966: { armor_type: 'Plate', comment: "Vambraces of Ending" },
  29967: { armor_type: 'Leather', comment: "Ethereum Life-Staff" },
  29968: { armor_type: 'Mail', comment: "Boots of the Protector" },
  29969: { armor_type: 'Plate', comment: "Vestments of the Sea-Witch" },
  29970: { armor_type: 'Leather', comment: "Light-Collar of the Incarnate" },
  29971: { armor_type: 'Mail', comment: "Solarian's Sapphire" },
  29972: { armor_type: 'Plate', comment: "Trousers of the Astromancer" },
  29973: { armor_type: 'Cloth', comment: "Star-Soul Breeches" },
  29974: { armor_type: 'Leather', comment: "Greaves of the Penitent Knight" },
  29975: { armor_type: 'Plate', comment: "Band of Determination" },

  // Kael'thas
  30015: { armor_type: 'Cloth', comment: "The Nexus Key" },
  30016: { armor_type: 'Mail', comment: "Crown of the Sun" },
  30017: { armor_type: 'Plate', comment: "Sunshower Light Cloak" },
  30018: { armor_type: 'Leather', comment: "Lord Sanguinar's Claim" },
  30019: { armor_type: 'Mail', comment: "Twinblade of the Phoenix" },
  30020: { armor_type: 'Plate', comment: "Fire-Cord of the Magus" },
  30021: { armor_type: 'Leather', comment: "Bands of the Celestial Archer" },
  30022: { armor_type: 'Mail', comment: "Leggings of Murderous Intent" },
  30023: { armor_type: 'Plate', comment: "Gauntlets of the Sun-King" },
  30024: { armor_type: 'Cloth', comment: "Mantle of the Elven Kings" },
  30027: { armor_type: 'Plate', comment: "Royal Cloak of the Sunstriders" },
  30028: { weapon_type: 'Staff', comment: "Devastation" },
  30029: { armor_type: 'Leather', comment: "Thalassian Wildercloak" },
  30030: { armor_type: 'Mail', comment: "Sunstrider Warboots" },
  30031: { armor_type: 'Plate', comment: "Axe of the Nexus-Kings" },
  30032: { weapon_type: 'Bow', comment: "Red Havoc Boots" },
  30033: { armor_type: 'Plate', comment: "Crown of the Sun" },

  // HYJAL
  30863: { armor_type: 'Cloth', comment: "Blessed Adamantite Bracers" },
  30868: { armor_type: 'Cloth', comment: "Rejuvenating Bracers" },
  30864: { armor_type: 'Leather', comment: "Bracers of the Pathfinder" },
  30869: { armor_type: 'Leather', comment: "Howling Wind Bracers" },
  30865: { weapon_type: 'One-Handed Sword', comment: "Tracker's Blade" },
  30870: { armor_type: 'Mail', comment: "Cuffs of Devastation" },
  30866: { armor_type: 'Plate', comment: "Blood-stained Pauldrons" },
  30871: { armor_type: 'Plate', comment: "Bracers of the Forgotten Protector" },
  30878: { armor_type: 'Cloth', comment: "Glimmering Steel Mantle" },
  30879: { armor_type: 'Leather', comment: "Don Rodrigo's Poncho" },
  30880: { armor_type: 'Mail', comment: "Chronicle of Dark Secrets" },
  30881: { weapon_type: 'One-Handed Sword', comment: "Blade of Infamy" },
  30882: { weapon_type: 'Two-Handed Sword', comment: "Pillar of Ferocity" },
  30883: { weapon_type: 'Staff', comment: "Enchanted Leather Sandals" },
  30884: { armor_type: 'Leather', comment: "Hatefury Mantle" },
  30885: { armor_type: 'Mail', comment: "Archbishop's Slippers" },
  30886: { armor_type: 'Plate', comment: "Golden Links of Restoration" },
  30887: { armor_type: 'Cloth', comment: "Quickstrider Moccasins" },
  30888: { armor_type: 'Leather', comment: "Anetheron's Noose" },
  30889: { armor_type: 'Cloth', comment: "Leggings of Channeled Elements" },
  30890: { armor_type: 'Leather', comment: "Boneweave Girdle" },
  30891: { armor_type: 'Mail', comment: "Black Featherlight Boots" },
  30892: { armor_type: 'Plate', comment: "Beast-tamer's Shoulders" },
  30893: { armor_type: 'Cloth', comment: "Sun-touched Chain Leggings" },
  30894: { armor_type: 'Leather', comment: "Blue Suede Shoes" },
  30895: { armor_type: 'Mail', comment: "Angelista's Sash" },
  30896: { armor_type: 'Plate', comment: "Glory of the Defender" },
  30897: { armor_type: 'Cloth', comment: "Girdle of Hope" },
  30898: { armor_type: 'Leather', comment: "Shady Dealer's Pantaloons" },
  30899: { armor_type: 'Mail', comment: "Don Alejandro's Money Belt" },
  30900: { armor_type: 'Plate', comment: "Bow-stitched Leggings" },
  30901: { weapon_type: 'Dagger', comment: "Boundless Agony" },
  30902: { weapon_type: 'Two-Handed Sword', comment: "Cataclysm's Edge" },
  30903: { armor_type: 'Cloth', comment: "Midnight Chestguard" },
  30904: { armor_type: 'Leather', comment: "Savior's Grasp" },
  30905: { armor_type: 'Mail', comment: "Midnight Legguards" },
  30906: { weapon_type: 'Bow', comment: "Bristleblitz Striker" },
  30907: { armor_type: 'Cloth', comment: "Mail of Fevered Pursuit" },
  30908: { weapon_type: 'Staff', comment: "Apostle of Argus" },
  30909: { armor_type: 'Mail', comment: "Leggings of Eternity" },
  30910: { weapon_type: 'Fist Weapon', comment: "Tempest of Chaos" },
  30911: { weapon_type: 'Two-Handed Sword', comment: "Syphon of the Nathrezim" },
  30912: { armor_type: 'Leather', comment: "Leggings of Eternity (duplicate)" },
  30913: { armor_type: 'Cloth', comment: "Robes of Rhonin" },
  30914: { armor_type: 'Cloth', comment: "Bristleblitz Striker (duplicate)" },

  // BLACK TEMPLE
  32515: { armor_type: 'Plate', comment: "Wristguards of Determination" },
  32267: { armor_type: 'Plate', comment: "Boots of the Resilient" },
  32237: { weapon_type: 'One-Handed Mace', comment: "The Maelstrom's Fury" },
  32234: { armor_type: 'Leather', comment: "Fists of Mukoa" },
  32241: { armor_type: 'Mail', comment: "Helm of Soothing Currents" },
  32239: { armor_type: 'Cloth', comment: "Slippers of the Seacaller" },
  32232: { armor_type: 'Plate', comment: "Eternium Shell Bracers" },
  32236: { weapon_type: 'One-Handed Mace', comment: "Rising Tide" },
  32242: { armor_type: 'Mail', comment: "Boots of Oceanic Fury" },
  32265: { armor_type: 'Leather', comment: "Shadow-walker's Cord" },
  32338: { armor_type: 'Cloth', comment: "Blood-cursed Shoulderpads" },
  32340: { armor_type: 'Cloth', comment: "Garments of Temperance" },
  32252: { armor_type: 'Leather', comment: "Nether Shadow Tunic" },
  32268: { armor_type: 'Plate', comment: "Myrmidon's Treads" },
  32243: { armor_type: 'Cloth', comment: "Pearl Inlaid Boots" },
  32280: { armor_type: 'Leather', comment: "Softstep Boots of Tracking" },
  32278: { armor_type: 'Leather', comment: "Grips of Silent Justice" },
  32263: { armor_type: 'Plate', comment: "Praetorian's Legguards" },
  32377: { armor_type: 'Leather', comment: "Mantle of Darkness" },
  32250: { armor_type: 'Plate', comment: "Pauldrons of Abyssal Fury" },
  32264: { armor_type: 'Leather', comment: "Shoulders of the Hidden Predator" },
  32276: { armor_type: 'Cloth', comment: "Flashfire Girdle" },
  32333: { armor_type: 'Plate', comment: "Girdle of Stability" },
  32328: { armor_type: 'Plate', comment: "Girdle of the Lightbearer" },
  32259: { armor_type: 'Mail', comment: "Bands of the Coming Storm" },
  32270: { armor_type: 'Cloth', comment: "Focused Mana Bindings" },
  32281: { armor_type: 'Leather', comment: "Insidious Bands" },
  32279: { armor_type: 'Leather', comment: "The Seeker's Wristguards" },
  32253: { weapon_type: 'Crossbow', comment: "Legionkiller" },
  32240: { armor_type: 'Leather', comment: "Guise of the Tidal Lurker" },
  32271: { armor_type: 'Leather', comment: "Kilt of Immortal Nature" },
  32273: { armor_type: 'Cloth', comment: "Amice of Brilliant Light" },
  32324: { armor_type: 'Plate', comment: "Girdle of Lordaeron's Fallen" },
  32258: { armor_type: 'Leather', comment: "Naturalist's Preserving Cinch" },
  32251: { armor_type: 'Leather', comment: "Wraps of Precise Flight" },
  32513: { armor_type: 'Cloth', comment: "Wristbands of Divine Influence" },
  32262: { weapon_type: 'One-Handed Sword', comment: "Syphon of the Nathrezim" },
  32256: { armor_type: 'Cloth', comment: "Waistwrap of Infinity" },
  32248: { weapon_type: 'Polearm', comment: "Halberd of Desolation" },
  32269: { weapon_type: 'One-Handed Sword', comment: "Messenger of Fate" },
  32326: { weapon_type: 'Two-Handed Axe', comment: "Soul Cleaver" },
  32254: { weapon_type: 'One-Handed Axe', comment: "The Brutalizer" },
  32330: { armor_type: 'Leather', comment: "Botanist's Gloves of Growth" },
  32345: { armor_type: 'Plate', comment: "Dreadboots of the Legion" },
  32352: { armor_type: 'Leather', comment: "Naturewarden's Treads" },
  32353: { armor_type: 'Cloth', comment: "Gloves of Unfailing Faith" },
  32347: { armor_type: 'Leather', comment: "Grips of Damnation" },
  32373: { armor_type: 'Plate', comment: "Helm of the Illidari Shatterer" },
  32367: { armor_type: 'Cloth', comment: "Leggings of Devastation" },
  32341: { armor_type: 'Plate', comment: "Leggings of Divine Retribution" },
  32517: { armor_type: 'Mail', comment: "The Wavemender's Mantle" },
  32519: { armor_type: 'Cloth', comment: "Belt of Divine Guidance" },
  32339: { armor_type: 'Leather', comment: "Belt of Primal Majesty" },
  32346: { armor_type: 'Leather', comment: "Boneweave Girdle" },
  32342: { armor_type: 'Plate', comment: "Girdle of Mighty Resolve" },
  32354: { armor_type: 'Cloth', comment: "Crown of Empowered Fate" },
  32351: { armor_type: 'Cloth', comment: "Elunite Empowered Bracers" },
  32366: { armor_type: 'Leather', comment: "Shadowmaster's Boots" },
  32471: { weapon_type: 'One-Handed Sword', comment: "Shard of Azzinoth" },
  32332: { weapon_type: 'Two-Handed Mace', comment: "Torch of the Damned" },
  32235: { armor_type: 'Leather', comment: "Cursed Vision of Sargeras" },
  32376: { armor_type: 'Mail', comment: "Forest Prowler's Helm" },
  32363: { weapon_type: 'Wand', comment: "Naaru-Blessed Life Rod" },
  32609: { armor_type: 'Plate', comment: "Boots of the Divine Light" },
  32837: { weapon_type: 'One-Handed Sword', comment: "Warglaive of Azzinoth (MH)" },
  32838: { weapon_type: 'One-Handed Sword', comment: "Warglaive of Azzinoth (OH)" },
  32500: { weapon_type: 'One-Handed Mace', comment: "Crystal Spire of Karabor" },

  // SUNWELL
  34437: { armor_type: 'Mail', comment: "Skyshatter Bracers" },
  34195: { armor_type: 'Leather', comment: "Belt of the Wastelands" },
  34352: { armor_type: 'Plate', comment: "Borderland Fortress Grips" },
  34181: { armor_type: 'Cloth', comment: "Leggings of Calamity" },
  34167: { armor_type: 'Cloth', comment: "Pantaloons of Calming Strife" },
  34202: { armor_type: 'Leather', comment: "Equilibrium Epaulets" },
  34168: { armor_type: 'Leather', comment: "Shoulderpads of Vehemence" },
  34208: { armor_type: 'Cloth', comment: "Spaulders of Reclamation" },
  34190: { armor_type: 'Cloth', comment: "Crimson Paragon's Cover" },
  34165: { weapon_type: 'Dagger', comment: "Fang of Kalecgos" },
  34206: { armor_type: 'Plate', comment: "Grip of Mannoroth" },
  34210: { armor_type: 'Plate', comment: "Mounting Vengeance" },
  34176: { weapon_type: 'One-Handed Mace', comment: "Reign of Misery" },
  34188: { armor_type: 'Leather', comment: "Leggings of the Immortal Night" },
  34199: { weapon_type: 'One-Handed Sword', comment: "Sunflare" },
  34341: { armor_type: 'Leather', comment: "Borderland Paingrips" },
  34344: { armor_type: 'Cloth', comment: "Handguards of Defiled Worlds" },
  34340: { armor_type: 'Cloth', comment: "Dark Conjuror's Collar" },
  34342: { armor_type: 'Cloth', comment: "Handguards of the Dawn" },
  34333: { armor_type: 'Mail', comment: "Coif of Alleria" },
  34245: { armor_type: 'Leather', comment: "Cover of Ursol the Wise" },
  34345: { armor_type: 'Cloth', comment: "Crown of Anasterian" },
  34244: { armor_type: 'Leather', comment: "Duplicitous Guise" },
  34243: { armor_type: 'Plate', comment: "Helm of Burning Righteousness" },
  34329: { weapon_type: 'Dagger', comment: "Crux of the Apocalypse" },
  34247: { weapon_type: 'Two-Handed Sword', comment: "Apolyon, the Soul-Render" },
  34331: { weapon_type: 'Dagger', comment: "Hand of the Deceiver" },
  34336: { weapon_type: 'One-Handed Sword', comment: "Sunflare" },
  34334: { weapon_type: 'Bow', comment: "Thori'dal, the Stars' Fury" },
  34233: { armor_type: 'Leather', comment: "Sunglow Vest" },
  34445: { armor_type: 'Leather', comment: "Slayer's Boots" },
};

// We'll use the Wowhead XML tooltip endpoint
const WOWHEAD_BASE = 'https://www.wowhead.com/classic/item=';

// Armor type patterns from Wowhead tooltip XML
const ARMOR_TYPES = ['Cloth', 'Leather', 'Mail', 'Plate'];
const WEAPON_TYPES = [
  'Dagger', 'Fist Weapon', 'One-Handed Axe', 'Two-Handed Axe',
  'One-Handed Sword', 'Two-Handed Sword', 'One-Handed Mace', 'Two-Handed Mace',
  'Polearm', 'Staff', 'Bow', 'Crossbow', 'Gun', 'Wand', 'Shield', 'Thrown',
];

async function fetchItemInfo(wowheadId) {
  const url = `https://nether.wowhead.com/tooltip/item/${wowheadId}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    const data = await res.json();

    // The tooltip HTML contains the item type info
    const tooltip = data.tooltip || '';
    const name = data.name || '';

    let detectedArmor = null;
    let detectedWeapon = null;

    // Armor type appears as <span class="q1">Mail</span> in the tooltip
    for (const type of ARMOR_TYPES) {
      if (tooltip.includes(`>${type}<`)) {
        detectedArmor = type;
        break;
      }
    }

    // Weapon types appear similarly
    for (const type of WEAPON_TYPES) {
      if (tooltip.includes(`>${type}<`)) {
        detectedWeapon = type;
        break;
      }
    }

    // Check for "Off Hand" items (shields, etc)
    if (tooltip.includes('>Shield<')) {
      detectedWeapon = 'Shield';
    }

    return { name, detectedArmor, detectedWeapon, tooltip };
  } catch (e) {
    return null;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const ids = Object.keys(ITEM_TYPES).map(Number);
  console.log(`Checking ${ids.length} items against Wowhead...\n`);

  const mismatches = [];
  const errors = [];
  let checked = 0;

  // Process in batches
  const BATCH_SIZE = 5;
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(async (id) => {
      const entry = ITEM_TYPES[id];
      const info = await fetchItemInfo(id);
      return { id, entry, info };
    }));

    for (const { id, entry, info } of results) {
      checked++;
      if (!info) {
        errors.push({ id, comment: entry.comment, error: 'Failed to fetch' });
        continue;
      }

      const actualName = info.name;

      // Check if the comment name matches the actual name
      const commentName = entry.comment.replace(/ \(.*\)$/, ''); // strip parenthetical notes
      const nameMatch = actualName.toLowerCase().trim() === commentName.toLowerCase().trim();

      if (entry.armor_type) {
        if (info.detectedArmor && info.detectedArmor !== entry.armor_type) {
          mismatches.push({
            id,
            comment: entry.comment,
            actualName,
            field: 'armor_type',
            expected: entry.armor_type,
            actual: info.detectedArmor,
            nameMatch,
          });
        } else if (info.detectedWeapon && !info.detectedArmor) {
          // Item is actually a weapon but mapped as armor
          mismatches.push({
            id,
            comment: entry.comment,
            actualName,
            field: 'armor_type→weapon_type',
            expected: `armor: ${entry.armor_type}`,
            actual: `weapon: ${info.detectedWeapon}`,
            nameMatch,
          });
        }
        if (!nameMatch) {
          mismatches.push({
            id,
            comment: entry.comment,
            actualName,
            field: 'name_mismatch',
            expected: commentName,
            actual: actualName,
            nameMatch: false,
          });
        }
      }

      if (entry.weapon_type) {
        if (info.detectedWeapon && info.detectedWeapon !== entry.weapon_type) {
          mismatches.push({
            id,
            comment: entry.comment,
            actualName,
            field: 'weapon_type',
            expected: entry.weapon_type,
            actual: info.detectedWeapon,
            nameMatch,
          });
        } else if (info.detectedArmor && !info.detectedWeapon) {
          // Item is actually armor but mapped as weapon
          mismatches.push({
            id,
            comment: entry.comment,
            actualName,
            field: 'weapon_type→armor_type',
            expected: `weapon: ${entry.weapon_type}`,
            actual: `armor: ${info.detectedArmor}`,
            nameMatch,
          });
        }
        if (!nameMatch) {
          mismatches.push({
            id,
            comment: entry.comment,
            actualName,
            field: 'name_mismatch',
            expected: commentName,
            actual: actualName,
            nameMatch: false,
          });
        }
      }
    }

    process.stdout.write(`\rChecked ${checked}/${ids.length}...`);

    // Rate limit
    if (i + BATCH_SIZE < ids.length) {
      await sleep(300);
    }
  }

  console.log('\n');

  if (mismatches.length > 0) {
    console.log('=== MISMATCHES FOUND ===\n');

    // Dedupe by id+field
    const seen = new Set();
    for (const m of mismatches) {
      const key = `${m.id}-${m.field}`;
      if (seen.has(key)) continue;
      seen.add(key);
      console.log(`ID ${m.id} (${m.comment})`);
      console.log(`  Actual name: ${m.actualName}`);
      console.log(`  Field: ${m.field}`);
      console.log(`  Expected: ${m.expected}`);
      console.log(`  Actual: ${m.actual}`);
      console.log();
    }
  } else {
    console.log('No mismatches found! All items match.');
  }

  if (errors.length > 0) {
    console.log(`\n=== ERRORS (${errors.length}) ===`);
    for (const e of errors) {
      console.log(`  ID ${e.id} (${e.comment}): ${e.error}`);
    }
  }

  console.log(`\nTotal checked: ${checked}, Mismatches: ${mismatches.length}, Errors: ${errors.length}`);
}

main().catch(console.error);
