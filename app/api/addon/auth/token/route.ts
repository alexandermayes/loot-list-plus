import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { trackApiError } from '@/utils/analytics/server'
import { consumeAuthCode, isValidCodeVerifier } from '@/lib/addon/companion-auth'
import { issueSyncToken } from '@/lib/addon/sync-tokens'

/**
 * POST /api/addon/auth/token
 *
 * The companion's code-for-token exchange (GH #300 D-01/D-02, OD-03/OD-04).
 * The code is consumed (deleted) before any other check, so a wrong
 * verifier, an expired code or a mismatched redirect_uri all burn the code
 * exactly like a successful exchange. Officer rights are re-checked here
 * even though they were checked at consent, since time has passed. Success
 * issues a guild-scoped sync token through the same issueSyncToken that
 * POST /api/addon/sync-token uses, so a second login for the same
 * (user, guild) pair replaces the earlier token.
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
    }

    const { code, code_verifier: codeVerifier, redirect_uri: redirectUri } = (body ?? {}) as {
      code?: unknown
      code_verifier?: unknown
      redirect_uri?: unknown
    }

    if (typeof code !== 'string' || code.length === 0 || code.length > 256) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
    }
    if (!isValidCodeVerifier(codeVerifier)) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
    }
    if (redirectUri !== undefined && typeof redirectUri !== 'string') {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
    }

    const service = createServiceRoleClient()

    const consumed = await consumeAuthCode(service, {
      code,
      codeVerifier,
      redirectUri: redirectUri ?? null,
    })
    if (!consumed.ok) {
      return NextResponse.json({ error: 'invalid_grant' }, { status: 400 })
    }

    const verification = await verifyOfficerPermissions(service, consumed.userId, consumed.guildId)
    if (!verification.hasPermission) {
      return NextResponse.json({ error: 'invalid_grant' }, { status: 400 })
    }

    const { data: guild, error: guildError } = await service
      .from('guilds')
      .select('name')
      .eq('id', consumed.guildId)
      .single()
    if (guildError || !guild) {
      return NextResponse.json({ error: 'invalid_grant' }, { status: 400 })
    }

    const issued = await issueSyncToken(service, { userId: consumed.userId, guildId: consumed.guildId })
    if (!issued.ok) {
      console.error('Failed to issue companion sync token')
      return NextResponse.json({ error: 'server_error' }, { status: 500 })
    }

    const response = NextResponse.json({
      token: issued.token,
      guild_id: consumed.guildId,
      guild_name: guild.name,
      expires_at: issued.expiresAt,
    })
    response.headers.set('Cache-Control', 'no-store')
    response.headers.set('Pragma', 'no-cache')
    return response
  } catch (error) {
    console.error('Error in POST /api/addon/auth/token:', error)
    trackApiError(
      'unknown',
      'POST /api/addon/auth/token',
      error instanceof Error ? error : new Error(String(error))
    )
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
