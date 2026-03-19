import type { ItemPriority } from '../types'

// Re-export for consumers that import ItemPriority from scoring
export type { ItemPriority }

/**
 * Calculate priority bonus for a character on a specific item.
 *
 * Priority 1 gets the full bonus, priority 2 gets half, priority 3 gets a third, etc.
 * Role, class/spec, and character bonuses stack additively.
 *
 * Default bonus values: role=5, class=3, character=2
 */
export function calculatePriorityBonus(
  priority: ItemPriority | null | undefined,
  characterId: string,
  specId: string | null,
  role: string | null
): number {
  if (!priority) return 0

  let bonus = 0
  const bonuses = priority.priority_bonuses || { role: 5, class: 3, character: 2 }

  // Check role priority
  if (role && priority.role_priorities && priority.role_priorities[role] != null) {
    const rolePriority = priority.role_priorities[role] as number
    bonus += bonuses.role / rolePriority
  }

  // Check class/spec priority
  if (specId && priority.class_priorities && priority.class_priorities[specId] != null) {
    const classPriority = priority.class_priorities[specId] as number
    bonus += bonuses.class / classPriority
  }

  // Check individual character priority
  if (characterId && priority.character_priorities && priority.character_priorities[characterId] != null) {
    const charPriority = priority.character_priorities[characterId] as number
    bonus += bonuses.character / charPriority
  }

  return bonus
}
