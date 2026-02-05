import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Fetch all item priorities for a guild/raid tier
// Optimized: Fast auth (getSession), single membership check query
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get params from query
    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get('guild_id')
    const raidTierId = searchParams.get('raid_tier_id')
    const itemId = searchParams.get('item_id') // Optional - for single item

    if (!guildId) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    // Single query: Verify membership via inner join on characters
    const { data: membership } = await supabase
      .from('character_guild_memberships')
      .select(`
        id,
        character:characters!inner (
          id,
          user_id
        )
      `)
      .eq('guild_id', guildId)
      .eq('character.user_id', user.id)
      .eq('is_active', true)
      .limit(1)

    if (!membership || membership.length === 0) {
      return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
    }

    // Build query
    let query = supabase
      .from('guild_item_priorities')
      .select(`
        *,
        loot_item:loot_items(
          id,
          name,
          boss_name,
          item_slot,
          wowhead_id,
          classification
        )
      `)
      .eq('guild_id', guildId)

    if (raidTierId) {
      query = query.eq('raid_tier_id', raidTierId)
    }

    if (itemId) {
      const parsedItemId = parseInt(itemId, 10)
      if (isNaN(parsedItemId) || parsedItemId < 1 || parsedItemId > 1000000) {
        return NextResponse.json({ error: 'Invalid item_id format' }, { status: 400 })
      }
      query = query.eq('item_id', parsedItemId)
    }

    const { data: priorities, error } = await query

    if (error) {
      console.error('Error fetching item priorities:', error)
      return NextResponse.json({ error: 'Failed to fetch item priorities' }, { status: 500 })
    }

    return NextResponse.json(
      { priorities: priorities || [] },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    )
  } catch (error) {
    console.error('Error in prio-list GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create or update item priority
export async function POST(request: Request) {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const body = await request.json()
    const {
      guild_id,
      item_id,
      raid_tier_id,
      role_priorities,
      class_priorities,
      character_priorities,
      priority_bonuses,
      notes
    } = body

    if (!guild_id || !item_id || !raid_tier_id) {
      return NextResponse.json(
        { error: 'guild_id, item_id, and raid_tier_id are required' },
        { status: 400 }
      )
    }

    // Check if user is guild creator (always has officer permissions)
    const { data: guild } = await supabase
      .from('guilds')
      .select('created_by')
      .eq('id', guild_id)
      .single()

    const isGuildCreator = guild?.created_by === user.id

    // If not guild creator, verify user is an officer via character membership
    if (!isGuildCreator) {
      const { data: userCharacters } = await supabase
        .from('characters')
        .select('id')
        .eq('user_id', user.id)

      if (!userCharacters || userCharacters.length === 0) {
        return NextResponse.json({ error: 'No characters found' }, { status: 403 })
      }

      const characterIds = userCharacters.map(c => c.id)

      const { data: membership } = await supabase
        .from('character_guild_memberships')
        .select('role')
        .eq('guild_id', guild_id)
        .in('character_id', characterIds)
        .limit(1)
        .single()

      if (!membership) {
        return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
      }

      // Check if user is an officer (position >= 50) using guild_roles
      const { data: roleData } = await supabase
        .from('guild_roles')
        .select('position')
        .eq('guild_id', guild_id)
        .eq('name', membership.role)
        .single()

      // Fallback: if no guild_roles entry, check against default positions
      const position = roleData?.position ?? (
        membership.role === 'Guild Master' ? 100 :
        membership.role === 'Officer' ? 50 : 0
      )

      if (position < 50) {
        return NextResponse.json(
          { error: 'Only officers can update item priorities' },
          { status: 403 }
        )
      }
    }

    // Check if priority exists for this item
    const { data: existingPriority } = await supabase
      .from('guild_item_priorities')
      .select('id')
      .eq('guild_id', guild_id)
      .eq('item_id', item_id)
      .eq('raid_tier_id', raid_tier_id)
      .single()

    const priorityData = {
      guild_id,
      item_id,
      raid_tier_id,
      role_priorities: role_priorities || {},
      class_priorities: class_priorities || {},
      character_priorities: character_priorities || {},
      priority_bonuses: priority_bonuses || { role: 5, class: 3, character: 2 },
      notes: notes || null
    }

    let result
    if (existingPriority) {
      // Update existing priority
      const { data, error } = await supabase
        .from('guild_item_priorities')
        .update(priorityData)
        .eq('id', existingPriority.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating item priority:', error)
        return NextResponse.json({ error: 'Failed to update item priority' }, { status: 500 })
      }
      result = data
    } else {
      // Insert new priority
      const { data, error } = await supabase
        .from('guild_item_priorities')
        .insert(priorityData)
        .select()
        .single()

      if (error) {
        console.error('Error creating item priority:', error)
        return NextResponse.json({ error: 'Failed to create item priority' }, { status: 500 })
      }
      result = data
    }

    return NextResponse.json({ priority: result })
  } catch (error) {
    console.error('Error in prio-list POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove item priority
export async function DELETE(request: Request) {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get('guild_id')
    const itemId = searchParams.get('item_id')
    const raidTierId = searchParams.get('raid_tier_id')

    if (!guildId || !itemId || !raidTierId) {
      return NextResponse.json(
        { error: 'guild_id, item_id, and raid_tier_id are required' },
        { status: 400 }
      )
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
      const { data: userCharacters } = await supabase
        .from('characters')
        .select('id')
        .eq('user_id', user.id)

      if (!userCharacters || userCharacters.length === 0) {
        return NextResponse.json({ error: 'No characters found' }, { status: 403 })
      }

      const characterIds = userCharacters.map(c => c.id)

      const { data: membership } = await supabase
        .from('character_guild_memberships')
        .select('role')
        .eq('guild_id', guildId)
        .in('character_id', characterIds)
        .limit(1)
        .single()

      if (!membership) {
        return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
      }

      // Check if user is an officer (position >= 50) using guild_roles
      const { data: roleData } = await supabase
        .from('guild_roles')
        .select('position')
        .eq('guild_id', guildId)
        .eq('name', membership.role)
        .single()

      // Fallback: if no guild_roles entry, check against default positions
      const position = roleData?.position ?? (
        membership.role === 'Guild Master' ? 100 :
        membership.role === 'Officer' ? 50 : 0
      )

      if (position < 50) {
        return NextResponse.json(
          { error: 'Only officers can delete item priorities' },
          { status: 403 }
        )
      }
    }

    // Delete the priority
    const { error } = await supabase
      .from('guild_item_priorities')
      .delete()
      .eq('guild_id', guildId)
      .eq('item_id', itemId)
      .eq('raid_tier_id', raidTierId)

    if (error) {
      console.error('Error deleting item priority:', error)
      return NextResponse.json({ error: 'Failed to delete item priority' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in prio-list DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
