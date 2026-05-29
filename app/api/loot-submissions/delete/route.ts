import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { NextResponse } from 'next/server'
import { verifyPermission } from '@/utils/server-roles'
import { logAudit } from '@/utils/audit/log'
import { trackEvent, trackApiError } from '@/utils/analytics/server'
import { revalidatePendingSubmissions } from '@/lib/cache/submission-tag'

export async function DELETE(request: Request) {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const serviceSupabase = createServiceRoleClient()

    const body = await request.json()
    const { guild_id, target, submission_id } = body

    if (!guild_id) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    // Support single submission deletion via submission_id
    if (submission_id) {
      // Verify user has officer permissions
      const verification = await verifyPermission(serviceSupabase, user.id, guild_id, 'manage_submissions')
      if (!verification.hasPermission) {
        return NextResponse.json({ error: 'Only officers can delete loot lists' }, { status: 403 })
      }

      // Get submission data before deletion for audit logging
      const { data: oldSubmission } = await serviceSupabase
        .from('loot_submissions')
        .select('*')
        .eq('id', submission_id)
        .eq('guild_id', guild_id)
        .single()

      // Delete single submission
      const { data, error } = await serviceSupabase
        .from('loot_submissions')
        .delete()
        .eq('id', submission_id)
        .eq('guild_id', guild_id)
        .select('id')

      if (error) {
        console.error('Error deleting single submission:', error)
        return NextResponse.json({ error: 'Failed to delete submission' }, { status: 500 })
      }

      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'Submission not found or already deleted' }, { status: 404 })
      }

      // Audit logging
      if (oldSubmission) {
        await logAudit({
          supabase: serviceSupabase,
          guildId: guild_id,
          tableName: 'loot_submissions',
          recordId: submission_id,
          action: 'DELETE',
          userId: user.id,
          oldData: oldSubmission,
          newData: null,
        })
      }

      // Analytics tracking
      await trackEvent({
        event: 'loot_submission_deleted',
        userId: user.id,
        guildId: guild_id,
        properties: {
          guild_id,
          submission_id,
          character_id: oldSubmission?.character_id,
          was_bulk: false,
        },
      })

      revalidatePendingSubmissions(guild_id)

      return NextResponse.json({
        success: true,
        count: 1,
        message: 'Submission deleted'
      })
    }

    // Bulk delete requires target parameter
    if (!target) {
      return NextResponse.json({ error: 'target is required for bulk deletion' }, { status: 400 })
    }

    if (target !== 'pending' && target !== 'all') {
      return NextResponse.json({ error: 'target must be "pending" or "all"' }, { status: 400 })
    }

    // Verify user has officer permissions (position >= 50)
    const verification = await verifyPermission(serviceSupabase, user.id, guild_id, 'manage_submissions')
    if (!verification.hasPermission) {
      return NextResponse.json({ error: 'Only officers can delete loot lists' }, { status: 403 })
    }

    // Get submissions to be deleted for audit logging
    let fetchQuery = supabase
      .from('loot_submissions')
      .select('id, character_id, status')
      .eq('guild_id', guild_id)

    if (target === 'pending') {
      fetchQuery = fetchQuery.eq('status', 'pending')
    }

    const { data: submissionsToDelete } = await fetchQuery
    const submissionCount = submissionsToDelete?.length || 0

    // Build the delete query based on target
    let deleteQuery = supabase
      .from('loot_submissions')
      .delete()
      .eq('guild_id', guild_id)

    if (target === 'pending') {
      deleteQuery = deleteQuery.eq('status', 'pending')
    }

    const { error } = await deleteQuery

    if (error) {
      console.error('Error deleting loot submissions:', error)
      return NextResponse.json({ error: 'Failed to delete loot submissions' }, { status: 500 })
    }

    // Audit logging for bulk deletion (log one summary entry)
    if (submissionCount > 0) {
      await logAudit({
        supabase,
        guildId: guild_id,
        tableName: 'loot_submissions',
        recordId: guild_id, // Use guild_id as reference for bulk operation
        action: 'DELETE',
        userId: user.id,
        oldData: {
          bulk_delete: true,
          target,
          count: submissionCount,
          submission_ids: submissionsToDelete?.map(s => s.id) || [],
        },
        newData: null,
      })

      // Analytics tracking
      await trackEvent({
        event: 'loot_submission_deleted',
        userId: user.id,
        guildId: guild_id,
        properties: {
          guild_id,
          target,
          count: submissionCount,
          was_bulk: true,
        },
      })
    }

    revalidatePendingSubmissions(guild_id)

    return NextResponse.json({
      success: true,
      count: submissionCount || 0,
      message: `Deleted ${submissionCount || 0} loot submission(s)`
    })
  } catch (error) {
    console.error('Error in loot submissions DELETE:', error)
    trackApiError('unknown', 'DELETE /api/loot-submissions/delete', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
