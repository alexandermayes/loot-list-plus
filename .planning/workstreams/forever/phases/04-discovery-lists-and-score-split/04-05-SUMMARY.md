---
phase: 04-discovery-lists-and-score-split
plan: 05
subsystem: domain
tags: [scoring, standing, interest, explain, vitest, golden-fixtures]

requires:
  - phase: 03-discovery-schema-and-need-rows
    provides: "need rows share the 1-50 rank scale, so one interest sentence serves items and needs"
provides:
  - "toScoreResult(total, components) in domain/scoring/engine.ts, the single definition of the split"
  - "ScoreResult.standing and ScoreResult.interest; computeScore returns them with the total expression untouched"
  - "ScoreExplanation.standing and .interest as { value, sentence }, derived from total and components"
  - "explain.ts: formatScoreNumber, standingSentence, interestSentence, and the voice and decimalPlaces options"
affects: [04-12, 04-13, 04-14, 04-19]

actuals:
  tokens: 4800
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Hand-built score results go through toScoreResult so standing and interest cannot drift from computeScore"
    - "Sentence numbers use toFixed to the guild's places and then drop trailing zeros; tiles keep the unrounded value"

key-files:
  created:
    - domain/scoring/__tests__/score-split.test.ts
  modified:
    - domain/types.ts
    - domain/scoring/engine.ts
    - domain/scoring/explain.ts
    - domain/scoring/index.ts
    - app/(app)/master-sheet/components/BossSection.tsx
    - app/components/ScoreComparisonModal.tsx

key-decisions:
  - "Bad luck protection sits before officer bonus in the fixed standing order, because the owner's locked example reads 'bad luck protection 2, officer bonus 2.5' while the UI spec's written part list had them the other way round"
  - "A standing part is listed when its raw component is non-zero, so a bonus that rounds to 0 at the guild's places still reads 'officer bonus 0' rather than vanishing"
  - "explainScore takes Pick<ScoreResult, 'total' | 'components'> and derives the split itself, so ItemCandidateModal's inline call and hand-built results keep compiling and explain the same way"

patterns-established:
  - "The interest sentence uses position 51 minus rank for items and needs alike, with no Discovery-only branch (D-22)"

requirements-completed: []  # DISC-08 stays open: 04-12, 04-13, 04-14 and 04-19 declare it and have no SUMMARY yet

coverage:
  - id: D1
    description: "computeScore returns standing and interest with interest equal to the item rank and standing plus interest equal to total within 1e-9; the total expression is unchanged"
    requirement: DISC-08
    verification:
      - kind: unit
        ref: "domain/scoring/__tests__/score-split.test.ts#computeScore split"
        status: pass
    human_judgment: false
  - id: D2
    description: "Known guild totals did not move: golden seeder suite and engine contracts pass under CI=true, and the Lua fixture exporter output is byte-identical to the pre-change capture (6875 bytes)"
    requirement: DISC-08
    verification:
      - kind: command
        ref: "CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scoring"
        status: pass
      - kind: command
        ref: "cmp 04-05-lua-before.json 04-05-lua-after.json"
        status: pass
    human_judgment: false
  - id: D3
    description: "toScoreResult and a hand-built { total, components } explain with the same standing and interest"
    requirement: DISC-08
    verification:
      - kind: unit
        ref: "domain/scoring/__tests__/score-split.test.ts#explainScore split values"
        status: pass
    human_judgment: false
  - id: D4
    description: "Interest sentence boundaries (rank 50, 46, 1, 0), both voices, fixed standing part order, empty standing, and number formatting including negative zero"
    requirement: DISC-08
    verification:
      - kind: unit
        ref: "domain/scoring/__tests__/score-split.test.ts#interestSentence"
        status: pass
      - kind: unit
        ref: "domain/scoring/__tests__/score-split.test.ts#standingSentence"
        status: pass
      - kind: unit
        ref: "domain/scoring/__tests__/score-split.test.ts#formatScoreNumber"
        status: pass
    human_judgment: false
  - id: D5
    description: "The standing and interest sentences, and the part order, read right to the owner and match the Big Yikes voice"
    verification: []
    human_judgment: true
    rationale: "All copy is DRAFT for the owner's 04-19 sign-off; a test pins the words, not whether they are the right words"

duration: 6min
completed: 2026-11-11
status: complete
---

# Phase 4 Plan 05: Score Split Summary

**Every score now carries standing and interest through one `toScoreResult` helper, with deterministic one-sentence explanations in either voice, and the golden fixtures and Lua bytes prove no total moved**

## Performance

- **Duration:** 6 min
- **Tasks:** 2
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments

- `toScoreResult(total, components)` defines the split once (interest is the item rank, standing is total minus interest); `computeScore` only swaps its final return, so the total expression is byte-for-byte as on main.
- `explainScore` now returns `standing` and `interest` as `{ value, sentence }`, derived from `total` and `components`, with `voice` ('self' default or 'other') and `decimalPlaces` (default 2) options.
- `formatScoreNumber`, `standingSentence` and `interestSentence` are exported; the sentences list only non-zero parts in a fixed order and say 'no bonuses yet' or the no-pick line when empty.
- `BossSection.tsx` and `ScoreComparisonModal.tsx` rebuild their results with `toScoreResult`, the only change in those files.
- The tracer gate held: golden and engine-contract suites pass under `CI=true` (385 tests across 10 files with the new file), and the Lua exporter output is `cmp`-identical to the capture taken before the change.

## Task Commits

1. **Task 1: Tracer, split carried through computeScore and explainScore** - `39b5ce46` (test, RED), `46342f77` (feat, GREEN)
2. **Task 2: Standing and interest sentences** - `4aa803b2` (test, RED), `8e23e8bc` (feat, GREEN)

**Plan metadata:** committed with this SUMMARY (docs).

## Files Created/Modified

- `domain/types.ts` - `standing` and `interest` on ScoreResult; `{ value, sentence }` pairs on ScoreExplanation; ScoreComponents untouched
- `domain/scoring/engine.ts` - `toScoreResult`, used by `computeScore`
- `domain/scoring/explain.ts` - sentence builders, number formatter, voice and decimal places options
- `domain/scoring/index.ts` - re-exports `toScoreResult`
- `domain/scoring/__tests__/score-split.test.ts` - split, adjacency (toBeCloseTo) and sentence tests
- `app/(app)/master-sheet/components/BossSection.tsx`, `app/components/ScoreComparisonModal.tsx` - one-line `toScoreResult` calls

## Decisions Made

- The plan contradicted itself on part order: the locked draft sentence puts bad luck protection before officer bonus, the written order list puts officer bonus first. A single fixed order cannot satisfy both, so the locked example (D-21, the owner's copy) wins and bad luck protection moved to just before officer bonus. The 04-12 to 04-14 tiles and the 04-19 sign-off should use this order.
- Parts are listed on the raw component, not the rounded value, so a tiny bonus shows as 'officer bonus 0' instead of making the sentence disagree with the lines.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Spec conflict] Standing part order**
- **Found during:** Task 2
- **Issue:** The must_have order (officer bonus, trial penalty, bad luck protection) made the locked draft sentence 'Standing 7.5: attendance 3 of 4, bad luck protection 2, officer bonus 2.5.' impossible, and that sentence is also an acceptance criterion.
- **Fix:** Order is attendance, guild rank, role, officer priority, bad luck protection, officer bonus, trial penalty, bank donations. Documented in a comment next to the table.
- **Files modified:** `domain/scoring/explain.ts`, `domain/scoring/__tests__/score-split.test.ts`
- **Commit:** `8e23e8bc`

**Total deviations:** 1 auto-fixed (1 spec conflict). **Impact:** wording order only; no number or total changes. Flag for the owner at 04-19.

## Authentication Gates

None.

## Issues Encountered

None. `npm run lint` reports 0 errors (375 pre-existing warnings, none in the files this plan touched); `npm run typecheck` is clean.

## Known Stubs

None.

## Threat Flags

None. Pure functions and two type-compatible caller updates; no endpoints, schema or I/O. T-04-05-01 and T-04-05-02 mitigations verified: golden, contract and Lua locks pass, and `app/api/loot-history/bulk/route.ts`, `DEFAULT_SETTINGS` and `ScoreComponents` are untouched.

## Next Phase Readiness

- 04-12, 04-13 and 04-14 can read `explanation.standing` and `explanation.interest` and pass `voice: 'other'` on officer surfaces (UI-12).
- Owner item for 04-19: the standing and interest sentences and part order are DRAFT copy. The addon repo's `gen_web_fixtures.mts` may serialise whole ScoreResult objects and gain the two keys (assumption A9); the owner is asked to run it once.
- Shipping: PR 2 (need primitives and score split); no new column is read.

## Self-Check: PASSED

`domain/scoring/__tests__/score-split.test.ts` exists, and commits 39b5ce46, 46342f77, 4aa803b2 and 8e23e8bc are on `work/forever-phase-04`.
