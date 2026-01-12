import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  return handleRequest()
}

export async function POST() {
  return handleRequest()
}

async function handleRequest() {
  const supabase = await createClient()

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user's active guild
    const { data: activeGuildData } = await supabase
      .from('user_active_guilds')
      .select('active_guild_id')
      .eq('user_id', user.id)
      .single()

    if (!activeGuildData) {
      return NextResponse.json({ error: 'No active guild found' }, { status: 404 })
    }

    // Get guild with discord server ID
    const { data: guild } = await supabase
      .from('guilds')
      .select('id, discord_server_id, icon_url')
      .eq('id', activeGuildData.active_guild_id)
      .single()

    if (!guild || !guild.discord_server_id) {
      return NextResponse.json({ error: 'No Discord server ID set' }, { status: 400 })
    }

    // Fetch icon from Discord
    const response = await fetch(`http://localhost:3000/api/discord/guild-icon?serverId=${guild.discord_server_id}`)

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch Discord icon' }, { status: 500 })
    }

    const data = await response.json()

    if (!data.iconUrl) {
      return NextResponse.json({ error: 'No icon found for this Discord server' }, { status: 404 })
    }

    // Update guild with icon URL using RPC function (bypasses RLS)
    const { error: updateError } = await supabase
      .rpc('update_guild_icon', {
        p_guild_id: guild.id,
        p_icon_url: data.iconUrl
      })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Guild icon updated successfully',
      icon_url: data.iconUrl
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
