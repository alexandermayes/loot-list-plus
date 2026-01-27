import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function main() {
  console.log('Applying RLS policy fix via Supabase client...\n')

  // The service role bypasses RLS, so we can directly manipulate the data
  // But we can't drop/create policies via the REST API

  // However, we CAN verify the current state and test if the fix is needed

  // Test 1: Check if we can insert into loot_item_classes for a non-active expansion
  console.log('Checking current RLS policy behavior...')

  // Get a loot item from any expansion
  const { data: lootItem, error: lootError } = await supabase
    .from('loot_items')
    .select(`
      id,
      name,
      raid_tier:raid_tiers!inner (
        id,
        name,
        expansion:expansions!inner (
          id,
          name,
          guild_id
        )
      )
    `)
    .limit(1)
    .single()

  if (lootError) {
    console.error('Error fetching loot item:', lootError)
    return
  }

  console.log('Found loot item:', lootItem.name)
  console.log('From expansion:', (lootItem.raid_tier as any).expansion.name)

  // Since we're using the service role, we should be able to insert/delete
  // But the RLS policies might still affect regular users

  console.log('\n⚠️  The RLS policies need to be updated via the Supabase SQL Editor.')
  console.log('   The service role client bypasses RLS, so we cannot test the policy behavior here.')
  console.log('\n📋 Please run this SQL in your Supabase SQL Editor:\n')

  const migrationSql = `-- Fix RLS policies for loot_item_classes to allow officers to modify items
-- in ANY expansion their guild has, not just the currently active one.

-- Drop existing policies
DROP POLICY IF EXISTS "Officers can insert loot item classes" ON loot_item_classes;
DROP POLICY IF EXISTS "Officers can delete loot item classes" ON loot_item_classes;

-- Create INSERT policy for officers - allows inserting for ANY guild expansion
CREATE POLICY "Officers can insert loot item classes" ON loot_item_classes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM loot_items li
      INNER JOIN raid_tiers rt ON rt.id = li.raid_tier_id
      INNER JOIN expansions e ON e.id = rt.expansion_id
      INNER JOIN characters c ON c.user_id = auth.uid()
      INNER JOIN character_guild_memberships cgm ON cgm.character_id = c.id AND cgm.guild_id = e.guild_id
      WHERE li.id = loot_item_classes.loot_item_id
      AND cgm.role IN ('Officer', 'Guild Master')
      AND cgm.is_active = true
    )
  );

-- Create DELETE policy for officers - allows deleting for ANY guild expansion
CREATE POLICY "Officers can delete loot item classes" ON loot_item_classes
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM loot_items li
      INNER JOIN raid_tiers rt ON rt.id = li.raid_tier_id
      INNER JOIN expansions e ON e.id = rt.expansion_id
      INNER JOIN characters c ON c.user_id = auth.uid()
      INNER JOIN character_guild_memberships cgm ON cgm.character_id = c.id AND cgm.guild_id = e.guild_id
      WHERE li.id = loot_item_classes.loot_item_id
      AND cgm.role IN ('Officer', 'Guild Master')
      AND cgm.is_active = true
    )
  );`

  console.log(migrationSql)

  console.log('\n\n🔗 Supabase SQL Editor URL:')
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0]
  console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
