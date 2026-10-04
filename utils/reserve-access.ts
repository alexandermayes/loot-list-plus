import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { verifyPermission } from '@/utils/server-roles'

/**
 * Reserve runs are managed by three kinds of actors:
 *   1. Anyone who presents the secret raid_leader_token for the run.
 *   2. The run's creator: for a run with no guild, always; for a guild
 *      run, only while the creator holds an active membership in that
 *      guild (a creator who leaves the guild loses management).
 *   3. A guild officer holding Manage reserves, for a guild run.
 *
 * Viewers of a guild run are any active member of its guild, including
 * officers who do not hold Manage reserves; a run with no guild has no
 * viewers who are not already managers.
 *
 * `verifyReserveRunAccess` consolidates the manager checks so every
 * mutating route can use a single call. The token can be supplied either
 * as an `x-reserve-leader-token` header or as a `?leader_token=` query
 * string.
 */

// Same shape as the UUID check in lib/loot/guild-award-refs.ts line 26;
// copied rather than imported so that file (loot_history reference checks)
// stays untouched.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface VerifyParams {
  serviceSupabase: SupabaseClient
  runId: string
  request: NextRequest
  userId: string | null
}

export interface ReserveRunAccess {
  allowed: boolean
  actor: 'officer' | 'creator' | 'leader_token' | 'none'
  run: {
    id: string
    guild_id: string | null
    status: string
    created_by: string
    raid_leader_token: string
    raid_tier_id: string
  } | null
  reason?: string
}

export function extractLeaderToken(request: NextRequest): string | null {
  const header = request.headers.get('x-reserve-leader-token')
  if (header && header.trim()) return header.trim()
  const param = request.nextUrl.searchParams.get('leader_token')
  if (param && param.trim()) return param.trim()
  return null
}

/**
 * Whether userId holds an active membership in guildId through any of
 * their characters. A guildId that is not a valid-shaped UUID is treated
 * as "not a member" without making a query. Throws on a read error so
 * callers fail closed instead of treating a failed lookup as membership
 * or its absence.
 */
export async function hasActiveGuildMembership(
  serviceSupabase: SupabaseClient,
  userId: string,
  guildId: string
): Promise<boolean> {
  if (typeof guildId !== 'string' || !UUID_PATTERN.test(guildId)) return false

  const { data: characters, error: charactersError } = await serviceSupabase
    .from('characters')
    .select('id')
    .eq('user_id', userId)

  if (charactersError) {
    throw new Error(`hasActiveGuildMembership: characters read failed: ${charactersError.message}`)
  }
  if (!characters || characters.length === 0) return false

  const characterIds = (characters as { id: string }[]).map((c) => c.id)
  const { data: memberships, error: membershipsError } = await serviceSupabase
    .from('character_guild_memberships')
    .select('id')
    .eq('guild_id', guildId)
    .eq('is_active', true)
    .in('character_id', characterIds)
    .limit(1)

  if (membershipsError) {
    throw new Error(`hasActiveGuildMembership: membership read failed: ${membershipsError.message}`)
  }
  return !!(memberships && memberships.length > 0)
}

/**
 * Whether a run's creator may manage it. A run with no guild is always
 * managed by its creator; a guild run's creator keeps managing it only
 * while they hold an active membership in that guild (user decision on
 * 261004-0us OD-3, 2026-10-04).
 */
export async function creatorMayManage(
  serviceSupabase: SupabaseClient,
  run: { created_by: string; guild_id: string | null },
  userId: string
): Promise<boolean> {
  if (run.created_by !== userId) return false
  if (!run.guild_id) return true
  return hasActiveGuildMembership(serviceSupabase, userId, run.guild_id)
}

interface ManagerParams {
  serviceSupabase: SupabaseClient
  run: { guild_id: string | null; created_by: string; raid_leader_token: string }
  request: NextRequest
  userId: string | null
}

export interface ManagerDecision {
  allowed: boolean
  actor: 'officer' | 'creator' | 'leader_token' | 'none'
  reason?: string
}

/**
 * Decides whether the caller manages a run, in order: the leader token;
 * then (signed in required) the creator, per creatorMayManage; then, for
 * a guild run, a holder of Manage reserves.
 */
export async function decideReserveRunManager({
  serviceSupabase,
  run,
  request,
  userId,
}: ManagerParams): Promise<ManagerDecision> {
  const providedToken = extractLeaderToken(request)
  if (providedToken && providedToken === run.raid_leader_token) {
    return { allowed: true, actor: 'leader_token' }
  }

  if (!userId) {
    return { allowed: false, actor: 'none', reason: 'Unauthorized' }
  }

  if (await creatorMayManage(serviceSupabase, run, userId)) {
    return { allowed: true, actor: 'creator' }
  }

  if (run.guild_id) {
    const verification = await verifyPermission(serviceSupabase, userId, run.guild_id, 'manage_reserves')
    if (verification.hasPermission) {
      return { allowed: true, actor: 'officer' }
    }
  }

  return { allowed: false, actor: 'none', reason: 'Forbidden' }
}

export async function verifyReserveRunAccess({
  serviceSupabase,
  runId,
  request,
  userId,
}: VerifyParams): Promise<ReserveRunAccess> {
  const { data: run, error } = await serviceSupabase
    .from('reserve_runs')
    .select('id, guild_id, status, created_by, raid_leader_token, raid_tier_id')
    .eq('id', runId)
    .single()

  if (error || !run) {
    return { allowed: false, actor: 'none', run: null, reason: 'Run not found' }
  }

  const decision = await decideReserveRunManager({ serviceSupabase, run, request, userId })
  return { allowed: decision.allowed, actor: decision.actor, run, reason: decision.reason }
}

interface ViewerParams {
  serviceSupabase: SupabaseClient
  run: { guild_id: string | null; created_by: string; raid_leader_token: string }
  request: NextRequest
  userId: string | null
}

export interface ViewerDecision {
  canView: boolean
  canManage: boolean
  reason?: string
}

/**
 * Decides whether the caller may view a run, whether or not they manage
 * it. A manager can always view. Otherwise, per the user's 2026-10-04 OD-1
 * resolution, any active member of a guild run's guild may view it
 * read-only (including officers without Manage reserves); a run with no
 * guild has no viewers beyond its managers (OD-2).
 */
export async function decideReserveRunViewer({
  serviceSupabase,
  run,
  request,
  userId,
}: ViewerParams): Promise<ViewerDecision> {
  const managerDecision = await decideReserveRunManager({ serviceSupabase, run, request, userId })
  if (managerDecision.allowed) {
    return { canView: true, canManage: true }
  }

  if (userId && run.guild_id && (await hasActiveGuildMembership(serviceSupabase, userId, run.guild_id))) {
    return { canView: true, canManage: false }
  }

  return { canView: false, canManage: false, reason: managerDecision.reason }
}
