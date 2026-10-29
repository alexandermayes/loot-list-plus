---
phase: 03-discovery-schema-and-need-pipeline
plan: 10
subsystem: ui
tags: [master-sheet, summary, raid-mode, need-rows, supabase, react, vitest]

requires:
  - phase: 03-discovery-schema-and-need-pipeline
    provides: "loot_items.kind and need rows (03-01, 03-02), itemIdentityKey and keepRankedNeedRows (03-04), ItemLink NeedLabel fallback (03-05)"
provides:
  - "lib/loot/tier-need-rows.ts: fetchTierNeedRows and fetchTierNeedRankings, paged tier-scoped reads of need rows and their live rankings"
  - "Master sheet shows only ranked needs under a Needs heading per tier, with identity-keyed receive skips and a separate BLP GET for ranked need ids"
  - "Summary lists ranked needs and counts need awards by the need row, items by wowhead id as before"
  - "Raid Mode search that cannot throw on a need row or a null boss_name or item_slot"
  - "Gargul export loads kind item only and keys its receive-skip map with itemIdentityKey"
affects: [03-11-award-display, 03-12-reader-inventory, 03-17-need-lifecycle-tests, phase-04-picker]

actuals:
  tokens: 12300
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "Need rows are read by tier through a paged helper, never by an id list in a URL; only ranked need ids reach a GET"
    - "The browser filters need rows to ranked ones with keepRankedNeedRows after the visibility response (D-02 hold; Phase 4 removes the call)"
    - "Receive counts, skip candidates and award counts key by itemIdentityKey"

key-files:
  created:
    - lib/loot/tier-need-rows.ts
    - lib/loot/__tests__/tier-need-rows.test.ts
    - app/(app)/master-sheet/components/__tests__/RaidModeView.test.tsx
  modified:
    - app/(app)/master-sheet/components/MasterSheetContent.tsx
    - app/(app)/master-sheet/components/BossSection.tsx
    - app/(app)/master-sheet/components/RaidModeView.tsx
    - app/(app)/master-sheet/components/__tests__/BossSection.test.tsx
    - app/components/LootListSummaryView.tsx
    - lib/loot/master-sheet-summary.ts
    - lib/loot/__tests__/master-sheet-summary.test.ts

key-decisions:
  - "Ranked-needs-only is enforced in the browser after the visibility POST, so a Discovery tier with 145 unranked needs adds no row to the master sheet, Summary or Raid Mode (D-02); Phase 4 stops calling keepRankedNeedRows in loadAllRankings"
  - "Need ids go to /api/master-sheet/visibility in the POST body; the BLP GET for items is unchanged and ranked need BLP is a second GET carrying only ranked need ids (Pitfall 7)"
  - "The Summary reads need rankings by tier through an inner embed on loot_submission_items, so no need id enters a URL"

patterns-established:
  - "Tier-scoped need reads: fetchTierNeedRows and fetchTierNeedRankings return [] for no tiers without a query and throw 'Failed to read <label>: <message>' on any page error"
  - "The summary test fake defaults loot_items.kind to 'item' for pre-Phase-3 fixtures, added as an insertion so no existing test line changed"

requirements-completed: [DISC-06]

coverage:
  - id: D1
    description: "Master sheet loads item rows with kind item and need rows by tier, and shows a need row only when the visibility route returned a ranking for it, so unranked seeded needs add nothing"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "lib/loot/__tests__/tier-need-rows.test.ts#W1 loads need rows by tier, keeps only ranked needs, and sends need ids in the POST body"
        status: pass
      - kind: unit
        ref: "lib/loot/__tests__/tier-need-rows.test.ts#T1 with no tier ids it makes no query and returns []"
        status: pass
    human_judgment: false
  - id: D2
    description: "A ranked need renders under the Needs heading as a NeedLabel with no Wowhead anchor, and an officer click still opens the candidate modal"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "app/(app)/master-sheet/components/__tests__/BossSection.test.tsx#N1 renders the need name and its ranking with no Wowhead anchor"
        status: pass
      - kind: unit
        ref: "app/(app)/master-sheet/components/__tests__/BossSection.test.tsx#N2 an officer clicking the need name opens the candidate modal once"
        status: pass
    human_judgment: false
  - id: D3
    description: "Received counts and skip candidates key by itemIdentityKey on the master sheet, the Gargul history map and the candidate modal"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "lib/loot/__tests__/tier-need-rows.test.ts#W3 received counts and skip candidates key by itemIdentityKey"
        status: pass
      - kind: unit
        ref: "app/(app)/master-sheet/components/__tests__/RaidModeView.test.tsx#S2 the Gargul history map and the candidate modal key by itemIdentityKey"
        status: pass
    human_judgment: false
  - id: D4
    description: "Summary lists a need only when an approved list ranks it, counts need awards by the need row, and keeps item awards by wowhead id"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "lib/loot/__tests__/master-sheet-summary.test.ts#N1 lists a need only when an approved list ranks it"
        status: pass
      - kind: unit
        ref: "lib/loot/__tests__/master-sheet-summary.test.ts#N3 already_awarded for a need counts awards of that need row only"
        status: pass
      - kind: unit
        ref: "lib/loot/__tests__/master-sheet-summary.test.ts#N4 an award of the same wowhead item from another tier still counts for the item"
        status: pass
    human_judgment: false
  - id: D5
    description: "Raid Mode search finds a need by name and does not throw on a row with a null boss_name or item_slot"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "app/(app)/master-sheet/components/__tests__/RaidModeView.test.tsx#R1 searching heal finds the need by its name"
        status: pass
      - kind: unit
        ref: "app/(app)/master-sheet/components/__tests__/RaidModeView.test.tsx#R2 a row with a null boss_name and item_slot does not throw on any search"
        status: pass
    human_judgment: false
  - id: D6
    description: "A ranked need on the master sheet is visually distinct from an item row and never looks like a broken Wowhead link (look of the NeedLabel on the real page)"
    requirement: DISC-06
    verification: []
    human_judgment: true
    rationale: "Visual distinction is a design judgment; tests prove only that no anchor or Wowhead attribute renders. The NeedLabel look is held for the Phase 4 copy review (03-05)."

duration: 9min
completed: 2026-10-21
status: complete
---

# Phase 3 Plan 10: Master Sheet Need Rows Summary

**Master sheet, Summary and Raid Mode show only ranked Discovery needs under a "Needs" heading, read by tier with need ids kept out of every URL and receive skips and award counts keyed by itemIdentityKey**

## Performance

- **Duration:** about 9 min
- **Started:** 2026-10-21T21:49:00Z (approximate; the start time was not captured at spawn)
- **Completed:** 2026-10-21T21:58:00Z
- **Tasks:** 3 (one tracer, two auto; all TDD with a RED commit before each GREEN)
- **Files modified:** 10 (3 created, 7 modified)

## Accomplishments

- `fetchTierNeedRows` and `fetchTierNeedRankings` read need rows and their live rankings by tier with `selectAllPagesOrThrow`; both return `[]` for no tiers without a query and throw labelled errors.
- `loadAllRankings` reads items with `kind = 'item'`, loads need rows in parallel, posts item and need ids to the visibility route in the body, keeps only ranked needs with `keepRankedNeedRows`, fetches their BLP in a second GET, and appends them after the items so they group under "Needs" after every boss (getBossOrder falls to 999).
- Received counts and skip candidates use `itemIdentityKey`, so winning one need removes exactly that need's best entry and item skips are unchanged.
- The Summary merges need rows and need rankings, never puts a need id in an `in` filter, and counts `already_awarded` per identity key.
- Raid Mode search guards null `boss_name` and `item_slot`; the Gargul export and the candidate modal use the identity key; the Gargul tier read is item-only.

## Task Commits

1. **Task 1: Tracer: a ranked need shows under "Needs", unranked stay hidden**
   - RED `ee782944` (test)
   - GREEN `8f963197` (feat)
2. **Task 2: Summary lists ranked needs and counts need awards by the need row**
   - RED `4a16ac9f` (test)
   - GREEN `c8f3863d` (feat)
3. **Task 3: Raid Mode never throws on a need row; Gargul export and modal use the identity key**
   - RED `3522f754` (test)
   - GREEN `635709cc` (feat)

**Plan metadata:** the docs commit that follows this file (docs: complete plan)

## Files Created/Modified

- `lib/loot/tier-need-rows.ts` - paged tier-scoped reads of need rows and need rankings
- `lib/loot/__tests__/tier-need-rows.test.ts` - read-shape, empty-list and error cases, plus source assertions on the MasterSheetContent wiring
- `app/(app)/master-sheet/components/MasterSheetContent.tsx` - item-only read, need rows by tier, ranked-needs-only, second BLP GET, identity-keyed counts, skips, Gargul map and modal check
- `app/(app)/master-sheet/components/BossSection.tsx` - `LootItem.wowhead_id` widened to `number | null`, optional `kind`
- `app/(app)/master-sheet/components/RaidModeView.tsx` - null-safe search
- `app/(app)/master-sheet/components/__tests__/BossSection.test.tsx` - need row render and officer click with the real ItemLink
- `app/(app)/master-sheet/components/__tests__/RaidModeView.test.tsx` - search on a need row and on null fields, plus export and modal source assertions
- `lib/loot/master-sheet-summary.ts` - need rows, need rankings and identity-keyed award counts
- `lib/loot/__tests__/master-sheet-summary.test.ts` - need row cases added; no existing line changed
- `app/components/LootListSummaryView.tsx` - `LootListAggregateItem.wowhead_id` widened to `number | null`

## Decisions Made

- Ranked-needs-only is a browser-side filter after the visibility response (D-02). Phase 4 removes the `keepRankedNeedRows` call in `loadAllRankings` so every need shows; the rest of this plan stays.
- The Summary reads need rankings through an inner embed (`loot_items!inner(raid_tier_id, kind)`) so it never builds a need id list.
- BLP for ranked needs is its own GET carrying only ranked need ids, and the item BLP GET is skipped when a phase has no item rows.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Widened LootListAggregateItem.wowhead_id to number | null**
- **Found during:** Task 2 (Summary loader)
- **Issue:** The Summary now returns need rows, whose `wowhead_id` is null, but `LootListAggregateItem.wowhead_id` was `number`, so the loader would not typecheck.
- **Fix:** Widened the field in `app/components/LootListSummaryView.tsx`; its one consumer already passes it to `ItemLink`, which accepts null and renders a NeedLabel.
- **Files modified:** `app/components/LootListSummaryView.tsx` (not in the plan's file list)
- **Verification:** `npm run typecheck` exits 0; summary tests pass.
- **Committed in:** `c8f3863d`

**2. [Rule 3 - Blocking] Summary test fake defaults loot_items.kind to 'item'**
- **Found during:** Task 2 (RED run)
- **Issue:** The loader now filters `kind = 'item'`; pre-Phase-3 fixtures omit `kind`, so every existing case would lose its item. The plan also forbids deleting existing test lines.
- **Fix:** One inserted line at the top of `makeClient` maps each `loot_items` fixture row to `{ kind: 'item', ...row }`, mirroring the column's `NOT NULL DEFAULT 'item'`. No existing line changed (`git diff --numstat` deletions: 0).
- **Files modified:** `lib/loot/__tests__/master-sheet-summary.test.ts`
- **Verification:** All 9 existing Summary cases pass unchanged.
- **Committed in:** `4a16ac9f`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both were needed to typecheck and to keep existing tests unchanged. No scope creep.

## Issues Encountered

- `ItemCandidateModal.tsx` is in the plan's file list but needed no change: typecheck passed with the widened `wowhead_id`, which the plan allowed ("only if typecheck requires it").
- The tracer's human-verify checkpoint is deferred to phase end (`workflow.human_verify_mode: end-of-phase`). The tracer's `<verify>` (tier-need-rows and BossSection tests plus typecheck) was re-run before Task 2 and passed.
- The need-ranking fixtures in the Summary and tier-need-rows tests use flattened `'loot_items.kind'` keys to stand in for the inner embed, because the recording fakes filter on plain row keys.

## Size and effort

D-26 size note: this plan sat at the 10-file threshold and the 100k-token estimate with low confidence and stayed unsplit by owner decision. Actual: 10 files touched (3 created, 7 modified; 9 of the 10 planned files plus `LootListSummaryView.tsx`, with `ItemCandidateModal.tsx` untouched), 6 commits, about 49 KB of diff (about 12,300 tokens at chars/4), roughly 9 minutes. No task ran long; the main-file edits to the 2,000-line MasterSheetContent were confined to the named line ranges. The size risk did not materialise.

## Known Stubs

None. The `kind` and `need_key` fields on `TierNeedRow` are real columns; no placeholder data is wired to the UI.

## Threat Flags

None. Need ids pass through the unchanged visibility route (T-03-10-01), travel in the POST body (T-03-10-02), Raid Mode is guarded and tested (T-03-10-03), and skips use `itemIdentityKey` at every master sheet site (T-03-10-04).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 03-11 (award display) and 03-12 (reader inventory and boss sentinel, which lists `lib/loot/tier-need-rows.ts`) can build on the tier helpers.
- 03-17 should assert the visibility route's earned-phase filter for need ids (T-03-10-01).
- Phase 4 handoff: stop calling `keepRankedNeedRows` in `loadAllRankings` for `list_mode = 'discovery'` tiers, and decide whether the Summary lists unranked needs.
- Shipping: this is PR 3 (need readers); open it only after 03-02 recorded the PR 1 deploy and PR 2 merged. The owner handles PR grouping at ship time.

---
*Phase: 03-discovery-schema-and-need-pipeline*
*Completed: 2026-10-21*

## Self-Check: PASSED

- Created files exist: `lib/loot/tier-need-rows.ts`, `lib/loot/__tests__/tier-need-rows.test.ts`, `app/(app)/master-sheet/components/__tests__/RaidModeView.test.tsx`
- Commits found: ee782944, 8f963197, 4a16ac9f, c8f3863d, 3522f754, 635709cc
- Acceptance greps pass (fetchTierNeedRows 1, keepRankedNeedRows 1, itemIdentityKey 3, kind item 1 in MasterSheetContent; summary: fetchTierNeedRows 1, fetchTierNeedRankings 1, itemIdentityKey 3; RaidModeView `?? ''` 3; summary test deletions 0)
- `npx vitest run lib/loot "app/(app)/master-sheet/components/__tests__"`: 12 files, 228 tests pass
- `npm run typecheck` exits 0; `npm run lint` 0 errors (375 pre-existing warnings)
