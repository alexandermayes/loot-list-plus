import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Get the authenticated user and session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const user = session.user

  try {
    // Get the guild from the database to find the Discord server ID
    const { data: memberData } = await supabase
      .from('guild_members')
      .select('guild:guilds(discord_server_id)')
      .eq('user_id', user.id)
      .single()

    if (!memberData?.guild?.discord_server_id) {
      return NextResponse.json({
        error: 'No Discord server configured for your guild',
        verified: false
      }, { status: 400 })
    }

    const guildDiscordId = memberData.guild.discord_server_id

    // Get the provider access token from the session
    const providerToken = session.provider_token

    console.log('Debug - Session keys:', Object.keys(session))
    console.log('Debug - Has provider_token:', !!providerToken)
    console.log('Debug - User metadata keys:', Object.keys(user.user_metadata || {}))

    if (!providerToken) {
      return NextResponse.json({
        error: 'No Discord access token available. Please re-authenticate.',
        verified: false,
        debug: {
          hasSession: !!session,
          hasProviderToken: !!providerToken,
          sessionKeys: Object.keys(session)
        }
      }, { status: 400 })
    }

    // Fetch user's Discord guilds
    const userGuilds = await fetchDiscordGuilds(providerToken)

    if (!userGuilds) {
      return NextResponse.json({
        error: 'Failed to fetch Discord guilds. Please try again.',
        verified: false
      }, { status: 400 })
    }

    // Check if user is a member of the guild's Discord server
    const isGuildMember = userGuilds.some((guild: any) => guild.id === guildDiscordId)

    // Update user preferences with verification status
    const { error: updateError } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        discord_verified: true,
        discord_guild_member: isGuildMember,
        last_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (updateError) {
      console.error('Error updating preferences:', updateError)
      return NextResponse.json({ error: 'Failed to update verification status' }, { status: 500 })
    }

    return NextResponse.json({
      verified: isGuildMember,
      message: isGuildMember
        ? 'Discord server membership verified!'
        : 'You are not a member of the guild Discord server'
    })
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}

async function fetchDiscordGuilds(accessToken: string) {
  const response = await fetch('https://discord.com/api/users/@me/guilds', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch Discord guilds')
  }

  return response.json()
}
