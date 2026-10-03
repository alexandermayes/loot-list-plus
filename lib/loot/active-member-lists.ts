/**
 * Keeps loot lists whose character is an active member of the list's own
 * guild - the same check the submit route makes
 * (lib/loot/guild-award-refs.ts findInvalidCharacterIds), so reminders and
 * badges only ask for a resubmit the raider can actually do.
 *
 * Per list, not per account (GH #314-style scope): a character that left one
 * guild but is still active in another keeps its lists there, and a user
 * whose main is still in a guild keeps getting asked about the main's lists
 * even if an alt of theirs left that same guild.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { findInvalidCharacterIds } from './guild-award-refs'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryClient = SupabaseClient<any, any, any>

/**
 * Returns a new array holding only the lists whose guild_id and
 * character_id are both set (non-null, non-empty) and whose character has
 * an active (is_active = true) membership in that list's own guild. Lists
 * with a null or empty guild_id or character_id are dropped - they cannot
 * be submitted either.
 *
 * Calls findInvalidCharacterIds once per distinct guild_id, in first-seen
 * guild order, sequentially, with that guild's distinct character ids.
 * Input order is kept, the returned items are the same object references,
 * and the input array is not mutated. Empty input makes no query. Throws
 * if a lookup fails.
 */
export async function keepListsOfActiveMembers<T extends { guild_id: string | null; character_id: string | null }>(
  supabase: QueryClient,
  lists: readonly T[],
): Promise<T[]> {
  const charIdsByGuild = new Map<string, string[]>()
  const seenCharByGuild = new Map<string, Set<string>>()

  for (const list of lists) {
    const guildId = list.guild_id
    const characterId = list.character_id
    if (!guildId || !characterId) continue

    let seen = seenCharByGuild.get(guildId)
    if (!seen) {
      seen = new Set<string>()
      seenCharByGuild.set(guildId, seen)
      charIdsByGuild.set(guildId, [])
    }
    if (!seen.has(characterId)) {
      seen.add(characterId)
      charIdsByGuild.get(guildId)!.push(characterId)
    }
  }

  const invalidByGuild = new Map<string, Set<string>>()
  for (const [guildId, characterIds] of charIdsByGuild) {
    const invalidIds = await findInvalidCharacterIds(supabase, guildId, characterIds)
    invalidByGuild.set(guildId, new Set(invalidIds))
  }

  return lists.filter((list) => {
    const guildId = list.guild_id
    const characterId = list.character_id
    if (!guildId || !characterId) return false
    return !invalidByGuild.get(guildId)?.has(characterId)
  })
}
