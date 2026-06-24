import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

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
  'ProtW': 'Warrior Protection',
  'Fury': 'Warrior Arms/Fury',
  'HPri': 'Priest Holy/Disc',
  'SP': 'Priest Shadow',
  'Mage': 'Mage Mage',
  'Hunter': 'Hunter Hunter',
  'Warlock': 'Warlock Warlock',
  'Rogue': 'Rogue Rogue',
  'RS': 'Shaman Restoration',
  'Ele': 'Shaman Elemental',
  'Enh': 'Shaman Enhancement',
}

// Expand generic terms to specific specs
const expandSpecs = (specs: string[]): string[] => {
  const result: string[] = []
  for (const spec of specs) {
    if (spec === 'Physical') {
      result.push('Rogue', 'Fury', 'Hunter', 'Frl', 'Ret', 'Enh')
    } else if (spec === 'Caster') {
      result.push('Mage', 'Warlock', 'SP', 'Ele', 'Bal')
    } else if (spec === 'Healer') {
      result.push('HPri', 'RD', 'HPal', 'RS')
    } else if (spec === 'Tank') {
      result.push('ProtW', 'PPal', 'Frl')
    } else if (spec === 'All') {
      result.push('Rogue', 'Fury', 'Hunter', 'Frl', 'Ret', 'Enh', 'Mage', 'Warlock', 'SP', 'Ele', 'Bal', 'HPri', 'RD', 'HPal', 'RS', 'ProtW', 'PPal')
    } else if (spec === 'Druid') {
      result.push('RD', 'Frl', 'Bal')
    } else if (spec === 'Shaman') {
      result.push('RS', 'Ele', 'Enh')
    } else if (spec === 'Paladin') {
      result.push('HPal', 'Ret', 'PPal')
    } else if (spec === 'Warrior') {
      result.push('Fury', 'ProtW')
    } else if (spec === 'Priest') {
      result.push('HPri', 'SP')
    } else {
      result.push(spec)
    }
  }
  return [...new Set(result)]
}

// TBC Year 2 Item data: Black Temple, Sunwell Plateau, Zul'Aman, Hyjal Summit
const itemData = [
  // ============================================================================
  // BLACK TEMPLE - LIMITED
  // ============================================================================
  { name: 'Cloak of the Illidari Council', classification: 'Limited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: "Shadowmoon Destroyer's Drape", classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: "Shadowmaster's Boots", classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Slippers of the Seacaller', classification: 'Limited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: "Nadina's Pendant of Purity", classification: 'Limited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Pendant of Titans', classification: 'Limited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Translucent Spellthread Necklace', classification: 'Limited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: 'Shadowmoon Insignia', classification: 'Limited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Tome of Diabolic Remedy', classification: 'Limited', primary: expandSpecs(['Healer']), secondary: [] },

  // BLACK TEMPLE - RESERVED
  { name: 'Shroud of the Highborne', classification: 'Reserved', primary: [...expandSpecs(['Healer']), ...expandSpecs(['Caster'])], secondary: ['Bal'] },
  { name: 'Choker of Endless Nightmares', classification: 'Reserved', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Ring of Ancient Knowledge', classification: 'Reserved', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: ['PPal', 'RS'] },
  { name: 'Stormrage Signet Ring', classification: 'Reserved', primary: expandSpecs(['Physical']), secondary: ['ProtW'] },
  { name: 'The Skull of Gul\'dan', classification: 'Reserved', primary: expandSpecs(['Caster']), secondary: ['Mage'] },
  { name: 'Shard of Azzinoth', classification: 'Reserved', primary: expandSpecs(['Physical']), secondary: ['Ele'] },
  { name: 'Syphon of the Nathrezim', classification: 'Reserved', primary: expandSpecs(['Physical']), secondary: ['HPri', 'SP'] },
  { name: 'Torch of the Damned', classification: 'Reserved', primary: expandSpecs(['Physical']), secondary: ['Warlock'] },
  { name: 'Warglaive of Azzinoth', classification: 'Reserved', primary: ['Fury', 'Rogue'], secondary: [] },
  { name: 'Zhar\'doom, Greatstaff of the Devourer', classification: 'Reserved', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Cursed Vision of Sargeras', classification: 'Reserved', primary: expandSpecs(['Physical']), secondary: [] },

  // BLACK TEMPLE - UNLIMITED
  { name: 'Cloak of Ancient Rituals', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Cloak of Fiends', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: "Crimson Paragon's Cover", classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Nethervoid Cloak', classification: 'Unlimited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: "Pepe's Shroud of Pacification", classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: "Shadowcaster's Drape", classification: 'Unlimited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: 'Shroud of Forgiveness', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Shroud of Redeemed Souls', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Shroud of the Final Stand', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Tattered Cape of Antonidas', classification: 'Unlimited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: 'Fel Conqueror Raiments', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Garments of Temperance', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Glory of the Defender', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Golden Links of Restoration', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Harness of Carnal Instinct', classification: 'Unlimited', primary: [...expandSpecs(['Physical']), ...expandSpecs(['Tank'])], secondary: [] },
  { name: 'Heartshatter Breastplate', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Nether Shadow Tunic', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Robe of Departed Spirits', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Robe of the Shadow Council', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Robes of Heavenly Purpose', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Dreadboots of the Legion', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Myrmidon\'s Treads', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Naturewarden\'s Treads', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Pearl Inlaid Boots', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Softstep Boots of Tracking', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Tide-Stomper\'s Greaves', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Borderland Fortress Grips', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Borderland Paingrips', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Gauntlets of Enforcement', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Gauntlets of the Soothed Soul', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Gloves of Unfailing Faith', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Grips of Damnation', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Grips of Silent Justice', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Handguards of Defiled Worlds', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Pillager\'s Gauntlets', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Cowl of Benevolence', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Cowl of the Illidari High Lord', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Dark Conjuror\'s Collar', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Faceplate of the Impenetrable', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Helm of the Illidari Shatterer', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Avalanche Leggings', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Leggings of Calamity', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Leggings of Devastation', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Leggings of Divine Retribution', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Leggings of Eternity', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Legguards of Endless Rage', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Praetorian\'s Legguards', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Shady Dealer\'s Pantaloons', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Starstalker Legguards', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Bulwark of Azzinoth', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Chronicle of Dark Secrets', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Felstone Bulwark', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Illidari Runeshield', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Touch of Inspiration', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Beast-Tamer\'s Shoulders', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Blood-Cursed Shoulderpads', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Blood-Stained Pauldrons', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Glimmering Steel Mantle', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Hatefury Mantle', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Mantle of Darkness', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Mantle of Ill Intent', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Pauldrons of Abyssal Fury', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Pauldrons of Stone Resolve', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Razorfury Mantle', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Shoulders of the Hidden Predator', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Spaulders of the Advocate', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'The Wavemender\'s Mantle', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Belt of Divine Guidance', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Belt of Primal Majesty', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Belt of Seething Fury', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Bladeangel\'s Money Belt', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Boneweave Girdle', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Flashfire Girdle', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Girdle of Hope', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Girdle of Mighty Resolve', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Girdle of Stability', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Girdle of the Lightbearer', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Shadow-Walker\'s Cord', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Valestalker Girdle', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Band of the Abyssal Lord', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Bands of the Coming Storm', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Blessed Adamantite Bracers', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Bracers of Martyrdom', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Bracers of the Pathfinder', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Cuffs of Devastation', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Eternium Shell Bracers', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Focused Mana Bindings', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Furious Shackles', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Insidious Bands', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'The Seeker\'s Wristguards', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },

  // ============================================================================
  // HYJAL SUMMIT - LIMITED
  // ============================================================================
  { name: 'Midnight Chestguard', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Bow-Stitched Leggings', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Leggings of Channeled Elements', classification: 'Limited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Kaz\'rogal\'s Hardened Heart', classification: 'Limited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Scepter of Purification', classification: 'Limited', primary: expandSpecs(['Healer']), secondary: [] },

  // HYJAL SUMMIT - RESERVED
  { name: 'Blade of Infamy', classification: 'Reserved', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'The Maelstrom\'s Fury', classification: 'Limited', primary: expandSpecs(['Caster']), secondary: [] },

  // ============================================================================
  // ZUL'AMAN - LIMITED
  // ============================================================================
  { name: 'Brooch of Nature\'s Mercy', classification: 'Limited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Choker of Serrated Blades', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Loop of Cursed Bones', classification: 'Limited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: 'The Savage\'s Choker', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Ancient Amani Longbow', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: ['Frl'] },
  { name: 'Tuskbreaker', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Staff of Primal Fury', classification: 'Limited', primary: ['Frl'], secondary: [] },
  { name: 'Akil\'zon\'s Talonblade', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: ['HPal'] },
  { name: 'Amani Divining Staff', classification: 'Limited', primary: expandSpecs(['Caster']), secondary: ['Ret'] },
  { name: 'Amani Punisher', classification: 'Limited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: ['Enh'] },
  { name: 'Dagger of Bad Mojo', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Trollbane', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Wub\'s Cursed Hexblade', classification: 'Limited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Hex Shrunken Head', classification: 'Limited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },

  // ZUL'AMAN - RESERVED
  { name: 'Cleaver of the Unforgiving', classification: 'Reserved', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Amani War Bear', classification: 'Reserved', primary: expandSpecs(['All']), secondary: [] },
  { name: 'Bristleblitz Striker', classification: 'Reserved', primary: expandSpecs(['Physical']), secondary: [] },

  // ZUL'AMAN - UNLIMITED
  { name: 'Battleworn Tuskguard', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Coif of the Jungle Stalker', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Forest Prowler\'s Helm', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Grimgrin Faceguard', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Helm of Natural Regeneration', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Hood of Hexing', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Mojo-Mender\'s Mask', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Bulwark of the Amani Empire', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Enamelled Disc of Mojo', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Hex Lord\'s Voodoo Pauldrons', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Pauldrons of Primal Fury', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Shadowhunter\'s Treads', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Jungle Stompers', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Two-Toed Sandals', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Cord of Braided Troll Hair', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Tiny Voodoo Mask', classification: 'Unlimited', primary: expandSpecs(['All']), secondary: [] },

  // ============================================================================
  // SUNWELL PLATEAU - LIMITED
  // ============================================================================
  { name: 'Cloak of Unforgivable Sin', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Amulet of Unfettered Magics', classification: 'Limited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: ['RD'] },
  { name: 'Brooch of the Highborne', classification: 'Limited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Clutch of Demise', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Collar of the Pit Lord', classification: 'Limited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Hellfire-Encased Pendant', classification: 'Limited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: 'Book of Highborne Hymns', classification: 'Limited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Heart of the Pit', classification: 'Limited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Sword Breaker\'s Bulwark', classification: 'Limited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Black Bow of the Betrayer', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Blade of Life\'s Inevitability', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Golden Bow of Quel\'Thalas', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Legionkiller', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Naaru-Blessed Life Rod', classification: 'Limited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Rifle of the Stoic Guardian', classification: 'Limited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Twisted Blades of Zarak', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Wand of Cleansing Light', classification: 'Limited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Wand of Prismatic Focus', classification: 'Limited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Wand of the Demonsoul', classification: 'Limited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Band of Devastation', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Band of Lucent Beams', classification: 'Limited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Band of Ruinous Delight', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Blessed Band of Karabor', classification: 'Limited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Mana Attuned Band', classification: 'Limited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: 'Ring of Calming Waves', classification: 'Limited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Ring of Captured Storms', classification: 'Limited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: 'Ring of Deceitful Intent', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Ring of Hardened Resolve', classification: 'Limited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Ring of Harmonic Beauty', classification: 'Limited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Signet of Ancient Magics', classification: 'Limited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: 'Signet of Eternal Life', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
  { name: 'Signet of Primal Wrath', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Signet of the Last Defender', classification: 'Limited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Signet of the Quiet Forest', classification: 'Limited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Unstoppable Aggressor\'s Ring', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Anetherton\'s Noose', classification: 'Limited', primary: expandSpecs(['Caster']), secondary: ['Rogue'] },
  { name: 'Don Alejandro\'s Money Belt', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Waistwrap of Infinity', classification: 'Limited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Apostle of Argus', classification: 'Limited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Blade of Twisted Visions', classification: 'Limited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: 'Cataclysm\'s Edge', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Claw of Molten Fury', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Crux of the Apocalypse', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Dark Blessing', classification: 'Limited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Fang of Kalecgos', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Fist of Molten Fury', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Fury', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Grand Magister\'s Staff of Torrents', classification: 'Limited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Grip of Mannoroth', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Halberd of Desolation', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Hammer of Atonement', classification: 'Limited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Hammer of Judgement', classification: 'Limited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: 'Heartless', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Jin\'rohk, The Great Apocalypse', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Messenger of Fate', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Mounting Vengeance', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Pillar of Ferocity', classification: 'Limited', primary: expandSpecs(['Druid']), secondary: [] },
  { name: 'Prowler\'s Strikeblade', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Rage', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Reign of Misery', classification: 'Limited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: 'Rising Tide', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Shiv of Exsanguination', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Soul Cleaver', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Staff of Dark Mending', classification: 'Limited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Staff of Immaculate Recovery', classification: 'Limited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Swiftsteel Bludgeon', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Tempest of Chaos', classification: 'Limited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: 'The Brutalizer', classification: 'Limited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'The Unbreakable Will', classification: 'Limited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Tracker\'s Blade', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Umbral Shiv', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Deadly Cuffs', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },

  // SUNWELL - RESERVED
  { name: 'Leggings of the Immortal Night', classification: 'Reserved', primary: [...expandSpecs(['Physical']), ...expandSpecs(['Tank'])], secondary: [] },
  { name: 'Berserker\'s Call', classification: 'Reserved', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Blackened Naaru Sliver', classification: 'Reserved', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Glimmering Naaru Sliver', classification: 'Reserved', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Madness of the Betrayer', classification: 'Reserved', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Memento of Tyrande', classification: 'Reserved', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Shifting Naaru Sliver', classification: 'Reserved', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: 'Steely Naaru Sliver', classification: 'Reserved', primary: [...expandSpecs(['Tank']), ...expandSpecs(['Physical'])], secondary: [] },
  { name: 'Apolyon, the Soul-Render', classification: 'Reserved', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Archon\'s Gavel', classification: 'Reserved', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Blade of Savagery', classification: 'Reserved', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Boundless Agony', classification: 'Reserved', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Crystal Spire of Karabor', classification: 'Reserved', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Dragonscale-Encrusted Longblade', classification: 'Reserved', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Golden Staff of the Sin\'dorei', classification: 'Reserved', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Hammer of Sanctification', classification: 'Reserved', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Hand of the Deceiver', classification: 'Reserved', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Muramasa', classification: 'Reserved', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Shivering Felspine', classification: 'Reserved', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Stanchion of Primal Instinct', classification: 'Reserved', primary: expandSpecs(['Druid']), secondary: [] },
  { name: 'Sunflare', classification: 'Reserved', primary: expandSpecs(['Caster']), secondary: ['Fury'] },
  { name: 'Thori\'dal, the Stars\' Fury', classification: 'Reserved', primary: ['Hunter'], secondary: [] },

  // SUNWELL - UNLIMITED
  { name: 'Arrow-Fall Chestguard', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Bloodstained Elven Battlevest', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Chestguard of Hidden Purpose', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Chestguard of Relentless Storms', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Chestguard of the Warlord', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Don Rodrigo\'s Poncho', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Garments of Serene Shores', classification: 'Unlimited', primary: [...expandSpecs(['Healer']), ...expandSpecs(['Caster'])], secondary: [] },
  { name: 'Hauberk of the Empire\'s Champion', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Mail of Fevered Pursuit', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Robes of Faltered Light', classification: 'Unlimited', primary: [...expandSpecs(['Healer']), ...expandSpecs(['Caster'])], secondary: [] },
  { name: 'Robes of Rhonin', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Savior\'s Grasp', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Shadowtooth Trollskin Cuirass', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Shimmer-Pelt Vest', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Sunglow Vest', classification: 'Unlimited', primary: [...expandSpecs(['Healer']), ...expandSpecs(['Caster'])], secondary: [] },
  { name: 'Vest of Mounting Assault', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Vicious Hawkstrider Hauberk', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Archbishop\'s Slippers', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Black Featherlight Boots', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Blue Suede Shoes', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Boots of Oceanic Fury', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Boots of the Divine Light', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Enchanted Leather Sandals', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Footpads of Madness', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Quickstrider Moccasins', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Skullshatter Warboots', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Stillwater Boots', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Treads of the Den Mother', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Botanist\'s Gloves of Growth', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Fists of Mukoa', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Gauntlets of the Ancient Shadowmoon', classification: 'Unlimited', primary: [...expandSpecs(['Caster']), ...expandSpecs(['Healer'])], secondary: [] },
  { name: 'Handguards of the Dawn', classification: 'Unlimited', primary: [...expandSpecs(['Healer']), ...expandSpecs(['Caster'])], secondary: [] },
  { name: 'Shadowed Gauntlets of Paroxysm', classification: 'Unlimited', primary: [...expandSpecs(['Physical']), ...expandSpecs(['Tank'])], secondary: [] },
  { name: 'Spiritwalker Gauntlets', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Thalassian Ranger Gauntlets', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Tranquil Majesty Wraps', classification: 'Unlimited', primary: [...expandSpecs(['Healer']), ...expandSpecs(['Caster'])], secondary: [] },
  { name: 'Coif of Alleria', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Cover of Ursol the Wise', classification: 'Unlimited', primary: [...expandSpecs(['Healer']), ...expandSpecs(['Caster'])], secondary: [] },
  { name: 'Cowl of Gul\'dan', classification: 'Unlimited', primary: [...expandSpecs(['Healer']), ...expandSpecs(['Caster'])], secondary: [] },
  { name: 'Cowl of Light\'s Purity', classification: 'Unlimited', primary: [...expandSpecs(['Healer']), ...expandSpecs(['Caster'])], secondary: [] },
  { name: 'Crown of Anasterian', classification: 'Unlimited', primary: [...expandSpecs(['Physical']), ...expandSpecs(['Tank'])], secondary: [] },
  { name: 'Crown of Empowered Fate', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Duplicitous Guise', classification: 'Unlimited', primary: [...expandSpecs(['Physical']), ...expandSpecs(['Tank'])], secondary: [] },
  { name: 'Guise of the Tidal Lurker', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Helm of Burning Righteousness', classification: 'Unlimited', primary: [...expandSpecs(['Healer']), 'PPal'], secondary: [] },
  { name: 'Helm of Soothing Currents', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Hood of the Third Eye', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Mask of Introspection', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Breeches of Natural Aggression', classification: 'Unlimited', primary: [...expandSpecs(['Caster']), ...expandSpecs(['Healer'])], secondary: [] },
  { name: 'Chain Links of the Tumultuous Storm', classification: 'Unlimited', primary: [...expandSpecs(['Caster']), ...expandSpecs(['Healer'])], secondary: [] },
  { name: 'Elunite Imbued Leggings', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Felfury Legplates', classification: 'Unlimited', primary: [...expandSpecs(['Physical']), ...expandSpecs(['Tank'])], secondary: [] },
  { name: 'Kilt of Immortal Nature', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Legplates of the Holy Juggernaut', classification: 'Unlimited', primary: [...expandSpecs(['Healer']), 'PPal'], secondary: [] },
  { name: 'Pantaloons of Calming Strife', classification: 'Unlimited', primary: [...expandSpecs(['Healer']), ...expandSpecs(['Caster'])], secondary: [] },
  { name: 'Sun-Touched Chain Leggings', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Sin\'dorei Pendant of Conquest', classification: 'Unlimited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: 'Sin\'dorei Pendant of Salvation', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Sin\'dorei Pendant of Triumph', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Aegis of Angelic Fortune', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Antonidas\' Aegis of Rapt Concentration', classification: 'Unlimited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: 'Bastion of Light', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Blind-Seers Icon', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Idol of the White Stag', classification: 'Unlimited', primary: expandSpecs(['Druid']), secondary: [] },
  { name: 'Tome of the Lightbringer', classification: 'Unlimited', primary: expandSpecs(['Paladin']), secondary: [] },
  { name: 'Totem of Ancestral Guidance', classification: 'Unlimited', primary: expandSpecs(['Shaman']), secondary: [] },
  { name: 'Ring of Omnipotence', classification: 'Unlimited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: 'Sin\'dorei Band of Dominance', classification: 'Unlimited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: 'Sin\'dorei Band of Salvation', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Sin\'dorei Band of Triumph', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Amice of Brilliant Light', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Amice of the Convoker', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Equilibrium Epaulets', classification: 'Unlimited', primary: [...expandSpecs(['Healer']), ...expandSpecs(['Caster'])], secondary: [] },
  { name: 'Mantle of the Golden Forest', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Pauldrons of Perseverance', classification: 'Unlimited', primary: [...expandSpecs(['Physical']), ...expandSpecs(['Tank'])], secondary: [] },
  { name: 'Shawl of Wonderment', classification: 'Unlimited', primary: [...expandSpecs(['Healer']), ...expandSpecs(['Caster'])], secondary: [] },
  { name: 'Shoulderpads of Dancing Blades', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Shoulderpads of Vehemence', classification: 'Unlimited', primary: [...expandSpecs(['Physical']), ...expandSpecs(['Tank'])], secondary: [] },
  { name: 'Spaulders of Reclamation', classification: 'Unlimited', primary: [...expandSpecs(['Healer']), ...expandSpecs(['Caster'])], secondary: [] },
  { name: 'Spaulders of the Thalassian Savior', classification: 'Unlimited', primary: expandSpecs(['Paladin']), secondary: [] },
  { name: 'Veil of Turning Leaves', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Ancient Aqir Artifact', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Angelista\'s Sash', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Belt of the Crescent Moon', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Girdle of Lordaeron\'s Fallen', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Life-Step Belt', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Naturalist\'s Preserving Cinch', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Elunite Empowered Bracers', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Fury of the Ursine', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Howling Wind Bracers', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Rejuvenating Bracers', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Wraps of Precise Flight', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Wristbands of Divine Influence', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },

  // ============================================================================
  // TIER 6 TOKENS (LIMITED)
  // ============================================================================
  { name: 'Chestguard of the Forgotten Conqueror', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
  { name: 'Chestguard of the Forgotten Protector', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
  { name: 'Chestguard of the Forgotten Vanquisher', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
  { name: 'Gloves of the Forgotten Conqueror', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
  { name: 'Gloves of the Forgotten Protector', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
  { name: 'Gloves of the Forgotten Vanquisher', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
  { name: 'Helm of the Forgotten Conqueror', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
  { name: 'Helm of the Forgotten Protector', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
  { name: 'Helm of the Forgotten Vanquisher', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
  { name: 'Leggings of the Forgotten Conqueror', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
  { name: 'Leggings of the Forgotten Protector', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
  { name: 'Leggings of the Forgotten Vanquisher', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
  { name: 'Shoulders of the Forgotten Conqueror', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
  { name: 'Shoulders of the Forgotten Protector', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
  { name: 'Shoulders of the Forgotten Vanquisher', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
  { name: 'Belt of the Forgotten Conqueror', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
  { name: 'Belt of the Forgotten Protector', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
  { name: 'Belt of the Forgotten Vanquisher', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
  { name: 'Boots of the Forgotten Conqueror', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
  { name: 'Boots of the Forgotten Protector', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
  { name: 'Boots of the Forgotten Vanquisher', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
  { name: 'Bracers of the Forgotten Conqueror', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
  { name: 'Bracers of the Forgotten Protector', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
  { name: 'Bracers of the Forgotten Vanquisher', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
]

async function main() {
  console.log('Starting TBC Year 2 item classification update...')
  console.log(`Processing ${itemData.length} items from Black Temple, Hyjal Summit, Zul'Aman, and Sunwell Plateau...\n`)

  const { data: classSpecs, error: specsError } = await supabase
    .from('class_specs')
    .select('id, name, class_id, wow_classes(name)')

  if (specsError || !classSpecs) {
    console.error('Error loading class specs:', specsError)
    return
  }

  console.log(`Loaded ${classSpecs.length} class specs`)

  const specNameToId: Record<string, { id: string, class_id: string }> = {}

  for (const spec of classSpecs) {
    const className = (spec as { wow_classes?: { name?: string } | null }).wow_classes?.name
    const specName = spec.name
    if (className && specName) {
      specNameToId[`${className} ${specName}`] = { id: spec.id, class_id: spec.class_id }
    }
  }

  let updated = 0
  let notFound = 0
  const notFoundItems: string[] = []

  for (const item of itemData) {
    const { data: lootItems, error: itemError } = await supabase
      .from('loot_items')
      .select('id, name')
      .eq('name', item.name)

    if (itemError || !lootItems || lootItems.length === 0) {
      notFound++
      notFoundItems.push(item.name)
      continue
    }

    for (const lootItem of lootItems) {
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

      await supabase
        .from('loot_item_classes')
        .delete()
        .eq('loot_item_id', lootItem.id)

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
