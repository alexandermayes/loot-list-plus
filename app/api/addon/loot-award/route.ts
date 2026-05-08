import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { trackApiError, trackEvent } from '@/utils/analytics/server'

interface LootAwardRequest {
  guild_id: string
  wowhead_id: number
  character_name: string
  boss_name?: string
  awarded_date?: string
  notes?: string
}

/**
 * POST /api/addon/loot-award
 *
 * Records a single loot award from the addon or companion app.
 * Maps wowhead_id to loot_items.id via the guild's raid tiers.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: LootAwardRequest = await request.json()
    const { guild_id, wowhead_id, character_name, boss_name, awarded_date, notes } = body

    if (!guild_id || !wowhead_id || !character_name) {
      return NextResponse.json({
        error: 'guild_id, wowhead_id, and character_name are required'
      }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Verify officer permissions
    const verification = await verifyOfficerPermissions(supabase, user.id, guild_id)
    if (!verification.hasPermission) {
      return NextResponse.json({ error: 'Officer permissions required' }, { status: 403 })
    }

    // Resolve wowhead_id to loot_item_id
    const { data: lootItem } = await supabase
      .from('loot_items')
      .select('id, name, raid_tier_id')
      .eq('wowhead_id', wowhead_id)
      .limit(1)
      .single()

    if (!lootItem) {
      return NextResponse.json({ error: `No loot item found for wowhead_id ${wowhead_id}` }, { status: 404 })
    }

    // Verify the item belongs to this guild's active expansion
    const { data: raidTier } = await supabase
      .from('raid_tiers')
      .select('expansion_id')
      .eq('id', lootItem.raid_tier_id)
      .single()

    if (!raidTier) {
      return NextResponse.json({ error: 'Raid tier not found for this item' }, { status: 404 })
    }

    // Resolve character name to character_id
    let characterId: string | null = null
    const { data: memberships } = await supabase
      .from('character_guild_memberships')
      .select('character_id, characters(id, name)')
      .eq('guild_id', guild_id)
      .eq('is_active', true)

    if (memberships) {
      for (const m of memberships) {
        const char = Array.isArray(m.characters) ? m.characters[0] : m.characters
        if (char && (char as { name: string }).name?.toLowerCase() === character_name.toLowerCase()) {
          characterId = m.character_id
          break
        }
      }
    }

    // Insert loot history entry
    const { data: historyEntry, error: insertError } = await supabase
      .from('loot_history')
      .insert({
        guild_id,
        character_id: characterId,
        character_name,
        loot_item_id: lootItem.id,
        awarded_date: awarded_date || new Date().toISOString().split('T')[0],
        awarded_by: user.id,
        source: 'addon',
        notes: notes || (boss_name ? `Dropped from ${boss_name}` : null),
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Failed to insert loot history:', insertError)
      return NextResponse.json({ error: 'Failed to record award' }, { status: 500 })
    }

    trackEvent({
      event: 'loot_item_imported',
      userId: user.id,
      guildId: guild_id,
      properties: { source: 'addon', count: 1 },
    })

    return NextResponse.json({
      data: {
        id: historyEntry?.id,
        item_name: lootItem.name,
        character_name,
        character_id: characterId,
      }
    })
  } catch (error) {
    console.error('Error in POST /api/addon/loot-award:', error)
    trackApiError('unknown', 'POST /api/addon/loot-award', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
