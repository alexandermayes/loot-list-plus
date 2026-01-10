import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? null

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Check if user has any guild memberships
        const { data: memberships, error: membershipError } = await supabase
          .from('guild_members')
          .select('id, guild_id')
          .eq('user_id', user.id)
          .limit(1)

        if (membershipError) {
          console.error('Error checking guild membership:', membershipError)
        }

        // If user has no guilds, redirect to guild selection
        if (!memberships || memberships.length === 0) {
          return NextResponse.redirect(`${origin}/guild-select`)
        }

        // If user has guilds, ensure they have an active guild set
        const { data: activeGuild } = await supabase
          .from('user_active_guilds')
          .select('active_guild_id')
          .eq('user_id', user.id)
          .single()

        // If no active guild is set, set the first guild as active
        if (!activeGuild) {
          await supabase
            .from('user_active_guilds')
            .upsert({
              user_id: user.id,
              active_guild_id: memberships[0].guild_id,
              updated_at: new Date().toISOString()
            })
        }
      }

      // Redirect to specified next page or dashboard
      const redirectTo = next || '/dashboard'
      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth_failed`)
}