import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { NEEDS_RESUBMISSION_OR_FILTER } from '@/domain/loot/resubmit'
import { findInvalidCharacterIds } from '@/lib/loot/guild-award-refs'

/**
 * GET /api/loot-submissions/needs-resubmit-count?guild_id=...
 *
 * Returns how many of the signed-in raider's own lists in a guild still need
 * to be (re)submitted — edited-after-submit drafts and rejected lists. Drives
 * the raider's sidebar / dashboard badge.
 *
 * Scope: the authenticated user's own characters. No officer permission needed;
 * we never count anyone else's submissions. A character that left this guild
 * can't resubmit here (the submit route's check), so its lists are excluded
 * too - see lib/loot/active-member-lists.ts.
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

    // Resubmit nudges count only this user's own lists, and only for
    // characters that are still active members of this guild - a character
    // that left can't resubmit here (the submit route's check).
    const { data: chars, error: charsError } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)

    if (charsError) throw charsError

    const characterIds = (chars ?? []).map((c: { id: string }) => c.id)
    if (characterIds.length === 0) {
      return NextResponse.json({ count: 0 })
    }

    const invalidCharacterIds = new Set(await findInvalidCharacterIds(supabase, guildId, characterIds))
    const activeCharacterIds = characterIds.filter((id: string) => !invalidCharacterIds.has(id))
    if (activeCharacterIds.length === 0) {
      return NextResponse.json({ count: 0 })
    }

    const { count, error } = await supabase
      .from('loot_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('guild_id', guildId)
      .in('character_id', activeCharacterIds)
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
