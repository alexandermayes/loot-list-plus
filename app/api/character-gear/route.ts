import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { parseWowSimsExport, type ParsedGearItem } from '@/lib/wowsims-parser'

interface EquippedItem {
  id: string
  slot: string
  wowhead_id: number
  item_name: string | null
  enchant_id: number | null
  gem_ids: number[] | null
  imported_at: string
}

/**
 * GET /api/character-gear
 *
 * Fetches equipped items for a character.
 *
 * Query params:
 * - character_id: The character ID
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const characterId = searchParams.get('character_id')

    if (!characterId) {
      return NextResponse.json({ error: 'character_id is required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Verify character exists and user has access
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id, user_id')
      .eq('id', characterId)
      .single()

    if (charError || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    // Check if user owns character or is in same guild
    if (character.user_id !== user.id) {
      // Get guilds this character belongs to
      const { data: characterGuilds } = await supabase
        .from('character_guild_memberships')
        .select('guild_id')
        .eq('character_id', characterId)
        .eq('is_active', true)

      if (!characterGuilds || characterGuilds.length === 0) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }

      const guildIds = characterGuilds.map(g => g.guild_id)

      // Check if requesting user has any characters in those guilds
      const { data: userCharacters } = await supabase
        .from('characters')
        .select('id')
        .eq('user_id', user.id)

      if (!userCharacters || userCharacters.length === 0) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }

      const userCharacterIds = userCharacters.map(c => c.id)

      const { data: sharedGuildMembership } = await supabase
        .from('character_guild_memberships')
        .select('id')
        .in('character_id', userCharacterIds)
        .in('guild_id', guildIds)
        .eq('is_active', true)
        .limit(1)

      if (!sharedGuildMembership || sharedGuildMembership.length === 0) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }
    }

    // Get equipped items (from WowSims import)
    const { data: equippedItems, error: itemsError } = await supabase
      .from('character_equipped_items')
      .select('id, slot, wowhead_id, item_name, enchant_id, gem_ids, imported_at')
      .eq('character_id', characterId)
      .order('slot')

    if (itemsError) {
      console.error('Error fetching equipped items:', itemsError)
      return NextResponse.json({ error: 'Failed to fetch equipped items' }, { status: 500 })
    }

    // Get awarded items from loot history (items received via raid tracking)
    const { data: awardedItems, error: awardedError } = await supabase
      .from('loot_history')
      .select(`
        id,
        awarded_date,
        loot_items!inner (
          wowhead_id,
          name,
          item_slot
        )
      `)
      .eq('character_id', characterId)

    if (awardedError) {
      console.error('Error fetching loot history:', awardedError)
      // Don't fail the request, just continue without awarded items
    }

    // Convert awarded items to a similar format and collect wowhead_ids
    interface AwardedItemRow {
      id: string
      awarded_date: string
      loot_items: { wowhead_id: number; name: string; item_slot: string } | null
    }

    const awardedWowheadIds = ((awardedItems || []) as unknown as AwardedItemRow[]).map((item) => ({
      wowhead_id: item.loot_items?.wowhead_id,
      item_name: item.loot_items?.name,
      slot: item.loot_items?.item_slot,
      awarded_date: item.awarded_date,
      source: 'loot_history' as const
    })).filter((item) => item.wowhead_id)

    return NextResponse.json({
      character_id: characterId,
      items: equippedItems || [],
      awarded_items: awardedWowheadIds,
      count: (equippedItems?.length || 0) + awardedWowheadIds.length
    })
  } catch (error) {
    console.error('Error in GET /api/character-gear:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/character-gear
 *
 * Import gear from WowSims JSON export.
 * Replaces all existing equipped items for the character.
 *
 * Body:
 * - character_id: The character ID
 * - wowsims_json: The raw JSON string from WowSims export
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { character_id: characterId, wowsims_json: wowsimsJson } = body

    if (!characterId) {
      return NextResponse.json({ error: 'character_id is required' }, { status: 400 })
    }

    if (!wowsimsJson) {
      return NextResponse.json({ error: 'wowsims_json is required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Verify character exists and user owns it
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id, user_id, name')
      .eq('id', characterId)
      .single()

    if (charError || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    if (character.user_id !== user.id) {
      // Check if user is officer in character's guild
      const { data: characterGuilds } = await supabase
        .from('character_guild_memberships')
        .select('guild_id')
        .eq('character_id', characterId)
        .eq('is_active', true)

      if (!characterGuilds || characterGuilds.length === 0) {
        return NextResponse.json({ error: 'Not authorized to modify this character' }, { status: 403 })
      }

      const guildIds = characterGuilds.map(g => g.guild_id)

      // Get user's characters
      const { data: userCharacters } = await supabase
        .from('characters')
        .select('id')
        .eq('user_id', user.id)

      if (!userCharacters || userCharacters.length === 0) {
        return NextResponse.json({ error: 'Not authorized to modify this character' }, { status: 403 })
      }

      const userCharacterIds = userCharacters.map(c => c.id)

      // Check if user has officer role in any of the character's guilds
      const { data: officerMembership } = await supabase
        .from('character_guild_memberships')
        .select('role')
        .in('character_id', userCharacterIds)
        .in('guild_id', guildIds)
        .eq('is_active', true)
        .in('role', ['Officer', 'Guild Master'])
        .limit(1)

      if (!officerMembership || officerMembership.length === 0) {
        return NextResponse.json({ error: 'Not authorized to modify this character' }, { status: 403 })
      }
    }

    // Parse WowSims JSON
    const parseResult = parseWowSimsExport(wowsimsJson)

    if (!parseResult.success || !parseResult.data) {
      return NextResponse.json({
        error: parseResult.error || 'Failed to parse WowSims export',
        code: 'PARSE_ERROR'
      }, { status: 400 })
    }

    const parsedGear = parseResult.data

    // Delete existing equipped items for this character
    const { error: deleteError } = await supabase
      .from('character_equipped_items')
      .delete()
      .eq('character_id', characterId)

    if (deleteError) {
      console.error('Error deleting existing gear:', deleteError)
      return NextResponse.json({ error: 'Failed to clear existing gear' }, { status: 500 })
    }

    // Insert new equipped items
    const itemsToInsert = parsedGear.items.map((item: ParsedGearItem) => ({
      character_id: characterId,
      slot: item.slot,
      wowhead_id: item.wowheadId,
      item_name: item.itemName,
      enchant_id: item.enchantId || null,
      gem_ids: item.gemIds || null
    }))

    const { data: insertedItems, error: insertError } = await supabase
      .from('character_equipped_items')
      .insert(itemsToInsert)
      .select()

    if (insertError) {
      console.error('Error inserting gear:', insertError)
      return NextResponse.json({ error: 'Failed to save gear' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      character_id: characterId,
      character_name: character.name,
      imported_character_name: parsedGear.characterName,
      imported_class: parsedGear.className,
      items_imported: insertedItems?.length || 0,
      items: insertedItems
    })
  } catch (error) {
    console.error('Error in POST /api/character-gear:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/character-gear
 *
 * Clear all equipped items for a character.
 *
 * Query params:
 * - character_id: The character ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const characterId = searchParams.get('character_id')

    if (!characterId) {
      return NextResponse.json({ error: 'character_id is required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Verify character exists and user owns it
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id, user_id')
      .eq('id', characterId)
      .single()

    if (charError || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    if (character.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Delete all equipped items
    const { error: deleteError } = await supabase
      .from('character_equipped_items')
      .delete()
      .eq('character_id', characterId)

    if (deleteError) {
      console.error('Error deleting gear:', deleteError)
      return NextResponse.json({ error: 'Failed to clear gear' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      character_id: characterId
    })
  } catch (error) {
    console.error('Error in DELETE /api/character-gear:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
