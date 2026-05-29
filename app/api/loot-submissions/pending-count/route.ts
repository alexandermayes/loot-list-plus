import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { pendingSubmissionsTag } from '@/lib/cache/submission-tag'

/**
 * GET /api/loot-submissions/pending-count?guild_id=...
 *
 * Returns the number of pending submissions for a guild. Cached per-guild
 * with tag invalidation on every submission write, so the sidebar's
 * polling badge becomes effectively free at the database layer.
 *
 * Permission: manage_submissions (officer / GM).
 */
function getCachedCount(guildId: string) {
  return unstable_cache(
    async () => {
      const supabase = createServiceRoleClient()
      const { count, error } = await supabase
        .from('loot_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('guild_id', guildId)
        .eq('status', 'pending')
      if (error) {
        // Don't cache errors — bubble up so the next call retries.
        throw error
      }
      return count ?? 0
    },
    ['pending-submissions-count', guildId],
    {
      tags: [pendingSubmissionsTag(guildId)],
      revalidate: 300,
    },
  )()
}

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const guildId = request.nextUrl.searchParams.get('guild_id')
    if (!guildId) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()
    const { hasPermission } = await verifyPermission(serviceSupabase, user.id, guildId, 'manage_submissions')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const count = await getCachedCount(guildId)

    return NextResponse.json(
      { count },
      {
        headers: {
          // Short browser cache + SWR so quick polls in the same tab hit the
          // local cache without even reaching the server.
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      },
    )
  } catch (error) {
    console.error('Error in GET /api/loot-submissions/pending-count:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
