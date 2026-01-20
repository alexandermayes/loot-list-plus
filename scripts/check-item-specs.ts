import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  // Check some items that should have specs
  const itemsToCheck = [
    'Flameguard Gauntlets',
    'Mana Igniting Cord',
    'Ancient Cornerstone Grimoire',
    'Crown of Destruction'
  ]

  for (const itemName of itemsToCheck) {
    console.log(`\n${itemName}:`)

    // Get all items with this name (there may be duplicates)
    const { data: items } = await supabase
      .from('loot_items')
      .select('id, name, classification, allocation_cost')
      .eq('name', itemName)

    if (!items || items.length === 0) {
      console.log('  ❌ Item not found')
      continue
    }

    console.log(`  Found ${items.length} item(s)`)

    for (const item of items) {
      console.log(`\n  Item ID: ${item.id}`)
      console.log(`  Classification: ${item.classification}`)
      console.log(`  Allocation Cost: ${item.allocation_cost}`)

      // Get specs for this specific item
      const { data: specs } = await supabase
        .from('loot_item_classes')
        .select('spec_type, class_specs(name, wow_classes(name))')
        .eq('loot_item_id', item.id)

      if (!specs || specs.length === 0) {
        console.log('  ⚠️  No specs assigned!')
        continue
      }

      const primary = specs?.filter(s => s.spec_type === 'primary').map(s => {
        const spec = s.class_specs as any
        return `${spec.wow_classes.name} ${spec.name}`
      }) || []

      const secondary = specs?.filter(s => s.spec_type === 'secondary').map(s => {
        const spec = s.class_specs as any
        return `${spec.wow_classes.name} ${spec.name}`
      }) || []

      console.log(`  Primary (${primary.length}): ${primary.join(', ') || 'None'}`)
      console.log(`  Secondary (${secondary.length}): ${secondary.join(', ') || 'None'}`)
    }
  }
}

main()
