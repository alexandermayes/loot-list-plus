import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { requirePro } from '@/utils/feature-gate'
import { logAudit } from '@/utils/audit/log'
import { resolveRaidDays } from '@/domain/raid-team/settings'
import { appendScheduleEntry } from '@/domain/raid-team/schedule-history'
import { toDateString } from '@/utils/date'

/**
 * PATCH /api/raid-teams/[id]
 * Update a raid team. Officer only, Pro only.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId } = await params
    const body = await request.json()
    const { name, color_hex, is_default, sort_order, raid_days_override, rolling_weeks_override } = body as {
      name?: string
      color_hex?: string
      is_default?: boolean
      sort_order?: number
      raid_days_override?: object | null
      rolling_weeks_override?: number | null
    }

    const serviceSupabase = createServiceRoleClient()

    // Get team to find guild_id
    const { data: team, error: teamError } = await serviceSupabase
      .from('raid_teams')
      .select('id, guild_id, name, color_hex, is_default, sort_order, raid_days_override, rolling_weeks_override, schedule_history')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Pro gate
    const proCheck = await requirePro(serviceSupabase, team.guild_id)
    if (!proCheck.isPro) return proCheck.error

    // Officer check
    const { hasPermission } = await verifyOfficerPermissions(serviceSupabase, user.id, team.guild_id)
    if (!hasPermission) {
      return NextResponse.json({ error: 'Officers only' }, { status: 403 })
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name.trim()
    if (color_hex !== undefined) updates.color_hex = color_hex
    if (is_default !== undefined) updates.is_default = is_default
    if (sort_order !== undefined) updates.sort_order = sort_order
    if (raid_days_override !== undefined) updates.raid_days_override = raid_days_override
    if (rolling_weeks_override !== undefined) updates.rolling_weeks_override = rolling_weeks_override

    // When raid_days_override changes, record the new schedule in history
    // so past event generation respects when each day was actually active.
    if (raid_days_override !== undefined) {
      const { data: guildSettings } = await serviceSupabase
        .from('guild_settings')
        .select('raid_days_per_week, first_raid_day, second_raid_day, third_raid_day, fourth_raid_day, fifth_raid_day')
        .eq('guild_id', team.guild_id)
        .single()

      if (guildSettings) {
        const resolvedDays = resolveRaidDays(guildSettings, raid_days_override as any)
        updates.schedule_history = appendScheduleEntry(
          team.schedule_history,
          resolvedDays,
          toDateString(new Date())
        )
      }
    }

    // If setting as default, unset other defaults first
    if (is_default === true) {
      await serviceSupabase
        .from('raid_teams')
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq('guild_id', team.guild_id)
        .neq('id', teamId)
    }

    const { data: updated, error } = await serviceSupabase
      .from('raid_teams')
      .update(updates)
      .eq('id', teamId)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A team with that name already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logAudit({
      supabase: serviceSupabase,
      guildId: team.guild_id,
      tableName: 'raid_teams',
      recordId: teamId,
      action: 'UPDATE',
      userId: user.id,
      oldData: { name: team.name, color_hex: team.color_hex },
      newData: { name: updated.name, color_hex: updated.color_hex },
    })

    return NextResponse.json({ team: updated })
  } catch (error) {
    console.error('Error in PATCH /api/raid-teams/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/raid-teams/[id]
 * Delete a raid team. Events become unassigned (ON DELETE SET NULL).
 * Officer only, Pro only.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId } = await params
    const serviceSupabase = createServiceRoleClient()

    // Get team to find guild_id
    const { data: team, error: teamError } = await serviceSupabase
      .from('raid_teams')
      .select('id, guild_id, name')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Pro gate
    const proCheck = await requirePro(serviceSupabase, team.guild_id)
    if (!proCheck.isPro) return proCheck.error

    // Officer check
    const { hasPermission } = await verifyOfficerPermissions(serviceSupabase, user.id, team.guild_id)
    if (!hasPermission) {
      return NextResponse.json({ error: 'Officers only' }, { status: 403 })
    }

    const { error } = await serviceSupabase
      .from('raid_teams')
      .delete()
      .eq('id', teamId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logAudit({
      supabase: serviceSupabase,
      guildId: team.guild_id,
      tableName: 'raid_teams',
      recordId: teamId,
      action: 'DELETE',
      userId: user.id,
      oldData: { name: team.name },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/raid-teams/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
