// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  NEED_RANKING_HELD,
  NEED_RANKING_HOLD_ERROR,
  isHeldNeedRanking,
} from '../need-ranking-hold'

describe('isHeldNeedRanking (D-22)', () => {
  it('holds a need row while the hold is on', () => {
    expect(NEED_RANKING_HELD).toBe(true)
    expect(isHeldNeedRanking({ kind: 'need' })).toBe(true)
  })

  it('never holds an item row, a row with no kind, null or undefined', () => {
    expect(isHeldNeedRanking({ kind: 'item' })).toBe(false)
    expect(isHeldNeedRanking({})).toBe(false)
    expect(isHeldNeedRanking({ kind: null })).toBe(false)
    expect(isHeldNeedRanking(null)).toBe(false)
    expect(isHeldNeedRanking(undefined)).toBe(false)
  })
})

describe('NEED_RANKING_HOLD_ERROR', () => {
  it('has no em dash or en dash', () => {
    expect(NEED_RANKING_HOLD_ERROR).not.toMatch(/[–—]/)
    expect(NEED_RANKING_HOLD_ERROR.length).toBeGreaterThan(0)
  })
})
