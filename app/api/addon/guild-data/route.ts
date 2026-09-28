import { NextRequest, NextResponse } from 'next/server'
import { authenticateAddonRequest, authorizeAddonGuild } from '@/lib/addon/sync-tokens'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { trackApiError } from '@/utils/analytics/server'
import { getAttendanceWindowEnd, resolveOwnedEvents, resolveActiveRaiderModifiers } from '@/domain/scoring'
import { toDateString } from '@/utils/date'
import { withFactionVariants } from '@/domain/loot/faction-item-aliases'

/**
 * GET /api/addon/guild-data
 *
 * Bulk fetch all data needed by the addon in JSON format.
 * Used by the companion desktop app for auto-sync.
 *
 * Query params:
 * - guild_id: Required
 *
 * Auth: Session cookie or Bearer sync token scoped to guild_id (GH #300)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAddonRequest(request)
    if (!auth.ok) return auth.response

    const guildId = request.nextUrl.searchParams.get('guild_id')
    if (!guildId) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Officer check plus sync-token guild scope (GH #300 D-02)
    const access = await authorizeAddonGuild(supabase, auth.principal, guildId)
    if (!access.ok) return access.response

    // Fetch guild info
    const { data: guild } = await supabase
      .from('guilds')
      .select('id, name, active_expansion_id')
      .eq('id', guildId)
      .single()

    if (!guild) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 })
    }

    // Fetch all data in parallel
    const [
      settingsResult,
      expansionResult,
      raidTiersResult,
      membershipsResult,
    ] = await Promise.all([
      supabase.from('guild_settings').select('*').eq('guild_id', guildId).single(),
      supabase.from('expansions').select('id, name, current_phase').eq('id', guild.active_expansion_id).single(),
      supabase.from('raid_tiers').select('id, name, phase').eq('expansion_id', guild.active_expansion_id).order('phase'),
      supabase.from('character_guild_memberships').select(`
        character_id, role, membership_status,
        characters (id, name, wow_classes (name, color_hex), spec:class_specs (id, name))
      `).eq('guild_id', guildId).eq('is_active', true),
    ])

    const raidTierIds = raidTiersResult.data?.map(rt => rt.id) || []

    // Fetch items, submissions, BLP, and events in parallel
    const [lootItemsResult, submissionsResult, blpResult, raidEventsResult] = await Promise.all([
      // OD-01 (GH #290): loot_items has no `slot` column (it's `item_slot`,
      // matching export-string's route). Selecting `slot` made PostgREST
      // reject this whole query, so `items` was always []. The output key
      // stays `slot` — the companion's GuildData type reads that name.
      supabase.from('loot_items').select('id, name, wowhead_id, boss_name, item_slot, item_type, classification, raid_tier_id')
        .in('raid_tier_id', raidTierIds).order('name'),
      supabase.from('loot_submissions').select(`
        id, character_id, phase, status,
        loot_submission_items (loot_item_id, rank, loot_items (wowhead_id))
      `).eq('guild_id', guildId).eq('status', 'approved'),
      supabase.from('bad_luck_protection').select('character_id, loot_item_id, times_passed').eq('guild_id', guildId),
      // Drop events from the in-progress reset week so the addon's score
      // preview matches the web. `computeAttendance` already enforces this
      // on the web side; the addon consumes a pre-summarized payload, so the
      // filter has to happen here before we count and emit records.
      supabase.from('raid_events').select('id, raid_date, raid_team_id, is_bonus').eq('guild_id', guildId)
        .lte('raid_date', getAttendanceWindowEnd(toDateString(new Date()), settingsResult.data?.week_reset_day))
        .order('raid_date', { ascending: false }).limit(settingsResult.data?.rolling_attendance_weeks ? settingsResult.data.rolling_attendance_weeks * 7 : 28),
    ])

    // Fetch priorities (depends on lootItemsResult)
    const lootItemIds = lootItemsResult.data?.map(i => i.id) || []
    const prioritiesResult = await supabase
      .from('item_priorities')
      .select('loot_item_id, role_priorities, class_priorities, character_priorities, priority_bonuses')
      .in('loot_item_id', lootItemIds)

    const raidEventIds = raidEventsResult.data?.map(e => e.id) || []
    const { data: attendanceRecords } = await supabase
      .from('attendance_records')
      .select('character_id, raid_event_id, attended, signed_up, status')
      .in('raid_event_id', raidEventIds)

    // Team membership per character — drives team-aware totalRaids
    const { data: teamMembers } = await supabase
      .from('raid_team_members')
      .select('character_id, raid_team_id')
      .eq('guild_id', guildId)
    const teamIdByCharacterId = new Map<string, string>()
    for (const m of teamMembers ?? []) teamIdByCharacterId.set(m.character_id, m.raid_team_id)

    // Build raid name lookup
    const raidNameMap: Record<string, string> = {}
    for (const rt of raidTiersResult.data || []) {
      raidNameMap[rt.id] = rt.name
    }

    // Build items. Mirrored under the other faction's id (GH #290): the
    // companion and addon key items and member ranks by exact wowhead_id
    // (see withFactionVariants' doc comment), so a Horde-looted quest head
    // needs its own entry alongside the catalog's Alliance row.
    const items = withFactionVariants((lootItemsResult.data || []).map(item => ({
      id: item.id,
      name: item.name,
      wowhead_id: item.wowhead_id,
      boss_name: item.boss_name,
      raid_name: raidNameMap[item.raid_tier_id] || 'Unknown',
      classification: item.classification,
      slot: item.item_slot,
      item_type: item.item_type,
    })))

    // Build submission lookup
    const submissionsByChar: Record<string, Array<{ wowhead_id: number; rank: number }>> = {}
    for (const sub of submissionsResult.data || []) {
      if (!sub.loot_submission_items) continue
      const charItems: Array<{ wowhead_id: number; rank: number }> = []
      for (const item of sub.loot_submission_items) {
        const lootItem = Array.isArray(item.loot_items) ? item.loot_items[0] : item.loot_items
        if (lootItem?.wowhead_id) {
          charItems.push({ wowhead_id: lootItem.wowhead_id, rank: item.rank })
        }
      }
      submissionsByChar[sub.character_id] = withFactionVariants(charItems)
    }

    // Build members
    interface CharData { id: string; name: string; wow_classes: { name: string; color_hex: string } | { name: string; color_hex: string }[]; spec: { id: string; name: string; role: string } | { id: string; name: string; role: string }[] | null }
    const members = (membershipsResult.data || []).map(m => {
      const char = (Array.isArray(m.characters) ? m.characters[0] : m.characters) as CharData | undefined
      if (!char) return null
      const wowClass = Array.isArray(char.wow_classes) ? char.wow_classes[0] : char.wow_classes
      const spec = Array.isArray(char.spec) ? char.spec[0] : char.spec
      return {
        character_id: m.character_id,
        name: char.name,
        class_token: wowClass?.name?.toUpperCase().replace(/\s/g, '') || 'UNKNOWN',
        class_color: wowClass?.color_hex || '#ffffff',
        spec_name: spec?.name || null,
        spec_id: spec?.id || null,
        role: spec?.role || null,
        guild_role: m.role,
        membership_status: m.membership_status || 'full',
        items: submissionsByChar[m.character_id] || [],
      }
    }).filter(Boolean)

    // Build priorities
    const priorities: Record<string, unknown> = {}
    for (const p of prioritiesResult.data || []) {
      priorities[p.loot_item_id] = {
        role_priorities: p.role_priorities || {},
        class_priorities: p.class_priorities || {},
        character_priorities: p.character_priorities || {},
        priority_bonuses: p.priority_bonuses || { role: 5, class: 3, character: 2 },
      }
    }

    // Build BLP
    const blp: Record<string, Record<string, number>> = {}
    for (const b of blpResult.data || []) {
      if (!blp[b.character_id]) blp[b.character_id] = {}
      blp[b.character_id][b.loot_item_id] = b.times_passed
    }

    // Build attendance: per-character totalRaids resolved via the same
    // team-aware dedup as the web engine, so the addon's in-game score
    // preview matches the website.
    const recordsByCharacter = new Map<string, NonNullable<typeof attendanceRecords>>()
    for (const rec of attendanceRecords || []) {
      if (!rec.character_id) continue
      const arr = recordsByCharacter.get(rec.character_id) ?? []
      arr.push(rec)
      recordsByCharacter.set(rec.character_id, arr)
    }
    const characterIds = new Set<string>([
      ...(membershipsResult.data ?? []).map(m => m.character_id),
      ...recordsByCharacter.keys(),
    ])
    const allEvents = (raidEventsResult.data || []) as Array<{ id: string; raid_date: string; raid_team_id: string | null; is_bonus: boolean }>
    const attendance: Record<string, { records: Array<{ signed_up: boolean; attended: boolean; no_call_no_show: boolean }>; totalRaids: number }> = {}
    for (const cid of characterIds) {
      const charRecords = recordsByCharacter.get(cid) ?? []
      const recordEventIds = new Set(charRecords.map(r => r.raid_event_id))
      const owned = resolveOwnedEvents(allEvents, recordEventIds, teamIdByCharacterId.get(cid) ?? null)
      const ownedIds = new Set(owned.map(e => e.id))
      attendance[cid] = {
        totalRaids: owned.length,
        records: charRecords
          .filter(r => ownedIds.has(r.raid_event_id))
          .map(r => ({
            signed_up: r.signed_up || false,
            attended: r.attended || false,
            no_call_no_show: r.status === 'no_show',
          })),
      }
    }

    // Collapse per-raider modifier entries into a flat active map so the Lua
    // engine reads a simple { characterId: amount } map and stays date-free.
    const settingsForExport = settingsResult.data
      ? {
          ...settingsResult.data,
          single_raider_modifiers: resolveActiveRaiderModifiers(
            settingsResult.data.single_raider_modifiers as Parameters<typeof resolveActiveRaiderModifiers>[0],
            toDateString(new Date()),
          ),
        }
      : {}

    return NextResponse.json({
      guildId: guild.id,
      guildName: guild.name,
      expansionId: expansionResult.data?.id,
      phase: expansionResult.data?.current_phase,
      settings: settingsForExport,
      items,
      members,
      priorities,
      blp,
      attendance,
    })
  } catch (error) {
    console.error('Error in GET /api/addon/guild-data:', error)
    trackApiError('unknown', 'GET /api/addon/guild-data', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
