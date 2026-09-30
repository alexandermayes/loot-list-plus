import { describe, it, expect } from 'vitest'
import { splitCandidatesByMembership } from '../master-sheet-candidates'

interface Sub {
  id: string
  character_id: string | null
}
interface Rank {
  submission_id: string
  rank: number
}

function sub(id: string, characterId: string | null): Sub {
  return { id, character_id: characterId }
}

function rank(submissionId: string, rankValue: number): Rank {
  return { submission_id: submissionId, rank: rankValue }
}

describe('splitCandidatesByMembership', () => {
  it('drops a submission whose character is inactive, and its rankings, keeping others in original order', () => {
    const submissions = [sub('s1', 'active-1'), sub('s2', 'inactive-1'), sub('s3', 'active-2')]
    const rankings = [rank('s1', 1), rank('s2', 1), rank('s3', 1)]

    const result = splitCandidatesByMembership({
      submissions,
      rankings,
      inactiveCharacterIds: ['inactive-1'],
    })

    expect(result.submissions.map(s => s.id)).toEqual(['s1', 's3'])
    expect(result.rankings.map(r => r.submission_id)).toEqual(['s1', 's3'])
  })

  it('drops a submission with a null character_id and does not count it as departed', () => {
    const submissions = [sub('s1', 'active-1'), sub('s2', null)]
    const rankings = [rank('s1', 1), rank('s2', 1)]

    const result = splitCandidatesByMembership({
      submissions,
      rankings,
      inactiveCharacterIds: [],
    })

    expect(result.submissions.map(s => s.id)).toEqual(['s1'])
    expect(result.rankings.map(r => r.submission_id)).toEqual(['s1'])
    expect(result.departedCharacterIds).toEqual([])
  })

  it('dedupes characterIds and departedCharacterIds in first-seen order across two submissions for one character', () => {
    const submissions = [
      sub('s1', 'active-1'),
      sub('s2', 'active-1'),
      sub('s3', 'inactive-1'),
      sub('s4', 'inactive-1'),
    ]
    const rankings = [rank('s1', 1), rank('s2', 1), rank('s3', 1), rank('s4', 1)]

    const result = splitCandidatesByMembership({
      submissions,
      rankings,
      inactiveCharacterIds: ['inactive-1'],
    })

    expect(result.characterIds).toEqual(['active-1'])
    expect(result.departedCharacterIds).toEqual(['inactive-1'])
  })

  it('accepts inactiveCharacterIds as a plain array', () => {
    const submissions = [sub('s1', 'active-1'), sub('s2', 'inactive-1')]
    const rankings = [rank('s1', 1), rank('s2', 1)]

    const result = splitCandidatesByMembership({
      submissions,
      rankings,
      inactiveCharacterIds: ['inactive-1'],
    })

    expect(result.submissions.map(s => s.id)).toEqual(['s1'])
  })

  it('accepts inactiveCharacterIds as a Set', () => {
    const submissions = [sub('s1', 'active-1'), sub('s2', 'inactive-1')]
    const rankings = [rank('s1', 1), rank('s2', 1)]

    const result = splitCandidatesByMembership({
      submissions,
      rankings,
      inactiveCharacterIds: new Set(['inactive-1']),
    })

    expect(result.submissions.map(s => s.id)).toEqual(['s1'])
  })

  it('returns four empty arrays for empty inputs', () => {
    const result = splitCandidatesByMembership({
      submissions: [],
      rankings: [],
      inactiveCharacterIds: [],
    })

    expect(result).toEqual({
      submissions: [],
      rankings: [],
      characterIds: [],
      departedCharacterIds: [],
    })
  })

  it('does not mutate its inputs', () => {
    const submissions = [sub('s1', 'active-1'), sub('s2', 'inactive-1')]
    const rankings = [rank('s1', 1), rank('s2', 1)]
    const submissionsCopy = JSON.parse(JSON.stringify(submissions))
    const rankingsCopy = JSON.parse(JSON.stringify(rankings))

    splitCandidatesByMembership({
      submissions,
      rankings,
      inactiveCharacterIds: ['inactive-1'],
    })

    expect(submissions).toEqual(submissionsCopy)
    expect(rankings).toEqual(rankingsCopy)
  })
})
