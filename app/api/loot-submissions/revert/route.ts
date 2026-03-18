import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'

// POST - Revert a resubmitted list to its previously approved snapshot
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceSupabase = createServiceRoleClient()
    const { submission_id } = await request.json()

    if (!submission_id) {
      return NextResponse.json({ error: 'Submission ID is required' }, { status: 400 })
    }

    // Get the submission to verify guild and check state
    const { data: submission, error: subError } = await serviceSupabase
      .from('loot_submissions')
      .select('id, guild_id, status, resubmission_count')
      .eq('id', submission_id)
      .single()

    if (subError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    if (submission.status !== 'pending') {
      return NextResponse.json({ error: 'Can only revert pending submissions' }, { status: 400 })
    }

    if (submission.resubmission_count === 0) {
      return NextResponse.json({ error: 'No previous version to revert to' }, { status: 400 })
    }

    // Verify officer permissions
    const verification = await verifyOfficerPermissions(serviceSupabase, user.id, submission.guild_id)
    if (!verification.hasPermission) {
      return NextResponse.json({ error: 'Only officers can revert submissions' }, { status: 403 })
    }

    // Get the latest snapshot (the previously approved state)
    const { data: snapshot, error: snapError } = await serviceSupabase
      .from('loot_submission_snapshots')
      .select('items')
      .eq('submission_id', submission_id)
      .order('version', { ascending: false })
      .limit(1)
      .single()

    if (snapError || !snapshot?.items) {
      return NextResponse.json({ error: 'No snapshot found to revert to' }, { status: 404 })
    }

    const snapshotItems = snapshot.items as Array<{
      rank: number
      slot: number
      loot_item_id: string
      item_name: string
    }>

    // Delete all current submission items
    const { error: deleteError } = await serviceSupabase
      .from('loot_submission_items')
      .delete()
      .eq('submission_id', submission_id)

    if (deleteError) {
      console.error('Error deleting current items:', deleteError)
      return NextResponse.json({ error: 'Failed to revert items' }, { status: 500 })
    }

    // Re-insert items from the snapshot
    if (snapshotItems.length > 0) {
      const itemRows = snapshotItems.map(item => ({
        submission_id,
        loot_item_id: item.loot_item_id,
        rank: item.rank,
        slot: item.slot || 1,
      }))

      const { error: insertError } = await serviceSupabase
        .from('loot_submission_items')
        .insert(itemRows)

      if (insertError) {
        console.error('Error inserting snapshot items:', insertError)
        return NextResponse.json({ error: 'Failed to restore snapshot items' }, { status: 500 })
      }
    }

    // Set status back to approved
    const { error: updateError } = await serviceSupabase
      .from('loot_submissions')
      .update({
        status: 'approved',
        review_notes: 'Changes rejected by officer. Reverted to previously approved list.',
      })
      .eq('id', submission_id)

    if (updateError) {
      console.error('Error updating submission status:', updateError)
      return NextResponse.json({ error: 'Failed to update submission status' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/loot-submissions/revert:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
