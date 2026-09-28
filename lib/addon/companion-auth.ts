/**
 * OAuth 2.0 PKCE authorize/consent/exchange helpers for the companion desktop
 * app (GH #300, D-01/D-02).
 *
 * Server-only, but deliberately free of any `next/*` import: this module is
 * loaded by both node-environment route tests and the jsdom picker-page test,
 * and `next/server` does not initialize under jsdom.
 *
 * Security notes:
 * - The authorization code and its sha256 hash are the only things that ever
 *   touch the database; the raw code is never logged.
 * - The PKCE challenge comparison in consumeAuthCode uses a constant-time
 *   comparison (crypto.timingSafeEqual) so a wrong verifier cannot be
 *   distinguished by timing.
 * - Every lookup failure (a thrown DB error) propagates as a thrown Error
 *   rather than being treated as "not found" — callers must not swallow it.
 */

import { randomBytes, createHash, timingSafeEqual } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { verifyOfficerPermissions } from '@/utils/server-roles'

/** The only redirect_uri the companion ever sends or the server ever issues to. */
export const COMPANION_REDIRECT_URI = 'lootlistplus://auth/callback'

/** How long an issued authorization code lives before it can no longer be exchanged. */
export const AUTH_CODE_TTL_SECONDS = 60

const CODE_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/
const CODE_VERIFIER_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/

export type ParsedAuthorizeParams =
  | { ok: true; codeChallenge: string; query: string }
  | { ok: false; reason: 'invalid_redirect_uri' }
  | { ok: false; reason: 'invalid_request' }

/**
 * Validate the authorize endpoint's query params (OD-02). redirect_uri is
 * checked first and in isolation: a missing, repeated or non-matching
 * redirect_uri gets its own `invalid_redirect_uri` reason (400 JSON, never a
 * redirect — there is nowhere safe to redirect to). Every other bad
 * parameter gets `invalid_request` (303 back to the companion with
 * ?error=invalid_request).
 */
export function parseAuthorizeParams(params: URLSearchParams): ParsedAuthorizeParams {
  const redirectUris = params.getAll('redirect_uri')
  if (redirectUris.length !== 1 || redirectUris[0] !== COMPANION_REDIRECT_URI) {
    return { ok: false, reason: 'invalid_redirect_uri' }
  }

  const responseTypes = params.getAll('response_type')
  if (responseTypes.length !== 1 || responseTypes[0] !== 'code') {
    return { ok: false, reason: 'invalid_request' }
  }

  const methods = params.getAll('code_challenge_method')
  if (methods.length !== 1 || methods[0] !== 'S256') {
    return { ok: false, reason: 'invalid_request' }
  }

  const challenges = params.getAll('code_challenge')
  if (challenges.length !== 1 || !CODE_CHALLENGE_PATTERN.test(challenges[0])) {
    return { ok: false, reason: 'invalid_request' }
  }

  const codeChallenge = challenges[0]
  const canonical = new URLSearchParams()
  canonical.set('response_type', 'code')
  canonical.set('code_challenge', codeChallenge)
  canonical.set('code_challenge_method', 'S256')
  canonical.set('redirect_uri', COMPANION_REDIRECT_URI)

  return { ok: true, codeChallenge, query: canonical.toString() }
}

/** RFC 7636 4.1 code_verifier shape: 43-128 unreserved characters. */
export function isValidCodeVerifier(verifier: unknown): verifier is string {
  return typeof verifier === 'string' && CODE_VERIFIER_PATTERN.test(verifier)
}

/** RFC 7636 4.2: S256 challenge = BASE64URL(SHA256(verifier)). */
export function computeS256Challenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

/**
 * OD-06 CSRF guard for the consent POST: the Origin header's host must equal
 * the first x-forwarded-host value, else the host header, else the request
 * URL's host — the same precedence Next.js server actions use.
 */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return false

  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    return false
  }

  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const host = forwardedHost || request.headers.get('host') || new URL(request.url).host

  return originHost === host
}

/**
 * Issue a single-use authorization code (D-01). Best-effort prunes expired
 * rows first so the table doesn't grow unbounded; a prune failure is logged
 * (constant message, no interpolated values) and does not block issuance.
 */
export async function issueAuthCode(
  supabase: SupabaseClient,
  args: { userId: string; guildId: string; codeChallenge: string; now?: Date }
): Promise<{ code: string }> {
  const now = args.now ?? new Date()

  const { error: pruneError } = await supabase
    .from('addon_auth_codes')
    .delete()
    .lt('expires_at', now.toISOString())
  if (pruneError) {
    console.error('Failed to prune expired authorization codes')
  }

  const code = randomBytes(32).toString('base64url')
  const codeHash = createHash('sha256').update(code).digest('hex')
  const expiresAt = new Date(now.getTime() + AUTH_CODE_TTL_SECONDS * 1000)

  const { error } = await supabase.from('addon_auth_codes').insert({
    code_hash: codeHash,
    code_challenge: args.codeChallenge,
    user_id: args.userId,
    guild_id: args.guildId,
    redirect_uri: COMPANION_REDIRECT_URI,
    expires_at: expiresAt.toISOString(),
  })

  if (error) {
    throw new Error('Failed to store authorization code')
  }

  return { code }
}

export type ConsumeAuthCodeResult =
  | { ok: true; userId: string; guildId: string }
  | { ok: false; error: 'invalid_grant' }

/**
 * Exchange a code for its (userId, guildId) pair (D-01, OD-03). A single
 * delete-and-return statement burns the code whether or not the rest of the
 * exchange succeeds, so a wrong verifier, an expired code or a mismatched
 * redirect_uri all consume the code exactly like a successful exchange
 * would — a code can never be exchanged twice, honest or not.
 */
export async function consumeAuthCode(
  supabase: SupabaseClient,
  args: { code: string; codeVerifier: string; redirectUri?: string | null; now?: Date }
): Promise<ConsumeAuthCodeResult> {
  const codeHash = createHash('sha256').update(args.code).digest('hex')

  const { data, error } = await supabase
    .from('addon_auth_codes')
    .delete()
    .eq('code_hash', codeHash)
    .select('user_id, guild_id, code_challenge, redirect_uri, expires_at')
    .maybeSingle()

  if (error) {
    throw new Error('Failed to consume authorization code')
  }
  if (!data) {
    return { ok: false, error: 'invalid_grant' }
  }

  const now = args.now ?? new Date()
  const expiresAtMs = new Date(data.expires_at as string).getTime()
  if (expiresAtMs <= now.getTime()) {
    return { ok: false, error: 'invalid_grant' }
  }

  if (data.redirect_uri !== COMPANION_REDIRECT_URI) {
    return { ok: false, error: 'invalid_grant' }
  }
  if (args.redirectUri != null && args.redirectUri !== data.redirect_uri) {
    return { ok: false, error: 'invalid_grant' }
  }

  const expected = Buffer.from(computeS256Challenge(args.codeVerifier), 'utf8')
  const stored = Buffer.from(data.code_challenge as string, 'utf8')
  if (expected.length !== stored.length || !timingSafeEqual(expected, stored)) {
    return { ok: false, error: 'invalid_grant' }
  }

  return { ok: true, userId: data.user_id as string, guildId: data.guild_id as string }
}

export interface OfficerGuild {
  id: string
  name: string
  realm: string | null
}

/**
 * Guilds where the signed-in user currently has officer rights (D-02),
 * sorted by name. Candidates come from the user's active character
 * memberships plus any guild they created; each candidate is confirmed
 * through the same verifyOfficerPermissions gate every addon route uses, so
 * the picker can never list a guild the token exchange would then refuse.
 */
export async function listOfficerGuilds(
  supabase: SupabaseClient,
  userId: string
): Promise<OfficerGuild[]> {
  const { data: userCharacters, error: charError } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', userId)
  if (charError) {
    throw new Error('Failed to load officer guilds')
  }

  const characterIds = (userCharacters ?? []).map((c: { id: string }) => c.id)
  const candidateIds = new Set<string>()

  if (characterIds.length > 0) {
    const { data: memberships, error: memberError } = await supabase
      .from('character_guild_memberships')
      .select('guild_id')
      .in('character_id', characterIds)
      .eq('is_active', true)
    if (memberError) {
      throw new Error('Failed to load officer guilds')
    }
    for (const m of memberships ?? []) candidateIds.add((m as { guild_id: string }).guild_id)
  }

  const { data: ownedGuilds, error: ownedError } = await supabase
    .from('guilds')
    .select('id')
    .eq('created_by', userId)
  if (ownedError) {
    throw new Error('Failed to load officer guilds')
  }
  for (const g of ownedGuilds ?? []) candidateIds.add((g as { id: string }).id)

  const officerIds: string[] = []
  for (const id of candidateIds) {
    const result = await verifyOfficerPermissions(supabase, userId, id)
    if (result.hasPermission) officerIds.push(id)
  }

  if (officerIds.length === 0) return []

  const { data: guildRows, error: guildsError } = await supabase
    .from('guilds')
    .select('id, name, realm')
    .in('id', officerIds)
  if (guildsError) {
    throw new Error('Failed to load officer guilds')
  }

  return (guildRows ?? [])
    .map((g: { id: string; name: string; realm: string | null }) => ({
      id: g.id,
      name: g.name,
      realm: g.realm ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
