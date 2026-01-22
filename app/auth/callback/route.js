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
        // Check if user has any guild memberships (check both old and new systems)
        // First check old system
        const { data: oldMemberships, error: membershipError } = await supabase
          .from('guild_members')
          .select('id, guild_id')
          .eq('user_id', user.id)
          .limit(1)

        if (membershipError) {
          console.error('Error checking guild membership:', membershipError)
        }

        // Also check new character-based system
        let hasCharacterMemberships = false
        const { data: userCharacters } = await supabase
          .from('characters')
          .select('id')
          .eq('user_id', user.id)

        if (userCharacters && userCharacters.length > 0) {
          const characterIds = userCharacters.map(c => c.id)
          const { data: charMemberships } = await supabase
            .from('character_guild_memberships')
            .select('guild_id')
            .in('character_id', characterIds)
            .eq('is_active', true)
            .limit(1)

          hasCharacterMemberships = charMemberships && charMemberships.length > 0
        }

        // If user has no guilds in either system, redirect to guild selection
        const hasOldMemberships = oldMemberships && oldMemberships.length > 0
        if (!hasOldMemberships && !hasCharacterMemberships) {
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