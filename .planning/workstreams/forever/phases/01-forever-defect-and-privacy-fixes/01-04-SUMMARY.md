---
phase: 01-forever-defect-and-privacy-fixes
plan: 04
subsystem: api
tags: [discord-bot, wowhead, nextjs, supabase, typescript, vitest, forever]

requires:
  - phase: 01-forever-defect-and-privacy-fixes
    provides: "plan 01-03 wowheadItemUrl (domain/expansion/wowhead.ts); plan 01-02 createTypedServiceRoleClient and selectAllPagesOrThrow"
provides:
  - "GET /api/bot/priority sends item_url on every 200 answer (raiders listed and the empty state); null when wowhead_id is null"
  - "A Forever guild's /priority reply links the item to https://www.wowhead.com/forever/item=<wowhead_id>; every other guild's link is byte-identical to before"
  - "discord-bot priorityEmbed renders item_url only after a strict Wowhead shape check, else falls back to the item_wowhead_id link, else the bold name"
  - "A failed expansions read in /api/bot/priority answers 500 { error: 'Internal server error' } and calls trackApiError"
  - "/api/bot/priority and /api/bot/score create their client with createTypedServiceRoleClient; /priority uses the shared selectAllPagesOrThrow"
affects: [01-05 typed-client scan test (bot routes now typed), 01-09 bot copy (edits the same priorityEmbed, branches after PR 4), phase-01 shipping split (PR 4)]

actuals:
  tokens: 3100
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Server decides the link, the separately deployed bot validates its shape: item_url is additive and the bot falls back, so app and bot deploy in either order"
    - "Typed-client narrowing by cast only (no ?? defaults) at the point a row reaches the scoring engine"

key-files:
  created: []
  modified:
    - app/api/bot/priority/route.ts
    - app/api/bot/priority/__tests__/route.test.ts
    - app/api/bot/score/route.ts
    - discord-bot/interactions.js
    - discord-bot/interactions.test.mjs

key-decisions:
  - "item_url is built by wowheadItemUrl(expansionName, item.wowhead_id) with no third argument, so non-Forever guilds keep exactly the retail /item= link the bot built before"
  - "A missing expansions row (maybeSingle returns null) keeps the retail link rather than failing the lookup; only a read error answers 500"
  - "The 403 rankings_hidden body is unchanged: its embed renders no link, so it needs no item_url"
  - "No default substitution in /score: two narrow casts (records, config) with comments; runtime values reach computeAttendance exactly as before"

patterns-established:
  - "Bot embeds render server-supplied URLs only after a strict regex check (WOWHEAD_ITEM_URL), the same idea as premiumRequiredEmbed's https check"

requirements-completed: [FIX-03, FIX-06]

coverage:
  - id: D1
    description: "A Forever guild's /priority answer carries item_url https://www.wowhead.com/forever/item=<id> on both the raiders and empty-state 200s, keeps item_wowhead_id, and sends null item_url for an item with no wowhead_id; non-Forever guilds keep the retail item_url"
    requirement: "FIX-03"
    verification:
      - kind: unit
        ref: "app/api/bot/priority/__tests__/route.test.ts#FIX-03: item_url on /priority answers (plan 01-04)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A failed expansions read answers 500 with a generic body and calls trackApiError"
    requirement: "FIX-03"
    verification:
      - kind: unit
        ref: "app/api/bot/priority/__tests__/route.test.ts#GH #325: D-04 every query error returns 500 and calls trackApiError > returns 500 when expansions fails"
        status: pass
    human_judgment: false
  - id: D3
    description: "The bot renders the server's item_url when it matches the strict Wowhead shape; a missing, non-Wowhead, parenthesis-injecting or non-string item_url falls back to the item_wowhead_id link; no id renders the bold name with no link"
    requirement: "FIX-03"
    verification:
      - kind: unit
        ref: "discord-bot/interactions.test.mjs#priorityReply item link (FIX-03)"
        status: pass
    human_judgment: false
  - id: D4
    description: "/api/bot/priority and /api/bot/score use the typed service-role client, /priority uses the shared paged reader, and /score numbers are unchanged"
    requirement: "FIX-06"
    verification:
      - kind: unit
        ref: "npx vitest run app/api/bot domain/scoring discord-bot (13 files, 456 tests pass, no edits to score or scoring tests)"
        status: pass
      - kind: other
        ref: "npx tsc --noEmit (ignoring .next/) reports 0 errors; npx eslint app/api/bot discord-bot exits 0"
        status: pass
    human_judgment: false
  - id: D5
    description: "A Forever guild's /priority reply actually opens the right page on wowhead.com/forever in Discord"
    requirement: "FIX-03"
    verification: []
    human_judgment: true
    rationale: "The URL shape https://www.wowhead.com/forever/item=<id> comes from the milestone brief (assumption A3) and was not live-checked because live Wowhead fetches are forbidden; one manual click on a Forever guild's /priority reply confirms it"

duration: 6min
completed: 2026-10-13
status: complete
---

# Phase 01 Plan 04: Forever /priority links and typed bot routes Summary

**`/api/bot/priority` now sends a server-built `item_url` (wowhead.com/forever for Forever guilds, the unchanged retail link for everyone else), the bot renders it only after a strict Wowhead shape check, and both bot routes read through the typed service-role client.**

## Performance

- **Duration:** 6 min (approximate; start time was not captured at spawn, end is the metadata step)
- **Started:** 2026-10-13T21:29Z (approximate)
- **Completed:** 2026-10-13T21:35Z
- **Tasks:** 2 (Task 1 tracer, Task 2)
- **Files modified:** 5 (0 created, 5 modified)

## Accomplishments

- A raider in a Forever guild who runs `/priority` now gets an item link that opens `wowhead.com/forever/item=<id>`; before, the bot always built a retail `/item=` link.
- Every other guild's `/priority` link is byte-identical to before, and an older app that sends no `item_url` still works because the bot falls back to the link built from `item_wowhead_id`.
- The bot can no longer be made to put an arbitrary link in a public embed through `item_url`: only `https://www.wowhead.com/[domain/]item=<digits>` is rendered, including a parenthesis-injection case.
- A database error reading the guild's expansion answers 500 and is tracked, instead of sending a wrong link.
- `/priority` and `/score` are on the typed client (a misspelled table or column now fails typecheck), `/priority` dropped its local copy of the paged reader for the shared one, and `/score` numbers are untouched.

## `item_url` contract (GET /api/bot/priority)

- Present on **every 200 answer**: the raiders list and the empty state (no ranked or no active raiders).
- Value: `wowheadItemUrl(<active expansion name>, item.wowhead_id)`. Forever gives `https://www.wowhead.com/forever/item=<id>`; any other expansion, or an expansion row that cannot be found, gives `https://www.wowhead.com/item=<id>`.
- **`null`** when the item's `wowhead_id` is null (the bot then shows the bold name with no link).
- `item_wowhead_id` stays in the body for back-compat with an older bot.
- The 403 `rankings_hidden` body is unchanged (`{ error, item_name, item_wowhead_id }`); its embed renders no link.

## Deploy order

Either order is safe because `item_url` is additive and the bot falls back when it is absent. Preferred: app (Vercel) first, then the bot (Railway). Until the bot deploys, Forever guilds keep seeing the retail link; until the app deploys, the bot builds the retail link as it always did.

## Task Commits

1. **Task 1: Tracer: a Forever guild's /priority reply links to wowhead.com/forever** - `fe7812a2` (fix)
2. **Task 2: Bot routes read through the typed client and the shared paged reader** - `24291b05` (fix)

**Plan metadata:** committed separately (docs: complete plan; SUMMARY first, then STATE/ROADMAP/REQUIREMENTS).

_Task 1 was `tdd="true"`: the route and bot tests were written first and run red for the right reason (`item_url` undefined, no expansions read), then made green. The plan prescribes one commit per task, so there is no separate `test(...)` commit._

**Tracer feedback gate:** Task 1 was the tracer. Its `<verify>` (`npx vitest run app/api/bot/priority discord-bot`, 81 tests) passed after the commit. The interactive human-verify gate was passed under the standing approval from the orchestrator, and execution continued straight into Task 2.

## Files Created/Modified

- `app/api/bot/priority/route.ts` - reads the active expansion name (error-checked, `maybeSingle`), adds `item_url` to the empty-state and final 200 bodies, switches to `createTypedServiceRoleClient`, imports the shared `selectAllPagesOrThrow`, drops the local helper and `PAGE_SIZE`, header notes the shared helper
- `app/api/bot/priority/__tests__/route.test.ts` - `expansions` rows in `baseTables` and `scenario`; Forever, Mists of Pandaria, empty-state, null-wowhead, rankings_hidden-unchanged, missing-row and read-shape tests; `expansions` case in the D-04 error table
- `app/api/bot/score/route.ts` - typed client; two narrow `as` casts (attendance records, scoring config) with comments, no default substitution
- `discord-bot/interactions.js` - module-private `WOWHEAD_ITEM_URL` regex and `priorityEmbed` link selection (item_url when shape-valid, else retail link from `item_wowhead_id`, else bold name)
- `discord-bot/interactions.test.mjs` - nine `priorityReply item link (FIX-03)` tests; existing title and footer assertions untouched

## Decisions Made

See `key-decisions` above. In short: no third argument to `wowheadItemUrl` so non-Forever stays retail, a missing expansion row degrades to the retail link while a read error answers 500, and `/score` is narrowed by cast only.

## Deviations from Plan

None - plan executed exactly as written.

Notes that are not deviations: the plan's header-sentence instruction in Task 2 referred to a sentence contrasting the local helper with `paginatedSelect`; that sentence lived in the local helper's doc comment (deleted with it), so a one-sentence pointer to the shared helper was added to the route header instead. The missing-expansion-row test and the `expansions` select/filter shape test are small additions beyond the plan's behavior list.

## Copy confirmation

No bot copy string changed. Embed titles, the raider-line separator, the footer, and the comment at the old line ~193 are untouched (`git diff --stat -- discord-bot/help.js discord-bot/help.test.mjs` is empty, and the `interactions.js` diff only adds the regex, its comment, and the link selection). Plan 01-09 owns the copy and the em dash work. The new code comment contains no em dash.

## Issues Encountered

None.

## Verification Results

- `npx vitest run app/api/bot discord-bot domain/scoring`: 13 files, 456 tests pass.
- `npx tsc --noEmit` ignoring `.next/`: 0 errors.
- `npx eslint app/api/bot discord-bot`: exit 0.
- `git diff --stat -- app/api/bot/score/__tests__ domain/scoring` and `-- discord-bot/help.js discord-bot/help.test.mjs`: both empty.
- Acceptance greps: `item_url` in the route 3, `from('expansions')` 1, `WOWHEAD_ITEM_URL` 2, `label: 'expansions'` 1, `createTypedServiceRoleClient()` 1 in each route, local `async function selectAllPagesOrThrow` 0, shared import 1.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Threat Flags

None. T-04-01 (markdown link injection) is mitigated by the strict regex with a parenthesis-injection test; T-04-02 (wrong link on a failed read) by the error-checked expansions read and its D-04 case; T-04-04 (score integrity) by cast-only narrowing with unchanged score tests. No new endpoint, auth path or schema change.

## Next Phase Readiness

- Plan 01-05's scan test can now assert both bot routes use the typed client.
- Plan 01-09 (bot copy) edits the same `priorityEmbed` in `discord-bot/interactions.js` and should branch after PR 4 merges.
- Shipping: PR 4 (a `fix/...` branch) carries this plan and plan 01-05 together, opened after PR 2 (01-03) and PR 3 (01-02, 01-07) merge. No new user-facing copy, so no copy sign-off is needed.
- FIX-03 and FIX-06 stay Pending in REQUIREMENTS.md until the sibling plans that declare them finish (the shared-ID gate reported 0 of 2 ready).
- Manual look suggested (coverage D5): run `/priority` for a Forever guild and click the item link to confirm the forever page opens (assumption A3, URL shape not live-checked).

## Self-Check: PASSED

All five modified files are present on disk, both task commits (`fe7812a2`, `24291b05`) are found in git, and every acceptance criterion from both tasks plus the plan-level verification were re-run and pass as listed above.

---
*Phase: 01-forever-defect-and-privacy-fixes*
*Completed: 2026-10-13*
