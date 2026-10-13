---
phase: 01-forever-defect-and-privacy-fixes
plan: 08
subsystem: analytics
tags: [posthog, privacy, analytics, nextjs, typescript, vitest, source-scan]

requires:
  - phase: 01-forever-defect-and-privacy-fixes
    provides: "plan 01-06 cleaned the browser analytics files (master_loot_awarded, LootSubmissionsContent, CreateGuildModal, GuildContext, PostHogProvider) that the scan covers"
provides:
  - "guild_created, character_created, reserve_item_awarded, character_imported and loot_item_removed_from_list send ids and counts only, no player or guild name"
  - "utils/analytics/__tests__/no-names-in-analytics.test.ts: source scan that fails the build when any analytics call in app, lib, utils or components passes a player or guild name, or any identify call passes an email"
  - "Exact-properties assertions on the mocked trackEvent in the guilds, reserve awards, Battle.net import and remove-item route tests"
affects: [phase-01 shipping split (PR 5, same fix/... branch as plan 01-06), any future analytics call site]

actuals:
  tokens: 4366
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Textual source scan over analytics call arguments with a call-site floor and synthetic self-checks, so the guard cannot pass vacuously"
    - "Route tests assert the exact properties object sent to the mocked trackEvent, so a re-added name key fails at the route"

key-files:
  created:
    - utils/analytics/__tests__/no-names-in-analytics.test.ts
  modified:
    - app/api/guilds/route.ts
    - app/api/guilds/__tests__/route.test.ts
    - app/api/reserve-runs/[id]/awards/route.ts
    - app/api/reserve-runs/[id]/awards/__tests__/route.test.ts
    - app/api/characters/route.ts
    - app/api/battlenet/characters/import/route.ts
    - app/api/battlenet/characters/import/__tests__/route.test.ts
    - app/api/loot-submissions/remove-item/route.ts
    - app/api/loot-submissions/remove-item/__tests__/route.test.ts

key-decisions:
  - "Only the analytics properties changed in the five routes; the award row still stores character_name and the removal audit record still stores character_name (asserted in tests)"
  - "The scan reads call arguments only: a properties object built in a variable elsewhere is caught only where passed literally (accepted, T-08-03); character_created has no route test and is covered by the scan only"
  - "The email rule also flags the shorthand { email } on identify calls, which is the same leak as an email key"

patterns-established:
  - "Scan guard with floor plus self-checks: extractor and matchers are small named functions used by both the real scan and the synthetic checks"

requirements-completed: [FIX-05]

coverage:
  - id: D1
    description: "guild_created sends exactly { guild_id } and keeps the guild id as the PostHog group id"
    requirement: FIX-05
    verification:
      - kind: unit
        ref: "app/api/guilds/__tests__/route.test.ts#sends guild_created with the guild id only, no guild name"
        status: pass
    human_judgment: false
  - id: D2
    description: "reserve_item_awarded sends exactly { run_id, loot_item_id } while the award row still stores character_name"
    requirement: FIX-05
    verification:
      - kind: unit
        ref: "app/api/reserve-runs/[id]/awards/__tests__/route.test.ts#sends reserve_item_awarded with ids only and still stores character_name on the award row"
        status: pass
    human_judgment: false
  - id: D3
    description: "character_imported sends character_id, source, gear_count and version with no character name"
    requirement: FIX-05
    verification:
      - kind: unit
        ref: "app/api/battlenet/characters/import/__tests__/route.test.ts#sends character_imported with ids and counts only, no character name"
        status: pass
    human_judgment: false
  - id: D4
    description: "loot_item_removed_from_list drops the character name and keeps ids, item_name, already_obtained and removed_by; the audit record keeps character_name"
    requirement: FIX-05
    verification:
      - kind: unit
        ref: "app/api/loot-submissions/remove-item/__tests__/route.test.ts#no already_obtained: the soft delete happens and no loot_history insert occurs"
        status: pass
    human_judgment: false
  - id: D5
    description: "character_created sends { character_id } only (no route test; covered by the scan and a grep on the call)"
    requirement: FIX-05
    verification:
      - kind: unit
        ref: "utils/analytics/__tests__/no-names-in-analytics.test.ts#finds no analytics call that passes a player or guild name"
        status: pass
    human_judgment: false
  - id: D6
    description: "Scan test fails on any name in an analytics call or email in an identify call, scans at least 50 call sites, and proves it flags synthetic violations"
    requirement: FIX-05
    verification:
      - kind: unit
        ref: "npx vitest run utils/analytics/__tests__/no-names-in-analytics.test.ts (16 tests)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Dashboard impact on existing PostHog insights that break down by the removed server properties"
    requirement: FIX-05
    verification: []
    human_judgment: true
    rationale: "Which PostHog insights read the removed properties is an owner call (assumption A7); Hard Constraint 3 accepts the change"

duration: 5min
completed: 2026-10-13
status: complete
---

# Phase 1 Plan 08: Server Analytics Privacy and Names Scan Summary

**Five server PostHog events (guild_created, character_created, reserve_item_awarded, character_imported, loot_item_removed_from_list) now send ids and counts only, and a source-scan test with a 50-site floor and synthetic self-checks fails the build if any analytics call passes a player or guild name or any identify call passes an email**

## Performance

- **Duration:** 5 min
- **Started:** 2026-10-13T21:43:36Z
- **Completed:** 2026-10-13T21:48:10Z (code); SUMMARY follows
- **Tasks:** 2
- **Files modified:** 10 (1 created, 9 modified)

## Accomplishments

- `guild_created` sends `{ guild_id }`, `reserve_item_awarded` sends `{ run_id, loot_item_id }`, `character_created` sends `{ character_id }`, `character_imported` sends `{ character_id, source, gear_count, version }`, and `loot_item_removed_from_list` sends `{ guild_id, submission_id, loot_item_id, item_name, already_obtained, removed_by }`.
- The stored data is unchanged: the award row keeps `character_name`, and the removal audit record keeps `character_name` (both asserted in route tests).
- The scan test reads every `.ts` and `.tsx` file under `app`, `lib`, `utils` and `components` (skipping `node_modules`, `.next` and `__tests__`), extracts each analytics call's arguments by balanced-parenthesis matching, and reports file plus offending call on failure.
- The browser files cleaned in plan 01-06 scan clean, which confirms that plan's work. `ReviewNotificationPayload` in `LootSubmissionsContent.tsx` is not a `trackClientEvent` payload and is not flagged.

## Scan non-vacuity checks

- **Name rule, real files:** before the three route fixes landed, the scan failed naming exactly `app/api/battlenet/characters/import/route.ts`, `app/api/characters/route.ts` and `app/api/loot-submissions/remove-item/route.ts` with the offending call text. That is the on-disk proof the name rule has teeth. It passes after the fixes.
- **Name and email rules, synthetic:** the self-check snippets `trackClientEvent('x', { character_name: 'a' })`, `posthog.group('guild', id, { name: g.name })`, `trackEvent({ properties: { guild_name } })`, `posthog.identify(id, { display_name: n })` and `posthog.identify(id, { email: u.email })` are each flagged. Also flagged: the `{ email }` shorthand, an `.email` read passed to `client.identify`, and `activeGuild?.name`. Not flagged: `{ item_name: item.name, guild_id }`, `posthog.unregister('guild_name')` and the event name `'guild_name_changed'`.
- **Call-site floor:** the test requires at least 50 scanned call sites; a grep of the same callee patterns finds about 140 non-test lines, so the floor holds with room.
- **Email rule on a real file, NOT run:** the plan's acceptance criterion asked for temporarily re-adding an email property to the `PostHogProvider` identify call (and a name to one `trackEvent` call) and watching the scan fail. Both temporary edits were denied by the Claude Code permission classifier and I did not retry or work around the denial. The working tree was verified unchanged afterward. The email rule is therefore proven by the synthetic self-checks and by `scans identify calls, so the email rule is not vacuous` (at least one real identify call is scanned and passes), not by an on-disk revert check.

## Extra sites the scan found

None beyond the five listed in the plan. The scan reported exactly the three routes that still had names at the time (import, characters, remove-item); the guilds and reserve awards routes were already fixed by Task 1. No false positive needed a narrower pattern.

## Dashboard impact (server events, for the owner)

From this release PostHog no longer receives these server event properties:

- `guild_created`: `guild_name`
- `character_created`: `character_name`
- `character_imported`: `character_name`
- `reserve_item_awarded`: `character_name`
- `loot_item_removed_from_list` (in `app/api/loot-submissions/remove-item/route.ts`): `character_name`

Insights that break down by any of these will show ids only. Values already stored in PostHog are not removed by code; clear them in PostHog if wanted. Browser-side removals are listed in the plan 01-06 summary.

## Task Commits

1. **Task 1 (tracer, TDD): creating a guild or awarding a reserve item sends no name to PostHog** - `a42513d8` (test, RED), `84491f06` (fix, GREEN)
2. **Task 2 (TDD): character events send no names, scan test guards names and email** - `069886c8` (test, RED), `ec91562c` (fix, GREEN)

**Plan metadata:** recorded in the docs commit that follows this file.

**Tracer feedback gate:** Task 1 verify passed (14 files, 187 tests, tsc 0 errors, eslint 0 errors). The `human-verify` gate was passed under the phase's standing approval, so execution continued straight into Task 2.

## Files Created/Modified

- `utils/analytics/__tests__/no-names-in-analytics.test.ts` - source scan, extractor, name and email matchers, call-site floor and self-checks
- `app/api/guilds/route.ts` and `__tests__/route.test.ts` - guild_created ids only, exact-properties test
- `app/api/reserve-runs/[id]/awards/route.ts` and `__tests__/route.test.ts` - reserve_item_awarded ids only; the test fake now records insert payloads so the stored `character_name` is asserted
- `app/api/characters/route.ts` - character_created ids only (no route test; covered by the scan)
- `app/api/battlenet/characters/import/route.ts` and `__tests__/route.test.ts` - character_imported without the name
- `app/api/loot-submissions/remove-item/route.ts` and `__tests__/route.test.ts` - loot_item_removed_from_list without the character name; test also asserts the audit `oldData` still has `character_name`

## Decisions Made

- Followed the plan as specified (Hard Constraint 3, owner decision 4).
- Added the `{ email }` shorthand to the email rule (a small superset of the plan's key and property-read patterns), since it is the same leak.

## Deviations from Plan

None - plan executed exactly as written, apart from the one acceptance check that could not be run on disk (see Issues Encountered).

## Issues Encountered

- The acceptance criterion that temporarily re-adds a name to a `trackEvent` call and an email to the `PostHogProvider` identify call could not be run: the permission classifier denied both edits. Nothing was modified, no workaround was attempted, and the evidence above stands in for it. If the owner wants the literal on-disk check, it is a one-minute manual step: add `email: sessionUser.email` to the `posthog.identify` object in `app/components/PostHogProvider.tsx`, run `npx vitest run utils/analytics/__tests__/no-names-in-analytics.test.ts`, expect a failure naming that file, then remove the line.
- eslint reports one pre-existing warning (`performance.now` in `utils/analytics/client.ts`, 0 errors); out of scope.
- The full suite is green after this plan: 218 files, 3957 tests.

## Known Stubs

None.

## Threat Flags

None. No new endpoints, auth paths or schema changes. T-08-01 and T-08-02 mitigated as planned; T-08-03 and T-08-04 accepted as planned.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- FIX-05 is complete across plans 01-06 and 01-08: no browser or server analytics event carries a player or guild name, and no identify call carries an email.
- Shipping: PR 5 of the phase, on the same `fix/...` branch as plan 01-06. Not done here.

---
*Phase: 01-forever-defect-and-privacy-fixes*
*Completed: 2026-10-13*

## Self-Check: PASSED

- FOUND: utils/analytics/__tests__/no-names-in-analytics.test.ts
- FOUND commits: a42513d8, 84491f06, 069886c8, ec91562c
- Task 1 and Task 2 acceptance criteria re-run and passing, except the two on-disk revert checks noted under Issues Encountered; vitest (19 files, 257 tests in the plan scope; full suite 218 files, 3957 tests), tsc 0 errors, eslint 0 errors
