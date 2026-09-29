---
phase: quick-260927-sos
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - data/expansion-phases.ts
  - supabase/migrations/20260927120000_backfill_aq20_raid_tier_phase.sql
  - app/services/__tests__/aq20-phase-backfill-migration.test.ts
  - app/services/__tests__/raid-phase-coverage.test.ts
autonomous: true
requirements:
  - GH-279-R1
  - GH-279-R2
  - GH-279-R3

estimate:
  # estimate-calibration (--ws default): factor 1, applied false, 0 samples,
  # confidence low, so tokens equals raw_tokens.
  tokens: 60000
  raw_tokens: 60000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "A Classic guild seeded after this change gets a raid_tiers row named \"Ruins of Ahn'Qiraj\" with phase 4, is_guild_active false and master_sheet_visible false, exactly like every other tier outside Phase 1 (GH-279-R1). Proven through the real seedExpansionForGuild, not a copy of its lookup."
    - "EXPANSION_PHASES.classic Phase 4 lists exactly [\"Ruins of Ahn'Qiraj\"]; the orphan name \"Ahn'Qiraj\" no longer appears in any phase list (GH-279-R1)."
    - "The new migration is one UPDATE that sets phase = 4 only on raid_tiers named 'Ruins of Ahn''Qiraj' whose expansion is named 'Classic' or 'Classic WoW' and whose phase IS NULL. It writes no other column and no other table, and a second run changes zero rows (GH-279-R2)."
    - "The migration's phase literal is checked against the seeder's own value for Ruins of Ahn'Qiraj, so the SQL and data/expansion-phases.ts cannot drift apart (GH-279-R2)."
    - "Every raid of every supported expansion resolves to a non-null phase through the seeder's own definitions, apart from an explicit commented exception list that is empty today. A stale exception, an orphan phase-list name, an empty phase, or a raid listed in two phases each fail the suite (GH-279-R3)."
    - "OD-01 stays open: no existing guild gets AQ20 switched on by this plan. The PR body and SUMMARY present OD-01's options and consequences for the user to decide."
    - "Full vitest suite, npx tsc --noEmit and eslint on the four touched files pass in the worktree. Branch fix/279-aq20-phase is pushed and a DRAFT PR containing 'Fixes #279' is open against main. Nothing is merged, nothing is pushed to main, and no migration is applied to any database."
  artifacts:
    - path: "data/expansion-phases.ts"
      provides: "Classic Phase 4 raid list naming the catalog's real AQ20 name"
      contains: "Ruins of Ahn'Qiraj"
    - path: "supabase/migrations/20260927120000_backfill_aq20_raid_tier_phase.sql"
      provides: "Idempotent phase backfill for existing AQ20 tiers, with header rationale and commented read-only verification queries"
      contains: "phase IS NULL"
    - path: "app/services/__tests__/aq20-phase-backfill-migration.test.ts"
      provides: "Tracer test: seeder writes phase 4 for AQ20, and the migration's shape and phase literal match the seeder"
    - path: "app/services/__tests__/raid-phase-coverage.test.ts"
      provides: "Catalog-wide phase coverage test with the INTENTIONALLY_UNPHASED_RAIDS exception list"
      contains: "INTENTIONALLY_UNPHASED_RAIDS"
  key_links:
    - from: "app/services/expansionSeeder.ts (getRaidPhase, transformClassicRaids)"
      to: "data/expansion-phases.ts EXPANSION_PHASES"
      via: "exact string match of raid name against phase.raids"
      pattern: "phase.raids.includes\\(raidName\\)"
    - from: "app/services/__tests__/aq20-phase-backfill-migration.test.ts"
      to: "getExpansionDefinition('Classic') raid phase"
      via: "migration SET literal compared to the seeder's value"
      pattern: "getExpansionDefinition"
    - from: "app/api/guilds/[id]/expansions/[expansionId]/phase/route.ts"
      to: "raid_tiers.phase"
      via: "phaseTierIds filter; Phase 4 returned 404 before this fix because no Classic tier had phase 4"
      pattern: "t.phase === phase"
---

<objective>
Fix GH #279. data/expansion-phases.ts lists Classic Phase 4 as the orphan name "Ahn'Qiraj", but the catalog (data/classic-wow-raids.ts) names the raid "Ruins of Ahn'Qiraj". getRaidPhase in app/services/expansionSeeder.ts matches names exactly, so every Classic guild has been seeded with AQ20 at phase NULL since the phase system shipped (commit 5febb4f5, 2026-02-04).

This plan delivers the three requested fixes:
- GH-279-R1: correct the Phase 4 entry to "Ruins of Ahn'Qiraj".
- GH-279-R2: an idempotent migration that sets phase = 4 on existing Classic AQ20 tiers whose phase IS NULL. It leaves every other column alone, including the guild-active and rankings visibility flags.
- GH-279-R3: a test that every raid in every seeded expansion catalog resolves to a phase through the seeder's own lookup, with an explicit, commented exception list. The cross-expansion audit result is recorded below.

Out of scope, and deliberately not done: switching AQ20 on for guilds already past Phase 4. That is open decision OD-01 below, a product decision for the user. No route, UI or seeder logic changes.

Purpose: officers can select Phase 4 again, AQ20 unlocks with it, and this class of silent name mismatch can never ship again unnoticed.
Output: one data fix, one migration, two test files, a pushed branch and a DRAFT PR.
</objective>

<open_decisions>
## OD-01 (OPEN, product decision, NOT implemented by this plan): switch AQ20 on for guilds already at current_phase >= 4?

Facts, verified in origin/main code at plan time:
- Since 2026-02-04 no Classic guild has had a tier at phase 4. The Current-phase picker (app/(app)/expansions/[expansionId]/_client.tsx) only offers phases that have tiers, so it showed 1, 2, 3, 5, 6. PATCH .../phase with phase 4 returns 404 "No tiers found for phase 4". So no Classic guild can be at exactly phase 4 today. Any guild at >= 4 is at 5 or 6 because it jumped from 3 to 5.
- A tier with phase NULL is invisible everywhere phase-keyed. There is no Phase card (and so no per-tier on/off toggle) on the expansion settings page. /api/raid-tiers filters by phase <= current_phase, and SQL drops NULLs. The loot-list bootstrap requires phase != null. So the issue's line "officers have to enable it by hand" understates it: the only per-tier toggle lives on a Phase card, so officers had no in-app way to switch AQ20 on at all. Seeded AQ20 rows have is_guild_active false and master_sheet_visible false unless someone edited them through the API or the database.
- After this plan's migration, a guild at phase 3 that later picks Phase 4 gets AQ20 switched on by the route's existing Step 3 (is_active, is_guild_active and master_sheet_visible all set true). No decision is needed for those guilds.
- Commented verification query 3 in the migration counts the guilds this decision affects, read-only. The user can run it before deciding. The executor must not run it.

Options:
- Option A (what this plan ships; the default until the user decides): leave the flags alone. Consequences: AQ20 appears on the expansion settings page for the first time, as a Phase 4 card that is unlocked (4 <= current_phase) but switched off for the guild and for rankings. Raiders see no change until an officer flips the toggle. Nothing moves for guilds that have left AQ20 behind (for example Naxxramas guilds at phase 6). The risk is that officers who want AQ20 have to notice the new card. Fully reversible, and B or C can be layered on later as a follow-up migration.
- Option B: switch AQ20 on (is_guild_active and master_sheet_visible true) for every Classic expansion at current_phase >= 4. This is what the phase route would have done if Phase 4 had been selectable. Consequences:
  - AQ20 appears in raiders' loot lists immediately as a new Phase 4 list, because loot_submissions are keyed per phase. Every raider starts with nothing submitted for that phase, and officer views that track submissions per phase will show them all as missing.
  - AQ20 rankings become visible to players (master_sheet_visible is the flag officers use to stop raiders gaming priority).
  - Phase 6 guilds that have moved on get content they may not want.
  - Hard to undo cleanly: once raiders submit AQ20 lists, switching it off strands those lists, and a later migration cannot tell rows B changed from rows an officer changed afterwards.
- Option C: switch AQ20 on only where current_phase = 5 (the Ahn'Qiraj phase, where AQ20 is most likely still being run). Leave phase 6 guilds as in A. Consequences: B's effects, limited to AQ-era guilds. It is a heuristic, and it has the same undo problem for the guilds it touches.

If the user picks B or C, implement it as a separate follow-up migration after this one is live. Do NOT add it to this plan's migration.

## OD-02 (merge-time sequencing, non-blocking, recommendation included)
Migrations apply about 12 seconds after merge, but the Vercel deploy takes minutes. With code and migration in one PR, a Classic guild created in that gap is seeded by the old code (AQ20 phase NULL) after the backfill has already run. Options:
- (a) One PR. After the deploy finishes, run commented verification query 2 once (read-only). If it shows an AQ20 row with phase NULL, ship the same UPDATE again as a follow-up migration.
- (b) Split like PR #275 then #282: code first, and the migration only after the deploy is live. Note that CLAUDE.md says migration-only PRs need an --admin merge.

Recommendation: (a). The window is minutes long, and query 2 makes any straggler visible. The orchestrator fixed a single branch and draft PR, so this plan ships (a) and documents the check in the PR body.
</open_decisions>

<audit_findings>
## Cross-expansion phase-name audit (GH-279-R3), run at plan time against origin/main f1c9beee
I compared each catalog's top-level raid names with EXPANSION_PHASES by exact string match (the same comparison getRaidPhase makes). Method: a tsx script over git-show copies of the six data files.

| Expansion (slug) | Catalog raids | Raids with no phase | Orphan names in phase list |
|---|---|---|---|
| Classic (classic) | 7 | Ruins of Ahn'Qiraj | Ahn'Qiraj |
| The Burning Crusade (tbc) | 9 | none | none |
| Wrath of the Lich King (wrath) | 8 | none | none |
| Cataclysm (cata) | 5 | none | none |
| Mists of Pandaria (mop) | 5 | none | none |
| Forever | 0 (no raid data yet) | n/a | n/a (no slug in EXPANSION_NAME_TO_SLUG) |

- The only mismatch is AQ20, #279 itself. There are no intentional exceptions, so the exception list ships empty.
- Six phase lists (wod, legion, bfa, sl, df, tww) have no catalog and no seeder data. They are never seeded and the new test does not check them. Harmless today.
- 'Forever' has no EXPANSION_NAME_TO_SLUG entry. That is harmless while it has zero raids. The new test forces a slug and a phase list the moment Forever raid data lands.
- Code-level only: the audit cannot see production rows. Commented verification query 2 in the migration lists every raid_tiers row with phase NULL across all expansions, which is the data-level version of this audit.
- Historical note, no action: in the 2019 Classic release AQ20 and AQ40 opened together. The app's own scheme splits them into Phases 4 and 5, and this fix keeps that scheme as requested.
</audit_findings>

<execution_context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/workflows/execute-plan.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/CLAUDE.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/STATE.md

WORKTREE (all code work happens here): /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/wt279 (abbreviated WT below), on new branch fix/279-aq20-phase created from origin/main. Every repo-relative path in this plan is relative to WT. The main checkout at /Users/alexander.mayes/Code/personal/loot-list-plus is on docs/273-debug-resolved, based on a local main that has diverged by hundreds of commits and is checked out in another session's worktree. Do NOT read application code from it and do NOT edit or commit code there. Read source from WT (or with `git show origin/main:<path>`). Shell cwd resets between Bash calls, so prefix every command with `cd WT &&` or use `git -C WT`.

Facts verified at plan time against origin/main f1c9beee (no need to re-check):
- data/expansion-phases.ts: `EXPANSION_PHASES.classic` holds six entries shaped as phase, name, raids. The Phase 4 entry's raids array is the single orphan string (double-quoted, because of the apostrophe). The neighbouring Phase 5 entry is "Temple of Ahn'Qiraj". Exports: EXPANSION_PHASES, getExpansionSlug(expansionName) (maps 'Classic' and 'Classic WoW' to 'classic', and 'The Burning Crusade', 'Wrath of the Lich King', 'Cataclysm', 'Mists of Pandaria' to tbc, wrath, cata, mop; no 'Forever' key), getExpansionPhases, getMaxPhase. No test imports this file today.
- app/services/expansionSeeder.ts: private getRaidPhase(slug, raidName) returns the first phase whose raids array includes raidName, otherwise null. transformClassicRaids and the TBC, Wrath, Cata and MoP transforms call it with hard-coded slugs at module load. seedExpansionForGuild inserts each raid tier with phase equal to raid.phase, and with is_guild_active and master_sheet_visible both equal to (phase !== null && phase <= 1). Exports used by the tests: SUPPORTED_EXPANSIONS ('Classic', 'The Burning Crusade', 'Wrath of the Lich King', 'Cataclysm', 'Mists of Pandaria', 'Forever'), getExpansionDefinition(name) returning ExpansionDefinition with displayName and raids[] of name, isActive, phase and bosses, and seedExpansionForGuild(supabase, guildId, expansionName, setAsCurrent, useServiceRole). This plan does not modify the seeder.
- seedExpansionForGuild call sequence on the service-role path (useServiceRole true): expansions select().eq().eq().single() duplicate check (must resolve a not-found error); expansions insert().select().single() (resolve a row with an id); guilds update().eq() awaited (thenable); then per raid: raid_tiers insert(payload).select().single() (resolve a row with an id); loot_items insert(rows).select('id, name, item_slot') awaited (resolve rows carrying id, name and item_slot); for token items, wow_classes select('id, name') awaited (an empty array is fine) and loot_item_classes insert() awaited. A tier insert that resolves data null makes the seeder throw on tier.id, and the outer catch returns an error. That is why the existing createMockSupabase in app/services/__tests__/expansionSeeder.test.ts cannot seed Classic. Use the createSeederFake pattern in app/services/__tests__/classic-loot-backfill-migration.test.ts as the model instead.
- Migration-reading test pattern: classic-loot-backfill-migration.test.ts resolves the file with path.resolve(__dirname, '../../../supabase/migrations/<file>.sql') and fs.
- Schema: raid_tiers has id, expansion_id (FK to expansions), name text NOT NULL, sort_order, is_active, master_sheet_visible, submission_deadline, is_guild_active, phase integer (nullable). There are no triggers on raid_tiers. expansions has id, guild_id, name, current_phase and phase_groups. Seeded Classic expansions are named 'Classic'; 'Classic WoW' is an older name that 20260926233000_add_classic_missing_loot.sql also matches. The Classic join shape to mirror is at lines 172-174 of that file: JOIN expansions e ON e.id = rt.expansion_id ... WHERE e.name IN ('Classic', 'Classic WoW'). SQL escapes the apostrophe by doubling it.
- Latest migration on origin/main is 20260926233000_add_classic_missing_loot.sql. Rules (supabase/migrations/README.md): one file per change named <UTC timestamp>_<description>.sql, forward-only, and RLS stays on (this migration adds no DDL).
- Only seedExpansionForGuild and PATCH /api/guilds/[id]/expansions/[expansionId]/phase write raid_tiers phase or visibility flags. PATCH Step 3 sets is_active, is_guild_active and master_sheet_visible true for tiers in the chosen phase. It is unchanged by this plan.
- Test runner: vitest 4 (globals, jsdom, alias '@' maps to the repo root). Scripts: `npm test` (vitest run), `npm run typecheck` (tsc --noEmit), `npm run lint` (eslint).
- No package install, no env var, no external service. No user-facing copy changes (the phase label "Phase 4" is unchanged, and tier names come from the database).

<interfaces>
New test-only constant in app/services/__tests__/raid-phase-coverage.test.ts:
- INTENTIONALLY_UNPHASED_RAIDS: Record<string, readonly string[]>. Keys are SUPPORTED_EXPANSIONS names; values are catalog raid names that are meant to seed with phase null. Empty object today.
New migration: supabase/migrations/20260927120000_backfill_aq20_raid_tier_phase.sql (bump the timestamp if origin/main gained a later migration by execution time; the test's MIGRATION_FILE constant must use the same name).
</interfaces>
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Tracer, AQ20 Phase 4 end to end (catalog fix, seeder output, existing-row backfill)</name>
  <files>data/expansion-phases.ts, supabase/migrations/20260927120000_backfill_aq20_raid_tier_phase.sql, app/services/__tests__/aq20-phase-backfill-migration.test.ts</files>
  <read_first>WT/data/expansion-phases.ts, WT/app/services/expansionSeeder.ts (lines 55-90 and 440-470), WT/app/services/__tests__/classic-loot-backfill-migration.test.ts (lines 1-130, for the fake and file-reading pattern), WT/supabase/migrations/20260926233000_add_classic_missing_loot.sql (header style, lines 1-60, and the join at lines 168-176)</read_first>
  <behavior>
    - Seeding 'Classic' through the real seedExpansionForGuild with a recording fake produces exactly 7 raid_tiers insert payloads. The one named "Ruins of Ahn'Qiraj" has phase 4, is_guild_active false and master_sheet_visible false. All 7 payloads have a non-null phase.
    - The migration file exists, and after comments are stripped it is exactly one UPDATE statement on raid_tiers.
    - Its SET clause assigns only phase, to an integer literal equal to the seeder's phase for "Ruins of Ahn'Qiraj" (read from getExpansionDefinition('Classic')), which is 4.
    - Its WHERE clause requires the tier's phase IS NULL, the tier name 'Ruins of Ahn''Qiraj', and an expansion name in ('Classic', 'Classic WoW') joined through expansion_id.
    - Its executable SQL names none of is_guild_active, master_sheet_visible, is_active, current_phase, sort_order or submission_deadline, and contains no INSERT, DELETE, ALTER, DROP, CREATE or TRUNCATE keyword.
  </behavior>
  <action>
Step 0, worktree setup (once, before anything else):
- Run `git -C /Users/alexander.mayes/Code/personal/loot-list-plus fetch origin main`.
- Run `git -C /Users/alexander.mayes/Code/personal/loot-list-plus worktree add -b fix/279-aq20-phase WT origin/main`, with WT as the absolute scratchpad path from the context block. If the branch or directory already exists, STOP and report. Do not reset, delete or reuse it.
- Symlink the dependencies: `ln -s /Users/alexander.mayes/Code/personal/loot-list-plus/node_modules WT/node_modules`.
- Confirm the latest migration with `git -C WT ls-tree --name-only HEAD supabase/migrations/`. If anything sorts after 20260926233000_add_classic_missing_loot.sql, choose a later UTC timestamp and use that file name everywhere this plan says 20260927120000_backfill_aq20_raid_tier_phase.sql.
- Record a baseline with `cd WT && npx vitest run 2>&1 | tail -30`. Note any failing test names in the SUMMARY so Task 3 can tell pre-existing failures from new ones. If vitest cannot start because the symlinked node_modules does not match origin/main's package-lock.json, STOP and report. Do not run npm install inside the main checkout.

RED: create app/services/__tests__/aq20-phase-backfill-migration.test.ts with a header comment explaining GH-279. Give it two describe blocks.
- Seeder block. Build a small recording fake modelled on createSeederFake from classic-loot-backfill-migration.test.ts, following the call sequence in the context block:
  - every builder method returns the builder;
  - expansions single() resolves a not-found error until insert has been called on that builder, then resolves a row with id 'expansion-classic';
  - raid_tiers insert records its payload, and single() resolves a row with a fresh id;
  - loot_items insert resolves (through then) its rows with fresh ids plus name and item_slot;
  - wow_classes resolves an empty array; every other awaited chain resolves data null and error null.
  Call seedExpansionForGuild(fake, 'guild-279', 'Classic', true, true). Assert the result has no error, there are 7 recorded raid_tiers payloads, the "Ruins of Ahn'Qiraj" payload matches phase 4 with is_guild_active false and master_sheet_visible false, and no payload has a null phase.
- Migration block:
  - Read the file with the same fs and path pattern (MIGRATION_FILE constant).
  - Strip every line whose trimmed text starts with two hyphens, then drop anything from two hyphens to end of line. No string literal in this SQL contains two hyphens.
  - Collapse whitespace and trim.
  - Split on semicolons and keep non-empty chunks. Assert exactly one chunk, beginning case-insensitively with UPDATE, then an optional public. prefix, then raid_tiers.
  - Extract the SET clause (text between SET and the next FROM or WHERE). Assert it is a single assignment of phase to an integer literal, and that the literal equals getExpansionDefinition('Classic') raid "Ruins of Ahn'Qiraj" .phase. Also assert that value is 4.
  - Assert the WHERE text contains a phase IS NULL condition, the SQL-escaped name 'Ruins of Ahn''Qiraj', and both 'Classic' and 'Classic WoW'.
  - Assert the executable SQL names none of the six untouched columns and none of the six forbidden keywords listed in the behavior block. Use word-boundary, case-insensitive regexes.
  The header comment of the SQL file will mention some of those column names. That is expected and fine, because the test checks only comment-stripped SQL.
Run the file and confirm it fails: the seeder writes phase null for AQ20, and the migration file does not exist yet.

GREEN, per GH-279-R1: in data/expansion-phases.ts, replace the Phase 4 raids entry of the classic list with "Ruins of Ahn'Qiraj", using a double-quoted string like its neighbours. Above EXPANSION_PHASES, add one short comment: raid names must match the catalog's raid name exactly (getRaidPhase does an exact includes); app/services/__tests__/raid-phase-coverage.test.ts enforces this; GH #279. Change nothing else in the file.

GREEN, per GH-279-R2: create the migration file.
Start with a header comment block (plain hyphens and commas, no em dashes) that says:
- (1) The cause: the phase list named the raid "Ahn'Qiraj" while data/classic-wow-raids.ts names it "Ruins of Ahn'Qiraj", so since the phase system shipped on 2026-02-04 every Classic guild's AQ20 tier was seeded with phase NULL.
- (2) Why that matters: a NULL-phase tier has no Phase card or toggle on the expansion settings page, and the raid-tiers and loot-list routes filter it out. PATCH phase 4 returned 404 because no Classic tier had phase 4.
- (3) What this migration does: it sets phase to 4 and nothing else. The companion code change makes new guilds seed it that way.
- (4) What it deliberately leaves alone: the guild-active flag, the rankings-visibility flag, the is_active current marker and expansions.current_phase. Whether guilds already past Phase 4 should get AQ20 switched on is open product decision OD-01, recorded in quick task 260927-sos and the PR. If it is decided, it ships as a separate follow-up migration.
- (5) Idempotency: the phase IS NULL guard means a second run matches nothing, and any tier that already has a phase (for example one set by hand) is never overwritten.
- (6) Why 'Classic WoW' is matched too: the same reasoning and join shape as 20260926233000_add_classic_missing_loot.sql.
- (7) The deploy window from OD-02: a guild created between this migration applying and the Vercel deploy finishing is seeded by the old code, and verification query 2 finds it.
Then write the single statement: an UPDATE of public.raid_tiers aliased rt, SET phase = 4, FROM public.expansions aliased e, WHERE e.id = rt.expansion_id AND e.name IN ('Classic', 'Classic WoW') AND rt.name = 'Ruins of Ahn''Qiraj' AND rt.phase IS NULL, terminated by one semicolon.
After it, add three commented-out, read-only verification queries, each with one line saying what a healthy result looks like:
- query 1: Classic AQ20 tiers grouped by phase (after deploy, expect every row at 4);
- query 2: every raid_tiers row with phase NULL in any expansion, grouped by expansion name and tier name (expect no rows);
- query 3: the OD-01 population, meaning Classic expansions with current_phase >= 4, how many of their AQ20 tiers are switched off for the guild, grouped by current_phase.
Do not run any of these queries, the migration, supabase db push, scripts/run-sql.ts or psql against any database.

Run the test file until it is green. Commit only the three files in WT, with the message "fix(279): seed Ruins of Ahn'Qiraj into Classic Phase 4 and backfill existing tiers" and a body of 2-4 lines, ending with the exact trailer line from the orchestrator brief: Co-Authored-By, then Claude Opus 5.5, then noreply@anthropic.com wrapped in angle brackets (write real angle brackets in the commit, not HTML entities)
  </action>
  <verify>
    <automated>cd /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/wt279 && npx vitest run app/services/__tests__/aq20-phase-backfill-migration.test.ts</automated>
  </verify>
  <done>The worktree exists on fix/279-aq20-phase from origin/main, with node_modules symlinked. The new test file failed before the fix and passes after it. data/expansion-phases.ts differs from origin/main only in the Phase 4 raid name and the one comment (`git -C WT diff origin/main -- data/expansion-phases.ts` shows exactly that). The migration is one comment-documented UPDATE with three commented verification queries. One commit on fix/279-aq20-phase carries the Co-Authored-By trailer. Baseline vitest failures, if any, are recorded.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Catalog-wide phase coverage test with an explicit exception list</name>
  <files>app/services/__tests__/raid-phase-coverage.test.ts</files>
  <read_first>WT/data/expansion-phases.ts (after Task 1), WT/app/services/expansionSeeder.ts lines 170-250 (EXPANSION_DATA, getExpansionDefinition) and 250-260 (SUPPORTED_EXPANSIONS)</read_first>
  <behavior>
    - For every name in SUPPORTED_EXPANSIONS, every raid in getExpansionDefinition(name).raids has a phase that is a positive integer, unless the raid is listed under that name in INTENTIONALLY_UNPHASED_RAIDS. On failure the message names the expansion and the raid.
    - Exception hygiene: every INTENTIONALLY_UNPHASED_RAIDS key is in SUPPORTED_EXPANSIONS, and every listed raid exists in that catalog and really resolves to phase null. A stale exception fails.
    - For every supported expansion with at least one raid, getExpansionSlug(definition.displayName) is non-null and EXPANSION_PHASES has that slug.
    - For those expansions, every raid name in every phase entry exists in the catalog (no orphans). The old "Ahn'Qiraj" entry would fail here.
    - Every phase entry names at least one catalog raid. An empty phase is never offered by the picker, and PATCH returns 404 for it.
    - No raid name appears in two phase entries of the same expansion. getRaidPhase silently takes the first match.
  </behavior>
  <action>
Per GH-279-R3, create app/services/__tests__/raid-phase-coverage.test.ts. Import SUPPORTED_EXPANSIONS and getExpansionDefinition from '../expansionSeeder', and EXPANSION_PHASES and getExpansionSlug from '@/data/expansion-phases'.

Assert on getExpansionDefinition(name).raids[].phase. That value is produced by the seeder's own getRaidPhase call inside its transform functions, and seedExpansionForGuild writes it verbatim into raid_tiers (Task 1 proved this end to end). So this is the same lookup the seeder uses, and the seeder does not need a new export.

Declare INTENTIONALLY_UNPHASED_RAIDS as an empty Record<string, readonly string[]>, under a comment block that says:
- (a) a raid listed here seeds with phase NULL, which hides it from the phase picker, the Phase cards and their on/off toggles, the raid-tiers route and the loot list, so only list a raid that really must be hidden;
- (b) each entry needs a trailing comment with the reason and an issue link;
- (c) the audit on 2026-09-27 across Classic, TBC, Wrath, Cata and MoP found one mismatch, AQ20 (GH #279), fixed in data/expansion-phases.ts, and no intentional exceptions;
- (d) retail phase lists (wod, legion, bfa, sl, df, tww) have no seeder data and are out of scope, and an expansion with zero raids (Forever today) is skipped until its raids land, at which point the slug and phase checks apply automatically.

Write the six behaviors as separate it blocks, looping over SUPPORTED_EXPANSIONS. Use expect with a custom message (the second argument to expect) or it.each, so a failure names the expansion and raid.

Mutation check (not committed):
- in WT, temporarily change the Classic Phase 4 raid name in data/expansion-phases.ts back to the orphan value;
- run this test file and confirm it fails in both the no-phase check (naming Ruins of Ahn'Qiraj) and the orphan check;
- restore with `git -C WT checkout -- data/expansion-phases.ts` and confirm `git -C WT status --porcelain` lists only the new test file.

Commit the test file with the message "test(279): require every seeded raid to resolve to a phase" and the same Co-Authored-By trailer as Task 1.
  </action>
  <verify>
    <automated>cd /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/wt279 && npx vitest run app/services/__tests__/raid-phase-coverage.test.ts && git status --porcelain data/</automated>
  </verify>
  <done>The coverage test passes on the fixed data. The mutation check showed it failing on the reverted name (the SUMMARY records which it blocks failed). data/ is clean after the restore. A second commit carries the trailer. INTENTIONALLY_UNPHASED_RAIDS is empty with its explanatory comment.</done>
</task>

<task type="auto">
  <name>Task 3: Full verification in the worktree, push the fix branch, open a DRAFT PR</name>
  <files>(no repo files; PR body written to the scratchpad)</files>
  <read_first>This plan's open_decisions and audit_findings blocks (they supply the PR body content)</read_first>
  <action>
All commands run in WT.

1. Run the full suite with `npx vitest run`. Every failure must appear in Task 1's baseline list. A new failure is a blocker: fix it (under 3 attempts) or STOP and report.
2. Run `npx tsc --noEmit`.
3. Run `npx eslint data/expansion-phases.ts app/services/__tests__/aq20-phase-backfill-migration.test.ts app/services/__tests__/raid-phase-coverage.test.ts`. eslint does not lint .sql files, so leave the migration out of this command.
4. Do NOT apply the migration anywhere: no supabase db push, no scripts/run-sql.ts, no psql, and no Supabase Management API call.
5. Push only the fix branch: `git -C WT push -u origin fix/279-aq20-phase`. Never push to main, never merge, never pass --admin.
6. Write the PR body to /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/pr279-body.md. Keep it concise, in plain voice, with no em dashes. Sections:
   - Summary: the Phase 4 name mismatch and its effect. Include that Phase 4 could not be selected at all and that AQ20 had no toggle.
   - "Fixes #279" on its own line.
   - What changed: the data fix, the migration (phase only, idempotent) and the two tests.
   - Not in this PR, decision needed (OD-01): the three options with their consequences, condensed from this plan, and a pointer to verification query 3 for sizing.
   - Deploy note (OD-02): recommendation (a) and the one-time check with verification query 2 after the deploy finishes.
   - Audit: no other phase-name mismatches across Classic, TBC, Wrath, Cata and MoP; note the Forever slug.
   - Verification: the commands run and their results.
   - The final line exactly: 🤖 Generated with [Claude Code](https://claude.com/claude-code)
   Check for em dashes with `perl -CSD -ne '$n++ if /\x{2014}/; END { exit($n ? 1 : 0) }' <body file>`. It must exit 0.
7. Open the PR: `gh pr create --draft --base main --head fix/279-aq20-phase --title "fix: seed Ruins of Ahn'Qiraj into Classic Phase 4 (#279)" --body-file <body file>`, run from WT.
8. Record the PR URL in the SUMMARY.
  </action>
  <verify>
    <automated>cd /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/wt279 && npx tsc --noEmit && npx eslint data/expansion-phases.ts app/services/__tests__/aq20-phase-backfill-migration.test.ts app/services/__tests__/raid-phase-coverage.test.ts && gh pr view fix/279-aq20-phase --json isDraft,baseRefName,headRefName,body --jq '[.isDraft, .baseRefName, .headRefName, (.body | contains("Fixes #279"))]'</automated>
  </verify>
  <done>Full vitest shows no failures beyond the recorded baseline; tsc and eslint are clean. origin/fix/279-aq20-phase exists. The draft PR against main contains "Fixes #279", presents OD-01 and OD-02, has no em dashes, and ends with the Claude Code line; gh prints [true, "main", "fix/279-aq20-phase", true]. origin/main is unchanged by this task, and no database was touched.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| repo to production database | Merging to main auto-applies migrations to the production Supabase database about 12 seconds later (all guilds' raid_tiers) |
| officer settings to raider views | raid_tiers visibility flags decide what raiders see and whether priority rankings are exposed |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-279-01 | Tampering | migration UPDATE scope | medium | mitigate | The statement joins expansions and requires e.name IN ('Classic', 'Classic WoW'), exact tier name 'Ruins of Ahn''Qiraj', and rt.phase IS NULL, so no non-Classic tier and no already-phased tier can change. Task 1's test asserts all three conditions on comment-stripped SQL |
| T-279-02 | Information disclosure | raid_tiers master_sheet_visible / is_guild_active | medium | mitigate | The migration writes phase only. Task 1's test fails if the executable SQL names any visibility or state column, so hidden rankings cannot be exposed without the OD-01 decision |
| T-279-03 | Tampering | executor actions against production | high | mitigate | The plan forbids db push, run-sql, psql, Management API calls, merging, --admin and pushing to main. Only the fix branch is pushed, and the PR is a draft |
| T-279-04 | Tampering (data integrity) | deploy window between migration apply and Vercel deploy | low | accept | A guild seeded in the minutes-long gap keeps AQ20 at phase NULL. Verification query 2 detects it after deploy, and the same idempotent UPDATE fixes it (OD-02) |
| T-279-05 | Repudiation | migration provenance | low | mitigate | The header comment documents the cause, scope, exclusions, OD-01 and the verification queries. Commits carry the Co-Authored-By trailer |

No package installs: the supply-chain legitimacy gate does not apply.
</threat_model>

<verification>
- In WT: `npx vitest run` (full suite, no new failures against the Task 1 baseline), `npx tsc --noEmit`, and eslint on the three TypeScript files touched.
- `git -C WT log origin/main..fix/279-aq20-phase --oneline` shows the two task commits, both with the Co-Authored-By trailer.
- `git -C WT diff --stat origin/main..fix/279-aq20-phase` lists exactly the four files in files_modified.
- The draft PR is open against main with "Fixes #279" in the body; nothing is merged and no database is touched.
</verification>

<success_criteria>
- GH-279-R1: the Classic Phase 4 entry names "Ruins of Ahn'Qiraj", and a new Classic guild seeds AQ20 at phase 4 (proven through seedExpansionForGuild).
- GH-279-R2: the idempotent, phase-only backfill migration exists with a timestamp after 20260926233000, and its phase literal is test-locked to the seeder's value.
- GH-279-R3: the catalog-wide coverage test with the empty, commented INTENTIONALLY_UNPHASED_RAIDS list passes, and a mutation check confirms it catches the #279 mismatch. The audit finding (no other mismatches) is recorded.
- OD-01 is presented, not implemented. OD-02 is documented with its post-deploy check.
</success_criteria>

<output>
Create `/Users/alexander.mayes/Code/personal/loot-list-plus/.planning/workstreams/default/quick/260927-sos-fix-gh-279-aq20-phase-name-so-ruins-of-a/260927-sos-SUMMARY.md` when done. The planning directory lives in the main checkout, not in the worktree; do not commit it from the worktree. Include the PR URL, the baseline test result, the mutation-check result, the final migration file name, and OD-01 restated as still open.
</output>
