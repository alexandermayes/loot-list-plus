/**
 * Master sheet Summary view data: demand per item from approved lists of
 * active members, GH #326.
 *
 * Counts here answer "who currently wants this and where do they rank",
 * using the same active-membership rule the award routes, the
 * loot_history trigger and the master sheet's Rankings view use
 * (findInvalidCharacterIds): a raider without an active membership in this
 * guild is left out of players, total_lists and average_rank, even if a
 * legacy approved list of theirs still exists. already_awarded is not
 * filtered by this rule (OD-02): it counts every copy handed out, and those
 * copies are gone whoever holds them now. A failed membership read throws,
 * so the caller's own catch (not this function) decides what the view
 * shows.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { paginatedSelect } from '@/utils/supabase/paginate'
import { aggregateListStats } from '@/domain/loot/ranking-entries'
import { buildTeamVisibility } from '@/domain/loot/apply-team-filter'
import { findInvalidCharacterIds } from '@/lib/loot/guild-award-refs'
import { splitCandidatesByMembership } from '@/domain/loot/master-sheet-candidates'
import type { LootListAggregateItem } from '@/app/components/LootListSummaryView'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryClient = SupabaseClient<any, any, any>

interface CharacterClass {
  name: string
  color_hex: string
}

interface AggregateCharacterRow {
  id: string
  name: string | null
  class: CharacterClass | CharacterClass[]
}

type AggregateSubmission = { id: string; character_id: string | null; status: string }
type SubmissionItemData = { loot_item_id: string; rank: number; slot: number; submission_id: string }

export interface LoadMasterSheetSummaryInput {
  guildId: string
  activeTierIds: string[]
  activeTeamId: string | null
}

/**
 * Loads the master sheet Summary view's aggregate items for one phase's
 * active tiers. Returns [] for every early exit (no items, no list rows, no
 * approved submissions, or every lister has left). Throws if the active-
 * membership lookup fails.
 */
export async function loadMasterSheetSummary(
  supabase: QueryClient,
  { guildId, activeTierIds, activeTeamId }: LoadMasterSheetSummaryInput,
): Promise<LootListAggregateItem[]> {
  // Get all loot items for all active tiers in this phase
  const { data: itemsData } = await supabase
    .from('loot_items')
    .select('id, name, boss_name, item_slot, wowhead_id, classification, raid_tier_id, is_loot_council')
    .in('raid_tier_id', activeTierIds)
    .eq('is_available', true)
    .order('boss_name')
    .order('name')

  if (!itemsData || itemsData.length === 0) {
    return []
  }

  const itemIds = itemsData.map((i: { id: string }) => i.id)

  // Get all submission items for these items (paginated + ordered to defeat Supabase's 1000-row cap)
  const submissionItemsData = await paginatedSelect<SubmissionItemData>(
    (start, end) =>
      supabase
        .from('loot_submission_items')
        .select('loot_item_id, rank, slot, submission_id')
        .in('loot_item_id', itemIds)
        .is('removed_at', null)
        .order('id', { ascending: true })
        .range(start, end)
  )

  if (!submissionItemsData || submissionItemsData.length === 0) {
    return []
  }

  // Get approved submissions only
  const submissionIds = [...new Set(submissionItemsData.map((si: SubmissionItemData) => si.submission_id))]
  const { data: submissionsData } = await supabase
    .from('loot_submissions')
    .select('id, character_id, status')
    .in('id', submissionIds)
    .eq('status', 'approved')

  if (!submissionsData || submissionsData.length === 0) {
    return []
  }

  // Leave out raiders who no longer have an active membership in this guild,
  // using the same check the award routes use (GH #326). Not caught here:
  // a lookup error must reach the caller's own error handling rather than
  // silently showing an unfiltered or empty Summary.
  const listerCharacterIds = [
    ...new Set(
      submissionsData
        .map((s: AggregateSubmission) => s.character_id)
        .filter((id: string | null): id is string => id !== null),
    ),
  ]
  const inactiveCharacterIds = await findInvalidCharacterIds(supabase, guildId, listerCharacterIds)
  const {
    submissions: keptSubmissions,
    rankings: keptRankings,
    characterIds,
  } = splitCandidatesByMembership({
    submissions: submissionsData,
    rankings: submissionItemsData,
    inactiveCharacterIds,
  })

  if (characterIds.length === 0) {
    return []
  }

  const approvedSubmissionIds = new Set(keptSubmissions.map((s: AggregateSubmission) => s.id))

  // Get character info
  const { data: charactersData } = await supabase
    .from('characters')
    .select('id, name, class:wow_classes(name, color_hex)')
    .in('id', characterIds)

  // Team filter: scope the Summary to the active team's members, keeping
  // unassigned raiders, so it matches the Rankings view and Gargul
  // export. See buildTeamVisibility and issue #165.
  let isTeamVisible: (characterId: string) => boolean = () => true
  if (activeTeamId) {
    const { data: teamMembers } = await supabase
      .from('raid_team_members')
      .select('character_id, raid_team_id')
      .eq('guild_id', guildId)
    isTeamVisible = buildTeamVisibility(teamMembers || [], activeTeamId)
  }

  // Get loot history for awarded count (match by wowhead_id so cross-tier
  // awards are counted). Paginated + ordered to defeat Supabase's 1000-row
  // response cap. Every award counts (OD-02), including copies given to
  // raiders who later left.
  const wowheadIdSet = new Set(itemsData.map((i: { wowhead_id: number }) => i.wowhead_id))
  const lootHistoryData = await paginatedSelect<{ loot_item: { wowhead_id: number } | null }>(
    (start, end) =>
      supabase
        .from('loot_history')
        .select('loot_item:loot_items(wowhead_id)')
        .eq('guild_id', guildId)
        .order('id', { ascending: true })
        .range(start, end) as unknown as PromiseLike<{ data: { loot_item: { wowhead_id: number } | null }[] | null }>
  )

  // Count awards per wowhead_id
  const awardedCounts: Record<number, number> = {}
  for (const h of (lootHistoryData || []) as { loot_item: { wowhead_id: number } | null }[]) {
    const wowheadId = h.loot_item?.wowhead_id
    if (wowheadId == null || !wowheadIdSet.has(wowheadId)) continue
    awardedCounts[wowheadId] = (awardedCounts[wowheadId] || 0) + 1
  }

  // Build aggregate data
  const aggregateMap: Record<string, LootListAggregateItem> = {}

  for (const item of itemsData) {
    aggregateMap[item.id] = {
      item_id: item.id,
      item_name: item.name,
      boss_name: item.boss_name,
      item_slot: item.item_slot,
      wowhead_id: item.wowhead_id,
      classification: item.classification || 'common',
      total_lists: 0,
      already_awarded: awardedCounts[item.wowhead_id] || 0,
      players: [],
      average_rank: 0,
    }
  }

  // Populate players for each item

  // Create lookup maps for O(1) access (performance optimization)
  const submissionsById = new Map<string, AggregateSubmission>(keptSubmissions.map((s: AggregateSubmission) => [s.id, s]))
  const aggregateCharacterById = new Map<string, AggregateCharacterRow>(charactersData?.map((c: AggregateCharacterRow) => [c.id, c]) || [])

  for (const si of keptRankings) {
    if (!approvedSubmissionIds.has(si.submission_id)) continue

    const submission = submissionsById.get(si.submission_id)
    if (!submission) continue

    const character = submission.character_id ? aggregateCharacterById.get(submission.character_id) : undefined
    if (!character) continue
    if (!isTeamVisible(character.id)) continue

    const aggregate = aggregateMap[si.loot_item_id]
    if (!aggregate) continue

    const charClass = Array.isArray(character.class) ? character.class[0] : character.class

    aggregate.players.push({
      character_id: character.id,
      character_name: character.name || 'Unknown',
      class_name: charClass?.name || 'Unknown',
      class_color: charClass?.color_hex || '#888888',
      primary_rank: si.slot,
      item_rank: si.rank,
    })
  }

  // Calculate totals and averages per list (a raider can list an item
  // more than once, GH #293): lists are distinct raiders, and the average
  // uses each list's best rank.
  for (const item of Object.values(aggregateMap)) {
    const stats = aggregateListStats(item.players)
    item.total_lists = stats.total_lists
    item.average_rank = stats.average_rank
  }

  // Filter out items with no loot lists and convert to array
  return Object.values(aggregateMap).filter(item => item.total_lists > 0)
}
