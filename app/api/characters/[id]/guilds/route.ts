import { NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getDefaultRoleName } from '@/domain/guild/default-role'
import { resolveGuildJoinAccess, consumeGuildJoinGrant } from '@/domain/guild/join-grants'

/**
 * GET /api/characters/[id]/guilds
 * Get all guilds for a specific character
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const { id } = await params

    // Verify character belongs to user
    const { data: character } = await supabase
      .from('characters')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found or unauthorized' },
        { status: 404 }
      )
    }

    // Fetch character's guild memberships
    const { data: memberships, error } = await supabase
      .from('character_guild_memberships')
      .select(`
        id,
        role,
        is_active,
        joined_at,
        joined_via,
        guild:guilds(
          id,
          name,
          icon_url,
          discord_server_id
        )
      `)
      .eq('character_id', id)
      .eq('is_active', true)
      .order('joined_at', { ascending: false })

    if (error) {
      console.error('Error fetching character guilds:', error)
      return NextResponse.json(
        { error: 'Failed to fetch character guilds' },
        { status: 500 }
      )
    }

    return NextResponse.json({ memberships })
  } catch (error) {
    console.error('Error in GET /api/characters/[id]/guilds:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/characters/[id]/guilds
 * Add a character to a guild.
 *
 * A character is added (or its inactive membership reactivated) only for the
 * guild's creator, a user with another active character in the guild, or a
 * user with a join the server recorded (an invite or Discord join made before
 * they had a character). Anyone else gets 403. A join record is used up by
 * the membership write it allows.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const { id } = await params

    // Verify character belongs to user
    const { data: character } = await supabase
      .from('characters')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found or unauthorized' },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { guild_id, joined_via = 'manual' } = body

    if (!guild_id) {
      return NextResponse.json(
        { error: 'Guild ID is required' },
        { status: 400 }
      )
    }

    // Character ownership is verified above, so all subsequent writes use the
    // service role client to avoid RLS blocking non-officer users from adding
    // their own characters to a guild they're joining.
    const serviceSupabase = createServiceRoleClient()

    // Determine role server-side: guild creator gets Guild Master, everyone else gets Member
    const { data: guildData } = await serviceSupabase
      .from('guilds')
      .select('created_by')
      .eq('id', guild_id)
      .single()

    const defaultRole = await getDefaultRoleName(guild_id)
    const role = guildData?.created_by === user.id ? 'Guild Master' : defaultRole

    // Check if membership already exists
    const { data: existingMembership } = await serviceSupabase
      .from('character_guild_memberships')
      .select('id, is_active')
      .eq('character_id', id)
      .eq('guild_id', guild_id)
      .maybeSingle()

    if (existingMembership?.is_active) {
      return NextResponse.json(
        { error: 'Character is already a member of this guild' },
        { status: 409 }
      )
    }

    // Only the creator, an existing member (alts) or a user with a recorded
    // join may add a character. A lookup error throws and falls through to
    // the 500 below with no write.
    const access = await resolveGuildJoinAccess(serviceSupabase, {
      userId: user.id,
      guildId: guild_id,
      excludeCharacterId: id,
    })
    if (!access.allowed) {
      return NextResponse.json(
        { error: 'You are not a member of this guild' },
        { status: 403 }
      )
    }

    // A member added through a join record starts as trial when the guild
    // starts new members as trial, as the invite and Discord joins do.
    let trialFields: { membership_status?: 'trial'; trial_started_at?: string } = {}
    if (access.via === 'grant') {
      const { data: joinSettings } = await serviceSupabase
        .from('guild_settings')
        .select('new_members_start_as_trial')
        .eq('guild_id', guild_id)
        .maybeSingle()
      if (joinSettings?.new_members_start_as_trial === true) {
        trialFields = { membership_status: 'trial', trial_started_at: new Date().toISOString() }
      }
    }

    if (existingMembership) {
      // Reactivate membership. Reactivation assigns the same role a new
      // membership gets, as the invite and Discord join routes do.
      const { data: membership, error } = await serviceSupabase
        .from('character_guild_memberships')
        .update({ is_active: true, role, ...trialFields })
        .eq('id', existingMembership.id)
        .select(`
          id,
          role,
          is_active,
          joined_at,
          joined_via,
          guild:guilds(
            id,
            name,
            icon_url
          )
        `)
        .single()

      if (error) {
        console.error('Error reactivating membership:', error)
        return NextResponse.json(
          { error: 'Failed to reactivate guild membership' },
          { status: 500 }
        )
      }

      await consumeGuildJoinGrant(serviceSupabase, { userId: user.id, guildId: guild_id })

      return NextResponse.json({ membership }, { status: 200 })
    }

    // Create new character membership
    const { data: membership, error } = await serviceSupabase
      .from('character_guild_memberships')
      .insert({
        character_id: id,
        guild_id,
        role,
        joined_via,
        ...trialFields,
      })
      .select(`
        id,
        role,
        is_active,
        joined_at,
        joined_via,
        guild:guilds(
          id,
          name,
          icon_url
        )
      `)
      .single()

    if (error) {
      console.error('Error creating guild membership:', error)
      return NextResponse.json(
        { error: 'Failed to add character to guild' },
        { status: 500 }
      )
    }

    await consumeGuildJoinGrant(serviceSupabase, { userId: user.id, guildId: guild_id })

    return NextResponse.json({ membership }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/characters/[id]/guilds:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/characters/[id]/guilds
 * Remove a character from a guild
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const { id } = await params

    // Parse request body
    const body = await request.json()
    const { guild_id } = body

    if (!guild_id) {
      return NextResponse.json(
        { error: 'Guild ID is required' },
        { status: 400 }
      )
    }

    // Verify character belongs to user
    const { data: character } = await supabase
      .from('characters')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found or unauthorized' },
        { status: 404 }
      )
    }

    // Character ownership verified above — use service role to bypass RLS
    // (non-officers cannot UPDATE character_guild_memberships otherwise).
    const serviceSupabase = createServiceRoleClient()

    // Block removing the user's last character from a guild they created.
    // Mirrors the "creators cannot leave" rule on /api/guilds/leave.
    const { data: guildRow } = await serviceSupabase
      .from('guilds')
      .select('created_by')
      .eq('id', guild_id)
      .single()

    if (guildRow?.created_by === user.id) {
      const { data: userCharIds } = await serviceSupabase
        .from('characters')
        .select('id')
        .eq('user_id', user.id)

      const characterIds = (userCharIds || []).map(c => c.id)
      if (characterIds.length > 0) {
        const { count: activeCount } = await serviceSupabase
          .from('character_guild_memberships')
          .select('id', { count: 'exact', head: true })
          .eq('guild_id', guild_id)
          .eq('is_active', true)
          .in('character_id', characterIds)
          .neq('character_id', id)

        if ((activeCount ?? 0) === 0) {
          return NextResponse.json(
            { error: 'Guild creators must keep at least one character in the guild. Delete the guild instead, or add another character first.' },
            { status: 403 }
          )
        }
      }
    }

    const { error } = await serviceSupabase
      .from('character_guild_memberships')
      .update({ is_active: false })
      .eq('character_id', id)
      .eq('guild_id', guild_id)

    if (error) {
      console.error('Error removing character from guild:', error)
      return NextResponse.json(
        { error: 'Failed to remove character from guild' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/characters/[id]/guilds:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
