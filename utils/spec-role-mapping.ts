// Spec to role mapping for WoW Classic
// Determines which items a spec can use based on their role(s)

export type Role = 'tank' | 'healer' | 'physical' | 'caster'

export interface SpecInfo {
  class: string
  shorthand: string | string[] | null
  roles: Role[]
}

export const specMapping: Record<string, SpecInfo> = {
  'Holy Paladin': { class: 'Paladin', shorthand: 'HPal', roles: ['healer'] },
  'Retribution Paladin': { class: 'Paladin', shorthand: 'Ret', roles: ['physical'] },
  'Protection Paladin': { class: 'Paladin', shorthand: 'PPal', roles: ['tank'] },
  'Restoration Shaman': { class: 'Shaman', shorthand: 'RS', roles: ['healer'] },
  'Elemental Shaman': { class: 'Shaman', shorthand: 'Ele', roles: ['caster'] },
  'Enhancement Shaman': { class: 'Shaman', shorthand: 'Enh', roles: ['physical'] },
  'Restoration Druid': { class: 'Druid', shorthand: 'RD', roles: ['healer'] }, // Changed from 'Resto Druid' to match database
  'Feral Druid': { class: 'Druid', shorthand: 'Frl', roles: ['physical', 'tank'] },
  'Balance Druid': { class: 'Druid', shorthand: 'Bal', roles: ['caster'] },
  'Protection Warrior': { class: 'Warrior', shorthand: 'ProtW', roles: ['tank'] },
  'Arms/Fury Warrior': { class: 'Warrior', shorthand: ['Arms', 'Fury'], roles: ['physical'] },
  'Holy/Disc Priest': { class: 'Priest', shorthand: 'HPri', roles: ['healer'] },
  'Shadow Priest': { class: 'Priest', shorthand: 'SP', roles: ['caster'] },
  'Mage': { class: 'Mage', shorthand: 'Magee', roles: ['caster'] },
  'Hunter': { class: 'Hunter', shorthand: null, roles: ['physical'] },
  'Warlock': { class: 'Warlock', shorthand: null, roles: ['caster'] },
  'Rogue': { class: 'Rogue', shorthand: null, roles: ['physical'] },
  'Blood Death Knight': { class: 'Death Knight', shorthand: 'Blood', roles: ['tank'] },
  'Frost/Unholy Death Knight': { class: 'Death Knight', shorthand: ['Frost', 'Unholy'], roles: ['physical'] }
}

export const rolesBySpec: Record<string, Role[]> = {
  'tank': ['tank'],
  'healer': ['healer'],
  'physical': ['physical'],
  'caster': ['caster']
}

// Get roles for a given spec name
export function getSpecRoles(specName: string): Role[] {
  return specMapping[specName]?.roles || []
}

// Check if a spec can use an item based on item roles
export function canSpecUseItem(specName: string, itemRoles: Role[]): boolean {
  if (!itemRoles || itemRoles.length === 0) return true // No role restriction
  const specRoles = getSpecRoles(specName)
  return specRoles.some(role => itemRoles.includes(role))
}

// Get all specs for a given role
export function getSpecsForRole(role: Role): string[] {
  return Object.entries(specMapping)
    .filter(([_, info]) => info.roles.includes(role))
    .map(([specName, _]) => specName)
}

// Get role display name
export function getRoleDisplayName(role: Role): string {
  const names: Record<Role, string> = {
    'tank': 'Tank',
    'healer': 'Healer',
    'physical': 'Physical DPS',
    'caster': 'Caster DPS'
  }
  return names[role] || role
}

// Get all unique roles
export const allRoles: Role[] = ['tank', 'healer', 'physical', 'caster']
