/**
 * Score explanation — generates human-readable breakdown of a loot score.
 *
 * Used by the overview page score widget and master sheet tooltips.
 * Only includes non-zero components so the UI stays clean.
 */

import type { ScoreResult, ScoreExplanation, ScoreLine, ScoringConfig } from '../types'
import { withDefaults } from './defaults'

/**
 * Generate a human-readable explanation of a score result.
 *
 * Each line describes one scoring component with:
 * - label: what the component is
 * - value: the numeric contribution
 * - detail: plain-language explanation
 */
export function explainScore(
  result: ScoreResult,
  config: Partial<ScoringConfig> = {}
): ScoreExplanation {
  const c = withDefaults(config)
  const s = result.components
  const lines: ScoreLine[] = []

  // Item rank is always present (1-50)
  lines.push({
    label: 'Item rank',
    value: s.itemRank,
    detail: `Position #${51 - s.itemRank} on your list`,
  })

  // Attendance is always present (0 to max_attendance_bonus)
  lines.push({
    label: 'Attendance',
    value: s.attendanceScore,
    detail: `${c.attendance_type} scoring, ${c.rolling_attendance_weeks}-week window`,
  })

  if (s.rankModifier !== 0) {
    lines.push({
      label: 'Rank bonus',
      value: s.rankModifier,
      detail: 'Based on your guild rank',
    })
  }

  if (s.roleBonus !== 0) {
    lines.push({
      label: 'Role bonus',
      value: s.roleBonus,
      detail: 'Based on your raid role (tank, healer, etc.)',
    })
  }

  if (s.priorityBonus !== 0) {
    lines.push({
      label: 'Priority bonus',
      value: s.priorityBonus,
      detail: 'Officers set priority for your role or class on this item',
    })
  }

  if (s.trialPenalty !== 0) {
    lines.push({
      label: 'Trial penalty',
      value: s.trialPenalty,
      detail: 'Penalty while on trial membership',
    })
  }

  if (s.badLuckBonus !== 0) {
    lines.push({
      label: 'Bad luck protection',
      value: s.badLuckBonus,
      detail: `Passed on this item before, bonus capped at ${c.blp_maximum}`,
    })
  }

  return { total: result.total, lines }
}
