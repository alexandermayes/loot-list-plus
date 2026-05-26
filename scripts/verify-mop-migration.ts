import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(url, key)

const NEW_IDS = [
  86183, 86184, 86185, 86186, 86187, 86188, 86189, 86190, 86191, 86192,
  95216, 95217, 95218, 95219, 95220, 95221, 95222, 95223, 95224,
  95202, 95203, 95204, 95205, 95206,
  95207, 95208, 95209, 95210, 95211, 95212, 95213, 95214, 95215,
  105857, 105858, 105859, 105866, 105867, 105868,
]

async function main() {
  const { count: guildsCount } = await supabase
    .from('expansions').select('guild_id', { count: 'exact', head: true })
    .eq('name', 'Mists of Pandaria')
  console.log('MoP-enabled guilds:', guildsCount)

  const { data: items, count: itemRowsCount } = await supabase
    .from('loot_items').select('id, name, boss_name, item_slot, wowhead_id', { count: 'exact' })
    .in('wowhead_id', NEW_IDS)
  console.log('loot_items rows with new IDs (across all guilds):', itemRowsCount)
  console.log('expected:', NEW_IDS.length, '*', guildsCount, '=', NEW_IDS.length * (guildsCount ?? 0))

  const byBoss: Record<string, number> = {}
  for (const it of items ?? []) byBoss[it.boss_name] = (byBoss[it.boss_name] || 0) + 1
  console.log('rows by boss_name:', byBoss)

  const essenceItems = (items ?? []).filter(i => i.item_slot === 'Token')
  const essenceIds = essenceItems.map(i => i.id)
  console.log('essence token rows total:', essenceItems.length)

  const { count: classRows } = await supabase
    .from('loot_item_classes').select('id', { count: 'exact', head: true })
    .in('loot_item_id', essenceIds)
  console.log('loot_item_classes rows for essences:', classRows)
  console.log('expected per-guild: (3 Conqueror + 4 Protector + 4 Vanquisher) classes * 2 (N+H) variants = 22')
  console.log('total expected:', 22 * (guildsCount ?? 0))
}

main().catch(e => { console.error(e); process.exit(1) })
