import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { EXPANSION_PHASES, getExpansionSlug } from '@/data/expansion-phases'

/**
 * GET /api/reserve-runs/raid-tiers?expansion=The+Burning+Crusade
 *
 * Public endpoint. Returns available raid tiers for a given expansion.
 * Uses any guild's seeded data since items are identical across guilds.
 */
export async function GET(request: NextRequest) {
  try {
    const expansionName = request.nextUrl.searchParams.get('expansion')
    if (!expansionName) {
      return NextResponse.json({ error: 'expansion parameter is required' }, { status: 400 })
    }

    const slug = getExpansionSlug(expansionName)
    if (!slug || !EXPANSION_PHASES[slug]) {
      return NextResponse.json({ error: 'Unknown expansion' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    // Find raid tiers for this expansion from any guild's data
    // Since all guilds seed the same items, we just need one set
    const { data: expansions } = await serviceSupabase
      .from('expansions')
      .select('id')
      .eq('name', expansionName)
      .limit(1)

    if (!expansions || expansions.length === 0) {
      // No guild has seeded this expansion yet
      return NextResponse.json({ success: true, tiers: [] })
    }

    const expansionId = expansions[0].id

    const { data: tiers } = await serviceSupabase
      .from('raid_tiers')
      .select('id, name, phase')
      .eq('expansion_id', expansionId)
      .order('phase', { ascending: true })
      .order('sort_order', { ascending: true })

    return NextResponse.json({ success: true, tiers: tiers || [], expansion_id: expansionId })
  } catch (err) {
    console.error('Reserve raid tiers error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
