import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  const userId = '46afad06-e278-4a33-89c0-154916abfee0'

  console.log('🔍 Checking role for user:', userId, '\n')

  const { data: memberships } = await supabase
    .from('guild_members')
    .select('*, guilds(name)')
    .eq('user_id', userId)

  console.log('Guild memberships:', JSON.stringify(memberships, null, 2))

  // Check the RLS policy path
  const { data: lootItem } = await supabase
    .from('loot_items')
    .select('id, name, raid_tier_id')
    .limit(1)
    .single()

  if (lootItem) {
    console.log('\n\nTesting RLS policy for item:', lootItem.name)

    // Test the exact join path from the RLS policy
    const { data: checkPath } = await supabase
      .from('raid_tiers')
      .select(`
        id,
        name,
        expansions!inner(
          id,
          name,
          guild_id,
          guild_members!inner(
            user_id,
            role
          )
        )
      `)
      .eq('id', lootItem.raid_tier_id)
      .eq('expansions.guild_members.user_id', userId)

    console.log('\nRLS policy join result:', JSON.stringify(checkPath, null, 2))
  }
}

main()
