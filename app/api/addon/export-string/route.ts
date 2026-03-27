// Force recompile v3
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { trackApiError } from '@/utils/analytics/server'
import { deflateRawSync } from 'zlib'

/**
 * GET /api/addon/export-string
 *
 * Generates a compressed import string for the WoW addon.
 * Contains all guild data needed for loot distribution in-game.
 *
 * Query params:
 * - guild_id: Required
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const guildId = request.nextUrl.searchParams.get('guild_id')
    if (!guildId) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Verify officer permissions
    const verification = await verifyOfficerPermissions(supabase, user.id, guildId)
    if (!verification.hasPermission) {
      return NextResponse.json({ error: 'Officer permissions required' }, { status: 403 })
    }

    // Fetch guild info
    const { data: guild } = await supabase
      .from('guilds')
      .select('id, name, active_expansion_id')
      .eq('id', guildId)
      .single()

    if (!guild) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 })
    }

    // Fetch guild settings
    const { data: settings } = await supabase
      .from('guild_settings')
      .select('*')
      .eq('guild_id', guildId)
      .single()

    // Get active expansion - fall back by tracing from guild's loot items
    let expansion: { id: string; name: string; current_phase: number } | null = null
    let expansionId = guild.active_expansion_id

    if (expansionId) {
      const { data } = await supabase
        .from('expansions')
        .select('id, name, current_phase')
        .eq('id', expansionId)
        .single()
      expansion = data
    }

    // If no active expansion, get the guild's current expansion via the RPC
    if (!expansion) {
      const { data: guildExpansions } = await supabase
        .rpc('get_guild_expansions', { p_guild_id: guildId })

      if (guildExpansions && guildExpansions.length > 0) {
        // Find the "current" one first, fall back to first
        const current = guildExpansions.find((e: { is_current: boolean }) => e.is_current) || guildExpansions[0]
        expansionId = current.expansion_id
        const { data } = await supabase
          .from('expansions')
          .select('id, name, current_phase')
          .eq('id', expansionId)
          .single()
        expansion = data
      }
    }

    // Fetch raid tiers and their items in one joined query
    const tiersWithItems = expansionId ? await supabase
      .from('raid_tiers')
      .select('id, name, phase, loot_items(id, name, wowhead_id, boss_name, item_slot, item_type, classification, raid_tier_id)')
      .eq('expansion_id', expansionId)
      .order('phase', { ascending: true })
    : { data: null, error: null }

    const raidTiers = (tiersWithItems.data || []).map((t: { id: string; name: string; phase: number }) => ({ id: t.id, name: t.name, phase: t.phase }))
    const raidTierIds = raidTiers.map((rt: { id: string }) => rt.id)

    // Flatten items from all tiers
    type LootItemRow = { id: string; name: string; wowhead_id: number; boss_name: string; item_slot: string | null; item_type: string | null; classification: string | null; raid_tier_id: string }
    const lootItems: LootItemRow[] = []
    for (const tier of tiersWithItems.data || []) {
      const items = (tier as { loot_items: LootItemRow[] }).loot_items || []
      for (const item of items) {
        lootItems.push(item)
      }
    }
    console.log('[addon/export] tiers:', raidTiers.length, 'items:', lootItems.length, 'expId:', expansionId, 'error:', tiersWithItems.error?.message)

    // Build raid name lookup
    const raidNameMap: Record<string, string> = {}
    for (const rt of raidTiers || []) {
      raidNameMap[rt.id] = rt.name
    }

    // Fetch guild members - try new table first, fall back to deriving from submissions
    let memberships: Array<{
      character_id: string; role: string; membership_status: string;
      characters: unknown
    }> = []

    const { data: newMemberships } = await supabase
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

    console.log('[addon/export-string] character_guild_memberships:', newMemberships?.length)

    if (newMemberships && newMemberships.length > 0) {
      memberships = newMemberships
    } else {
      // Derive members from characters that have submissions in this guild
      const { data: subCharIds, error: subErr } = await supabase
        .from('loot_submissions')
        .select('character_id')
        .eq('guild_id', guildId)

      console.log('[addon/export-string] Submissions with char IDs:', subCharIds?.length, 'error:', subErr?.message)

      // Deduplicate character IDs
      const charIdMap: Record<string, boolean> = {}
      for (const s of subCharIds || []) {
        if (s.character_id) charIdMap[s.character_id] = true
      }
      const uniqueCharIds = Object.keys(charIdMap)

      console.log('[addon/export-string] Unique character IDs:', uniqueCharIds.length, uniqueCharIds.slice(0, 3))

      if (uniqueCharIds.length > 0) {
        const { data: characters, error: charErr } = await supabase
          .from('characters')
          .select('id, name, user_id, wow_classes (name, color_hex), spec:class_specs (id, name)')
          .in('id', uniqueCharIds)

        console.log('[addon/export-string] Characters found:', characters?.length, 'error:', charErr?.message)

        if (characters && characters.length > 0) {
          // Try to get roles from guild_members (legacy table uses user_id)
          const { data: legacyRoles } = await supabase
            .from('guild_members')
            .select('user_id, role')
            .eq('guild_id', guildId)

          const userRoleMap: Record<string, string> = {}
          for (const lr of legacyRoles || []) {
            userRoleMap[lr.user_id] = lr.role
          }

          memberships = characters.map(c => ({
            character_id: c.id,
            role: userRoleMap[c.user_id] || 'Member',
            membership_status: 'full',
            characters: c,
          }))

          console.log('[addon/export-string] Derived memberships:', memberships.length)
        }
      }
    }

    // Fetch approved submissions for active expansion
    const { data: submissions } = await supabase
      .from('loot_submissions')
      .select(`
        id, character_id, phase, status,
        loot_submission_items (
          loot_item_id, rank,
          loot_items (wowhead_id)
        )
      `)
      .eq('guild_id', guildId)
      .eq('status', 'approved')

    // Fetch priority lists
    const { data: priorities } = await supabase
      .from('item_priorities')
      .select('loot_item_id, role_priorities, class_priorities, character_priorities, priority_bonuses')
      .in('loot_item_id', lootItems?.map(i => i.id) || [])

    // Fetch BLP data
    const { data: blpData } = await supabase
      .from('bad_luck_protection')
      .select('character_id, loot_item_id, times_passed')
      .eq('guild_id', guildId)

    // Fetch attendance records
    const { data: raidEvents } = await supabase
      .from('raid_events')
      .select('id, raid_date')
      .eq('guild_id', guildId)
      .order('raid_date', { ascending: false })
      .limit(settings?.rolling_attendance_weeks ? settings.rolling_attendance_weeks * 7 : 28)

    const raidEventIds = raidEvents?.map(e => e.id) || []
    const { data: attendanceRecords } = await supabase
      .from('attendance_records')
      .select('character_id, raid_event_id, attended, signed_up, status')
      .in('raid_event_id', raidEventIds)

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
      submissions: submissions || [],
      priorities: priorities || [],
      blpData: blpData || [],
      attendanceRecords: attendanceRecords || [],
      totalRaids: raidEventIds.length,
    })

    // Compress and encode
    const jsonStr = JSON.stringify(payload)
    const compressed = deflateRawSync(Buffer.from(jsonStr))
    const encoded = compressed.toString('base64')
    const exportString = `LLP1:1:${encoded}`

    return NextResponse.json({
      exportString,
      stats: {
        items: lootItems?.length || 0,
        members: memberships?.length || 0,
        submissions: submissions?.length || 0,
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
  guild: { id: string; name: string; active_expansion_id: string }
  settings: Record<string, unknown> | null
  expansion: { id: string; name: string; current_phase: number } | null
  lootItems: Array<{
    id: string; name: string; wowhead_id: number; boss_name: string;
    item_slot: string | null; item_type: string | null; classification: string | null;
    raid_tier_id: string
  }>
  raidNameMap: Record<string, string>
  memberships: Array<{
    character_id: string; role: string; membership_status: string;
    characters: unknown
  }>
  submissions: Array<{
    id: string; character_id: string; phase: number; status: string;
    loot_submission_items: Array<{
      loot_item_id: string; rank: number;
      loot_items: { wowhead_id: number } | { wowhead_id: number }[]
    }>
  }>
  priorities: Array<{
    loot_item_id: string; role_priorities: Record<string, number>;
    class_priorities: Record<string, number>; character_priorities: Record<string, number>;
    priority_bonuses: { role: number; class: number; character: number }
  }>
  blpData: Array<{ character_id: string; loot_item_id: string; times_passed: number }>
  attendanceRecords: Array<{
    character_id: string; raid_event_id: string; attended: boolean;
    signed_up: boolean; status: string
  }>
  totalRaids: number
}

function buildExportPayload(args: BuildPayloadArgs) {
  const { guild, settings, expansion, lootItems, raidNameMap, memberships,
          submissions, priorities, blpData, attendanceRecords, totalRaids } = args

  // Build items array
  const items = lootItems.map(item => ({
    id: item.id,
    name: item.name,
    wowhead_id: item.wowhead_id,
    boss_name: item.boss_name,
    raid_name: raidNameMap[item.raid_tier_id] || 'Unknown',
    classification: item.classification,
    slot: item.item_slot,
    item_type: item.item_type,
  }))

  // Build submission lookup: characterId -> [{ wowhead_id, rank }]
  const submissionsByCharacter: Record<string, Array<{ wowhead_id: number; rank: number }>> = {}
  for (const sub of submissions) {
    if (!sub.loot_submission_items) continue
    const charItems: Array<{ wowhead_id: number; rank: number }> = []
    for (const item of sub.loot_submission_items) {
      const lootItem = Array.isArray(item.loot_items) ? item.loot_items[0] : item.loot_items
      if (lootItem?.wowhead_id) {
        charItems.push({ wowhead_id: lootItem.wowhead_id, rank: item.rank })
      }
    }
    submissionsByCharacter[sub.character_id] = charItems
  }

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
      items: submissionsByCharacter[m.character_id] || [],
    }
  }).filter(Boolean)

  // Build priorities map
  const prioritiesMap: Record<string, {
    role_priorities: Record<string, number>;
    class_priorities: Record<string, number>;
    character_priorities: Record<string, number>;
    priority_bonuses: { role: number; class: number; character: number };
  }> = {}
  for (const p of priorities) {
    prioritiesMap[p.loot_item_id] = {
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

  // Build attendance summary per character
  const attendanceByChar: Record<string, {
    records: Array<{ signed_up: boolean; attended: boolean; no_call_no_show: boolean }>;
    totalRaids: number;
  }> = {}

  for (const rec of attendanceRecords) {
    if (!attendanceByChar[rec.character_id]) {
      attendanceByChar[rec.character_id] = { records: [], totalRaids }
    }
    attendanceByChar[rec.character_id].records.push({
      signed_up: rec.signed_up || false,
      attended: rec.attended || false,
      no_call_no_show: rec.status === 'no_show',
    })
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
    attendance: attendanceByChar,
  }
}
// cache bust 1772786289
