import type { createServiceRoleClient } from '@/utils/supabase/service-role'

type Service = ReturnType<typeof createServiceRoleClient>

/**
 * Team-aware raid event routing.
 *
 * In a multi-team guild every raid night is modeled as one raid_event PER team
 * (raid_events.raid_team_id). Bulk writers (attendance import, loot awards) used
 * to dump every record onto a single arbitrary team's event, so members of the
 * other team(s) showed up absent / loot-less in their own team views.
 *
 * This routes each record to the event matching the *character's* team for that
 * night. Single-team / no-team guilds are left untouched.
 */

/**
 * Map characters → their raid team, from the raid_team_members join table.
 * `hasTeams` is true when the guild has any team assignments (i.e. it uses raid
 * teams). Characters assigned to more than one team are omitted from `charTeam`
 * (ambiguous — we leave their records where the caller put them rather than guess).
 */
export async function getGuildTeamRouting(
  service: Service,
  guildId: string,
): Promise<{ charTeam: Map<string, string>; hasTeams: boolean }> {
  const { data } = await service
    .from('raid_team_members')
    .select('character_id, raid_team_id')
    .eq('guild_id', guildId)

  const charTeam = new Map<string, string>()
  const ambiguous = new Set<string>()
  for (const m of data ?? []) {
    const charId = m.character_id as string
    const teamId = m.raid_team_id as string
    const existing = charTeam.get(charId)
    if (existing && existing !== teamId) ambiguous.add(charId)
    charTeam.set(charId, teamId)
  }
  for (const charId of ambiguous) charTeam.delete(charId)

  return { charTeam, hasTeams: (data?.length ?? 0) > 0 }
}

/**
 * Find the raid_event for (guild, date, team), creating it if absent. A newly
 * created team event copies raid_tier_id from any sibling event already on that
 * date so the whole night stays on the same tier. Pass teamId=null for guilds
 * that don't use raid teams (the single null-team event for the night).
 */
export async function findOrCreateTeamEvent(
  service: Service,
  guildId: string,
  raidDate: string,
  teamId: string | null,
): Promise<string | null> {
  let findQuery = service
    .from('raid_events')
    .select('id')
    .eq('guild_id', guildId)
    .eq('raid_date', raidDate)
  findQuery = teamId ? findQuery.eq('raid_team_id', teamId) : findQuery.is('raid_team_id', null)
  const { data: existing } = await findQuery.limit(1).maybeSingle()
  if (existing) return existing.id

  const { data: sibling } = await service
    .from('raid_events')
    .select('raid_tier_id')
    .eq('guild_id', guildId)
    .eq('raid_date', raidDate)
    .limit(1)
    .maybeSingle()

  const { data: created, error } = await service
    .from('raid_events')
    .insert({
      guild_id: guildId,
      raid_date: raidDate,
      raid_team_id: teamId,
      raid_tier_id: sibling?.raid_tier_id ?? null,
    })
    .select('id')
    .single()

  if (error || !created) {
    console.error('findOrCreateTeamEvent failed:', { guildId, raidDate, teamId }, error)
    return null
  }
  return created.id
}

/**
 * Import a night's attendance, routed by team. Given the night's date and the
 * full active roster (charId + lowercased name), writes each raider's
 * attended/absent record onto THEIR team's event for the date (creating it if
 * needed). Only teams that fielded an attendee get an event + absent marks.
 *
 * Used by the addon import routes, which start from a raid date rather than an
 * existing raid_event_id. Non-team guilds get a single null-team event.
 *
 * Returns the affected event ids plus attended/absent counts (for callers that
 * surface them, e.g. the addon response).
 */
export async function importAttendanceByTeam(
  service: Service,
  guildId: string,
  raidDate: string,
  members: Array<{ charId: string; name: string }>,
  attendedSet: Set<string>,
): Promise<{ eventIds: string[]; attendedCount: number; absentCount: number }> {
  let attendedCount = 0
  let absentCount = 0

  const writeRoster = async (eventId: string, roster: Array<{ charId: string; name: string }>) => {
    for (const m of roster) {
      const attended = attendedSet.has(m.name)
      const { error } = await service
        .from('attendance_records')
        .upsert({
          raid_event_id: eventId,
          character_id: m.charId,
          attended,
          signed_up: false,
          status: attended ? 'attended' : 'absent',
        }, { onConflict: 'raid_event_id,character_id' })
      if (error) { console.error(`Failed to upsert attendance for ${m.name}:`, error); continue }
      if (attended) attendedCount++; else absentCount++
    }
  }

  const { charTeam, hasTeams } = await getGuildTeamRouting(service, guildId)

  if (!hasTeams) {
    const eventId = await findOrCreateTeamEvent(service, guildId, raidDate, null)
    if (!eventId) return { eventIds: [], attendedCount: 0, absentCount: 0 }
    await writeRoster(eventId, members)
    return { eventIds: [eventId], attendedCount, absentCount }
  }

  const byTeam = new Map<string, Array<{ charId: string; name: string }>>()
  for (const m of members) {
    const teamId = charTeam.get(m.charId)
    if (!teamId) continue // not on a team — don't force onto a wrong/null-team event
    const arr = byTeam.get(teamId) ?? []
    arr.push(m)
    byTeam.set(teamId, arr)
  }

  const eventIds: string[] = []
  for (const [teamId, roster] of byTeam) {
    if (!roster.some(m => attendedSet.has(m.name))) continue // team didn't raid tonight
    const eventId = await findOrCreateTeamEvent(service, guildId, raidDate, teamId)
    if (!eventId) continue
    await writeRoster(eventId, roster)
    eventIds.push(eventId)
  }

  return { eventIds, attendedCount, absentCount }
}

/**
 * Rewrite each record's `raid_event_id` to the event matching that character's
 * team for the night. Mutates records in place and returns them.
 *
 * - No-op for guilds without raid teams.
 * - Records without a character_id, or whose character has no known team, are
 *   left untouched (we never route a raider onto a null-team event, which is the
 *   exact cross-team leak we're fixing).
 * - The date is taken from the record's *current* raid_event_id, so loot and
 *   attendance both anchor to the real raid night regardless of awarded_date.
 */
export async function routeRecordsToTeamEvents<
  T extends { raid_event_id?: string | null; character_id?: string | null },
>(service: Service, guildId: string, records: T[]): Promise<T[]> {
  const { charTeam, hasTeams } = await getGuildTeamRouting(service, guildId)
  if (!hasTeams) return records

  // Resolve raid_date for every distinct incoming event.
  const eventIds = [...new Set(records.map(r => r.raid_event_id).filter((id): id is string => !!id))]
  if (eventIds.length === 0) return records
  const { data: events } = await service
    .from('raid_events')
    .select('id, raid_date')
    .in('id', eventIds)
  const dateByEvent = new Map((events ?? []).map(e => [e.id, e.raid_date as string]))

  const targetCache = new Map<string, string | null>() // `${date}|${team}` -> eventId

  for (const r of records) {
    if (!r.character_id || !r.raid_event_id) continue
    const team = charTeam.get(r.character_id)
    if (!team) continue // unknown or unassigned member — leave where the caller put it
    const date = dateByEvent.get(r.raid_event_id)
    if (!date) continue

    const key = `${date}|${team}`
    let target = targetCache.get(key)
    if (target === undefined) {
      target = await findOrCreateTeamEvent(service, guildId, date, team)
      targetCache.set(key, target)
    }
    if (target) r.raid_event_id = target
  }

  return records
}
