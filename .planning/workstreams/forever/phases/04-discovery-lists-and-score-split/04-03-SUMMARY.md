---
phase: 04-discovery-lists-and-score-split
plan: 03
subsystem: domain
tags: [pure-functions, vitest, need-picks, budget, eligibility, class-spec]

requires:
  - phase: 03-discovery-schema-and-need-rows
    provides: "NEED_DEFINITIONS and findNeedDefinition, need rows in loot_items, maxCopiesForNeed"
provides:
  - "domain/loot/need-picks.ts: picker position to rank 50..46, stable tier-to-slot order, fan-out into the 'rank-slot' rankings map and read-back, one-line-per-need grouping"
  - "domain/loot/need-budget.ts: the 10-point budget counted once per distinct (rank, need_key) pick, copy caps per need key, the shared over-budget sentence"
  - "domain/loot/need-eligibility.ts: class and spec eligibility matrix, NEED_NOT_ELIGIBLE code and sentence"
  - "domain/loot/__fixtures__/class-specs.json: 23 hand-transcribed (class, spec) pairs"
affects: [04-04, 04-08, 04-09, 04-10, 04-11, 04-20, 04-21, 04-19]

actuals:
  tokens: 13700
  tasks: 3
  commits: 6

tech-stack:
  added: []
  patterns:
    - "Class and spec tables are frozen Maps and Sets, looked up through the table, never by indexing an object with input"
    - "One pure check per rule, called by both the picker and the submit route"

key-files:
  created:
    - domain/loot/need-picks.ts
    - domain/loot/__tests__/need-picks.test.ts
    - domain/loot/need-budget.ts
    - domain/loot/__tests__/need-budget.test.ts
    - domain/loot/need-eligibility.ts
    - domain/loot/__tests__/need-eligibility.test.ts
    - domain/loot/__fixtures__/class-specs.json
  modified: []

key-decisions:
  - "A character whose spec name does not resolve to a specMapping key is treated like a character with no spec (union of the class's spec roles), not refused; an unknown or null class still gets no needs"
  - "PHYSICAL_STAT_BY_CLASS, DUAL_WIELD_CLASSES and RELIC_CLASSES are exported as a frozen ReadonlyMap and ReadonlySets so a prototype name cannot answer from the prototype"
  - "costForSlot reads NEED_DEFINITIONS rather than a second slot-to-tier table, so a repriced slot cannot leave it stale"
  - "needCopyViolation compares resolved canonical keys, so a previous-key alias counts as the same key"

patterns-established:
  - "Budget counts distinct (rank, need_key), not rows and not ranks, so fan-out never triples a cost and stacked keys at one rank never undercount"

requirements-completed: []  # DISC-02, DISC-03, DISC-04, DISC-05 stay open: sibling plans declare them and have no SUMMARY yet (ready-ids returned 0 of 4)

coverage:
  - id: D1
    description: "Picker positions 0 to 4 map to ranks 50 to 46 and back; five picks fan out to 15 'rank-slot' rankings over three stable tier slots and read back to the same five keys"
    requirement: DISC-05
    verification:
      - kind: unit
        ref: "domain/loot/__tests__/need-picks.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "A tier's slot never moves for input order, is_guild_active or a new tier; equal sort_order breaks by id code units; zero or more than eight Discovery tiers return null"
    requirement: DISC-05
    verification:
      - kind: unit
        ref: "domain/loot/__tests__/need-picks.test.ts#assignTierSlots (D-02 amended, DISC-05)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The budget counts each distinct (rank, need_key) pick once: 15 fan-out rows of a 10-point list sum to 10 and five keys stacked at one rank are each counted"
    requirement: DISC-03
    verification:
      - kind: unit
        ref: "domain/loot/__tests__/need-budget.test.ts#needBudgetUsed (D-06, DISC-03)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Copy caps allow a Ring or Trinket key twice and refuse a third, refuse any other key a second time, count the same key only and exclude the position being changed"
    requirement: DISC-03
    verification:
      - kind: unit
        ref: "domain/loot/__tests__/need-budget.test.ts#needCopyViolation (D-29)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Eligibility offers only slots, armour and stat families a class and spec can use; all 23 seeded (class, spec) pairs resolve through specMappingKey and get a non-empty picker; an unknown class and prototype keys get nothing"
    requirement: DISC-04
    verification:
      - kind: unit
        ref: "domain/loot/__tests__/need-eligibility.test.ts"
        status: pass
    human_judgment: false
  - id: D6
    description: "The over-budget sentences and the not-eligible sentence read right to the owner and match the Big Yikes voice"
    verification: []
    human_judgment: true
    rationale: "All copy is DRAFT for the owner's 04-19 sign-off; a test can pin the words but not whether they are the right words"
  - id: D7
    description: "The class tables (dual wield, relic, strength and agility by class) match how the guild's raiders actually play"
    verification: []
    human_judgment: true
    rationale: "Assumptions A1 and A2 are owner decisions made at the 04-02 review; the unit tests pin the tables, not their correctness"

duration: 8min
completed: 2026-11-11
status: complete
---

# Phase 4 Plan 03: Need Picks, Budget and Eligibility Summary

**Pure shared rules for the Discovery picker and submit route: picker position to rank 50..46 with stable tier slots and fan-out, a 10-point budget counted once per distinct (rank, need_key) pick, per-key copy caps, and a class and spec eligibility matrix gated by a 23-pair fixture**

## Performance

- **Duration:** 8 min (Tasks 2 and 3 plus this summary after the Task 1 checkpoint)
- **Started:** 2026-11-11T04:10Z
- **Completed:** 2026-11-11T04:17Z
- **Tasks:** 3
- **Files modified:** 7 (all created)

## Accomplishments

- `need-picks.ts` (Task 1, accepted at the tracer checkpoint): rank mapping, `assignTierSlots` ordered by `sort_order` then id by code unit and blind to `is_guild_active`, `buildNeedRankings` and `readNeedPositions` round trip, `groupNeedRowsByRank` and `describeNeedGroupTiers`. 35 tests.
- `need-budget.ts`: `needBudgetUsed` and `checkNeedBudget` group by `${rank}|${need_key}` and take the largest cost per group, so the server counts a fanned-out pick once and five keys stacked at one rank all count (T-04-03-01). `budgetForPicks`, `wouldGoOver` (excludes the position being changed), `costForSlot`, `needCopyViolation` and `needOverBudgetSentence`. 23 tests.
- `need-eligibility.ts`: `eligibleSlotsFor` from class weapon proficiencies plus the dual wield and relic tables, armour through `canWearArmorType`, stat families through the spec's roles, strength and agility further limited by class. `isNeedEligible` goes through `findNeedDefinition`, never object indexing. 22 tests, plus `class-specs.json` (23 pairs) proving every seeded pair resolves.
- The whole `domain/loot` suite (29 files, 502 tests), `npm run typecheck` and `npm run lint` (0 errors) pass.

## Task Commits

1. **Task 1: Tracer, five picks fan out to 15 rankings** - `28108ee4` (test, RED), `3616da42` (feat, GREEN)
2. **Task 2: Budget, copy caps, over-budget sentence** - `9f592593` (test, RED), `12bb5963` (feat, GREEN)
3. **Task 3: Eligibility and class and spec fixture** - `b869c75a` (test, RED), `1de96d1f` (feat, GREEN)

**Plan metadata:** committed with this SUMMARY (docs).

## Files Created/Modified

- `domain/loot/need-picks.ts` and `__tests__/need-picks.test.ts` - rank, slot, fan-out and grouping rules
- `domain/loot/need-budget.ts` and `__tests__/need-budget.test.ts` - budget, caps and the shared sentence
- `domain/loot/need-eligibility.ts` and `__tests__/need-eligibility.test.ts` - eligibility matrix
- `domain/loot/__fixtures__/class-specs.json` - 23 hand-transcribed (class, spec) pairs

## Decisions Made

- A spec name that does not resolve to a `specMapping` key falls back to the union of the class's roles, the same as no spec. Refusing would leave a raider with a stale or free-text spec an empty picker; the class limits still apply.
- Class tables are frozen Maps and Sets, so `'__proto__'` and `'constructor'` answer nothing (T-04-03-02), tested in all three modules.
- `costForSlot` is derived from `NEED_DEFINITIONS` so there is one price table.

## Deviations from Plan

None. The plan was executed as written.

One variance to note: the plan's `<interfaces>` block does not specify the type of `PHYSICAL_STAT_BY_CLASS`, `DUAL_WIELD_CLASSES` and `RELIC_CLASSES`; they are a ReadonlyMap and ReadonlySets (callers use `.get` and `.has`). Plans 04-04 and 04-08 should call them that way.

## Authentication Gates

None.

## Issues Encountered

- A `Map` literal of `Object.freeze(['strength'] as const)` values did not typecheck (tuple unions); fixed with explicit type arguments before the Task 3 commit.
- The repo has `CLAUDE.md` content only at the user level; `.claude/CLAUDE.md` and `.claude/skills/` do not exist in this checkout, so the conventions came from the plan and the phase CONTEXT.

## Known Stubs

None.

## Threat Flags

None. These are pure modules with no I/O, endpoints or schema.

## Next Phase Readiness

- 04-04 (spec defaults gate) can call `eligibleNeedsFor` and `budgetForPicks`; 04-08 (submit checks) can call `checkNeedBudget`, `needCopyViolation`, `isNeedEligible` and the two refusal sentences; 04-09, 04-11, 04-20 and 04-21 can call `assignTierSlots`, `buildNeedRankings`, `readNeedPositions`, `groupNeedRowsByRank` and `describeNeedGroupTiers`.
- Owner items carried to 04-19: the over-budget sentences and `NEED_NOT_ELIGIBLE_ERROR` are DRAFT copy; assumptions A1 and A2 (dual wield, relic and physical-stat tables) were reviewed at 04-02.
- Shipping: PR 2 (need primitives and score split). No new column is read, so it may open before the 04-02 deploy and merges after the 04-02 D-09 record and the 04-19 copy sign-off.

## Self-Check: PASSED

All seven created files exist, and commits 28108ee4, 3616da42, 9f592593, 12bb5963, b869c75a and 1de96d1f are on `work/forever-phase-04`.
