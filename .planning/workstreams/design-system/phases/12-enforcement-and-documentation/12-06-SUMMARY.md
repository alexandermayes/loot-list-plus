---
phase: 12-enforcement-and-documentation
plan: 06
subsystem: testing
tags: [impeccable, design-system, colour-guard, vitest, hook-suppression, ratchet]

requires:
  - phase: 12-05
    provides: ENF-02 classification gate answer (13-entry approved list, ordered), red-arm probe baseline (12-HOOK-PROBES-RED.json), source-side census (12-DETECTOR-SOURCE-DS.json)
provides:
  - Committed, canonical .impeccable/config.json (first commit ever) holding exactly the 13 gate-approved ignoreValues entries
  - Green-arm verify-mode proof (12-HOOK-PROBES-GREEN.json) that every sanctioned exception is quiet and both controls still flag
  - purple-gradient-guard.test.ts widened to all of app/ (minus landing/) with a yellow pattern, as a two-sided pinned ratchet
  - Nine new WINDOWS entries (41, 43, 44, 46, 47, 48, 49, 50, 51) routing every unsuppressed finding and both D-08 literals
affects: [12-07, colour-migration, milestone-B, milestone-C]

actuals:
  tokens: 24706
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Two-sided ratchet assertion (toEqual against a pinned per-file ceiling map, not toHaveLength(0) or <=) — fails on a new literal AND on an unrecorded fix"
    - "findings > 0 && freshFindings === 0 as the green-arm per-entry discrimination shape (never findings === 0)"

key-files:
  created: []
  modified:
    - .impeccable/config.json
    - scripts/design-system/enf02-probes.json
    - .planning/workstreams/design-system/phases/12-enforcement-and-documentation/12-HOOK-PROBES-GREEN.json
    - __tests__/purple-gradient-guard.test.ts
    - .planning/WINDOWS.md

key-decisions:
  - "13 approved entries written in gate order; 3 pre-existing entries removed (2 ai-color-palette, 1 side-tab) because the gate found their reasons wrong or their finding still live"
  - "COLOR-07 widened to SCAN_ROOTS=['app'] (landing still filtered by path) with a separate YELLOW_CLASS_PATTERN; both purple and yellow assertions are pinned ceiling maps, never toHaveLength(0)"
  - "Neither D-08 literal (reserve/join:866, OnboardingModal.tsx:299) nor any yellow site migrated this phase — routed via WINDOWS entries 49-51 to milestone C"
  - "The #9940ec entry's green-arm discrimination check result (findings=3/freshFindings=2, not the clean findings>0/freshFindings=0 shape) is left as documented, honest evidence, not forced clean by loosening the entry or editing the harness"

patterns-established:
  - "A ratchet test that pins exact counts, not upper bounds, so both regressions and silent ceiling drift are caught"

requirements-completed: [ENF-02]

coverage:
  - id: D1
    description: ".impeccable/config.json committed for the first time holding exactly the 13 gate-approved ignoreValues entries in canonical form"
    requirement: "ENF-02"
    verification:
      - kind: unit
        ref: "node -e canonical-key-order/no-duplicate/em-dash validation (Task 1 acceptance criteria, re-run at close)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Green-arm verify-mode run against the committed config: every sanctioned exception quiet, both controls (C1 ai-color-palette, C2 design-system-color) still flag"
    requirement: "ENF-02"
    verification:
      - kind: other
        ref: "12-HOOK-PROBES-GREEN.json — mode=verify, startHash===endHash, controlFailures=[], verifyFailures=[]"
        status: pass
    human_judgment: false
  - id: D3
    description: "COLOR-07 widened to all of app/ (minus landing/) with a two-sided pinned ratchet for purple and yellow, observed red first in both directions"
    requirement: "ENF-02"
    verification:
      - kind: unit
        ref: "__tests__/purple-gradient-guard.test.ts (3/3 pass); verbatim red observations recorded below"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every unsuppressed finding and both D-08 literals routed by numbered WINDOWS entries, none migrated"
    requirement: "ENF-02"
    verification:
      - kind: other
        ref: ".planning/WINDOWS.md entries 41, 43, 44, 46, 47, 48, 49, 50, 51"
        status: pass
    human_judgment: false

duration: n/a (recovery continuation; original session stalled at 600s watchdog before Task 3 commit)
completed: 2026-09-23
status: complete
---

# Phase 12 Plan 06: ENF-02 Exception List, Green-Arm Proof, Widened COLOR-07 Ratchet Summary

**Committed the 13-entry ENF-02 exception list through hook-admin for the first time, proved in verify mode that every sanctioned exception is quiet while both controls still flag, and widened the purple/yellow colour guard to all of `app/` as a two-sided ratchet that reaches both literals COLOR-07's original scan missed.**

## Performance

- **Tasks:** 3 (all complete)
- **Commits:** 3 (`df881abd`, `e0d4677b`, `4b2e049a`)
- **Files modified:** 5 (`.impeccable/config.json`, `scripts/design-system/enf02-probes.json`, `12-HOOK-PROBES-GREEN.json`, `__tests__/purple-gradient-guard.test.ts`, `.planning/WINDOWS.md`)

## Accomplishments

### Task 1 — the committed exception list (commit `df881abd`)

`.impeccable/config.json` was reset (`ignoreRules`/`ignoreFiles`/`ignoreValues` all emptied) and rebuilt entry-by-entry through `hook-admin.mjs ignore-value`, in 12-05's gate-approved order. It was staged and committed for the first time — `git ls-files .impeccable` had been empty before this commit.

**Final 13 entries, in commit order:**

| # | Rule | Value | Files | Provenance |
|---|------|-------|-------|------------|
| 1 | `side-tab` | `*` | `app/(app)/raid-tracking/_client.tsx` | KEEP — 2026-09-15 UI audit + 07-05-PLAN.md prohibition |
| 2 | `design-system-color` | `#c79c6e` | `app/reserve/join/[token]/page.tsx` | provisional — D-13 audit item, WOW_CLASSES Warrior |
| 3 | `design-system-color` | `#f58cba` | same | provisional — WOW_CLASSES Paladin |
| 4 | `design-system-color` | `#abd473` | same | provisional — WOW_CLASSES Hunter |
| 5 | `design-system-color` | `#fff569` | same | provisional — WOW_CLASSES Rogue |
| 6 | `design-system-color` | `#c41e3a` | same | provisional — WOW_CLASSES Death Knight |
| 7 | `design-system-color` | `#0070de` | same | provisional — WOW_CLASSES Shaman |
| 8 | `design-system-color` | `#69ccf0` | same | provisional — WOW_CLASSES Mage |
| 9 | `design-system-color` | `#9482c9` | same | provisional — WOW_CLASSES Warlock |
| 10 | `design-system-color` | `#00ff96` | same | provisional — WOW_CLASSES Monk |
| 11 | `design-system-color` | `#ff7d0a` | same | provisional — WOW_CLASSES Druid |
| 12 | `design-system-color` | `#9940ec` | `app/globals.css` | KEEP — 2026-09-15 UI audit, `.text-shimmer-purple` marketing purple |
| 13 | `side-tab` | `*` | `components/ui/__tests__/skeletons.test.tsx` | re-labelled — D-07 re-judgement, false positive on a negative assertion |

10 of the 13 entries (#2–#11) carry `provisional` in their reason: each already exists byte-identical as a `class-*` Tailwind theme token, and WINDOWS entry 48 routes the migration that will delete all 10 once done. No `design-system-font` entry and no skeleton-pulse entry were written — correct per gate items 2.4/2.4-default and D-15 (see "No-entry categories" below).

**3 removals, with D-07 provenance from `12-CONFIG-BEFORE.json`** (the pre-rewrite file, preserved verbatim so the removed entries' `createdAt`/`reason` survive):

| Removed rule/value | File | Original `createdAt` | Why removed |
|---|---|---|---|
| `ai-color-palette` `*` | `app/components/OnboardingModal.tsx` | 2026-09-17T20:39:50.271Z | Gate: the reason (Phase 10 COLOR-05 predicted migration) had already happened by commit `5967189e`; the entry was stale and no longer suppressing anything real |
| `side-tab` `*` | `app/(app)/loot-list/components/LootListContent.tsx` | 2026-09-17T23:38:30.060Z | Gate Decision B: the 2026-09-15 UI audit lists this exact line (599) under its P1 findings, not its legitimate exceptions — the entry's stated reason (Phase 10 COLOR-04 scope) was wrong. Routed at WINDOWS entry 47 |
| `ai-color-palette` `*` | `app/reserve/join/[token]/page.tsx` | 2026-09-17T23:38:30.098Z | Gate Decision A: was actively suppressing a live, unmigrated literal (line 866) at the hook level — a different enforcement layer than the test-suite guard this plan also widens. Removed so the literal is visible again; routed at WINDOWS entry 49 |

**No-entry categories (D-13/D-15) — recorded with green-arm evidence that nothing fires:**

| Category | Probe id | Watched rule | Green-arm findings/freshFindings |
|---|---|---|---|
| item-quality / brand hex source module | `quality-module` | `design-system-color` | 0/0 |
| item-quality / brand hex (Tailwind config) | `quality-config` | `design-system-color` | 0/0 |
| item-quality / brand class usage (3 sites) | `quality-brand-1/2/3` | `design-system-color` | 0/0 each |
| skeleton pulse (`animate-pulse`) | `skeletons` | `pulsing-dot` | 0/0 |
| monospace — invite code display (D-14) | `mono-invite` | `design-system-font` | 0/0 |
| monospace — guild-settings type-to-confirm (D-14) | `mono-guild-confirm` | `design-system-font` | 0/0 |
| monospace — profile type-to-confirm (D-14) | `mono-profile-confirm` | `design-system-font` | 0/0 |
| ScoreComparisonModal big numbers (D-13 item 1) | `score-numbers` | none watched | 0/0 |
| numbered how-it-works steps (D-13 item 2) | `how-it-works` | `numbered-section-labels` | the watched rule never fires; the probe's one finding is an unrelated `design-system-color` hit on `#17151B`, separately routed at WINDOWS entry 43 |

Every category above was checked against the same green-arm transcript used for Task 2's proof (`12-HOOK-PROBES-GREEN.json`), not a separate run.

**WINDOWS routing (9 entries this plan: 41, 43, 44, 46, 47, 48 from Task 1; 49, 50, 51 from Task 3):** 15 unsanctioned `font-mono` sites (41), 49 `design-system-color` census findings across public/shared files split by milestone (43), 3 `design-system-radius` findings including the pre-existing Phase 11 3px scrollbar-thumb radius at `app/globals.css:339` (44), the `#bababa`/`#080808` arbitrary-value marketing literals invisible to the source checker (46), the `LootListContent.tsx` side-tab rail fix (47), the WOW_CLASSES→`class-*` token migration that retires the 10 provisional entries (48), and the three Task 3 D-08 routings (49, 50, 51 — see below).

### Task 2 — green arm in verify mode (commit `e0d4677b`)

`enf02-probes.json` got an `expect` array per probe (absent/present assertions), then `exercise-hook.mjs --mode verify` ran against the committed config with no override. Result, recorded at `12-HOOK-PROBES-GREEN.json`:

- **Exit 0.** `mode: "verify"`, `startHash === endHash` (`6738edff...`), `controlFailures: []`, `verifyFailures: []`, all 19 probes valid.
- **Both controls still flag:**
  - **C1** (`app/reserve/join/[token]/page.tsx`, watch `ai-color-palette`) — Stop-tier finding at L866 fired: `rulesObserved.stop === ["ai-color-palette"]`.
  - **C2** (`app/components/KonamiEasterEgg.tsx`, watch `design-system-color`) — PostToolUse-tier fired 4 times (`#ff8000` x3, `#0070dd` x1): `rulesObserved.postToolUse` has 4 `design-system-color` entries.
- **Per-entry discrimination (proof shape: `findings > 0 && freshFindings === 0` per sanctioned entry, never `findings === 0`):**
  - `side-tab` / raid-tracking rails → probe `rails`: findings 5, freshFindings 0. Clean.
  - `design-system-color` / 10 WOW_CLASSES values → probe `class-colours`: findings 11, freshFindings 0. Clean.
  - `side-tab` / skeletons.test.tsx → probe `existing-skeletons-test`: findings 1, freshFindings 0. Clean.
  - `design-system-color` `#9940ec` / globals.css → probe `marketing-purple`: findings 3, freshFindings 2 — **does not** hit the clean `freshFindings===0` shape, because the same file also carries the unsanctioned `#ff8000` literal (WINDOWS 43) and a `design-system-radius` finding (WINDOWS 44), both of which also trigger on `design-system-color`/`design-system-radius` and the coarse rule-only check can't separate them from the now-filtered `#9940ec` finding. Proven correct by finer-grained evidence instead: rendered finding text drops from 3 issues (L52 `#9940ec`, L80 `#ff8000`, L339 radius) to 2 (L80, L339) once the entry is live, and `findings=3/freshFindings=2` is exactly a delta of one — matching the single value-scoped entry. **Left as documented evidence, not forced clean** — same posture as 12-05's C1 finding (see "Known and expected" below).

### Task 3 — widened COLOR-07 ratchet, red-first, D-08 routing (commit `4b2e049a`)

**Re-measured ratchet** with the guard's own `sourceFiles`/`matchesIn` over the widened scope — identical to the plan's table, no drift:

| Hue | Ceiling total | Per-file |
|---|---|---|
| purple/violet/pink/fuchsia | 1 line, 1 file | `app/reserve/join/[token]/page.tsx` 1 |
| yellow | 19 lines, 7 files | `LootListContent.tsx` 11, `ScoreComparisonModal.tsx` 2, `LootSubmissionsContent.tsx` 2, `OnboardingModal.tsx` 1, `app/compare/page.tsx` 1, `DashboardContent.tsx` 1, `MasterSheetContent.tsx` 1 |

`SCAN_ROOTS` widened from `['app/(app)', 'app/components']` to `['app']` (landing still filtered by path prefix); a `YELLOW_CLASS_PATTERN` was added alongside the existing purple pattern; both assertions changed from `toHaveLength(0)` to `toEqual` against a pinned per-file ceiling map — a two-sided bound that fails when a count rises (a new literal) and when it falls without the ceiling being lowered in the same commit (an unrecorded fix).

**Red observation, Direction A — a count rises:** a temporary `text-yellow-300` line was added to `app/components/KonamiEasterEgg.tsx` (ceiling 0 there). The guard failed, naming the file:

```
AssertionError: ...(report lists all 19 baseline matches, plus)...
app/components/KonamiEasterEgg.tsx:6: const __DEBUG_PERTURBATION_CLASS = "text-yellow-300"
...: expected { …(8) } to deeply equal { …(7) }

- Expected
+ Received

@@ -2,8 +2,9 @@
    "app/(app)/loot-list/components/LootListContent.tsx": 11,
    "app/(app)/loot-submissions/components/LootSubmissionsContent.tsx": 2,
    "app/(app)/master-sheet/components/MasterSheetContent.tsx": 1,
    "app/(app)/overview/components/DashboardContent.tsx": 1,
    "app/compare/page.tsx": 1,
+   "app/components/KonamiEasterEgg.tsx": 1,
    "app/components/OnboardingModal.tsx": 1,
    "app/components/ScoreComparisonModal.tsx": 2,
  }
```

Reverted with `git checkout -- app/components/KonamiEasterEgg.tsx`; `git diff --stat` confirmed empty before proceeding.

**Red observation, Direction B — a count falls without the ceiling being lowered:** the `LootListContent.tsx` yellow ceiling was edited down from 11 to 10 (source untouched). The guard failed, naming the file:

```
AssertionError: ...(report lists all 19 baseline matches, unchanged)...
...: expected { …(7) } to deeply equal { …(7) }

- Expected
+ Received

@@ -1,7 +1,7 @@
  {
-   "app/(app)/loot-list/components/LootListContent.tsx": 10,
+   "app/(app)/loot-list/components/LootListContent.tsx": 11,
    "app/(app)/loot-submissions/components/LootSubmissionsContent.tsx": 2,
    "app/(app)/master-sheet/components/MasterSheetContent.tsx": 1,
    "app/(app)/overview/components/DashboardContent.tsx": 1,
    "app/compare/page.tsx": 1,
    "app/components/OnboardingModal.tsx": 1,
```

Ceiling restored to 11; guard re-run green (3/3) before committing. This proves the bound is two-sided: a fixed site that isn't accompanied by a ceiling-lowering edit fails just as loudly as a regression.

**Both perturbations were working-tree-only** — never committed. `git diff --stat` against `app/components/KonamiEasterEgg.tsx`, `app/reserve`, and `app/components/OnboardingModal.tsx` was empty before Task 3's commit.

**WINDOWS routing (D-08, entries 49–51):** `app/reserve/join/[token]/page.tsx:866` (purple-to-pink avatar gradient, entry 49), `app/components/OnboardingModal.tsx:299` (yellow gradient stop, entry 50), and the remaining 18 yellow lines across 6 files grouped in one entry with per-file ceilings named (entry 51). All three route to milestone C's app-screen colour work; none migrated this phase (gate Section 6: guards widen, fixes route separately).

## Task Commits

1. **Task 1: Write and commit the approved exception list through hook-admin, and route every unsuppressed finding by WINDOWS entry** — `df881abd` (feat)
2. **Task 2: Green arm in verify mode against the committed config, with per-entry discrimination against the red arm** — `e0d4677b` (feat)
3. **Task 3: Widen COLOR-07 to all of app/ and add yellow, as the ratchet the phase gate chose, observed red twice, with the D-08 literals routed** — `4b2e049a` (feat)

## Files Created/Modified

- `.impeccable/config.json` — first-ever commit; 13 gate-approved `ignoreValues` entries, `ignoreRules`/`ignoreFiles` empty
- `scripts/design-system/enf02-probes.json` — `expect` assertions added per probe for the verify-mode run
- `.planning/workstreams/design-system/phases/12-enforcement-and-documentation/12-HOOK-PROBES-GREEN.json` — verify-mode transcript, 19 probes
- `__tests__/purple-gradient-guard.test.ts` — widened to `SCAN_ROOTS=['app']`, added `YELLOW_CLASS_PATTERN`, both assertions converted to pinned per-file ceiling maps
- `.planning/WINDOWS.md` — 9 new phase-12 entries (41, 43, 44, 46, 47, 48, 49, 50, 51)

## Decisions Made

- 13 entries written exactly as 12-05's gate approved, in gate order; 3 pre-existing entries removed with D-07 provenance preserved in `12-CONFIG-BEFORE.json`
- The `#9940ec` entry's green-arm discrimination result (`findings=3/freshFindings=2`, not the clean `freshFindings===0` shape) was documented as evidence rather than forced clean — the coarse rule-only check can't separate three co-located rule hits in one file; finer-grained evidence (rendered-text delta, `findings`/`freshFindings` delta of exactly one) proves the entry still discriminates correctly
- COLOR-07's widened ratchet uses `toEqual` against pinned per-file ceilings (two-sided), not `toHaveLength(0)` or a `<=` bound, per gate item 2.7's default branch
- Neither D-08 literal nor any yellow site was migrated — both routed to milestone C via numbered WINDOWS entries

## Deviations from Plan

### Auto-fixed Issues

**1. [Recovery] Task 3's red-first observation was lost to a stalled session and was redone here**

- **Found during:** Recovery continuation, before committing Task 3
- **Issue:** The previous executor session completed Task 3's code edits (the widened `purple-gradient-guard.test.ts` and the WINDOWS entries) but stalled under a 600-second watchdog immediately before committing and writing SUMMARY.md. Its in-context evidence — specifically the verbatim red-first observations the plan requires before accepting the widened guard as green — was lost with the session; no artifact recorded it.
- **Fix:** Re-ran both directions of the red-first observation from a clean state: (A) added a temporary `text-yellow-300` line to `app/components/KonamiEasterEgg.tsx` (ceiling 0), confirmed the guard failed naming that file, reverted; (B) lowered the `LootListContent.tsx` yellow ceiling by one without touching source, confirmed the guard failed naming that file, restored the ceiling. Both verbatim outputs are recorded above. `git diff --stat` was empty for all perturbed paths before Task 3's commit.
- **Files modified:** none beyond the already-drafted `__tests__/purple-gradient-guard.test.ts` and `.planning/WINDOWS.md` (Task 3's intended files) — the perturbations themselves were never committed.
- **Verification:** `npx vitest run __tests__/purple-gradient-guard.test.ts` green (3/3) after restoration; `git diff --stat` empty for `app/components/KonamiEasterEgg.tsx`, `app/reserve`, `app/components/OnboardingModal.tsx`.
- **Committed in:** `4b2e049a` (Task 3 commit; the perturbations themselves are not part of this or any commit)

---

**Total deviations:** 1 (recovery — a lost-evidence observation redone, not a code change)
**Impact on plan:** No scope creep. Task 3's actual code (the widened guard, the WINDOWS routing) was already correct and untouched from the stalled session; only the missing verification evidence was regenerated.

## Issues Encountered

None beyond the recovery deviation above.

## Known and Expected (not a deviation, not touched)

**Control C1 asymmetry across the two red-arm runs (`12-HOOK-PROBES-RED.json`):** under the `emptyOverride` run, C1 (`app/reserve/join/[token]/page.tsx`, watch `ai-color-palette`) flags on the Stop pass (`rulesObserved.stop === ["ai-color-palette"]`). Under the `currentConfig` run — captured at 12-05 Task 1, before this plan's rewrite — C1 does **not** flag on Stop (`rulesObserved.stop === []`), because that run still had the pre-rewrite `ai-color-palette` entry (removed by this plan, see Task 1 removals table) actively suppressing the exact same finding. This is expected: it is the evidence that the removed entry was genuinely suppressing something real, not a harness bug. 12-05 documented this three independent ways; it was not re-investigated, re-fixed, or worked around here. No harness or verify-script edit was made to force the literal clause true.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- ENF-02 holds as measured behaviour: `.impeccable/config.json` is committed, canonical, and proven in verify mode to suppress only what the gate approved while both controls still flag.
- COLOR-07 now reaches both D-08 literals as a two-sided ratchet; CI stays green (`npm test` 83/83 files, 1396/1396 tests; `npm run lint` 0 errors, 397 pre-existing warnings; `npm run typecheck` clean).
- Every unsuppressed finding, both D-08 literals, and the WOW_CLASSES provisional-entry migration are routed via numbered WINDOWS entries (41, 43, 44, 46, 47, 48, 49, 50, 51) for milestone B/C work — none migrated this phase.
- 12-07 (ENF-04/ENF-05 Blocked records, final local detector run, post-phase evidence capture) is unblocked and not started.

---
*Phase: 12-enforcement-and-documentation*
*Plan: 06*
*Completed: 2026-09-23*

## Self-Check: PASSED

- FOUND: commit `df881abd` (`git log --oneline --all`)
- FOUND: commit `e0d4677b` (`git log --oneline --all`)
- FOUND: commit `4b2e049a` (`git log --oneline --all`)
- FOUND: `.planning/workstreams/design-system/phases/12-enforcement-and-documentation/12-06-SUMMARY.md`
