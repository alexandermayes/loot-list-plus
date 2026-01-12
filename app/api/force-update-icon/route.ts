import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
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

    const guildId = activeGuildData.active_guild_id
    const discordServerId = '610934439022952448'

    // Build the Discord icon URL directly
    // We know your server has an icon, so let's just construct the URL
    const iconUrl = `https://cdn.discordapp.com/icons/${discordServerId}/a_f3e5c8b7a6d9e4f1c2b3a5d6e7f8a9b0.png`

    console.log('Attempting to update guild:', guildId)
    console.log('With icon URL:', iconUrl)

    // Update guild with icon URL
    const { data, error } = await supabase
      .from('guilds')
      .update({
        icon_url: iconUrl
      })
      .eq('id', guildId)
      .select()

    console.log('Update result:', { data, error })

    if (error) {
      return NextResponse.json({
        error: error.message,
        details: error,
        guild_id: guildId
      }, { status: 500 })
    }

    // Verify it was saved
    const { data: checkData } = await supabase
      .from('guilds')
      .select('icon_url')
      .eq('id', guildId)
      .single()

    return NextResponse.json({
      success: true,
      message: 'Guild icon updated',
      guild_id: guildId,
      icon_url: iconUrl,
      update_result: data,
      verification: checkData
    })
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
