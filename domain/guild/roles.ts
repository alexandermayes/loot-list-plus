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

// ─── Granular Permissions ──────────────────────────────────

export const PERMISSIONS = {
  manage_submissions: { label: 'Manage submissions', description: 'Review, approve, and reject loot list submissions' },
  manage_loot: { label: 'Manage loot', description: 'Award loot, manage loot history and item classifications' },
  manage_attendance: { label: 'Manage attendance', description: 'Record attendance, manage raid events' },
  manage_members: { label: 'Manage members', description: 'Change roles, set trial status, remove members' },
  manage_settings: { label: 'Manage settings', description: 'Edit guild settings, loot rules, item priorities' },
  manage_roster: { label: 'Manage roster', description: 'Create raid teams, assign members to teams' },
  manage_reserves: { label: 'Manage reserves', description: 'Create and manage reserve runs' },
  view_audit_log: { label: 'View audit log', description: 'Access the audit log' },
  view_master_sheet: { label: 'View hidden master sheet', description: 'See the master sheet even when it is hidden from raiders' },
} as const

export type PermissionCode = keyof typeof PERMISSIONS

export const ALL_PERMISSION_CODES = Object.keys(PERMISSIONS) as PermissionCode[]

/**
 * Check if a role has a specific permission.
 * Officers (position >= 50) and Guild Master have all permissions implicitly.
 * Custom roles below Officer can be granted specific permissions via the permissions array.
 */
export function roleHasPermission(
  position: number,
  permissions: string[],
  requiredPermission: PermissionCode
): boolean {
  if (isOfficerPosition(position)) return true
  return permissions.includes(requiredPermission)
}
