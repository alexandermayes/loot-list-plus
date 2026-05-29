/**
 * Loot Engine — single entry point for loot score computation.
 *
 * Replaces the pattern of calling 6 modifier functions + calculateLootScore()
 * with 7 positional parameters. Takes a structured ScoreInput, returns
 * ScoreResult with both the total and the component breakdown.
 *
 * Pure function. No I/O. Testable without rendering UI.
 */

import type { ScoreInput, ScoreResult, ScoreComponents } from '../types'
import { withDefaults } from './defaults'
import { getRankModifier, getRoleModifier, getRaiderModifier, getTrialPenalty, calculateBadLuckBonus } from './modifiers'
import { calculatePriorityBonus } from './priority'

/**
 * Compute the complete loot score for one character on one item.
 *
 * Formula:
 *   total = itemRank + attendanceScore + rankModifier + roleBonus
 *         + badLuckBonus + priorityBonus + trialPenalty + donationBonus
 *         + raiderBonus
 *
 * `donationBonus` is pre-computed per character via `calculateDonationBonus()`
 * and passed in on the ScoreInput. Same pattern as `attendance.score`.
 */
export function computeScore(input: ScoreInput): ScoreResult {
  const config = withDefaults(input.config)

  const components: ScoreComponents = {
    itemRank: input.itemRank,
    attendanceScore: input.attendance.score,
    rankModifier: getRankModifier(input.character.guildRank, config),
    roleBonus: getRoleModifier(input.character.specRoles, config),
    badLuckBonus: calculateBadLuckBonus(input.timesPassed, config),
    priorityBonus: calculatePriorityBonus(
      input.itemPriority,
      input.character.characterId,
      input.character.specId,
      input.character.specRoles[0] ?? null
    ),
    trialPenalty: getTrialPenalty(input.character.membershipStatus, config),
    donationBonus: input.donationBonus,
    raiderBonus: getRaiderModifier(input.character.characterId, config),
  }

  const total = components.itemRank
    + components.attendanceScore
    + components.rankModifier
    + components.roleBonus
    + components.badLuckBonus
    + components.priorityBonus
    + components.trialPenalty
    + components.donationBonus
    + components.raiderBonus

  return { total, components }
}
