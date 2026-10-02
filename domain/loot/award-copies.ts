// Award copies: which copy of an item a raider received on one raid night.
//
// A raider may list one item more than once (FU-1 of GH #331 and #293: the
// AQ40 Qiraji Bindings are one 'Shared Boss Loot' item that several bosses
// drop), so loot_history can hold copy 1, copy 2 and so on for one item, one
// raider and one raid night. The unique index on (guild_id, loot_item_id,
// character_id, raid_event_id, award_copy) keeps each copy unique, so a retry
// or a double submit of the same copy is still rejected.
//
// Who numbers the copies:
//   * POST /api/loot-history/bulk numbers repeated items of one request with
//     assignAwardCopies (a Gargul paste with the same line twice records two
//     copies) and answers a duplicate with next_award_copy (nextAwardCopy).
//   * The master sheet award modal reads that answer with readAwardResult and
//     asks the officer before sending the next copy explicitly.
//   * The addon insert path picks the next copy itself from the highest
//     stored one (lib/loot/addon-award-insert.ts).
//
// This module has no imports at all, so it is safe on the client and the
// server and can be loaded outside the Next.js alias setup.

/** The most copies of one item one raider can receive on one raid night
 * (the database CHECK on loot_history.award_copy uses the same limit). */
export const MAX_AWARD_COPIES = 10

/** True for a whole number from 1 to MAX_AWARD_COPIES. */
export function isValidAwardCopy(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_AWARD_COPIES
  )
}

export interface AwardCopyInput {
  loot_item_id: string
  character_id?: string | null
  raid_event_id?: string | null
  award_copy?: unknown
}

/**
 * Returns one copy number per item, in input order.
 *
 * Items without a raid night or without a character are always copy 1 (the
 * per-night unique rule does not cover them). For linked items, items that
 * share loot_item_id, character_id and raid_event_id form one group: valid
 * explicit award_copy values are kept, then the items without one take the
 * lowest numbers not used in the group, in request order.
 */
export function assignAwardCopies(items: readonly AwardCopyInput[]): number[] {
  const copies: number[] = items.map(() => 1)
  const groups = new Map<string, number[]>()

  items.forEach((item, index) => {
    if (!item.raid_event_id || !item.character_id) return
    const key = `${item.loot_item_id}|${item.character_id}|${item.raid_event_id}`
    const group = groups.get(key)
    if (group) group.push(index)
    else groups.set(key, [index])
  })

  for (const indexes of groups.values()) {
    const used = new Set<number>()
    for (const index of indexes) {
      const explicit = items[index].award_copy
      if (isValidAwardCopy(explicit)) {
        copies[index] = explicit
        used.add(explicit)
      }
    }
    let next = 1
    for (const index of indexes) {
      if (isValidAwardCopy(items[index].award_copy)) continue
      while (used.has(next)) next++
      copies[index] = next
      used.add(next)
    }
  }

  return copies
}

/**
 * The next free copy after the highest stored one: 1 when there is none,
 * highest + 1 otherwise, and null once that would pass MAX_AWARD_COPIES.
 */
export function nextAwardCopy(highestExisting: number | null | undefined): number | null {
  if (highestExisting === null || highestExisting === undefined) return 1
  const next = highestExisting + 1
  return next > MAX_AWARD_COPIES ? null : next
}

export type AwardResultReading =
  | { kind: 'awarded' }
  | { kind: 'duplicate'; nextAwardCopy: number | null | undefined }
  | { kind: 'failed'; message: string }

/**
 * Reads the first per-item result of a POST /api/loot-history/bulk answer:
 * success true means awarded, error 'duplicate' means the raider already has
 * this copy (with next_award_copy as sent, absent when unknown), and anything
 * else, including a missing results array, means failed.
 */
export function readAwardResult(body: unknown): AwardResultReading {
  const results = (body as { results?: unknown } | null | undefined)?.results
  const first = Array.isArray(results) ? (results[0] as Record<string, unknown> | undefined) : undefined
  if (!first || typeof first !== 'object') return { kind: 'failed', message: 'Unknown error' }
  if (first.success === true) return { kind: 'awarded' }
  if (first.error === 'duplicate') {
    const next = first.next_award_copy
    return {
      kind: 'duplicate',
      nextAwardCopy: typeof next === 'number' || next === null ? next : undefined,
    }
  }
  const message = typeof first.error === 'string' && first.error ? first.error : 'Unknown error'
  return { kind: 'failed', message }
}
