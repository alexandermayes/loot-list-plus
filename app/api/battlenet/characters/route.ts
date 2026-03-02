import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { getBattlenetAccount, battlenetFetch, getWowProfileNamespace, type GameVersion } from '@/lib/battlenet'

// Battle.net API returns localized strings as either a plain string
// or an object with locale keys (e.g. { en_US: "Warrior", es_MX: "Guerrero" })
type LocalizedString = string | Record<string, string>

function resolveLocalized(value: LocalizedString): string {
  if (typeof value === 'string') return value
  return value.en_US || value.en_GB || Object.values(value)[0] || ''
}

interface BattlenetCharacter {
  name: string
  id: number
  realm: {
    name: LocalizedString
    slug: string
    id: number
  }
  playable_class: {
    name: LocalizedString
    id: number
  }
  playable_race: {
    name: LocalizedString
    id: number
  }
  level: number
  faction: {
    type: string
    name: LocalizedString
  }
}

interface WowAccountProfile {
  wow_accounts?: Array<{
    id: number
    characters?: BattlenetCharacter[]
  }>
}

/**
 * GET /api/battlenet/characters
 *
 * Lists all WoW characters from the user's linked Battle.net account.
 *
 * Query params:
 * - version: 'cata-classic' | 'classic-era' (default: 'cata-classic')
 */
export async function GET(request: NextRequest) {
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

    const version = (request.nextUrl.searchParams.get('version') || 'cata-classic') as GameVersion
    if (!['cata-classic', 'classic-era', 'tbc-anniversary'].includes(version)) {
      return NextResponse.json({ error: 'Invalid version. Must be cata-classic, classic-era or tbc-anniversary.' }, { status: 400 })
    }

    const namespace = getWowProfileNamespace(version, account.region)

    let response: Response
    try {
      response = await battlenetFetch(
        account,
        '/profile/user/wow',
        namespace
      )
    } catch (tokenError: any) {
      console.error('Battle.net token/fetch error:', tokenError.message)
      const needsReauth = tokenError.message?.includes('re-authenticate') || tokenError.message?.includes('refresh')
      return NextResponse.json(
        { error: needsReauth ? 'Battle.net session expired. Please reconnect your account in profile settings.' : 'Could not connect to Battle.net. Try again.' },
        { status: needsReauth ? 401 : 502 }
      )
    }

    if (!response.ok) {
      const text = await response.text()
      console.error('Battle.net profile fetch failed:', response.status, text)
      return NextResponse.json(
        { error: 'Failed to fetch characters from Battle.net' },
        { status: 502 }
      )
    }

    const profile: WowAccountProfile = await response.json()

    // Flatten characters from all WoW accounts
    const characters: Array<{
      name: string
      battlenet_id: number
      realm: string
      realm_slug: string
      class_name: string
      class_id: number
      level: number
      faction: string
    }> = []

    for (const wowAccount of profile.wow_accounts || []) {
      for (const char of wowAccount.characters || []) {
        characters.push({
          name: char.name,
          battlenet_id: char.id,
          realm: resolveLocalized(char.realm.name),
          realm_slug: char.realm.slug,
          class_name: resolveLocalized(char.playable_class.name),
          class_id: char.playable_class.id,
          level: char.level,
          faction: char.faction ? resolveLocalized(char.faction.name) : 'Unknown',
        })
      }
    }

    // Sort by level descending, then name
    characters.sort((a, b) => b.level - a.level || a.name.localeCompare(b.name))

    return NextResponse.json({ characters, version, region: account.region })
  } catch (error) {
    console.error('Error in GET /api/battlenet/characters:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
