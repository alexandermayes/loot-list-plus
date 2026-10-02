// @vitest-environment node
// Runs in the root vitest suite. companion/tsconfig.json excludes
// __tests__, so the companion typecheck never needs vitest's types.
import { describe, it, expect } from 'vitest'
import { toPendingAwardRequests } from '../addon-format'
// Relative, not '@/': inside companion/ that alias points at companion/src.
import { addonAwardKeys } from '../../../../lib/loot/addon-award-insert'

const AWARDED_AT = '2026-09-20T20:00:00Z'
const AWARD_ID = '2026-09-20T20:00:00Z-1-a1b2c3'

describe('toPendingAwardRequests (FU-A of 261001-tv5, D-07)', () => {
  it('P1 forwards the date part as awarded_date and the raw awardedAt as awarded_at', () => {
    const [request] = toPendingAwardRequests([
      { wowheadId: 20928, characterName: 'Thrall', bossName: 'Shared Boss Loot', awardedAt: AWARDED_AT },
    ])
    expect(request).toEqual({
      wowhead_id: 20928,
      character_name: 'Thrall',
      boss_name: 'Shared Boss Loot',
      awarded_date: '2026-09-20',
      awarded_at: AWARDED_AT,
      award_id: undefined,
    })
  })

  it('P2 forwards a string awardId as award_id; without one the request has no award_id key', () => {
    const [withId, withoutId] = toPendingAwardRequests([
      { wowheadId: 20928, characterName: 'Thrall', awardedAt: AWARDED_AT, awardId: AWARD_ID },
      { wowheadId: 20928, characterName: 'Thrall', awardedAt: AWARDED_AT },
    ])
    expect(withId.award_id).toBe(AWARD_ID)
    expect(withoutId.award_id).toBeUndefined()
    expect(JSON.parse(JSON.stringify(withoutId))).not.toHaveProperty('award_id')
    expect(JSON.parse(JSON.stringify(withId))).toMatchObject({ award_id: AWARD_ID, awarded_at: AWARDED_AT })
  })

  it('P3 a non-string awardedAt or awardId leaves those fields undefined without throwing', () => {
    const [request] = toPendingAwardRequests([
      { wowheadId: 20928, characterName: 'Thrall', awardedAt: 1758398400, awardId: 7 },
    ])
    expect(request.awarded_date).toBeUndefined()
    expect(request.awarded_at).toBeUndefined()
    expect(request.award_id).toBeUndefined()
  })

  it('P4 a missing, empty-table or non-array pending value gives []', () => {
    expect(toPendingAwardRequests(undefined)).toEqual([])
    expect(toPendingAwardRequests(null)).toEqual([])
    // An empty Lua table parses as {}.
    expect(toPendingAwardRequests({})).toEqual([])
    expect(toPendingAwardRequests('nope')).toEqual([])
    expect(toPendingAwardRequests([])).toEqual([])
  })

  it('P5 the companion request and the export-string award give the server the same keys', () => {
    for (const award of [
      { wowheadId: 20928, characterName: 'Thrall', awardedAt: AWARDED_AT, awardId: AWARD_ID },
      { wowheadId: 20928, characterName: 'Thrall', awardedAt: AWARDED_AT },
    ]) {
      const [request] = toPendingAwardRequests([award])
      // POST /api/addon/loot-award (companion path)
      const fromCompanion = addonAwardKeys({
        awardedAt: request.awarded_at,
        wowheadId: request.wowhead_id,
        characterName: request.character_name,
        awardId: request.award_id,
      })
      // POST /api/addon/import-string (export string path)
      const fromExport = addonAwardKeys({
        awardedAt: award.awardedAt,
        wowheadId: award.wowheadId,
        characterName: award.characterName,
        awardId: award.awardId,
      })
      expect(fromCompanion).toEqual(fromExport)
      expect(fromCompanion.key).toBe(
        award.awardId ? `addon2:${AWARD_ID}:20928:thrall` : `addon:${AWARDED_AT}:20928:thrall`,
      )
    }
  })
})
