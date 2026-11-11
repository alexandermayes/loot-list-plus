/**
 * The Overview score widget's split (D-21, UI-11).
 *
 * The widget has no item in front of it, so Interest comes from the raider's
 * number 1 pick: rank 50 reads "your number 1 pick". Standing does not depend
 * on the pick, so the tiles show the same standing whatever the list holds and
 * only interest and total move with it.
 */
import { computeScore, explainScore, type ScoreExplanation, type ScoreInput } from '@/domain/scoring'

/** The best rank on the list; 0 when nothing is left to pick. */
export function topPickRank(ranks: Iterable<number>): number {
  let best = 0
  for (const rank of ranks) {
    if (rank > best) best = rank
  }
  return best
}

/** Scores the raider as if the number 1 pick (`topRank`) were the item, in the raider's own voice. */
export function buildOverviewScoreExplanation(
  input: ScoreInput,
  topRank: number,
  decimalPlaces: number,
): ScoreExplanation {
  const withPick: ScoreInput = { ...input, itemRank: topRank }
  return explainScore(computeScore(withPick), withPick, { voice: 'self', decimalPlaces })
}
