export interface RealmInfo {
  name: string
  version: string
}

export const WOW_REALMS: Record<string, RealmInfo[]> = {
  'Americas & Oceania': [
    // Mists of Pandaria (Cataclysm Classic progression)
    { name: 'Arugal', version: 'Mists of Pandaria' },
    { name: 'Bloodsail Buccaneers', version: 'Mists of Pandaria' },
    { name: 'Galakras', version: 'Mists of Pandaria' },
    { name: 'Grobbulus', version: 'Mists of Pandaria' },
    { name: 'Immerseus', version: 'Mists of Pandaria' },
    { name: 'Lei Shen', version: 'Mists of Pandaria' },
    { name: 'Nazgrim', version: 'Mists of Pandaria' },
    { name: 'Pagle', version: 'Mists of Pandaria' },
    { name: 'Ra-den', version: 'Mists of Pandaria' },
    // Anniversary (Classic Fresh Start)
    { name: 'Crusader Strike', version: 'Anniversary' },
    { name: 'Doomhowl', version: 'Anniversary' },
    { name: 'Dreamscythe', version: 'Anniversary' },
    { name: 'Living Flame', version: 'Anniversary' },
    { name: 'Lone Wolf', version: 'Anniversary' },
    { name: 'Maladath', version: 'Anniversary' },
    { name: 'Nightslayer', version: 'Anniversary' },
    { name: 'Penance', version: 'Anniversary' },
    { name: 'Shadowstrike', version: 'Anniversary' },
    { name: 'Wild Growth', version: 'Anniversary' },
    // Classic Era
    { name: 'Anathema', version: 'Classic Era' },
    { name: 'Arcanite Reaper', version: 'Classic Era' },
    { name: 'Ashkandi', version: 'Classic Era' },
    { name: 'Atiesh', version: 'Classic Era' },
    { name: 'Azuresong', version: 'Classic Era' },
    { name: 'Benediction', version: 'Classic Era' },
    { name: 'Bigglesworth', version: 'Classic Era' },
    { name: 'Blaumeux', version: 'Classic Era' },
    { name: 'Defias Pillager', version: 'Classic Era' },
    { name: 'Deviate Delight', version: 'Classic Era' },
    { name: 'Earthfury', version: 'Classic Era' },
    { name: 'Faerlina', version: 'Classic Era' },
    { name: 'Fairbanks', version: 'Classic Era' },
    { name: 'Felstriker', version: 'Classic Era' },
    { name: 'Heartseeker', version: 'Classic Era' },
    { name: 'Herod', version: 'Classic Era' },
    { name: 'Incendius', version: 'Classic Era' },
    { name: 'Kirtonos', version: 'Classic Era' },
    { name: 'Kromcrush', version: 'Classic Era' },
    { name: 'Kurinnaxx', version: 'Classic Era' },
    { name: 'Loatheb', version: 'Classic Era' },
    { name: 'Mankrik', version: 'Classic Era' },
    { name: 'Myzrael', version: 'Classic Era' },
    { name: 'Netherwind', version: 'Classic Era' },
    { name: 'Old Blanchy', version: 'Classic Era' },
    { name: 'Rattlegore', version: 'Classic Era' },
    { name: 'Remulos', version: 'Classic Era' },
    { name: 'Skeram', version: 'Classic Era' },
    { name: 'Skull Rock', version: 'Classic Era' },
    { name: 'Smolderweb', version: 'Classic Era' },
    { name: 'Stalagg', version: 'Classic Era' },
    { name: 'Sul\'thraze', version: 'Classic Era' },
    { name: 'Sulfuras', version: 'Classic Era' },
    { name: 'Thalnos', version: 'Classic Era' },
    { name: 'Thunderfury', version: 'Classic Era' },
    { name: 'Westfall', version: 'Classic Era' },
    { name: 'Whitemane', version: 'Classic Era' },
    { name: 'Windseeker', version: 'Classic Era' },
    { name: 'Yojamba', version: 'Classic Era' }
  ],
  'Europe': [
    // Mists of Pandaria (Cataclysm Classic progression)
    { name: 'Auberdine', version: 'Mists of Pandaria' },
    { name: 'Everlook', version: 'Mists of Pandaria' },
    { name: 'Flamegor', version: 'Mists of Pandaria' },
    { name: 'Garalon', version: 'Mists of Pandaria' },
    { name: 'Hoptallus', version: 'Mists of Pandaria' },
    { name: 'Mirage Raceway', version: 'Mists of Pandaria' },
    { name: 'Norushen', version: 'Mists of Pandaria' },
    { name: 'Ook Ook', version: 'Mists of Pandaria' },
    { name: 'Shek\'zeer', version: 'Mists of Pandaria' },
    // Anniversary (Classic Fresh Start)
    { name: 'Crusader Strike', version: 'Anniversary' },
    { name: 'Living Flame', version: 'Anniversary' },
    { name: 'Lone Wolf', version: 'Anniversary' },
    { name: 'Soulseeker', version: 'Anniversary' },
    { name: 'Spineshatter', version: 'Anniversary' },
    { name: 'Thunderstrike', version: 'Anniversary' },
    { name: 'Wild Growth', version: 'Anniversary' },
    // Classic Era
    { name: 'Amnennar', version: 'Classic Era' },
    { name: 'Ashbringer', version: 'Classic Era' },
    { name: 'Bloodfang', version: 'Classic Era' },
    { name: 'Celebras', version: 'Classic Era' },
    { name: 'Dragon\'s Call', version: 'Classic Era' },
    { name: 'Dragonfang', version: 'Classic Era' },
    { name: 'Dreadmist', version: 'Classic Era' },
    { name: 'Earthshaker', version: 'Classic Era' },
    { name: 'Finkle', version: 'Classic Era' },
    { name: 'Firemaw', version: 'Classic Era' },
    { name: 'Flamelash', version: 'Classic Era' },
    { name: 'Gandling', version: 'Classic Era' },
    { name: 'Gehennas', version: 'Classic Era' },
    { name: 'Golemagg', version: 'Classic Era' },
    { name: 'Heartstriker', version: 'Classic Era' },
    { name: 'Hydraxian Waterlords', version: 'Classic Era' },
    { name: 'Judgement', version: 'Classic Era' },
    { name: 'Lakeshire', version: 'Classic Era' },
    { name: 'Lucifron', version: 'Classic Era' },
    { name: 'Mandokir', version: 'Classic Era' },
    { name: 'Mograine', version: 'Classic Era' },
    { name: 'Nek\'Rosh', version: 'Classic Era' },
    { name: 'Nethergarde Keep', version: 'Classic Era' },
    { name: 'Noggenfogger', version: 'Classic Era' },
    { name: 'Patchwerk', version: 'Classic Era' },
    { name: 'Pyrewood Village', version: 'Classic Era' },
    { name: 'Razorfen', version: 'Classic Era' },
    { name: 'Razorgore', version: 'Classic Era' },
    { name: 'Shazzrah', version: 'Classic Era' },
    { name: 'Skullflame', version: 'Classic Era' },
    { name: 'Stitches', version: 'Classic Era' },
    { name: 'Stonespine', version: 'Classic Era' },
    { name: 'Sulfuron', version: 'Classic Era' },
    { name: 'Ten Storms', version: 'Classic Era' },
    { name: 'Transcendence', version: 'Classic Era' },
    { name: 'Venoxis', version: 'Classic Era' },
    { name: 'Zandalar Tribe', version: 'Classic Era' }
  ],
  'Korea': [
    // Mists of Pandaria (Cataclysm Classic progression)
    { name: 'Frostmourne', version: 'Mists of Pandaria' },
    { name: 'Iceblood', version: 'Mists of Pandaria' },
    { name: 'Lokholar', version: 'Mists of Pandaria' },
    { name: 'Ragnaros', version: 'Mists of Pandaria' },
    { name: 'Shimmering Flats', version: 'Mists of Pandaria' },
    // Anniversary (Classic Fresh Start)
    { name: 'Fengus\' Ferocity', version: 'Anniversary' },
    { name: 'Lone Wolf', version: 'Anniversary' },
    { name: 'Mol\'dar\'s Moxie', version: 'Anniversary' },
    { name: 'Slip\'kik\'s Savvy', version: 'Anniversary' },
    { name: 'Wild Growth', version: 'Anniversary' },
    // Classic Era
    { name: 'Hillsbrad', version: 'Classic Era' }
  ],
  'Taiwan': [
    // Mists of Pandaria (Cataclysm Classic progression)
    { name: 'Ivus', version: 'Mists of Pandaria' },
    // Anniversary (Classic Fresh Start)
    { name: 'Crusader Strike', version: 'Anniversary' },
    { name: 'Fengus\' Ferocity', version: 'Anniversary' },
    { name: 'Mol\'dar\'s Moxie', version: 'Anniversary' },
    { name: 'Slip\'kik\'s Savvy', version: 'Anniversary' },
    { name: 'Wild Growth', version: 'Anniversary' },
    // Classic Era
    { name: 'Maraudon', version: 'Classic Era' }
  ]
}

export const REALM_REGIONS = ['Americas & Oceania', 'Europe', 'Korea', 'Taiwan'] as const

export type RealmRegion = typeof REALM_REGIONS[number]

export function getAllRealms(): RealmInfo[] {
  return Object.values(WOW_REALMS).flat().sort((a, b) => a.name.localeCompare(b.name))
}

export function getRealmsByRegion(region: RealmRegion): RealmInfo[] {
  return WOW_REALMS[region] || []
}

export function getRealmsByVersion(region: RealmRegion, version: string): RealmInfo[] {
  const realms = getRealmsByRegion(region)
  return realms.filter(r => r.version === version).sort((a, b) => a.name.localeCompare(b.name))
}

export function getVersionsForRegion(region: RealmRegion): string[] {
  const realms = getRealmsByRegion(region)
  const versions = new Set(realms.map(r => r.version))
  return Array.from(versions).sort()
}
