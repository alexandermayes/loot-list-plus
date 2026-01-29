import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { seedExpansionForGuild } from '@/app/services/expansionSeeder'
import { verifyOfficerPermissions } from '@/utils/server-roles'

/**
 * POST - Change a guild's active expansion
 *
 * This endpoint allows officers to change their guild's expansion, which will:
 * 1. Delete all existing expansions (cascades to raid_tiers and loot_items)
 * 2. Seed the new expansion with raid tiers and loot items
 * 3. Update the guild's active_expansion_id
 *
 * WARNING: This is a destructive operation that deletes all loot data!
 */
export async function POST(request: NextRequest) {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const serviceSupabase = createServiceRoleClient()

    // Parse request body
    const body = await request.json()
    const { guild_id, expansion } = body

    // Validate required fields
    if (!guild_id || !expansion) {
      return NextResponse.json(
        { error: 'Guild ID and expansion are required' },
        { status: 400 }
      )
    }

    // Validate expansion
    if (!['Classic', 'The Burning Crusade', 'Wrath of the Lich King', 'Cataclysm', 'Mists of Pandaria'].includes(expansion)) {
      return NextResponse.json(
        { error: 'Invalid expansion' },
        { status: 400 }
      )
    }

    // Verify user has officer permissions (position >= 50)
    const verification = await verifyOfficerPermissions(serviceSupabase, user.id, guild_id)
    if (!verification.hasPermission) {
      return NextResponse.json(
        { error: 'Only officers can change the guild expansion' },
        { status: 403 }
      )
    }

    // 1. Delete old expansions (cascades to raid_tiers and loot_items)
    const { error: deleteError } = await serviceSupabase
      .from('expansions')
      .delete()
      .eq('guild_id', guild_id)

    if (deleteError) {
      console.error('Error deleting old expansions:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete old expansion data' },
        { status: 500 }
      )
    }

    // 2. Seed new expansion
    const { expansionId, error: seedError } = await seedExpansionForGuild(
      serviceSupabase,
      guild_id,
      expansion,
      true // useServiceRole flag
    )

    if (seedError) {
      console.error('Error seeding new expansion:', seedError)
      return NextResponse.json(
        { error: seedError },
        { status: 500 }
      )
    }

    // 3. Update guild's active_expansion_id
    const { error: updateError } = await serviceSupabase
      .from('guilds')
      .update({ active_expansion_id: expansionId })
      .eq('id', guild_id)

    if (updateError) {
      console.error('Error updating active expansion:', updateError)
      return NextResponse.json(
        { error: 'Failed to set active expansion' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      expansion_id: expansionId
    })
  } catch (error) {
    console.error('Error in POST /api/guilds/change-expansion:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
