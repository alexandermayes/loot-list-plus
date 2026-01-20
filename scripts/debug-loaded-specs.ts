import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  console.log('🔍 Checking spec data loading...\n')

  // Get a few MC items
  const { data: items } = await supabase
    .from('loot_items')
    .select('id, name, classification')
    .in('name', ['Flameguard Gauntlets', 'Mana Igniting Cord', 'Band of Accuria'])
    .limit(3)

  if (!items || items.length === 0) {
    console.log('No items found')
    return
  }

  const itemIds = items.map(i => i.id)

  // Query exactly like the page does
  const { data: specRelations } = await supabase
    .from('loot_item_classes')
    .select('loot_item_id, spec_id, spec_type')
    .in('loot_item_id', itemIds)
    .not('spec_id', 'is', null)

  console.log(`Found ${specRelations?.length || 0} spec relations for ${items.length} items\n`)

  for (const item of items) {
    console.log(`${item.name} (${item.classification}):`)
    console.log(`  ID: ${item.id}`)

    const itemSpecs = specRelations?.filter(r => r.loot_item_id === item.id) || []
    const primary = itemSpecs.filter(s => s.spec_type === 'primary')
    const secondary = itemSpecs.filter(s => s.spec_type === 'secondary')

    console.log(`  Primary specs: ${primary.length}`)
    primary.forEach(s => console.log(`    - ${s.spec_id}`))

    console.log(`  Secondary specs: ${secondary.length}`)
    secondary.forEach(s => console.log(`    - ${s.spec_id}`))
    console.log()
  }
}

main()
