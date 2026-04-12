/**
 * Role position constants and helper functions
 *
 * Permissions are based on position values, not role names.
 * This allows renaming roles while keeping permissions intact.
 *
 * Position hierarchy:
 * - 100+ = Guild Master level (full permissions)
 * - 50-99 = Officer level (management permissions)
 * - 0-49 = Member level (basic permissions)
 */

// Position thresholds
export const ROLE_POSITIONS = {
  GUILD_MASTER: 100,
  OFFICER: 50,
  MEMBER: 0,
} as const

// Default role definitions (used when guild_roles table doesn't exist)
export const DEFAULT_ROLES = [
  { id: '1', name: 'Member', color_hex: '#a1a1a1', position: 0, is_default: true },
  { id: '2', name: 'Officer', color_hex: '#fbbf24', position: 50, is_default: true },
  { id: '3', name: 'Guild Master', color_hex: '#ff8000', position: 100, is_default: true },
]

/**
 * Check if a position has Guild Master level permissions
 */
export function isGuildMasterPosition(position: number): boolean {
  return position >= ROLE_POSITIONS.GUILD_MASTER
}

/**
 * Check if a position has Officer level permissions (includes Guild Master)
 */
export function isOfficerPosition(position: number): boolean {
  return position >= ROLE_POSITIONS.OFFICER
}

/**
 * Check if a position has at least Member level permissions
 */
export function isMemberPosition(position: number): boolean {
  return position >= ROLE_POSITIONS.MEMBER
}

/**
 * Get the position for a role name from a roles array
 */
export function getRolePosition(roleName: string, roles: { name: string; position: number }[]): number {
  const role = roles.find(r => r.name === roleName)
  return role?.position ?? 0
}

/**
 * Check if a role name has officer-level permissions based on roles array
 */
export function hasOfficerPermissions(roleName: string, roles: { name: string; position: number }[]): boolean {
  return isOfficerPosition(getRolePosition(roleName, roles))
}

/**
 * Check if a role name has guild master-level permissions based on roles array
 */
export function hasGuildMasterPermissions(roleName: string, roles: { name: string; position: number }[]): boolean {
  return isGuildMasterPosition(getRolePosition(roleName, roles))
}
