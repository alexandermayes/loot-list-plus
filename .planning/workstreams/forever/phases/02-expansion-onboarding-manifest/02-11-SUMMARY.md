---
phase: 02-expansion-onboarding-manifest
plan: 11
subsystem: ui
tags: [react, setup-guide, vitest, forever, manifest, intl, source-scan]

requires:
  - phase: 02-expansion-onboarding-manifest
    provides: "foreverRaidsForTierNames and the client-safe lookup (plan 02-03); FOREVER_MANIFEST with provisional bosses (plan 02-02)"
provides:
  - "SetupGuideProps.raidTierNames, passed by DashboardContent from its existing guild-active raidTiers state (no new query)"
  - "Module-private ForeverRaidList and formatOpensOn in SetupGuide.tsx: a 'Your raids' section after the steps list for Forever guilds whose tiers are available"
  - "Every provisional boss carries the visible word 'Unconfirmed'; one confirmation line per raid with provisional bosses; 'Bosses to be announced' for a raid with no bosses"
  - "Opening date from manifest opens_on, formatted in UTC ('Raids open Dec 9' once when shared, 'Opens <date>' per raid when dates differ)"
  - "Source scan: only SetupGuide.tsx and app/services/expansionCatalogSync.ts import data/expansions/forever/lookup (D-02)"
affects: [02-12, 02-13, phase-08-forever-launch]

actuals:
  tokens: 5400
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Copy constants marked 'proposed, awaiting owner sign-off' so a rejected string is a literal swap plus its test assertion"
    - "Pass-through vi.mock of a lookup module with a per-test override, to exercise a branch the shipped manifest data cannot reach"
    - "Timezone-proof date test: set process.env.TZ at runtime and assert a sanity precondition so the test cannot pass vacuously"

key-files:
  created: []
  modified:
    - "app/(app)/overview/components/SetupGuide.tsx"
    - "app/(app)/overview/components/DashboardContent.tsx"
    - "app/(app)/overview/components/__tests__/SetupGuide.test.tsx"

key-decisions:
  - "The shared 'Raids open' line renders only when every listed raid has the same non-null opens_on; otherwise each raid shows its own 'Opens' line and a raid with no date shows none"
  - "Tier names are used for matching only and never rendered, so an officer-edited tier name cannot reach the DOM (T-02-11-01)"
  - "Task 2 tests all passed against the Task 1 implementation, so no feat or fix commit was needed; mutation checks confirmed they fail when the behaviour breaks"

patterns-established:
  - "Visibility gating for the Forever raid list lives at one render site: isForeverGuild && raidTierStatus === 'available', after the steps list, inside the non-celebration Card"

requirements-completed: [EXPN-01]

coverage:
  - id: D1
    description: "A Forever guild with tiers sees its raids in manifest size order with size labels, every manifest boss, 'Unconfirmed' on each provisional boss, one confirmation line per raid with provisional bosses, 'Bosses to be announced' for a raid with none, and 'Raids open Dec 9' once, inside the setup guide"
    requirement: "EXPN-01"
    verification:
      - kind: unit
        ref: "app/(app)/overview/components/__tests__/SetupGuide.test.tsx#Tracer: a Forever guild with tiers lists its raids and bosses, every boss Unconfirmed"
        status: pass
    human_judgment: false
  - id: D2
    description: "Tier names resolve through the manifest lookup: reverse arrival order still renders in size order, a deactivated tier is omitted, a curly apostrophe and a case change resolve, an unknown name is skipped and never displayed, and no section renders when nothing resolves"
    requirement: "EXPN-01"
    verification:
      - kind: unit
        ref: "app/(app)/overview/components/__tests__/SetupGuide.test.tsx#Forever raid list visibility and resolution (D-02, D-03, D-06)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The raid list is hidden for Classic guilds, Forever guilds with raidTierStatus 'none' (waiting rows unchanged) or 'loading' (guide renders nothing), a dismissed guide and the all-steps-done celebration"
    requirement: "EXPN-01"
    verification:
      - kind: unit
        ref: "app/(app)/overview/components/__tests__/SetupGuide.test.tsx#Forever raid list visibility and resolution (D-02, D-03, D-06)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The opening date shows as Dec 9 in any process timezone (UTC formatting), per-raid 'Opens' lines appear when dates differ, and no rendered text contains an em dash"
    requirement: "EXPN-01"
    verification:
      - kind: unit
        ref: "app/(app)/overview/components/__tests__/SetupGuide.test.tsx#shows the opening day as Dec 9 in any process timezone (UTC formatting, D-06)"
        status: pass
      - kind: unit
        ref: "app/(app)/overview/components/__tests__/SetupGuide.test.tsx#renders no em dash anywhere with the raid list showing"
        status: pass
    human_judgment: false
  - id: D5
    description: "DashboardContent passes raidTierNames from its existing guild-active raidTiers state next to raidTierStatus, with no new query"
    requirement: "EXPN-01"
    verification:
      - kind: other
        ref: "grep -c 'raidTierNames={raidTiers.map' 'app/(app)/overview/components/DashboardContent.tsx' prints 1"
        status: pass
    human_judgment: false
  - id: D6
    description: "The raid list is reachable only through the setup guide: the only non-test importers of data/expansions/forever/lookup.ts are expansionCatalogSync.ts and SetupGuide.tsx"
    requirement: "EXPN-01"
    verification:
      - kind: unit
        ref: "app/(app)/overview/components/__tests__/SetupGuide.test.tsx#forever/lookup importers (D-02)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Owner sign-off on the new copy and on the placement of the 'Your raids' section after the steps list (Hard Constraint 2, D-02 as amended 2026-10-14, D-03), plus a staging check with PR 3 live"
    requirement: "EXPN-01"
    verification: []
    human_judgment: true
    rationale: "Hard Constraint 2: user-facing wording needs the owner's approval and no automated check can approve wording or placement; the staging walk-through needs a deployed preview with PR 3 live"

duration: 10min
completed: 2026-10-18
status: complete
---

# Phase 2 Plan 11: Forever Setup Guide Raid List Summary

**Setup guide 'Your raids' section for Forever guilds: three manifest raids in size order with their bosses, a visible 'Unconfirmed' word on every provisional boss, and the Dec 9 opening date formatted in UTC, reachable only through the setup guide**

## Performance

- **Duration:** 10 min for this resumed segment (Task 1 was committed in an earlier session)
- **Started:** 2026-10-18T02:05:00Z (approximate; resumed run)
- **Completed:** 2026-10-18T02:15:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- A Forever guild whose tiers are available sees a 'Your raids' region after the steps list in the setup guide: Barrow Deeps (10-player, eight bosses), Hyjal Summit (20-player, 'Bosses to be announced') and Onyxia's Lair (40-player, Onyxia), in manifest size order whatever order the tier names arrive in.
- Every provisional boss shows the word 'Unconfirmed' right after its name (the word carries the meaning, not colour), with one 'Boss names are confirmed when the raid opens.' line per raid that has a provisional boss.
- The opening date is manifest data formatted in UTC, so no timezone shifts the day: 'Raids open Dec 9' once when every listed raid shares it, otherwise 'Opens <date>' under each raid that has one.
- Tier names resolve through `foreverRaidsForTierNames` (normalized name or alias); unknown names are skipped, deactivated tiers are not listed, and tier names are never displayed.
- The list is hidden for Classic guilds, Forever guilds with raidTierStatus 'none' (waiting rows unchanged) or 'loading' (guide renders nothing), a dismissed guide and the celebration card. A source scan pins the only two production importers of the lookup (D-02).
- DashboardContent passes `raidTierNames={raidTiers.map(t => t.name)}` from its existing state; no new query.

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer: an officer setting up a Forever guild sees its three raids with bosses and Unconfirmed badges in the setup guide**
   - `fb183ebe` (test) failing tracer test
   - `07db7023` (feat) `raidTierNames` prop, `ForeverRaidList`, `formatOpensOn`, DashboardContent wiring
2. **Task 2: The raid list appears only where and when it should, resolves tier names safely, and its copy goes to the owner for sign-off**
   - `34150b56` (test) visibility, resolution, em dash, timezone, differing-date and importer-scan tests

**Plan metadata:** the `docs(02-11)` commit that carries this SUMMARY, forever STATE.md, ROADMAP.md and REQUIREMENTS.md.

_Both tasks were `tdd="true"`. Task 1 ran red then green (two commits). Task 2 is characterization of the Task 1 implementation: its tests were written first and passed on the first run, so no `feat` or `fix` commit followed (the plan says to change SetupGuide.tsx only if a test exposes a gap). To prove the tests are not vacuous, three temporary mutations were applied and reverted: dropping `timeZone: 'UTC'` failed 4 tests, ignoring the `raidTierStatus === 'available'` gate failed the 'none' test, dropping the `isForeverGuild` gate failed the Classic test. SetupGuide.tsx was restored byte for byte (`git diff` empty)._

**Tracer feedback gate:** Task 1 was the tracer. The run was resumed after it was committed; its `<verify>` (the SetupGuide test file plus typecheck) was re-run and passed, so expansion proceeded into Task 2.

## Task 1 re-verification (resumed run)

Re-run against the existing commits before starting Task 2:

| Check | Result |
|-------|--------|
| `npx vitest run "app/(app)/overview/components/__tests__/SetupGuide.test.tsx"` (existing Tests 1 to 10 plus tracer) | PASS, 12 of 12 |
| `grep -c "raidTierNames={raidTiers.map"` in DashboardContent.tsx prints 1 | PASS |
| `grep -c "foreverRaidsForTierNames("` in SetupGuide.tsx prints 1 | PASS |
| `grep -c "Bosses to be announced"` in SetupGuide.tsx prints 1 | PASS |
| `grep -c "timeZone: 'UTC'"` in SetupGuide.tsx prints 1 | PASS |
| No U+2014 in SetupGuide.tsx (node check exits 0) | PASS |
| `npm run typecheck` | PASS for all repo code; one known pre-existing error in the gitignored generated `.next/dev/types/validator.ts` (stale route type), not in any touched file |
| `npm run lint` | PASS, 0 errors (377 warnings repo-wide; the one in SetupGuide.tsx, an unnecessary `guildName` dependency at the `useCallback`, predates this plan) |

No fix commit was needed.

## Task 2 acceptance criteria

| Criterion | Result |
|-----------|--------|
| SetupGuide test file exits 0 with ordering, subset, normalization, Classic, 'none', 'loading', dismissed, celebration, em dash, date and importer cases | PASS, 25 of 25 |
| `grep -c "Pacific/Kiritimati\|timeZone"` in the test file is at least 1 | PASS (1) |
| `grep -c "forever/lookup"` in the test file is at least 1 | PASS (6) |
| SUMMARY lists the proposed strings under "Copy pending owner sign-off" | PASS (below) |
| `npm run typecheck` and `npm run lint` | PASS (same known noise as above; test file lints clean) |
| Task 2 `<verify><automated>`: SetupGuide tests plus `app/services/__tests__/expansionCatalogSync.test.ts` | PASS, 45 of 45 across the two files |

## Plan-level verification

- `npx vitest run "app/(app)/overview"`: PASS, 1 file, 25 tests.
- `npm run typecheck`: only the known `.next/dev/types/validator.ts` error (missing `app/api/raid-events/route.js` in a stale generated file); no error in any repo source file.
- `npm run lint`: 0 errors, 377 pre-existing warnings.
- `npm run test`: PASS, 228 files, 4223 tests.

## Copy pending owner sign-off

Hard Constraint 2 (D-03): these are PROPOSED strings, exactly as rendered. This plan's PR must not merge until the owner approves or replaces them and confirms the placement. A rejected string is a literal swap of one constant in `SetupGuide.tsx` plus its test assertion. None contains an em dash.

| # | String as rendered | Where |
|---|--------------------|-------|
| 1 | `Your raids` | Section heading, after the steps list |
| 2 | `10-player`, `20-player`, `40-player` | Size label beside each raid name (`N-player`) |
| 3 | `Unconfirmed` | Outline badge after every provisional boss |
| 4 | `Boss names are confirmed when the raid opens.` | Once under the boss list of each raid with a provisional boss |
| 5 | `Bosses to be announced` | Shown for a raid whose manifest boss list is empty (Hyjal Summit today) |
| 6 | `Raids open Dec 9` | Once under the heading when every listed raid shares one opening date |
| 7 | `Opens Dec 9` | Under a raid, only when the listed raids' dates differ (not reachable with today's manifest; covered by a test with injected dates) |

Placement to confirm (D-02 as amended 2026-10-14): a separate 'Your raids' section after the steps list inside the non-celebration card; the existing waiting rows are unchanged and never render together with the list.

Data notes for the owner: the boss names themselves are manifest data and stay provisional until the owner's Oct 21 input (D-12). 'Well of Sorrow' may not be a boss at all (it reads like a place); the owner question is recorded in the manifest header and it renders as 'Unconfirmed' either way.

Pending human check (Task 2 `<human-check>`, not a checkpoint task; `workflow.human_verify_mode` is end-of-phase): after the sign-off, on a staging or preview deploy with PR 3 live, create a Forever guild as a new officer, open Overview, and confirm the guide lists Barrow Deeps (10-player, eight bosses each marked Unconfirmed, one confirmation line), Hyjal Summit (20-player, 'Bosses to be announced') and Onyxia's Lair (40-player, Onyxia marked Unconfirmed), with 'Raids open Dec 9' once, and that no other page shows the list. Coverage entry D7 is `human_judgment: true` for this reason.

## Verifier notes

- **Roadmap success criterion 1, visibility limit (D-02).** The raid and boss list, with its Unconfirmed badges, renders only inside the setup guide: visible to `manage_settings` users, hidden once the guide is dismissed or every step is done, and not rendered while tiers load. An officer who has already finished setup does not see the bosses on later visits. Read SC1 ("an officer creating a Forever guild gets ... with their bosses") as covering the setup flow, not every later visit; bosses on other surfaces are a deferred idea in 02-CONTEXT.md. The tiers themselves (SC1 data half) exist for every Forever guild from plan 02-03 and the plan 02-10 admin script.

## Files Created/Modified

- `app/(app)/overview/components/SetupGuide.tsx` - `raidTierNames` prop, proposed-copy constants, `formatOpensOn`, module-private `ForeverRaidList`, render site after the steps list
- `app/(app)/overview/components/DashboardContent.tsx` - passes `raidTierNames={raidTiers.map(t => t.name)}` to SetupGuide (one line)
- `app/(app)/overview/components/__tests__/SetupGuide.test.tsx` - `renderGuide` takes `raidTierNames`; tracer test; 12 visibility, resolution, em dash, timezone and differing-date tests; the `forever/lookup` importer scan; a pass-through mock of the lookup with a per-test override

## Decisions Made

- The shared 'Raids open' line renders only when every listed raid has the same non-null `opens_on`; otherwise each raid shows its own 'Opens' line and a raid with no date shows none. This follows the plan and keeps the line honest if a later manifest edit staggers the dates.
- Tier names are used for matching and never rendered, so an officer-edited tier name cannot reach the DOM (T-02-11-01); the test asserts an unknown name and a lower-case name do not appear in the region.
- The differing-date branch is tested through a pass-through `vi.mock` of the lookup (real behaviour unless a test sets an override) rather than by exporting `ForeverRaidList`, so the component stays module-private as the plan's artifact list requires.
- The importer scan also matches a relative `./lookup` import from inside `data/expansions/forever`, so a relative path cannot dodge the D-02 allowlist.

## Deviations from Plan

None - plan executed exactly as written.

One note that is not a deviation: Task 2 produced no `feat` or `fix` commit because no test exposed a gap, which the plan allows ("change SetupGuide.tsx only if a test exposes a gap").

## Issues Encountered

- A first draft of the Classic-guild test asserted '2 of 6 steps done'; with a raid schedule set that guild has 3 of 6 done, so the assertion was corrected to '3 of 6 steps done' (a test-authoring slip, fixed before the commit).
- Pre-existing, out of scope and left alone: `npm run typecheck` reports one error in the gitignored generated `.next/dev/types/validator.ts` (stale file from 2026-09-23 referencing a removed `app/api/raid-events/route`), and `npm run lint` reports 377 warnings repo-wide.

## Known Stubs

None. The raid list renders manifest data; the only placeholder-like text is the intentional, owner-gated 'Bosses to be announced' for a raid whose manifest boss list is empty, which D-03 specifies.

## Threat Flags

None. No new endpoint, auth path, file access or schema change. T-02-11-01 (XSS) is covered by rendering only manifest strings through React text nodes with no `dangerouslySetInnerHTML`; T-02-11-02 (unverified boss shown as fact) by the count assertions on 'Unconfirmed' and the confirmation line; T-02-11-03 (unapproved copy) is open by design and gates this PR's merge; T-02-11-05 (prototype pollution) by the unchanged array-based lookup.

## User Setup Required

None - no external service configuration required. The owner copy and placement sign-off above is a merge gate, not a setup step.

## Next Phase Readiness

- This plan's PR (PR 7 of the phase, off `main` after PR 3 merges) is held until the owner signs off the copy listed above and the placement.
- Nothing else in the phase depends on this PR, so holding it blocks no other work.

---
*Phase: 02-expansion-onboarding-manifest*
*Completed: 2026-10-18*

## Self-Check: PASSED

- Files: SetupGuide.tsx, DashboardContent.tsx and SetupGuide.test.tsx all FOUND.
- Commits: `fb183ebe`, `07db7023`, `34150b56` all FOUND in `git log`.
- All Task 1 and Task 2 acceptance criteria and the plan-level verification re-run and logged above.
