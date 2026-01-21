import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

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

    // Use service role client to bypass RLS for character operations
    const serviceSupabase = createServiceRoleClient()

    // Get the guild details for realm
    const { data: guildData } = await supabase
      .from('guilds')
      .select('realm')
      .eq('id', inviteCode.guild_id)
      .single()

    // Get or create a character for the user
    const { data: existingCharacters } = await serviceSupabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    let characterId: string

    if (existingCharacters && existingCharacters.length > 0) {
      // Use existing character
      characterId = existingCharacters[0].id
      console.log('[INVITE JOIN] Using existing character:', characterId)
    } else {
      // Create a default character for the user
      const characterName = user.user_metadata?.full_name || user.user_metadata?.name || 'Guild Member'
      console.log('[INVITE JOIN] Creating character with name:', characterName)

      const { data: newCharacter, error: charError } = await serviceSupabase
        .from('characters')
        .insert({
          user_id: user.id,
          name: characterName,
          realm: guildData?.realm || null,
          is_main: true
        })
        .select('id')
        .single()

      if (charError || !newCharacter) {
        console.error('[INVITE JOIN] Error creating character:', charError)
        return NextResponse.json(
          { error: `Failed to create character: ${charError?.message || 'Unknown error'}` },
          { status: 500 }
        )
      }

      characterId = newCharacter.id
      console.log('[INVITE JOIN] Created character:', characterId)
    }

    // Check if character is already a member of this guild
    const { data: existingMembership } = await serviceSupabase
      .from('character_guild_memberships')
      .select('id')
      .eq('character_id', characterId)
      .eq('guild_id', inviteCode.guild_id)
      .single()

    if (existingMembership) {
      return NextResponse.json(
        { error: 'You are already a member of this guild' },
        { status: 400 }
      )
    }

    // Create character guild membership
    console.log('[INVITE JOIN] Creating membership for character:', characterId, 'guild:', inviteCode.guild_id)
    const { error: memberError } = await serviceSupabase
      .from('character_guild_memberships')
      .insert({
        character_id: characterId,
        guild_id: inviteCode.guild_id,
        role: 'Member',
        is_active: true,
        joined_at: new Date().toISOString(),
        joined_via: 'invite_code'
      })

    if (memberError) {
      console.error('[INVITE JOIN] Error creating character guild membership:', memberError)
      return NextResponse.json(
        { error: `Failed to join guild: ${memberError.message}` },
        { status: 500 }
      )
    }

    // Set as active character and guild for user
    console.log('[INVITE JOIN] Setting active character and guild')
    await serviceSupabase
      .from('user_active_characters')
      .upsert({
        user_id: user.id,
        active_character_id: characterId,
        active_guild_id: inviteCode.guild_id,
        updated_at: new Date().toISOString()
      })

    // Increment current_uses
    const { error: updateError } = await supabase
      .from('guild_invite_codes')
      .update({ current_uses: inviteCode.current_uses + 1 })
      .eq('id', inviteCode.id)

    if (updateError) {
      console.error('Error updating invite code uses:', updateError)
      // Not critical, continue
    }

    console.log('[INVITE JOIN] Guild join complete!')

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
