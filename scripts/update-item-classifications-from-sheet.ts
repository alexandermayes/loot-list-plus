import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Mapping of shorthand names to full spec names in database
const specMapping: Record<string, string> = {
  'HPal': 'Paladin Holy',
  'Ret': 'Paladin Retribution',
  'PPal': 'Paladin Protection',
  'RD': 'Druid Restoration',
  'Frl': 'Druid Feral',
  'Bal': 'Druid Balance',
  'Druid': 'Druid Restoration', // Default to Restoration for generic Druid
  'ProtW': 'Warrior Protection',
  'Fury': 'Warrior Arms/Fury',
  'Warrior': 'Warrior Arms/Fury',
  'Tank': 'Warrior Protection', // Assuming tank means Prot Warrior
  'HPri': 'Priest Holy/Disc',
  'Priest': 'Priest Holy/Disc',
  'SP': 'Priest Shadow',
  'Mage': 'Mage Mage',
  'Hunter': 'Hunter Hunter',
  'Warlock': 'Warlock Warlock',
  'Rogue': 'Rogue Rogue',
  'Paladin': 'Paladin Holy', // Default to Holy for generic Paladin
  'Pal': 'Paladin Holy',
  'RS': 'Shaman Restoration',
  'Ele': 'Shaman Elemental',
  'Enh': 'Shaman Enhancement',
  'Shaman': 'Shaman Enhancement', // Default to Enhancement for generic Shaman
}

// Item data from all Classic WoW raids
const itemData = [
  // ============================================================================
  // MOLTEN CORE - Reserved Items
  // ============================================================================
  { name: 'Ancient Petrified Leaf', classification: 'Reserved', primary: ['Hunter'], secondary: [] },
  { name: 'Azuresong Mageblade', classification: 'Reserved', primary: ['Mage', 'Warlock'], secondary: ['HPal'] },
  { name: 'Band of Accuria', classification: 'Reserved', primary: ['Rogue', 'Warrior', 'Frl', 'Hunter'], secondary: ['Ret'] },
  { name: 'Cauterizing Band', classification: 'Reserved', primary: ['RD', 'HPri', 'HPal'], secondary: [] },
  { name: 'Choker of the Fire Lord', classification: 'Reserved', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal', 'HPri', 'HPal'] },
  { name: 'Quick Strike Ring', classification: 'Reserved', primary: ['Warrior', 'Ret'], secondary: ['Frl', 'Hunter', 'Rogue'] },
  { name: 'Talisman of Ephemeral Power', classification: 'Reserved', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal'] },
  { name: 'The Eye of Divinity', classification: 'Reserved', primary: ['HPri'], secondary: ['SP'] },

  // MC - Limited Items
  { name: "Vis'kag the Bloodletter", classification: 'Reserved', primary: ['Rogue', 'Fury'], secondary: ['Warrior'] },
  { name: 'Core Hound Tooth', classification: 'Reserved', primary: ['Rogue', 'Warrior'], secondary: ['Hunter'] },
  { name: 'Aurastone Hammer', classification: 'Reserved', primary: ['RD', 'SP', 'HPal'], secondary: ['Priest'] },
  { name: 'Brutality Blade', classification: 'Reserved', primary: ['Rogue', 'Warrior'], secondary: ['Hunter', 'Tank'] },
  { name: 'Onslaught Girdle', classification: 'Reserved', primary: ['Warrior'], secondary: ['Ret'] },
  { name: "Perdition's Blade", classification: 'Reserved', primary: ['Rogue', 'Warrior'], secondary: [] },
  { name: 'Ring of Spell Power', classification: 'Reserved', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal'] },
  { name: "Striker's Mark", classification: 'Reserved', primary: ['Rogue', 'Fury'], secondary: ['Tank'] },
  { name: 'Flameguard Gauntlets', classification: 'Limited', primary: ['Warrior', 'Ret'], secondary: [] },
  { name: 'Mana Igniting Cord', classification: 'Limited', primary: ['Mage', 'Warlock'], secondary: ['Bal', 'Priest', 'Paladin'] },
  { name: 'Salamander Scale Pants', classification: 'Limited', primary: ['RD', 'HPal'], secondary: [] },
  { name: 'Wild Growth Spaulders', classification: 'Limited', primary: ['RD', 'HPal'], secondary: [] },
  { name: 'Aged Core Leather Gloves', classification: 'Limited', primary: ['Rogue', 'Tank'], secondary: ['Warrior'] },
  { name: 'Wristguards of Stability', classification: 'Limited', primary: ['Warrior', 'Frl'], secondary: ['Ret', 'Rogue'] },
  { name: 'Gutgore Ripper', classification: 'Limited', primary: ['Rogue'], secondary: [] },
  { name: "Bonereaver's Edge", classification: 'Limited', primary: ['Warrior', 'Ret'], secondary: [] },

  // MC - Unlimited Items
  { name: 'Ancient Cornerstone Grimoire', classification: 'Unlimited', primary: ['Druid', 'Mage', 'Priest', 'Warlock', 'HPal'], secondary: [] },
  { name: 'Band of Sulfuras', classification: 'Unlimited', primary: ['Druid', 'Priest', 'HPal'], secondary: [] },
  { name: 'Blastershot Launcher', classification: 'Unlimited', primary: ['Rogue', 'Warrior'], secondary: ['Hunter'] },
  { name: 'Choker of Enlightenment', classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['Priest', 'HPal'] },
  { name: 'Core Forged Greaves', classification: 'Unlimited', primary: ['Tank'], secondary: ['Warrior'] },
  { name: 'Crimson Shocker', classification: 'Unlimited', primary: ['Mage', 'Priest', 'Warlock'], secondary: [] },
  { name: 'Crown of Destruction', classification: 'Unlimited', primary: ['Hunter', 'Warrior', 'Ret'], secondary: ['Paladin'] },
  { name: "Dragon's Blood Cape", classification: 'Unlimited', primary: ['Frl', 'Tank', 'Ret'], secondary: ['Warrior'] },
  { name: 'Drillborer Disk', classification: 'Unlimited', primary: ['Warrior', 'PPal'], secondary: ['Paladin'] },
  { name: 'Earthshaker', classification: 'Unlimited', primary: ['Warrior', 'Ret'], secondary: ['Paladin'] },
  { name: "Eskhandar's Collar", classification: 'Unlimited', primary: ['Frl', 'Hunter', 'Rogue', 'Warrior', 'Ret'], secondary: [] },
  { name: "Eskhandar's Right Claw", classification: 'Unlimited', primary: ['Warrior'], secondary: ['Rogue'] },
  { name: 'Essence of the Pure Flame', classification: 'Unlimited', primary: ['Frl', 'Warrior', 'Ret'], secondary: [] },
  { name: 'Fire Runed Grimoire', classification: 'Unlimited', primary: ['Druid', 'Mage', 'Priest', 'Warlock', 'Paladin'], secondary: [] },
  { name: 'Fireproof Cloak', classification: 'Unlimited', primary: ['Druid', 'Warrior', 'Paladin'], secondary: ['Hunter', 'Mage', 'Priest', 'Warlock'] },
  { name: 'Flamewaker Legplates', classification: 'Unlimited', primary: ['Warrior', 'Ret'], secondary: [] },
  { name: 'Heavy Dark Iron Ring', classification: 'Unlimited', primary: ['Frl', 'Warrior', 'Paladin'], secondary: [] },
  { name: 'Helm of the Lifegiver', classification: 'Unlimited', primary: ['HPal'], secondary: ['Paladin'] },
  { name: "Malistar's Defender", classification: 'Unlimited', primary: ['Paladin'], secondary: ['Ret'] },
  { name: 'Manastorm Leggings', classification: 'Unlimited', primary: ['RD', 'Priest'], secondary: ['HPal'] },
  { name: 'Medallion of Steadfast Might', classification: 'Unlimited', primary: ['Frl', 'Warrior'], secondary: ['Paladin'] },
  { name: 'Obsidian Edged Blade', classification: 'Unlimited', primary: ['Warrior', 'Ret'], secondary: [] },
  { name: 'Ring of Binding', classification: 'Unlimited', primary: ['Frl', 'Warrior', 'PPal'], secondary: ['Paladin'] },
  { name: 'Robe of Volatile Power', classification: 'Unlimited', primary: ['Bal', 'Warlock'], secondary: ['Mage', 'Priest'] },
  { name: 'Sabatons of the Flamewalker', classification: 'Unlimited', primary: ['Hunter'], secondary: [] },
  { name: 'Sash of Whispered Secrets', classification: 'Unlimited', primary: ['Warlock', 'SP'], secondary: [] },
  { name: 'Seal of the Archmagus', classification: 'Unlimited', primary: ['Warlock', 'Priest', 'Druid', 'Mage', 'Hunter', 'Paladin'], secondary: [] },
  { name: 'Shadowstrike', classification: 'Unlimited', primary: ['Hunter', 'Warrior'], secondary: [] },
  { name: 'Shard of the Flame', classification: 'Unlimited', primary: [], secondary: [] },
  { name: 'Sorcerous Dagger', classification: 'Unlimited', primary: ['Druid', 'Mage', 'Priest', 'Warlock'], secondary: [] },
  { name: 'Spinal Reaper', classification: 'Unlimited', primary: ['Warrior', 'Ret'], secondary: [] },
  { name: 'Staff of Dominance', classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['Bal', 'Priest'] },
  { name: 'Wristguards of True Flight', classification: 'Unlimited', primary: ['Hunter', 'Warrior'], secondary: ['Ret'] },
  { name: 'Cloak of the Shrouded Mists', classification: 'Limited', primary: ['Hunter', 'Rogue', 'Frl', 'ProtW'], secondary: ['Warrior'] },
  { name: 'Deathbringer', classification: 'Limited', primary: ['Warrior'], secondary: [] },
  { name: 'Shard of the Scale', classification: 'Limited', primary: ['RD', 'Priest', 'HPal'], secondary: [] },
  { name: 'Sapphiron Drape', classification: 'Limited', primary: ['Mage', 'Warlock'], secondary: ['RD', 'Priest', 'HPal'] },
  { name: 'Head of Onyxia', classification: 'Limited', primary: ['Frl', 'Hunter', 'Rogue', 'Warrior', 'Ret'], secondary: ['RD', 'Mage', 'Priest', 'Warlock', 'Pal'] },

  // ============================================================================
  // BLACKWING LAIR - Reserved Items
  // ============================================================================
  { name: "Ashjre'thul, Crossbow of Smiting", classification: 'Reserved', primary: ['Hunter'], secondary: ['Rogue', 'Warrior'] },
  { name: 'Chromatically Tempered Sword', classification: 'Reserved', primary: ['Rogue', 'Warrior'], secondary: [] },
  { name: "Crul'shorukh, Edge of Chaos", classification: 'Reserved', primary: ['Rogue', 'Warrior'], secondary: [] },
  { name: 'Drake Fang Talisman', classification: 'Reserved', primary: ['Rogue', 'Warrior', 'Hunter', 'Frl'], secondary: ['Ret'] },
  { name: 'Empowered Leggings', classification: 'Reserved', primary: ['Frl', 'Rogue'], secondary: [] },
  { name: "Lok'amir il Romathis", classification: 'Reserved', primary: ['RD', 'HPri', 'HPal'], secondary: ['SP'] },
  { name: 'Maladath, Runed Blade of the Black Flight', classification: 'Reserved', primary: ['Rogue', 'Warrior'], secondary: ['Tank'] },
  { name: "Mish'undare, Circlet of the Mind Flayer", classification: 'Reserved', primary: ['Mage', 'Warlock', 'SP'], secondary: ['HPri', 'Bal'] },
  { name: "Neltharion's Tear", classification: 'Reserved', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal', 'HPri'] },
  { name: "Prestor's Talisman of Connivery", classification: 'Reserved', primary: ['Rogue', 'Hunter', 'Frl'], secondary: ['Warrior'] },
  { name: 'Pure Elementium Band', classification: 'Reserved', primary: ['Tank', 'PPal'], secondary: ['Warrior'] },
  { name: 'Rejuvenating Gem', classification: 'Reserved', primary: ['RD', 'HPri', 'HPal'], secondary: [] },
  { name: 'Staff of the Shadow Flame', classification: 'Reserved', primary: ['Mage', 'Warlock'], secondary: ['SP', 'Bal'] },
  { name: 'The Untamed Blade', classification: 'Reserved', primary: ['Warrior', 'Ret'], secondary: [] },

  // BWL - Limited Items
  { name: 'Ashkandi, Greatsword of the Brotherhood', classification: 'Limited', primary: ['Warrior', 'Hunter'], secondary: ['Ret'] },
  { name: 'Band of Forced Concentration', classification: 'Limited', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal', 'HPri'] },
  { name: 'Boots of the Shadow Flame', classification: 'Limited', primary: ['Rogue', 'Frl'], secondary: [] },
  { name: 'Bracers of Arcane Accuracy', classification: 'Limited', primary: ['Mage', 'Warlock'], secondary: ['SP', 'Bal'] },
  { name: 'Chromatic Boots', classification: 'Limited', primary: ['Warrior', 'Ret'], secondary: ['Paladin'] },
  { name: 'Claw of Chromaggus', classification: 'Limited', primary: ['Frl', 'Rogue'], secondary: [] },
  { name: 'Cloak of Firemaw', classification: 'Limited', primary: ['Rogue', 'Hunter', 'Frl'], secondary: ['Warrior'] },
  { name: 'Cloak of the Brood Lord', classification: 'Limited', primary: ['Mage', 'Warlock', 'Priest'], secondary: ['Druid'] },
  { name: 'Head of Nefarian', classification: 'Limited', primary: ['Frl', 'Hunter', 'Rogue', 'Warrior', 'Ret'], secondary: ['RD', 'Mage', 'Priest', 'Warlock', 'Pal'] },
  { name: 'Mantle of the Blackwing Cabal', classification: 'Limited', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal'] },
  { name: 'Shroud of Pure Thought', classification: 'Limited', primary: ['RD', 'HPri', 'HPal'], secondary: [] },
  { name: 'Lifegiving Gem', classification: 'Limited', primary: ['Tank'], secondary: ['Warrior'] },

  // BWL - Unlimited Items
  { name: 'Spineshatter', classification: 'Unlimited', primary: ['Tank'], secondary: ['Warrior'] },
  { name: 'Arcane Infused Gem', classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['Priest', 'Druid'] },
  { name: 'The Black Book', classification: 'Unlimited', primary: ['Warlock'], secondary: [] },
  { name: 'Gloves of Rapid Evolution', classification: 'Unlimited', primary: ['RD'], secondary: ['Bal', 'Frl'] },
  { name: 'Mind Quickening Gem', classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['SP', 'Bal'] },
  { name: 'Rune of Metamorphosis', classification: 'Unlimited', primary: ['Frl'], secondary: ['RD', 'Bal'] },
  { name: 'Dragonfang Blade', classification: 'Unlimited', primary: ['Rogue'], secondary: ['Warrior'] },
  { name: 'Red Dragonscale Protector', classification: 'Unlimited', primary: ['Tank', 'PPal'], secondary: [] },
  { name: 'Pendant of the Fallen Dragon', classification: 'Unlimited', primary: ['Frl', 'Hunter', 'Rogue', 'Warrior'], secondary: ['Ret'] },
  { name: 'Helm of Endless Rage', classification: 'Unlimited', primary: ['Warrior'], secondary: ['Ret'] },
  { name: 'Black Brood Pauldrons', classification: 'Unlimited', primary: ['Warrior', 'Ret'], secondary: ['Paladin'] },
  { name: 'Venomous Totem', classification: 'Unlimited', primary: ['Rogue'], secondary: [] },
  { name: 'Heartstriker', classification: 'Unlimited', primary: ['Hunter'], secondary: ['Rogue', 'Warrior'] },
  { name: 'Scrolls of Blinding Light', classification: 'Unlimited', primary: ['HPal'], secondary: ['Ret'] },
  { name: 'Natural Alignment Crystal', classification: 'Unlimited', primary: ['RD', 'Ele', 'RS'], secondary: [] },
  { name: 'Drake Talon Cleaver', classification: 'Unlimited', primary: ['Warrior'], secondary: ['Ret'] },
  { name: 'Shadow Wing Focus Staff', classification: 'Unlimited', primary: ['RD', 'Priest'], secondary: ['HPal', 'Bal'] },
  { name: 'Claw of the Black Drake', classification: 'Unlimited', primary: ['Frl', 'Rogue'], secondary: [] },
  { name: 'Drake Talon Pauldrons', classification: 'Unlimited', primary: ['Warrior'], secondary: ['Ret'] },
  { name: 'Taut Dragonhide Belt', classification: 'Unlimited', primary: ['Frl', 'Rogue'], secondary: ['RD', 'Bal'] },
  { name: 'Ring of Blackrock', classification: 'Unlimited', primary: ['Frl', 'Warrior'], secondary: ['Ret'] },
  { name: 'Black Ash Robe', classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['Priest'] },
  { name: "Firemaw's Clutch", classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['SP', 'Bal'] },
  { name: "Primalist's Linked Legguards", classification: 'Unlimited', primary: ['Enh'], secondary: ['Ele', 'RS'] },
  { name: 'Legguards of the Fallen Crusader', classification: 'Unlimited', primary: ['Ret', 'HPal'], secondary: ['PPal'] },
  { name: 'Aegis of Preservation', classification: 'Unlimited', primary: ['Tank', 'PPal'], secondary: [] },
  { name: 'Dragonbreath Hand Cannon', classification: 'Unlimited', primary: ['Hunter'], secondary: ['Rogue', 'Warrior'] },
  { name: "Malfurion's Blessed Bulwark", classification: 'Unlimited', primary: ['Frl'], secondary: ['RD', 'Bal'] },
  { name: 'Ebony Flame Gloves', classification: 'Unlimited', primary: ['Warlock'], secondary: ['SP'] },
  { name: 'Herald of Woe', classification: 'Unlimited', primary: ['Ret'], secondary: ['Warrior'] },
  { name: "Dragon's Touch", classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['SP'] },
  { name: "Styleen's Impeding Scarab", classification: 'Unlimited', primary: ['Tank', 'PPal'], secondary: [] },
  { name: 'Circle of Applied Force', classification: 'Unlimited', primary: ['Warrior', 'Rogue', 'Frl'], secondary: ['Hunter', 'Ret'] },
  { name: 'Emberweave Leggings', classification: 'Unlimited', primary: ['Hunter'], secondary: [] },
  { name: 'Elementium Reinforced Bulwark', classification: 'Unlimited', primary: ['Tank', 'PPal'], secondary: [] },
  { name: 'Elementium Threaded Cloak', classification: 'Unlimited', primary: ['Tank', 'PPal'], secondary: ['Warrior'] },
  { name: "Angelista's Grasp", classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['Priest'] },
  { name: 'Taut Dragonhide Shoulderpads', classification: 'Unlimited', primary: ['Frl'], secondary: ['RD', 'Bal'] },
  { name: 'Taut Dragonhide Gloves', classification: 'Unlimited', primary: ['Frl'], secondary: ['RD', 'Bal'] },
  { name: 'Shimmering Geta', classification: 'Unlimited', primary: ['Mage', 'Warlock', 'Priest'], secondary: ['Druid'] },
  { name: 'Girdle of the Fallen Crusader', classification: 'Unlimited', primary: ['Ret', 'HPal'], secondary: ['PPal'] },
  { name: "Primalist's Linked Waistguard", classification: 'Unlimited', primary: ['Enh'], secondary: ['Ele', 'RS'] },
  { name: "Therazane's Link", classification: 'Unlimited', primary: ['Hunter'], secondary: ['Enh'] },
  { name: "Archimtiros' Ring of Reckoning", classification: 'Unlimited', primary: ['Warrior', 'Ret'], secondary: ['Frl'] },

  // ============================================================================
  // ZUL'GURUB - Items
  // ============================================================================
  { name: "Zin'rokh, Destroyer of Worlds", classification: 'Limited', primary: ['Warrior', 'Ret'], secondary: [] },
  { name: 'Bloodcaller', classification: 'Limited', primary: ['Rogue'], secondary: [] },
  { name: 'Warblade of the Hakkari', classification: 'Unlimited', primary: ['Rogue', 'Warrior'], secondary: ['Frl'] },
  { name: 'Fang of the Faceless', classification: 'Unlimited', primary: ['Rogue'], secondary: ['Warrior'] },
  { name: 'Ancient Hakkari Manslayer', classification: 'Unlimited', primary: ['Rogue', 'Warrior'], secondary: [] },
  { name: 'Touch of Chaos', classification: 'Unlimited', primary: ['SP', 'Warlock'], secondary: ['Mage'] },
  { name: 'Gurubashi Dwarf Destroyer', classification: 'Unlimited', primary: ['Hunter'], secondary: ['Rogue', 'Warrior'] },
  { name: 'Aegis of the Blood God', classification: 'Unlimited', primary: ['Tank', 'PPal'], secondary: [] },
  { name: "Soul Corrupter's Necklace", classification: 'Unlimited', primary: ['SP', 'Warlock'], secondary: ['Mage'] },
  { name: 'The Eye of Hakkar', classification: 'Unlimited', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal', 'HPri'] },
  { name: 'Cloak of Consumption', classification: 'Unlimited', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal'] },
  { name: "Jin'do's Judgment", classification: 'Unlimited', primary: ['SP'], secondary: ['RD', 'Bal'] },
  { name: "Jin'do's Hexxer", classification: 'Unlimited', primary: ['SP'], secondary: ['Warlock'] },
  { name: "Jin'do's Bag of Whammies", classification: 'Unlimited', primary: ['SP', 'Warlock'], secondary: ['Mage', 'Bal'] },
  { name: "Thekal's Grasp", classification: 'Unlimited', primary: ['Rogue', 'Frl'], secondary: [] },
  { name: "Arlokk's Grasp", classification: 'Unlimited', primary: ['Frl', 'Rogue'], secondary: [] },
  { name: 'Fang of Venoxis', classification: 'Unlimited', primary: ['Rogue'], secondary: ['Warrior'] },
  { name: "Bloodlord's Defender", classification: 'Unlimited', primary: ['Warrior', 'Rogue'], secondary: [] },
  { name: 'Halberd of Smiting', classification: 'Unlimited', primary: ['Warrior', 'Ret'], secondary: [] },

  // ============================================================================
  // RUINS OF AHN'QIRAJ - Items
  // ============================================================================
  { name: 'Qiraji Sacrificial Dagger', classification: 'Unlimited', primary: ['Rogue'], secondary: ['Warrior'] },
  { name: 'Manslayer of the Qiraji', classification: 'Unlimited', primary: ['Warrior', 'Ret'], secondary: [] },
  { name: 'Staff of the Ruins', classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['SP', 'Bal'] },
  { name: 'Sand Polished Hammer', classification: 'Unlimited', primary: ['RD', 'HPri', 'HPal'], secondary: [] },
  { name: 'Crossbow of Imminent Doom', classification: 'Unlimited', primary: ['Hunter'], secondary: ['Rogue', 'Warrior'] },
  { name: 'Bow of Taut Sinew', classification: 'Unlimited', primary: ['Hunter'], secondary: ['Rogue', 'Warrior'] },
  { name: 'Stinger of Ayamiss', classification: 'Unlimited', primary: ['Rogue'], secondary: ['Warrior'] },
  { name: "Buru's Skull Fragment", classification: 'Unlimited', primary: ['Tank', 'PPal'], secondary: [] },
  { name: 'Eye of Moam', classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['SP', 'Bal'] },
  { name: 'Ring of the Desert Winds', classification: 'Unlimited', primary: ['Rogue', 'Hunter', 'Frl'], secondary: [] },
  { name: 'Fetish of Chitinous Spikes', classification: 'Unlimited', primary: ['Tank', 'Frl'], secondary: ['Warrior'] },

  // ============================================================================
  // TEMPLE OF AHN'QIRAJ - Reserved/Limited Items
  // ============================================================================
  { name: 'Dark Edge of Insanity', classification: 'Reserved', primary: ['Warrior'], secondary: ['Ret'] },
  { name: "Death's Sting", classification: 'Reserved', primary: ['Rogue'], secondary: ['Warrior'] },
  { name: 'Scepter of the False Prophet', classification: 'Reserved', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal'] },
  { name: "Huhuran's Stinger", classification: 'Reserved', primary: ['Hunter'], secondary: [] },
  { name: 'Jom Gabbar', classification: 'Reserved', primary: ['Hunter', 'Rogue', 'Warrior', 'Frl'], secondary: ['Ret'] },
  { name: 'Badge of the Swarmguard', classification: 'Reserved', primary: ['Rogue', 'Warrior', 'Hunter', 'Frl'], secondary: ['Ret'] },
  { name: "Kalimdor's Revenge", classification: 'Limited', primary: ['Warrior', 'Ret'], secondary: [] },
  { name: 'Barb of the Sand Reaver', classification: 'Limited', primary: ['Warrior'], secondary: ['Hunter'] },
  { name: 'Ancient Qiraji Ripper', classification: 'Limited', primary: ['Rogue', 'Warrior'], secondary: [] },
  { name: 'Silithid Claw', classification: 'Limited', primary: ['Frl'], secondary: ['Rogue'] },
  { name: 'Gauntlets of Annihilation', classification: 'Limited', primary: ['Warrior'], secondary: ['Ret'] },
  { name: 'Dark Storm Gauntlets', classification: 'Limited', primary: ['Mage', 'Warlock'], secondary: ['SP'] },
  { name: 'Ring of the Godslayer', classification: 'Limited', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal', 'HPri'] },
  { name: "Vanquished Tentacle of C'Thun", classification: 'Limited', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal'] },
  { name: 'Belt of Never-Ending Agony', classification: 'Limited', primary: ['Rogue', 'Frl'], secondary: [] },
  { name: 'Grasp of the Old God', classification: 'Limited', primary: ['Frl', 'Rogue'], secondary: [] },

  // AQ40 - Unlimited Items
  { name: 'Staff of the Qiraji Prophets', classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['SP', 'Bal'] },
  { name: "Hammer of Ji'zhi", classification: 'Unlimited', primary: ['Ret'], secondary: ['Warrior'] },
  { name: 'Breastplate of Annihilation', classification: 'Unlimited', primary: ['Warrior'], secondary: ['Ret'] },
  { name: 'Wormscale Blocker', classification: 'Unlimited', primary: ['Tank', 'PPal'], secondary: [] },
  { name: "The Burrower's Shell", classification: 'Unlimited', primary: ['Tank'], secondary: ['PPal'] },
  { name: "Don Rigoberto's Lost Hat", classification: 'Unlimited', primary: ['RD', 'HPri', 'HPal'], secondary: [] },
  { name: 'Larvae of the Great Worm', classification: 'Unlimited', primary: ['Hunter'], secondary: [] },
  { name: 'Cloak of Clarity', classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['Priest', 'Druid'] },
  { name: 'Cloak of the Devoured', classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['SP', 'Bal'] },
  { name: "Mark of C'Thun", classification: 'Unlimited', primary: ['Warrior', 'Frl', 'Rogue'], secondary: ['Hunter', 'Ret'] },
  { name: 'Eyestalk Waist Cord', classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['SP', 'Bal'] },
  { name: 'Robes of the Guardian Saint', classification: 'Unlimited', primary: ['HPri'], secondary: ['RD', 'HPal'] },
  { name: 'Vest of Swift Execution', classification: 'Unlimited', primary: ['Rogue', 'Frl'], secondary: [] },
  { name: 'Silithid Carapace Chestguard', classification: 'Unlimited', primary: ['Hunter'], secondary: ['Enh'] },
  { name: "Vek'lor's Gloves of Devastation", classification: 'Unlimited', primary: ['Warrior'], secondary: ['Ret'] },
  { name: 'Gloves of the Hidden Temple', classification: 'Unlimited', primary: ['Rogue', 'Frl'], secondary: [] },
  { name: 'Gloves of the Messiah', classification: 'Unlimited', primary: ['RD', 'HPri', 'HPal'], secondary: [] },
  { name: 'Wasphide Gauntlets', classification: 'Unlimited', primary: ['Frl'], secondary: ['Rogue'] },
  { name: 'Hive Defiler Wristguards', classification: 'Unlimited', primary: ['Hunter'], secondary: ['Enh'] },
  { name: 'Cloak of the Golden Hive', classification: 'Unlimited', primary: ['Tank', 'PPal'], secondary: ['Warrior'] },
  { name: 'Royal Qiraji Belt', classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['Priest'] },
  { name: 'Belt of the Fallen Emperor', classification: 'Unlimited', primary: ['Warrior'], secondary: ['Ret'] },
  { name: "Regenerating Belt of Vek'nilash", classification: 'Unlimited', primary: ['RD', 'HPri', 'HPal'], secondary: [] },
  { name: 'Grasp of the Fallen Emperor', classification: 'Unlimited', primary: ['Frl', 'Hunter', 'Rogue'], secondary: [] },
  { name: "Royal Scepter of Vek'lor", classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['SP', 'Bal'] },
  { name: 'Boots of Epiphany', classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['Priest'] },
  { name: "Ring of Emperor Vek'lor", classification: 'Unlimited', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal'] },
  { name: 'Qiraji Execution Bracers', classification: 'Unlimited', primary: ['Warrior', 'Rogue', 'Frl'], secondary: ['Hunter'] },
  { name: "Amulet of Vek'nilash", classification: 'Unlimited', primary: ['Warrior', 'Frl'], secondary: ['Ret'] },
  { name: 'Bracelets of Royal Redemption', classification: 'Unlimited', primary: ['HPri', 'RD', 'HPal'], secondary: [] },
  { name: 'Fetish of the Sand Reaver', classification: 'Unlimited', primary: ['Hunter', 'Rogue', 'Warrior', 'Frl'], secondary: ['Ret'] },
  { name: 'Scarab Brooch', classification: 'Unlimited', primary: ['RD', 'HPri', 'HPal'], secondary: [] },
  { name: 'Petrified Scarab', classification: 'Unlimited', primary: ['Tank', 'PPal'], secondary: ['Warrior'] },

  // ============================================================================
  // NAXXRAMAS - Reserved Items
  // ============================================================================
  { name: 'Band of Unanswered Prayers', classification: 'Reserved', primary: ['RD', 'HPri', 'HPal'], secondary: [] },
  { name: "Maexxna's Fang", classification: 'Reserved', primary: ['Rogue'], secondary: ['Warrior'] },
  { name: 'Wraith Blade', classification: 'Reserved', primary: ['Rogue', 'Warrior'], secondary: [] },
  { name: 'Hatchet of Sundered Bone', classification: 'Reserved', primary: ['Warrior'], secondary: ['Rogue', 'Frl'] },
  { name: 'Legplates of Carnage', classification: 'Reserved', primary: ['Warrior'], secondary: ['Ret'] },
  { name: 'The Eye of Nerub', classification: 'Reserved', primary: ['Frl'], secondary: ['Warrior'] },
  { name: 'Iblis, Blade of the Fallen Seraph', classification: 'Reserved', primary: ['Rogue', 'Warrior'], secondary: [] },
  { name: 'Wand of the Whispering Dead', classification: 'Reserved', primary: ['Mage', 'Warlock', 'SP'], secondary: ['HPri'] },
  { name: 'Cloak of Suturing', classification: 'Reserved', primary: ['RD', 'HPri', 'HPal'], secondary: [] },
  { name: 'Wand of Fates', classification: 'Reserved', primary: ['Mage', 'Warlock', 'SP'], secondary: ['HPri'] },
  { name: 'Rime Covered Mantle', classification: 'Reserved', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal'] },
  { name: 'Leggings of Polarity', classification: 'Reserved', primary: ['Mage', 'Warlock'], secondary: ['SP', 'Bal'] },
  { name: 'The Castigator', classification: 'Reserved', primary: ['Warrior', 'Rogue'], secondary: [] },
  { name: "Sapphiron's Left Eye", classification: 'Reserved', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal', 'HPri'] },
  { name: "Sapphiron's Right Eye", classification: 'Reserved', primary: ['RD', 'HPri', 'HPal'], secondary: [] },
  { name: "Slayer's Crest", classification: 'Reserved', primary: ['Warrior', 'Rogue', 'Frl', 'Hunter'], secondary: ['Ret'] },
  { name: 'The Restrained Essence of Sapphiron', classification: 'Reserved', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal'] },
  { name: 'Doomfinger', classification: 'Reserved', primary: ['Mage', 'Warlock', 'SP'], secondary: ['HPri'] },
  { name: 'Kingsfall', classification: 'Reserved', primary: ['Rogue'], secondary: ['Warrior'] },
  { name: 'Nerubian Slavemaker', classification: 'Reserved', primary: ['Hunter'], secondary: ['Rogue', 'Warrior'] },
  { name: 'Shield of Condemnation', classification: 'Reserved', primary: ['Tank', 'PPal'], secondary: [] },

  // Naxx - Limited Items
  { name: 'Wristguards of Vengeance', classification: 'Limited', primary: ['Warrior'], secondary: ['Ret'] },
  { name: "The Widow's Embrace", classification: 'Limited', primary: ['Rogue', 'Warrior'], secondary: [] },
  { name: "Widow's Remorse", classification: 'Limited', primary: ['Rogue', 'Warrior'], secondary: [] },
  { name: 'Band of the Inevitable', classification: 'Limited', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal'] },
  { name: 'Libram of Light', classification: 'Limited', primary: ['HPal'], secondary: [] },
  { name: "Noth's Frigid Heart", classification: 'Limited', primary: ['Mage', 'Warlock'], secondary: ['SP', 'Bal'] },
  { name: 'Necklace of Necropsy', classification: 'Limited', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal'] },
  { name: 'Band of Unnatural Forces', classification: 'Limited', primary: ['Warrior', 'Rogue', 'Frl', 'Hunter'], secondary: ['Ret'] },
  { name: 'Brimstone Staff', classification: 'Limited', primary: ['Mage', 'Warlock'], secondary: ['SP', 'Bal'] },
  { name: 'Girdle of the Mentor', classification: 'Limited', primary: ['RD', 'HPri', 'HPal'], secondary: [] },
  { name: "Sadist's Collar", classification: 'Limited', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal', 'HPri'] },
  { name: "The Soul Harvester's Bindings", classification: 'Limited', primary: ['Mage', 'Warlock'], secondary: ['SP', 'Bal'] },
  { name: 'Leggings of Apocalypse', classification: 'Limited', primary: ['Rogue', 'Frl'], secondary: [] },
  { name: 'Seal of the Damned', classification: 'Limited', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal'] },
  { name: 'Soulstring', classification: 'Limited', primary: ['Hunter'], secondary: [] },
  { name: 'Band of Reanimation', classification: 'Limited', primary: ['RD', 'HPri', 'HPal'], secondary: [] },
  { name: 'Severance', classification: 'Limited', primary: ['Warrior'], secondary: ['Ret'] },
  { name: 'Midnight Haze', classification: 'Limited', primary: ['Rogue'], secondary: ['Warrior'] },
  { name: 'The End of Dreams', classification: 'Limited', primary: ['Rogue', 'Frl'], secondary: [] },
  { name: 'Toxin Injector', classification: 'Limited', primary: ['Hunter'], secondary: ['Rogue', 'Warrior'] },
  { name: 'Claymore of Unholy Might', classification: 'Limited', primary: ['Warrior'], secondary: ['Ret'] },
  { name: "Death's Bargain", classification: 'Limited', primary: ['Tank', 'PPal'], secondary: [] },
  { name: 'Eye of Diminution', classification: 'Limited', primary: ['Tank', 'PPal'], secondary: [] },
  { name: 'Plated Abomination Ribcage', classification: 'Limited', primary: ['Warrior'], secondary: ['Ret'] },
  { name: 'Spire of Twilight', classification: 'Limited', primary: ['Mage', 'Warlock'], secondary: ['SP', 'Bal'] },
  { name: 'Claw of the Frost Wyrm', classification: 'Limited', primary: ['Frl', 'Rogue'], secondary: [] },
  { name: 'Cloak of the Necropolis', classification: 'Limited', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal'] },
  { name: 'Might of the Scourge', classification: 'Limited', primary: ['Warrior', 'Rogue', 'Frl'], secondary: ['Hunter', 'Ret'] },
  { name: 'Power of the Scourge', classification: 'Limited', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal'] },
  { name: 'Resilience of the Scourge', classification: 'Limited', primary: ['RD', 'HPri', 'HPal'], secondary: [] },
  { name: 'Shroud of Dominion', classification: 'Limited', primary: ['RD', 'HPri', 'HPal'], secondary: [] },
  { name: 'Gem of Trapped Innocents', classification: 'Limited', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal', 'HPri'] },
  { name: 'Might of Menethil', classification: 'Limited', primary: ['Warrior'], secondary: ['Ret'] },
  { name: 'Soulseeker', classification: 'Limited', primary: ['Mage', 'Warlock'], secondary: ['SP', 'Bal'] },
  { name: "Stormrage's Talisman of Seething", classification: 'Limited', primary: ['Bal', 'Frl'], secondary: ['RD'] },
  { name: 'Bonescythe Ring', classification: 'Limited', primary: ['Rogue'], secondary: [] },
  { name: 'Frostfire Ring', classification: 'Limited', primary: ['Mage'], secondary: ['Warlock'] },
  { name: 'Ring of Faith', classification: 'Limited', primary: ['HPri'], secondary: ['SP'] },
  { name: 'Ring of the Cryptstalker', classification: 'Limited', primary: ['Hunter'], secondary: [] },
  { name: 'Ghoul Skin Tunic', classification: 'Limited', primary: ['Rogue', 'Frl'], secondary: [] },
  { name: 'Harbinger of Doom', classification: 'Limited', primary: ['Rogue', 'Warrior'], secondary: [] },
  { name: 'Misplaced Servo Arm', classification: 'Limited', primary: ['Tank', 'Frl'], secondary: ['Warrior'] },

  // Naxx - Unlimited Items
  { name: 'Gem of Nerubis', classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['Priest', 'Druid'] },
  { name: 'Cryptfiend Silk Cloak', classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['Priest', 'Druid'] },
  { name: 'Touch of Frost', classification: 'Unlimited', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal'] },
  { name: 'Malice Stone Pendant', classification: 'Unlimited', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal'] },
  { name: 'Polar Shoulder Pads', classification: 'Unlimited', primary: ['Frl'], secondary: ['Rogue'] },
  { name: 'Icebane Pauldrons', classification: 'Unlimited', primary: ['Tank'], secondary: ['Warrior'] },
  { name: 'Kiss of the Spider', classification: 'Unlimited', primary: ['Rogue', 'Warrior', 'Frl', 'Hunter'], secondary: ['Ret'] },
  { name: 'Pendant of Forgotten Names', classification: 'Unlimited', primary: ['RD', 'HPri', 'HPal'], secondary: [] },
  { name: 'Crystal Webbed Robe', classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['Priest'] },
  { name: 'Hailstone Band', classification: 'Unlimited', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal'] },
  { name: 'Cloak of the Scourge', classification: 'Unlimited', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal', 'Priest'] },
  { name: 'Totem of Flowing Water', classification: 'Unlimited', primary: ['RS'], secondary: [] },
  { name: "Preceptor's Hat", classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['Priest'] },
  { name: 'Icy Scale Coif', classification: 'Unlimited', primary: ['Hunter'], secondary: ['Enh'] },
  { name: 'Icebane Helmet', classification: 'Unlimited', primary: ['Tank'], secondary: ['Warrior'] },
  { name: "Loatheb's Reflection", classification: 'Unlimited', primary: ['RD', 'HPri', 'HPal'], secondary: [] },
  { name: 'Ring of Spiritual Fervor', classification: 'Unlimited', primary: ['RD', 'HPri', 'HPal'], secondary: [] },
  { name: 'Signet of the Fallen Defender', classification: 'Unlimited', primary: ['Tank', 'PPal'], secondary: [] },
  { name: 'Veil of Eclipse', classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['Priest'] },
  { name: 'Idol of Longevity', classification: 'Unlimited', primary: ['RD'], secondary: ['Bal', 'Frl'] },
  { name: 'Glacial Headdress', classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['Priest'] },
  { name: 'Polar Helmet', classification: 'Unlimited', primary: ['Frl'], secondary: ['Rogue'] },
  { name: 'Boots of Displacement', classification: 'Unlimited', primary: ['Rogue', 'Frl'], secondary: [] },
  { name: 'Corrupted Ashbringer', classification: 'Unlimited', primary: ['Warrior', 'Ret'], secondary: [] },
  { name: 'Maul of the Redeemed Crusader', classification: 'Unlimited', primary: ['Ret'], secondary: ['Warrior'] },
  { name: 'Warmth of Forgiveness', classification: 'Unlimited', primary: ['RD', 'HPri', 'HPal'], secondary: [] },
  { name: 'The Plague Bearer', classification: 'Unlimited', primary: ['Tank', 'PPal'], secondary: [] },
  { name: 'Glacial Mantle', classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['Priest'] },
  { name: 'Icy Scale Spaulders', classification: 'Unlimited', primary: ['Hunter'], secondary: ['Enh'] },
  { name: 'Digested Hand of Power', classification: 'Unlimited', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal'] },
  { name: "Gluth's Missing Collar", classification: 'Unlimited', primary: ['Frl', 'Hunter', 'Rogue'], secondary: [] },
  { name: 'The Face of Death', classification: 'Unlimited', primary: ['Tank', 'PPal'], secondary: [] },
  { name: 'Glyph of Deflection', classification: 'Unlimited', primary: ['Tank', 'PPal'], secondary: [] },
  { name: 'Eye of the Dead', classification: 'Unlimited', primary: ['RD', 'HPri', 'HPal'], secondary: [] },
  { name: 'Gressil, Dawn of Ruin', classification: 'Unlimited', primary: ['Rogue', 'Warrior'], secondary: [] },
  { name: 'The Hungering Cold', classification: 'Unlimited', primary: ['Rogue', 'Warrior'], secondary: [] },
  { name: 'Hammer of the Twisting Nether', classification: 'Unlimited', primary: ['RD', 'HPri', 'HPal'], secondary: [] },
  { name: 'Ring of the Dreadnaught', classification: 'Unlimited', primary: ['Tank'], secondary: ['Warrior'] },
  { name: 'Ring of the Dreamwalker', classification: 'Unlimited', primary: ['RD'], secondary: ['Bal', 'Frl'] },
  { name: 'Ring of the Earthshatterer', classification: 'Unlimited', primary: ['RS', 'Ele'], secondary: ['Enh'] },
  { name: 'Ring of Redemption', classification: 'Unlimited', primary: ['HPal'], secondary: ['Ret', 'PPal'] },
  { name: 'Plagueheart Ring', classification: 'Unlimited', primary: ['Warlock'], secondary: [] },
]

async function main() {
  console.log('Starting item classification update from spreadsheet...')

  // Load all class specs
  const { data: classSpecs, error: specsError } = await supabase
    .from('class_specs')
    .select('id, name, class_id, wow_classes(name)')

  if (specsError || !classSpecs) {
    console.error('Error loading class specs:', specsError)
    return
  }

  console.log(`Loaded ${classSpecs.length} class specs`)

  // Create a map of spec names to IDs
  const specNameToId: Record<string, { id: string, class_id: string }> = {}

  for (const spec of classSpecs) {
    const className = (spec as any).wow_classes?.name
    const specName = spec.name

    // Store combined name as "ClassName SpecName"
    if (className && specName) {
      const combinedName = `${className} ${specName}`
      specNameToId[combinedName] = { id: spec.id, class_id: spec.class_id }
    }
  }

  console.log('Available specs:', Object.keys(specNameToId).sort())

  let updated = 0
  let notFound = 0
  const notFoundItems: string[] = []

  for (const item of itemData) {
    // Find the item(s) in the database - handle duplicates
    const { data: lootItems, error: itemError } = await supabase
      .from('loot_items')
      .select('id, name')
      .eq('name', item.name)

    if (itemError || !lootItems || lootItems.length === 0) {
      notFound++
      notFoundItems.push(item.name)
      continue
    }

    // Update all items with this name (handles duplicates)
    for (const lootItem of lootItems) {
      // Update classification
      const allocationCost = (item.classification === 'Reserved' || item.classification === 'Limited') ? 1 : 0

      const { error: updateError } = await supabase
        .from('loot_items')
        .update({
          classification: item.classification,
          allocation_cost: allocationCost
        })
        .eq('id', lootItem.id)

      if (updateError) {
        console.error(`Error updating classification for ${item.name}:`, updateError)
        continue
      }

      // Clear existing spec assignments
      await supabase
        .from('loot_item_classes')
        .delete()
        .eq('loot_item_id', lootItem.id)

      // Add primary specs
      for (const shorthand of item.primary) {
        const fullSpecName = specMapping[shorthand] || shorthand
        const specInfo = specNameToId[fullSpecName]

        if (specInfo) {
          await supabase
            .from('loot_item_classes')
            .insert({
              loot_item_id: lootItem.id,
              class_id: specInfo.class_id,
              spec_id: specInfo.id,
              spec_type: 'primary'
            })
        }
      }

      // Add secondary specs
      for (const shorthand of item.secondary) {
        const fullSpecName = specMapping[shorthand] || shorthand
        const specInfo = specNameToId[fullSpecName]

        if (specInfo) {
          await supabase
            .from('loot_item_classes')
            .insert({
              loot_item_id: lootItem.id,
              class_id: specInfo.class_id,
              spec_id: specInfo.id,
              spec_type: 'secondary'
            })
        }
      }
    }

    console.log(`Updated: ${item.name} (${item.classification}) - ${lootItems.length} item(s)`)
    updated++
  }

  console.log(`\nSummary:`)
  console.log(`   Updated: ${updated}`)
  console.log(`   Not found: ${notFound}`)

  if (notFoundItems.length > 0) {
    console.log(`\nItems not found in database:`)
    notFoundItems.forEach(name => console.log(`   - ${name}`))
  }

  console.log('\nDone!')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
