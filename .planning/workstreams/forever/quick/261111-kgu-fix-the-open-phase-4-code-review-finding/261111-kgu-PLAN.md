---
phase: quick-261111-kgu
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: [04-WR-03, 04-WR-04, 04-WR-05, 04-WR-06, 04-WR-07, 04-WR-08, 04-IN-01, 04-IN-02, 04-IN-03, 04-IN-04, 04-IN-05, 04-IN-06]
must_haves:
  truths:
    - "No Discord call of the Set your 5 send can run past the route's maxDuration after the channel post has landed (WR-03)"
    - "A Set your 5 send cannot happen without the cooldown row that throttles the next one; a failed write sends nothing and a failed post releases the row (WR-04)"
    - "The member preference lookup never puts more than 100 ids in one PostgREST URL (WR-05)"
    - "The master-sheet visibility route refuses more than 2000 item ids, any element that is not a UUID, and reads a repeated id once (WR-06)"
    - "The Set your 5 card, the guild settings send row and the send route count a Discovery tier only in a phase at or below the expansion's current phase (WR-07)"
    - "The small info findings that are safe land; WR-08 and the rest are listed with a reason, not guessed at"
    - "No change to domain/scoring, Loot Score golden fixtures or Lua fixtures; Known guilds' addon payloads stay byte-identical"
---

# Quick 261111-kgu: Fix the open Phase 4 code-review findings

<objective>
Land the Phase 4 review findings still open after CR-01, WR-01 and WR-02 (`04-REVIEW.md`, fix status note): WR-03 to WR-07 as code, and whichever of WR-08 and IN-01 to IN-06 are small and safe. One code branch from origin/main with one commit per finding, so the Drop Desk (Phase 5) reuses hardened routes; the rest listed in the SUMMARY with the reason.
</objective>

<context>
- Review: `.planning/workstreams/forever/phases/04-discovery-lists-and-score-split/04-REVIEW.md` (merge commit b0aa333e). Each open finding has a "Fix" section.
- `app/api/discord/set-your-five/route.ts` and `lib/discord.ts` (04-18): WR-03, WR-04, WR-05, IN-04, IN-06; `app/(app)/audit-log/_client.tsx`: IN-01.
- `app/api/master-sheet/visibility/route.ts` (04-07): WR-06.
- `app/(app)/overview/components/SetYourFiveCard.tsx`, `DashboardContent.tsx` (04-13) and `app/(app)/guild-settings/components/GuildSettingsContent.tsx` (04-18): WR-07.
- `domain/guild/loot-style-presets.ts`, `app/api/guilds/route.ts` (04-15/04-16): WR-08, a product default the owner decides.
- `lib/updates-data.ts` (04-19): IN-02. `app/(app)/master-sheet/components/MasterSheetContent.tsx` (04-14): IN-03. `app/api/addon/*/route.ts` (04-15): IN-05.
- Patterns: routes validate auth and input then call pure code; `console.error` with a constant first argument and codes only; `__tests__/route.test.ts` files use a recording fake Supabase client. Any new user-facing string is DRAFT copy for the owner, no em dashes.
</context>

<tasks>

<task id="1" branch="fix/phase-4-review-warnings">
WR-03. Give `discordFetch` an abortable retry loop driven by `init.signal` (no further attempt and no retry sleep once it aborts; the last response is handed back as it stands) and `sendDirectMessage` a `{ signal }` option. The route creates one AbortController aborted at 55 seconds, passes it to the channel post and every DM, and counts a DM cut off by it as skipped with no log line. Tests in `lib/__tests__/discord.test.ts` (new) and the route test.
</task>

<task id="2" branch="fix/phase-4-review-warnings">
WR-04. Insert the `set_your_five_sends` audit row directly with the service client before the channel post and check its error (500, nothing sent, on failure). Delete the row if the post fails; if the delete fails, keep the cooldown and log a fixed message. Drop `logAudit` from the route. Tests for the order, the fixed columns, the failed write, the released row and the failed release.
</task>

<task id="3" branch="fix/phase-4-review-warnings">
WR-05. Export one `IN_FILTER_CHUNK_SIZE = 100` from `utils/supabase/paginate.ts`, use it in the Set your 5 preference lookup, the visibility route and `guild-award-refs.ts`. Test: 250 members produce three reads of at most 100 ids carrying every id.
</task>

<task id="4" branch="fix/phase-4-review-warnings">
WR-06. In the visibility route, after the shape check: at most 2000 ids, every element a UUID, de-duplicated before the chunked reads on both paths. API-only error strings. Tests: 2001 ids, 2000 ids in 20 chunks, malformed elements, a repeated id read and returned once.
</task>

<task id="5" branch="fix/phase-4-review-warnings">
WR-07. `discoveryListStatus` takes `currentPhase` and counts a Discovery tier only at or below it (null reads as 1, like the tier list endpoint); the Overview reads `current_phase` with the deadlines it already fetches. `GuildSettingsContent` drops `includeAllPhases`. The send route reads `expansions.current_phase` and adds `.lte('phase', current)` to its gate. Tests for the card function and the route.
</task>

<task id="6" branch="fix/phase-4-review-warnings">
Triage WR-08 and IN-01 to IN-06. Fix what is small and safe (IN-01 label and category with DRAFT copy, IN-03 `?? 2`, IN-04 token check after permission, IN-05 one helper in `lib/addon/`, IN-06 `body: object`); for IN-02 check the updates cron before touching the date; leave WR-08 to the owner with both options written up. One commit each.
</task>

<task id="7" branch="gsd/quick-261111-kgu-fix-the-open-phase-4-code-review-finding">
Docs: this PLAN, the SUMMARY, the STATE.md quick-tasks row, and the fix-status note in `04-REVIEW.md` extended with the new commits. Docs-only PR to main. Do not merge either PR: the owner merges with the admin bypass.
</task>

</tasks>

<verification>
`npm run lint` (0 errors, no new warnings), `npm run typecheck`, `npm test` (about 5,700 tests; a file that times out under load is re-run alone). Each touched route keeps its existing tests green and gains cases for the finding.
</verification>

<success_criteria>
One code branch `fix/phase-4-review-warnings` from origin/main, one commit per finding (`fix(04-NN): ...`), pushed and open as a PR to main whose body lists each finding; the quick task's PLAN and SUMMARY on the `gsd/quick-...` branch as a docs-only PR; `04-REVIEW.md`'s fix-status note extended. Findings not fixed are listed with a reason.
</success_criteria>
