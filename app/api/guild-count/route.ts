import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

export const revalidate = 3600 // Cache for 1 hour

export async function GET() {
  const supabase = createServiceRoleClient()

  const [guildsRes, raidersRes, lootRes] = await Promise.all([
    supabase.from('guilds').select('*', { count: 'exact', head: true }),
    supabase.from('character_guild_memberships').select('*', { count: 'exact', head: true }),
    supabase.from('loot_history').select('*', { count: 'exact', head: true }),
  ])

  return NextResponse.json({
    guilds: guildsRes.count ?? 0,
    raiders: raidersRes.count ?? 0,
    loot: lootRes.count ?? 0,
  })
}
