import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const SUNWELL = 'a6c84c41-5aed-46ab-8396-e818bbff9524'

const specMapping: Record<string, string> = {
  'HPal': 'Paladin Holy',
  'Ret': 'Paladin Retribution',
  'PPal': 'Paladin Protection',
  'RD': 'Druid Restoration',
  'Frl': 'Druid Feral',
  'Bal': 'Druid Balance',
  'ProtW': 'Warrior Protection',
  'Fury': 'Warrior Arms/Fury',
  'HPri': 'Priest Holy/Disc',
  'SP': 'Priest Shadow',
  'Mage': 'Mage Mage',
  'Hunter': 'Hunter Hunter',
  'Warlock': 'Warlock Warlock',
  'Rogue': 'Rogue Rogue',
  'RS': 'Shaman Restoration',
  'Ele': 'Shaman Elemental',
  'Enh': 'Shaman Enhancement',
}

async function main() {
  console.log('Fixing missing items...\n')

  // Load class specs
  const { data: classSpecs } = await supabase
    .from('class_specs')
    .select('id, name, class_id, wow_classes(name)')

  const specNameToId: Record<string, { id: string, class_id: string }> = {}
  for (const spec of classSpecs || []) {
    const className = (spec as { wow_classes?: { name?: string } | null }).wow_classes?.name
    const specName = spec.name
    if (className && specName) {
      specNameToId[`${className} ${specName}`] = { id: spec.id, class_id: spec.class_id }
    }
  }

  // 1. Add Fel Conquerer Raiments to Sunwell
  const { data: existing } = await supabase
    .from('loot_items')
    .select('id')
    .eq('name', 'Fel Conquerer Raiments')
    .eq('raid_tier_id', SUNWELL)
    .single()

  if (!existing) {
    const { error } = await supabase.from('loot_items').insert({
      name: 'Fel Conquerer Raiments',
      wowhead_id: 34232,
      raid_tier_id: SUNWELL,
      item_slot: 'Chest',
      boss_name: 'Trash',
      classification: 'Unlimited',
      allocation_cost: 0,
      is_available: true
    })
    if (error) {
      console.error('Error adding Fel Conquerer Raiments:', error)
    } else {
      console.log('Added: Fel Conquerer Raiments')
    }
  } else {
    console.log('Fel Conquerer Raiments already exists')
  }

  // 2. Fix Rhythmic Cloak of Change wowhead_id (should be 34252)
  const { error: fixError } = await supabase
    .from('loot_items')
    .update({ wowhead_id: 34252 })
    .eq('name', 'Rhythmic Cloak of Change')

  if (fixError) {
    console.error('Error fixing Rhythmic Cloak:', fixError)
  } else {
    console.log('Fixed: Rhythmic Cloak of Change wowhead_id -> 34252')
  }

  // 3. Update Anetheron's Noose classification (it exists, just need to apply classification)
  const { data: nooseItems } = await supabase
    .from('loot_items')
    .select('id')
    .eq('name', "Anetheron's Noose")

  for (const item of nooseItems || []) {
    await supabase
      .from('loot_items')
      .update({ classification: 'Limited', allocation_cost: 1 })
      .eq('id', item.id)

    await supabase.from('loot_item_classes').delete().eq('loot_item_id', item.id)

    // Caster specs
    for (const shorthand of ['Mage', 'Warlock', 'SP', 'Ele', 'Bal']) {
      const fullSpecName = specMapping[shorthand]
      const specInfo = specNameToId[fullSpecName]
      if (specInfo) {
        await supabase.from('loot_item_classes').insert({
          loot_item_id: item.id,
          class_id: specInfo.class_id,
          spec_id: specInfo.id,
          spec_type: 'primary'
        })
      }
    }
    console.log("Updated: Anetheron's Noose (Limited)")
  }

  // 4. Update Fel Conquerer Raiments classification
  const { data: felItems } = await supabase
    .from('loot_items')
    .select('id')
    .eq('name', 'Fel Conquerer Raiments')

  for (const item of felItems || []) {
    await supabase
      .from('loot_items')
      .update({ classification: 'Unlimited', allocation_cost: 0 })
      .eq('id', item.id)

    await supabase.from('loot_item_classes').delete().eq('loot_item_id', item.id)

    // Physical specs (leather chest)
    for (const shorthand of ['Rogue', 'Frl']) {
      const fullSpecName = specMapping[shorthand]
      const specInfo = specNameToId[fullSpecName]
      if (specInfo) {
        await supabase.from('loot_item_classes').insert({
          loot_item_id: item.id,
          class_id: specInfo.class_id,
          spec_id: specInfo.id,
          spec_type: 'primary'
        })
      }
    }
    console.log('Updated: Fel Conquerer Raiments (Unlimited)')
  }

  console.log('\nDone!')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
