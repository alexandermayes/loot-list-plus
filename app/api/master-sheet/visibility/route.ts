import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { roleHasPermission } from '@/domain/guild/roles'
import { allowedMasterSheetTierIds, type GateExpansion } from '@/domain/loot/master-sheet-gate'
import { paginatedSelect } from '@/utils/supabase/paginate'

type ServiceClient = ReturnType<typeof createServiceRoleClient>

/**
 * Narrow `itemIds` to those whose raid tier is in a phase the caller has
 * earned: the tier must be `master_sheet_visible`, and one of the caller's
 * characters must already have an approved submission for that phase (or any
 * phase merged into the same group). See GH #202.
 */
async function filterItemsToEarnedPhases(
  supabase: ServiceClient,
  guildId: string,
  itemIds: string[],
  callerCharacterIds: string[],
): Promise<string[]> {
  if (callerCharacterIds.length === 0) return []

  // Paginated: a merged phase can request more than 1000 items, and the
  // silent 1000-row cap would drop the tail from the allowed set — items
  // would vanish from the master sheet rather than be denied.
  const items = await paginatedSelect<{ id: string; raid_tier_id: string | null }>(
    (start, end) =>
      supabase
        .from('loot_items')
        .select('id, raid_tier_id')
        .in('id', itemIds)
        .order('id', { ascending: true })
        .range(start, end),
  )
  if (items.length === 0) return []

  const tierIds = [
    ...new Set(
      items
        .map((i: { raid_tier_id: string | null }) => i.raid_tier_id)
        .filter((id: string | null): id is string => id !== null),
    ),
  ]
  if (tierIds.length === 0) return []

  const { data: tiers } = await supabase
    .from('raid_tiers')
    .select('id, phase, master_sheet_visible, expansion_id')
    .in('id', tierIds)
  if (!tiers || tiers.length === 0) return []

  // Phase groups are per-expansion; the requested tiers can in principle span
  // more than one, so resolve each expansion's groups separately.
  const expansionIds = [
    ...new Set(
      tiers
        .map((t: { expansion_id: string | null }) => t.expansion_id)
        .filter((id: string | null): id is string => id !== null),
    ),
  ]

  const [{ data: expansions }, { data: approvedSubs }, { data: allTiers }] = await Promise.all([
    supabase.from('expansions').select('id, phase_groups').in('id', expansionIds),
    supabase
      .from('loot_submissions')
      .select('phase, expansion_id')
      .eq('guild_id', guildId)
      .eq('status', 'approved')
      .in('character_id', callerCharacterIds),
    // Every phase in these expansions, not just the requested tiers' phases:
    // resolvePhaseGroups() drops group members that aren't in the list it's
    // given, which would silently split a merged group and deny a raider whose
    // approved list sits on the group's canonical phase.
    supabase.from('raid_tiers').select('phase, expansion_id').in('expansion_id', expansionIds),
  ])

  // expansion_id -> phases the caller has an approved list for
  const approvedByExpansion = new Map<string, number[]>()
  for (const sub of approvedSubs || []) {
    if (sub.expansion_id == null || sub.phase == null) continue
    if (!approvedByExpansion.has(sub.expansion_id)) approvedByExpansion.set(sub.expansion_id, [])
    approvedByExpansion.get(sub.expansion_id)!.push(sub.phase)
  }

  const gateExpansions: GateExpansion[] = expansionIds.map(expansionId => ({
    id: expansionId,
    phaseGroups:
      ((expansions || []).find((e: { id: string }) => e.id === expansionId)?.phase_groups as
        | number[][]
        | null) || null,
    availablePhases: [
      ...new Set(
        (allTiers || [])
          .filter((t: { expansion_id: string | null }) => t.expansion_id === expansionId)
          .map((t: { phase: number | null }) => t.phase)
          .filter((p: number | null): p is number => p != null),
      ),
    ],
    approvedPhases: approvedByExpansion.get(expansionId) || [],
  }))

  const allowedTierIds = allowedMasterSheetTierIds(tiers, gateExpansions)
  if (allowedTierIds.size === 0) return []
  return items
    .filter((i: { raid_tier_id: string | null }) => i.raid_tier_id !== null && allowedTierIds.has(i.raid_tier_id))
    .map((i: { id: string }) => i.id)
}

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
 * The requested items are then gated per phase (GH #202): a raider only gets
 * rankings for a phase whose tiers are `master_sheet_visible` AND for which
 * they already have an approved submission, so nobody can scout the field
 * before committing their own list. Officers (`manage_loot`) and holders of
 * `view_master_sheet` bypass the gate. This is enforced here rather than
 * relying on the page's checks alone — the client gate is a UX affordance,
 * not a boundary.
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
    // the guild creator. This is the baseline "you belong here" check; the
    // per-phase gate below decides what they may actually see.
    const { data: userCharacters } = await serviceSupabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)
    const callerCharacterIds = (userCharacters || []).map((c: { id: string }) => c.id)

    let isMember = false
    let callerRoles: string[] = []
    if (callerCharacterIds.length > 0) {
      const { data: callerMemberships } = await serviceSupabase
        .from('character_guild_memberships')
        .select('role')
        .eq('guild_id', guild_id)
        .eq('is_active', true)
        .in('character_id', callerCharacterIds)
      isMember = (callerMemberships || []).length > 0
      callerRoles = [
        ...new Set(
          (callerMemberships || [])
            .map((m: { role: string | null }) => m.role)
            .filter((r: string | null): r is string => !!r),
        ),
      ]
    }
    let isGuildCreator = false
    {
      const { data: guild } = await serviceSupabase
        .from('guilds')
        .select('created_by')
        .eq('id', guild_id)
        .single()
      isGuildCreator = guild?.created_by === user.id
      if (isGuildCreator) isMember = true
    }
    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
    }

    if (item_ids.length === 0) {
      return NextResponse.json({ rankings: [], submissions: [], characters: [], memberships: [] })
    }

    // Per-phase gate (GH #202). Officers and view_master_sheet holders see
    // everything; the guild creator is treated as an owner. Everyone else is
    // restricted to phases they've already committed a list to.
    let bypassPhaseGate = isGuildCreator
    if (!bypassPhaseGate && callerRoles.length > 0) {
      const { data: roleRows } = await serviceSupabase
        .from('guild_roles')
        .select('name, position, permissions')
        .eq('guild_id', guild_id)
        .in('name', callerRoles)

      bypassPhaseGate = (roleRows || []).some((r: { position: number | null; permissions: string[] | null }) => {
        // Guilds that never seeded guild_roles fall back to the default
        // positions, mirroring the phase-groups route.
        const position = r.position ?? 0
        const permissions = r.permissions || []
        return (
          roleHasPermission(position, permissions, 'manage_loot') ||
          roleHasPermission(position, permissions, 'view_master_sheet')
        )
      })

      // No guild_roles row matched (unseeded guild): fall back to role names.
      if (!bypassPhaseGate && (roleRows || []).length === 0) {
        bypassPhaseGate = callerRoles.some(r => r === 'Guild Master' || r === 'Officer')
      }
    }

    let allowedItemIds: string[] = item_ids
    if (!bypassPhaseGate) {
      allowedItemIds = await filterItemsToEarnedPhases(
        serviceSupabase,
        guild_id,
        item_ids,
        callerCharacterIds,
      )
      if (allowedItemIds.length === 0) {
        return NextResponse.json({ rankings: [], submissions: [], characters: [], memberships: [] })
      }
    }

    // 1. Fetch all rankings for these items. Bypasses RLS on loot_submission_items.
    //
    // Supabase enforces a server-side 1000-row cap by default — `.limit(10000)`
    // doesn't override it. A populated guild has well over 1000 rankings for
    // a single phase, and the silently-truncated rows used to drop raiders
    // off the master sheet at random (whichever submissions had rankings in
    // the tail end of the result). Paginate explicitly via .range() in batches
    // of 1000 until exhausted. `.order('id')` is REQUIRED — without it,
    // successive .range() calls can skip rows and/or duplicate them because
    // Postgres has no deterministic order to apply OFFSET/LIMIT against.
    const rankings: { rank: number; slot: number; submission_id: string; loot_item_id: string }[] = []
    const PAGE = 1000
    for (let start = 0; ; start += PAGE) {
      const { data: page } = await serviceSupabase
        .from('loot_submission_items')
        .select('rank, slot, submission_id, loot_item_id')
        .in('loot_item_id', allowedItemIds)
        .is('removed_at', null)
        .order('id', { ascending: true })
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
