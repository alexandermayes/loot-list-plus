# Phase 4: Discovery Lists and Score Split - Research

**Researched:** 2026-11-10
**Domain:** Next.js 16 App Router + Supabase (Postgres, RLS) loot-list product: a phone-first five-row need picker that fans out to per-tier `loot_submission_items` rows, a 10-point budget, spec defaults and eligibility, a standing/interest score split, loot-style presets, and a Discord "Set your 5" sender.
**Confidence:** HIGH for every in-repo fact (all opened this session, quoted below); MEDIUM for the eligibility matrix, preset knob values and Discord throttling, which are marked `[ASSUMED]` and listed in the Assumptions Log.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Carried forward from Phase 3 (not re-asked; see `03-CONTEXT.md` and the 03-xx summaries)
[informational] Need rows are `loot_items` rows with `kind = 'need'`, a stable `need_key`, cost in `allocation_cost` (Big 3, Medium 2, Standard 1) and a mirrored `classification` (Phase 3 D-06, D-08). One row per need key per Discovery tier; the frozen 145-key taxonomy in `domain/loot/needs.ts` is the single source (Phase 3 D-11, D-12). Forever tiers start in Discovery (D-01); switching back to Known is blocked once a need is ranked or awarded (D-03). Need rows are outside the bracket rules (03-04) and keep their copy caps (two Ring or Trinket needs, one of anything else). Reserves, BIS import, addon and companion exports and bot `/priority` stay item-only (D-14). A need award records `loot_history.loot_item_id` = the need row and `awarded_item_id` null until the Desk (D-15). Display names, `NEED_RANKING_HOLD_ERROR`, `NEED_ROW_FIXED_ERROR`, `RESERVES_UNAVAILABLE_ERROR` and the two list-mode reason strings are proposed copy still awaiting the owner's sign-off, which now happens with the Phase 4 copy review.

#### Ranking shape
- **D-01:** The five main-spec needs sit at ranks 50, 49, 48, 47 and 46 (need #1 = rank 50), so `interest` runs 50 down to 46 and need #1 scores 4 points above need #5, the same size as the attendance range. The position-to-rank mapping is one pure function in `domain/loot` so it can be retuned later. — **Reversibility:** costly — rank values are stored in `loot_submission_items` and in approval snapshots; a retune changes the interest of every existing Discovery list.
- **D-02:** All three Forever raids are Phase 1, so one `loot_submissions` row (character, guild, expansion, phase) holds the five needs times every Discovery tier in the phase group: 15 live rows. At each need's rank, each Discovery tier takes one slot (slot 1, 2, 3 in a stable tier order chosen at save time). The slot is a uniqueness device only; every reader resolves the tier through the need row's `raid_tier_id`, never through the slot number. The Phase 4 migration widens the `loot_submission_items.slot` check from 1..2 to 1..8 (NOT VALID then VALIDATE), and `save_submission_items` is updated in the same migration if it checks the slot. — **Reversibility:** one-way — a check constraint change and stored slot values above 2 that the Known editor never produces.
- **D-03:** Officer class prio pools do not apply to need rows. A need is open to every class and spec that can use its slot, armour class and stat family; need rows carry no `loot_item_classes`, `findPrioViolations` never flags one, and `POST /api/loot-items/specs` keeps refusing need rows with `NEED_ROW_FIXED_ERROR`. Officers steer with priority bonuses later, not by locking needs.
- **D-04:** Phase 4 ships the five main-spec rows only. The "Off-spec gear too" toggle (need rows at off-spec ranks 24 and below, which already rank under every main-spec need) and "Count me in for rare drops" arrive with the Drop Desk (Phases 5 and 6), where they are read.
- **D-05:** Re-ranking works like an item list: any change goes back through pending and officer approval (approve, reject and the audited reopen route all apply). Award slot locks apply to need rows only when the guild has `award_slot_lock_enabled` on; the lock lands on the (rank, slot) row of the awarded tier's need row, so `pickLockTarget` and `findLockViolations` work unchanged.

#### Budget
- **D-06:** The budget is fixed at 10 points in Phase 4 (`NEED_BUDGET_POINTS` in a new `domain/loot/need-budget.ts`), not a guild setting. Cost is summed once per picker position over the five rows, read from the need row's `allocation_cost` (identical across tiers), never once per tier. Fine-tune may expose the budget later without a schema change now.
- **D-07:** The picker blocks a save that goes over budget and the submit route refuses one with 422 through the same pure check, so no API caller can rank an over-budget list. The budget sentence is proposed copy for sign-off: "8 of 10 points used." and, when a pick would go over, "That's three big picks. Swap a weapon or trinket for armour." Copy caps still apply: a second Ring or Trinket need costs again.
- **D-08:** The D-22 hold (the `isHeldNeedRanking` call in the submit route, `domain/loot/need-ranking-hold.ts` and its test, and the `enforce_need_ranking_hold` trigger and function) is lifted in the same code PR that adds the submit-side budget check, after the migration that drops the trigger is live, so there is no window in which a need can be ranked without a budget.

#### Defaults and eligibility
- **D-09:** Spec defaults are a frozen data file, `domain/loot/need-defaults.ts`: one ordered list of five need keys per spec, keyed by the `class_specs` name and class, gated by a test (exactly five keys, within budget, every key in `NEED_DEFINITIONS`, every key eligible for that spec under D-10). The owner reviews the file before its PR merges (the Decision 5 input, with Enhancement Shaman and Feral called out); later edits are PRs. No per-guild editing (scope creep, noted under deferred).
- **D-10:** Eligibility is one pure function in `domain/loot` (for example `eligibleNeedsFor({ className, specName })`): only slots the class can equip (weapon and shield proficiency from `data/class-proficiencies.ts`, off-hand items, relics and ranged by class), armour classes up to the class maximum with lighter armour allowed, and stat families the spec's roles can use. Hidden rows are never offered and the submit route refuses a need outside the character's eligible set. The exact matrix is Claude's discretion, reviewed with the defaults file.
- **D-11:** "Looks right" is the primary button while the list equals the spec default and nothing has changed; "Save my 5" after any edit. A raider who already has a Discovery list opens it as saved. A spec with no default (a spec the taxonomy cannot serve) opens an empty picker with the five rows to fill.

#### Picker surface
- **D-12:** `/loot-list` renders the five-row picker instead of the 50-rank editor when every guild-active tier in the selected phase group has `list_mode = 'discovery'`; Known phase groups keep the editor byte-for-byte. A mixed group cannot occur (Phase 3 D-17 keeps legacy tiers Known) and fails closed to the editor with needs hidden. The bootstrap route returns `list_mode` per tier and passes `{ includeNeeds: true }` to `fetchFilteredLootItems` only for Discovery tiers; `GET /api/loot-items` does the same. No new page.
- **D-13:** The master sheet, Summary and Raid Mode keep showing only needs someone has ranked (`keepRankedNeedRows` stays), so a tier with 145 seeded rows shows 10 to 30 rows, not 145. The Phase 3 handoff "stop calling keepRankedNeedRows" is closed as "keep".
- **D-14:** The Overview page shows a "Set your 5" card to a raider in a Discovery guild whose character has no submitted Discovery list; it links to the picker. The same card copy is reused by the Discord message.
- **D-15:** The officer list-mode control held by Phase 3 D-02 ships now: in `app/(app)/expansions/[expansionId]/_client.tsx` beside the guild-active and master-sheet toggles, gated by `manage_settings`, calling `PATCH /api/raid-tiers` with `{ list_mode }`; the 409 and 400 reasons from the route are shown as they come back.
- **D-16:** The picker's question flow (slot, armour class where it matters, stat family) is built as one reusable component with a controlled value so the Drop Desk can classify a drop with the same component in Phase 5. Phone first: one column, tap targets, no drag on mobile, verified at 375px.

#### Presets
- **D-17:** Three loot style presets under the research names, held as draft copy for sign-off: "Reward attendance", "Even rotation" and "Officers decide, score advises". Each is a frozen map of `guild_settings` scoring knobs (attendance type and bonuses, signup weight, bad luck protection on or off and its increment and maximum, guild rank and role bonuses on or off, pass and see item bonuses, slot restriction enforcement) in a pure module such as `domain/guild/loot-style-presets.ts`. The exact knob values are Claude's discretion, proposed in the plan and reviewed by the owner with the copy. The community's council-style preset (attendance, bad luck protection and a preparation score side by side) waits for the preparation score component, which is deferred past v2.0.
- **D-18:** The chosen preset is stored in a new nullable `guild_settings.loot_style` column (text, check constraint on the three ids) added by the Phase 4 migration. Applying a preset writes the knobs and the column through the existing guild-settings PUT. "Customised" is computed by comparing the live knobs to the preset map, never stored, so a Fine-tune change shows as "Customised" without clearing the choice. Existing guilds have `loot_style` null and show "Custom" until an officer picks one; their knobs are never touched by the migration. — **Reversibility:** one-way — a new column.
- **D-19:** Presets appear in the guild creation settings step (`CreateGuildModal`) and at the top of the scoring settings in Guild Settings, with "Fine-tune" as a disclosure that reveals the existing knobs unchanged. Picking a preset in Guild Settings asks for confirmation when it would change knobs an officer already customised.

#### Score split
- **D-20:** `computeScore` returns `{ total, components, standing, interest }`: `interest = components.itemRank`, `standing = total - interest` (attendance, rank, role, bad luck protection, priority, trial, donation and raider bonuses). The total formula is unchanged and no component is added in Phase 4 (the slot-weighted loot cost of PLAT-02 stays out), so `LOOT_SCORE_FIXTURES`, `engine-contracts.test.ts`, the golden seeder rows and the Lua fixture exporter (`domain/scoring/__tests__/export-fixtures.ts`) are byte-identical and the award receipt whitelist needs no new key.
- **D-21:** `explainScore` adds `standing` and `interest` with one plain sentence each (draft copy: "Standing 7.5: attendance 3 of 4, bad luck protection 2, officer bonus 2.5." and "Interest 50: your number 1 pick."), and every score surface shows the two side by side with the total: the Overview score widget, the master sheet tooltip and candidate modal, and the score comparison modal, for every guild (Known and Discovery), since the total is the same number. The bot `/score` stays attendance-only (its v1 scope) and the Discord embeds are unchanged.
- **D-22:** For a need row the interest sentence names the need position ("your number 2 pick") and the standing sentence is the same as for an item; no Discovery-only scoring branch exists.

#### Discord "Set your 5"
- **D-23:** The app sends it; the bot is not changed and Railway does not redeploy. An officer button in the Discord section of Guild Settings, shown only when the active expansion has a Discovery tier, posts one message with a link button to the guild's raid summary channel and DMs every active member whose profile has a Discord id, through `lib/discord.ts` (`discordFetch`, `sendDirectMessage`). DM refusals (403, code 50007) are quiet; the result shows counts only (sent, skipped), never names. Draft copy: "Set your 5 for Forever raids (1 minute)".
- **D-24:** The link is `${NEXT_PUBLIC_APP_URL}/loot-list?guild=<guild_id>&picker=1`, no character id and no token. The app opens the picker for the member's main character in that guild; a signed-out raider signs in first and lands there through the existing post-auth redirect. A member with no character in the guild lands on the create-character path.

#### Schema and Phase 3 warnings
- **D-25:** One Phase 4 migration-only PR, expand-only, `--admin` merge on a non-raid day, live before any code PR that depends on it: drop trigger and function `enforce_need_ranking_hold`; widen the `loot_submission_items` slot check to 1..8 (and `save_submission_items` if it checks the slot); add `guild_settings.loot_style`; add a WHEN-gated `BEFORE DELETE` guard on `raid_tiers` so an anon or authenticated session cannot delete a Discovery tier that has need rankings or need awards (closes WR-04; service role and `delete_guild` pass as D-27 does). The PGlite behaviour proofs and the migration contract test are extended for each item. — **Reversibility:** one-way — dropped trigger, widened check, new column, new guard.
- **D-26:** Closed before the hold lifts, in the first code PR: WR-02 (the master sheet visibility BLP GET carries ranked need ids in chunks or in a POST body, and the page-loop error is checked and answers 500), WR-01 (`PATCH /api/raid-tiers` applies other fields and the mode switch so a later failure cannot leave a half-applied request), WR-03 (the prio-list route selects `kind` and filters or branches on it so its need test can fail). WR-05 (reserve-run tier ownership) is fixed in the same PR as a small cross-guild check.
- **D-27:** "Looks right" and "Save my 5" save through the existing `save_submission_items` RPC and then submit through `POST /api/loot-submissions/submit`, so the list goes to pending for officer review with the same approve, reject and reopen paths as an item list; nothing is auto-approved.

### Claude's Discretion
- The exact eligibility matrix (D-10) and the exact five-key default per spec (D-09), proposed from the taxonomy and spec roles and reviewed by the owner.
- The exact knob values behind each preset (D-17).
- The stable tier-to-slot order at save time (D-02) and the chunk size or body shape for the WR-02 fix (D-26).
- The picker's bottom-sheet question flow, icon set and card layout, within the UI design contract (`/gsd-ui-phase 4`).
- How the Overview card and the deep link share one entry component (D-14, D-24).
- Whether the submit route's eligibility refusal (D-10) reuses the prio-violation response shape or adds its own code.

### Deferred Ideas (OUT OF SCOPE)
- Off-spec need rows ("Off-spec gear too") and the "Count me in for rare drops" flag: Phases 5 and 6 with the Drop Desk, where they are read (D-04).
- Guild-tunable need budget under Fine-tune (D-06): later, no schema now.
- Per-guild editing of spec defaults by officers (would need a table and UI): post-v2.0 backlog.
- Council-style preset showing attendance, bad luck protection and a preparation score side by side: after the preparation score component (deferred post-v2.0 in Phase 2).
- Slot-weighted loot cost component (PLAT-02): later milestone; no `lootCost` in `ScoreComponents` now (D-20).
- Bot `/priority` for need rows and bot `/score` beyond attendance: Phase 5 and later.
- Raid-tracking event edit re-import drops need awards (Phase 3 deferred item): Phase 5 planning must carry it.
- A `/setmy5` bot slash command: not needed while the app sends the link (D-23); revisit if raiders ask for it.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DISC-02 | Raider fills one five-row, one-column need picker in under 60 seconds on a phone | Topic 1 (save path through `rankings` map, RPC, submit), Topic 3 (pure position/fan-out, eligibility, defaults), Topic 8 (375px proof), UI-SPEC components in `04-UI-SPEC.md` |
| DISC-03 | Raider sees a points budget as one sentence and cannot exceed it | Topic 3 (`need-budget.ts`: distinct (rank, need_key) sum), Topic 1 (422 in submit beside the prio check), pitfalls P1 and P2 |
| DISC-04 | Raider gets a spec default and accepts it with one tap | Topic 3 (defaults file and gate; verified: 18 of 19 FEATURES rows fit 10 points, Shadow Priest costs 11), Open Question 1 |
| DISC-05 | One picker fans out to every Discovery tier | Topic 1 and Topic 3 (slot order by `sort_order`, id), Topic 2 (slot check 1..8, probe-proven RPC save at slot 3) |
| DISC-08 | Standing and interest shown separately, totals unchanged for Known guilds | Topic 4 (engine, explain, three hand-built `ScoreResult` callers, Lua byte-diff proof) |
| DISC-10 | Officer picks one of three loot style presets, Fine-tune behind a disclosure | Topic 3 (preset module, "Customised" compare), Topic 6 (settings live in the Loot system settings modal, `POST /api/guilds` for creation), Topic 2 (`loot_style` column) |
| DISC-11 | Raider can open the picker from a Discord "Set your 5" link | Topic 5 (sender route, deep link, proxy.ts drops the query string: finding F2) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Source: `.claude/CLAUDE.md` in the worktree (system-reminder content, read this session) and `04-CONTEXT.md` standing constraints.
- Pure rules live in `domain/`; `app/api/**/route.ts` validates auth and input, then calls domain code. Files kebab-case, components PascalCase, tests in `__tests__/` as `name.test.ts(x)`, import through `@/`, never `../../`.
- Every client query carries a `user_id` filter because RLS is the security boundary; the service-role client is for API routes doing batch work only.
- Check before handing back: `npm run lint`, `npm run typecheck`, `npm test`.
- Comments say why, not what; keep `// regression for #NNN` references.
- Migration-only PRs need `--admin` merge; migrations auto-deploy about 12 seconds after merge; CodeQL blocks tainted format strings (relevant to any `format()` in the guard function: use `%s` with column values only, as the Phase 3 guards do).
- The owner signs off user-facing copy; no em dashes in user-facing text.
- This repo is public: no guild or player names, ids or tokens in tracked files or reports; counts and aggregates only.
- GSD workflow: all file edits go through a GSD command; planning docs reach `main` by PR only.
- Standing constraints 1 to 5 from `STATE.md`: expand-only migrations live before dependent code; owner signs copy; no names in analytics; Known guilds' score fixtures byte-identical; no live wago or Wowhead fetches.

## Summary

Phase 4 is mostly wiring and pure rules on top of a Phase 3 foundation that is merged and sound. The riskiest pieces are not the picker UI but four places where the CONTEXT assumptions meet existing code: (1) a signed-out Discord link loses its query string in `proxy.ts`; (2) the preset UI the CONTEXT places in "Guild Settings" actually lives in the Loot system settings modal, and guild creation goes through `POST /api/guilds`, not the settings PUT; (3) the Phase 3 PGlite test re-applies the Phase 3 migration after the chain, which would resurrect the hold the Phase 4 migration drops; (4) two of the five Phase 3 warnings (WR-01, WR-05) are already fixed and tested on main.

The save path needs no new server route: the picker maps five positions onto the existing `rankings` map keyed `"rank-slot"`, `LootListContext.saveSubmission(true)` upserts the one `loot_submissions` row, calls `save_submission_items` with 15 `{loot_item_id, rank, slot}` objects and then calls `POST /api/loot-submissions/submit`. `save_submission_items` never checks the slot value (the table check does), so the migration does not redefine it. A PGlite probe run this session (migration chain plus a draft of the Phase 4 file, PGlite 0.5.8) proved: the draft applies twice, a raider can rank need rows through the RPC at slot 3 once the hold is dropped, slots 0 and 9 are refused, a WHEN-gated predicate guard on `raid_tiers` stops an officer deleting a ranked Discovery tier directly or through an expansion delete, while an unranked Discovery tier, a Known tier and `delete_guild` by the creator still work.

The score split is a presentation-only change: the exporter that produces the Lua fixtures never calls `computeScore`, so the byte-diff proof is cheap. The split must not touch `DEFAULT_SETTINGS`, because the exporter dumps `getDefaultSettings()`.

**Primary recommendation:** Ship in this order: (1) migration-only PR with its proofs, inventory and types edits; (2) code PR 1 with WR-02, WR-03, the proxy `next` fix, the pure modules and the score split; (3) code PR 2 with the hold removal, budget and eligibility checks in submit, `includeNeeds` for Discovery tiers, the picker and the Overview card; (4) presets and the Discord sender. Treat WR-01 and WR-05 as regression tests that already exist, not work.

### Findings that change the plan

| # | Finding | Evidence | Effect |
|---|---------|----------|--------|
| F1 | WR-01 and WR-05 are already resolved on main with tests. D-26 shrinks to WR-02 and WR-03. | `03-REVIEW.md:153` "**Resolved 2026-10-28** in `0e309326`: the mode and the other fields travel in one update statement"; `app/api/raid-tiers/route.ts` update statements `.update({ ...otherUpdate, list_mode: 'known' })`; `app/api/raid-tiers/__tests__/route.test.ts:351` "[WR-01] a failed seed puts the other field back together with the mode"; `app/api/reserve-runs/__tests__/route.test.ts:416` "[WR-05] a guild run on another guild's Known tier answers like a missing tier" | Plan no fix for either; keep their tests green. [VERIFIED] |
| F2 | The signed-out redirect drops the query string, so D-24's "existing post-auth redirect" does not carry `guild` and `picker`. | `proxy.ts:318` `loginUrl.searchParams.set('next', pathname)`; `lib/post-auth-redirect.ts:34-58` `isSafeNextPath` accepts a path with a query (it parses `new URL(next, PLACEHOLDER_ORIGIN)`); `app/components/LoginPage.tsx:60-61` `const callbackUrl = nextParam` then `` `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextParam)}` ``; `app/auth/callback/route.js:9` `const next = searchParams.get('next') ?? null` | Change `proxy.ts:318` to `pathname + request.nextUrl.search` and add a test. One line plus a test. [VERIFIED] |
| F3 | The scoring knobs UI is the "Loot system settings" modal, not `GuildSettingsContent`. The modal autosaves an explicit field list. | `app/(app)/loot-management/components/SettingsModal.tsx:70` `<ModalTitle>Loot system settings</ModalTitle>`; `LootSettingsContent.tsx:359` `award_slot_lock_enabled: settings.award_slot_lock_enabled,` inside `safeSettings`; `04-UI-SPEC.md` UI-08 already resolves this | `loot_style` must be added to the `safeSettings` list, the settings state, and `ALLOWED_SETTINGS_FIELDS`. [VERIFIED] |
| F4 | Guild creation does not use the settings PUT and the creation modal holds no knobs. | `app/components/CreateGuildModal.tsx:363` `fetch('/api/guilds', { method: 'POST'`; `app/api/guilds/route.ts:213-222` inserts `attendance_type: 'linear', rolling_attendance_weeks: 8, use_signups: false, signup_weight: 0`; `app/api/guild-settings/route.ts:411` `evaluateGuildFunnel(serviceSupabase, guild_id, { lootSettingsUpdated: true })` | Send `loot_style` in the `POST /api/guilds` body and merge the preset knobs into that insert. Calling the PUT from the modal would mark the activation-funnel milestone `loot_settings_completed_at` for every new guild (`utils/analytics/funnel.ts:122`). [VERIFIED] |
| F5 | The Phase 3 PGlite test re-applies the Phase 3 migration after the whole chain, which would recreate the hold. | `app/services/__tests__/discovery-schema-pglite.test.ts:126` `await db.exec(fs.readFileSync(DISCOVERY_FILE, 'utf8'))` and the file `20261020120000_discovery_schema.sql:446-475` holds `CREATE OR REPLACE FUNCTION "public"."enforce_need_ranking_hold"()` and `CREATE OR REPLACE TRIGGER "enforce_need_ranking_hold"` | After the Phase 4 file exists the test DB end state is wrong unless the Phase 4 file is applied again after the Phase 3 re-apply. Update the Phase 3 test (guard list at line 70, describe at line 926) and put the new proofs in a new file with a clean chain. [VERIFIED] |
| F6 | The reader inventory scanner understands `DROP FUNCTION`, so dropping the hold function makes its inventory entry stale, and the new raid_tiers guard function names two inventoried tables. | `lib/loot/__tests__/need-reader-inventory.test.ts:1502` synthetic case "Created, then dropped: not listed"; entry `name: 'enforce_need_ranking_hold'` at line 962; `SQL_TABLE_PATTERN = /\b(loot_items|loot_submission_items|loot_history)\b/i` | Remove the hold entry, add the new guard function with disposition `guard`, `definedIn` the new timestamp, citing the new PGlite test. [VERIFIED] |
| F7 | Shadow Priest's FEATURES default costs 11 points under the shipped taxonomy (wands folded into the Big Ranged weapon row). Every other FEATURES row fits exactly 10. | `domain/loot/needs.ts:143` `{ key: 'ranged-weapon', display: 'Ranged weapon', itemSlot: 'Ranged', tier: 'big', families: ['agility', 'spell-damage', 'healing'] }`; a script run this session transcribed the 19 FEATURES rows to keys, resolved all of them with `findNeedDefinition`, and reported only "Shadow (wand folded to ranged) ... cost 11" | The D-09 gate test would fail on the research defaults; Shadow Priest needs a different fifth pick. [VERIFIED by script] |
| F8 | `computeScore` is not the only place a `ScoreResult` is built: three components rebuild it by hand from a flat ranking. | `app/(app)/master-sheet/components/BossSection.tsx:64` `function rankingToScoreResult(r: PlayerRanking): ScoreResult`; `app/components/ScoreComparisonModal.tsx:54` same name; `ItemCandidateModal.tsx:229` `explainScore({ total: r.loot_score, components: rankingToComponents(r) }, config, {` | Make `explainScore` derive standing and interest from `total` and `components.itemRank`, and give the three callers one exported helper so required fields on `ScoreResult` do not break them. [VERIFIED] |
| F9 | Do not add `loot_style` (or anything) to `DEFAULT_SETTINGS`. The Lua exporter prints it. | `domain/scoring/__tests__/export-fixtures.ts` `defaultSettings: getDefaultSettings(),`; baseline this session: `tsx domain/scoring/__tests__/export-fixtures.ts` prints 6875 bytes at `a07f5d4d` | Keep `loot_style` out of `ScoringConfig` defaults and `withDefaults`. [VERIFIED] |
| F10 | Member Discord ids come from `user_preferences.discord_id`; no app code reads `profiles.discord_id`. | `app/api/discord/notify-officers/route.ts:146` `.select('user_id, discord_id')` from `user_preferences`; `app/api/cron/resubmit-reminders/route.ts:111` `.select('user_id, discord_id, notify_resubmit_reminder')`; `lib/billing/purchaser.ts:45-48` reads `user_preferences`; grep of `app lib utils` finds no `profiles` read of `discord_id` | D-23's "profile has a Discord id" means `user_preferences`. Optional fallback to auth `user_metadata.provider_id` exists in notify-officers (lines 159-177). [VERIFIED] |
| F11 | `bootstrap` and the client `RaidTier` type carry no `list_mode` or `sort_order`. | `app/api/loot-list/bootstrap/route.ts:90` `.select('id, name, is_active, is_guild_active, submission_deadline, phase')`; `app/hooks/use-api.ts:197-204` `interface RaidTier` has no `list_mode`; `app/api/raid-tiers/route.ts:56` selects `list_mode` but not `sort_order` | Add both columns to both selects and the type. The picker cannot decide Discovery-or-editor without it. [VERIFIED] |
| F12 | The class and spec data is not enough for D-10 on its own, and "22 specs" does not match the data. | `data/class-proficiencies.ts` has weapons (including `'Shield'` and `'Wand'`) and `maxArmorType` only; `scripts/seed-class-specs.ts:33-45` seeds 23 `class_specs` names; Open Question 1 below | Add a small class table for dual wield and relics; settle the spec list with the owner. [VERIFIED data, ASSUMED rules] |
| F13 | A tier-delete guard can be a plain predicate (no `pg_trigger_depth()` rule) because `delete_guild` deletes lists and history before expansions. | `supabase/migrations/20261004020000_delete_guild_with_reserve_runs.sql` order: `DELETE FROM loot_submission_items WHERE submission_id IN (`, `DELETE FROM loot_submissions WHERE guild_id = p_guild_id;`, `DELETE FROM loot_history WHERE guild_id = p_guild_id;` before `DELETE FROM expansions`; PGlite probe this session | Guard refuses only when need rankings or awards exist; proven. [VERIFIED by probe] |
| F14 | `loot_style` lands in the addon `guild-data` and `export-string` payloads for every guild, because both spread the `guild_settings` row. | `app/api/addon/guild-data/route.ts:92` `supabase.from('guild_settings').select('*')` and `:327` `...settings,`; `app/api/addon/export-string/route.ts:87` same select | Same trade the Oct 28 migration made for `award_slot_lock_enabled`. Optional hardening: drop the key server-side so Known payload bytes do not change. [VERIFIED] |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Position-to-rank, fan-out, budget sum, eligibility, defaults, presets | `domain/` pure modules | Browser (imports them) and API route (calls them) | One pure check per rule so picker and submit agree (CONVENTIONS pattern used by hold, locks, prio) |
| Five-row picker, question flow, budget line | Browser / Client | Frontend server (page shell only) | Interaction and layout; `app/(app)/loot-list/page.tsx` is a server shell, the work is in client components |
| Save and submit of the 15 rows | API / Backend (`POST /api/loot-submissions/submit`) | Database (`save_submission_items` RPC from the client session) | Budget and eligibility refusal must hold for every API caller (D-07) |
| Slot range, one live row per (rank, slot), hold removal, tier delete guard, `loot_style` check | Database | none | Constraints and triggers are the backstop behind every route |
| Standing and interest values and sentences | `domain/scoring` | Browser (renders five surfaces) | Presentation split of an unchanged total (D-20) |
| Preset apply and "Customised" compare | `domain/guild` pure module | Browser (Loot system settings modal, creation modal), API (`PUT /api/guild-settings`, `POST /api/guilds` validate the id) | Knob writes go through the existing allowlisted route |
| "Set your 5" message and DMs | API / Backend (new route under `app/api/discord/`) | Discord REST (`lib/discord.ts`) | Needs the bot token and member Discord ids; never the browser |
| Deep-link guild and character resolution | Browser (`GuildContext.switchGuild`) | Edge proxy (`proxy.ts` keeps the query through sign-in) | The active guild and character are client context state |
| List-mode control | Browser (expansions page) | API (`PATCH /api/raid-tiers`, already built) | UI only; rules already in the route and database |

## Standard Stack

No package is added in this phase. Everything below is already in `package.json` (opened this session).

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js / React | `"next": "^16.4.1"` (package.json:68), `"react": "19.2.3"` (:72) | App Router routes and client components | Project stack |
| @supabase/supabase-js (client and service role) | existing | Reads, RPC `save_submission_items`, route queries | RLS is the security boundary |
| Vitest + jsdom + Testing Library | `"vitest": "^4.1.12"` (:102), `"jsdom": "^29.1.1"` (:93), `"@testing-library/react": "^16.3.2"` (:82), `"@testing-library/user-event": "^14.6.1"` (:83) | Unit, route and component tests | Project test stack |
| @electric-sql/pglite | `"@electric-sql/pglite": "0.5.8"` (:79) | Real-Postgres migration proofs | Phase 3 pattern, pinned exactly |
| puppeteer | `"puppeteer": "24.43.1"` (:96) | Manual or scripted 375px screenshots (`scripts/visual/baseline.mjs` captures 1440 and 390) | Existing visual tooling, not part of `npm test` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `utils/supabase/paginate.ts` (`paginatedSelect`, `selectAllPagesOrThrow`) | in repo | 1000-row cap and error-checked paging | Any read that can pass 1000 rows; use the OrThrow form for new reads |
| `lib/discord.ts` (`discordFetch`, `sendDirectMessage`) | in repo | Retry on 429 and 5xx, DM sequence | Discord sender |
| `lib/post-auth-redirect.ts` | in repo | Safe `next` path | Deep link |
| `utils/audit/log.ts` (`logAudit`) | in repo | Audit rows | Optional send cooldown or record |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New `/api/need-lists` save route | Existing client RPC plus submit route | D-27 locks the existing path; a new route would be a new reader and a second place to enforce locks |
| Slot = tier id sort | Slot by `(sort_order, id)` over all phase-group tiers | uuid order is random per guild and a new tier can reorder slots, which breaks award locks (P5) |

**Installation:** none. Probe tooling used this session (`@electric-sql/pglite@0.5.8`, `tsx`) was installed in the scratchpad only, never in the repo.

**Version verification:** versions above are read from `package.json`, not from the registry, because no package is recommended for install.

## Package Legitimacy Audit

No external package is installed by this phase, so the gate has nothing to check.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| none | n/a | n/a | n/a | n/a | n/a | n/a |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Discord "Set your 5" button (officer, Guild Settings)
        |  POST /api/discord/set-your-five  (manage_settings)
        v
  channel message w/ link button  +  DMs (user_preferences.discord_id, counts only)
        |
        |  member taps   ${APP_URL}/loot-list?guild=<id>&picker=1
        v
  proxy.ts  --signed out--> /?next=<path+query> --> sign in --> /auth/callback?next=... --> back to the link
        |signed in
        v
  /loot-list (LootListProvider)  --> GET /api/loot-list/bootstrap
        |      tiers(+list_mode, sort_order), items (+needs for Discovery tiers), submission, rankings{"rank-slot"}, locks
        v
  deep-link entry: GuildContext.switchGuild(guild, main character)
        v
  all guild-active tiers of phase group are Discovery?
     no  --> existing 50-rank editor (byte-for-byte)
     yes --> NeedPicker (5 positions)
              position -> rank 50..46 ; tier -> slot (sort_order, id) ; need_key -> need row id per tier
              eligibleNeedsFor / defaultNeedsFor / budget (pure, domain/loot)
              "Looks right" | "Save my 5"
                    |
                    v  LootListContext.saveSubmission(true)
        upsert loot_submissions (character,guild,expansion,phase)   [one row]
                    v
        rpc save_submission_items(p_submission_id, 15 x {loot_item_id, rank, slot})
              authorize owner/officer -> delete live rows -> insert -> award-lock check
              DB: slot check 1..8, unique live (submission, rank, slot), status trigger
                    v
        POST /api/loot-submissions/submit
              lock check -> [hold removed] -> bracket (need rows exempt) -> copy caps
              -> NEW budget (422) + eligibility (422) -> prio check -> status 'pending'
                    v
        officers: review (snapshot) -> approve / reject / revert / reopen / remove-item (unchanged, per row)
                    v
        master sheet / Summary / Raid Mode (keepRankedNeedRows) ; BLP on need row ids
```

### Recommended Project Structure

```
domain/loot/
  need-picks.ts            # NEED_PICK_RANKS, position<->rank, tier slot order, fan-out and read-back (pure)
  need-budget.ts           # NEED_BUDGET_POINTS = 10, usage, check, "would go over" (pure)
  need-eligibility.ts      # eligibleNeedsFor, isNeedEligible, specMappingKey (pure)
  need-defaults.ts         # frozen defaults per class_specs name and class
  __fixtures__/class-specs.json   # hand-transcribed (class, spec) pairs, same guard pattern as need-keys.json
  __tests__/need-picks.test.ts, need-budget.test.ts, need-eligibility.test.ts, need-defaults.test.ts
domain/guild/
  loot-style-presets.ts    # ids, label, frozen knob maps, presetMatches, presetDiff
domain/scoring/
  engine.ts, explain.ts    # minimal edits (Topic 4)
lib/loot/
  need-list-rules.ts      # thin server glue: rows -> budget and eligibility violations (no table reads of its own)
app/api/discord/set-your-five/route.ts
app/(app)/loot-list/components/NeedPicker.tsx, NeedPickerRow.tsx     # per 04-UI-SPEC component inventory
app/components/need-picker/                                          # reusable flow, sheet, cost marker, budget line
app/(app)/overview/components/SetYourFiveCard.tsx
app/components/LootStylePicker.tsx, ScoreSplit.tsx
supabase/migrations/<ts>_need_lists.sql
app/services/__tests__/need-lists-migration.test.ts, need-lists-pglite.test.ts
```

### Topic 1. Exact save and submit path for a Discovery list

1. **Picker state to rows.** The picker keeps `positions: (needKey | null)[5]`. A pure `buildNeedRankings` turns it into the same `Record<string, string>` the editor uses: key `` `${rank}-${slot}` `` to `loot_item_id`. [VERIFIED: `app/contexts/LootListContext.tsx:559-575` `const key = `${rank}-${slot}`` in `handleItemSelect`; `domain/loot/list-row-updates.ts:12` `export function positionKey(rank: number, slot: number): string { return `${rank}-${slot}` }`]
2. **Save.** `saveSubmission(true)` upserts `loot_submissions` with `onConflict: 'character_id,guild_id,expansion_id,phase'` (one row per character per expansion per phase; DB unique `"loot_submissions_unique_character_guild_expansion_phase" UNIQUE ("character_id", "guild_id", "expansion_id", "phase")`, baseline:2439), builds `Object.entries(rankings).map(([key, loot_item_id]) => { const [rankStr, slotStr] = key.split('-'); return { loot_item_id, rank: parseInt(rankStr), slot: parseInt(slotStr) } })`, calls `supabase.rpc('save_submission_items', { p_submission_id, p_items })` (`LootListContext.tsx:950-953`) and then `fetch('/api/loot-submissions/submit', { method: 'POST', ... body: JSON.stringify({ submission_id: submissionId }) })`. Auto-save (`doAutoSave`, line 815) runs the same RPC one second after any rankings change, so a half-built picker saves a draft; that is harmless for drafts and is the reason budget enforcement belongs at submit. [VERIFIED]
3. **What the RPC validates.** Latest definition: `20261028120000_award_slot_locks.sql:137-202`. It authorizes (character owner, legacy `s.user_id`, or `public.is_guild_officer(s.guild_id)`), deletes live rows (`DELETE FROM loot_submission_items WHERE submission_id = p_submission_id AND removed_at IS NULL;`), inserts with `(item->>'slot')::INTEGER` (line 171), then raises `Rank % is locked to %` with `ERRCODE = 'check_violation'` if a live lock lost its item at its rank and slot. It never inspects the slot value, the rank value, `kind` or a budget. Slot is guarded only by `CONSTRAINT "loot_submission_items_slot_check" CHECK (("slot" = ANY (ARRAY[1, 2])))` (`20260101000000_baseline_schema.sql:1959`). Therefore `save_submission_items` is **not** redefined in the Phase 4 migration. [VERIFIED]
4. **Fan-out rows.** 5 positions x 3 tiers = 15 rows: `(50,1) (50,2) (50,3) (49,1) ...`. One live row per `(submission_id, rank, slot)` holds: `CREATE UNIQUE INDEX IF NOT EXISTS "idx_loot_submission_items_unique_live_rank_slot" ON "public"."loot_submission_items" USING "btree" ("submission_id", "rank", "slot") WHERE ("removed_at" IS NULL);` (`20261003120000_unique_live_loot_list_item_positions.sql:89`). Locks accept slot 3 and rank 46-50: `CONSTRAINT "loot_list_slot_locks_slot_check" CHECK ("slot" >= 1)` and `CONSTRAINT "loot_list_slot_locks_rank_check" CHECK ("rank" BETWEEN 1 AND 50)` (`20261028120000_award_slot_locks.sql:105-106`). [VERIFIED]
5. **Reads.** `GET /api/loot-list/bootstrap` (lines 188-201) and `GET /api/loot-submissions` (lines 73-88) read `loot_submission_items` rows of one submission, put live rows into `rankings[`${r.rank}-${r.slot}`]` and removed rows into `removedItems`. 15 live rows is far under the 1000-row cap; no paging needed there. Slot 3 keys come back with no code change. [VERIFIED]
6. **Submit route** (`app/api/loot-submissions/submit/route.ts`). Order today: ownership (82-84), active membership (89-93), item read at line 96-105 with `loot_item:loot_items(id, name, classification, item_type, item_slot, wowhead_id, allocation_cost, kind, raid_tier:raid_tiers(is_guild_active))` and `.is('removed_at', null)`, lock check (115-125), guild settings, then `if (itemRows.some((si) => isHeldNeedRanking(si.loot_item))) { return NextResponse.json({ error: NEED_RANKING_HOLD_ERROR }, { status: 422 }) }` (164-166), GH #357 filter, `validationItems = checkedRows.filter((si) => !isNeedRow(si.loot_item))` (183, need rows exempt from brackets), `validateItemCopyLimits` over every checked row (202-211), prio check (224-242), status update. Phase 4 edits: delete the import (line 7) and the call (164-166); add `need_key` to the embed; read the character's class and spec; run the two new pure checks after the copy-limit block and before the prio check, answering 422 with a `code`. The route test mocks the hold at `route.test.ts:8-16`, has `describe('ranking needs is held (D-22)')` at 334 and `describe('with the hold lifted (Phase 4 state)')` at 387; those become the "needs rank" tests. [VERIFIED]
7. **Review, snapshot, revert, reopen, remove-item at slot 3.** Review snapshot copies `rank, slot, loot_item_id, item_name` into jsonb (`review/route.ts:247-263`), no slot assumption. Revert deletes all rows then re-inserts `{ submission_id, loot_item_id, rank, slot: item.slot || 1 }` through the service role (`revert/route.ts:149-160`), which needs the widened check to restore a slot-3 snapshot. Reopen only flips status (`reopen/route.ts`). Remove-item acts on one row by `(loot_item_id, rank, slot)` and releases a lock on that exact row (`remove-item/route.ts:195-290`). All work per tier row, which is the intended granularity. [VERIFIED]

**Every place that assumes slot is 1 or 2, and what it needs:**

| Place | Assumption | Phase 4 action |
|-------|------------|----------------|
| `loot_submission_items_slot_check` (baseline:1959) | `ARRAY[1, 2]` | Widen to 1..8 (Topic 2); update the column comment "Item slot within the rank (1 or 2)" (baseline:1970) |
| `save_submission_items` | none (no slot check) | No change |
| `loot_list_slot_locks` | `slot >= 1` | No change |
| Known editor `LootListContent.tsx` (`slot: 1 \| 2` at 158, keys `-1` and `-2` at 242-254, 373, 650, 754, 1280) | renders two slots | Unchanged; reached only by the mixed-group fail-closed path, where slot-3 need rows stay in `rankings` and are re-sent on save, invisible. Add one test that a mixed-group save keeps hidden rows |
| `LootListSummaryView.tsx:19` `primary_rank: number  // 1-2 (which slot)` and the sort at 160 | comment, and a tiebreak by slot | Comment fix only; a need's slot is the same for every raider of one tier, so the tiebreak is constant |
| `lib/loot/master-sheet-summary.ts:249` `primary_rank: si.slot` | slot as "primary" | No change |
| Addon `lib/addon/member-ranked-items.ts:101-124` | sorts by slot | Need rows are skipped before this (Phase 3 `noteNeedSkipped`) |
| Bracket rules, copy caps | need rows exempt from brackets (submit:183); caps by row id | See pitfall P6 |
| Lua export, Gargul export (`fetchTierRankings`, `.eq('kind', 'item')`) | item-only | No change |

### Topic 2. The migration bundle (D-25)

A draft of the Phase 4 file was applied twice on top of the full chain in PGlite 0.5.8 this session and behaved as listed in the Summary. The statements below are the verified shape. [VERIFIED: PGlite probe, draft run twice, then the RPC, delete and `delete_guild` cases]

```sql
SET LOCAL lock_timeout = '5s';

-- 1. D-08: drop the hold (trigger first, then function)
DROP TRIGGER IF EXISTS "enforce_need_ranking_hold" ON "public"."loot_submission_items";
DROP FUNCTION IF EXISTS "public"."enforce_need_ranking_hold"();

-- 2. D-02: widen the slot check (new name, NOT VALID, VALIDATE, then drop the old one)
ALTER TABLE "public"."loot_submission_items" DROP CONSTRAINT IF EXISTS "loot_submission_items_slot_range_check";
ALTER TABLE "public"."loot_submission_items" ADD CONSTRAINT "loot_submission_items_slot_range_check" CHECK (("slot" >= 1 AND "slot" <= 8)) NOT VALID;
ALTER TABLE "public"."loot_submission_items" VALIDATE CONSTRAINT "loot_submission_items_slot_range_check";
ALTER TABLE "public"."loot_submission_items" DROP CONSTRAINT IF EXISTS "loot_submission_items_slot_check";

-- 3. D-18: loot_style (nullable text, check on the three ids)
ALTER TABLE "public"."guild_settings" ADD COLUMN IF NOT EXISTS "loot_style" "text";
ALTER TABLE "public"."guild_settings" DROP CONSTRAINT IF EXISTS "guild_settings_loot_style_check";
ALTER TABLE "public"."guild_settings" ADD CONSTRAINT "guild_settings_loot_style_check" CHECK (("loot_style" IS NULL OR "loot_style" = ANY (ARRAY['reward_attendance'::"text", 'even_rotation'::"text", 'officers_decide'::"text"]))) NOT VALID;
ALTER TABLE "public"."guild_settings" VALIDATE CONSTRAINT "guild_settings_loot_style_check";

-- 4. D-25 / WR-04: WHEN-gated BEFORE DELETE guard on raid_tiers (predicate, no trigger-depth rule)
CREATE OR REPLACE FUNCTION "public"."enforce_raid_tier_need_delete_lock"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  IF coalesce(current_setting('role', true), '') IN ('anon', 'authenticated')
     AND (
       EXISTS (SELECT 1 FROM public.loot_submission_items lsi JOIN public.loot_items li ON li.id = lsi.loot_item_id
               WHERE li.raid_tier_id = OLD.id AND li.kind = 'need')
       OR EXISTS (SELECT 1 FROM public.loot_history lh JOIN public.loot_items li ON li.id = lh.loot_item_id
               WHERE li.raid_tier_id = OLD.id AND li.kind = 'need')
     ) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'raid tiers with ranked or awarded needs are deleted only by the server',
      ERRCODE = 'check_violation',
      DETAIL = format('raid_tier_id %s', OLD.id);
  END IF;
  RETURN OLD;   -- OLD, not NULL: NULL would silently skip the delete for trusted writers
END;
$$;
REVOKE ALL ON FUNCTION "public"."enforce_raid_tier_need_delete_lock"() FROM PUBLIC, "anon", "authenticated";
CREATE OR REPLACE TRIGGER "enforce_raid_tier_need_delete_lock" BEFORE DELETE ON "public"."raid_tiers" FOR EACH ROW WHEN (OLD.list_mode = 'discovery') EXECUTE FUNCTION "public"."enforce_raid_tier_need_delete_lock"();
```

Plus `COMMENT ON` statements (column slot, loot_style, the function and trigger), and a closing `DO $$` verification block like Phase 3's (line 572 to the end of the Phase 3 file) that checks the trigger exists, the old hold is gone, and `loot_style` exists. Follow the Phase 3 house style: header sections `Problem, Fix, Readers and writers checked, Error contract, Production safety, Not changed, Deploy, Rollback` (the contract test requires these headings as `^-- Name\n-- ---+$`, `discovery-schema-migration.test.ts:540-556`). Filename `supabase/migrations/<UTC ts>_need_lists.sql` with a timestamp after `20261028120000` (the newest file today). [VERIFIED naming rule: `supabase/migrations/README.md` "named `<UTC timestamp>_<description>.sql`"]

**Probe results (all against the chain plus the draft):**
- Raider (`authenticated`) `save_submission_items` with need rows at ranks 50 and 49 and slots 1, 2, 3: returned 3 saved.
- Slot 9: `new row for relation "loot_submission_items" violates check constraint "loot_submission_items_slot_range_check"`; slot 0 same.
- Officer `DELETE FROM raid_tiers` of a Discovery tier with a ranked need: refused with the guard message; officer `DELETE FROM expansions` of the expansion holding it: refused (the cascade reaches the tier trigger, which is not depth-gated); unranked Discovery tier and a Known tier: deleted; creator `delete_guild(...)` with ranked needs: succeeded and the guild was gone.
- Lock window: ADD CONSTRAINT and DROP CONSTRAINT take a brief ACCESS EXCLUSIVE lock and the file is one implicit transaction, so the lock is held through VALIDATE of a small table; `lock_timeout = '5s'` is the existing safeguard. [CITED: PostgreSQL ALTER TABLE locking; behaviour summary from training, `[ASSUMED]` for lock levels]

**Tests the migration PR carries (Phase 3 PR #459 shipped migration, 3 test or helper files, package.json, lock):**
1. New `need-lists-migration.test.ts` modelled on `discovery-schema-migration.test.ts`: exact statement count and order, every `ADD CONSTRAINT` followed by `VALIDATE`, a WHEN clause on the raid_tiers trigger (the existing regex pattern `/WHEN \(\(?old\.kind = 'need'/i` shows the style), no data statement, no `awarded_item_id` change, header sections.
2. New `need-lists-pglite.test.ts` on a clean chain (do **not** re-apply the Phase 3 file): the probe cases above as rolled-back cases beside positive controls, plus "applies twice", `loot_style` accepts null and the three ids and rejects another value, slot 8 accepted and slot 9 rejected.
3. Update `discovery-schema-pglite.test.ts`: it re-applies the Phase 3 file at line 126, so either apply the Phase 4 file after it or drop the re-apply; remove `'enforce_need_ranking_hold'` from `GUARD_TRIGGERS` (line 70) and replace `describe('D-22 need-ranking hold')` (line 926) with the inverse proof in the new file; its `'lets the guild creator delete the guild...'` case (line 1187) keeps passing and is the `delete_guild` regression.
4. Update `lib/loot/__tests__/need-reader-inventory.test.ts` (Topic 7).
5. `lib/database.types.ts`: add `loot_style: string | null` to `guild_settings` Row and `loot_style?: string | null` to Insert and Update, alphabetically after `loot_announcements_enabled` (the file lists `award_slot_lock_enabled` at lines 891, 962, 1033 as the precedent; `gen:types` needs the Supabase project, so edit by hand as Phase 3 did). The slot check does not appear in the types.

### Topic 3. The pure modules

**`domain/loot/need-picks.ts` (D-01, D-02).**
- `NEED_PICK_RANKS = [50, 49, 48, 47, 46] as const`; `rankForPosition(i)`, `positionForRank(rank)`.
- Tier slot order: `assignTierSlots(tiers: {id, sort_order, list_mode}[]) -> Record<tierId, 1..8>` sorted by `(sort_order, id)`. Forever tiers are inserted with `sort_order: index + 1` (`app/services/expansionCatalogSync.ts:120`), in manifest order (`data/expansions/forever/manifest.ts` raids Barrow Deeps, Hyjal Summit, Onyxia's Lair). `getRaidTierOrder` cannot be used: Forever names are not in `RAID_TIER_ORDER`, so every Forever tier maps to `999` (`LootListContext.tsx:72-74` `return RAID_TIER_ORDER[tierName] || 999`). Compute slots over **all** Discovery tiers of the phase group including guild-inactive ones, so toggling `is_guild_active` never moves another tier's slot (award locks live on `(rank, slot)`). More than 8 Discovery tiers: fail closed to the editor. [VERIFIED data; design ASSUMED]
- `buildNeedRankings({ positions, needRowFor(tierId, needKey) -> id | undefined, tierSlots })` returns the `Record<'rank-slot', id>` plus a list of tiers that had no need row (so the UI can say "not set up yet" instead of silently saving 12 rows).
- `readNeedPositions(rankings, rowsById)` inverts it using each row's `need_key`; rows at one rank with different keys, or a tier missing its row for a key, mark the list `inconsistent`, which the picker shows as edited ("Save my 5").
- A new Discovery tier switched on after lists exist leaves existing lists short of that tier's rows. `readNeedPositions` should report the missing tier so the picker opens in the "changed" state and a re-save adds the rows.

**`domain/loot/need-budget.ts` (D-06, D-07).**
- `NEED_BUDGET_POINTS = 10`.
- `needBudgetUsed(rows: {rank, need_key, allocation_cost}[])`: group by `rank`; within a rank take the **distinct `need_key`s** and sum the maximum cost per key. Counting once per picker position (D-06) must not become "one cost per rank", or an API caller could put five different needs at rank 50 across the three slots and pay for one. Distinct `(rank, need_key)` sums each pick once and each tier once-only.
- `checkNeedBudget(rows) -> { ok, used, limit }` is called by the submit route and by the picker. `wouldGoOver(currentCosts, indexBeingChanged, newCost)` supports UI-04 (block at Q1, excluding the row being changed). Cost source is the row's `allocation_cost`; the Phase 3 test pins every need row to its definition cost (`needs.ts` `cost: NEED_COST_BY_TIER[tier]`).
- Over-budget copy and the "three big picks" sentence belong in the UI; the module returns numbers and a count of Big picks so UI-14's two sentences can be chosen.

**`domain/loot/need-eligibility.ts` (D-10).**
- `specMappingKey(className, specName)` mirrors the rule already used in two places: `` const fullSpecName = className === specName ? className : `${specName} ${className}` `` (`MasterSheetContent.tsx:1001`, `DashboardContent.tsx:1565-1571`). Mapped through `getSpecRoles` (`spec-role-mapping.ts:46`, `specMapping[specName]?.roles || []`). All 23 seeded `class_specs` names resolve to a `specMapping` key under this rule (checked by reading both lists; the gate test must assert it): seeded names per class are Paladin `['Holy', 'Retribution', 'Protection']`, Priest `['Holy/Disc', 'Shadow']`, Shaman `['Restoration', 'Elemental', 'Enhancement']`, Druid `['Restoration', 'Feral', 'Balance', 'Guardian']`, Warrior `['Protection', 'Arms/Fury']`, Hunter `['Hunter']`, Mage `['Mage']`, Warlock `['Warlock']`, Rogue `['Rogue']`, Death Knight `['Blood', 'Frost/Unholy']`, Monk `['Brewmaster', 'Windwalker', 'Mistweaver']` (`scripts/seed-class-specs.ts:33-45`). [VERIFIED]
- Stat family: `needRowColumns(def).roles` (`needs.ts:336-351`: tank gives `['tank']`, healing gives `['healer']`, spell-damage gives `['caster']`, strength, agility and physical give `['physical']`) intersect the spec roles. This reuses `canSpecUseItem(specName, itemRoles)` (`spec-role-mapping.ts:51`).
- Armour: `def.armour` null, or `canWearArmorType(className, ArmorType)` (`class-proficiencies.ts:196-205`; lighter allowed, as D-10 says). `getWearableArmorTypes` lists the allowed classes for the picker's armour question.
- Slot rules, derived from `CLASS_PROFICIENCIES[class].weapons` where the data allows, plus a small new table where it does not [ASSUMED for the new table, reviewed with the defaults per D-10]:

| Need slot | Rule | Data source |
|-----------|------|-------------|
| `two-hand-weapon` | class lists any of Two-Handed Axe, Two-Handed Mace, Two-Handed Sword, Polearm, Staff | `class-proficiencies.ts` weapons (Priest, Mage and Warlock qualify through Staff) |
| `main-hand-weapon` | class lists any of Dagger, Fist Weapon, One-Handed Axe, One-Handed Mace, One-Handed Sword | `class-proficiencies.ts` (every class qualifies) |
| `off-hand-weapon` | dual-wield classes: Warrior, Rogue, Hunter, Shaman, Death Knight, Monk | **new table** (not in the data file) |
| `ranged-weapon` | class lists any of Bow, Crossbow, Gun, Thrown, Wand | `class-proficiencies.ts` (Warrior, Hunter, Rogue, Priest, Mage, Warlock) |
| `shield` | class lists `'Shield'` | `class-proficiencies.ts` (Warrior, Paladin, Shaman) |
| `off-hand-item` | stat families are only spell-damage and healing (`needs.ts:149`), so roles already limit it | none needed |
| `relic` | Paladin, Druid, Shaman, Death Knight | **new table** (`CLASS_AGNOSTIC_SLOTS` names Idol, Totem and Libram but is not per class) |
| trinket, ring, neck, back, armour slots | every class (armour by class maximum) | `isClassAgnosticSlot` list |

- Physical specs need a strength-or-agility preference because the armour matrix offers both on Mail (`needs.ts:165-170`). A small `PHYSICAL_STAT_BY_CLASS` table (strength: Warrior, Paladin, Death Knight; agility: Hunter, Rogue, Monk; both: Shaman, Druid) is the minimal fix [ASSUMED, owner review with Enhancement Shaman and Feral].
- Server use: the submit route refuses a need outside `eligibleNeedsFor(character)` with 422 and a distinct `code`; the prio-violation shape (`{ error, code: PRIO_VIOLATION_CODE, prio_violations }`, submit route lines 237-241) is the model. The picker hides ineligible rows, so a refusal only reaches an API caller or a spec change after saving.

**`domain/loot/need-defaults.ts` (D-09) and its gate.**
- Shape: `readonly { className: string; specName: string; needs: readonly [string, string, string, string, string] }[]`, `defaultNeedsFor(className, specName) -> readonly string[] | null`. A spec with no entry returns null (D-11 empty picker).
- Gate test (`need-defaults.test.ts`): per entry exactly five distinct keys; each `findNeedDefinition(key)?.key === key`; summed cost at most `NEED_BUDGET_POINTS`; every key `isNeedEligible` for that spec; the `(className, specName)` pair exists in `__fixtures__/class-specs.json`; every fixture pair either has a default or is listed in an explicit `SPECS_WITHOUT_DEFAULT`.
- Verified now: the FEATURES table (`.planning/research/FEATURES.md:123-146`, 19 rows with Arms and Fury split, no Death Knight or Monk rows) resolves fully to existing keys; 18 rows sum to exactly 10 points; Shadow Priest sums to 11 (F7). Arms and Fury share one `class_specs` row named `Arms/Fury`, so that row needs one default (Open Question 1).

**`domain/guild/loot-style-presets.ts` (D-17, D-18).**
- `LOOT_STYLE_IDS = ['reward_attendance', 'even_rotation', 'officers_decide']` (ids are discretion; they must equal the check constraint); frozen `knobs` map per id; `isLootStyleId`; `presetMatches(settings, id)` compares only the preset's keys with `Number()` normalisation for numerics (Postgres `numeric(3,2)` such as `signup_weight`, baseline column `"signup_weight" numeric(3,2) DEFAULT 0.25`) and `Object.is` for the rest; `presetDiff(settings, id)` lists the keys that would change, driving the D-19 confirm. "Customised" is `loot_style != null && !presetMatches(...)`; null `loot_style` shows "Custom".
- Knob keys that exist (all in `ALLOWED_SETTINGS_FIELDS`, `app/api/guild-settings/route.ts:16-101`): `attendance_type`, `use_signups`, `signup_weight`, `max_attendance_bonus`, `middle_attendance_bonus`, `bottom_attendance_bonus` (and the three thresholds), `blp_enabled`, `blp_increment`, `blp_maximum`, `guild_rank_bonuses_enabled`, `raid_roles_overall_bonus_priority`, `role_bonus_priority_single_item`, `class_bonus_priority_single_item`, `single_raider_overall_bonus`, `single_raider_bonus_single_item`, `enforce_slot_restrictions`. "Pass and see item bonuses" in D-17 is not a column name; the single-item bonus flags above are the closest match (Open Question 4).
- Proposed values [ASSUMED, owner reviews with the copy]: `reward_attendance` equals what a new guild gets today (`attendance_type: 'linear'`, `rolling_attendance_weeks: 8`, `use_signups: false`, from `app/api/guilds/route.ts:216-221` and the modal state `LootSettingsContent.tsx:200-203`), rank and role bonuses off, BLP off (UI-SPEC UI-10 asks for this); `even_rotation` turns `blp_enabled: true` with `blp_increment: 1`, `blp_maximum: 5` (the existing field defaults, `LootSettingsContent.tsx:258-259`) and lowers `max_attendance_bonus`; `officers_decide` turns on `single_raider_overall_bonus`, `raid_roles_overall_bonus_priority` and `guild_rank_bonuses_enabled` and keeps attendance modest. The preset must not set `award_slot_lock_enabled` or any `loot_style`-unrelated field.
- Validation: `PUT /api/guild-settings` rejects a `loot_style` that is neither null nor an id (the route already validates one boolean this way, line 330 `if ('award_slot_lock_enabled' in sanitizedSettings && typeof sanitizedSettings.award_slot_lock_enabled !== 'boolean')`), and the DB check is the backstop.

### Topic 4. The score split (D-20 to D-22)

Minimal change:
- `domain/types.ts`: `ScoreResult` gains `standing: number` and `interest: number`. `ScoreExplanation` gains the two values and the two sentences. `ScoreComponents` is unchanged (the award receipt whitelist in `app/api/loot-history/bulk/route.ts` keys on it).
- `engine.ts:57` `return { total, components }` becomes the same expression plus the split. Keep the `total` expression untouched (lines 47-55). Export one helper, for example `toScoreResult(total, components)`, that returns `{ total, components, interest: components.itemRank, standing: total - components.itemRank }`; `computeScore` uses it, and so do the three hand-built callers so a required field never breaks their types. D-20 says `standing = total - interest`; the subtraction can leave float noise such as 7.299999999999997, which no surface shows because Dashboard rounds with `line.value.toFixed(decimalPlaces)` (DashboardContent.tsx:2101). Test with `toBeCloseTo`, never `toBe`.
- `explain.ts`: derive standing and interest from `result.total` and `result.components.itemRank` so `explainScore` works for the hand-built callers. The interest position is already computed at line 53: `` detail: s.itemRank > 0 ? `Position #${51 - s.itemRank} on your list` : 'No item selected' `` and rank 50 maps to number 1, rank 46 to number 5, so "your number N pick" needs no need-specific branch (D-22). The sentence text, voice ("your" or "their"), the no-pick sentence and the fixed part order are in `04-UI-SPEC.md` (UI-12, UI-13); put the sentence builders in `explain.ts` and pass `voice` through `ExplainScoreOptions`. `explainScore` currently takes `(result, configOrInput, opts)`; add the option, do not change positional arguments.
- Callers to update: `computeScore`: `MasterSheetContent.tsx:1007` and `:1500`, `DashboardContent.tsx:1152` (itemRank 0 base score) and `:1565` (per-item). `explainScore`: `BossSection.tsx:112`, `ItemCandidateModal.tsx:229`, `DashboardContent.tsx:1158`, `ScoreComparisonModal.tsx:165-166`. Hand-built `ScoreResult`: `BossSection.tsx:64`, `ScoreComparisonModal.tsx:54-67`, `ItemCandidateModal.tsx:229`. `ItemCandidateModal.tsx:385,395` pass `components` and `winner_components` into the award body; the whitelist already holds all nine keys, so nothing new is sent. The Overview widget scores with `itemRank: 0` (line 1137-1139), so its interest would read 0; UI-11 resolves this by using the number 1 pick.
- Existing tests that need no change: `engine-contracts.test.ts` asserts `explanation` has `total` and `lines`, line values sum to `total`, 2 to 8 lines (lines 152-232), and `a.components` equals `b.components`; adding top-level fields keeps all of these green.
- Proof totals are unchanged: `npx vitest run domain/scoring` (engine, engine-contracts, calculations, scoring suites including `LOOT_SCORE_FIXTURES`) plus the Lua exporter byte comparison. The exporter calls `calculateLootScore`, not `computeScore`, and prints `getDefaultSettings()`; capture before and after and `cmp`. Baseline this session at `a07f5d4d`: 6875 bytes, produced by `tsx domain/scoring/__tests__/export-fixtures.ts` run from the repo root. The addon repo's own `tests/tools/gen_web_fixtures.mts` is outside this repo; if it serialises the whole `ScoreResult`, the two new top-level keys would appear in its output, so ask the owner to run it once after the change (`[ASSUMED]`, A9). The golden seeder rows (`app/services/__tests__/__golden__/*.rows.txt`) are the legacy expansion seeder, unrelated to scoring, and stay green by not touching the seeder.

### Topic 5. Discord sender (D-23, D-24)

**Route pattern to copy:** `app/api/cron/resubmit-reminders/route.ts` for member selection (it bundles per user, reads `user_preferences` with `paginatedSelect`, skips users without `discord_id`) and `lib/billing/trial-ending.ts:373-390` for the send contract: `sendDirectMessage(botToken, discordId, { embeds: [...], allowed_mentions: { parse: [] } })`, `outcome.status === 403` treated as "DMs closed", other failures logged with stage and status only. `notify-officers` is a poorer model: it logs `Failed to create DM channel for ${discordId}` (line 236), which writes ids to logs, and ignores `sendDirectMessage`. `lib/discord.ts` already documents the refusal family: "Discord answers these with 403 and error code 50007". [VERIFIED]

**Authorization and gating:** `verifyPermission(supabase, user.id, guild_id, 'manage_settings')` as `post-raid-summary/route.ts:60` does for `manage_attendance`. The channel comes from `guild_settings.raid_summary_channel_id` (read at `post-raid-summary/route.ts:79-91`), with the same 400 "No raid summary channel configured" shape. "Only when the active expansion has a Discovery tier": read `guilds.active_expansion_id` then `raid_tiers` with `list_mode = 'discovery'` and `is_guild_active = true`; refuse with 400 otherwise (server check, the UI hides the button as well). [VERIFIED pattern]

**Members and Discord ids:** active memberships `character_guild_memberships` with `is_active = true` for the guild, joined to `characters.user_id` (the `notify-officers` query shape, lines 98-130), distinct user ids, then `user_preferences.discord_id` (paged, 500 per chunk like `resubmit-reminders`). Do not include the sender. A member without `discord_id` counts as skipped. Output is counts only: `{ posted: boolean, sent, skipped }`. Never log ids; `utils/analytics/__tests__/no-names-in-analytics.test.ts` guards analytics payloads, so any `trackEvent` carries the guild id and counts only.

**Message JSON (CITED):** a link button is a type-2 component with `style: 5` inside a type-1 action row: "Link buttons **must** have a `url`, and cannot have a `custom_id`", `url` max 512 characters, "An Action Row can hold up to **5 buttons**" [CITED: https://docs.discord.com/developers/components/reference]. No component exists in the repo today (`grep components:` over `app/api/discord`, `lib/discord*.ts` and `discord-bot/*.js` found none), so there is no pattern to copy: `{ content?, embeds?, components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Set your 5', url }] }], allowed_mentions: { parse: [] } }`. The same body works for the channel post (`POST /channels/{id}/messages`) and as the DM body for `sendDirectMessage`. No bot change or Railway deploy is needed because a link button sends no interaction.

**Rate limits and refusals:** bots may make "50 requests per second", a 429 carries `Retry-After` and a `retry_after` body float, and "Requests returning 401, 403, or 429 count as invalid ... 10,000 per 10 minutes" [CITED: https://docs.discord.com/developers/topics/rate-limits]. `discordFetch` already waits and retries on 429 (lib/discord.ts:31-37). Codes: 50007 "Cannot send messages to this user", 50278 "Cannot send messages to this user due to having no mutual guilds", 40003 "You are opening direct messages too fast" [CITED: https://docs.discord.com/developers/topics/opcodes-and-status-codes]. Each recipient costs two calls (open channel, send), and 40003 shows opening many DM channels quickly is throttled separately. Send with small bounded concurrency or a short delay between recipients and treat a 429 or 40003 as a skip after the retries; a guild of roughly 100 members is the working size. No `maxDuration` is set anywhere in `app/` today, so the planner should set one on this route or bound the work (A6). Consider a server-side cooldown (UI-15 asks the plan to decide): the latest `audit_logs` row of a new action for the guild, read through `logAudit`'s table, avoids double sends from two officers on serverless where memory is not shared.

**Deep link:** `${NEXT_PUBLIC_APP_URL || 'https://www.getlootlist.com'}/loot-list?guild=<guild_id>&picker=1` (`trial-ending.ts:266-272` `resolveAppOrigin` is the existing fallback; it is not exported, so export it or copy the one line). Resolution on the page: `app/(app)/loot-list/page.tsx` is a server shell with no `searchParams`; the work is client-side. `LootListProvider` already reads the URL (`useSearchParams`) and its `?phase=` updates rebuild from `searchParams.toString()` (so `guild` and `picker` survive). The entry component waits for `GuildContext` (`guildLoading` false), validates `guild` as a UUID, finds the user's characters with an active membership in that guild (`characterMemberships`, `is_main` on `Character`, `GuildContext.tsx:68`; characters load `.order('is_main', { ascending: false })`, line 268), and calls `switchGuild(guildId, mainCharacterId)` (signature at line 591) when the active guild or character differs. It never trusts the param for data: `switchGuild` returns early with "User is not a member of guild" when the id is not in `userGuilds`, and every route re-verifies. No eligible character: show the create-character EmptyState from the UI-SPEC.

**Post-auth:** the proxy must keep the query (F2). `isSafeNextPath` accepts `/loot-list?guild=...&picker=1`. After sign-in `app/auth/callback/route.js` honours `next` when memberships exist; for a user with no memberships `resolvePostAuthRedirect` sends them to `/guild-select`, which is correct for a stranger who somehow has the link. Add the proxy test beside `lib/__tests__/post-auth-redirect.test.ts` (exists); `app/api/addon/auth/__tests__/rate-limit.test.ts` already imports `proxy`, so it shows how to drive `proxy()` in a test.

### Topic 6. Officer surfaces

- **List-mode control (D-15).** In `app/(app)/expansions/[expansionId]/_client.tsx` the tier read is a direct client select, `.select('id, name, phase, is_guild_active, master_sheet_visible')` (about line 307), so add `list_mode` there and to the local `RaidTier` interface (line 23). Handlers `handleToggleGuildActive` (369) and `handleToggleMasterSheetVisibility` (397) post `{ guild_id, tier_id, updates: { ... } }` to `PATCH /api/raid-tiers`, show `errBody.error`, then `mutate(...)` the `/api/raid-tiers` and `/api/loot-items` SWR keys. Copy that shape for `list_mode`; The gate is `hasPermission('manage_settings')` (line 234). The held-UI guard test `app/api/raid-tiers/__tests__/route.test.ts:609` "the expansion page does not mention list_mode" must be removed or inverted in the same PR. `list_mode` is readable by `authenticated` (Phase 3 PGlite "lets authenticated select raid_tiers.list_mode"). [VERIFIED]
- **Preset placement (D-19).** `SettingsModal.tsx` is a controlled component fed `settings` and `setSettings` by `LootSettingsContent`, which autosaves 800 ms after any change using the explicit `safeSettings` object (lines about 300-360). A preset apply is one `setSettings({ ...settings, ...knobs, loot_style })`, which becomes one PUT. Add `loot_style` to the state defaults, to `safeSettings`, to `ALLOWED_SETTINGS_FIELDS`, and let `loadSettings` merge it (it already spreads `data.settings`). Use `useConfirm` (already imported in `SettingsModal.tsx`) for the D-19 overwrite prompt using `presetDiff`. Creation: `CreateGuildModal` posts to `/api/guilds`; send the optional `loot_style` there (F4).
- **Discord section.** `GuildSettingsContent.tsx` lines 682-770 hold the Discord integration card and `loadDiscordChannels`; the sender button goes there, gated on the active expansion having a Discovery tier.
- **Mixed groups.** `04-UI-SPEC.md` UI-16 adds an info note; the rule is D-12.

### Topic 7. Reader inventory (`lib/loot/__tests__/need-reader-inventory.test.ts`)

The scan (`READER_PATTERN`, `RPC_CALL_PATTERN`, line 69-83) fails CI on any new code file under `app lib domain utils companion discord-bot` that reads the three tables or calls an inventoried RPC without an entry.

- **New files that will need an entry in the commit that creates them:** any new file that calls `.rpc('save_submission_items'` or `.from('loot_items' | 'loot_submission_items' | 'loot_history')`. The recommended design adds none: the picker reuses `LootListContext` (already listed), the sender reads memberships, preferences, settings and tiers only, and the pure modules read nothing. If a helper wraps the RPC, list it as `ok` with a test that holds a need fixture.
- **Existing entries that change:**
  - `app/api/loot-submissions/submit/route.ts` (entry near line 351): note and plan; dispositions `['branch', 'guard']` stay valid because the `guard` marker `/isNeedRow\(|noteNeedSkipped\(|isHeldNeedRanking\(/` is still met by `isNeedRow(` (route line 183).
  - `app/contexts/LootListContext.tsx` (line 410): the note says the RPC insert "is held by enforce_need_ranking_hold, proven by the raider case (D-22)"; update the note to the new proof and the `test:` path to the new PGlite file.
  - `lib/loot-items-query.ts` (line 468): disposition `exclude` with note "includeNeeds off by default (D-02)"; still true as a default, but the file now also serves needs to Discovery tiers; add `branch` (marker `isNeedRow(` is present at `loot-items-query.ts:200`).
  - `app/api/prio-list/route.ts`: WR-03. Today the entry is `ok` citing a test that cannot fail. Fix: select `kind` in the embed and drop need priorities with `isNeedRow(...)` after the read, giving the `exclude` marker (`isNeedRow(`), and assert on the recorded select list in the test. A `.eq('loot_item.kind', 'item')` form would not satisfy the `exclude` marker regex `\.eq\(\s*['"]kind['"]\s*,\s*['"]item['"]\s*\)` because of the `loot_item.` prefix. POST `/api/prio-list` also accepts any `item_id` and checks neither guild nor kind (WR-03 notes it predates the phase); refuse need rows there too since D-03 forbids officer prio on needs.
  - `app/api/master-sheet/visibility/route.ts`: entry stays `ok` with its test; the fix adds chunking and error checks and must keep the test's need fixture.
- **SQL function entries (`SQL_FUNCTION_READERS`, line 902 on):** remove `enforce_need_ranking_hold` (line 962; the scanner treats a `DROP FUNCTION` as removal, so leaving it makes the "only functions the scan still finds" check fail). Add `enforce_raid_tier_need_delete_lock`: dispositions `['guard']`, `definedIn` the new timestamp, note, `test:` the new PGlite file (its body names `'need'`, which the `guard` and `branch` rule requires). Update the `save_submission_items` note (line 1030) only; `definedIn: '20261028120000'` stays because the function is not redefined.

### Topic 8. Testing

- **Route tests fake Supabase with recording builders.** The submit route test (`app/api/loot-submissions/submit/__tests__/route.test.ts:56-125`) defines `makeClient(fixture)` with `select/update/eq/in/is` that push `[col, val]` into `call.filters`, a `then` that answers per table, and `single()` per table. Extend the existing `characters` single read rather than adding a read: select `class:wow_classes(name), spec:class_specs(name)` with the id and `user_id`. The fixture item type needs `need_key` and `kind: 'need'`. The prio-list test must make its fake apply the select list so WR-03 cannot pass vacuously.
- **Fixtures default `kind` to `'item'`** in the fakes so a missing filter fails (Phase 3 pattern); keep that for every new fixture.
- **375px in Vitest.** jsdom has no layout engine, so a pixel claim cannot be proven there. What the repo already does: source-scan guard tests (`__tests__/type-scale-floor.test.ts`, `arbitrary-text-sizes.test.ts`) and `matchMedia` stubs for components (`app/customers/[slug]/__tests__/page.test.tsx:20`). Prove the structure in Testing Library: one `<ol>` with five `<li>`, no `grid-cols-2` or base-level `flex-row` on the picker container, every tappable control is a `Button` (default `h-11`, 44px per UI-SPEC) or carries a `min-h-11` class, the sticky footer holds the budget sentence and the one primary button, "Looks right" is one click and `saveSubmission` is called once. Prove the pixel behaviour in the end-of-phase human check with `node scripts/visual/baseline.mjs` style captures (it uses `puppeteer` `setViewport`; add a 375x667 viewport for the picker page) and the UI-SPEC backstop rows at 320, 375, 768. `human_verify_mode` is `end-of-phase` (`.planning/config.json`).
- **Golden and Lua gate (CI=true):** `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scoring` (Phase 3 ran this exact command: 364 passed, `03-14-SUMMARY.md` Verification). Never use `-u`. Plus `npx tsx domain/scoring/__tests__/export-fixtures.ts > after.json; cmp before.json after.json`.
- **PGlite proofs:** `npx vitest run app/services/__tests__/need-lists-pglite.test.ts` (the chain takes tens of seconds; the Phase 3 hook uses a 180000 ms timeout, line 207). Use `asRole(db, 'authenticated', userId)` for browser sessions and the superuser as the service role; every rejection runs inside `expectRejected` next to a positive control (helpers in `app/services/__tests__/helpers/pglite-chain.ts`).
- **Inventory:** `npx vitest run lib/loot/__tests__/need-reader-inventory.test.ts`.
- **Environment caveat:** the worktree has no `node_modules` (checked: `ls node_modules` fails). Run `npm ci` before any Vitest, typecheck or lint command.

### Topic 9. Pitfalls specific to this phase

See "Common Pitfalls" below (P1 to P12).

### Anti-Patterns to Avoid
- **A new save route for lists.** It forks the lock, status and prio enforcement that the RPC plus submit already own.
- **Reading slot as tier.** D-02: the tier is always `need.raid_tier_id`.
- **Adding any key to `DEFAULT_SETTINGS`, `ScoringConfig` defaults or `ScoreComponents`** (F9, D-20).
- **Budget in the RPC or a trigger.** D-07 and D-08 put it in the submit route; the drafts stay unconstrained.
- **`getRaidTierOrder` for tier slots** (all Forever tiers tie at 999).
- **Logging Discord ids or member names** in the sender (counts only).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reading more than 1000 rows | A manual `.range` loop that ignores errors (the visibility route's page loop) | `selectAllPagesOrThrow` (`utils/supabase/paginate.ts`) | Throws `Failed to read ${label}`; the route's catch answers 500 (Phase 1 owner decisions 7 and 8) |
| Long `.in()` id lists | Raising limits or sending 435 ids in one URL | Chunks of 100, as `lib/loot/guild-award-refs.ts:27` `const CHUNK_SIZE = 100` | Keeps each PostgREST URL short; identical rows for Known guilds |
| Discord DM sequence | Inline `discordFetch` pairs per recipient | `sendDirectMessage` | Never throws, reports stage and status, retries 429 and 5xx |
| Safe sign-in return path | A custom `next` parser | `isSafeNextPath`, `buildSignInPath` | Open-redirect guard with tests |
| Need identity, cost, classification | Ad hoc strings or costs | `NEED_DEFINITIONS`, `findNeedDefinition`, `needRowColumns`, `NEED_COST_BY_TIER` | The frozen taxonomy with a fixture guard |
| Spec roles | A new spec-to-role table | `getSpecRoles(specMappingKey(...))`, `canSpecUseItem` | Already used by scoring and priority |
| Lock handling for need rows | New lock code | `pickLockTarget`, `findLockViolations`, `lockedPositions` | D-05: work unchanged on a need row |
| A confirm dialog | A new modal | `useConfirm` / `ConfirmModal variant="default"` | Used in `SettingsModal.tsx`, named in UI-SPEC |

**Key insight:** every rule in this phase already has a pure-check-plus-one-call-site precedent (hold, locks, prio). Add the checks in the same shape so the picker and submit cannot disagree.

## Runtime State Inventory

Not a rename or refactor phase. The one runtime-state concern is that stored slot values above 2 and rank values 46 to 50 on need rows persist in `loot_submission_items` and in `loot_submission_snapshots.items` (jsonb); the snapshot and revert paths handle them (Topic 1, item 7). The `guild_settings.loot_style` column is null for every existing guild and no knob is rewritten by the migration (D-18).

## Common Pitfalls

### P1. Ranking needs before the budget check exists (D-08 ordering)
**What goes wrong:** the migration drops the trigger while the old submit route still holds, which is safe. If the code PR lifts the hold without the budget and eligibility checks, any API caller can submit an over-budget or ineligible list that then accrues BLP.
**How to avoid:** one PR deletes the hold call and adds both checks; test that an over-budget list answers 422 and writes nothing (`status`, `submitted_at`, `resubmission_count` untouched, as the hold test asserts today). The window between the migration and the code PR is still closed: the route hold stays until that PR.

### P2. Double counting or under counting the budget across tiers
**What goes wrong:** summing `allocation_cost` over all 15 rows gives 30 for a 10-point list; summing one cost per rank lets a caller put five keys at one rank.
**How to avoid:** distinct `(rank, need_key)` (Topic 3). Test: 15 correct rows is 10; five keys at rank 50 across three slots is 10 more than the rank-per-position sum and is refused.

### P3. The 1000-row cap and the URL length on need reads
**What goes wrong:** one phase has 3 x 145 = 435 need ids. The visibility route puts them in `.in('id', itemIds)` (`visibility/route.ts:38-46`) and `.in('loot_item_id', allowedItemIds)` (`:268-274`) and ignores the page error: `const { data: page } = await serviceSupabase ... if (!page || page.length === 0) break` (`:268-275`). A rejected request returns `rankings: []`, which the sheet shows as an empty phase with items missing too (WR-02).
**How to avoid:** chunk both `.in()` calls at 100 ids, read with `selectAllPagesOrThrow`, and make `paginatedSelect` in `filterItemsToEarnedPhases` an OrThrow read. The client's BLP GET for ranked needs (`MasterSheetContent.tsx:841-848`) should be requested in chunks of 100 as well. Do not touch the item-only BLP call, so Known behaviour stays identical. The actual URL limit is not verified in this repo (A5); chunking makes it moot.

### P4. The editor's `rankings` map and slot 3
**What goes wrong:** the editor reads only `-1` and `-2` keys. In the mixed-group fail-closed path the slot-3 need rows are in `rankings`, invisible, and re-sent on save (kept, not dropped). The Known editor's `copyLimitState` and bracket counters only look at ids it knows.
**How to avoid:** do not render the picker for a mixed group; add a test that a save from the editor in that state keeps the hidden rows; never read slot as tier.

### P5. Award locks on fan-out rows
**What goes wrong:** a lock sits on one tier's `(rank, slot)`. If the tier-to-slot order shifts (a tier is toggled inactive, a new tier is added, ids sort differently), a re-save puts that need at another slot and the RPC raises `Rank N is locked to <need name>`. A picker change at a locked position also fails the whole 15-row save.
**How to avoid:** slot order from `(sort_order, id)` over all phase-group Discovery tiers; the picker marks a row locked if any of its slot keys is in `lockedPositions` and disables changing it; surface the RPC message verbatim.

### P6. Copy caps and error duplication per tier row
**What goes wrong:** `copyGroupKey` is `id:<need row id>` for a need (`item-copies.ts:36-38`), so each tier's row is its own group: one cap violation prints three near identical lines, and a third Ring built from three different keys passes because each row counts once. `validateItemCopyLimits` therefore enforces "the same need at most `maxCopiesForNeed(slot)` times", not "at most two Ring picks".
**How to avoid:** dedupe the 422 message by `need_key`; decide in the plan whether slot-wide caps are wanted (Open Question 2); the UI-SPEC copy "You already have two of these in your 5" reads as per need.

### P7. Known guilds seeing any change
Phase 4 touches Known guilds in four ways, all intended or neutral: score surfaces gain standing and interest (D-21); `loot_style` appears in the addon payload (F14); the Loot system settings modal gains a preset block; `proxy.ts` `next` keeps the query for every protected page (benign). Keep the editor path byte-for-byte (`list_mode` Known short-circuit), keep chunking result-identical, and never change `DEFAULT_SETTINGS`.

### P8. Stale cache after an officer switches list mode
`GET /api/loot-items` answers `Cache-Control: private, max-age=60, stale-while-revalidate=300` and `GET /api/raid-tiers` the same. A raider can see the old mode for up to 60 seconds (5 minutes stale). Accept it, but the picker must derive "Discovery" from the same tiers payload that supplied its items, never from two cached responses.

### P9. A Discovery list that predates a newly activated tier
Existing lists lack rows for the new tier until the raider re-saves. `readNeedPositions` should report missing tiers so the picker opens in the changed state ("Save my 5") rather than showing "saved".

### P10. Overview and officer review show the fan-out three times
`DashboardContent.tsx` builds its loot priority from every live row (it reads `kind, boss_name, raid_tier_id`), sorts by score and keeps five, so one raider's 15 rows put the same need up to three times in the top five. Officer review (`LootSubmissionsContent.tsx:694` embeds `loot_item:loot_items(id, name, boss_name, item_slot, wowhead_id, classification)`, no tier) lists 15 lines with identical names. Decide in the plan: group by rank and show "all 3 raids", or add the tier name (embed `raid_tier:raid_tiers(name)`).

### P11. Settings that look like they save but do not
`LootSettingsContent` saves only the fields in `safeSettings`; a preset or `loot_style` missing there is silently dropped on the next autosave and the picker reverts to "Custom". The PUT also silently drops anything outside `ALLOWED_SETTINGS_FIELDS` (`pickAllowedSettings`), so add the field in both places and test the round trip.

### P12. `saveSubmission` collapses server errors to a message
`LootListContext.saveSubmission` throws `new Error(data.error || 'Couldn\'t submit list')` and drops `code`. The picker needs the refusal kind (over budget versus not usable) to mark the row. Either extend `saveSubmission` to carry the `code`, or have the picker call a small variant that returns `{ ok, code, error }`; do not parse the sentence.

## Code Examples

### Position, fan-out and read-back (pure, shape only)
```ts
// domain/loot/need-picks.ts  (design sketch; values from D-01 and D-02)
export const NEED_PICK_RANKS = [50, 49, 48, 47, 46] as const
export function rankForPosition(position: number): number { return NEED_PICK_RANKS[position] }

export function assignTierSlots(tiers: ReadonlyArray<{ id: string; sort_order: number | null }>): Record<string, number> | null {
  const ordered = [...tiers].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id.localeCompare(b.id))
  if (ordered.length === 0 || ordered.length > 8) return null   // fail closed to the editor
  return Object.fromEntries(ordered.map((t, i) => [t.id, i + 1]))
}
// buildNeedRankings: for each (position, tier) -> `${rank}-${slot}` = needRowFor(tier, key)
```

### Budget, one cost per pick (pure, shape only)
```ts
export const NEED_BUDGET_POINTS = 10
export function needBudgetUsed(rows: ReadonlyArray<{ rank: number; need_key: string; allocation_cost: number }>): number {
  const costByPick = new Map<string, number>()               // key: `${rank}|${need_key}`
  for (const r of rows) {
    const k = `${r.rank}|${r.need_key}`
    costByPick.set(k, Math.max(costByPick.get(k) ?? 0, r.allocation_cost))
  }
  return [...costByPick.values()].reduce((a, b) => a + b, 0)
}
```

### Score split helper (no change to `total`)
```ts
// domain/scoring/engine.ts
export function toScoreResult(total: number, components: ScoreComponents): ScoreResult {
  return { total, components, interest: components.itemRank, standing: total - components.itemRank }
}
// computeScore ends with: return toScoreResult(total, components)   // total expression above it is untouched
```

### Keep the query through sign-in (F2)
```ts
// proxy.ts:318 today: loginUrl.searchParams.set('next', pathname)
loginUrl.searchParams.set('next', pathname + request.nextUrl.search)
// isSafeNextPath('/loot-list?guild=<uuid>&picker=1') is true (lib/post-auth-redirect.ts:34-58)
```

### Chunked visibility reads (WR-02 shape)
```ts
const CHUNK = 100
for (let i = 0; i < allowedItemIds.length; i += CHUNK) {
  const ids = allowedItemIds.slice(i, i + CHUNK)
  const rows = await selectAllPagesOrThrow<RankingRow>('master sheet rankings', (s, e) =>
    serviceSupabase.from('loot_submission_items').select('rank, slot, submission_id, loot_item_id')
      .in('loot_item_id', ids).is('removed_at', null).order('id', { ascending: true }).range(s, e))
  rankings.push(...rows)
}
```

### Discord link-button body [CITED: docs.discord.com/developers/components/reference]
```ts
{ embeds: [/* sign-off copy */], allowed_mentions: { parse: [] },
  components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Set your 5', url }] }] }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Need ranking held by DB trigger and a route predicate | Budget and eligibility checks in submit, trigger dropped | Phase 4 (this) | One PR lifts the hold, one migration drops the trigger |
| Tier delete cascades through need rankings | WHEN-gated predicate guard on `raid_tiers` | Phase 4 (this) | Closes WR-04 for browser sessions |
| Hand-built `ScoreResult` in three components | One exported helper | Phase 4 (this) | Required split fields never break callers |

**Deprecated or outdated:**
- `NEED_RANKING_HOLD_ERROR`, `NEED_RANKING_HELD`, `isHeldNeedRanking`, `domain/loot/need-ranking-hold.ts` and its test: deleted with the hold (D-08).
- Discord docs moved from `discord.com/developers/docs` to `docs.discord.com/developers`; use the new host.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Dual-wield classes (Warrior, Rogue, Hunter, Shaman, Death Knight, Monk) and relic classes (Paladin, Druid, Shaman, Death Knight) for Forever rules | Topic 3 | Wrong rows offered or hidden; the defaults gate and owner review catch it |
| A2 | `PHYSICAL_STAT_BY_CLASS` (strength: Warrior, Paladin, Death Knight; agility: Hunter, Rogue, Monk; both: Shaman, Druid) | Topic 3 | A raider is offered or denied a stat family; Enhancement Shaman and Feral are already called out for review |
| A3 | Preset knob values for the three loot styles | Topic 3 | Wrong scoring feel; the owner reviews with the copy (D-17) |
| A4 | PostgreSQL lock levels for ADD, VALIDATE and DROP CONSTRAINT as summarised in Topic 2 | Topic 2 | Longer lock on `loot_submission_items` than expected; the table is small and `lock_timeout` is set |
| A5 | PostgREST or gateway URL limit near 16 KB for 435 uuids | Pitfall P3 | Chunking is harmless if the limit is higher; the review also marks the limit as unverified |
| A6 | A serverless function that DMs about 100 members may exceed the default timeout | Topic 5 | Send fails midway; set `maxDuration` or bound concurrency |
| A7 | Discord opens DM channels throttled separately (code 40003); no documented number | Topic 5 | Too many skips; use bounded concurrency and report counts |
| A8 | Reusing the first preset as "today's defaults" means linear, 8 weeks, no signups | Topic 3 | UI-10 mismatch; confirm with owner |
| A9 | The addon repo's `gen_web_fixtures.mts` may serialise whole `ScoreResult` objects | Topic 4 | Two new keys appear in addon fixtures; ask the owner to run it once |
| A10 | `loot_style` ids `reward_attendance`, `even_rotation`, `officers_decide` | Topic 2 | Renaming later is a migration (the check constraint) |

## Open Questions (RESOLVED)

Every question below was settled in 04-CONTEXT.md on 2026-11-10 (clarifications D-28 to D-31 and the amendments); the resolution is marked on each.

1. **Which specs, and what defaults?** RESOLVED by D-09 and D-31: defaults for the 18 specs of the nine Forever classes, Death Knight and Monk have none and are listed in SPECS_WITHOUT_DEFAULT, Shadow Priest's fifth pick becomes a Standard cloth piece or a Medium ring; the owner review of the file is still pending at the 04-02 stop.
   - What we know: roadmap and research say 22 specs; `class_specs` seeds 23 names (Arms and Fury merged into `Arms/Fury`); FEATURES has 19 default rows (Arms and Fury separate, no Death Knight or Monk); Shadow Priest's row costs 11.
   - What's unclear: whether Death Knight and Monk exist for Forever, which of Arms or Fury is the `Arms/Fury` default, the Shadow Priest fifth pick.
   - Recommendation: the planner puts the defaults file in one task with an owner checkpoint; the gate test lists `SPECS_WITHOUT_DEFAULT` explicitly so a missing spec is a visible decision.
2. **Slot-wide copy caps for needs.** RESOLVED by D-29: caps stay per need key as Phase 3 shipped them.
   - Known: caps are per need row, so Chest twice with different stats and a third Ring from three keys pass the server (P6).
   - Unclear: whether D-07 "a second Ring or Trinket need costs again" intends a slot-wide cap.
   - Recommendation: keep per-key (matches shipped behaviour and the UI-SPEC strings); add a slot-wide check only if the owner asks.
3. **"Set your 5" consent and volume.** RESOLVED by D-30: officer-only with the confirm modal, counts only, a 60 minute server cooldown per guild, bounded DM work; no member opt-out ships in this phase. No opt-out preference exists for this message; `notify_resubmit_reminder` is specific to resubmits. Recommendation: officer-only, confirm modal (UI-15), counts only, a server cooldown; ask the owner whether members need an opt-out before the first send.
4. **"Pass and see item bonuses" in D-17 is not a column.** RESOLVED by D-17 amended: the three single-item bonus flags, confirmed at the copy review. Recommendation: map it to the three single-item flags (`role_bonus_priority_single_item`, `class_bonus_priority_single_item`, `single_raider_bonus_single_item`) and confirm in the copy review.
5. **Preset visibility for Known (Classic) guilds.** RESOLVED by D-19 amended: presets show for every guild; the Forever-only option was not taken. D-19 does not say. Recommendation: show presets only for guilds whose game is Forever (`getGuildGame(activeGuild) === 'forever'`), so Classic guild screens and creation stay unchanged.
6. **Addon `settings` payload and `loot_style`.** RESOLVED by D-30: the two addon routes drop the key server-side (plan 04-15). Recommendation: drop the key server-side in the two addon routes so Known payload bytes do not change (F14); low effort, optional.
7. **Fan-out presentation on Overview and officer review (P10).** RESOLVED by D-28: one line per need position, grouped by rank, showing "all 3 raids" or the tier names. Recommendation: group by rank in both, showing "all 3 raids" or the tier names.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | all tests, tsx | yes | v22.23.0 | none needed |
| npm | `npm ci`, scripts | yes | 10.9.8 | none needed |
| `node_modules` in the worktree | Vitest, typecheck, lint | **no** (`ls node_modules` fails) | n/a | run `npm ci` in the worktree before executing |
| git, gh, supabase CLI | PRs, merge, deploy | yes | n/a (paths found) | none needed |
| PGlite | migration proofs | via `npm ci` (pinned 0.5.8) | 0.5.8 | none |
| Live Discord / Wowhead / wago | not used | n/a | n/a | tests mock `discordFetch` |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** worktree `node_modules` (run `npm ci`).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.12 with jsdom 29.1.1 and Testing Library 16.3.2 (`package.json:102,93,82`); PGlite 0.5.8 for SQL |
| Config file | `vitest.config.ts` (jsdom default, `testTimeout: 15000`, alias `@`); route and PGlite tests set `// @vitest-environment node` |
| Quick run command | `npx vitest run <file>` |
| Full suite command | `npm test` then `npm run typecheck` and `npm run lint` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISC-02 | five positions become 15 rows at ranks 50-46 and slots by tier order; picker renders one `<ol>` of five, "Looks right" is one click | unit + component | `npx vitest run domain/loot/__tests__/need-picks.test.ts "app/(app)/loot-list/components/__tests__/NeedPicker.test.tsx"` | Wave 0 |
| DISC-02 | a raider saves 15 rows through `save_submission_items` including slot 3 | PGlite | `npx vitest run app/services/__tests__/need-lists-pglite.test.ts` | Wave 0 |
| DISC-02 | 375px layout | manual / puppeteer | `node scripts/visual/baseline.mjs` style capture at 375x667 and 320 | manual-only: jsdom has no layout |
| DISC-03 | budget sum counts each pick once; over budget answers 422 and writes nothing | unit + route | `npx vitest run domain/loot/__tests__/need-budget.test.ts app/api/loot-submissions/submit/__tests__/route.test.ts` | Wave 0 / extend |
| DISC-03 | the hold is gone from route, module and DB | route + PGlite + inventory | submit route test, `need-lists-pglite.test.ts`, `lib/loot/__tests__/need-reader-inventory.test.ts` | extend |
| DISC-04 | defaults gate: five keys, within budget, eligible, spec exists | unit | `npx vitest run domain/loot/__tests__/need-defaults.test.ts` | Wave 0 |
| DISC-04 | eligibility matrix and the route refusal | unit + route | `npx vitest run domain/loot/__tests__/need-eligibility.test.ts` and submit route | Wave 0 / extend |
| DISC-05 | bootstrap and `GET /api/loot-items` return needs only for Discovery tiers, `list_mode` per tier; mixed group fails closed | route | `npx vitest run app/api/loot-list/bootstrap app/api/loot-items lib/__tests__/loot-items-query.test.ts` | extend |
| DISC-08 | totals unchanged; standing plus interest equals total within float tolerance; sentences | unit | `CI=true npx vitest run domain/scoring` and the Lua `cmp` | extend |
| DISC-08 | five surfaces render the split | component | `npx vitest run "app/(app)/master-sheet/components/__tests__" app/components/__tests__/ScoreComparisonModal.test.tsx` | extend / Wave 0 |
| DISC-10 | presets map, `presetMatches`, confirm diff; PUT rejects an unknown `loot_style`; `POST /api/guilds` accepts and applies it | unit + route | `npx vitest run domain/guild/__tests__/loot-style-presets.test.ts app/api/guild-settings app/api/guilds` | Wave 0 / extend |
| DISC-10 | `loot_style` check on the three ids; null allowed | PGlite + contract | `need-lists-pglite.test.ts`, `need-lists-migration.test.ts` | Wave 0 |
| DISC-11 | Discord route: permission, Discovery gate, counts only, 403 quiet, no ids logged | route | `npx vitest run app/api/discord/set-your-five` | Wave 0 |
| DISC-11 | proxy keeps the query in `next`; deep-link entry switches guild to the main character | unit + component | proxy test, `SetYourFiveCard` / entry test | Wave 0 |
| WR-02, WR-03, WR-04 | chunked visibility reads throw on page error; prio-list drops needs with a failing-capable test; tier delete guard | route + PGlite | visibility route test, prio-list test, `need-lists-pglite.test.ts` | extend / Wave 0 |
| Known unchanged | golden seeder rows and scoring fixtures | golden | `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scoring` | exists |

### Sampling Rate
- **Per task commit:** the single new or edited test file plus its neighbours (`npx vitest run <paths>`).
- **Per wave merge:** `npx vitest run app/api lib domain app/services --maxWorkers=2` (Phase 3 used `--maxWorkers=2` to avoid worker exhaustion), then `npm run typecheck`.
- **Phase gate:** `npm test`, `npm run typecheck`, `npm run lint`, the golden command, the Lua byte comparison, and the end-of-phase human check at 375px.

### Wave 0 Gaps
- [ ] `domain/loot/__tests__/{need-picks,need-budget,need-eligibility,need-defaults}.test.ts` and `__fixtures__/class-specs.json`
- [ ] `domain/guild/__tests__/loot-style-presets.test.ts`
- [ ] `app/services/__tests__/need-lists-{migration,pglite}.test.ts`
- [ ] `app/api/discord/set-your-five/__tests__/route.test.ts`
- [ ] `NeedPicker` and `SetYourFiveCard` component tests; a proxy `next` test
- [ ] Framework install: `npm ci` in the worktree

## Security Domain

`security_enforcement` is true with `security_asvs_level: 1` and `security_block_on: "high"` (`.planning/config.json:47-49`).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (deep link sign-in) | existing Supabase auth, `proxy.ts`, `isSafeNextPath` for `next` |
| V3 Session Management | no change | existing cookies and `refreshSupabaseSession` |
| V4 Access Control | yes | `verifyPermission(..., 'manage_settings')` for the sender and preset writes; character ownership on save and submit; `save_submission_items` owner or officer; tier delete guard; the `guild` query param is never an authorization input |
| V5 Input Validation | yes | `findNeedDefinition` for need keys, the pure budget and eligibility checks, UUID validation of `guild`, `isLootStyleId` plus the DB check for `loot_style`, `ALLOWED_SETTINGS_FIELDS` |
| V6 Cryptography | no | no new secrets; the bot token stays in `DISCORD_BOT_TOKEN` |
| V7 Error and Logging | yes | no ids or names in logs; counts only |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Over-budget or ineligible list through a direct API or RPC call | Tampering | submit route 422 from the same pure checks; drafts are unconstrained and cannot be approved without submit |
| Open redirect through `next` | Spoofing | `isSafeNextPath`; the new query keeps the same-origin rule (F2) |
| IDOR through the `guild` or `character` parameters | Elevation of privilege | `switchGuild` checks membership, routes re-verify ownership; the link carries no character id or token (D-24) |
| DM spam or abuse of the sender | Denial of service / abuse | officer permission, confirm modal, server cooldown, counts only, `allowed_mentions: { parse: [] }` |
| Officer deletes a Discovery tier and cascades need rankings and awards | Tampering | WHEN-gated predicate guard (WR-04), probe-proven |
| Mass assignment through the settings PUT | Tampering | explicit allowlist; add `loot_style` deliberately and validate its value |
| Discord ids leaking into logs | Information disclosure | never log recipients; outcome logging uses stage and status only (`trial-ending.ts:381-390`) |

## Sources

### Primary (HIGH confidence)
- In-repo files opened this session (quoted with path and lines above): `04-CONTEXT.md`, `04-UI-SPEC.md`, `03-VERIFICATION.md`, `03-REVIEW.md`, `03-07/03-09/03-10/03-14-SUMMARY.md`, migrations `20260101000000_baseline_schema.sql`, `20261003120000_unique_live_loot_list_item_positions.sql`, `20261004020000_delete_guild_with_reserve_runs.sql`, `20261020120000_discovery_schema.sql`, `20261028120000_award_slot_locks.sql`, `app/api/loot-submissions/{submit,review,revert,reopen,remove-item}/route.ts`, `app/api/loot-list/bootstrap/route.ts`, `app/api/loot-items/route.ts`, `lib/loot-items-query.ts`, `app/contexts/LootListContext.tsx`, `app/api/master-sheet/visibility/route.ts`, `app/api/prio-list/route.ts`, `app/api/raid-tiers/route.ts`, `app/api/guild-settings/route.ts`, `app/api/guilds/route.ts`, `app/api/discord/*`, `lib/discord.ts`, `lib/billing/trial-ending.ts`, `proxy.ts`, `lib/post-auth-redirect.ts`, `domain/loot/*`, `domain/scoring/*`, `data/class-proficiencies.ts`, the reader inventory and PGlite tests.
- PGlite 0.5.8 probe run this session (draft migration on the full chain).
- https://docs.discord.com/developers/components/reference (link button), https://docs.discord.com/developers/topics/opcodes-and-status-codes (50007, 50278, 40003), https://docs.discord.com/developers/topics/rate-limits (50 requests per second, 429 shape, invalid-request limit).

### Secondary (MEDIUM confidence)
- `.planning/research/FEATURES.md` default table, checked mechanically against `NEED_DEFINITIONS`.

### Tertiary (LOW confidence)
- PostgreSQL lock levels and PostgREST URL limits (A4, A5), from training knowledge.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, no new packages.
- Architecture: HIGH, each path read and the migration probe-proven.
- Pitfalls: HIGH for the in-repo ones (P1 to P6, P10 to P12); MEDIUM for P8 and the URL limit.
- Eligibility and presets: MEDIUM, rules marked `[ASSUMED]` for owner review as D-10 and D-17 require.

**Research date:** 2026-11-10
**Valid until:** 2026-11-24 for the repo facts (main moves; re-check `proxy.ts`, the inventory and the PGlite test before planning if more PRs merge), 30 days for the Discord API facts.
