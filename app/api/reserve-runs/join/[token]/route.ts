import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

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

    // Fetch guild name
    const { data: guild } = await serviceSupabase
      .from('guilds')
      .select('name')
      .eq('id', run.guild_id)
      .single()

    // Fetch items for this raid tier
    const { data: items } = await serviceSupabase
      .from('loot_items')
      .select('id, name, boss_name, item_slot, wowhead_id, classification')
      .eq('raid_tier_id', run.raid_tier_id)
      .eq('is_available', true)
      .order('boss_name')

    // Fetch submissions based on visibility
    let submissions: any[] = []
    if (run.status === 'locked' || run.status === 'completed' || run.visibility === 'public_live') {
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
        allow_duplicates: run.allow_duplicates,
        visibility: run.visibility,
        rules_note: run.rules_note,
        hard_reserves: run.hard_reserves,
        rule_snapshot: run.rule_snapshot,
        raid_tier_name: raidTier?.name || null,
        guild_name: guild?.name || null,
      },
      items: items || [],
      submissions,
      awards: awards || [],
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
    const { character_name, character_class, character_spec, items } = body

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
      .select('id, status, max_reserves, allow_duplicates, hard_reserves, raid_tier_id')
      .eq('share_token', token)
      .single()

    if (runError || !run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    if (run.status !== 'open') {
      return NextResponse.json({ error: 'This run is no longer accepting reserves' }, { status: 400 })
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
      .select('id')
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

    // Upsert submission (character_name is unique per run)
    const { data: submission, error: upsertError } = await serviceSupabase
      .from('reserve_submissions')
      .upsert(
        {
          reserve_run_id: run.id,
          character_name: character_name.trim(),
          character_class: character_class.trim(),
          character_spec: character_spec?.trim() || null,
          items,
          status: 'submitted',
        },
        {
          onConflict: 'reserve_run_id,lower(character_name)',
          ignoreDuplicates: false,
        }
      )
      .select()

    // Handle unique constraint via manual check if upsert doesn't work with expression index
    if (upsertError) {
      // Try update if insert failed due to duplicate
      if (upsertError.code === '23505') {
        const { data: existing } = await serviceSupabase
          .from('reserve_submissions')
          .select('id')
          .eq('reserve_run_id', run.id)
          .ilike('character_name', character_name.trim())
          .single()

        if (existing) {
          const { data: updated, error: updateError } = await serviceSupabase
            .from('reserve_submissions')
            .update({
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

          return NextResponse.json({ success: true, submission: updated, updated: true })
        }
      }

      console.error('Error creating submission:', upsertError)
      return NextResponse.json({ error: 'Failed to submit reserves' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      submission: submission?.[0] || null,
      updated: false,
    })
  } catch (err) {
    console.error('Reserve join POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
