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

const RAID_NIGHT_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Normalises an award's date to a raid night date (YYYY-MM-DD), GH #295.
 * Takes strings only, uses the text before the first 'T' (so an ISO
 * timestamp such as the addon's UTC awardedAt gives its UTC date), and
 * requires a real calendar date. Anything else gives null.
 */
export function toRaidNightDate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const datePart = value.split('T')[0].trim()
  const match = RAID_NIGHT_DATE_PATTERN.exec(datePart)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    return null
  }
  return datePart
}

export type AwardRaidNightOutcome = 'linked' | 'no_date' | 'no_raid_night' | 'ambiguous'

export interface AwardRaidNightResult {
  raidEventId: string | null
  outcome: AwardRaidNightOutcome
}

/**
 * Picks the raid night an addon or companion award belongs to, from the
 * guild's raid_events on the award's date (GH #295 PD-04). Pure; the rules
 * mirror the raid-tracking import:
 *
 * - No-team guild: the null-team night, the one importAttendanceByTeam
 *   writes for a no-team guild. Else the only night that date. More than
 *   one night is ambiguous.
 * - Team guild, raider on one team: that team's night, as
 *   routeRecordsToTeamEvents routes a teamed record, or nothing. Never
 *   another team's night, and never the null-team night (the cross-team
 *   leak routeRecordsToTeamEvents exists to prevent).
 * - Team guild, raider with no single team (unmatched name, unassigned, or
 *   on two teams, which getGuildTeamRouting omits): routeRecordsToTeamEvents
 *   leaves such a record where the officer put it, and with no officer here
 *   the only safe pick is the only night that date. Two or more is
 *   ambiguous.
 *
 * raid_events.raid_tier_id is deliberately not used: the unique index
 * allows one night per guild, date and team anyway, and the column holds
 * the phase's active tier (set by /api/raid-events/ensure), not the raid
 * that was actually run, so it would wrongly reject AQ40 awards on an
 * AQ20-tagged night.
 */
export function pickAwardRaidEvent(
  events: Array<{ id: string; raid_team_id: string | null }>,
  routing: { hasTeams: boolean; teamId: string | null },
): AwardRaidNightResult {
  if (events.length === 0) return { raidEventId: null, outcome: 'no_raid_night' }

  if (!routing.hasTeams) {
    const nullTeam = events.find(e => e.raid_team_id === null)
    if (nullTeam) return { raidEventId: nullTeam.id, outcome: 'linked' }
    if (events.length === 1) return { raidEventId: events[0].id, outcome: 'linked' }
    return { raidEventId: null, outcome: 'ambiguous' }
  }

  if (routing.teamId) {
    const teamNight = events.find(e => e.raid_team_id === routing.teamId)
    return teamNight
      ? { raidEventId: teamNight.id, outcome: 'linked' }
      : { raidEventId: null, outcome: 'no_raid_night' }
  }

  if (events.length === 1) return { raidEventId: events[0].id, outcome: 'linked' }
  return { raidEventId: null, outcome: 'ambiguous' }
}

/**
 * Finds (never creates) the guild's raid night for an addon or companion
 * award (GH #295, OD-1). The raid_events query always filters by guild_id,
 * so a linked raid_event_id always belongs to the award's guild and passes
 * the #313 loot_history trigger; another guild's night on the same date is
 * never seen (D-05). Team rules come from getGuildTeamRouting, via
 * pickAwardRaidEvent.
 *
 * An invalid date gives 'no_date' with no query. No night that date gives
 * 'no_raid_night' with no team query. A raid_events query error throws;
 * callers save the award unlinked rather than fail it (PD-05).
 */
export async function findAwardRaidEvent(
  service: Service,
  guildId: string,
  rawDate: unknown,
  characterId: string | null,
): Promise<AwardRaidNightResult> {
  const date = toRaidNightDate(rawDate)
  if (!date) return { raidEventId: null, outcome: 'no_date' }

  const { data: events, error } = await service
    .from('raid_events')
    .select('id, raid_team_id')
    .eq('guild_id', guildId)
    .eq('raid_date', date)

  if (error) {
    throw new Error(`Failed to look up raid nights for award: ${error.message}`)
  }

  const nights = (events ?? []) as Array<{ id: string; raid_team_id: string | null }>
  if (nights.length === 0) return { raidEventId: null, outcome: 'no_raid_night' }

  const { charTeam, hasTeams } = await getGuildTeamRouting(service, guildId)
  const teamId = hasTeams && characterId ? charTeam.get(characterId) ?? null : null
  return pickAwardRaidEvent(nights, { hasTeams, teamId })
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
