import { NextRequest, NextResponse, after } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { trackApiError, trackEvent } from '@/utils/analytics/server'
import { evaluateGuildFunnel } from '@/utils/analytics/funnel'
import { notifyLootAward } from '@/lib/discord-loot-announcements'
import { resolveGuildLootItem } from '@/lib/loot/guild-scoped-lookup'
import { buildAddonAwardRow } from '@/lib/loot/loot-history-rows'

interface LootAwardRequest {
  guild_id: string
  wowhead_id: number
  character_name: string
  boss_name?: string
  awarded_date?: string
  notes?: string
}

/**
 * POST /api/addon/loot-award
 *
 * Records a single loot award from the addon or companion app. Maps
 * wowhead_id to a loot_items row owned by the calling guild's own raid
 * tiers, trying the exact id first and its faction alias second (GH #277
 * D-03, SCOPE-01) — see lib/loot/guild-scoped-lookup.ts. The inserted row
 * carries raid_tier_id and expansion_id from that same guild-scoped lookup
 * (GH #294 D-01) via buildAddonAwardRow.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: LootAwardRequest = await request.json()
    const { guild_id, wowhead_id, character_name, boss_name, awarded_date, notes } = body

    if (!guild_id || !wowhead_id || !character_name) {
      return NextResponse.json({
        error: 'guild_id, wowhead_id, and character_name are required'
      }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Verify officer permissions
    const verification = await verifyOfficerPermissions(supabase, user.id, guild_id)
    if (!verification.hasPermission) {
      return NextResponse.json({ error: 'Officer permissions required' }, { status: 403 })
    }

    // Resolve wowhead_id to a loot_item_id owned by this guild (GH #277 SCOPE-01).
    // A query failure here must NOT be treated as "not found" (404) — that
    // would silently hide a real error behind an ordinary-looking response.
    let lootItem
    try {
      lootItem = await resolveGuildLootItem(supabase, guild_id, wowhead_id)
    } catch (lookupError) {
      console.error('Failed to resolve guild-scoped loot item:', lookupError)
      trackApiError('unknown', 'POST /api/addon/loot-award', lookupError instanceof Error ? lookupError : new Error(String(lookupError)))
      return NextResponse.json({ error: `Failed to resolve item for wowhead_id ${wowhead_id}` }, { status: 500 })
    }

    if (!lootItem) {
      return NextResponse.json({ error: `No loot item found for wowhead_id ${wowhead_id}` }, { status: 404 })
    }

    // Resolve character name to character_id
    let characterId: string | null = null
    const { data: memberships } = await supabase
      .from('character_guild_memberships')
      .select('character_id, characters(id, name)')
      .eq('guild_id', guild_id)
      .eq('is_active', true)

    if (memberships) {
      for (const m of memberships) {
        const char = Array.isArray(m.characters) ? m.characters[0] : m.characters
        if (char && (char as { name: string }).name?.toLowerCase() === character_name.toLowerCase()) {
          characterId = m.character_id
          break
        }
      }
    }

    // Insert loot history entry. raid_tier_id and expansion_id come from the
    // guild-scoped lookup above (GH #294 D-01) — not from the request.
    const today = new Date().toISOString().split('T')[0]
    const { data: historyEntry, error: insertError } = await supabase
      .from('loot_history')
      .insert(
        buildAddonAwardRow({
          guildId: guild_id,
          item: lootItem,
          characterId,
          characterName: character_name,
          awardedDate: awarded_date,
          awardedBy: user.id,
          notes,
          bossName: boss_name,
          today,
        })
      )
      .select('id')
      .single()

    if (insertError) {
      console.error('Failed to insert loot history:', insertError)
      return NextResponse.json({ error: 'Failed to record award' }, { status: 500 })
    }

    trackEvent({
      event: 'loot_item_imported',
      userId: user.id,
      guildId: guild_id,
      properties: { source: 'addon', count: 1 },
    })
    evaluateGuildFunnel(supabase, guild_id)

    after(() =>
      notifyLootAward(supabase, guild_id, [
        { itemId: lootItem.id, characterName: character_name },
      ])
    )

    return NextResponse.json({
      data: {
        id: historyEntry?.id,
        item_name: lootItem.name,
        character_name,
        character_id: characterId,
      }
    })
  } catch (error) {
    console.error('Error in POST /api/addon/loot-award:', error)
    trackApiError('unknown', 'POST /api/addon/loot-award', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
