import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { logStatusChange } from '@/utils/audit/log'
import { revalidatePendingSubmissions } from '@/lib/cache/submission-tag'

// An edit undoes the officers' decision, or the wait for one.
const REVIEWED_STATUSES = new Set(['approved', 'pending'])

// Shown when the list changed under the raider between the read and the
// write. DRAFT copy, held for owner sign-off.
const REOPEN_CONFLICT_ERROR = 'This list changed while you were editing. Refresh to see its current status.'

/**
 * POST /api/loot-submissions/reopen
 *
 * A raider who edits a list that officers have approved, or that is waiting
 * for review, drops it back to draft so the stale decision no longer
 * applies. The browser used to do that itself with a direct upsert and no
 * audit entry, which made this the one status transition in the list
 * lifecycle that audit_logs could not see (found while diagnosing the
 * research-report drift, .planning/debug/research-report-one-row-drift.md).
 *
 * Body: { submission_id }
 *
 * The caller must own the list's character. A list that is not approved or
 * pending is left alone and reported as it is, so the client can call this
 * before every save. Items are saved by the client afterwards exactly as
 * before; award slot locks are enforced by save_submission_items whatever
 * the status.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { submission_id } = await request.json()
    if (!submission_id) {
      return NextResponse.json({ error: 'submission_id is required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    const { data: submission, error: subError } = await serviceSupabase
      .from('loot_submissions')
      .select('id, guild_id, character_id, status')
      .eq('id', submission_id)
      .single()
    if (subError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    const { data: character } = await serviceSupabase
      .from('characters')
      .select('id, user_id')
      .eq('id', submission.character_id)
      .single()
    if (!character || character.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only edit your own lists' }, { status: 403 })
    }

    const oldStatus: string = submission.status ?? 'draft'
    if (!REVIEWED_STATUSES.has(oldStatus)) {
      return NextResponse.json({ success: true, status: oldStatus, reopened: false })
    }

    // The status filter makes the write conditional, so an officer decision
    // that landed between the read above and this update is not overwritten.
    const { data: updated, error: updateError } = await serviceSupabase
      .from('loot_submissions')
      .update({
        status: 'draft',
        review_notes: null,
        reviewed_at: null,
        reviewed_by: null,
        change_rejected_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', submission_id)
      .eq('status', oldStatus)
      .select('id')
    if (updateError) {
      console.error('reopen: loot_submissions update failed', updateError.code)
      return NextResponse.json({ error: 'Failed to reopen list' }, { status: 500 })
    }
    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: REOPEN_CONFLICT_ERROR }, { status: 409 })
    }

    // Awaited, unlike the fire-and-forget audit calls elsewhere: the audit
    // row is the point of this route. logAudit never throws.
    await logStatusChange({
      supabase: serviceSupabase,
      guildId: submission.guild_id,
      tableName: 'loot_submissions',
      recordId: submission_id,
      userId: user.id,
      oldStatus,
      newStatus: 'draft',
      additionalData: { character_id: submission.character_id, reason: 'raider_edit' },
    })

    // A pending list leaving the queue changes the officers' badge count.
    if (oldStatus === 'pending') revalidatePendingSubmissions(submission.guild_id)

    return NextResponse.json({ success: true, status: 'draft', reopened: true, previous_status: oldStatus })
  } catch (error) {
    console.error('Error in POST /api/loot-submissions/reopen:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
