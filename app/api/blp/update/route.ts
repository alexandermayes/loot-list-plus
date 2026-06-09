import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { trackApiError } from '@/utils/analytics/server'
import { logAudit } from '@/utils/audit/log'
import { recomputeBlpForItems } from '@/utils/blp/recompute'

interface UpdateBLPRequest {
  guild_id: string
  loot_item_id: string
  winner_character_id: string
  raid_event_id: string
}

/**
 * POST /api/blp/update
 *
 * Recompute BLP for an item after a loot award. BLP is a derived value
 * (see migration 20260609000001): recompute_blp_for_item rebuilds the counter
 * and journal straight from award + attendance history, so it credits the right
 * contenders and resets winners regardless of whether attendance was synced
 * before or after the award (GH #98 race). winner_character_id / raid_event_id
 * are still accepted for backwards compatibility but no longer drive the math.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: UpdateBLPRequest = await request.json()
    const { guild_id, loot_item_id, winner_character_id, raid_event_id } = body

    if (!guild_id || !loot_item_id || !winner_character_id || !raid_event_id) {
      return NextResponse.json({
        error: 'guild_id, loot_item_id, winner_character_id, and raid_event_id are required'
      }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Verify user has officer permissions (uses character_guild_memberships)
    const verification = await verifyPermission(supabase, user.id, guild_id, 'manage_loot')
    if (!verification.hasPermission) {
      return NextResponse.json({ error: verification.error || 'Officer permissions required' }, { status: 403 })
    }

    // Check if BLP is enabled for this guild
    const { data: settings } = await supabase
      .from('guild_settings')
      .select('blp_enabled')
      .eq('guild_id', guild_id)
      .single()

    if (!settings?.blp_enabled) {
      return NextResponse.json({ data: { updated: 0, message: 'BLP not enabled for this guild' } })
    }

    // Recompute BLP for this item from history (idempotent, order-independent).
    await recomputeBlpForItems(supabase, guild_id, [loot_item_id])

    logAudit({
      supabase,
      guildId: guild_id,
      tableName: 'blp_tracking',
      recordId: loot_item_id,
      action: 'UPDATE',
      userId: user.id,
      newData: {
        loot_item_id,
        winner_character_id,
        raid_event_id,
        recomputed: true,
      },
    })

    return NextResponse.json({ data: { loot_item_id, recomputed: true } })
  } catch (error) {
    console.error('Error in POST /api/blp/update:', error)
    trackApiError('unknown', 'POST /api/blp/update', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
