---
phase: quick-260925-f5j
plan: 01
subsystem: guild-onboarding
tags: [expansion-seeder, wow-forever, class-gating, wowhead, empty-state, react]

requires: []
provides:
  - "A registry-derived isSupportedExpansion/SUPPORTED_EXPANSIONS pair in app/services/expansionSeeder.ts as the single source of truth for expansion validation, closing a prototype-pollution lookup path"
  - "A 'Forever' expansion entry (zero raid tiers) selectable at guild creation (both pickers) and in guild settings"
  - "A getExpansionDisplayName helper (utils/expansionVisuals.ts) rendering 'WoW Forever' everywhere the stored name 'Forever' appears"
  - "domain/expansion/classes.ts as the shared expansion-era class-gating module, replacing three separate local copies"
  - "Forever mapped to the Wowhead 'forever' domain in ItemLink"
  - "A shared NoRaidsEmptyState component and hasNoRaidTiers signal wired into loot list, overview and master sheet"
affects: [wow-forever-ruleset-selector (Task 4 addendum, not yet dispatched)]

actuals:
  tokens: 14400
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "getExpansionDefinition guards EXPANSION_DATA lookups with Object.prototype.hasOwnProperty.call before indexing, closing the pre-existing 'constructor'/'__proto__' prototype-pollution path in seedExpansionForGuild"
    - "getExpansionDisplayName is a small explicit override map (not derived from the partial-match visuals lookup), so legacy 'Classic WoW' never gets silently renamed"
    - "Shared expansion-era gating (domain/expansion/classes.ts) aliases 'Forever' and 'Classic WoW' to 'Classic' before any linear-order comparison, so class-debut gating is a single source of truth across CreateCharacterModal, the reserve join page and LootSettingsContent"
    - "hasNoRaidTiers computed only once tiers have actually loaded (tiersData !== undefined) so a failed fetch never masquerades as 'no raids'"

key-files:
  created:
    - app/services/__tests__/expansionSeeder.test.ts
    - utils/__tests__/expansionVisuals.test.ts
    - domain/expansion/classes.ts
    - domain/expansion/__tests__/classes.test.ts
    - app/components/__tests__/ItemLink.test.ts
    - app/components/NoRaidsEmptyState.tsx
    - app/components/__tests__/NoRaidsEmptyState.test.tsx
    - public/images/expansions/ForeverLogo.webp
  modified:
    - app/services/expansionSeeder.ts
    - utils/expansionVisuals.ts
    - app/api/guilds/route.ts
    - app/api/guilds/change-expansion/route.ts
    - app/api/guilds/[id]/expansions/route.ts
    - app/components/CreateGuildModal.tsx
    - app/guild-select/create/page.tsx
    - app/components/CreateCharacterModal.tsx
    - app/reserve/join/[token]/page.tsx
    - app/(app)/loot-management/components/LootSettingsContent.tsx
    - app/components/ItemLink.tsx
    - app/(app)/guild-settings/components/ExpansionManager.tsx
    - app/(app)/expansions/[expansionId]/_client.tsx
    - domain/expansion/index.ts
    - app/contexts/LootListContext.tsx
    - app/(app)/loot-list/components/LootListContent.tsx
    - app/(app)/overview/components/DashboardContent.tsx
    - app/(app)/master-sheet/components/MasterSheetContent.tsx

key-decisions:
  - "D-01/D-02/D-03 (stored name 'Forever', display label 'WoW Forever', logo path, verbatim copy sign-off) applied exactly as locked by the orchestrator; no deviation"
  - "The plan's 'wrap up to just before the How to Rank Modal' instruction for LootListContent.tsx was structurally impossible: the Modal, BIS import modal and Unranked Items Sidebar are all nested inside the same 'Main Content' flex container as the bracket list, not siblings after it. Wrapped through the actual close of that container instead (immediately before the outer font-poppins div closes, right before DragOverlay) -- functionally identical outcome (tabs/banner/tips/brackets all hidden behind hasNoRaidTiers) reached via the only JSX-valid boundary"

requirements-completed: [FOREVER-01, FOREVER-02, FOREVER-03, FOREVER-04, FOREVER-05, FOREVER-06, FOREVER-07, FOREVER-08]

coverage:
  - id: D1
    description: "Registry-driven expansion validation: SUPPORTED_EXPANSIONS/isSupportedExpansion close the prototype-pollution lookup, both guild routes use it, Forever seeds with zero raid tiers"
    requirement: "FOREVER-01"
    verification:
      - kind: unit
        ref: "app/services/__tests__/expansionSeeder.test.ts (16 tests)"
        status: pass
      - kind: unit
        ref: "npm run typecheck"
        status: pass
    human_judgment: false
  - id: D2
    description: "Both guild-creation pickers offer WoW Forever with the committed logo (6-tile layout); CreateGuildModal summary and guild settings render the WoW Forever display label"
    requirement: "FOREVER-03"
    verification:
      - kind: unit
        ref: "utils/__tests__/expansionVisuals.test.ts (5 tests)"
        status: pass
    human_judgment: true
    rationale: "Visual layout (6 tiles at 390px/1440px, logo not cropped, label wrapping) is the plan's own end-of-phase human-check and was not screenshotted by the executor."
  - id: D3
    description: "Forever gates to the 9 Classic classes and Wowhead item links resolve to the /forever/ domain via a single shared domain/expansion/classes.ts module"
    requirement: "FOREVER-05"
    verification:
      - kind: unit
        ref: "domain/expansion/__tests__/classes.test.ts (14 tests), app/components/__tests__/ItemLink.test.ts (3 tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Loot list, overview and master sheet show the approved 'No raids yet' state for zero-raid expansions and are unchanged otherwise"
    requirement: "FOREVER-07"
    verification:
      - kind: unit
        ref: "app/components/__tests__/NoRaidsEmptyState.test.tsx (3 tests), full vitest suite (1425 tests)"
        status: pass
    human_judgment: true
    rationale: "The plan's own end-of-phase human-check requires visually confirming the empty state on /loot-list, /overview and /master-sheet in a live Forever guild at two breakpoints and two themes, and confirming Classic guilds render unchanged -- not exercised by the automated suite."

duration: ~90min
completed: 2026-09-25
status: complete
---

# Quick Task 260925-f5j: Let guilds sign up for WoW Forever before raid data exists (Tasks 1-3)

**Registry-driven WoW Forever expansion support: selectable at guild creation and in guild settings, seeded with zero raid tiers, gated as a Classic-era expansion for classes and Wowhead links, with a shared "No raids yet" empty state replacing broken UI on loot list, overview and master sheet.**

## Performance

- **Duration:** ~90 min
- **Completed:** 2026-09-25
- **Tasks:** 3 of 3 (Tasks 1-3 only; Task 4 addendum is a separate, pending-sign-off dispatch)
- **Files created/modified:** 26 (18 modified, 8 created, including the pre-existing untracked logo)

## Accomplishments

- Closed a real prototype-pollution gap: `seedExpansionForGuild` used to index `EXPANSION_DATA[expansionName]` directly, so a request for `'constructor'` resolved to `Object.prototype.constructor` (truthy) and could reach an insert on the unguarded `[id]/expansions` route. `getExpansionDefinition` now requires `Object.prototype.hasOwnProperty.call(EXPANSION_DATA, name)` before returning a definition, closing that path for `constructor`, `__proto__` and `toString` (covered by tests; also documented as T-f5j-01 in the plan's threat register).
- `SUPPORTED_EXPANSIONS` / `isSupportedExpansion` are now the single source of truth for expansion validation; both `POST /api/guilds` and `POST /api/guilds/change-expansion` validate through it instead of a hand-written array (confirmed via `grep` that no route still carries its own list).
- WoW Forever seeds one `expansions` row with `current_phase: 1` and zero raid tiers, no touches to `raid_tiers`/`loot_items`/`loot_item_classes`/`wow_classes`.
- `getExpansionDisplayName` renders 'WoW Forever' everywhere the stored name `'Forever'` appears (create-guild summary, guild settings cards, expansion detail page, loot list dropdown/pill, add-expansion toast, unsupported-expansion error), while leaving every other expansion's stored name unchanged (including legacy `'Classic WoW'`).
- `domain/expansion/classes.ts` replaces three separate local copies of the class-debut/expansion-order logic (CreateCharacterModal, the reserve join page, LootSettingsContent) with one shared module that aliases `'Forever'` and `'Classic WoW'` to the Classic era before any comparison.
- `ItemLink`'s Wowhead domain map now includes `'Forever': 'forever'`.
- A new `NoRaidsEmptyState` (EmptyState wrapper, `variant="card"`) replaces the broken "Phase null" / empty bracket UI on the loot list, the "No rankings yet" card with dead CTAs on the master sheet, and adds an explanatory card to the overview dashboard, all gated on a single `hasNoRaidTiers` signal that only flips true after tiers have genuinely loaded and come back empty (a failed fetch never masquerades as "no raids").

## Task Commits

1. **Task 1: End-to-end "officer picks WoW Forever at guild creation"** - `98428bc3` (feat) - registry, validation, seeding, both pickers, 16 new tests
2. **Task 2: Treat Forever as Classic era for classes and Wowhead, label it in settings** - `3c6eb722` (feat) - shared class-gating module, Wowhead domain, guild-settings/expansion-page labels, 17 new tests
3. **Task 3: Explain zero-raid expansions on loot list, overview and master sheet** - `7e6e3cde` (feat) - NoRaidsEmptyState, hasNoRaidTiers, three consumer wire-ups, 3 new tests

Task/test/implementation code was committed together per task rather than as separate RED/GREEN commits (see Deviations).

## Files Created/Modified

- `app/services/expansionSeeder.ts` - Forever registry entry, `getExpansionDefinition`, `SUPPORTED_EXPANSIONS`, `isSupportedExpansion`, registry-derived CP-09/CP-08 error strings
- `utils/expansionVisuals.ts` - `logoFit`, Forever visuals entry, `EXPANSION_DISPLAY_NAMES`/`getExpansionDisplayName`
- `app/api/guilds/route.ts`, `app/api/guilds/change-expansion/route.ts` - validate via `isSupportedExpansion`
- `app/api/guilds/[id]/expansions/route.ts` - success message uses `getExpansionDisplayName`
- `app/components/CreateGuildModal.tsx`, `app/guild-select/create/page.tsx` - sixth WoW Forever tile, 6-tile grid, display-label summary
- `domain/expansion/classes.ts` (new) - `resolveExpansionEra`, `isClassAvailableForExpansion`, `getExpansionClassNames`
- `domain/expansion/index.ts` - re-exports the new module
- `app/components/CreateCharacterModal.tsx`, `app/reserve/join/[token]/page.tsx`, `app/(app)/loot-management/components/LootSettingsContent.tsx` - wired to the shared class-gating module, local copies deleted
- `app/components/ItemLink.tsx` - `'Forever': 'forever'` Wowhead domain mapping
- `app/(app)/guild-settings/components/ExpansionManager.tsx`, `app/(app)/expansions/[expansionId]/_client.tsx` - display labels + `logoFit`-aware image classes
- `app/components/NoRaidsEmptyState.tsx` (new) - shared empty state, CP-15/CP-16 copy
- `app/contexts/LootListContext.tsx` - `hasNoRaidTiers` on the data context
- `app/(app)/loot-list/components/LootListContent.tsx` - hides tabs/banner/tips/brackets behind `hasNoRaidTiers`, display-label dropdown/pill (CP-13/CP-14)
- `app/(app)/overview/components/DashboardContent.tsx` - `noRaidTiers` state, empty-state card
- `app/(app)/master-sheet/components/MasterSheetContent.tsx` - resets `raidTiers` to `[]` on empty query, swaps the view-mode ternary for the empty state
- `public/images/expansions/ForeverLogo.webp` - committed (D-02, was untracked before this plan)

## Decisions Made

- Followed all three locked decisions (D-01 stored name, D-02 logo, D-03 copy sign-off) exactly; every CP-01 through CP-17 string was rendered verbatim from the approved table, with no em dashes introduced.
- `getExpansionDisplayName` is a small explicit override map, not derived from `getExpansionVisuals`'s partial-match lookup, per the plan's own reasoning: a partial-match derivation would silently rename legacy `'Classic WoW'` guilds.
- The LootListContent.tsx wrap boundary was moved from "just before the How to Rank Modal comment" (as worded in the plan) to the actual close of the surrounding "Main Content" flex container, immediately before the outer `font-poppins` div closes and `DragOverlay` begins. See Deviations for why.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Corrected the wrap boundary in LootListContent.tsx**
- **Found during:** Task 3
- **Issue:** The plan's action text said to wrap "everything from the Sticky Header block down to the end of the main list content (just before the How to rank Modal)". A first attempt at that exact boundary produced a JSX syntax error (`npm run typecheck` and a standalone `@babel/parser` check both failed: "Expected corresponding JSX closing tag for `<div>`"). AST inspection of the pre-edit file showed the "How to Rank Modal", the BIS import modal, and the "Unranked Items Sidebar" are all nested *inside* the same `<div className="flex items-start ...">`/`<div className="flex-1 min-w-0 ...">` container as the bracket `.map()` list, not siblings that come after it closes.
- **Fix:** Moved the closing `</>` + `)}` from immediately after the bracket `.map()` call to immediately after that container's real closing `</div>` (right before the outer `font-poppins` div closes and `DragOverlay` begins). Functionally this is the same outcome the plan intended: with `hasNoRaidTiers` true, the phase tabs, status banner, "Click any empty slot" tip and bracket list are all hidden and replaced by `NoRaidsEmptyState size="lg"`; the How to Rank / BIS import modals simply stay mounted-but-closed (they're controlled by their own `show*Modal` boolean state, not by tier data, so this has no visible effect).
- **Files modified:** `app/(app)/loot-list/components/LootListContent.tsx`
- **Verification:** `@babel/parser` parse succeeds; `npm run typecheck` clean; full vitest suite (1425 tests) passes; `grep -c "Error:"` from `npx eslint` on the file is identical (9) before and after the edit, confirming no new lint regressions.
- **Committed in:** `7e6e3cde` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking, structural correction with no behavioral difference from plan intent)
**Impact on plan:** No scope creep; the must_haves truth about hiding "Phase null"/bracket slots/the ranking tip for zero-raid expansions is met exactly as specified.

## Process Note (not a plan deviation)

Task 2 and Task 3 carry `tdd="true"` in the plan, and the reference workflow's per-task TDD flow calls for separate RED (`test(...)`) then GREEN (`feat(...)`) commits. Both tasks were committed as a single `feat(...)` commit containing implementation and its new tests together, rather than as two commits. All new tests were written to cover every `<behavior>` bullet and pass; there was no point where a test was run and observed to fail first. Flagging this for transparency since it departs from the documented TDD gate sequence, though the plan's own frontmatter type is `execute` (not `tdd`), so the plan-level TDD gate enforcement did not apply.

## Issues Encountered

None beyond the JSX-boundary correction documented above.

## Observed, out of scope (per plan instruction -- reported, not fixed)

- `app/api/guilds/change-expansion/route.ts` passes `true` as the 4th argument to `seedExpansionForGuild` (`setAsCurrent`), so the 5th argument (`useServiceRole`) stays at its default of `false` even though the route calls it with a service-role client. This means changing a guild's expansion takes the RPC path (`create_expansion_for_guild`), whose `is_guild_officer(auth.uid())` check fails closed under a service-role client with no `auth.uid()`. Changing expansion may already be broken for every expansion, not just Forever. Worth its own quick task.
- `app/guild-select/create/page.tsx`'s five existing expansion tiles load art from `https://beta.softres.it`, which is not in the CSP `img-src` allow-list, so those tiles are likely broken images in production. The new WoW Forever tile uses the local, CSP-safe logo and is unaffected.
- `app/api/raid-events/ensure/route.ts`: verified at plan time and left unchanged per the plan's own instruction. With zero raid tiers it creates no events, logs one `console.error`, and still returns 200 with an empty event list; there is no error-monitoring integration in this codebase to alert on that log line.

## impeccable Design Hook Findings (triaged, not new)

Editing `utils/expansionVisuals.ts` (adding the Forever `gradient`/`bgColor`/`accentColor`/`textColor`/`borderColor` hex values) and touching several files with pre-existing inline hex/Tailwind-palette literals (`CreateGuildModal.tsx` Alliance/Horde button colors, `LootSettingsContent.tsx` status colors) triggered the impeccable PostToolUse hook's `design-system-color` rule. Per the plan's own context note, `expansionVisuals.ts` already stores per-expansion hex values as data by established, explicit-orchestrator-sanctioned pattern -- the Forever entry follows that pattern intentionally. The other flagged lines (Alliance/Horde buttons, status colors) are pre-existing code this plan did not author or modify; confirmed via `git diff` that no new color literal was introduced outside the Forever visuals entry itself. No new `ignore-value` entries were added; all findings left standing as either sanctioned-by-plan or genuinely pre-existing and out of this plan's scope.

## Known Stubs

None. Task 4 (Forever ruleset selector) is explicitly out of scope for this dispatch per the orchestrator's instructions and remains `STATUS: PENDING COPY SIGN-OFF` in the plan file; no placeholder or stub code for it was added. CP-03's summary line in `CreateGuildModal.tsx` still builds from the raw `realm` value, so Task 4 can swap in the ruleset display without further rework.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Tasks 1-3 fully shipped: WoW Forever is selectable, seeds correctly, gates classes/Wowhead correctly, and zero-raid expansions show the approved empty state everywhere required.
- Task 4 (realm -> ruleset for Forever guilds) is drafted in the same plan file under "Addendum: Task 4" but is explicitly `STATUS: PENDING COPY SIGN-OFF` and was not touched, per this dispatch's scope. It should be re-dispatched once the user approves R-01 through R-08.
- End-of-phase human-check items (visual confirmation of the 6-tile picker layout, uncropped logo, and the "No raids yet" card across breakpoints/themes) remain outstanding per the plan's own verification section; they were not exercised by this executor.

## Self-Check: PASSED

All files listed under `key-files` confirmed present on disk. Commits `98428bc3`, `3c6eb722`, `7e6e3cde` confirmed present in `git log --oneline --all`. `npm run typecheck`, `npm run lint` (0 errors), and the full vitest suite (`87` files / `1425` tests) all pass as of the final commit.

## Task 4: Forever guilds pick a ruleset instead of a realm

Executed after user sign-off on copy R-01 to R-08 (STATUS: APPROVED, 2026-09-25). Sequential execution directly on `feat/forever-signup` (no worktree), starting from HEAD `7e6e3cde`.

**Commit:** `3a6a6ee7` (feat) - one commit, explicit paths only.

**What changed:**

- `data/wow-realms.ts` - added `FOREVER_RULESETS` (`Normal`, `PvP`, `Roleplaying`, `Hardcore`), `FOREVER_REGION_CODES` (`US`, `EU`, `KR`, `TW`), `formatForeverRuleset(ruleset, region)` -> `"{Ruleset} ({Region})"`, and `parseForeverRuleset(value)` -> `{ ruleset, region } | null`. Moved `REGION_CODES` here from `RealmSelector.tsx` (per the plan's instruction to reuse it) so both the realm and ruleset selectors share one region-name-to-code map. `getRegionForRealm` now parses a Forever value first and resolves its region before falling back to the normal realm-name lookup, so `GuildSettingsContent.tsx`'s existing `getRegionForRealm(activeGuild.realm)` call (line ~147) works unmodified for Forever guilds.
- `app/components/RealmSelector.tsx` - local `REGION_CODES` constant removed; imports the shared one from `data/wow-realms.ts`. No behavior change for non-Forever realms.
- New `app/components/ForeverRulesetSelector.tsx` - wraps `ComboDropdown` (region prefix limited to the four region codes, no "All"; ruleset options are the four rulesets; `searchable={false}`). Holds two pieces of local selection state (region, ruleset) derived from the incoming formatted `value` and reconciled during render (not inside a `useEffect`) when the prop changes, per React's "adjusting state when a prop changes" pattern -- see Deviations. Emits the combined `"{Ruleset} ({Region})"` string via `onChange` only once both region and ruleset are chosen; emits `''` otherwise.
- `app/components/CreateGuildModal.tsx` and `app/guild-select/create/page.tsx` - both now derive `isForeverExpansion = expansion === 'Forever'`; swap the "Realm"/"Ruleset" label (R-01), swap `RealmSelector` for `ForeverRulesetSelector`, show the R-02 helper line, swap the required-field validation message (R-06: `'Ruleset is required'` in the modal, `'Ruleset is required. Select your guild\'s ruleset.'` on the create page, matching each surface's existing short-vs-long message style), and clear `realm`/`realmRegion` in a `useEffect` keyed on `isForeverExpansion` so a value picked for one form type can never be submitted for the other. `CreateGuildModal.tsx`'s summary line (R-07) now reads `WoW Forever • PvP (EU) • Horde` or `WoW Forever • No ruleset selected • Horde` when Forever is picked, and is unchanged for every other expansion.
- `app/(app)/guild-settings/components/GuildSettingsContent.tsx` - added `isForeverGuild = currentExpansion?.expansion_name === 'Forever' || parseForeverRuleset(realm) !== null` (via `useExpansionData()` from the already-globally-mounted `ExpansionProvider`, plus the existing `realm` form state), so a guild is treated as Forever either by its current expansion or by an already-saved ruleset-shaped realm value (covers a guild created between the Tasks 1-3 commit and this one, if any existed). Swaps in `ForeverRulesetSelector` and the R-01/R-02 copy when true; unchanged otherwise.
- `app/api/guilds/route.ts` - after the existing `isSupportedExpansion` check, added: when `expansion === 'Forever'`, the request 400s with R-08 (`'Select a valid WoW Forever ruleset.'`) unless `realm` parses via `parseForeverRuleset`. Every other expansion's realm validation is unchanged (still optional/free text).
- `data/__tests__/wow-realms.test.ts` (new, 35 tests) - `formatForeverRuleset`/`parseForeverRuleset` round-trip across all 16 ruleset x region combinations, whitespace trimming, 12 bad-input cases (null/undefined/empty, wrong case, wrong ruleset name, wrong region code, malformed parens, three-letter region, no region at all), and `getRegionForRealm` on all four Forever values plus its unchanged normal-realm and not-found behavior.

**Deviations from Plan:**

1. **[Rule 3 - Blocking] `useEffect` syncing `ForeverRulesetSelector`'s internal state from its `value` prop tripped `react-hooks/set-state-in-effect` (configured as an `error`, not a warning, in `eslint.config.mjs`).** The plan's own instruction to make the selector "reuse ComboDropdown" and "emit the formatted value" implies deriving internal region/ruleset selection from an external string prop, which is the classic "sync state from props via effect" anti-pattern this repo's lint config specifically forbids project-wide (not grandfathered for this new file). Fixed by using React's documented alternative: track the previous `value` in state and, when it differs from the current render's `value`, call `setRegion`/`setRuleset` synchronously during render instead of in a `useEffect` (no extra render, no flicker, no lint violation). Verified via `npx eslint app/components/ForeverRulesetSelector.tsx` (clean) and `npm run typecheck`. No other file in this task's diff needed this treatment - the `useEffect`s added to `CreateGuildModal.tsx` and `guild-select/create/page.tsx` that clear `realm` on `isForeverExpansion` change are genuine effects (resetting cross-field state when a sibling field changes), not prop-to-state syncs, and did not trigger the rule.
2. **[Rule 3 - Blocking] Initial `it.each` test tuples with a description string as the second element failed `tsc --noEmit`** (`it.each`'s type overload requires the callback's parameter count to match the tuple length). Rewrote `parseForeverRuleset bad input` as a plain `for...of` loop over an array of `{ value, description }` objects instead of `it.each`, which sidesteps the tuple-arity typing entirely and reads at least as clearly. All other `it.each` uses in the new test file use tuples that already match their callback's parameter count and needed no change.

**Not done / left out of scope (per the plan's own "Out of scope" list and explicit file list):**

- `app/api/guilds/info` (the guild-settings save route, called by `GuildSettingsContent.tsx`'s `handleSaveBasicInfo`) does **not** validate that a Forever guild's realm parses as a ruleset -- the plan's Task 4 addendum only names `app/api/guilds/route.ts` (guild creation) for server-side validation. A Forever guild's officer could theoretically save an arbitrary string into `realm` from the settings page today; the client-side `ForeverRulesetSelector` only ever emits a valid formatted value or `''`, so this is reachable only via a direct API call, not through the UI.
- The generic "Please select a realm" validation message in `GuildSettingsContent.tsx`'s `handleSaveBasicInfo` was left unchanged for Forever guilds (would read "realm" instead of "ruleset"). No R-ID in the approved copy table (R-01 to R-08) covers this string, and the constraint to use approved copy verbatim meant no new string could be introduced without a fresh sign-off; flagging here since it's a minor, pre-existing-style inconsistency, not a regression.
- No route-level integration test was added for `app/api/guilds/route.ts`'s new Forever-ruleset check. The plan explicitly allows this: "Add a unit/route test if a test harness for that route exists; otherwise cover parse/format thoroughly in `data/__tests__/wow-realms.test.ts`." Confirmed (via `grep -rl "getAuthenticatedUser" app/api --include="*.test.ts"`) that no route in this codebase has an existing auth/service-role mocking test harness, so the fallback applies; the underlying `parseForeverRuleset` logic the route calls is covered by all 35 new tests.
- Battle.net import/character realms, a separate `ruleset` column, and two-part character names were explicitly out of scope per the addendum and were not touched.

**Verification results:**

- `npm run typecheck` - clean, 0 errors.
- `npm run lint` - 0 errors, 398 warnings (all pre-existing; introducing the one new `react-hooks/set-state-in-effect` error and fixing it per Deviation 1 left the error count at 0 and did not add any new warnings).
- `npx vitest run data/__tests__/wow-realms.test.ts` - 35/35 passed.
- `npx vitest run __tests__` (design guard suite) plus the full repo suite (`npx vitest run`) - 89 files, 1464 tests, all passed; no regressions in any Tasks 1-3 suite or the design-guard suites (hand-rolled cards, palette literals, arbitrary text sizes, purple/yellow hues).
- `git log --oneline -1` confirmed HEAD was `7e6e3cde` immediately before staging and committing; no other commits appeared on the branch mid-task.
- `git status --short` confirmed only the 8 files above were staged for this commit; `.agents/`, `.codex/`, `.gsd/`, `AGENTS.md`, `.planning/**`, and the pre-existing unstaged deletion of `.claude/commands/jev.md` were left untouched.

**Human-check still outstanding (not exercised by this executor, per the constraints):** at 390px and 1440px, light and dark - the Forever "Ruleset" field renders correctly in Create a guild, `/guild-select/create`, and guild settings; the region-then-ruleset ComboDropdown opens/closes and looks consistent with the existing `RealmSelector`; switching the expansion tile away from and back to WoW Forever visibly clears any prior realm/ruleset selection.

---
*Phase: quick-260925-f5j*
*Completed: 2026-09-25*
