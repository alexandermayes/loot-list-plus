import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// PATCH - Update guild member (role, etc)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const supabase = await createClient()
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

    if (!role || !['Officer', 'Member'].includes(role)) {
      return NextResponse.json(
        { error: 'Valid role is required (Officer or Member)' },
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

    // Check if requesting user is an officer of the same guild
    const { data: requestingMember } = await supabase
      .from('guild_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('guild_id', targetMember.guild_id)
      .single()

    if (!requestingMember || requestingMember.role !== 'Officer') {
      return NextResponse.json(
        { error: 'Only officers can change member roles' },
        { status: 403 }
      )
    }

    // Update the member's role
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

// DELETE - Remove guild member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const supabase = await createClient()
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

    // Check if requesting user is an officer of the same guild
    const { data: requestingMember } = await supabase
      .from('guild_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('guild_id', targetMember.guild_id)
      .single()

    if (!requestingMember || requestingMember.role !== 'Officer') {
      return NextResponse.json(
        { error: 'Only officers can remove members' },
        { status: 403 }
      )
    }

    // Check if this is the last officer (prevent removing last officer)
    if (targetMember.role === 'Officer') {
      const { data: officers } = await supabase
        .from('guild_members')
        .select('id')
        .eq('guild_id', targetMember.guild_id)
        .eq('role', 'Officer')

      if (officers && officers.length === 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last officer. Promote another member first.' },
          { status: 400 }
        )
      }
    }

    // Delete the member
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
