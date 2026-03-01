import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createClient } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

/**
 * PATCH /api/guilds/[id]/expansions/[expansionId]/phase-groups
 * Set phase merge configuration for an expansion.
 *
 * Body: { phase_groups: number[][] | null }
 *   null = clear merge config (each phase independent)
 *   [[1,2],[3],[4],[5]] = merge P1+P2 into one loot list
 *
 * Validates:
 * - User is officer
 * - All phases in config exist for this expansion
 * - No duplicate phases across groups
 * - No conflicting submissions (raiders with lists in multiple phases being merged)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expansionId: string }> }
) {
  try {
    const { id: guildId, expansionId } = await params
    const body = await request.json()
    const { phase_groups: phaseGroups } = body

    // Auth check
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Verify officer permissions
    const { data: guild } = await supabase
      .from('guilds')
      .select('created_by')
      .eq('id', guildId)
      .single()

    const isGuildCreator = guild?.created_by === user.id

    if (!isGuildCreator) {
      const { data: userCharacters } = await supabase
        .from('characters')
        .select('id')
        .eq('user_id', user.id)

      if (!userCharacters || userCharacters.length === 0) {
        return NextResponse.json({ error: 'No characters found' }, { status: 403 })
      }

      const characterIds = userCharacters.map(c => c.id)
      const { data: memberships } = await supabase
        .from('character_guild_memberships')
        .select('role')
        .eq('guild_id', guildId)
        .in('character_id', characterIds)
        .eq('is_active', true)

      if (!memberships || memberships.length === 0) {
        return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
      }

      const { data: roleData } = await supabase
        .from('guild_roles')
        .select('position')
        .eq('guild_id', guildId)
        .eq('name', memberships[0].role)
        .single()

      const position = roleData?.position ?? (
        memberships[0].role === 'Guild Master' ? 100 :
        memberships[0].role === 'Officer' ? 50 : 0
      )

      if (position < 50) {
        return NextResponse.json({ error: 'Officer permissions required' }, { status: 403 })
      }
    }

    // Null = clear merge config (revert to independent phases)
    if (phaseGroups === null) {
      const serviceSupabase = createServiceRoleClient()
      const { error } = await serviceSupabase
        .from('expansions')
        .update({ phase_groups: null })
        .eq('id', expansionId)
        .eq('guild_id', guildId)

      if (error) {
        console.error('Error clearing phase_groups:', error)
        return NextResponse.json({ error: 'Failed to clear phase groups' }, { status: 500 })
      }

      return NextResponse.json({ success: true, phase_groups: null })
    }

    // Validate phase_groups structure
    if (!Array.isArray(phaseGroups)) {
      return NextResponse.json({ error: 'phase_groups must be an array or null' }, { status: 400 })
    }

    for (const group of phaseGroups) {
      if (!Array.isArray(group) || group.length === 0) {
        return NextResponse.json({ error: 'Each group must be a non-empty array of phase numbers' }, { status: 400 })
      }
      for (const p of group) {
        if (typeof p !== 'number' || p < 1 || p > 10) {
          return NextResponse.json({ error: 'Invalid phase number in group' }, { status: 400 })
        }
      }
    }

    // Check for duplicate phases across groups
    const allPhases = phaseGroups.flat()
    const uniquePhases = new Set(allPhases)
    if (uniquePhases.size !== allPhases.length) {
      return NextResponse.json({ error: 'A phase cannot appear in multiple groups' }, { status: 400 })
    }

    // Verify all phases exist for this expansion
    const serviceSupabase = createServiceRoleClient()
    const { data: tiers } = await serviceSupabase
      .from('raid_tiers')
      .select('phase')
      .eq('expansion_id', expansionId)

    const existingPhases = new Set((tiers || []).map(t => t.phase).filter(Boolean))
    for (const p of allPhases) {
      if (!existingPhases.has(p)) {
        return NextResponse.json({ error: `Phase ${p} does not exist for this expansion` }, { status: 400 })
      }
    }

    // Check for conflicting submissions in groups being merged
    const mergedGroups = phaseGroups.filter(g => g.length > 1)

    for (const group of mergedGroups) {
      // Find characters that have submissions in multiple phases of this group
      const { data: submissions } = await serviceSupabase
        .from('loot_submissions')
        .select('character_id, phase')
        .eq('expansion_id', expansionId)
        .eq('guild_id', guildId)
        .in('phase', group)

      if (submissions && submissions.length > 0) {
        // Group submissions by character
        const byCharacter = new Map<string, number[]>()
        for (const sub of submissions) {
          if (!byCharacter.has(sub.character_id)) {
            byCharacter.set(sub.character_id, [])
          }
          byCharacter.get(sub.character_id)!.push(sub.phase)
        }

        // Find characters with submissions in multiple phases of this group
        const conflicts: string[] = []
        for (const [charId, phases] of byCharacter) {
          if (phases.length > 1) {
            conflicts.push(charId)
          }
        }

        if (conflicts.length > 0) {
          // Fetch character names for the error message
          const { data: characters } = await serviceSupabase
            .from('characters')
            .select('id, name')
            .in('id', conflicts)

          const names = (characters || []).map(c => c.name)
          return NextResponse.json({
            error: 'Cannot merge phases: some raiders have submissions in both phases. They need to delete one before merging.',
            conflicting_characters: names,
            conflicting_phases: group,
          }, { status: 409 })
        }
      }
    }

    // Save the phase groups
    const { error: updateError } = await serviceSupabase
      .from('expansions')
      .update({ phase_groups: phaseGroups })
      .eq('id', expansionId)
      .eq('guild_id', guildId)

    if (updateError) {
      console.error('Error saving phase_groups:', updateError)
      return NextResponse.json({ error: 'Failed to save phase groups' }, { status: 500 })
    }

    // For single-phase submissions that are now part of a merged group,
    // migrate them to the canonical phase (min in group)
    for (const group of mergedGroups) {
      const canonicalPhase = Math.min(...group)
      const otherPhases = group.filter((p: number) => p !== canonicalPhase)

      if (otherPhases.length > 0) {
        // Update any submissions on non-canonical phases to the canonical phase
        // (safe because we already checked there are no conflicts)
        const { error: migrateError } = await serviceSupabase
          .from('loot_submissions')
          .update({ phase: canonicalPhase })
          .eq('expansion_id', expansionId)
          .eq('guild_id', guildId)
          .in('phase', otherPhases)

        if (migrateError) {
          console.error('Error migrating submissions:', migrateError)
          // Non-fatal: the config is saved, submissions can be fixed manually
        }
      }
    }

    return NextResponse.json({ success: true, phase_groups: phaseGroups })
  } catch (error) {
    console.error('Error in PATCH /api/guilds/[id]/expansions/[expansionId]/phase-groups:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
