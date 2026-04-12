import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { logReserveAudit } from '@/utils/reserve-audit'
import { verifyReserveRunAccess } from '@/utils/reserve-access'

interface RouteParams {
  params: Promise<{ id: string; subId: string }>
}

async function loadSubmission(
  serviceSupabase: ReturnType<typeof createServiceRoleClient>,
  runId: string,
  subId: string
) {
  const { data: submission, error: subError } = await serviceSupabase
    .from('reserve_submissions')
    .select('*')
    .eq('id', subId)
    .eq('reserve_run_id', runId)
    .single()
  if (subError || !submission) return null
  return submission
}

/**
 * PATCH /api/reserve-runs/[id]/submissions/[subId]
 *
 * Officer-only edit of a single submission. Allows fixing character
 * name/class/spec typos and editing the reserved item list.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await getAuthenticatedUser()
    const { id, subId } = await params
    const body = await request.json()

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
    const submission = await loadSubmission(serviceSupabase, id, subId)
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (typeof body.character_name === 'string' && body.character_name.trim()) {
      updateData.character_name = body.character_name.trim()
    }
    if (typeof body.character_class === 'string' && body.character_class.trim()) {
      updateData.character_class = body.character_class.trim()
    }
    if ('character_spec' in body) {
      updateData.character_spec = body.character_spec?.trim?.() || null
    }
    if (Array.isArray(body.items)) {
      updateData.items = body.items
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: updated, error: updateError } = await serviceSupabase
      .from('reserve_submissions')
      .update(updateData)
      .eq('id', subId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating submission:', updateError)
      return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 })
    }

    await logReserveAudit({
      supabase: serviceSupabase,
      reserveRunId: id,
      actorUserId: user?.id ?? null,
      actorLabel: user?.email ?? (access.actor === 'leader_token' ? 'Raid leader token' : null),
      action: 'submission_officer_edited',
      details: {
        submission_id: subId,
        character_name: updated.character_name,
        fields: Object.keys(updateData),
        actor: access.actor,
      },
    })

    return NextResponse.json({ success: true, submission: updated })
  } catch (err) {
    console.error('Reserve submission PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/reserve-runs/[id]/submissions/[subId]
 *
 * Officer (or raid leader token) removal of a single submission.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user } = await getAuthenticatedUser()
    const { id, subId } = await params
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
    const submission = await loadSubmission(serviceSupabase, id, subId)
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    const { error: deleteError } = await serviceSupabase
      .from('reserve_submissions')
      .delete()
      .eq('id', subId)

    if (deleteError) {
      console.error('Error deleting submission:', deleteError)
      return NextResponse.json({ error: 'Failed to delete submission' }, { status: 500 })
    }

    await logReserveAudit({
      supabase: serviceSupabase,
      reserveRunId: id,
      actorUserId: user?.id ?? null,
      actorLabel: user?.email ?? (access.actor === 'leader_token' ? 'Raid leader token' : null),
      action: 'submission_officer_deleted',
      details: {
        submission_id: subId,
        character_name: submission.character_name,
        actor: access.actor,
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Reserve submission DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
