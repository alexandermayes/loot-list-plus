#!/usr/bin/env npx tsx
/**
 * Audit item-types.ts mappings against Wowhead tooltip API
 *
 * Parses the tooltip HTML to extract item class/subclass from
 * <!--scstartCLASS:SUBCLASS--> patterns.
 * Class 2 = Weapon, Class 4 = Armor
 *
 * Usage: npx tsx scripts/audit-item-types.ts [--fix]
 */

import { ITEM_TYPES } from '../data/item-types'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const WEAPON_SUBCLASS: Record<number, string> = {
  0: 'One-Handed Axe', 1: 'Two-Handed Axe', 2: 'Bow', 3: 'Gun',
  4: 'One-Handed Mace', 5: 'Two-Handed Mace', 6: 'Polearm',
  7: 'One-Handed Sword', 8: 'Two-Handed Sword', 10: 'Staff',
  13: 'Fist Weapon', 15: 'Dagger', 16: 'Thrown', 18: 'Crossbow', 19: 'Wand',
}

const ARMOR_SUBCLASS: Record<number, string> = {
  1: 'Cloth', 2: 'Leather', 3: 'Mail', 4: 'Plate', 6: 'Shield',
}

const SLOT_NAMES: Record<string, boolean> = {
  'Neck': true, 'Back': true, 'Finger': true, 'Trinket': true,
  'Held In Off-hand': true, 'Relic': true, 'Libram': true,
  'Totem': true, 'Idol': true,
}

interface WowheadResult {
  name: string
  weaponType?: string
  armorType?: string
  slotText?: string
  isClassAgnostic: boolean
}

async function fetchItemFromWowhead(id: number): Promise<WowheadResult | null> {
  try {
    // Try TBC first (dataEnv=8), then Classic (dataEnv=4)
    for (const env of [8, 4]) {
      const res = await fetch(
        `https://nether.wowhead.com/tooltip/item/${id}?dataEnv=${env}&locale=0`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      )
      if (!res.ok) continue
      const data = await res.json()
      if (!data.tooltip) continue

      const tooltip = data.tooltip as string

      // Extract item type from <!--scstartCLASS:SUBCLASS-->
      // Class 2 = Weapon, Class 4 = Armor
      const scMatch = tooltip.match(/<!--scstart(\d+):(\d+)-->/)
      let weaponType: string | undefined
      let armorType: string | undefined

      if (scMatch) {
        const itemClass = parseInt(scMatch[1])
        const subclass = parseInt(scMatch[2])

        if (itemClass === 2) {
          weaponType = WEAPON_SUBCLASS[subclass]
        } else if (itemClass === 4) {
          if (subclass === 6) {
            weaponType = 'Shield'
          } else {
            armorType = ARMOR_SUBCLASS[subclass]
          }
        }
      }

      // Extract slot text from the tooltip table
      // Pattern: <td>SLOT_NAME</td><th><!--scstart...
      const slotMatch = tooltip.match(/<td>([^<]+)<\/td><th><!--scstart/)
      const slotText = slotMatch?.[1]?.trim()

      const isClassAgnostic = !!(slotText && SLOT_NAMES[slotText])

      return { name: data.name, weaponType, armorType, slotText, isClassAgnostic }
    }
    return null
  } catch {
    return null
  }
}

async function main() {
  const shouldFix = process.argv.includes('--fix')
  const entries = Object.entries(ITEM_TYPES)
  console.log(`Auditing ${entries.length} item type mappings against Wowhead...`)
  if (shouldFix) console.log('(--fix mode: will generate corrected mappings)\n')
  else console.log('(run with --fix to auto-correct)\n')

  const errors: Array<{ id: number; name: string; current: string; expected: string; fix: { weapon_type?: string; armor_type?: string } | null }> = []
  const fetchErrors: string[] = []
  let correct = 0

  const batchSize = 5
  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(async ([idStr, mapping]) => {
        const id = parseInt(idStr)
        const info = await fetchItemFromWowhead(id)
        return { id, mapping, info }
      })
    )

    for (const { id, mapping, info } of results) {
      if (!info) {
        fetchErrors.push(`  ${id}: Could not fetch from Wowhead`)
        continue
      }

      let mismatch = false

      // Check weapon_type mapping
      if (mapping.weapon_type) {
        if (info.isClassAgnostic && !info.weaponType) {
          // Item is class-agnostic, mapping has weapon_type — likely wrong (wowhead_id collision)
          errors.push({
            id, name: info.name,
            current: `weapon_type="${mapping.weapon_type}"`,
            expected: `class-agnostic ${info.slotText} slot (no type needed)`,
            fix: null, // Remove the entry
          })
          mismatch = true
        } else if (info.weaponType && mapping.weapon_type !== info.weaponType) {
          errors.push({
            id, name: info.name,
            current: `weapon_type="${mapping.weapon_type}"`,
            expected: `weapon_type="${info.weaponType}"`,
            fix: { weapon_type: info.weaponType },
          })
          mismatch = true
        } else if (!info.weaponType && info.armorType) {
          errors.push({
            id, name: info.name,
            current: `weapon_type="${mapping.weapon_type}"`,
            expected: `armor_type="${info.armorType}" (it's armor, not a weapon)`,
            fix: { armor_type: info.armorType },
          })
          mismatch = true
        }
      }

      // Check armor_type mapping
      if (mapping.armor_type) {
        if (info.isClassAgnostic) {
          // Harmless but unnecessary
        } else if (info.armorType && mapping.armor_type !== info.armorType) {
          errors.push({
            id, name: info.name,
            current: `armor_type="${mapping.armor_type}"`,
            expected: `armor_type="${info.armorType}"`,
            fix: { armor_type: info.armorType },
          })
          mismatch = true
        } else if (info.weaponType && !info.armorType) {
          errors.push({
            id, name: info.name,
            current: `armor_type="${mapping.armor_type}"`,
            expected: `weapon_type="${info.weaponType}" (it's a weapon, not armor)`,
            fix: { weapon_type: info.weaponType },
          })
          mismatch = true
        }
      }

      if (!mismatch) correct++
    }

    if ((i + batchSize) % 50 === 0 || i + batchSize >= entries.length) {
      process.stdout.write(`  Checked ${Math.min(i + batchSize, entries.length)}/${entries.length}...\r`)
    }

    if (i + batchSize < entries.length) {
      await new Promise(r => setTimeout(r, 200))
    }
  }

  console.log(`\n\n${'='.repeat(60)}`)
  console.log(`AUDIT RESULTS`)
  console.log(`${'='.repeat(60)}`)
  console.log(`  Correct: ${correct}`)
  console.log(`  Errors: ${errors.length}`)
  console.log(`  Fetch failures: ${fetchErrors.length}`)

  if (errors.length > 0) {
    console.log(`\nMISMATCHES:`)
    for (const e of errors) {
      console.log(`  ${e.id} ${e.name}: ${e.current} → should be ${e.expected}`)
    }
  }

  if (fetchErrors.length > 0) {
    console.log(`\nFETCH FAILURES:`)
    for (const f of fetchErrors) console.log(f)
  }

  // Apply fixes
  if (shouldFix && errors.length > 0) {
    console.log(`\nApplying ${errors.length} fixes to data/item-types.ts...`)
    const filePath = resolve(process.cwd(), 'data/item-types.ts')
    let content = readFileSync(filePath, 'utf8')

    for (const e of errors) {
      if (e.fix === null) {
        // Remove the entry (comment it out)
        const regex = new RegExp(`^(\\s*)${e.id}:.*$`, 'gm')
        content = content.replace(regex, `$1// ${e.id}: ${e.name} — removed (class-agnostic slot, no type needed)`)
      } else if (e.fix.weapon_type) {
        const regex = new RegExp(`(${e.id}:\\s*\\{)\\s*(armor_type|weapon_type):\\s*'[^']*'`, 'g')
        content = content.replace(regex, `$1 weapon_type: '${e.fix.weapon_type}'`)
      } else if (e.fix.armor_type) {
        const regex = new RegExp(`(${e.id}:\\s*\\{)\\s*(armor_type|weapon_type):\\s*'[^']*'`, 'g')
        content = content.replace(regex, `$1 armor_type: '${e.fix.armor_type}'`)
      }
    }

    writeFileSync(filePath, content)
    console.log('Done. Review changes with: git diff data/item-types.ts')
  }
}

main().catch(console.error)
