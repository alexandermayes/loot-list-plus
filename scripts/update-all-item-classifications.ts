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
  'Hpal': 'Paladin Holy', // Handle lowercase variant
  'Ret': 'Paladin Retribution',
  'PPal': 'Paladin Protection',
  'RD': 'Druid Restoration',
  'Frl': 'Druid Feral',
  'Bal': 'Druid Balance',
  'Druid': 'Druid Restoration', // Default to Restoration for generic Druid
  'ProtW': 'Warrior Protection',
  'Fury': 'Warrior Arms/Fury',
  'Warrior': 'Warrior Arms/Fury',
  'Tank': 'Warrior Protection',
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

// Role group mappings - these will add ALL specs in that role
const roleGroupSpecs: Record<string, string[]> = {
  'Physical': ['Warrior Arms/Fury', 'Rogue Rogue', 'Hunter Hunter', 'Paladin Retribution', 'Druid Feral'],
  'Caster': ['Mage Mage', 'Warlock Warlock', 'Priest Shadow', 'Druid Balance', 'Shaman Elemental'],
  'Healer': ['Priest Holy/Disc', 'Paladin Holy', 'Druid Restoration', 'Shaman Restoration'],
}

// Complete item data from spreadsheet
const itemData = [
  // MC - Reserved
  { name: 'Ancient Petrified Leaf', classification: 'Reserved', primary: ['Hunter'], secondary: [] },
  { name: 'Azuresong Mageblade', classification: 'Reserved', primary: ['Mage', 'Warlock'], secondary: ['HPal'] },
  { name: 'Band of Accuria', classification: 'Reserved', primary: ['Rogue', 'Warrior', 'Frl', 'Hunter'], secondary: ['Ret'] },
  { name: 'Cauterizing Band', classification: 'Reserved', primary: ['RD', 'HPri', 'HPal'], secondary: [] },
  { name: 'Choker of the Fire Lord', classification: 'Reserved', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal', 'HPri', 'HPal'] },
  { name: 'Quick Strike Ring', classification: 'Reserved', primary: ['Warrior', 'Ret'], secondary: ['Frl', 'Hunter', 'Rogue'] },
  { name: 'Talisman of Ephemeral Power', classification: 'Reserved', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal'] },
  { name: 'The Eye of Divinity', classification: 'Reserved', primary: ['HPri'], secondary: ['SP'] },
  { name: "Vis'kag the Bloodletter", classification: 'Reserved', primary: ['Rogue', 'Fury'], secondary: ['Warrior'] },
  { name: 'Core Hound Tooth', classification: 'Reserved', primary: ['Rogue', 'Warrior'], secondary: ['Hunter'] },
  { name: 'Aurastone Hammer', classification: 'Reserved', primary: ['RD', 'SP', 'HPal'], secondary: ['Priest'] },
  { name: 'Brutality Blade', classification: 'Reserved', primary: ['Rogue', 'Warrior'], secondary: ['Hunter', 'Tank'] },
  { name: 'Onslaught Girdle', classification: 'Reserved', primary: ['Warrior'], secondary: ['Ret'] },
  { name: "Perdition's Blade", classification: 'Reserved', primary: ['Rogue', 'Warrior'], secondary: [] },
  { name: 'Ring of Spell Power', classification: 'Reserved', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal'] },
  { name: "Striker's Mark", classification: 'Reserved', primary: ['Rogue', 'Fury'], secondary: ['Tank'] },

  // MC - Limited
  { name: 'Flameguard Gauntlets', classification: 'Limited', primary: ['Warrior', 'Ret'], secondary: [] },
  { name: 'Mana Igniting Cord', classification: 'Limited', primary: ['Mage', 'Warlock'], secondary: ['Bal', 'Priest', 'Paladin'] },
  { name: 'Salamander Scale Pants', classification: 'Limited', primary: ['RD', 'HPal'], secondary: [] },
  { name: 'Shard of the Scale', classification: 'Limited', primary: ['RD', 'Priest', 'HPal'], secondary: [] },
  { name: 'Wild Growth Spaulders', classification: 'Limited', primary: ['RD', 'HPal'], secondary: [] },
  { name: 'Aged Core Leather Gloves', classification: 'Limited', primary: ['Rogue', 'Tank'], secondary: ['Warrior'] },
  { name: 'Sapphiron Drape', classification: 'Limited', primary: ['Mage', 'Warlock'], secondary: ['RD', 'Priest', 'HPal'] },
  { name: 'Wristguards of Stability', classification: 'Limited', primary: ['Warrior', 'Frl'], secondary: ['Ret', 'Rogue'] },
  { name: 'Cloak of the Shrouded Mists', classification: 'Limited', primary: ['Hunter', 'Rogue', 'Frl', 'ProtW'], secondary: ['Warrior'] },
  { name: 'Gutgore Ripper', classification: 'Limited', primary: ['Rogue'], secondary: ['Physical'] },
  { name: 'Deathbringer', classification: 'Limited', primary: ['Warrior'], secondary: [] },
  { name: "Bonereaver's Edge", classification: 'Limited', primary: ['Warrior', 'Ret'], secondary: [] },
  { name: 'Head of Onyxia', classification: 'Limited', primary: ['Frl', 'Hunter', 'Rogue', 'Warrior', 'Ret'], secondary: ['RD', 'Mage', 'Priest', 'Warlock', 'Pal'] },

  // MC - Unlimited
  { name: 'Ancient Cornerstone Grimoire', classification: 'Unlimited', primary: ['Druid', 'Mage', 'Priest', 'Warlock', 'HPal'], secondary: ['Hunter', 'Rogue', 'Warrior', 'Ret'] },
  { name: 'Band of Sulfuras', classification: 'Unlimited', primary: ['Druid', 'Priest', 'HPal'], secondary: [] },
  { name: 'Blastershot Launcher', classification: 'Unlimited', primary: ['Rogue', 'Warrior'], secondary: ['Hunter'] },
  { name: 'Choker of Enlightenment', classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['Priest', 'HPal'] },
  { name: 'Core Forged Greaves', classification: 'Unlimited', primary: ['Tank'], secondary: ['Warrior'] },
  { name: 'Crimson Shocker', classification: 'Unlimited', primary: ['Mage', 'Priest', 'Warlock'], secondary: [] },
  { name: 'Crown of Destruction', classification: 'Unlimited', primary: ['Hunter', 'Warrior', 'Ret'], secondary: ['Paladin'] },
  { name: 'Deep Earth Spaulders', classification: 'Unlimited', primary: [], secondary: [] },
  { name: "Dragon's Blood Cape", classification: 'Unlimited', primary: ['Frl', 'Tank', 'Ret'], secondary: ['Warrior'] },
  { name: 'Drillborer Disk', classification: 'Unlimited', primary: ['Warrior', 'PPal'], secondary: ['Paladin'] },
  { name: 'Earthshaker', classification: 'Unlimited', primary: ['Warrior', 'Ret'], secondary: ['Paladin'] },
  { name: "Eskhandar's Collar", classification: 'Unlimited', primary: ['Frl', 'Hunter', 'Rogue', 'Warrior', 'Ret'], secondary: ['Paladin'] },
  { name: "Eskhandar's Right Claw", classification: 'Unlimited', primary: ['Warrior'], secondary: ['Rogue'] },
  { name: 'Essence of the Pure Flame', classification: 'Unlimited', primary: ['Frl', 'Warrior', 'Ret'], secondary: [] },
  { name: "Finkle's Lava Dredger", classification: 'Unlimited', primary: ['Druid', 'Ret'], secondary: ['Paladin'] },
  { name: 'Fire Runed Grimoire', classification: 'Unlimited', primary: ['Druid', 'Mage', 'Priest', 'Warlock', 'Paladin'], secondary: [] },
  { name: 'Fireguard Shoulders', classification: 'Unlimited', primary: ['Frl', 'Rogue', 'Warrior', 'Paladin'], secondary: ['Druid', 'Hunter'] },
  { name: 'Fireproof Cloak', classification: 'Unlimited', primary: ['Druid', 'Warrior', 'Paladin'], secondary: ['Hunter', 'Mage', 'Priest', 'Warlock'] },
  { name: 'Flamewaker Legplates', classification: 'Unlimited', primary: ['Warrior', 'Ret'], secondary: [] },
  { name: 'Gloves of the Hypnotic Flame', classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: [] },
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

  // BWL - Reserved
  { name: "Ashjre'thul, Crossbow of Smiting", classification: 'Reserved', primary: ['Hunter'], secondary: ['Physical'] },
  { name: 'Boots of Pure Thought', classification: 'Reserved', primary: ['Healer'], secondary: [] },
  { name: 'Chromatically Tempered Sword', classification: 'Reserved', primary: ['Warrior'], secondary: ['Rogue'] },
  { name: "Crul'shorukh, Edge of Chaos", classification: 'Reserved', primary: ['ProtW', 'Fury'], secondary: [] },
  { name: 'Drake Fang Talisman', classification: 'Reserved', primary: ['ProtW', 'Fury', 'Rogue'], secondary: ['Frl', 'Ret', 'Hunter'] },
  { name: 'Empowered Leggings', classification: 'Reserved', primary: ['Healer'], secondary: ['Warrior'] },
  { name: "Lok'amir il Romathis", classification: 'Reserved', primary: ['HPal', 'RD'], secondary: ['Priest'] },
  { name: 'Maladath, Runed Blade of the Black Flight', classification: 'Reserved', primary: ['ProtW', 'Fury'], secondary: ['Rogue'] },
  { name: "Mish'undare, Circlet of the Mind Flayer", classification: 'Reserved', primary: ['Mage', 'Warlock'], secondary: ['HPal', 'RD'] },
  { name: "Neltharion's Tear", classification: 'Reserved', primary: ['Warlock'], secondary: ['Mage'] },
  { name: 'Pure Elementium Band', classification: 'Reserved', primary: ['Healer'], secondary: [] },
  { name: 'Rejuvenating Gem', classification: 'Reserved', primary: ['Healer'], secondary: [] },
  { name: 'Staff of the Shadow Flame', classification: 'Reserved', primary: ['Mage'], secondary: ['Caster', 'Healer'] },
  { name: 'Ashkandi, Greatsword of the Brotherhood', classification: 'Reserved', primary: ['Hunter'], secondary: ['Physical'] },
  { name: 'Band of Forced Concentration', classification: 'Reserved', primary: ['Caster'], secondary: [] },
  { name: 'Claw of Chromaggus', classification: 'Reserved', primary: ['Warlock', 'RD'], secondary: ['Mage', 'Healer'] },

  // BWL - Limited
  { name: "Prestor's Talisman of Connivery", classification: 'Limited', primary: ['Rogue', 'Frl', 'Hunter'], secondary: ['Ret', 'ProtW', 'Fury'] },
  { name: 'The Untamed Blade', classification: 'Limited', primary: ['Physical'], secondary: [] },
  { name: 'Band of Dark Dominion', classification: 'Limited', primary: ['Warlock', 'SP'], secondary: ['Caster', 'Healer'] },
  { name: 'Boots of the Shadow Flame', classification: 'Limited', primary: ['Rogue', 'Frl'], secondary: ['Warrior', 'Ret'] },
  { name: 'Bracers of Arcane Accuracy', classification: 'Limited', primary: ['Caster'], secondary: ['Healer'] },
  { name: 'Chromatic Boots', classification: 'Limited', primary: ['Warrior'], secondary: ['Paladin'] },
  { name: 'Cloak of Firemaw', classification: 'Limited', primary: ['Hunter', 'Rogue', 'Tank'], secondary: ['Warrior', 'Ret', 'Frl'] },
  { name: 'Cloak of the Brood Lord', classification: 'Limited', primary: ['Caster'], secondary: ['Healer'] },
  { name: 'Head of Nefarian', classification: 'Limited', primary: ['Physical'], secondary: ['Caster', 'Healer', 'Tank'] },
  { name: 'Mantle of the Blackwing Cabal', classification: 'Limited', primary: ['Caster'], secondary: ['Healer'] },
  { name: 'Shroud of Pure Thought', classification: 'Limited', primary: ['Healer'], secondary: [] },
  { name: "Archimtiros' Ring of Reckoning", classification: 'Limited', primary: ['Frl', 'Warrior'], secondary: ['Rogue', 'Paladin', 'Hunter'] },
  { name: 'Circle of Applied Force', classification: 'Limited', primary: ['Tank', 'Ret', 'Frl', 'Warrior'], secondary: ['Rogue'] },
  { name: 'Cloak of Draconic Might', classification: 'Limited', primary: ['Frl', 'Warrior', 'Ret'], secondary: ['Rogue', 'Hunter'] },
  { name: 'Dragonfang Blade', classification: 'Limited', primary: ['Rogue', 'Tank'], secondary: ['Physical'] },
  { name: 'Drake Talon Pauldrons', classification: 'Limited', primary: ['Warrior', 'Paladin'], secondary: [] },

  // Tier items
  { name: 'Tier 1 Helmet', classification: 'Limited', primary: [], secondary: [] },
  { name: 'Tier 1 Belt', classification: 'Limited', primary: [], secondary: [] },
  { name: 'Tier 1 Shoulders', classification: 'Limited', primary: [], secondary: [] },
  { name: 'Tier 1 Legs', classification: 'Limited', primary: [], secondary: [] },
  { name: 'Tier 1 Chest', classification: 'Limited', primary: [], secondary: [] },
  { name: 'Tier 1 Bracers', classification: 'Limited', primary: [], secondary: [] },
  { name: 'Tier 1 Boots', classification: 'Limited', primary: [], secondary: [] },
  { name: 'Tier 1 Gloves', classification: 'Limited', primary: [], secondary: [] },
  { name: 'Tier 2 Helmet', classification: 'Limited', primary: [], secondary: [] },
  { name: 'Tier 2 Legs', classification: 'Limited', primary: [], secondary: [] },
  { name: 'Tier 2 Belt', classification: 'Unlimited', primary: [], secondary: [] },
  { name: 'Tier 2 Shoulders', classification: 'Unlimited', primary: [], secondary: [] },
  { name: 'Tier 2 Chest', classification: 'Unlimited', primary: [], secondary: [] },
  { name: 'Tier 2 Boots', classification: 'Unlimited', primary: [], secondary: [] },
  { name: 'Tier 2 Gloves', classification: 'Unlimited', primary: [], secondary: [] },
  { name: 'Tier 2 Bracers', classification: 'Unlimited', primary: [], secondary: [] },

  // BWL - Unlimited (continued)
  { name: 'Aegis of Preservation', classification: 'Unlimited', primary: ['Priest'], secondary: [] },
  { name: "Angelista's Grasp", classification: 'Unlimited', primary: ['Caster', 'Healer'], secondary: [] },
  { name: 'Arcane Infused Gem', classification: 'Unlimited', primary: ['Hunter'], secondary: [] },
  { name: 'Black Ash Robe', classification: 'Unlimited', primary: ['Caster', 'Healer'], secondary: [] },
  { name: 'Black Brood Pauldrons', classification: 'Unlimited', primary: ['Hunter'], secondary: [] },
  { name: 'Claw of the Black Drake', classification: 'Unlimited', primary: ['Physical'], secondary: [] },
  { name: "Doom's Edge", classification: 'Unlimited', primary: ['Physical'], secondary: [] },
  { name: 'Draconic Avenger', classification: 'Unlimited', primary: ['Physical'], secondary: [] },
  { name: 'Draconic Maul', classification: 'Unlimited', primary: ['Physical'], secondary: [] },
  { name: "Dragon's Touch", classification: 'Unlimited', primary: ['Caster'], secondary: [] },
  { name: 'Dragonbreath Hand Cannon', classification: 'Unlimited', primary: ['Physical', 'Tank'], secondary: [] },
  { name: 'Drake Talon Cleaver', classification: 'Unlimited', primary: ['Physical', 'Tank'], secondary: [] },
  { name: 'Girdle of the Fallen Crusader', classification: 'Unlimited', primary: ['Warrior', 'Paladin'], secondary: [] },
  { name: 'Ebony Flame Gloves', classification: 'Unlimited', primary: ['SP', 'Warlock'], secondary: ['Caster'] },
  { name: 'Elementium Reinforced Bulwark', classification: 'Unlimited', primary: ['Warrior', 'Paladin'], secondary: [] },
  { name: 'Elementium Threaded Cloak', classification: 'Unlimited', primary: ['Frl', 'Warrior', 'Paladin'], secondary: [] },
  { name: 'Emberweave Leggings', classification: 'Unlimited', primary: ['Physical', 'Tank'], secondary: [] },
  { name: 'Essence Gatherer', classification: 'Unlimited', primary: ['Healer'], secondary: ['Caster'] },
  { name: "Firemaw's Clutch", classification: 'Unlimited', primary: ['Caster', 'Healer'], secondary: [] },
  { name: 'Gloves of Rapid Evolution', classification: 'Unlimited', primary: ['Healer'], secondary: [] },
  { name: 'Heartstriker', classification: 'Unlimited', primary: ['Physical', 'Tank'], secondary: [] },
  { name: 'Helm of Endless Rage', classification: 'Unlimited', primary: ['Tank'], secondary: ['Physical'] },
  { name: 'Herald of Woe', classification: 'Unlimited', primary: ['Druid', 'Paladin'], secondary: [] },
  { name: 'Interlaced Shadow Jerkin', classification: 'Unlimited', primary: ['Physical', 'Tank'], secondary: [] },
  { name: 'Legguards of the Fallen Crusader', classification: 'Unlimited', primary: ['Ret'], secondary: ['Warrior'] },
  { name: 'Lifegiving Gem', classification: 'Unlimited', primary: ['Warrior'], secondary: [] },
  { name: "Malfurion's Blessed Bulwark", classification: 'Unlimited', primary: ['Tank'], secondary: ['Physical'] },
  { name: 'Mind Quickening Gem', classification: 'Unlimited', primary: ['Mage'], secondary: [] },
  { name: 'Scrolls of Binding Light', classification: 'Unlimited', primary: ['Paladin'], secondary: [] },
  { name: 'Pendant of the Fallen Dragon', classification: 'Unlimited', primary: ['RD'], secondary: ['HPri', 'Paladin'] },
  { name: "Primalist's Linked Legguards", classification: 'Unlimited', primary: ['Paladin'], secondary: [] },
  { name: "Primalist's Linked Waistguard", classification: 'Unlimited', primary: ['Paladin'], secondary: [] },
  { name: 'Red Dragonscale Protector', classification: 'Unlimited', primary: ['Paladin'], secondary: [] },
  { name: 'Ring of Blackrock', classification: 'Unlimited', primary: ['Druid', 'Priest'], secondary: ['Mage', 'Paladin', 'Warlock'] },
  { name: "Ringo's Blizzard Boots", classification: 'Unlimited', primary: ['Mage'], secondary: [] },
  { name: 'Rune of Metamorphosis', classification: 'Unlimited', primary: ['Druid'], secondary: [] },
  { name: 'Shadow Wing Focus Staff', classification: 'Unlimited', primary: ['Caster', 'Healer'], secondary: [] },
  { name: 'Shimmering Geta', classification: 'Unlimited', primary: ['Healer'], secondary: [] },
  { name: 'Spineshatter', classification: 'Unlimited', primary: ['Warrior', 'Paladin'], secondary: [] },
  { name: "Styleen's Impeding Scarab", classification: 'Unlimited', primary: ['Tank', 'Paladin'], secondary: [] },
  { name: 'Taut Dragonhide Belt', classification: 'Unlimited', primary: ['Frl', 'Rogue'], secondary: ['Hunter'] },
  { name: 'Taut Dragonhide Gloves', classification: 'Unlimited', primary: ['Druid', 'HPal'], secondary: [] },
  { name: 'Taut Dragonhide Shoulderpads', classification: 'Unlimited', primary: ['Frl', 'Rogue'], secondary: [] },
  { name: 'The Black Book', classification: 'Unlimited', primary: ['Warlock'], secondary: [] },
  { name: "Therazane's Link", classification: 'Unlimited', primary: ['Hunter', 'Ret', 'Warrior'], secondary: [] },
  { name: 'Venomous Totem', classification: 'Unlimited', primary: ['Rogue'], secondary: [] },

  // AQ40 - Quest items
  { name: 'Blue Qiraji Resonating Crystal', classification: 'Unlimited', primary: [], secondary: [] },
  { name: 'Green Qiraji Resonating Crystal', classification: 'Unlimited', primary: [], secondary: [] },
  { name: 'Red Qiraji Resonating Crystal', classification: 'Unlimited', primary: [], secondary: [] },
  { name: 'Yellow Qiraji Resonating Crystal', classification: 'Unlimited', primary: [], secondary: [] },

  // AQ40 - Class items (Limited)
  { name: 'Carapace of the Old God', classification: 'Limited', primary: ['Warrior', 'Paladin', 'Hunter', 'Rogue', 'Shaman'], secondary: [] },
  { name: 'Husk of the Old God', classification: 'Limited', primary: ['Priest', 'Mage', 'Warlock', 'Druid'], secondary: [] },
  { name: 'Imperial Qiraji Armaments', classification: 'Limited', primary: ['Warrior', 'Rogue', 'Hunter', 'Frl'], secondary: ['Paladin'] },
  { name: 'Imperial Qiraji Regalia', classification: 'Limited', primary: ['ProtW', 'Druid', 'Warlock', 'Mage', 'Priest'], secondary: [] },
  { name: "Ouro's Intact Hide", classification: 'Limited', primary: ['Warrior', 'Rogue', 'Priest', 'Mage'], secondary: [] },
  { name: 'Qiraji Bindings of Command', classification: 'Limited', primary: ['Warrior'], secondary: ['Hunter', 'Rogue', 'Priest'] },
  { name: 'Qiraji Bindings of Dominance', classification: 'Limited', primary: ['Mage', 'Warlock', 'Paladin'], secondary: ['Shaman', 'Druid'] },
  { name: 'Skin of the Great Sandworm', classification: 'Limited', primary: ['Paladin', 'Hunter', 'Shaman', 'Warlock', 'Druid'], secondary: [] },
  { name: "Vek'lor's Diadem", classification: 'Limited', primary: ['Rogue'], secondary: ['Paladin', 'Hunter', 'Druid'] },
  { name: "Vek'nilash's Circlet", classification: 'Limited', primary: ['Warrior', 'Mage', 'Warlock'], secondary: ['Priest'] },

  // AQ40 - Reserved
  { name: "Ritssyn's Ring of Chaos", classification: 'Reserved', primary: ['Mage', 'Warlock'], secondary: ['Caster', 'Healer'] },
  { name: 'Breastplate of Annihilation', classification: 'Reserved', primary: ['Warrior'], secondary: ['Paladin'] },
  { name: 'Wand of Qiraji Nobility', classification: 'Reserved', primary: ['Warlock', 'Mage'], secondary: ['Healer', 'Caster'] },
  { name: 'Ancient Qiraji Ripper', classification: 'Reserved', primary: ['Rogue', 'Warrior'], secondary: ['Physical'] },
  { name: 'Barbed Choker', classification: 'Reserved', primary: ['Warrior', 'Rogue'], secondary: ['Physical'] },
  { name: 'Robes of the Guardian Saint', classification: 'Reserved', primary: ['Healer'], secondary: [] },
  { name: 'Totem of Life', classification: 'Reserved', primary: ['Shaman'], secondary: [] },
  { name: 'Ring of the Qiraji Fury', classification: 'Reserved', primary: ['Warrior', 'Rogue', 'Tank'], secondary: ['Ret', 'Hunter'] },
  { name: 'Scarab Brooch', classification: 'Reserved', primary: ['HPri', 'RD'], secondary: ['Hpal'] },
  { name: 'Sharpened Silithid Femur', classification: 'Reserved', primary: ['Mage', 'Warlock'], secondary: ['Paladin'] },
  { name: "Don Rigoberto's Lost Hat", classification: 'Reserved', primary: ['Healer'], secondary: [] },
  { name: 'Jom Gabbar', classification: 'Reserved', primary: ['Physical', 'Tank'], secondary: [] },
  { name: 'Larvae of the Great Worm', classification: 'Reserved', primary: ['Hunter', 'Rogue', 'Warrior'], secondary: ['Physical', 'Tank'] },
  { name: 'Amulet of Vek\'nilash', classification: 'Reserved', primary: ['Warlock', 'Mage'], secondary: ['Caster', 'Healer'] },
  { name: 'Bracelets of Royal Redemption', classification: 'Reserved', primary: ['Healer'], secondary: [] },

  // AQ40 - Limited
  { name: 'Cloak of Concentrated Hatred', classification: 'Limited', primary: ['Warrior', 'Rogue', 'Tank'], secondary: ['Ret', 'Hunter', 'Frl'] },
  { name: "Angelista's Charm", classification: 'Limited', primary: ['Healer'], secondary: [] },
  { name: 'Boots of the Fallen Hero', classification: 'Limited', primary: ['Warrior'], secondary: ['Paladin'] },
  { name: 'Gloves of Enforcement', classification: 'Limited', primary: ['Frl', 'Rogue', 'Shaman', 'Warrior'], secondary: ['Paladin', 'Hunter'] },
  { name: 'Libram of Grace', classification: 'Limited', primary: ['HPal'], secondary: ['Paladin'] },
  { name: 'Idol of Health', classification: 'Limited', primary: ['RD'], secondary: ['Druid'] },
  { name: 'Barb of the Sand Reaver', classification: 'Limited', primary: ['Physical'], secondary: [] },
  { name: "Huhuran's Stinger", classification: 'Limited', primary: ['Physical', 'Tank'], secondary: [] },
  { name: 'Qiraji Execution Bracers', classification: 'Limited', primary: ['Rogue', 'Frl', 'Warrior'], secondary: ['Ret', 'Hunter'] },
  { name: 'Regenerating Belt of Vek\'nilash', classification: 'Limited', primary: ['RD', 'Shaman', 'HPal'], secondary: ['Paladin'] },
  { name: 'Wormscale Blocker', classification: 'Limited', primary: ['Shaman', 'Paladin'], secondary: [] },
  { name: 'Creeping Vine Helm', classification: 'Limited', primary: ['Druid', 'Shaman', 'HPal'], secondary: [] },

  // AQ40 - Unlimited
  { name: 'Anubisath Warhammer', classification: 'Unlimited', primary: ['Physical'], secondary: [] },
  { name: 'Garb of Royal Ascension', classification: 'Unlimited', primary: ['Warlock'], secondary: ['Caster'] },
  { name: 'Gloves of the Immortal', classification: 'Unlimited', primary: ['Caster', 'Healer'], secondary: [] },
  { name: 'Gloves of the Redeemed Prophecy', classification: 'Unlimited', primary: ['Paladin'], secondary: [] },
  { name: 'Neretzek, The Blood Drinker', classification: 'Unlimited', primary: ['Physical'], secondary: [] },
  { name: 'Shard of the Fallen Star', classification: 'Unlimited', primary: [], secondary: [] },
  { name: 'Amulet of Foul Warding', classification: 'Unlimited', primary: ['Physical'], secondary: [] },
  { name: 'Barrage Shoulders', classification: 'Unlimited', primary: ['Physical', 'Tank'], secondary: [] },
  { name: 'Beetle Scaled Wristguards', classification: 'Unlimited', primary: ['Druid', 'Shaman', 'Rogue'], secondary: [] },
  { name: 'Boots of the Fallen Prophet', classification: 'Unlimited', primary: ['Warrior', 'Hunter', 'Shaman', 'Paladin'], secondary: [] },
  { name: 'Boots of the Redeemed Prophecy', classification: 'Unlimited', primary: ['Paladin'], secondary: [] },
  { name: 'Boots of the Unwavering Will', classification: 'Unlimited', primary: ['Warrior', 'Paladin'], secondary: [] },
  { name: 'Hammer of Ji\'zhi', classification: 'Unlimited', primary: ['Druid', 'Paladin', 'Shaman'], secondary: [] },
  { name: 'Leggings of Immersion', classification: 'Unlimited', primary: ['Druid', 'Shaman', 'Paladin'], secondary: [] },
  { name: 'Pendant of the Qiraji Guardian', classification: 'Unlimited', primary: ['Tank'], secondary: [] },
  { name: 'Ring of Swarming Thought', classification: 'Unlimited', primary: ['Warlock', 'Mage'], secondary: ['Caster'] },
  { name: 'Staff of the Qiraji Prophets', classification: 'Unlimited', primary: ['Warlock'], secondary: ['Caster'] },
  { name: "Angelista's Touch", classification: 'Unlimited', primary: ['Tank'], secondary: [] },
  { name: 'Cape of the Trinity', classification: 'Unlimited', primary: ['Caster'], secondary: ['Healer'] },
  { name: 'Guise of the Devourer', classification: 'Unlimited', primary: ['Druid', 'Rogue', 'Shaman', 'Warrior', 'Paladin', 'Hunter'], secondary: [] },
  { name: 'Robes of the Triumvirate', classification: 'Unlimited', primary: ['Caster', 'Healer'], secondary: [] },
  { name: 'Ternary Mantle', classification: 'Unlimited', primary: ['Healer'], secondary: [] },
  { name: 'Triad Girdle', classification: 'Unlimited', primary: ['Warrior', 'Paladin'], secondary: [] },
  { name: 'Petrified Scarab', classification: 'Unlimited', primary: [], secondary: [] },
  { name: 'Ring of the Devoured', classification: 'Unlimited', primary: ['Healer'], secondary: [] },
  { name: 'Vest of Swift Execution', classification: 'Unlimited', primary: ['Rogue', 'Hunter', 'Shaman', 'Warrior', 'Paladin', 'Druid'], secondary: [] },
  { name: 'Gloves of Ebru', classification: 'Unlimited', primary: ['Shaman', 'Druid', 'Paladin'], secondary: [] },
  { name: 'Ooze-ridden Gauntlets', classification: 'Unlimited', primary: ['Warrior', 'Paladin'], secondary: [] },
  { name: 'Bile-Covered Gauntlets', classification: 'Unlimited', primary: ['Rogue', 'Hunter', 'Shaman', 'Warrior', 'Paladin', 'Druid'], secondary: [] },
  { name: 'Mantle of Phrenic Power', classification: 'Unlimited', primary: ['Mage'], secondary: ['Warlock'] },
  { name: 'Mantle of the Desert Crusade', classification: 'Unlimited', primary: ['Paladin'], secondary: [] },
  { name: 'Mantle of the Desert\'s Fury', classification: 'Unlimited', primary: ['Shaman', 'Paladin'], secondary: [] },
  { name: 'Ukko\'s Ring of Darkness', classification: 'Unlimited', primary: ['Warlock'], secondary: [] },
  { name: 'Gauntlets of Steadfast Determination', classification: 'Unlimited', primary: ['Warrior', 'Paladin'], secondary: [] },
  { name: 'Leggings of the Festering Swarm', classification: 'Unlimited', primary: ['Mage'], secondary: ['Warlock'] },
  { name: 'Legplates of Blazing Light', classification: 'Unlimited', primary: ['Paladin'], secondary: [] },
  { name: 'Necklace of Purity', classification: 'Unlimited', primary: ['Caster', 'Healer'], secondary: [] },
  { name: 'Recomposed Boots', classification: 'Unlimited', primary: ['Caster', 'Healer'], secondary: [] },
  { name: 'Robes of the Battleguard', classification: 'Unlimited', primary: ['Caster'], secondary: [] },
  { name: 'Scaled Leggings of Qiraji Fury', classification: 'Unlimited', primary: ['Shaman', 'Paladin'], secondary: [] },
  { name: 'Silithid Claw', classification: 'Unlimited', primary: ['Hunter', 'Rogue', 'Physical'], secondary: [] },
  { name: 'Thick Qirajihide Belt', classification: 'Unlimited', primary: ['Frl', 'Warrior', 'Paladin', 'Shaman', 'Hunter', 'Rogue'], secondary: [] },
  { name: 'Cloak of Untold Secrets', classification: 'Unlimited', primary: ['Warlock'], secondary: [] },
  { name: 'Fetish of the Sand Reaver', classification: 'Unlimited', primary: ['Warlock', 'Warrior'], secondary: ['Physical', 'Caster'] },
  { name: 'Hive Tunneler\'s Boots', classification: 'Unlimited', primary: ['Frl', 'Shaman', 'Rogue', 'Warrior', 'Paladin', 'Hunter'], secondary: [] },
  { name: 'Mantle of Wicked Revenge', classification: 'Unlimited', primary: ['Physical'], secondary: [] },
  { name: 'Pauldrons of the Unrelenting', classification: 'Unlimited', primary: ['Warrior', 'Ret'], secondary: [] },
  { name: 'Scaled Sand Reaver Leggings', classification: 'Unlimited', primary: ['Shaman', 'Paladin'], secondary: [] },
  { name: 'Silithid Carapace Chestguard', classification: 'Unlimited', primary: ['Warrior', 'Paladin'], secondary: [] },
  { name: 'Gauntlets of Kalimdor', classification: 'Unlimited', primary: ['Shaman', 'Hunter', 'Warrior', 'Paladin'], secondary: [] },
  { name: 'Gauntlets of the Righteous Champion', classification: 'Unlimited', primary: ['Ret', 'PPal'], secondary: ['Warrior', 'Hpal'] },
  { name: 'Slime-coated Leggings', classification: 'Unlimited', primary: ['Hunter', 'Shaman', 'Paladin'], secondary: [] },
  { name: 'Cloak of the Golden Hive', classification: 'Unlimited', primary: ['Tank'], secondary: [] },
  { name: 'Gloves of the Messiah', classification: 'Unlimited', primary: ['HPri'], secondary: ['RD', 'Hpal'] },
  { name: 'Hive Defiler Wristguards', classification: 'Unlimited', primary: ['Warrior'], secondary: ['Ret'] },
  { name: 'Wasphide Gauntlets', classification: 'Unlimited', primary: ['RD'], secondary: ['Druid', 'Paladin'] },
  { name: 'Belt of the Fallen Emperor', classification: 'Unlimited', primary: ['Ret'], secondary: ['Paladin', 'Warrior'] },
  { name: 'Boots of Epiphany', classification: 'Unlimited', primary: ['Caster', 'Healer'], secondary: [] },
  { name: 'Gloves of the Hidden Temple', classification: 'Unlimited', primary: ['Frl', 'Shaman', 'Rogue', 'Warrior', 'Paladin', 'Hunter'], secondary: [] },
  { name: 'Grasp of the Fallen Emperor', classification: 'Unlimited', primary: ['Shaman', 'Hunter', 'Warrior', 'Paladin'], secondary: [] },
  { name: 'Kalimdor\'s Revenge', classification: 'Unlimited', primary: ['Physical', 'Tank'], secondary: [] },
  { name: 'Ring of Emperor Vek\'lor', classification: 'Unlimited', primary: ['Tank'], secondary: [] },
  { name: 'Royal Qiraji Belt', classification: 'Unlimited', primary: ['Warrior', 'Paladin'], secondary: [] },
  { name: 'Vek\'lor\'s Gloves of Devastation', classification: 'Unlimited', primary: ['Shaman', 'Hunter', 'Warrior', 'Paladin'], secondary: [] },
  { name: 'Burrower Bracers', classification: 'Unlimited', primary: ['Caster', 'Healer'], secondary: [] },
  { name: 'The Burrower\'s Shell', classification: 'Unlimited', primary: [], secondary: [] },

  // C'Thun - Reserved (was Loot Council)
  { name: 'Badge of the Swarmguard', classification: 'Reserved', primary: ['Physical'], secondary: [] },
  { name: 'Sartura\'s Might', classification: 'Reserved', primary: ['Healer'], secondary: [] },
  { name: 'Ring of the Martyr', classification: 'Reserved', primary: ['Healer'], secondary: [] },
  { name: 'Royal Scepter of Vek\'lor', classification: 'Reserved', primary: ['Mage', 'Warlock'], secondary: ['Caster'] },
  { name: 'Belt of Never-ending Agony', classification: 'Reserved', primary: ['Rogue', 'Frl'], secondary: ['Physical', 'Tank'] },
  { name: 'Cloak of Clarity', classification: 'Reserved', primary: ['Healer'], secondary: [] },
  { name: 'Cloak of the Devoured', classification: 'Reserved', primary: ['Mage', 'Warlock'], secondary: ['Caster'] },
  { name: 'Dark Edge of Insanity', classification: 'Reserved', primary: ['Ret'], secondary: ['Physical', 'Tank'] },
  { name: 'Dark Storm Gauntlets', classification: 'Reserved', primary: ['Mage', 'Warlock'], secondary: ['Caster'] },
  { name: 'Death\'s Sting', classification: 'Reserved', primary: ['Rogue'], secondary: ['Physical', 'Tank'] },
  { name: 'Eye of C\'Thun', classification: 'Reserved', primary: [], secondary: [] },
  { name: 'Eyestalk Waist Cord', classification: 'Reserved', primary: ['Mage', 'Warlock'], secondary: ['Caster', 'Healer'] },
  { name: 'Gauntlets of Annihilation', classification: 'Reserved', primary: ['Warrior'], secondary: ['Ret'] },
  { name: 'Grasp of the Old God', classification: 'Reserved', primary: ['Healer'], secondary: [] },
  { name: 'Mark of C\'Thun', classification: 'Unlimited', primary: ['Tank'], secondary: [] },
  { name: 'Ring of the Godslayer', classification: 'Reserved', primary: ['Physical', 'Tank'], secondary: [] },
  { name: 'Scepter of the False Prophet', classification: 'Reserved', primary: ['Healer'], secondary: [] },
  { name: 'Vanquished Tentacle of C\'Thun', classification: 'Limited', primary: [], secondary: [] },
]

async function main() {
  console.log('🔄 Starting comprehensive item classification update...')

  // Load all class specs
  const { data: classSpecs, error: specsError } = await supabase
    .from('class_specs')
    .select('id, name, class_id, wow_classes(name)')

  if (specsError || !classSpecs) {
    console.error('Error loading class specs:', specsError)
    return
  }

  console.log(`✅ Loaded ${classSpecs.length} class specs`)

  // Create a map of spec names to IDs
  const specNameToId: Record<string, { id: string, class_id: string }> = {}

  for (const spec of classSpecs) {
    const specRow = spec as { id: string; name: string; class_id: string; wow_classes?: { name: string } | null }
    const className = specRow.wow_classes?.name
    const specName = specRow.name

    // Store combined name as "ClassName SpecName"
    if (className && specName) {
      const combinedName = `${className} ${specName}`
      specNameToId[combinedName] = { id: specRow.id, class_id: specRow.class_id }
    }
  }

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
      console.log(`❌ Item not found: ${item.name}`)
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
        } else if (roleGroupSpecs[shorthand]) {
          // Handle role groups (Physical, Caster, Healer)
          for (const roleSpec of roleGroupSpecs[shorthand]) {
            const roleSpecInfo = specNameToId[roleSpec]
            if (roleSpecInfo) {
              await supabase
                .from('loot_item_classes')
                .insert({
                  loot_item_id: lootItem.id,
                  class_id: roleSpecInfo.class_id,
                  spec_id: roleSpecInfo.id,
                  spec_type: 'primary'
                })
            }
          }
        } else {
          console.log(`⚠️  Spec not found: ${shorthand} (${fullSpecName}) for ${item.name}`)
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
        } else if (roleGroupSpecs[shorthand]) {
          // Handle role groups
          for (const roleSpec of roleGroupSpecs[shorthand]) {
            const roleSpecInfo = specNameToId[roleSpec]
            if (roleSpecInfo) {
              await supabase
                .from('loot_item_classes')
                .insert({
                  loot_item_id: lootItem.id,
                  class_id: roleSpecInfo.class_id,
                  spec_id: roleSpecInfo.id,
                  spec_type: 'secondary'
                })
            }
          }
        } else {
          console.log(`⚠️  Spec not found: ${shorthand} (${fullSpecName}) for ${item.name}`)
        }
      }
    }

    console.log(`✅ Updated: ${item.name} (${item.classification}) - ${lootItems.length} item(s)`)
    updated++
  }

  console.log(`\n📊 Summary:`)
  console.log(`   Updated: ${updated}`)
  console.log(`   Not found: ${notFound}`)

  if (notFoundItems.length > 0) {
    console.log(`\n❌ Items not found in database:`)
    notFoundItems.forEach(name => console.log(`   - ${name}`))
  }

  console.log('\n✅ Done!')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
