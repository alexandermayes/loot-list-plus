import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  // Check a few sample items
  const itemsToCheck = [
    'Band of Accuria',
    'Azuresong Mageblade',
    'Head of Onyxia'
  ]

  for (const itemName of itemsToCheck) {
    console.log(`\n${itemName}:`)

    const { data: item } = await supabase
      .from('loot_items')
      .select('id, name, classification, allocation_cost')
      .eq('name', itemName)
      .limit(1)
      .single()

    if (item) {
      console.log(`  Classification: ${item.classification}`)
      console.log(`  Allocation Cost: ${item.allocation_cost}`)

      // Get specs
      const { data: specs } = await supabase
        .from('loot_item_classes')
        .select('spec_type, class_specs(name, wow_classes(name))')
        .eq('loot_item_id', item.id)

      const primary = specs?.filter(s => s.spec_type === 'primary').map(s => {
        const spec = s.class_specs as { name: string; wow_classes: { name: string } }
        return `${spec.wow_classes.name} ${spec.name}`
      }) || []

      const secondary = specs?.filter(s => s.spec_type === 'secondary').map(s => {
        const spec = s.class_specs as { name: string; wow_classes: { name: string } }
        return `${spec.wow_classes.name} ${spec.name}`
      }) || []

      console.log(`  Primary: ${primary.join(', ') || 'None'}`)
      console.log(`  Secondary: ${secondary.join(', ') || 'None'}`)
    }
  }
}

main()
