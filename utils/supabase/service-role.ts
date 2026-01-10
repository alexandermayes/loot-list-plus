import { createClient } from '@supabase/supabase-js'

// Service role client bypasses RLS - use ONLY for authorized admin operations
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    console.error('NEXT_PUBLIC_SUPABASE_URL is missing')
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
  }

  if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is missing')
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
