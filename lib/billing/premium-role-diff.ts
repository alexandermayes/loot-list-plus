/**
 * Pure desired-state diff for the community Discord's Premium role.
 *
 * No imports, no I/O - this is deliberate. Keeping the diff logic reachable
 * from a unit test without standing up a Supabase or Discord double is the
 * whole point of extracting it out of the cron route.
 */
export interface PremiumRoleDiff {
  toGrant: string[]
  toRevoke: string[]
}

/**
 * Diffs the set of discord ids that should hold the Premium role against
 * the set observed holding it right now.
 *
 * `toGrant` is the deduped `desired` set in full, not a set difference.
 * Re-PUTting an id that already holds the role is a no-op at Discord, and
 * always granting the full desired set keeps the cron correct even when
 * `current` is unknown or stale - that's the backfill property that lets
 * this same call double as a one-time backfill on first run.
 *
 * `toRevoke` is `current` minus `desired`, and is always empty when
 * `current` is null. `current` is null specifically when the member
 * listing could not be read (e.g. missing Server Members Intent); refusing
 * to revoke on unknown state is what stops a failed listing call from
 * stripping the role from every subscriber.
 *
 * Set semantics also give the multi-guild safety for free on this path: a
 * purchaser owning two pro guilds contributes one entry to `desired`, so
 * they can never land in `toRevoke`.
 */
export function diffPremiumRoleHolders(
  desired: Iterable<string>,
  current: Iterable<string> | null
): PremiumRoleDiff {
  const desiredSet = new Set(desired)
  const toGrant = [...desiredSet]

  if (current === null) {
    return { toGrant, toRevoke: [] }
  }

  const toRevoke = [...new Set(current)].filter((id) => !desiredSet.has(id))
  return { toGrant, toRevoke }
}
