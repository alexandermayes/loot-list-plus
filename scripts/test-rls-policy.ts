import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  console.log('🔍 Testing RLS policy join path...\n')

  // Get a sample loot item
  const { data: item } = await supabase
    .from('loot_items')
    .select('id, name, raid_tier_id')
    .limit(1)
    .single()

  if (!item) {
    console.log('No loot items found')
    return
  }

  console.log('Sample loot item:', item)

  // Check the join path: loot_items → raid_tiers → expansions → guild
  const { data: tier } = await supabase
    .from('raid_tiers')
    .select('id, name, expansion_id')
    .eq('id', item.raid_tier_id)
    .single()

  console.log('\nRaid tier:', tier)

  if (tier) {
    const { data: expansion } = await supabase
      .from('expansions')
      .select('id, name, guild_id')
      .eq('id', tier.expansion_id)
      .single()

    console.log('\nExpansion:', expansion)

    if (expansion) {
      const { data: guildMembers } = await supabase
        .from('guild_members')
        .select('user_id, role, character_name')
        .eq('guild_id', expansion.guild_id)
        .in('role', ['Officer', 'Guild Master'])

      console.log('\nOfficers/GMs in this guild:', guildMembers)
    }
  }

  console.log('\n\n🧪 Now testing UPDATE with service role key (should work):')
  const { data: updateResult, error: updateError } = await supabase
    .from('loot_items')
    .update({ is_available: true })
    .eq('id', item.id)
    .select()

  if (updateError) {
    console.error('❌ Update failed:', updateError)
  } else {
    console.log('✅ Update succeeded:', updateResult)
  }
}

main()
