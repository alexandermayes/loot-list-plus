import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

/**
 * POST /api/user/delete-account
 * Permanently delete a user's account and all associated data
 *
 * This will delete:
 * - All characters
 * - All guild memberships
 * - All loot submissions
 * - All attendance records
 * - All loot history
 * - User preferences
 * - The auth user account
 *
 * Users who own guilds must delete or transfer their guilds first.
 */
export async function POST() {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id

    // Use service role to bypass RLS for deletion
    const serviceClient = createServiceRoleClient()

    // Check if user owns any guilds
    const { data: ownedGuilds, error: guildsError } = await serviceClient
      .from('guilds')
      .select('id, name')
      .eq('created_by', userId)

    if (guildsError) {
      console.error('Error checking owned guilds:', guildsError)
      return NextResponse.json(
        { error: 'Failed to verify account status' },
        { status: 500 }
      )
    }

    if (ownedGuilds && ownedGuilds.length > 0) {
      const guildNames = ownedGuilds.map(g => g.name).join(', ')
      return NextResponse.json(
        {
          error: 'Cannot delete account while owning guilds',
          message: `You must delete or transfer ownership of the following guilds before deleting your account: ${guildNames}`,
          owned_guilds: ownedGuilds
        },
        { status: 400 }
      )
    }

    // Get all character IDs for this user
    const { data: characters, error: charsError } = await serviceClient
      .from('characters')
      .select('id')
      .eq('user_id', userId)

    if (charsError) {
      console.error('Error fetching characters:', charsError)
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      )
    }

    const characterIds = characters?.map(c => c.id) || []

    // Delete data in order (respecting foreign key constraints)
    // Note: Some tables may have ON DELETE CASCADE, but we explicitly delete for safety

    // 1. Delete user_active_characters
    const { error: activeCharError } = await serviceClient
      .from('user_active_characters')
      .delete()
      .eq('user_id', userId)

    if (activeCharError) {
      console.error('Error deleting user_active_characters:', activeCharError)
    }

    // 2. Delete guild invite codes created by user
    const { error: inviteCodesError } = await serviceClient
      .from('guild_invite_codes')
      .delete()
      .eq('created_by', userId)

    if (inviteCodesError) {
      console.error('Error deleting guild_invite_codes:', inviteCodesError)
    }

    if (characterIds.length > 0) {
      // 3. Delete attendance records for user's characters
      const { error: attendanceError } = await serviceClient
        .from('attendance_records')
        .delete()
        .in('character_id', characterIds)

      if (attendanceError) {
        console.error('Error deleting attendance_records:', attendanceError)
      }

      // 4. Delete loot submission items (if table exists)
      const { error: submissionItemsError } = await serviceClient
        .from('loot_submission_items')
        .delete()
        .in('character_id', characterIds)

      if (submissionItemsError && !submissionItemsError.message.includes('does not exist')) {
        console.error('Error deleting loot_submission_items:', submissionItemsError)
      }

      // 5. Delete loot submissions for user's characters
      const { error: submissionsError } = await serviceClient
        .from('loot_submissions')
        .delete()
        .in('character_id', characterIds)

      if (submissionsError) {
        console.error('Error deleting loot_submissions:', submissionsError)
      }

      // 6. Delete loot history for user's characters
      const { error: historyError } = await serviceClient
        .from('loot_history')
        .delete()
        .in('character_id', characterIds)

      if (historyError) {
        console.error('Error deleting loot_history:', historyError)
      }

      // 7. Delete character guild memberships
      const { error: membershipsError } = await serviceClient
        .from('character_guild_memberships')
        .delete()
        .in('character_id', characterIds)

      if (membershipsError) {
        console.error('Error deleting character_guild_memberships:', membershipsError)
      }

      // 8. Delete characters
      const { error: deleteCharsError } = await serviceClient
        .from('characters')
        .delete()
        .eq('user_id', userId)

      if (deleteCharsError) {
        console.error('Error deleting characters:', deleteCharsError)
        return NextResponse.json(
          { error: 'Failed to delete characters' },
          { status: 500 }
        )
      }
    }

    // 9. (guild_members cleanup handled by trigger from character_guild_memberships delete)

    // 10. Delete user preferences
    const { error: prefsError } = await serviceClient
      .from('user_preferences')
      .delete()
      .eq('user_id', userId)

    if (prefsError) {
      console.error('Error deleting user_preferences:', prefsError)
    }

    // 11. Delete the auth user using admin API
    const { error: deleteUserError } = await serviceClient.auth.admin.deleteUser(userId)

    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError)
      return NextResponse.json(
        { error: 'Failed to delete user account' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    })
  } catch (error) {
    console.error('Error in POST /api/user/delete-account:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
