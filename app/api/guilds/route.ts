import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { seedExpansionForGuild } from '@/app/services/expansionSeeder'
import { getCached, invalidateCache, cacheKeys } from '@/utils/cache'
import { trackApiError, trackEvent } from '@/utils/analytics/server'

// POST - Create a new guild
export async function POST(request: NextRequest) {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Check if user has Discord verified
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('discord_verified')
      .eq('user_id', user.id)
      .maybeSingle()

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
        { error: 'Couldn\'t set up the expansion. Try again.' },
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

    // Auto-fetch Discord icon directly from Discord API
    if (discord_server_id && process.env.DISCORD_BOT_TOKEN) {
      try {
        const discordResponse = await fetch(`https://discord.com/api/v10/guilds/${encodeURIComponent(discord_server_id)}`, {
          headers: { 'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}` }
        })

        if (discordResponse.ok) {
          const guildData = await discordResponse.json()
          if (guildData.icon) {
            const extension = guildData.icon.startsWith('a_') ? 'gif' : 'png'
            const iconUrl = `https://cdn.discordapp.com/icons/${discord_server_id}/${guildData.icon}.${extension}?size=256`
            await serviceSupabase
              .from('guilds')
              .update({ icon_url: iconUrl })
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

    // Check if user has a properly configured character (with class set)
    const { data: existingCharacters } = await serviceSupabase
      .from('characters')
      .select('id, class_id')
      .eq('user_id', user.id)
      .not('class_id', 'is', null)
      .order('is_main', { ascending: false })
      .limit(1)

    let characterId: string | null = null
    let needsCharacterCreation = false

    if (existingCharacters && existingCharacters.length > 0) {
      // Use existing properly configured character
      characterId = existingCharacters[0].id

      // Create character guild membership for creator as Guild Master
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

      if (memberError) {
        console.error('[GUILD CREATE] Error creating character guild membership:', memberError)
        await serviceSupabase.from('guilds').delete().eq('id', guild.id)
        return NextResponse.json(
          { error: 'Couldn\'t create guild membership. Try again.' },
          { status: 500 }
        )
      }

    } else {
      // No valid character - user will be prompted to create one
      // Guild Master role will be assigned when character is created (CreateCharacterModal checks created_by)
      needsCharacterCreation = true
    }

    // Set as active character and guild for user
    await serviceSupabase
      .from('user_active_characters')
      .upsert({
        user_id: user.id,
        active_character_id: characterId,
        active_guild_id: guild.id,
        updated_at: new Date().toISOString()
      })

    // Invalidate guilds cache after creating
    await invalidateCache(cacheKeys.userGuilds(user.id))

    trackEvent({ event: 'guild_created', userId: user.id, properties: { guild_id: guild.id, guild_name: guild.name } })

    return NextResponse.json({
      success: true,
      needs_character_creation: needsCharacterCreation,
      guild: {
        id: guild.id,
        name: guild.name,
        realm: guild.realm,
        faction: guild.faction
      }
    })
  } catch (error) {
    console.error('Error in POST /api/guilds:', error)
    trackApiError('unknown', 'POST /api/guilds', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - List user's guilds
// Optimized: Fast auth (getSession), single query using inner join, Redis caching (60s TTL)
export async function GET(request: NextRequest) {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Use cached data if available (30 second TTL)
    const guilds = await getCached(
      cacheKeys.userGuilds(user.id),
      async () => {
        const { data: memberships, error: memberError } = await supabase
          .from('character_guild_memberships')
          .select(`
            id,
            character_id,
            role,
            joined_at,
            character:characters!inner (
              id,
              name,
              user_id
            ),
            guild:guilds (
              id,
              name,
              realm,
              faction,
              discord_server_id,
              icon_url,
              created_by,
              is_active
            )
          `)
          .eq('character.user_id', user.id)
          .eq('is_active', true)

        if (memberError) {
          throw memberError
        }

        interface MembershipRow {
          id: string
          character_id: string
          role: string
          joined_at: string
          character: { id: string; name: string; user_id: string } | null
          guild: {
            id: string
            name: string
            realm: string | null
            faction: string
            discord_server_id: string | null
            icon_url: string | null
            created_by: string
            is_active: boolean
          } | null
        }

        return (memberships as unknown as MembershipRow[] | null)?.map((m) => ({
          membership_id: m.id,
          character_id: m.character_id,
          character_name: m.character?.name || 'Unknown',
          role: m.role,
          joined_at: m.joined_at,
          guild: m.guild
        })) || []
      },
      60 // 60 second cache
    )

    return NextResponse.json({ guilds })
  } catch (error) {
    console.error('Error in GET /api/guilds:', error)
    trackApiError('unknown', 'GET /api/guilds', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a guild
export async function DELETE(request: NextRequest) {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

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
        { error: 'Couldn\'t delete guild. Try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Guild deleted successfully'
    })
  } catch (error) {
    console.error('Error in DELETE /api/guilds:', error)
    trackApiError('unknown', 'DELETE /api/guilds', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
