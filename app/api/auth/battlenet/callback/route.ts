import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { exchangeCodeForTokens, fetchUserInfo } from '@/lib/battlenet'

/**
 * GET /api/auth/battlenet/callback
 *
 * Handles the Battle.net OAuth callback.
 * Validates state, exchanges code for tokens, fetches user info,
 * and stores the Battle.net account link in the database.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  const profileUrl = `${origin}/profile`

  try {
    // Require authenticated user
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.redirect(`${origin}/?error=auth_required`)
    }

    const code = request.nextUrl.searchParams.get('code')
    const state = request.nextUrl.searchParams.get('state')
    const errorParam = request.nextUrl.searchParams.get('error')

    // Handle user denying access
    if (errorParam) {
      return NextResponse.redirect(`${profileUrl}?battlenet=denied`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${profileUrl}?battlenet=error&reason=missing_params`)
    }

    // Validate CSRF state
    const storedState = request.cookies.get('battlenet_oauth_state')?.value
    const storedRegion = request.cookies.get('battlenet_oauth_region')?.value || 'us'

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(`${profileUrl}?battlenet=error&reason=invalid_state`)
    }

    const redirectUri = `${origin}/api/auth/battlenet/callback`

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, storedRegion, redirectUri)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Fetch Battle.net user info
    const userInfo = await fetchUserInfo(tokens.access_token, storedRegion)

    // Upsert the Battle.net account link
    const supabase = createServiceRoleClient()

    const { error: upsertError } = await supabase
      .from('battlenet_accounts')
      .upsert({
        user_id: user.id,
        battlenet_id: userInfo.id,
        battletag: userInfo.battletag,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expires_at: expiresAt,
        region: storedRegion,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })

    if (upsertError) {
      console.error('Failed to store Battle.net account:', upsertError)
      return NextResponse.redirect(`${profileUrl}?battlenet=error&reason=save_failed`)
    }

    // Clear OAuth cookies and redirect to settings
    const response = NextResponse.redirect(`${profileUrl}?battlenet=connected`)
    response.cookies.delete('battlenet_oauth_state')
    response.cookies.delete('battlenet_oauth_region')

    return response
  } catch (error) {
    console.error('Battle.net OAuth callback error:', error)
    return NextResponse.redirect(`${profileUrl}?battlenet=error&reason=unexpected`)
  }
}
