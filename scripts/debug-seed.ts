import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load env
const envPath = resolve(process.cwd(), '.env.local')
const envFile = readFileSync(envPath, 'utf8')
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    let value = valueParts.join('=').trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key.trim()] = value
  }
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function debug() {
  console.log('='.repeat(60))
  console.log('Debugging Seed Data')
  console.log('='.repeat(60))

  // Check test guilds
  const { data: guilds, error: guildErr } = await supabase
    .from('guilds')
    .select('id, name')
    .like('name', 'TEST_%')

  console.log('\n1. Test Guilds:', guilds?.length || 0)
  if (guildErr) console.log('   Error:', guildErr.message)

  if (!guilds || guilds.length === 0) {
    console.log('No test guilds found!')
    return
  }

  for (const guild of guilds) {
    console.log(`\n--- Guild: ${guild.name} ---`)

    // Check expansion
    const { data: expansions, error: expErr } = await supabase
      .from('expansions')
      .select('id, name')
      .eq('guild_id', guild.id)

    console.log('2. Expansions:', expansions?.length || 0, expansions?.map(e => e.name))
    if (expErr) console.log('   Error:', expErr.message)

    if (!expansions || expansions.length === 0) continue

    // Check raid tiers
    const { data: tiers, error: tierErr } = await supabase
      .from('raid_tiers')
      .select('id, name')
      .eq('expansion_id', expansions[0].id)

    console.log('3. Raid Tiers:', tiers?.length || 0, tiers?.map(t => t.name))
    if (tierErr) console.log('   Error:', tierErr.message)

    if (!tiers || tiers.length === 0) continue

    // Check loot items
    const { data: items, error: itemErr } = await supabase
      .from('loot_items')
      .select('id, name')
      .eq('raid_tier_id', tiers[0].id)

    console.log('4. Loot Items:', items?.length || 0)
    if (itemErr) console.log('   Error:', itemErr.message)
    if (items) console.log('   Items:', items.map(i => i.name))

    // Check submissions
    const { data: subs, error: subErr } = await supabase
      .from('loot_submissions')
      .select('id')
      .eq('guild_id', guild.id)

    console.log('5. Submissions:', subs?.length || 0)
    if (subErr) console.log('   Error:', subErr.message)
  }

  // Try to manually insert a submission
  console.log('\n--- Testing Manual Submission Insert ---')

  const testGuild = guilds[0]
  const { data: exp } = await supabase
    .from('expansions')
    .select('id')
    .eq('guild_id', testGuild.id)
    .single()

  if (!exp) {
    console.log('No expansion found')
    return
  }

  const { data: tier } = await supabase
    .from('raid_tiers')
    .select('id')
    .eq('expansion_id', exp.id)
    .single()

  if (!tier) {
    console.log('No tier found')
    return
  }

  const { data: item } = await supabase
    .from('loot_items')
    .select('id')
    .eq('raid_tier_id', tier.id)
    .limit(1)
    .single()

  console.log('Item for test:', item)

  const { data: char } = await supabase
    .from('character_guild_memberships')
    .select('character_id')
    .eq('guild_id', testGuild.id)
    .limit(1)
    .single()

  console.log('Character for test:', char)

  if (item && char) {
    const { data: newSub, error: insertErr } = await supabase
      .from('loot_submissions')
      .insert({
        guild_id: testGuild.id,
        raid_tier_id: tier.id,
        item_id: item.id,
        character_id: char.character_id,
        rank: 1,
      })
      .select()

    console.log('Insert result:', newSub)
    if (insertErr) console.log('Insert error:', insertErr)
  }
}

debug()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal:', err)
    process.exit(1)
  })
