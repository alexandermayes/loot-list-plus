import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import {
  verifyPermission,
  verifyOfficerPermissions,
  verifyGuildMasterPermissions,
} from '@/utils/server-roles'
import type { PermissionCode } from '@/domain/guild/roles'

/**
 * Shared route-handler scaffolding.
 *
 * Every authenticated API route was hand-rolling the same opening: call
 * getAuthenticatedUser(), return the canonical 401, build a service-role
 * client, optionally verify a guild permission, and wrap the body in a
 * try/catch that logs and returns the canonical 500. That block was copy-
 * pasted ~120 times (and up to 3× within a single multi-method file), so a
 * cross-cutting change (request ids, switching to revocation-checked auth for
 * mutations, standardizing error bodies) had to be made in 100+ places.
 *
 * These wrappers reproduce that block verbatim — same status codes, same
 * bodies, same ordering — so migrating a route is behavior-preserving. The
 * ONE intentional difference: the guild-gated wrappers (withPermission /
 * withOfficer / withGuildMaster) resolve guild_id and run the permission
 * check BEFORE the handler's own field validation. So a *malformed* request
 * from an *unauthorized* caller now gets 403 (or a 400 "guild_id is required"
 * when guild_id is absent) instead of the route's bespoke field-validation
 * 400. Valid requests, and all authorized requests, are unaffected.
 *
 * Routes whose catch did more than log+500 (e.g. trackApiError) pass an
 * `onError` option, which runs after the standard console.error and before
 * the 500 — preserving that behavior too.
 */

type RouteParams = Record<string, string | string[]>
type RouteContext = { params?: Promise<RouteParams> }
type NextRouteHandler = (request: NextRequest, context: RouteContext) => Promise<NextResponse>

/** Optional per-route hooks layered onto the shared scaffold. */
export interface RouteOptions {
  /** Runs in the catch block after `console.error(...)` and before the 500 (e.g. trackApiError). */
  onError?: (error: unknown) => void
}

/** Context handed to a `withUser` handler. */
export interface AuthedContext {
  user: User
  /** Service-role client (bypasses RLS). Permission is already verified for guild-gated wrappers. */
  service: SupabaseClient
  request: NextRequest
  /** Resolved route segment params (e.g. `{ id }` for `[id]` routes). */
  params: RouteParams
}

/** Context handed to a guild-gated handler (withPermission / withOfficer / withGuildMaster). */
export interface GuildContext<B = Record<string, unknown>> extends AuthedContext {
  /** The guild id the caller was authorized against. */
  guildId: string
  /** The parsed JSON body (`{}` if absent/unparsable). */
  body: B
}

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const internalError = () => NextResponse.json({ error: 'Internal server error' }, { status: 500 })

async function resolveParams(context: RouteContext): Promise<RouteParams> {
  if (!context?.params) return {}
  return await context.params
}

/** Parse a JSON body, tolerating empty/invalid bodies the way `request.json().catch(() => ...)` did. */
async function parseJsonBody<B = Record<string, unknown>>(request: NextRequest): Promise<B> {
  try {
    return (await request.json()) as B
  } catch {
    return {} as B
  }
}

/**
 * Authenticated-user scaffold. Runs getAuthenticatedUser() (401 on failure),
 * builds a service-role client, resolves route params, and wraps the handler
 * in the canonical try/catch (`Error in <label>:` + 500).
 *
 * Use this for the majority of routes — including those whose guild_id is only
 * known after a DB load, which keep their own contextual verify* call inside
 * the handler.
 */
export function withUser(
  handler: (ctx: AuthedContext) => Promise<NextResponse>,
  label: string,
  opts?: RouteOptions,
): NextRouteHandler {
  return async (request, context) => {
    try {
      const { user, error: authError } = await getAuthenticatedUser()
      if (authError || !user) return unauthorized()
      const service = createServiceRoleClient()
      const params = await resolveParams(context)
      return await handler({ user, service, request, params })
    } catch (error) {
      console.error(`Error in ${label}:`, error)
      opts?.onError?.(error)
      return internalError()
    }
  }
}

type GuildIdResolver<B> = (src: {
  body: B
  params: RouteParams
  request: NextRequest
}) => string | undefined | Promise<string | undefined>

type GuildVerifier = (
  service: SupabaseClient,
  userId: string,
  guildId: string,
) => Promise<{ hasPermission: boolean; error?: string }>

function withGuildGate<B>(
  verify: GuildVerifier,
  getGuildId: GuildIdResolver<B>,
  handler: (ctx: GuildContext<B>) => Promise<NextResponse>,
  label: string,
  opts?: RouteOptions,
): NextRouteHandler {
  return async (request, context) => {
    try {
      const { user, error: authError } = await getAuthenticatedUser()
      if (authError || !user) return unauthorized()

      const params = await resolveParams(context)
      const body = await parseJsonBody<B>(request)
      const guildId = await getGuildId({ body, params, request })
      if (!guildId) {
        return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
      }

      const service = createServiceRoleClient()
      const { hasPermission, error: permError } = await verify(service, user.id, guildId)
      if (!hasPermission) {
        return NextResponse.json({ error: permError || 'Insufficient permissions' }, { status: 403 })
      }

      return await handler({ user, service, request, params, guildId, body })
    } catch (error) {
      console.error(`Error in ${label}:`, error)
      opts?.onError?.(error)
      return internalError()
    }
  }
}

/** Gate a route on a granular guild permission (verifyPermission). */
export function withPermission<B = Record<string, unknown>>(
  permission: PermissionCode,
  getGuildId: GuildIdResolver<B>,
  handler: (ctx: GuildContext<B>) => Promise<NextResponse>,
  label: string,
  opts?: RouteOptions,
): NextRouteHandler {
  return withGuildGate<B>(
    (service, userId, guildId) => verifyPermission(service, userId, guildId, permission),
    getGuildId,
    handler,
    label,
    opts,
  )
}

/** Gate a route on officer-level access (verifyOfficerPermissions). */
export function withOfficer<B = Record<string, unknown>>(
  getGuildId: GuildIdResolver<B>,
  handler: (ctx: GuildContext<B>) => Promise<NextResponse>,
  label: string,
  opts?: RouteOptions,
): NextRouteHandler {
  return withGuildGate<B>(verifyOfficerPermissions, getGuildId, handler, label, opts)
}

/** Gate a route on Guild Master access (verifyGuildMasterPermissions). */
export function withGuildMaster<B = Record<string, unknown>>(
  getGuildId: GuildIdResolver<B>,
  handler: (ctx: GuildContext<B>) => Promise<NextResponse>,
  label: string,
  opts?: RouteOptions,
): NextRouteHandler {
  return withGuildGate<B>(verifyGuildMasterPermissions, getGuildId, handler, label, opts)
}
