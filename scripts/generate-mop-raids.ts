/**
 * Generate Mists of Pandaria Raid Loot Data from Wowhead
 *
 * Scrapes wowhead MoP Classic NPC pages for 25-man raid boss drop tables.
 * Generates data/mop-raids.ts following the same format as data/wrath-raids.ts.
 *
 * Strategy:
 * 1. Use /mop-classic/npc= page (MoP Classic is live on wowhead)
 * 2. Mode 4=25N, 6=25H (same as Cata/WotLK)
 *
 * Usage: npx tsx scripts/generate-mop-raids.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// =============================================
// TYPES
// =============================================

interface BossConfig {
  name: string
  npcIds: number[]
  /** If true, this boss only exists on heroic difficulty */
  heroicOnly?: boolean
}

interface RaidConfig {
  name: string
  varName: string
  tier: string
  hasHeroic: boolean
  bosses: BossConfig[]
}

interface LootItem {
  name: string
  slot: string
  wowhead_id: number
}

// =============================================
// SLOT ID TO NAME MAPPING
// =============================================

const SLOT_MAP: Record<number, string> = {
  1: 'Head',
  2: 'Neck',
  3: 'Shoulder',
  5: 'Chest',
  6: 'Waist',
  7: 'Legs',
  8: 'Feet',
  9: 'Wrist',
  10: 'Hands',
  11: 'Finger',
  12: 'Trinket',
  13: 'One-Hand',
  14: 'Off-Hand',    // Shield
  15: 'Ranged',      // Bow
  16: 'Back',
  17: 'Two-Hand',
  20: 'Chest',       // Robe
  21: 'Main Hand',
  22: 'Off-Hand',    // Frill
  23: 'Held In Off-hand',
  25: 'Ranged',      // Thrown
  26: 'Ranged',      // Gun/Wand/Crossbow
}

// Token name patterns for MoP tier tokens
const TOKEN_PATTERNS = [
  'Conqueror', 'Protector', 'Vanquisher',
]

function isTokenItem(name: string, slotId: number): boolean {
  if (slotId !== 0) return false
  return TOKEN_PATTERNS.some(pattern => name.includes(pattern))
}

// Mode flags: 3=10N, 4=25N, 5=10H, 6=25H, 7=LFR
const MODE_25N = '4'
const MODE_25H = '6'

// =============================================
// RAID DEFINITIONS WITH NPC IDs
// =============================================

const RAIDS: RaidConfig[] = [
  {
    name: "Mogu'shan Vaults",
    varName: 'mogushanVaults',
    tier: 'Tier 14',
    hasHeroic: true,
    bosses: [
      { name: 'The Stone Guard', npcIds: [60047, 60051, 59915, 60043] },
      { name: 'Feng the Accursed', npcIds: [60009] },
      { name: "Gara'jal the Spiritbinder", npcIds: [60143] },
      { name: 'The Spirit Kings', npcIds: [60701, 60708, 60709, 60710] },
      { name: 'Elegon', npcIds: [60410] },
      { name: 'Will of the Emperor', npcIds: [60399, 60400] },
    ]
  },
  {
    name: 'Heart of Fear',
    varName: 'heartOfFear',
    tier: 'Tier 14',
    hasHeroic: true,
    bosses: [
      { name: "Imperial Vizier Zor'lok", npcIds: [62980] },
      { name: "Blade Lord Ta'yak", npcIds: [62543] },
      { name: 'Garalon', npcIds: [62164] },
      { name: "Wind Lord Mel'jarak", npcIds: [62397] },
      { name: "Amber-Shaper Un'sok", npcIds: [62511] },
      { name: "Grand Empress Shek'zeer", npcIds: [62837] },
    ]
  },
  {
    name: 'Terrace of Endless Spring',
    varName: 'terraceOfEndlessSpring',
    tier: 'Tier 14',
    hasHeroic: true,
    bosses: [
      { name: 'Protectors of the Endless', npcIds: [60583, 60585, 60586] },
      { name: 'Tsulong', npcIds: [62442] },
      { name: 'Lei Shi', npcIds: [62983] },
      { name: 'Sha of Fear', npcIds: [60999] },
    ]
  },
  {
    name: 'Throne of Thunder',
    varName: 'throneOfThunder',
    tier: 'Tier 15',
    hasHeroic: true,
    bosses: [
      { name: 'Jin\'rokh the Breaker', npcIds: [69465] },
      { name: 'Horridon', npcIds: [68476] },
      { name: 'Council of Elders', npcIds: [69078, 69131, 69132, 69134] },
      { name: 'Tortos', npcIds: [67977] },
      { name: 'Megaera', npcIds: [70212] },
      { name: 'Ji-Kun', npcIds: [69712] },
      { name: 'Durumu the Forgotten', npcIds: [68036] },
      { name: 'Primordius', npcIds: [69017] },
      { name: 'Dark Animus', npcIds: [69427] },
      { name: 'Iron Qon', npcIds: [68078] },
      { name: 'Twin Consorts', npcIds: [68905, 68904] },
      { name: 'Lei Shen', npcIds: [68397] },
      { name: 'Ra-den', npcIds: [69473], heroicOnly: true },
    ]
  },
  {
    name: 'Siege of Orgrimmar',
    varName: 'siegeOfOrgrimmar',
    tier: 'Tier 16',
    hasHeroic: true,
    bosses: [
      { name: 'Immerseus', npcIds: [71543] },
      { name: 'The Fallen Protectors', npcIds: [71475, 71479, 71480] },
      { name: 'Norushen', npcIds: [72276] }, // Amalgam of Corruption drops the loot
      { name: 'Sha of Pride', npcIds: [71734] },
      { name: 'Galakras', npcIds: [72249] },
      { name: 'Iron Juggernaut', npcIds: [71466] },
      { name: "Kor'kron Dark Shaman", npcIds: [71859, 71858] },
      { name: 'General Nazgrim', npcIds: [71515] },
      { name: 'Malkorok', npcIds: [71454] },
      { name: 'Spoils of Pandaria', npcIds: [71889] },
      { name: 'Thok the Bloodthirsty', npcIds: [71529] },
      { name: 'Siegecrafter Blackfuse', npcIds: [71504] },
      { name: 'Paragons of the Klaxxi', npcIds: [71152, 71153, 71154, 71155, 71156, 71157, 71158, 71159, 71160] },
      { name: 'Garrosh Hellscream', npcIds: [71865] },
    ]
  },
]

// =============================================
// WOWHEAD PAGE FETCHER
// =============================================

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
}

const MIRRORS = ['www', 'de', 'fr', 'es', 'pt', 'ru', 'tw', 'cn', 'ko']
let mirrorIdx = 0
function nextMirror() {
  const m = MIRRORS[mirrorIdx % MIRRORS.length]
  mirrorIdx++
  return m
}

async function fetchPage(url: string): Promise<string> {
  // Try each mirror in round-robin. On 403, rotate.
  const path = url.replace(/^https?:\/\/[^/]+/, '')
  const backoffs = [60000, 180000, 300000]
  let attemptsOnMirrors = 0
  for (;;) {
    const mirror = nextMirror()
    const finalUrl = `https://${mirror}.wowhead.com${path}`
    const response = await fetch(finalUrl, { headers: FETCH_HEADERS })
    if (response.ok) return response.text()
    if (response.status === 403) {
      attemptsOnMirrors++
      if (attemptsOnMirrors < MIRRORS.length) continue
      // All mirrors blocked: backoff
      const backoffSlot = Math.min(Math.floor(attemptsOnMirrors / MIRRORS.length) - 1, backoffs.length - 1)
      const wait = backoffs[backoffSlot]
      console.log(`    [all mirrors rate-limited, sleeping ${wait/1000}s]`)
      await new Promise(r => setTimeout(r, wait))
      if (attemptsOnMirrors > MIRRORS.length * backoffs.length) {
        throw new Error(`Exhausted retries across mirrors for ${path}`)
      }
      continue
    }
    throw new Error(`HTTP ${response.status} from ${finalUrl}`)
  }
}

// =============================================
// LISTVIEW DATA PARSER
// =============================================

function extractDropsData(html: string): any[] {
  const dropsMarkerRegex = /id:\s*['"]drops['"]/
  const markerMatch = html.match(dropsMarkerRegex)
  if (!markerMatch || markerMatch.index === undefined) return []

  const afterMarker = html.substring(markerMatch.index)
  const dataStartMatch = afterMarker.match(/data:\s*\[/)
  if (!dataStartMatch || dataStartMatch.index === undefined) return []

  const arrayStart = markerMatch.index + dataStartMatch.index + dataStartMatch[0].indexOf('[')
  const sourceFromArray = html.substring(arrayStart)

  let depth = 0
  let endIdx = -1
  for (let i = 0; i < sourceFromArray.length; i++) {
    if (sourceFromArray[i] === '[') depth++
    else if (sourceFromArray[i] === ']') {
      depth--
      if (depth === 0) { endIdx = i; break }
    }
  }

  if (endIdx === -1) return []

  const arrayStr = sourceFromArray.substring(0, endIdx + 1)

  try {
    return new Function(`return ${arrayStr}`)()
  } catch {
    try {
      const cleaned = arrayStr.replace(/,\s*\]/g, ']').replace(/,\s*\}/g, '}')
      return new Function(`return ${cleaned}`)()
    } catch {
      return []
    }
  }
}

// =============================================
// ITEM FILTERING AND MAPPING
// =============================================

interface WowheadDropItem {
  id: number
  name: string
  quality: number
  slot: number
  classs: number
  subclass: number
  level?: number
  modes?: Record<string, any>
  thunderforged?: number
}

function getSlotName(item: WowheadDropItem): string | null {
  if (isTokenItem(item.name, item.slot)) return 'Token'
  if (item.classs === 15 && item.subclass === 5) return 'Mount'

  const slotName = SLOT_MAP[item.slot]
  if (!slotName) return null
  return slotName
}

/**
 * Check if an item is a 25-man item based on mode data.
 * Returns 'normal', 'heroic', or null (not 25-man).
 */
function get25ManType(modes: Record<string, any>): 'normal' | 'heroic' | null {
  const has25N = MODE_25N in modes
  const has25H = MODE_25H in modes

  if (has25N) return 'normal'
  if (has25H) return 'heroic'

  return null
}

function filterAndMapItems(
  rawItems: WowheadDropItem[],
  includeHeroic: boolean,
  heroicOnly: boolean = false
): { normal: LootItem[]; heroic: LootItem[] } {
  const normal: LootItem[] = []
  const heroic: LootItem[] = []
  const seenIds = new Set<number>()

  for (const raw of rawItems) {
    if (raw.quality < 4) continue
    if (seenIds.has(raw.id)) continue

    // Skip Thunderforged variants (ToT has these as separate items)
    // Exception: heroic-only bosses (Ra-den) have all items flagged thunderforged
    if (raw.thunderforged && !heroicOnly) continue

    const slotName = getSlotName(raw)
    if (!slotName) continue

    const modes = raw.modes || {}
    const type = get25ManType(modes)
    if (!type) continue

    // For heroic-only bosses, skip normal items
    if (heroicOnly && type === 'normal') continue

    seenIds.add(raw.id)

    const item: LootItem = {
      name: raw.name,
      slot: slotName,
      wowhead_id: raw.id,
    }

    if (type === 'normal') {
      normal.push(item)
    } else if (type === 'heroic' && includeHeroic) {
      heroic.push(item)
    }
  }

  return { normal, heroic }
}

// =============================================
// BOSS LOOT FETCHER
// =============================================

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchNpcDrops(npcId: number): Promise<{ items: any[]; source: string }> {
  // Try MoP Classic page
  try {
    const html = await fetchPage(`https://www.wowhead.com/mop-classic/npc=${npcId}`)
    const items = extractDropsData(html)
    if (items.length > 0) {
      return { items, source: 'mop-classic' }
    }
  } catch { /* fall through */ }

  // Fall back to retail page
  try {
    const html = await fetchPage(`https://www.wowhead.com/npc=${npcId}`)
    const items = extractDropsData(html)
    if (items.length > 0) {
      return { items, source: 'retail' }
    }
  } catch { /* fall through */ }

  return { items: [], source: 'none' }
}

async function fetchBossLoot(
  boss: BossConfig,
  hasHeroic: boolean
): Promise<LootItem[]> {
  const allRawItems: WowheadDropItem[] = []
  const seenItemIds = new Set<number>()

  for (const npcId of boss.npcIds) {
    try {
      const { items: rawItems, source } = await fetchNpcDrops(npcId)

      for (const item of rawItems) {
        if (!seenItemIds.has(item.id)) {
          seenItemIds.add(item.id)
          allRawItems.push(item)
        }
      }

      if (rawItems.length > 0) {
        console.log(`    NPC ${npcId} [${source}]: ${rawItems.length} drops`)
      } else {
        console.log(`    NPC ${npcId}: no drops on either page`)
      }
    } catch (err) {
      console.error(`    NPC ${npcId}: Error - ${(err as Error).message}`)
    }

    await sleep(800)
  }

  const { normal, heroic } = filterAndMapItems(allRawItems, hasHeroic, boss.heroicOnly)

  // For heroic items that share names with normal items, append "(Heroic)"
  const normalNames = new Set(normal.map(i => i.name))
  for (const item of heroic) {
    if (normalNames.has(item.name)) {
      item.name = `${item.name} (Heroic)`
    }
  }

  const combined = [...normal, ...heroic]
  combined.sort((a, b) => a.slot.localeCompare(b.slot) || a.name.localeCompare(b.name))

  return combined
}

// =============================================
// OUTPUT GENERATION
// =============================================

function escapeString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function generateTypeScript(
  raids: Array<{
    config: RaidConfig
    bosses: Array<{ name: string; items: LootItem[] }>
  }>
): string {
  const lines: string[] = []

  lines.push(`/**
 * Mists of Pandaria Raid Loot Tables
 * Auto-generated from wowhead by scripts/generate-mop-raids.ts
 * Generated: ${new Date().toISOString().split('T')[0]}
 *
 * This file contains epic quality items from MoP 25-man raids.
 * All raids include both normal and heroic loot.
 * Source: wowhead.com/mop-classic + wowhead.com (retail fallback)
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
`)

  let totalItems = 0

  for (const raid of raids) {
    const { config, bosses } = raid
    const raidItemCount = bosses.reduce((sum, b) => sum + b.items.length, 0)
    totalItems += raidItemCount

    lines.push(`// ============================================================================`)
    lines.push(`// ${config.name.toUpperCase()} - ${config.tier}`)
    lines.push(`// ============================================================================`)
    lines.push(``)
    lines.push(`export const ${config.varName}: Raid = {`)
    lines.push(`  name: '${escapeString(config.name)}',`)
    lines.push(`  tier: '${escapeString(config.tier)}',`)
    lines.push(`  bosses: [`)

    for (const boss of bosses) {
      if (boss.items.length === 0) continue

      lines.push(`    {`)
      lines.push(`      name: '${escapeString(boss.name)}',`)
      lines.push(`      items: [`)

      for (const item of boss.items) {
        lines.push(`        { name: '${escapeString(item.name)}', slot: '${item.slot}', wowhead_id: ${item.wowhead_id} },`)
      }

      lines.push(`      ],`)
      lines.push(`    },`)
    }

    lines.push(`  ],`)
    lines.push(`}`)
    lines.push(``)
  }

  lines.push(`// ============================================================================`)
  lines.push(`// EXPORT ALL MOP RAIDS`)
  lines.push(`// ============================================================================`)
  lines.push(``)
  lines.push(`export const mopRaids: Raid[] = [`)
  for (const raid of raids) {
    lines.push(`  ${raid.config.varName},`)
  }
  lines.push(`]`)

  console.log(`\nTotal items across all raids: ${totalItems}`)

  return lines.join('\n') + '\n'
}

// =============================================
// MAIN
// =============================================

async function main() {
  console.log('=== Mists of Pandaria Raid Loot Generator ===\n')

  const allRaidData: Array<{
    config: RaidConfig
    bosses: Array<{ name: string; items: LootItem[] }>
  }> = []

  for (const raid of RAIDS) {
    console.log(`\n${raid.name} (${raid.tier})${raid.hasHeroic ? ' [+Heroic]' : ''}`)
    console.log('─'.repeat(50))

    const bossResults: Array<{ name: string; items: LootItem[] }> = []

    for (const boss of raid.bosses) {
      console.log(`  ${boss.name} (NPCs: ${boss.npcIds.slice(0, 3).join(', ')}${boss.npcIds.length > 3 ? '...' : ''})${boss.heroicOnly ? ' [HEROIC ONLY]' : ''}`)

      const items = await fetchBossLoot(boss, raid.hasHeroic)
      console.log(`    → ${items.length} items`)

      bossResults.push({ name: boss.name, items })
      await sleep(1200)
    }

    allRaidData.push({ config: raid, bosses: bossResults })
  }

  // Generate output
  console.log('\n\nGenerating TypeScript output...')
  const tsContent = generateTypeScript(allRaidData)

  const outputPath = path.join(__dirname, '../data/mop-raids.ts')
  fs.writeFileSync(outputPath, tsContent)
  console.log(`\nSaved to ${outputPath}`)

  // Summary
  console.log('\n=== SUMMARY ===')
  for (const raid of allRaidData) {
    const itemCount = raid.bosses.reduce((sum, b) => sum + b.items.length, 0)
    const bossesWithItems = raid.bosses.filter(b => b.items.length > 0).length
    const emptyBosses = raid.bosses.filter(b => b.items.length === 0)
    console.log(`  ${raid.config.name}: ${itemCount} items from ${bossesWithItems}/${raid.bosses.length} bosses`)
    if (emptyBosses.length > 0) {
      console.log(`    ! No items: ${emptyBosses.map(b => b.name).join(', ')}`)
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
