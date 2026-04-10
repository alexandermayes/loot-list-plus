import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { trackEvent } from '@/utils/analytics/server'
import { logReserveAudit } from '@/utils/reserve-audit'

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
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Fetch run to verify guild
    const { data: run, error: fetchError } = await serviceSupabase
      .from('reserve_runs')
      .select('guild_id, status')
      .eq('id', id)
      .single()

    if (fetchError || !run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    if (run.status !== 'locked' && run.status !== 'completed') {
      return NextResponse.json({ error: 'Can only award items on locked or completed runs' }, { status: 400 })
    }

    const verification = await verifyOfficerPermissions(serviceSupabase, user.id, run.guild_id)
    if (!verification.hasPermission) {
      return NextResponse.json({ error: 'Only officers can award items' }, { status: 403 })
    }

    const { data: award, error: insertError } = await serviceSupabase
      .from('reserve_awards')
      .insert({
        reserve_run_id: id,
        loot_item_id,
        character_name,
        submission_id: submission_id || null,
        awarded_by: user.id,
        notes: notes || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating award:', insertError)
      return NextResponse.json({ error: 'Failed to create award' }, { status: 500 })
    }

    trackEvent({
      event: 'reserve_item_awarded',
      userId: user.id,
      properties: { run_id: id, loot_item_id, character_name },
    })

    await logReserveAudit({
      supabase: serviceSupabase,
      reserveRunId: id,
      actorUserId: user.id,
      actorLabel: user.email ?? null,
      action: 'award_created',
      details: { loot_item_id, character_name, award_id: award.id },
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
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const awardId = request.nextUrl.searchParams.get('award_id')
    if (!awardId) {
      return NextResponse.json({ error: 'award_id is required' }, { status: 400 })
    }

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
      return NextResponse.json({ error: 'Only officers can remove awards' }, { status: 403 })
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
      actorUserId: user.id,
      actorLabel: user.email ?? null,
      action: 'award_deleted',
      details: {
        award_id: awardId,
        loot_item_id: awardRow?.loot_item_id ?? null,
        character_name: awardRow?.character_name ?? null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Reserve award DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
