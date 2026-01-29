import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { isGuildCreator, getGuildRoles, getRolePositionFromRoles } from '@/utils/server-roles'
import { ROLE_POSITIONS } from '@/utils/roles'

// POST - Transfer guild ownership to another member
// Only the current guild owner can transfer ownership
export async function POST(request: NextRequest) {
  try {
    // Fast auth check
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceSupabase = createServiceRoleClient()

    const body = await request.json()
    const { guild_id, new_owner_user_id } = body

    if (!guild_id || !new_owner_user_id) {
      return NextResponse.json({ error: 'guild_id and new_owner_user_id are required' }, { status: 400 })
    }

    // Verify current user is the guild creator
    const isCreator = await isGuildCreator(serviceSupabase, user.id, guild_id)
    if (!isCreator) {
      return NextResponse.json({ error: 'Only the guild owner can transfer ownership' }, { status: 403 })
    }

    // Cannot transfer to yourself
    if (new_owner_user_id === user.id) {
      return NextResponse.json({ error: 'Cannot transfer ownership to yourself' }, { status: 400 })
    }

    // Verify new owner is a member of the guild
    const { data: newOwnerCharacters } = await serviceSupabase
      .from('characters')
      .select('id')
      .eq('user_id', new_owner_user_id)

    if (!newOwnerCharacters || newOwnerCharacters.length === 0) {
      return NextResponse.json({ error: 'New owner has no characters' }, { status: 400 })
    }

    const newOwnerCharacterIds = newOwnerCharacters.map(c => c.id)

    const { data: newOwnerMembership } = await serviceSupabase
      .from('character_guild_memberships')
      .select('id, character_id, role')
      .eq('guild_id', guild_id)
      .in('character_id', newOwnerCharacterIds)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (!newOwnerMembership) {
      return NextResponse.json({ error: 'New owner is not a member of this guild' }, { status: 400 })
    }

    // Get current owner's characters in the guild
    const { data: currentOwnerCharacters } = await serviceSupabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)

    const currentOwnerCharacterIds = currentOwnerCharacters?.map(c => c.id) || []

    // Get guild roles for the Guild Master role name
    const roles = await getGuildRoles(serviceSupabase, guild_id)
    const guildMasterRole = roles.find(r => r.position >= ROLE_POSITIONS.GUILD_MASTER)
    const guildMasterRoleName = guildMasterRole?.name || 'Guild Master'

    // Start the transfer - use a transaction-like approach
    // 1. Update guild.created_by to new owner
    const { error: updateGuildError } = await serviceSupabase
      .from('guilds')
      .update({ created_by: new_owner_user_id })
      .eq('id', guild_id)

    if (updateGuildError) {
      console.error('Error updating guild creator:', updateGuildError)
      return NextResponse.json({ error: 'Failed to transfer ownership' }, { status: 500 })
    }

    // 2. Promote new owner to Guild Master role
    const { error: promoteError } = await serviceSupabase
      .from('character_guild_memberships')
      .update({ role: guildMasterRoleName })
      .eq('guild_id', guild_id)
      .in('character_id', newOwnerCharacterIds)
      .eq('is_active', true)

    if (promoteError) {
      console.error('Error promoting new owner:', promoteError)
      // Try to rollback guild.created_by
      await serviceSupabase
        .from('guilds')
        .update({ created_by: user.id })
        .eq('id', guild_id)
      return NextResponse.json({ error: 'Failed to promote new owner' }, { status: 500 })
    }

    // 3. Demote old owner to Officer (if they have characters in guild)
    if (currentOwnerCharacterIds.length > 0) {
      const officerRole = roles.find(r => r.position >= ROLE_POSITIONS.OFFICER && r.position < ROLE_POSITIONS.GUILD_MASTER)
      const officerRoleName = officerRole?.name || 'Officer'

      await serviceSupabase
        .from('character_guild_memberships')
        .update({ role: officerRoleName })
        .eq('guild_id', guild_id)
        .in('character_id', currentOwnerCharacterIds)
        .eq('is_active', true)
    }

    // Also update guild_members table for backwards compatibility
    await serviceSupabase
      .from('guild_members')
      .update({ role: guildMasterRoleName })
      .eq('guild_id', guild_id)
      .eq('user_id', new_owner_user_id)

    if (currentOwnerCharacterIds.length > 0) {
      const officerRole = roles.find(r => r.position >= ROLE_POSITIONS.OFFICER && r.position < ROLE_POSITIONS.GUILD_MASTER)
      const officerRoleName = officerRole?.name || 'Officer'

      await serviceSupabase
        .from('guild_members')
        .update({ role: officerRoleName })
        .eq('guild_id', guild_id)
        .eq('user_id', user.id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/guilds/transfer-ownership:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
