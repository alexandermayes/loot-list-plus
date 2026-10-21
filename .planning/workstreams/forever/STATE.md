---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: "WoW Forever Loot: Discovery to Known"
current_phase: 03
current_phase_name: Discovery Schema and Need Pipeline
status: executing
stopped_at: Completed 03-18-PLAN.md
last_updated: "2026-10-21T22:26:51.125Z"
last_activity: 2026-10-20
last_activity_desc: Phase 03 execution started
state_head: 513009b4035c546b9c96fcd7cb90b64ee18e9f1c
progress:
  total_phases: 8
  completed_phases: 2
  total_plans: 41
  completed_plans: 37
  percent: 25
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (shared; its milestone section describes the SEO sprint, not this milestone)
Milestone brief: `.planning/workstreams/forever/MILESTONE-BRIEF.md`
Requirements: `.planning/workstreams/forever/REQUIREMENTS.md` (44 v1)
Roadmap: `.planning/workstreams/forever/ROADMAP.md` (8 phases)
Research: `.planning/research/SUMMARY.md`

**Core value:** A Forever guild can run loot from day one without knowing a single item: raiders rank generic needs, officers settle every drop in seconds from a Drop Desk, and the whole product feels like a consumer app that just works.
**Current focus:** Phase 03 — Discovery Schema and Need Pipeline

## Current Position

Phase: 03 (Discovery Schema and Need Pipeline) — EXECUTING
Plan: 16 of 19
Status: Ready to execute
Last activity: 2026-10-20 — Phase 03 execution started

Progress: [███░░░░░░░] 2/8 phases ([████████████████████] 22/22 plans, [███░░░░░░░] 25% of planned); Phase 01: 9/9 plans, UAT 4/4 passed, 45/45 threats closed; Phase 02: 13/13 plans, UAT 5/5 passed, 63/63 threats closed, code review 0 critical / 6 warning

## Hard Dates

- 2026-10-31: Discovery lists usable (Phases 1 to 4)
- 2026-11-30: Drop Desk live (Phases 5 to 7)
- 2026-12-09: Forever raids open (Phase 8 cuts targeted around it)

## Standing Constraints

1. Schema changes are expand-only, ship as their own migration-only PR (`--admin` merge, non-raid day) and are live before any code that reads them; RLS matrix per new table.
2. The owner signs off user-facing copy; no em dashes in user-facing text.
3. No player or guild names in analytics or published data.
4. Known guilds' Loot Score golden fixtures and Lua fixtures stay byte-identical.
5. No live wago.tools or Wowhead fetches; nothing before Dec 9 depends on Forever loot data.

## Performance Metrics

**Velocity:**

- Total plans completed: 22
- Average duration: -
- Total execution time: 0 hours

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 9 | - | - |
| 02 | 13 | - | - |
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01 | 10 min | 3 tasks | 2 files |
| Phase 01 P02 | 20 min | 2 tasks | 7 files |
| Phase 01 P03 | 5 min | 2 tasks | 10 files |
| Phase 01 P06 | 2 min | 2 tasks | 7 files |
| Phase 01 P04 | 6 min | 2 tasks | 5 files |
| Phase 01 P07 | 8 min | 2 tasks | 2 files |
| Phase 01 P08 | 5 min | 2 tasks | 10 files |
| Phase 01 P05 | 6 min | 2 tasks | 7 files |
| Phase 01 P09 | 4 min | 2 tasks | 4 files |
| Phase 02 P01 | 8 min | 2 tasks | 6 files |
| Phase 02 P12 | 44h 26m wall (incl. checkpoint wait) | 3 tasks | 8 files |
| Phase 02 P02 | 8 min | 2 tasks | 5 files |
| Phase 02 P03 | 23 min | 2 tasks | 7 files |
| Phase 02 P07 | 13 min | 2 tasks | 5 files |
| Phase 02 P13 | 175 min wall (incl. checkpoint wait) | 3 tasks | 13 files |
| Phase 02 P04 | n/a (wall clock spans checkpoint wait) | 2 tasks | 5 files |
| Phase 02 P08 | ~20 min | 2 tasks | 3 files |
| Phase 02 P10 | 2 min | 2 tasks | 4 files |
| Phase 02 P11 | 10 min | 2 tasks | 3 files |
| Phase 02 P05 | 15 min | 2 tasks | 2 files |
| Phase 02 P06 | 25 min | 2 tasks | 4 files |
| Phase 02 P09 | 25min | 2 tasks | 3 files |
| Phase 03 P01 | 17 min | 2 tasks | 6 files |
| Phase 03 P03 | 6 min | 3 tasks | 5 files |
| Phase 03 P04 | 8 min | 3 tasks | 10 files |
| Phase 03 P05 | 6 min | 2 tasks | 6 files |
| Phase 03 P15 | 29 min | 3 tasks | 2 files |
| Phase 03 P02 | 1 day (owner checkpoint) | 3 tasks | 1 files |
| Phase 03 P06 | 6 min | 3 tasks | 10 files |
| Phase 03 P07 | 25 min | 3 tasks | 10 files |
| Phase 03 P08 | 10 min | 2 tasks | 8 files |
| Phase 03 P09 | 3 min | 2 tasks | 4 files |
| Phase 03 P10 | 9 min | 3 tasks | 10 files |
| Phase 03 P11 | 8 min | 2 tasks | 6 files |
| Phase 03 P16 | 12 min | 2 tasks | 6 files |
| Phase 03 P17 | 15 min | 2 tasks | 5 files |
| Phase 03 P18 | 12 min | 3 tasks | 5 files |

## Accumulated Context

### Decisions

- Owner: all four extra features are in (What would it take line, who's-interested responses, live Discord loot thread, loot style presets).
- Owner: the Drop Desk is free for all guilds, gated by a server-side guild setting.
- Owner: need rows are per raid tier, with one picker fanning out to every Discovery tier.
- Owner: the simplicity audit starts Oct 26; its cuts ship after Nov 30.
- Owner: the Known mode transition is deferred; raid assignments are out of scope.
- Roadmap: the research's ranker-extraction phase is folded into Phase 5, and the Drop Desk is split into Phase 5 (core award path) and Phase 6 (live raid night).
- [Phase 01]: 01-01: BLP recompute is awaited (not after()) on award DELETE and PATCH reassign; unlinking to null also recomputes — Success criterion 1 says by the time the request returns; recomputeBlpForItems returns RPC errors without throwing
- [Phase 01]: 01-01: award receipt whitelist is Record<keyof ScoreComponents, true>; cap stays JSON.stringify length (UTF-16 units) at 4096 — A new score component is a compile error until whitelisted; changing the cap unit is outside FIX-04 (assumption A9)
- [Phase 01]: Owner decision 7: a failed loot_history read in guild-data answers 500 like every other read (route throws; member-ranked-items unchanged) — A failed read must never be presented as a complete list
- [Phase 01]: guild-data pages loot_items too and reads loot_submissions oldest first (created_at, id) so the newest approved submission wins — MoP catalogs pass 1700 items; the old read had no ORDER BY so the winner was unspecified
- [Phase 01]: createTypedServiceRoleClient delegates to createServiceRoleClient; selectAllPagesOrThrow exported from utils/supabase/paginate.ts for plans 01-04, 01-05, 01-07 — Existing test mocks of createServiceRoleClient keep working
- [Phase 01]: 01-03: wowheadItemUrl matches the stored expansion name exactly; Forever links to wowhead.com/forever, every other guild keeps its existing link (owner decision 2) — Forever-only scope keeps known guilds byte-identical; the helper keeps the era map so era-correct links are a one-line opt-in per call site (deferred follow-up)
- [Phase 01]: 01-06: master_loot_awarded reports loot_item_ids (ids only, list order); a failed item read is null (unknown), never zero; guild_name unregistered; posthog.identify drops email and display_name — Owner decisions 1 and 4 and Hard Constraint 3; null keeps a failed read from posing as an empty list
- [Phase 01]: 01-04: item_url on every /priority 200 via wowheadItemUrl with no third argument (non-Forever stays retail); bot renders it only after a strict Wowhead shape check; /score typed by cast only — Additive contract, either deploy order safe; no default substitution so scores are unchanged
- [Phase 01]: 01-07: a failed loot_history read in export-string answers 500 (owner decision 8, extends decision 7); submissions read oldest first; readOrThrow helpers copied locally into the route — A failed read must never be presented as a complete import string; the plan scoped changes to two files so the helpers were not lifted to a shared module
- [Phase 01]: 01-08: five server analytics events (guild_created, character_created, reserve_item_awarded, character_imported, loot_item_removed_from_list) send ids and counts only; a source scan with a 50-site floor and self-checks fails on any name in an analytics call or email in an identify call — Hard Constraint 3 and owner decision 4; stored award and audit rows keep character_name; the scan reads call arguments only, so variable-built properties are caught only where passed literally
- [Phase 01]: 01-05: all ten addon and bot routes on createTypedServiceRoleClient with no casts; scan test (typed-client-usage.test.ts) enforces it — FIX-06; lib/addon/sync-tokens.ts stays untyped (library, accepted debt); E-17 select-string columns left for human review
- [Phase 01]: 01-09: bot embed titles use a colon, the /priority raider line a middle dot, the review post title parentheses; copy is proposed and awaits owner sign-off before PR 6 merges — FIX-03 and Hard Constraint 2; remaining user-facing bot em dashes are the owner-accepted Phase 7 REH-02 deferrals (decision 3), raider line fixed now (decision 5)
- [Phase 02]: Golden-row files for the five legacy expansions are captured once from the unmodified seeder and never regenerated with -u; later plans run the suite with CI=true — A mismatch means the plan changed legacy rows (EXPN-03)
- [Phase 02]: 02-12: Forever raids use the neutral FOREVER_RAID_ICON (question mark) and the Forever path never reads the name map; getRaidShorthand unchanged — Forever raid names collide with Classic and TBC names; inventory test keeps game-less calls explicit until 02-13
- [Phase 02]: 02-02: zod 4.6.5 and csv-parse 7.0.2 installed with exact pins after owner legitimacy approval; manifest schema kept outside the domain barrel — Supply-chain mitigation T-02-SC and bundle reach T-02-02-01
- [Phase 02]: 02-07: snapshot sha256 input is canonicalSnapshotPayload({ build, tables }) (sorted keys, rows by ID, fetchedAt excluded); PROVISIONAL_CEILING = 9 pins the allowlist size — A re-pull of unchanged data hashes the same, and allowlist growth needs a visible reviewed ceiling edit (D-15)
- [Phase 02]: EXPANSION_NAME_TO_SLUG keeps no Forever key; tests and new callers read slugs from the registry (getExpansionMeta) because the reserve-run route keys off that map
- [Phase 02]: 02-10: sync:forever is dry-run by default, --apply writes, unknown flags exit 1; duplicates after apply are reported, never deleted — No unique index on raid_tiers (expansion_id, name) and a migration is out of phase scope; a typo must not silently run as the wrong mode
- [Phase 02]: 02-11: the Forever raid list renders only in the setup guide (isForeverGuild and raidTierStatus available, after the steps list); tier names are matched, never displayed — D-02 as amended 2026-10-14; copy and placement held for owner sign-off before the PR merges
- [Phase 03]: 03-01: Discovery migration ships seven guard functions and ten WHEN-gated triggers (D-03, D-12, D-17, D-22, D-24, D-26, D-27); loot_history.awarded_item_id has no FK until Phase 5 — A second FK to loot_items makes PostgREST embeds ambiguous (PGRST201); WHEN gating keeps Known writes from calling any guard; D-22 hold is its own trigger so Phase 4 drops it cleanly
- [Phase 03]: 03-01: package-lock.json edited by hand to add only @electric-sql/pglite 0.5.8 (local npm stripped libc fields from ~90 unrelated lines) — Keeps the lockfile diff to 8 lines for review
- [Phase 03]: 03-03: NEED_DEFINITIONS is generated from the slot table in fixed order and gated by a hand-written 145-key fixture; list-mode rules fail closed (integer 0 counts, exact name Forever) — A consistent rename of a shipped key is caught only by the fixture comparison, so the fixture stays hand-written; PR 2 waits for the D-25 owner confirmation of the key list in 03-02-SUMMARY.md
- [Phase 03]: 03-04: need rows key receive skips on 'need:<row id>' and items on wowhead_id; bracket rules exclude kind need (departs from D-08, Phase 4 budget check DISC-03 governs need costs) — Bracket functions sum allocation_cost against 3 and need costs are 3, 2, 1, so no classification mirror keeps need lists valid (Pitfall 2); item rows unchanged
- [Phase 03]: 03-05: ItemLink is a hooks-free wrapper that renders NeedLabel for a null wowheadId, with the old body unchanged in WowheadItemLink; noteNeedSkipped warns once per scope with a fixed first argument — One guard covers all 43 call sites and hooks stay unconditional; a fixed log string keeps request data out of format strings (CodeQL); NeedLabel look held for the Phase 4 copy review
- [Phase 03]: 03-15: Discovery guard proofs run as officer, raider and superuser with a same-role positive control beside every rejection; pin UPDATE is asserted as permission denied (no UPDATE grant), not 0 rows — A rejection from RLS can never pass as a guard rejection; the missing UPDATE grant is stronger than the plan's 0-row wording
- [Phase 03]: [03-02] database types hand-applied from gen:types hunks; generator output carried unrelated drift
- [Phase 03]: [03-06] External consumers stay item-only: guild-data and bot /priority filter kind = item in the query, export-string filters in the tier flatten, need rankings and need BLP are skipped with one need-skip warning per request — The companion keys items by String(wowhead_id), so one need row would collide every need on null (D-14); a visible skip (D-16) keeps a need ranking from vanishing silently
- [Phase 03]: 03-07: includeNeeds is a default-false option on fetchFilteredLootItems; need-row 400 on PATCH and specs follows the guild ownership check — Phase 4 flips one argument per caller with no data change; a need row of another guild still answers 404 and enforce_loot_item_need_rules stays the database backstop
- [Phase 03]: 03-08: every reserve-run loot_items read filters kind = item at the query (public list, run detail, join list and submit check, awards check); a need id fails the existing membership checks so no new error text — Keeps Known-tier responses identical and the unauthenticated join route from ever listing or accepting a need row (D-14)
- [Phase 03]: 03-09: submit route refuses any need row with 422 before any write through one predicate (isHeldNeedRanking) and already excludes need rows from bracket rules with need copy caps — Phase 4 deletes one call, one module and one trigger; the hold reads every loaded row so a need in a turned-off tier is still refused
- [Phase 03]: 03-10: master sheet, Summary and Raid Mode show only needs someone ranked, read by tier with need ids in the POST body and only ranked need ids in a second BLP GET; receive skips and award counts key by itemIdentityKey — A tier with 145 unranked seeded needs adds no row (D-02); Phase 4 stops calling keepRankedNeedRows in loadAllRankings; LootListAggregateItem.wowhead_id widened to number | null
- [Phase 03]: 03-11: need awards skip awarded gear with one need-skip warning per request, come back from loot history with a null wowhead id, and the dashboard skips received needs by identity key; RaidLootEntry.item_wowhead_id widened to number | null — A need award names no real item until the Desk writes awarded_item_id (D-15); null lets ItemLink render a NeedLabel instead of an item=0 link. Open for Phase 5: editing a raid event deletes and re-imports loot from wowhead lines, which would drop need awards
- [Phase 03]: 03-16: reserve run creation refuses Discovery and missing tiers (400 RESERVES_UNAVAILABLE_ERROR, 500 on tier read error) and the reserve tier list shows Known only; admin sheet import reads kind item only — The tier read sits after membership and Premium checks so Known responses are unchanged; the kind filter is the service-role guard because the database refuses need-row writes only for browser sessions (D-14). Reserve copy is proposed for the owner's Oct 26 sign-off
- [Phase 03]: 03-17: all five lifecycle readers (review, revert, remove-item, item-counts, master-sheet visibility) handle need rows by id; no reader fix needed (Reader fixes for 03-12: none) — Fixture tests past the D-22 hold pass against unchanged routes, matching research B6, B7, B9, B10, C6
- [Phase 03]: 03-18: bootstrap, loot-submissions, prio-list, wowhead lookups and addonAwardKeys all handle need rows; no reader fix needed (Reader fixes for 03-12: none); the D-02 hold is asserted as exactly three fetchFilteredLootItems arguments — Fixture tests past the D-22 hold pass against unchanged source, matching research A1, A8, B10 and D6

### Pending Owner Inputs

- Oct 21: Forever boss names (Phase 2); addon scope and owner for the separate repo (Phase 5); community asks for in-game loot list viewing through the addon without a web login (addon scope input)
- Oct 26: spec defaults review and copy sign-off for picker, presets, "Set your 5" (Phase 4); simplicity audit scope and sidebar direction (Phase 8); community input for the Phase 4 presets review: how often raiders may re-rank need rows within a tier; a council-style preset that shows attendance, bad luck protection and a future preparation score side by side
- Nov 9: beta guild, named paper-fallback officer, void rule (Phase 7); master loot or Gargul export scope (Phase 5)

### Blockers/Concerns

- [Phase 1 follow-up] `lib/addon/sync-tokens.ts` stays on the untyped service-role client (accepted library debt) and the E-17 select-string columns were left for human review; neither blocks Phase 2.
- [Phase 2, shipped] Phase 2 reached main on 2026-10-19 through PRs #445, #447, #446, #450, #451, #449, #452, #453 and #454 (planning docs in #444). The first Refresh wago snapshot run pulled build 1.60.1.70450; Onyxia was promoted from encounter 1084 and the allowlist holds the 8 Barrow Deeps bosses (PR #455, PROVISIONAL_CEILING 8). GitHub Actions may now open the weekly snapshot PR itself. Still owed: the owner runs `npm run sync:forever` then `-- --apply` against production (UAT test 3), and the Barrow Deeps and Hyjal Summit boss names are due 2026-10-21.
- [Phase 2, shipped] Code review warnings WR-01, WR-02, WR-03, WR-04 and WR-06 were fixed before shipping (02-REVIEW-FIX.md); WR-05 stays an accepted risk (R-02-05). Open residual items from 02-SECURITY.md: pin the Forever raid mapIds once known, and add the schema modules to the client-safe scan (residual risks 5 to 9).
- [Phase 1, shipped] Phase 1 reached main through PR #456, cherry-picked onto main with both #355 list merging and the Phase 1 typed-client, paging and read-error 500 behaviour kept. `lib/addon/sync-tokens.ts` and `lib/addon/raid-night.ts` still use the untyped client (outside the route scan, accepted debt).

- Phase 3: research lists two cost schemes for need rows (an allocation cost of 1/1/0, and a budget at Big 3, Medium 2, Standard 1). Settle which one the seeded rows carry before Phase 4 reads it.
- Phase 3 to 4 gap: a Discovery tier can have need rows before raiders have a picker.
- Research flags: Phases 3, 5, 6 and 8 need `/gsd-plan-phase N --research-phase`.

## Deferred Items

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| Scoring | Preparation or performance score per attendance sheet (0, 0.5, 1) as an additive component that defaults to zero for existing guilds | Deferred | Phase 02 | post-v2.0 |
| Scoring | Split bad luck protection timers by upgrade size (weapon or trinket, tier, minor slots) | Deferred | Phase 02 | post-v2.0 |

## Session Continuity

Last session: 2026-10-21T22:26:50.690Z
Stopped at: Completed 03-18-PLAN.md
Resume file: None
