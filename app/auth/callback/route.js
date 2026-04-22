import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? null

  const log = (step, data) => console.log(`[auth/callback] ${step}`, JSON.stringify(data))

  log('start', { hasCode: !!code, next, origin })

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    log('exchangeCode', { success: !error, error: error?.message || null })

    if (!error) {
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser()
      log('getUser', { userId: user?.id || null, email: user?.email || null, name: user?.user_metadata?.full_name || null })

      if (user) {
        // Check if user has any guild memberships via character system
        let hasMemberships = false
        let firstGuildId = null
        const { data: userCharacters, error: charError } = await supabase
          .from('characters')
          .select('id')
          .eq('user_id', user.id)

        log('characters', { count: userCharacters?.length || 0, error: charError?.message || null })

        if (userCharacters && userCharacters.length > 0) {
          const characterIds = userCharacters.map(c => c.id)
          const { data: charMembership, error: memError } = await supabase
            .from('character_guild_memberships')
            .select('guild_id')
            .in('character_id', characterIds)
            .eq('is_active', true)
            .limit(1)
            .maybeSingle()

          log('membership', { found: !!charMembership, guildId: charMembership?.guild_id || null, error: memError?.message || null })

          if (charMembership) {
            hasMemberships = true
            firstGuildId = charMembership.guild_id
          }
        }

        // If user has no guilds, redirect to guild selection
        if (!hasMemberships) {
          log('redirect', { to: '/guild-select', reason: 'no memberships' })
          return NextResponse.redirect(`${origin}/guild-select`)
        }

        // If user has guilds, ensure they have an active guild set
        const { data: existingActive } = await supabase
          .from('user_active_characters')
          .select('active_guild_id')
          .eq('user_id', user.id)
          .maybeSingle()

        log('activeGuild', { existing: existingActive?.active_guild_id || null, firstGuildId })

        if (!existingActive?.active_guild_id && firstGuildId) {
          await supabase
            .from('user_active_characters')
            .upsert({
              user_id: user.id,
              active_guild_id: firstGuildId,
              updated_at: new Date().toISOString()
            })
        }
      }

      // Redirect to specified next page or dashboard
      const redirectTo = next || '/overview'
      log('redirect', { to: redirectTo, reason: 'success' })
      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  log('redirect', { to: '/?error=auth_failed', reason: code ? 'exchange failed' : 'no code' })
  return NextResponse.redirect(`${origin}/?error=auth_failed`)
}
