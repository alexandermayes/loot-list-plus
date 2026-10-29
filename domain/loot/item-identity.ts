/**
 * Pure helpers for the need-row branch every reader of loot_items shares.
 *
 * A Discovery need row has no wowhead_id. Keying its receive skip by wowhead
 * would pool every need of a raider under one key (research Pitfall 6), so a
 * need is identified by its own row id and an item by its wowhead id exactly
 * as before; item key strings do not change (D-19).
 */

export type LootItemKind = 'item' | 'need'

/** Proposed copy; owner sign-off Oct 26. Used by the loot-items routes. */
export const NEED_ROW_FIXED_ERROR = 'Need rows are fixed and cannot be edited.'

interface KindedRow {
  kind?: string | null
}

export function isNeedRow(item: KindedRow | null | undefined): boolean {
  return item?.kind === 'need'
}

/**
 * The key a receive skip matches on. `null` means "no identity, never
 * skipped", which is how an item with no wowhead_id has always behaved.
 * A null wowhead_id must never be defaulted to 0 or '' here: that would give
 * all of a raider's identity-less rows one shared key.
 */
export function itemIdentityKey(
  item: { id?: string | null; wowhead_id?: number | null; kind?: string | null } | null | undefined,
): string | null {
  if (!item) return null
  if (isNeedRow(item)) return item.id ? `need:${item.id}` : null
  if (item.wowhead_id == null) return null
  return String(item.wowhead_id)
}

/**
 * The wowhead id to hand a link renderer. `null` for a need row so ItemLink
 * renders a NeedLabel; every other row keeps the legacy `|| 0` fallback.
 */
export function wowheadIdForDisplay(
  item: { wowhead_id?: number | null; kind?: string | null } | null | undefined,
): number | null {
  if (isNeedRow(item)) return null
  return item?.wowhead_id || 0
}

/**
 * Keeps every item row and only the need rows whose id is in the ranked set,
 * preserving input order. An empty set drops every need row.
 */
export function keepRankedNeedRows<T extends { id: string; kind?: string | null }>(
  rows: readonly T[],
  rankedIds: ReadonlySet<string>,
): T[] {
  return rows.filter(row => !isNeedRow(row) || rankedIds.has(row.id))
}
