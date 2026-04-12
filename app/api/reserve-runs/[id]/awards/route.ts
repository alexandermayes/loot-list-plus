import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { trackEvent } from '@/utils/analytics/server'
import { logReserveAudit } from '@/utils/reserve-audit'
import { verifyReserveRunAccess } from '@/utils/reserve-access'

/**
 * POST /api/reserve-runs/[id]/awards
 *
 * Log an item award for a reserve run. Officer-only.
 *
 * Body: { loot_item_id, character_name, submission_id?, notes? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedUser()
    const { id } = await params
    const body = await request.json()
    const { loot_item_id, character_name, submission_id, notes } = body

    if (!loot_item_id || !character_name) {
      return NextResponse.json(
        { error: 'loot_item_id and character_name are required' },
        { status: 400 }
      )
    }

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

    if (run.status !== 'locked' && run.status !== 'completed') {
      return NextResponse.json({ error: 'Can only award items on locked or completed runs' }, { status: 400 })
    }

    // awarded_by FK must be satisfied even when the caller is using a
    // leader token. Fall back to the run creator in that case.
    const awardedBy = user?.id ?? run.created_by

    const { data: award, error: insertError } = await serviceSupabase
      .from('reserve_awards')
      .insert({
        reserve_run_id: id,
        loot_item_id,
        character_name,
        submission_id: submission_id || null,
        awarded_by: awardedBy,
        notes: notes || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating award:', insertError)
      return NextResponse.json({ error: 'Failed to create award' }, { status: 500 })
    }

    if (user) {
      trackEvent({
        event: 'reserve_item_awarded',
        userId: user.id,
        properties: { run_id: id, loot_item_id, character_name },
      })
    }

    await logReserveAudit({
      supabase: serviceSupabase,
      reserveRunId: id,
      actorUserId: user?.id ?? null,
      actorLabel: user?.email ?? (access.actor === 'leader_token' ? 'Raid leader token' : null),
      action: 'award_created',
      details: { loot_item_id, character_name, award_id: award.id, actor: access.actor },
    })

    return NextResponse.json({ success: true, award })
  } catch (err) {
    console.error('Reserve award POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/reserve-runs/[id]/awards
 *
 * Remove an award. Officer-only.
 *
 * Query: ?award_id=X
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedUser()
    const { id } = await params
    const awardId = request.nextUrl.searchParams.get('award_id')
    if (!awardId) {
      return NextResponse.json({ error: 'award_id is required' }, { status: 400 })
    }

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

    // Fetch the award before deletion so we can log useful details
    const { data: awardRow } = await serviceSupabase
      .from('reserve_awards')
      .select('loot_item_id, character_name')
      .eq('id', awardId)
      .eq('reserve_run_id', id)
      .single()

    const { error: deleteError } = await serviceSupabase
      .from('reserve_awards')
      .delete()
      .eq('id', awardId)
      .eq('reserve_run_id', id)

    if (deleteError) {
      console.error('Error deleting award:', deleteError)
      return NextResponse.json({ error: 'Failed to remove award' }, { status: 500 })
    }

    await logReserveAudit({
      supabase: serviceSupabase,
      reserveRunId: id,
      actorUserId: user?.id ?? null,
      actorLabel: user?.email ?? (access.actor === 'leader_token' ? 'Raid leader token' : null),
      action: 'award_deleted',
      details: {
        award_id: awardId,
        loot_item_id: awardRow?.loot_item_id ?? null,
        character_name: awardRow?.character_name ?? null,
        actor: access.actor,
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Reserve award DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
