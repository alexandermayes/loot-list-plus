// Officer review diff between a list and its last approved snapshot.
//
// A list can hold two copies of one item (GH #293, #331), so both sides are
// multisets of ranks per item: ranks present on both sides cancel, leftover
// pairs are moves, and the rest are additions or removals. Adding, removing
// or moving one copy shows exactly one entry for that copy.

export interface DiffEntry {
  type: 'added' | 'removed' | 'moved'
  item_name: string
  rank?: number
  old_rank?: number
  new_rank?: number
}

export interface DiffListItem {
  loot_item_id: string
  rank: number
  name: string
}

const TYPE_ORDER: Record<DiffEntry['type'], number> = { added: 0, removed: 1, moved: 2 }

function groupRanks(items: readonly DiffListItem[]) {
  const groups = new Map<string, { ranks: number[]; name: string }>()
  for (const item of items) {
    const group = groups.get(item.loot_item_id)
    if (group) group.ranks.push(item.rank)
    else groups.set(item.loot_item_id, { ranks: [item.rank], name: item.name })
  }
  return groups
}

/** Removes the ranks present in both lists (multiset intersection). */
function cancelShared(a: number[], b: number[]): [number[], number[]] {
  const remaining = [...b]
  const leftA: number[] = []
  for (const rank of a) {
    const idx = remaining.indexOf(rank)
    if (idx === -1) leftA.push(rank)
    else remaining.splice(idx, 1)
  }
  return [leftA, remaining]
}

export function diffListItems(
  current: readonly DiffListItem[],
  snapshot: readonly DiffListItem[],
): DiffEntry[] {
  const currentGroups = groupRanks(current)
  const snapshotGroups = groupRanks(snapshot)
  const ids = new Set([...currentGroups.keys(), ...snapshotGroups.keys()])
  const diff: DiffEntry[] = []

  for (const id of ids) {
    const cur = currentGroups.get(id)
    const snap = snapshotGroups.get(id)
    const name = cur?.name || snap?.name || 'Unknown'
    const byRankDesc = (a: number, b: number) => b - a
    const [newRanks, oldRanks] = cancelShared(
      [...(cur?.ranks ?? [])].sort(byRankDesc),
      [...(snap?.ranks ?? [])].sort(byRankDesc),
    )

    const moves = Math.min(newRanks.length, oldRanks.length)
    for (let i = 0; i < moves; i++) {
      diff.push({ type: 'moved', item_name: name, old_rank: oldRanks[i], new_rank: newRanks[i] })
    }
    for (const rank of newRanks.slice(moves)) {
      diff.push({ type: 'added', item_name: name, rank })
    }
    for (const rank of oldRanks.slice(moves)) {
      diff.push({ type: 'removed', item_name: name, old_rank: rank })
    }
  }

  // Added first, then removed, then moved. Within each group, by rank desc.
  diff.sort((a, b) => {
    if (TYPE_ORDER[a.type] !== TYPE_ORDER[b.type]) return TYPE_ORDER[a.type] - TYPE_ORDER[b.type]
    const rankA = a.rank ?? a.new_rank ?? a.old_rank ?? 0
    const rankB = b.rank ?? b.new_rank ?? b.old_rank ?? 0
    return rankB - rankA
  })
  return diff
}
