import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { getAuthorizeUrl } from '@/lib/battlenet'
import { randomBytes } from 'crypto'

/**
 * GET /api/auth/battlenet
 *
 * Starts the Battle.net OAuth flow.
 * Generates a state parameter, stores it in a cookie, and redirects
 * the user to Battle.net's authorization page.
 *
 * Query params:
 * - region: 'us' | 'eu' (default: 'us')
 */
export async function GET(request: NextRequest) {
  // Require authenticated user
  const { user, error } = await getAuthenticatedUser()
  if (error || !user) {
    return NextResponse.redirect(new URL('/?error=auth_required', request.nextUrl.origin))
  }

  const region = request.nextUrl.searchParams.get('region') || 'us'

  if (!['us', 'eu'].includes(region)) {
    return NextResponse.json({ error: 'Invalid region. Must be us or eu.' }, { status: 400 })
  }

  if (!process.env.BLIZZARD_CLIENT_ID || !process.env.BLIZZARD_CLIENT_SECRET) {
    return NextResponse.json({ error: 'Battle.net OAuth is not configured' }, { status: 500 })
  }

  // Generate CSRF state token
  const state = randomBytes(32).toString('hex')
  const redirectUri = `${request.nextUrl.origin}/api/auth/battlenet/callback`

  const authorizeUrl = getAuthorizeUrl(region, state, redirectUri)

  // Store state and region in cookies for validation in callback
  const response = NextResponse.redirect(authorizeUrl)

  response.cookies.set('battlenet_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  response.cookies.set('battlenet_oauth_region', region, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  return response
}
