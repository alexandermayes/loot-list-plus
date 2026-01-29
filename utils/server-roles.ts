/**
 * Server-side role permission helpers
 * Uses position-based checks instead of role names
 */

import { ROLE_POSITIONS, DEFAULT_ROLES, isOfficerPosition, isGuildMasterPosition } from './roles'

interface GuildRole {
  name: string
  position: number
}

/**
 * Get guild roles from database, with fallback to defaults
 */
export async function getGuildRoles(supabase: any, guildId: string): Promise<GuildRole[]> {
  const { data: roles, error } = await supabase
    .from('guild_roles')
    .select('name, position')
    .eq('guild_id', guildId)

  if (error || !roles || roles.length === 0) {
    // Return default roles if guild_roles doesn't exist or is empty
    return DEFAULT_ROLES.map(r => ({ name: r.name, position: r.position }))
  }

  return roles
}

/**
 * Get the position for a role name
 */
export function getRolePositionFromRoles(roleName: string, roles: GuildRole[]): number {
  const role = roles.find(r => r.name === roleName)
  if (role) return role.position

  // Fallback: check default roles
  const defaultRole = DEFAULT_ROLES.find(r => r.name === roleName)
  return defaultRole?.position ?? 0
}

/**
 * Check if user has officer-level permissions in a guild
 * This is the main function to use in API routes
 */
export async function verifyOfficerPermissions(
  serviceSupabase: any,
  userId: string,
  guildId: string
): Promise<{ hasPermission: boolean; role?: string; position?: number; error?: string }> {
  // Get user's characters
  const { data: userCharacters } = await serviceSupabase
    .from('characters')
    .select('id')
    .eq('user_id', userId)

  if (!userCharacters || userCharacters.length === 0) {
    return { hasPermission: false, error: 'No characters found' }
  }

  const characterIds = userCharacters.map((c: any) => c.id)

  // Get ALL of user's memberships in this guild (they may have multiple characters with different roles)
  const { data: memberships } = await serviceSupabase
    .from('character_guild_memberships')
    .select('role')
    .eq('guild_id', guildId)
    .in('character_id', characterIds)
    .eq('is_active', true)

  if (!memberships || memberships.length === 0) {
    return { hasPermission: false, error: 'Not a member of this guild' }
  }

  // Get guild roles to determine positions
  const roles = await getGuildRoles(serviceSupabase, guildId)

  // Find the highest position among all the user's character memberships
  let highestRole = memberships[0].role
  let highestPosition = getRolePositionFromRoles(memberships[0].role, roles)

  for (const membership of memberships) {
    const position = getRolePositionFromRoles(membership.role, roles)
    if (position > highestPosition) {
      highestPosition = position
      highestRole = membership.role
    }
  }

  if (!isOfficerPosition(highestPosition)) {
    return { hasPermission: false, role: highestRole, position: highestPosition, error: 'Insufficient permissions' }
  }

  return { hasPermission: true, role: highestRole, position: highestPosition }
}

/**
 * Check if user has guild master-level permissions in a guild
 */
export async function verifyGuildMasterPermissions(
  serviceSupabase: any,
  userId: string,
  guildId: string
): Promise<{ hasPermission: boolean; role?: string; position?: number; error?: string }> {
  const result = await verifyOfficerPermissions(serviceSupabase, userId, guildId)

  if (!result.hasPermission) {
    return result
  }

  if (!isGuildMasterPosition(result.position!)) {
    return { ...result, hasPermission: false, error: 'Guild Master permissions required' }
  }

  return result
}

/**
 * Get user's role and position in a guild
 * Returns the highest role among all the user's characters
 */
export async function getUserGuildRole(
  serviceSupabase: any,
  userId: string,
  guildId: string
): Promise<{ role: string; position: number } | null> {
  // Get user's characters
  const { data: userCharacters } = await serviceSupabase
    .from('characters')
    .select('id')
    .eq('user_id', userId)

  if (!userCharacters || userCharacters.length === 0) {
    return null
  }

  const characterIds = userCharacters.map((c: any) => c.id)

  // Get ALL of user's memberships in this guild (they may have multiple characters with different roles)
  const { data: memberships } = await serviceSupabase
    .from('character_guild_memberships')
    .select('role')
    .eq('guild_id', guildId)
    .in('character_id', characterIds)
    .eq('is_active', true)

  if (!memberships || memberships.length === 0) {
    return null
  }

  // Get guild roles to determine positions
  const roles = await getGuildRoles(serviceSupabase, guildId)

  // Find the highest position among all the user's character memberships
  let highestRole = memberships[0].role
  let highestPosition = getRolePositionFromRoles(memberships[0].role, roles)

  for (const membership of memberships) {
    const position = getRolePositionFromRoles(membership.role, roles)
    if (position > highestPosition) {
      highestPosition = position
      highestRole = membership.role
    }
  }

  return { role: highestRole, position: highestPosition }
}
