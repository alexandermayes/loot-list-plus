/**
 * GET /api/bot/score?discord_guild_id=X&character_name=Y
 *
 * Called by the LootList+ Discord bot to back the `/score` slash command.
 * Returns a character's current attendance-driven score and rolling ratio.
 *
 * Scope (v1): attendance only. Rank/role/trial modifiers are computed in
 * the master sheet today; bringing them here means duplicating the per-spec
 * lookups. Punted until users ask for them.
 */

import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { computeAttendance } from '@/domain/scoring'
import { resolveRaidDays, resolveRollingWeeks } from '@/domain/raid-team/settings'
import type { RaidDaysOverride } from '@/domain/raid-team/types'
import { trackApiError } from '@/utils/analytics/server'
import { checkBotAuth, resolveGuildFromDiscord } from '../_helpers'

export async function GET(request: Request) {
  try {
    const authError = checkBotAuth(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const discordGuildId = searchParams.get('discord_guild_id') || ''
    const characterName = (searchParams.get('character_name') || '').trim()

    if (!discordGuildId || !characterName) {
      return NextResponse.json(
        { error: 'discord_guild_id and character_name are required' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()
    const guild = await resolveGuildFromDiscord(supabase, discordGuildId)
    if (!guild) {
      return NextResponse.json({ error: 'no_guild_linked' }, { status: 404 })
    }

    // Find character by name within this guild (case-insensitive)
    const { data: memberships } = await supabase
      .from('character_guild_memberships')
      .select('character_id, characters(id, name)')
      .eq('guild_id', guild.id)
      .eq('is_active', true)

    let characterId: string | null = null
    let resolvedName = characterName
    for (const m of memberships || []) {
      const char = Array.isArray(m.characters) ? m.characters[0] : m.characters
      if (char && (char as { name: string }).name?.toLowerCase() === characterName.toLowerCase()) {
        characterId = (char as { id: string }).id
        resolvedName = (char as { name: string }).name
        break
      }
    }
    if (!characterId) {
      return NextResponse.json({ error: 'character_not_found', character_name: characterName }, { status: 404 })
    }

    // Look up the character's raid team so the score reads the same as the
    // master sheet — team overrides change raid_days/rolling_weeks, and
    // team filtering drops events that belong to other teams. Without this
    // a Sunday-team raider sees "4/8" (their Sundays + the Monday team's
    // Mondays in the denominator) instead of the correct "4/4".
    const { data: teamMember } = await supabase
      .from('raid_team_members')
      .select('raid_team_id, raid_teams(id, name, raid_days_override, rolling_weeks_override)')
      .eq('character_id', characterId)
      .eq('guild_id', guild.id)
      .limit(1)
      .maybeSingle()

    const team = teamMember
      ? (Array.isArray(teamMember.raid_teams) ? teamMember.raid_teams[0] : teamMember.raid_teams)
      : null
    const raiderTeamId = (team as { id?: string } | null)?.id ?? null
    const teamName = (team as { name?: string } | null)?.name ?? null

    // Load minimum data for computeAttendance
    const [settingsResult, raidEventsResult, recordsResult] = await Promise.all([
      supabase
        .from('guild_settings')
        .select('rolling_attendance_weeks, attendance_type, signup_weight, max_attendance_bonus, raid_days_per_week, first_raid_day, second_raid_day, third_raid_day, fourth_raid_day, fifth_raid_day, week_reset_day, late_early_penalty_enabled, late_early_penalty_value, minimum_raid_days, minimum_raid_days_enabled, middle_attendance_threshold, middle_attendance_bonus, max_attendance_threshold')
        .eq('guild_id', guild.id)
        .single(),
      supabase
        .from('raid_events')
        .select('id, raid_date, is_bonus, is_skipped, raid_team_id')
        .eq('guild_id', guild.id)
        .eq('is_skipped', false),
      supabase
        .from('attendance_records')
        .select('raid_event_id, signed_up, attended, no_call_no_show, was_late, was_benched, is_excused, points_override')
        .eq('character_id', characterId),
    ])

    const settings = settingsResult.data
    if (!settings) {
      return NextResponse.json({ error: 'guild_settings_missing' }, { status: 500 })
    }

    const raidEvents = (raidEventsResult.data || []).map((e) => ({
      id: e.id,
      raid_date: e.raid_date,
      is_bonus: e.is_bonus ?? false,
      raid_team_id: e.raid_team_id ?? null,
    }))

    // raid_days_per_week + first..fifth_raid_day are the canonical day-of-week
    // integers (0=Sun) the scoring engine wants. The legacy `raid_days` string
    // array (["Sunday","Monday"]) is not what we want — passing names where
    // numbers are expected made the day-of-week filter drop every event → 0/0.
    const teamRaidDaysOverride = (team as { raid_days_override?: RaidDaysOverride | null } | null)?.raid_days_override ?? null
    const teamRollingWeeksOverride = (team as { rolling_weeks_override?: number | null } | null)?.rolling_weeks_override ?? null

    const raidDays = resolveRaidDays(
      {
        raid_days_per_week: settings.raid_days_per_week ?? 2,
        first_raid_day: settings.first_raid_day,
        second_raid_day: settings.second_raid_day,
        third_raid_day: settings.third_raid_day,
        fourth_raid_day: settings.fourth_raid_day,
        fifth_raid_day: settings.fifth_raid_day,
      },
      teamRaidDaysOverride
    )

    const rollingWeeks = resolveRollingWeeks(
      settings.rolling_attendance_weeks ?? 4,
      teamRollingWeeksOverride
    )

    const attendance = computeAttendance({
      records: recordsResult.data || [],
      raidEvents,
      config: { ...settings, rolling_attendance_weeks: rollingWeeks },
      raidDays,
      raiderTeamId,
      weekResetDay: settings.week_reset_day,
    })

    // Two metrics matter and we report both so the bot reads the same as
    // the attendance page in the app:
    //   - score / max_attendance_bonus: the "Attendance credit" the app
    //     leads with. Per-week capping means partial attendance can still
    //     produce a full score, so this is what actually feeds Loot Score.
    //   - raidsAttended / raidsInWindow: raw "you showed up to N of M
    //     tracked raids" stat. Useful for context but not what drives
    //     priority.
    const maxAttendanceBonus = settings.max_attendance_bonus ?? 4
    const score = Math.round(attendance.score * 100) / 100
    const scorePercent = maxAttendanceBonus > 0
      ? Math.round((score / maxAttendanceBonus) * 100)
      : 0

    return NextResponse.json({
      character_name: resolvedName,
      guild_name: guild.name,
      team_name: teamName,
      attendance: {
        score,
        max_score: maxAttendanceBonus,
        score_percent: scorePercent,
        raids_attended: attendance.raidsAttended,
        raids_in_window: attendance.raidsInWindow,
      },
      rolling_weeks: rollingWeeks,
    })
  } catch (error) {
    console.error('Error in GET /api/bot/score:', error)
    trackApiError('unknown', 'GET /api/bot/score', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
