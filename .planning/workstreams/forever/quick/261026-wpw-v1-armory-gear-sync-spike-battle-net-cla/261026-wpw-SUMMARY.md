---
phase: quick-261026-wpw
plan: 01
subsystem: battle-net-armory-gear-sync
tags: [spike, battle-net, item-level, no-go, built-ahead]
status: complete
verdict: NO-GO
requirements: [WPW-R1, WPW-R2, WPW-R3, WPW-R4, WPW-R5, DELIVERY-R1]
key-files:
  created:
    - scripts/spikes/armory-item-level-spike.ts (branch feat/armory-item-level)
    - .planning/workstreams/forever/quick/261026-wpw-v1-armory-gear-sync-spike-battle-net-cla/261026-wpw-SPIKE.md
  built-unmerged:
    - supabase/migrations/20261026120000_equipped_item_level.sql (branch feat/equipped-item-level-migration)
    - app/services/__tests__/equipped-item-level-migration.test.ts (branch feat/equipped-item-level-migration)
    - domain/loot/equipped-item-level.ts and its test (branch feat/armory-item-level)
    - app/api/guilds/[id]/equipped-item-levels/route.ts and its test (branch feat/armory-item-level)
    - lib/battlenet.ts, lib/database.types.ts, the sync-gear, import and link-battlenet routes, ItemCandidateModal.tsx and tests (branch feat/armory-item-level)
actuals:
  tasks: 1 complete (spike), 2 built ahead of the gate and unmerged
  commits: 4 docs; 6 feature commits unmerged
---

# Quick 261026-wpw: v1 armory gear sync, spike says NO-GO

**The Battle.net Classic equipment endpoint returns no per-slot item level: 0 of 90 non-cosmetic equipped items across 6 fetched characters carry `level.value`, and no `level` key exists on Classic equipment items at all. Per the plan's gate rules the verdict is NO-GO. A second session of the same owner, asked to do as much as possible while the probe was blocked, built Tasks 2 and 3 in parallel; they sit unmerged on two branches and, as built, read the field Classic does not return, so every stored level would be null. What happens to them is an owner decision, laid out below.**

## Session log

- 2026-10-26, session 1: probe written and committed, could not run (no Blizzard credentials in `.env.local`), verdict INCONCLUSIVE.
- 2026-10-27, session 2a (this file's last editor): located both variables in Vercel production, every agent-side way of running the probe was denied by the auto-mode classifier (production read, credential materialisation, bypass); at the owner's request built Tasks 2 and 3 with two agents on their own worktrees.
- 2026-10-27, session 2b (parallel): the owner pulled the production env file by hand, the probe ran, verdict NO-GO, SPIKE.md and this SUMMARY written (commits bdad5f3c, 655620db).
- 2026-10-27, session 2a: overwrote 2b's SUMMARY by accident, then restored it and added the review of the built branches (this commit).

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
| 2 Storage (migration and writers) | Built ahead of the gate, unmerged | Migration on `feat/equipped-item-level-migration` (82221093 test anchor, 8e865ed6 migration). Writers on `feat/armory-item-level` (46ea1f6a sync-gear and import, f7f511ce link-battlenet). The writers read `equipped_items[].level.value` through `readEquippedItemLevel`, which Classic never returns, so every stored `item_level` would be null until the source changes. |
| 3 Slot rules, read route, panel column | Built ahead of the gate, unmerged | `feat/armory-item-level` (db7d4dca domain rules, 8f75416a route, panel and tests). Structurally complete and green, but with Task 2 writing null everywhere the column would read No ilvl for every candidate. Copy still needs owner sign-off. |

## The built branches, reviewed

Session 2b recorded the branches without reviewing them. Session 2a's agents built them and ran the plan's verification, and the coordinator checked the commits, cleanliness, writer count, em dash rule and panel strings independently afterwards.

Migration branch `feat/equipped-item-level-migration`: new test 23/23 (shape block 6, PGlite block 17: nullable integer column with no default, CHECK rejects 0, -1, 2000 and accepts 1, 489, 1999, re-apply twice is a no-op, RLS read matrix owner and active guildmate see the rows while ex-member, non-member and anon see none, owner session rejected with 42501 on insert with a level, on update changing it and on clearing it, null insert and enchant-only update allowed, anon insert rejected, `SET role service_role` and the superuser can write). `app/services/__tests__` 524/524 across 30 files. eslint and typecheck clean. The 12 executable statements are in the plan's order: lock timeout, add column, drop and add the range CHECK, column comment, guard function (invoker rights, `search_path = public, pg_temp`, raises `insufficient_privilege` for anon and authenticated), function comment, revoke, insert trigger with `WHEN (NEW.item_level IS NOT NULL)`, its comment, update trigger with `WHEN (NEW.item_level IS DISTINCT FROM OLD.item_level)`, its comment. No policy, grant or other column changes.

Code branch `feat/armory-item-level`: `app/api/battlenet` 13/13 (12 existing plus the 489 and null case); domain 58, route 15, modal 11 (8 existing plus 3 new); `npm run lint` 0 errors (375 pre-existing warnings); `npm run typecheck` clean; `npm test` 247 files, 4896 passed; `domain/scoring` has no diff against origin/main; 0 em dashes in added lines across the whole branch diff; `item_level: readEquippedItemLevel(` appears once in each of the three routes. 13 files, +1489 / -12, of which 318 added lines are the probe script.

What depends on the item level source: only `readEquippedItemLevel` in `lib/battlenet.ts` and its three call sites. The migration, slot rules, read route and panel read the stored column and are unaffected by where the number comes from.

## Owner decision: what next

The plan's per-slot design (Task 3 compares the candidate's equipped item in the slot the loot item fills) needs a per-slot item level, which the Classic profile does not return. Three ways forward, none implemented:

1. **Game Data item endpoint**, `GET /data/wow/item/{itemId}` in `static-classic-{region}`. Gives the base item level per item id, so the per-slot column stays as designed and both built branches are kept as they are. Costs one extra request per distinct item id per sync, cacheable in an item table since base level never changes. It ignores MoP item upgrades, which can raise an item up to 8 levels above base, so an upgraded item under-reads by up to 8. Work: a base-level lookup with a cache, and the three writer call sites switch to it; the migration, domain, route and panel do not change.
2. **Character summary average**, the `equipped_item_level` or `average_item_level` field the summary endpoint already returns on Classic (6 of 6). One number per character, no per-slot comparison, no extra requests. The panel column would show average equipped item level instead of the slot the item fills, so the per-slot column, the slot rules and most of the panel work would be replaced, and the number belongs on the character rather than per equipped row.
3. **Drop the feature** for v1. Both feature branches are deleted; the probe script can be cherry-picked (a11e3d86) onto a chore branch if it should be kept.

Side note from the sample: the 10 sampled characters last logged in about 9 to 10 months ago (the query takes the first 10 linked rows, so it skews old), and 4 of them no longer resolve on Battle.net. Any production sync should treat a 404 as "character not found at Blizzard" and keep the last stored data rather than clear it.

## Branches and commits

| Branch | Where | Commits (oldest first) | Content |
|---|---|---|---|
| `feat/armory-item-level` (from origin/main 1b8c5b0a) | `/Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-code`, checked out at 8f75416a | a11e3d86 probe; 46ea1f6a writers and types; db7d4dca domain rules; f7f511ce link-battlenet writer; 8f75416a route, panel and tests | probe script plus Tasks 2B and 3; unmerged |
| `feat/equipped-item-level-migration` (from origin/main 1b8c5b0a) | `/Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-migration` | 82221093 test anchor; 8e865ed6 migration | migration `20261026120000_equipped_item_level.sql` and its PGlite test; unmerged |
| `gsd/quick-261026-wpw-v1-armory-gear-sync-spike-battle-net-cla` | main checkout | bbb8522a, d0cf7e80, bdad5f3c, 655620db, then this commit | PLAN, SPIKE, SUMMARY, STATE |

Migration timestamp `20261026120000`: no `supabase/migrations/20261026*` on origin/main or any origin branch at build time; newest on main is `20261020120000_discovery_schema.sql`. Anchored older test: `app/services/__tests__/discovery-schema-pglite.test.ts` (82221093) asserted the Discovery migration was the newest file on disk; it now asserts the file is present, with a #309 comment, the same fix quick task 261003-kfj made.

## Deviations from Plan

From the spike run (session 2b):

- **Credentials.** The plan assumed the Blizzard client lives in `.env.local`. It lived only in Vercel production, and the harness is not allowed to pull credentials itself, so the owner pulled a production env file to a temporary path and the probe read it through `node --env-file`. The file was deleted after the run.
- **Rate limits.** Still unverified. The developer portal pages are rendered client-side and give no figures to a plain fetch; SPIKE.md names the page to check in a browser before any bulk use.
- **Probe typecheck.** The script sits outside the app's tsconfig include, so it was checked with an explicit strict `tsc` invocation plus eslint.

From the build (session 2a), each one the owner can veto if the branches are kept:

1. **Built ahead of the gate** at the owner's request while the probe was blocked. Nothing pushed.
2. **Third writer.** The plan names sync-gear and import as the only Battle.net writers of `character_equipped_items`; `app/api/characters/[id]/link-battlenet/route.ts` is a third (service role, same endpoint and `SLOT_MAPPING`). It got the same one-line change as its own commit f7f511ce so a character linked but never resynced does not show No ilvl. No test of its own.
3. **Token sweep list.** The plan's expected-null list missed six names in the five raid data files (the planning grep skipped double-quoted and backslash-escaped names): Conqueror's, Protector's and Vanquisher's Mark of Sanctification, Fragment of Val'anyr and Ouro's Intact Hide are on the expected-null list; Vek'lor's Diadem resolves to Head through a new "Diadem" word, matching Vek'nilash's Circlet from the same boss. The sweep asserts its regex found every `slot: 'Token'` line.
4. **Panel details the plan left open.** Fetched state is keyed by item id and cleared on close; the sync age in the title counts from when the answer arrived (`react-hooks/purity` is an error rule); context slots (Off Hand) are listed in the title only when they hold a numeric level.
5. **Route short-circuit.** When no requested id is active in the guild the route answers an empty 200 without touching the RLS client. The test proves the gear read goes through the RLS-scoped client, never the service role.
6. **Import route test mock** uses `importOriginal` for the real `SLOT_MAPPING` and `readEquippedItemLevel` so the 489 and null case exercises the real reader.
7. **Extra migration tests** beyond the plan's list: owner clearing a stored level rejected; anon insert with a level rejected (the BEFORE trigger fires ahead of RLS); `SET role service_role` can write. The shape block pins the Rollback block to five removal statements and checks the guard is not SECURITY DEFINER.
8. **Unrelated flaky test.** `__tests__/quality-brand-token-parity.test.ts` exceeded vitest's 5 s default in three full-suite runs on the code branch under load (5.7 s, 7.0 s) and passed on the plain rerun recorded above; it is a synchronous whole-tree scan this branch does not touch. Owner decision whether to lengthen its timeout. Not changed.

## Awaiting owner sign-off

- The alternative to pursue (1, 2 or 3 above). Under 1 both branches are kept and the writer source changes; under 2 the column changes meaning and most of Task 3 is replaced; under 3 both feature branches are deleted.
- Whether to keep the probe script (merge or cherry-pick a11e3d86) if the branches go.
- Equipped column copy, only if the branches are kept (Standing Constraint 2). Implemented verbatim from the plan in `ItemCandidateModal.tsx` (`EQUIPPED_COPY`): header `Equipped`, header title `Item level this player has equipped in the slot this item fills, from their last Battle.net gear sync`; ok cell shows the number, title lists each slot as `{slot}: {level}` joined with `, ` then ` Synced today.` / ` Synced 1 day ago.` / ` Synced {n} days ago.` (as built: `Finger 1: 489, Finger 2: 476 Synced today.`, the plan's literal spec has no period before Synced and one would read better); `Empty` with title `Nothing equipped in this slot at the last sync.`; `No ilvl` with title `This gear has no item level yet. A Battle.net gear sync fills it in.`; `Not synced` with title `No Battle.net gear sync for this character yet.` Route error strings (API only): `Unauthorized`, `Officers only`, `character_ids is required`, `At most 200 character_ids per request`, `character_ids must be UUIDs`, `Failed to load equipped item levels`, `Internal server error`.
- Go-ahead to push the `gsd/quick-261026-...` branch and open the docs-only PR.

Both sessions' agents are finished; nothing else touches these branches until the decision.

## Merge order if option 1 is chosen

1. Replace the item level source (base level lookup with a cache) on `feat/armory-item-level`; `readEquippedItemLevel` and its three call sites are the only code that changes.
2. Push `feat/equipped-item-level-migration`, open the migration-only PR, merge with `--admin` on a non-raid day, confirm the deploy (about 12 seconds after merge).
3. Push `feat/armory-item-level`, open the code PR, give the copy sign-off, run the plan's human check (ring, trinket, two-hand weapon, tier token, mount as a manage_loot officer), merge after the migration is live.
4. Push the `gsd/quick-261026-...` branch and open the docs-only PR.

## Worktrees to detach after the decision

- `/Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-code`
- `/Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-migration`

Both contain a `node_modules` symlink to the main checkout; detach them with the git worktree command rather than deleting the folders.

## Privacy check

No guild, character, realm or account names, ids, tokens or credentials appear in the script, the report, SPIKE.md, this SUMMARY or the commit messages. Counts and aggregates only. Test data on the feature branches uses synthetic UUIDs and generic names; both build agents reported a privacy sweep of their diff with no hits. Session 2a's pulled Vercel env file in its session scratchpad was blanked to zero bytes.

## Self-Check: PASSED

- Probe exited 0 with a report that passed the privacy self-check (session 2b).
- SPIKE.md has exactly one verdict line (grep count 1).
- Migration branch: commits 82221093 and 8e865ed6 present, worktree clean, 3 files changed.
- Code branch: commits a11e3d86, 46ea1f6a, db7d4dca, f7f511ce, 8f75416a present, worktree clean, 13 files changed.
- Nothing pushed, no PR opened, `domain/scoring` untouched.
