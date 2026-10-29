---
phase: 03-discovery-schema-and-need-pipeline
plan: 04
subsystem: domain
tags: [typescript, vitest, receive-skip, copy-cap, bracket-rules, discovery, need-rows]

requires:
  - phase: 03-discovery-schema-and-need-pipeline
    provides: plan 03-01 migration (kind column on loot_items), plan 03-03 need taxonomy
provides:
  - itemIdentityKey, isNeedRow, wowheadIdForDisplay, keepRankedNeedRows and NEED_ROW_FIXED_ERROR in domain/loot/item-identity.ts
  - Need-aware applyGlobalReceiveSkip (one need award skips exactly the winner's entry for that need)
  - maxCopiesForNeed and NEED_PAIRED_SLOTS, with the need branch in maxCopiesForItem and a kind field on CopyLimitItem
  - Bracket-rule exemption for need rows in validateBracketRules, canPlaceInBracket, placeInBracket and findNextNoBracketSlot
affects: [03-05, 03-07, 03-09, 03-10, 03-11, 03-12, phase-04]

actuals:
  tokens: 5000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Need-row branches live in small pure helpers (isNeedRow, itemIdentityKey) so readers change by one call, never an if (discovery) inside a component"
    - "Item rows are provably unchanged: no existing test line is removed (numstat 0 deletions on all four existing test files)"

key-files:
  created:
    - domain/loot/item-identity.ts
    - domain/loot/__tests__/item-identity.test.ts
  modified:
    - domain/loot/apply-receive-skip.ts
    - domain/loot/__tests__/apply-receive-skip.test.ts
    - domain/loot/slot-capacity.ts
    - domain/loot/__tests__/slot-capacity.test.ts
    - domain/loot/item-copies.ts
    - domain/loot/__tests__/item-copies.test.ts
    - domain/loot/bracket-validation.ts
    - domain/loot/__tests__/bracket-validation.test.ts

key-decisions:
  - "A need row is keyed by 'need:' plus its row id and an item by String(wowhead_id) as before; a need with no id or an item with no wowhead_id has no identity and is never skipped, never defaulted to 0 or ''"
  - "ReceiveSkipItemRankings.item gains an optional id (not required) because existing tests and item-only callers build items without one and the plan forbids editing existing test lines"
  - "Bracket rules exclude kind 'need' entirely (owner-visible departure from D-08, see below)"
  - "The Reserved companion checks ignore a resolved need occupant on either slot, so the placer agrees with the validator"

patterns-established:
  - "Exemptions key on kind read from the database, never on classification or cost, so a need cannot leak into item behaviour"

requirements-completed: [DISC-06]

coverage:
  - id: D1
    description: "A need award skips exactly the winner's entry for that need; two needs of one raider and the same need in two tiers never share a key"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "domain/loot/__tests__/item-identity.test.ts#DISC-06 adjacency"
        status: pass
      - kind: unit
        ref: "domain/loot/__tests__/apply-receive-skip.test.ts#applyGlobalReceiveSkip with need rows"
        status: pass
    human_judgment: false
  - id: D2
    description: "Need rows cap at two copies for Finger and Trinket and one for every other slot; item caps are unchanged"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "domain/loot/__tests__/slot-capacity.test.ts#maxCopiesForNeed"
        status: pass
      - kind: unit
        ref: "domain/loot/__tests__/item-copies.test.ts#need rows"
        status: pass
    human_judgment: false
  - id: D3
    description: "A list holding a Big and a Standard need in one bracket reports no violation while the same costs on item rows still report allocation_limit"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "domain/loot/__tests__/bracket-validation.test.ts#need rows (kind need)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Known guild behaviour is unchanged (golden seeder and scoring suites, all existing domain/loot tests)"
    requirement: DISC-06
    verification:
      - kind: unit
        ref: "CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scoring"
        status: pass
    human_judgment: false

duration: 8 min
completed: 2026-10-20
status: complete
---

# Phase 3 Plan 04: Shared Need-Row Branches Summary

**Pure need-row helpers for receive-skip identity keys (need row id vs wowhead id), per-need copy caps (two rings or trinkets, one of anything else) and a bracket-rule exemption, with every item-row result unchanged.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-10-20T20:35Z
- **Completed:** 2026-10-20T20:43Z
- **Tasks:** 3 (1 tracer, 2 auto, all TDD)
- **Files:** 10 (2 created, 8 modified)

## Accomplishments

- `domain/loot/item-identity.ts` gives every reader one place to branch on need rows. `itemIdentityKey` returns `need:<id>` for a need and `String(wowhead_id)` for an item, so existing receive-skip key strings are byte-identical, and an identity-less row returns null and is never skipped (research Pitfall 6).
- `applyGlobalReceiveSkip` now keys entries with `itemIdentityKey`; the parameter is renamed `receivedByCharAndIdentity`. A need award removes only the winner's best-ranked entry for that need and leaves their other needs and other raiders alone.
- `maxCopiesForNeed` (2 for Finger and Trinket, else 1) and the need branch at the top of `maxCopiesForItem`; `CopyLimitItem` carries `kind` through `copyGroupRule`, so the submit route and the loot list read the same cap.
- Need rows are outside the bracket rules, so need costs of 3, 2 and 1 never raise `allocation_limit`.
- Tracer gate: the tracer verify (`item-identity` and `apply-receive-skip` tests plus typecheck) passed on commit and again in the final domain/loot run before expansion tasks. Auto mode is off, so the interactive human-verify stop was deferred under `human_verify_mode: end-of-phase`.

## Task Commits

1. **Task 1 (tracer): need-row identity key for receive skips** - `d68a862b` (feat)
2. **Task 2: per-need copy cap for need rows** - `ad2ae52e` (feat)
3. **Task 3: bracket rules leave need rows out** - `ea85edcb` (feat)

## For the owner: bracket-rule exemption departs from D-08

This is a deliberate departure from D-08's "no Discovery special case" rationale. D-08 mirrors classification (Big Reserved, Medium Limited, Standard Unlimited) so readers that key on classification need no Discovery branch. That mirror cannot cover the bracket functions, because they also sum `allocation_cost` per bracket against a limit of 3, and need costs are 3, 2 and 1 (D-06). A Big need plus any other need in one bracket raises `allocation_limit` whatever the classification says (RESEARCH Pitfall 2).

- **Functions touched:** `validateBracketRules` (drops `kind` 'need' entries before grouping), `canPlaceInBracket` (returns true for a need and ignores a need occupant in the Reserved companion checks), `placeInBracket` (records the placement but adds no points, type or slot counts) and `findNextNoBracketSlot` (a need is never treated as Reserved and a need occupant never blocks slot 2).
- **What governs need costs instead:** Phase 4's 10-point budget check (DISC-03) replaces the exemption in one pure module. Until then nothing server-side limits the summed cost of a need list.
- **Scope of the exemption:** it keys only on `kind === 'need'` read from the database, so item rows cannot reach it; existing and new item-row cases still report `allocation_limit` as before.
- **Reversibility:** reversible (plan rating); the Task 3 reversibility note (costly) concerns D-06 costs living in `allocation_cost`, which any reader that sums that column must exclude until Phase 4.

## Decisions Made

- Receive-skip identity is `need:<row id>` for a need and `String(wowhead_id)` for an item; no identity means never skipped.
- `ReceiveSkipItemRankings.item.id` is optional (see deviations).
- The Reserved companion rule ignores a resolved need occupant on slot 2 as well as slot 1, so the placer agrees with `validateBracketRules`, which drops needs entirely.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `id` is optional on `ReceiveSkipItemRankings.item`**
- **Found during:** Task 1
- **Issue:** The plan widens the item type to `{ id: string; wowhead_id: number | null; kind?: string | null }`. The existing test helper builds `{ item: { wowhead_id } }` with no id, and `npm run typecheck` includes test files, so a required `id` fails typecheck. The plan also forbids editing existing test lines.
- **Fix:** `id?: string`. `itemIdentityKey` treats a need row without an id as having no identity (null, never skipped), the safe direction. Real callers always select the row id.
- **Files modified:** `domain/loot/apply-receive-skip.ts`, `domain/loot/item-identity.ts`
- **Verification:** typecheck exits 0; all 30 tests in the two files pass.
- **Commit:** `d68a862b`

**2. [Rule 2 - Missing critical] Reserved companion check also ignores a need on slot 2**
- **Found during:** Task 3
- **Issue:** The plan only exempts a need occupant on slot 1. A Reserved item placed at slot 1 beside a need at slot 2 was still blocked by `placements.has('rank-2')`, while `validateBracketRules` (which drops needs) would accept the same list, so the placer and validator would disagree.
- **Fix:** a small `holdsBracketItem` helper used by `canPlaceInBracket` and `findNextNoBracketSlot`; an id that does not resolve still counts, as before.
- **Files modified:** `domain/loot/bracket-validation.ts`, `domain/loot/__tests__/bracket-validation.test.ts`
- **Verification:** two new tests, including one proving a Reserved item at slot 1 still blocks an item at slot 2.
- **Commit:** `ea85edcb`

**3. [Rule 3 - Blocking] Separate import line in the bracket test file**
- **Found during:** Task 3
- **Issue:** Extending the existing single-line import in `bracket-validation.test.ts` counts as one removed line, failing the numstat acceptance check (0 deletions).
- **Fix:** added a second import line from the same module and left the original untouched.
- **Commit:** `ea85edcb`

**Total deviations:** 3 auto-fixed (2 blocking, 1 missing critical). **Impact:** none on the plan's behaviour list; item rows are unchanged.

## Issues Encountered

None. RED was observed for the apply-receive-skip, slot-capacity, item-copies and bracket-validation additions before the implementation; `item-identity.test.ts` was written alongside its new module.

## Verification Results

- `npx vitest run domain/loot`: 20 files, 293 tests pass.
- `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scoring`: 9 files, 364 tests pass.
- `npm run typecheck`: exit 0. `npm run lint`: 0 errors (375 warnings, unchanged count).
- `git diff --numstat origin/main` on the four existing test files: 0 deletions each (39, 103, 36, 31 additions).
- `grep -c "itemIdentityKey(" domain/loot/apply-receive-skip.ts`: 2. `grep -c "export function maxCopiesForNeed" domain/loot/slot-capacity.ts`: 1. `grep -c "DISC-06 adjacency" domain/loot/__tests__/item-identity.test.ts`: 3.

## Size and effort

- **Size risk (D-28):** the plan sat at the 10-file threshold with a 75k-token, low-confidence estimate and stayed unsplit by owner decision.
- **Actual:** 10 files touched (2 new), 3 commits, 449 lines added and 19 removed, about 5k tokens of realized diff (chars/4), roughly 8 minutes. No task ran long; the estimate was far above the realized diff, so the low-confidence label turned out conservative.

## Known Stubs

None.

## Threat Flags

None. The plan's threats T-03-04-01 to T-03-04-03 are mitigated as planned: need keys use the row id with adjacency tests, the exemption keys only on database `kind`, and no existing test line was removed.

## Next Phase Readiness

Plans that wire readers (03-05, 03-07, 03-09 to 03-12) can call `itemIdentityKey`, `wowheadIdForDisplay`, `keepRankedNeedRows`, `maxCopiesForNeed` and the need-aware bracket functions directly. `lib/addon/member-ranked-items.ts`, `domain/loot/bot-item-priority.ts` and the master sheet's own received-count map still key on wowhead id and stay item-only until their reader plans switch them to `itemIdentityKey`. PR 2 merges only after the owner confirms the frozen need key list (D-25).

## Self-Check: PASSED

- Created files exist: `domain/loot/item-identity.ts`, `domain/loot/__tests__/item-identity.test.ts`.
- Commits found: `d68a862b`, `ad2ae52e`, `ea85edcb`.
