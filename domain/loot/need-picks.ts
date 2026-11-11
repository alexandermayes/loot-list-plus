/**
 * Where a Discovery pick lands in the existing rankings map (D-01, D-02).
 *
 * The picker, the bootstrap route and every reader of a saved list must agree
 * on which rank and slot a pick uses, so that agreement lives in this one
 * module. Five picks sit at ranks 50 to 46 and fan out across every Discovery
 * tier of the phase group, one slot per tier. A tier's slot is a uniqueness
 * device only: readers resolve the tier through the need row's raid_tier_id,
 * never through the slot number.
 *
 * Pure and client-safe: no server code, no I/O, no locale.
 */
import { positionKey } from '@/domain/loot/list-row-updates'

export const NEED_PICK_COUNT = 5

// Need #1 is rank 50, so its interest sits four points above need #5 (D-01).
// Kept as one table so the mapping can be retuned in one place.
export const NEED_PICK_RANKS = [50, 49, 48, 47, 46] as const

/** loot_submission_items.slot allows 1..8 (the Phase 4 migration, D-02). */
export const MAX_NEED_TIER_SLOTS = 8

const DISCOVERY = 'discovery'

/** The rank for a picker position (0 is the first need), else null. */
export function rankForPosition(position: number): number | null {
  if (!Number.isInteger(position)) return null
  if (position < 0 || position >= NEED_PICK_RANKS.length) return null
  return NEED_PICK_RANKS[position]
}

/** The picker position for a need rank, else null. */
export function positionForRank(rank: number): number | null {
  const index = (NEED_PICK_RANKS as readonly number[]).indexOf(rank)
  return index === -1 ? null : index
}

export interface SlotTier {
  id: string
  sort_order: number | null
  list_mode: string | null
}

/**
 * The slot (1 to 8) each Discovery tier takes, ordered by sort_order and then
 * id. Callers pass every tier of the phase group, guild-active or not: an
 * award lock sits on a tier's (rank, slot), so turning a tier off or adding a
 * new one must never move another tier's slot (D-02 amended). Extra fields on
 * the tiers, such as is_guild_active, are deliberately not read.
 *
 * Null when there are no Discovery tiers or more than eight, so the picker
 * fails closed to the editor.
 *
 * The raid progression order helper in LootListContext cannot be used here:
 * every Forever tier maps to 999 there. Ids are compared by code unit, never by
 * locale, because a locale can order two ids differently on the server and in
 * the browser, and a slot that differs between them would break a lock.
 */
export function assignTierSlots(tiers: ReadonlyArray<SlotTier>): Record<string, number> | null {
  const discovery = tiers.filter((tier) => tier.list_mode === DISCOVERY)
  if (discovery.length === 0 || discovery.length > MAX_NEED_TIER_SLOTS) return null

  // Forever tiers always carry a sort_order (expansionCatalogSync); a
  // hand-made tier without one should not jump ahead of the seeded ones.
  const orderOf = (tier: SlotTier) => tier.sort_order ?? Number.POSITIVE_INFINITY
  const sorted = [...discovery].sort((a, b) => {
    const left = orderOf(a)
    const right = orderOf(b)
    if (left < right) return -1
    if (left > right) return 1
    if (a.id < b.id) return -1
    if (a.id > b.id) return 1
    return 0
  })

  // fromEntries defines own properties, so an id of '__proto__' stays a key.
  return Object.fromEntries(sorted.map((tier, index) => [tier.id, index + 1]))
}

/**
 * Whether a phase group gets the picker (D-12): at least one active tier and
 * every one of them Discovery. A mixed or empty group fails closed to the
 * editor.
 */
export function isDiscoveryPhaseGroup(
  activeTiers: ReadonlyArray<{ list_mode: string | null }>,
): boolean {
  return activeTiers.length > 0 && activeTiers.every((tier) => tier.list_mode === DISCOVERY)
}

export interface BuildNeedRankingsInput {
  /** Five need keys in picker order; null for a position not picked yet. */
  positions: ReadonlyArray<string | null>
  tierSlots: Readonly<Record<string, number>>
  /** The id of the tier's need row for a key, undefined when the tier has none. */
  needRowFor: (tierId: string, needKey: string) => string | undefined
}

/**
 * The 'rank-slot' to need row id map for the picks, plus every (tier, key)
 * that had no need row so the caller can say so instead of silently saving
 * fewer rows.
 */
export function buildNeedRankings(input: BuildNeedRankingsInput): {
  rankings: Record<string, string>
  missing: Array<{ tierId: string; needKey: string }>
} {
  const rankings: Record<string, string> = {}
  const missing: Array<{ tierId: string; needKey: string }> = []
  const tiersBySlot = Object.entries(input.tierSlots).sort((a, b) => a[1] - b[1])

  input.positions.forEach((needKey, position) => {
    if (needKey === null) return
    const rank = rankForPosition(position)
    if (rank === null) return
    for (const [tierId, slot] of tiersBySlot) {
      const id = input.needRowFor(tierId, needKey)
      if (id === undefined) {
        missing.push({ tierId, needKey })
        continue
      }
      rankings[positionKey(rank, slot)] = id
    }
  })

  return { rankings, missing }
}

export interface NeedRowRef {
  need_key: string | null
  raid_tier_id: string | null
  kind: string | null
}

export interface ReadNeedPositionsInput {
  rankings: Readonly<Record<string, string>>
  rowsById: ReadonlyMap<string, NeedRowRef>
  /** Every Discovery tier the list should cover. */
  tierIds: readonly string[]
}

const RANKING_KEY = /^(\d+)-(\d+)$/

/**
 * The inverse of buildNeedRankings. positions holds the key at each need rank.
 *
 * consistent is false when the saved rows cannot have come from the picker:
 * two different keys at one rank, an item row (or an unknown id) at a need
 * rank. missingTiers lists the tiers that lack a row at a filled rank, which
 * happens when a tier was switched on after the list was saved; the picker
 * then opens in its changed state so a re-save adds the rows.
 */
export function readNeedPositions(input: ReadNeedPositionsInput): {
  positions: (string | null)[]
  consistent: boolean
  missingTiers: string[]
} {
  const positions: (string | null)[] = NEED_PICK_RANKS.map(() => null)
  const tiersByPosition: Array<Set<string>> = NEED_PICK_RANKS.map(() => new Set<string>())
  let consistent = true

  const entries: Array<{ rank: number; slot: number; id: string }> = []
  for (const [key, id] of Object.entries(input.rankings)) {
    const match = RANKING_KEY.exec(key)
    if (!match) continue
    entries.push({ rank: Number(match[1]), slot: Number(match[2]), id })
  }
  // Slot order makes the key chosen at a disagreeing rank repeatable.
  entries.sort((a, b) => a.rank - b.rank || a.slot - b.slot)

  for (const { rank, id } of entries) {
    const position = positionForRank(rank)
    if (position === null) continue
    const row = input.rowsById.get(id)
    if (!row || row.kind !== 'need' || !row.need_key) {
      consistent = false
      continue
    }
    if (positions[position] === null) positions[position] = row.need_key
    else if (positions[position] !== row.need_key) {
      consistent = false
      continue
    }
    if (row.raid_tier_id) tiersByPosition[position].add(row.raid_tier_id)
  }

  const missing = new Set<string>()
  tiersByPosition.forEach((present, position) => {
    if (positions[position] === null) return
    for (const tierId of input.tierIds) {
      if (!present.has(tierId)) missing.add(tierId)
    }
  })

  return {
    positions,
    consistent,
    missingTiers: input.tierIds.filter((tierId) => missing.has(tierId)),
  }
}

export interface NeedRowGroup<T> {
  rank: number
  needKey: string
  tierIds: string[]
  rows: T[]
}

/**
 * One group per need per rank, so a list's 15 fan-out rows read as five
 * positions (D-28). Need rows only; rank descending, then need key by plain
 * comparison. Item rows are left to the caller.
 */
export function groupNeedRowsByRank<
  T extends { rank: number; need_key?: string | null; raid_tier_id?: string | null; kind?: string | null },
>(rows: readonly T[]): Array<NeedRowGroup<T>> {
  const groups = new Map<string, NeedRowGroup<T>>()
  for (const row of rows) {
    if (row.kind !== 'need' || typeof row.need_key !== 'string' || !row.need_key) continue
    const id = `${row.rank}|${row.need_key}`
    let group = groups.get(id)
    if (!group) {
      group = { rank: row.rank, needKey: row.need_key, tierIds: [], rows: [] }
      groups.set(id, group)
    }
    group.rows.push(row)
    if (row.raid_tier_id && !group.tierIds.includes(row.raid_tier_id)) {
      group.tierIds.push(row.raid_tier_id)
    }
  }
  return [...groups.values()].sort((a, b) => {
    if (a.rank !== b.rank) return b.rank - a.rank
    if (a.needKey < b.needKey) return -1
    if (a.needKey > b.needKey) return 1
    return 0
  })
}

/**
 * How much of the list a grouped need covers, for the "all 3 raids" line
 * (D-28). Copy stays in the components. A tier the list no longer has is not
 * counted.
 */
export function describeNeedGroupTiers(
  group: { tierIds: readonly string[] },
  listTierIds: readonly string[],
): { allTiers: boolean; count: number } {
  const covered = new Set(group.tierIds)
  const count = listTierIds.filter((tierId) => covered.has(tierId)).length
  return { allTiers: listTierIds.length > 0 && count === listTierIds.length, count }
}
