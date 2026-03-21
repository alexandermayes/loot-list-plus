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
        // Check if user has any guild memberships via character system
        let hasMemberships = false
        let firstGuildId = null
        const { data: userCharacters } = await supabase
          .from('characters')
          .select('id')
          .eq('user_id', user.id)

        if (userCharacters && userCharacters.length > 0) {
          const characterIds = userCharacters.map(c => c.id)
          const { data: charMembership } = await supabase
            .from('character_guild_memberships')
            .select('guild_id')
            .in('character_id', characterIds)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle()

          if (charMembership) {
            hasMemberships = true
            firstGuildId = charMembership.guild_id
          }
        }

        // If user has no guilds, redirect to guild selection
        if (!hasMemberships) {
          return NextResponse.redirect(`${origin}/guild-select`)
        }

        // If user has guilds, ensure they have an active guild set
        const { data: existingActiveGuild } = await supabase
          .from('user_active_guilds')
          .select('active_guild_id')
          .eq('user_id', user.id)
          .single()

        // If no active guild is set, set the first guild as active
        if (!existingActiveGuild && firstGuildId) {
          await supabase
            .from('user_active_guilds')
            .upsert({
              user_id: user.id,
              active_guild_id: firstGuildId,
              updated_at: new Date().toISOString()
            })
        }
      }

      // Redirect to specified next page or dashboard
      const redirectTo = next || '/overview'
      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth_failed`)
}
