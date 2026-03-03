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
  'Cataclysm': 'cata',
  'Mists of Pandaria': 'mop',
  'Warlords of Draenor': 'wod',
  'Legion': 'legion',
  'Battle for Azeroth': 'bfa',
  'Shadowlands': 'sl',
  'Dragonflight': 'df',
  'The War Within': 'tww',
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
    { phase: 2, name: 'Phase 2', raids: ['Serpentshrine Cavern', 'Tempest Keep: The Eye'] },
    { phase: 3, name: 'Phase 3', raids: ['Hyjal Summit', 'Black Temple'] },
    { phase: 4, name: 'Phase 4', raids: ["Zul'Aman"] },
    { phase: 5, name: 'Phase 5', raids: ['Sunwell Plateau'] },
  ],
  wrath: [
    { phase: 1, name: 'Phase 1', raids: ['Naxxramas (Wrath)', 'Eye of Eternity', 'Obsidian Sanctum'] },
    { phase: 2, name: 'Phase 2', raids: ['Ulduar'] },
    { phase: 3, name: 'Phase 3', raids: ['Trial of the Crusader', "Onyxia's Lair (Wrath)"] },
    { phase: 4, name: 'Phase 4', raids: ['Icecrown Citadel'] },
    { phase: 5, name: 'Phase 5', raids: ['Ruby Sanctum'] },
  ],
  cata: [
    { phase: 1, name: 'Phase 1', raids: ['Blackwing Descent', 'The Bastion of Twilight', 'Throne of the Four Winds'] },
    { phase: 2, name: 'Phase 2', raids: ['Firelands'] },
    { phase: 3, name: 'Phase 3', raids: ['Dragon Soul'] },
  ],
  mop: [
    { phase: 1, name: 'Phase 1', raids: ["Mogu'shan Vaults", "Heart of Fear", 'Terrace of Endless Spring'] },
    { phase: 2, name: 'Phase 2', raids: ['Throne of Thunder'] },
    { phase: 3, name: 'Phase 3', raids: ['Siege of Orgrimmar'] },
  ],
  wod: [
    { phase: 1, name: 'Phase 1', raids: ['Highmaul'] },
    { phase: 2, name: 'Phase 2', raids: ['Blackrock Foundry'] },
    { phase: 3, name: 'Phase 3', raids: ['Hellfire Citadel'] },
  ],
  legion: [
    { phase: 1, name: 'Phase 1', raids: ['The Emerald Nightmare', 'Trial of Valor'] },
    { phase: 2, name: 'Phase 2', raids: ['The Nighthold'] },
    { phase: 3, name: 'Phase 3', raids: ['Tomb of Sargeras'] },
    { phase: 4, name: 'Phase 4', raids: ['Antorus, the Burning Throne'] },
  ],
  bfa: [
    { phase: 1, name: 'Phase 1', raids: ['Uldir'] },
    { phase: 2, name: 'Phase 2', raids: ['Battle of Dazar\'alor', 'Crucible of Storms'] },
    { phase: 3, name: 'Phase 3', raids: ['The Eternal Palace'] },
    { phase: 4, name: 'Phase 4', raids: ["Ny'alotha, the Waking City"] },
  ],
  sl: [
    { phase: 1, name: 'Phase 1', raids: ['Castle Nathria'] },
    { phase: 2, name: 'Phase 2', raids: ['Sanctum of Domination'] },
    { phase: 3, name: 'Phase 3', raids: ['Sepulcher of the First Ones'] },
  ],
  df: [
    { phase: 1, name: 'Phase 1', raids: ['Vault of the Incarnates'] },
    { phase: 2, name: 'Phase 2', raids: ['Aberrus, the Shadowed Crucible'] },
    { phase: 3, name: 'Phase 3', raids: ["Amirdrassil, the Dream's Hope"] },
  ],
  tww: [
    { phase: 1, name: 'Phase 1', raids: ["Nerub'ar Palace"] },
    { phase: 2, name: 'Phase 2', raids: ['Liberation of Undermine'] },
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
