import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { NextResponse } from 'next/server'
import { verifyPermission } from '@/utils/server-roles'
import { logAudit } from '@/utils/audit/log'
import { trackEvent, trackApiError } from '@/utils/analytics/server'
import { revalidatePendingSubmissions } from '@/lib/cache/submission-tag'
import { BULK_DELETE_STATUSES, BULK_DELETE_MAX_IDS, BULK_DELETE_CHUNK_SIZE, type BulkDeleteTarget } from '@/domain/loot/bulk-delete'

// Identical shape to the pattern in lib/loot/guild-award-refs.ts, duplicated
// here rather than imported so that module stays about award references only.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Shown when a bulk delete request carries a missing, malformed or
// oversized submission_ids (GH #352 COPY C-1). In practice only a page
// loaded before this change reaches it.
const BULK_DELETE_INVALID_IDS_ERROR = 'This page is out of date. Refresh it, then try again.'

/**
 * DELETE /api/loot-submissions/delete
 *
 * Single path (body has submission_id): deletes one list by id and guild,
 * on the service role, after an officer permission check. Unchanged by
 * GH #352.
 *
 * Bulk path (body has target: 'pending' | 'all' and submission_ids): deletes
 * every id the officer's page shows that is still in the officer's guild
 * and in a status matching target (BULK_DELETE_STATUSES[target]). Every
 * write runs on the service role, only after the officer's own permission
 * check, so the RLS owner-only delete policy never limits a bulk delete to
 * the officer's own lists (GH #352). The response's count is the number of
 * rows the delete actually returned; requested is the number of distinct
 * valid ids the officer sent. count can be lower than requested when a
 * list changed status or guild, or was already removed, after the page
 * loaded.
 */
export async function DELETE(request: Request) {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // submission_ids must be an array of at most BULK_DELETE_MAX_IDS UUIDs.
    // Checked before verifyPermission so a malformed request never reaches
    // the database (GH #352 D-02).
    const { submission_ids } = body
    const idsAreValid = Array.isArray(submission_ids)
      && submission_ids.length <= BULK_DELETE_MAX_IDS
      && submission_ids.every((id: unknown) => typeof id === 'string' && UUID_PATTERN.test(id))
    if (!idsAreValid) {
      return NextResponse.json({ error: BULK_DELETE_INVALID_IDS_ERROR }, { status: 400 })
    }

    const seenIds = new Set<string>()
    const dedupedIds: string[] = []
    for (const id of submission_ids as string[]) {
      if (seenIds.has(id)) continue
      seenIds.add(id)
      dedupedIds.push(id)
    }
    const requested = dedupedIds.length

    // Verify user has officer permissions (position >= 50)
    const verification = await verifyPermission(serviceSupabase, user.id, guild_id, 'manage_submissions')
    if (!verification.hasPermission) {
      return NextResponse.json({ error: 'Only officers can delete loot lists' }, { status: 403 })
    }

    const allowedStatuses = BULK_DELETE_STATUSES[target as BulkDeleteTarget]
    const deletedRows: Array<{ id: string; character_id: string | null; status: string }> = []
    let chunkError = false

    for (let i = 0; i < dedupedIds.length; i += BULK_DELETE_CHUNK_SIZE) {
      const chunk = dedupedIds.slice(i, i + BULK_DELETE_CHUNK_SIZE)
      const { data, error } = await serviceSupabase
        .from('loot_submissions')
        .delete()
        .eq('guild_id', guild_id)
        .in('id', chunk)
        .in('status', [...allowedStatuses])
        .select('id, character_id, status')

      if (error) {
        console.error('Error deleting loot submissions (bulk):', error)
        chunkError = true
        break
      }
      if (data) deletedRows.push(...data)
    }

    const count = deletedRows.length

    // Audit logging for bulk deletion (log one summary entry), with the
    // service role so the write cannot fail quietly (GH #352 D-03).
    if (count > 0) {
      await logAudit({
        supabase: serviceSupabase,
        guildId: guild_id,
        tableName: 'loot_submissions',
        recordId: guild_id, // Use guild_id as reference for bulk operation
        action: 'DELETE',
        userId: user.id,
        oldData: {
          bulk_delete: true,
          target,
          count,
          requested,
          submission_ids: deletedRows.map(r => r.id),
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
          count,
          requested,
          was_bulk: true,
        },
      })
    }

    revalidatePendingSubmissions(guild_id)

    if (chunkError) {
      return NextResponse.json({ error: 'Failed to delete loot submissions', count, requested }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      count,
      requested,
      message: `Deleted ${count} loot submission(s)`
    })
  } catch (error) {
    console.error('Error in loot submissions DELETE:', error)
    trackApiError('unknown', 'DELETE /api/loot-submissions/delete', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
