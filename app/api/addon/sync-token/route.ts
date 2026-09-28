import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { trackApiError } from '@/utils/analytics/server'
import { issueSyncToken } from '@/lib/addon/sync-tokens'

/**
 * POST /api/addon/sync-token
 *
 * Generate an auth token for the companion desktop app.
 * One token per guild per user. Creating a new one invalidates the old one.
 *
 * Body: { guild_id: string, expires_days?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { guild_id, expires_days } = await request.json()

    if (!guild_id) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Verify officer permissions
    const verification = await verifyOfficerPermissions(supabase, user.id, guild_id)
    if (!verification.hasPermission) {
      return NextResponse.json({ error: 'Officer permissions required' }, { status: 403 })
    }

    // Generate token (one per guild per user; issueSyncToken's upsert replaces any earlier one)
    const result = await issueSyncToken(supabase, {
      userId: user.id,
      guildId: guild_id,
      expiresDays: expires_days,
    })

    if (!result.ok) {
      console.error('Failed to create sync token:', result.error)
      return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        token: result.token,
        expires_at: result.expiresAt,
        guild_id,
      }
    })
  } catch (error) {
    console.error('Error in POST /api/addon/sync-token:', error)
    trackApiError('unknown', 'POST /api/addon/sync-token', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/addon/sync-token
 *
 * Revoke a sync token.
 * Body: { guild_id: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { guild_id } = await request.json()

    if (!guild_id) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('addon_sync_tokens')
      .delete()
      .eq('guild_id', guild_id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Failed to delete sync token:', error)
      return NextResponse.json({ error: 'Failed to revoke token' }, { status: 500 })
    }

    return NextResponse.json({ data: { revoked: true } })
  } catch (error) {
    console.error('Error in DELETE /api/addon/sync-token:', error)
    trackApiError('unknown', 'DELETE /api/addon/sync-token', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
