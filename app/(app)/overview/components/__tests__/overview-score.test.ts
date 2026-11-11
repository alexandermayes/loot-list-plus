import { describe, expect, it } from 'vitest'

import { buildOverviewScoreExplanation, topPickRank } from '@/app/(app)/overview/components/overview-score'
import type { ScoreInput } from '@/domain/scoring'

// Synthetic raider: attendance 3 and nothing else, so standing is easy to read.
const input: ScoreInput = {
  itemRank: 0,
  character: { characterId: 'char-1', specId: null, specRoles: [], guildRank: 'Member', membershipStatus: 'full' },
  attendance: { score: 3 },
  config: {},
  itemPriority: null,
  timesPassed: 0,
  donationBonus: 0,
  asOfDate: '2026-11-10',
}

describe('topPickRank', () => {
  it('is the highest rank on the list: rank 50 is the number 1 pick', () => {
    expect(topPickRank([12, 50, 31])).toBe(50)
  })

  it('is 0 when no pick is left', () => {
    expect(topPickRank([])).toBe(0)
  })
})

describe('buildOverviewScoreExplanation (D-21, UI-11)', () => {
  it('takes interest from the number 1 pick and adds it to the standing', () => {
    const explanation = buildOverviewScoreExplanation(input, 50, 2)

    expect(explanation.interest.value).toBe(50)
    expect(explanation.interest.sentence).toBe('Interest 50: your number 1 pick.')
    expect(explanation.standing.value).toBe(explanation.total - 50)
    expect(explanation.standing.sentence.startsWith('Standing ')).toBe(true)
  })

  it('shows Interest 0 with the no-pick sentence, and Total equals Standing, when nothing is picked', () => {
    const explanation = buildOverviewScoreExplanation(input, 0, 2)

    expect(explanation.interest.value).toBe(0)
    expect(explanation.interest.sentence).toBe('Interest 0: no picks on your list yet.')
    expect(explanation.total).toBe(explanation.standing.value)
  })

  it('keeps the same standing whatever the pick, so only interest moves the total', () => {
    const withPick = buildOverviewScoreExplanation(input, 47, 2)
    const without = buildOverviewScoreExplanation(input, 0, 2)

    expect(withPick.standing.value).toBe(without.standing.value)
    expect(withPick.total - without.total).toBe(47)
  })

  it('writes sentence numbers to the guild decimal places', () => {
    const oneDecimal = buildOverviewScoreExplanation({ ...input, attendance: { score: 3.14159 } }, 0, 1)

    expect(oneDecimal.standing.sentence).toContain('attendance 3.1')
    expect(oneDecimal.standing.sentence).not.toContain('3.14')
  })
})
