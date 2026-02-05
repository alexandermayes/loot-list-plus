export interface PhaseDefinition {
  phase: number
  name: string
  raids: string[]
}

// Map expansion display names to slugs used in EXPANSION_PHASES
const EXPANSION_NAME_TO_SLUG: Record<string, string> = {
  'Classic': 'classic',
  'Classic WoW': 'classic',
  'The Burning Crusade': 'tbc',
  'Wrath of the Lich King': 'wrath',
}

export function getExpansionSlug(expansionName: string): string | null {
  return EXPANSION_NAME_TO_SLUG[expansionName] || null
}

export const EXPANSION_PHASES: Record<string, PhaseDefinition[]> = {
  classic: [
    { phase: 1, name: 'Phase 1', raids: ['Molten Core', "Onyxia's Lair"] },
    { phase: 2, name: 'Phase 2', raids: ['Blackwing Lair'] },
    { phase: 3, name: 'Phase 3', raids: ["Zul'Gurub"] },
    { phase: 4, name: 'Phase 4', raids: ["Ahn'Qiraj"] },
    { phase: 5, name: 'Phase 5', raids: ["Temple of Ahn'Qiraj"] },
    { phase: 6, name: 'Phase 6', raids: ['Naxxramas'] },
  ],
  tbc: [
    { phase: 1, name: 'Phase 1', raids: ['Karazhan', "Gruul's Lair", "Magtheridon's Lair"] },
    { phase: 2, name: 'Phase 2', raids: ['Serpentshrine Cavern', 'Tempest Keep'] },
    { phase: 3, name: 'Phase 3', raids: ['Hyjal Summit', 'Black Temple'] },
    { phase: 4, name: 'Phase 4', raids: ["Zul'Aman"] },
    { phase: 5, name: 'Phase 5', raids: ['Sunwell Plateau'] },
  ],
  wrath: [
    { phase: 1, name: 'Phase 1', raids: ['Naxxramas (Wrath)', 'Eye of Eternity', 'Obsidian Sanctum'] },
    { phase: 2, name: 'Phase 2', raids: ['Ulduar'] },
    { phase: 3, name: 'Phase 3', raids: ['Trial of the Crusader'] },
    { phase: 4, name: 'Phase 4', raids: ['Icecrown Citadel'] },
    { phase: 5, name: 'Phase 5', raids: ['Ruby Sanctum'] },
  ],
}

export function getExpansionPhases(slug: string): PhaseDefinition[] {
  return EXPANSION_PHASES[slug] || []
}

export function getMaxPhase(slug: string): number {
  const phases = EXPANSION_PHASES[slug]
  if (!phases || phases.length === 0) return 0
  return Math.max(...phases.map(p => p.phase))
}
