// Copies of one item on a loot list, counted by the real item (GH #293, #331).
//
// Rule: a copy is counted by the real item (wowhead_id, else the loot_items
// id), so the same item dropped by two bosses is one item. Non-token items are
// counted across the whole list, every section together. Tokens are counted
// separately in main spec (Brackets 1-4 plus No Bracket, ranks 50-25) and in
// off-spec (ranks 24-1), so listing a token for main spec and again for
// off-spec keeps working. The per-group limit comes from maxCopiesForItem.
// The loot list (copyLimitState) and the submit route (validateItemCopyLimits)
// both decide with copyGroupRule, so client and server always agree.

import { isTokenSlot } from '../../data/token-class-mapping'
import type { BracketViolation } from './bracket-validation'
import { maxCopiesForItem } from './slot-capacity'

export interface CopyLimitItem {
  id: string
  name?: string | null
  item_slot?: string | null
  wowhead_id?: number | null
}

export type SpecGroup = 'main' | 'off'

/** Lowest rank in main spec (Brackets 1-4 plus No Bracket). */
const MAIN_SPEC_MIN_RANK = 25

export const COPY_LIMIT_RULE = 'item_copy_limit'
export const COPY_LIMIT_MAIN_SPEC_LABEL = 'Main spec'
export const COPY_LIMIT_OFF_SPEC_LABEL = 'Off-spec'
export const COPY_LIMIT_WHOLE_LIST_LABEL = 'Whole list'

/** Groups loot_items rows of one real item: wowhead_id, else the row's own id. */
export function copyGroupKey(item: CopyLimitItem): string {
  return item.wowhead_id != null ? `w:${item.wowhead_id}` : `id:${item.id}`
}

/** Ranks 50-25 are main spec; ranks 24-1 are off-spec. */
export function specGroupForRank(rank: number): SpecGroup {
  return rank >= MAIN_SPEC_MIN_RANK ? 'main' : 'off'
}

function isTokenRow(item: CopyLimitItem): boolean {
  return !!item.item_slot && isTokenSlot(item.item_slot)
}

/**
 * Whether a group is a token group, and its limit (per spec group for tokens,
 * for the whole list otherwise). `rows` are the listed rows of one
 * copyGroupKey group. A group with any Token row is a token group, and its
 * limit comes from its Token rows only, so a non-token row sharing the
 * wowhead_id never lowers the token's slot count.
 */
export function copyGroupRule(rows: readonly CopyLimitItem[]): { isToken: boolean; limit: number } {
  const tokenRows = rows.filter(isTokenRow)
  const isToken = tokenRows.length > 0
  const counted = isToken ? tokenRows : rows
  const limit = counted.length > 0 ? Math.min(...counted.map(r => maxCopiesForItem(r))) : 1
  return { isToken, limit }
}

function bucketKey(groupKey: string, isToken: boolean, rank: number): string {
  return isToken ? `${groupKey}|${specGroupForRank(rank)}` : groupKey
}

interface Bucket {
  groupKey: string
  isToken: boolean
  spec: SpecGroup | null
  count: number
  firstName: string | null | undefined
  itemIds: Set<string>
}

/** Rows grouped by copyGroupKey, then counted per bucket. */
function countBuckets(entries: readonly { rank: number; item: CopyLimitItem }[]) {
  const rowsByGroup = new Map<string, CopyLimitItem[]>()
  for (const { item } of entries) {
    const key = copyGroupKey(item)
    const rows = rowsByGroup.get(key)
    if (rows) rows.push(item)
    else rowsByGroup.set(key, [item])
  }

  const rules = new Map<string, { isToken: boolean; limit: number }>()
  for (const [key, rows] of rowsByGroup) rules.set(key, copyGroupRule(rows))

  const buckets = new Map<string, Bucket>()
  for (const { rank, item } of entries) {
    const groupKey = copyGroupKey(item)
    const { isToken } = rules.get(groupKey)!
    const key = bucketKey(groupKey, isToken, rank)
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = {
        groupKey,
        isToken,
        spec: isToken ? specGroupForRank(rank) : null,
        count: 0,
        firstName: item.name,
        itemIds: new Set(),
      }
      buckets.set(key, bucket)
    }
    bucket.count++
    bucket.itemIds.add(item.id)
  }
  return { rules, buckets }
}

export interface CopyLimitState {
  /** Catalog ids that cannot be added again in Brackets 1-4 or No Bracket. */
  mainSpecAtLimit: Set<string>
  /** Catalog ids that cannot be added again in Off-spec. */
  offSpecAtLimit: Set<string>
  /** Listed ids whose bucket is above its limit. */
  overLimit: Set<string>
}

/**
 * Client view of a list's copies. `listed` has one entry per rankings cell;
 * ids that do not resolve to a catalog row are ignored.
 */
export function copyLimitState(
  listed: Iterable<{ rank: number; itemId: string }>,
  catalog: readonly CopyLimitItem[],
): CopyLimitState {
  const byId = new Map(catalog.map(item => [item.id, item]))
  const idsByGroup = new Map<string, string[]>()
  for (const item of catalog) {
    const key = copyGroupKey(item)
    const ids = idsByGroup.get(key)
    if (ids) ids.push(item.id)
    else idsByGroup.set(key, [item.id])
  }

  const entries: { rank: number; item: CopyLimitItem }[] = []
  for (const { rank, itemId } of listed) {
    const item = byId.get(itemId)
    if (item) entries.push({ rank, item })
  }

  const { rules, buckets } = countBuckets(entries)
  const state: CopyLimitState = {
    mainSpecAtLimit: new Set(),
    offSpecAtLimit: new Set(),
    overLimit: new Set(),
  }

  for (const bucket of buckets.values()) {
    const { limit } = rules.get(bucket.groupKey)!
    if (bucket.count > limit) {
      for (const id of bucket.itemIds) state.overLimit.add(id)
    }
    if (bucket.count < limit) continue
    const groupIds = idsByGroup.get(bucket.groupKey) ?? []
    const targets = bucket.spec === null
      ? [state.mainSpecAtLimit, state.offSpecAtLimit]
      : [bucket.spec === 'main' ? state.mainSpecAtLimit : state.offSpecAtLimit]
    for (const target of targets) {
      for (const id of groupIds) target.add(id)
    }
  }
  return state
}

/**
 * Server check for POST /api/loot-submissions/submit: one violation per
 * over-limit bucket, in first-seen order.
 */
export function validateItemCopyLimits(
  entries: readonly { rank: number; item: CopyLimitItem }[],
): BracketViolation[] {
  const { rules, buckets } = countBuckets(entries)
  const violations: BracketViolation[] = []
  for (const bucket of buckets.values()) {
    const { limit } = rules.get(bucket.groupKey)!
    if (bucket.count <= limit) continue
    const bracket = bucket.spec === null
      ? COPY_LIMIT_WHOLE_LIST_LABEL
      : bucket.spec === 'main' ? COPY_LIMIT_MAIN_SPEC_LABEL : COPY_LIMIT_OFF_SPEC_LABEL
    violations.push({
      bracket,
      rule: COPY_LIMIT_RULE,
      detail: `"${bucket.firstName || 'Unknown'}" is listed ${bucket.count} times (max ${limit})`,
    })
  }
  return violations
}
