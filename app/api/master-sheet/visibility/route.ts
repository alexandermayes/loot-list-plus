import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

/**
 * POST /api/master-sheet/visibility
 *
 * Returns everything the master sheet needs to render rankings for a set of
 * loot items in one guild, using the service role so RLS edge cases on
 * `loot_submission_items`, `loot_submissions`, or `characters` can't silently
 * drop raiders. Master sheet visibility has broken multiple times because
 * any of those tables can hide rows when a CGM is inactive — the row drops,
 * the master sheet skips the ranking at `if (!character) continue` (or
 * never sees the submission at all), and the raider vanishes from every
 * other raider's view.
 *
 * The caller is verified as an active member of `guild_id` (or the guild
 * creator). All returned rows are server-scoped to that guild + approved
 * submissions, so we can't be tricked into leaking other guilds' data.
 *
 * Body: { guild_id: string, item_ids: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { guild_id, item_ids } = body
    if (typeof guild_id !== 'string' || !Array.isArray(item_ids)) {
      return NextResponse.json({ error: 'guild_id and item_ids[] are required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    // Membership gate: caller must have an active CGM in this guild, or be
    // the guild creator. No granular permission required — the master sheet
    // is gated upstream by the page's masterSheetVisible / approved-submission
    // checks; this route only adds a baseline "you belong here" check so we
    // don't expose guild data to outsiders.
    const { data: userCharacters } = await serviceSupabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)
    const callerCharacterIds = (userCharacters || []).map((c: { id: string }) => c.id)

    let isMember = false
    if (callerCharacterIds.length > 0) {
      const { count } = await serviceSupabase
        .from('character_guild_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('guild_id', guild_id)
        .eq('is_active', true)
        .in('character_id', callerCharacterIds)
      isMember = (count || 0) > 0
    }
    if (!isMember) {
      const { data: guild } = await serviceSupabase
        .from('guilds')
        .select('created_by')
        .eq('id', guild_id)
        .single()
      if (guild?.created_by === user.id) isMember = true
    }
    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
    }

    if (item_ids.length === 0) {
      return NextResponse.json({ rankings: [], submissions: [], characters: [], memberships: [] })
    }

    // 1. Fetch all rankings for these items. Bypasses RLS on loot_submission_items.
    //
    // Supabase enforces a server-side 1000-row cap by default — `.limit(10000)`
    // doesn't override it. A populated guild has well over 1000 rankings for
    // a single phase, and the silently-truncated rows used to drop raiders
    // off the master sheet at random (whichever submissions had rankings in
    // the tail end of the result). Paginate explicitly via .range() in batches
    // of 1000 until exhausted.
    const rankings: { rank: number; slot: number; submission_id: string; loot_item_id: string }[] = []
    const PAGE = 1000
    for (let start = 0; ; start += PAGE) {
      const { data: page } = await serviceSupabase
        .from('loot_submission_items')
        .select('rank, slot, submission_id, loot_item_id')
        .in('loot_item_id', item_ids)
        .is('removed_at', null)
        .range(start, start + PAGE - 1)
      if (!page || page.length === 0) break
      rankings.push(...page)
      if (page.length < PAGE) break
    }

    if (rankings.length === 0) {
      return NextResponse.json({ rankings: [], submissions: [], characters: [], memberships: [] })
    }

    // 2. Resolve those submission_ids to approved submissions in this guild.
    const submissionIds = [...new Set(rankings.map((r: { submission_id: string }) => r.submission_id))]
    const { data: submissions } = await serviceSupabase
      .from('loot_submissions')
      .select('id, status, character_id')
      .in('id', submissionIds)
      .eq('guild_id', guild_id)
      .eq('status', 'approved')

    if (!submissions || submissions.length === 0) {
      return NextResponse.json({ rankings: [], submissions: [], characters: [], memberships: [] })
    }

    // 3. Filter rankings down to only those whose submission is approved + in
    // this guild — protects against the client passing item_ids that match
    // submissions in another guild.
    const approvedSubIds = new Set(submissions.map((s: { id: string }) => s.id))
    const visibleRankings = rankings.filter((r: { submission_id: string }) => approvedSubIds.has(r.submission_id))

    const characterIds = [
      ...new Set(
        submissions
          .map((s: { character_id: string | null }) => s.character_id)
          .filter((id: string | null): id is string => id !== null),
      ),
    ]

    if (characterIds.length === 0) {
      return NextResponse.json({ rankings: visibleRankings, submissions, characters: [], memberships: [] })
    }

    const [{ data: characters }, { data: memberships }] = await Promise.all([
      serviceSupabase
        .from('characters')
        .select(`
          id,
          name,
          user_id,
          spec_id,
          class:wow_classes(name, color_hex),
          spec:class_specs(id, name)
        `)
        .in('id', characterIds),
      serviceSupabase
        .from('character_guild_memberships')
        .select('character_id, role, membership_status, is_active, guild_id')
        .eq('guild_id', guild_id)
        .in('character_id', characterIds),
    ])

    return NextResponse.json({
      rankings: visibleRankings,
      submissions,
      characters: characters || [],
      memberships: memberships || [],
    })
  } catch (error) {
    console.error('Error in POST /api/master-sheet/visibility:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
