import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

/**
 * GET /api/reserve-runs/items?raid_tier_id=X
 *
 * Public endpoint. Returns loot items for a given raid tier.
 */
export async function GET(request: NextRequest) {
  try {
    const raidTierId = request.nextUrl.searchParams.get('raid_tier_id')
    if (!raidTierId) {
      return NextResponse.json({ error: 'raid_tier_id is required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    const { data: items, error } = await serviceSupabase
      .from('loot_items')
      .select('id, name, boss_name, item_slot, wowhead_id, classification')
      .eq('raid_tier_id', raidTierId)
      .eq('is_available', true)
      .order('boss_name')

    if (error) {
      console.error('Error fetching items:', error)
      return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
    }

    return NextResponse.json({ success: true, items: items || [] })
  } catch (err) {
    console.error('Reserve items error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
