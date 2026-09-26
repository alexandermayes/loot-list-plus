import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import {
  seedExpansionForGuild,
  isSupportedExpansion,
  getExpansionDefinition,
} from '@/app/services/expansionSeeder'
import { verifyPermission } from '@/utils/server-roles'

/**
 * POST - Change a guild's active expansion
 *
 * This endpoint allows officers to change their guild's expansion, which will:
 * 1. Seed the new expansion with raid tiers and loot items (or reuse it if
 *    the guild already has it)
 * 2. Update the guild's active_expansion_id
 * 3. Delete the guild's other expansions (cascades to raid_tiers and loot_items)
 *
 * The old expansions are only deleted once the new one exists and is active,
 * so a failed seed leaves the guild exactly as it was. The previous order
 * (delete first, then seed) left guilds with no expansion when seeding failed.
 *
 * WARNING: Step 3 is destructive and deletes the old expansions' loot data!
 */
export async function POST(request: NextRequest) {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    const definition = isSupportedExpansion(expansion) ? getExpansionDefinition(expansion) : null
    if (!definition) {
      return NextResponse.json(
        { error: 'Invalid expansion' },
        { status: 400 }
      )
    }

    // Verify user has officer permissions (position >= 50)
    const verification = await verifyPermission(serviceSupabase, user.id, guild_id, 'manage_settings')
    if (!verification.hasPermission) {
      return NextResponse.json(
        { error: 'Only officers can change the guild expansion' },
        { status: 403 }
      )
    }

    // 1. Snapshot the guild's current expansions before changing anything
    const { data: existing, error: existingError } = await serviceSupabase
      .from('expansions')
      .select('id, name')
      .eq('guild_id', guild_id)

    if (existingError) {
      console.error('Error loading current expansions:', existingError)
      return NextResponse.json(
        { error: 'Failed to load current expansion data' },
        { status: 500 }
      )
    }

    const currentExpansions: Array<{ id: string; name: string }> = existing ?? []
    let expansionId = currentExpansions.find(exp => exp.name === definition.displayName)?.id ?? null
    const seededNew = !expansionId

    // 2. Seed the new expansion unless the guild already has it
    if (!expansionId) {
      const { expansionId: seededId, error: seedError } = await seedExpansionForGuild(
        serviceSupabase,
        guild_id,
        expansion,
        false, // setAsCurrent: switched below, only after seeding succeeds
        true // useServiceRole: direct inserts; the RPC path needs a signed-in officer session
      )

      if (seedError || !seededId) {
        console.error('Error seeding new expansion:', seedError)
        // The seeder can fail after creating the expansion row. The guild did
        // not have this expansion before, so any row with its name is partial.
        await serviceSupabase
          .from('expansions')
          .delete()
          .eq('guild_id', guild_id)
          .eq('name', definition.displayName)
        return NextResponse.json(
          { error: 'Couldn\'t set up the new expansion. Try again.' },
          { status: 500 }
        )
      }

      expansionId = seededId
    }

    // 3. Point the guild at the new expansion
    const { error: updateError } = await serviceSupabase
      .from('guilds')
      .update({ active_expansion_id: expansionId })
      .eq('id', guild_id)

    if (updateError) {
      console.error('Error updating active expansion:', updateError)
      if (seededNew) {
        // Roll back so the guild keeps its old expansions and active pointer
        await serviceSupabase.from('expansions').delete().eq('id', expansionId)
      }
      return NextResponse.json(
        { error: 'Failed to set active expansion' },
        { status: 500 }
      )
    }

    // 4. Only now remove the old expansions (cascades to raid_tiers and loot_items)
    const oldIds = currentExpansions.map(exp => exp.id).filter(id => id !== expansionId)
    if (oldIds.length > 0) {
      const { error: deleteError } = await serviceSupabase
        .from('expansions')
        .delete()
        .in('id', oldIds)

      if (deleteError) {
        // The switch itself succeeded; the old expansions just stay listed
        // as extra expansions on the guild.
        console.error('Error deleting old expansions:', deleteError)
      }
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
