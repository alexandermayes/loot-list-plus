import { NextRequest, NextResponse } from 'next/server'
import { authenticateAddonRequest, authorizeAddonGuild } from '@/lib/addon/sync-tokens'
import { createTypedServiceRoleClient } from '@/utils/supabase/typed-service-role'
import { trackApiError } from '@/utils/analytics/server'
import { getAttendanceWindowEnd, resolveOwnedEvents, resolveActiveRaiderModifiers } from '@/domain/scoring'
import { toDateString } from '@/utils/date'
import { withFactionVariants } from '@/domain/loot/faction-item-aliases'
import { buildMemberRankedItems, fetchReceivedCounts } from '@/lib/addon/member-ranked-items'

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
 *
 * members[].items leave out removed list rows (FU-3 of #331, #293) and send
 * each raider's ranks best last (buildMemberRankedItems), so the companion's
 * last-wins collapse keeps the best rank. One listed entry per award of the
 * item to the raider is left out too, best rank first, as on the master
 * sheet and in the Gargul export (FU-C of 261001-tv5).
 *
 * Every read checks its PostgREST error. A failed read, the loot history read
 * behind the receive skip included, answers 500 { error: 'Internal server
 * error' } rather than a list that looks complete but is not (FIX-02, owner
 * decision 7). A missing guild_settings row, an absent BLP or priority row, or
 * a guild with no active expansion is not an error: those answer 200 with
 * empty values.
 */

/** Unwraps a PostgREST result, throwing into the route's catch (500 plus trackApiError) on error. */
function readOrThrow<T>(label: string, result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(`Failed to read ${label}: ${result.error.message}`)
  return result.data
}

/** readOrThrow for list reads: with the error ruled out, a null list can only be empty. */
function readRowsOrThrow<T>(label: string, result: { data: T[] | null; error: { message: string } | null }): T[] {
  return readOrThrow(label, result) ?? []
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAddonRequest(request)
    if (!auth.ok) return auth.response

    const guildId = request.nextUrl.searchParams.get('guild_id')
    if (!guildId) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    const supabase = createTypedServiceRoleClient()

    // Officer check plus sync-token guild scope (GH #300 D-02)
    const access = await authorizeAddonGuild(supabase, auth.principal, guildId)
    if (!access.ok) return access.response

    // Fetch guild info. maybeSingle: a missing guild is a 404, a failed read a 500.
    const guild = readOrThrow(
      'guilds',
      await supabase.from('guilds').select('id, name, active_expansion_id').eq('id', guildId).maybeSingle(),
    )

    if (!guild) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 })
    }

    // Fetch all data in parallel. A guild with no active expansion has no
    // expansion or tiers to read (expansion null, tiers []), and a guild with
    // no guild_settings row simply has no settings (maybeSingle, Pitfall 4).
    const activeExpansionId = guild.active_expansion_id
    const [
      settingsResult,
      expansionResult,
      raidTiersResult,
      membershipsResult,
      receivedCounts,
    ] = await Promise.all([
      supabase.from('guild_settings').select('*').eq('guild_id', guildId).maybeSingle(),
      activeExpansionId
        ? supabase.from('expansions').select('id, name, current_phase').eq('id', activeExpansionId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      activeExpansionId
        ? supabase.from('raid_tiers').select('id, name, phase').eq('expansion_id', activeExpansionId).order('phase')
        : Promise.resolve({ data: [], error: null }),
      supabase.from('character_guild_memberships').select(`
        character_id, role, membership_status,
        characters (id, name, wow_classes (name, color_hex), spec:class_specs (id, name))
      `).eq('guild_id', guildId).eq('is_active', true),
      fetchReceivedCounts(supabase, guildId),
    ])

    const settings = readOrThrow('guild_settings', settingsResult)
    const expansion = readOrThrow('expansions', expansionResult)
    const raidTiers = readRowsOrThrow('raid_tiers', raidTiersResult)
    const memberships = readRowsOrThrow('character_guild_memberships', membershipsResult)
    // Owner decision 7: a failed received-count read is a 500 like every other
    // read, so members[].items never go out without the receive skip.
    if (receivedCounts === null) {
      throw new Error('Failed to read loot_history for the receive skip')
    }

    const raidTierIds = raidTiers.map(rt => rt.id)

    // Fetch items, submissions, BLP, priorities and events in parallel.
    // Priorities are filtered by guild and raid tier, never by the full item
    // id list (URL length, Pitfall 3); an empty tier list reads nothing.
    const [lootItemsResult, submissionsResult, blpResult, prioritiesResult, raidEventsResult] = await Promise.all([
      // OD-01 (GH #290): loot_items has no `slot` column (it's `item_slot`,
      // matching export-string's route). Selecting `slot` made PostgREST
      // reject this whole query, so `items` was always []. The output key
      // stays `slot` — the companion's GuildData type reads that name.
      raidTierIds.length === 0
        ? Promise.resolve({ data: [], error: null })
        : supabase.from('loot_items').select('id, name, wowhead_id, boss_name, item_slot, item_type, classification, raid_tier_id')
            .in('raid_tier_id', raidTierIds).order('name'),
      supabase.from('loot_submissions').select(`
        id, character_id, phase, status,
        loot_submission_items (loot_item_id, rank, slot, removed_at, loot_items (wowhead_id))
      `).eq('guild_id', guildId).eq('status', 'approved'),
      // FIX-02: the table is blp_tracking (guild_id, character_id, loot_item_id, times_passed).
      supabase.from('blp_tracking').select('character_id, loot_item_id, times_passed').eq('guild_id', guildId),
      raidTierIds.length === 0
        ? Promise.resolve({ data: [], error: null })
        : supabase.from('guild_item_priorities')
            .select('item_id, role_priorities, class_priorities, character_priorities, priority_bonuses')
            .eq('guild_id', guildId).in('raid_tier_id', raidTierIds),
      // Drop events from the in-progress reset week so the addon's score
      // preview matches the web. `computeAttendance` already enforces this
      // on the web side; the addon consumes a pre-summarized payload, so the
      // filter has to happen here before we count and emit records.
      supabase.from('raid_events').select('id, raid_date, raid_team_id, is_bonus').eq('guild_id', guildId)
        .lte('raid_date', getAttendanceWindowEnd(toDateString(new Date()), settings?.week_reset_day))
        .order('raid_date', { ascending: false }).limit(settings?.rolling_attendance_weeks ? settings.rolling_attendance_weeks * 7 : 28),
    ])

    const lootItems = readRowsOrThrow('loot_items', lootItemsResult)
    const submissions = readRowsOrThrow('loot_submissions', submissionsResult)
    const blpRows = readRowsOrThrow('blp_tracking', blpResult)
    const priorityRows = readRowsOrThrow('guild_item_priorities', prioritiesResult)
    const raidEvents = readRowsOrThrow('raid_events', raidEventsResult)

    const raidEventIds = raidEvents.map(e => e.id)
    const attendanceRecords = readRowsOrThrow(
      'attendance_records',
      raidEventIds.length === 0
        ? { data: [], error: null }
        : await supabase
            .from('attendance_records')
            .select('character_id, raid_event_id, attended, signed_up, status')
            .in('raid_event_id', raidEventIds),
    )

    // Team membership per character — drives team-aware totalRaids
    const teamMembers = readRowsOrThrow(
      'raid_team_members',
      await supabase
        .from('raid_team_members')
        .select('character_id, raid_team_id')
        .eq('guild_id', guildId),
    )
    const teamIdByCharacterId = new Map<string, string>()
    for (const m of teamMembers) teamIdByCharacterId.set(m.character_id, m.raid_team_id)

    // Build raid name lookup
    const raidNameMap: Record<string, string> = {}
    for (const rt of raidTiers) {
      raidNameMap[rt.id] = rt.name
    }

    // Build items. Mirrored under the other faction's id (GH #290): the
    // companion and addon key items and member ranks by exact wowhead_id
    // (see withFactionVariants' doc comment), so a Horde-looted quest head
    // needs its own entry alongside the catalog's Alliance row.
    const items = withFactionVariants(lootItems.map(item => ({
      id: item.id,
      name: item.name,
      wowhead_id: item.wowhead_id,
      boss_name: item.boss_name,
      raid_name: (item.raid_tier_id ? raidNameMap[item.raid_tier_id] : undefined) || 'Unknown',
      classification: item.classification,
      slot: item.item_slot,
      item_type: item.item_type,
    })))

    // Build submission lookup: removed rows out, best rank last, faction
    // mirrors (see lib/addon/member-ranked-items.ts)
    // Rows without a character cannot belong to a member, so leaving them out
    // changes no output (members only look up real ids).
    const submissionsByChar = buildMemberRankedItems(
      submissions.filter((sub): sub is typeof sub & { character_id: string } => sub.character_id !== null),
      receivedCounts,
    )

    // Build members
    interface CharData { id: string; name: string; wow_classes: { name: string; color_hex: string } | { name: string; color_hex: string }[]; spec: { id: string; name: string; role: string } | { id: string; name: string; role: string }[] | null }
    const members = memberships.map(m => {
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
    for (const p of priorityRows) {
      // Output key stays the loot item id (guild_item_priorities.item_id).
      priorities[p.item_id] = {
        role_priorities: p.role_priorities || {},
        class_priorities: p.class_priorities || {},
        character_priorities: p.character_priorities || {},
        priority_bonuses: p.priority_bonuses || { role: 5, class: 3, character: 2 },
      }
    }

    // Build BLP
    const blp: Record<string, Record<string, number>> = {}
    for (const b of blpRows) {
      if (!blp[b.character_id]) blp[b.character_id] = {}
      blp[b.character_id][b.loot_item_id] = b.times_passed
    }

    // Build attendance: per-character totalRaids resolved via the same
    // team-aware dedup as the web engine, so the addon's in-game score
    // preview matches the website.
    type AttendanceRow = (typeof attendanceRecords)[number] & { raid_event_id: string }
    const recordsByCharacter = new Map<string, AttendanceRow[]>()
    for (const rec of attendanceRecords) {
      // The read filters raid_event_id with .in(), so a null id cannot occur;
      // the guard only narrows the type.
      if (!rec.character_id || !rec.raid_event_id) continue
      const arr = recordsByCharacter.get(rec.character_id) ?? []
      arr.push({ ...rec, raid_event_id: rec.raid_event_id })
      recordsByCharacter.set(rec.character_id, arr)
    }
    const characterIds = new Set<string>([
      ...memberships.map(m => m.character_id),
      ...recordsByCharacter.keys(),
    ])
    const allEvents = raidEvents
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
    const settingsForExport = settings
      ? {
          ...settings,
          single_raider_modifiers: resolveActiveRaiderModifiers(
            // Json column: narrowed at the mapping point, value unchanged.
            settings.single_raider_modifiers as Parameters<typeof resolveActiveRaiderModifiers>[0],
            toDateString(new Date()),
          ),
        }
      : {}

    return NextResponse.json({
      guildId: guild.id,
      guildName: guild.name,
      expansionId: expansion?.id,
      phase: expansion?.current_phase,
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
