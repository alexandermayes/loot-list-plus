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
import { trackEvent } from '@/utils/analytics/server'

// Battle.net API returns localized strings as either a plain string
// or an object with locale keys (e.g. { en_US: "Warrior", es_MX: "Guerrero" })
type LocalizedString = string | Record<string, string>

function resolveLocalized(value: LocalizedString): string {
  if (typeof value === 'string') return value
  return value.en_US || value.en_GB || Object.values(value)[0] || ''
}

/**
 * Battle.net class names to local wow_classes names.
 * Battle.net uses English names; our DB stores them in the same format.
 */
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
  Monk: 'Monk',
  Druid: 'Druid',
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

/**
 * POST /api/battlenet/characters/import
 *
 * Imports a character from Battle.net, creating it in the database
 * and optionally importing equipped gear.
 *
 * Body:
 * - name: Character name
 * - realmSlug: Realm slug (e.g., 'faerlina')
 * - version: 'cata-classic' | 'classic-era'
 * - guildId?: Guild ID to add character to
 * - isMain?: Whether to set as main character
 * - importGear?: Whether to import equipped gear (default: true)
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
    const {
      name,
      realmSlug,
      version = 'cata-classic',
      guildId,
      isMain = false,
      importGear = true,
      specId: clientSpecId,
    } = body

    if (!name || !realmSlug) {
      return NextResponse.json(
        { error: 'name and realmSlug are required' },
        { status: 400 }
      )
    }

    if (!['cata-classic', 'classic-era', 'tbc-anniversary'].includes(version)) {
      return NextResponse.json(
        { error: 'Invalid version. Must be cata-classic, classic-era or tbc-anniversary.' },
        { status: 400 }
      )
    }

    const gameVersion = version as GameVersion
    const namespaces = getWowProfileNamespaces(gameVersion, account.region)
    const charNameLower = name.toLowerCase()
    const profilePath = `/profile/wow/character/${realmSlug}/${charNameLower}`

    // Fetch character profile from Battle.net, trying fallback namespaces
    // (some Classic Era realms were migrated and live under a different namespace)
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
        const text = await resp.text()
        console.error('Battle.net character profile fetch failed:', resp.status, text)
        return NextResponse.json(
          { error: 'Couldn\'t find that character on Battle.net. Check the name and realm.' },
          { status: 404 }
        )
      }
    }

    if (!profileResponse) {
      console.error('Battle.net character profile not found in any namespace:', namespaces)
      return NextResponse.json(
        { error: 'Couldn\'t find that character on Battle.net. Check the name and realm.' },
        { status: 404 }
      )
    }

    const profile: CharacterProfileResponse = await profileResponse.json()

    const supabase = createServiceRoleClient()

    // Map Battle.net class name to local wow_classes row
    const className = resolveLocalized(profile.character_class.name)
    const localClassName = BLIZZARD_CLASS_NAME_MAP[className]
    if (!localClassName) {
      return NextResponse.json(
        { error: `Unknown class: ${className}` },
        { status: 400 }
      )
    }

    const { data: wowClass } = await supabase
      .from('wow_classes')
      .select('id, name, color_hex')
      .eq('name', localClassName)
      .single()

    if (!wowClass) {
      return NextResponse.json(
        { error: `Class not found in database: ${localClassName}` },
        { status: 500 }
      )
    }

    // Try to match active spec to a local class_spec
    let specId: string | null = null
    const { data: specs } = await supabase
      .from('class_specs')
      .select('id, name')
      .eq('class_id', wowClass.id)

    if (specs && specs.length > 0) {
      if (profile.active_spec) {
        // Try exact match first, then check if the spec name is contained in a combined spec (e.g., "Holy" matches "Holy/Disc")
        const specName = resolveLocalized(profile.active_spec!.name).toLowerCase()
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

      // If no spec matched but class only has one spec, auto-assign it
      if (!specId && specs.length === 1) {
        specId = specs[0].id
      }
    }

    // If client provided a specId (from the spec picker), use it
    if (clientSpecId) {
      specId = clientSpecId
    }

    // If spec still unknown and class has multiple specs, ask the client to pick
    if (!specId && specs && specs.length > 1) {
      return NextResponse.json({
        needs_spec: true,
        available_specs: specs.map(s => ({ id: s.id, name: s.name })),
        character_name: profile.name,
        class_name: wowClass.name,
      }, { status: 200 })
    }

    // Check if character already exists (by battle_net_id or name+realm)
    const { data: existingByBnetId } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)
      .eq('battle_net_id', profile.id)
      .maybeSingle()

    if (existingByBnetId) {
      return NextResponse.json(
        { error: 'This character has already been imported' },
        { status: 409 }
      )
    }

    const { data: existingByName } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', profile.name)
      .eq('realm', resolveLocalized(profile.realm.name))
      .maybeSingle()

    if (existingByName) {
      return NextResponse.json(
        { error: 'You already have a character with this name and realm' },
        { status: 409 }
      )
    }

    // If setting as main, unset existing mains
    if (isMain) {
      await supabase
        .from('characters')
        .update({ is_main: false })
        .eq('user_id', user.id)
    }

    // Create the character
    const { data: character, error: createError } = await supabase
      .from('characters')
      .insert({
        user_id: user.id,
        name: profile.name,
        realm: resolveLocalized(profile.realm.name),
        class_id: wowClass.id,
        spec_id: specId,
        level: profile.level,
        is_main: isMain,
        region: account.region,
        battle_net_id: profile.id,
        game_version: gameVersion,
      })
      .select(
        `*, class:wow_classes(id, name, color_hex), spec:class_specs(id, name)`
      )
      .single()

    if (createError) {
      console.error('Error creating character:', createError)
      return NextResponse.json(
        { error: 'Failed to create character' },
        { status: 500 }
      )
    }

    // Add to guild if provided
    if (guildId) {
      const { error: guildError } = await supabase
        .from('character_guild_memberships')
        .upsert(
          {
            character_id: character.id,
            guild_id: guildId,
            role: 'Member',
            is_active: true,
            joined_via: 'battlenet_import',
          },
          { onConflict: 'character_id,guild_id' }
        )

      if (guildError) {
        console.error('Error adding character to guild:', guildError)
        // Non-critical, continue
      }

      // Ensure guild_members record exists
      await supabase
        .from('guild_members')
        .upsert(
          {
            guild_id: guildId,
            user_id: user.id,
            role: 'Member',
            is_active: true,
          },
          { onConflict: 'guild_id,user_id' }
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
            const itemsToInsert = equipment.equipped_items
              .filter((item) => {
                // Only import slots we track
                const mappedSlot = SLOT_MAPPING[item.slot.type]
                return !!mappedSlot
              })
              .map((item) => ({
                character_id: character.id,
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
                console.error('Error importing gear:', gearError)
              } else {
                gearCount = itemsToInsert.length
              }
            }
          }
        }
      } catch (gearErr) {
        console.error('Error fetching gear from Battle.net:', gearErr)
        // Non-critical, character was still created
      }
    }

    // Invalidate cache
    await invalidateCache(cacheKeys.userCharacters(user.id))

    trackEvent({
      event: 'character_imported',
      userId: user.id,
      properties: {
        character_id: character.id,
        character_name: character.name,
        source: 'battlenet',
        gear_count: gearCount,
        version,
      },
    })

    return NextResponse.json(
      {
        character,
        gear_imported: gearCount,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/battlenet/characters/import:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
