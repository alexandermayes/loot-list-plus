import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const missingItems = [
  'Cauterizing Band',
  "Giantstalker's Bracers",
  "Giantstalker's Belt"
]

async function main() {
  for (const itemName of missingItems) {
    console.log(`\nSearching for: ${itemName}`)

    // Try exact match
    const { data: exact } = await supabase
      .from('loot_items')
      .select('id, name')
      .eq('name', itemName)

    if (exact && exact.length > 0) {
      console.log(`  ✅ Found exact match: ${exact[0].name}`)
      continue
    }

    // Try partial match
    const { data: partial } = await supabase
      .from('loot_items')
      .select('id, name')
      .ilike('name', `%${itemName.split(' ')[0]}%`)

    if (partial && partial.length > 0) {
      console.log(`  ⚠️  Similar items found:`)
      partial.slice(0, 5).forEach(item => console.log(`     - ${item.name}`))
    } else {
      console.log(`  ❌ No similar items found`)
    }
  }
}

main()
