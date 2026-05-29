import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { validateBracketRules, type BracketItem, type BracketLimits } from '@/domain/loot/bracket-validation'
import { logStatusChange } from '@/utils/audit/log'
import { trackEvent, setUserMilestone } from '@/utils/analytics/server'
import { revalidatePendingSubmissions } from '@/lib/cache/submission-tag'

/**
 * POST /api/loot-submissions/submit
 *
 * Validate a draft submission's items against bracket rules and promote
 * to 'pending' status. The items must already be saved (via auto-save
 * or manual draft save).
 *
 * Body: { submission_id }
 *
 * Flow:
 * 1. Verify the user owns the character on this submission
 * 2. Read current items + item metadata from DB
 * 3. Read guild enforce_slot_restrictions setting
 * 4. Validate bracket rules
 * 5. If valid: snapshot previous items, set status to 'pending'
 * 6. If invalid: return violations, status stays as-is
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { submission_id } = await request.json()

    if (!submission_id) {
      return NextResponse.json({ error: 'submission_id is required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    // Get the submission
    const { data: submission, error: subError } = await serviceSupabase
      .from('loot_submissions')
      .select('id, guild_id, character_id, expansion_id, phase, status, resubmission_count, submitted_at')
      .eq('id', submission_id)
      .single()

    if (subError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Verify user owns the character
    const { data: character } = await serviceSupabase
      .from('characters')
      .select('id, user_id')
      .eq('id', submission.character_id)
      .single()

    if (!character || character.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only submit your own lists' }, { status: 403 })
    }

    // Get current submission items with item metadata
    const { data: submissionItems, error: itemsError } = await serviceSupabase
      .from('loot_submission_items')
      .select(`
        rank,
        slot,
        loot_item_id,
        loot_item:loot_items(id, name, classification, item_type, item_slot, allocation_cost)
      `)
      .eq('submission_id', submission_id)
      .is('removed_at', null)

    if (itemsError) {
      return NextResponse.json({ error: 'Failed to read submission items' }, { status: 500 })
    }

    // Get guild settings for bracket rules
    const { data: settings } = await serviceSupabase
      .from('guild_settings')
      .select('enforce_slot_restrictions, max_allocation_points_per_bracket, max_tokens_per_bracket, max_category_per_bracket')
      .eq('guild_id', submission.guild_id)
      .single()

    const enforceSlotRestrictions = settings?.enforce_slot_restrictions ?? false
    const bracketLimits: BracketLimits = {
      maxAllocationPoints: settings?.max_allocation_points_per_bracket ?? 3,
      maxTokens: settings?.max_tokens_per_bracket ?? 1,
      maxCategory: settings?.max_category_per_bracket ?? 1,
    }

    // Build validation input
    const validationItems = (submissionItems || []).map((si: any) => ({
      rank: si.rank,
      slot: si.slot,
      item: {
        id: si.loot_item_id,
        classification: si.loot_item?.classification,
        item_type: si.loot_item?.item_type,
        item_slot: si.loot_item?.item_slot,
        allocation_cost: si.loot_item?.allocation_cost,
      } as BracketItem,
    }))

    // Validate bracket rules
    const violations = validateBracketRules(validationItems, enforceSlotRestrictions, bracketLimits)

    if (violations.length > 0) {
      return NextResponse.json({
        error: 'List violates bracket rules',
        violations,
      }, { status: 422 })
    }

    // Increment resubmission count if this is a resubmission
    if (submission.submitted_at) {
      const currentCount = submission.resubmission_count ?? 0
      await serviceSupabase
        .from('loot_submissions')
        .update({ resubmission_count: currentCount + 1 })
        .eq('id', submission_id)
    }

    // Promote to pending
    const { error: updateError } = await serviceSupabase
      .from('loot_submissions')
      .update({
        status: 'pending',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', submission_id)

    if (updateError) {
      console.error('Error promoting submission:', updateError)
      return NextResponse.json({ error: 'Failed to submit' }, { status: 500 })
    }

    // Audit log (fire and forget)
    logStatusChange({
      supabase: serviceSupabase,
      guildId: submission.guild_id,
      tableName: 'loot_submissions',
      recordId: submission_id,
      userId: user.id,
      oldStatus: submission.status,
      newStatus: 'pending',
      additionalData: { character_id: submission.character_id, item_count: validationItems.length },
    })

    // Analytics
    trackEvent({
      event: 'loot_submission_submitted',
      userId: user.id,
      guildId: submission.guild_id,
      properties: {
        guild_id: submission.guild_id,
        submission_id,
        item_count: validationItems.length,
        is_resubmission: !!submission.submitted_at,
      },
    })
    setUserMilestone(user.id, 'first_list_submitted_at')

    // Invalidate the per-guild pending count so officers see fresh badge
    revalidatePendingSubmissions(submission.guild_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST /api/loot-submissions/submit:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
