/**
 * Fetch Token Copy Counts from Wowhead
 *
 * A tier token is turned in for one piece of gear, and some tokens can be
 * turned in for several different gear slots (Qiraji Bindings become either
 * shoulders or boots). A raider who needs both pieces may list the token once
 * per gear slot it covers (GH #331), so the loot list needs to know how many
 * distinct slots each token can become.
 *
 * This script reads every 'Token' item from the raid data, parses its Wowhead
 * item page (the quests it is an objective of, and the items it is currency
 * for), and generates data/token-copies.ts. Sibling of
 * scripts/fetch-item-unique.ts.
 *
 * Rule: for each class, count the distinct equip slots of the rewards that
 * class can get; a token's copy count is the largest count over all classes.
 * For Classic, TBC and Wrath pages, reward ids the wow-classic-items package
 * does not know are dropped (that removes Season of Discovery variants). A
 * reward that is itself a catalog token counts that token's slots. A token
 * with no equippable reward counts 1.
 *
 * Usage: npx tsx scripts/fetch-token-copies.ts [--cache-dir DIR]
 */

import * as fs from 'fs'
import * as path from 'path'
import { Items } from 'wow-classic-items'

import { classicRaids } from '../data/classic-wow-raids'
import { tbcRaids } from '../data/tbc-raids'
import { wrathRaids } from '../data/wrath-raids'
import { cataRaids } from '../data/cata-raids'
import { mopRaids } from '../data/mop-raids'
import { isTokenSlot } from '../data/token-class-mapping'

interface RaidLike {
  bosses: Array<{ items: Array<{ wowhead_id: number; name: string; slot: string }> }>
}

type Expansion = 'classic' | 'tbc' | 'wrath' | 'cata' | 'mop'

/** Wowhead path segment for each expansion's item pages. */
const WOWHEAD_PATH: Record<Expansion, string> = {
  classic: 'classic',
  tbc: 'tbc',
  wrath: 'wotlk',
  cata: 'cata',
  mop: 'mop-classic',
}

/** Paths whose rewards are checked against the wow-classic-items package. */
const PACKAGE_PATHS = new Set(['classic', 'tbc', 'wotlk'])

/** Wowhead inventory slot ids to the names used in the generated comments. */
const SLOT_NAMES: Record<number, string> = {
  1: 'Head',
  3: 'Shoulder',
  5: 'Chest',
  6: 'Waist',
  7: 'Legs',
  8: 'Feet',
  9: 'Wrist',
  10: 'Hands',
  13: 'One-Hand',
  14: 'Shield',
  17: 'Two-Hand',
  26: 'Ranged',
}

/** A robe (slot 20) is worn in the chest slot. */
const SLOT_ALIASES: Record<number, number> = { 20: 5 }

const ALL_CLASSES = 'ALL'
const FETCH_DELAY_MS = 1200
const MAX_CHAIN_DEPTH = 2

interface TokenInfo {
  id: number
  name: string
  path: string
}

/** A reward is either an equip slot or another catalog token. */
type RewardKey = { kind: 'slot'; slot: number } | { kind: 'token'; id: number }

/** Reward keys per class ('ALL' when the reward has no class restriction). */
type PerClass = Map<string, RewardKey[]>

function extractTokens(): TokenInfo[] {
  const tokens: TokenInfo[] = []
  const seen = new Set<number>()
  const sources: [Expansion, RaidLike[]][] = [
    ['classic', classicRaids],
    ['tbc', tbcRaids],
    ['wrath', wrathRaids],
    ['cata', cataRaids],
    ['mop', mopRaids],
  ]
  for (const [expansion, raids] of sources) {
    for (const raid of raids) {
      for (const boss of raid.bosses) {
        for (const item of boss.items) {
          if (!isTokenSlot(item.slot) || seen.has(item.wowhead_id)) continue
          seen.add(item.wowhead_id)
          tokens.push({ id: item.wowhead_id, name: item.name, path: WOWHEAD_PATH[expansion] })
        }
      }
    }
  }
  return tokens
}

function parseCacheDir(argv: string[]): string | null {
  const idx = argv.indexOf('--cache-dir')
  if (idx === -1) return null
  const dir = argv[idx + 1]
  if (!dir) throw new Error('--cache-dir needs a directory')
  return path.resolve(dir)
}

let lastFetchAt = 0

/** Returns the page HTML, or null when it could not be read or fetched. */
async function loadPage(token: TokenInfo, cacheDir: string | null): Promise<string | null> {
  const cacheFile = cacheDir ? path.join(cacheDir, `${token.path}-${token.id}.html`) : null
  if (cacheFile && fs.existsSync(cacheFile)) {
    return fs.readFileSync(cacheFile, 'utf8')
  }

  const wait = lastFetchAt + FETCH_DELAY_MS - Date.now()
  if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait))
  lastFetchAt = Date.now()

  const url = `https://www.wowhead.com/${token.path}/item=${token.id}`
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    })
    if (!response.ok) {
      console.warn('Failed to fetch token page, leaving unresolved:', token.id, response.status)
      return null
    }
    const html = await response.text()
    if (cacheFile) {
      fs.mkdirSync(path.dirname(cacheFile), { recursive: true })
      fs.writeFileSync(cacheFile, html)
    }
    return html
  } catch (error) {
    console.warn('Error fetching token page, leaving unresolved:', token.id, error)
    return null
  }
}

interface Listview {
  id: string
  template: string
  data: unknown[] | null
}

/** Every "new Listview({ ... });" block with its id, template and data array. */
function parseListviews(html: string): Listview[] {
  const out: Listview[] = []
  for (const match of html.matchAll(/new Listview\(\{([\s\S]*?)\}\);/g)) {
    const body = match[1]
    const id = body.match(/id:\s*'([\w-]+)'/)
    const template = body.match(/template:\s*'([\w-]+)'/)
    const data = body.match(/data:\s*(\[[\s\S]*\])\s*,/)
    if (!id || !template || !data) continue
    let parsed: unknown[] | null = null
    try {
      parsed = JSON.parse(data[1])
    } catch {
      parsed = null
    }
    out.push({ id: id[1], template: template[1], data: parsed })
  }
  return out
}

interface GathererItem {
  jsonequip?: { slotbak?: number }
}

/** Item objects passed to WH.Gatherer.addData(3, ...), keyed by item id. */
function parseGathererItems(html: string): Record<string, GathererItem> {
  const items: Record<string, GathererItem> = {}
  for (const match of html.matchAll(/WH\.Gatherer\.addData\(3,\s*\d+,\s*(\{.*?\})\)\s*;?/g)) {
    try {
      Object.assign(items, JSON.parse(match[1]))
    } catch {
      // A block that is not plain JSON carries no reward slots we need.
    }
  }
  return items
}

/** Class ids in a reqclass bitmask (bit n-1 for class n); none means every class. */
function classesOf(mask: number | null | undefined): string[] {
  if (!mask) return [ALL_CLASSES]
  const classes: string[] = []
  for (let classId = 1; classId <= 12; classId++) {
    if (mask & (1 << (classId - 1))) classes.push(String(classId))
  }
  return classes
}

interface QuestEntry {
  reqclass?: number
  itemrewards?: [number, number][]
  itemchoices?: [number, number][]
}

interface CurrencyEntry {
  id: number
  slot?: number
  reqclass?: number
}

/** First pass: the raw reward keys per class for one token page. */
function rawRewards(
  html: string,
  pagePath: string,
  tokenIds: Set<number>,
  packageIds: Set<number>,
): PerClass {
  const gatherer = parseGathererItems(html)
  const usePackage = PACKAGE_PATHS.has(pagePath)
  const rows: { id: number; slot: number | undefined; reqclass: number | undefined }[] = []

  for (const listview of parseListviews(html)) {
    if (!listview.data) continue
    if (listview.template === 'quest' && listview.id === 'objective-of') {
      for (const quest of listview.data as QuestEntry[]) {
        for (const [rewardId] of [...(quest.itemrewards ?? []), ...(quest.itemchoices ?? [])]) {
          rows.push({
            id: rewardId,
            slot: gatherer[String(rewardId)]?.jsonequip?.slotbak,
            reqclass: quest.reqclass,
          })
        }
      }
    } else if (listview.template === 'item' && listview.id === 'currency-for') {
      for (const entry of listview.data as CurrencyEntry[]) {
        rows.push({ id: entry.id, slot: entry.slot, reqclass: entry.reqclass })
      }
    }
  }

  const perClass: PerClass = new Map()
  for (const row of rows) {
    let key: RewardKey
    if (tokenIds.has(row.id)) {
      key = { kind: 'token', id: row.id }
    } else if (usePackage && !packageIds.has(row.id)) {
      continue
    } else if (!row.slot) {
      continue
    } else {
      key = { kind: 'slot', slot: SLOT_ALIASES[row.slot] ?? row.slot }
    }
    for (const classId of classesOf(row.reqclass)) {
      const keys = perClass.get(classId) ?? []
      keys.push(key)
      perClass.set(classId, keys)
    }
  }
  return perClass
}

/** Slots per class, chaining token rewards up to MAX_CHAIN_DEPTH levels. */
function resolveSlots(
  id: number,
  raw: Map<number, PerClass>,
  depth = 0,
): Map<string, Set<number>> {
  const out = new Map<string, Set<number>>()
  const perClass = raw.get(id)
  if (!perClass) return out

  for (const [classId, keys] of perClass) {
    const slots = out.get(classId) ?? new Set<number>()
    for (const key of keys) {
      if (key.kind === 'slot') {
        slots.add(key.slot)
      } else if (depth < MAX_CHAIN_DEPTH) {
        for (const subSlots of resolveSlots(key.id, raw, depth + 1).values()) {
          for (const slot of subSlots) slots.add(slot)
        }
      }
    }
    out.set(classId, slots)
  }

  const shared = out.get(ALL_CLASSES)
  if (shared) {
    for (const [classId, slots] of out) {
      if (classId === ALL_CLASSES) continue
      for (const slot of shared) slots.add(slot)
    }
  }
  return out
}

interface TokenResult {
  token: TokenInfo
  copies: number
  slots: number[]
}

function generateFile(
  results: TokenResult[],
  total: number,
  noReward: TokenInfo[],
  unresolved: TokenInfo[],
): string {
  const multi = results.filter(r => r.copies > 1).sort((a, b) => a.token.id - b.token.id)
  const lines = multi.map(r => {
    const slots = r.slots.map(slot => SLOT_NAMES[slot] ?? `slot ${slot}`).join(', ')
    return `  ${r.token.id}: ${r.copies}, // ${r.token.name}: ${slots}`
  })
  const noRewardLine = noReward.length
    ? noReward.map(t => `${t.id} ${t.name}`).join('; ')
    : 'none'
  const unresolvedLine = unresolved.length
    ? unresolved.map(t => `${t.id} ${t.name}`).join('; ')
    : 'none'

  return `/**
 * Token Copy Counts
 *
 * Maps a token's Wowhead item ID to how many copies a raider may list: the
 * number of distinct gear slots it can be turned in for. Read via
 * maxCopiesForItem() in domain/loot/slot-capacity.ts; the count applies once
 * in main spec and once again in off-spec (domain/loot/item-copies.ts).
 *
 * Rule: for each class, the distinct equip slots of the rewards that class
 * can get, max over classes. Reward ids the wow-classic-items package does not
 * know are dropped for Classic, TBC and Wrath; a reward that is itself a
 * catalog token counts that token's slots. Ids absent from this map mean 1.
 *
 * Auto-generated by scripts/fetch-token-copies.ts
 * Generated: ${new Date().toISOString().split('T')[0]}
 * Resolved: ${results.length} of ${total} tokens
 * No equippable reward (1 copy): ${noRewardLine}
 * Unresolved (1 copy): ${unresolvedLine}
 */

export const TOKEN_MAX_COPIES: Record<number, number> = {
${lines.join('\n')}
}
`
}

async function main() {
  const cacheDir = parseCacheDir(process.argv.slice(2))
  const tokens = extractTokens()
  const tokenIds = new Set(tokens.map(t => t.id))
  console.log('Tokens found in raid data:', tokens.length)

  const packageIds = new Set<number>()
  for (const item of new Items({ iconSrc: false })) packageIds.add(item.itemId)

  const raw = new Map<number, PerClass>()
  const unresolved: TokenInfo[] = []
  for (const token of tokens) {
    const html = await loadPage(token, cacheDir)
    if (html === null) {
      unresolved.push(token)
      continue
    }
    raw.set(token.id, rawRewards(html, token.path, tokenIds, packageIds))
  }

  const results: TokenResult[] = []
  const noReward: TokenInfo[] = []
  for (const token of tokens) {
    if (!raw.has(token.id)) continue
    const perClass = resolveSlots(token.id, raw)
    let copies = 0
    const allSlots = new Set<number>()
    for (const slots of perClass.values()) {
      copies = Math.max(copies, slots.size)
      for (const slot of slots) allSlots.add(slot)
    }
    if (copies === 0) {
      noReward.push(token)
      copies = 1
    }
    results.push({ token, copies, slots: [...allSlots].sort((a, b) => a - b) })
  }
  noReward.sort((a, b) => a.id - b.id)
  unresolved.sort((a, b) => a.id - b.id)

  const outputPath = path.join(__dirname, '../data/token-copies.ts')
  fs.writeFileSync(outputPath, generateFile(results, tokens.length, noReward, unresolved))
  console.log('Tokens with more than one copy:', results.filter(r => r.copies > 1).length)
  console.log('Unresolved tokens:', unresolved.length)
  console.log('Saved token copy counts')
}

main().catch(error => {
  console.error('fetch-token-copies failed:', error)
  process.exit(1)
})
