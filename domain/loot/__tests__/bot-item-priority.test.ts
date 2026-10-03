import { describe, it, expect } from 'vitest'
import { splitBotTiers, collectItemCandidates, orderItemCandidates } from '../bot-item-priority'
import type { BotTier, CandidateRow, ApprovedSubmission, ItemCandidate, CharacterInfo } from '../bot-item-priority'

function tier(id: string, isGuildActive: boolean | null, masterSheetVisible: boolean | null): BotTier {
  return { id, is_guild_active: isGuildActive, master_sheet_visible: masterSheetVisible }
}

describe('splitBotTiers', () => {
  it('puts a Loot-off tier in no list', () => {
    const result = splitBotTiers([tier('t1', false, true), tier('t2', null, true)])
    expect(result.lootTierIds).toEqual([])
    expect(result.rankedTierIds).toEqual([])
    expect(result.hiddenTierIds).toEqual([])
  })

  it('puts Ranks false or NULL in hiddenTierIds only, keeping lootTierIds order', () => {
    const result = splitBotTiers([tier('t1', true, false), tier('t2', true, null), tier('t3', true, true)])
    expect(result.lootTierIds).toEqual(['t1', 't2', 't3'])
    expect(result.rankedTierIds).toEqual(['t3'])
    expect(result.hiddenTierIds).toEqual(['t1', 't2'])
  })
})

function row(submissionId: string | null, lootItemId: string | null, rank: number, slot = 1): CandidateRow {
  return { submission_id: submissionId, loot_item_id: lootItemId, rank, slot }
}

function approved(id: string, characterId: string | null): ApprovedSubmission {
  return { id, character_id: characterId }
}

describe('collectItemCandidates', () => {
  it('drops rows of an unknown submission, a null-character submission, and an inactive character', () => {
    const rows = [row('unknown-sub', 'item1', 10), row('s-null', 'item1', 20), row('s-inactive', 'item1', 30), row('s-active', 'item1', 40)]
    const approvedSubmissions = [approved('s-null', null), approved('s-inactive', 'char-inactive'), approved('s-active', 'char-active')]

    const result = collectItemCandidates({
      rows,
      approvedSubmissions,
      inactiveCharacterIds: ['char-inactive'],
      receivedCounts: null,
      wowheadId: null,
    })

    expect(result).toEqual([{ characterId: 'char-active', rank: 40, slot: 1 }])
  })

  it('treats a Set and an array of inactiveCharacterIds the same', () => {
    const rows = [row('s1', 'item1', 10), row('s2', 'item1', 20)]
    const approvedSubmissions = [approved('s1', 'char-1'), approved('s2', 'char-2')]

    const withArray = collectItemCandidates({
      rows,
      approvedSubmissions,
      inactiveCharacterIds: ['char-1'],
      receivedCounts: null,
      wowheadId: null,
    })
    const withSet = collectItemCandidates({
      rows,
      approvedSubmissions,
      inactiveCharacterIds: new Set(['char-1']),
      receivedCounts: null,
      wowheadId: null,
    })

    expect(withArray).toEqual([{ characterId: 'char-2', rank: 20, slot: 1 }])
    expect(withSet).toEqual(withArray)
  })

  it('skips a received copy, best rank first, and drops the character entirely once every copy is received', () => {
    const rows = [row('s1', 'item1', 45, 1), row('s1', 'item1', 20, 1)]
    const approvedSubmissions = [approved('s1', 'char-A')]

    const oneReceived = collectItemCandidates({
      rows,
      approvedSubmissions,
      inactiveCharacterIds: [],
      receivedCounts: new Map([['char-A-1001', 1]]),
      wowheadId: 1001,
    })
    expect(oneReceived).toEqual([{ characterId: 'char-A', rank: 20, slot: 1 }])

    const bothReceived = collectItemCandidates({
      rows,
      approvedSubmissions,
      inactiveCharacterIds: [],
      receivedCounts: new Map([['char-A-1001', 2]]),
      wowheadId: 1001,
    })
    expect(bothReceived).toEqual([])
  })

  it('skips nothing when wowheadId is null or receivedCounts is null', () => {
    const rows = [row('s1', 'item1', 45, 1), row('s1', 'item1', 20, 1)]
    const approvedSubmissions = [approved('s1', 'char-A')]

    const nullWowhead = collectItemCandidates({
      rows,
      approvedSubmissions,
      inactiveCharacterIds: [],
      receivedCounts: new Map([['char-A-1001', 2]]),
      wowheadId: null,
    })
    expect(nullWowhead).toEqual([{ characterId: 'char-A', rank: 45, slot: 1 }])

    const nullCounts = collectItemCandidates({
      rows,
      approvedSubmissions,
      inactiveCharacterIds: [],
      receivedCounts: null,
      wowheadId: 1001,
    })
    expect(nullCounts).toEqual([{ characterId: 'char-A', rank: 45, slot: 1 }])
  })

  it('keeps one candidate per character: highest rank, lower slot on a tie, and never mutates its inputs', () => {
    const rows = [row('s1', 'item1', 30, 2), row('s1', 'item1', 30, 1), row('s1', 'item1', 10, 1)]
    const rowsCopy = JSON.parse(JSON.stringify(rows))
    const approvedSubmissions = [approved('s1', 'char-A')]
    const approvedCopy = JSON.parse(JSON.stringify(approvedSubmissions))

    const result = collectItemCandidates({
      rows,
      approvedSubmissions,
      inactiveCharacterIds: [],
      receivedCounts: null,
      wowheadId: null,
    })

    expect(result).toEqual([{ characterId: 'char-A', rank: 30, slot: 1 }])
    expect(rows).toEqual(rowsCopy)
    expect(approvedSubmissions).toEqual(approvedCopy)
  })

  it('returns candidates in first-seen order of their characters', () => {
    const rows = [row('s-b', 'item1', 10), row('s-a', 'item1', 20)]
    const approvedSubmissions = [approved('s-b', 'char-B'), approved('s-a', 'char-A')]

    const result = collectItemCandidates({
      rows,
      approvedSubmissions,
      inactiveCharacterIds: [],
      receivedCounts: null,
      wowheadId: null,
    })

    expect(result.map((c) => c.characterId)).toEqual(['char-B', 'char-A'])
  })
})

function candidate(characterId: string, rank: number, slot = 1): ItemCandidate {
  return { characterId, rank, slot }
}

describe('orderItemCandidates', () => {
  const characters = new Map<string, CharacterInfo>([
    ['char-alice', { name: 'alice', className: 'Mage' }],
    ['char-bob', { name: 'Bob', className: 'Rogue' }],
    ['char-carl', { name: 'Carl', className: null }],
    ['char-dana', { name: 'Dana', className: 'Priest' }],
  ])

  it('sorts rank descending, then slot ascending, then name case-insensitively, then characterId ascending', () => {
    const candidates = [
      candidate('char-bob', 10, 1),
      candidate('char-alice', 10, 1),
      candidate('char-carl', 10, 2),
      candidate('char-dana', 20, 1),
    ]

    const result = orderItemCandidates(candidates, characters, 10)

    expect(result.map((c) => c.characterId)).toEqual(['char-dana', 'char-alice', 'char-bob', 'char-carl'])
  })

  it('drops a candidate missing from the characters map', () => {
    const candidates = [candidate('char-alice', 10, 1), candidate('char-unknown', 20, 1)]
    const result = orderItemCandidates(candidates, characters, 10)
    expect(result.map((c) => c.characterId)).toEqual(['char-alice'])
  })

  it('honours limit', () => {
    const candidates = [
      candidate('char-alice', 40, 1),
      candidate('char-bob', 30, 1),
      candidate('char-carl', 20, 1),
      candidate('char-dana', 10, 1),
    ]
    const result = orderItemCandidates(candidates, characters, 2)
    expect(result.map((c) => c.characterId)).toEqual(['char-alice', 'char-bob'])
  })
})
