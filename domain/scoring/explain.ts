/**
 * Score explanation — generates human-readable breakdown of a loot score.
 *
 * Used by the overview page score widget and master sheet tooltips.
 * Only includes non-zero components (except itemRank and attendance
 * which are always present) so the UI stays clean.
 *
 * Each line includes a `key` for UI styling and an optional `context`
 * map for richer rendering (e.g., guild rank name, matched role label).
 */

import type { ScoreResult, ScoreExplanation, ScoreLine, ScoringConfig, ScoreInput } from '../types'
import { withDefaults } from './defaults'
import { getRoleModifierWithLabel } from './modifiers'

/**
 * Generate a human-readable explanation of a score result.
 *
 * @param result - Output from computeScore()
 * @param configOrInput - Either a partial ScoringConfig (legacy) or the full ScoreInput for richer context
 */
export function explainScore(
  result: ScoreResult,
  configOrInput: Partial<ScoringConfig> | ScoreInput = {}
): ScoreExplanation {
  // Determine if we got a full ScoreInput or just config
  const isScoreInput = 'itemRank' in configOrInput && 'character' in configOrInput
  const config = isScoreInput ? (configOrInput as ScoreInput).config || {} : configOrInput as Partial<ScoringConfig>
  const input = isScoreInput ? configOrInput as ScoreInput : null

  const c = withDefaults(config)
  const s = result.components
  const lines: ScoreLine[] = []

  // Item rank is always present (1-50)
  lines.push({
    label: 'Item rank',
    value: s.itemRank,
    detail: s.itemRank > 0 ? `Position #${51 - s.itemRank} on your list` : 'No item selected',
    key: 'itemRank',
  })

  // Attendance is always present (0 to max_attendance_bonus)
  lines.push({
    label: 'Attendance',
    value: s.attendanceScore,
    detail: `${c.attendance_type} scoring, ${c.rolling_attendance_weeks}-week window`,
    key: 'attendance',
  })

  if (s.rankModifier !== 0) {
    const rankName = input?.character?.guildRank || undefined
    const characterId = input?.character?.characterId
    const hasCharacterOverride = !!(
      characterId
      && c.character_rank_overrides
      && characterId in c.character_rank_overrides
    )
    lines.push({
      label: 'Rank bonus',
      value: s.rankModifier,
      detail: hasCharacterOverride
        ? 'Per-character override'
        : rankName ? `Modifier for "${rankName}" rank` : 'Based on your guild rank',
      key: 'rankModifier',
      ...(rankName ? { context: { rankName } } : {}),
    })
  }

  if (s.roleBonus !== 0) {
    // Resolve the matched role label if we have character context
    let matchedRole: string | undefined
    if (input?.character?.specRoles && input.character.specRoles.length > 0) {
      const roleResult = getRoleModifierWithLabel(input.character.specRoles, config)
      matchedRole = roleResult.matchedRole || undefined
    }
    lines.push({
      label: 'Role bonus',
      value: s.roleBonus,
      detail: matchedRole ? `Bonus for ${matchedRole} role` : 'Based on your raid role (tank, healer, etc.)',
      key: 'roleBonus',
      ...(matchedRole ? { context: { matchedRole } } : {}),
    })
  }

  if (s.priorityBonus !== 0) {
    lines.push({
      label: 'Priority bonus',
      value: s.priorityBonus,
      detail: 'Officers set priority for your role or class on this item',
      key: 'priorityBonus',
    })
  }

  if (s.trialPenalty !== 0) {
    lines.push({
      label: 'Trial penalty',
      value: s.trialPenalty,
      detail: 'Penalty while on trial membership',
      key: 'trialPenalty',
    })
  }

  if (s.badLuckBonus !== 0) {
    lines.push({
      label: 'Bad luck protection',
      value: s.badLuckBonus,
      detail: `Passed on this item before, bonus capped at ${c.blp_maximum}`,
      key: 'badLuckBonus',
    })
  }

  return { total: result.total, lines }
}
