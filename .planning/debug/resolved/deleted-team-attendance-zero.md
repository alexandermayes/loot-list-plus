---
status: resolved
trigger: "Premium user report (Discord premium lounge, 2026-09-02): after the reporting officer deleted his guild's second raid team (~1 week prior, around Aug 26), the website showed attendance-less scores while in-game exports were correct."
created: 2026-09-02T14:10:00Z
updated: 2026-09-02T15:20:00Z
verification: pending_post_deploy
---

> Privacy note: this session concerned a specific paying guild. All customer
> identifiers (Discord handle, guild name, character names, and the Discord
> permalink, which encodes guild and channel IDs) have been replaced with
> role-based references before commit. Evidence screenshots were reviewed in
> session and deliberately not committed. Do not re-introduce identifiers here.

## Symptoms

**Expected behavior:**
- Overview page attendance card shows the raider's attendance percentage and raid count for the selected guild/team
- Overview Score breakdown shows the attendance credit component (+4.00 for full attendance)
- Master Sheet rankings on the website reflect scores WITH awarded attendance credit, matching the in-game addon export

**Actual behavior:**
- Overview attendance card: "0% — 0 of 0 raids — No raids logged yet" and Score breakdown Attendance +0.00 (evidence image 2, not committed)
- Master Sheet website scores exclude attendance credit: raider A #48, raider B #21 (evidence image 3, not committed)
- In-game addon export has correct scores WITH credit: raider A [52], raider B [25] (evidence image 4, not committed) — consistent +4.00 delta (the attendance credit) on every raider
- Guild attendance page works correctly: 4 tracked raids in last 2 reset weeks, 4.00/4.00 credit for the reporting character (evidence image 1, not committed)

**Error messages:**
- None visible; silent empty result ("No raids logged yet") on Overview

**Timeline:**
- The reporting officer deleted his guild's second raid team ~1 week before the report (around Aug 26, 2026) and "tried to reset" it
- He believed rankings on Master Sheet previously reflected standings with awarded attendance
- Report posted 2026-09-02 in the Discord premium lounge

**Reproduction (hypothesized at intake):**
- Guild with two raid teams and logged raid events; delete the second raid team; view Overview and Master Sheet for the remaining/original team

**Additional context:**
- Intake hypothesis: Overview and Master Sheet query paths are raid-team-filtered and the deleted team broke the filter (raid_events.raid_team_id linkage or team visibility fallback), while the attendance page and export paths query unfiltered
- Related: issue #248 (closed Aug 26) fixed phantom events created when browsing a new team before setting its days — same raid-team lifecycle area
- The affected guild runs a Tuesday reset with Tue/Thu raid days and a 2-week guild rolling window; the reporting character is that guild's Guild Master
- Production was deliberately NOT queried: per org data policy the causal chain was established from code, schema, and arithmetic rather than by reading customer rows

## Current Focus

bug_class: Bohrbug (deterministic — reproduces on every load of a team-scoped surface for a character whose team carries a non-positive rolling_weeks_override)

hypothesis: The team `rolling_weeks_override` is applied ONLY to the raid-event pre-fetch window on Overview / Master Sheet / Attendance page, never threaded into `computeAttendance`'s `config.rolling_attendance_weeks`. With an override of 0 the pre-fetch window collapses to "today only", so the engine receives zero events and reports 0 of 0 (denominator collapse), while guild-scoped surfaces (attendance "All teams", addon export, Discord bot) read the guild's `rolling_attendance_weeks` and stay correct. Raid-team deletion is NOT causal — it is the occasion on which the officer opened the remaining team's edit modal ("tried to reset it") and stored the meaningless 0.

reasoning_checkpoint:
  hypothesis: "Team rolling-weeks override narrows the event pre-fetch window but not the engine window (config: guildSettings), so an override of 0 starves computeAttendance of events → uniform 0-of-0 on every team-scoped surface."
  confirming_evidence:
    - "DashboardContent.tsx:965-974 computes rollingWeeks from activeTeam.rolling_weeks_override, filters raidEventsData to raid_date >= today-rollingWeeks*7, then calls computeAttendance with `config: guildSettings` (line 1025) — the override never reaches the engine."
    - "MasterSheetContent.tsx:335-349 + 467: identical shape (periodStartStr from the override, `config: guildSettings`)."
    - "AttendanceContent.tsx:468-487 + 901: identical shape (lowerBound from the override, `config: settings || {}`)."
    - "app/api/bot/score/route.ts:131-143 does it correctly: `config: { ...settings, rolling_attendance_weeks: rollingWeeks }` and no date pre-filter — proving the intended pattern and explaining why the bot/export surfaces are unaffected."
    - "addon/export-string/route.ts:223 windows by `settings.rolling_attendance_weeks` only (no team override) → unaffected, matches the correct in-game scores."
    - "resolveRollingWeeks returned a 0 override verbatim (settings.ts:29 at HEAD), and getAttendanceWindowStart(asOf, 0, resetDay) returns windowEnd+1 — an inverted window that every consumer swallows silently."
    - "Overview evidence image shows Next raid = Tue/Thu, which is derived from the same resolved raidDays fed to the engine (savedRaidDays -> getNextRaidDates), so the raid-day filter demonstrably keeps the tracked Tue/Thu events. Denominator 0 therefore cannot come from the day filter."
    - "Arithmetic elimination on the reported dates (tracked raids Tue 8/18, Thu 8/20, Tue 8/25, Thu 8/27; as-of Wed 9/2; reset day Tue; guild rolling window 2 weeks -> engine window 8/18..8/31): override null/2 keeps >=3 events, override 1 keeps 1 event. Only override 0 yields exactly 0 of 0."
  falsification_test: "If the remaining team's rolling_weeks_override were null or >=1, the Overview would have shown a non-zero denominator (3 of 3 or 1 of 1). Observed 0 of 0 refutes those. If threading the resolved weeks into config plus normalizing a non-positive override does not flip a reproduction from 0-of-0 to full credit, the hypothesis is wrong."
  fix_rationale: "Two independent defects, both required. (1) Code: thread the resolved rolling weeks into the engine config at all three web call sites so the fetch window and the scoring window cannot drift (this also fixes the inverse silent failure: an override LARGER than the guild value was ignored outright). (2) Config: a non-positive override is not a configuration, it is a data error — the field's own contract is 'leave empty to inherit'. Normalize it to inherit in resolveRollingWeeks (heals existing rows with no prod write), reject it in the POST/PATCH API, and raise the input floor to 1 so no new rows can be created."
  blind_spots: "Not verified against prod that the stored override is exactly 0 (deliberate: org data policy prefers code-level proof, and the arithmetic above is decisive). Master Sheet requires a team to be selected in the picker for the override to apply, whereas Overview is unconditionally team-scoped; the attendance-page evidence image shows a 3-week grid, proving that page was on 'All teams' when captured. Not investigated: whether the raid-days-per-week override input (also min=0) can produce an analogous empty-raidDays failure — out of scope, different symptom."
  candidate_causes:
    - "code: resolved team rolling-weeks applied to the event fetch window but not to computeAttendance's config (dual source of truth for one window)"
    - "config/data: rolling_weeks_override = 0 accepted and stored (UI input min=0, no API validation, no DB CHECK, resolveRollingWeeks passes it through)"
    - "environment: ruled out — same code path fails for every raider on every load"
    - "data: raid_events.raid_team_id orphaning — ruled out, see Eliminated"
  and_gate: "yes. The stored 0 alone would be harmless if the resolved weeks were threaded into the engine (the window would be consistently narrow and the officer would see the same number everywhere, making the misconfiguration visible). The code drift alone would be harmless with a sane override. Only both together produce a silent, uniform 0-of-0 on team-scoped surfaces while guild-scoped surfaces stay correct — which is exactly the reported asymmetry."

test: local vitest reproduction composing the page-level pipeline (resolveAttendanceWindow -> fetch-window pre-filter -> computeAttendance) over the reported dates
expecting: RED at 0 of 0 before the fix; GREEN at 4 of 4 after — both observed
next_action: none — fix committed; production verification pending post-deploy (see Resolution.verification)

## Evidence

- timestamp: 2026-09-02T14:20:00Z
  checked: knowledge base (.planning/debug/knowledge-base.md)
  found: does not exist — no prior resolved sessions
  implication: no known-pattern shortcut; full investigation required

- timestamp: 2026-09-02T14:25:00Z
  checked: supabase/migrations/20260101000000_baseline_schema.sql FK actions for the raid-team lifecycle
  found: raid_events.raid_team_id FK is ON DELETE SET NULL (line 3351); raid_team_members.raid_team_id is ON DELETE CASCADE (line 3371); raid_team_members has UNIQUE (guild_id, character_id) so a character is on at most one team per guild
  implication: deleting a team can only turn its events' raid_team_id into NULL — it can never leave an event pointing at a dangling team. app/api/raid-teams/[id]/route.ts DELETE relies on exactly this and touches nothing else.

- timestamp: 2026-09-02T14:30:00Z
  checked: domain/scoring/attendance.ts resolveOwnedEvents team filter (lines 145-171)
  found: with a non-null raiderTeamId, events are kept when event.raid_team_id === raiderTeamId OR is NULL; only foreign non-null teams are excluded
  implication: NULL-team events (the post-deletion state) are explicitly included for every raider, so team deletion cannot hide events from a team-scoped denominator. The intake hypothesis has no mechanism.

- timestamp: 2026-09-02T14:35:00Z
  checked: the four reported surfaces for how each derives the attendance window and the engine config
  found: Overview (DashboardContent.tsx:965-1036) and Master Sheet (MasterSheetContent.tsx:335-478) and Attendance page (AttendanceContent.tsx:468-487, 898-912) all narrow the event fetch by the team-resolved rolling weeks but pass the GUILD's settings object as the engine config; app/api/bot/score/route.ts:139 instead passes `config: { ...settings, rolling_attendance_weeks: rollingWeeks }` and pre-filters nothing; addon/export-string/route.ts:223 uses `settings.rolling_attendance_weeks` with no team override at all
  implication: exactly the surfaces that apply a team override to the fetch window are the broken ones; the surfaces that either thread it correctly or ignore it are the working ones. This is the reported asymmetry, expressed in code.

- timestamp: 2026-09-02T14:40:00Z
  checked: attendance-page evidence image 1 — window labels, grid columns, tracked-raid count
  found: guild rolling window is 2 weeks and max attendance bonus is 4.00; the scored window holds 4 tracked raids across two reset weeks (Tue+Thu each week) with the in-progress week greyed out; the affected guild's raiders are near-uniformly at full credit
  implication: reset day is Tuesday, raid days are Tue/Thu, and the engine DOES award full credit on this page using each raider's own team id from raid_team_members — so the events are team-compatible with their raiders (not foreign-team). The 3-week grid also proves this page was rendered with no team selected.

- timestamp: 2026-09-02T14:45:00Z
  checked: overview evidence image 2 — team chip, attendance card, next-raid card, score breakdown
  found: the character's team chip renders (so the character DOES have a live raid_team_members row and a live team), Next raid resolves to Tuesday and Thursday, and the attendance card reads 0% / 0 of 0 raids with Attendance +0.00 in the score breakdown
  implication: raidDays resolved correctly to Tue/Thu on the very code path that feeds the engine, and activeTeam is non-null. A zero DENOMINATOR with correct raid days and a team-compatible event set can only mean zero events survived the pre-fetch window filter — i.e. rollingWeeks collapsed to 0.

- timestamp: 2026-09-02T14:50:00Z
  checked: arithmetic of DashboardContent's pre-filter (actualPeriodStart = today - rollingWeeks*7) against the engine window for each possible override value
  found: as-of Wed 2026-09-02 with reset day Tue, the engine window is 2026-08-18..2026-08-31; override null or 2 leaves >=3 of the 4 tracked events in range, override 1 leaves 1, override 0 leaves none (cutoff = today, a Wednesday non-raid day)
  implication: only rolling_weeks_override = 0 reproduces the observed exact "0 of 0". Confirms the trigger value without any production read.

- timestamp: 2026-09-02T14:55:00Z
  checked: write path and guards for rolling_weeks_override
  found: app/(app)/raid-teams/_client.tsx:627-634 renders the Rolling weeks input with min={0} (so the browser stepper's floor on an empty field is 0); _client.tsx:194 sends Number(editRollingWeeks) whenever the field is non-empty; POST /api/raid-teams:139 and PATCH /api/raid-teams/[id]:66 store the value with no range validation; the column is a bare nullable integer with no CHECK; resolveRollingWeeks (settings.ts:29) returned 0 verbatim, and getAttendanceWindowStart(asOf, 0, resetDay) returns windowEnd+1 — a start after the end
  implication: a single mis-click on the stepper while "resetting" the team after the deletion is enough to persist 0, and nothing between the input and the scoring engine rejected it. The field's own copy is "Leave empty to inherit from guild settings", so 0 has no defined meaning.

- timestamp: 2026-09-02T15:00:00Z
  checked: docs, .planning, and migrations for any intended "zero rolling window" feature
  found: no mention anywhere; guild-level rolling_attendance_weeks is DEFAULT 4 NOT NULL; the only assertion that 0 is meaningful was domain/raid-team/__tests__/settings.test.ts:20-23 ("0 is a valid override (e.g., no rolling window)")
  implication: that test encoded an unexamined edge-case assumption rather than a product decision, and it is the assumption this bug rested on. Inverted as part of the fix, with explicit user sign-off.

## Eliminated

- hypothesis: Deleting a raid team orphans or mis-links raid_events.raid_team_id, so team-scoped attendance queries return zero rows (the intake hypothesis)
  evidence: (a) the FK is ON DELETE SET NULL, so deletion can only produce NULL raid_team_id, never a dangling reference; (b) resolveOwnedEvents explicitly INCLUDES NULL-team events for every raider, so the post-deletion state is scored, not skipped; (c) the addon export and the attendance page both resolve raiderTeamId from raid_team_members and both award full credit, which proves the events are team-compatible with their raiders; (d) the Overview's team chip proves the reporting character's membership row and team both still exist.
  timestamp: 2026-09-02T14:35:00Z

- hypothesis: A stale selected-team id (localStorage / URL param / preference) pointing at the deleted team filters every scoped query down to nothing
  evidence: useRaidTeam validates the localStorage id against the fetched team list (useRaidTeam.ts:114) and resolves activeTeamId to null when the id is not found (line 124), so a stale selection degrades to "All teams" (unfiltered, correct) rather than to an empty result. More decisively, the Overview does not consult the selector at all — it derives activeTeam from the character's own raid_team_members row — yet the Overview is the surface reporting 0 of 0.
  timestamp: 2026-09-02T14:45:00Z

- hypothesis: The raid-day filter (or a raid_days_override / schedule_history residue from issue #248) drops every tracked event
  evidence: the Overview's Next raid card is rendered from savedRaidDays, which is the same resolved raidDays array passed to computeAttendance; it correctly shows Tuesday and Thursday, and the tracked raids are on Tuesdays and Thursdays. An empty raidDays array would also disable the filter entirely (attendance.ts:256) rather than drop events.
  timestamp: 2026-09-02T14:45:00Z

- hypothesis: The events fall outside the window because the guild's own rolling_attendance_weeks is wrong
  evidence: the attendance page and the addon export both window by the guild value and both produce full credit; the attendance page labels (rendered directly from guildSettings.rolling_attendance_weeks) read 2 weeks, which matches the 4 tracked raids across two reset weeks.
  timestamp: 2026-09-02T14:40:00Z

## Resolution

root_cause: Two contributing causes, both required (AND-gate confirmed). (1) DATA/CONFIG — the affected guild's remaining raid team carries `rolling_weeks_override = 0`, a value with no defined meaning: the team editor's Rolling weeks input allowed it (`min={0}`, so a browser stepper on the empty field lands on 0), neither POST /api/raid-teams nor PATCH /api/raid-teams/[id] validated it, the column has no CHECK, and `resolveRollingWeeks` returned it verbatim. A 0-week window makes `getAttendanceWindowStart` return windowEnd+1 — a start after the end. (2) CODE — Overview, Master Sheet and the attendance page each resolved the team override, used it to bound the raid_events fetch, and then handed `computeAttendance` the GUILD's settings object as `config`, so the fetch window and the scoring window were computed independently and drifted. At an override of 0 the fetch collapsed to "today only", the engine received zero events, and every raider read "0 of 0 raids" with +0.00 attendance credit. Guild-scoped surfaces were unaffected because they never consult the team override: the addon export windows by `settings.rolling_attendance_weeks` (export-string/route.ts:223), and the Discord bot already threads the resolved value into the engine config (bot/score/route.ts:139) — which is what made the +4.00 delta between web and in-game exactly uniform across every raider. Raid-team DELETION was not causal; it was the occasion for the officer to open the remaining team's editor and "reset" it.

fix: (a) `resolveRollingWeeks` now treats a non-positive override as "no override" and inherits the guild setting — this heals the affected guild's existing row on the next page load with NO production write. (b) New `domain/scoring/attendance-window.ts::resolveAttendanceWindow()` returns `{ rollingWeeks, fetchStart }` as one pair so a caller cannot bound its query by one window and score with another; `fetchStart` is anchored on the engine's own `getAttendanceWindowStart` rather than a naive `today - weeks*7` (which also fixes a GH #96-class off-by-days event loss on the Overview). (c) Overview and Master Sheet now use that helper and pass `rolling_attendance_weeks: rollingWeeks` into the engine config; the attendance page threads its resolved weeks in the same way. (d) The Overview's eager pre-fetch window was raised from 12 to 52 weeks so it always covers the widest configurable window instead of silently truncating the engine's input. (e) `validateRollingWeeksOverride()` rejects anything but null or an integer 1..52 at both write routes (400), the editor input floor is now `min={1}`, and the editor renders a non-positive stored value as empty so an officer's next save clears the bad row.

verification:
  guardrail_verdict: accepted
  signal_1_reproduction: PASS — new test `domain/scoring/__tests__/attendance-window.test.ts` reproduces the report at the unit level over the reported dates (tracked raids 2026-08-18/20/25/27, as-of 2026-09-02, Tuesday reset, 2-week guild window, 4-point max credit). RED before the fix with `raidsInWindow: 0` / `score: 0` — the exact reported "0 of 0 raids" and "+0.00" — GREEN after at 4 of 4 and score 4.
  signal_2_regression: PASS — full suite 814/814 across 46 files; `npm run typecheck` (tsc --noEmit) clean; eslint on every changed file reports 0 errors (31 pre-existing warnings, none on changed lines — `AttendanceResult` was already an unused type import at HEAD).
  signal_3_revert: PASS — restoring only the `resolveRollingWeeks` guard to `teamOverride != null` reverts `raidsInWindow` to 0 and fails 2 tests; restoring the fix returns 31/31 green. The bug is causally attached to the fix site.
  signal_4_diff_shape: PASS — additive, not deletion-only: 165 insertions / 35 deletions across 10 files, one new domain module plus two new test suites; no test or assertion was weakened to pass. One existing assertion WAS inverted (`settings.test.ts` previously asserted `resolveRollingWeeks(4, 0) === 0` with the comment "0 is a valid override (e.g., no rolling window)") — that assertion encoded the bug: nothing in docs, .planning, migrations or the UI supports a zero-week window, and the field's own copy is "leave empty to inherit". It is replaced by explicit inherit-on-0, inherit-on-negative and smallest-meaningful-override cases. The inversion and the resulting user-facing behavior change were explicitly signed off by the user on 2026-09-02.
  signal_5_oracle: oracle_type = derived (contract). The assertions come from the documented contract of the two windows ("the engine must score the window the caller fetched") and from the field's stated "empty = inherit" semantics, not from a crash or from whatever the code happened to return. Boundary neighbours around the defect's equivalence class are covered: override 0 and -1 (inherit), 1 (smallest real override, narrows to a single reset week = 2 raids), 52 and 53 (validator upper boundary and one past it), non-integer and non-number inputs, and the in-progress reset week exclusion.
  independent_recheck: PASS — session manager re-ran the two targeted suites after the debugger returned: 31/31 green (2 files).
  not_run_build: `npm run build` compiles and typechecks cleanly ("Compiled successfully", "Finished TypeScript") but cannot finish static export in this environment — prerendering /api/guild-count fails on a missing NEXT_PUBLIC_SUPABASE_URL (no Supabase keys in local .env.local by design). Pre-existing and on a route this change does not touch.
  not_run_lint_repo_wide: `npm run lint` (bare eslint over the repo) fails to resolve the react-hooks plugin for the unscoped rule block at eslint.config.mjs:33-41. Pre-existing repo config defect: eslint.config.mjs is not in this diff, and eslint run on individual files (including untouched ones) exits 0.
  pending_post_deploy: NOT YET CONFIRMED. Production verification necessarily follows deploy. Check, as the affected guild's officer: (1) Overview attendance card shows real raids (expected 4 of 4) instead of "0 of 0", with Score breakdown +4.00; (2) Master Sheet with his team selected matches the in-game export (the uniform +4.00 gap closes); (3) Raid teams -> edit team shows Rolling weeks empty/"Guild default", rejects 0, and narrows correctly at 1.
  residual_risk: The precise stored value was proved by arithmetic elimination against the evidence images rather than by reading production (org data policy: code-level proof preferred, no third-party rows pulled into this session). If the stored override turns out to be something other than 0/negative, fix (a) would not apply to this guild — but fixes (b)/(c) still remove the fetch-vs-score drift for every override value, and the Overview would then show a NON-ZERO BUT WRONG denominator, which is itself the distinguishing observation. That signal means: reopen on the fetch/score window, not on the override value.

files_changed:
  - domain/raid-team/settings.ts (resolveRollingWeeks inherits on non-positive; new validateRollingWeeksOverride + MAX_ROLLING_WEEKS_OVERRIDE)
  - domain/scoring/attendance-window.ts (new — resolveAttendanceWindow pairs fetchStart with rollingWeeks)
  - domain/scoring/index.ts (export resolveAttendanceWindow + AttendanceWindow)
  - app/(app)/overview/components/DashboardContent.tsx (use the helper, thread rollingWeeks into engine config, eager window 12 -> 52 weeks)
  - app/(app)/master-sheet/components/MasterSheetContent.tsx (use the helper, thread weeks into engine config)
  - app/(app)/attendance/components/AttendanceContent.tsx (thread resolved weeks into engine config for both computeAttendance calls)
  - app/(app)/raid-teams/_client.tsx (Rolling weeks input min 0 -> 1; editor shows a non-positive stored override as empty/inherit)
  - app/api/raid-teams/route.ts (validate rolling_weeks_override on create)
  - app/api/raid-teams/[id]/route.ts (validate rolling_weeks_override on update)
  - domain/scoring/__tests__/attendance-window.test.ts (new — reported-scenario reproduction + window pairing + boundaries)
  - domain/raid-team/__tests__/settings.test.ts (inherit-on-0/negative; validator boundary coverage)
