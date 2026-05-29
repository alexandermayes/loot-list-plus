import { revalidateTag } from 'next/cache'

/**
 * Cache tag for per-guild pending submission counts.
 *
 * The sidebar pending-submissions badge polls every 60s per officer; backing
 * the read with a tag-invalidated cache turns 99% of polls into in-memory
 * hits and eliminates redundant Supabase count(*) queries across officers
 * in the same guild.
 */
export function pendingSubmissionsTag(guildId: string): string {
  return `guild:${guildId}:submissions:pending`
}

export function revalidatePendingSubmissions(guildId: string): void {
  if (!guildId) return
  try {
    revalidateTag(pendingSubmissionsTag(guildId), 'default')
  } catch {
    // revalidateTag throws outside a request context (e.g. some test setups).
    // Cache will fall back to its TTL.
  }
}
