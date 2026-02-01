import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { NextResponse } from 'next/server'
import { verifyOfficerPermissions } from '@/utils/server-roles'

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
      const verification = await verifyOfficerPermissions(serviceSupabase, user.id, guild_id)
      if (!verification.hasPermission) {
        return NextResponse.json({ error: 'Only officers can delete loot lists' }, { status: 403 })
      }

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
    const verification = await verifyOfficerPermissions(serviceSupabase, user.id, guild_id)
    if (!verification.hasPermission) {
      return NextResponse.json({ error: 'Only officers can delete loot lists' }, { status: 403 })
    }

    // First, count how many submissions we're about to delete
    let countQuery = supabase
      .from('loot_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('guild_id', guild_id)

    if (target === 'pending') {
      countQuery = countQuery.eq('status', 'pending')
    }

    const { count: submissionCount } = await countQuery

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

    return NextResponse.json({
      success: true,
      count: submissionCount || 0,
      message: `Deleted ${submissionCount || 0} loot submission(s)`
    })
  } catch (error) {
    console.error('Error in loot submissions DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
