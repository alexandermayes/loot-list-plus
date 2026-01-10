import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// POST - Join guild via Discord verification
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { guild_id } = body

    if (!guild_id) {
      return NextResponse.json(
        { error: 'Guild ID is required' },
        { status: 400 }
      )
    }

    // Check if user has Discord verification
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('discord_verified, discord_id')
      .eq('user_id', user.id)
      .single()

    if (!preferences?.discord_verified || !preferences?.discord_id) {
      return NextResponse.json(
        { error: 'Discord verification required' },
        { status: 403 }
      )
    }

    // Get the guild details
    const { data: guild, error: guildError } = await supabase
      .from('guilds')
      .select('id, name, discord_server_id, is_active')
      .eq('id', guild_id)
      .single()

    if (guildError || !guild) {
      return NextResponse.json(
        { error: 'Guild not found' },
        { status: 404 }
      )
    }

    if (!guild.is_active) {
      return NextResponse.json(
        { error: 'Guild is not active' },
        { status: 400 }
      )
    }

    // Verify user is in the Discord server
    const discordGuilds = user.user_metadata?.guilds || []
    const isInDiscordServer = discordGuilds.some(
      (dg: any) => dg.id === guild.discord_server_id
    )

    if (!isInDiscordServer) {
      return NextResponse.json(
        { error: 'You must be a member of this guild\'s Discord server' },
        { status: 403 }
      )
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('guild_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('guild_id', guild_id)
      .single()

    if (existingMember) {
      return NextResponse.json(
        { error: 'You are already a member of this guild' },
        { status: 400 }
      )
    }

    // Create guild member entry
    const { error: memberError } = await supabase
      .from('guild_members')
      .insert({
        user_id: user.id,
        guild_id: guild_id,
        character_name: user.user_metadata?.full_name || user.user_metadata?.custom_claims?.global_name || 'Unknown',
        class_id: null, // Will be set later
        role: 'Member',
        is_active: true,
        joined_at: new Date().toISOString(),
        joined_via: 'discord_verify'
      })

    if (memberError) {
      console.error('Error creating guild member:', memberError)
      return NextResponse.json(
        { error: 'Failed to join guild' },
        { status: 500 }
      )
    }

    // Set as active guild for user
    const { error: activeGuildError } = await supabase
      .from('user_active_guilds')
      .upsert({
        user_id: user.id,
        active_guild_id: guild_id,
        updated_at: new Date().toISOString()
      })

    if (activeGuildError) {
      console.error('Error setting active guild:', activeGuildError)
      // Not critical, continue
    }

    return NextResponse.json({
      success: true,
      guild_id: guild_id,
      message: 'Successfully joined guild via Discord'
    })
  } catch (error) {
    console.error('Error in POST /api/discord-guilds/join:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
