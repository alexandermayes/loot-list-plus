import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'

// PATCH - Update guild member (role, etc) - LEGACY ENDPOINT for guild_members table
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceRoleClient()
    const { memberId } = await params

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { role } = body

    if (!role) {
      return NextResponse.json(
        { error: 'Role is required' },
        { status: 400 }
      )
    }

    // Get the member being updated to find their guild
    const { data: targetMember, error: targetError } = await supabase
      .from('guild_members')
      .select('guild_id, role')
      .eq('id', memberId)
      .single()

    if (targetError || !targetMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Verify user has officer permissions (position >= 50)
    const verification = await verifyOfficerPermissions(serviceSupabase, user.id, targetMember.guild_id)
    if (!verification.hasPermission) {
      return NextResponse.json(
        { error: 'Only officers can change member roles' },
        { status: 403 }
      )
    }

    // Update the member's role (RLS policies allow officers to update members)
    const { error: updateError } = await supabase
      .from('guild_members')
      .update({ role })
      .eq('id', memberId)

    if (updateError) {
      console.error('Error updating member role:', updateError)
      return NextResponse.json(
        { error: 'Failed to update member role' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Role updated to ${role}`
    })
  } catch (error) {
    console.error('Error in PATCH /api/guild-members/[memberId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove guild member - LEGACY ENDPOINT for guild_members table
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceRoleClient()
    const { memberId } = await params

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      )
    }

    // Get the member being removed to find their guild
    const { data: targetMember, error: targetError } = await supabase
      .from('guild_members')
      .select('guild_id, user_id, role')
      .eq('id', memberId)
      .single()

    if (targetError || !targetMember) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Verify user has officer permissions (position >= 50)
    const verification = await verifyOfficerPermissions(serviceSupabase, user.id, targetMember.guild_id)
    if (!verification.hasPermission) {
      return NextResponse.json(
        { error: 'Only officers can remove members' },
        { status: 403 }
      )
    }

    // Check if this is the last officer (prevent removing last officer)
    // Get guild roles to check positions
    const { data: guildRoles } = await serviceSupabase
      .from('guild_roles')
      .select('name, position')
      .eq('guild_id', targetMember.guild_id)

    const rolePositionMap = new Map<string, number>()
    if (guildRoles && guildRoles.length > 0) {
      guildRoles.forEach((r: any) => rolePositionMap.set(r.name, r.position))
    } else {
      rolePositionMap.set('Guild Master', 100)
      rolePositionMap.set('Officer', 50)
      rolePositionMap.set('Member', 0)
    }

    const targetPosition = rolePositionMap.get(targetMember.role) || 0
    if (targetPosition >= 50) {
      // Target is an officer, check if they're the last one
      const { data: officers } = await supabase
        .from('guild_members')
        .select('id, role')
        .eq('guild_id', targetMember.guild_id)

      // Count officers by position
      const officerCount = (officers || []).filter(o => (rolePositionMap.get(o.role) || 0) >= 50).length

      if (officerCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last officer. Promote another member first.' },
          { status: 400 }
        )
      }
    }

    // Delete the member (RLS policies allow officers to delete members)
    const { error: deleteError } = await supabase
      .from('guild_members')
      .delete()
      .eq('id', memberId)

    if (deleteError) {
      console.error('Error deleting member:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove member' },
        { status: 500 }
      )
    }

    // Clean up their active guild if this was their active guild
    await supabase
      .from('user_active_guilds')
      .delete()
      .eq('user_id', targetMember.user_id)
      .eq('active_guild_id', targetMember.guild_id)

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully'
    })
  } catch (error) {
    console.error('Error in DELETE /api/guild-members/[memberId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
