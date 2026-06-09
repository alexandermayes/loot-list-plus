/**
 * Canonical "this submission still needs the raider to (re)submit" definition.
 *
 * Shared by every surface that nudges a raider — the loot-list banner, the
 * sidebar/dashboard count badge, and (later) the Discord reminder — so they
 * never disagree about what counts.
 *
 * A submission needs resubmission when:
 * - it's a `draft` that was submitted before (the raider edited an approved or
 *   pending list and auto-save dropped it back to draft), or
 * - it's `rejected` (an officer sent it back).
 *
 * Excludes never-submitted drafts and clean `pending` / `approved` lists.
 */
export interface ResubmitState {
  status: string | null
  submitted_at: string | null
}

export function needsResubmission(sub: ResubmitState | null | undefined): boolean {
  if (!sub) return false
  if (sub.status === 'rejected') return true
  if (sub.status === 'draft' && !!sub.submitted_at) return true
  return false
}

/**
 * The same predicate as a PostgREST `.or()` filter, for count queries:
 *   (status = 'draft' AND submitted_at IS NOT NULL) OR status = 'rejected'
 */
export const NEEDS_RESUBMISSION_OR_FILTER =
  'and(status.eq.draft,submitted_at.not.is.null),status.eq.rejected'
