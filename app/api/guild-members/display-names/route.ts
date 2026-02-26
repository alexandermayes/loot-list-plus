import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { NextRequest, NextResponse } from 'next/server'
import { batchGetDisplayNamesRecord } from '@/utils/batch-display-names'

// UUID v4 format regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MAX_USER_IDS = 100

export async function POST(request: NextRequest) {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userIds, guildId } = await request.json()

    // Validate guildId is present and a valid UUID
    if (!guildId || typeof guildId !== 'string' || !UUID_REGEX.test(guildId)) {
      return NextResponse.json({ error: 'Valid guildId is required' }, { status: 400 })
    }

    // Validate userIds is a non-empty array
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'userIds array required' }, { status: 400 })
    }

    // Validate array size limit
    if (userIds.length > MAX_USER_IDS) {
      return NextResponse.json(
        { error: `Too many userIds (max ${MAX_USER_IDS})` },
        { status: 400 }
      )
    }

    // Validate every ID is a properly formatted UUID
    for (const id of userIds) {
      if (typeof id !== 'string' || !UUID_REGEX.test(id)) {
        return NextResponse.json(
          { error: 'All userIds must be valid UUIDs' },
          { status: 400 }
        )
      }
    }

    const supabaseAdmin = createServiceRoleClient()

    // Verify the requesting user is a member of the specified guild
    const { data: userCharacters } = await supabaseAdmin
      .from('characters')
      .select('id')
      .eq('user_id', user.id)

    if (!userCharacters || userCharacters.length === 0) {
      return NextResponse.json({ error: 'No characters found' }, { status: 403 })
    }

    const characterIds = userCharacters.map(c => c.id)

    const { data: membership } = await supabaseAdmin
      .from('character_guild_memberships')
      .select('id')
      .eq('guild_id', guildId)
      .in('character_id', characterIds)
      .eq('is_active', true)
      .limit(1)

    if (!membership || membership.length === 0) {
      return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
    }

    // Verify the requested userIds are members of the same guild by looking up
    // which user_ids have active character memberships in this guild
    const { data: guildMemberships } = await supabaseAdmin
      .from('character_guild_memberships')
      .select('character:characters!inner(user_id)')
      .eq('guild_id', guildId)
      .eq('is_active', true)

    const guildUserIds = new Set<string>()
    if (guildMemberships) {
      for (const m of guildMemberships) {
        const char = Array.isArray(m.character) ? m.character[0] : m.character
        if (char?.user_id) {
          guildUserIds.add(char.user_id)
        }
      }
    }

    // Filter to only userIds that are actual guild members
    const validUserIds = userIds.filter((id: string) => guildUserIds.has(id))

    if (validUserIds.length === 0) {
      return NextResponse.json({ displayNames: {} })
    }

    // Batch fetch display names (centralized utility)
    const displayNames = await batchGetDisplayNamesRecord(supabaseAdmin, validUserIds)

    return NextResponse.json({ displayNames })
  } catch (error) {
    console.error('Error in display-names API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
