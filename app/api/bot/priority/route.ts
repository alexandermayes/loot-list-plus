/**
 * GET /api/bot/priority?discord_guild_id=X&item_query=Y
 *
 * Called by the LootList+ Discord bot to back the `/priority` slash command.
 * Returns the top raiders who have ranked the given item highest on their
 * approved loot list, ordered by raw list rank (not Loot Score: no server-side
 * Loot Score pipeline exists yet). Lets raiders ask "who's high on Bilegrip
 * Boots?" without opening the app.
 *
 * The read path mirrors the master sheet (app/api/master-sheet/visibility/route.ts):
 * approved loot_submissions of the resolved guild, their live (removed_at IS NULL)
 * loot_submission_items rows, active members only (findInvalidCharacterIds), and
 * copies the raider already received skipped (fetchReceivedCounts plus
 * pickReceivedEntries, across every visible loot_items row sharing the item's
 * wowhead id). The route also respects the officers' Loot and Ranks toggles on each
 * raid tier: only Loot-on tiers are searched, and rankings are only ever shown for
 * Ranks-on tiers. When the only matching item sits in a Loot-on, Ranks-off tier, the
 * route answers 403 { error: 'rankings_hidden' } instead of a false "nobody ranked
 * this". Every query here checks its error; a failed read returns 500, never an
 * empty or unfiltered list.
 */

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { trackApiError } from '@/utils/analytics/server'
import { checkBotAuth, resolveGuildFromDiscord } from '../_helpers'
import { findInvalidCharacterIds } from '@/lib/loot/guild-award-refs'
import { fetchReceivedCounts } from '@/lib/addon/member-ranked-items'
import { splitBotTiers, collectItemCandidates, orderItemCandidates } from '@/domain/loot/bot-item-priority'

const MAX_RAIDERS = 5
const PAGE_SIZE = 1000
const CHARACTER_CHUNK_SIZE = 100

interface LootItemRow {
  id: string
  name: string
  wowhead_id: number | null
}

/**
 * Reads every page of a query, checking the error on each page (unlike
 * utils/supabase/paginate.ts's paginatedSelect, which ignores errors). Throws on
 * any page's error so the route's catch can answer 500 instead of an undercounted
 * list. Pages of PAGE_SIZE, stopping as soon as a page comes back short.
 */
async function selectAllPagesOrThrow<T>(
  label: string,
  fetchPage: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const all: T[] = []
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await fetchPage(start, start + PAGE_SIZE - 1)
    if (error) {
      throw new Error(`Failed to read ${label}: ${error.message}`)
    }
    const rows = data ?? []
    all.push(...rows)
    if (rows.length < PAGE_SIZE) return all
  }
}

export async function GET(request: Request) {
  try {
    const authError = checkBotAuth(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const discordGuildId = searchParams.get('discord_guild_id') || ''
    const itemQuery = (searchParams.get('item_query') || '').trim()

    if (!discordGuildId || !itemQuery) {
      return NextResponse.json(
        { error: 'discord_guild_id and item_query are required' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    const guild = await resolveGuildFromDiscord(supabase, discordGuildId)
    if (!guild) {
      return NextResponse.json({ error: 'no_guild_linked' }, { status: 404 })
    }
    if (!guild.active_expansion_id) {
      return NextResponse.json({ error: 'no_active_expansion' }, { status: 404 })
    }

    const { data: tiers, error: tiersError } = await supabase
      .from('raid_tiers')
      .select('id, is_guild_active, master_sheet_visible')
      .eq('expansion_id', guild.active_expansion_id)
    if (tiersError) {
      throw new Error(`Failed to read raid tiers: ${tiersError.message}`)
    }

    const { lootTierIds, rankedTierIds, hiddenTierIds } = splitBotTiers(tiers || [])
    if (lootTierIds.length === 0) {
      return NextResponse.json({ error: 'no_items_in_expansion' }, { status: 404 })
    }

    // Fuzzy item match: case-insensitive substring, only within tiers the bot may
    // search. Pick the shortest match so "Sulfuras" doesn't accidentally grab
    // "Sulfuras, Hand of Ragnaros, Heroic Variant".
    let visibleMatches: LootItemRow[] = []
    if (rankedTierIds.length > 0) {
      const { data, error } = await supabase
        .from('loot_items')
        .select('id, name, wowhead_id')
        .in('raid_tier_id', rankedTierIds)
        .ilike('name', `%${itemQuery}%`)
        .order('name', { ascending: true })
        .limit(10)
      if (error) {
        throw new Error(`Failed to search loot items: ${error.message}`)
      }
      visibleMatches = data || []
    }

    let item: LootItemRow | null = null
    if (visibleMatches.length > 0) {
      item = visibleMatches.reduce((best, cur) => (cur.name.length < best.name.length ? cur : best))
    } else if (hiddenTierIds.length > 0) {
      const { data, error } = await supabase
        .from('loot_items')
        .select('id, name, wowhead_id')
        .in('raid_tier_id', hiddenTierIds)
        .ilike('name', `%${itemQuery}%`)
        .order('name', { ascending: true })
        .limit(10)
      if (error) {
        throw new Error(`Failed to search loot items: ${error.message}`)
      }
      const hiddenMatches = data || []
      if (hiddenMatches.length > 0) {
        const hiddenItem = hiddenMatches.reduce((best, cur) => (cur.name.length < best.name.length ? cur : best))
        return NextResponse.json(
          { error: 'rankings_hidden', item_name: hiddenItem.name, item_wowhead_id: hiddenItem.wowhead_id },
          { status: 403 }
        )
      }
    }

    if (!item) {
      return NextResponse.json({ error: 'item_not_found', item_query: itemQuery }, { status: 404 })
    }

    // Same real item can have several loot_items rows (several bosses or tiers)
    // sharing a wowhead_id. Only rows in ranked (visible) tiers count toward the
    // answer; `item` itself always counts.
    let itemIds: string[]
    if (item.wowhead_id != null) {
      const { data, error } = await supabase
        .from('loot_items')
        .select('id')
        .in('raid_tier_id', rankedTierIds)
        .eq('wowhead_id', item.wowhead_id)
      if (error) {
        throw new Error(`Failed to look up matching loot items: ${error.message}`)
      }
      const ids = new Set<string>((data || []).map((row: { id: string }) => row.id))
      ids.add(item.id)
      itemIds = Array.from(ids)
    } else {
      itemIds = [item.id]
    }

    const approvedSubmissions = await selectAllPagesOrThrow<{ id: string; character_id: string | null }>(
      'approved loot submissions',
      (start, end) =>
        supabase
          .from('loot_submissions')
          .select('id, character_id')
          .eq('guild_id', guild.id)
          .eq('status', 'approved')
          .order('id', { ascending: true })
          .range(start, end)
    )

    const rankingRows = await selectAllPagesOrThrow<{
      rank: number
      slot: number
      submission_id: string | null
      loot_item_id: string | null
    }>('loot submission items', (start, end) =>
      supabase
        .from('loot_submission_items')
        .select('rank, slot, submission_id, loot_item_id')
        .in('loot_item_id', itemIds)
        .is('removed_at', null)
        .order('id', { ascending: true })
        .range(start, end)
    )

    const approvedById = new Map(approvedSubmissions.map((sub) => [sub.id, sub]))
    const referencedCharacterIds = new Set<string>()
    for (const row of rankingRows) {
      if (!row.submission_id) continue
      const submission = approvedById.get(row.submission_id)
      if (submission?.character_id) referencedCharacterIds.add(submission.character_id)
    }

    const emptyAnswer = () =>
      NextResponse.json({ item_name: item!.name, item_wowhead_id: item!.wowhead_id, raiders: [] })

    if (referencedCharacterIds.size === 0) {
      return emptyAnswer()
    }

    const invalidCharacterIds = await findInvalidCharacterIds(supabase, guild.id, Array.from(referencedCharacterIds))
    const invalidSet = new Set(invalidCharacterIds)
    const activeCount = Array.from(referencedCharacterIds).filter((id) => !invalidSet.has(id)).length
    if (activeCount === 0) {
      return emptyAnswer()
    }

    let receivedCounts: Map<string, number> | null = null
    if (item.wowhead_id != null) {
      receivedCounts = await fetchReceivedCounts(supabase, guild.id)
      if (receivedCounts === null) {
        throw new Error('Failed to read loot history for the /priority received-copies skip')
      }
    }

    const candidates = collectItemCandidates({
      rows: rankingRows,
      approvedSubmissions,
      inactiveCharacterIds: invalidCharacterIds,
      receivedCounts,
      wowheadId: item.wowhead_id,
    })

    if (candidates.length === 0) {
      return emptyAnswer()
    }

    const characterIds = candidates.map((c) => c.characterId)
    const charById = new Map<string, { name: string; className: string | null }>()
    for (let i = 0; i < characterIds.length; i += CHARACTER_CHUNK_SIZE) {
      const chunk = characterIds.slice(i, i + CHARACTER_CHUNK_SIZE)
      const { data, error } = await supabase
        .from('characters')
        .select('id, name, wow_classes(name)')
        .in('id', chunk)
      if (error) {
        throw new Error(`Failed to look up characters: ${error.message}`)
      }
      for (const c of data || []) {
        const cls = Array.isArray(c.wow_classes) ? c.wow_classes[0] : c.wow_classes
        charById.set(c.id, { name: c.name, className: (cls as { name?: string } | null)?.name ?? null })
      }
    }

    const ordered = orderItemCandidates(candidates, charById, MAX_RAIDERS)

    return NextResponse.json({
      item_name: item.name,
      item_wowhead_id: item.wowhead_id,
      raiders: ordered.map((r) => ({ name: r.name, class: r.className, rank: r.rank })),
    })
  } catch (error) {
    console.error('Error in GET /api/bot/priority:', error)
    trackApiError('unknown', 'GET /api/bot/priority', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
