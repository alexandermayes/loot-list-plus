import { createClient } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { NextRequest, NextResponse } from 'next/server'
import { seedExpansionForGuild, getGuildExpansions, getAvailableExpansions } from '@/app/services/expansionSeeder'

/**
 * GET /api/guilds/[id]/expansions
 * Get all expansions for a guild
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: guildId } = await params

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a member of this guild
    const { data: membership } = await supabase
      .from('character_guild_memberships')
      .select('id')
      .eq('guild_id', guildId)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (!membership) {
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
  } catch (error: any) {
    console.error('Error in GET /api/guilds/[id]/expansions:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
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
    const supabase = await createClient()
    const { id: guildId } = await params
    const body = await request.json()
    const { expansionName, setAsCurrent = true } = body

    if (!expansionName) {
      return NextResponse.json({ error: 'expansionName is required' }, { status: 400 })
    }

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is guild creator (always has officer permissions)
    const { data: guild } = await supabase
      .from('guilds')
      .select('created_by')
      .eq('id', guildId)
      .single()

    const isGuildCreator = guild?.created_by === user.id

    // If not guild creator, verify user is an officer via character membership
    if (!isGuildCreator) {
      const { data: membership, error: membershipError } = await supabase
        .from('character_guild_memberships')
        .select(`
          id,
          role,
          guild_id,
          character:characters!inner (
            user_id
          )
        `)
        .eq('guild_id', guildId)
        .eq('is_active', true)
        .eq('characters.user_id', user.id)
        .single()

      if (!membership) {
        return NextResponse.json({
          error: 'Not a member of this guild'
        }, { status: 403 })
      }

      // Check if user is an officer (position >= 50)
      const { data: roleData } = await supabase
        .from('guild_roles')
        .select('position')
        .eq('guild_id', guildId)
        .eq('name', membership.role)
        .single()

      if (!roleData || roleData.position < 50) {
        return NextResponse.json({
          error: 'Officer permissions required'
        }, { status: 403 })
      }
    }

    // Seed the expansion using service role to bypass RLS
    const serviceSupabase = createServiceRoleClient()
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
      message: `${expansionName} has been added to your guild!`
    })
  } catch (error: any) {
    console.error('Error in POST /api/guilds/[id]/expansions:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
