import { unstable_cache, revalidateTag } from 'next/cache'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { computeAttendance } from '@/domain/scoring'

/**
 * Server-side attendance summary for the /overview dashboard hero card.
 *
 * The dashboard hero card ("87% — 13 of 15 raids") is the LCP element on
 * /overview. Rendering it on the client meant waiting for hydration +
 * 4 sequential queries + score computation before LCP fired.
 *
 * This helper:
 *   1. Pulls guild_settings + raid_events for the guild (cached per-guild,
 *      so all characters in the guild share the cached result)
 *   2. Pulls attendance_records for the character (cached per-character)
 *   3. Pulls membership for memberJoinedAt (single row, cached per-character)
 *   4. Runs computeAttendance() and returns just the three numbers the
 *      hero card displays
 *
 * Raid-team-aware computation (overrides for rolling weeks + raid days) is
 * deliberately skipped here — that lives client-side. The numbers may be
 * slightly off for raid-team-scoped views until hydration completes; for
 * the LCP element that's acceptable since the visual shape is correct.
 */

export interface AttendanceSummary {
  percentage: number
  attended: number
  total: number
}

function guildSettingsTag(guildId: string): string {
  return `guild:${guildId}:settings`
}

function guildRaidEventsTag(guildId: string): string {
  return `guild:${guildId}:raid-events`
}

function characterAttendanceTag(characterId: string): string {
  return `character:${characterId}:attendance`
}

export function revalidateGuildSettings(guildId: string): void {
  if (!guildId) return
  try { revalidateTag(guildSettingsTag(guildId), 'default') } catch {}
}

export function revalidateGuildRaidEvents(guildId: string): void {
  if (!guildId) return
  try { revalidateTag(guildRaidEventsTag(guildId), 'default') } catch {}
}

export function revalidateCharacterAttendance(characterId: string): void {
  if (!characterId) return
  try { revalidateTag(characterAttendanceTag(characterId), 'default') } catch {}
}

function getGuildSettings(guildId: string) {
  return unstable_cache(
    async () => {
      const supabase = createServiceRoleClient()
      const { data } = await supabase
        .from('guild_settings')
        .select('*')
        .eq('guild_id', guildId)
        .single()
      return data
    },
    ['dashboard-attendance:guild-settings', guildId],
    { tags: [guildSettingsTag(guildId)], revalidate: 300 },
  )()
}

function getRaidEvents(guildId: string, sinceDateStr: string, untilDateStr: string) {
  return unstable_cache(
    async () => {
      const supabase = createServiceRoleClient()
      const { data } = await supabase
        .from('raid_events')
        .select('id, raid_date, raid_team_id, is_skipped')
        .eq('guild_id', guildId)
        .eq('is_skipped', false)
        .gte('raid_date', sinceDateStr)
        .lte('raid_date', untilDateStr)
      return data ?? []
    },
    ['dashboard-attendance:raid-events', guildId, sinceDateStr, untilDateStr],
    { tags: [guildRaidEventsTag(guildId)], revalidate: 300 },
  )()
}

function getCharacterAttendance(characterId: string) {
  return unstable_cache(
    async () => {
      const supabase = createServiceRoleClient()
      const { data } = await supabase
        .from('attendance_records')
        .select('raid_event_id, signed_up, attended, no_call_no_show, was_late, was_benched, is_excused, points_override')
        .eq('character_id', characterId)
      return data ?? []
    },
    ['dashboard-attendance:character-records', characterId],
    { tags: [characterAttendanceTag(characterId)], revalidate: 300 },
  )()
}

function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function getAttendanceSummary({
  guildId,
  characterId,
  memberJoinedAt,
}: {
  guildId: string
  characterId: string
  memberJoinedAt?: string | null
}): Promise<AttendanceSummary | null> {
  try {
    const today = new Date()
    const todayStr = toDateString(today)
    // Pull 12 weeks of events as the outer window. computeAttendance trims
    // to the actual rolling window from guild settings.
    const windowStart = new Date(today)
    windowStart.setDate(windowStart.getDate() - 12 * 7)
    const sinceStr = toDateString(windowStart)

    const [settings, raidEvents, records] = await Promise.all([
      getGuildSettings(guildId),
      getRaidEvents(guildId, sinceStr, todayStr),
      getCharacterAttendance(characterId),
    ])

    if (!settings) return null

    const raidDaysSrc = settings as {
      raid_days_per_week?: number
      first_raid_day?: number | null
      second_raid_day?: number | null
      third_raid_day?: number | null
      fourth_raid_day?: number | null
      fifth_raid_day?: number | null
    }
    const raidDays = [
      raidDaysSrc.first_raid_day,
      raidDaysSrc.second_raid_day,
      raidDaysSrc.third_raid_day,
      raidDaysSrc.fourth_raid_day,
      raidDaysSrc.fifth_raid_day,
    ]
      .filter((d): d is number => d !== null && d !== undefined)
      .slice(0, raidDaysSrc.raid_days_per_week || 2)

    const result = computeAttendance({
      records,
      raidEvents: raidEvents as { id: string; raid_date: string; raid_team_id?: string | null; is_skipped?: boolean }[],
      config: settings as Parameters<typeof computeAttendance>[0]['config'],
      raidDays,
      memberJoinedAt: memberJoinedAt ?? undefined,
      asOfDate: todayStr,
    })

    const percentage = result.raidsInWindow > 0
      ? Math.round((result.raidsAttended / result.raidsInWindow) * 100)
      : 0

    return {
      percentage,
      attended: result.raidsAttended,
      total: result.raidsInWindow,
    }
  } catch {
    return null
  }
}
