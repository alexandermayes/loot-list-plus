import { describe, it, expect } from 'vitest'
import {
  normalizeRaiderModifiers,
  tidyRaiderModifiers,
  validateRaiderModifiers,
  addRaiderBonusBatch,
  removeRaiderBonusBatch,
  removeRaiderBonusEntry,
  raiderBonusStatus,
  groupRaiderBonuses,
  resolveBonusWindow,
  formatBonusDate,
  describeRaiderBonusEntries,
  RAIDER_BONUS_MAX_RAIDERS,
  RAIDER_BONUS_MAX_ENTRIES_PER_RAIDER,
  type RaiderBonusMap,
} from '../raider-bonus'
import { getNextResetWeek } from '../attendance'
import { resolveActiveRaiderModifiers, isRaiderBonusEntryActive } from '../modifiers'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'

const ERR = {
  grouped: 'Raider bonuses must be grouped by raider.',
  raider: 'A raider bonus has an unknown raider.',
  amount: 'Each raider bonus needs a number for its amount.',
  date: 'Raider bonus dates must be real dates (YYYY-MM-DD).',
  order: "A raider bonus can't end before it starts.",
  label: 'A raider bonus reason can be up to 60 characters.',
  batch: 'A raider bonus has an invalid batch id.',
  size: 'Too many raider bonuses. Remove some and try again.',
}

describe('normalizeRaiderModifiers', () => {
  it('keeps the new optional fields when they are strings', () => {
    const out = normalizeRaiderModifiers({
      [A]: [{ amount: 2, expires_at: '2026-10-12', starts_at: '2026-10-06', label: 'Full enchants', batch_id: 'batch-0001' }],
    })
    expect(out).toEqual({
      [A]: [{ amount: 2, expires_at: '2026-10-12', starts_at: '2026-10-06', label: 'Full enchants', batch_id: 'batch-0001' }],
    })
  })

  it('maps a legacy flat number to a permanent entry', () => {
    expect(normalizeRaiderModifiers({ [A]: 20 })).toEqual({ [A]: [{ amount: 20, expires_at: null }] })
  })

  it('drops entries whose amount is not a number', () => {
    expect(normalizeRaiderModifiers({ [A]: [{ amount: '5', expires_at: null }, { amount: 1 }] }))
      .toEqual({ [A]: [{ amount: 1, expires_at: null }] })
  })

  it('returns an empty map for null, undefined and arrays', () => {
    expect(normalizeRaiderModifiers(null)).toEqual({})
    expect(normalizeRaiderModifiers(undefined)).toEqual({})
    expect(normalizeRaiderModifiers([{ amount: 1 }])).toEqual({})
  })
})

describe('tidyRaiderModifiers', () => {
  it('drops ended entries and raiders left with none, without mutating the input', () => {
    const input: RaiderBonusMap = {
      [A]: [
        { amount: 1, expires_at: '2026-10-05' },
        { amount: 2, expires_at: '2026-10-06' },
        { amount: 3, expires_at: null },
        { amount: 4, starts_at: '2026-10-13', expires_at: '2026-10-19' },
      ],
      [B]: [{ amount: 5, expires_at: '2026-09-01' }],
    }
    const snapshot = JSON.parse(JSON.stringify(input))
    const out = tidyRaiderModifiers(input, '2026-10-06')
    expect(out).toEqual({
      [A]: [
        { amount: 2, expires_at: '2026-10-06' },
        { amount: 3, expires_at: null },
        { amount: 4, starts_at: '2026-10-13', expires_at: '2026-10-19' },
      ],
    })
    expect(input).toEqual(snapshot)
  })
})

describe('validateRaiderModifiers', () => {
  it('accepts an empty map', () => {
    expect(validateRaiderModifiers({})).toEqual({ ok: true, value: {} })
  })

  it('returns a sanitised copy of a valid map', () => {
    const result = validateRaiderModifiers({
      [A]: [
        { amount: 2, starts_at: '2026-10-06', expires_at: '2026-10-12', label: '  Full enchants  ', batch_id: 'b1b1b1b1-0000', note: 'drop me' },
        { amount: -1, expires_at: null, label: '   ', starts_at: null, batch_id: null },
        { amount: 5 },
      ],
    })
    expect(result).toEqual({
      ok: true,
      value: {
        [A]: [
          { amount: 2, expires_at: '2026-10-12', starts_at: '2026-10-06', label: 'Full enchants', batch_id: 'b1b1b1b1-0000' },
          { amount: -1, expires_at: null },
          { amount: 5, expires_at: null },
        ],
      },
    })
  })

  it.each([
    ['a string', 'nope', ERR.grouped],
    ['an array', [], ERR.grouped],
    ['null', null, ERR.grouped],
    ['a raider value that is not an array', { [A]: 5 }, ERR.grouped],
    ['a non-UUID raider key', { 'char-1': [{ amount: 1, expires_at: null }] }, ERR.raider],
    ['a string amount', { [A]: [{ amount: '5', expires_at: null }] }, ERR.amount],
    ['a NaN amount', { [A]: [{ amount: NaN, expires_at: null }] }, ERR.amount],
    ['a missing amount', { [A]: [{ expires_at: null }] }, ERR.amount],
    ['an entry that is not an object', { [A]: [3] }, ERR.amount],
    ['an impossible date', { [A]: [{ amount: 1, expires_at: '2026-02-30' }] }, ERR.date],
    ['an unpadded date', { [A]: [{ amount: 1, starts_at: '2026-1-5', expires_at: null }] }, ERR.date],
    ['a start after the end', { [A]: [{ amount: 1, starts_at: '2026-10-13', expires_at: '2026-10-12' }] }, ERR.order],
    ['a 61-character reason', { [A]: [{ amount: 1, expires_at: null, label: `  ${'x'.repeat(61)}  ` }] }, ERR.label],
    ['a short batch id', { [A]: [{ amount: 1, expires_at: null, batch_id: 'x' }] }, ERR.batch],
    ['a batch id with a space', { [A]: [{ amount: 1, expires_at: null, batch_id: 'batch 0001' }] }, ERR.batch],
  ])('rejects %s', (_name, raw, error) => {
    expect(validateRaiderModifiers(raw)).toEqual({ ok: false, error })
  })

  it('accepts a 60-character reason after trimming', () => {
    const result = validateRaiderModifiers({ [A]: [{ amount: 1, expires_at: null, label: ` ${'x'.repeat(60)} ` }] })
    expect(result.ok).toBe(true)
  })

  it('rejects more raiders than the limit', () => {
    const raw: Record<string, unknown> = {}
    for (let i = 0; i < RAIDER_BONUS_MAX_RAIDERS + 1; i++) {
      const hex = i.toString(16).padStart(12, '0')
      raw[`00000000-0000-4000-8000-${hex}`] = [{ amount: 1, expires_at: null }]
    }
    expect(validateRaiderModifiers(raw)).toEqual({ ok: false, error: ERR.size })
  })

  it('rejects more entries for one raider than the limit', () => {
    const entries = Array.from({ length: RAIDER_BONUS_MAX_ENTRIES_PER_RAIDER + 1 }, () => ({ amount: 1, expires_at: null }))
    expect(validateRaiderModifiers({ [A]: entries })).toEqual({ ok: false, error: ERR.size })
  })
})

describe('batch helpers', () => {
  const base: RaiderBonusMap = { [A]: [{ amount: 10, expires_at: null }] }

  it('addRaiderBonusBatch dedupes raiders, appends, shares one batch id and omits a null label', () => {
    const out = addRaiderBonusBatch(base, [A, B, A], { amount: 2, starts_at: '2026-10-06', expires_at: '2026-10-12', label: null }, 'batch-0001')
    expect(out).toEqual({
      [A]: [
        { amount: 10, expires_at: null },
        { amount: 2, starts_at: '2026-10-06', expires_at: '2026-10-12', batch_id: 'batch-0001' },
      ],
      [B]: [{ amount: 2, starts_at: '2026-10-06', expires_at: '2026-10-12', batch_id: 'batch-0001' }],
    })
    expect(base).toEqual({ [A]: [{ amount: 10, expires_at: null }] })
  })

  it('addRaiderBonusBatch keeps a label', () => {
    const out = addRaiderBonusBatch({}, [A], { amount: 2, starts_at: null, expires_at: '2026-10-05', label: 'Full enchants' }, 'batch-0001')
    expect(out[A][0]).toEqual({ amount: 2, expires_at: '2026-10-05', label: 'Full enchants', batch_id: 'batch-0001' })
  })

  it('removeRaiderBonusBatch removes only that batch and drops emptied raiders', () => {
    const withBatch = addRaiderBonusBatch(base, [A, B], { amount: 2, starts_at: null, expires_at: '2026-10-05', label: null }, 'batch-0001')
    const withTwo = addRaiderBonusBatch(withBatch, [C], { amount: 1, starts_at: null, expires_at: '2026-10-05', label: null }, 'batch-0002')
    expect(removeRaiderBonusBatch(withTwo, 'batch-0001')).toEqual({
      [A]: [{ amount: 10, expires_at: null }],
      [C]: [{ amount: 1, expires_at: '2026-10-05', batch_id: 'batch-0002' }],
    })
  })

  it('removeRaiderBonusEntry removes one index and drops emptied raiders', () => {
    const mods: RaiderBonusMap = { [A]: [{ amount: 1, expires_at: null }, { amount: 2, expires_at: null }], [B]: [{ amount: 3, expires_at: null }] }
    expect(removeRaiderBonusEntry(mods, A, 0)).toEqual({ [A]: [{ amount: 2, expires_at: null }], [B]: [{ amount: 3, expires_at: null }] })
    expect(removeRaiderBonusEntry(mods, B, 0)).toEqual({ [A]: mods[A] })
  })
})

describe('raiderBonusStatus', () => {
  it('reports active, upcoming and ended', () => {
    expect(raiderBonusStatus({ amount: 1, expires_at: null }, '2026-10-06')).toBe('active')
    expect(raiderBonusStatus({ amount: 1, starts_at: '2026-10-06', expires_at: '2026-10-06' }, '2026-10-06')).toBe('active')
    expect(raiderBonusStatus({ amount: 1, starts_at: '2026-10-07', expires_at: '2026-10-13' }, '2026-10-06')).toBe('upcoming')
    expect(raiderBonusStatus({ amount: 1, expires_at: '2026-10-05' }, '2026-10-06')).toBe('ended')
  })
})

describe('groupRaiderBonuses', () => {
  const names: Record<string, string> = { [A]: 'Zev', [B]: 'Deny', [C]: 'Check' }
  const nameOf = (id: string) => names[id] || ''

  it('groups batches, sorts raiders and singles by name, orders batches by status and counts ended entries', () => {
    const mods: RaiderBonusMap = {
      [A]: [
        { amount: 2, label: 'Full enchants', starts_at: '2026-10-06', expires_at: '2026-10-12', batch_id: 'b1-00000' },
        { amount: 5, expires_at: null },
        { amount: 1, expires_at: '2026-10-01', batch_id: 'b3-00000' },
      ],
      [B]: [
        { amount: 2, label: 'Full enchants', starts_at: '2026-10-06', expires_at: '2026-10-12', batch_id: 'b1-00000' },
        { amount: 3, starts_at: '2026-10-13', expires_at: '2026-10-19', batch_id: 'b2-00000' },
      ],
      [C]: [{ amount: -1, expires_at: '2026-10-02' }],
    }
    const { batches, singles, endedCount } = groupRaiderBonuses(mods, '2026-10-06', nameOf)

    expect(batches.map(b => b.batchId)).toEqual(['b1-00000', 'b2-00000', 'b3-00000'])
    expect(batches[0]).toEqual({
      batchId: 'b1-00000',
      label: 'Full enchants',
      amount: 2,
      starts_at: '2026-10-06',
      expires_at: '2026-10-12',
      status: 'active',
      raiders: [{ characterId: B, index: 0 }, { characterId: A, index: 0 }],
    })
    expect(batches[1].status).toBe('upcoming')
    expect(batches[2].status).toBe('ended')
    expect(batches[2].raiders).toEqual([{ characterId: A, index: 2 }])

    expect(singles.map(s => [nameOf(s.characterId), s.index, s.status])).toEqual([
      ['Check', 0, 'ended'],
      ['Zev', 1, 'active'],
    ])
    expect(endedCount).toBe(2)
  })
})

describe('getNextResetWeek', () => {
  it('starts on the next reset day and lasts one reset week', () => {
    expect(getNextResetWeek('2026-09-30', 2)).toEqual({ starts_at: '2026-10-06', expires_at: '2026-10-12' })
    expect(getNextResetWeek('2026-10-06', 2)).toEqual({ starts_at: '2026-10-13', expires_at: '2026-10-19' })
    expect(getNextResetWeek('2026-09-30', 3)).toEqual({ starts_at: '2026-10-07', expires_at: '2026-10-13' })
  })

  it('falls back to a Tuesday reset when the reset day is null', () => {
    expect(getNextResetWeek('2026-09-30', null)).toEqual({ starts_at: '2026-10-06', expires_at: '2026-10-12' })
  })
})

describe('resolveBonusWindow', () => {
  const today = '2026-09-30'
  it('resolves this week, next week and custom dates', () => {
    expect(resolveBonusWindow('this-week', today, 2)).toEqual({ ok: true, starts_at: null, expires_at: '2026-10-05' })
    expect(resolveBonusWindow('next-week', today, 2)).toEqual({ ok: true, starts_at: '2026-10-06', expires_at: '2026-10-12' })
    expect(resolveBonusWindow('custom', today, 2, { start: '2026-10-01', end: '2026-10-03' }))
      .toEqual({ ok: true, starts_at: '2026-10-01', expires_at: '2026-10-03' })
  })

  it('reports why a custom window cannot be used', () => {
    expect(resolveBonusWindow('custom', today, 2, { start: '2026-10-05', end: '2026-10-03' })).toEqual({ ok: false, reason: 'end-before-start' })
    expect(resolveBonusWindow('custom', today, 2, { start: '2026-09-20', end: '2026-09-29' })).toEqual({ ok: false, reason: 'end-in-past' })
    expect(resolveBonusWindow('custom', today, 2, { start: '2026-10-01', end: '' })).toEqual({ ok: false, reason: 'missing' })
    expect(resolveBonusWindow('custom', today, 2)).toEqual({ ok: false, reason: 'missing' })
  })
})

describe('formatBonusDate', () => {
  it('uses short English month names and an unpadded day', () => {
    expect(formatBonusDate('2026-10-06')).toBe('Oct 6')
    expect(formatBonusDate('2026-01-31')).toBe('Jan 31')
  })
})

describe('describeRaiderBonusEntries', () => {
  it('builds the raider-facing detail', () => {
    expect(describeRaiderBonusEntries([
      { amount: 2, label: 'Full enchants', expires_at: '2026-10-12' },
      { amount: 5, expires_at: null },
      { amount: 0.5, expires_at: null },
      { amount: -2, expires_at: '2026-10-05' },
    ])).toBe('Full enchants: +2 until Oct 12. Officer bonus: +5. Officer bonus: +0.5. Officer penalty: -2 until Oct 5')
  })
})

describe('resolveActiveRaiderModifiers with start dates', () => {
  it('sums active entries, skips upcoming and ended ones, drops zero nets and tolerates legacy values', () => {
    const mods = {
      [A]: [
        { amount: 20, expires_at: null },
        { amount: 3, starts_at: '2026-10-06', expires_at: '2026-10-12' },
        { amount: 5, starts_at: '2026-10-07', expires_at: '2026-10-13' },
      ],
      [B]: [{ amount: 4, expires_at: '2026-10-05' }],
      [C]: [{ amount: 2, expires_at: null }, { amount: -2, expires_at: null }],
      legacy: 7,
    } as unknown as RaiderBonusMap
    expect(resolveActiveRaiderModifiers(mods, '2026-10-06')).toEqual({ [A]: 23 })
  })

  it('shares one predicate with the score engine', () => {
    const entry = { amount: 1, starts_at: '2026-10-06', expires_at: '2026-10-12' }
    expect(isRaiderBonusEntryActive(entry, '2026-10-05')).toBe(false)
    expect(isRaiderBonusEntryActive(entry, '2026-10-06')).toBe(true)
    expect(isRaiderBonusEntryActive(entry, undefined)).toBe(false)
    expect(isRaiderBonusEntryActive({ amount: 1, expires_at: null }, undefined)).toBe(true)
  })
})
