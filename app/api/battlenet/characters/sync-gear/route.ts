import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import {
  getBattlenetAccount,
  battlenetFetch,
  getWowProfileNamespaces,
  SLOT_MAPPING,
  type GameVersion,
} from '@/lib/battlenet'

// Battle.net API returns localized strings as either a plain string
// or an object with locale keys (e.g. { en_US: "Warrior", es_MX: "Guerrero" })
type LocalizedString = string | Record<string, string>

function resolveLocalized(value: LocalizedString): string {
  if (typeof value === 'string') return value
  return value.en_US || value.en_GB || Object.values(value)[0] || ''
}

interface EquipmentResponse {
  equipped_items?: Array<{
    slot: {
      type: string
      name: LocalizedString
    }
    item: {
      id: number
      name: LocalizedString
    }
    enchantments?: Array<{
      enchantment_id: number
    }>
    sockets?: Array<{
      item?: {
        id: number
      }
    }>
  }>
}

/**
 * POST /api/battlenet/characters/sync-gear
 *
 * Re-syncs equipped gear for an existing character from Battle.net.
 * Deletes existing gear and replaces with current equipped items.
 *
 * Body:
 * - characterId: Character ID (must have battle_net_id)
 * - version: 'cata-classic' | 'classic-era' (default: 'cata-classic')
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const account = await getBattlenetAccount(user.id)
    if (!account) {
      return NextResponse.json(
        { error: 'No Battle.net account linked. Connect one in profile settings.' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { characterId, version = 'cata-classic' } = body

    if (!characterId) {
      return NextResponse.json(
        { error: 'characterId is required' },
        { status: 400 }
      )
    }

    if (!['cata-classic', 'classic-era', 'tbc-anniversary'].includes(version)) {
      return NextResponse.json(
        { error: 'Invalid version. Must be cata-classic, classic-era or tbc-anniversary.' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Verify character ownership and has battle_net_id
    const { data: character } = await supabase
      .from('characters')
      .select('id, name, realm, battle_net_id, user_id')
      .eq('id', characterId)
      .eq('user_id', user.id)
      .single()

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    if (!character.battle_net_id) {
      return NextResponse.json(
        { error: 'This character was not imported from Battle.net' },
        { status: 400 }
      )
    }

    if (!character.realm) {
      return NextResponse.json(
        { error: 'Character is missing realm data needed for Battle.net sync' },
        { status: 400 }
      )
    }

    const gameVersion = version as GameVersion
    const namespaces = getWowProfileNamespaces(gameVersion, account.region)
    const charNameLower = character.name.toLowerCase()
    const realmSlug = character.realm.toLowerCase().replace(/\s+/g, '-')
    const equipPath = `/profile/wow/character/${realmSlug}/${charNameLower}/equipment`

    // Fetch equipment from Battle.net, trying fallback namespaces
    let equipResponse: Response | null = null
    for (const ns of namespaces) {
      const resp = await battlenetFetch(account, equipPath, ns)
      if (resp.ok) {
        equipResponse = resp
        break
      }
      if (resp.status !== 404) {
        const text = await resp.text()
        console.error('Battle.net equipment fetch failed:', resp.status, text)
        return NextResponse.json(
          { error: 'Couldn\'t fetch gear from Battle.net. The character may not be accessible.' },
          { status: 502 }
        )
      }
    }

    if (!equipResponse) {
      console.error('Battle.net equipment not found in any namespace:', namespaces)
      return NextResponse.json(
        { error: 'Couldn\'t fetch gear from Battle.net. The character may not be accessible.' },
        { status: 502 }
      )
    }

    const equipment: EquipmentResponse = await equipResponse.json()

    // Delete existing gear
    await supabase
      .from('character_equipped_items')
      .delete()
      .eq('character_id', characterId)

    let gearCount = 0

    if (equipment.equipped_items && equipment.equipped_items.length > 0) {
      const itemsToInsert = equipment.equipped_items
        .filter((item) => {
          const mappedSlot = SLOT_MAPPING[item.slot.type]
          return !!mappedSlot
        })
        .map((item) => ({
          character_id: characterId,
          slot: SLOT_MAPPING[item.slot.type],
          wowhead_id: item.item.id,
          item_name: resolveLocalized(item.item.name),
          enchant_id: item.enchantments?.[0]?.enchantment_id || null,
          gem_ids:
            item.sockets
              ?.map((s) => s.item?.id)
              .filter((id): id is number => !!id) || null,
        }))

      if (itemsToInsert.length > 0) {
        const { error: gearError } = await supabase
          .from('character_equipped_items')
          .insert(itemsToInsert)

        if (gearError) {
          console.error('Error inserting gear:', gearError)
          return NextResponse.json(
            { error: 'Fetched gear but couldn\'t save it. Try again.' },
            { status: 500 }
          )
        }

        gearCount = itemsToInsert.length
      }
    }

    return NextResponse.json({
      gear_synced: gearCount,
      character_id: characterId,
    })
  } catch (error) {
    console.error('Error in POST /api/battlenet/characters/sync-gear:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
