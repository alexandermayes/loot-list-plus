---
phase: 3
slug: discovery-schema-and-need-pipeline
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-19
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.x (globals on, jsdom default; `// @vitest-environment node` for routes, migrations and PGlite) |
| **Config file** | `vitest.config.ts` (setup `./vitest.setup.ts`) |
| **Quick run command** | `npx vitest run <touched test paths>` |
| **Full suite command** | `npm test && npm run typecheck && npm run lint` |
| **Golden gate** | `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scoring` |
| **Estimated runtime** | ~30 seconds per touched-file set (PGlite file about 15 s) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run` on the test files the task touched
- **After every plan wave:** Run the full suite command plus the golden gate
- **Before `/gsd-verify-work`:** Full suite and golden gate must be green; migration PR merged and its deploy workflow recorded as success before the code PR opens
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-T1 | 03-01 | 1 | DISC-12, DISC-01, DISC-06 | T-03-01-04, T-03-01-08, T-03-01-13, T-03-01-14, T-03-01-15, T-03-01-16, T-03-SC | Chain applies twice with the guards; legacy inserts default to known and item; ten triggers present, raid_tiers, loot_items and expansions guards WHEN-gated (D-24 name lock, D-26 tier-move lock and D-27 need-row delete lock included); the D-26 greps find no raid_tiers.expansion_id writer and the D-27 grep no loot_items delete path; the superuser can still move a Known tier and delete a need row | PGlite | `npx vitest run app/services/__tests__/discovery-schema-pglite.test.ts` | Wave 0 (created here) | ⬜ pending |
| 03-01-T2 | 03-01 | 1 | DISC-12 | T-03-01-05, T-03-01-07, T-03-01-13, T-03-01-14, T-03-01-15, T-03-01-16 | 75 statements in order; only the seven new functions (four SECURITY DEFINER, the D-24, D-26 and D-27 locks with invoker rights), each with pinned search_path and REVOKE; WHEN clauses pinned, expansions, the D-26 tier-move lock and the D-27 delete lock (exact pins; the delete lock's body holds pg_trigger_depth and RETURN OLD and names no table) included, with five self-checks; no data change, no guild_settings change, no FK on awarded_item_id | contract (regex) | `npx vitest run app/services/__tests__/discovery-schema-migration.test.ts` | Wave 0 (created here) | ⬜ pending |
| 03-15-T1 | 03-15 | 2 | DISC-01, DISC-12 | T-03-01-09, T-03-01-12, T-03-01-14, T-03-01-15, T-03-15-01, T-03-15-03 | Officer cannot switch a legacy tier to Discovery, insert or rename a 'Forever' expansion directly or through create_expansion_for_guild (D-24), move a Known tier into the Forever expansion or switch it afterwards (D-26), leave Discovery once needs are used, or write need rows directly; Known writes, an unchanged expansion_id and non-Forever renames pass (positive controls); the superuser is not held by the D-24 or D-26 lock | PGlite | `npx vitest run app/services/__tests__/discovery-schema-pglite.test.ts` | Wave 0 (file from 03-01) | ⬜ pending |
| 03-15-T2 | 03-15 | 2 | DISC-12 | T-03-01-01, T-03-01-02, T-03-01-03, T-03-01-06 | Constraints name their objects; four-role RLS matrix; pin trigger with RLS masking; officer_notes still denied; awarded_item_id has no FK | PGlite | `npx vitest run app/services/__tests__/discovery-schema-pglite.test.ts` | Wave 0 | ⬜ pending |
| 03-15-T3 | 03-15 | 2 | DISC-07, DISC-12 | T-03-01-11, T-03-01-16, T-03-15-02, T-03-15-05 | D-22 hold stops a raider's RPC and direct insert; superuser fixtures past the hold accrue BLP idempotently; the officer's plain delete of that need is rejected and the need row, rankings, award and BLP row remain, beside an officer item delete, a superuser need delete and the guild master's delete_guild cascade (D-27) | PGlite | `npx vitest run app/services/__tests__/discovery-schema-pglite.test.ts` | Wave 0 | ⬜ pending |
| 03-02-T1 | 03-02 | 3 | DISC-12 | T-03-02-02 | PR 1 carries only the six migration files of 03-01 and 03-15; body names the guards; CI green | CLI | `gh pr checks feat/forever-discovery-schema` (file list checked in the plan's acceptance criteria) | n/a | ⬜ pending |
| 03-02-T2 | 03-02 | 3 | DISC-12 | T-03-02-01, T-03-02-06 | Owner confirms the frozen need key list before PR 2 merges (D-25) and merges PR 1 with `--admin` on a non-raid day | manual (checkpoint) | `gh pr view feat/forever-discovery-schema --json state -q .state` and `grep -c "D-25 need keys confirmed" .planning/workstreams/forever/phases/03-discovery-schema-and-need-pipeline/03-02-SUMMARY.md` | n/a | ⬜ pending |
| 03-02-T3 | 03-02 | 3 | DISC-12 | T-03-02-03, T-03-02-04, T-03-02-05 | Deploy run success recorded; types regenerated; typecheck passes | CLI + typecheck | `npm run typecheck` | exists | ⬜ pending |
| 03-03-T1 | 03-03 | 1 | DISC-06 | T-03-03-02 | needRowColumns fits the shape check; lookup by Map | unit | `npx vitest run domain/loot/__tests__/needs.test.ts` | Wave 0 (created here) | ⬜ pending |
| 03-03-T2 | 03-03 | 1 | DISC-06 | T-03-03-01 | Frozen fixture, counts 19/22/104, cost mirror, D-23 Medium slots and no wand key, no dashes, aliases | unit | `npx vitest run domain/loot/__tests__/needs.test.ts` | Wave 0 | ⬜ pending |
| 03-03-T3 | 03-03 | 1 | DISC-01 | T-03-03-03, T-03-03-04 | D-03 and D-17 rules fail closed | unit | `npx vitest run domain/loot/__tests__/list-mode.test.ts` | Wave 0 (created here) | ⬜ pending |
| 03-04-T1 | 03-04 | 1 | DISC-06 | T-03-04-01 | Identity key per need; item keys unchanged | unit | `npx vitest run domain/loot/__tests__/item-identity.test.ts domain/loot/__tests__/apply-receive-skip.test.ts` | partly (item-identity new) | ⬜ pending |
| 03-04-T2 | 03-04 | 1 | DISC-06 | T-03-04-03 | Need copy caps; item caps unchanged | unit | `npx vitest run domain/loot/__tests__/slot-capacity.test.ts domain/loot/__tests__/item-copies.test.ts` | exists | ⬜ pending |
| 03-04-T3 | 03-04 | 1 | DISC-06 | T-03-04-02 | Need rows out of bracket rules (the D-08 departure is surfaced to the owner in the SUMMARY) | unit + golden | `npx vitest run domain/loot/__tests__/bracket-validation.test.ts` | exists | ⬜ pending |
| 03-05-T1 | 03-05 | 1 | DISC-06 | T-03-05-03, T-03-05-04 | ItemLink falls back to NeedLabel with no Wowhead request | component | `npx vitest run app/components/__tests__/NeedLabel.test.tsx app/components/__tests__/ItemLink.render.test.tsx` | Wave 0 (created here) | ⬜ pending |
| 03-05-T2 | 03-05 | 1 | DISC-06 | T-03-05-02 | Warn once per request with a fixed first argument | unit | `npx vitest run lib/loot/__tests__/need-skip.test.ts` | Wave 0 (created here) | ⬜ pending |
| 03-06-T1 | 03-06 | 4 | DISC-06 | T-03-06-01, T-03-06-02 | Companion payload items only; need BLP and rankings skipped | route + unit | `npx vitest run app/api/addon/guild-data lib/addon/__tests__/member-ranked-items.test.ts` | exists | ⬜ pending |
| 03-06-T2 | 03-06 | 4 | DISC-06 | T-03-06-02, T-03-06-03 | Import string and Gargul items only | route + unit | `npx vitest run app/api/addon/export-string domain/loot/__tests__/gargul-dft.test.ts` | exists | ⬜ pending |
| 03-06-T3 | 03-06 | 4 | DISC-06 | T-03-06-05 | Bot never answers with a need | route | `npx vitest run app/api/bot/priority` | exists | ⬜ pending |
| 03-07-T1 | 03-07 | 4 | DISC-06 | T-03-07-02 | Picker items only by default (D-02 hold, UI half of D-22) | unit | `npx vitest run lib/__tests__/loot-items-query.test.ts` | exists | ⬜ pending |
| 03-07-T2 | 03-07 | 4 | DISC-06 | T-03-07-01, T-03-07-04 | BIS items only; PATCH refuses need rows | route | `npx vitest run app/api/bis-items app/api/loot-items/__tests__/route.test.ts` | new tests created here | ⬜ pending |
| 03-07-T3 | 03-07 | 4 | DISC-06 | T-03-07-01 | Specs refuse need rows; editors items only | route + source | `npx vitest run app/api/loot-items` | new test created here | ⬜ pending |
| 03-08-T1 | 03-08 | 4 | DISC-06 | T-03-08-01 | Reserve item lists items only | route | `npx vitest run app/api/reserve-runs/items "app/api/reserve-runs/[id]/__tests__"` | partly (items test new) | ⬜ pending |
| 03-08-T2 | 03-08 | 4 | DISC-06 | T-03-08-01, T-03-08-02 | Join and awards reject need ids | route | `npx vitest run "app/api/reserve-runs/join" "app/api/reserve-runs/[id]/awards"` | exists | ⬜ pending |
| 03-16-T1 | 03-16 | 4 | DISC-06 | T-03-16-01, T-03-16-03 | No reserve runs on Discovery tiers; tier list Known only | route | `npx vitest run app/api/reserve-runs/__tests__ app/api/reserve-runs/raid-tiers` | exists | ⬜ pending |
| 03-16-T2 | 03-16 | 4 | DISC-06 | T-03-16-02 | Admin sheet import matches and updates items only | route | `npx vitest run app/api/admin/sheet-import` | Wave 0 (created here) | ⬜ pending |
| 03-09-T1 | 03-09 | 4 | DISC-06 | T-03-09-02 | D-22 hold: a need-ranked list answers 422 and writes nothing | unit + route | `npx vitest run domain/loot/__tests__/need-ranking-hold.test.ts app/api/loot-submissions/submit` | partly (need-ranking-hold test new) | ⬜ pending |
| 03-09-T2 | 03-09 | 4 | DISC-06 | T-03-09-01 | Hold lifted (Phase 4 state): need costs skip bracket rules, need copy caps apply | route | `npx vitest run app/api/loot-submissions/submit` | exists | ⬜ pending |
| 03-17-T1 | 03-17 | 4 | DISC-06 | T-03-17-03 | Need-ranked fixture approved, snapshotted and reverted by id; any conditional source edit carries its Reader-fix-for-03-12 record before the task closes (D-26) | route | `npx vitest run app/api/loot-submissions/review app/api/loot-submissions/revert` | exists | ⬜ pending |
| 03-17-T2 | 03-17 | 4 | DISC-06 | T-03-17-01, T-03-17-02, T-03-17-03 | Remove-item, counts, visibility handle need ids; a remove-item fix stays in the route (03-19 owns the builder, D-28); any conditional source edit carries its Reader-fix-for-03-12 record before the task closes (D-26) | route | `npx vitest run app/api/loot-submissions/remove-item app/api/loot-submissions/item-counts app/api/master-sheet/visibility` | exists | ⬜ pending |
| 03-19-T1 | 03-19 | 4 | DISC-07, DISC-06 | T-03-19-01, T-03-19-02, T-03-19-03 | Bulk need award keyed on the need row with no awarded_item_id; recompute scheduled with the need id; history-row builders keep the need id; any conditional source edit carries its Reader-fix-for-03-12 record before the task closes (D-26) | route + unit | `npx vitest run app/api/loot-history/bulk lib/loot/__tests__/loot-history-rows.test.ts` | exists | ⬜ pending |
| 03-19-T2 | 03-19 | 4 | DISC-06 | T-03-19-03 | Need award posts to Discord as bold text with no Wowhead link, in the announcement and the post-raid summary; any conditional source edit carries its Reader-fix-for-03-12 record before the task closes (D-26) | unit | `npx vitest run lib/__tests__/discord-loot-announcements.test.ts lib/__tests__/discord-raid-summary.test.ts` | exists | ⬜ pending |
| 03-18-T1 | 03-18 | 4 | DISC-06 | T-03-18-01 | Bootstrap route keeps the picker items only; need ids in rankings; any conditional source edit carries its Reader-fix-for-03-12 record before the task closes (D-26) | route | `npx vitest run app/api/loot-list/bootstrap` | Wave 0 (created here) | ⬜ pending |
| 03-18-T2 | 03-18 | 4 | DISC-06 | T-03-18-03 | loot-submissions and prio-list GET carry need rows; any conditional source edit carries its Reader-fix-for-03-12 record before the task closes (D-26) | route | `npx vitest run app/api/loot-submissions/__tests__/route.test.ts app/api/prio-list` | Wave 0 (created here) | ⬜ pending |
| 03-18-T3 | 03-18 | 4 | DISC-06 | T-03-18-02 | Wowhead lookups never return a need; need ids resolve like items; any conditional source edit carries its Reader-fix-for-03-12 record before the task closes (D-26) | unit | `npx vitest run lib/loot/__tests__/guild-scoped-lookup.test.ts lib/loot/__tests__/addon-award-insert.test.ts` | exists | ⬜ pending |
| 03-10-T1 | 03-10 | 4 | DISC-06 | T-03-10-01, T-03-10-02 | Ranked needs only under "Needs" | unit + component | `npx vitest run lib/loot/__tests__/tier-need-rows.test.ts "app/(app)/master-sheet/components/__tests__/BossSection.test.tsx"` | partly (tier-need-rows new) | ⬜ pending |
| 03-10-T2 | 03-10 | 4 | DISC-06 | T-03-10-02, T-03-10-04 | Summary ranked needs; identity award counts | unit | `npx vitest run lib/loot/__tests__/master-sheet-summary.test.ts lib/loot/__tests__/tier-need-rows.test.ts` | exists | ⬜ pending |
| 03-10-T3 | 03-10 | 4 | DISC-06 | T-03-10-03 | Raid Mode never throws on a need | component | `npx vitest run "app/(app)/master-sheet/components/__tests__"` | RaidModeView test new | ⬜ pending |
| 03-11-T1 | 03-11 | 4 | DISC-06 | T-03-11-01, T-03-11-02 | Gear skips needs visibly; history has no fake ids | route | `npx vitest run app/api/character-gear` | exists | ⬜ pending |
| 03-11-T2 | 03-11 | 4 | DISC-06 | T-03-11-02 | Dashboard and raid tracking label and skip by identity | typecheck + source | `npm run typecheck` | n/a | ⬜ pending |
| 03-12-T1 | 03-12 | 5 | DISC-06 | T-03-12-01 | Every reader in app, lib, domain, utils, scripts, companion and discord-bot inventoried; companion and bot payload consumers listed; node_modules and build output skipped | scan | `npx vitest run lib/loot/__tests__/need-reader-inventory.test.ts` | Wave 0 (created here) | ⬜ pending |
| 03-12-T2 | 03-12 | 5 | DISC-06 | T-03-12-01, T-03-12-02 | Markers present; 'ok' cites a need test; 'agnostic' names no item column; each 'consumer' via names an 'exclude' route; SQL functions inventoried; eight self-checks fire | scan | `npx vitest run lib/loot/__tests__/need-reader-inventory.test.ts` | Wave 0 | ⬜ pending |
| 03-12-T3 | 03-12 | 5 | DISC-06 | T-03-12-03 | 'Needs' sentinel safe in every boss helper; every boss_name reader listed | unit + scan | `npx vitest run lib/loot/__tests__/needs-boss-sentinel.test.ts` | Wave 0 (created here) | ⬜ pending |
| 03-13-T1 | 03-13 | 6 | DISC-01, DISC-06 | T-03-13-03, T-03-13-06 | New Forever guilds get Discovery tiers and 435 need rows; golden unchanged | unit + golden | `npx vitest run app/services/__tests__/need-row-seeder.test.ts app/services/__tests__/expansionSeeder.test.ts` | partly (need-row-seeder test new) | ⬜ pending |
| 03-13-T2 | 03-13 | 6 | DISC-01 | T-03-13-01, T-03-13-02, T-03-13-04 | Backfill flips before it seeds, once, Forever only, never deletes | unit + scan | `npx vitest run app/services/__tests__/expansionCatalogSync.test.ts` | exists | ⬜ pending |
| 03-13-T3 | 03-13 | 6 | DISC-01 | T-03-13-05 | Dry-run report counts, ids only | unit | `npx vitest run scripts/lib/__tests__/forever-sync.test.ts` | exists | ⬜ pending |
| 03-14-T1 | 03-14 | 7 | DISC-01 | T-03-14-02, T-03-14-09 | Forever tier switches to Discovery, then holds its needs; a failed seed switches it back | route | `npx vitest run app/api/raid-tiers` | Wave 0 (created here) | ⬜ pending |
| 03-14-T2 | 03-14 | 7 | DISC-01 | T-03-14-01, T-03-14-03, T-03-14-04, T-03-14-05, T-03-14-07 | Ownership check, D-03 409, D-17 400, no toggle | route | `npx vitest run app/api/raid-tiers lib/loot/__tests__/need-reader-inventory.test.ts` | Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `app/services/__tests__/helpers/pglite-chain.ts` and `app/services/__tests__/discovery-schema-pglite.test.ts` (DISC-12, DISC-07; needs `@electric-sql/pglite@0.5.8` exact devDependency, D-20; behaviour cases in plan 03-15)
- [ ] `app/services/__tests__/discovery-schema-migration.test.ts` (DISC-12 contract test)
- [ ] `domain/loot/needs.ts`, `domain/loot/__tests__/needs.test.ts`, `domain/loot/__fixtures__/need-keys.json` (DISC-06, D-12, D-23)
- [ ] `domain/loot/list-mode.ts` and `domain/loot/__tests__/list-mode.test.ts` (DISC-01, D-03)
- [ ] `lib/loot/__tests__/need-reader-inventory.test.ts` and `lib/loot/__tests__/needs-boss-sentinel.test.ts` (DISC-06, D-13, D-16; plan 03-12)
- [ ] `app/api/raid-tiers/__tests__/route.test.ts` (DISC-01, D-04, D-17)
- [ ] `app/components/__tests__/NeedLabel.test.tsx` and `app/components/__tests__/ItemLink.render.test.tsx` (DISC-06, D-13; plan 03-05)
- [ ] `lib/loot/__tests__/need-skip.test.ts` (D-16; plan 03-05) and `domain/loot/__tests__/item-identity.test.ts` (D-19; plan 03-04)
- [ ] `lib/loot/__tests__/tier-need-rows.test.ts` and `app/(app)/master-sheet/components/__tests__/RaidModeView.test.tsx` (DISC-06; plan 03-10)
- [ ] `app/api/bis-items/__tests__/route.test.ts`, `app/api/loot-items/__tests__/route.test.ts`, `app/api/loot-items/specs/__tests__/route.test.ts` (D-14, D-12; plan 03-07)
- [ ] `app/api/reserve-runs/items/__tests__/route.test.ts` (D-14; plan 03-08) and `app/api/admin/sheet-import/__tests__/route.test.ts` (D-14; plan 03-16)
- [ ] `domain/loot/__tests__/need-ranking-hold.test.ts` (D-22; plan 03-09)
- [ ] `app/api/loot-list/bootstrap/__tests__/route.test.ts`, `app/api/loot-submissions/__tests__/route.test.ts`, `app/api/prio-list/__tests__/route.test.ts` (DISC-06, D-02, D-16; plan 03-18)
- [ ] `app/services/__tests__/need-row-seeder.test.ts` (D-01, D-05; plan 03-13)

Plan owners: the PGlite harness, chain test and contract test are plan 03-01 and the PGlite behaviour cases plan 03-15; needs and list-mode are plan 03-03; the D-22 predicate is plan 03-09; the reader inventory and boss sentinel are plan 03-12; the raid-tiers route test is plan 03-14.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration is live in production before any reader code merges | DISC-12 | Deploy happens on merge; needs the deploy workflow run | Plan 03-02: after PR 1 merges with `--admin`, confirm the Deploy Migrations run for the merge commit succeeded (`gh run list --workflow=deploy-migrations.yml`, `gh run view <id> --log`) and record the run id before PR 3 (need readers) opens |
| Readers live before need rows exist | DISC-06 | Merge order across PRs | PR 4 (seeding and list mode, plans 03-13 and 03-14) opens only after PR 3 (plans 03-02 types, 03-06 to 03-12 and 03-16 to 03-19) has merged and deployed; the guard triggers and the D-22 hold ship earlier, in PR 1 |
| Forever backfill applied in production | DISC-01, D-05, D-21 | Owner-run against production credentials | After PR 4 deploys: owner runs `npm run sync:forever` (dry run) and checks each Forever expansion shows its tiers to switch to Discovery and 145 need rows per tier, runs `npm run sync:forever -- --apply`, then the dry run again and expects zero tiers to switch and zero need rows to insert |
| Need key list confirmed before PR 2 merges | D-25, D-12 | Owner judgment at the PR 1 merge stop | Plan 03-02 Task 2: the executor prints the 145 keys grouped by slot and stat family; the owner confirms them or names changes (applied on PR 2's branch and shown again); 03-02-SUMMARY.md records a `D-25 need keys confirmed` line before PR 2 (plans 03-03 to 03-05) merges |
| Proposed copy signed off | D-10, D-23, REH-02 | Owner judgment | Need display names (costs are final per D-23), the "Needs" heading, NEED_ROW_FIXED_ERROR, NEED_RANKING_HOLD_ERROR, RESERVES_UNAVAILABLE_ERROR and the two list-mode reasons go to the owner with the Phase 4 picker copy on Oct 26 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
