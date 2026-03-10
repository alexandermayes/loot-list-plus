/**
 * Generate Cataclysm Raid Loot Data from Wowhead
 *
 * Scrapes wowhead NPC pages for 25-man raid boss drop tables.
 * Generates data/cata-raids.ts following the same format as data/wrath-raids.ts.
 *
 * Strategy:
 * 1. Try /cata/npc= page first (Cata Classic is live)
 * 2. Fall back to /npc= page (retail)
 *
 * Usage: npx tsx scripts/generate-cata-raids.ts
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
  // No 28 (Relic) - removed in Cataclysm
}

// Token name patterns for Cata tier tokens
const TOKEN_PATTERNS = [
  'Conqueror', 'Protector', 'Vanquisher',
  // Legendary fragments
  'Eternal Ember',
  'Seething Cinder',
  'Essence of the Firelord',
  'Heart of Flame',
  'Shadowy Gem',
  'Elementium Gem Cluster',
]

function isTokenItem(name: string, slotId: number): boolean {
  if (slotId !== 0) return false
  return TOKEN_PATTERNS.some(pattern => name.includes(pattern))
}

// Mode flags in wowhead Listview data
// 4=25N, 6=25H
const MODE_25N = '4'
const MODE_25H = '6'

// =============================================
// RAID DEFINITIONS WITH NPC IDs
// =============================================

const RAIDS: RaidConfig[] = [
  {
    name: 'Blackwing Descent',
    varName: 'blackwingDescent',
    tier: 'Tier 11',
    hasHeroic: true,
    bosses: [
      { name: 'Magmaw', npcIds: [41570] },
      { name: 'Omnotron Defense System', npcIds: [42166, 42179, 42178, 42180] },
      { name: 'Chimaeron', npcIds: [43296] },
      { name: 'Atramedes', npcIds: [41442] },
      { name: 'Maloriak', npcIds: [41378] },
      { name: 'Nefarian', npcIds: [41376] },
    ]
  },
  {
    name: 'The Bastion of Twilight',
    varName: 'bastionOfTwilight',
    tier: 'Tier 11',
    hasHeroic: true,
    bosses: [
      { name: 'Halfus Wyrmbreaker', npcIds: [44600] },
      { name: 'Theralion and Valiona', npcIds: [45993, 45992] },
      { name: 'Ascendant Council', npcIds: [43686, 43687, 43688, 43689] },
      { name: "Cho'gall", npcIds: [43324] },
      { name: 'Sinestra', npcIds: [45213], heroicOnly: true },
    ]
  },
  {
    name: 'Throne of the Four Winds',
    varName: 'throneOfTheFourWinds',
    tier: 'Tier 11',
    hasHeroic: true,
    bosses: [
      { name: 'Conclave of Wind', npcIds: [45870, 45871, 45872] },
      { name: "Al'Akir", npcIds: [46753] },
    ]
  },
  {
    name: 'Firelands',
    varName: 'firelands',
    tier: 'Tier 12',
    hasHeroic: true,
    bosses: [
      { name: "Beth'tilac", npcIds: [52498] },
      { name: 'Lord Rhyolith', npcIds: [52558] },
      { name: 'Alysrazor', npcIds: [52530] },
      { name: 'Shannox', npcIds: [53691] },
      { name: 'Baleroc', npcIds: [53494] },
      { name: 'Majordomo Staghelm', npcIds: [52571] },
      { name: 'Ragnaros', npcIds: [52409] },
    ]
  },
  {
    name: 'Dragon Soul',
    varName: 'dragonSoul',
    tier: 'Tier 13',
    hasHeroic: true,
    bosses: [
      { name: 'Morchok', npcIds: [55265] },
      { name: "Warlord Zon'ozz", npcIds: [55308] },
      { name: "Yor'sahj the Unsleeping", npcIds: [55312] },
      { name: 'Hagara the Stormbinder', npcIds: [55689] },
      { name: 'Ultraxion', npcIds: [55294] },
      { name: 'Warmaster Blackhorn', npcIds: [56427] },
      { name: 'Spine of Deathwing', npcIds: [53879] },
      { name: 'Madness of Deathwing', npcIds: [56173] },
    ]
  },
]

// =============================================
// WOWHEAD PAGE FETCHER
// =============================================

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
}

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, { headers: FETCH_HEADERS })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}`)
  }
  return response.text()
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
// BOSS LOOT FETCHER WITH FALLBACK
// =============================================

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchNpcDrops(npcId: number): Promise<{ items: any[]; source: string }> {
  // Try Cata Classic page first
  try {
    const html = await fetchPage(`https://www.wowhead.com/cata/npc=${npcId}`)
    const items = extractDropsData(html)
    if (items.length > 0) {
      return { items, source: 'cata' }
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

    await sleep(300)
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
 * Cataclysm Raid Loot Tables
 * Auto-generated from wowhead by scripts/generate-cata-raids.ts
 * Generated: ${new Date().toISOString().split('T')[0]}
 *
 * This file contains epic quality items from Cataclysm 25-man raids.
 * All raids include both normal and heroic loot.
 * Source: wowhead.com/cata + wowhead.com (retail fallback)
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
  lines.push(`// EXPORT ALL CATACLYSM RAIDS`)
  lines.push(`// ============================================================================`)
  lines.push(``)
  lines.push(`export const cataRaids: Raid[] = [`)
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
  console.log('=== Cataclysm Raid Loot Generator ===\n')

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
      await sleep(500)
    }

    allRaidData.push({ config: raid, bosses: bossResults })
  }

  // Generate output
  console.log('\n\nGenerating TypeScript output...')
  const tsContent = generateTypeScript(allRaidData)

  const outputPath = path.join(__dirname, '../data/cata-raids.ts')
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
