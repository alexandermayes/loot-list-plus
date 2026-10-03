import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { logStatusChange } from '@/utils/audit/log'
import { trackEvent } from '@/utils/analytics/server'
import { evaluateGuildFunnel } from '@/utils/analytics/funnel'
import { revalidatePendingSubmissions } from '@/lib/cache/submission-tag'
import { findInvalidCharacterIds } from '@/lib/loot/guild-award-refs'

// Shown to the officer when approving a list whose character is not an
// active member of the list's guild. An undone approval returns to pending,
// which needs the same active membership, so this text is reused there too.
const NOT_ACTIVE_MEMBER_ERROR = "This raider isn't an active member of this guild. Check the roster, then try again."

// Shown when an undo is refused: the list is no longer approved or
// rejected, the review is more than 10 minutes old, or the list changed
// status during the request (GH #353 COPY C-5).
const UNDO_REFUSED_ERROR = "This review can't be undone anymore. Refresh to see the list's current status."

// The page only offers Undo for 8 seconds; the server allows a wider margin
// so a slow request or a clock difference between server instances never
// turns a timely undo into a false refusal (GH #353 OD-4).
const UNDO_REVIEW_WINDOW_MS = 10 * 60 * 1000

interface SubmissionRow {
  id: string
  guild_id: string
  status: string
  character_id: string | null
  reviewed_at: string | null
}

type RemovedSnapshot = { id: string; submission_id: string; version: number; items: unknown; snapshot_at: string }

/**
 * Undoes a review made within UNDO_REVIEW_WINDOW_MS, moving an approved or
 * rejected list back to the pending state it had before that review
 * (GH #353 D-05). Called only after the caller has verified officer
 * permission in submission.guild_id.
 */
async function undoReview(
  serviceSupabase: ReturnType<typeof createServiceRoleClient>,
  user: { id: string },
  submission: SubmissionRow
): Promise<NextResponse> {
  const { id: submissionId, guild_id: guildId, status: oldStatus, character_id: characterId, reviewed_at: reviewedAt } = submission

  if (oldStatus !== 'approved' && oldStatus !== 'rejected') {
    return NextResponse.json({ error: UNDO_REFUSED_ERROR }, { status: 400 })
  }

  const reviewedAtMs = reviewedAt ? Date.parse(reviewedAt) : NaN
  if (!reviewedAt || Number.isNaN(reviewedAtMs) || Date.now() - reviewedAtMs > UNDO_REVIEW_WINDOW_MS) {
    return NextResponse.json({ error: UNDO_REFUSED_ERROR }, { status: 400 })
  }

  // An undone approval returns to pending, which needs an active
  // membership exactly like a fresh approval. A lookup error throws and
  // returns 500 through the outer catch.
  const notActiveMember = !characterId
    || (await findInvalidCharacterIds(serviceSupabase, guildId, [characterId])).length > 0
  if (notActiveMember) {
    return NextResponse.json({ error: NOT_ACTIVE_MEMBER_ERROR }, { status: 400 })
  }

  // Only an undone approval touches snapshots. Approving keeps the previous
  // snapshot (D-06), so removing what this approval wrote (snapshot_at at
  // or after this review) makes that previous snapshot the latest again.
  let removedSnapshots: RemovedSnapshot[] = []
  if (oldStatus === 'approved') {
    const { data: removed, error: snapshotDeleteError } = await serviceSupabase
      .from('loot_submission_snapshots')
      .delete()
      .eq('submission_id', submissionId)
      .gte('snapshot_at', reviewedAt)
      .select('id, submission_id, version, items, snapshot_at')

    if (snapshotDeleteError) {
      console.error('Error removing snapshot during undo:', snapshotDeleteError)
      return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 })
    }
    removedSnapshots = (removed ?? []) as RemovedSnapshot[]
  }

  const { data, error: updateError } = await serviceSupabase
    .from('loot_submissions')
    .update({
      status: 'pending',
      reviewed_at: null,
      reviewed_by: null,
      review_notes: null,
      change_rejected_at: null,
      resubmit_reminded_at: null,
      resubmit_reminder_count: 0,
    })
    .eq('id', submissionId)
    .eq('status', oldStatus)
    .select()

  if (updateError || !data || data.length === 0) {
    // Put the removed snapshot rows back (best effort) before reporting the
    // failure, so a failed undo never leaves the list without its snapshot.
    if (removedSnapshots.length > 0) {
      const { error: putBackError } = await serviceSupabase
        .from('loot_submission_snapshots')
        .insert(removedSnapshots)
      if (putBackError) {
        console.error('Error restoring snapshot after a failed undo:', putBackError)
      }
    }

    if (updateError?.code === '23514') {
      return NextResponse.json({ error: NOT_ACTIVE_MEMBER_ERROR }, { status: 400 })
    }
    if (!updateError) {
      return NextResponse.json({ error: UNDO_REFUSED_ERROR }, { status: 400 })
    }
    console.error('Error undoing review:', updateError)
    return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 })
  }

  // Audit log (fire and forget)
  logStatusChange({
    supabase: serviceSupabase,
    guildId,
    tableName: 'loot_submissions',
    recordId: submissionId,
    userId: user.id,
    oldStatus,
    newStatus: 'pending',
    additionalData: {
      action: 'undo_review',
      character_id: characterId,
      undone_reviewed_at: reviewedAt,
      snapshots_removed: removedSnapshots.length,
    },
  })

  // Analytics. evaluateGuildFunnel is not called here: guild funnel
  // milestones are set once by design and an undo does not reverse one.
  trackEvent({
    event: 'loot_submission_status_changed',
    userId: user.id,
    guildId,
    properties: {
      guild_id: guildId,
      submission_id: submissionId,
      old_status: oldStatus,
      new_status: 'pending',
      undo: true,
    },
  })

  revalidatePendingSubmissions(guildId)

  return NextResponse.json({ success: true, submission: data[0] })
}

/**
 * POST /api/loot-submissions/review
 *
 * Approve, reject or undo a loot submission. Officer-only.
 *
 * Body: { submission_id, status: 'approved' | 'rejected' | 'pending', review_notes? }
 *
 * status 'pending' is an undo: it moves a list reviewed within the last 10
 * minutes back from approved or rejected to pending, restoring the review
 * fields and (for an approval) the previous snapshot (GH #353, undoReview).
 *
 * Approving needs the list's character to be an active member of the list's
 * guild: checked before the snapshot or status is written (400 if not). The
 * database applies the same rule to every pending or approved list, so a
 * 23514 from the status update (membership lost after the check) gets the
 * same 400. Rejecting is never blocked.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { submission_id, status, review_notes } = await request.json()

    if (!submission_id) {
      return NextResponse.json({ error: 'submission_id is required' }, { status: 400 })
    }

    if (status !== 'approved' && status !== 'rejected' && status !== 'pending') {
      return NextResponse.json({ error: 'status must be approved, rejected, or pending' }, { status: 400 })
    }

    // A rejection must tell the raider why. Without a reason the raider only
    // sees a red badge and is left guessing (GH #123).
    if (status === 'rejected' && !review_notes?.trim()) {
      return NextResponse.json({ error: 'A rejection reason is required.' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    // Get the submission to find its guild. reviewed_at is read here too,
    // since the undo branch below needs it to check the 10 minute window.
    const { data: submission, error: subError } = await serviceSupabase
      .from('loot_submissions')
      .select('id, guild_id, status, character_id, reviewed_at')
      .eq('id', submission_id)
      .single()

    if (subError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Verify officer permissions in the submission's guild
    const verification = await verifyPermission(serviceSupabase, user.id, submission.guild_id, 'manage_submissions')
    if (!verification.hasPermission) {
      return NextResponse.json({ error: 'Only officers can review submissions' }, { status: 403 })
    }

    if (status === 'pending') {
      return undoReview(serviceSupabase, user, submission as SubmissionRow)
    }

    if (submission.status !== 'pending') {
      return NextResponse.json({ error: 'Can only review pending submissions' }, { status: 400 })
    }

    // An approved list needs an active membership. Checked before any write.
    // A lookup error throws and returns 500.
    if (status === 'approved') {
      const notActiveMember = !submission.character_id
        || (await findInvalidCharacterIds(serviceSupabase, submission.guild_id, [submission.character_id])).length > 0
      if (notActiveMember) {
        return NextResponse.json({ error: NOT_ACTIVE_MEMBER_ERROR }, { status: 400 })
      }
    }

    // One timestamp for both the snapshot and the list, so an undo can find
    // exactly the snapshot this review wrote (GH #353 D-06).
    const reviewedAt = new Date().toISOString()

    // When approving, snapshot the current items so we can diff against
    // them if the raider resubmits later. The previous snapshot (if any) is
    // kept, not replaced, so an undone re-approval can restore it.
    if (status === 'approved') {
      const { data: currentItems, error: itemsError } = await serviceSupabase
        .from('loot_submission_items')
        .select('rank, slot, loot_item_id, loot_item:loot_items(name)')
        .eq('submission_id', submission_id)
        .is('removed_at', null)

      if (itemsError) {
        console.error('Error reading submission items for snapshot:', itemsError)
        return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 })
      }

      if (currentItems && currentItems.length > 0) {
        const snapshotItems = currentItems.map((item) => {
          const lootItem = item.loot_item as { name?: string } | { name?: string }[] | null
          const itemName = Array.isArray(lootItem) ? lootItem[0]?.name : lootItem?.name
          return {
            rank: item.rank,
            slot: item.slot,
            loot_item_id: item.loot_item_id,
            item_name: itemName || 'Unknown',
          }
        })

        const { data: latestSnapshot, error: latestSnapshotError } = await serviceSupabase
          .from('loot_submission_snapshots')
          .select('id, version')
          .eq('submission_id', submission_id)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (latestSnapshotError) {
          console.error('Error reading the latest snapshot:', latestSnapshotError)
          return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 })
        }

        // At most two rows remain per list: the one kept here, and the one
        // inserted below. Dropping everything older keeps that true across
        // repeated approve/undo cycles.
        if (latestSnapshot) {
          const { error: deleteError } = await serviceSupabase
            .from('loot_submission_snapshots')
            .delete()
            .eq('submission_id', submission_id)
            .neq('id', latestSnapshot.id)

          if (deleteError) {
            console.error('Error removing old snapshots:', deleteError)
            return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 })
          }
        }

        const { error: insertError } = await serviceSupabase
          .from('loot_submission_snapshots')
          .insert({
            submission_id,
            version: latestSnapshot ? latestSnapshot.version + 1 : 0,
            items: snapshotItems,
            snapshot_at: reviewedAt,
          })

        if (insertError) {
          console.error('Error inserting the new snapshot:', insertError)
          return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 })
        }
      }
    }

    // Update the submission
    const { data, error: updateError } = await serviceSupabase
      .from('loot_submissions')
      .update({
        status,
        review_notes: review_notes || null,
        reviewed_at: reviewedAt,
        // A genuine review outcome (approve or reject) supersedes any prior
        // reverted-change marker, so clear it (GH #123 pass 2).
        change_rejected_at: null,
        // A fresh review outcome starts a new episode — reset the resubmit
        // reminder throttle (a re-rejection should get its own run of reminders).
        resubmit_reminded_at: null,
        resubmit_reminder_count: 0,
      })
      .eq('id', submission_id)
      .select()

    if (updateError?.code === '23514') {
      return NextResponse.json({ error: NOT_ACTIVE_MEMBER_ERROR }, { status: 400 })
    }

    if (updateError) {
      console.error('Error reviewing submission:', updateError)
      return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'No rows updated' }, { status: 500 })
    }

    // Audit log (fire and forget)
    logStatusChange({
      supabase: serviceSupabase,
      guildId: submission.guild_id,
      tableName: 'loot_submissions',
      recordId: submission_id,
      userId: user.id,
      oldStatus: 'pending',
      newStatus: status,
      additionalData: { review_notes: review_notes || null, character_id: submission.character_id },
    })

    // Analytics
    trackEvent({
      event: 'loot_submission_status_changed',
      userId: user.id,
      guildId: submission.guild_id,
      properties: {
        guild_id: submission.guild_id,
        submission_id,
        old_status: 'pending',
        new_status: status,
      },
    })
    if (status === 'approved') {
      evaluateGuildFunnel(serviceSupabase, submission.guild_id)
    }

    // Invalidate the per-guild pending count for the sidebar badge
    revalidatePendingSubmissions(submission.guild_id)

    return NextResponse.json({ success: true, submission: data[0] })
  } catch (error) {
    console.error('Error in POST /api/loot-submissions/review:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
