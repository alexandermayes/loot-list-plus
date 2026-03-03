/**
 * Expansion Visual Assets
 * Colors, gradients, and images for each WoW expansion
 */

export interface ExpansionVisuals {
  name: string
  shortName: string
  gradient: string
  bgColor: string
  accentColor: string
  textColor: string
  borderColor: string
  // Wowhead/Blizzard CDN expansion logos
  logoUrl: string
  // Background pattern or artwork
  artworkUrl: string
}

// Classic visuals (shared between 'Classic' and 'Classic WoW' for backwards compatibility)
const classicVisuals: ExpansionVisuals = {
  name: 'Classic',
  shortName: 'Classic',
  gradient: 'linear-gradient(135deg, #8B7355 0%, #4A3C2A 100%)',
  bgColor: '#2A2115',
  accentColor: '#C9A959',
  textColor: '#F5E6C8',
  borderColor: '#8B7355',
  logoUrl: 'https://wow.zamimg.com/images/wow/icons/large/achievement_boss_ragnaros.jpg',
  artworkUrl: 'https://bnetcmsus-a.akamaihd.net/cms/blog_header/ci/CI46ZPDKZTI01606318723539.png'
}

const expansionVisuals: Record<string, ExpansionVisuals> = {
  'Classic': classicVisuals,
  'Classic WoW': classicVisuals, // Backwards compatibility alias
  'The Burning Crusade': {
    name: 'The Burning Crusade',
    shortName: 'TBC',
    gradient: 'linear-gradient(135deg, #1B4D1B 0%, #0D2A0D 100%)',
    bgColor: '#0D1F0D',
    accentColor: '#69FF69',
    textColor: '#C8FFC8',
    borderColor: '#2D5A2D',
    logoUrl: 'https://wow.zamimg.com/images/wow/icons/large/achievement_boss_illidan.jpg',
    artworkUrl: 'https://bnetcmsus-a.akamaihd.net/cms/blog_header/ow/OWL2FWXJ8K611622584게299498.jpg'
  },
  'Wrath of the Lich King': {
    name: 'Wrath of the Lich King',
    shortName: 'WotLK',
    gradient: 'linear-gradient(135deg, #1E3A5F 0%, #0A1929 100%)',
    bgColor: '#0D1520',
    accentColor: '#70C8FF',
    textColor: '#C8E8FF',
    borderColor: '#2D5A8A',
    logoUrl: 'https://wow.zamimg.com/images/wow/icons/large/achievement_boss_lichking.jpg',
    artworkUrl: ''
  },
  'Cataclysm': {
    name: 'Cataclysm',
    shortName: 'Cata',
    gradient: 'linear-gradient(135deg, #8B2500 0%, #3D1000 100%)',
    bgColor: '#1F0D08',
    accentColor: '#FF6B35',
    textColor: '#FFD4C4',
    borderColor: '#8B3A1A',
    logoUrl: 'https://wow.zamimg.com/images/wow/icons/large/achievement_boss_cthun.jpg',
    artworkUrl: 'https://bnetcmsus-a.akamaihd.net/cms/blog_header/CLVLP6DKAJ421535148036498.jpg'
  },
  'Mists of Pandaria': {
    name: 'Mists of Pandaria',
    shortName: 'MoP',
    gradient: 'linear-gradient(135deg, #2D5A3D 0%, #1A3325 100%)',
    bgColor: '#121F17',
    accentColor: '#7FD99F',
    textColor: '#D4F0E0',
    borderColor: '#3D7A5A',
    logoUrl: 'https://wow.zamimg.com/images/wow/icons/large/inv_helmet_leather_panda_b_02.jpg',
    artworkUrl: 'https://bnetcmsus-a.akamaihd.net/cms/blog_header/IOCQV46WYXS01536272302862.jpg'
  },
  'Warlords of Draenor': {
    name: 'Warlords of Draenor',
    shortName: 'WoD',
    gradient: 'linear-gradient(135deg, #5A3D2D 0%, #2A1D15 100%)',
    bgColor: '#1A1310',
    accentColor: '#D4A574',
    textColor: '#F0E0D4',
    borderColor: '#6A4D3D',
    logoUrl: 'https://wow.zamimg.com/images/wow/icons/large/achievement_character_orc_male_brn.jpg',
    artworkUrl: 'https://bnetcmsus-a.akamaihd.net/cms/blog_header/LXCSYB0U50NQ1536272339892.jpg'
  },
  'Legion': {
    name: 'Legion',
    shortName: 'Legion',
    gradient: 'linear-gradient(135deg, #2D4D2D 0%, #0D1F0D 100%)',
    bgColor: '#0D150D',
    accentColor: '#7FFF7F',
    textColor: '#D4FFD4',
    borderColor: '#3D6A3D',
    logoUrl: 'https://wow.zamimg.com/images/wow/icons/large/achievement_legionpvp2tier3.jpg',
    artworkUrl: 'https://bnetcmsus-a.akamaihd.net/cms/blog_header/MGPGNCIRNM1E1536268781189.jpg'
  },
  'Battle for Azeroth': {
    name: 'Battle for Azeroth',
    shortName: 'BfA',
    gradient: 'linear-gradient(135deg, #2D3D5A 0%, #151D2A 100%)',
    bgColor: '#10151D',
    accentColor: '#7FA5D9',
    textColor: '#D4E0F0',
    borderColor: '#3D5A7A',
    logoUrl: 'https://wow.zamimg.com/images/wow/icons/large/achievement_dungeon_siegeofboralus.jpg',
    artworkUrl: 'https://bnetcmsus-a.akamaihd.net/cms/blog_header/l1/L1PABK24VY9B1532040240624.jpg'
  },
  'Shadowlands': {
    name: 'Shadowlands',
    shortName: 'SL',
    gradient: 'linear-gradient(135deg, #3D2D5A 0%, #1D152A 100%)',
    bgColor: '#15101D',
    accentColor: '#A57FD9',
    textColor: '#E0D4F0',
    borderColor: '#5A3D7A',
    logoUrl: 'https://wow.zamimg.com/images/wow/icons/large/achievement_dungeon_youreternia.jpg',
    artworkUrl: 'https://bnetcmsus-a.akamaihd.net/cms/blog_header/9r/9RNWWD8WWE1N1603913163821.png'
  },
  'Dragonflight': {
    name: 'Dragonflight',
    shortName: 'DF',
    gradient: 'linear-gradient(135deg, #3D4A2D 0%, #1D2515 100%)',
    bgColor: '#151A10',
    accentColor: '#A5D97F',
    textColor: '#E0F0D4',
    borderColor: '#5A6A3D',
    logoUrl: 'https://wow.zamimg.com/images/wow/icons/large/ability_evoker_dragonrage.jpg',
    artworkUrl: 'https://bnetcmsus-a.akamaihd.net/cms/blog_header/uo/UOAC2IDLW7LY1650317774815.jpg'
  },
  'The War Within': {
    name: 'The War Within',
    shortName: 'TWW',
    gradient: 'linear-gradient(135deg, #2D2D4A 0%, #15152A 100%)',
    bgColor: '#10101D',
    accentColor: '#8F8FD9',
    textColor: '#D4D4F0',
    borderColor: '#4A4A7A',
    logoUrl: 'https://wow.zamimg.com/images/wow/icons/large/achievement_raid_dvl.jpg',
    artworkUrl: 'https://bnetcmsus-a.akamaihd.net/cms/blog_header/5u/5UPGYSPSWXOD1699551183432.png'
  }
}

/**
 * Get visual assets for an expansion
 */
export function getExpansionVisuals(expansionName: string): ExpansionVisuals {
  // Try exact match first
  if (expansionVisuals[expansionName]) {
    return expansionVisuals[expansionName]
  }

  // Try partial match
  const matchingKey = Object.keys(expansionVisuals).find(key =>
    expansionName.toLowerCase().includes(key.toLowerCase()) ||
    key.toLowerCase().includes(expansionName.toLowerCase())
  )

  if (matchingKey) {
    return expansionVisuals[matchingKey]
  }

  // Return default visuals
  return {
    name: expansionName,
    shortName: expansionName.split(' ').map(w => w[0]).join(''),
    gradient: 'linear-gradient(135deg, #3D3D3D 0%, #1D1D1D 100%)',
    bgColor: '#1A1A1A',
    accentColor: '#888888',
    textColor: '#E0E0E0',
    borderColor: '#4A4A4A',
    logoUrl: 'https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg',
    artworkUrl: ''
  }
}

/**
 * Get all available expansion visuals
 */
export function getAllExpansionVisuals(): Record<string, ExpansionVisuals> {
  return expansionVisuals
}
