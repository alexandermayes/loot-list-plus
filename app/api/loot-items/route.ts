import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

interface LootItemClassRestriction {
  class_id: string
  spec_id: string | null
  spec_type: string | null
}

// GET - Fetch loot items for a raid tier, filtered by character spec
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const tierId = searchParams.get('tier_id')
    const characterId = searchParams.get('character_id')
    const guildId = searchParams.get('guild_id')

    if (!tierId || !characterId) {
      return NextResponse.json({ error: 'tier_id and character_id are required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Get character info for spec filtering
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id, class_id, spec_id, user_id')
      .eq('id', characterId)
      .single()

    if (charError || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    // Verify user owns this character
    if (character.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized for this character' }, { status: 403 })
    }

    // Fetch loot items with class/spec restrictions
    const { data: items, error: itemsError } = await supabase
      .from('loot_items')
      .select(`
        id, name, boss_name, item_slot, wowhead_id,
        classification, item_type, allocation_cost, is_available, roles,
        loot_item_classes(class_id, spec_id, spec_type)
      `)
      .eq('raid_tier_id', tierId)
      .eq('is_available', true)
      .order('id')

    if (itemsError) {
      console.error('Error fetching loot items:', itemsError)
      return NextResponse.json({ error: 'Failed to fetch loot items' }, { status: 500 })
    }

    // Filter items based on character's class/spec
    const filteredItems = (items || []).filter(item => {
      const classes = item.loot_item_classes as LootItemClassRestriction[]

      // If no spec restrictions, show to anyone
      if (classes.length === 0) return true

      // If character has no spec set, show all items for their class
      if (!character.spec_id) {
        return classes.some(c => c.class_id === character.class_id)
      }

      // Check if character's specific spec is in primary or secondary list
      return classes.some(c => c.spec_id === character.spec_id)
    })

    // If guildId provided, fetch consensus counts (how many OTHER guildmates ranked each item)
    let consensusCounts: Record<string, number> = {}

    if (guildId && filteredItems.length > 0) {
      const itemIds = filteredItems.map(item => item.id)

      // Query approved submissions from other characters in the guild for this tier
      const { data: submissionItems } = await supabase
        .from('loot_submission_items')
        .select(`
          loot_item_id,
          loot_submissions!inner(character_id, status, guild_id, raid_tier_id)
        `)
        .in('loot_item_id', itemIds)
        .eq('loot_submissions.raid_tier_id', tierId)
        .eq('loot_submissions.guild_id', guildId)
        .eq('loot_submissions.status', 'approved')
        .neq('loot_submissions.character_id', characterId)

      // Count unique characters per item
      if (submissionItems) {
        const charactersByItem: Record<string, Set<string>> = {}
        submissionItems.forEach((si: any) => {
          const itemId = si.loot_item_id
          const charId = si.loot_submissions?.character_id
          if (itemId && charId) {
            if (!charactersByItem[itemId]) {
              charactersByItem[itemId] = new Set()
            }
            charactersByItem[itemId].add(charId)
          }
        })
        // Convert sets to counts
        Object.entries(charactersByItem).forEach(([itemId, chars]) => {
          consensusCounts[itemId] = chars.size
        })
      }
    }

    // Merge consensus counts into response
    const itemsWithConsensus = filteredItems.map(item => ({
      ...item,
      consensus_count: consensusCounts[item.id] || 0
    }))

    return NextResponse.json({ items: itemsWithConsensus })
  } catch (error) {
    console.error('Error in GET /api/loot-items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
