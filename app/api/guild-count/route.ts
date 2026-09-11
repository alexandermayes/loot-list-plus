import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

/**
 * GET /api/guild-count
 *
 * Public endpoint that returns aggregate counts for the landing page hero.
 * force-dynamic on purpose (GH-257): the handler reads nothing from the
 * request, so Next.js 16 would otherwise classify it as statically
 * prerenderable and run it during build-time static generation, where
 * createServiceRoleClient() throws on a missing Supabase env var. The one
 * hour cache window lives on the response header instead of an ISR export,
 * so the CDN still absorbs repeat traffic.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    const [guildsRes, raidersRes, lootRes] = await Promise.all([
      supabase.from('guilds').select('*', { count: 'exact', head: true }),
      supabase.from('character_guild_memberships').select('*', { count: 'exact', head: true }),
      supabase.from('loot_history').select('*', { count: 'exact', head: true }),
    ])

    return NextResponse.json(
      {
        guilds: guildsRes.count ?? 0,
        raiders: raidersRes.count ?? 0,
        loot: lootRes.count ?? 0,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    )
  } catch (error) {
    console.error('Error in GET /api/guild-count:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
