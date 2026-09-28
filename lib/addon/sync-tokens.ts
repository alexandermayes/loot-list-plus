/**
 * Guild-scoped sync tokens for the companion desktop app (GH #300 D-02).
 *
 * Deliberately free of any `next/server` import — the jsdom picker-page test
 * imports SYNC_TOKEN_DEFAULT_DAYS through this module, and next/server does
 * not initialize under jsdom. Route handlers can return the Response objects
 * built here as-is (NextResponse extends Response).
 *
 * Module paths for getAuthenticatedUser, createServiceRoleClient and
 * verifyOfficerPermissions are kept exactly as the four addon routes already
 * import them, so existing and parallel route tests keep intercepting them.
 */

import { randomBytes, createHash } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyOfficerPermissions } from '@/utils/server-roles'

/** One token per (guild, user) pair; a fresh login replaces the prior one. */
export const SYNC_TOKEN_DEFAULT_DAYS = 30

const BEARER_TOKEN_PATTERN = /^[0-9a-f]{64}$/

export function hashSyncToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export type IssueSyncTokenResult =
  | { ok: true; token: string; expiresAt: string }
  | { ok: false; error: unknown }

/**
 * Reproduces POST /api/addon/sync-token's original behaviour byte for byte:
 * a 32-byte hex token, expiry by setDate(getDate() + days), and an upsert on
 * (guild_id, user_id) that replaces the user's previous token for the guild.
 */
export async function issueSyncToken(
  supabase: SupabaseClient,
  args: { userId: string; guildId: string; expiresDays?: number; now?: Date }
): Promise<IssueSyncTokenResult> {
  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = hashSyncToken(rawToken)

  const expiresAt = args.now ? new Date(args.now.getTime()) : new Date()
  expiresAt.setDate(expiresAt.getDate() + (args.expiresDays || SYNC_TOKEN_DEFAULT_DAYS))

  const { error } = await supabase
    .from('addon_sync_tokens')
    .upsert(
      {
        guild_id: args.guildId,
        user_id: args.userId,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: 'guild_id,user_id' }
    )

  if (error) {
    return { ok: false, error }
  }

  return { ok: true, token: rawToken, expiresAt: expiresAt.toISOString() }
}

/** Who is making the request: a browser session, or a companion Bearer token scoped to one guild. */
export type AddonPrincipal =
  | { kind: 'session'; userId: string }
  | { kind: 'sync_token'; userId: string; guildId: string }

export type AuthenticateAddonResult =
  | { ok: true; principal: AddonPrincipal }
  | { ok: false; response: Response }

/**
 * Cookie-or-Bearer gate shared by all four addon routes. An Authorization
 * header of any shape takes the token path with no cookie fallback (a typo'd
 * Bearer token must never silently succeed via a stale browser session
 * cookie); its absence takes the existing cookie path unchanged.
 */
export async function authenticateAddonRequest(request: Request): Promise<AuthenticateAddonResult> {
  const authHeader = request.headers.get('authorization')

  if (!authHeader) {
    const { user, error } = await getAuthenticatedUser()
    if (error || !user) {
      return { ok: false, response: Response.json({ error: 'Unauthorized' }, { status: 401 }) }
    }
    return { ok: true, principal: { kind: 'session', userId: user.id } }
  }

  const match = /^Bearer\s+(\S+)$/i.exec(authHeader)
  const token = match?.[1]
  if (!token || !BEARER_TOKEN_PATTERN.test(token)) {
    return { ok: false, response: Response.json({ error: 'Invalid sync token' }, { status: 401 }) }
  }

  const service = createServiceRoleClient()
  const { data, error } = await service
    .from('addon_sync_tokens')
    .select('user_id, guild_id, expires_at')
    .eq('token_hash', hashSyncToken(token))
    .maybeSingle()

  if (error) {
    console.error('Failed to look up sync token')
    return { ok: false, response: Response.json({ error: 'Internal server error' }, { status: 500 }) }
  }
  if (!data) {
    return { ok: false, response: Response.json({ error: 'Invalid sync token' }, { status: 401 }) }
  }
  if (new Date(data.expires_at as string).getTime() <= Date.now()) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Sync token expired. Log in again from the companion app.' },
        { status: 401 }
      ),
    }
  }

  return {
    ok: true,
    principal: { kind: 'sync_token', userId: data.user_id as string, guildId: data.guild_id as string },
  }
}

export type AuthorizeAddonGuildResult = { ok: true; userId: string } | { ok: false; response: Response }

/**
 * Guild scope plus the existing officer check (D-02). A sync token for
 * another guild is rejected before verifyOfficerPermissions is ever called
 * — no guild data is read on a cross-guild attempt, and no query is spent on
 * an attempt that will fail regardless.
 */
export async function authorizeAddonGuild(
  supabase: SupabaseClient,
  principal: AddonPrincipal,
  guildId: string
): Promise<AuthorizeAddonGuildResult> {
  if (principal.kind === 'sync_token' && principal.guildId !== guildId) {
    return {
      ok: false,
      response: Response.json({ error: 'This sync token is for a different guild' }, { status: 403 }),
    }
  }

  const verification = await verifyOfficerPermissions(supabase, principal.userId, guildId)
  if (!verification.hasPermission) {
    return { ok: false, response: Response.json({ error: 'Officer permissions required' }, { status: 403 }) }
  }

  return { ok: true, userId: principal.userId }
}
