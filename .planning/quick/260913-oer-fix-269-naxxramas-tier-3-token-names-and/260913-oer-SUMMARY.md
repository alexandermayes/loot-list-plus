---
phase: quick-260913-oer
plan: 01
subsystem: database
tags: [wow-classic, loot-items, data-migration, vitest, supabase]

requires: []
provides:
  - Corrected Naxxramas Tier 3 Desecrated token names in data/classic-wow-raids.ts, matching wow-classic-items and Wowhead
  - Corrected TOKEN_CLASS_MAPPING class restrictions for the three Tier 3 armor sets
  - A regression suite (data/__tests__/classic-wow-raids.test.ts) locking all Classic raid item names and Tier 3 token classes
  - A written, unexecuted data migration to repair the 9 already-seeded guild Naxxramas tiers
affects: [naxxramas-loot-seeding, guild-loot-lists, expansionSeeder]

actuals:
  tokens: 5930
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Data-correction-plus-repair-migration: fix the seed source first, lock it with an independently-transcribed regression suite, then repair already-seeded rows with an idempotent, tightly-scoped SQL migration"

key-files:
  created:
    - data/__tests__/classic-wow-raids.test.ts
    - supabase/migrations/20260913000000_fix_naxx_token_names.sql
  modified:
    - data/classic-wow-raids.ts
    - data/token-class-mapping.ts

key-decisions:
  - "Fixed the 24 Desecrated token NAMES to match their existing wowhead_id, never the ids themselves, because loot_history and the addon award path resolve items by wowhead_id -- this keeps all 204 existing loot_history rows correct with no migration needed for them"
  - "Migration re-points loot_submission_items BEFORE renaming loot_items, using the pre-rename stale label as the join key, so the rename step (which erases that label) cannot break the re-point"
  - "Migration deliberately leaves submissions pointing at wowhead_id 22354 unchanged (no re-point target exists) because its old label, Desecrated Mantle, was never a real item -- the row is simply relabeled to its correct name, Desecrated Pauldrons, in place"
  - "Migration was written but NOT executed against any database in this workflow; it deploys through the normal push/merge process"

requirements-completed: [GH-269]

coverage:
  - id: D1
    description: "All 24 Naxxramas Tier 3 token names in data/classic-wow-raids.ts match wow-classic-items/Wowhead for their wowhead_id, and TOKEN_CLASS_MAPPING gives each the correct class list (2 for plate, 4 for mail, 3 for cloth)"
    requirement: "GH-269"
    verification:
      - kind: unit
        ref: "data/__tests__/classic-wow-raids.test.ts (all describe blocks)"
        status: pass
      - kind: other
        ref: "plan's inline tsx verify script (Task 1 automated verify block)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Regression suite fails on drift between Classic raid item names and wow-classic-items, or on any Tier 3 token id/name/class/substring-collision defect"
    requirement: "GH-269"
    verification:
      - kind: unit
        ref: "npx vitest run data (94/94 passed)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Migration statically proven idempotent and scoped (no schema/RLS/privilege statement, only the 5 allowed tables, 24-row mapping, re-point before rename, delete-then-insert class rebuild); NOT executed against any database"
    requirement: "GH-269"
    verification:
      - kind: other
        ref: "plan's Task 3 automated grep-based static verify gates (both blocks)"
        status: pass
    human_judgment: true
    rationale: "The migration's actual effect on the 9 already-seeded guild tiers can only be confirmed after deploy, via the commented-out aggregate verification queries in Step 5 of the migration -- this requires a human (or a follow-up session) to run after the orchestrator's normal push/merge, which is out of scope for this quick task."

duration: ~35min
completed: 2026-09-13
status: complete
---

# Quick Task 260913-oer: Fix #269 Naxxramas Tier 3 Token Names Summary

**Corrected all 24 Naxxramas Tier 3 Desecrated token names and class restrictions to match Wowhead/wow-classic-items, added an independently-transcribed regression suite, and wrote (but did not run) an idempotent migration to repair the 9 already-seeded guild tiers.**

## Performance

- **Duration:** ~35 min
- **Tasks:** 3 completed
- **Files modified/created:** 4 (2 modified, 2 created)

## Accomplishments

- `data/classic-wow-raids.ts`: all 24 Tier 3 token rows now carry the name that matches their wowhead_id, per Wowhead and the wow-classic-items package (20 of 24 were wrong before; 4 were already correct). Also fixed the "Jin'do's Judgment" -> "Jin'do's Judgement" spelling at wowhead_id 19884, required for the Task 2 package-wide name check to pass with no skip list.
- `data/token-class-mapping.ts`: the Classic Tier 3 block now has exactly 24 keys in the three correct class groups -- Warrior/Rogue (8 plate), Paladin/Hunter/Shaman/Druid (8 mail), Priest/Mage/Warlock (8 cloth) -- replacing the previous single-class-per-key scheme. The two keys naming non-existent items ("Desecrated Mantle", "Desecrated Pants") are gone; "Desecrated Shoulderpads" (22368) is now present.
- `data/__tests__/classic-wow-raids.test.ts`: new regression suite, transcribed independently from Wowhead/wow-classic-items (not read back from the source data files), asserting every Classic raid item's id/name against the package, all 24 token id/name/slot rows, all 24 getTokenClasses() results, the exactly-24 group size, and the no-substring-collision invariant on TOKEN_CLASS_MAPPING.
- `supabase/migrations/20260913000000_fix_naxx_token_names.sql`: a new, idempotent, tightly-scoped data migration that repairs the 9 already-seeded guild Naxxramas tiers -- re-points `loot_submission_items` before renaming (preserving each player's actual pick), renames `loot_items` in place (wowhead_id and all officer-tuned fields untouched), and rebuilds `loot_item_classes` via delete-then-insert to match what `expansionSeeder` writes at seed time.

## Task Commits

1. **Task 1: Correct the 24 Tier 3 token names and their class restrictions** - `d074b3f` (fix)
2. **Task 2: Lock Classic raid item names and token class lists with a regression suite** - `f9b6063` (test)
3. **Task 3: Relabel the already-seeded token rows and rebuild their class rows** - `280750b` (fix)

_Note: Task 2 carries `tdd="true"` in the plan, but per the plan's own instruction the executor did not reproduce RED by checking out the pre-fix tree (Task 1 had already landed); instead the table was confirmed transcribed from the plan's authoritative table rather than read back out of the source files. One commit, as specified._

## Files Created/Modified

- `data/classic-wow-raids.ts` - 24 Tier 3 token names corrected to match wowhead_id; one comment block replacing six stale slot-based headers; Jin'do's Judgement spelling fixed
- `data/token-class-mapping.ts` - Classic Tier 3 block rebuilt into 3 class groups of 8 keys each
- `data/__tests__/classic-wow-raids.test.ts` - new regression suite (121 lines)
- `supabase/migrations/20260913000000_fix_naxx_token_names.sql` - new repair migration (159 lines), not executed

## Attribution Trailer

The invoking brief and this quick task's explicit constraints both named `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and instructed ignoring any other attribution string, even though this session's ambient environment guidance separately specified `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. Per the task's own constraints, the Fable 5.1 trailer was used. All three commits carry `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` verbatim.

## Gate Results

**`npx vitest run data` (Task 1/2/3, before and after):**
- Before Task 1: not run in isolation (Task 1 is a data-only fix with no test file yet; the plan's Task 1 verify block is a standalone tsx script, not vitest)
- After Task 2 (new suite added): 2 test files, 94 tests, all passed
- After Task 3 (final check): 2 test files, 94 tests, all passed
- Full repo suite (`npx vitest run`, final check): 58 test files, 1124 tests, all passed

**`npm run typecheck`:** exit 0, all three times it was run (after Task 1, Task 2, Task 3)

**`npm run lint`:** exit 0, 0 errors, 397 pre-existing warnings (react-hooks purity/set-state-in-effect warnings in `utils/analytics/client.ts` and `utils/feature-flags.ts`, unused-vars warnings in `utils/bossImages.ts`, `utils/server-roles.ts`, and a test file -- none in files this plan touched, judged pre-existing per the plan's verification step 3)

**Task 3 migration static checks (both automated blocks in the plan):** both passed -- no forbidden statement (alter/drop table/disable RLS/truncate/grant/revoke/create policy/security definer) in the comment-stripped body; every FROM/JOIN/UPDATE/INTO/USING table reference resolves to the 5-table allowlist (`loot_items`, `loot_item_classes`, `loot_submission_items`, `wow_classes`, `_naxx_t3`); exactly 24 mapping rows; exactly one `ON COMMIT DROP`; `_naxx_t3` referenced >= 5 times; `item_slot = 'Token'` appears >= 4 times; zero long dashes in the migration or the test file; issue `#269` cited in both.

**Migration execution:** the migration was written but deliberately NOT executed against any database. No `supabase db push`, no `scripts/run-sql.ts` invocation, and no Supabase Management API call was made from this workflow. Deployment happens through the orchestrator's normal push, with migrations auto-deploying roughly 12 seconds after merge. Per repo convention, a migration-only PR needs `--admin` merge.

## Deploy Note

When `supabase/migrations/20260913000000_fix_naxx_token_names.sql` deploys, the 9 already-seeded guild Naxxramas tiers keep every `loot_items` row and its `wowhead_id` -- nothing is deleted or re-created, so `loot_history` (204 rows across 2 tiers) and all past awards stay pointing at exactly what was actually given out, untouched by this migration. On the next page load after deploy, officers and raiders on those 9 tiers will see:

- Each Tier 3 token row's name change to match the tooltip and icon it always opened (e.g. the row that used to say "Desecrated Spaulders" while showing the Helmet tooltip now correctly says "Desecrated Helmet").
- Class restrictions rebuilt: each token now allows the correct 2 (plate), 4 (mail), or 3 (cloth) classes instead of the single wrong class it had before, so raiders of the correct class can add Tier 3 tokens to their loot lists again.
- Any raider whose existing loot-list pick pointed at the item labeled "Desecrated Mantle" (wowhead_id 22354) keeps that exact pick -- the row is simply relabeled to its real name, "Desecrated Pauldrons" -- because no real item ever carried the "Desecrated Mantle" name for the migration to re-point that pick onto.
- Officer-tuned `classification` and `allocation_cost` values on all 9 tiers' token rows are untouched by the migration.

## Deliberate Follow-up Left Open

`data/classic-item-roles.ts` still keys the Zul'Gurub two-hand staff by the old spelling "Jin'do's Judgment" (missing the "e"). This is out of scope for GH-269 per the plan -- only `data/classic-wow-raids.ts` (which drives the row label and tooltip) was corrected. `data/item-types.ts` also keeps the old spelling, but only in a trailing comment, keyed by id, so it has no functional effect.

## Post-deploy Human Check (verification step 8)

Not run in this session -- this quick task's scope was the data fix, its regression suite, and the written-but-unexecuted migration. The migration has not yet been merged or deployed, so there is nothing live to check yet. Once the orchestrator merges and the migration auto-deploys, an officer should confirm on an already-seeded Naxxramas tier that each Tier 3 Tokens row's name matches the tooltip it opens, and that a raider of the correct class can add the token to a loot list. Result: **not yet run** (pending deploy). No guild, character, or player identifiers are needed for this check -- a yes/no per the criteria above plus the Step 5 aggregate counts (in-scope name-mismatch count, expected zero; per-token class-row counts, expected 2/4/3) is sufficient.

## Decisions Made

See `key-decisions` in the frontmatter above.

## Deviations from Plan

None - plan executed exactly as written. All three tasks, their verify commands, and their commit subjects matched the plan precisely.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The migration is included in the repo's normal migration directory and will apply automatically on the next `supabase db push` triggered by merge, per repo convention (migration-only PRs use `--admin` merge; auto-deploy is roughly 12 seconds after merge).

## Next Phase Readiness

- The data fix and its regression suite are complete and merged into `main` on this branch; any new guild seeding Naxxramas today already gets the correct names and class restrictions.
- The repair migration is ready to deploy but has not yet been pushed to production. It should be merged (with `--admin` since it is a migration-only change) so the 9 already-seeded guild tiers get repaired, and the post-deploy human check above should be run afterward.
- No blockers for the rest of Phase 05 (Internal Authority & Recrawl) -- this was an independent quick task, not part of that phase's plan sequence.

---
*Quick task: 260913-oer*
*Completed: 2026-09-13*
