import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config({ path: '.env.local' })
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '')

async function main() {
  const guildId = 'b8c5779e-d093-4840-aa60-10016152a5c1' // Crucible
  const { data: exp } = await sb.from('expansions').select('id').eq('guild_id', guildId).eq('name', 'The Burning Crusade').single()

  // Get ALL phase 2 tiers
  const { data: tiers } = await sb.from('raid_tiers').select('id, name, phase, is_guild_active').eq('expansion_id', exp!.id).eq('phase', 2)
  console.log('Phase 2 tiers:')
  for (const t of tiers || []) {
    console.log('  ', t.name, '| guild_active:', t.is_guild_active)
  }

  const activeTierIds = (tiers || []).filter(t => t.is_guild_active).map(t => t.id)

  // Search for Royal Cloak across all phase 2 tiers
  const { data: cloak } = await sb.from('loot_items').select('id, name, raid_tier_id, is_available, item_slot').in('raid_tier_id', activeTierIds).ilike('name', '%Royal Cloak%')
  console.log('\nRoyal Cloak in Crucible Phase 2:', cloak?.length || 0, 'found')
  for (const c of cloak || []) {
    const tierName = tiers?.find(t => t.id === c.raid_tier_id)?.name
    console.log('  ', c.name, '| tier:', tierName, '| available:', c.is_available)
  }

  // Check Fang with bracket info for Atlas
  const protPallySpecId = 'ecbbee63-64c9-48fa-817e-a23efef596cb'
  const { data: items } = await sb.from('loot_items')
    .select('id, name, item_slot, weapon_type, armor_type, loot_item_classes(class_id, spec_id, spec_type)')
    .in('raid_tier_id', activeTierIds)
    .eq('is_available', true)
    .ilike('name', '%Fang of the Leviathan%')

  if (items && items.length > 0) {
    const item = items[0]
    const classes = item.loot_item_classes as { class_id: string; spec_id: string | null; spec_type: string }[]
    const isAllocated = classes && classes.length > 0
    const specEntry = classes?.find(c => c.spec_id === protPallySpecId)
    console.log('\nFang bracket simulation for Atlas (Prot Pally):')
    console.log('  is_allocated:', isAllocated)
    console.log('  spec entry found:', specEntry ? 'YES - ' + specEntry.spec_type : 'NO')
    const wouldShow = (specEntry && (specEntry.spec_type === 'primary' || specEntry.spec_type === 'secondary')) || isAllocated === false
    console.log('  Would show in brackets 1-4:', wouldShow)
  }

  // Count total available items visible to Atlas in Phase 2
  const { data: allItems } = await sb.from('loot_items')
    .select('id, name, loot_item_classes(class_id, spec_id, spec_type)')
    .in('raid_tier_id', activeTierIds)
    .eq('is_available', true)

  let primaryCount = 0
  let hiddenCount = 0
  const hiddenItems: string[] = []
  for (const item of allItems || []) {
    const classes = item.loot_item_classes as { class_id: string; spec_id: string | null; spec_type: string }[]
    const isAllocated = classes && classes.length > 0
    if (isAllocated) {
      const specEntry = classes.find(c => c.spec_id === protPallySpecId)
      if (specEntry) {
        primaryCount++
      } else {
        hiddenCount++
        if (hiddenItems.length < 5) hiddenItems.push(item.name)
      }
    }
  }
  console.log('\nPhase 2 items for Prot Pally:')
  console.log('  Primary/Secondary:', primaryCount)
  console.log('  Hidden (allocated but not prio):', hiddenCount)
  console.log('  Sample hidden:', hiddenItems)
  console.log('  Unallocated (visible to all):', (allItems?.length || 0) - primaryCount - hiddenCount)
}
main().catch(console.error)
