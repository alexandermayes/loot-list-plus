---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: "WoW Forever Loot: Discovery to Known"
current_phase: 04
current_phase_name: Discovery Lists and Score Split
status: verifying
stopped_at: Phase 4 executed (21/21 plans); verification human_needed (5/5 success criteria in code, 0 gaps); code review 1 critical / 7 warning / 6 info; run /gsd-verify-work 4
last_updated: "2026-11-11T08:18:08.644Z"
last_activity: 2026-11-10
last_activity_desc: Phase 04 execution started
state_head: a975aba7a3aa377098375c583f1e5bef92923086
progress:
  total_phases: 8
  completed_phases: 2
  total_plans: 62
  completed_plans: 62
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
**Current focus:** Phase 04 — Discovery Lists and Score Split

## Current Position

Phase: 04 (Discovery Lists and Score Split) — EXECUTING
Plan: 21 of 21
Status: Phase complete — ready for verification
Last activity: 2026-11-11 - Completed quick task 261111-kgu: Phase 4 review warnings WR-03 to WR-07 and info findings IN-01 to IN-06 fixed on fix/phase-4-review-warnings (PR #511, open; IN-01 holds DRAFT copy); WR-08 left to the owner

Progress: [████░░░░░░] 3/8 phases ([████████████████████] 41/41 plans, [███░░░░░░░] 25% of planned); Phase 01: 9/9 plans, UAT 4/4 passed, 45/45 threats closed; Phase 02: 13/13 plans, UAT 5/5 passed, 63/63 threats closed, code review 0 critical / 6 warning; Phase 03: 19/19 plans, UAT 4/4 passed (human_needed), code in PR #477; Phase 04: 1/21 plans, executing

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
| Phase 03 P19 | 10 min | 2 tasks | 4 files |
| Phase 03 P12 | 12 min | 3 tasks | 2 files |
| Phase 03 P13 | 11 min | 3 tasks | 9 files |
| Phase 03 P14 | 14min | 2 tasks | 3 files |
| Phase 04 P01 | 7 min | 3 tasks | 5 files |
| Phase 04 P03 | 8min | 3 tasks | 7 files |
| Phase 04 P05 | 6 min | 2 tasks | 7 files |
| Phase 04 P06 | 5 min | 2 tasks | 2 files |
| Phase 04 P07 | 9 min | 3 tasks | 7 files |
| Phase 04 P17 | 25 min | 2 tasks | 5 files |
| Phase 04 P04 | 4min | 2 tasks | 2 files |
| Phase 04 P10 | 14min | 3 tasks | 8 files |
| Phase 04 P12 | 22 min | 2 tasks | 6 files |
| Phase 04 P18 | 7 min | 3 tasks | 8 files |
| Phase 04 P21 | 8 min | 2 tasks | 6 files |
| Phase 04 P14 | 15 min | 2 tasks | 7 files |
| Phase 04 P02 | checkpoint-gated | 3 tasks | 1 files |
| Phase 04 P08 | 12min | 3 tasks | 7 files |
| Phase 04 P09 | 8min | 3 tasks | 8 files |
| Phase 04 P15 | 5 min | 3 tasks | 8 files |
| Phase 04 P11 | 15min | 3 tasks | 13 files |
| Phase 04 P16 | 22min | 3 tasks | 8 files |
| Phase 04 P13 | 11min | 2 tasks | 9 files |
| Phase 04 P20 | 18min | 3 tasks | 8 files |
| Phase 04 P19 | 12 min | 3 tasks | 24 files |

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
- [Phase 03]: 03-19: bulk award route, history-row builders and both Discord helpers handle need rows; no reader fix needed (Reader fixes for 03-12: none); post-raid summary renders the plain need name, not bold — Fixture tests past the D-22 hold pass against unchanged source, matching research E3 and E5; the summary has never bolded item names
- [Phase 03]: 03-12: enforce_loot_item_need_rules is listed as a SQL branch reader; findBadVia requires every via file to be an exclude entry; reader and boss_name inventories fail CI on any unlisted file
- [Phase 03]: 03-13: sync reads matched tiers' need keys before any write; write order is tier insert, flip (Known to Discovery, no need rows), then seed; dry run counts new-tier rows via placeholder ids — The database refuses a need row in a non-Discovery tier (D-17); a failed read must leave the expansion untouched
- [Phase 03]: 03-14: list_mode PATCH makes every decision before the first write; switch to Discovery is switch, seed, compensate; ownership check runs for every field
- [Phase 04]: 04-01: migration kept as 20261111120000_need_lists.sql; the raid tier delete guard is a plain data predicate (no trigger depth rule), a removed ranking counts, and loot_style has no default so existing rows stay null — delete_guild clears lists and loot history before expansions, so the guild master can still delete while browser deletes of ranked or awarded Discovery tiers are refused (WR-04)
- [Phase 04]: 04-03: a spec name that does not resolve to a specMapping key is treated like no spec (union of the class's roles); unknown class gets no needs
- [Phase 04]: 04-03: need budget counts distinct (rank, need_key) picks once; class tables are frozen Maps and Sets so prototype names answer nothing
- [Phase 04]: 04-05: standing part order puts bad luck protection before officer bonus to match the owner's locked sentence; sign off at 04-19
- [Phase 04]: 04-06: presetMatches is an empty presetDiff, so the replace-settings confirm count and the Customised badge share one definition of different — One comparison, two surfaces; an empty or non-numeric string never equals a numeric knob because Number('') is 0
- [Phase 04]: 04-06: applyLootStyle returns Omit<T, knob keys and loot_style> & knobs & loot_style, and LootStyleKnobs is a type alias — T & knobs collapsed to never when settings carried loot_style: null; aliases get the implicit index signature the compare helpers need
- [Phase 04]: 04-07: id-list reads chunk at 100 per .in() through selectAllPagesOrThrow; a failed page is a 500, never an empty list — A Forever phase asks for up to 435 need ids; PostgREST carries them in the URL (WR-02)
- [Phase 04]: 04-07: prio-list refuses need rows on POST (400) and drops them on GET; proxy next keeps the query string — D-03 officer prio does not apply to needs; D-24 Set your 5 link must survive sign-in
- [Phase 04]: 04-17: mixed-mode note counts guild-active tiers only across the resolved phase group, matching D-12 — Raiders get the picker when every guild-active tier is Discovery, so a turned-off tier must not raise a note that is false for them
- [Phase 04]: 04-17: list-mode success updates the tier in local state and revalidates the raid-tiers and loot-items SWR keys instead of reloading the page — Avoids the full-page skeleton flash and keeps focus on the control
- [Phase 04]: 04-04: spec defaults are frozen object literals through a freezing helper; matchesSpecDefault treats reordered, partial or empty lists as edits
- [Phase 04]: 04-10: optionState takes a third { value, need } argument so the host can tell a duplicate need from a budget problem; the picker opens the sheet with an empty value plus currentNeedKey so decided answers are not skipped
- [Phase 04]: 04-10: Modal placement is additive ('center' default pinned by exact class assertions); 'In your 5' is a tag beside the option label, not a replacement
- [Phase 04]: 04-12: ScoreSplit rows variant is the two sentences only; the candidate modal keeps the GH #357 raider bonus reason on its own line under them — Sentences already carry label and number and the modal shows numbers in columns; the standing sentence only carries the bonus amount, so the reason would otherwise vanish
- [Phase 04]: 04-18: Set your 5 route error strings live in domain/loot/set-your-five.ts because a Next route file may only export handlers and config; the audit row is written right after the channel post so the 60-minute cooldown holds if the function is cut off mid-send
- [Phase 04]: 04-21: need lines take their tier set from the list's own need rows; review modal need lines are read-only; a need row with no need_key stays visible as an item row
- [Phase 04]: 04-14: ScoreComparisonModal takes optional decimalPlaces and config props so numbers and the attendance maximum follow the guild — The modal had a fixed toFixed(1) and no scoring config; the standing sentence would misstate attendance for non-default guilds
- [Phase 04]: 04-02: owner confirmed the five one-way doors, accepted the D-08 amended draft-only window and confirmed the 18 spec defaults on 2026-11-11; PR #506 merged, deploy run 42969511761 applied the need lists migration — Recorded in 04-02-SUMMARY.md; types hand-edited because gen:types drifted beyond loot_style
- [Phase 04]: 04-08: Hold removal and need budget plus eligibility checks shipped in one commit (D-08); refusals are 422 NEED_BUDGET_EXCEEDED then NEED_NOT_ELIGIBLE, before any write; need copy-cap violations collapse to one line per need
- [Phase 04]: 04-09: need_tier_slots rides in the items payload and slots are computed server-side over every tier of the phases, guild-off tiers included
- [Phase 04]: 04-15: creation treats loot_style null or missing as no preset; the settings PUT stores null as Custom — Creation has nothing to reset; in the PUT null is an explicit change
- [Phase 04]: 04-15: addon routes strip loot_style with a copy-and-delete helper so the remaining payload key order and bytes stay identical — D-30: Known guilds' addon payload must not change; avoids an unused-var rest sibling
- [Phase 04]: 04-11: picker page hides the editor's status banner, nudge, duplicate warning, guidance and How to rank button; rows are built for guild-active tiers only and turned-off tiers' saved rows are carried over on save
- [Phase 04]: 04-11: Looks right only when the list equals the spec default, nothing changed, the saved list reads back cleanly and status is none or draft; the picker key includes character, spec and phase
- [Phase 04]: 04-16: Replace your settings? confirm opens only when presetDiff is non-empty; no status shown until the settings row has loaded; creation Fine-tune is collapsed by default with the footnote always visible
- [Phase 04]: 04-13: Set your 5 card counts a submitted Discovery list in any Discovery phase as submitted; score widget interest is the highest pick still on the approved list and the widget keeps its approved-list visibility rule
- [Phase 04]: 04-20: unsaved edits show the Draft sentence except on a sent-back list, where the officer note stays visible; a read-only approved row is a plain div; the save error Alert uses text-foreground on the destructive variant
- [Phase 04]: 04-20: loadFailed added to LootListContext so a failed list read shows the load error instead of a default list that a save would overwrite
- [Phase 04]: 04-19: owner signed off all Phase 4 copy, the three preset knob tables and the changelog entry as written on 2026-11-11; changelog keeps placeholder date until the ship date is named — Hard Constraint 2; the four carried questions keep their built defaults and stay open as follow-ups

### Pending Owner Inputs

- Oct 21: Forever boss names (Phase 2); addon scope and owner for the separate repo (Phase 5); community asks for in-game loot list viewing through the addon without a web login (addon scope input)
- Oct 26: spec defaults review and copy sign-off for picker, presets, "Set your 5" (Phase 4); simplicity audit scope and sidebar direction (Phase 8); community input for the Phase 4 presets review: how often raiders may re-rank need rows within a tier; a council-style preset that shows attendance, bad luck protection and a future preparation score side by side
- Nov 9: beta guild, named paper-fallback officer, void rule (Phase 7); master loot or Gargul export scope (Phase 5)
- Oct 27: armory gear sync after the NO-GO spike (quick 261026-wpw): base item level from the static-classic item endpoint, the summary's average item level, or drop it; and whether to keep the probe script on feat/armory-item-level

### Blockers/Concerns

- [Phase 1 follow-up] `lib/addon/sync-tokens.ts` stays on the untyped service-role client (accepted library debt) and the E-17 select-string columns were left for human review; neither blocks Phase 2.
- [Phase 2, shipped] Phase 2 reached main on 2026-10-19 through PRs #445, #447, #446, #450, #451, #449, #452, #453 and #454 (planning docs in #444). The first Refresh wago snapshot run pulled build 1.60.1.70450; Onyxia was promoted from encounter 1084 and the allowlist holds the 8 Barrow Deeps bosses (PR #455, PROVISIONAL_CEILING 8). GitHub Actions may now open the weekly snapshot PR itself. Still owed: the owner runs `npm run sync:forever` then `-- --apply` against production (UAT test 3), and the Barrow Deeps and Hyjal Summit boss names are due 2026-10-21.
- [Phase 2, shipped] Code review warnings WR-01, WR-02, WR-03, WR-04 and WR-06 were fixed before shipping (02-REVIEW-FIX.md); WR-05 stays an accepted risk (R-02-05). Open residual items from 02-SECURITY.md: pin the Forever raid mapIds once known, and add the schema modules to the client-safe scan (residual risks 5 to 9).
- [Phase 1, shipped] Phase 1 reached main through PR #456, cherry-picked onto main with both #355 list merging and the Phase 1 typed-client, paging and read-error 500 behaviour kept. `lib/addon/sync-tokens.ts` and `lib/addon/raid-night.ts` still use the untyped client (outside the route scan, accepted debt).

- Phase 3: research lists two cost schemes for need rows (an allocation cost of 1/1/0, and a budget at Big 3, Medium 2, Standard 1). Settle which one the seeded rows carry before Phase 4 reads it.
- Phase 3 to 4 gap: a Discovery tier can have need rows before raiders have a picker.
- Research flags: Phases 3, 5, 6 and 8 need `/gsd-plan-phase N --research-phase`.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 261026-wpw | v1 armory gear sync (spike verdict NO-GO: the Classic equipment API returns no per-slot item level, 0 of 90 items across 6 characters; tasks 2 and 3 not built; the alternative is an owner decision) | 2026-10-27 | a11e3d86 (spike script, branch feat/armory-item-level) | [261026-wpw-v1-armory-gear-sync-spike-battle-net-cla](./quick/261026-wpw-v1-armory-gear-sync-spike-battle-net-cla/) |
| 261027-lzm | Base item level cache from Game Data for armory gear sync | 2026-10-27 | ef7715d4, 0e21e509 | [261027-lzm-base-item-level-cache-from-game-data-for](./quick/261027-lzm-base-item-level-cache-from-game-data-for/) |
| 261027-fast | Changelog entry for the Equipped column (October 27, 2026 entry in lib/updates-data.ts; the changelog, updates page, landing line, sitemap lastmod and Discord updates cron all read it) | 2026-10-27 | 3c5356ac (branch feat/changelog-equipped-item-level, PR #466) | none (gsd-fast, no PLAN or SUMMARY) |
| 261028-0gx | Award slot lock: keep awarded loot list ranks locked for the tier (opt-in guild setting; migration PR #468, code PR #469) | 2026-10-28 | 3df61a15 (feat/slot-lock-migration), a5a869d4, 8713c671 (feat/award-slot-lock) | [261028-0gx-award-slot-lock-keep-awarded-loot-list-r](./quick/261028-0gx-award-slot-lock-keep-awarded-loot-list-r/) |
| 261028-fast | Sync gear button in the edit character modal (the only button lived on the unlinked /characters/[id]/edit page; EditCharacterModal now shows the Battle.net gear sync card for linked characters, officer feedback 2026-10-28) | 2026-10-28 | cf0c1d61 (branch fix/sync-gear-in-edit-modal, PR #472) | none (gsd-fast, no PLAN or SUMMARY) |
| 261028-fast-2 | Changelog entry for October 28, 2026 (Lock awarded ranks and Sync gear from Manage Characters in lib/updates-data.ts; the changelog, updates page, landing line, sitemap lastmod and Discord updates cron all read it) | 2026-10-28 | b4bee9a8 (branch feat/changelog-slot-lock-sync-gear, PR #475) | none (gsd-fast, no PLAN or SUMMARY) |
| 261106-0cj | Discord bot starts without the Message Content intent (PR #482) | 2026-11-06 | 60cfa2c2 | [261106-0cj-discord-bot-starts-without-the-message-c](./quick/261106-0cj-discord-bot-starts-without-the-message-c/) |
| 261109-tr1 | BiS import respects officer class prio (GH #484): one prio zone rule (domain/loot/prio-zones.ts) for the editor pools and Import BIS; TBC BiS neck data fixed on owner request (30 replaced, 15 removed, test-pinned) | 2026-11-09 | 94b989bf, 06773684 (branch fix/bis-import-respects-prio, PR #485, merged 2026-11-10 as 4eaa04ed) | [261109-tr1-bis-import-respects-officer-class-prio-g](./quick/261109-tr1-bis-import-respects-officer-class-prio-g/) |
| 261110-g5c | GH #484 follow-ups: Import BIS covers the whole phase group (PR #493), reports the BiS items prio kept out (PR #492, DRAFT copy), officer prio enforced at submit with an editor marker and a read-only count script (PR #494, DRAFT copy), TBC BiS non-neck data audited (316 entries fixed, test-pinned, PR #496), Dependabot alerts patched within majors (PR #495; minimatch needs a major, extract-zip has no patch) | 2026-11-10 | 6f67f8e5, 2a9340b3, 446d45d6, 5be3f6e7, 26ffb094 (five branches from 27be305d, all merged 2026-11-10: #493 f9bcfdba, #495 792a54c1, #492 6466408a, #494 7e17b8fe, #496 89bae71e; copy signed off by the owner) | [261110-g5c-gh-484-follow-ups-bis-phase-groups-prio-](./quick/261110-g5c-gh-484-follow-ups-bis-phase-groups-prio-/) |
| 261110-fast-3 | Retired Haiku model: web feedback titles, Discord feedback titles, duplicate detection and /help move from claude-3-5-haiku-20241022 (retired 2026-02-19) to claude-haiku-4-5-20251001; the Railway bot needs its own redeploy and a HELP_MODEL check (PR #442, open since 2026-10-18, rebased, CodeQL and test loader fixed) | 2026-11-10 | b5caf318 (branch fix/anthropic-haiku-retirement, PR #442) | none (gsd-fast, no PLAN or SUMMARY) |
| 261110-fast-4 | CI robustness: asyncUtilTimeout 4 s and testTimeout 15 s after the modal close and brand parity tests failed three times under runner load; eslint ignores companion/out/** (PR #499) | 2026-11-10 | 094f823b (branch fix/ci-test-timeouts, PR #499) | none (gsd-fast, no PLAN or SUMMARY) |
| 261110-fast-5 | Audited reopen of reviewed lists: POST /api/loot-submissions/reopen replaces the browser-side draft demotion that wrote no audit row (deferred item 03-06 #3 from the research-report drift); copy signed off by the owner (PR #500) | 2026-11-10 | 03c3d762 (branch fix/audited-list-reopen, PR #500) | none (gsd-fast, no PLAN or SUMMARY) |
| 261110-fast | Retire Railway Config as Code before the 2026-12-01 cutoff (deleted the repo-root railway.json and the unused nixpacks.toml; the bot service now builds from its dashboard settings, which matched the file except the builder: Railpack instead of Nixpacks) | 2026-11-10 | aef59908 (branch fix/retire-railway-config-as-code, PR #487) | none (gsd-fast, no PLAN or SUMMARY) |
| 261110-fast-2 | Unblock the weekly Refresh wago snapshot (failed Oct 19 to Nov 9 on the branch PR #455 left behind; the job now rebuilds over a tip that is the head of a merged PR) and point the Forever manifest at the live wago product wowf; snapshot regenerated to build 1.60.1.70888, rows unchanged, no promotable bosses. Live client has no map named Barrow Deeps or Hyjal Summit, so boss promotion needs pinned mapIds. Four hand-edited files, one over the gsd-fast limit. Merged 2026-11-10 on the owner's go-ahead (admin bypass of the review rule) | 2026-11-10 | 6b66e4d1 (branch fix/wago-snapshot-refresh, PR #489) | none (gsd-fast, no PLAN or SUMMARY) |
| 261110-fast-3 | Offer the Roleplay PvP ruleset at WoW Forever guild setup (Blizzard's ruleset article, updated 10/22: it launched Nov 4; additive only, Hardcore stays, stored values still parse). The owner signed off the label Roleplay PvP (Blizzard's name; Roleplaying PvP was the alternative) by asking for PR #490 to be merged on 2026-11-10 (admin bypass of the review rule) | 2026-11-10 | 8468fb46 (branch fix/forever-roleplay-pvp-ruleset, PR #490) | none (gsd-fast, no PLAN or SUMMARY) |
| 261110-fast-6 | Battle.net picker tells WoW Forever guilds it is not available yet: for a Forever guild BattlenetCharacterPickerModal makes no Battle.net request and shows "Not available for WoW Forever yet" with an import or link line, so a Classic character can no longer be imported or linked into a Forever guild (the app has no Forever namespace; community probing on Blizzard's API forum, Nov 2, found profile-forever lists account characters with a name and surname but per-character lookups 404). New component test. The copy awaits the owner's sign-off on PR #504. Id is -6 because 261110-fast-3 is already used twice (the Haiku retirement and Roleplay PvP rows) | 2026-11-10 | cacef2f4 (branch fix/battlenet-forever-not-available, PR #504) | none (gsd-fast, no PLAN or SUMMARY) |
| 261111-kgu | Phase 4 code-review follow-ups: WR-03 deadline on every Discord call of the Set your 5 send, WR-04 cooldown reserved before the post and failing closed, WR-05 one .in() chunk constant (100), WR-06 item_ids bounded at 2000 and UUID-checked in the visibility route, WR-07 locked phases ignored by the card, the send row and the send; IN-01 audit label (DRAFT copy), IN-02 date note, IN-03 decimal_places ?? 2, IN-04 token after permission, IN-05 one withoutLootStyle, IN-06 cast dropped; WR-08 left to the owner | 2026-11-11 | 57e442b8, a7ea36f9, b076867c, b0329108, d723abc2, 33892c71, d9ef1e95, ab6c8d55, 6eba6480, d1e8aae1, 4d5e701a (branch fix/phase-4-review-warnings from b0aa333e, PR #511, open) | [261111-kgu-fix-the-open-phase-4-code-review-finding](./quick/261111-kgu-fix-the-open-phase-4-code-review-finding/) |

## Deferred Items

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| Scoring | Preparation or performance score per attendance sheet (0, 0.5, 1) as an additive component that defaults to zero for existing guilds | Deferred | Phase 02 | post-v2.0 |
| Scoring | Split bad luck protection timers by upgrade size (weapon or trinket, tier, minor slots) | Deferred | Phase 02 | post-v2.0 |

## Session Continuity

Last session: 2026-11-11T08:18:08.274Z
Stopped at: Phase 4 executed (21/21 plans); verification human_needed (5/5 success criteria in code, 0 gaps); code review 1 critical / 7 warning / 6 info; run /gsd-verify-work 4
Resume file: .planning/workstreams/forever/phases/04-discovery-lists-and-score-split/04-UAT.md
