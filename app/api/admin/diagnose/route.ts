import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { computeAttendance } from '@/domain/scoring/attendance'
import { toDateString, parseDate } from '@/utils/date'

/**
 * GET /api/admin/diagnose?guild_id=X&character_name=Y
 *
 * Diagnostic endpoint for officers to check a character's data integrity.
 * Returns: character info, guild membership, loot submissions, attendance records,
 * and computed attendance score.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get('guild_id')
    const characterName = searchParams.get('character_name')

    if (!guildId || !characterName) {
      return NextResponse.json({ error: 'guild_id and character_name are required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    const { hasPermission, error: permError } = await verifyOfficerPermissions(serviceSupabase, user.id, guildId)
    if (!hasPermission) {
      return NextResponse.json({ error: permError || 'Officer permissions required' }, { status: 403 })
    }

    // Find character
    const { data: character } = await serviceSupabase
      .from('characters')
      .select('id, name, user_id, class:wow_classes(name)')
      .ilike('name', characterName)
      .limit(5)

    if (!character?.length) {
      return NextResponse.json({ error: `No character found matching "${characterName}"` }, { status: 404 })
    }

    // Find the one in this guild
    const charIds = character.map(c => c.id)
    const { data: memberships } = await serviceSupabase
      .from('character_guild_memberships')
      .select('character_id, role, is_active, joined_at')
      .eq('guild_id', guildId)
      .in('character_id', charIds)

    const membership = memberships?.[0]
    const charId = membership?.character_id
    const char = character.find(c => c.id === charId)

    if (!charId || !char) {
      return NextResponse.json({
        error: `Character "${characterName}" found but not a member of this guild`,
        characters_found: character.map(c => ({ id: c.id, name: c.name })),
      }, { status: 404 })
    }

    // Check active character setting
    const { data: activeChar } = await serviceSupabase
      .from('user_active_characters')
      .select('active_character_id, active_guild_id')
      .eq('user_id', char.user_id)
      .single()

    // Check guild_members (deprecated table)
    const { data: legacyMember } = await serviceSupabase
      .from('guild_members')
      .select('id, user_id, role, is_active')
      .eq('user_id', char.user_id)
      .eq('guild_id', guildId)
      .maybeSingle()

    // Check loot submissions
    const { data: submissions } = await serviceSupabase
      .from('loot_submissions')
      .select('id, status, phase_id, created_at, updated_at')
      .eq('character_id', charId)
      .eq('guild_id', guildId)

    // Check submission item counts
    let submissionItems: Record<string, number> = {}
    if (submissions?.length) {
      const subIds = submissions.map(s => s.id)
      const { data: items } = await serviceSupabase
        .from('loot_submission_items')
        .select('submission_id')
        .in('submission_id', subIds)
        .is('removed_at', null)

      items?.forEach(item => {
        submissionItems[item.submission_id] = (submissionItems[item.submission_id] || 0) + 1
      })
    }

    // Get guild settings
    const { data: settings } = await serviceSupabase
      .from('guild_settings')
      .select('rolling_attendance_weeks, max_attendance_bonus, max_attendance_threshold, attendance_type, new_member_mode, first_raid_day, second_raid_day, raid_days_per_week, decimal_places')
      .eq('guild_id', guildId)
      .single()

    // Get expansion raid days
    const { data: guild } = await serviceSupabase
      .from('guilds')
      .select('active_expansion_id')
      .eq('id', guildId)
      .single()

    let expansionRaidDays: { first_raid_day: number | null; second_raid_day: number | null; raid_days_per_week: number | null } | null = null
    if (guild?.active_expansion_id) {
      const { data: exp } = await serviceSupabase
        .from('expansions')
        .select('first_raid_day, second_raid_day, raid_days_per_week')
        .eq('id', guild.active_expansion_id)
        .single()
      expansionRaidDays = exp
    }

    // Calculate attendance window
    const weeks = settings?.rolling_attendance_weeks || 4
    const raidDaysSource = expansionRaidDays || settings
    const firstRaidDay = raidDaysSource?.first_raid_day ?? 0
    const today = new Date()
    const currentDay = today.getDay()
    const daysToSubtract = (currentDay - firstRaidDay + 7) % 7
    const windowStart = new Date(today)
    windowStart.setDate(windowStart.getDate() - daysToSubtract - (weeks * 7))
    windowStart.setHours(0, 0, 0, 0)

    // Get raid events in window
    const { data: raidEvents } = await serviceSupabase
      .from('raid_events')
      .select('id, raid_date, is_skipped')
      .eq('guild_id', guildId)
      .gte('raid_date', toDateString(windowStart))
      .lte('raid_date', toDateString(today))
      .eq('is_skipped', false)
      .order('raid_date', { ascending: true })

    // Get attendance records for this character
    const eventIds = raidEvents?.map(e => e.id) || []
    const { data: attendanceRecords } = await serviceSupabase
      .from('attendance_records')
      .select('raid_event_id, attended, signed_up, no_call_no_show, was_late, was_benched, is_excused, status, points_override')
      .eq('character_id', charId)
      .in('raid_event_id', eventIds)

    // Build attendance by date
    const eventMap = new Map(raidEvents?.map(e => [e.id, e]) || [])
    const attendanceByDate = attendanceRecords?.map(r => {
      const event = eventMap.get(r.raid_event_id)
      return {
        date: event?.raid_date,
        day: event ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][parseDate(event.raid_date).getDay()] : '?',
        attended: r.attended,
        status: r.status,
        was_late: r.was_late,
        was_benched: r.was_benched,
      }
    }).sort((a, b) => (a.date || '').localeCompare(b.date || ''))

    // Compute attendance score
    const raidDays = [
      raidDaysSource?.first_raid_day,
      raidDaysSource?.second_raid_day,
    ].filter((d): d is number => d !== null && d !== undefined)
      .slice(0, raidDaysSource?.raid_days_per_week || 2)

    let computedScore = null
    if (attendanceRecords?.length && raidEvents?.length) {
      const newMemberMode = (settings?.new_member_mode || 'raw') as 'raw' | 'fair' | 'minimum_gate'
      computedScore = computeAttendance({
        records: attendanceRecords,
        raidEvents: raidEvents || [],
        config: settings || {},
        raidDays,
        memberJoinedAt: membership.joined_at ? toDateString(new Date(membership.joined_at)) : undefined,
        newMemberMode,
        asOfDate: toDateString(today),
      })
    }

    return NextResponse.json({
      character: {
        id: charId,
        name: char.name,
        class: (char.class as any)?.name,
        user_id: char.user_id,
      },
      membership: {
        role: membership.role,
        is_active: membership.is_active,
        joined_at: membership.joined_at,
      },
      active_character: activeChar ? {
        is_this_character: activeChar.active_character_id === charId,
        is_this_guild: activeChar.active_guild_id === guildId,
        active_character_id: activeChar.active_character_id,
        active_guild_id: activeChar.active_guild_id,
      } : null,
      legacy_guild_member: legacyMember ? {
        exists: true,
        is_active: legacyMember.is_active,
        role: legacyMember.role,
        user_id_matches: legacyMember.user_id === char.user_id,
      } : { exists: false },
      submissions: submissions?.map(s => ({
        id: s.id,
        status: s.status,
        phase_id: s.phase_id,
        item_count: submissionItems[s.id] || 0,
        updated_at: s.updated_at,
      })) || [],
      attendance: {
        window: `${toDateString(windowStart)} to ${toDateString(today)}`,
        weeks,
        raid_days: raidDays.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]),
        total_events: raidEvents?.length || 0,
        records_found: attendanceRecords?.length || 0,
        by_date: attendanceByDate,
        computed_score: computedScore,
      },
      settings_loaded: !!settings,
    })
  } catch (error) {
    console.error('Error in GET /api/admin/diagnose:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
