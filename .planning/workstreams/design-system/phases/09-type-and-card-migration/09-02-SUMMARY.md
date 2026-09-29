---
phase: 09-type-and-card-migration
plan: 02
subsystem: ui
tags: [vitest, guard-tests, puppeteer, visual-regression, tailwind]

requires:
  - phase: 09-type-and-card-migration
    provides: "09-01's two committed codemods (text-sizes.mjs, hand-rolled-cards.mjs) and their pattern/mapping-table JSON files, which both new guards read rather than restate"
provides:
  - "__tests__/arbitrary-text-sizes.test.ts: TYPE-03's live ratchet at ceiling 878 (matching lines), plus the copied interpolation-bypass guard and a mapping-table validity assertion"
  - "__tests__/hand-rolled-cards.test.ts: PRIM-01's live ratchet at ceiling 232 (matching lines), reading its detection regex from the committed pattern file"
  - "scripts/visual/baseline.mjs extended with an additive afterGoto hook and two new authenticated PAGES entries (guild-settings, loot-management)"
  - "A committed before-capture at .planning/workstreams/design-system/baselines/2026-09-19-pre-phase-09/ (D-17 fallback path: Home-only, 4 images)"
  - "Task 3's blocking human gate reached, presented, and answered: approved as presented (all four named deltas, both discretion calls, and the Home-only fallback), plus a disposition for the 6 skipped cn(...) sites (excluded, same treatment as the 29 borderless lines) -- recorded verbatim in this summary's Checkpoint Resolution section"
affects: [09-03-type-sweep, 09-04-type-sweep-cont, 09-05-card-primitive, 09-06-card-sweep-cont]

actuals:
  tokens: 10500
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Ratchet guard tests assert matchesIn(...).length <= a named ceiling constant (not toHaveLength(0)) so the batch sweep can lower the constant one commit at a time without a red intermediate commit"
    - "A guard reads its detection predicate from the same committed JSON pattern file the codemod reads, so guard and codemod cannot drift apart (extends the 09-01 convention of committed-script-not-hand-typed-numbers to the guard side)"
    - "baseline.mjs's afterGoto: an optional per-PAGES-entry async hook, invoked after the animation-disabling style tag and before the paint-settle wait, that finds its control by stable visible text (no test id added, since no app/ or components/ file may be edited by this plan) and throws a named Error rather than silently capturing an unopened panel"

key-files:
  created:
    - __tests__/arbitrary-text-sizes.test.ts
    - __tests__/hand-rolled-cards.test.ts
    - .planning/workstreams/design-system/baselines/2026-09-19-pre-phase-09/
  modified:
    - scripts/visual/baseline.mjs
    - .planning/WINDOWS.md

key-decisions:
  - "Both guard ceilings are LINE counts (matchesIn semantics: one entry per matching line, not per occurrence), which is why they differ from the codemods' own dry-run REWRITE counts (932 type-sweep rewrites / 225 card-sweep rewrites per 09-01). Live line counts measured this session: 878 arbitrary-text-size lines, 232 hand-rolled-card lines -- both match the plan's own ratchet-schedule table exactly (878 = 38+233+184+213+137+73; 232 = 31+47+75+79), so no ceiling discrepancy exists between plan time and execution time."
  - "The D-17 precondition was checked read-only (GET /api/dev/test-users against the already-running local dev server) without ever touching SUPABASE_SERVICE_ROLE_KEY; the endpoint returned 404 (test-users file not found), confirming npm run test:users:create has not been run in the user's own shell. The capture fell back to Home-only per D-17's documented fallback, and the skip is recorded in both manifest.json and .planning/WINDOWS.md (entry 10)."
  - "afterGoto hooks for guild-settings and loot-management locate their controls by stable visible button text (\"Raid Schedule\", \"Loot settings\") via page.evaluate/waitForFunction rather than a data-testid, since adding one would require editing a file under app/ or components/ -- forbidden by this plan's own scope boundary."
  - "Task 3's checkpoint answered 'approve': the batch plan (6 type-sweep + 4 card-sweep commits), all four named discrepancies (radius-delta 13->25, display-alias 44->49, card scope 227/73->232/74, D-04 heading count ~51->34), and both discretion calls (bg-card folded into the 232/74 figure; batch order authenticated-app-first/overview-tracer, then app/components, then landing/public with the sacred hero second-to-last, then components/) are all accepted exactly as presented -- no adjustment."
  - "The 6 SKIPPED cn(...)-built hand-rolled-card sites (components/ui/dropdown-menu.tsx:58,:75; empty-state.tsx:77; error-state.tsx:67; radio-group.tsx:28; segmented-control.tsx:33), inventoried by 09-01-SUMMARY.md, are excluded from both the sweep and the guard for the remainder of Phase 09, given the same treatment as the ~29 borderless bg-background-elevated lines (D-08): no manual-conversion task is scheduled for them inside Phase 09, and they are not routed to Phase 10 either."
  - "Live measurement this session confirms these 6 sites are NOT structurally excluded from HAND_ROLLED_CARD_CEILING today: unlike the borderless lines (which never match the detection regex because they lack a border token), each cn(...) call places its full surface-class string on one line, so all 6 currently match the guard's regex and are counted inside its ceiling. Excluding them 'entirely' per the user's decision therefore requires the batch that closes the ratchet to specifically account for these 6 lines (e.g. a scanExclusions or pattern-file update), which 09-06-PLAN.md's current acceptance criteria do not yet do -- see Deviations for the full flag; not resolved in this plan, since resolving it means re-authoring 09-06's criteria, out of this checkpoint's scope."

requirements-completed: []

coverage:
  - id: D1
    description: "__tests__/arbitrary-text-sizes.test.ts exists at the live ceiling (878), reuses sourceFiles/matchesIn, copies the interpolation-bypass guard verbatim, and asserts every text-size-map.json value is a real fontSize key"
    requirement: TYPE-03
    verification:
      - kind: unit
        ref: "npx vitest run __tests__/arbitrary-text-sizes.test.ts (3 tests, all passing)"
        status: pass
      - kind: other
        ref: "Both-ways ceiling proof: raising to 879 still passes (4/4 green); lowering to 877 fails naming the offending path:line (verified this session, then restored to 878)"
        status: pass
    human_judgment: false
  - id: D2
    description: "__tests__/hand-rolled-cards.test.ts exists at the live ceiling (232), reads its detection regex from hand-rolled-card-pattern.json rather than restating it, excludes components/ui/card.tsx"
    requirement: PRIM-01
    verification:
      - kind: unit
        ref: "npx vitest run __tests__/hand-rolled-cards.test.ts (1 test, passing)"
        status: pass
      - kind: other
        ref: "Both-ways ceiling proof: raising to 233 still passes; lowering to 231 fails naming the offending path:line (verified this session, then restored to 232)"
        status: pass
    human_judgment: false
  - id: D3
    description: "scripts/visual/baseline.mjs gains an additive afterGoto hook plus guild-settings/loot-management PAGES entries; resolveOrigin left byte-unchanged; before-capture taken (D-17 fallback: Home-only, 4 images, 3 skipped, no credential value in manifest.json)"
    requirement: PRIM-01
    verification:
      - kind: other
        ref: "node -e presence check for guild-settings/loot-management/afterGoto strings printed ok; git diff shows no change inside resolveOrigin; manifest.json shows 4 images / 3 skipped with 0 SERVICE_ROLE/service_role grep hits"
        status: pass
      - kind: manual_procedural
        ref: "Task 2's <human-check> (confirm expanded panel / open modal in the committed images) could not be run: the fallback captured Home only, so no guild-settings or loot-management images exist to inspect. Routed to end-of-phase UAT via WINDOWS.md entry 10, per D-17."
        status: unknown
    human_judgment: true
    rationale: "The afterGoto hooks' actual click/expand behavior on real authenticated pages is unverified until a dev test user exists and the capture is retaken; recorded as an open item at Task 3's checkpoint (option 'hold') rather than assumed working."
  - id: D4
    description: "Task 3's blocking human gate (batch plan, full pixel mapping table, every visibly-changing site, named discrepancies, two discretion-call confirmations) is presented in full and answered: approve as presented"
    human_judgment: true
    rationale: "This is the ROADMAP hard-constraint checkpoint itself; by definition it requires the user's explicit decision. The user answered 'Approve as presented' plus a disposition for the 6 skipped cn(...) sites; both are recorded verbatim in the Checkpoint Resolution section below."
  - id: D5
    description: "The user's checkpoint decision is recorded verbatim: approve as presented (batch plan, four named deltas, both discretion calls, Home-only fallback), plus the 6 skipped cn(...) sites' disposition (excluded, same treatment as the 29 borderless lines, not scheduled within Phase 09, not routed to Phase 10)"
    requirement: PRIM-01
    verification:
      - kind: other
        ref: "Verbatim user response recorded in ## Checkpoint Resolution (Task 3) below, matching the resume_instructions' <user_response> block exactly"
        status: pass
    human_judgment: true
    rationale: "A recorded go-ahead cannot be verified by an automated check; it is a transcript of what the user actually said, checked against the source message for fidelity."

duration: 47min
completed: 2026-09-19
status: complete
---

# Phase 09 Plan 02: Ratchet Guards, Screenshot Gate Extension, and the Blocking Checkpoint (Summary)

**Both TYPE-03/PRIM-01 ratchet guards are live at their measured ceilings (878 lines / 232 lines), the screenshot script now supports guild-settings and loot-management with an additive afterGoto hook, the before-capture is committed under the D-17 Home-only fallback, and the phase's single blocking human gate has been presented AND answered: approve as presented, plus a disposition for the 6 skipped cn(...) sites. No file under `app/` or `components/` has been edited -- that starts at 09-03 Task 1.**

## Performance

- **Duration:** 47 min
- **Started:** 2026-09-19T19:11:00Z (approx, per STATE.md session continuity)
- **Completed:** 2026-09-19T20:15:00Z (checkpoint answered, plan closed)
- **Tasks:** 3 of 3 completed (Task 3 is a `checkpoint:decision` resolved by the user's recorded answer, not a code task)
- **Files modified:** 6 (2 created under `__tests__/`, 1 modified script, 1 modified ledger, 1 baseline directory with 5 files created, 1 summary/state doc update for the checkpoint resolution)

## Accomplishments
- Created `__tests__/arbitrary-text-sizes.test.ts` (TYPE-03 ratchet, ceiling 878 matching lines) and `__tests__/hand-rolled-cards.test.ts` (PRIM-01 ratchet, ceiling 232 matching lines), both reusing `sourceFiles`/`matchesIn`, both proven non-vacuous by a both-ways ceiling proof (raise passes, lower fails naming the offending `path:line`)
- Extended `scripts/visual/baseline.mjs` with an additive, optional `afterGoto` hook on `PAGES` entries and two new authenticated pages (`guild-settings`, `loot-management`), leaving `resolveOrigin` byte-unchanged
- Checked the D-17 precondition read-only (`GET /api/dev/test-users` against the already-running local dev server, never touching `SUPABASE_SERVICE_ROLE_KEY`); it returned 404, confirming `npm run test:users:create` has not been run in the user's own shell
- Took the before-capture under the D-17 fallback: `.planning/workstreams/design-system/baselines/2026-09-19-pre-phase-09/` (Home-only, 4 images), recorded the skip in `manifest.json` and as `.planning/WINDOWS.md` entry 10
- Reached Task 3, the phase's single blocking human gate, presented its full content (batch plan, complete pixel mapping table, every visibly-changing site by file and line, four named discrepancies, two discretion-call confirmations) to the user, and recorded the user's answer: approve as presented, plus a disposition for the 6 skipped `cn(...)` sites (excluded, same treatment as the 29 borderless lines)

## Task Commits

Each completed task was committed atomically:

1. **Task 1: Create both ratcheting guard tests at their live ceilings** - `0a739c85` (test)
2. **Task 2: Extend baseline.mjs to the three heaviest card screens and take the before-capture** - `bf5ed8c7` (feat)
3. **Task 3: BLOCKING GATE - resolved** - this is a `checkpoint:decision` task with `gate="blocking-human"`; it carries no source-code diff. Its resolution (the user's verbatim answer, both live ceilings, the capture outcome, and the resolution of every named discrepancy and discretion call, per this plan's `<output>` spec) is recorded in this SUMMARY, committed alongside it as a docs commit (see `## Checkpoint Resolution (Task 3)` below and the closing metadata commit hash in the final report).

**Plan metadata:** committed alongside this SUMMARY (see the docs commit immediately following).

## Files Created/Modified
- `__tests__/arbitrary-text-sizes.test.ts` - TYPE-03 ratchet guard, ceiling 878, plus interpolation-bypass and mapping-table-validity tests
- `__tests__/hand-rolled-cards.test.ts` - PRIM-01 ratchet guard, ceiling 232, reading its regex from `hand-rolled-card-pattern.json`
- `scripts/visual/baseline.mjs` - additive `afterGoto` field and hook invocation; two new `PAGES` entries; `resolveOrigin` untouched
- `.planning/workstreams/design-system/baselines/2026-09-19-pre-phase-09/` - before-capture (Home-only fallback), 4 PNGs + `manifest.json`
- `.planning/WINDOWS.md` - entry 10, the D-17 fallback recorded as `unrun-verify`
- `09-02-SUMMARY.md`, `.planning/workstreams/design-system/STATE.md`, `.planning/workstreams/design-system/ROADMAP.md` - Task 3's checkpoint resolution recorded and the plan closed out

## Decisions Made
- Guard ceilings are **matching-line** counts (878, 232), not the codemods' **rewrite/occurrence** counts (932, 225) -- both re-measured live this session and found to match the plan's own ratchet-schedule table exactly, so no reconciliation was needed at this step (see `key-decisions` in frontmatter for the full arithmetic).
- The D-17 precondition check was read-only against the running dev server's `/api/dev/test-users` endpoint; no credential was read, printed, or written. The 404 response is the sole basis for taking the fallback path.
- `afterGoto` hooks locate their controls by stable visible text rather than adding a `data-testid`, since this plan may not edit any file under `app/` or `components/`.
- Task 3's checkpoint answered **approve as presented**, plus the 6 skipped `cn(...)` sites disposed as **excluded** (see `## Checkpoint Resolution (Task 3)` below for the full verbatim record).

## Checkpoint Resolution (Task 3)

**Answer: Approve as presented**, with one additional disposition for an item the gate's own content named but did not resolve (the 6 `SKIPPED` `cn(...)` sites 09-01-SUMMARY.md inventoried). Recorded verbatim below, per this plan's `<output>` spec (the user's answer, both live ceilings, the capture outcome, and the resolution of every named discrepancy and discretion call).

**1. Batch plan** -- accepted exactly as presented: 6 type-sweep commits (`ARBITRARY_TEXT_SIZE_CEILING` 878 -> 0 across T0-T5) and 4 card-sweep commits plus the Card primitive change (`HAND_ROLLED_CARD_CEILING` 232 -> 0 across C1-C4), per this plan's "The ratchet schedule" tables.

**2. The complete pixel mapping table** -- accepted as presented (all 22 rows from `scripts/codemods/text-size-map.json`, including the three non-identity rows: D-02's two midpoint round-ups and D-03's two sub-floor raises).

**3. Every visibly-changing site** -- accepted as presented, all four groups (D-03 sub-floor, D-02 midpoint, D-04 heading-tightening, D-06 radius-delta).

**4. The four named discrepancies -- each accepted at the live, dry-run-measured number, not the discussion-time estimate:**
| Discrepancy | Discussion estimate | Live/accepted number |
|---|---|---|
| Radius-delta sites (D-06) | CONTEXT.md: 13 | **25** (the `hand-rolled-cards.mjs --dry-run` RADIUS DELTA count; 09-01-SUMMARY.md's authoritative figure) |
| Display-alias sites (D-01) | CONTEXT.md: 44 | **49** |
| Card-sweep scope (D-08) | 227 lines / 73 files (token as written) | **232 lines / 74 files** (with the `bg-card` synonym folded in, discretion call below) |
| D-04 heading line-height-tightening sites | CONTEXT.md: ~51 | **34** sites across 25 files (this session's live measurement; see "Issues Encountered" below) |

**5. Both Claude's Discretion calls -- both confirmed as proposed, not reversed:**
- The `bg-card` synonym (all 5 of its one-off sites carry both a border token and a radius) stays folded into the 232-line/74-file card-scope figure. The other 6 `bg-card` one-offs remain inventoried with the borderless lines, per 09-CONTEXT.md's Claude's Discretion list.
- Batch order stays as listed: the type sweep runs authenticated app screens first (a 2-file tracer on `/overview`, already in the screenshot baseline), then `app/components`, then landing and public pages (sacred hero in the second-to-last batch, after the mechanism is proven on five prior batches), then `components/`.

**6. Screenshot-gate state** -- confirmed: the before-capture fell back to Home-only (no dev test user exists; `npm run test:users:create` has not been run in the user's own shell), recorded as `.planning/WINDOWS.md` entry 10. Per the gate's own item 6, the end-of-phase UAT walkthrough of `/overview`, `/guild-settings` and `/loot-management` replaces the visual comparison for those three screens.

**7. The 6 skipped `cn(...)` sites -- new disposition, resolved by the user beyond what the gate's own content proposed:** `components/ui/dropdown-menu.tsx:58` and `:75`, `empty-state.tsx:77`, `error-state.tsx:67`, `radio-group.tsx:28`, `segmented-control.tsx:33` (line numbers as cited in 09-01-SUMMARY.md's inventory at measurement time; see the flag below for why current line numbers differ slightly). **Decision: Exclude, given the same treatment as the ~29 borderless `bg-background-elevated` lines (D-08).** These 6 sites stay out of this phase's guard and sweep entirely. No manual-conversion task is scheduled for them inside Phase 09. They are not routed to Phase 10 either -- they are simply excluded and recorded as excluded, here and in this frontmatter's `key-decisions`.

**Flag for 09-05/09-06 (not resolved in this plan):** live measurement this session confirms these 6 lines are *not* structurally excluded from `HAND_ROLLED_CARD_CEILING` the way the borderless lines are. Each `cn(...)` call places its full surface-class string on one source line, so the guard's line-based regex matches all 6 today (verified directly: `dropdown-menu.tsx`, `radio-group.tsx`, `segmented-control.tsx`, `empty-state.tsx` and `error-state.tsx` each still produce a match under the committed detection regex, at line numbers shifted slightly from 09-01's citations because file content has moved since that measurement). "Excluded from the guard entirely," as decided above, therefore requires whichever batch closes the card-sweep ratchet to specifically account for these 6 lines -- most plausibly a `scanExclusions` addition or an equivalent pattern-file change -- rather than leaving them to resolve themselves. `09-06-PLAN.md` Task 2's current acceptance criteria do not yet reflect this: they require a zero-total dry-run over `app` and `components`, assert `scanExclusions` stays at exactly `["components/ui/card.tsx"]` (unwidened), and close the guard to a plain `toHaveLength(0)` assertion. As written, those three criteria are inconsistent with permanently excluding 6 matching lines without rewriting them. This is carried forward as an open item for whoever plans or executes 09-05/09-06 to reconcile -- it is an architectural question about how the guard should close (Rule 4 territory), not something this checkpoint-resolution plan resolves unilaterally.

## Deviations from Plan

**None for Task 1 and Task 2** - both executed exactly as written, including the required typecheck fix (indexing `theme.extend.fontSize` needed a `Record<string, unknown>` cast to satisfy `tsc`, following the exact pattern `type-scale-floor.test.ts` already uses for the same object) -- not a deviation from the plan's intent, just the mechanical typing needed to satisfy `npm run typecheck`.

**Task 3 (the checkpoint) required no code deviation** - it is a `checkpoint:decision` task with no `<files>` and no source-code diff. The one substantive addition beyond the plan's own gate content is the discovery, documented above, that the 6 skipped `cn(...)` sites are not yet structurally excluded from the card guard's live ceiling -- flagged for the plans that close that ratchet rather than fixed here, since fixing it would mean editing `__tests__/hand-rolled-cards.test.ts` and/or `scripts/codemods/hand-rolled-card-pattern.json` outside this task's scope and re-authoring 09-06's acceptance criteria, which this checkpoint-resolution step does not have the authority to do unilaterally.

## Issues Encountered

**The D-04 heading-tightening site count does not reproduce CONTEXT.md's ~51 estimate.** This session's live measurement (every line matching `text-[Npx]` where the mapped alias is 18px or above, with no `leading-*` class on that same line) finds **34** sites across 25 files, not ~51. This was presented at Task 3's checkpoint as a fourth named discrepancy and accepted as-is (see `## Checkpoint Resolution (Task 3)` above), following the same pattern 09-01-SUMMARY used for the radius-delta and display-alias-site discrepancies.

**The 6 skipped `cn(...)` sites are not structurally excluded from the card guard's live ceiling today**, even though the checkpoint decision treats them as excluded going forward. See the "Flag for 09-05/09-06" paragraph above for the full detail and the specific 09-06-PLAN.md acceptance criteria that will need reconciling.

## User Setup Required

None - the D-17 precondition (`npm run test:users:create` with `SUPABASE_SERVICE_ROLE_KEY` in the user's own shell) remains outstanding, per Phase 07 OI-6's precedent that the agent never touches that value. The user chose to proceed with the recorded Home-only fallback and end-of-phase UAT rather than the checkpoint's "hold" option; they may still run `test:users:create` in their own shell at any later point before the end-of-phase UAT if they want the full visual comparison instead.

## Next Phase Readiness

Plan 09-02 is complete. Task 3's blocking gate is answered (approve as presented, plus the 6-site exclusion disposition), so 09-03 Task 1 -- the first edit to a file under `app/` or `components/` -- may proceed. Before that plan starts, its executor should read this summary's `## Checkpoint Resolution (Task 3)` section in full (not just the frontmatter `provides`/`key-decisions` bullets) for the complete discrepancy table and both discretion-call confirmations, and should carry forward the 09-05/09-06 guard-closure flag above when those plans are reached.

## Self-Check: PASSED

Both guard test files confirmed present on disk and passing (`npx vitest run` green, 4 tests total across the two new files). The before-capture directory and its `manifest.json` confirmed present with 4 images and 3 skipped entries. `.planning/WINDOWS.md` entry 10 confirmed present (`grep -c '"phase": "09"'` returns 1). Commit hashes `0a739c85` and `bf5ed8c7` confirmed present in `git log --oneline`. The 6 skipped `cn(...)` sites' current match status against the live guard was independently re-verified this session (not merely re-cited from 09-01-SUMMARY.md) before writing the flag above.

---
*Phase: 09-type-and-card-migration*
*Completed: 2026-09-19 (Task 3's blocking checkpoint answered; plan complete)*
