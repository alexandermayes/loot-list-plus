import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { validateBracketRules, type BracketItem, type BracketLimits } from '@/domain/loot/bracket-validation'
import { validateItemCopyLimits } from '@/domain/loot/item-copies'
import { isNeedRow } from '@/domain/loot/item-identity'
import { isHeldNeedRanking, NEED_RANKING_HOLD_ERROR } from '@/domain/loot/need-ranking-hold'
import { logStatusChange } from '@/utils/audit/log'
import { trackEvent, setUserMilestone } from '@/utils/analytics/server'
import { revalidatePendingSubmissions } from '@/lib/cache/submission-tag'
import { findInvalidCharacterIds } from '@/lib/loot/guild-award-refs'

// Shown to the raider when the list's character is not an active member of
// the list's guild (the same text auto-save shows).
const NOT_ACTIVE_MEMBER_ERROR = 'Your character needs to rejoin this guild.'

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
 * 2. Verify the character is an active member of the list's guild (403 if
 *    not, before any write). The database applies the same rule to every
 *    pending or approved list, so a 23514 from the status update (membership
 *    lost after the check) gets the same 403.
 * 3. Read current items + item metadata from DB
 * 4. Read guild enforce_slot_restrictions setting
 * 5. Validate bracket rules and item copy limits (the same per-item rule the
 *    loot list applies; see domain/loot/item-copies.ts). Rows whose item is
 *    from a raid tier the guild turned off (raid_tiers.is_guild_active = false)
 *    are skipped, because the loot list page never shows them (GH #357)
 * 6. If valid: snapshot previous items, set status to 'pending'
 * 7. If invalid: return violations, status stays as-is
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

    // A pending list needs an active membership. Checked before any write, so
    // resubmission_count is not incremented for a list that cannot be
    // submitted. A lookup error throws and returns 500.
    const notActiveMember = !submission.character_id
      || (await findInvalidCharacterIds(serviceSupabase, submission.guild_id, [submission.character_id])).length > 0
    if (notActiveMember) {
      return NextResponse.json({ error: NOT_ACTIVE_MEMBER_ERROR }, { status: 403 })
    }

    // Get current submission items with item metadata
    const { data: submissionItems, error: itemsError } = await serviceSupabase
      .from('loot_submission_items')
      .select(`
        rank,
        slot,
        loot_item_id,
        loot_item:loot_items(id, name, classification, item_type, item_slot, wowhead_id, allocation_cost, kind, raid_tier:raid_tiers(is_guild_active))
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
    interface SubmissionItemRow {
      rank: number
      slot: string
      loot_item_id: string
      loot_item?: {
        name?: string | null
        wowhead_id?: number | null
        classification?: string | null
        item_type?: string | null
        item_slot?: string | null
        allocation_cost?: number | null
        kind?: string | null
        // PostgREST can return a to-one embed as an object or a one-element array.
        raid_tier?: { is_guild_active?: boolean | null } | Array<{ is_guild_active?: boolean | null }> | null
      } | null
    }
    const itemRows = (submissionItems || []) as unknown as SubmissionItemRow[]

    // D-22: ranking a need is held until Phase 4. Every loaded row is checked,
    // before the GH #357 filter below, because a need in a turned-off tier is
    // still a ranked need. Nothing has been written yet, so the refusal leaves
    // status, submitted_at and resubmission_count as they were.
    if (itemRows.some((si) => isHeldNeedRanking(si.loot_item))) {
      return NextResponse.json({ error: NEED_RANKING_HOLD_ERROR }, { status: 422 })
    }

    // GH #357: the loot list page only receives items from raid tiers with
    // is_guild_active = true (resolveTierIdsForPhases in lib/loot-items-query.ts),
    // so a saved row from a turned-off tier is invisible there and not counted.
    // Validating the same rows keeps the server from blocking a raider on rows
    // they cannot see or fix. Rows are still saved and promoted; only validation
    // skips them. Missing or malformed tier metadata keeps the row (fails closed).
    const checkedRows = itemRows.filter((si) => {
      const tier = si.loot_item?.raid_tier
      const flag = Array.isArray(tier) ? tier[0]?.is_guild_active : tier?.is_guild_active
      return flag !== false
    })
    // Need rows are outside the bracket rules: their cost is the need's size
    // (3, 2, 1), not a classification, so summing it against the bracket limit
    // would reject valid need lists. Their 10-point budget is Phase 4's check
    // (DISC-03). Copy caps below still apply to them.
    const validationItems = checkedRows.filter((si) => !isNeedRow(si.loot_item)).map((si) => ({
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

    // Validate bracket rules, then copies per item (GH #293, #331)
    const violations = [
      ...validateBracketRules(
        validationItems as unknown as Parameters<typeof validateBracketRules>[0],
        enforceSlotRestrictions,
        bracketLimits
      ),
      ...validateItemCopyLimits(checkedRows.map((si) => ({
        rank: si.rank,
        item: {
          id: si.loot_item_id,
          name: si.loot_item?.name,
          item_slot: si.loot_item?.item_slot,
          wowhead_id: si.loot_item?.wowhead_id,
          kind: si.loot_item?.kind,
        },
      }))),
    ]

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

    // Promote to pending. Clear any prior rejected-change marker — the raider
    // has acted on the feedback and resubmitted, so the callout should go away
    // (GH #123 pass 2).
    const { error: updateError } = await serviceSupabase
      .from('loot_submissions')
      .update({
        status: 'pending',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        change_rejected_at: null,
        // Resubmitting ends the needs-resubmit episode; reset the reminder
        // throttle so a future rejection gets a fresh run of reminders.
        resubmit_reminded_at: null,
        resubmit_reminder_count: 0,
      })
      .eq('id', submission_id)

    if (updateError?.code === '23514') {
      return NextResponse.json({ error: NOT_ACTIVE_MEMBER_ERROR }, { status: 403 })
    }

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
      additionalData: { character_id: submission.character_id, item_count: itemRows.length },
    })

    // Analytics
    trackEvent({
      event: 'loot_submission_submitted',
      userId: user.id,
      guildId: submission.guild_id,
      properties: {
        guild_id: submission.guild_id,
        submission_id,
        item_count: itemRows.length,
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
