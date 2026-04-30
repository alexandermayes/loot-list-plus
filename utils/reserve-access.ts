import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { verifyPermission } from '@/utils/server-roles'

/**
 * Reserve runs can be managed by three kinds of actors:
 *   1. A guild officer of the run's guild (if the run is guild-linked)
 *   2. The user who created the run (even if the run has no guild)
 *   3. Anyone who presents the secret raid_leader_token for the run
 *
 * `verifyReserveRunAccess` consolidates all three checks so every mutating
 * route can use a single call. The token can be supplied either as an
 * `x-reserve-leader-token` header or as a `?leader_token=` query string.
 */

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

export async function verifyReserveRunAccess({
  serviceSupabase,
  runId,
  request,
  userId,
}: VerifyParams): Promise<ReserveRunAccess> {
  const { data: run, error } = await serviceSupabase
    .from('reserve_runs')
    .select('id, guild_id, status, created_by, raid_leader_token')
    .eq('id', runId)
    .single()

  if (error || !run) {
    return { allowed: false, actor: 'none', run: null, reason: 'Run not found' }
  }

  const providedToken = extractLeaderToken(request)
  if (providedToken && providedToken === run.raid_leader_token) {
    return { allowed: true, actor: 'leader_token', run }
  }

  if (!userId) {
    return { allowed: false, actor: 'none', run, reason: 'Unauthorized' }
  }

  if (run.created_by === userId) {
    return { allowed: true, actor: 'creator', run }
  }

  if (run.guild_id) {
    const verification = await verifyPermission(serviceSupabase, userId, run.guild_id, 'manage_reserves')
    if (verification.hasPermission) {
      return { allowed: true, actor: 'officer', run }
    }
  }

  return { allowed: false, actor: 'none', run, reason: 'Forbidden' }
}
