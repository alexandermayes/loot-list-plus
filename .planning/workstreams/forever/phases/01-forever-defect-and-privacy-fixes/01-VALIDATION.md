---
phase: 1
slug: forever-defect-and-privacy-fixes
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-12
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 (`globals: true`, default environment jsdom; route and scan tests opt into `// @vitest-environment node`) |
| **Config file** | `vitest.config.ts` (plus `vitest.setup.ts`); no install needed |
| **Quick run command** | `npx vitest run <paths touched by the task>` (each task's `<automated>` command) |
| **Full suite command** | `npm run test` (= `vitest run`), plus `npm run typecheck` and `npm run lint` |
| **Type gate** | `test "$(npx tsc --noEmit 2>&1 \| grep -v '^\.next/' \| grep -c 'error TS')" = 0` (filters the two stale `.next` errors, RESEARCH Pitfall 10); written as "tsc0" in the map below |
| **Estimated runtime** | Quick runs under 10 seconds (RESEARCH baseline: 22 files, 620 tests in 1.5 s); the type gate is the slowest step and was not timed |

---

## Sampling Rate

- **After every task commit:** Run the task's `<automated>` command (a scoped `npx vitest run <paths>`, plus tsc0 where listed)
- **After every plan wave:** Run `npx vitest run app/api domain discord-bot lib utils companion/src/main/__tests__` plus tsc0
- **Before `/gsd-verify-work`:** `npm run lint && npm run typecheck && npm run test` green on a clean checkout (or with `.next` removed)
- **Max feedback latency:** about 10 seconds for the vitest part of a quick run; tsc0 adds its own time

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | FIX-01 | T-01-01 | Recompute receives the request's verified guild_id and is awaited before the 200 | route unit | `npx vitest run app/api/loot-history/bulk` | ✅ (DELETE harness added in task) | ⬜ pending |
| 1-01-02 | 01 | 1 | FIX-01 | T-01-01, T-01-02 | A failed pre-read or before-read answers 500 before any write; guild_id filter on every read, delete and update | route unit | `npx vitest run app/api/loot-history/bulk` | ✅ | ⬜ pending |
| 1-01-03 | 01 | 1 | FIX-04 | T-01-05 | Receipt stays numbers-only for components; 4096 cap kept and its boundary pinned (E-11) | route unit + type | `npx vitest run app/api/loot-history/bulk domain/scoring` | ✅ | ⬜ pending |
| 1-02-01 | 02 | 1 | FIX-06, FIX-02 | T-02-02, T-02-04 | BLP and priority reads filtered by guild_id; a nonexistent table or filter column fails typecheck | route unit + type | `npx vitest run utils/supabase app/api/addon/guild-data` and tsc0 | ❌ W0 (typed-service-role.test.ts created in task; guild-data fake rewritten) | ⬜ pending |
| 1-02-02 | 02 | 1 | FIX-02 | T-02-01, T-02-03 | Every read error answers a generic 500 with trackApiError; reads page past 1000 rows | route unit + unit | `npx vitest run utils/supabase app/api/addon/guild-data companion/src/main/__tests__/api-client.test.ts` | ❌ W0 (api-client.test.ts created in task) | ⬜ pending |
| 1-03-01 | 03 | 1 | FIX-03 | T-03-01, T-03-02, T-03-04 | URLs built only from fixed domains and numeric ids; the announcement never throws on a failed lookup | unit | `npx vitest run domain/expansion lib/__tests__/discord-loot-announcements.test.ts app/components/__tests__/ItemLink.test.ts` | ❌ W0 (wowhead.test.ts and discord-loot-announcements.test.ts created in task) | ⬜ pending |
| 1-03-02 | 03 | 1 | FIX-03 | T-03-01 | Same URL rule in the raid summary and reserve copy | unit | `npx vitest run lib/__tests__/discord-raid-summary.test.ts lib/__tests__/discord-loot-announcements.test.ts domain/expansion app/components/__tests__/ItemLink.test.ts` | ❌ W0 (discord-raid-summary.test.ts created in task) | ⬜ pending |
| 1-06-01 | 06 | 1 | FIX-05 | T-06-01, T-06-07 | master_loot_awarded carries ids and counts only; builder takes primitives and an id array | unit + type | `npx vitest run utils/analytics` and tsc0 | ❌ W0 (master-loot-events.test.ts created in task) | ⬜ pending |
| 1-06-02 | 06 | 1 | FIX-05 | T-06-02, T-06-03, T-06-04 | No names in super, group or person properties; no email in posthog.identify | existing unit + lint + node assertion + type | `npx vitest run "app/(app)/loot-submissions"`, eslint on the four files, the PostHogProvider node assertion, and tsc0 | ✅ | ⬜ pending |
| 1-04-01 | 04 | 2 | FIX-03 | T-04-01, T-04-02 | Bot renders item_url only on a strict Wowhead shape match; a failed expansion read answers 500 | route unit + bot unit | `npx vitest run app/api/bot/priority discord-bot` | ✅ | ⬜ pending |
| 1-04-02 | 04 | 2 | FIX-03 | N/A (copy) | N/A | bot unit + node scan | `npx vitest run discord-bot` and the interactions.js U+2014 node check | ✅ | ⬜ pending |
| 1-04-03 | 04 | 2 | FIX-06 | T-04-04 | Typed client with casts only; /score numbers unchanged | route unit + type | `npx vitest run app/api/bot domain/scoring discord-bot` and tsc0 | ✅ | ⬜ pending |
| 1-07-01 | 07 | 2 | FIX-02, FIX-06 | T-07-02, T-07-04 | BLP and priority reads filtered by guild_id; an unknown table fails the route tests | route unit + type | `npx vitest run app/api/addon/export-string` and tsc0 | ✅ (fake rewritten in task) | ⬜ pending |
| 1-07-02 | 07 | 2 | FIX-02 | T-07-01, T-07-03 | Every read error answers a generic 500 with trackApiError | route unit + type | `npx vitest run app/api/addon lib/addon utils/supabase companion/src/main/__tests__` and tsc0 | ✅ | ⬜ pending |
| 1-08-01 | 08 | 2 | FIX-05 | T-08-01 | guild_created and reserve_item_awarded carry ids only (exact-properties assertions) | route unit + type | `npx vitest run app/api/guilds "app/api/reserve-runs"` and tsc0 | ✅ | ⬜ pending |
| 1-08-02 | 08 | 2 | FIX-05 | T-08-01, T-08-02 | Character events carry ids only; the scan rejects names in any analytics call and email in any identify call | route unit + scan + type | `npx vitest run utils/analytics app/api/battlenet app/api/guilds "app/api/reserve-runs"` and tsc0 | ❌ W0 (no-names-in-analytics.test.ts created in task) | ⬜ pending |
| 1-05-01 | 05 | 3 | FIX-06 | T-05-02 | Factory swap only; auth and award behaviour unchanged (suites unedited) | route unit + type | `npx vitest run app/api/addon/loot-award app/api/addon/import-string` and tsc0 | ✅ | ⬜ pending |
| 1-05-02 | 05 | 3 | FIX-06 | T-05-01, T-05-02 | The scan fails if any addon or bot route imports or calls the untyped client | scan + route unit + type | `npx vitest run app/api/addon app/api/bot lib/addon utils/supabase` and tsc0 | ❌ W0 (typed-client-usage.test.ts created in task) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Test scaffolds are created inside the TDD task that needs them (RED first), not in a separate Wave 0 plan. From RESEARCH "Wave 0 Gaps", plus the tests planning added:

- [ ] `app/api/loot-history/bulk/__tests__/route.test.ts`: DELETE harness (import DELETE, pre-read rows fixture, delete flags) for FIX-01 (plan 01-01 Task 1)
- [ ] `utils/supabase/__tests__/typed-service-role.test.ts`: compile-time guard for FIX-06 (plan 01-02 Task 1)
- [ ] `app/api/addon/guild-data/__tests__/route.test.ts`: fake rewritten with real table names and an allow-list for FIX-02 (plan 01-02 Task 1)
- [ ] `companion/src/main/__tests__/api-client.test.ts`: a route 500 reaches the companion as an error, FIX-02 (plan 01-02 Task 2)
- [ ] `app/api/addon/export-string/__tests__/route.test.ts`: fake rewritten with real table names and an allow-list for FIX-02 (plan 01-07 Task 1)
- [ ] `domain/expansion/__tests__/wowhead.test.ts` for FIX-03 (plan 01-03 Task 1)
- [ ] `lib/__tests__/discord-loot-announcements.test.ts` for FIX-03, mocking `@/lib/discord` discordFetch (plan 01-03 Task 1)
- [ ] `lib/__tests__/discord-raid-summary.test.ts` for FIX-03 (plan 01-03 Task 2)
- [ ] `utils/analytics/__tests__/master-loot-events.test.ts` for FIX-05 (plan 01-06 Task 1)
- [ ] `utils/analytics/__tests__/no-names-in-analytics.test.ts` scan for FIX-05 and Hard Constraint 3 (plan 01-08 Task 2)
- [ ] `utils/supabase/__tests__/typed-client-usage.test.ts` scan for FIX-06 (plan 01-05 Task 2)

Framework install: none (Vitest 4.1.0 already configured).

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Owner sign-off on the four replacement bot strings (colon titles, middle-dot separator, parenthesised review title) | FIX-03 | Hard Constraint 2: the owner signs off user-facing copy | Owner reviews "Copy pending owner sign-off" in 01-04-SUMMARY.md and approves or replaces each string before PR 4 merges |
| Owner confirms the three extra bot em dashes found during revision (feedback.js:324, help-review.js:94, help.js:129) join the Phase 7 deferral | FIX-03 | Not in the owner's decision-3 list | Owner confirms or asks for them to be fixed in plan 01-04 |
| A Forever item link opens the right Wowhead page (assumption A3) | FIX-03 | Live Wowhead fetches are forbidden in code and tests (Hard Constraint 5) | After deploy, open one `https://www.wowhead.com/forever/item=<id>` link from a Forever guild's Discord post |
| Owner awareness of PostHog dashboard impact; optional clearing of stored name and email values | FIX-05 | Lives in PostHog, outside the repo | Owner reads the plan 01-06 Task 2 human-check list and clears stored person and group values in PostHog if wanted |
| E-04 backstop: concurrent award writes converge to history-derived BLP | FIX-01 | Concurrency cannot be exercised against the fake client | Verifier reads `recompute_blp_for_item` and `recomputeBlpForItems`; human_needed if it cannot confirm |
| E-13 backstop: one master_loot_awarded per successful review | FIX-05 | No component test for the master-loot page | Verifier reads `handleReview`: a single call after the response.ok check |
| E-17 flagged assumption: the typed client's compile-time limits | FIX-06 | Unclassified edge probe, review manually | Human review of the plan 01-05 flagged assumption |
| Bot copy and link behaviour in a real Discord channel | FIX-03 | The bot is a separate Railway deploy | After PR 4 deploys, run /priority for a Forever guild item and check the link and title |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags (every command uses `vitest run`)
- [ ] Feedback latency < 10s (vitest part only; the type gate was not timed)
- [ ] `nyquist_compliant: true` set in frontmatter (set by validate-phase)

**Approval:** pending
