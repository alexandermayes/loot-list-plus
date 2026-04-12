/**
 * GET /api/loot-list/bootstrap
 *
 * Initial-load endpoint for /loot-list. Collapses three sequential
 * round-trips (tiers → items → submission) into a single request so the
 * page can reach LCP without a waterfall.
 *
 * Query params:
 *   expansion_id (required)
 *   guild_id     (required)
 *   character_id (required)
 *   phase        (optional — canonical phase from the phase group; if
 *                 omitted or invalid, the first available group is used)
 *
 * Response shape deliberately mirrors the individual endpoints' responses
 * so the client can seed each SWR cache directly via `mutate()`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import {
  fetchLootItemsCharacter,
  fetchFilteredLootItems,
} from '@/lib/loot-items-query'
import { resolvePhaseGroups } from '@/domain/expansion/phase-groups'

export const dynamic = 'force-dynamic'

interface RaidTierRow {
  id: string
  name: string
  is_active: boolean
  is_guild_active: boolean | null
  submission_deadline: string | null
  phase: number | null
}

export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const expansionId = searchParams.get('expansion_id')
    const guildId = searchParams.get('guild_id')
    const characterId = searchParams.get('character_id')
    const phaseParam = searchParams.get('phase')

    if (!expansionId || !guildId || !characterId) {
      return NextResponse.json(
        { error: 'expansion_id, guild_id, and character_id are required' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Verify the caller owns the character before doing any expensive
    // joins. Kept intentionally narrow — ownership check is a single
    // column lookup.
    const { data: ownerCheck } = await supabase
      .from('characters')
      .select('user_id')
      .eq('id', characterId)
      .single()

    if (!ownerCheck || ownerCheck.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized for this character' }, { status: 403 })
    }

    // Parallel batch A: expansion metadata + raid tiers + character
    // proficiency info. These have no inter-dependencies.
    const [
      { data: expansion, error: expansionError },
      { data: tiersRaw, error: tiersError },
      character,
    ] = await Promise.all([
      supabase
        .from('expansions')
        .select('current_phase, phase_groups')
        .eq('id', expansionId)
        .single(),
      supabase
        .from('raid_tiers')
        .select('id, name, is_active, is_guild_active, submission_deadline, phase')
        .eq('expansion_id', expansionId)
        .eq('is_guild_active', true)
        .order('phase')
        .order('id'),
      fetchLootItemsCharacter(supabase, characterId),
    ])

    if (expansionError || !expansion) {
      return NextResponse.json({ error: 'Expansion not found' }, { status: 404 })
    }
    if (tiersError) {
      console.error('Error fetching raid tiers:', tiersError)
      return NextResponse.json({ error: 'Failed to fetch raid tiers' }, { status: 500 })
    }
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    const currentPhase = expansion.current_phase ?? 1
    const rawPhaseGroups = (expansion.phase_groups as number[][] | null) || null

    // Linear unlock: only phases <= current_phase are visible to non-admin users.
    const visibleTiers: RaidTierRow[] = (tiersRaw || []).filter(
      (t: RaidTierRow) => t.phase != null && t.phase <= currentPhase
    )

    // Unique, sorted phase numbers for group resolution.
    const uniquePhases = [
      ...new Set<number>(
        visibleTiers
          .map((t) => t.phase)
          .filter((p): p is number => p !== null && p !== undefined)
      ),
    ].sort((a, b) => a - b)

    const resolvedGroups = resolvePhaseGroups(rawPhaseGroups, uniquePhases)
    const canonicalPhases = resolvedGroups.map((g) => g.canonicalPhase)

    // Pick the selected canonical phase: URL hint → first available → null.
    let selectedCanonicalPhase: number | null = null
    if (phaseParam) {
      const parsed = parseInt(phaseParam, 10)
      if (!isNaN(parsed) && canonicalPhases.includes(parsed)) {
        selectedCanonicalPhase = parsed
      }
    }
    if (selectedCanonicalPhase === null && canonicalPhases.length > 0) {
      selectedCanonicalPhase = canonicalPhases[0]
    }

    // If there are no tiers at all, short-circuit with an empty payload
    // that still lets the client render the empty state.
    if (selectedCanonicalPhase === null) {
      return NextResponse.json({
        tiers: visibleTiers,
        current_phase: currentPhase,
        phase_groups: rawPhaseGroups,
        selected_phase: null,
        selected_phases: [],
        items: [],
        submission: null,
        rankings: {},
        removedItems: [],
      })
    }

    const selectedGroup = resolvedGroups.find(
      (g) => g.canonicalPhase === selectedCanonicalPhase
    )
    const selectedPhases = selectedGroup?.phases || [selectedCanonicalPhase]

    const phaseSet = new Set(selectedPhases)
    const selectedTierIds = visibleTiers
      .filter((t) => t.phase != null && phaseSet.has(t.phase))
      .map((t) => t.id)

    // Parallel batch B: items for the selected phase group + the
    // character's submission for the canonical phase (with ranking items).
    const [items, submissionRow] = await Promise.all([
      fetchFilteredLootItems(supabase, character, selectedTierIds),
      supabase
        .from('loot_submissions')
        .select('id, status, submitted_at, review_notes, expansion_id, phase')
        .eq('character_id', characterId)
        .eq('guild_id', guildId)
        .eq('expansion_id', expansionId)
        .eq('phase', selectedCanonicalPhase)
        .maybeSingle(),
    ])

    // If there's a submission, fetch its ranking items. Done sequentially
    // because we need the submission ID; this is fast (indexed lookup on
    // submission_id) compared to the bigger items fetch above.
    let rankings: Record<string, string> = {}
    let removedItems: Array<{ loot_item_id: string; rank: number; slot: number }> = []
    const submission = submissionRow.data ?? null
    if (submission) {
      const { data: rankingsData } = await supabase
        .from('loot_submission_items')
        .select('loot_item_id, rank, slot, removed_at')
        .eq('submission_id', submission.id)

      rankingsData?.forEach(
        (r: { loot_item_id: string; rank: number; slot: number; removed_at: string | null }) => {
          if (r.removed_at) {
            removedItems.push({ loot_item_id: r.loot_item_id, rank: r.rank, slot: r.slot })
          } else {
            rankings[`${r.rank}-${r.slot}`] = r.loot_item_id
          }
        }
      )
    }

    return NextResponse.json(
      {
        tiers: visibleTiers,
        current_phase: currentPhase,
        phase_groups: rawPhaseGroups,
        selected_phase: selectedCanonicalPhase,
        selected_phases: selectedPhases,
        items,
        submission,
        rankings,
        removedItems,
      },
      {
        headers: {
          'Cache-Control': 'private, no-cache',
        },
      }
    )
  } catch (error) {
    console.error('Error in GET /api/loot-list/bootstrap:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
