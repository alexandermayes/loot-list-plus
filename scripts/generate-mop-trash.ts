/**
 * Generate MoP raid TRASH loot entries from wowhead zone pages.
 *
 * Strategy:
 *  1. Fetch each MoP raid zone's wowhead-mop-classic page.
 *  2. Extract all epic items from `id: 'drops'` listview.
 *  3. Diff against wowhead_ids already attributed to bosses in data/mop-raids.ts.
 *  4. Items in the diff = trash drops (+ any shared loot the boss scraper missed).
 *  5. Emit a TypeScript snippet per raid that can be pasted into mop-raids.ts.
 *
 * Why not extend generate-mop-raids.ts: that script REGENERATES the whole file
 * from scratch and would wipe manually-curated entries (e.g. Crafting Materials
 * pseudo-bosses on ToT and SoO). This script is additive only.
 *
 * Usage: npx tsx scripts/generate-mop-trash.ts
 * Output: scripts/output/mop-trash-snippets.ts (paste into data/mop-raids.ts)
 */

import * as fs from 'fs'
import * as path from 'path'
import { mopRaids } from '../data/mop-raids'

// =============================================
// CONFIG
// =============================================

interface ZoneConfig {
  raidName: string // must match data/mop-raids.ts raid name exactly
  zoneId: number
  tier: string
}

const ZONES: ZoneConfig[] = [
  { raidName: "Mogu'shan Vaults",          zoneId: 6125, tier: 'Tier 14' },
  { raidName: 'Heart of Fear',             zoneId: 6297, tier: 'Tier 14' },
  { raidName: 'Terrace of Endless Spring', zoneId: 6067, tier: 'Tier 14' },
  { raidName: 'Throne of Thunder',         zoneId: 6622, tier: 'Tier 15' },
  { raidName: 'Siege of Orgrimmar',        zoneId: 6738, tier: 'Tier 16' },
]

// Mode codes (per wowhead listview)
// 3 = 10N, 4 = 25N, 5 = 10H, 6 = 25H, 7 = LFR
const MODE_25N = 4
const MODE_25H = 6

// =============================================
// SLOT MAP (mirrors generate-mop-raids.ts)
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
  14: 'Off-Hand',
  15: 'Ranged',
  16: 'Back',
  17: 'Two-Hand',
  20: 'Chest',
  21: 'Main Hand',
  22: 'Off-Hand',
  23: 'Held In Off-hand',
  25: 'Ranged',
  26: 'Ranged',
}

const TOKEN_PATTERNS = ['Conqueror', 'Protector', 'Vanquisher']

function isTokenItem(name: string, slotId: number): boolean {
  if (slotId !== 0) return false
  return TOKEN_PATTERNS.some(p => name.includes(p))
}

function getSlotName(item: any): string | null {
  if (isTokenItem(item.name, item.slot)) return 'Token'
  if (item.classs === 15 && item.subclass === 5) return 'Mount'
  const slotName = SLOT_MAP[item.slot]
  return slotName || null
}

// =============================================
// FETCH
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

const MIRRORS = ['www', 'de', 'fr', 'es', 'pt', 'ru']

async function fetchZone(zoneId: number): Promise<string> {
  const path = `/mop-classic/zone=${zoneId}`
  const backoffs = [5000, 15000, 60000]
  let blockedRounds = 0
  // Always start at www (English) and only rotate to other-language mirrors
  // on block. Item names are language-specific in the response.
  let localMirrorIdx = 0
  for (let attempt = 0; attempt < MIRRORS.length * 4; attempt++) {
    const mirror = MIRRORS[localMirrorIdx % MIRRORS.length]
    localMirrorIdx++
    const url = `https://${mirror}.wowhead.com${path}`
    let res: Response
    try {
      res = await fetch(url, { headers: FETCH_HEADERS, redirect: 'follow' })
    } catch (err) {
      console.log(`    [fetch error on ${mirror}: ${(err as Error).message}]`)
      await sleep(1000)
      continue
    }
    if (res.ok) return res.text()
    if (res.status === 403 || res.status === 429 || res.status >= 500) {
      console.log(`    [${res.status} from ${mirror}, rotating]`)
      // After a full round of all mirrors being blocked, back off
      if ((attempt + 1) % MIRRORS.length === 0) {
        const wait = backoffs[Math.min(blockedRounds, backoffs.length - 1)]
        blockedRounds++
        console.log(`    [all mirrors blocked, sleeping ${wait / 1000}s]`)
        await sleep(wait)
      }
      continue
    }
    throw new Error(`HTTP ${res.status} from ${url}`)
  }
  throw new Error(`Exhausted mirrors for zone=${zoneId}`)
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// =============================================
// PARSE
// =============================================

function extractDrops(html: string): any[] {
  const markerMatch = html.match(/id:\s*['"]drops['"]/)
  if (!markerMatch || markerMatch.index === undefined) return []
  const afterMarker = html.substring(markerMatch.index)
  const dataStart = afterMarker.match(/data:\s*\[/)
  if (!dataStart || dataStart.index === undefined) return []
  const arrayStart = markerMatch.index + dataStart.index + dataStart[0].indexOf('[')
  const fromArr = html.substring(arrayStart)
  let depth = 0
  let end = -1
  for (let i = 0; i < fromArr.length; i++) {
    if (fromArr[i] === '[') depth++
    else if (fromArr[i] === ']') {
      depth--
      if (depth === 0) { end = i; break }
    }
  }
  if (end === -1) return []
  const arrStr = fromArr.substring(0, end + 1)
  try {
    return new Function(`return ${arrStr}`)()
  } catch {
    const cleaned = arrStr.replace(/,\s*\]/g, ']').replace(/,\s*\}/g, '}')
    return new Function(`return ${cleaned}`)()
  }
}

// =============================================
// FILTER LOGIC
// =============================================

interface OutItem {
  name: string
  slot: string
  wowhead_id: number
}

function getModeArray(item: any): number[] {
  // Zone-page shape: { modes: { mode: [3,4,5,6] } }
  if (item.modes && Array.isArray(item.modes.mode)) return item.modes.mode
  // Fallback: empty
  return []
}

function processZoneItems(rawItems: any[], existingIds: Set<number>): OutItem[] {
  const out: OutItem[] = []
  const seen = new Set<number>()

  // First pass: collect 25N items and 25H-only items separately so we can
  // append "(Heroic)" to heroic items whose name collides with a normal sibling.
  const normalItems: OutItem[] = []
  const heroicItems: OutItem[] = []

  for (const raw of rawItems) {
    if (raw.quality !== 4) continue          // epic only
    if (existingIds.has(raw.id)) continue    // already attributed to a boss
    if (seen.has(raw.id)) continue
    // Thunderforged variants get a separate wowhead id; the boss scraper
    // skips them, so the existing data only has base IDs. Skip them here too,
    // otherwise every ToT boss item shows up as "trash".
    if (raw.thunderforged === 1) continue
    if (raw.namedesc === 'Thunderforged') continue
    const slot = getSlotName(raw)
    if (!slot) continue
    const modes = getModeArray(raw)
    const has25N = modes.includes(MODE_25N)
    const has25H = modes.includes(MODE_25H)
    if (!has25N && !has25H) continue
    seen.add(raw.id)
    const item: OutItem = { name: raw.name, slot, wowhead_id: raw.id }
    if (has25N) normalItems.push(item)
    else heroicItems.push(item)
  }

  const normalNames = new Set(normalItems.map(i => i.name))
  for (const h of heroicItems) {
    if (normalNames.has(h.name)) h.name = `${h.name} (Heroic)`
  }

  out.push(...normalItems, ...heroicItems)
  out.sort((a, b) => a.slot.localeCompare(b.slot) || a.name.localeCompare(b.name))
  return out
}

// =============================================
// EXISTING BOSS-ITEM ID SET (from data/mop-raids.ts)
// =============================================

function collectExistingIds(raidName: string): Set<number> {
  const raid = mopRaids.find(r => r.name === raidName)
  if (!raid) {
    throw new Error(`Raid not found in data/mop-raids.ts: ${raidName}`)
  }
  const ids = new Set<number>()
  for (const boss of raid.bosses) {
    for (const item of boss.items) {
      ids.add(item.wowhead_id)
    }
  }
  return ids
}

// =============================================
// OUTPUT
// =============================================

function escapeString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function renderSnippet(raidName: string, items: OutItem[]): string {
  if (items.length === 0) {
    return `// ${raidName}: no trash items found\n`
  }
  const lines: string[] = []
  lines.push(`// ===== ${raidName} =====`)
  lines.push(`// Paste this entry into the bosses array for ${raidName} in data/mop-raids.ts`)
  lines.push(`    {`)
  lines.push(`      name: 'Trash',`)
  lines.push(`      items: [`)
  for (const it of items) {
    lines.push(`        { name: '${escapeString(it.name)}', slot: '${it.slot}', wowhead_id: ${it.wowhead_id} },`)
  }
  lines.push(`      ],`)
  lines.push(`    },`)
  lines.push('')
  return lines.join('\n')
}

// =============================================
// MAIN
// =============================================

async function main() {
  console.log('=== MoP Trash Loot Generator ===\n')

  const outputLines: string[] = []
  outputLines.push(`// Auto-generated by scripts/generate-mop-trash.ts on ${new Date().toISOString().split('T')[0]}`)
  outputLines.push(`// These entries are NOT attributed to any boss in the existing data/mop-raids.ts.`)
  outputLines.push(`// Most will be trash drops; some may be shared boss loot the original scraper missed.`)
  outputLines.push(`// Spot-check against wowhead before pasting into data/mop-raids.ts.`)
  outputLines.push('')

  for (const zone of ZONES) {
    console.log(`\n${zone.raidName} (zone ${zone.zoneId})`)
    console.log('─'.repeat(50))

    const existingIds = collectExistingIds(zone.raidName)
    console.log(`  existing boss-attributed items: ${existingIds.size}`)

    let html: string
    try {
      html = await fetchZone(zone.zoneId)
    } catch (err) {
      console.error(`  fetch failed: ${(err as Error).message}`)
      continue
    }

    const rawItems = extractDrops(html)
    console.log(`  zone drops total (all qualities): ${rawItems.length}`)

    const out = processZoneItems(rawItems, existingIds)
    console.log(`  → ${out.length} new epic 25-man items (trash + missed shared)`)

    if (out.length > 0 && out.length <= 30) {
      console.log('  items:')
      for (const it of out) console.log(`    ${it.wowhead_id}  ${it.slot.padEnd(18)} ${it.name}`)
    } else if (out.length > 30) {
      console.log(`  (${out.length} items — see snippet file for full list)`)
    }

    outputLines.push(renderSnippet(zone.raidName, out))

    await sleep(1500)
  }

  const outDir = path.join(__dirname, 'output')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, 'mop-trash-snippets.ts')
  fs.writeFileSync(outPath, outputLines.join('\n'))
  console.log(`\n\nSnippets written to ${outPath}`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
