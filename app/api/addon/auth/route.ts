import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { trackApiError } from '@/utils/analytics/server'
import { buildSignInPath } from '@/lib/post-auth-redirect'
import {
  COMPANION_REDIRECT_URI,
  parseAuthorizeParams,
  isSameOriginRequest,
  issueAuthCode,
} from '@/lib/addon/companion-auth'

const GUILD_ID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/** RFC 6749 4.1.2.1 / RFC 7636 4.4.1: a bad parameter (other than redirect_uri) sends the companion home with an error, never a raw 400 it can't display. */
function invalidRequestRedirect(): NextResponse {
  const url = new URL(COMPANION_REDIRECT_URI)
  url.searchParams.set('error', 'invalid_request')
  return NextResponse.redirect(url, 303)
}

/**
 * GET /api/addon/auth
 *
 * The companion's PKCE authorize endpoint (GH #300 D-01/D-02). Validates the
 * request, then sends the browser through the sign-in round trip (if needed)
 * and on to the officer guild picker. This GET never issues a code — only
 * the picker's consent POST below does.
 */
export async function GET(request: NextRequest) {
  const parsed = parseAuthorizeParams(request.nextUrl.searchParams)

  if (!parsed.ok && parsed.reason === 'invalid_redirect_uri') {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'redirect_uri is not allowed' },
      { status: 400 }
    )
  }
  if (!parsed.ok) {
    return invalidRequestRedirect()
  }

  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) {
    const signInPath = buildSignInPath(`/api/addon/auth?${parsed.query}`)
    return NextResponse.redirect(new URL(signInPath, request.url), 303)
  }

  return NextResponse.redirect(new URL(`/companion/authorize?${parsed.query}`, request.url), 303)
}

/**
 * POST /api/addon/auth
 *
 * The guild picker's consent form (D-02). Re-validates every parameter (the
 * form's action carries the canonical query), requires a same-origin Origin
 * header (OD-06), re-checks the session and officer rights on the chosen
 * guild, issues a single-use code, and 303s the browser back to the
 * companion's custom scheme — a real HTTP redirect, since Electron's
 * will-redirect listener only fires on server-side redirects.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const parsed = parseAuthorizeParams(request.nextUrl.searchParams)
    if (!parsed.ok && parsed.reason === 'invalid_redirect_uri') {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'redirect_uri is not allowed' },
        { status: 400 }
      )
    }
    if (!parsed.ok) {
      return invalidRequestRedirect()
    }

    const formData = await request.formData()
    const guildIds = formData.getAll('guild_id')
    const guildId = guildIds.length === 1 ? guildIds[0] : null
    if (typeof guildId !== 'string' || !GUILD_ID_PATTERN.test(guildId)) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
    }

    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceRoleClient()
    const verification = await verifyOfficerPermissions(service, user.id, guildId)
    if (!verification.hasPermission) {
      return NextResponse.json({ error: 'Officer permissions required' }, { status: 403 })
    }

    const { code } = await issueAuthCode(service, {
      userId: user.id,
      guildId,
      codeChallenge: parsed.codeChallenge,
    })

    const redirectUrl = new URL(COMPANION_REDIRECT_URI)
    redirectUrl.searchParams.set('code', code)
    const response = NextResponse.redirect(redirectUrl, 303)
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    console.error('Error in POST /api/addon/auth:', error)
    trackApiError('unknown', 'POST /api/addon/auth', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
