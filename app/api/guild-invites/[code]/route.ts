import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// GET - Validate invite code and get guild info
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const supabase = await createClient()
    const { code } = await params

    if (!code) {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      )
    }

    // Get invite code details
    const { data: inviteCode, error: codeError } = await supabase
      .from('guild_invite_codes')
      .select(`
        id,
        code,
        guild_id,
        expires_at,
        max_uses,
        current_uses,
        is_active,
        guild:guilds (
          id,
          name,
          realm,
          faction
        )
      `)
      .eq('code', code)
      .single()

    if (codeError || !inviteCode) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 404 }
      )
    }

    // Check if code is active
    if (!inviteCode.is_active) {
      return NextResponse.json(
        { error: 'This invite code has been deactivated' },
        { status: 400 }
      )
    }

    // Check if code is expired
    if (inviteCode.expires_at && new Date(inviteCode.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This invite code has expired' },
        { status: 400 }
      )
    }

    // Check if code has reached max uses
    if (inviteCode.max_uses && inviteCode.current_uses >= inviteCode.max_uses) {
      return NextResponse.json(
        { error: 'This invite code has reached its maximum uses' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      guild: inviteCode.guild,
      expires_at: inviteCode.expires_at,
      uses_remaining: inviteCode.max_uses
        ? inviteCode.max_uses - inviteCode.current_uses
        : null
    })
  } catch (error) {
    console.error('Error in GET /api/guild-invites/[code]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Redeem invite code (join guild)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const supabase = await createClient()
    const { code } = await params

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!code) {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      )
    }

    // Get invite code details
    const { data: inviteCode, error: codeError } = await supabase
      .from('guild_invite_codes')
      .select('*')
      .eq('code', code)
      .single()

    if (codeError || !inviteCode) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 404 }
      )
    }

    // Validate code (same checks as GET)
    if (!inviteCode.is_active) {
      return NextResponse.json(
        { error: 'This invite code has been deactivated' },
        { status: 400 }
      )
    }

    if (inviteCode.expires_at && new Date(inviteCode.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This invite code has expired' },
        { status: 400 }
      )
    }

    if (inviteCode.max_uses && inviteCode.current_uses >= inviteCode.max_uses) {
      return NextResponse.json(
        { error: 'This invite code has reached its maximum uses' },
        { status: 400 }
      )
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('guild_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('guild_id', inviteCode.guild_id)
      .single()

    if (existingMember) {
      return NextResponse.json(
        { error: 'You are already a member of this guild' },
        { status: 400 }
      )
    }

    // Create guild member entry (for backward compatibility)
    const { error: memberError } = await supabase
      .from('guild_members')
      .insert({
        user_id: user.id,
        guild_id: inviteCode.guild_id,
        character_name: user.user_metadata?.full_name || 'Unknown',
        class_id: null, // Will be set later
        role: 'Member',
        is_active: true,
        joined_at: new Date().toISOString(),
        joined_via: 'invite_code',
        invite_code_id: inviteCode.id
      })

    if (memberError) {
      console.error('Error creating guild member:', memberError)
      return NextResponse.json(
        { error: 'Failed to join guild' },
        { status: 500 }
      )
    }

    // Check if user has an active character and create character_guild_membership
    const { data: activeCharData } = await supabase
      .from('user_active_characters')
      .select('active_character_id')
      .eq('user_id', user.id)
      .single()

    if (activeCharData?.active_character_id) {
      // Create character guild membership for active character
      const { error: charMemberError } = await supabase
        .from('character_guild_memberships')
        .insert({
          character_id: activeCharData.active_character_id,
          guild_id: inviteCode.guild_id,
          role: 'Member',
          is_active: true,
          joined_at: new Date().toISOString(),
          joined_via: 'invite_code'
        })

      if (charMemberError) {
        console.error('Error creating character guild membership:', charMemberError)
        // Not critical, continue
      }
    }

    // Increment current_uses
    const { error: updateError } = await supabase
      .from('guild_invite_codes')
      .update({ current_uses: inviteCode.current_uses + 1 })
      .eq('id', inviteCode.id)

    if (updateError) {
      console.error('Error updating invite code uses:', updateError)
      // Not critical, continue
    }

    // Set as active guild for user
    const { error: activeGuildError } = await supabase
      .from('user_active_guilds')
      .upsert({
        user_id: user.id,
        active_guild_id: inviteCode.guild_id,
        updated_at: new Date().toISOString()
      })

    if (activeGuildError) {
      console.error('Error setting active guild:', activeGuildError)
      // Not critical, continue
    }

    return NextResponse.json({
      success: true,
      guild_id: inviteCode.guild_id,
      message: 'Successfully joined guild'
    })
  } catch (error) {
    console.error('Error in POST /api/guild-invites/[code]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
