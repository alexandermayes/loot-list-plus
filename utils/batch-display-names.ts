/**
 * Batch display name resolution utility.
 * Centralizes the duplicated display name lookup pattern used across API routes.
 * Uses parallel Promise.all instead of sequential loops.
 */

import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Extract display name from Supabase auth user metadata.
 * Priority: Discord global_name > full_name > name > fallback
 */
export function resolveDisplayName(
  userMetadata: Record<string, unknown> | null | undefined,
  fallback = 'Unknown User'
): string {
  if (!userMetadata) return fallback
  const claims = userMetadata.custom_claims as Record<string, unknown> | undefined
  return (
    (claims?.global_name as string) ||
    (userMetadata.full_name as string) ||
    (userMetadata.name as string) ||
    fallback
  )
}

/**
 * Batch fetch display names for multiple user IDs using parallel auth.admin.getUserById calls.
 * Deduplicates IDs and runs all lookups in parallel via Promise.all.
 *
 * @param serviceSupabase - Service role Supabase client (required for auth.admin access)
 * @param userIds - Array of user IDs to look up
 * @returns Map of userId -> display name string
 */
export async function batchGetDisplayNames(
  serviceSupabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, string>> {
  const displayNames = new Map<string, string>()
  if (userIds.length === 0) return displayNames

  const uniqueIds = [...new Set(userIds)]

  // Parallel fetch - all getUserById calls run concurrently
  const results = await Promise.all(
    uniqueIds.map(id => serviceSupabase.auth.admin.getUserById(id))
  )

  for (const result of results) {
    if (result.data?.user) {
      const u = result.data.user
      displayNames.set(u.id, resolveDisplayName(u.user_metadata))
    }
  }

  return displayNames
}

/**
 * Batch fetch display names, returning a plain Record (for JSON responses).
 */
export async function batchGetDisplayNamesRecord(
  serviceSupabase: SupabaseClient,
  userIds: string[]
): Promise<Record<string, string>> {
  const map = await batchGetDisplayNames(serviceSupabase, userIds)
  return Object.fromEntries(map)
}
