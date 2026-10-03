import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { findInvalidCharacterIds, formatInvalidAwardRefsError, normalizeRefId } from '@/lib/loot/guild-award-refs'

// POST - Bulk upsert character aliases
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceSupabase = createServiceRoleClient()

    const body = await request.json()
    const { guild_id, aliases } = body

    if (!guild_id) {
      return NextResponse.json({ error: 'Guild ID is required' }, { status: 400 })
    }

    if (!aliases || !Array.isArray(aliases) || aliases.length === 0) {
      return NextResponse.json({ error: 'Aliases array is required' }, { status: 400 })
    }

    // Verify officer permissions
    const verification = await verifyPermission(serviceSupabase, user.id, guild_id, 'manage_members')
    if (!verification.hasPermission) {
      return NextResponse.json({ error: 'Only officers can manage aliases' }, { status: 403 })
    }

    // Every alias must point at a character with an active membership in
    // this guild (the rule bulk awards use). A missing, null or empty
    // character_id is invalid too, reported as null.
    const normalizedIds: Array<string | null> = aliases.map(
      (a: { character_id?: unknown } | null) => normalizeRefId(a?.character_id)
    )
    let invalidMemberIds: string[]
    try {
      invalidMemberIds = await findInvalidCharacterIds(
        serviceSupabase,
        guild_id,
        normalizedIds.filter((id): id is string => id !== null)
      )
    } catch (lookupError) {
      console.error('Character alias membership lookup error:', lookupError)
      return NextResponse.json({ error: 'Failed to save aliases' }, { status: 500 })
    }
    const invalidSet = new Set(invalidMemberIds)
    const invalidCharacterIds: Array<string | null> = []
    for (const id of normalizedIds) {
      if ((id === null || invalidSet.has(id)) && !invalidCharacterIds.includes(id)) {
        invalidCharacterIds.push(id)
      }
    }
    if (invalidCharacterIds.length > 0) {
      return NextResponse.json(
        { error: formatInvalidAwardRefsError([], invalidMemberIds), invalid_character_ids: invalidCharacterIds },
        { status: 400 }
      )
    }

    // Normalize alias names to lowercase and build upsert data
    const upsertData = aliases.map((a: { alias_name: string; character_id: string }) => ({
      guild_id,
      alias_name: a.alias_name.toLowerCase().trim(),
      character_id: a.character_id,
    }))

    const { data, error } = await serviceSupabase
      .from('character_aliases')
      .upsert(upsertData, { onConflict: 'guild_id,alias_name' })
      .select()

    if (error) {
      console.error('Character alias upsert error:', error)
      return NextResponse.json({ error: 'Failed to save aliases' }, { status: 500 })
    }

    return NextResponse.json({ aliases: data })
  } catch (error) {
    console.error('Character aliases error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
