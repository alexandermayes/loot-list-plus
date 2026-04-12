import type { ItemPriority } from '../types'

// Re-export for consumers that import ItemPriority from scoring
export type { ItemPriority }

/**
 * Calculate priority bonus for a character on a specific item.
 *
 * Role, class/spec, and character priorities are stored as direct point values
 * and stack additively. For example, a character priority of +1 adds exactly
 * +1 to the score.
 */
export function calculatePriorityBonus(
  priority: ItemPriority | null | undefined,
  characterId: string,
  specId: string | null,
  role: string | null
): number {
  if (!priority) return 0

  let bonus = 0

  // Role priority
  if (role && priority.role_priorities && priority.role_priorities[role] != null) {
    bonus += Number(priority.role_priorities[role]) || 0
  }

  // Class/spec priority
  if (specId && priority.class_priorities && priority.class_priorities[specId] != null) {
    bonus += Number(priority.class_priorities[specId]) || 0
  }

  // Individual character priority
  if (characterId && priority.character_priorities && priority.character_priorities[characterId] != null) {
    bonus += Number(priority.character_priorities[characterId]) || 0
  }

  return bonus
}
