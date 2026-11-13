---
phase: quick-261112-u5j
plan: 01
subsystem: prio-list-api, addon-export, planning-docs
tags: [phase-4-security, t-04-07-03, need-rows, d-03, addon]
requires: [04-07, 04-14, quick-261111-kgu]
provides:
  - "POST /api/prio-list/bulk refuses a batch holding a need row before any write"
  - "GET /api/addon/export-string and GET /api/addon/guild-data leave need-row priorities out"
  - "04-SECURITY.md: T-04-07-03 closed with file and line evidence, 76 of 76 threats closed"
affects: [app/api/prio-list/bulk, app/api/addon/export-string, app/api/addon/guild-data, .planning/workstreams/forever/phases/04-discovery-lists-and-score-split]
tech-stack:
  added: []
  patterns: ["chunked .in() read with IN_FILTER_CHUNK_SIZE before a batch write", "post-read isNeedRow filter counted in the D-16 need-skip scope"]
key-files:
  created:
    - app/api/prio-list/bulk/__tests__/route.test.ts
  modified:
    - app/api/prio-list/bulk/route.ts
    - app/api/addon/export-string/route.ts
    - app/api/addon/export-string/__tests__/route.test.ts
    - app/api/addon/guild-data/route.ts
    - app/api/addon/guild-data/__tests__/route.test.ts
    - lib/loot/__tests__/need-reader-inventory.test.ts
    - .planning/workstreams/forever/phases/04-discovery-lists-and-score-split/04-SECURITY.md
    - .planning/workstreams/forever/STATE.md
key-decisions:
  - "The bulk route is kept and gated, not deleted: nothing in the app, discord-bot/, companion/ or the addon calls it, the task preferred the refusal, and the refusal costs one chunked read"
  - "The addon readers filter after the read, as GET /api/prio-list does, and count the dropped rows in the D-16 need-skip scope so a leftover need-row priority is visible in the logs once per request"
  - "No database guard: the two prio-list routes are the app's only writers of priority rows"
status: complete
branch: fix/t-04-07-03-need-row-priority
estimate:
  tokens: 40000
  tasks: 3
actuals:
  tokens: 90000
  tasks: 3
  commits: 1
---

# Quick 261112-u5j Plan 01: Close T-04-07-03 Summary

The Phase 4 security review (`04-SECURITY.md`, 2026-11-12) left one medium threat open below the block threshold: the D-03 rule that an officer prio never applies to a Discovery need row was enforced only on `POST /api/prio-list`. The bulk route upserted any item id through the service-role client, and the two addon readers passed priority rows through without the filter the prio-list GET applies. All three are fixed on `fix/t-04-07-03-need-row-priority` (PR #517, aac3a3af, one commit on top of origin/main f73eea33), with tests; the security doc records the closure.

## How it ran

A side session started by the Phase 4 close-out session. Two scratch git worktrees under the session scratchpad, node_modules symlinked to the main checkout; nothing in the main checkout changed and no branch was switched there. `GSD_WORKSTREAM=forever` on the `init.quick` call, run from the main checkout's `.claude/gsd-core` with the code worktree as cwd. The docs branch is cut from `gsd/docs-forever-phase-04-uat` (PR #515), the only branch that holds `04-SECURITY.md`, so the docs PR is stacked on #515 and retargets to main when #515 merges.

## What changed

- `app/api/prio-list/bulk/route.ts`: after the `manage_loot` check and before the upsert, the batch's distinct item ids are read from `loot_items` (`id, kind`) in chunks of `IN_FILTER_CHUNK_SIZE` (WR-05). A failed read answers 500 `{ error: 'Failed to read items' }` so the check is never skipped; any need row answers 400 `{ error: NEED_ROW_FIXED_ERROR }`, the same body as the single route. Nothing else in the route changed.
- `app/api/addon/export-string/route.ts` and `app/api/addon/guild-data/route.ts`: the `guild_item_priorities` read selects `loot_items (kind)`; rows where `isNeedRow(row.loot_items)` are dropped after the read (the embed is not filterable, the same reason the prio-list GET filters after reading) and counted through `noteNeedSkipped`, so a leftover need-row priority warns once per request like a need BLP row. The output shapes are unchanged.
- Tests: new `app/api/prio-list/bulk/__tests__/route.test.ts` (7 cases: 401 and 403 before any read, 400 with no upsert and the select carrying `kind`, 500 with no upsert, a catalog-only batch upserted whole, 205 distinct ids read as 100, 100, 5 with a duplicate kept in the upsert, a need row in the second chunk refused). The two addon route fakes resolve the `loot_items` embed on priority rows from the loot_items fixture, as they already did for `blp_tracking`; each gains an N6 case (the need-row priority is left out, the read carries the embed, one warning with the reader name). The bulk route now matches the need reader inventory's table pattern (DISC-06, `lib/loot/__tests__/need-reader-inventory.test.ts`), so it is listed there as a `guard` reader citing its test, and the two addon reader notes name the new filter.
- `04-SECURITY.md`: T-04-07-03 register row `closed`; its verification bullet rewritten with the file and line evidence on aac3a3af; totals 76 closed (65 mitigations in code, 11 accepted); the "Open Below Threshold" table is empty with a note; an audit-trail row for 2026-11-12; `threats_open: 0` and `status: verified` unchanged.
- `STATE.md`: this row and the last-activity line.

## Checks

- `npx vitest run app/api/prio-list app/api/addon/export-string app/api/addon/guild-data`: 4 files, 115 tests passing.
- `npx eslint` on the six changed files: clean.
- `npm run lint`: 0 errors, 375 warnings (the same count as origin/main). `npm run typecheck`: clean. `npm test`: the first full run failed the need reader inventory (the bulk route was not listed yet; fixed above, 37 of 37 in the inventory and bulk files after) and `LootSettingsContent-loot-style.test.tsx` once; that file passed in the second full run and 3 of 3 times alone, imports nothing this task changed, and is a timing flake worth its own look (see Not changed).
- Addon fixtures: `LLP_REPO="$PWD" npx tsx <addon>/tests/tools/gen_web_fixtures.mts <out>` run from the branch before and after the change; `web_scoring.json` is identical to `loot-list-plus-addon/tests/fixtures/web_scoring.json` apart from `generatedFrom`, `export_string_ranks.txt` identical. The generator reads `domain/scoring` and `lib/addon/member-ranked-items.ts` only, never the routes.

## Not changed

- The single prio-list route, the master sheet and the companion: they already read priorities through the filtered GET or leave need rows out.
- No database trigger on `guild_item_priorities`: the two prio-list routes are the app's only writers of priority rows (the delete_guild function only removes them). A trigger would be a migration-only PR with an `--admin` merge; the owner can ask for one if a second writer appears.
- The bulk route's input shape and its lack of id validation beyond the kind check (WR-06 bounded only the visibility route).
- `app/(app)/loot-management/components/__tests__/LootSettingsContent-loot-style.test.tsx` failed once under full-suite load (`put.body?.settings[key]` undefined at :159, the PUT not yet captured) and passed every run after; not touched here, a follow-up for whoever next works on that test.

## Next

- Owner: merge #515 (the security review), then the code PR #517, then this docs PR.
- Then `/gsd-verify-work 4` if not yet done, and Phase 5 (Drop Desk Core).
