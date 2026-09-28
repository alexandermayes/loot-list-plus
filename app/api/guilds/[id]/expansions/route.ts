import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { NextRequest, NextResponse } from 'next/server'
import { seedExpansionForGuild, getGuildExpansions, getAvailableExpansions, getExpansionGame, gameMismatchError } from '@/app/services/expansionSeeder'
import { getExpansionDisplayName } from '@/utils/expansionVisuals'
import { getGuildGame } from '@/domain/expansion/game'

/**
 * GET /api/guilds/[id]/expansions
 * Get all expansions for a guild
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: guildId } = await params

    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get user's characters first
    const { data: userCharacters } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)

    if (!userCharacters || userCharacters.length === 0) {
      return NextResponse.json({ error: 'No characters found' }, { status: 403 })
    }

    const characterIds = userCharacters.map(c => c.id)

    // Verify user is a member of this guild via their characters
    const { data: membership } = await supabase
      .from('character_guild_memberships')
      .select('id')
      .eq('guild_id', guildId)
      .in('character_id', characterIds)
      .eq('is_active', true)
      .limit(1)

    if (!membership || membership.length === 0) {
      return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
    }

    // Get all expansions for this guild using the helper function
    const { data: expansions, error } = await supabase
      .rpc('get_guild_expansions', { p_guild_id: guildId })

    if (error) {
      console.error('Error fetching guild expansions:', error)
      return NextResponse.json({ error: 'Failed to fetch expansions' }, { status: 500 })
    }

    return NextResponse.json({ expansions })
  } catch (error) {
    console.error('Error in GET /api/guilds/[id]/expansions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/guilds/[id]/expansions
 * Add a new expansion to a guild
 *
 * Body: {
 *   expansionName: string (e.g., "Classic", "The Burning Crusade")
 *   setAsCurrent: boolean (default: true)
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: guildId } = await params
    const body = await request.json()
    const { expansionName, setAsCurrent = true } = body

    if (!expansionName) {
      return NextResponse.json({ error: 'expansionName is required' }, { status: 400 })
    }

    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceSupabase = createServiceRoleClient()
    const { hasPermission } = await verifyPermission(serviceSupabase, user.id, guildId, 'manage_settings')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Officer permissions required' }, { status: 403 })
    }

    // Load the guild's fixed game version (D-02, D-06) before seeding -- a
    // cross-game expansion is refused before the seeder ever runs.
    const { data: guildRow, error: guildError } = await serviceSupabase
      .from('guilds')
      .select('game')
      .eq('id', guildId)
      .single()

    if (guildError || !guildRow) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 })
    }

    const expansionGame = getExpansionGame(expansionName)
    if (expansionGame !== null && expansionGame !== getGuildGame(guildRow)) {
      return NextResponse.json({ error: gameMismatchError(expansionName) }, { status: 400 })
    }

    // Seed the expansion using service role to bypass RLS
    const result = await seedExpansionForGuild(
      serviceSupabase,
      guildId,
      expansionName,
      setAsCurrent,
      true // using service role to bypass RLS
    )

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      expansionId: result.expansionId,
      message: `${getExpansionDisplayName(expansionName)} has been added to your guild!`
    })
  } catch (error) {
    console.error('Error in POST /api/guilds/[id]/expansions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
