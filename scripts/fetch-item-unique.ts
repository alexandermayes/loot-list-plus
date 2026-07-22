/**
 * Fetch Unique-Equipped Flags from Wowhead
 *
 * Rings, trinkets and one-handers are worn in pairs, so a raider may want the
 * same item twice on their loot list (GH #181). Most raid rings and trinkets
 * are Unique / Unique-Equipped though, and those can only be worn once — so
 * the loot list needs to know which is which.
 *
 * This script extracts the wowhead_ids of every paired-slot item in the raid
 * data, asks Wowhead's tooltip API whether each is Unique, and generates
 * data/item-unique.ts. Sibling of scripts/fetch-item-icons.ts, same API, same
 * incremental cache, same auto-refresh workflow.
 *
 * Only paired-slot items are fetched: no other slot consults the map, and
 * keeping it small keeps it cheap to ship to the browser.
 *
 * Usage: npx tsx scripts/fetch-item-unique.ts
 */

import * as fs from 'fs'
import * as path from 'path'

// Import all raid data
import { moltenCore, blackwingLair, onyxiasLair, zulGurub, ruinsOfAhnQiraj, templeOfAhnQiraj, naxxramas } from '../data/classic-wow-raids'
import { karazhan, gruulslair, magtheridonslair, serpentshrinecavern, tempestkeep, mounthyjal, blacktemple, sunwellplateau, zulaman } from '../data/tbc-raids'
import { wrathRaids } from '../data/wrath-raids'
import { cataRaids } from '../data/cata-raids'
import { mopRaids } from '../data/mop-raids'
import { PAIRED_SLOTS } from '../domain/loot/slot-capacity'

interface UniqueMapping {
  [wowheadId: number]: boolean
}

interface RaidLike {
  bosses: Array<{ items: Array<{ wowhead_id: number; name: string; slot: string }> }>
}

/**
 * Wowhead serves different item data per "data environment" (game version), and
 * they disagree: Val'anyr reads Unique at ilvl 43 under dataEnv=1 but drops the
 * flag at its real ilvl 258 under dataEnv=11. No single env is right for every
 * expansion, so we query several and treat an item as Unique if ANY env says so.
 *
 * That direction is deliberate. A false "unique" costs a raider the ability to
 * list an item twice; a false "not unique" lets them build a list they can't
 * actually equip, which officers then allocate loot from. We take the cheap
 * error, not the expensive one.
 */
const DATA_ENVS = [1, 8, 11]

const paired = new Set(PAIRED_SLOTS)

// Extract paired-slot wowhead_ids from raid data
function extractPairedSlotItems(): { id: number; name: string }[] {
  const items: { id: number; name: string }[] = []
  const seenIds = new Set<number>()

  function addRaids(raids: RaidLike[]) {
    for (const raid of raids) {
      for (const boss of raid.bosses) {
        for (const item of boss.items) {
          if (!paired.has(item.slot) || seenIds.has(item.wowhead_id)) continue
          seenIds.add(item.wowhead_id)
          items.push({ id: item.wowhead_id, name: item.name })
        }
      }
    }
  }

  addRaids([moltenCore, blackwingLair, onyxiasLair, zulGurub, ruinsOfAhnQiraj, templeOfAhnQiraj, naxxramas])
  addRaids([karazhan, gruulslair, magtheridonslair, serpentshrinecavern, tempestkeep, mounthyjal, blacktemple, sunwellplateau, zulaman])
  addRaids(wrathRaids)
  addRaids(cataRaids)
  addRaids(mopRaids)

  return items
}

/**
 * Tooltips render the flag as a "Unique" or "Unique-Equipped" line, optionally
 * with a count ("Unique (3)"). Anchored to a tag boundary so item names
 * containing the word can't produce a false positive.
 */
const UNIQUE_LINE = /(^|>)Unique\b/

/**
 * Returns true/false when the item resolved in at least one data env, or null
 * when no env returned a usable tooltip — the caller leaves those unmapped
 * rather than guessing.
 */
async function fetchIsUnique(wowheadId: number): Promise<boolean | null> {
  let resolvedAnywhere = false

  for (const dataEnv of DATA_ENVS) {
    const url = `https://nether.wowhead.com/tooltip/item/${wowheadId}?dataEnv=${dataEnv}&locale=0`

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json',
        }
      })

      if (!response.ok) {
        console.error(`Failed to fetch ${wowheadId} (dataEnv=${dataEnv}): ${response.status}`)
        continue
      }

      const data = await response.json()
      // An id missing from this env comes back with an empty name/tooltip.
      if (!data.name || !data.tooltip) continue

      resolvedAnywhere = true
      if (UNIQUE_LINE.test(data.tooltip)) return true
    } catch (error) {
      console.error(`Error fetching ${wowheadId} (dataEnv=${dataEnv}):`, error)
    }
  }

  return resolvedAnywhere ? false : null
}

// Rate-limited batch fetching
async function fetchAllUniqueFlags(items: { id: number; name: string }[]): Promise<UniqueMapping> {
  const mapping: UniqueMapping = {}
  const batchSize = 10
  const delayMs = 500 // 500ms between batches to be nice to Wowhead

  console.log(`Fetching unique flags for ${items.length} paired-slot items (${DATA_ENVS.length} data envs each)...`)

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)

    const results = await Promise.all(
      batch.map(async (item) => ({ ...item, isUnique: await fetchIsUnique(item.id) }))
    )

    for (const result of results) {
      if (result.isUnique === null) {
        console.warn(`  Unresolved in every data env, leaving unmapped: ${result.name} (${result.id})`)
      } else {
        mapping[result.id] = result.isUnique
      }
    }

    const progress = Math.min(i + batchSize, items.length)
    console.log(`  Progress: ${progress}/${items.length} (${Math.round(progress / items.length * 100)}%)`)

    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return mapping
}

// Generate the TypeScript mapping file
function generateMappingFile(mapping: UniqueMapping): string {
  const sortedEntries = Object.entries(mapping).sort(([a], [b]) => Number(a) - Number(b))
  const lines = sortedEntries.map(([id, isUnique]) => `  ${id}: ${isUnique}`)
  const uniqueCount = sortedEntries.filter(([, isUnique]) => isUnique).length

  return `/**
 * Unique-Equipped Item Map
 *
 * Maps Wowhead item IDs to whether the item is Unique / Unique-Equipped, i.e.
 * whether a raider can wear two of them at once. Only covers paired slots
 * (${PAIRED_SLOTS.join(', ')}) — nothing else consults it.
 *
 * Read via isUniqueEquipped() in domain/loot/slot-capacity.ts. Ids missing from
 * this map are unknown, NOT non-unique — callers fall back to the conservative
 * per-slot default rather than assuming an item can be listed twice.
 *
 * Auto-generated by scripts/fetch-item-unique.ts
 * Generated: ${new Date().toISOString().split('T')[0]}
 * Total items: ${sortedEntries.length} (${uniqueCount} unique, ${sortedEntries.length - uniqueCount} not)
 */

export const ITEM_UNIQUE: Record<number, boolean> = {
${lines.join(',\n')}
}
`
}

async function main() {
  console.log('Extracting paired-slot wowhead IDs from raid data...')
  const items = extractPairedSlotItems()
  console.log(`Found ${items.length} paired-slot items`)

  // Check if we have an existing mapping to use as cache
  const outputPath = path.join(__dirname, '../data/item-unique.ts')
  let existingMapping: UniqueMapping = {}

  if (fs.existsSync(outputPath)) {
    try {
      const existing = await import('../data/item-unique')
      existingMapping = existing.ITEM_UNIQUE || {}
      console.log(`Loaded ${Object.keys(existingMapping).length} existing flags from cache`)
    } catch {
      console.log('No existing mapping found, fetching all flags')
    }
  }

  // Filter to only items we don't have a flag for
  const itemsToFetch = items.filter(item => existingMapping[item.id] === undefined)

  if (itemsToFetch.length === 0) {
    console.log('All unique flags already cached!')
    return
  }

  console.log(`Need to fetch ${itemsToFetch.length} new flags`)

  const newMapping = await fetchAllUniqueFlags(itemsToFetch)
  const finalMapping = { ...existingMapping, ...newMapping }

  console.log(`\nTotal flags: ${Object.keys(finalMapping).length}`)

  const content = generateMappingFile(finalMapping)
  fs.writeFileSync(outputPath, content)
  console.log(`\nSaved to ${outputPath}`)
}

main().catch(console.error)
