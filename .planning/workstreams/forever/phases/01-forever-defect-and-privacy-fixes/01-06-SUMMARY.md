---
phase: 01-forever-defect-and-privacy-fixes
plan: 06
subsystem: analytics
tags: [posthog, privacy, analytics, nextjs, typescript, vitest]

requires:
  - phase: none
    provides: first phase of the forever workstream
provides:
  - "utils/analytics/master-loot-events.ts: import-free buildMasterLootAwardedProps and summarizeSubmissionItems"
  - "master_loot_awarded now sends exactly guild_id, submission_id, new_status, item_count and loot_item_ids (ids only, no names)"
  - "No browser-side analytics event, super property, group property or person property carries a player name, guild name or email"
affects: [01-08 (server call sites and the no-names scan test depend on these browser files being clean), phase-01 shipping split (PR 5)]

actuals:
  tokens: 3910
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Analytics props builders take primitives and id arrays only, never row or member objects, so a name cannot be passed in by construction"
    - "A failed read maps to null (unknown), never to a false zero, so the event cannot misreport an empty list"

key-files:
  created:
    - utils/analytics/master-loot-events.ts
    - utils/analytics/__tests__/master-loot-events.test.ts
  modified:
    - app/(app)/master-loot/_client.tsx
    - app/(app)/loot-submissions/components/LootSubmissionsContent.tsx
    - app/components/CreateGuildModal.tsx
    - app/contexts/GuildContext.tsx
    - app/components/PostHogProvider.tsx

key-decisions:
  - "master_loot_awarded reports the reviewed list's items by id (owner decision 1): loot_item_ids in list order (rank descending, slot ascending), no item or player name"
  - "A failed per-submission loot_submission_items read gives item_count and loot_item_ids null (unknown); the list card still shows '0 items' via a display-only ?? 0"
  - "posthog.unregister('guild_name') runs before register so returning browsers stop sending the persisted super property"
  - "posthog.identify drops email and display_name and keeps discord_id and created_at (owner decision 4)"

patterns-established:
  - "Pure analytics props builder with an exact-object test (analog: announcementEventProps)"

requirements-completed: [FIX-05]

coverage:
  - id: D1
    description: "master_loot_awarded carries guild_id, submission_id, new_status, item_count and loot_item_ids only; no character_name, no item_name, and the status is no longer reported as the item"
    requirement: FIX-05
    verification:
      - kind: unit
        ref: "utils/analytics/__tests__/master-loot-events.test.ts#buildMasterLootAwardedProps returns exactly the id and count properties, nothing else"
        status: pass
      - kind: unit
        ref: "utils/analytics/__tests__/master-loot-events.test.ts#[E-15] sends only the five keys"
        status: pass
    human_judgment: false
  - id: D2
    description: "Empty, unknown, failed-read and list-order cases of the props builder and summarizeSubmissionItems (E-14, E-16)"
    requirement: FIX-05
    verification:
      - kind: unit
        ref: "npx vitest run utils/analytics (11 tests)"
        status: pass
    human_judgment: false
  - id: D3
    description: "One master_loot_awarded event per successful review, none for a failed review (E-13)"
    requirement: FIX-05
    verification:
      - kind: other
        ref: "grep -c \"trackClientEvent('master_loot_awarded'\" app/(app)/master-loot/_client.tsx prints 1; the call sits after the response.ok check in handleReview"
        status: pass
    human_judgment: true
    rationale: "The call site is inside a large client component with no component test; the verifier confirms the single call after the response.ok check by reading the code path (backstop truth E-13)"
  - id: D4
    description: "submission_reviewed, pending_submission_approved/rejected and guild_creation_completed keep id and count properties and drop only name properties; guild group, super and person properties carry no guild name; posthog.identify carries no email or display_name"
    requirement: FIX-05
    verification:
      - kind: unit
        ref: "npx vitest run \"app/(app)/loot-submissions\" (10 tests)"
        status: pass
      - kind: other
        ref: "node assertion on the posthog.identify( argument in PostHogProvider.tsx (no email, no display_name, keeps discord_id) exits 0"
        status: pass
    human_judgment: true
    rationale: "Dashboard impact on existing PostHog insights and the stored name and email values in PostHog are an owner call; plan 01-08's scan test will enforce these files stay clean when it lands"

duration: 2min
completed: 2026-10-13
status: complete
---

# Phase 1 Plan 06: Browser Analytics Privacy Summary

**master_loot_awarded now reports the reviewed list by item id with no player name, and every browser PostHog event, super, group and person property drops player and guild names and email**

## Performance

- **Duration:** 2 min
- **Started:** 2026-10-13T21:26:55Z
- **Completed:** 2026-10-13T21:28:42Z
- **Tasks:** 2
- **Files modified:** 7 (2 created, 5 modified)

## Accomplishments

- `master_loot_awarded` sends `{ guild_id, submission_id, new_status, item_count, loot_item_ids }`. The old `item_name: status` (review status reported as the item) and `character_name` are gone.
- A failed `loot_submission_items` read reports null (unknown) instead of a false zero; the list card still reads "0 items" on that failure exactly as before.
- `submission_reviewed`, `pending_submission_approved`, `pending_submission_rejected` and `guild_creation_completed` keep their ids and counts and lose only the name properties.
- Guild group `name`, `guild_name` super property and person `current_guild` removed. `posthog.unregister('guild_name')` clears the persisted value for returning browsers.
- `posthog.identify` no longer sends `email` or `display_name`; it keeps `discord_id` and `created_at`, and the `user_preferences` read selects only `discord_id`.

## Final signatures

```ts
export function buildMasterLootAwardedProps(args: {
  guildId: string | null
  submissionId: string
  status: 'approved' | 'rejected'
  itemCount: number | null | undefined
  lootItemIds: readonly string[] | null | undefined
}): {
  guild_id: string | null
  submission_id: string
  new_status: 'approved' | 'rejected'
  item_count: number | null
  loot_item_ids: string[] | null
}

export function summarizeSubmissionItems(result: {
  data: ReadonlyArray<{ loot_item_id: string | null }> | null
  error: unknown
}): { itemCount: number | null; lootItemIds: string[] | null }
```

## Dashboard impact (for the owner)

From this release PostHog no longer receives:

- the `guild_name` super property on every client event
- the `name` property on the `guild` group
- person properties `current_guild`, `display_name` and `email`
- `character_name` on `master_loot_awarded`, `submission_reviewed`, `pending_submission_approved` and `pending_submission_rejected`
- `item_name` on `master_loot_awarded` (it only ever held the review status)
- `guild_name` on `guild_creation_completed`

`master_loot_awarded` gains `submission_id`, `item_count` and `loot_item_ids`. Insights that break down by any removed property will show ids only. `discord_id` stays on the person by owner decision 4. Server events (`guild_created`, `character_created`, `reserve_item_awarded`, `character_imported`) are plan 01-08.

**Stored values are not removed by code.** Guild group names, person `email`, `display_name` and `current_guild` values already saved in PostHog stay there until someone clears them in PostHog. Do that in PostHog if wanted.

## Task Commits

1. **Task 1 (tracer, TDD): master_loot_awarded reports the reviewed list's items by id** - `5300fe9a` (test, RED), `a63e3153` (feat, GREEN)
2. **Task 2: Browser analytics stop sending player and guild names and email** - `00409f18` (fix)

**Plan metadata:** recorded in the docs commit that follows this file.

**Tracer feedback gate:** Task 1 verify passed (11 tests, tsc clean, eslint 0 errors). The `human-verify` gate was passed under the phase's standing approval, so execution continued straight into Task 2.

## Files Created/Modified

- `utils/analytics/master-loot-events.ts` - pure props builder and read-result summariser (no imports)
- `utils/analytics/__tests__/master-loot-events.test.ts` - exact-props, empty, unknown, ordering, encoding and failed-read tests
- `app/(app)/master-loot/_client.tsx` - id read instead of head count, `Submission` carries `loot_item_ids`, event built by the builder
- `app/(app)/loot-submissions/components/LootSubmissionsContent.tsx` - `character_name` removed from three events
- `app/components/CreateGuildModal.tsx` - `guild_name` removed from `guild_creation_completed`
- `app/contexts/GuildContext.tsx` - group name, super `guild_name` and person `current_guild` removed; unregister added; `activeGuild?.name` dropped from the effect dependencies
- `app/components/PostHogProvider.tsx` - identify without email or display_name

## Decisions Made

- Followed the plan as specified (owner decisions 1 and 4, Hard Constraint 3). No `ROADMAP` or `REQUIREMENTS` wording was edited.
- The `ReviewNotificationPayload` in `LootSubmissionsContent.tsx` still carries `guild_name` and `character_name`. That payload feeds the Discord DM notification, not analytics, so it was left alone (the plan keeps the local `characterName` UI use as well).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The plan-level `eslint` runs report warnings only (0 errors), all pre-existing in these files (unused vars, hook dependency warnings, `<img>` elements, and a `performance.now` purity warning in `utils/analytics/client.ts`). The design hook flagged pre-existing colour literals around line 875 of `CreateGuildModal.tsx`; the one line I changed there is unrelated, so they are out of scope and no ignore was recorded.

## Known Stubs

None.

## Threat Flags

None. No new network endpoints, auth paths or schema changes. Threats T-06-01 to T-06-04 and T-06-08 are mitigated as planned; T-06-05 to T-06-07 accepted as planned.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 01-08 (server call sites plus the no-names source-scan test) can proceed: the four browser files and the master-loot page are clean. Its scan should report no violation in them.
- Shipping: PR 5 of the phase, a `fix/...` branch carrying this plan with plan 01-08. Not done here.

---
*Phase: 01-forever-defect-and-privacy-fixes*
*Completed: 2026-10-13*

## Self-Check: PASSED

- FOUND: utils/analytics/master-loot-events.ts
- FOUND: utils/analytics/__tests__/master-loot-events.test.ts
- FOUND commits: 5300fe9a, a63e3153, 00409f18
- All task acceptance criteria re-run and passing; vitest (utils/analytics 11 tests, loot-submissions 10 tests), tsc (0 errors) and the PostHogProvider node assertion pass
