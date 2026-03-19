import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { logAudit } from '@/utils/audit/log'

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
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { guild_id, action, records, onConflict } = body

    if (!guild_id || !records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'guild_id and records array are required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    const { hasPermission, error: permError } = await verifyOfficerPermissions(serviceSupabase, user.id, guild_id)
    if (!hasPermission) {
      return NextResponse.json({ error: permError || 'Insufficient permissions' }, { status: 403 })
    }

    if (action === 'upsert') {
      const { data, error } = await serviceSupabase
        .from('attendance_records')
        .upsert(records, { onConflict: onConflict || 'raid_event_id,character_id' })
        .select()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const count = data?.length || 0
      const raidEventId = records[0]?.raid_event_id
      logAudit({
        supabase: serviceSupabase,
        guildId: guild_id,
        tableName: 'attendance_records',
        recordId: raidEventId || guild_id,
        action: 'INSERT',
        userId: user.id,
        newData: { action: 'upsert', record_count: count, raid_event_id: raidEventId },
      })

      return NextResponse.json({ success: true, count })
    } else {
      const { data, error } = await serviceSupabase
        .from('attendance_records')
        .insert(records)
        .select()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const count = data?.length || 0
      const raidEventId = records[0]?.raid_event_id
      logAudit({
        supabase: serviceSupabase,
        guildId: guild_id,
        tableName: 'attendance_records',
        recordId: raidEventId || guild_id,
        action: 'INSERT',
        userId: user.id,
        newData: { action: 'insert', record_count: count, raid_event_id: raidEventId },
      })

      return NextResponse.json({ success: true, count })
    }
  } catch (error) {
    console.error('Error in POST /api/attendance/bulk:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
export async function PATCH(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { guild_id, updates, filters } = body

    if (!guild_id || !updates || !filters) {
      return NextResponse.json({ error: 'guild_id, updates, and filters are required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    const { hasPermission, error: permError } = await verifyOfficerPermissions(serviceSupabase, user.id, guild_id)
    if (!hasPermission) {
      return NextResponse.json({ error: permError || 'Insufficient permissions' }, { status: 403 })
    }

    let query = serviceSupabase
      .from('attendance_records')
      .update(updates)

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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PATCH /api/attendance/bulk:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
export async function DELETE(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { guild_id, raid_event_id, ids, character_id, character_id_is_null, character_names } = body

    if (!guild_id) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    const { hasPermission, error: permError } = await verifyOfficerPermissions(serviceSupabase, user.id, guild_id)
    if (!hasPermission) {
      return NextResponse.json({ error: permError || 'Insufficient permissions' }, { status: 403 })
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/attendance/bulk:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
