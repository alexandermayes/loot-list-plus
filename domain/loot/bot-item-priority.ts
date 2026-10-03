/**
 * Discord /priority: who has an item ranked highest on an approved loot list (GH #325)
 *
 * The route that backs the bot's /priority command (app/api/bot/priority/route.ts)
 * answers from approved loot_submissions and their live loot_submission_items rows,
 * the same way the master sheet does. These three pure functions hold the rules the
 * route applies after it has read those rows: which raid tiers to search and show
 * (the officers' Loot and Ranks toggles), which ranking rows count toward a raider's
 * answer (active membership, removed rows and copies already received left out), and
 * how the final list is ordered.
 *
 * None of these functions reads a database or mutates its inputs.
 */

import { pickReceivedEntries } from '@/domain/loot/apply-receive-skip'

export interface BotTier {
  id: string
  is_guild_active: boolean | null
  master_sheet_visible: boolean | null
}

export interface SplitBotTiersResult {
  /** Tiers with Loot on: the item catalog the bot may search at all. */
  lootTierIds: string[]
  /** The subset of lootTierIds with Ranks on: tiers the bot may show rankings for. */
  rankedTierIds: string[]
  /** lootTierIds minus rankedTierIds: Loot on, Ranks off (or NULL) tiers. */
  hiddenTierIds: string[]
}

/**
 * Splits a guild's active-expansion raid tiers by the Loot and Ranks toggles
 * (raid_tiers.is_guild_active and .master_sheet_visible). Loot off means the item
 * is not on this guild's lists at all, so those tiers are left out of every list.
 * Ranks off, including NULL, means hidden, matching the falsy check in
 * domain/loot/master-sheet-gate.ts. All three lists keep the input order.
 */
export function splitBotTiers(tiers: BotTier[]): SplitBotTiersResult {
  const lootTierIds: string[] = []
  const rankedTierIds: string[] = []
  const hiddenTierIds: string[] = []

  for (const tier of tiers) {
    if (tier.is_guild_active !== true) continue
    lootTierIds.push(tier.id)
    if (tier.master_sheet_visible === true) {
      rankedTierIds.push(tier.id)
    } else {
      hiddenTierIds.push(tier.id)
    }
  }

  return { lootTierIds, rankedTierIds, hiddenTierIds }
}

export interface CandidateRow {
  rank: number
  slot: number
  submission_id: string | null
  loot_item_id: string | null
}

export interface ApprovedSubmission {
  id: string
  character_id: string | null
}

export interface ItemCandidate {
  characterId: string
  rank: number
  slot: number
}

export interface CollectItemCandidatesArgs {
  rows: CandidateRow[]
  approvedSubmissions: ApprovedSubmission[]
  inactiveCharacterIds: Iterable<string>
  receivedCounts: ReadonlyMap<string, number> | null
  wowheadId: number | null
}

interface CandidateEntry {
  characterId: string
  rank: number
  slot: number
  key: string
}

/**
 * Builds the candidate list for one item's ranking rows. A row counts only when its
 * submission_id points at an approved submission whose character_id is a non-null
 * string not in inactiveCharacterIds (so draft, pending and rejected lists, another
 * guild's lists, and departed raiders never appear). When wowheadId and
 * receivedCounts are both available, the same rule the master sheet uses
 * (pickReceivedEntries, keyed `${characterId}-${wowheadId}`) drops one entry per
 * award, best rank first. The remaining entries are collapsed to one candidate per
 * character: the highest rank, and on a rank tie the lower slot. Characters are
 * returned in the order they were first seen in rows.
 */
export function collectItemCandidates({
  rows,
  approvedSubmissions,
  inactiveCharacterIds,
  receivedCounts,
  wowheadId,
}: CollectItemCandidatesArgs): ItemCandidate[] {
  const inactive = new Set(inactiveCharacterIds)
  const approvedById = new Map(approvedSubmissions.map((sub) => [sub.id, sub]))

  const entries: CandidateEntry[] = []
  const firstSeenOrder: string[] = []
  const seenCharacters = new Set<string>()

  for (const row of rows) {
    if (!row.submission_id) continue
    const submission = approvedById.get(row.submission_id)
    if (!submission) continue
    const characterId = submission.character_id
    if (!characterId || typeof characterId !== 'string') continue
    if (inactive.has(characterId)) continue

    if (!seenCharacters.has(characterId)) {
      seenCharacters.add(characterId)
      firstSeenOrder.push(characterId)
    }

    entries.push({
      characterId,
      rank: row.rank,
      slot: row.slot,
      key: wowheadId != null ? `${characterId}-${wowheadId}` : '',
    })
  }

  let kept = entries
  if (wowheadId != null && receivedCounts != null) {
    const picked = pickReceivedEntries(entries, receivedCounts)
    kept = entries.filter((entry) => !picked.has(entry))
  }

  const bestByCharacter = new Map<string, CandidateEntry>()
  for (const entry of kept) {
    const existing = bestByCharacter.get(entry.characterId)
    if (!existing) {
      bestByCharacter.set(entry.characterId, entry)
      continue
    }
    if (entry.rank > existing.rank || (entry.rank === existing.rank && entry.slot < existing.slot)) {
      bestByCharacter.set(entry.characterId, entry)
    }
  }

  const result: ItemCandidate[] = []
  for (const characterId of firstSeenOrder) {
    const best = bestByCharacter.get(characterId)
    if (best) result.push({ characterId: best.characterId, rank: best.rank, slot: best.slot })
  }
  return result
}

export interface CharacterInfo {
  name: string
  className: string | null
}

export interface OrderedItemCandidate {
  characterId: string
  name: string
  className: string | null
  rank: number
}

/**
 * Orders candidates for the /priority reply: rank descending, then slot ascending,
 * then name case-insensitively, then characterId ascending, keeping only the first
 * `limit`. A candidate missing from `characters` is dropped, as the master sheet
 * skips a ranking with no character row.
 */
export function orderItemCandidates(
  candidates: ItemCandidate[],
  characters: ReadonlyMap<string, CharacterInfo>,
  limit: number
): OrderedItemCandidate[] {
  const withInfo: Array<ItemCandidate & CharacterInfo> = []
  for (const candidate of candidates) {
    const info = characters.get(candidate.characterId)
    if (!info) continue
    withInfo.push({ ...candidate, ...info })
  }

  withInfo.sort((a, b) => {
    if (b.rank !== a.rank) return b.rank - a.rank
    if (a.slot !== b.slot) return a.slot - b.slot
    const nameCompare = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    if (nameCompare !== 0) return nameCompare
    if (a.characterId < b.characterId) return -1
    if (a.characterId > b.characterId) return 1
    return 0
  })

  return withInfo.slice(0, limit).map((c) => ({
    characterId: c.characterId,
    name: c.name,
    className: c.className,
    rank: c.rank,
  }))
}
