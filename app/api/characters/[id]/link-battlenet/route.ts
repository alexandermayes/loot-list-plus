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
import { invalidateCache, cacheKeys } from '@/utils/cache'

type LocalizedString = string | Record<string, string>

function resolveLocalized(value: LocalizedString): string {
  if (typeof value === 'string') return value
  return value.en_US || value.en_GB || Object.values(value)[0] || ''
}

const BLIZZARD_CLASS_NAME_MAP: Record<string, string> = {
  Warrior: 'Warrior',
  Paladin: 'Paladin',
  Hunter: 'Hunter',
  Rogue: 'Rogue',
  Priest: 'Priest',
  'Death Knight': 'Death Knight',
  Shaman: 'Shaman',
  Mage: 'Mage',
  Warlock: 'Warlock',
  Druid: 'Druid',
}

interface CharacterProfileResponse {
  name: string
  id: number
  level: number
  character_class: {
    name: LocalizedString
    id: number
  }
  active_spec?: {
    name: LocalizedString
    id: number
  }
  realm: {
    name: LocalizedString
    slug: string
  }
  faction: {
    type: string
    name: LocalizedString
  }
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
 * POST /api/characters/[id]/link-battlenet
 *
 * Links an existing character to a Battle.net profile, enabling gear sync.
 *
 * Body:
 * - realmSlug: Realm slug (e.g., 'faerlina')
 * - characterName: Battle.net character name
 * - version: 'cata-classic' | 'classic-era' (default: 'cata-classic')
 * - importGear: Whether to import equipped gear (default: true)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: characterId } = await params
    const body = await request.json()
    const {
      realmSlug,
      characterName,
      version = 'cata-classic',
      importGear = true,
    } = body

    if (!realmSlug || !characterName) {
      return NextResponse.json(
        { error: 'realmSlug and characterName are required' },
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

    // Verify character ownership and that it's not already linked
    const { data: character } = await supabase
      .from('characters')
      .select('id, name, battle_net_id, user_id, class_id')
      .eq('id', characterId)
      .eq('user_id', user.id)
      .single()

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    if (character.battle_net_id) {
      return NextResponse.json(
        { error: 'This character is already linked to Battle.net' },
        { status: 409 }
      )
    }

    // Fetch character profile from Battle.net
    const gameVersion = version as GameVersion
    const namespaces = getWowProfileNamespaces(gameVersion, account.region)
    const charNameLower = characterName.toLowerCase()
    const profilePath = `/profile/wow/character/${realmSlug}/${charNameLower}`

    let profileResponse: Response | null = null
    let workingNamespace = namespaces[0]
    for (const ns of namespaces) {
      const resp = await battlenetFetch(account, profilePath, ns)
      if (resp.ok) {
        profileResponse = resp
        workingNamespace = ns
        break
      }
      if (resp.status !== 404) {
        return NextResponse.json(
          { error: 'Couldn\'t find that character on Battle.net. Check the name and realm.' },
          { status: 404 }
        )
      }
    }

    if (!profileResponse) {
      return NextResponse.json(
        { error: 'Couldn\'t find that character on Battle.net. Check the name and realm.' },
        { status: 404 }
      )
    }

    const profile: CharacterProfileResponse = await profileResponse.json()

    // Verify no other character already has this battle_net_id
    const { data: existingByBnetId } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)
      .eq('battle_net_id', profile.id)
      .maybeSingle()

    if (existingByBnetId) {
      return NextResponse.json(
        { error: 'Another character is already linked to this Battle.net character' },
        { status: 409 }
      )
    }

    // Resolve class and spec from Battle.net profile
    const className = resolveLocalized(profile.character_class.name)
    const localClassName = BLIZZARD_CLASS_NAME_MAP[className]

    let classId = character.class_id
    let specId: string | null = null

    if (localClassName) {
      const { data: wowClass } = await supabase
        .from('wow_classes')
        .select('id')
        .eq('name', localClassName)
        .single()

      if (wowClass) {
        classId = wowClass.id

        // Try to match active spec
        if (profile.active_spec) {
          const { data: specs } = await supabase
            .from('class_specs')
            .select('id, name')
            .eq('class_id', wowClass.id)

          if (specs && specs.length > 0) {
            const specName = resolveLocalized(profile.active_spec.name).toLowerCase()
            const exactMatch = specs.find(
              (s) => s.name.toLowerCase() === specName
            )
            if (exactMatch) {
              specId = exactMatch.id
            } else {
              const partialMatch = specs.find((s) =>
                s.name
                  .toLowerCase()
                  .split('/')
                  .some((part: string) => part.trim() === specName)
              )
              if (partialMatch) {
                specId = partialMatch.id
              }
            }
          }
        }
      }
    }

    // Update character with Battle.net data
    const updateData: Record<string, unknown> = {
      battle_net_id: profile.id,
      realm: resolveLocalized(profile.realm.name),
      game_version: gameVersion,
      level: profile.level,
      class_id: classId,
    }
    if (specId) {
      updateData.spec_id = specId
    }

    const { data: updatedCharacter, error: updateError } = await supabase
      .from('characters')
      .update(updateData)
      .eq('id', characterId)
      .select(
        `*, class:wow_classes(id, name, color_hex), spec:class_specs(id, name)`
      )
      .single()

    if (updateError) {
      console.error('Error linking character:', updateError)
      return NextResponse.json(
        { error: 'Failed to link character' },
        { status: 500 }
      )
    }

    // Import gear if requested
    let gearCount = 0
    if (importGear) {
      try {
        const equipResponse = await battlenetFetch(
          account,
          `/profile/wow/character/${realmSlug}/${charNameLower}/equipment`,
          workingNamespace
        )

        if (equipResponse.ok) {
          const equipment: EquipmentResponse = await equipResponse.json()

          if (equipment.equipped_items && equipment.equipped_items.length > 0) {
            // Delete existing gear first
            await supabase
              .from('character_equipped_items')
              .delete()
              .eq('character_id', characterId)

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
                console.error('Error importing gear during link:', gearError)
              } else {
                gearCount = itemsToInsert.length
              }
            }
          }
        }
      } catch (gearErr) {
        console.error('Error fetching gear during link:', gearErr)
      }
    }

    await invalidateCache(cacheKeys.userCharacters(user.id))

    return NextResponse.json({
      character: updatedCharacter,
      gear_imported: gearCount,
    })
  } catch (error) {
    console.error('Error in POST /api/characters/[id]/link-battlenet:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
