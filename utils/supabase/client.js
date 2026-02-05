import { createBrowserClient } from '@supabase/ssr'

// Singleton instance to prevent multiple clients and ensure consistent auth state
let supabaseInstance = null

export function createClient() {
  if (supabaseInstance) {
    return supabaseInstance
  }

  supabaseInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  return supabaseInstance
}