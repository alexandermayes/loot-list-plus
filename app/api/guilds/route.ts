import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { seedExpansionForGuild } from '@/app/services/expansionSeeder'

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
    const { name, realm, faction, discord_server_id, expansion } = body

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

    // Validate expansion
    if (!expansion || !['Classic', 'The Burning Crusade', 'Wrath of the Lich King', 'Cataclysm', 'Mists of Pandaria'].includes(expansion)) {
      return NextResponse.json(
        { error: 'Valid expansion is required' },
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
        require_discord_verification: false,
        active_expansion_id: null // Will be set after seeding expansion
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

    // Seed expansion and raid tiers using service role client (bypasses RLS)
    const serviceSupabase = createServiceRoleClient()
    const { expansionId, error: seedError } = await seedExpansionForGuild(
      serviceSupabase,
      guild.id,
      expansion,
      true, // setAsCurrent - set this expansion as the guild's current expansion
      true  // useServiceRole - use direct inserts instead of RPC (bypasses RLS)
    )

    if (seedError) {
      console.error('Error seeding expansion:', seedError)
      // Rollback: delete the guild since expansion seeding failed
      await supabase.from('guilds').delete().eq('id', guild.id)
      return NextResponse.json(
        { error: seedError },
        { status: 500 }
      )
    }

    // Set the active expansion for the guild (use service role to bypass RLS)
    const { error: updateError } = await serviceSupabase
      .from('guilds')
      .update({ active_expansion_id: expansionId })
      .eq('id', guild.id)

    if (updateError) {
      console.error('Error setting active expansion:', updateError)
      // Continue anyway - the expansion was created, just not set as active
    }

    // Auto-fetch Discord icon if server ID is provided
    if (discord_server_id) {
      try {
        const iconResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/discord/guild-icon?serverId=${discord_server_id}`)

        if (iconResponse.ok) {
          const iconData = await iconResponse.json()
          if (iconData.iconUrl) {
            // Update guild with icon URL using service role
            await serviceSupabase
              .from('guilds')
              .update({ icon_url: iconData.iconUrl })
              .eq('id', guild.id)
          }
        }
      } catch (iconError) {
        console.error('Failed to auto-fetch Discord icon:', iconError)
        // Non-critical, continue
      }
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

    // Create default guild roles
    const { error: rolesError } = await serviceSupabase
      .from('guild_roles')
      .insert([
        { guild_id: guild.id, name: 'Member', color_hex: '#a1a1a1', position: 0, is_default: true },
        { guild_id: guild.id, name: 'Officer', color_hex: '#fbbf24', position: 50, is_default: true },
        { guild_id: guild.id, name: 'Guild Master', color_hex: '#ff8000', position: 100, is_default: true }
      ])

    if (rolesError) {
      console.error('Error creating guild roles:', rolesError)
      // Continue anyway - roles can be created later via trigger or manually
    }

    // Get or create a character for the guild creator
    // First, check if user has any characters (use service role to bypass RLS)
    const { data: existingCharacters, error: checkError } = await serviceSupabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    console.log('[GUILD CREATE] Check existing characters:', { existingCharacters, checkError })

    let characterId: string

    if (existingCharacters && existingCharacters.length > 0) {
      // Use existing character
      characterId = existingCharacters[0].id
      console.log('[GUILD CREATE] Using existing character:', characterId)
    } else {
      // Create a default character for the user (use service role to bypass RLS)
      const characterName = user.user_metadata?.full_name || user.user_metadata?.name || 'Guild Master'
      console.log('[GUILD CREATE] Creating character with name:', characterName)

      const { data: newCharacter, error: charError } = await serviceSupabase
        .from('characters')
        .insert({
          user_id: user.id,
          name: characterName,
          realm: realm || null,
          is_main: true
        })
        .select('id')
        .single()

      console.log('[GUILD CREATE] Character creation result:', { newCharacter, charError })

      if (charError || !newCharacter) {
        console.error('[GUILD CREATE] Error creating character:', charError)
        // Clean up guild if character creation fails
        await serviceSupabase.from('guilds').delete().eq('id', guild.id)
        return NextResponse.json(
          { error: `Failed to create character: ${charError?.message || 'Unknown error'}` },
          { status: 500 }
        )
      }

      characterId = newCharacter.id
      console.log('[GUILD CREATE] Created character:', characterId)
    }

    // Create character guild membership for creator as Guild Master (use service role)
    console.log('[GUILD CREATE] Creating membership for character:', characterId, 'guild:', guild.id)
    const { error: memberError } = await serviceSupabase
      .from('character_guild_memberships')
      .insert({
        character_id: characterId,
        guild_id: guild.id,
        role: 'Guild Master',
        is_active: true,
        joined_at: new Date().toISOString(),
        joined_via: 'manual'
      })

    console.log('[GUILD CREATE] Membership creation result:', { memberError })

    if (memberError) {
      console.error('[GUILD CREATE] Error creating character guild membership:', memberError)
      // Clean up guild if membership creation fails
      await serviceSupabase.from('guilds').delete().eq('id', guild.id)
      return NextResponse.json(
        { error: `Failed to create guild membership: ${memberError.message}` },
        { status: 500 }
      )
    }

    // Set as active character and guild for user (use service role)
    console.log('[GUILD CREATE] Setting active character and guild')
    await serviceSupabase
      .from('user_active_characters')
      .upsert({
        user_id: user.id,
        active_character_id: characterId,
        active_guild_id: guild.id,
        updated_at: new Date().toISOString()
      })

    console.log('[GUILD CREATE] Guild creation complete!')

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

    // Get all characters for user
    const { data: characters, error: charError } = await supabase
      .from('characters')
      .select('id, name')
      .eq('user_id', user.id)

    if (charError) {
      console.error('Error fetching characters:', charError)
      return NextResponse.json(
        { error: 'Failed to fetch characters' },
        { status: 500 }
      )
    }

    if (!characters || characters.length === 0) {
      return NextResponse.json({ guilds: [] })
    }

    const characterIds = characters.map(c => c.id)

    // Get all guild memberships for user's characters
    const { data: memberships, error: memberError } = await supabase
      .from('character_guild_memberships')
      .select(`
        id,
        character_id,
        role,
        joined_at,
        character:characters!inner (
          id,
          name
        ),
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
      .in('character_id', characterIds)
      .eq('is_active', true)

    if (memberError) {
      console.error('Error fetching guilds:', memberError)
      return NextResponse.json(
        { error: 'Failed to fetch guilds' },
        { status: 500 }
      )
    }

    const guilds = memberships?.map((m: any) => ({
      membership_id: m.id,
      character_id: m.character_id,
      character_name: m.character?.name || 'Unknown',
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

// DELETE - Delete a guild
export async function DELETE(request: NextRequest) {
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

    // Validate required fields
    if (!guild_id) {
      return NextResponse.json(
        { error: 'Guild ID is required' },
        { status: 400 }
      )
    }

    // Delete guild using RPC (bypasses RLS and verifies creator)
    const { error: deleteError } = await supabase.rpc('delete_guild', {
      p_guild_id: guild_id
    })

    if (deleteError) {
      console.error('Error deleting guild:', deleteError)
      return NextResponse.json(
        { error: deleteError.message || 'Failed to delete guild' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Guild deleted successfully'
    })
  } catch (error) {
    console.error('Error in DELETE /api/guilds:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
