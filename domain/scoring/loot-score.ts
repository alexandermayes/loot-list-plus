/**
 * Calculate loot score — the sum of all scoring components.
 *
 * Formula:
 *   LootScore = itemRank + attendanceScore + rankModifier
 *             + badLuckBonus + priorityBonus + trialPenalty + roleBonus
 *
 * This function preserves the original positional API for backward compatibility.
 * Future code should use computeScore() from engine.ts with structured input.
 */
export function calculateLootScore(
  itemRank: number,
  attendanceScore: number,
  rankModifier: number,
  badLuckBonus: number = 0,
  priorityBonus: number = 0,
  trialPenalty: number = 0,
  roleBonus: number = 0
): number {
  return itemRank + attendanceScore + rankModifier + badLuckBonus + priorityBonus + trialPenalty + roleBonus
}
