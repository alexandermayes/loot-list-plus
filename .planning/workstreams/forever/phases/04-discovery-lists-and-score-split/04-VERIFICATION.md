---
phase: 04-discovery-lists-and-score-split
verified: 2026-11-11T00:15:00Z
status: human_needed
score: 5/5 roadmap success criteria verified in code (all 7 requirement IDs satisfied in code); 0 failed; 0 behavior-unverified
behavior_unverified: 0
overrides_applied: 0
gaps: []
human_verification:
  - test: "Raider fills the five-row picker on a real phone in under 60 seconds (SC1, DISC-02)"
    expected: "Start from a Discovery guild with a character whose spec has a default, change at least two rows through the question sheet, and tap Save my 5. The whole flow takes under 60 seconds, one column, tap targets at least 44px, no horizontal scroll."
    why_human: "Wall-clock time and thumb ergonomics cannot be asserted by grep or unit tests. Tap counts (1 tap for Looks right, at most 3 per changed row) are pinned by NeedPicker.test.tsx; the 60-second target is not."
  - test: "Layout at 320px, 343px and 375px (SC1, SC2, SC5)"
    expected: "Picker, question bottom sheet, budget footer, ScoreSplit tiles, master sheet popover, comparison modal, preset cards, list-mode row and the Send Set your 5 row show no clipping or horizontal scroll. The longest need sentence ('Shoulders, Leather, Spell damage') wraps to two lines at 375px; the 409 reason wraps under the list-mode row at 320px; the eight-part standing sentence wraps inside the popover; a 300 character rejection note wraps with no max height. Also check 200% zoom."
    why_human: "These are the plan truths tagged verification: backstop (04-11, 04-12, 04-17, 04-20); presence plus wiring never qualifies them."
  - test: "Keyboard and screen-reader pass on the picker, question sheet and preset cards (SC1-SC4)"
    expected: "Rows reachable by Tab, sheet traps focus and returns it, options announce pressed state, a blocked slot announces its reason, the budget live region announces changes, the saved-status region takes focus after save, Fine-tune announces expanded/collapsed, preset RadioGroup is arrow-key navigable."
    why_human: "Real assistive-technology behaviour is not testable in jsdom."
  - test: "Light and dark themes for every new surface"
    expected: "Warning panel (never the danger palette), cost markers (neutral, not traffic-light), ScoreSplit, preset cards and the Customised badge read correctly in every theme."
    why_human: "Visual."
  - test: "Signed-out Set your 5 round trip (SC3, DISC-11)"
    expected: "Opening /loot-list?guild=<guild_id>&picker=1 signed out redirects to sign-in with next carrying the path and query, and after sign-in lands on the picker for the member's main character. A member with no character in that guild sees 'Create a character first'. A non-member stays on their current guild."
    why_human: "proxy.ts carries the query and proxy-next.test.ts passes, but the full OAuth redirect and post-auth consumption needs a browser."
  - test: "Real Discord send of Set your 5 (SC3, DISC-11)"
    expected: "From Guild Settings, the officer confirms and sends once. One channel message with a Set my 5 link button posts, active members with a Discord id get one DM each, the result line shows counts only, a second send inside 60 minutes is refused, and the link button opens the picker."
    why_human: "Requires live Discord. The route is covered by 28 mocked route tests."
  - test: "A Classic or other Known guild is unchanged in a browser (SC5, Known lock)"
    expected: "/loot-list shows the 50-rank editor, score totals match what they were, settings modal still opens with every card (Fine-tune starts expanded for a null loot_style), addon export unchanged."
    why_human: "Automated locks pass (golden gate, Lua exporter, LootListContent mode test, addon payload tests), but a browser pass on a real Known guild is the final proof."
  - test: "Owner sets the changelog ship date in lib/updates-data.ts"
    expected: "The new entry at the top of lib/updates-data.ts carries the placeholder date 'November 10, 2026' and a comment saying to set it to the ship date before merge. Set it before PR 3 merges; the Discord updates cron posts the newest entry after merge."
    why_human: "Only the owner knows the ship date. Copy itself is signed off (04-19-SUMMARY.md, 2026-11-11)."
  - test: "Privacy page note about Discord direct messages (optional, owner decision)"
    expected: "app/privacy/page.tsx describes Discord OAuth but not that the app sends direct messages. Pre-existing gap; Set your 5 adds one more DM type. Owner decides whether to update."
    why_human: "Legal wording decision recorded in 04-19-SUMMARY.md, deliberately not changed."
  - test: "Optional addon repo check (A9)"
    expected: "Run the addon repo's gen_web_fixtures.mts once in case it serialises whole ScoreResult objects, which now carry standing and interest. This repo's Lua exporter never calls computeScore and its output is unchanged."
    why_human: "Lives in a separate repository."
---

# Phase 4: Discovery Lists and Score Split Verification Report

**Phase Goal:** A raider in a Discovery guild sets their needs in under a minute on a phone and sees a score they understand, so Forever lists are usable by Oct 31.
**Verified:** 2026-11-11
**Status:** human_needed (no failed truths, no gaps; the remaining items are device, assistive-technology, theme, live-Discord and owner-date checks)
**Re-verification:** No, initial verification (no prior VERIFICATION.md in the phase directory)

Checkout verified: `work/forever-phase-04` clone, working tree clean, no files modified except this report.

## Goal Achievement

### Observable Truths (ROADMAP success criteria, the contract)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | One-column five-row need picker on /loot-list (slot, armour class where it matters, stat family); one save ranks the needs in every Discovery tier | VERIFIED in code; 60-second phone target is human | `LootListContent.tsx:863` `pickerMode = Boolean(needTierSlots)` renders `NeedPicker` (line 2021). `NeedPicker.tsx` `handleSave` calls `buildNeedRankings` (15 'rank-slot' entries from `NEED_PICK_RANKS = [50,49,48,47,46]`, `domain/loot/need-picks.ts:19`) and `saveSubmission(true, { rankings, quiet: true })`. `assignTierSlots` orders by `(sort_order, id)` and ignores `is_guild_active` (test `need-picks.test.ts:93`). Question flow `NeedQuestionFlow` / `need-questions.ts` asks at most three questions, mounted in `NeedQuestionSheet` (Modal `placement='sheet'`). Bootstrap and `GET /api/loot-items` serve needs only to an all-Discovery group via `resolveNeedListScope` and return `need_tier_slots`; a Known or mixed group gets null and the editor. A failed raid_tiers read throws (500), never an empty picker. |
| 2 | Budget shown as one sentence; a list over budget cannot be saved | VERIFIED | `NEED_BUDGET_POINTS = 10` (`need-budget.ts:24`), counted once per distinct (rank, need_key). Picker: `BudgetLine` footer, `wouldGoOver` blocks the tap (`NeedPicker.tsx:455`), Save disabled when `overSentence !== null` (line 630, and `handleSave` early-returns). Server: `submit/route.ts` lines 246-261 run `checkNeedList` before any write and return 422 `NEED_BUDGET_EXCEEDED` with `used`/`limit`; second 422 `NEED_NOT_ELIGIBLE` follows. Copy caps per need key still apply (`needCopyViolations`, deduplicated once per need). |
| 3 | Default list for the spec with one "Looks right" tap; picker opens from a Discord "Set your 5" link | VERIFIED in code; real Discord and sign-in round trip are human | `need-defaults.ts` (18 lists, gate test `need-defaults.test.ts` passes: five distinct keys, within 10 points, every key eligible, every seeded pair has a default or is in `SPECS_WITHOUT_DEFAULT`). `NeedPicker.tsx` copy `lookRight: 'Looks right'` when `matchesSpecDefault`, else `Save my 5`; one tap = one `saveSubmission` call (`NeedPicker.test.tsx:88`, `:727`). Link: `buildSetYourFiveUrl` -> `${origin}/loot-list?guild=<id>&picker=1`, no character id or token. `proxy.ts` now sets `next = pathname + request.nextUrl.search` (`proxy-next.test.ts` passes). `SetYourFiveLinkEntry` mounted in `LootListContent` and uses `switchGuild` plus main-character selection. Sender: `POST /api/discord/set-your-five` is `manage_settings` only (403), 400 without Discovery tier or channel, 429 cooldown of 60 minutes from `audit_logs`, `maxDuration = 60`, concurrency 5 with a 45s budget, 403/50007 skipped quietly, counts only. Overview `SetYourFiveCard` mounted in `DashboardContent`. |
| 4 | Officer picks one of three loot style presets, Fine-tune behind a disclosure | VERIFIED | `domain/guild/loot-style-presets.ts`: ids `reward_attendance`, `even_rotation`, `officers_decide`, names 'Reward attendance', 'Even rotation', 'Officers decide, score advises'. DB: `guild_settings.loot_style` nullable text with `guild_settings_loot_style_check` (migration, validated). `LootStylePicker` mounted in the Loot system `SettingsModal` (Fine-tune button with `aria-expanded` and `aria-controls`, controls kept mounted with `hidden`, starts open for null or Customised) and in `CreateGuildModal` (sends `loot_style` with `POST /api/guilds`, insert carries preset knobs, never the settings PUT). `PUT /api/guild-settings` allowlists and validates `loot_style` (400 otherwise). Addon `guild-data` and `export-string` strip `loot_style` so Known payload bytes are unchanged. Existing guilds keep `loot_style` null and their knobs untouched (migration contains no row writes). |
| 5 | Every score shows standing and interest separately with a sentence each; Known totals unchanged (golden and Lua byte-identical) | VERIFIED | `toScoreResult(total, components)` in `domain/scoring/engine.ts`; the total expression is untouched in the diff against origin/main (only `return toScoreResult(total, components)` changed). `explain.ts` adds `standing`/`interest` `{ value, sentence }` with self/other voice. `ScoreSplit` rendered in `BossSection` (popover), `ItemCandidateModal`, `DashboardContent` (score widget) and `ScoreComparisonModal`; `ScoreBreakdownModal` carries the two explainer paragraphs. Locks: `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scoring` -> 10 files, 385 tests pass; `git diff origin/main...HEAD` shows `fixtures.ts`, `engine-contracts.test.ts`, `export-fixtures.ts`, `defaults.ts` and `__golden__/` untouched (only `engine.ts`, `explain.ts`, `index.ts`, `score-split.test.ts` changed under `domain/scoring`). The Lua exporter imports none of the changed code paths (`computeScore` is not imported; `index.ts` only added an export) and `npx tsx domain/scoring/__tests__/export-fixtures.ts` exits 0 with output containing no standing or interest. |

**Score:** 5/5 roadmap truths verified in code. Behavior-dependent invariants (cancellation, ordering, slot stability, one-tap single save, migration guard behaviour) are each backed by a passing named test, so `behavior_unverified` is 0.

### Plan must_haves cross-check (spot-checked against code, not SUMMARY)

| Plan | Key truth | Status | Evidence |
|------|-----------|--------|----------|
| 04-01 | Hold dropped, slot check 1..8, loot_style column, WHEN-gated tier delete guard, expand-only | VERIFIED | Migration `20261111120000_need_lists.sql` read in full: `DROP TRIGGER/FUNCTION enforce_need_ranking_hold`, `loot_submission_items_slot_range_check` NOT VALID then VALIDATE, old `slot_check` dropped, `loot_style` check NOT VALID then VALIDATE, guard function SECURITY DEFINER with pinned search_path, REVOKE from PUBLIC/anon/authenticated, `BEFORE DELETE ... WHEN (OLD.list_mode = 'discovery')` returns OLD; no INSERT/UPDATE/DELETE of rows; `save_submission_items` not redefined. `need-lists-pglite.test.ts` and `need-lists-migration.test.ts` pass. |
| 04-02 | Owner confirmations, merge, deploy | VERIFIED | `gh run view 42969511761`: Deploy Migrations, completed, success, headSha 50a01eea (the PR #506 merge commit, ancestor of HEAD). 04-02-SUMMARY.md records "doors confirmed, draft-only window accepted, defaults confirmed, merged #506" dated 2026-11-11; `lib/database.types.ts` carries `loot_style`. |
| 04-03 | rankForPosition, assignTierSlots, budget, copy caps, eligibility | VERIFIED | Modules present and exercised by `need-picks`, `need-budget`, `need-eligibility` tests (pass in the full run). |
| 04-04 | 18 frozen defaults with gate | VERIFIED | `need-defaults.test.ts` passes; owner confirmed the defaults. |
| 04-05 | Split, sentences, golden and Lua locks | VERIFIED | See SC5. |
| 04-06 | Three presets, Customised computed | VERIFIED | `loot-style-presets.ts` exports `lootStyleStatus`, `presetMatches`, `presetDiff`, `applyLootStyle`. |
| 04-07 | WR-02, WR-03, proxy query, keepRankedNeedRows | VERIFIED | `visibility/route.ts` chunks at 100 with `selectAllPagesOrThrow`; `prio-list/route.ts` selects `kind` and filters with `isNeedRow` (GET) and refuses need rows on POST; `proxy.ts` diff above. |
| 04-08 | Hold lifted with budget and eligibility refusals | VERIFIED | `need-ranking-hold.ts` and its test are deleted; no remaining `isHeldNeedRanking` or `NEED_RANKING_HOLD` reference in app, lib, domain, components or supabase except the historic Phase 3 migration and its tests. `submit/route.ts` refusals read above. |
| 04-09 | Bootstrap and loot-items serve needs to Discovery groups | VERIFIED | `lib/loot/need-list-scope.ts` plus both routes. |
| 04-10 | Reusable question flow and bottom sheet | VERIFIED | `app/components/need-picker/*` present, `NeedQuestionFlow.test.tsx` passes, used by `NeedPicker` through `NeedQuestionSheet`. |
| 04-11, 04-20 | Picker, statuses, read-only approved state, refusals | VERIFIED | `NeedPicker.tsx` (54 tests in `NeedPicker.test.tsx`), `SaveSubmissionResult` in `LootListContext.tsx`, `NEED_PICKER_STATUS_COPY`. |
| 04-12, 04-14 | Split on master sheet, candidate modal, comparison and breakdown modals | VERIFIED | Imports in four surfaces confirmed. |
| 04-13 | Deep link entry, Overview card, score tiles | VERIFIED in code | Components mounted; browser round trip is human. |
| 04-15, 04-16 | loot_style in PUT and create; picker UI | VERIFIED | See SC4. |
| 04-17 | List-mode control, mixed-mode note | VERIFIED | `expansions/[expansionId]/_client.tsx`: `SegmentedControl` gated by `manage_settings`, read-only 'Discovery' badge for others, note 'Raids in this phase use different list modes...'; `GET /api/raid-tiers` selects `list_mode` and `sort_order`. |
| 04-18 | Set your 5 sender and row | VERIFIED | See SC3. |
| 04-19 | Locks, inventory sweep, surface sweep, copy sign-off | VERIFIED | `04-19-SUMMARY.md:89` "Copy signed off 2026-11-11 by the owner. The owner's words: 'Copy signed off'." Draft changelog entry sits at the top of `lib/updates-data.ts` with a placeholder date (see human item). `need-reader-inventory.test.ts` passes. |
| 04-21 | One line per need position (D-28) | VERIFIED | `lib/loot/need-lines.ts` and `review-need-lines.ts` used by `DashboardContent` and `LootSubmissionsContent`. |

### Prohibitions

| Prohibition | Tier | Status | Evidence |
|-------------|------|--------|----------|
| Migration writes no guild_settings value; does not redefine `save_submission_items` | test | Enforced | Contract test pins exactly 19 statements; migration read in full. |
| No synthetic or real names in PGlite seeds | judgment | Not flagged; resolved | Not independently audited beyond spot read; no production ids seen. Non-authoritative. |
| Never promote an over-budget or ineligible need list through any API caller | test | Enforced | Route refuses before first write; route test passes in the full suite. |
| Tier active flag, new tier or input order never moves an existing tier's slot | test | Enforced | `need-picks.test.ts:93`. |
| Never present a failed read as complete (visibility, scope) | test | Enforced | `selectAllPagesOrThrow`; `resolveNeedListScope` throws. |
| Never approve a need list without an officer | test | Enforced | Picker saves then submits to pending only; no approval path added. |
| No colour-coded cost or budget (warning panel, not danger) | test | Enforced in code; visual confirmation is a human item | |
| No weapon-type question or lighter-armour choice | test | Enforced | `need-questions.ts` / `NeedQuestionFlow.test.tsx`. |
| Officers never told 'your pick' (voice 'other') | judgment | Non-authoritative: voice option exists and is used by officer surfaces. Included in the human theme and copy pass. | |
| MUST NOT merge PR 1 without the owner or on a raid day; no dependent code before deploy recorded | judgment | Resolved by the recorded owner stop and the run id check above | |

### Required Artifacts and Wiring

All artifacts named in the plans exist, are substantive (no stubs), and are imported and used: picker components, `SetYourFive*` (three consumers), `LootStylePicker` (two consumers), `ScoreSplit` (four consumers), `need-lines` (two consumers), `need-list-scope` (two routes). No orphaned module found.

### Key Link Verification

| From | To | Status |
|------|----|--------|
| `proxy.ts` | `lib/post-auth-redirect.ts` via `nextUrl.search` | WIRED |
| `submit/route.ts` | `need-list-rules.ts` -> `need-budget.ts`, `need-eligibility.ts` | WIRED |
| bootstrap and loot-items routes | `fetchFilteredLootItems(..., { includeNeeds })` via `resolveNeedListScope` | WIRED |
| `NeedPicker.tsx` | `LootListContext.saveSubmission(true, { rankings })` -> `save_submission_items` RPC -> submit route | WIRED |
| `loot-style-presets.ts` ids | migration `guild_settings_loot_style_check` | WIRED (cross-checked by a test reading the migration, passes) |
| addon `guild-data` / `export-string` | `withoutLootStyle` | WIRED |
| prio-list GET | `isNeedRow` filter | WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| NeedPicker rows | need rows and `need_tier_slots` | bootstrap / loot-items -> `fetchFilteredLootItems` + `raid_tiers` read | Yes | FLOWING |
| Picker budget | `allocation_cost` / `NEED_DEFINITIONS` | need rows, taxonomy | Yes | FLOWING |
| ScoreSplit | `explainScore` over `computeScore` results | engine components | Yes (derived, never recomputed) | FLOWING |
| Loot style picker | `guild_settings.loot_style` and live knobs | settings GET | Yes | FLOWING |
| Set your 5 result line | route counts | Discord calls | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full suite | `CI=true npm test` | 320 files, 6422 tests passed | PASS |
| Golden and score locks | `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scoring` | 10 files, 385 tests passed | PASS |
| Migration proofs and inventory, defaults gate, slot ordering, sign-in redirect | `CI=true npx vitest run` on need-lists-pglite, need-lists-migration, need-defaults, need-picks, proxy-next, need-reader-inventory | 6 files, 185 tests passed | PASS |
| Typecheck | `npx tsc --noEmit -p .` | no output | PASS |
| Lua exporter | `npx tsx domain/scoring/__tests__/export-fixtures.ts` | exit 0, 6875 bytes, no standing/interest; its inputs are untouched | PASS (byte equality against origin/main shown by input identity; a side-by-side run on origin/main was not possible because creating a worktree was blocked in this session) |
| Migration deployed | `gh run view 42969511761` | Deploy Migrations, success, head 50a01eea, ancestor of HEAD | PASS |

### Probe Execution

Step 7c: SKIPPED (the phase declares no `probe-*.sh` scripts).

### Requirements Coverage

Every ID in PLAN frontmatter appears in REQUIREMENTS.md and the traceability table (Phase 4, Complete). No Phase 4 requirement in REQUIREMENTS.md is unclaimed by a plan (no orphans). DISC-09 maps to Phase 6, not here.

| Requirement | Source plans | Status | Evidence |
|-------------|--------------|--------|----------|
| DISC-02 five-row picker under 60s on a phone | 04-03, 04-09, 04-10, 04-11, 04-13, 04-14, 04-20, 04-21, 04-19 | SATISFIED in code; 60s/phone timing NEEDS HUMAN | SC1 |
| DISC-03 budget sentence, cannot exceed | 04-01, 04-02, 04-03, 04-08, 04-10, 04-11, 04-20, 04-19 | SATISFIED | SC2 |
| DISC-04 spec default, Looks right | 04-02, 04-03, 04-04, 04-08, 04-11, 04-20, 04-19 | SATISFIED | SC3 |
| DISC-05 one picker fans out to every Discovery tier | 04-01, 04-02, 04-03, 04-07, 04-08, 04-09, 04-11, 04-17, 04-20, 04-21, 04-19 | SATISFIED | SC1; 15 rows across 3 tiers proved in PGlite and route tests |
| DISC-08 standing and interest, totals unchanged | 04-05, 04-12, 04-13, 04-14, 04-19 | SATISFIED | SC5 |
| DISC-10 three presets, Fine-tune disclosure | 04-01, 04-02, 04-06, 04-15, 04-16, 04-19 | SATISFIED | SC4 |
| DISC-11 picker from a Discord Set your 5 link | 04-07, 04-13, 04-18, 04-19 | SATISFIED in code; live Discord and sign-in trip NEEDS HUMAN | SC3 |

### Owner Checkpoints Honoured

- 04-02 stop: one-way doors, the D-08 amended draft-only window, D-09 spec defaults confirmed 2026-11-11; PR #506 merged by the owner; Deploy Migrations run 42969511761 independently confirmed success against the merge commit.
- 04-19 stop: "Copy signed off" recorded 2026-11-11; no user-facing DRAFT marker remains in Phase 4 files (the one `DRAFT copy` comment at `LootListContext.tsx:767` is pre-existing on origin/main, Phase 3 era).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/api/master-sheet/visibility/route.ts` | comment near `.order('id')` | A dash character in a code comment | Info | Not user-facing; the em dash rule covers on-screen text. No TBD, FIXME, XXX, TODO or HACK in any added line of the 110 changed non-planning files. |
| `lib/updates-data.ts` | top entry | Placeholder changelog date 'November 10, 2026' | Info | Intentional and documented; owner sets the ship date (human item). |

### Notes for the orchestrator (not gaps)

- The roadmap ships Phase 4 as four PRs. PR 1 is merged and deployed (#506). The checkout under test holds PRs 2 to 4 as commits on `work/forever-phase-04`; their merge state is not something this verification can confirm. Per the plan notes, the code in PRs 2 to 4 that reads the new schema was only pushed after the deploy run id was recorded, and that ordering is consistent with the run check above.
- The owner questions carried from 04-19 (member opt-out for Set your 5, 'Change my 5' reopen timing, read-only Fine-tune at creation, D-28 'all 3 raids' wording) stand at their built defaults and were not blockers.
- A 'Set your 5' send reaches DMs only through the app route and no bot change ships, as D-23 decided.

### Gaps Summary

No gaps. Every success criterion and every plan truth that can be checked from the code, the migration, the tests and the deploy record is satisfied, and the full suite, golden gate, typecheck and migration proofs pass. Status is `human_needed` solely because of the device, assistive-technology, theme, live-Discord, Known-guild-in-browser and owner-date items listed in the frontmatter.

---

_Verified: 2026-11-11_
_Verifier: Claude (gsd-verifier)_
