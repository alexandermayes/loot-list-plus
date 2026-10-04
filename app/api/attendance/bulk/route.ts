import { NextResponse, after } from 'next/server'
import { withPermission } from '@/utils/api/handler'
import { logAudit } from '@/utils/audit/log'
import { resolveStatus } from '@/domain/scoring'
import { trackEvent } from '@/utils/analytics/server'
import { evaluateGuildFunnel } from '@/utils/analytics/funnel'
import { revalidateCharacterAttendance } from '@/lib/cache/dashboard-attendance'
import { recomputeBlpForEvents } from '@/utils/blp/recompute'
import { routeRecordsToTeamEvents } from '@/utils/raid-events/team-routing'
import { findInvalidRaidEventIds } from '@/lib/loot/guild-award-refs'
import {
  ATTENDANCE_OUTSIDE_GUILD_ERROR,
  ATTENDANCE_CHARACTER_NOT_IN_GUILD_ERROR,
  ATTENDANCE_REQUEST_INVALID_ERROR,
  ATTENDANCE_LOOKUP_CHUNK_SIZE,
  parseAttendanceRecords,
  parseAttendanceUpdates,
  parseAttendanceFilters,
  parseAttendanceDeleteBody,
  findCharacterIdsWithoutGuildMembership,
  resolveAttendanceRowsInGuild,
  type AttendanceFlags,
  type AttendanceRowRef,
} from '@/lib/attendance/guild-attendance-refs'

/** Splits `items` into chunks of at most `size`, in order. */
function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

/**
 * Groups row ids by the attendance status that row would have once the
 * sent flags are overlaid on its current flags (261003-she amendment A1).
 * Computing status from each row's merged flags, rather than only the
 * flags this PATCH sends, keeps a signup-only update from knocking an
 * already-attended row back down to "signed_up".
 */
function groupIdsByMergedStatus(
  rows: Array<AttendanceFlags & { id: string }>,
  updates: AttendanceFlags,
): Map<string, string[]> {
  const groups = new Map<string, string[]>()
  for (const row of rows) {
    const status = resolveStatus({ ...row, ...updates })
    const existing = groups.get(status)
    if (existing) {
      existing.push(row.id)
    } else {
      groups.set(status, [row.id])
    }
  }
  return groups
}

const ATTENDANCE_FLAG_COLUMNS = 'id, signed_up, attended, no_call_no_show, was_late, was_benched, is_excused'

/**
 * POST /api/attendance/bulk
 *
 * Bulk upsert/insert attendance records. Uses service role to bypass RLS
 * after verifying officer permissions, so before anything is written this
 * handler checks that every record's raid_event_id is a raid event of the
 * verified guild and every character_id has a membership row (active or
 * not) in that guild (261003-she D-02) — the service role bypasses RLS
 * entirely, so these are the only checks standing between a request and a
 * write into another guild's attendance.
 *
 * Body: {
 *   guild_id: string,
 *   action: 'upsert' | 'insert',
 *   records: AttendanceRecord[],   // only the ten attendance fields
 *   onConflict?: 'raid_event_id,character_id'  // the only accepted value
 * }
 */
export const POST = withPermission<{
  guild_id?: string
  action?: unknown
  records?: unknown
  onConflict?: unknown
}>(
  'manage_attendance',
  ({ body }) => body.guild_id,
  async ({ user, service: serviceSupabase, body, guildId: guild_id }) => {
    const { action, records, onConflict } = body

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'guild_id and records array are required' }, { status: 400 })
    }

    if (
      (action !== 'upsert' && action !== 'insert') ||
      (onConflict !== undefined && onConflict !== 'raid_event_id,character_id')
    ) {
      return NextResponse.json({ error: ATTENDANCE_REQUEST_INVALID_ERROR }, { status: 400 })
    }

    const parsedRecords = parseAttendanceRecords(records)
    if (!parsedRecords) {
      return NextResponse.json({ error: ATTENDANCE_REQUEST_INVALID_ERROR }, { status: 400 })
    }

    // Every id below is checked against the guild before routing, which
    // reads raid_events by id with NO guild filter and can create this
    // guild's team events from the dates it finds — after these checks
    // every id it reads is this guild's, and every id it returns comes from
    // findOrCreateTeamEvent, which is guild-scoped.
    const raidEventIdsToCheck = [...new Set(parsedRecords.map(r => r.raid_event_id))]
    const invalidRaidEventIds = await findInvalidRaidEventIds(serviceSupabase, guild_id, raidEventIdsToCheck)
    if (invalidRaidEventIds.length > 0) {
      return NextResponse.json(
        { error: ATTENDANCE_OUTSIDE_GUILD_ERROR, invalid_raid_event_ids: invalidRaidEventIds },
        { status: 400 },
      )
    }

    // Route-level copy of the attendance trigger rule 261003-m45 adds in
    // the database, checked up front so the officer gets a clear 400
    // rather than a trigger error. Any membership (active or not) passes,
    // so a raider's past nights stay editable after they leave the guild.
    const characterIdsToCheck = [...new Set(
      parsedRecords.map(r => r.character_id).filter((id): id is string => !!id),
    )]
    const invalidCharacterIds = await findCharacterIdsWithoutGuildMembership(serviceSupabase, guild_id, characterIdsToCheck)
    if (invalidCharacterIds.length > 0) {
      return NextResponse.json(
        { error: ATTENDANCE_CHARACTER_NOT_IN_GUILD_ERROR, invalid_character_ids: invalidCharacterIds },
        { status: 400 },
      )
    }

    // Stamp modified_by and computed status on all records (dual-write)
    const stampedRecords = parsedRecords.map((r) => ({
      ...r,
      modified_by: user.id,
      status: resolveStatus(r),
    }))

    // Team guilds: route each raider onto THEIR team's event for the night, so a
    // combined import doesn't pile everyone onto one team's event (no-op for
    // single-team / no-team guilds). Mutates raid_event_id in place.
    await routeRecordsToTeamEvents(serviceSupabase, guild_id, stampedRecords)

    if (action === 'upsert') {
      const { data, error } = await serviceSupabase
        .from('attendance_records')
        .upsert(stampedRecords, { onConflict: 'raid_event_id,character_id' })
        .select()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const count = data?.length || 0
      const raidEventId = stampedRecords[0]?.raid_event_id
      logAudit({
        supabase: serviceSupabase,
        guildId: guild_id,
        tableName: 'attendance_records',
        recordId: raidEventId || guild_id,
        action: 'INSERT',
        userId: user.id,
        newData: { action: 'upsert', record_count: count, raid_event_id: raidEventId },
      })

      trackEvent({
        event: 'attendance_bulk_recorded',
        userId: user.id,
        guildId: guild_id,
        properties: { guild_id, record_count: count, raid_event_id: raidEventId, action: 'upsert' },
      })

      // Invalidate dashboard attendance for each affected character so the
      // overview hero card reflects the new attendance immediately.
      const affectedCharIds = new Set<string>()
      for (const r of stampedRecords) {
        if (r.character_id) affectedCharIds.add(r.character_id)
      }
      for (const id of affectedCharIds) revalidateCharacterAttendance(id)

      // Attendance changed — recompute BLP for the items awarded at each
      // affected raid event so award-before-attendance credits get filled in
      // and benched/absent edits are reflected (GH #98 race).
      const blpEventIds = [...new Set(stampedRecords.map(r => r.raid_event_id).filter(Boolean))]
      if (blpEventIds.length > 0) {
        after(() => recomputeBlpForEvents(serviceSupabase, guild_id, blpEventIds))
      }

      return NextResponse.json({ success: true, count })
    } else {
      const { data, error } = await serviceSupabase
        .from('attendance_records')
        .insert(stampedRecords)
        .select()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const count = data?.length || 0
      const raidEventId = stampedRecords[0]?.raid_event_id
      logAudit({
        supabase: serviceSupabase,
        guildId: guild_id,
        tableName: 'attendance_records',
        recordId: raidEventId || guild_id,
        action: 'INSERT',
        userId: user.id,
        newData: { action: 'insert', record_count: count, raid_event_id: raidEventId },
      })

      trackEvent({
        event: 'attendance_bulk_recorded',
        userId: user.id,
        guildId: guild_id,
        properties: { guild_id, record_count: count, raid_event_id: raidEventId, action: 'insert' },
      })

      // Invalidate dashboard attendance for each affected character
      const affectedCharIds = new Set<string>()
      for (const r of stampedRecords) {
        if (r.character_id) affectedCharIds.add(r.character_id)
      }
      for (const id of affectedCharIds) revalidateCharacterAttendance(id)

      // Attendance changed — recompute BLP for the items awarded at each
      // affected raid event so award-before-attendance credits get filled in
      // and benched/absent edits are reflected (GH #98 race).
      const blpEventIds = [...new Set(stampedRecords.map(r => r.raid_event_id).filter(Boolean))]
      if (blpEventIds.length > 0) {
        after(() => recomputeBlpForEvents(serviceSupabase, guild_id, blpEventIds))
      }

      return NextResponse.json({ success: true, count })
    }
  },
  'POST /api/attendance/bulk',
)

/**
 * PATCH /api/attendance/bulk
 *
 * Updates attendance status flags by filter criteria. Only the six status
 * flags may be set, and a filter must name a raid event, a row id or a set
 * of row ids — an empty or character-only filter is refused rather than
 * reaching every raid of every guild. A raid_event_id or row id outside the
 * guild the officer was verified for is refused with nothing written
 * (261003-she D-03, OD-1 A). Status (dual-write) is computed from each
 * row's flags after the update is merged in, not from the sent flags
 * alone, so a signup-only update cannot move an already-attended row back
 * to signed_up (amendment A1).
 *
 * Body: {
 *   guild_id: string,
 *   updates: { signed_up?, attended?, no_call_no_show?, was_late?, was_benched?, is_excused? },
 *   filters: { raid_event_id?: string, character_ids?: string[], ids?: string[], id?: string, expected_updated_at?: string }
 * }
 */
export const PATCH = withPermission<{
  guild_id?: string
  updates?: unknown
  filters?: unknown
}>(
  'manage_attendance',
  ({ body }) => body.guild_id,
  async ({ user, service: serviceSupabase, body, guildId: guild_id }) => {
    const { updates: rawUpdates, filters: rawFilters } = body

    if (!rawUpdates || !rawFilters) {
      return NextResponse.json({ error: 'guild_id, updates, and filters are required' }, { status: 400 })
    }

    const updates = parseAttendanceUpdates(rawUpdates)
    const filters = parseAttendanceFilters(rawFilters)
    if (!updates || !filters) {
      return NextResponse.json({ error: ATTENDANCE_REQUEST_INVALID_ERROR }, { status: 400 })
    }

    if (filters.raid_event_id) {
      const invalidRaidEventIds = await findInvalidRaidEventIds(serviceSupabase, guild_id, [filters.raid_event_id])
      if (invalidRaidEventIds.length > 0) {
        return NextResponse.json(
          { error: ATTENDANCE_OUTSIDE_GUILD_ERROR, invalid_raid_event_ids: invalidRaidEventIds },
          { status: 400 },
        )
      }
    }

    const idFilterUnion = [...new Set([...(filters.id ? [filters.id] : []), ...(filters.ids ?? [])])]
    const hasIdFilter = idFilterUnion.length > 0
    let resolvedRows: AttendanceRowRef[] = []
    if (hasIdFilter) {
      const resolved = await resolveAttendanceRowsInGuild(serviceSupabase, guild_id, idFilterUnion)
      if (resolved.outsideGuildIds.length > 0) {
        return NextResponse.json(
          { error: ATTENDANCE_OUTSIDE_GUILD_ERROR, invalid_ids: resolved.outsideGuildIds },
          { status: 400 },
        )
      }
      resolvedRows = resolved.rows
      if (resolvedRows.length === 0) {
        // The rows were already removed (another officer, another tab);
        // today's update would also have matched nothing.
        return NextResponse.json({ success: true })
      }
    }

    // Optimistic locking: if the client sends expected_updated_at for the
    // raid event, verify it hasn't been modified since the client loaded
    // data. raid_events has no updated_at column today (261003-she finding
    // 6), so this read always comes back without one and the check never
    // fires; left in place with its guild filter added, not as a failing
    // step (follow-up FU-3).
    if (filters.raid_event_id && filters.expected_updated_at) {
      const { data: raidEvent } = await serviceSupabase
        .from('raid_events')
        .select('updated_at')
        .eq('id', filters.raid_event_id)
        .eq('guild_id', guild_id)
        .single()

      if (raidEvent?.updated_at && raidEvent.updated_at !== filters.expected_updated_at) {
        return NextResponse.json({
          error: 'Attendance was modified by another officer. Refresh and try again.',
          code: 'CONFLICT',
        }, { status: 409 })
      }
    }

    // Read the current flags of every row this request will touch, so
    // status is computed from each row's merged flags (amendment A1).
    let flagRows: Array<AttendanceFlags & { id: string }> = []
    if (hasIdFilter) {
      for (const idsChunk of chunkArray(resolvedRows.map(r => r.id), ATTENDANCE_LOOKUP_CHUNK_SIZE)) {
        const { data, error } = await serviceSupabase
          .from('attendance_records')
          .select(ATTENDANCE_FLAG_COLUMNS)
          .in('id', idsChunk)
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
        flagRows.push(...((data ?? []) as Array<AttendanceFlags & { id: string }>))
      }
    } else {
      let selectQuery = serviceSupabase
        .from('attendance_records')
        .select(ATTENDANCE_FLAG_COLUMNS)
        .eq('raid_event_id', filters.raid_event_id as string)
      if (filters.character_ids) {
        selectQuery = selectQuery.in('character_id', filters.character_ids)
      }
      const { data, error } = await selectQuery
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      flagRows = (data ?? []) as Array<AttendanceFlags & { id: string }>
    }

    const statusGroups = flagRows.length > 0
      ? groupIdsByMergedStatus(flagRows, updates)
      : new Map<string, string[]>([[resolveStatus(updates), []]])

    // Only add an explicit id filter per status group when one is actually
    // needed: the id/ids path always scopes by resolved row id, and the
    // raid_event_id/character_ids path only needs it if rows split across
    // more than one computed status.
    const needsIdFilterPerGroup = hasIdFilter || statusGroups.size > 1

    for (const [status, groupIds] of statusGroups) {
      const payload = { ...updates, modified_by: user.id, status }
      const idChunks = needsIdFilterPerGroup ? chunkArray(groupIds, ATTENDANCE_LOOKUP_CHUNK_SIZE) : [null]
      for (const idChunk of idChunks) {
        let updateQuery = serviceSupabase.from('attendance_records').update(payload)
        if (filters.raid_event_id) {
          updateQuery = updateQuery.eq('raid_event_id', filters.raid_event_id)
        } else {
          const eventIds = [...new Set(resolvedRows.map(r => r.raid_event_id))]
          updateQuery = updateQuery.in('raid_event_id', eventIds)
        }
        if (filters.character_ids) {
          updateQuery = updateQuery.in('character_id', filters.character_ids)
        }
        if (idChunk) {
          updateQuery = updateQuery.in('id', idChunk)
        }
        const { error } = await updateQuery
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }
    }

    // Touch the raid event's updated_at so other clients detect the change.
    if (filters.raid_event_id) {
      await serviceSupabase
        .from('raid_events')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', filters.raid_event_id)
        .eq('guild_id', guild_id)
    }

    logAudit({
      supabase: serviceSupabase,
      guildId: guild_id,
      tableName: 'attendance_records',
      recordId: filters.raid_event_id || filters.id || guild_id,
      action: 'UPDATE',
      userId: user.id,
      oldData: { filters },
      newData: updates,
    })

    trackEvent({
      event: 'attendance_recorded',
      userId: user.id,
      guildId: guild_id,
      properties: { raid_event_id: filters.raid_event_id, action: 'update' },
    })
    evaluateGuildFunnel(serviceSupabase, guild_id)

    // Recompute BLP for the affected raid events (attendance edits change
    // who was eligible for that night's awards), from the scope's own raid
    // event ids rather than an unscoped re-read.
    const affectedEventIds = filters.raid_event_id
      ? [filters.raid_event_id]
      : [...new Set(resolvedRows.map(r => r.raid_event_id))]
    if (affectedEventIds.length > 0) {
      after(() => recomputeBlpForEvents(serviceSupabase, guild_id, affectedEventIds))
    }

    return NextResponse.json({ success: true })
  },
  'PATCH /api/attendance/bulk',
)

/**
 * DELETE /api/attendance/bulk
 *
 * Deletes attendance records by raid event or by row id. A raid_event_id
 * or row id outside the guild the officer was verified for is refused with
 * nothing deleted (261003-she D-04, OD-1 A); a row id that matches no row
 * at all is ignored, as today (another officer or tab may have removed it
 * already).
 *
 * Body: {
 *   guild_id: string,
 *   raid_event_id?: string,
 *   ids?: string[],
 *   character_id?: string,
 *   character_id_is_null?: boolean,
 *   character_names?: string[]
 * }
 */
export const DELETE = withPermission<{
  guild_id?: string
  raid_event_id?: unknown
  ids?: unknown
  character_id?: unknown
  character_id_is_null?: unknown
  character_names?: unknown
}>(
  'manage_attendance',
  ({ body }) => body.guild_id,
  async ({ user, service: serviceSupabase, body, guildId: guild_id }) => {
    const parsed = parseAttendanceDeleteBody(body)
    if (!parsed) {
      return NextResponse.json({ error: ATTENDANCE_REQUEST_INVALID_ERROR }, { status: 400 })
    }
    const { raid_event_id, ids, character_id, character_id_is_null, character_names } = parsed

    if (!ids && !raid_event_id) {
      return NextResponse.json({ error: 'raid_event_id or ids required' }, { status: 400 })
    }

    // Checked even on the ids path, where it does not filter the delete —
    // an officer naming another guild's raid event should see C-1, not a
    // silent no-op.
    if (raid_event_id) {
      const invalidRaidEventIds = await findInvalidRaidEventIds(serviceSupabase, guild_id, [raid_event_id])
      if (invalidRaidEventIds.length > 0) {
        return NextResponse.json(
          { error: ATTENDANCE_OUTSIDE_GUILD_ERROR, invalid_raid_event_ids: invalidRaidEventIds },
          { status: 400 },
        )
      }
    }

    // Affected raid events, for the BLP recompute below (deleting
    // attendance changes who was eligible that night).
    const deleteEventIds = new Set<string>()

    if (ids) {
      const resolved = await resolveAttendanceRowsInGuild(serviceSupabase, guild_id, ids)
      if (resolved.outsideGuildIds.length > 0) {
        return NextResponse.json(
          { error: ATTENDANCE_OUTSIDE_GUILD_ERROR, invalid_ids: resolved.outsideGuildIds },
          { status: 400 },
        )
      }
      if (resolved.rows.length === 0) {
        // Every named id was already removed; nothing to delete, audit or recompute.
        return NextResponse.json({ success: true })
      }
      for (const row of resolved.rows) deleteEventIds.add(row.raid_event_id)
      const scopedEventIds = [...deleteEventIds]

      for (const idsChunk of chunkArray(resolved.rows.map(r => r.id), ATTENDANCE_LOOKUP_CHUNK_SIZE)) {
        const { error } = await serviceSupabase
          .from('attendance_records')
          .delete()
          .in('id', idsChunk)
          .in('raid_event_id', scopedEventIds)

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }
    } else if (raid_event_id) {
      deleteEventIds.add(raid_event_id)

      let query = serviceSupabase
        .from('attendance_records')
        .delete()
        .eq('raid_event_id', raid_event_id)

      if (character_id) {
        query = query.eq('character_id', character_id)
      }
      if (character_id_is_null) {
        query = query.is('character_id', null)
      }
      if (character_names && character_names.length > 0) {
        query = query.in('character_name', character_names)
      }

      const { error } = await query

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    logAudit({
      supabase: serviceSupabase,
      guildId: guild_id,
      tableName: 'attendance_records',
      recordId: raid_event_id || guild_id,
      action: 'DELETE',
      userId: user.id,
      oldData: {
        raid_event_id,
        ids: ids?.length,
        character_id,
        character_id_is_null,
        character_names,
      },
    })

    if (deleteEventIds.size > 0) {
      after(() => recomputeBlpForEvents(serviceSupabase, guild_id, [...deleteEventIds]))
    }

    return NextResponse.json({ success: true })
  },
  'DELETE /api/attendance/bulk',
)
