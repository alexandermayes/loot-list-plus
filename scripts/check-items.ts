import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function main() {
  const { data } = await supabase
    .from('loot_items')
    .select('id, name, item_slot, weapon_type, armor_type, wowhead_id, roles, loot_item_classes(class_id, spec_id, spec_type)')
    .or('name.ilike.%Fang of Leviathan%,name.ilike.%Royal Cloak of the Sunstriders%')

  // Get class names
  const { data: classes } = await supabase.from('wow_classes').select('id, name')
  const classMap = new Map((classes || []).map((c: { id: string; name: string }) => [c.id, c.name]))

  // Get spec names
  const { data: specs } = await supabase.from('class_specs').select('id, name')
  const specMap = new Map((specs || []).map((s: { id: string; name: string }) => [s.id, s.name]))

  for (const item of data || []) {
    console.log('Name:', item.name)
    console.log('  Slot:', item.item_slot)
    console.log('  Weapon type:', item.weapon_type || 'NULL')
    console.log('  Armor type:', item.armor_type || 'NULL')
    console.log('  Wowhead ID:', item.wowhead_id)
    console.log('  Roles:', JSON.stringify(item.roles))

    const lic = item.loot_item_classes as { class_id: string; spec_id: string | null; spec_type: string }[]
    if (lic && lic.length > 0) {
      console.log('  Spec assignments:')
      for (const entry of lic) {
        const cn = classMap.get(entry.class_id) || entry.class_id
        const sn = entry.spec_id ? specMap.get(entry.spec_id) || entry.spec_id : '(all specs)'
        console.log('    -', cn, '/', sn, ':', entry.spec_type)
      }
    } else {
      console.log('  Spec assignments: NONE')
    }
    console.log()
  }
}
main().catch(console.error)
