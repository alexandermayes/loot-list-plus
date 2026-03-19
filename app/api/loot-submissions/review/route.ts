import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { logStatusChange } from '@/utils/audit/log'

/**
 * POST /api/loot-submissions/review
 *
 * Approve or reject a loot submission. Officer-only.
 *
 * Body: { submission_id, status: 'approved' | 'rejected', review_notes?: string }
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

    if (status !== 'approved' && status !== 'rejected') {
      return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    // Get the submission to find its guild
    const { data: submission, error: subError } = await serviceSupabase
      .from('loot_submissions')
      .select('id, guild_id, status, character_id')
      .eq('id', submission_id)
      .single()

    if (subError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Verify officer permissions in the submission's guild
    const verification = await verifyOfficerPermissions(serviceSupabase, user.id, submission.guild_id)
    if (!verification.hasPermission) {
      return NextResponse.json({ error: 'Only officers can review submissions' }, { status: 403 })
    }

    if (submission.status !== 'pending') {
      return NextResponse.json({ error: 'Can only review pending submissions' }, { status: 400 })
    }

    // When approving, snapshot the current items so we can diff against
    // them if the raider resubmits later
    if (status === 'approved') {
      const { data: currentItems } = await serviceSupabase
        .from('loot_submission_items')
        .select('rank, slot, loot_item_id, loot_item:loot_items(name)')
        .eq('submission_id', submission_id)
        .is('removed_at', null)

      if (currentItems && currentItems.length > 0) {
        const snapshotItems = currentItems.map((item: any) => ({
          rank: item.rank,
          slot: item.slot,
          loot_item_id: item.loot_item_id,
          item_name: item.loot_item?.name || 'Unknown',
        }))

        // Delete old snapshots and insert the new approved state
        // We only need the latest approved snapshot for diff comparison
        await serviceSupabase
          .from('loot_submission_snapshots')
          .delete()
          .eq('submission_id', submission_id)

        await serviceSupabase
          .from('loot_submission_snapshots')
          .insert({
            submission_id,
            version: 0,
            items: snapshotItems,
          })
      }
    }

    // Update the submission
    const { data, error: updateError } = await serviceSupabase
      .from('loot_submissions')
      .update({
        status,
        review_notes: review_notes || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', submission_id)
      .select()

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

    return NextResponse.json({ success: true, submission: data[0] })
  } catch (error) {
    console.error('Error in POST /api/loot-submissions/review:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
