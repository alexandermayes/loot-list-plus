// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { matchAwardSession } from '../award-session'

function session(overrides: Record<string, unknown> = {}) {
  return {
    raidDate: '2026-09-20',
    raidName: " Temple of Ahn'Qiraj ",
    startTime: '2026-09-20T23:00:00Z',
    endTime: '2026-09-21T03:00:00Z',
    bossKills: [
      { bossName: 'The Prophet Skeram', killTime: '2026-09-20T23:30:00Z', roster: [] },
      { bossName: "C'Thun", killTime: '2026-09-21T02:00:00Z', roster: [] },
    ],
    attended: [],
    ...overrides,
  }
}

describe('matchAwardSession', () => {
  it('an award inside the session gives its raidDate, trimmed live raid name and latest prior boss', () => {
    expect(matchAwardSession('2026-09-21T02:05:00Z', [session()])).toEqual({
      raidDate: '2026-09-20',
      raidName: "Temple of Ahn'Qiraj",
      bossName: "C'Thun",
    })
  })

  it('bossName is the latest kill at or before the award', () => {
    expect(matchAwardSession('2026-09-21T01:00:00Z', [session()])?.bossName).toBe('The Prophet Skeram')
    expect(matchAwardSession('2026-09-21T02:00:00Z', [session()])?.bossName).toBe("C'Thun")
  })

  it('an award before the first kill has bossName null', () => {
    expect(matchAwardSession('2026-09-20T23:10:00Z', [session()])?.bossName).toBeNull()
  })

  it('includes the start and end instants', () => {
    expect(matchAwardSession('2026-09-20T23:00:00Z', [session()])).not.toBeNull()
    expect(matchAwardSession('2026-09-21T03:00:00Z', [session()])).not.toBeNull()
  })

  it('an award before the start or after the end gives null', () => {
    expect(matchAwardSession('2026-09-20T22:59:59Z', [session()])).toBeNull()
    expect(matchAwardSession('2026-09-21T03:00:01Z', [session()])).toBeNull()
  })

  it('an unparseable awardedAt gives null', () => {
    expect(matchAwardSession('yesterday', [session()])).toBeNull()
    expect(matchAwardSession(undefined, [session()])).toBeNull()
    expect(matchAwardSession(12345, [session()])).toBeNull()
  })

  it('sessions that are not an array give null', () => {
    expect(matchAwardSession('2026-09-21T01:00:00Z', undefined)).toBeNull()
    expect(matchAwardSession('2026-09-21T01:00:00Z', { raidDate: '2026-09-20' })).toBeNull()
  })

  it('skips a session with a non-ISO startTime or endTime', () => {
    expect(matchAwardSession('2026-09-21T01:00:00Z', [session({ startTime: '20:00' })])).toBeNull()
    expect(matchAwardSession('2026-09-21T01:00:00Z', [session({ endTime: '' })])).toBeNull()
  })

  it('skips a session with an invalid raidDate', () => {
    expect(matchAwardSession('2026-09-21T01:00:00Z', [session({ raidDate: '2026-02-30' })])).toBeNull()
    expect(matchAwardSession('2026-09-21T01:00:00Z', [session({ raidDate: null })])).toBeNull()
  })

  it('skips null and non-object entries', () => {
    expect(matchAwardSession('2026-09-21T01:00:00Z', [null, 'x', session()])?.raidDate).toBe('2026-09-20')
  })

  it('with overlapping sessions the latest start wins', () => {
    const early = session({ raidDate: '2026-09-20', startTime: '2026-09-20T18:00:00Z', raidName: "Ruins of Ahn'Qiraj", bossKills: [] })
    const late = session({ raidDate: '2026-09-20', startTime: '2026-09-20T23:00:00Z' })
    const result = matchAwardSession('2026-09-21T02:30:00Z', [late, early])
    expect(result?.raidName).toBe("Temple of Ahn'Qiraj")
    expect(matchAwardSession('2026-09-21T02:30:00Z', [early, late])?.raidName).toBe("Temple of Ahn'Qiraj")
  })

  it('ignores kills with a bad killTime or an empty bossName', () => {
    const s = session({
      bossKills: [
        { bossName: 'Good Boss', killTime: '2026-09-20T23:30:00Z' },
        { bossName: 'Bad Time', killTime: 'later' },
        { bossName: '   ', killTime: '2026-09-21T00:30:00Z' },
        null,
      ],
    })
    expect(matchAwardSession('2026-09-21T01:00:00Z', [s])?.bossName).toBe('Good Boss')
  })

  it('an empty or missing raidName gives null', () => {
    expect(matchAwardSession('2026-09-21T01:00:00Z', [session({ raidName: '  ' })])?.raidName).toBeNull()
    expect(matchAwardSession('2026-09-21T01:00:00Z', [session({ raidName: undefined })])?.raidName).toBeNull()
  })

  it('a missing bossKills array gives bossName null', () => {
    expect(matchAwardSession('2026-09-21T01:00:00Z', [session({ bossKills: undefined })])?.bossName).toBeNull()
  })
})
