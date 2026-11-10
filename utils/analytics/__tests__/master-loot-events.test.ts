import { describe, it, expect } from 'vitest'
import { buildMasterLootAwardedProps, summarizeSubmissionItems } from '../master-loot-events'

describe('buildMasterLootAwardedProps', () => {
  it('returns exactly the id and count properties, nothing else', () => {
    expect(
      buildMasterLootAwardedProps({
        guildId: 'g1',
        submissionId: 's1',
        status: 'approved',
        itemCount: 2,
        lootItemIds: ['li-a', 'li-b'],
      })
    ).toEqual({
      guild_id: 'g1',
      submission_id: 's1',
      new_status: 'approved',
      item_count: 2,
      loot_item_ids: ['li-a', 'li-b'],
    })
  })

  it('[E-14] reports an empty list as zero items and an empty array, not null', () => {
    const props = buildMasterLootAwardedProps({
      guildId: 'g1',
      submissionId: 's1',
      status: 'approved',
      itemCount: 0,
      lootItemIds: [],
    })
    expect(props.item_count).toBe(0)
    expect(props.loot_item_ids).toEqual([])
  })

  it('[E-14] reports unknown as null when the submission was not in local state', () => {
    const props = buildMasterLootAwardedProps({
      guildId: 'g1',
      submissionId: 's1',
      status: 'rejected',
      itemCount: undefined,
      lootItemIds: undefined,
    })
    expect(props.item_count).toBeNull()
    expect(props.loot_item_ids).toBeNull()
    expect(props.new_status).toBe('rejected')
  })

  it('[E-16] keeps list order and duplicates, and returns a copy of the input array', () => {
    const input = ['li-b', 'li-a', 'li-b']
    const props = buildMasterLootAwardedProps({
      guildId: 'g1',
      submissionId: 's1',
      status: 'approved',
      itemCount: 3,
      lootItemIds: input,
    })
    expect(props.loot_item_ids).toEqual(['li-b', 'li-a', 'li-b'])
    expect(props.loot_item_ids).not.toBe(input)
    input.push('li-z')
    expect(props.loot_item_ids).toEqual(['li-b', 'li-a', 'li-b'])
  })

  it('[E-15] sends only the five keys, and every value is a string, number, null or an array of strings', () => {
    const props = buildMasterLootAwardedProps({
      guildId: null,
      submissionId: 's1',
      status: 'approved',
      itemCount: 1,
      lootItemIds: ['li-a'],
    })
    expect(Object.keys(props).sort()).toEqual(
      ['guild_id', 'item_count', 'loot_item_ids', 'new_status', 'submission_id'].sort()
    )
    expect(props).not.toHaveProperty('character_name')
    expect(props).not.toHaveProperty('item_name')
    for (const value of Object.values(props)) {
      const ok =
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        (Array.isArray(value) && value.every((entry) => typeof entry === 'string'))
      expect(ok).toBe(true)
    }
  })

  it('[E-14] a failed item read flows through as unknown, not a false zero', () => {
    const summary = summarizeSubmissionItems({ data: null, error: { message: 'boom' } })
    const props = buildMasterLootAwardedProps({
      guildId: 'g1',
      submissionId: 's1',
      status: 'approved',
      itemCount: summary.itemCount,
      lootItemIds: summary.lootItemIds,
    })
    expect(props.item_count).toBeNull()
    expect(props.loot_item_ids).toBeNull()
  })
})

describe('summarizeSubmissionItems', () => {
  it('[E-14] a failed read (error set) is unknown, not zero', () => {
    expect(summarizeSubmissionItems({ data: null, error: { message: 'boom' } })).toEqual({
      itemCount: null,
      lootItemIds: null,
    })
  })

  it('[E-14] an error with partial data is still unknown', () => {
    expect(
      summarizeSubmissionItems({ data: [{ loot_item_id: 'li-a' }], error: { message: 'boom' } })
    ).toEqual({ itemCount: null, lootItemIds: null })
  })

  it('[E-14] null data with no error is unknown', () => {
    expect(summarizeSubmissionItems({ data: null, error: null })).toEqual({
      itemCount: null,
      lootItemIds: null,
    })
  })

  it('[E-14] an empty read is a list with zero items', () => {
    expect(summarizeSubmissionItems({ data: [], error: null })).toEqual({
      itemCount: 0,
      lootItemIds: [],
    })
  })

  it('[E-16] counts every live row, skips null ids and keeps read order', () => {
    expect(
      summarizeSubmissionItems({
        data: [{ loot_item_id: 'li-b' }, { loot_item_id: null }, { loot_item_id: 'li-a' }],
        error: null,
      })
    ).toEqual({ itemCount: 3, lootItemIds: ['li-b', 'li-a'] })
  })
})
