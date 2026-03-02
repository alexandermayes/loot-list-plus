#!/usr/bin/env npx tsx
/**
 * Populate missing armor_type and weapon_type for loot_items by fetching from Wowhead.
 *
 * 1. Queries loot_items where BOTH armor_type and weapon_type are NULL
 *    and the item_slot is NOT class-agnostic (Neck, Back, Finger, etc.)
 * 2. Deduplicates by wowhead_id
 * 3. Fetches tooltip from Wowhead and parses the <!--scstartCLASS:SUBCLASS--> pattern
 * 4. Updates ALL loot_items rows matching each wowhead_id
 *
 * Usage: npx tsx scripts/populate-missing-types.ts [--dry-run]
 */

import { createClient } from '@supabase/supabase-js'

// ── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://zjnhjstbqekudlsozsvi.supabase.co'
const SUPABASE_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpqbmhqc3RicWVrdWRsc296c3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzg2MzQ5NiwiZXhwIjoyMDgzNDM5NDk2fQ.WLhgHYY7VhgNrwG0dblXhyeQnvpszPd13uONqljtCG4'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const DRY_RUN = process.argv.includes('--dry-run')

// Slots that don't need armor/weapon type
const CLASS_AGNOSTIC_SLOTS = [
  'Neck', 'Back', 'Finger', 'Trinket',
  'Relic', 'Idol', 'Totem', 'Libram',
  'Token', 'Mount', 'Recipe',
  'Held In Off-hand', 'Off-Hand', 'Off Hand',
  'Quest', 'Bag', 'Book',
]

// ── Wowhead class/subclass mappings ─────────────────────────────────────────

const WEAPON_SUBCLASS: Record<number, string> = {
  0: 'One-Handed Axe',
  1: 'Two-Handed Axe',
  2: 'Bow',
  3: 'Gun',
  4: 'One-Handed Mace',
  5: 'Two-Handed Mace',
  6: 'Polearm',
  7: 'One-Handed Sword',
  8: 'Two-Handed Sword',
  10: 'Staff',
  13: 'Fist Weapon',
  15: 'Dagger',
  16: 'Thrown',
  18: 'Crossbow',
  19: 'Wand',
}

const ARMOR_SUBCLASS: Record<number, string> = {
  1: 'Cloth',
  2: 'Leather',
  3: 'Mail',
  4: 'Plate',
  6: 'Shield',
}

// ── Wowhead tooltip fetcher ─────────────────────────────────────────────────

interface ParsedItem {
  name: string
  weaponType: string | null
  armorType: string | null
  slotText: string | null
}

async function fetchFromWowhead(wowheadId: number): Promise<ParsedItem | null> {
  // Try TBC (dataEnv=8) first, then Classic (dataEnv=4)
  for (const env of [8, 4]) {
    try {
      const res = await fetch(
        `https://nether.wowhead.com/tooltip/item/${wowheadId}?dataEnv=${env}&locale=0`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      )
      if (!res.ok) continue
      const data = await res.json()
      if (!data.tooltip) continue

      const tooltip = data.tooltip as string

      // Extract class:subclass from <!--scstartCLASS:SUBCLASS-->
      const scMatch = tooltip.match(/<!--scstart(\d+):(\d+)-->/)
      let weaponType: string | null = null
      let armorType: string | null = null

      if (scMatch) {
        const itemClass = parseInt(scMatch[1])
        const subclass = parseInt(scMatch[2])

        if (itemClass === 2) {
          // Weapon
          weaponType = WEAPON_SUBCLASS[subclass] || null
        } else if (itemClass === 4) {
          if (subclass === 6) {
            // Shield is armor class 4 subclass 6, but we store it as weapon_type
            weaponType = 'Shield'
          } else {
            armorType = ARMOR_SUBCLASS[subclass] || null
          }
        }
      }

      // Extract slot text: <td>SLOT_NAME</td><th><!--scstart...
      const slotMatch = tooltip.match(/<td>([^<]+)<\/td><th><!--scstart/)
      const slotText = slotMatch?.[1]?.trim() || null

      return { name: data.name || `Item ${wowheadId}`, weaponType, armorType, slotText }
    } catch {
      // Try next env
      continue
    }
  }
  return null
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Populate missing armor_type/weapon_type from Wowhead`)
  if (DRY_RUN) console.log('(DRY RUN - no database writes)\n')
  else console.log('')

  // Step 1: Query items with NULL armor_type AND NULL weapon_type,
  //         excluding class-agnostic slots.
  //         Paginate because Supabase limits to 1000 rows per request.
  console.log('Fetching items with missing types...')

  const items: Array<{ id: string; name: string; item_slot: string; wowhead_id: number; armor_type: string | null; weapon_type: string | null }> = []
  const PAGE_SIZE = 1000
  let offset = 0

  while (true) {
    const { data: page, error } = await supabase
      .from('loot_items')
      .select('id, name, item_slot, wowhead_id, armor_type, weapon_type')
      .is('armor_type', null)
      .is('weapon_type', null)
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) {
      console.error('Error fetching items:', error.message)
      process.exit(1)
    }

    if (!page || page.length === 0) break
    items.push(...page)
    console.log(`  Fetched ${items.length} rows so far...`)
    if (page.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  if (items.length === 0) {
    console.log('No items with missing types found.')
    process.exit(0)
  }

  // Filter out class-agnostic slots
  const needsType = items.filter(
    item => !CLASS_AGNOSTIC_SLOTS.includes(item.item_slot)
  )

  console.log(`  Total NULL items: ${items.length}`)
  console.log(`  After excluding class-agnostic slots: ${needsType.length}`)

  if (needsType.length === 0) {
    console.log('All remaining items are in class-agnostic slots. Nothing to do.')
    process.exit(0)
  }

  // Step 2: Deduplicate by wowhead_id
  const byWowheadId = new Map<number, typeof needsType>()
  for (const item of needsType) {
    const existing = byWowheadId.get(item.wowhead_id) || []
    existing.push(item)
    byWowheadId.set(item.wowhead_id, existing)
  }

  const uniqueIds = Array.from(byWowheadId.keys())
  console.log(`  Unique wowhead_ids to fetch: ${uniqueIds.length}\n`)

  // Step 3: Fetch from Wowhead and update
  let fetchSuccess = 0
  let fetchFailed = 0
  let updatedRows = 0
  let skippedNoType = 0
  const failures: { wowheadId: number; name: string; reason: string }[] = []

  for (let i = 0; i < uniqueIds.length; i++) {
    const wowheadId = uniqueIds[i]
    const itemGroup = byWowheadId.get(wowheadId)!
    const sampleName = itemGroup[0].name
    const sampleSlot = itemGroup[0].item_slot

    // Progress
    if ((i + 1) % 10 === 0 || i === 0 || i === uniqueIds.length - 1) {
      process.stdout.write(`  [${i + 1}/${uniqueIds.length}] Fetching ${wowheadId} (${sampleName})...\r`)
    }

    const result = await fetchFromWowhead(wowheadId)

    if (!result) {
      fetchFailed++
      failures.push({ wowheadId, name: sampleName, reason: 'Fetch failed (no tooltip data)' })
      await sleep(100)
      continue
    }

    fetchSuccess++

    // Determine what to set
    const updateData: { armor_type?: string; weapon_type?: string } = {}

    if (result.armorType) {
      updateData.armor_type = result.armorType
    }
    if (result.weaponType) {
      updateData.weapon_type = result.weaponType
    }

    if (!updateData.armor_type && !updateData.weapon_type) {
      skippedNoType++
      // Log these - they might be miscategorized class-agnostic items
      failures.push({
        wowheadId,
        name: sampleName,
        reason: `No type found in tooltip (slot: ${sampleSlot}, wowhead slot: ${result.slotText || 'unknown'})`
      })
      await sleep(100)
      continue
    }

    // Step 4: Update ALL rows with this wowhead_id
    if (!DRY_RUN) {
      const { error: updateError, count } = await supabase
        .from('loot_items')
        .update(updateData)
        .eq('wowhead_id', wowheadId)
        .is('armor_type', null)
        .is('weapon_type', null)

      if (updateError) {
        failures.push({ wowheadId, name: sampleName, reason: `Update failed: ${updateError.message}` })
      } else {
        const rowCount = itemGroup.length
        updatedRows += rowCount
        console.log(
          `  [${i + 1}/${uniqueIds.length}] ${sampleName} (${wowheadId}): ` +
          `${updateData.armor_type ? `armor=${updateData.armor_type}` : ''}` +
          `${updateData.weapon_type ? `weapon=${updateData.weapon_type}` : ''}` +
          ` (${rowCount} rows)`
        )
      }
    } else {
      const rowCount = itemGroup.length
      updatedRows += rowCount
      console.log(
        `  [${i + 1}/${uniqueIds.length}] [DRY RUN] ${sampleName} (${wowheadId}): ` +
        `${updateData.armor_type ? `armor=${updateData.armor_type}` : ''}` +
        `${updateData.weapon_type ? `weapon=${updateData.weapon_type}` : ''}` +
        ` (${rowCount} rows)`
      )
    }

    // Rate limit
    await sleep(100)
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n${'='.repeat(60)}`)
  console.log('RESULTS')
  console.log('='.repeat(60))
  console.log(`  Unique wowhead_ids fetched: ${fetchSuccess}/${uniqueIds.length}`)
  console.log(`  Fetch failures: ${fetchFailed}`)
  console.log(`  No type found (possibly misc/class-agnostic): ${skippedNoType}`)
  console.log(`  Total DB rows updated: ${updatedRows}`)
  if (DRY_RUN) console.log('  (DRY RUN - no actual writes)')

  if (failures.length > 0) {
    console.log(`\nFAILURES/SKIPS (${failures.length}):`)
    for (const f of failures) {
      console.log(`  ${f.wowheadId} (${f.name}): ${f.reason}`)
    }
  }
}

main()
  .then(() => {
    console.log('\nDone.')
    process.exit(0)
  })
  .catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
