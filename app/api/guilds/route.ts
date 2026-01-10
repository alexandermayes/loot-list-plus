import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// POST - Create a new guild
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has Discord verified
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('discord_verified')
      .eq('user_id', user.id)
      .single()

    if (!prefs?.discord_verified) {
      return NextResponse.json(
        { error: 'Discord verification required to create a guild' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { name, realm, faction, discord_server_id } = body

    // Validate required fields
    if (!name || !faction) {
      return NextResponse.json(
        { error: 'Guild name and faction are required' },
        { status: 400 }
      )
    }

    // Validate faction
    if (!['Alliance', 'Horde'].includes(faction)) {
      return NextResponse.json(
        { error: 'Faction must be Alliance or Horde' },
        { status: 400 }
      )
    }

    // Create guild
    const { data: guild, error: guildError } = await supabase
      .from('guilds')
      .insert({
        name,
        realm: realm || null,
        faction,
        discord_server_id: discord_server_id || null,
        created_by: user.id,
        is_active: true,
        require_discord_verification: false
      })
      .select()
      .single()

    if (guildError) {
      console.error('Error creating guild:', guildError)
      return NextResponse.json(
        { error: 'Failed to create guild' },
        { status: 500 }
      )
    }

    // Create default guild settings
    const { error: settingsError } = await supabase
      .from('guild_settings')
      .insert({
        guild_id: guild.id,
        attendance_type: 'linear',
        rolling_attendance_weeks: 8,
        use_signups: false,
        signup_weight: 0,
        see_item_bonus: false,
        see_item_bonus_value: 0,
        pass_item_bonus: false,
        pass_item_bonus_value: 0
      })

    if (settingsError) {
      console.error('Error creating guild settings:', settingsError)
      // Continue anyway - settings can be created later
    }

    // Create guild member entry for creator as Officer
    const { error: memberError } = await supabase
      .from('guild_members')
      .insert({
        user_id: user.id,
        guild_id: guild.id,
        character_name: user.user_metadata?.full_name || 'Unknown',
        class_id: null, // Will be set later
        role: 'Officer',
        is_active: true,
        joined_at: new Date().toISOString(),
        joined_via: 'manual'
      })

    if (memberError) {
      console.error('Error creating guild member:', memberError)
      // Clean up guild if member creation fails
      await supabase.from('guilds').delete().eq('id', guild.id)
      return NextResponse.json(
        { error: 'Failed to create guild membership' },
        { status: 500 }
      )
    }

    // Set as active guild for user
    const { error: activeGuildError } = await supabase
      .from('user_active_guilds')
      .upsert({
        user_id: user.id,
        active_guild_id: guild.id,
        updated_at: new Date().toISOString()
      })

    if (activeGuildError) {
      console.error('Error setting active guild:', activeGuildError)
      // Not critical, continue
    }

    return NextResponse.json({
      success: true,
      guild: {
        id: guild.id,
        name: guild.name,
        realm: guild.realm,
        faction: guild.faction
      }
    })
  } catch (error) {
    console.error('Error in POST /api/guilds:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - List user's guilds
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all guild memberships for user
    const { data: memberships, error: memberError } = await supabase
      .from('guild_members')
      .select(`
        id,
        character_name,
        role,
        joined_at,
        guild:guilds (
          id,
          name,
          realm,
          faction,
          discord_server_id,
          created_by,
          is_active
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (memberError) {
      console.error('Error fetching guilds:', memberError)
      return NextResponse.json(
        { error: 'Failed to fetch guilds' },
        { status: 500 }
      )
    }

    const guilds = memberships?.map(m => ({
      membership_id: m.id,
      character_name: m.character_name,
      role: m.role,
      joined_at: m.joined_at,
      guild: m.guild
    })) || []

    return NextResponse.json({ guilds })
  } catch (error) {
    console.error('Error in GET /api/guilds:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
