/**
 * GET /api/bot/priority?discord_guild_id=X&item_query=Y
 *
 * Called by the LootList+ Discord bot to back the `/priority` slash command.
 * Returns the top raiders who have ranked the given item highest on their
 * approved loot list. Lets raiders ask "who's high on Bilegrip Boots?"
 * without opening the app.
 */

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { trackApiError } from '@/utils/analytics/server'
import { checkBotAuth, resolveGuildFromDiscord } from '../_helpers'

const MAX_RAIDERS = 5

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

    // Fuzzy item match: case-insensitive substring against the guild's
    // active-expansion item catalog. Pick the shortest match so "Sulfuras"
    // doesn't accidentally grab "Sulfuras, Hand of Ragnaros, Heroic Variant".
    const { data: tiers } = await supabase
      .from('raid_tiers')
      .select('id')
      .eq('expansion_id', guild.active_expansion_id)
    const tierIds = (tiers || []).map((t) => t.id)
    if (tierIds.length === 0) {
      return NextResponse.json({ error: 'no_items_in_expansion' }, { status: 404 })
    }

    const { data: matchedItems } = await supabase
      .from('loot_items')
      .select('id, name, wowhead_id')
      .in('raid_tier_id', tierIds)
      .ilike('name', `%${itemQuery}%`)
      .order('name', { ascending: true })
      .limit(10)

    if (!matchedItems || matchedItems.length === 0) {
      return NextResponse.json({ error: 'item_not_found', item_query: itemQuery }, { status: 404 })
    }

    // Shortest name = best fuzzy match
    const item = matchedItems.reduce((best, cur) => (cur.name.length < best.name.length ? cur : best))

    // Pull approved submissions that include this item. Loot list submissions
    // store priorities as `{ items: [{ loot_item_id, rank }] }` in JSON.
    const { data: submissions } = await supabase
      .from('loot_submissions')
      .select('character_id, items')
      .eq('guild_id', guild.id)
      .eq('status', 'approved')

    const raiders: Array<{ characterId: string; rank: number }> = []
    for (const sub of submissions || []) {
      const items = (sub.items as unknown as Array<{ loot_item_id: string; rank: number }> | null) || []
      const match = items.find((i) => i.loot_item_id === item.id)
      if (match && typeof match.rank === 'number') {
        raiders.push({ characterId: sub.character_id, rank: match.rank })
      }
    }

    raiders.sort((a, b) => b.rank - a.rank) // higher rank = higher priority
    const top = raiders.slice(0, MAX_RAIDERS)

    if (top.length === 0) {
      return NextResponse.json({
        item_name: item.name,
        item_wowhead_id: item.wowhead_id,
        raiders: [],
      })
    }

    // Look up the names + classes for the top raiders
    const { data: characters } = await supabase
      .from('characters')
      .select('id, name, wow_classes(name)')
      .in('id', top.map((r) => r.characterId))

    const charById = new Map<string, { name: string; className: string | null }>()
    for (const c of characters || []) {
      const cls = Array.isArray(c.wow_classes) ? c.wow_classes[0] : c.wow_classes
      charById.set(c.id, { name: c.name, className: (cls as { name?: string } | null)?.name ?? null })
    }

    return NextResponse.json({
      item_name: item.name,
      item_wowhead_id: item.wowhead_id,
      raiders: top.map((r) => {
        const c = charById.get(r.characterId)
        return { name: c?.name ?? 'Unknown', class: c?.className ?? null, rank: r.rank }
      }),
    })
  } catch (error) {
    console.error('Error in GET /api/bot/priority:', error)
    trackApiError('unknown', 'GET /api/bot/priority', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
