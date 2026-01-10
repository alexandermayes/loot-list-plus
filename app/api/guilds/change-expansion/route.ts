import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { seedExpansionForGuild } from '@/app/services/expansionSeeder'

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
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Verify user is an officer of this guild
    const { data: member, error: memberError } = await supabase
      .from('guild_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('guild_id', guild_id)
      .single()

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'You are not a member of this guild' },
        { status: 403 }
      )
    }

    if (member.role !== 'Officer') {
      return NextResponse.json(
        { error: 'Only officers can change the guild expansion' },
        { status: 403 }
      )
    }

    // Use service role client for deletion (bypasses RLS)
    const serviceSupabase = createServiceRoleClient()

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
      expansion
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
