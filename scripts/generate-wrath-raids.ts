/**
 * Generate WotLK Raid Loot Data from Wowhead
 *
 * Scrapes wowhead NPC pages for 25-man raid boss drop tables.
 * Generates data/wrath-raids.ts following the same format as data/tbc-raids.ts.
 *
 * Strategy:
 * 1. Try /wotlk/npc= page first (WotLK Classic, has proper 10/25 mode data)
 * 2. Fall back to /npc= page (retail, has mode 4=25N, 6=25H)
 * 3. For Ulduar bosses with only mode 14 (Timewalking), use ilvl filtering
 *
 * Usage: npx tsx scripts/generate-wrath-raids.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// =============================================
// TYPES
// =============================================

interface BossConfig {
  name: string
  npcIds: number[]
  /** Max items to include per boss (for special cases like Gluth) */
  maxItems?: number
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
  28: 'Relic',       // Idol/Libram/Totem/Sigil
}

// Token name patterns for WotLK tier tokens
const TOKEN_PATTERNS = [
  'Conqueror', 'Protector', 'Vanquisher',
  'Trophy of the Crusade',
  'Mark of Sanctification',
  'Regalia of the Grand',
  "Val'anyr",
  'Fragment of',
]

function isTokenItem(name: string, slotId: number): boolean {
  if (slotId !== 0) return false
  return TOKEN_PATTERNS.some(pattern => name.includes(pattern))
}

// Mode flags in wowhead Listview data
// WotLK Classic: 3=10N, 4=25N, 5=10H, 6=25H, 9=Classic 40-man
// Retail also has: 14=Timewalking
const MODE_25N = '4'
const MODE_25H = '6'
const MODE_TIMEWALKING = '14'

// =============================================
// RAID DEFINITIONS WITH NPC IDs
// =============================================

const RAIDS: RaidConfig[] = [
  {
    name: 'Naxxramas (Wrath)',
    varName: 'naxxramas',
    tier: 'Tier 7',
    hasHeroic: false,
    bosses: [
      { name: "Anub'Rekhan", npcIds: [15956] },
      { name: 'Grand Widow Faerlina', npcIds: [15953] },
      { name: 'Maexxna', npcIds: [15952] },
      { name: 'Noth the Plaguebringer', npcIds: [15954] },
      { name: 'Heigan the Unclean', npcIds: [15936] },
      { name: 'Loatheb', npcIds: [16011] },
      { name: 'Instructor Razuvious', npcIds: [16061] },
      { name: 'Gothik the Harvester', npcIds: [16060] },
      { name: 'Four Horsemen', npcIds: [30549, 16064, 16065, 16063] },
      { name: 'Patchwerk', npcIds: [16028] },
      { name: 'Grobbulus', npcIds: [15931] },
      // Gluth drops copies of all other Naxx boss loot - skip him, his loot is redundant
      { name: 'Thaddius', npcIds: [15928] },
      { name: 'Sapphiron', npcIds: [15989] },
      { name: "Kel'Thuzad", npcIds: [15990] },
    ]
  },
  {
    name: 'Eye of Eternity',
    varName: 'eyeOfEternity',
    tier: 'Tier 7',
    hasHeroic: false,
    bosses: [
      { name: 'Malygos', npcIds: [28859] },
    ]
  },
  {
    name: 'Obsidian Sanctum',
    varName: 'obsidianSanctum',
    tier: 'Tier 7',
    hasHeroic: false,
    bosses: [
      { name: 'Sartharion', npcIds: [28860] },
    ]
  },
  {
    name: 'Ulduar',
    varName: 'ulduar',
    tier: 'Tier 8',
    hasHeroic: false,
    bosses: [
      { name: 'Flame Leviathan', npcIds: [33113] },
      { name: 'Ignis the Furnace Master', npcIds: [33118] },
      { name: 'Razorscale', npcIds: [33186] },
      { name: 'XT-002 Deconstructor', npcIds: [33293] },
      { name: 'Assembly of Iron', npcIds: [32867, 32927, 32857] },
      { name: 'Kologarn', npcIds: [32930] },
      { name: 'Auriaya', npcIds: [33515] },
      { name: 'Hodir', npcIds: [32845] },
      { name: 'Thorim', npcIds: [32865] },
      { name: 'Freya', npcIds: [32906] },
      { name: 'Mimiron', npcIds: [33350] },
      { name: 'General Vezax', npcIds: [33271] },
      { name: 'Yogg-Saron', npcIds: [33288] },
      { name: 'Algalon the Observer', npcIds: [32871] },
    ]
  },
  {
    name: 'Trial of the Crusader',
    varName: 'trialOfTheCrusader',
    tier: 'Tier 9',
    hasHeroic: true,
    bosses: [
      { name: 'Northrend Beasts', npcIds: [34796, 35144, 34799, 34797] },
      { name: 'Lord Jaraxxus', npcIds: [34780] },
      { name: 'Faction Champions', npcIds: [34460, 34458, 34461, 34463, 34465, 34466, 34467, 34468, 34469, 34470, 34471, 34472, 34473, 34474, 34475] },
      { name: "Twin Val'kyr", npcIds: [34497, 34496] },
      { name: "Anub'arak", npcIds: [34564] },
    ]
  },
  {
    name: "Onyxia's Lair (Wrath)",
    varName: 'onyxiasLair',
    tier: 'Tier 9',
    hasHeroic: false,
    bosses: [
      { name: 'Onyxia', npcIds: [10184] },
    ]
  },
  {
    name: 'Icecrown Citadel',
    varName: 'icecrownCitadel',
    tier: 'Tier 10',
    hasHeroic: true,
    bosses: [
      { name: 'Lord Marrowgar', npcIds: [36612] },
      { name: 'Lady Deathwhisper', npcIds: [36855] },
      { name: 'Gunship Battle', npcIds: [36948, 36939] },
      { name: 'Deathbringer Saurfang', npcIds: [37813] },
      { name: 'Festergut', npcIds: [36626] },
      { name: 'Rotface', npcIds: [36627] },
      { name: 'Professor Putricide', npcIds: [36678] },
      { name: 'Blood Prince Council', npcIds: [37970, 37972, 37973] },
      { name: "Blood-Queen Lana'thel", npcIds: [37955] },
      { name: 'Valithria Dreamwalker', npcIds: [36789] },
      { name: 'Sindragosa', npcIds: [36853] },
      { name: 'The Lich King', npcIds: [36597] },
    ]
  },
  {
    name: 'Ruby Sanctum',
    varName: 'rubySanctum',
    tier: 'Tier 10',
    hasHeroic: true,
    bosses: [
      { name: 'Saviana Ragefire', npcIds: [39747] },
      { name: 'Baltharus the Warborn', npcIds: [39751] },
      { name: 'General Zarithrian', npcIds: [39746] },
      { name: 'Halion', npcIds: [39863] },
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

function extractDropsData(html: string): WowheadDropItem[] {
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
  modes?: Record<string, unknown>
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
function get25ManType(modes: Record<string, unknown>, itemLevel?: number): 'normal' | 'heroic' | null {
  const has25N = MODE_25N in modes
  const has25H = MODE_25H in modes
  const hasTimewalking = MODE_TIMEWALKING in modes

  if (has25N) return 'normal'
  if (has25H) return 'heroic'

  // Timewalking mode (14) - used by Ulduar bosses on retail wowhead
  // Filter by Timewalking ilvl: >= 35 is 25-man, 32 is 10-man
  if (hasTimewalking && itemLevel !== undefined) {
    if (itemLevel >= 35 || itemLevel <= 1) return 'normal'
    // ilvl 30 could be tokens (include) or 10-man hard mode items (exclude)
    // We'll include them and clean up during verification
    if (itemLevel === 30) return 'normal'
    return null // ilvl 32 = 10-man, skip
  }

  return null
}

function filterAndMapItems(
  rawItems: WowheadDropItem[],
  includeHeroic: boolean
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
    const type = get25ManType(modes, raw.level)
    if (!type) continue

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

async function fetchNpcDrops(npcId: number): Promise<{ items: WowheadDropItem[]; source: string }> {
  // Try WotLK Classic page first
  try {
    const html = await fetchPage(`https://www.wowhead.com/wotlk/npc=${npcId}`)
    const items = extractDropsData(html)
    if (items.length > 0) {
      return { items, source: 'wotlk' }
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

  const { normal, heroic } = filterAndMapItems(allRawItems, hasHeroic)

  // For heroic items that share names with normal items, append "(Heroic)"
  const normalNames = new Set(normal.map(i => i.name))
  for (const item of heroic) {
    if (normalNames.has(item.name)) {
      item.name = `${item.name} (Heroic)`
    }
  }

  const combined = [...normal, ...heroic]
  combined.sort((a, b) => a.slot.localeCompare(b.slot) || a.name.localeCompare(b.name))

  // Apply max items cap if set (for special cases)
  if (boss.maxItems && combined.length > boss.maxItems) {
    return combined.slice(0, boss.maxItems)
  }

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
 * WotLK (Wrath of the Lich King) Raid Loot Tables
 * Auto-generated from wowhead by scripts/generate-wrath-raids.ts
 * Generated: ${new Date().toISOString().split('T')[0]}
 *
 * This file contains epic quality items from WotLK 25-man raids.
 * For raids with heroic modes (ToC, ICC, Ruby Sanctum), both normal and heroic loot is included.
 * Source: wowhead.com/wotlk + wowhead.com (retail fallback)
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
  lines.push(`// EXPORT ALL WOTLK RAIDS`)
  lines.push(`// ============================================================================`)
  lines.push(``)
  lines.push(`export const wrathRaids: Raid[] = [`)
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
  console.log('=== WotLK Raid Loot Generator ===\n')

  const allRaidData: Array<{
    config: RaidConfig
    bosses: Array<{ name: string; items: LootItem[] }>
  }> = []

  for (const raid of RAIDS) {
    console.log(`\n${raid.name} (${raid.tier})${raid.hasHeroic ? ' [+Heroic]' : ''}`)
    console.log('─'.repeat(50))

    const bossResults: Array<{ name: string; items: LootItem[] }> = []

    for (const boss of raid.bosses) {
      console.log(`  ${boss.name} (NPCs: ${boss.npcIds.slice(0, 3).join(', ')}${boss.npcIds.length > 3 ? '...' : ''})`)

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

  const outputPath = path.join(__dirname, '../data/wrath-raids.ts')
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
