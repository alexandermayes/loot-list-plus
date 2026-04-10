import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { trackEvent } from '@/utils/analytics/server'
import { logReserveAudit } from '@/utils/reserve-audit'

/**
 * GET /api/reserve-runs/[id]
 *
 * Get full run details with submissions and awards.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const serviceSupabase = createServiceRoleClient()

    // Fetch run with related data
    const { data: run, error } = await serviceSupabase
      .from('reserve_runs')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    // Fetch submissions
    const { data: submissions } = await serviceSupabase
      .from('reserve_submissions')
      .select('*')
      .eq('reserve_run_id', id)
      .eq('status', 'submitted')
      .order('created_at', { ascending: true })

    // Fetch awards
    const { data: awards } = await serviceSupabase
      .from('reserve_awards')
      .select('*')
      .eq('reserve_run_id', id)
      .order('awarded_at', { ascending: true })

    // Fetch loot items for this raid tier
    const { data: items } = await serviceSupabase
      .from('loot_items')
      .select('id, name, boss_name, item_slot, wowhead_id, classification')
      .eq('raid_tier_id', run.raid_tier_id)
      .eq('is_available', true)
      .order('boss_name')

    // Fetch raid tier name
    const { data: raidTier } = await serviceSupabase
      .from('raid_tiers')
      .select('name')
      .eq('id', run.raid_tier_id)
      .single()

    return NextResponse.json({
      success: true,
      run: {
        ...run,
        raid_tier_name: raidTier?.name || null,
        submissions: submissions || [],
        awards: awards || [],
        items: items || [],
      },
    })
  } catch (err) {
    console.error('Reserve run GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/reserve-runs/[id]
 *
 * Update run or change status. Officer-only.
 *
 * Body: { action?: 'lock' | 'unlock' | 'complete', ...fields }
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

    const { id } = await params
    const body = await request.json()
    const serviceSupabase = createServiceRoleClient()

    // Fetch run to verify guild
    const { data: run, error: fetchError } = await serviceSupabase
      .from('reserve_runs')
      .select('guild_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    const verification = await verifyOfficerPermissions(serviceSupabase, user.id, run.guild_id)
    if (!verification.hasPermission) {
      return NextResponse.json({ error: 'Only officers can manage reserve runs' }, { status: 403 })
    }

    let updateData: Record<string, any> = {}
    let auditAction: string | null = null
    const auditDetails: Record<string, unknown> = {}

    if (body.action === 'lock') {
      if (run.status !== 'open') {
        return NextResponse.json({ error: 'Can only lock an open run' }, { status: 400 })
      }
      updateData = { status: 'locked', locked_at: new Date().toISOString() }
      auditAction = 'run_locked'
    } else if (body.action === 'unlock') {
      if (run.status !== 'locked') {
        return NextResponse.json({ error: 'Can only unlock a locked run' }, { status: 400 })
      }
      updateData = { status: 'open', locked_at: null }
      auditAction = 'run_unlocked'
    } else if (body.action === 'complete') {
      if (run.status !== 'locked') {
        return NextResponse.json({ error: 'Can only complete a locked run' }, { status: 400 })
      }
      updateData = { status: 'completed' }
      auditAction = 'run_completed'
    } else {
      // Field updates. Note + discord link can be edited at any status; structural
      // fields are only editable while the run is still open.
      const alwaysEditable = ['rules_note', 'discord_invite_url']
      const openOnlyFields = [
        'title',
        'raid_at',
        'lock_at',
        'hard_reserves',
        'max_reserves',
        'max_reserves_per_item',
        'allow_duplicates',
        'visibility',
        'enforce_class_restrictions',
      ]

      for (const key of alwaysEditable) {
        if (body[key] !== undefined) {
          updateData[key] = body[key]
        }
      }

      const wantsStructuralEdit = openOnlyFields.some(k => body[k] !== undefined)
      if (wantsStructuralEdit) {
        if (run.status !== 'open') {
          return NextResponse.json(
            { error: 'Run settings can only be edited while the run is open' },
            { status: 400 }
          )
        }
        for (const key of openOnlyFields) {
          if (body[key] !== undefined) {
            updateData[key] = body[key]
          }
        }
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
      }

      auditAction = 'run_edited'
      auditDetails.fields = Object.keys(updateData)
    }

    const { data: updated, error: updateError } = await serviceSupabase
      .from('reserve_runs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating reserve run:', updateError)
      return NextResponse.json({ error: 'Failed to update run' }, { status: 500 })
    }

    if (body.action) {
      const eventName = `reserve_run_${body.action}ed` as import('@/utils/analytics/server').AnalyticsEvent
      trackEvent({ event: eventName, userId: user.id, properties: { run_id: id } })
    }

    if (auditAction) {
      await logReserveAudit({
        supabase: serviceSupabase,
        reserveRunId: id,
        actorUserId: user.id,
        actorLabel: user.email ?? null,
        action: auditAction,
        details: auditDetails,
      })
    }

    return NextResponse.json({ success: true, run: updated })
  } catch (err) {
    console.error('Reserve run PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/reserve-runs/[id]
 *
 * Delete a reserve run. Officer-only.
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

    const { id } = await params
    const serviceSupabase = createServiceRoleClient()

    const { data: run, error: fetchError } = await serviceSupabase
      .from('reserve_runs')
      .select('guild_id')
      .eq('id', id)
      .single()

    if (fetchError || !run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    const verification = await verifyOfficerPermissions(serviceSupabase, user.id, run.guild_id)
    if (!verification.hasPermission) {
      return NextResponse.json({ error: 'Only officers can delete reserve runs' }, { status: 403 })
    }

    const { error: deleteError } = await serviceSupabase
      .from('reserve_runs')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting reserve run:', deleteError)
      return NextResponse.json({ error: 'Failed to delete run' }, { status: 500 })
    }

    trackEvent({ event: 'reserve_run_deleted', userId: user.id, properties: { run_id: id } })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Reserve run DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
