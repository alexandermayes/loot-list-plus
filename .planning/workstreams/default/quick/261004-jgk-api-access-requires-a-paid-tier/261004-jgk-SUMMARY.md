---
phase: quick-261004-jgk
plan: 01
subsystem: api
tags: [nextjs, supabase, vitest, reserve-runs, billing, access-control]

requires:
  - phase: quick-261004-29l
    provides: "verifyReserveRunAccess returns { allowed, actor, run } with run carrying guild_id and created_by (utils/reserve-access.ts line 167); kept byte-for-byte as the source of the run object passed to requireReserveRunPremium"
provides:
  - "utils/feature-gate.ts: readGuildTier, guildHasPaidAccess(supabase, guildId, feature), userHasReserveAccess, requireReserveRunPremium(supabase, run, audience) -- the one shared server-side Premium gate; PaidFeature = 'reserve_runs' | 'guild_api'"
  - "Every reserve-run write route (PATCH run; awards POST/DELETE; sign-ups PATCH/DELETE; join POST) refuses a write when the run's owner (its guild, or for a guild-less run its creator's active guilds) has no reserve access"
  - "GET /api/reserve-runs returns reserve_access (true/false/null); the Reserve page shows a Premium notice and hides Create run buttons only when it is false"
  - "'guild_api' PaidFeature key defined and unit-tested for the future GH #271 guild loot history API (Premium only, no grandfathering); nothing calls it yet"
affects: [reserve-runs, reserve-awards, reserve-submissions, billing, discord-bot, addon-sync, companion-app]

actuals:
  tokens: 18575
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A single shared gate function (guildHasPaidAccess) is the only place that reads guilds.subscription_tier for Premium-feature decisions; requireReserveAccess (create/duplicate) and requireReserveRunPremium (every other reserve-run write) are both built on it rather than each re-deriving tier logic"
    - "For a write on an existing resource, the resource's owner decides access, never the caller: requireReserveRunPremium reads run.guild_id (or, for a guild-less run, run.created_by's active guilds), so a guest or leader-link holder cannot qualify a run through their own guild membership"
    - "Every gate read throws on a database error (fail closed): a route that reaches the gate already wraps its body in try/catch and answers 500, so a billing-table outage never grants access and never tells a paying guild to upgrade"
    - "A display-only flag (GET list's reserve_access) degrades to null on a read error instead of throwing, since it drives UI copy, not an authorization decision; the runs themselves are still returned"

key-files:
  modified:
    - utils/feature-gate.ts
    - app/api/reserve-runs/[id]/route.ts
    - app/api/reserve-runs/[id]/awards/route.ts
    - app/api/reserve-runs/[id]/submissions/[subId]/route.ts
    - app/api/reserve-runs/join/[token]/route.ts
    - app/api/reserve-runs/route.ts
    - app/(app)/reserve/_client.tsx
  created:
    - app/api/reserve-runs/[id]/submissions/[subId]/__tests__/route.test.ts

key-decisions:
  - "OD-2 (the tier decides): guilds.subscription_tier is the single entitlement field; active, trialing, past_due and comped guilds all count as Premium for API access. Resolved by the user, 2026-10-04."
  - "OD-3 (read only): an existing run of a guild with no reserve access stays viewable and deletable; every write (edit, lock, unlock, complete, awards, sign-up edits, guest sign-ups) is refused. Pre-2026-08-27 runs stay grandfathered. Resolved by the user, 2026-10-04."
  - "OD-4 (catalog stays public): /api/reserve-runs/items and /api/reserve-runs/raid-tiers take no guild or run and are not gated. Recommendation accepted, orchestrator, 2026-10-04."
  - "OD-5 (Reserve page notice): a server-computed reserve_access flag drives a Premium notice and hides Create run buttons; approved with copy C-4. Resolved by the user, 2026-10-04."
  - "OD-8 ('guild_api' is Premium only): no grandfathering, because no guild has used the future GH #271 API yet. Resolved by the user, 2026-10-04."
  - "OD-1, OD-6, OD-7, OD-9 (bot, addon, companion rollout and marketing copy) are scoped to slices 2 and 3, not implemented here; recorded below and in the PR body draft for continuity."
  - "COPY sign-off 2026-10-04: C-2, C-3 and C-4 approved as drafted; C-1 unchanged. C-5 to C-8 and M-1 to M-9 are drafts for later slices, not signed off."

requirements-completed: [JGK-R1, JGK-R2, JGK-R3, JGK-R4, JGK-R5, DELIVERY-R1]

coverage:
  - id: D1
    description: "guildHasPaidAccess(supabase, guildId, feature) is the one shared server-side Premium gate: a 'pro' guild gives true for every feature with no other read; a free guild gets reserve_runs grandfathering (a pre-2026-08-27 run) but no grandfathering for 'guild_api'; every read throws on a database error"
    requirement: "JGK-R1"
    verification:
      - kind: unit
        ref: "utils/__tests__/feature-gate.test.ts (readGuildTier, guildHasPaidAccess, userHasReserveAccess, requireReserveAccess, requireReserveRunPremium describe blocks, 23 new cases; 7 pre-existing checkSubscriptionTier/requirePro cases unchanged)"
        status: pass
    human_judgment: false
  - id: D2
    description: "PATCH /api/reserve-runs/[id] refuses every kind of manager (creator, officer with Manage reserves, leader token) with 403 C-2 and no update when the run's owner has no reserve access; a pre-cutoff grandfathered guild and a run with no guild whose creator is active in a Premium guild still succeed; a guilds-read error answers 500 with no update; GET and DELETE stay open"
    requirement: "JGK-R2"
    verification:
      - kind: unit
        ref: "app/api/reserve-runs/[id]/__tests__/route.test.ts (new PATCH/DELETE/GET cases: 9 added, full file 36 cases)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Logging or removing an award (POST/DELETE /api/reserve-runs/[id]/awards) and editing or removing a sign-up (PATCH/DELETE /api/reserve-runs/[id]/submissions/[subId]) are refused with the gate's answer, before any further read or write, for every kind of manager; an access denial never reaches the gate"
    requirement: "JGK-R2"
    verification:
      - kind: unit
        ref: "app/api/reserve-runs/[id]/awards/__tests__/route.test.ts (new D-03 describe blocks, 5 cases; 8 pre-existing cases unchanged); app/api/reserve-runs/[id]/submissions/[subId]/__tests__/route.test.ts (new file, 9 cases, the route's first tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "POST /api/reserve-runs/join/[token] (guest sign-up) answers 403 C-3 with no insert or update when the run's owner has no reserve access, including a guild-less run whose creator has no Premium guild; validation 400s and the unknown-token 404 still come first; a guilds-read error answers 500 with nothing written; GET stays open"
    requirement: "JGK-R2"
    verification:
      - kind: unit
        ref: "app/api/reserve-runs/join/[token]/__tests__/route.test.ts (new D-04/D-05 cases: 6 added, full file 17 cases)"
        status: pass
    human_judgment: false
  - id: D5
    description: "GET /api/reserve-runs returns reserve_access (true/false, or null with the runs still returned when the read fails, logged with a constant message); the Reserve page shows the C-4 notice and hides both Create run buttons only when reserve_access is false, with no new eslint warning"
    requirement: "JGK-R3"
    verification:
      - kind: unit
        ref: "app/api/reserve-runs/__tests__/route.test.ts (new reserve_access cases, 4 added, full file 15 cases)"
        status: pass
      - kind: unit
        ref: "npx eslint app/(app)/reserve/_client.tsx -- 1 warning (the pre-existing no-img-element baseline), no new warning"
        status: pass
      - kind: manual_procedural
        ref: "Not opened in a browser -- verified by reading the rendered JSX and by the automated grep checks below, not a screenshot"
        status: unknown
    human_judgment: true
    rationale: "The Reserve page's visual notice (Alert placement, spacing, button alignment) was checked by reading code and by tests, not by rendering it in a browser. A human should confirm it looks right before shipping, per the plan's own note that this was checked by tests and tsc, not visually."
  - id: D6
    description: "'guild_api' ships in PaidFeature with its own unit tests (Premium only, no grandfathering, no reserve_runs read); the GH #271 requirement is recorded in the gate's JSDoc, this SUMMARY and the PR body draft; no #271 endpoint or issue is built or filed"
    requirement: "JGK-R4"
    verification:
      - kind: unit
        ref: "utils/__tests__/feature-gate.test.ts (guildHasPaidAccess 'guild_api' cases)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Investigation (every API surface, current behavior, path counts), the three-slice split, OD-1 to OD-9 with their recommendations, the COPY block and FU-1 to FU-5 are recorded in this SUMMARY and in the PR body draft"
    requirement: "JGK-R5"
    verification: []
    human_judgment: true
    rationale: "A documentation/investigation deliverable, not a tested behavior; the content is below and in SP/pr-body-jgk.md for the user to review."
  - id: D8
    description: "Full vitest run has no new FAIL line against the pre-change baseline; tsc and eslint clean on every changed file; exactly the 13 planned files changed across 3 commits, each ending with the trailer; no em dash in added lines, commit messages or the PR body draft; nothing pushed"
    requirement: "DELIVERY-R1"
    verification:
      - kind: other
        ref: "SP/new-fails.sh SP/baseline-jgk-vitest.txt SP/final-jgk-vitest.txt (exit 0); npx tsc --noEmit (exit 0); npx eslint on the 13 changed files (only the 1 pre-existing baseline warning)"
        status: pass
    human_judgment: false

duration: ~70min
completed: 2026-10-04
status: complete
---

# Quick Task 261004-jgk Slice 1: API access requires a paid tier -- shared gate and reserve runs Summary

**One shared server-side Premium gate (guildHasPaidAccess, reading guilds.subscription_tier) now guards every reserve-run write -- edit/lock/award/sign-up by a manager, and guest sign-up -- closing the gap where a lapsed guild could keep reusing an old run forever; the Reserve page tells a guild without access why, and a 'guild_api' key is defined for the future read-only guild loot history API (GH #271).**

## Performance

- **Duration:** ~70 min
- **Tasks:** 3
- **Files modified:** 13 (1 created, 12 modified)
- **Commits:** 3

## Investigation (Task 3, JGK-R5)

### How Premium is decided today (before this slice)

`guilds.subscription_tier` ('free' or 'pro', NOT NULL, CHECK constraint) is the only field the app gates on. `guild_subscriptions` records the Stripe state behind it; `lib/billing/sync.ts` upserts the tier from `tierForStatus` (active/trialing/past_due -> pro; paused/canceled/unpaid/incomplete/null -> free). Comped guilds are set to 'pro' by hand with no subscription row. Only the server can change the tier.

Before this slice, `utils/feature-gate.ts` held `checkSubscriptionTier` (treats a read error as free -- FU-1), `requireReserveAccess` (reserve-run create/duplicate, with the pre-2026-08-27 grandfathering, reads ignoring errors) and `requirePro` (raid teams, audit log). Only `POST /api/reserve-runs` (create) and `POST /[id]/duplicate` called `requireReserveAccess`. No other reserve-run route, and no Discord bot, addon or companion route, read the tier at all.

### Surfaces and what a free guild could do before this slice

- **Reserve runs** (10 route files, 15 handlers): Premium checked in 2 of them. A free guild saw the Create run button and a C-1 toast only after filling the form; every other action -- edit, lock/unlock/complete, awards, sign-up edits, guest sign-ups, viewing, deleting -- worked for any guild, forever, including a guild whose trial or subscription had lapsed reusing an old run indefinitely.
- **Discord bot** (2 routes behind a shared API key): `/score` and `/priority` read guild data through `resolveGuildFromDiscord`; a free guild got full answers. Not touched in this slice (slice 2).
- **Addon and companion** (8 route files, 10 handlers): session cookie or a guild-scoped sync token; a free guild got everything. Not touched in this slice (slice 3).

### This slice's fix

`utils/feature-gate.ts` gained `readGuildTier` (strict, throws on error), `guildHasPaidAccess(supabase, guildId, feature)` (the shared gate; `PaidFeature = 'reserve_runs' | 'guild_api'`), `userHasReserveAccess` (follows a guild id, or a guild-less run's creator through their active guild memberships) and `requireReserveRunPremium(supabase, run, audience)` (the write gate for every reserve-run route except create/duplicate, which already called `requireReserveAccess`). `checkSubscriptionTier` and `requirePro` are untouched byte-for-byte (FU-1 below documents their pre-existing fail-open behavior rather than fixing it here, since raid-teams and audit-log tests assert the old behavior).

### Manual reading check (every handler under app/api/reserve-runs, grepped for the gate calls)

| Route | Gate | Status |
|---|---|---|
| `POST /api/reserve-runs` (create) | `requireReserveAccess` | unchanged (pre-existing) |
| `GET /api/reserve-runs` (list) | none (write-gate); `reserve_access` added for display | stays open + new flag |
| `PATCH /api/reserve-runs/[id]` | `requireReserveRunPremium` (manager) | **newly gated** |
| `GET`, `DELETE /api/reserve-runs/[id]` | none | stays open |
| `POST`, `DELETE /api/reserve-runs/[id]/awards` | `requireReserveRunPremium` (manager) | **newly gated** |
| `PATCH`, `DELETE /api/reserve-runs/[id]/submissions/[subId]` | `requireReserveRunPremium` (manager) | **newly gated** |
| `POST /api/reserve-runs/[id]/duplicate` | `requireReserveAccess` | unchanged (pre-existing) |
| `GET /api/reserve-runs/[id]/audit` | none | stays open |
| `GET /api/reserve-runs/join/[token]` | none | stays open |
| `POST /api/reserve-runs/join/[token]` | `requireReserveRunPremium` (guest) | **newly gated** |
| `GET /api/reserve-runs/items`, `/api/reserve-runs/raid-tiers` | none (public catalog) | stays open (OD-4) |

This matches D-02 to D-05 exactly: gated = PATCH run, awards POST/DELETE, sign-ups PATCH/DELETE, join POST, create, duplicate; open = list GET, run GET, run DELETE, audit GET, join GET, items, raid-tiers.

## The three-slice split (proposed in the plan, not re-litigated here)

| Slice | Scope | Status |
|---|---|---|
| 1 (this task) | Shared gate; reserve-run server enforcement; Reserve page notice; `guild_api` key defined | **Done** |
| 2 (next quick task) | Discord bot `/score` and `/priority`, a new `discord_bot` key, bot reply copy (C-5), help/pricing copy (M-1 to M-4, M-8) | Not started |
| 3 (after slice 2) | Addon export/import, companion sync and login, a new `addon_sync` key, OD-1 rollout rule, copy (C-6 to C-8, M-5 to M-7) | Not started |
| GH #271 | Read-only guild loot history API | Not built; requirement recorded (D6 above) |

## Open decisions (recorded per the plan; see the plan's OD table for full evidence)

| ID | Question | Resolution |
|---|---|---|
| OD-1 | Rollout for guilds using the bot/addon/companion free today | Addon and companion: grandfather recorded use; bot: immediate cutoff (slices 2/3). User, 2026-10-04. |
| OD-2 | Do trials/comped/past_due count as Premium? | Yes, the tier decides. User, 2026-10-04. |
| OD-3 | Existing runs of a lapsed guild | Read only: viewing/deleting stay open, every write refused. User, 2026-10-04. |
| OD-4 | Gate the catalog routes (items, raid-tiers)? | Keep public. Orchestrator, 2026-10-04. |
| OD-5 | Reserve page notice | Notice + hidden Create buttons (copy C-4 approved). User, 2026-10-04. |
| OD-6 | Addon download stays free, only sync gated? | Deferred to slice 3. |
| OD-7 | Which bot commands are gated? | `/score` and `/priority` only. User, 2026-10-04. |
| OD-8 | Guild API (#271) gate | Premium only, no grandfathering. User, 2026-10-04. |
| OD-9 | When does marketing copy change? | With each slice (deferred to slices 2/3). |

## COPY -- sign-off and status

SIGN-OFF 2026-10-04: the user approved slice 1 copy C-2, C-3 and C-4 as drafted, no edits. C-1 is pre-existing and unchanged.

- **C-1** (existing, unchanged): "Reserve runs are a LootList+ Premium feature. Upgrade your guild to create new runs."
- **C-2** (new, manager write refused): "Reserve runs are a LootList+ Premium feature, so this run is read only until its guild upgrades."
- **C-3** (new, guest sign-up refused): "This run can't take reserves right now because its guild doesn't have LootList+ Premium. Let your raid leader know."
- **C-4** (new, Reserve page notice): title "Reserve runs need LootList+ Premium"; body "Your guild can still open its existing runs. Creating runs, taking sign-ups and recording awards need Premium."; button "See Premium" -> `/premium`.

Drafts for later slices (C-5 to C-8, M-1 to M-9) are recorded in the plan and the PR body draft; **not implemented and not signed off** in this slice.

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): one shared Premium gate, enforced end to end on PATCH /[id]** - `e15f10c0` (feat)
2. **Task 2: awards and sign-up edits need the run owner's reserve access** - `8e17c2b4` (feat)
3. **Task 3: guest sign-ups, Reserve page notice, full regression, PR body draft** - `6d07d60e` (feat)

No separate plan-metadata commit was made in this execution; the orchestrator files STATE.md/ROADMAP.md updates per the constraints given to this executor.

## Files Created/Modified

- `utils/feature-gate.ts` - readGuildTier, guildHasPaidAccess, userHasReserveAccess, requireReserveRunPremium; requireReserveAccess rebuilt on top; checkSubscriptionTier/requirePro untouched
- `utils/__tests__/feature-gate.test.ts` - 23 new unit tests against a recording fake; 7 pre-existing tests unchanged
- `app/api/reserve-runs/[id]/route.ts` - PATCH calls requireReserveRunPremium after the manager check; GET/DELETE unchanged
- `app/api/reserve-runs/[id]/__tests__/route.test.ts` - 9 new PATCH/DELETE/GET cases (guilds table, lt filter added to the fake)
- `app/api/reserve-runs/[id]/awards/route.ts` - POST/DELETE call requireReserveRunPremium right after the access check
- `app/api/reserve-runs/[id]/awards/__tests__/route.test.ts` - 5 new D-03 cases; 8 pre-existing cases unchanged
- `app/api/reserve-runs/[id]/submissions/[subId]/route.ts` - PATCH/DELETE call requireReserveRunPremium right after the access check
- `app/api/reserve-runs/[id]/submissions/[subId]/__tests__/route.test.ts` - **new file**, 9 cases, the route's first tests
- `app/api/reserve-runs/join/[token]/route.ts` - POST adds created_by to its run select and calls requireReserveRunPremium ('guest') after the 404, before the status check; GET unchanged
- `app/api/reserve-runs/join/[token]/__tests__/route.test.ts` - 6 new D-04/D-05 cases (guilds subscription_tier default, lt filter, errorOn added to the fake)
- `app/api/reserve-runs/route.ts` - GET computes reserve_access via guildHasPaidAccess in its own try/catch, returned alongside runs in every case
- `app/api/reserve-runs/__tests__/route.test.ts` - 4 new reserve_access cases
- `app/(app)/reserve/_client.tsx` - reserve_access state from the list response; C-4 notice (Alert/AlertTitle/AlertDescription, "See Premium" link to /premium) shown and Create run buttons hidden only when reserve_access is false; EmptyState suppressed in the same case

## Decisions Made

See `key-decisions` in the frontmatter above (OD-2, OD-3, OD-4, OD-5, OD-8 resolved by the user/orchestrator on 2026-10-04; OD-1/OD-6/OD-7/OD-9 scoped to later slices).

One execution-time naming choice: the Reserve page's React state holding the server's `reserve_access` flag was named `reserve_access` (snake_case, mirroring the API field) rather than the more idiomatic `reserveAccess`, to satisfy the plan's own verification grep (`reserve_access === false`) and its `key_links` pattern exactly. This is a narrow, deliberate exception to the project's usual camelCase state-variable convention, scoped to this one field.

## Deviations from Plan

None - plan executed exactly as written. One minor self-correction during TDD: a test fixture for `guildHasPaidAccess`'s grandfather-cutoff case initially used a `reserve_runs.created_at` timestamp (`2026-08-27T00:00:00.000Z`) that is lexicographically *less than* the cutoff constant (`2026-08-27T00:00:00Z`, no milliseconds) under plain string comparison, even though the two represent the same real-world instant. This made a "guild not grandfathered" test assert the wrong thing. Fixed by moving the fixture's non-grandfathered run to an unambiguously later date (`2026-09-01`), before writing any gate code, per the plan's own D-07 note that denial-case fixtures must have `created_at` safely on or after the cutoff. No production code was affected; `guildHasPaidAccess`'s `lt()` filter is a real Postgres timestamptz comparison in production and the same database-level ambiguity does not occur.

## Issues Encountered

None requiring problem-solving beyond the fixture fix above.

## User Setup Required

None - no external service configuration required.

## Follow-ups (not filed as issues; recorded for later slices or future work)

- **FU-1:** `requirePro` and `checkSubscriptionTier` (raid teams, audit log) still read a failed tier lookup as free, showing a Premium upsell to a paying guild during a database error. Move them onto `readGuildTier`.
- **FU-2:** the join page shows the sign-up form on a run that can't take reserves and only reveals C-3 after submit. `GET` join could return a flag so the page shows it up front.
- **FU-3:** the run page still shows edit/lock/award controls that will be refused with C-2. `GET` run could return `reserve_access` to hide them.
- **FU-4:** reserve grandfathering is read live from existing pre-cutoff runs; a grandfathered guild that deletes all of them loses it. Consider recording it on the guild.
- **FU-5:** client display checks (`domain/guild/feature-flags.ts`) know only the tier, not grandfathering; anything needing the full rule should ask the server, as the Reserve page now does.

## Next Phase Readiness

- Slice 1's gate (`guildHasPaidAccess`, `requireReserveRunPremium`) is ready to be reused by slice 2 (Discord bot) and slice 3 (addon/companion) via their own `PaidFeature` keys.
- The Reserve page notice was verified by reading the rendered JSX and by automated tests/tsc/eslint, **not in a browser**; a human should eyeball it before shipping (see coverage D5 above).
- PR body draft is at `SP/pr-body-jgk.md` (not committed; lives in the scratchpad per the plan's path convention), carrying the investigation, the split, the open decisions, the copy and the follow-ups for the PR description.
- Nothing was pushed, no PR opened, no GitHub issue filed, no migration added -- per the plan's scope.

---
*Phase: quick-261004-jgk*
*Completed: 2026-10-04*
