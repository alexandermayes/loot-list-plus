import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

/**
 * GET /api/landing-stats
 *
 * Public endpoint that returns aggregate stats for the landing page.
 * Cached for 5 minutes to avoid hitting the DB on every page load.
 */
export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    // Run all counts in parallel
    const [guildsResult, membersResult, lootResult] = await Promise.all([
      supabase
        .from('guilds')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),
      supabase
        .from('character_guild_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),
      supabase
        .from('loot_history')
        .select('*', { count: 'exact', head: true }),
    ])

    return NextResponse.json(
      {
        guilds: guildsResult.count || 0,
        raiders: membersResult.count || 0,
        items_distributed: lootResult.count || 0,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (error) {
    console.error('Error in GET /api/landing-stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
