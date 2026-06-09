import type { createServiceRoleClient } from '@/utils/supabase/service-role'

type ServiceClient = ReturnType<typeof createServiceRoleClient>

/**
 * Recompute BLP (bad luck protection) straight from history for the given items.
 *
 * times_passed is a derived value (see migration 20260609000001): each call
 * rebuilds the counter + journal for a (guild, item) from award + attendance
 * history, so it is idempotent and order-independent. Call it from BOTH the
 * award path and the attendance-write paths — whichever lands second fills in
 * the credits, which closes the award-before-attendance race.
 *
 * Fire-and-forget at the call site; errors are logged, not thrown.
 */
export async function recomputeBlpForItems(
  supabase: ServiceClient,
  guildId: string,
  lootItemIds: Array<string | null | undefined>,
): Promise<void> {
  const ids = [...new Set(lootItemIds.filter((id): id is string => !!id))]
  for (const lootItemId of ids) {
    const { error } = await supabase.rpc('recompute_blp_for_item', {
      p_guild_id: guildId,
      p_loot_item_id: lootItemId,
    })
    if (error) console.error('BLP recompute failed for item', lootItemId, error)
  }
}

/**
 * Recompute BLP for every item awarded at the given raid events. Used by the
 * attendance-write paths so syncing or editing attendance corrects BLP for that
 * night's drops.
 */
export async function recomputeBlpForEvents(
  supabase: ServiceClient,
  guildId: string,
  raidEventIds: Array<string | null | undefined>,
): Promise<void> {
  const ids = [...new Set(raidEventIds.filter((id): id is string => !!id))]
  for (const raidEventId of ids) {
    const { error } = await supabase.rpc('recompute_blp_for_event', {
      p_guild_id: guildId,
      p_raid_event_id: raidEventId,
    })
    if (error) console.error('BLP recompute failed for event', raidEventId, error)
  }
}
