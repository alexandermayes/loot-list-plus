import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { trackEvent } from '@/utils/analytics/server'
import { logReserveAudit } from '@/utils/reserve-audit'
import { verifyReserveRunAccess, decideReserveRunViewer } from '@/utils/reserve-access'

// Explicit column lists for every caller, so a database column never
// reaches a response by way of select('*').
const SUBMISSION_COLUMNS = 'id, character_name, character_class, character_spec, items, created_at, updated_at'
const AWARD_COLUMNS = 'id, loot_item_id, character_name, submission_id, awarded_at, notes'

// Every reserve_runs column except raid_leader_token and created_by, the
// two fields a manager-only read returns. An allow-list, so a column added
// to the table later is withheld from viewers until it is listed here.
const RUN_VIEWER_FIELDS = [
  'id',
  'guild_id',
  'expansion_id',
  'raid_team_id',
  'raid_tier_id',
  'title',
  'status',
  'raid_at',
  'lock_at',
  'locked_at',
  'max_reserves',
  'max_reserves_per_item',
  'allow_duplicates',
  'enforce_class_restrictions',
  'visibility',
  'rules_note',
  'discord_invite_url',
  'hard_reserves',
  'rule_snapshot',
  'share_token',
  'created_at',
  'updated_at',
] as const

/**
 * GET /api/reserve-runs/[id]
 *
 * Managers (the leader link, the run's creator while an active member of
 * the run's guild, and officers with Manage reserves for a guild run) get
 * the full run, including the raid leader token. Any other active member
 * of a guild run's guild can view the run without the token or created_by;
 * while the run is open and not public_live, their sign-ups carry an
 * item_count instead of the reserved items. A run with no guild has no
 * viewers who are not already managers.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedUser()
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

    const viewer = await decideReserveRunViewer({
      serviceSupabase,
      run,
      request,
      userId: user?.id ?? null,
    })

    if (!viewer.canView) {
      const status = viewer.reason === 'Unauthorized' ? 401 : 403
      return NextResponse.json({ error: viewer.reason ?? 'Forbidden' }, { status })
    }

    const canManage = viewer.canManage

    // Fetch submissions (explicit column list; no internal ids reach any caller)
    const { data: submissions, error: submissionsError } = await serviceSupabase
      .from('reserve_submissions')
      .select(SUBMISSION_COLUMNS)
      .eq('reserve_run_id', id)
      .eq('status', 'submitted')
      .order('created_at', { ascending: true })

    if (submissionsError) {
      throw new Error(`Reserve run GET: submissions read failed: ${submissionsError.message}`)
    }

    // Non-managers do not see the reserved items while the run is open and
    // hidden from public view; everyone gets an item_count either way.
    const hideItems = !canManage && run.status === 'open' && run.visibility !== 'public_live'
    const submissionsWithCounts = (submissions || []).map((sub) => {
      const itemCount = Array.isArray(sub.items) ? sub.items.length : 0
      return {
        ...sub,
        items: hideItems ? [] : sub.items,
        item_count: itemCount,
      }
    })

    // Fetch awards (explicit column list)
    const { data: awards, error: awardsError } = await serviceSupabase
      .from('reserve_awards')
      .select(AWARD_COLUMNS)
      .eq('reserve_run_id', id)
      .order('awarded_at', { ascending: true })

    if (awardsError) {
      throw new Error(`Reserve run GET: awards read failed: ${awardsError.message}`)
    }

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

    const runPayload: Record<string, unknown> = canManage
      ? { ...run }
      : Object.fromEntries(RUN_VIEWER_FIELDS.map((key) => [key, (run as Record<string, unknown>)[key]]))

    return NextResponse.json({
      success: true,
      can_manage: canManage,
      run: {
        ...runPayload,
        raid_tier_name: raidTier?.name || null,
        submissions: submissionsWithCounts,
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
    const { user } = await getAuthenticatedUser()
    const { id } = await params
    const body = await request.json()
    const serviceSupabase = createServiceRoleClient()

    const access = await verifyReserveRunAccess({
      serviceSupabase,
      runId: id,
      request,
      userId: user?.id ?? null,
    })
    if (!access.allowed || !access.run) {
      const status = access.reason === 'Run not found' ? 404 : access.reason === 'Unauthorized' ? 401 : 403
      return NextResponse.json({ error: access.reason ?? 'Forbidden' }, { status })
    }
    const run = access.run

    let updateData: Record<string, unknown> = {}
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

    if (body.action && user) {
      const eventName = `reserve_run_${body.action}ed` as import('@/utils/analytics/server').AnalyticsEvent
      trackEvent({ event: eventName, userId: user.id, properties: { run_id: id } })
    }

    if (auditAction) {
      await logReserveAudit({
        supabase: serviceSupabase,
        reserveRunId: id,
        actorUserId: user?.id ?? null,
        actorLabel: user?.email ?? (access.actor === 'leader_token' ? 'Raid leader token' : null),
        action: auditAction,
        details: { ...auditDetails, actor: access.actor },
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
    const { user } = await getAuthenticatedUser()
    const { id } = await params
    const serviceSupabase = createServiceRoleClient()

    const access = await verifyReserveRunAccess({
      serviceSupabase,
      runId: id,
      request,
      userId: user?.id ?? null,
    })
    if (!access.allowed) {
      const status = access.reason === 'Run not found' ? 404 : access.reason === 'Unauthorized' ? 401 : 403
      return NextResponse.json({ error: access.reason ?? 'Forbidden' }, { status })
    }

    const { error: deleteError } = await serviceSupabase
      .from('reserve_runs')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting reserve run:', deleteError)
      return NextResponse.json({ error: 'Failed to delete run' }, { status: 500 })
    }

    if (user) {
      trackEvent({ event: 'reserve_run_deleted', userId: user.id, properties: { run_id: id } })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Reserve run DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
