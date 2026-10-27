---
phase: quick-261026-wpw
plan: 01
subsystem: battle-net-armory-gear-sync
tags: [spike, battle-net, item-level, no-go]
status: complete
verdict: NO-GO
requirements: [WPW-R1, WPW-R2, WPW-R3, WPW-R4, WPW-R5, DELIVERY-R1]
key-files:
  created:
    - scripts/spikes/armory-item-level-spike.ts (branch feat/armory-item-level)
    - .planning/workstreams/forever/quick/261026-wpw-v1-armory-gear-sync-spike-battle-net-cla/261026-wpw-SPIKE.md
actuals:
  tasks: 1
  commits: 3 (docs); plus 6 unreviewed feature commits from a parallel session
---

# Quick 261026-wpw: v1 armory gear sync, spike says NO-GO

**The Battle.net Classic equipment endpoint returns no per-slot item level: 0 of 90 non-cosmetic equipped items across 6 fetched characters carry `level.value`, and no `level` key exists on Classic equipment items at all. Per the plan's gate rules the verdict is NO-GO, so under the plan Tasks 2 and 3 should not have been built. A parallel session built them anyway while this one ran the probe; they sit unmerged and read the very field Classic does not return, so as built they would store null for every slot. What happens to them is an owner decision.**

## Verdict

**NO-GO.** The gate needed at least 3 characters at HTTP 200 (got 6) and at least 90 percent coverage of `equipped_items[].level.value` (got 0 percent).

The probe ran on 2026-10-27 from the main checkout against 10 linked characters sampled from the production database. The Blizzard client lives only in Vercel production, so the owner pulled a production env file to a temporary path outside the repo and the probe read it through `node --env-file`; the file was deleted right after the run and no value was printed. The report passed its own privacy self-check (exit 0).

## What the probe found

| Measure | Value |
|---|---|
| Samples tried | 10 |
| Samples fetched (HTTP 200) | 6 (the other 4 returned 404 in both Classic namespaces) |
| Non-cosmetic equipped items | 90 |
| Items with `level.value` | 0 (coverage 0 percent) |
| Other level-like numeric keys on items | none |
| Character summary has `equipped_item_level` or `average_item_level` | 6 of 6 |
| Median / max hours since last login | 6837 / 7122 (about 285 / 297 days) |
| Last-Modified header | present on all 6, same age as last login |
| Equipment call latency | 112 to 353 ms |

Full detail, including the observed item key set, is in SPIKE.md.

## Task status

| Task | Status | Notes |
|---|---|---|
| 1 Spike and gate | Done. Verdict NO-GO | SPIKE.md has exactly one verdict line. |
| 2 Storage (migration and writers) | Built by a parallel session, unmerged | Migration on `feat/equipped-item-level-migration` (8e865ed6), writers on `feat/armory-item-level` (46ea1f6a, f7f511ce). Writers read `equipped_items[].level.value` through `readEquippedItemLevel`, which Classic never returns, so every stored `item_level` would be null. |
| 3 Slot rules, read route, panel column | Built by a parallel session, unmerged | `feat/armory-item-level` (db7d4dca, 8f75416a): domain rules, read route, Equipped column. Structurally complete, but with Task 2 writing null everywhere the column would read No ilvl for every candidate. Copy still needs owner sign-off. |

## A parallel session built Tasks 2 and 3

While this session was running the probe, a second session on the same quick task committed Tasks 2 and 3 (14:52 to 15:05 on 2026-10-27): 2 commits on `feat/equipped-item-level-migration` (migration `20261026120000_equipped_item_level.sql` plus a 554-line PGlite test) and 4 commits on `feat/armory-item-level` (12 files, 1171 insertions: writers in sync-gear, import and link-battlenet, `domain/loot/equipped-item-level.ts`, the `equipped-item-levels` route, the Equipped column in `ItemCandidateModal`). None of it is pushed or merged. This session did not review or run that code.

The storage, rules, route and panel do not depend on where the number comes from; only the three writer call sites (`item_level: readEquippedItemLevel(item)`) do. So option 1 below is a bounded change to that work rather than a rewrite, and option 2 would replace the per-slot column with a per-character number.

## Owner decision: what next

The plan's per-slot design (Task 3 compares the candidate's equipped item in the slot the loot item fills) needs a per-slot item level, which the Classic profile does not return. Three ways forward, none implemented here:

1. **Game Data item endpoint**, `GET /data/wow/item/{itemId}` in `static-classic-{region}`. Gives the base item level per item id, so the per-slot column stays as designed. Costs one extra request per distinct item id per sync, cacheable in an item table since base level never changes. It ignores MoP item upgrades, which can raise an item up to 8 levels above base, so an upgraded item under-reads by up to 8.
2. **Character summary average**, the `equipped_item_level` or `average_item_level` field that the summary endpoint already returns on Classic (6 of 6). One number per character, no per-slot comparison, no extra requests. The panel column would show average equipped item level instead of the slot the item fills.
3. **Drop the feature** for v1.

Side note from the sample: the 10 sampled characters last logged in about 9 to 10 months ago (the query takes the first 10 linked rows, so it skews old), and 4 of them no longer resolve on Battle.net. Any production sync should treat a 404 as "character not found at Blizzard" and keep the last stored data rather than clear it.

## Branches and commits

| Branch | Where | Commit | Content |
|---|---|---|---|
| `feat/armory-item-level` (from origin/main 1b8c5b0a) | code worktree now detached at 1b8c5b0a; branch has moved on | a11e3d86 probe, then 46ea1f6a, db7d4dca, f7f511ce, 8f75416a from the parallel session | probe script plus Tasks 2 and 3 writers, rules, route and panel; unmerged |
| `feat/equipped-item-level-migration` (parallel session) | `/Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-migration` | 82221093, 8e865ed6 | migration 20261026120000_equipped_item_level.sql and its PGlite test; unmerged |
| `gsd/quick-261026-wpw-v1-armory-gear-sync-spike-battle-net-cla` | main checkout | bbb8522a, then this run's docs commit | PLAN, SPIKE, SUMMARY, STATE |

The probe script is privacy-safe and reusable (for re-running against fresh samples, or adapting to option 1). It now shares `feat/armory-item-level` with the parallel session's feature commits, so keeping it means either merging that branch once the item level source is settled, or cherry-picking a11e3d86 onto a chore branch.

## Deviations from Plan

- **Credentials.** The plan assumed the Blizzard client lives in `.env.local`. It lived only in Vercel production, and this harness is not allowed to pull credentials itself, so the owner pulled a production env file to a temporary path and the probe read it through `node --env-file`. The file was deleted after the run.
- **Rate limits.** Still unverified. The developer portal pages are rendered client-side and give no figures to a plain fetch; SPIKE.md names the page to check in a browser before any bulk use.
- **Probe typecheck.** The script sits outside the app's tsconfig include, so it was checked with an explicit strict `tsc` invocation plus eslint (unchanged from the first run).

## Awaiting owner sign-off

- Stop the parallel session before anything else touches these branches; two sessions share the main checkout and the quick branch.
- The alternative to pursue (1, 2 or 3 above). Under option 1 the parallel session's work is kept and the three writer call sites change source; under 2 the panel column changes meaning; under 3 both feature branches are deleted.
- Whether to keep the probe script (merge `feat/armory-item-level`) or delete the branch.
- Go-ahead to push the `gsd/quick-261026-...` branch and open the docs-only PR.

## Worktrees to remove after the decision

- `/Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-code` (contains a node_modules symlink; remove with `git worktree remove`)
- `/Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-migration` (parallel session's migration worktree)

## Privacy check

No guild, character or realm names, ids, tokens or credentials appear in the script, the report, SPIKE.md, this SUMMARY or the commit messages. Counts and aggregates only.

## Self-Check: PASSED

- Probe exited 0 with a report that passed the privacy self-check.
- SPIKE.md has exactly one verdict line (grep count 1).
- This session changed no code. `feat/armory-item-level` and `feat/equipped-item-level-migration` moved under a parallel session, recorded above and not reviewed here.
