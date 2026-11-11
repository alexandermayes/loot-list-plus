# Phase 4: Discovery Lists and Score Split - Context

**Gathered:** 2026-11-10
**Status:** Ready for planning

<domain>
## Phase Boundary

A raider in a Discovery guild fills a one-column, five-row need picker (slot, armour class where it matters, stat family) on a phone in under a minute, sees the 10-point budget as one sentence and cannot save over it, can accept a default list for their spec with one "Looks right" tap, and can open the picker from a Discord "Set your 5" link. One save ranks those five needs in every Discovery raid tier of the expansion. An officer setting up a guild picks one of three loot style presets, with Fine-tune behind a disclosure. Every score shows standing and interest separately, each with a one-sentence explanation, and the score total for Known guilds is unchanged (golden fixtures and the Lua parity fixtures byte-identical).

The phase also lifts the Phase 3 holds that kept need rows out of raiders' hands (the D-22 ranking hold, the `includeNeeds` default, the held officer list-mode control) and closes the Phase 3 verification warnings that must be closed before a need can be ranked (WR-01, WR-02, WR-03, WR-04).

Out of this phase: the Drop Desk and pinning revealed items (Phases 5 and 6), off-spec need rows and the rare-drops opt-in (they matter at the Desk, Phases 5 and 6), the "What would it take" line (DISC-09, Phase 6), bot `/priority` for needs (Phase 5), the slot-weighted loot cost component (PLAT-02, later milestone), the Known-mode transition (deferred milestone).

</domain>

<decisions>
## Implementation Decisions

### Carried forward from Phase 3 (not re-asked; see `03-CONTEXT.md` and the 03-xx summaries)
[informational] Need rows are `loot_items` rows with `kind = 'need'`, a stable `need_key`, cost in `allocation_cost` (Big 3, Medium 2, Standard 1) and a mirrored `classification` (Phase 3 D-06, D-08). One row per need key per Discovery tier; the frozen 145-key taxonomy in `domain/loot/needs.ts` is the single source (Phase 3 D-11, D-12). Forever tiers start in Discovery (D-01); switching back to Known is blocked once a need is ranked or awarded (D-03). Need rows are outside the bracket rules (03-04) and keep their copy caps (two Ring or Trinket needs, one of anything else). Reserves, BIS import, addon and companion exports and bot `/priority` stay item-only (D-14). A need award records `loot_history.loot_item_id` = the need row and `awarded_item_id` null until the Desk (D-15). Display names, `NEED_RANKING_HOLD_ERROR`, `NEED_ROW_FIXED_ERROR`, `RESERVES_UNAVAILABLE_ERROR` and the two list-mode reason strings are proposed copy still awaiting the owner's sign-off, which now happens with the Phase 4 copy review.

### Ranking shape
- **D-01:** The five main-spec needs sit at ranks 50, 49, 48, 47 and 46 (need #1 = rank 50), so `interest` runs 50 down to 46 and need #1 scores 4 points above need #5, the same size as the attendance range. The position-to-rank mapping is one pure function in `domain/loot` so it can be retuned later. — **Reversibility:** costly — rank values are stored in `loot_submission_items` and in approval snapshots; a retune changes the interest of every existing Discovery list.
- **D-02:** All three Forever raids are Phase 1, so one `loot_submissions` row (character, guild, expansion, phase) holds the five needs times every Discovery tier in the phase group: 15 live rows. At each need's rank, each Discovery tier takes one slot (slot 1, 2, 3 in a stable tier order chosen at save time). The slot is a uniqueness device only; every reader resolves the tier through the need row's `raid_tier_id`, never through the slot number. The Phase 4 migration widens the `loot_submission_items.slot` check from 1..2 to 1..8 (NOT VALID then VALIDATE), and `save_submission_items` is updated in the same migration if it checks the slot. — **Reversibility:** one-way — a check constraint change and stored slot values above 2 that the Known editor never produces.
- **D-03:** Officer class prio pools do not apply to need rows. A need is open to every class and spec that can use its slot, armour class and stat family; need rows carry no `loot_item_classes`, `findPrioViolations` never flags one, and `POST /api/loot-items/specs` keeps refusing need rows with `NEED_ROW_FIXED_ERROR`. Officers steer with priority bonuses later, not by locking needs.
- **D-04:** Phase 4 ships the five main-spec rows only. The "Off-spec gear too" toggle (need rows at off-spec ranks 24 and below, which already rank under every main-spec need) and "Count me in for rare drops" arrive with the Drop Desk (Phases 5 and 6), where they are read.
- **D-05:** Re-ranking works like an item list: any change goes back through pending and officer approval (approve, reject and the audited reopen route all apply). Award slot locks apply to need rows only when the guild has `award_slot_lock_enabled` on; the lock lands on the (rank, slot) row of the awarded tier's need row, so `pickLockTarget` and `findLockViolations` work unchanged.

### Budget
- **D-06:** The budget is fixed at 10 points in Phase 4 (`NEED_BUDGET_POINTS` in a new `domain/loot/need-budget.ts`), not a guild setting. Cost is summed once per picker position over the five rows, read from the need row's `allocation_cost` (identical across tiers), never once per tier. Fine-tune may expose the budget later without a schema change now.
- **D-07:** The picker blocks a save that goes over budget and the submit route refuses one with 422 through the same pure check, so no API caller can rank an over-budget list. The budget sentence is proposed copy for sign-off: "8 of 10 points used." and, when a pick would go over, "That's three big picks. Swap a weapon or trinket for armour." Copy caps still apply: a second Ring or Trinket need costs again.
- **D-08:** The D-22 hold (the `isHeldNeedRanking` call in the submit route, `domain/loot/need-ranking-hold.ts` and its test, and the `enforce_need_ranking_hold` trigger and function) is lifted in the same code PR that adds the submit-side budget check, after the migration that drops the trigger is live, so there is no window in which a need can be ranked without a budget.

### Defaults and eligibility
- **D-09:** Spec defaults are a frozen data file, `domain/loot/need-defaults.ts`: one ordered list of five need keys per spec, keyed by the `class_specs` name and class, gated by a test (exactly five keys, within budget, every key in `NEED_DEFINITIONS`, every key eligible for that spec under D-10). The owner reviews the file before its PR merges (the Decision 5 input, with Enhancement Shaman and Feral called out); later edits are PRs. No per-guild editing (scope creep, noted under deferred).
- **D-10:** Eligibility is one pure function in `domain/loot` (for example `eligibleNeedsFor({ className, specName })`): only slots the class can equip (weapon and shield proficiency from `data/class-proficiencies.ts`, off-hand items, relics and ranged by class), armour classes up to the class maximum with lighter armour allowed, and stat families the spec's roles can use. Hidden rows are never offered and the submit route refuses a need outside the character's eligible set. The exact matrix is Claude's discretion, reviewed with the defaults file.
- **D-11:** "Looks right" is the primary button while the list equals the spec default and nothing has changed; "Save my 5" after any edit. A raider who already has a Discovery list opens it as saved. A spec with no default (a spec the taxonomy cannot serve) opens an empty picker with the five rows to fill.

### Picker surface
- **D-12:** `/loot-list` renders the five-row picker instead of the 50-rank editor when every guild-active tier in the selected phase group has `list_mode = 'discovery'`; Known phase groups keep the editor byte-for-byte. A mixed group cannot occur (Phase 3 D-17 keeps legacy tiers Known) and fails closed to the editor with needs hidden. The bootstrap route returns `list_mode` per tier and passes `{ includeNeeds: true }` to `fetchFilteredLootItems` only for Discovery tiers; `GET /api/loot-items` does the same. No new page.
- **D-13:** The master sheet, Summary and Raid Mode keep showing only needs someone has ranked (`keepRankedNeedRows` stays), so a tier with 145 seeded rows shows 10 to 30 rows, not 145. The Phase 3 handoff "stop calling keepRankedNeedRows" is closed as "keep".
- **D-14:** The Overview page shows a "Set your 5" card to a raider in a Discovery guild whose character has no submitted Discovery list; it links to the picker. The same card copy is reused by the Discord message.
- **D-15:** The officer list-mode control held by Phase 3 D-02 ships now: in `app/(app)/expansions/[expansionId]/_client.tsx` beside the guild-active and master-sheet toggles, gated by `manage_settings`, calling `PATCH /api/raid-tiers` with `{ list_mode }`; the 409 and 400 reasons from the route are shown as they come back.
- **D-16:** The picker's question flow (slot, armour class where it matters, stat family) is built as one reusable component with a controlled value so the Drop Desk can classify a drop with the same component in Phase 5. Phone first: one column, tap targets, no drag on mobile, verified at 375px.

### Presets
- **D-17:** Three loot style presets under the research names, held as draft copy for sign-off: "Reward attendance", "Even rotation" and "Officers decide, score advises". Each is a frozen map of `guild_settings` scoring knobs (attendance type and bonuses, signup weight, bad luck protection on or off and its increment and maximum, guild rank and role bonuses on or off, pass and see item bonuses, slot restriction enforcement) in a pure module such as `domain/guild/loot-style-presets.ts`. The exact knob values are Claude's discretion, proposed in the plan and reviewed by the owner with the copy. The community's council-style preset (attendance, bad luck protection and a preparation score side by side) waits for the preparation score component, which is deferred past v2.0.
- **D-18:** The chosen preset is stored in a new nullable `guild_settings.loot_style` column (text, check constraint on the three ids) added by the Phase 4 migration. Applying a preset writes the knobs and the column through the existing guild-settings PUT. "Customised" is computed by comparing the live knobs to the preset map, never stored, so a Fine-tune change shows as "Customised" without clearing the choice. Existing guilds have `loot_style` null and show "Custom" until an officer picks one; their knobs are never touched by the migration. — **Reversibility:** one-way — a new column.
- **D-19:** Presets appear in the guild creation settings step (`CreateGuildModal`) and at the top of the scoring settings in Guild Settings, with "Fine-tune" as a disclosure that reveals the existing knobs unchanged. Picking a preset in Guild Settings asks for confirmation when it would change knobs an officer already customised.

### Score split
- **D-20:** `computeScore` returns `{ total, components, standing, interest }`: `interest = components.itemRank`, `standing = total - interest` (attendance, rank, role, bad luck protection, priority, trial, donation and raider bonuses). The total formula is unchanged and no component is added in Phase 4 (the slot-weighted loot cost of PLAT-02 stays out), so `LOOT_SCORE_FIXTURES`, `engine-contracts.test.ts`, the golden seeder rows and the Lua fixture exporter (`domain/scoring/__tests__/export-fixtures.ts`) are byte-identical and the award receipt whitelist needs no new key.
- **D-21:** `explainScore` adds `standing` and `interest` with one plain sentence each (draft copy: "Standing 7.5: attendance 3 of 4, bad luck protection 2, officer bonus 2.5." and "Interest 50: your number 1 pick."), and every score surface shows the two side by side with the total: the Overview score widget, the master sheet tooltip and candidate modal, and the score comparison modal, for every guild (Known and Discovery), since the total is the same number. The bot `/score` stays attendance-only (its v1 scope) and the Discord embeds are unchanged.
- **D-22:** For a need row the interest sentence names the need position ("your number 2 pick") and the standing sentence is the same as for an item; no Discovery-only scoring branch exists.

### Discord "Set your 5"
- **D-23:** The app sends it; the bot is not changed and Railway does not redeploy. An officer button in the Discord section of Guild Settings, shown only when the active expansion has a Discovery tier, posts one message with a link button to the guild's raid summary channel and DMs every active member whose profile has a Discord id, through `lib/discord.ts` (`discordFetch`, `sendDirectMessage`). DM refusals (403, code 50007) are quiet; the result shows counts only (sent, skipped), never names. Draft copy: "Set your 5 for Forever raids (1 minute)".
- **D-24:** The link is `${NEXT_PUBLIC_APP_URL}/loot-list?guild=<guild_id>&picker=1`, no character id and no token. The app opens the picker for the member's main character in that guild; a signed-out raider signs in first and lands there through the existing post-auth redirect. A member with no character in the guild lands on the create-character path.

### Schema and Phase 3 warnings
- **D-25:** One Phase 4 migration-only PR, expand-only, `--admin` merge on a non-raid day, live before any code PR that depends on it: drop trigger and function `enforce_need_ranking_hold`; widen the `loot_submission_items` slot check to 1..8 (and `save_submission_items` if it checks the slot); add `guild_settings.loot_style`; add a WHEN-gated `BEFORE DELETE` guard on `raid_tiers` so an anon or authenticated session cannot delete a Discovery tier that has need rankings or need awards (closes WR-04; service role and `delete_guild` pass as D-27 does). The PGlite behaviour proofs and the migration contract test are extended for each item. — **Reversibility:** one-way — dropped trigger, widened check, new column, new guard.
- **D-26:** Closed before the hold lifts, in the first code PR: WR-02 (the master sheet visibility BLP GET carries ranked need ids in chunks or in a POST body, and the page-loop error is checked and answers 500), WR-01 (`PATCH /api/raid-tiers` applies other fields and the mode switch so a later failure cannot leave a half-applied request), WR-03 (the prio-list route selects `kind` and filters or branches on it so its need test can fail). WR-05 (reserve-run tier ownership) is fixed in the same PR as a small cross-guild check.
- **D-27:** "Looks right" and "Save my 5" save through the existing `save_submission_items` RPC and then submit through `POST /api/loot-submissions/submit`, so the list goes to pending for officer review with the same approve, reject and reopen paths as an item list; nothing is auto-approved.

### Clarifications after research (2026-11-10, recorded by the orchestrator from 04-RESEARCH.md; no owner re-ask)
- **D-28:** Fan-out rows are presented once per need: the Overview loot priority list and the officer review modal group a list's rows by rank and show one line per need position ("all 3 raids", or the tier names when a need is not ranked in every tier); the master sheet, Summary and Raid Mode stay per tier.
- **D-29:** Copy caps for needs stay per need key as Phase 3 shipped them (a Ring or Trinket key may appear twice, every other key once); D-07's "a second Ring or Trinket need costs again" means the same key twice. With D-10 eligibility a spec sees one stat family per slot, so a slot-wide cap is not added in this phase.
- **D-30:** The "Send Set your 5" route is officer-only behind the confirm modal, bounds its DM work (bounded concurrency, a `maxDuration` on the route) and keeps a server-side cooldown per guild of 60 minutes between sends; members who refuse DMs (403, code 50007) are skipped quietly and no member opt-out ships in this phase. The addon `guild-data` and `export-string` routes drop `loot_style` from their settings payload so Known guild payload bytes do not change.
- **D-31:** Spec defaults (D-09) cover the specs of the nine classes that exist in WoW Forever (Warrior Arms/Fury and Protection; Paladin Holy, Retribution and Protection; Hunter; Rogue; Priest Holy/Disc and Shadow; Shaman Restoration, Elemental and Enhancement; Mage; Warlock; Druid Restoration, Feral, Guardian and Balance; 18 lists, one for the `Arms/Fury` row). Death Knight and Monk specs have no default and open an empty picker (D-11); the gate test lists them in `SPECS_WITHOUT_DEFAULT` so a missing spec is a visible decision. Shadow Priest's research row costs 11 because wands sit in the Big Ranged weapon row; its fifth pick becomes a Standard cloth piece or a Medium ring so the list fits 10 points. The owner reviews the file (D-09).
- **D-02 amended:** the stable tier-to-slot order is `(sort_order, id)` over every Discovery tier of the phase group, including tiers the guild turned off, never `getRaidTierOrder` (every Forever tier maps to 999) and never uuid order; the bootstrap route and the client tier type gain `list_mode` and `sort_order`.
- **D-17 amended:** "pass and see item bonuses" means the three single-item bonus flags (`role_bonus_priority_single_item`, `class_bonus_priority_single_item`, `single_raider_bonus_single_item`); confirmed with the copy review.
- **D-19 amended:** the scoring knobs live in the Loot system settings modal (`app/(app)/loot-management/components/SettingsModal.tsx` through `LootSettingsContent`), so the preset block sits at the top of that modal (UI-08) and `loot_style` joins its autosaved `safeSettings`, the settings state and `ALLOWED_SETTINGS_FIELDS`; guild creation sends `loot_style` with `POST /api/guilds`, not through the settings PUT (which would mark the `loot_settings_completed_at` milestone). Presets show for every guild, as decided; the research's "Forever only" option is not taken.
- **D-24 amended:** the sign-in redirect in `proxy.ts` keeps only the pathname in `next`, so the first code PR makes it carry the query string too (`isSafeNextPath` already accepts one), with a test, so the Set your 5 link survives sign-in.
- **D-26 amended:** WR-01 and WR-05 were fixed in the Phase 3 review (recorded in `03-REVIEW.md`, tests in `app/api/raid-tiers/__tests__/route.test.ts` and `app/api/reserve-runs/__tests__/route.test.ts`); D-26 covers WR-02 (chunk the visibility route's `.in()` reads at 100 ids and use `selectAllPagesOrThrow`) and WR-03 (select `kind` in the prio-list embed and drop need rows with `isNeedRow`), and keeps the two existing tests green.
- **D-25 amended:** the Phase 3 PGlite test re-applies the Phase 3 migration file after the whole chain, which would resurrect the dropped hold; the Phase 4 proofs live in a new `need-lists` migration and PGlite test pair on a clean chain, the Phase 3 test's `GUARD_TRIGGERS` list and D-22 describe are updated, the reader inventory drops the `enforce_need_ranking_hold` SQL entry and adds the new tier-delete guard function as a `guard` entry citing the new PGlite test.

### Claude's Discretion
- The exact eligibility matrix (D-10) and the exact five-key default per spec (D-09), proposed from the taxonomy and spec roles and reviewed by the owner.
- The exact knob values behind each preset (D-17).
- The stable tier-to-slot order at save time (D-02) and the chunk size or body shape for the WR-02 fix (D-26).
- The picker's bottom-sheet question flow, icon set and card layout, within the UI design contract (`/gsd-ui-phase 4`).
- How the Overview card and the deep link share one entry component (D-14, D-24).
- Whether the submit route's eligibility refusal (D-10) reuses the prio-violation response shape or adds its own code.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone scope and requirements
- `.planning/workstreams/forever/ROADMAP.md` (Phase 4 and Phase 5 sections) — goal, five success criteria, owner inputs, defaults applied; Phase 5 reuses the picker and the standing and interest split
- `.planning/workstreams/forever/REQUIREMENTS.md` — DISC-02, DISC-03, DISC-04, DISC-05, DISC-08, DISC-10, DISC-11 (lines 33 to 42)
- `.planning/workstreams/forever/MILESTONE-BRIEF.md` — product design already decided (quiz-style picker, points-based restriction, standing and interest split)
- `.planning/workstreams/forever/STATE.md` — standing constraints 1 to 5, pending owner inputs

### Research
- `.planning/research/SUMMARY.md` — "Phase 4: Discovery lists and score split" outline, owner decisions 5, 6, 7, 8 and 16
- `.planning/research/FEATURES.md` — "Concrete proposal: the five-row need picker" (entry points, screen, bottom-sheet questions Q1 to Q3, cost) and feature 8 (loot style presets)
- `.planning/research/ARCHITECTURE.md` §(2) "Standing vs interest in domain/scoring without breaking item-list guilds"
- `.planning/research/PITFALLS.md` — scoring regression and Lua drift (golden lock first, presentation split only), the "why one tap away" rule

### Prior phase outputs this phase builds on
- `.planning/workstreams/forever/phases/03-discovery-schema-and-need-pipeline/03-CONTEXT.md` — decisions D-00 to D-16 this phase inherits
- `.planning/workstreams/forever/phases/03-discovery-schema-and-need-pipeline/03-VERIFICATION.md` — WR-01 to WR-05 classification and the deferred raid-tracking re-import item (Phase 5)
- `.planning/workstreams/forever/phases/03-discovery-schema-and-need-pipeline/03-07-SUMMARY.md`, `03-09-SUMMARY.md`, `03-10-SUMMARY.md`, `03-14-SUMMARY.md` — the Phase 4 handoff lists (includeNeeds, the D-22 hold removal steps, keepRankedNeedRows, the held list-mode control)
- `.planning/workstreams/forever/phases/03-discovery-schema-and-need-pipeline/03-04-SUMMARY.md` — bracket-rule exemption and copy caps for need rows
- `.planning/workstreams/forever/phases/03-discovery-schema-and-need-pipeline/03-12-SUMMARY.md` — the reader inventory rule: every new reader of the three loot tables is listed in `lib/loot/__tests__/need-reader-inventory.test.ts` in the commit that creates it
- `.planning/workstreams/forever/phases/01-forever-defect-and-privacy-fixes/01-CONTEXT.md` — read-error 500 policy (owner decisions 7 and 8) every new reader keeps

### Codebase maps and conventions
- `.claude/CLAUDE.md`, `.planning/codebase/CONVENTIONS.md`, `ARCHITECTURE.md`, `TESTING.md`, `STRUCTURE.md`, `INTEGRATIONS.md` (Discord)
- `.planning/workstreams/design-system/` and `lib/design-system/` — the design system every new screen uses (completed workstream v1.1)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `domain/loot/needs.ts`: `NEED_DEFINITIONS`, `findNeedDefinition`, `needRowColumns`, cost and classification by tier; client-safe, the picker imports it in the browser.
- `domain/loot/item-identity.ts` (`isNeedRow`, `itemIdentityKey`, `wowheadIdForDisplay`, `keepRankedNeedRows`), `domain/loot/slot-capacity.ts` (`maxCopiesForNeed`), `domain/loot/item-copies.ts`: the need branches readers already share.
- `domain/loot/need-ranking-hold.ts` and the submit route call: the exact hold to delete (03-09).
- `lib/loot-items-query.ts` `fetchFilteredLootItems(supabase, character, tierIds, { includeNeeds })`: flip one argument per caller for Discovery tiers; need rows already skip the wowhead-keyed checks.
- `lib/loot/tier-need-rows.ts` (`fetchTierNeedRows`, `fetchTierNeedRankings`): paged tier-scoped need reads for the master sheet.
- `app/contexts/LootListContext.tsx` (`doAutoSave`, `saveSubmission`, `importBisItems`, `reopenForEdit`) and `app/api/loot-list/bootstrap/route.ts`: the save, submit and initial-load paths the picker reuses; `resolveUnlockedPhaseGroups` resolves the phase group.
- `app/api/loot-submissions/submit/route.ts`: bracket rules, copy caps, lock and prio checks run in order; the budget check (D-07) and eligibility refusal (D-10) slot in beside the prio check, which is the model for a pure check plus a route call.
- `domain/loot/prio-violations.ts`, `domain/loot/prio-zones.ts`, `domain/loot/slot-locks.ts` (`pickLockTarget`, `findLockViolations`): keep working on need rows under D-03 and D-05.
- `app/api/raid-tiers/route.ts`: `list_mode` PATCH with the D-03 and D-17 guards and reasons; the held UI control (D-15) calls it.
- `domain/scoring/engine.ts`, `explain.ts`, `domain/types.ts` (`ScoreResult`, `ScoreExplanation`), `domain/scoring/__tests__/fixtures.ts` and `export-fixtures.ts`: the split (D-20, D-21) and the golden and Lua locks.
- Score surfaces: `app/(app)/overview/components/DashboardContent.tsx` (score widget from `explainScore`), `app/(app)/master-sheet/components/BossSection.tsx` and `ItemCandidateModal.tsx`, `app/components/ScoreComparisonModal.tsx`, `app/components/ScoreBreakdownModal.tsx` (the "How loot scores work" explainer).
- `app/api/guild-settings/route.ts` (`ALLOWED_SETTINGS_FIELDS`, PUT), `app/(app)/guild-settings/components/GuildSettingsContent.tsx`, `app/components/CreateGuildModal.tsx` (settings step), `domain/scoring/defaults.ts`: where presets apply knobs (D-17 to D-19).
- `lib/discord.ts` (`discordFetch`, `sendDirectMessage`), `app/api/discord/notify-officers/route.ts` (officer DMs, Discord ids from user preferences), `app/api/discord/post-raid-summary/route.ts`, `lib/post-auth-redirect.ts`: the "Set your 5" delivery and deep link (D-23, D-24).
- `app/(app)/overview/components/SetupGuide.tsx` and the Overview cards: the "Set your 5" card (D-14).
- `app/services/__tests__/helpers/pglite-chain.ts`, `discovery-schema-pglite.test.ts`, `discovery-schema-migration.test.ts`: the migration proof and contract pattern to extend (D-25).
- `data/class-proficiencies.ts`, `domain/loot/spec-role-mapping.ts`, `class_specs` table: inputs to eligibility and defaults (D-09, D-10).

### Established Patterns
- Pure rules in `domain/`, routes validate and call them; one pure check plus one route call per rule (hold, locks, prio) so the editor and submit agree.
- Expand-only migrations with NOT VALID then VALIDATE, WHEN-gated guard triggers, PGlite chain proofs and a regex contract test; the migration PR ships alone and first.
- Golden fixtures run under `CI=true` and are never regenerated; source-scan tests (reader inventory, typed client, no names in analytics) fail CI on an unlisted file.
- Proposed user-facing copy lives in named constants with a sign-off note; no em dashes anywhere.
- Route tests use recording fakes that apply `eq` and `in` filters and default fixture rows to `kind: 'item'`.

### Integration Points
- Bootstrap and `GET /api/loot-items` (includeNeeds for Discovery tiers); the submit route (hold removal, budget, eligibility); `save_submission_items` and the slot check (fan-out rows); `PATCH /api/raid-tiers` (WR-01) and the expansion client (D-15); master sheet visibility route (WR-02); prio-list route (WR-03); reserve-runs create (WR-05).
- `computeScore` callers: `MasterSheetContent.tsx` and `DashboardContent.tsx`; `explainScore` callers: `BossSection.tsx`, `ItemCandidateModal.tsx`, `DashboardContent.tsx`, `ScoreComparisonModal.tsx`.
- Guild settings PUT and the creation modal (presets); Guild Settings Discord section and `lib/discord.ts` (Set your 5).
- Every new reader of `loot_items`, `loot_submission_items` or `loot_history` (the picker's routes, the defaults, the Discord sender if it reads lists) must be listed in `NEED_READERS` in the commit that creates it.

</code_context>

<specifics>
## Specific Ideas

- Picker screen from the research proposal: header "Your top 5 for Forever raids" with the character, class and spec chip; five tappable cards each with the rank number (1 = want most), slot icon, the plain need sentence ("Chest, Plate, Healing"), a Big / Medium / Standard cost marker and "Move up"; the budget line; the primary button "Looks right" or "Save my 5". Changing a row opens a bottom sheet with at most three auto-advancing questions (slot, armour type, stat family), skipping any question already decided.
- Budget copy to sign off: "8 of 10 points used." and "That's three big picks. Swap a weapon or trinket for armour."
- Standing and interest copy to sign off: "Standing 7.5: attendance 3 of 4, bad luck protection 2, officer bonus 2.5." and "Interest 50: your number 1 pick."
- Preset names to sign off: "Reward attendance", "Even rotation", "Officers decide, score advises"; disclosure label "Fine-tune".
- Discord message to sign off: "Set your 5 for Forever raids (1 minute)"; the Overview card uses the same words.
- Owner inputs still open from Phase 3 and folded into this phase's copy review: the 145 need display names, `NEED_RANKING_HOLD_ERROR` (deleted by D-08, so moot), `NEED_ROW_FIXED_ERROR`, `RESERVES_UNAVAILABLE_ERROR`, `DISCOVERY_FOREVER_ONLY_REASON`, `KNOWN_SWITCH_BLOCKED_REASON`, and the NeedLabel look.

</specifics>

<deferred>
## Deferred Ideas

- Off-spec need rows ("Off-spec gear too") and the "Count me in for rare drops" flag: Phases 5 and 6 with the Drop Desk, where they are read (D-04).
- Guild-tunable need budget under Fine-tune (D-06): later, no schema now.
- Per-guild editing of spec defaults by officers (would need a table and UI): post-v2.0 backlog.
- Council-style preset showing attendance, bad luck protection and a preparation score side by side: after the preparation score component (deferred post-v2.0 in Phase 2).
- Slot-weighted loot cost component (PLAT-02): later milestone; no `lootCost` in `ScoreComponents` now (D-20).
- Bot `/priority` for need rows and bot `/score` beyond attendance: Phase 5 and later.
- Raid-tracking event edit re-import drops need awards (Phase 3 deferred item): Phase 5 planning must carry it.
- A `/setmy5` bot slash command: not needed while the app sends the link (D-23); revisit if raiders ask for it.

</deferred>

---

*Phase: 04-discovery-lists-and-score-split*
*Context gathered: 2026-11-10*
