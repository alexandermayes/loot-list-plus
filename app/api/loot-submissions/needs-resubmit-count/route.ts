import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { NEEDS_RESUBMISSION_OR_FILTER } from '@/domain/loot/resubmit'

/**
 * GET /api/loot-submissions/needs-resubmit-count?guild_id=...
 *
 * Returns how many of the signed-in raider's own lists in a guild still need
 * to be (re)submitted — edited-after-submit drafts and rejected lists. Drives
 * the raider's sidebar / dashboard badge.
 *
 * Scope: the authenticated user's own characters. No officer permission needed;
 * we never count anyone else's submissions.
 */
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

    const supabase = createServiceRoleClient()

    // Resubmit nudges are per-raider: only ever count this user's own lists.
    const { data: chars } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)

    const characterIds = (chars ?? []).map((c: { id: string }) => c.id)
    if (characterIds.length === 0) {
      return NextResponse.json({ count: 0 })
    }

    const { count, error } = await supabase
      .from('loot_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('guild_id', guildId)
      .in('character_id', characterIds)
      .or(NEEDS_RESUBMISSION_OR_FILTER)

    if (error) throw error

    return NextResponse.json(
      { count: count ?? 0 },
      {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        },
      },
    )
  } catch (error) {
    console.error('Error in GET /api/loot-submissions/needs-resubmit-count:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
