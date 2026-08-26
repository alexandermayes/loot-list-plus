import { NextResponse, after } from 'next/server'
import { withPermission } from '@/utils/api/handler'
import { logAudit } from '@/utils/audit/log'
import { resolveStatus } from '@/domain/scoring'
import { trackEvent } from '@/utils/analytics/server'
import { evaluateGuildFunnel } from '@/utils/analytics/funnel'
import { revalidateCharacterAttendance } from '@/lib/cache/dashboard-attendance'
import { recomputeBlpForEvents } from '@/utils/blp/recompute'
import { routeRecordsToTeamEvents } from '@/utils/raid-events/team-routing'

interface AttendanceRecord {
  raid_event_id: string
  character_id?: string
  character_name?: string
  user_id?: string
  signed_up?: boolean
  attended?: boolean
  no_call_no_show?: boolean
  was_late?: boolean
  was_benched?: boolean
  is_excused?: boolean
}

interface AttendanceFilters {
  raid_event_id?: string
  expected_updated_at?: string
  character_ids?: string[]
  ids?: string[]
  id?: string
}

/**
 * POST /api/attendance/bulk
 *
 * Bulk upsert/insert attendance records. Uses service role to bypass RLS
 * after verifying officer permissions.
 *
 * Body: {
 *   guild_id: string,
 *   action: 'upsert' | 'insert',
 *   records: AttendanceRecord[],
 *   onConflict?: string  // e.g. 'raid_event_id,character_id'
 * }
 */
export const POST = withPermission<{
  guild_id?: string
  action?: string
  records?: AttendanceRecord[]
  onConflict?: string
}>(
  'manage_attendance',
  ({ body }) => body.guild_id,
  async ({ user, service: serviceSupabase, body, guildId: guild_id }) => {
    const { action, records, onConflict } = body

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'guild_id and records array are required' }, { status: 400 })
    }

    // Stamp modified_by and computed status on all records (dual-write)
    const stampedRecords = records.map((r: AttendanceRecord) => ({
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
        .upsert(stampedRecords, { onConflict: onConflict || 'raid_event_id,character_id' })
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
      for (const r of records as AttendanceRecord[]) {
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
      for (const r of records as AttendanceRecord[]) {
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
 * Update attendance records by filter criteria.
 *
 * Body: {
 *   guild_id: string,
 *   updates: Record<string, unknown>,
 *   filters: { raid_event_id?: string, character_ids?: string[], ids?: string[], character_id_is_null?: boolean, character_name?: string }
 * }
 */
export const PATCH = withPermission<{
  guild_id?: string
  updates?: Partial<AttendanceRecord>
  filters?: AttendanceFilters
}>(
  'manage_attendance',
  ({ body }) => body.guild_id,
  async ({ user, service: serviceSupabase, body, guildId: guild_id }) => {
    const { updates, filters } = body

    if (!updates || !filters) {
      return NextResponse.json({ error: 'guild_id, updates, and filters are required' }, { status: 400 })
    }

    // Optimistic locking: if client sends expected_updated_at for the raid event,
    // verify it hasn't been modified by another officer since the client loaded data
    if (filters.raid_event_id && filters.expected_updated_at) {
      const { data: raidEvent } = await serviceSupabase
        .from('raid_events')
        .select('updated_at')
        .eq('id', filters.raid_event_id)
        .single()

      if (raidEvent?.updated_at && raidEvent.updated_at !== filters.expected_updated_at) {
        return NextResponse.json({
          error: 'Attendance was modified by another officer. Refresh and try again.',
          code: 'CONFLICT',
        }, { status: 409 })
      }
    }

    // If boolean attendance fields are being updated, compute status (dual-write)
    const attendanceBooleans = ['attended', 'was_late', 'was_benched', 'no_call_no_show', 'signed_up', 'is_excused']
    const hasAttendanceBooleans = attendanceBooleans.some(k => k in updates)
    const patchUpdates = {
      ...updates,
      modified_by: user.id,
      ...(hasAttendanceBooleans ? { status: resolveStatus(updates) } : {}),
    }

    let query = serviceSupabase
      .from('attendance_records')
      .update(patchUpdates)

    if (filters.raid_event_id) {
      query = query.eq('raid_event_id', filters.raid_event_id)
    }
    if (filters.character_ids) {
      query = query.in('character_id', filters.character_ids)
    }
    if (filters.ids) {
      query = query.in('id', filters.ids)
    }
    if (filters.id) {
      query = query.eq('id', filters.id)
    }

    const { error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Touch the raid event's updated_at so other clients detect the change
    if (filters.raid_event_id) {
      await serviceSupabase
        .from('raid_events')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', filters.raid_event_id)
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

    // Recompute BLP for the affected raid events (attendance edits change who
    // was eligible for that night's awards). Resolve event ids from the filter.
    const patchEventIds = new Set<string>()
    if (filters.raid_event_id) {
      patchEventIds.add(filters.raid_event_id)
    } else if (filters.ids || filters.character_ids || filters.id) {
      let evq = serviceSupabase.from('attendance_records').select('raid_event_id')
      if (filters.ids) evq = evq.in('id', filters.ids)
      if (filters.id) evq = evq.eq('id', filters.id)
      if (filters.character_ids) evq = evq.in('character_id', filters.character_ids)
      const { data: evRows } = await evq
      for (const row of evRows || []) {
        if (row.raid_event_id) patchEventIds.add(row.raid_event_id)
      }
    }
    if (patchEventIds.size > 0) {
      after(() => recomputeBlpForEvents(serviceSupabase, guild_id, [...patchEventIds]))
    }

    return NextResponse.json({ success: true })
  },
  'PATCH /api/attendance/bulk',
)

/**
 * DELETE /api/attendance/bulk
 *
 * Delete attendance records by various filters.
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
  raid_event_id?: string
  ids?: string[]
  character_id?: string
  character_id_is_null?: boolean
  character_names?: string[]
}>(
  'manage_attendance',
  ({ body }) => body.guild_id,
  async ({ user, service: serviceSupabase, body, guildId: guild_id }) => {
    const { raid_event_id, ids, character_id, character_id_is_null, character_names } = body

    // Capture affected raid events before deleting so BLP can be recomputed
    // afterward (deleting attendance changes who was eligible that night).
    const deleteEventIds = new Set<string>()
    if (raid_event_id) {
      deleteEventIds.add(raid_event_id)
    } else if (ids && ids.length > 0) {
      const { data: evRows } = await serviceSupabase
        .from('attendance_records')
        .select('raid_event_id')
        .in('id', ids)
      for (const row of evRows || []) {
        if (row.raid_event_id) deleteEventIds.add(row.raid_event_id)
      }
    }

    let query = serviceSupabase
      .from('attendance_records')
      .delete()

    if (ids && ids.length > 0) {
      query = query.in('id', ids)
    } else if (raid_event_id) {
      query = query.eq('raid_event_id', raid_event_id)

      if (character_id) {
        query = query.eq('character_id', character_id)
      }
      if (character_id_is_null) {
        query = query.is('character_id', null)
      }
      if (character_names && character_names.length > 0) {
        query = query.in('character_name', character_names)
      }
    } else {
      return NextResponse.json({ error: 'raid_event_id or ids required' }, { status: 400 })
    }

    const { error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
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
