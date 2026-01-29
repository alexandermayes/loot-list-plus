import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore if called from Server Component
          }
        },
      },
    }
  )
}

/**
 * Get authenticated user using getSession() for better performance.
 *
 * getSession() validates the JWT signature locally without a network call,
 * while getUser() makes a round-trip to Supabase Auth server.
 *
 * Use this for read-only operations where immediate token revocation
 * detection is not critical. For sensitive operations (password change,
 * account deletion), still use supabase.auth.getUser().
 *
 * @returns User object or null if not authenticated
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session?.user) {
    return { user: null, error: error || new Error('No session') }
  }

  return { user: session.user, error: null }
}
