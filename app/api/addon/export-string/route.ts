// Force recompile v3
import { NextRequest, NextResponse } from 'next/server'
import { authenticateAddonRequest, authorizeAddonGuild } from '@/lib/addon/sync-tokens'
import { createTypedServiceRoleClient } from '@/utils/supabase/typed-service-role'
import { selectAllPagesOrThrow } from '@/utils/supabase/paginate'
import { trackApiError } from '@/utils/analytics/server'
import { getAttendanceWindowEnd, resolveOwnedEvents, resolveActiveRaiderModifiers } from '@/domain/scoring'
import { toDateString } from '@/utils/date'
import { deflateRawSync } from 'zlib'
import { withFactionVariants } from '@/domain/loot/faction-item-aliases'
import { buildMemberRankedItems, fetchReceivedCounts, inExportExpansion, type MemberRankedItem } from '@/lib/addon/member-ranked-items'
import type { Json } from '@/lib/database.types'

/**
 * GET /api/addon/export-string
 *
 * Generates a compressed import string for the WoW addon.
 * Contains all guild data needed for loot distribution in-game.
 *
 * Query params:
 * - guild_id: Required
 *
 * members[].items leave out removed list rows (FU-3 of #331, #293) and send
 * each raider's ranks best last (buildMemberRankedItems), so the addon's
 * last-wins import keeps the best rank. One listed entry per award of the
 * item to the raider is left out too, best rank first, as on the master
 * sheet and in the Gargul export (FU-C of 261001-tv5). The payload shape and
 * the LLP1:1 prefix are unchanged. members[].items merge every approved list
 * the raider has in the exported expansion (GH #355); lists with no
 * expansion_id still go out.
 *
 * Every read checks its PostgREST error. A failed read, the loot history read
 * behind the receive skip included, answers 500 { error: 'Internal server
 * error' } rather than an import string that looks complete but is not
 * (FIX-02, owner decisions 7 and 8). A missing guild_settings row, an absent
 * BLP or priority row, or a guild with no raid tiers is not an error: those
 * answer 200 with empty values.
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

    // Fetch guild settings. maybeSingle: a guild with no settings row has no
    // settings (Pitfall 4), which is not an error.
    const settings = readOrThrow(
      'guild_settings',
      await supabase.from('guild_settings').select('*').eq('guild_id', guildId).maybeSingle(),
    )

    // Collapse per-raider modifier entries into a flat active map so the Lua
    // engine reads a simple { characterId: amount } map and stays date-free.
    if (settings) {
      settings.single_raider_modifiers = resolveActiveRaiderModifiers(
        settings.single_raider_modifiers as Parameters<typeof resolveActiveRaiderModifiers>[0],
        toDateString(new Date()),
      )
    }

    // Get active expansion - fall back by tracing from guild's loot items
    let expansion: { id: string; name: string; current_phase: number | null } | null = null
    let expansionId = guild.active_expansion_id

    if (expansionId) {
      expansion = readOrThrow(
        'expansions',
        await supabase.from('expansions').select('id, name, current_phase').eq('id', expansionId).maybeSingle(),
      )
    }

    // If no active expansion, get the guild's current expansion via the RPC
    if (!expansion) {
      const guildExpansions = readOrThrow(
        'get_guild_expansions',
        await supabase.rpc('get_guild_expansions', { p_guild_id: guildId }),
      )

      if (guildExpansions && guildExpansions.length > 0) {
        // Find the "current" one first, fall back to first
        const current = guildExpansions.find(e => e.is_current) || guildExpansions[0]
        expansionId = current.expansion_id
        expansion = readOrThrow(
          'expansions',
          await supabase.from('expansions').select('id, name, current_phase').eq('id', expansionId).maybeSingle(),
        )
      }
    }

    // Fetch raid tiers and their items in one joined query. Not paged: one
    // expansion's tiers are a handful of rows, and PostgREST's max_rows cap
    // applies to the top-level rows (tiers), not to the embedded loot_items.
    const tierRows = expansionId
      ? readRowsOrThrow(
          'raid_tiers',
          await supabase
            .from('raid_tiers')
            .select('id, name, phase, loot_items(id, name, wowhead_id, boss_name, item_slot, item_type, classification, raid_tier_id)')
            .eq('expansion_id', expansionId)
            .order('phase', { ascending: true }),
        )
      : []

    const raidTiers = tierRows.map(t => ({ id: t.id, name: t.name, phase: t.phase }))
    const raidTierIds = raidTiers.map((rt: { id: string }) => rt.id)

    // Flatten items from all tiers
    const lootItems: BuildPayloadArgs['lootItems'] = []
    for (const tier of tierRows) {
      for (const item of tier.loot_items || []) {
        lootItems.push(item)
      }
    }
    console.log('[addon/export] tiers:', raidTiers.length, 'items:', lootItems.length, 'expId:', expansionId)

    // Build raid name lookup
    const raidNameMap: Record<string, string> = {}
    for (const rt of raidTiers || []) {
      raidNameMap[rt.id] = rt.name
    }

    // Guild members, from active memberships only (the same rule the award
    // check uses, findInvalidCharacterIds): a guild with no active member
    // exports no members, rather than deriving a roster from draft or
    // rejected lists (GH #326).
    const { data: activeMemberships, error: membershipsError } = await supabase
      .from('character_guild_memberships')
      .select(`
        character_id,
        role,
        membership_status,
        characters (
          id, name, user_id,
          wow_classes (name, color_hex),
          spec:class_specs (id, name)
        )
      `)
      .eq('guild_id', guildId)
      .eq('is_active', true)

    if (membershipsError) {
      throw new Error('Failed to read guild memberships for the addon export')
    }

    const memberships: BuildPayloadArgs['memberships'] = activeMemberships ?? []

    console.log('[addon/export-string] character_guild_memberships:', memberships.length)

    // Fetch approved submissions. Paged (the server caps one response at
    // max_rows = 1000), oldest first with id breaking ties, so no row is
    // skipped or repeated between pages and buildMemberRankedItems breaks
    // rank ties in a stable read order (the read had no ORDER BY before).
    const submissionRows = await selectAllPagesOrThrow('loot_submissions', (start, end) =>
      supabase
        .from('loot_submissions')
        .select(`
          id, character_id, expansion_id, phase, status,
          loot_submission_items (
            loot_item_id, rank, slot, removed_at,
            loot_items (wowhead_id)
          )
        `)
        .eq('guild_id', guildId)
        .eq('status', 'approved')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(start, end))

    // Only the exported expansion's lists go out, so a raider's lists from
    // another expansion do not leak in (GH #355). Lists with no expansion_id
    // are kept: the column is nullable and those rows were exported before.
    const submissions = inExportExpansion(submissionRows, expansionId)

    // Awards per raider and item, for the receive skip. Owner decision 8: a
    // failed read (null) is a 500 like every other read, so members[].items
    // never go out without the receive skip.
    const receivedCounts = await fetchReceivedCounts(supabase, guildId)
    if (receivedCounts === null) {
      throw new Error('Failed to read loot_history for the receive skip')
    }

    // Priority lists (FIX-02: the table is guild_item_priorities). Filtered by
    // guild and raid tier, never by the full item id list (URL length,
    // Pitfall 3); a guild with no raid tiers reads nothing. Paged and ordered
    // by the primary key so a large guild is never cut at the 1000-row cap.
    const priorities = raidTierIds.length === 0
      ? []
      : await selectAllPagesOrThrow('guild_item_priorities', (start, end) =>
          supabase.from('guild_item_priorities')
            .select('item_id, role_priorities, class_priorities, character_priorities, priority_bonuses')
            .eq('guild_id', guildId).in('raid_tier_id', raidTierIds)
            .order('id', { ascending: true })
            .range(start, end))

    // BLP (FIX-02: the table is blp_tracking), paged the same way.
    const blpData = await selectAllPagesOrThrow('blp_tracking', (start, end) =>
      supabase.from('blp_tracking')
        .select('character_id, loot_item_id, times_passed')
        .eq('guild_id', guildId)
        .order('id', { ascending: true })
        .range(start, end))

    // Fetch attendance records. Drop events from the in-progress reset week
    // so the addon's score preview matches the web (see computeAttendance).
    // Bounded by .limit (28 events by default), so one read suffices.
    const raidEvents = readRowsOrThrow(
      'raid_events',
      await supabase
        .from('raid_events')
        .select('id, raid_date, raid_team_id, is_bonus')
        .eq('guild_id', guildId)
        .lte('raid_date', getAttendanceWindowEnd(toDateString(new Date()), (settings as { week_reset_day?: number | null } | null)?.week_reset_day))
        .order('raid_date', { ascending: false })
        .limit(settings?.rolling_attendance_weeks ? settings.rolling_attendance_weeks * 7 : 28),
    )

    // 28 events by 40 raiders is already 1120 rows, past the server cap, so
    // this read is paged too. No events in the window means nothing to read.
    const raidEventIds = raidEvents.map(e => e.id)
    const attendanceRecords = raidEventIds.length === 0
      ? []
      : await selectAllPagesOrThrow('attendance_records', (start, end) =>
          supabase
            .from('attendance_records')
            .select('character_id, raid_event_id, attended, signed_up, status')
            .in('raid_event_id', raidEventIds)
            .order('id', { ascending: true })
            .range(start, end))

    // Look up raid team membership per character for team-aware denominator.
    // Bounded by one guild's registered characters (unique on guild and character).
    const teamMembers = readRowsOrThrow(
      'raid_team_members',
      await supabase
        .from('raid_team_members')
        .select('character_id, raid_team_id')
        .eq('guild_id', guildId),
    )
    const teamIdByCharacterId = new Map<string, string>()
    for (const m of teamMembers) teamIdByCharacterId.set(m.character_id, m.raid_team_id)

    // Pre-build per-character attendance summary using resolveOwnedEvents so
    // the addon's in-game score preview matches the website. Each raider gets
    // their own `totalRaids` (denominator restricted to their team + null
    // events) and a filtered record set.
    type AttendanceRow = NonNullable<typeof attendanceRecords>[number] & { raid_event_id: string }
    const recordsByCharacter = new Map<string, AttendanceRow[]>()
    for (const rec of attendanceRecords || []) {
      // The read filters raid_event_id with .in(), so a null id cannot occur;
      // the guard only narrows the type.
      if (!rec.character_id || !rec.raid_event_id) continue
      const arr = recordsByCharacter.get(rec.character_id) ?? []
      arr.push({ ...rec, raid_event_id: rec.raid_event_id })
      recordsByCharacter.set(rec.character_id, arr)
    }
    const characterIds = new Set<string>([
      ...(memberships ?? []).map(m => m.character_id),
      ...recordsByCharacter.keys(),
    ])
    const allEvents = (raidEvents || []) as Array<{ id: string; raid_date: string; raid_team_id: string | null; is_bonus: boolean }>
    const attendanceByCharacter: Record<string, {
      records: Array<{ signed_up: boolean; attended: boolean; no_call_no_show: boolean }>
      totalRaids: number
    }> = {}
    for (const cid of characterIds) {
      const charRecords = recordsByCharacter.get(cid) ?? []
      const recordEventIds = new Set(charRecords.map(r => r.raid_event_id))
      const owned = resolveOwnedEvents(allEvents, recordEventIds, teamIdByCharacterId.get(cid) ?? null)
      const ownedIds = new Set(owned.map(e => e.id))
      attendanceByCharacter[cid] = {
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

    // Debug: log data counts (v3)
    console.log('[addon/export-string] v3 Guild:', guild.name, 'Expansion:', expansion?.name, 'ExpID:', expansionId)
    console.log('[addon/export-string] Tier IDs:', raidTierIds.slice(0, 3), '...total:', raidTierIds.length)

    // Debug: check if items exist for ANY of these tiers
    if (raidTierIds.length > 0) {
      const { count } = await supabase.from('loot_items').select('id', { count: 'exact', head: true }).eq('raid_tier_id', raidTierIds[0])
      console.log('[addon/export-string] Items in first tier:', count)
    }
    console.log('[addon/export-string] Raid tiers:', raidTiers?.length, 'Items:', lootItems?.length)
    console.log('[addon/export-string] Memberships:', memberships?.length, 'Submissions:', submissions?.length)
    console.log('[addon/export-string] BLP:', blpData?.length, 'Attendance:', attendanceRecords?.length)

    // Build the export payload
    const payload = buildExportPayload({
      guild,
      settings,
      expansion,
      lootItems: lootItems || [],
      raidNameMap,
      memberships: memberships || [],
      // Rows without a character cannot belong to a member, so leaving them
      // out changes no output (members only look up real ids).
      memberItems: buildMemberRankedItems(
        (submissions || []).filter((sub): sub is typeof sub & { character_id: string } => sub.character_id !== null),
        receivedCounts,
      ),
      priorities,
      blpData,
      attendanceByCharacter,
    })

    // Compress and encode
    const jsonStr = JSON.stringify(payload)
    const compressed = deflateRawSync(Buffer.from(jsonStr))
    const encoded = compressed.toString('base64')
    const exportString = `LLP1:1:${encoded}`

    // stats.submissions counts only approved lists whose character is in the
    // exported members[] (GH #326): a raider who left the guild no longer
    // inflates this count, even though a legacy approved list of theirs
    // still exists.
    const exportedMemberIds = new Set(payload.members.map(m => m?.character_id))
    const exportedSubmissionCount = (submissions || []).filter(
      s => s.character_id != null && exportedMemberIds.has(s.character_id),
    ).length

    return NextResponse.json({
      exportString,
      stats: {
        items: lootItems?.length || 0,
        members: memberships?.length || 0,
        submissions: exportedSubmissionCount,
        raidTiers: raidTiers?.length || 0,
        expansion: expansion?.name || null,
        compressedSize: encoded.length,
        uncompressedSize: jsonStr.length,
      }
    })
  } catch (error) {
    console.error('Error in GET /api/addon/export-string:', error)
    trackApiError('unknown', 'GET /api/addon/export-string', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

interface BuildPayloadArgs {
  guild: { id: string; name: string; active_expansion_id: string | null }
  settings: Record<string, unknown> | null
  expansion: { id: string; name: string; current_phase: number | null } | null
  lootItems: Array<{
    id: string; name: string; wowhead_id: number | null; boss_name: string | null;
    item_slot: string | null; item_type: string | null; classification: string | null;
    raid_tier_id: string | null
  }>
  raidNameMap: Record<string, string>
  memberships: Array<{
    character_id: string; role: string | null; membership_status: string | null;
    characters: unknown
  }>
  /** characterId -> ranked items, from buildMemberRankedItems. */
  memberItems: Record<string, MemberRankedItem[]>
  // Json columns, as the typed client reports them; passed through unchanged.
  priorities: Array<{
    item_id: string; role_priorities: Json | null;
    class_priorities: Json | null; character_priorities: Json | null;
    priority_bonuses: Json | null
  }>
  blpData: Array<{ character_id: string; loot_item_id: string; times_passed: number }>
  /**
   * Pre-computed per-character attendance. The route handler resolves which
   * events each raider owes (team-aware) and emits per-character `totalRaids`
   * plus the filtered record set. The Lua score engine consumes this directly.
   */
  attendanceByCharacter: Record<string, {
    records: Array<{ signed_up: boolean; attended: boolean; no_call_no_show: boolean }>
    totalRaids: number
  }>
}

function buildExportPayload(args: BuildPayloadArgs) {
  const { guild, settings, expansion, lootItems, raidNameMap, memberships,
          memberItems, priorities, blpData, attendanceByCharacter } = args

  // Build items array. Mirrored under the other faction's id (GH #290): the
  // addon keys items and member ranks by exact wowhead_id (see
  // withFactionVariants' doc comment in faction-item-aliases.ts), so a
  // Horde-looted quest head needs its own entry alongside the catalog's
  // Alliance row. stats.items (below) still reports lootItems.length, the
  // catalog row count, not this mirrored count.
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

  // Build members array
  interface CharacterData {
    id: string
    name: string
    user_id: string
    wow_classes: { name: string; color_hex: string } | { name: string; color_hex: string }[]
    spec: { id: string; name: string; role: string } | { id: string; name: string; role: string }[] | null
  }

  const members = memberships.map(m => {
    const char = (Array.isArray(m.characters) ? m.characters[0] : m.characters) as CharacterData | undefined
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
      items: memberItems[m.character_id] || [],
    }
  }).filter(Boolean)

  // Build priorities map
  const prioritiesMap: Record<string, {
    role_priorities: Json;
    class_priorities: Json;
    character_priorities: Json;
    priority_bonuses: Json;
  }> = {}
  for (const p of priorities) {
    prioritiesMap[p.item_id] = {
      role_priorities: p.role_priorities || {},
      class_priorities: p.class_priorities || {},
      character_priorities: p.character_priorities || {},
      priority_bonuses: p.priority_bonuses || { role: 5, class: 3, character: 2 },
    }
  }

  // Build BLP map: characterId -> { lootItemId -> timesPassed }
  const blpMap: Record<string, Record<string, number>> = {}
  for (const b of blpData) {
    if (!blpMap[b.character_id]) blpMap[b.character_id] = {}
    blpMap[b.character_id][b.loot_item_id] = b.times_passed
  }

  return {
    guildId: guild.id,
    guildName: guild.name,
    expansionId: expansion?.id,
    phase: expansion?.current_phase,
    settings: settings || {},
    items,
    members,
    priorities: prioritiesMap,
    blp: blpMap,
    attendance: attendanceByCharacter,
  }
}
// cache bust 1772786289
