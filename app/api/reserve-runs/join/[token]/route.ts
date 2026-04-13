import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { canClassReserveItem } from '@/utils/wowClassRestrictions'
import { logReserveAudit } from '@/utils/reserve-audit'
import { extractLeaderToken } from '@/utils/reserve-access'

type UserCharacter = {
  id: string
  name: string
  class_name: string | null
  class_color: string | null
  spec_name: string | null
  is_main: boolean
}

/**
 * Fetch the authed user's characters that belong to the given guild.
 * Returns an empty list if there's no user, no guild, or no matches.
 * Silently swallows errors — the join page will just fall back to
 * the anonymous form.
 */
async function fetchUserCharactersForGuild(
  serviceSupabase: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  guildId: string | null
): Promise<UserCharacter[]> {
  if (!guildId) return []

  // Two-step fetch: get the user's character ids, then filter by guild
  // membership. Supabase's nested `!inner` filter with aliases was
  // unreliable for this, so we do it explicitly.
  const { data: ownedCharacters } = await serviceSupabase
    .from('characters')
    .select(`
      id,
      name,
      is_main,
      class:wow_classes ( name, color_hex ),
      spec:class_specs ( name )
    `)
    .eq('user_id', userId)

  if (!ownedCharacters || ownedCharacters.length === 0) return []

  const ownedIds = ownedCharacters.map((c: any) => c.id)
  const { data: memberships } = await serviceSupabase
    .from('character_guild_memberships')
    .select('character_id')
    .eq('guild_id', guildId)
    .eq('is_active', true)
    .in('character_id', ownedIds)

  if (!memberships || memberships.length === 0) return []

  const memberIds = new Set(memberships.map((m: any) => m.character_id))

  return ownedCharacters
    .filter((c: any) => memberIds.has(c.id))
    .map((c: any) => ({
      id: c.id,
      name: c.name,
      class_name: c.class?.name ?? null,
      class_color: c.class?.color_hex ?? null,
      spec_name: c.spec?.name ?? null,
      is_main: !!c.is_main,
    }))
    // Mains first, then alphabetical
    .sort((a: UserCharacter, b: UserCharacter) => {
      if (a.is_main !== b.is_main) return a.is_main ? -1 : 1
      return a.name.localeCompare(b.name)
    })
}

/**
 * GET /api/reserve-runs/join/[token]
 *
 * Public endpoint. Returns run info for the join page.
 * No authentication required.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const serviceSupabase = createServiceRoleClient()

    // Fetch run by share token
    const { data: run, error } = await serviceSupabase
      .from('reserve_runs')
      .select('*')
      .eq('share_token', token)
      .single()

    if (error || !run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    // Fetch raid tier name
    const { data: raidTier } = await serviceSupabase
      .from('raid_tiers')
      .select('name')
      .eq('id', run.raid_tier_id)
      .single()

    // Fetch expansion name (used for class availability filtering on the join form)
    let expansionName: string | null = null
    if (run.expansion_id) {
      const { data: expansion } = await serviceSupabase
        .from('expansions')
        .select('name')
        .eq('id', run.expansion_id)
        .single()
      expansionName = expansion?.name ?? null
    }

    // Fetch guild name
    const { data: guild } = await serviceSupabase
      .from('guilds')
      .select('name')
      .eq('id', run.guild_id)
      .single()

    // Fetch items for this raid tier
    const { data: items } = await serviceSupabase
      .from('loot_items')
      .select('id, name, boss_name, item_slot, wowhead_id, classification, armor_type, weapon_type')
      .eq('raid_tier_id', run.raid_tier_id)
      .eq('is_available', true)
      .order('boss_name')

    // Leader token grants management permissions, including visibility of
    // submissions regardless of the public visibility setting.
    const providedToken = extractLeaderToken(request)
    const isLeader = !!providedToken && providedToken === run.raid_leader_token

    // Fetch submissions based on visibility (or unconditionally for leader)
    let submissions: any[] = []
    if (
      isLeader ||
      run.status === 'locked' ||
      run.status === 'completed' ||
      run.visibility === 'public_live'
    ) {
      const { data } = await serviceSupabase
        .from('reserve_submissions')
        .select('id, character_name, character_class, character_spec, items, created_at')
        .eq('reserve_run_id', run.id)
        .eq('status', 'submitted')
        .order('created_at', { ascending: true })
      submissions = data || []
    }

    // Fetch awards
    const { data: awards } = await serviceSupabase
      .from('reserve_awards')
      .select('id, loot_item_id, character_name, awarded_at, notes')
      .eq('reserve_run_id', run.id)
      .order('awarded_at', { ascending: true })

    // If the requester is logged in and the run has a guild, return their
    // characters in that guild so the join form can auto-fill.
    let userCharacters: UserCharacter[] = []
    try {
      const { user } = await getAuthenticatedUser()
      if (user && run.guild_id) {
        userCharacters = await fetchUserCharactersForGuild(
          serviceSupabase,
          user.id,
          run.guild_id
        )
      }
    } catch {
      // Anonymous or auth failure — fall through with empty list.
    }

    return NextResponse.json({
      success: true,
      run: {
        id: run.id,
        title: run.title,
        status: run.status,
        raid_at: run.raid_at,
        lock_at: run.lock_at,
        locked_at: run.locked_at,
        max_reserves: run.max_reserves,
        max_reserves_per_item: run.max_reserves_per_item,
        allow_duplicates: run.allow_duplicates,
        visibility: run.visibility,
        rules_note: run.rules_note,
        hard_reserves: run.hard_reserves,
        rule_snapshot: run.rule_snapshot,
        discord_invite_url: run.discord_invite_url,
        enforce_class_restrictions: run.enforce_class_restrictions,
        raid_tier_name: raidTier?.name || null,
        expansion_name: expansionName,
        guild_name: guild?.name || null,
      },
      items: items || [],
      submissions,
      awards: awards || [],
      user_characters: userCharacters,
    })
  } catch (err) {
    console.error('Reserve join GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/reserve-runs/join/[token]
 *
 * Public endpoint. Submit or update reserves for a run.
 * No authentication required.
 *
 * Body: { character_name, character_class, character_spec?, items: string[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const {
      character_name: rawCharacterName,
      character_class: rawCharacterClass,
      character_spec: rawCharacterSpec,
      character_id: rawCharacterId,
      items,
    } = body

    let character_name: string = rawCharacterName
    let character_class: string = rawCharacterClass
    let character_spec: string | null = rawCharacterSpec
    let linkedCharacterId: string | null = null

    if (!character_name?.trim() || !character_class?.trim()) {
      return NextResponse.json(
        { error: 'Character name and class are required' },
        { status: 400 }
      )
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one reserve item is required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    // Fetch run
    const { data: run, error: runError } = await serviceSupabase
      .from('reserve_runs')
      .select('id, guild_id, status, max_reserves, max_reserves_per_item, allow_duplicates, hard_reserves, raid_tier_id, enforce_class_restrictions')
      .eq('share_token', token)
      .single()

    if (runError || !run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    if (run.status !== 'open') {
      return NextResponse.json({ error: 'This run is no longer accepting reserves' }, { status: 400 })
    }

    // If the submitter provided a character_id, verify they own it and
    // it belongs to the run's guild. On success we override name/class/spec
    // from the stored character so clients can't spoof them.
    if (rawCharacterId && typeof rawCharacterId === 'string') {
      const { user } = await getAuthenticatedUser()
      if (!user) {
        return NextResponse.json(
          { error: 'You must be logged in to submit as a linked character' },
          { status: 401 }
        )
      }
      if (!run.guild_id) {
        return NextResponse.json(
          { error: 'This run is not tied to a guild' },
          { status: 400 }
        )
      }
      // Verify user owns the character
      const { data: character } = await serviceSupabase
        .from('characters')
        .select(`
          id,
          name,
          user_id,
          class:wow_classes ( name ),
          spec:class_specs ( name )
        `)
        .eq('id', rawCharacterId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (!character) {
        return NextResponse.json(
          { error: 'Character not found' },
          { status: 403 }
        )
      }

      // Verify character is an active member of this guild
      const { data: membership } = await serviceSupabase
        .from('character_guild_memberships')
        .select('id')
        .eq('guild_id', run.guild_id)
        .eq('character_id', (character as any).id)
        .eq('is_active', true)
        .maybeSingle()

      if (!membership) {
        return NextResponse.json(
          { error: 'Character is not a member of this guild' },
          { status: 403 }
        )
      }

      const c = character as any
      linkedCharacterId = c.id
      character_name = c.name
      character_class = c.class?.name || character_class
      character_spec = c.spec?.name || character_spec || null
    }

    // Validate item count
    if (items.length > run.max_reserves) {
      return NextResponse.json(
        { error: `Maximum ${run.max_reserves} reserve${run.max_reserves === 1 ? '' : 's'} allowed` },
        { status: 400 }
      )
    }

    // Check for duplicate items in submission
    if (!run.allow_duplicates && new Set(items).size !== items.length) {
      return NextResponse.json({ error: 'Duplicate reserves are not allowed' }, { status: 400 })
    }

    // Validate items exist in the raid tier
    const { data: validItems } = await serviceSupabase
      .from('loot_items')
      .select('id, name, armor_type')
      .eq('raid_tier_id', run.raid_tier_id)
      .eq('is_available', true)
      .in('id', items)

    if (!validItems || validItems.length !== items.length) {
      return NextResponse.json({ error: 'One or more items are not valid for this raid' }, { status: 400 })
    }

    // Check items are not hard-reserved
    const hardReservedIds = (run.hard_reserves as any[] || []).map((hr: any) => hr.loot_item_id)
    const reservingHardReserved = items.some((id: string) => hardReservedIds.includes(id))
    if (reservingHardReserved) {
      return NextResponse.json({ error: 'One or more items are hard-reserved' }, { status: 400 })
    }

    // Enforce class restrictions
    if (run.enforce_class_restrictions) {
      const blocked = validItems.find(
        (item) => !canClassReserveItem(character_class, item as { armor_type?: string | null })
      )
      if (blocked) {
        return NextResponse.json(
          { error: `${blocked.name} cannot be reserved by a ${character_class}` },
          { status: 400 }
        )
      }
    }

    // Enforce per-item reserve cap (max_reserves_per_item)
    if (run.max_reserves_per_item) {
      const { data: existingSubs } = await serviceSupabase
        .from('reserve_submissions')
        .select('items, character_name')
        .eq('reserve_run_id', run.id)
        .eq('status', 'submitted')

      const trimmedName = character_name.trim().toLowerCase()
      const counts: Record<string, number> = {}
      for (const sub of existingSubs || []) {
        if (sub.character_name.toLowerCase() === trimmedName) continue
        const subItems = (sub.items as string[]) || []
        for (const itemId of subItems) {
          counts[itemId] = (counts[itemId] || 0) + 1
        }
      }
      for (const itemId of items) {
        const existingCount = counts[itemId] || 0
        if (existingCount >= run.max_reserves_per_item) {
          const blockedItem = validItems.find((i) => i.id === itemId)
          return NextResponse.json(
            {
              error: `${blockedItem?.name ?? 'Item'} is already at the ${run.max_reserves_per_item}-reserve limit`,
            },
            { status: 400 }
          )
        }
      }
    }

    // Check for an existing submission (the unique index uses lower(character_name)
    // which Supabase upsert can't target, so we do an explicit check-then-insert/update)
    const { data: existing } = await serviceSupabase
      .from('reserve_submissions')
      .select('id')
      .eq('reserve_run_id', run.id)
      .ilike('character_name', character_name.trim())
      .eq('status', 'submitted')
      .maybeSingle()

    if (existing) {
      // Update existing submission
      const { data: updated, error: updateError } = await serviceSupabase
        .from('reserve_submissions')
        .update({
          character_id: linkedCharacterId,
          character_class: character_class.trim(),
          character_spec: character_spec?.trim() || null,
          items,
          status: 'submitted',
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating submission:', updateError)
        return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 })
      }

      await logReserveAudit({
        supabase: serviceSupabase,
        reserveRunId: run.id,
        actorLabel: character_name.trim(),
        action: 'submission_updated',
        details: { character_name: character_name.trim(), item_count: items.length },
      })

      return NextResponse.json({ success: true, submission: updated, updated: true })
    }

    // Create new submission
    const { data: submission, error: insertError } = await serviceSupabase
      .from('reserve_submissions')
      .insert({
        reserve_run_id: run.id,
        character_id: linkedCharacterId,
        character_name: character_name.trim(),
        character_class: character_class.trim(),
        character_spec: character_spec?.trim() || null,
        items,
        status: 'submitted',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating submission:', insertError)
      return NextResponse.json({ error: 'Failed to submit reserves' }, { status: 500 })
    }

    await logReserveAudit({
      supabase: serviceSupabase,
      reserveRunId: run.id,
      actorLabel: character_name.trim(),
      action: 'submission_created',
      details: { character_name: character_name.trim(), item_count: items.length },
    })

    return NextResponse.json({
      success: true,
      submission,
      updated: false,
    })
  } catch (err) {
    console.error('Reserve join POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
