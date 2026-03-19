/**
 * Server-side role permission helpers
 * Uses position-based checks instead of role names
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { ROLE_POSITIONS, DEFAULT_ROLES, isOfficerPosition, isGuildMasterPosition } from '@/domain/guild/roles'

interface GuildRole {
  name: string
  position: number
}

/**
 * Get guild roles from database, with fallback to defaults
 */
export async function getGuildRoles(supabase: SupabaseClient, guildId: string): Promise<GuildRole[]> {
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
  serviceSupabase: SupabaseClient,
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

  const characterIds = userCharacters.map((c: { id: string }) => c.id)

  // Get ALL of user's memberships in this guild (they may have multiple characters with different roles)
  const { data: memberships } = await serviceSupabase
    .from('character_guild_memberships')
    .select('role')
    .eq('guild_id', guildId)
    .in('character_id', characterIds)
    .eq('is_active', true)

  if (!memberships || memberships.length === 0) {
    // Fallback: check if user is the guild creator (always has full permissions)
    const creator = await isGuildCreator(serviceSupabase, userId, guildId)
    if (creator) {
      return { hasPermission: true, role: 'Guild Master', position: 100 }
    }
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
    // Fallback: check if user is the guild creator (always has full permissions)
    const creator = await isGuildCreator(serviceSupabase, userId, guildId)
    if (creator) {
      return { hasPermission: true, role: 'Guild Master', position: 100 }
    }
    return { hasPermission: false, role: highestRole, position: highestPosition, error: 'Insufficient permissions' }
  }

  return { hasPermission: true, role: highestRole, position: highestPosition }
}

/**
 * Check if user has guild master-level permissions in a guild
 */
export async function verifyGuildMasterPermissions(
  serviceSupabase: SupabaseClient,
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
 * Check if a user is the guild creator/owner
 */
export async function isGuildCreator(
  serviceSupabase: SupabaseClient,
  userId: string,
  guildId: string
): Promise<boolean> {
  const { data: guild } = await serviceSupabase
    .from('guilds')
    .select('created_by')
    .eq('id', guildId)
    .single()

  return guild?.created_by === userId
}

/**
 * Verify if a role change is allowed based on position hierarchy
 * Rules:
 * 1. Only the guild creator can promote someone TO Guild Master (position >= 100)
 * 2. You cannot promote someone to a position higher than or equal to your own (unless you're the creator)
 * 3. You cannot demote someone with a position higher than or equal to your own
 * 4. You cannot change your own role to Guild Master (unless you're the creator)
 */
export async function verifyRoleChangePermissions(
  serviceSupabase: SupabaseClient,
  callerId: string,
  targetUserId: string,
  guildId: string,
  newRoleName: string
): Promise<{ allowed: boolean; error?: string }> {
  // Get guild info including creator
  const { data: guild } = await serviceSupabase
    .from('guilds')
    .select('created_by')
    .eq('id', guildId)
    .single()

  if (!guild) {
    return { allowed: false, error: 'Guild not found' }
  }

  const isCreator = guild.created_by === callerId

  // Get guild roles to determine positions
  const roles = await getGuildRoles(serviceSupabase, guildId)

  // Get the new role's position
  const newRolePosition = getRolePositionFromRoles(newRoleName, roles)

  // Get caller's position
  const callerRole = await getUserGuildRole(serviceSupabase, callerId, guildId)
  if (!callerRole) {
    return { allowed: false, error: 'Caller not a member of this guild' }
  }

  // Get target's current position
  const targetRole = await getUserGuildRole(serviceSupabase, targetUserId, guildId)
  if (!targetRole) {
    return { allowed: false, error: 'Target not a member of this guild' }
  }

  // Rule 1: Only the guild creator can promote someone TO Guild Master level
  if (isGuildMasterPosition(newRolePosition) && !isCreator) {
    return { allowed: false, error: 'Only the guild owner can promote to Guild Master' }
  }

  // Guild creator can do anything
  if (isCreator) {
    return { allowed: true }
  }

  // Rule 2: Cannot promote to a position >= your own
  if (newRolePosition >= callerRole.position) {
    return { allowed: false, error: 'Cannot promote to a role at or above your own level' }
  }

  // Rule 3: Cannot change the role of someone with position >= your own
  if (targetRole.position >= callerRole.position) {
    return { allowed: false, error: 'Cannot change the role of someone at or above your level' }
  }

  return { allowed: true }
}

/**
 * Verify if removing a member is allowed
 * Rules:
 * 1. Cannot remove the guild creator
 * 2. Cannot remove someone with position >= your own (unless you're the creator)
 */
export async function verifyMemberRemovalPermissions(
  serviceSupabase: SupabaseClient,
  callerId: string,
  targetUserId: string,
  guildId: string
): Promise<{ allowed: boolean; error?: string }> {
  // Get guild info including creator
  const { data: guild } = await serviceSupabase
    .from('guilds')
    .select('created_by')
    .eq('id', guildId)
    .single()

  if (!guild) {
    return { allowed: false, error: 'Guild not found' }
  }

  // Rule 1: Cannot remove the guild creator
  if (targetUserId === guild.created_by) {
    return { allowed: false, error: 'Cannot remove the guild owner' }
  }

  const isCreator = guild.created_by === callerId

  // Guild creator can remove anyone (except themselves, checked above)
  if (isCreator) {
    return { allowed: true }
  }

  // Get caller's position
  const callerRole = await getUserGuildRole(serviceSupabase, callerId, guildId)
  if (!callerRole) {
    return { allowed: false, error: 'Caller not a member of this guild' }
  }

  // Get target's position
  const targetRole = await getUserGuildRole(serviceSupabase, targetUserId, guildId)
  if (!targetRole) {
    return { allowed: false, error: 'Target not a member of this guild' }
  }

  // Rule 2: Cannot remove someone with position >= your own
  if (targetRole.position >= callerRole.position) {
    return { allowed: false, error: 'Cannot remove someone at or above your level' }
  }

  return { allowed: true }
}

/**
 * Get user's role and position in a guild
 * Returns the highest role among all the user's characters
 */
export async function getUserGuildRole(
  serviceSupabase: SupabaseClient,
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

  const characterIds = userCharacters.map((c: { id: string }) => c.id)

  // Get ALL of user's memberships in this guild (they may have multiple characters with different roles)
  const { data: memberships } = await serviceSupabase
    .from('character_guild_memberships')
    .select('role')
    .eq('guild_id', guildId)
    .in('character_id', characterIds)
    .eq('is_active', true)

  if (!memberships || memberships.length === 0) {
    // Fallback: check if user is the guild creator (always has full permissions)
    const creator = await isGuildCreator(serviceSupabase, userId, guildId)
    if (creator) {
      return { role: 'Guild Master', position: 100 }
    }
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
