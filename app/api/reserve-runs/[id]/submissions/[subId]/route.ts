import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { logReserveAudit } from '@/utils/reserve-audit'

interface RouteParams {
  params: Promise<{ id: string; subId: string }>
}

async function loadRunAndSubmission(id: string, subId: string) {
  const serviceSupabase = createServiceRoleClient()

  const { data: run, error: runError } = await serviceSupabase
    .from('reserve_runs')
    .select('id, guild_id, status')
    .eq('id', id)
    .single()
  if (runError || !run) return { error: 'Run not found' as const, status: 404 }

  const { data: submission, error: subError } = await serviceSupabase
    .from('reserve_submissions')
    .select('*')
    .eq('id', subId)
    .eq('reserve_run_id', id)
    .single()
  if (subError || !submission) return { error: 'Submission not found' as const, status: 404 }

  return { serviceSupabase, run, submission }
}

/**
 * PATCH /api/reserve-runs/[id]/submissions/[subId]
 *
 * Officer-only edit of a single submission. Allows fixing character
 * name/class/spec typos and editing the reserved item list.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, subId } = await params
    const body = await request.json()

    const loaded = await loadRunAndSubmission(id, subId)
    if ('error' in loaded) {
      return NextResponse.json({ error: loaded.error }, { status: loaded.status })
    }
    const { serviceSupabase, run, submission } = loaded

    const verification = await verifyOfficerPermissions(serviceSupabase, user.id, run.guild_id)
    if (!verification.hasPermission) {
      return NextResponse.json({ error: 'Only officers can edit submissions' }, { status: 403 })
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
      actorUserId: user.id,
      actorLabel: user.email ?? null,
      action: 'submission_officer_edited',
      details: {
        submission_id: subId,
        character_name: updated.character_name,
        fields: Object.keys(updateData),
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
 * Officer-only removal of a single submission.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, subId } = await params

    const loaded = await loadRunAndSubmission(id, subId)
    if ('error' in loaded) {
      return NextResponse.json({ error: loaded.error }, { status: loaded.status })
    }
    const { serviceSupabase, run, submission } = loaded

    const verification = await verifyOfficerPermissions(serviceSupabase, user.id, run.guild_id)
    if (!verification.hasPermission) {
      return NextResponse.json({ error: 'Only officers can delete submissions' }, { status: 403 })
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
      actorUserId: user.id,
      actorLabel: user.email ?? null,
      action: 'submission_officer_deleted',
      details: {
        submission_id: subId,
        character_name: submission.character_name,
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Reserve submission DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
