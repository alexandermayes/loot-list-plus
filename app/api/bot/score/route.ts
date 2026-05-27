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
import { resolveRaidDays } from '@/domain/raid-team/settings'
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
    // V1 uses the guild's default raid days (no team override); we don't yet
    // know which raid team this slash command's character is on.
    const raidDays = resolveRaidDays(
      {
        raid_days_per_week: settings.raid_days_per_week ?? 2,
        first_raid_day: settings.first_raid_day,
        second_raid_day: settings.second_raid_day,
        third_raid_day: settings.third_raid_day,
        fourth_raid_day: settings.fourth_raid_day,
        fifth_raid_day: settings.fifth_raid_day,
      },
      null
    )

    const attendance = computeAttendance({
      records: recordsResult.data || [],
      raidEvents,
      config: settings,
      raidDays,
      weekResetDay: settings.week_reset_day,
    })

    return NextResponse.json({
      character_name: resolvedName,
      guild_name: guild.name,
      attendance: {
        ratio: `${attendance.raidsAttended}/${attendance.raidsInWindow}`,
        raids_attended: attendance.raidsAttended,
        raids_in_window: attendance.raidsInWindow,
        percent: attendance.raidsInWindow > 0
          ? Math.round((attendance.raidsAttended / attendance.raidsInWindow) * 100)
          : 0,
        score: Math.round(attendance.score * 100) / 100,
      },
      rolling_weeks: settings.rolling_attendance_weeks,
    })
  } catch (error) {
    console.error('Error in GET /api/bot/score:', error)
    trackApiError('unknown', 'GET /api/bot/score', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
