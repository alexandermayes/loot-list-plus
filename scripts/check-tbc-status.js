const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTBC() {
  const guildId = '1e13c37a-736b-4b2d-8da0-13cc3bbb62f3';

  // Get TBC expansion
  const { data: expansion } = await supabase
    .from('expansions')
    .select('id, name')
    .eq('guild_id', guildId)
    .eq('name', 'The Burning Crusade')
    .single();

  if (!expansion) {
    console.log('❌ TBC expansion not found - needs to be re-added');
    return;
  }

  console.log('✓ TBC Expansion ID:', expansion.id);

  // Get raid tiers
  const { data: tiers } = await supabase
    .from('raid_tiers')
    .select('id, name, is_active')
    .eq('expansion_id', expansion.id)
    .order('created_at');

  console.log('\n✓ Raid Tiers:', tiers?.length || 0);

  if (tiers && tiers.length > 0) {
    // Check item counts for each tier
    let totalItems = 0;
    for (const tier of tiers) {
      const { count } = await supabase
        .from('loot_items')
        .select('*', { count: 'exact', head: true })
        .eq('raid_tier_id', tier.id);

      totalItems += count || 0;
      console.log('  ' + (tier.is_active ? '✓' : ' '), tier.name + ':', count, 'items');
    }
    console.log('\n✓ Total Items:', totalItems);
  }

  // Check guild's active expansion
  const { data: guild } = await supabase
    .from('guilds')
    .select('active_expansion_id')
    .eq('id', guildId)
    .single();

  console.log('\nGuild active_expansion_id:', guild?.active_expansion_id);
  console.log('Is TBC active?', guild?.active_expansion_id === expansion.id ? 'YES' : 'NO');
}

checkTBC().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
