/**
 * Analyze the loot data to find items that drop from multiple bosses
 * This will help us understand what needs to be consolidated
 */

import { classicRaids } from '../data/classic-wow-raids'

interface ItemOccurrence {
  name: string
  wowhead_id: number
  slot: string
  bosses: string[]
  raid: string
}

function analyzeDuplicates() {
  console.log('🔍 Analyzing loot data for items that drop from multiple bosses...')
  console.log('=' .repeat(70))
  console.log()

  for (const raid of classicRaids) {
    console.log(`📁 ${raid.name}`)
    console.log('-' .repeat(70))

    // Track items by wowhead_id (most reliable unique identifier)
    const itemMap = new Map<number, ItemOccurrence>()

    for (const boss of raid.bosses) {
      for (const item of boss.items) {
        if (itemMap.has(item.wowhead_id)) {
          // Item already seen, add this boss
          itemMap.get(item.wowhead_id)!.bosses.push(boss.name)
        } else {
          // First time seeing this item
          itemMap.set(item.wowhead_id, {
            name: item.name,
            wowhead_id: item.wowhead_id,
            slot: item.slot,
            bosses: [boss.name],
            raid: raid.name
          })
        }
      }
    }

    // Find items that drop from multiple bosses
    const duplicates = Array.from(itemMap.values()).filter(item => item.bosses.length > 1)

    if (duplicates.length > 0) {
      console.log(`   Found ${duplicates.length} items that drop from multiple bosses:`)
      console.log()

      duplicates.forEach(item => {
        console.log(`   • ${item.name} (${item.slot})`)
        console.log(`     Bosses: ${item.bosses.join(', ')}`)
      })
      console.log()
    } else {
      console.log(`   ✅ No duplicate items found`)
      console.log()
    }
  }

  console.log('=' .repeat(70))
  console.log('✨ Analysis complete!')
}

analyzeDuplicates()
