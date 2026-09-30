// Master sheet candidates: keep only raiders who can be awarded (GH #314).

/**
 * Drops master sheet candidates whose character is not an active member of
 * the guild.
 *
 * The caller decides "inactive" by running the same character ids through
 * `findInvalidCharacterIds` (lib/loot/guild-award-refs.ts) that the award
 * routes and the loot_history trigger use, so the master sheet's candidate
 * set can never disagree with what the award path will actually accept
 * (GH #314).
 *
 * `departedCharacterIds` is returned (not just discarded) so a future
 * greyed-out display of departed raiders needs no change to this helper —
 * only a change to what the caller does with the two arrays.
 *
 * Inputs are never mutated.
 *
 * @param submissions - Approved loot submissions, each with a character_id
 *   (null allowed; null submissions are dropped and not counted as departed)
 * @param rankings - Rankings, each pointing at a submission by submission_id
 * @param inactiveCharacterIds - Character ids to treat as not an active
 *   member (array or Set)
 * @returns kept submissions and rankings (in original order), the kept
 *   submissions' character ids (deduped, first-seen order), and the dropped
 *   submissions' non-null character ids (deduped, first-seen order)
 */
export function splitCandidatesByMembership<
  S extends { id: string; character_id: string | null },
  R extends { submission_id: string },
>(input: {
  submissions: S[]
  rankings: R[]
  inactiveCharacterIds: Iterable<string>
}): {
  submissions: S[]
  rankings: R[]
  characterIds: string[]
  departedCharacterIds: string[]
} {
  const inactive = input.inactiveCharacterIds instanceof Set
    ? input.inactiveCharacterIds
    : new Set(input.inactiveCharacterIds)

  const keptSubmissions: S[] = []
  const keptSubmissionIds = new Set<string>()
  const characterIdsSeen = new Set<string>()
  const characterIds: string[] = []
  const departedCharacterIdsSeen = new Set<string>()
  const departedCharacterIds: string[] = []

  for (const submission of input.submissions) {
    const isActiveCandidate = submission.character_id !== null && !inactive.has(submission.character_id)
    if (isActiveCandidate) {
      keptSubmissions.push(submission)
      keptSubmissionIds.add(submission.id)
      if (!characterIdsSeen.has(submission.character_id as string)) {
        characterIdsSeen.add(submission.character_id as string)
        characterIds.push(submission.character_id as string)
      }
    } else if (submission.character_id !== null) {
      if (!departedCharacterIdsSeen.has(submission.character_id)) {
        departedCharacterIdsSeen.add(submission.character_id)
        departedCharacterIds.push(submission.character_id)
      }
    }
  }

  const keptRankings = input.rankings.filter(r => keptSubmissionIds.has(r.submission_id))

  return {
    submissions: keptSubmissions,
    rankings: keptRankings,
    characterIds,
    departedCharacterIds,
  }
}
