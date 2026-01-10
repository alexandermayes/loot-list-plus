import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    // Check if user logged in with Discord
    const isDiscordUser = user.app_metadata?.provider === 'discord' ||
                          user.user_metadata?.iss?.includes('discord')

    if (!isDiscordUser) {
      return NextResponse.json({
        error: 'Please log in with Discord to verify',
        verified: false
      }, { status: 400 })
    }

    // Get Discord user ID from user metadata
    const discordId = user.user_metadata?.provider_id ||
                      user.user_metadata?.sub ||
                      user.identities?.[0]?.id

    if (!discordId) {
      return NextResponse.json({
        error: 'Could not find Discord ID. Please re-login with Discord.',
        verified: false
      }, { status: 400 })
    }

    console.log('Discord verification - User ID:', user.id, 'Discord ID:', discordId)

    // Update user preferences with verification status
    const { error: updateError } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        discord_verified: true,
        discord_id: discordId,
        last_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (updateError) {
      console.error('Error updating preferences:', updateError)
      return NextResponse.json({
        error: 'Failed to update verification status',
        details: updateError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      verified: true,
      message: 'Discord account verified successfully!',
      discord_id: discordId
    })
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json({
      error: 'Verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
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
