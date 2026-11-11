---
phase: 04-discovery-lists-and-score-split
plan: 17
subsystem: ui
tags: [react, segmented-control, confirm-modal, raid-tiers, list-mode, vitest, a11y]

requires:
  - phase: 03-discovery-schema-and-need-pipeline
    provides: "PATCH /api/raid-tiers list_mode with the D-03 and D-17 guards and reasons, KNOWN_SWITCH_BLOCKED_REASON and DISCOVERY_FOREVER_ONLY_REASON in domain/loot/list-mode.ts, list_mode on raid_tiers"
provides:
  - "A 'List mode' SegmentedControl (Known, Discovery) per tier on the Forever expansion page for users with manage_settings; Known to Discovery confirms first, Discovery to Known does not"
  - "The route's 409 or 400 reason shown verbatim in a role='alert' panel under the row (tap to dismiss, cleared by the next successful change), with the generic fallback sentence when none comes back; the control snaps back because it is driven by the saved mode"
  - "A read-only outline 'Discovery' Badge for users without manage_settings, and the UI-16 mixed-mode note under a phase's tier list"
  - "GET /api/raid-tiers selects sort_order beside list_mode (D-02 amended)"
  - "SegmentedControl gains aria-pressed on its options and an optional disabled prop"
affects: [04-18, 04-19, 04-11, 04-20]

actuals:
  tokens: 9200
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A route refusal is the explanation: the control is driven by the saved mode, so a refused PATCH needs no rollback code, only the reason string"
    - "Optional per-surface prop (listMode) passed only for the Forever expansion, so other expansions render the row exactly as before"

key-files:
  created:
    - app/(app)/expansions/[expansionId]/__tests__/list-mode-control.test.tsx
  modified:
    - app/(app)/expansions/[expansionId]/_client.tsx
    - components/ui/segmented-control.tsx
    - app/api/raid-tiers/route.ts
    - app/api/raid-tiers/__tests__/route.test.ts

key-decisions:
  - "The mixed-mode note counts guild-active tiers only, over every phase of the resolved phase group; this matches D-12 (raiders get the picker when every guild-active tier in the group is Discovery), so a tier the guild turned off cannot raise a note that would be false for raiders"
  - "On success the page updates the tier in local state and revalidates the /api/raid-tiers and /api/loot-items SWR keys instead of calling loadData, so the whole page does not flash its skeleton and focus stays on the control"
  - "The confirm title uses the tier's full name ('Switch {name} to Discovery?') rather than the shorthand shown in the row"
  - "CompactRaidToggle is exported so the non-manager badge can be tested; the page itself redirects non-managers to /overview before loading any tier"

patterns-established:
  - "List-mode copy lives inline in _client.tsx as DRAFT until the 04-19 sign-off; the two route reasons are never reworded, only shown"

requirements-completed: []

coverage:
  - id: D1
    description: "Managers see Known and Discovery per tier of a Forever expansion; Known to Discovery confirms, then PATCHes { guild_id, tier_id, updates: { list_mode } } and refreshes the two SWR keys; Discovery to Known PATCHes without a confirm"
    requirement: "DISC-05"
    verification:
      - kind: unit
        ref: "app/(app)/expansions/[expansionId]/__tests__/list-mode-control.test.tsx#[D-15] list mode control on the expansion page"
        status: pass
    human_judgment: false
  - id: D2
    description: "A 409 or 400 reason shows verbatim in a role='alert' panel, the control snaps back, a missing reason or failed request shows the fallback sentence, a tap or the next successful change clears it, and the control is disabled while the request runs"
    requirement: "DISC-05"
    verification:
      - kind: unit
        ref: "app/(app)/expansions/[expansionId]/__tests__/list-mode-control.test.tsx#[D-15] list mode control on the expansion page"
        status: pass
    human_judgment: false
  - id: D3
    description: "Users without manage_settings see a read-only 'Discovery' badge on Discovery tiers and no control; Known tiers and expansions without the surface show nothing new"
    requirement: "DISC-05"
    verification:
      - kind: unit
        ref: "app/(app)/expansions/[expansionId]/__tests__/list-mode-control.test.tsx#[D-15] read-only badge for users without manage_settings"
        status: pass
    human_judgment: false
  - id: D4
    description: "A phase whose guild-active tiers use different list modes shows the UI-16 note; a matching phase or a turned-off odd tier shows none"
    requirement: "DISC-05"
    verification:
      - kind: unit
        ref: "app/(app)/expansions/[expansionId]/__tests__/list-mode-control.test.tsx#[UI-16] mixed list modes in one phase"
        status: pass
    human_judgment: false
  - id: D5
    description: "GET /api/raid-tiers selects list_mode and sort_order for every tier, and the Phase 3 guard against list_mode on the expansion page is replaced by a D-15 source check; every PATCH test is unchanged"
    requirement: "DISC-05"
    verification:
      - kind: unit
        ref: "app/api/raid-tiers/__tests__/route.test.ts#GET /api/raid-tiers selects list_mode and sort_order on every tier"
        status: pass
      - kind: unit
        ref: "app/api/raid-tiers/__tests__/route.test.ts#[D-15] the expansion page carries the list-mode control"
        status: pass
    human_judgment: false
  - id: D6
    description: "UI-SPEC E6 at 320px: the list-mode row wraps to two lines (name, then the three controls) and the long 409 sentence wraps under the row without pushing the controls off screen"
    requirement: "DISC-05"
    verification: []
    human_judgment: true
    rationale: "jsdom has no layout engine. The classes are in place (flex-wrap with 8px gaps, w-full name on phones, break-words on the panel) but a visual check at 320px is the backstop the plan names."

duration: 25min
completed: 2026-11-10
status: complete
---

# Phase 04 Plan 17: Officer list-mode control Summary

**A per-tier Known or Discovery control on the Forever expansion page, with the route's refusal reasons shown verbatim and the tier list carrying sort_order.**

## Performance

- **Duration:** about 25 min
- **Tasks:** 2 (1 tracer, 1 TDD), both run test-first
- **Files modified:** 5 (1 created, 4 modified)
- **Commits:** 4 task commits

## Accomplishments

- **Control (D-15).** `CompactRaidToggle` shows a "List mode" label and `SegmentedControl size="sm"` (Known, Discovery) beside the Loot and Ranks switches, only when the page passes it a `listMode` surface. The page passes that only when the expansion is the Forever expansion (`expansion_name === FOREVER_EXPANSION_NAME`, the same test the route's D-17 guard uses), so Classic expansions render the row as before, including its single-line layout.
- **Flow.** `handleChangeListMode` confirms only Known to Discovery (default-variant `ConfirmModal`, copy from UI-SPEC surface 5, DRAFT for 04-19) and ignores a tap while that tier's request is in flight. `applyListMode` PATCHes `{ guild_id, tier_id, updates: { list_mode } }`. On success it updates the tier locally and revalidates `/api/raid-tiers` and `/api/loot-items`. On failure it keeps the saved mode (so the control snaps back with no rollback code) and stores the route's `error` string for that tier, or "Couldn't change the list mode. Try again." when none comes back or the request throws.
- **Reason panel.** `role="alert"`, `bg-warning/10 border border-warning/30`, 12px, verbatim text, `break-words` so the long `KNOWN_SWITCH_BLOCKED_REASON` sentence wraps. A tap dismisses it and the next successful change clears it.
- **Non-managers (D-15).** A read-only `Badge variant="outline"` "Discovery" on Discovery tiers and no control.
- **Mixed modes (UI-16).** The note renders under a phase card's tier list when its group's guild-active tiers differ in `list_mode`. The group comes from `resolvePhaseGroups`, so a merged group shows the note on each of its phase cards.
- **Tier list (D-02 amended).** `GET /api/raid-tiers` selects `sort_order`. The Phase 3 test that barred `list_mode` from the expansion page is now a D-15 source check (the page mentions `list_mode` and calls `/api/raid-tiers`); every PATCH test, including the WR-01 one-statement and failed-seed restore cases, is untouched. The PATCH doc comment no longer says no page calls it with `list_mode`.
- **SegmentedControl.** Options now carry `aria-pressed`, and an optional `disabled` prop disables them (60% opacity, not-allowed cursor). Both are additive; the other ten users of the component render the same.

## Task Commits

1. **Task 1 (tracer) RED: failing list mode control tests** - `5aa87d3a` (test)
2. **Task 1 (tracer) GREEN: list mode control on the expansion page** - `e339e99d` (feat)
3. **Task 2 RED: failing sort_order and inverted guard test** - `2bcf1caa` (test)
4. **Task 2 GREEN: sort_order on the raid tier list** - `6044b689` (feat)

## Tracer gate

After committing the tracer I re-ran its `<verify>` (`npx vitest run "app/(app)/expansions"`, 17 of 17 pass) and its acceptance greps (`list_mode` 10, the mixed-mode sentence 1, `role="alert"` 1) and continued into Task 2 without a checkpoint, as the orchestrator directed. The RED run before the implementation showed 14 of 17 failing for the missing feature (the 3 passing were the "shows nothing" cases), so the tests do exercise the change.

## Verification

- `npx vitest run "app/(app)/expansions" app/api/raid-tiers lib/loot/__tests__/need-reader-inventory.test.ts`: 3 files, 81 tests, all pass
- `npm run typecheck`: no errors
- `npm run lint`: 0 errors; 375 warnings overall, the ones in the touched files (unused `PhaseGroup`, `deadline`, `isUpdatingDeadline`, `<img>`, the `useEffect` dependencies) all predate this plan
- Acceptance greps: `sort_order` in the route 1, `D-15` in the route test 2, `WR-01` in the route test 3, `list_mode` in the page 10, mixed-mode sentence 1, `role="alert"` 1
- Inventory: no new reader of `loot_items`, `loot_submission_items` or `loot_history` was added, so `need-reader-inventory.test.ts` needed no entry and stays green
- Privacy: fixtures use generic names ("Raid One", "Raid Two"); no production names or ids

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] SegmentedControl had no disabled state or pressed state**
- **Found during:** Task 1
- **Issue:** The plan says the control is disabled while the PATCH runs (UI-SPEC E6 loading), but `SegmentedControl` has no `disabled` prop, and its options exposed the selected mode only through colour, so assistive tech could not tell which mode was active.
- **Fix:** Added an optional `disabled` prop and `aria-pressed` on each option; the control's own handler also ignores a tap while its tier is updating.
- **Files modified:** `components/ui/segmented-control.tsx` (not in the plan's `files_modified`)
- **Commit:** `e339e99d`

**2. [Rule 3 - Blocking] CompactRaidToggle exported for the badge test**
- **Found during:** Task 1 (RED)
- **Issue:** The page redirects users without `manage_settings` to `/overview` and never loads tiers for them, so the non-manager badge cannot be rendered through the page.
- **Fix:** Exported `CompactRaidToggle` and tested the badge at component level. Behaviour unchanged.
- **Files modified:** `app/(app)/expansions/[expansionId]/_client.tsx`
- **Commit:** `e339e99d`

**Total deviations:** 2 auto-fixed (1 Rule 2, 1 Rule 3). **Impact:** none on scope; one shared component gained two additive, backwards-compatible features.

## Notes for the owner and the next plans

- **The badge is unreachable today.** Because the page itself redirects non-managers, the read-only "Discovery" badge never shows in the running app. It is built and tested as D-15 and UI-SPEC surface 5 specify, so it appears if the page gate is ever loosened. If you would rather drop it, it is one conditional in `CompactRaidToggle`.
- **Copy is DRAFT for 04-19:** the confirm title, body and button labels, "List mode", the mixed-mode note and the fallback sentence are inline in `_client.tsx` (and `LIST_MODE_FALLBACK_REASON`). The two route reasons are shown as the route returns them. No em dashes in any of it.
- **Shipping:** this belongs in PR 3 with 04-18, the picker (04-11, 04-20) and after 04-02 records the deploy. It must not reach main before the picker, or an officer could switch a raid to Discovery while raiders still see the item editor.
- **Visual check owed (backstop):** open the expansion page at 320px on a Forever guild and confirm the row wraps to name then three controls, and that a triggered 409 sentence wraps under the row. jsdom cannot check this.
- **Requirements:** DISC-05 is shared with other plans in this phase and `requirements.ready-ids` reported it not ready, so it was not marked complete here.

## Authentication Gates

None.

## Known Stubs

None. Every value in the new UI flows from the loaded tier rows or the route's response.

## Threat Flags

None. No new endpoint, auth path or schema change; the route's permission and tier-to-guild checks (T-04-17-01), its D-03 and D-17 guards (T-04-17-02) and its audit row (T-04-17-03) are unchanged, and the new UI only calls them and shows their answers.

## Self-Check: PASSED

- Created file exists: `app/(app)/expansions/[expansionId]/__tests__/list-mode-control.test.tsx`
- Commits exist on `work/forever-phase-04`: `5aa87d3a`, `e339e99d`, `2bcf1caa`, `6044b689`
- All task acceptance criteria and the plan-level verification re-run and pass (see Verification)
