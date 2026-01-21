import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PATCH /api/guilds/[id]/expansions/[expansionId]
 * Update an expansion (set as current, update raid_start_date)
 *
 * Body: {
 *   setAsCurrent?: boolean
 *   raidStartDate?: string (ISO date format)
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expansionId: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: guildId, expansionId } = await params
    const body = await request.json()
    const { setAsCurrent, raidStartDate } = body

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is an officer in this guild
    const { data: membership } = await supabase
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
      return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
    }

    // Check if user is an officer (position >= 50)
    const { data: roleData } = await supabase
      .from('guild_roles')
      .select('position')
      .eq('guild_id', guildId)
      .eq('name', membership.role)
      .single()

    if (!roleData || roleData.position < 50) {
      return NextResponse.json({ error: 'Officer permissions required' }, { status: 403 })
    }

    // Verify expansion belongs to this guild
    const { data: expansion, error: expError } = await supabase
      .from('expansions')
      .select('id, name')
      .eq('id', expansionId)
      .eq('guild_id', guildId)
      .single()

    if (expError || !expansion) {
      return NextResponse.json({ error: 'Expansion not found' }, { status: 404 })
    }

    // Update guild's active expansion if requested
    if (setAsCurrent === true) {
      console.log('PATCH - Setting expansion as current:', expansionId)
      const { data: updateData, error: updateGuildError } = await supabase
        .from('guilds')
        .update({ active_expansion_id: expansionId })
        .eq('id', guildId)
        .select()

      console.log('PATCH - Update result:', updateData)
      console.log('PATCH - Update error:', updateGuildError)

      if (updateGuildError) {
        console.error('Error updating active expansion:', updateGuildError)
        return NextResponse.json({ error: 'Failed to set current expansion' }, { status: 500 })
      }
    }

    // Update expansion's raid_start_date if provided
    if (raidStartDate) {
      const { error: updateExpError } = await supabase
        .from('expansions')
        .update({ raid_start_date: raidStartDate })
        .eq('id', expansionId)

      if (updateExpError) {
        console.error('Error updating raid start date:', updateExpError)
        return NextResponse.json({ error: 'Failed to update raid start date' }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      message: setAsCurrent
        ? `${expansion.name} is now your current expansion`
        : 'Expansion updated successfully'
    })
  } catch (error: any) {
    console.error('Error in PATCH /api/guilds/[id]/expansions/[expansionId]:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
