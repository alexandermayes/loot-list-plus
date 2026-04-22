import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? null

  const log = (step, data) => console.log(`[auth/callback] ${step}`, JSON.stringify(data))

  log('start', { hasCode: !!code, next, origin })

  if (code) {
    const cookieStore = await cookies()

    // Build the Supabase client with cookie handling that works with
    // NextResponse.redirect(). Using cookies() from next/headers alone
    // does not reliably forward set-cookie headers through a redirect
    // response. Instead, we track cookies ourselves and apply them to
    // the final redirect response.
    const cookiesToForward = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookiesToForward.push({ name, value, options })
              try {
                cookieStore.set(name, value, options)
              } catch {
                // Ignore — we'll apply via response below
              }
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    log('exchangeCode', { success: !error, error: error?.message || null, cookiesSet: cookiesToForward.length })

    if (!error) {
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser()
      log('getUser', { userId: user?.id || null, email: user?.email || null, name: user?.user_metadata?.full_name || null })

      let redirectPath = next || '/overview'

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
          redirectPath = '/guild-select'
          log('redirect', { to: redirectPath, reason: 'no memberships' })
        } else {
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
      }

      log('redirect', {
        to: redirectPath,
        reason: 'success',
        cookiesForwarded: cookiesToForward.map(c => ({
          name: c.name,
          valueLen: c.value?.length,
          httpOnly: c.options?.httpOnly,
          secure: c.options?.secure,
          sameSite: c.options?.sameSite,
          path: c.options?.path,
          domain: c.options?.domain,
          maxAge: c.options?.maxAge,
        })),
      })

      // Apply auth cookies to the redirect response so the browser
      // receives the new session tokens alongside the 307.
      const response = NextResponse.redirect(`${origin}${redirectPath}`)
      for (const { name, value, options } of cookiesToForward) {
        response.cookies.set(name, value, options)
      }
      return response
    }
  }

  log('redirect', { to: '/?error=auth_failed', reason: code ? 'exchange failed' : 'no code' })
  return NextResponse.redirect(`${origin}/?error=auth_failed`)
}
