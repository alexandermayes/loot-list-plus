/**
 * Verify that all TBC items are assigned to the correct boss/raid
 * by checking wowhead drop sources.
 *
 * Usage: npx tsx scripts/verify-boss-assignments.ts
 */

import { tbcRaids } from '../data/tbc-raids'

interface ItemEntry {
  name: string
  wowheadId: number
  slot: string
  bossName: string
  raidName: string
}

// Flatten all items with their boss/raid context
function getAllItems(): ItemEntry[] {
  const items: ItemEntry[] = []
  for (const raid of tbcRaids) {
    for (const boss of raid.bosses) {
      for (const item of boss.items) {
        items.push({
          name: item.name,
          wowheadId: item.wowhead_id,
          slot: item.slot,
          bossName: boss.name,
          raidName: raid.name,
        })
      }
    }
  }
  return items
}

// Fetch wowhead page and extract drop source
async function getDropSource(wowheadId: number): Promise<{ boss: string | null; zone: string | null; raw: string }> {
  const url = `https://www.wowhead.com/tbc/item=${wowheadId}`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    })
    if (!res.ok) {
      return { boss: null, zone: null, raw: `HTTP ${res.status}` }
    }
    const html = await res.text()

    // Look for "Dropped by:" pattern in the tooltip/page
    // Wowhead embeds item source info in the page
    // Try to find the "Dropped by" or "Source" info

    // Method 1: Look for the droppedBy data in the page script
    const droppedByMatch = html.match(/Dropped by:.*?<a[^>]*>([^<]+)<\/a>/i)
    const zoneMatch = html.match(/Zone:.*?<a[^>]*>([^<]+)<\/a>/i)

    // Method 2: Look in the tooltip data
    const tooltipMatch = html.match(/"sourcemore":\s*\[\s*\{[^}]*"n":"([^"]+)"[^}]*"z":"?(\d+)"?/i)
    const tooltipBoss = tooltipMatch?.[1] || null

    // Method 3: Look for the list item source table
    const sourceTableMatch = html.match(/id="tab-dropped-by"[\s\S]*?<table[\s\S]*?<\/table>/)
    let firstBossFromTable: string | null = null
    if (sourceTableMatch) {
      const nameMatch = sourceTableMatch[0].match(/<a[^>]*class="[^"]*listitem-default[^"]*"[^>]*>([^<]+)<\/a>/)
      firstBossFromTable = nameMatch?.[1] || null
    }

    const boss = droppedByMatch?.[1] || tooltipBoss || firstBossFromTable
    const zone = zoneMatch?.[1] || null

    return { boss, zone, raw: boss ? `${boss} (${zone || 'unknown zone'})` : 'no drop source found' }
  } catch (err) {
    return { boss: null, zone: null, raw: `Error: ${err}` }
  }
}

// Rate-limited batch processing
async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  delayMs: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(processor))
    results.push(...batchResults)
    if (i + batchSize < items.length) {
      process.stdout.write(`  Checked ${Math.min(i + batchSize, items.length)}/${items.length} items...\r`)
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
  return results
}

// Normalize boss names for comparison (handle minor differences)
function normalizeBoss(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

// Known mappings where our boss name differs from wowhead's
const BOSS_NAME_ALIASES: Record<string, string[]> = {
  'trash': ['trash mob', 'trash', 'various', 'zone drop'],
  'timed event': ['timed event', 'zul\'aman'],
  'chess event': ['chess event', 'chess'],
  'shared': ['shared', 'multiple bosses'],
}

// Items that are known to have special sourcing (recipes, patterns, shared drops)
const SKIP_CATEGORIES = new Set(['Recipe', 'Mount', 'Quest'])

async function main() {
  const items = getAllItems()
  console.log(`Found ${items.length} items across ${tbcRaids.length} raids\n`)

  // Skip items that won't have clear boss assignments on wowhead
  const itemsToCheck = items.filter(i => !SKIP_CATEGORIES.has(i.slot) && i.bossName !== 'Trash')
  const skipped = items.filter(i => SKIP_CATEGORIES.has(i.slot) || i.bossName === 'Trash')
  console.log(`Checking ${itemsToCheck.length} items (skipping ${skipped.length} trash/recipe/mount/quest items)\n`)

  // Use the wowhead tooltip API which is faster and more reliable
  const mismatches: { item: ItemEntry; wowheadSource: string }[] = []
  const errors: { item: ItemEntry; error: string }[] = []

  // Use tooltip API to get source info more reliably
  async function checkItem(item: ItemEntry): Promise<void> {
    try {
      const tooltipUrl = `https://nether.wowhead.com/tooltip/item/${item.wowheadId}?dataEnv=8&locale=0`
      const res = await fetch(tooltipUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      if (!res.ok) {
        errors.push({ item, error: `HTTP ${res.status}` })
        return
      }
      const data = await res.json() as Record<string, unknown>

      // The tooltip JSON has a "tooltip" field with HTML
      // and sometimes "sourcemore" with drop info
      const tooltip = (data.tooltip as string) || ''
      const name = (data.name as string) || ''

      // Check if the item name matches
      if (name && normalizeBoss(name) !== normalizeBoss(item.name)) {
        mismatches.push({
          item,
          wowheadSource: `NAME MISMATCH: wowhead says "${name}", we have "${item.name}"`,
        })
      }

      // Check for droppedBy in the tooltip HTML
      const droppedByMatch = tooltip.match(/Dropped by:\s*([^<]+)/i)
      if (droppedByMatch) {
        const wowheadBoss = droppedByMatch[1].trim()
        const ourBoss = normalizeBoss(item.bossName)
        const theirBoss = normalizeBoss(wowheadBoss)

        // Check if names match or are known aliases
        const aliases = BOSS_NAME_ALIASES[ourBoss] || []
        if (ourBoss !== theirBoss && !aliases.includes(theirBoss) && !theirBoss.includes(ourBoss) && !ourBoss.includes(theirBoss)) {
          mismatches.push({
            item,
            wowheadSource: `BOSS: wowhead says "${wowheadBoss}", we have "${item.bossName}" (${item.raidName})`,
          })
        }
      }

      // Also check the sourcemore field if available
      const sourceMore = data.sourcemore as Array<{ n?: string; z?: number; t?: number }> | undefined
      if (sourceMore && sourceMore.length > 0) {
        const source = sourceMore[0]
        if (source.n) {
          const wowheadBoss = source.n
          const ourBoss = normalizeBoss(item.bossName)
          const theirBoss = normalizeBoss(wowheadBoss)

          const aliases = BOSS_NAME_ALIASES[ourBoss] || []
          if (ourBoss !== theirBoss && !aliases.includes(theirBoss) && !theirBoss.includes(ourBoss) && !ourBoss.includes(theirBoss)) {
            // Only add if not already caught by tooltip match
            const alreadyCaught = mismatches.some(m => m.item.wowheadId === item.wowheadId && m.wowheadSource.startsWith('BOSS:'))
            if (!alreadyCaught) {
              mismatches.push({
                item,
                wowheadSource: `BOSS (sourcemore): wowhead says "${wowheadBoss}", we have "${item.bossName}" (${item.raidName})`,
              })
            }
          }
        }
      }
    } catch (err) {
      errors.push({ item, error: String(err) })
    }
  }

  // Process in batches of 10 with 500ms delay between batches
  await processInBatches(itemsToCheck, 10, 500, checkItem)

  console.log(`\n\n=== RESULTS ===\n`)

  if (mismatches.length === 0) {
    console.log('No mismatches found! All items are correctly assigned.')
  } else {
    console.log(`Found ${mismatches.length} potential mismatches:\n`)
    for (const m of mismatches) {
      console.log(`  [${m.item.raidName}] ${m.item.name} (ID: ${m.item.wowheadId})`)
      console.log(`    ${m.wowheadSource}`)
      console.log()
    }
  }

  if (errors.length > 0) {
    console.log(`\n${errors.length} errors during checking:`)
    for (const e of errors) {
      console.log(`  ${e.item.name} (${e.item.wowheadId}): ${e.error}`)
    }
  }
}

main().catch(console.error)
