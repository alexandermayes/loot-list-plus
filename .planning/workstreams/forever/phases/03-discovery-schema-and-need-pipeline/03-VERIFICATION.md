---
phase: 03-discovery-schema-and-need-pipeline
verified: 2026-10-21T22:00:00Z
status: human_needed
score: 4/4 roadmap success criteria verified (0 failed; 5 non-blocking warnings carried)
behavior_unverified: 0
overrides_applied: 0
re_verification: false
gaps: []
deferred:
  - truth: "Raid-tracking event edit re-import keeps need awards (edit pre-fills `[<wowhead id>];<character>` lines, bulk-deletes the event's loot, re-imports; a need award would pre-fill as `[null]`, fail import and stay deleted)"
    addressed_in: "Phase 5 (Drop Desk Core), by 03-11-SUMMARY.md 'Deferred Issues' only"
    evidence: "No need award can be created from a UI in Phase 3 (the D-22 hold keeps need rankings out of real lists; the Drop Desk that writes need awards is Phase 5). NOT yet written into ROADMAP.md Phase 5 goal or criteria, so it must be carried into Phase 5 planning or it will be lost."
coincidental_reliance_items: []
human_verification:
  - test: "Tracer slices deferred by workflow.human_verify_mode = end-of-phase (03-05 NeedLabel/ItemLink, 03-06 addon guild-data/export, 03-10 master sheet, 03-13 seeder): on a throwaway Forever guild whose tier is Discovery, with one need ranked via a superuser/fixture insert, open the master sheet"
    expected: "A 'Needs' group appears after every boss group, the ranked need shows as a NeedLabel (neutral icon, no Wowhead link, no hover tooltip request), unranked needs stay hidden, and an officer click still opens the ranking detail"
    why_human: "Visual look and click behaviour of the NeedLabel on the real master sheet; grep and unit tests cannot judge appearance"
  - test: "Dashboard and raid-tracking rendering of a need award (03-11): award a need row through POST /api/loot-history/bulk on a Discovery tier, then open Overview (recent awards, loot priority) and Raid Tracking (loot entries)"
    expected: "The award shows the need's display name as a NeedLabel, no item=0 / item=null link, nothing crashes; item awards look exactly as before"
    why_human: "Rendering across several screens with real data"
  - test: "Oct 26 owner copy review of the 145 display names and the reason strings (DISCOVERY_FOREVER_ONLY_REASON, KNOWN_SWITCH_BLOCKED_REASON, NEED_ROW_FIXED_ERROR, RESERVES_UNAVAILABLE_ERROR, NEED_RANKING_HOLD_ERROR)"
    expected: "Owner signs off wording; no em dashes"
    why_human: "User-facing copy needs owner sign-off (project constraint)"
  - test: "After PR 4 deploys: `npm run sync:forever` dry run, then `--apply` (owner-run)"
    expected: "Dry run reports, per Forever expansion, the tiers it would switch to Discovery and the need rows it would insert (ids and counts only); --apply performs them; a second run changes nothing"
    why_human: "Needs production credentials and a deployed reader build; cannot run from this environment"
  - test: "Decision on WR-02 (master sheet visibility route, up to 435 need ids in PostgREST GET URLs, unchecked page error) and WR-04 (officer delete of a Discovery tier or expansion cascades through need rankings, awards and BLP)"
    expected: "Owner either schedules the fixes before Phase 4 lifts the hold / Forever guilds go live, or records them as accepted residuals"
    why_human: "Risk acceptance and ordering decision; see Warnings below"
---

# Phase 3: Discovery Schema and Need Pipeline Verification Report

**Phase Goal:** A raid tier can run in Discovery mode, with need rows that flow through every existing reader and earn BLP, while every Known guild stays exactly as it is.
**Verified:** 2026-10-21
**Status:** human_needed (all four roadmap success criteria verified against the code; no blockers; five code-review warnings classified below; deferred human-verify items remain)
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria, the contract)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Discovery migration ships on its own expand-only PR, live in production before any reader code merges; applies cleanly in a PGlite test; every new table passes a raider, officer, non-member and ex-member RLS matrix | VERIFIED | `gh pr view 459`: MERGED 2026-10-21T21:14:10Z, merge commit 1b8c5b0a, exactly 6 files (migration, 3 test/helper files, package.json, package-lock.json). `gh run view 39677113149`: completed/success, headSha 1b8c5b0a. `git show origin/main:...20261020120000_discovery_schema.sql` is byte-identical to the working tree file. `origin/main` holds none of `domain/loot/needs.ts`, `domain/loot/list-mode.ts`, `app/components/NeedLabel.tsx`, and no app/lib/domain file mentioning `list_mode`, so no reader code is on main (ordering held). Migration is expand-only: ADD COLUMN IF NOT EXISTS, NOT VALID then VALIDATE constraints, new table, triggers, no DROP of data, no data statements, no CONCURRENTLY. I re-ran `discovery-schema-pglite.test.ts` (52 tests pass): applies on the full migration chain plus a second and third application, and the `RLS matrix on loot_item_need_pins` block runs officer, raider, ex-member and non-member (1/1/0/0 visible pins, insert/update/delete outcomes asserted per role). The only new table is `loot_item_need_pins`. |
| 2 | Officer can switch a tier to Discovery and it then holds its seeded need rows; every tier that existed before stays Known; Loot Score golden fixtures byte-identical | VERIFIED | `PATCH /api/raid-tiers` (app/api/raid-tiers/route.ts:112-318) allowlists `list_mode`, checks tier belongs to the permission-checked guild (404 otherwise), blocks non-Forever (400), switches `known`->`discovery` filtered on current mode, then `seedNeedRows` for the tier; on seed failure it reverts and returns 500; audit row written. Route test file has the cases (switch+seed+audit, failed seed reverts, non-Forever 400, D-03 409 both ways, 404 foreign guild). Default is `'known'` (migration line 182, PGlite "names no list_mode gets known" test). Only Forever expansions are ever flipped (`syncExpansionCatalog` throws for other names; `flipTiersToDiscovery` is the only update). Golden gate: `expansionSeeder-golden.test.ts` plus `app/services/__tests__/__golden__/` have zero diff across the phase (`git diff --stat <phase base> HEAD` empty for both); `domain/scoring` and no loot-score code was modified (the only `domain/loot` additions are new files plus pure additive branches in item-identity, apply-receive-skip, bracket-validation, item-copies, slot-capacity, gargul-dft). Golden gate and `domain/scoring` pass in my run. |
| 3 | A need-ranked submission moves through approval, snapshot, master sheet, exports and BLP without being silently dropped or crashing; every reader has a tested mode branch; addon exports contain item rows only | VERIFIED (with warnings WR-02, WR-03) | Because D-22 holds need ranking until Phase 4, the path is proven with fake-client fixtures that stand past the hold, as the plans state. Review route snapshots `item_name`/`loot_item_id` straight from the loot_items row (works for need rows; 03-17 tests). Addon: `guild-data` reads `.eq('kind','item')` (line 142), BLP embeds `loot_items(kind)` and drops need rows; `export-string` skips `isNeedRow` in the tier flatten (line 152) and BLP (245-246); `buildMemberRankedItems` skips need rows through `noteNeedSkipped`; `formatRankingsForGargul` has `kind === 'need'` continue (gargul-dft.ts:63); bot priority filters `kind='item'` on all three reads. Reader audit independently re-done by me: 99 non-test files read loot_items/loot_history/loot_submission_items/blp_tracking; 98 are listed in `need-reader-inventory.test.ts`; the one not listed, `app/api/blp/route.ts`, reads only blp_tracking keyed by id and is need-agnostic, and blp_tracking is outside the inventory's three-table scope. Inventory has self-checks with teeth (03-12). I ran all 56 test files changed in the phase plus the inventory and boss-sentinel tests: 64 files, 1647 tests, all pass. |
| 4 | A raider ranked on a need who attends a raid accrues BLP for that need before any item exists; recomputing BLP twice gives the same result | VERIFIED | PGlite test (re-run, passes): two raiders with approved lists ranking a need, both attending, need awarded with `awarded_item_id` null. `recompute_blp_for_item` leaves the winner with no row and the other raider `times_passed = 1` with one `blp_credits` row. A second block recomputes the item three times, then `recompute_blp_for_event` and `recompute_blp_for_guild` in two different orders, and `toEqual` on the full snapshot passes each time (idempotence). Empty case (unranked need) writes nothing. Application path: bulk award of a need schedules `recomputeBlpForItems` with the need id and writes `loot_item_id` = need row with no `awarded_item_id` (03-19 tests, pass). The BLP SQL was not changed; keying on `loot_item_id` is what makes it work. |

**Score:** 4/4 roadmap success criteria verified. 0 behavior-unverified (state transitions that matter, the Discovery switch/revert and BLP idempotence, have passing behavioural tests).

### Plan must-haves cross-check (spot-checked against code, not SUMMARY)

| Plan truth | Status | Evidence |
|-----------|--------|----------|
| 03-01 guard triggers exist, WHEN-gated, one per rule (D-17, D-03, D-12, D-22, D-24, D-26, D-27) | VERIFIED | grep of migration shows all 11 triggers; PGlite test "holds exactly one row for each guard trigger, and the table triggers are WHEN gated" and per-rule officer-vs-superuser cases pass |
| 03-01 `awarded_item_id` has no FK (D-15) | VERIFIED | Migration line 216 plain nullable uuid; PGlite test checks `pg_constraint` |
| 03-01 pglite pinned exactly 0.5.8, devDependencies only (D-20) | VERIFIED | in PR 459 file list (package.json +1 line) and migration-contract test passes |
| 03-02 deploy gate / types / "no reader pushed before deploy" | VERIFIED | PR/run evidence above; `lib/database.types.ts` carries the new columns (typecheck passes per orchestrator) |
| 03-03 145 keys frozen, costs, validators | VERIFIED | fixture has 145 entries; `needs.test.ts` deep-equals; passes |
| 03-04, 03-05 identity, receive-skip, bracket exemption, NeedLabel/ItemLink | VERIFIED | tests pass; ItemLink falls through to NeedLabel on null wowheadId |
| 03-06 to 03-11, 03-16 to 03-19 reader branches | VERIFIED | see SC3; tests pass |
| 03-12 reader inventory with teeth | VERIFIED | test passes; my independent scan found one extra non-listed file that is out of scope (blp route) |
| 03-13 seeder and Forever backfill (D-01, D-05, D-21) | VERIFIED | `seedExpansionForGuild` calls `syncExpansionCatalog`; tier insert 'discovery', flip, then seed; `sync:forever` script in package.json |
| 03-14 PATCH route | VERIFIED | see SC2; UI untouched (test "the expansion page does not mention list_mode") |
| 03-15 PGlite behaviour proofs | VERIFIED | 52/52 pass |

### Required Artifacts / Key Links

| Artifact | Status | Details |
|----------|--------|---------|
| `supabase/migrations/20261020120000_discovery_schema.sql` (621 lines) | VERIFIED | on main, deployed, identical to working tree |
| `domain/loot/{needs,list-mode,item-identity,need-ranking-hold}.ts`, `app/components/NeedLabel.tsx`, `app/services/need-row-seeder.ts`, `lib/loot/{need-skip,tier-need-rows}.ts` | VERIFIED | exist, substantive, imported by routes/components above |
| Key link: raid-tiers PATCH -> `seedNeedRows` -> `needRowColumns(NEED_DEFINITIONS)` | WIRED | route.ts imports and calls it; test asserts 145 rows |
| Key link: submit route -> `isHeldNeedRanking` -> DB trigger `enforce_need_ranking_hold` | WIRED | submit/route.ts:140; trigger in migration; PGlite test |
| Key link: export/guild-data -> `isNeedRow` / `kind` filter | WIRED | greps above |

### Requirements Coverage

| Requirement | Source plans | Status | Evidence |
|-------------|-------------|--------|----------|
| DISC-01 officer sets tier to Discovery; existing tiers stay Known (golden) | 03-01, 03-03, 03-13, 03-14, 03-15 | SATISFIED | SC2 |
| DISC-06 need rows flow through every reader, tested mode branch | 03-01, 03-03 to 03-12, 03-13, 03-15 to 03-19 | SATISFIED (warning WR-03) | SC3 |
| DISC-07 raider ranked on a need accrues BLP before any item exists | 03-15, 03-19 | SATISFIED | SC4 |
| DISC-12 expand-only schema before code, RLS matrix per new table, PGlite test | 03-01, 03-02, 03-15 | SATISFIED | SC1 |

All four IDs appear in plan frontmatter, all four are marked Complete in REQUIREMENTS.md traceability, and REQUIREMENTS.md maps no other ID to Phase 3 (no orphans).

### Behavioral Spot-Checks and Probes

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Migration + RLS matrix + guards + BLP + delete lock | `CI=true npx vitest run app/services/__tests__/discovery-schema-pglite.test.ts` | 52 passed | PASS |
| Golden gate + seeder + migration contract | `vitest run expansionSeeder-golden, discovery-schema-migration, need-row-seeder` | 94 passed with pglite | PASS |
| All phase-changed tests + reader inventory + boss sentinel + domain/scoring | `vitest run <56 files> ...` | 64 files, 1647 tests passed | PASS |
| Production deploy | `gh run view 39677113149` | success on merge sha | PASS |
| Step 7c probes | no `scripts/*/tests/probe-*.sh` declared | n/a | SKIPPED |

I did not re-run the full suite, typecheck, build or lint; I rely on the orchestrator's report (5151 tests, typecheck, build, lint 0 errors) and my targeted runs.

### Anti-Patterns

Debt-marker scan (TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER) over the 108 non-planning files changed in the phase: zero hits. Untracked `app/services/__tests__/scratch/probe.test.ts` is a skipped placeholder, not tracked; delete it before shipping.

### Code review warnings: gap or accepted?

None is a BLOCKER against a must-have or success criterion. My classification:

| ID | Verdict | Reasoning |
|----|---------|-----------|
| WR-01 PATCH commits list_mode then can fail on other fields | WARNING, not a gap | Real partial-write defect, but only for a request that combines `list_mode` with another field; the UI sends no `list_mode` yet (D-02), and the plan's "every decision before first write" wording covers refusals, not the trailing update. Fix (fold `otherFields` into the mode update, or apply them first) is small; do it in PR 3/4. |
| WR-02 master sheet visibility: up to 435 need ids in GET URLs, page-loop error unchecked | WARNING, accepted per 03-10 wording, must be closed before Forever guilds use the master sheet | Plan 03-10 explicitly has the client send both id sets to the visibility POST; only the BLP GET was required to avoid need ids. The URL limit is `[ASSUMED]` in research, and the pre-existing route already puts hundreds to 1000+ item ids in `.in()` (its own comment says a merged phase can exceed 1000), which suggests the limit is not hit at this size. But the unchecked `error` makes any failure look like "no rankings", which conflicts with the spirit of "not silently dropped". Phase 3 cannot expose it to real data (no need can be ranked, no Forever guild is synced until the owner runs sync:forever), so it does not fail SC3 today. Recommend: tier-based need resolution or chunking, plus throwing on the page error, in the reader PR or at the latest Phase 4 before the hold lifts. |
| WR-03 prio-list test cannot fail; inventory marks the reader `ok` on it | WARNING, weak spot in SC3 "every reader has a tested mode branch" | Confirmed: the route's embed (app/api/prio-list/route.ts:57-64) selects neither `kind` nor `need_key`, so the test only proves the fake builder returns its fixture. The 03-18 plan wording ("returns a need priority unchanged without throwing") is literally satisfied, so not a plan gap, but the behaviour is not actually pinned. No UI path creates a need priority in Phase 3. Fix: select `kind, need_key` or filter `kind='item'` and assert on the recorded filter. |
| WR-04 D-27 delete lock bypassed by officer deleting the tier or expansion (cascade) | WARNING, accepted per 03-01 wording; owner decision requested | The 03-01 truth and prohibition scope D-27 to a direct `DELETE` on `loot_items` and say in so many words that a delete cascading from a deleted raid tier, expansion or guild "is not a direct delete and passes" (a flagged assumption needed for `delete_guild`). So the must-have is met as written. The residual exposure (one PostgREST DELETE on a Discovery tier drops need rankings, awards and BLP) is real, is not a regression (same for item rows today), and needs a new migration if closed. Owner should either schedule a WHEN-gated `BEFORE DELETE` guard on `raid_tiers` before Forever guilds hold real need awards (Phase 5), or record it as an accepted residual with a PGlite test pinning it. |
| WR-05 reserve-run creation does not check tier belongs to the guild | WARNING, pre-existing gap, not a gap against this phase | The D-14 check (Discovery or unknown tier answers 400) is implemented; the missing guild-ownership check predates the phase. Small cross-guild oracle for tier ids. Fix in the follow-up. |
| IN-01 to IN-05 | INFO | IN-01 (need-skip log under-reports the count) and IN-05 (stale debug count in export-string, migration header wording) are cosmetic; no must-have depends on them. |

### Human Verification Required

See the `human_verification` list in the frontmatter (tracer slices, NeedLabel look on the master sheet, dashboard/raid-tracking need rendering, Oct 26 copy review, `sync:forever` dry run and apply after PR 4, and the WR-02/WR-04 risk decision). These are routed here per `human_verify_mode: end-of-phase` and the owner-run nature of the follow-ups; none is a code gap.

### Deferred (not Phase 3 gaps)

- Raid-tracking event edit re-import would drop need awards. Recorded only in 03-11-SUMMARY.md "Deferred Issues", assigned to Phase 5 planning. Not in ROADMAP.md Phase 5 criteria, so add it there (or to the Phase 5 CONTEXT) so it is not lost. Not exposed in Phase 3 because the UI cannot create need awards yet.
- D-22 hold items are intentionally left for Phase 4: `includeNeeds` default, `keepRankedNeedRows`, the submit route check, `need-ranking-hold.ts`, and the `enforce_need_ranking_hold` trigger (03-14 handoff).

### Gaps Summary

No gaps. The phase goal is achieved in the codebase: the schema is live and expand-only, tiers can switch to Discovery with seeded needs and a guarded rollback, Known data and golden fixtures are untouched, every reader is classified and tested (with the prio-list test being the one vacuous exception), and BLP accrues on need rows idempotently. Status is `human_needed` because of the deferred visual/owner-run items and two risk decisions (WR-02, WR-04), not because any must-have failed.

---

_Verified: 2026-10-21_
_Verifier: Claude (gsd-verifier)_
