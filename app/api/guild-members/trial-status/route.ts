import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'

/**
 * PUT /api/guild-members/trial-status
 *
 * Toggle a member's trial status (trial <-> full)
 *
 * Body:
 * - guild_id: string - The guild ID
 * - target_user_id: string - The user ID to update
 * - character_ids: string[] - Character IDs to update
 * - new_status: 'trial' | 'full' - The new membership status
 */
export async function PUT(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceSupabase = createServiceRoleClient()

    const body = await request.json()
    const { guild_id, target_user_id, character_ids, new_status } = body

    if (!guild_id || !target_user_id || !character_ids || !new_status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['trial', 'full'].includes(new_status)) {
      return NextResponse.json({ error: 'Invalid status. Must be "trial" or "full"' }, { status: 400 })
    }

    // Verify user has officer permissions
    const verification = await verifyPermission(serviceSupabase, user.id, guild_id, 'manage_members')
    if (!verification.hasPermission) {
      return NextResponse.json({ error: verification.error }, { status: 403 })
    }

    // Prepare update data
    const updateData: {
      membership_status: string
      trial_started_at: string | null
      promoted_at: string | null
    } = {
      membership_status: new_status,
      trial_started_at: null,
      promoted_at: null
    }

    if (new_status === 'trial') {
      updateData.trial_started_at = new Date().toISOString()
      updateData.promoted_at = null
    } else {
      updateData.promoted_at = new Date().toISOString()
    }

    // Update character_guild_memberships
    const { error: updateError } = await serviceSupabase
      .from('character_guild_memberships')
      .update(updateData)
      .eq('guild_id', guild_id)
      .in('character_id', character_ids)

    if (updateError) {
      console.error('Error updating trial status:', updateError)
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PUT /api/guild-members/trial-status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
