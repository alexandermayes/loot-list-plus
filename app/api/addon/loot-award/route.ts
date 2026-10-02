import { NextRequest, NextResponse, after } from 'next/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { authenticateAddonRequest, authorizeAddonGuild } from '@/lib/addon/sync-tokens'
import { trackApiError, trackEvent } from '@/utils/analytics/server'
import { evaluateGuildFunnel } from '@/utils/analytics/funnel'
import { notifyLootAward } from '@/lib/discord-loot-announcements'
import { resolveGuildLootItem } from '@/lib/loot/guild-scoped-lookup'
import { buildAddonAwardRow } from '@/lib/loot/loot-history-rows'
import { addonAwardKeys, insertAddonAward, type AddonAwardInsertResult } from '@/lib/loot/addon-award-insert'
import { findAwardRaidEvent } from '@/utils/raid-events/team-routing'
import { recomputeBlpForItems } from '@/utils/blp/recompute'

interface LootAwardRequest {
  guild_id: string
  wowhead_id: number
  character_name: string
  boss_name?: string
  awarded_date?: string
  /** The addon's own award timestamp (UTC ISO), optional (FU-1 of #331, #293). */
  awarded_at?: unknown
  /** The addon's own award id, optional (FU-C of 261001-tv5). */
  award_id?: unknown
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
 *
 * GH #307: when the item sits in more than one of the guild's tiers, the
 * award's boss_name picks the tier (the tier whose row has that boss, or
 * whose 'Shared Boss Loot' / 'Trash' row sits with that boss). No raid name
 * is passed: the companion sends none, and the addon's award raidName is
 * the cached catalog row's raid, not the live instance.
 *
 * GH #295: the award is linked to the guild's raid night for its
 * awarded_date and the raider's team (findAwardRaidEvent, the raid-tracking
 * import's team rules). The night is only ever found, never created; with
 * no single night, no awarded_date, or a failed lookup the award is saved
 * unlinked, exactly as before, and never rejected. A re-sent award on the
 * same night returns 200 with already_recorded true and no side effects
 * (insertAddonAward). A newly linked award recomputes BLP for its item.
 *
 * FU-1 of #331, #293: an optional awarded_at (the addon's UTC ISO award
 * timestamp) gives the award the same addonAwardKey the export-string import
 * builds for that in-game award, so the two paths dedupe against each other
 * and a second copy of an item on one night synced in a later batch is
 * recorded. A missing or malformed awarded_at is never rejected; the award
 * then takes the keyless path, exactly as before. Companion 1.0.0 sends
 * none; companion 1.1.0 forwards it.
 *
 * FU-C of 261001-tv5: an optional award_id (the addon's own award id, sent
 * by companion 1.1.0 for awards from addon 1.1.0) gives the award the
 * 'addon2:' key the export-string import builds from the same awardId, with
 * its awarded_at key looked up as an alternate so an award first stored
 * under that older key is not recorded twice. A missing or malformed
 * award_id is never rejected; the award then keys on awarded_at as above.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAddonRequest(request)
    if (!auth.ok) return auth.response

    const body: LootAwardRequest = await request.json()
    const { guild_id, wowhead_id, character_name, boss_name, awarded_date, awarded_at, award_id, notes } = body

    if (!guild_id || !wowhead_id || !character_name) {
      return NextResponse.json({
        error: 'guild_id, wowhead_id, and character_name are required'
      }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Officer check plus sync-token guild scope (GH #300 D-02)
    const access = await authorizeAddonGuild(supabase, auth.principal, guild_id)
    if (!access.ok) return access.response

    // Resolve wowhead_id to a loot_item_id owned by this guild (GH #277 SCOPE-01).
    // A query failure here must NOT be treated as "not found" (404) — that
    // would silently hide a real error behind an ordinary-looking response.
    let lootItem
    try {
      lootItem = await resolveGuildLootItem(supabase, guild_id, wowhead_id, { bossName: boss_name ?? null })
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

    // Find the guild's raid night for this award (GH #295). Only the
    // explicit awarded_date is matched, never the server's today. A lookup
    // failure saves the award unlinked: the companion never retries a
    // failed award, so a 500 here would lose it (PD-05).
    let raidEventId: string | null = null
    let raidNight: string
    try {
      const night = await findAwardRaidEvent(supabase, guild_id, awarded_date, characterId)
      raidEventId = night.raidEventId
      raidNight = night.outcome
    } catch (nightError) {
      console.error('Failed to look up the raid night for an addon award:', nightError)
      trackApiError('unknown', 'POST /api/addon/loot-award', nightError instanceof Error ? nightError : new Error(String(nightError)))
      raidNight = 'lookup_failed'
    }

    // Insert loot history entry. raid_tier_id and expansion_id come from the
    // guild-scoped lookup above (GH #294 D-01) — not from the request.
    const today = new Date().toISOString().split('T')[0]
    const keys = addonAwardKeys({
      awardedAt: awarded_at,
      wowheadId: wowhead_id,
      characterName: character_name,
      awardId: award_id,
    })
    let result: AddonAwardInsertResult
    try {
      result = await insertAddonAward(
        supabase,
        buildAddonAwardRow({
          guildId: guild_id,
          item: lootItem,
          characterId,
          characterName: character_name,
          awardedDate: awarded_date,
          awardedBy: access.userId,
          notes,
          bossName: boss_name,
          raidEventId,
          sourceAwardKey: keys.key,
          today,
        }),
        { alternateKeys: keys.alternateKeys },
      )
    } catch (insertError) {
      console.error('Failed to insert loot history:', insertError)
      return NextResponse.json({ error: 'Failed to record award' }, { status: 500 })
    }

    const responseData = {
      id: result.id,
      item_name: lootItem.name,
      character_name,
      character_id: characterId,
      raid_event_id: raidEventId,
      raid_night: raidNight,
    }

    // A re-send of an award already on this night: nothing new happened,
    // so no analytics, funnel check, Discord announcement or BLP recompute.
    if (result.status === 'already_recorded') {
      return NextResponse.json({ data: { ...responseData, already_recorded: true } })
    }

    trackEvent({
      event: 'loot_item_imported',
      userId: access.userId,
      guildId: guild_id,
      properties: { source: 'addon', count: 1 },
    })
    evaluateGuildFunnel(supabase, guild_id)

    after(() =>
      notifyLootAward(supabase, guild_id, [
        { itemId: lootItem.id, characterName: character_name, raidEventId },
      ])
    )

    // A linked award is a drop at that night for BLP (PD-09). The SQL
    // returns early when the guild has BLP off.
    if (raidEventId) {
      after(() => recomputeBlpForItems(supabase, guild_id, [lootItem.id]))
    }

    return NextResponse.json({ data: { ...responseData, already_recorded: false } })
  } catch (error) {
    console.error('Error in POST /api/addon/loot-award:', error)
    trackApiError('unknown', 'POST /api/addon/loot-award', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
