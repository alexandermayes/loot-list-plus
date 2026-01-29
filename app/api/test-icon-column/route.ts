import { NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'

export async function GET() {
  // SECURITY: Restrict debug endpoint to development only
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({
        status: 'error',
        message: 'Not authenticated'
      })
    }

    const supabase = await createClient()

    // Get user's active guild
    const { data: activeGuildData } = await supabase
      .from('user_active_guilds')
      .select('active_guild_id')
      .eq('user_id', user.id)
      .single()

    if (!activeGuildData) {
      return NextResponse.json({
        status: 'error',
        message: 'No active guild found'
      })
    }

    // Try to select icon_url from guilds table for active guild
    const { data, error } = await supabase
      .from('guilds')
      .select('id, name, icon_url, discord_server_id')
      .eq('id', activeGuildData.active_guild_id)
      .single()

    if (error) {
      return NextResponse.json({
        status: 'error',
        message: 'Column might not exist',
        error: error.message
      })
    }

    return NextResponse.json({
      status: 'success',
      message: 'icon_url column exists!',
      data
    })
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      message: error.message
    })
  }
}
