---
phase: 2
slug: expansion-onboarding-manifest
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-13
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Workstream: `forever`. Source: `02-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 (`globals: true`, jsdom default; scan and golden tests use `// @vitest-environment node`) |
| **Config file** | `vitest.config.ts`, `vitest.setup.ts` (no change needed) |
| **Quick run command** | `npx vitest run data/expansions app/services/__tests__ "app/(app)/overview/components/__tests__/SetupGuide.test.tsx" utils/__tests__/raidIcons.test.ts` |
| **Full suite command** | `npm run lint && npm run typecheck && npm run test` |
| **Estimated runtime** | ~10 seconds scoped; full suite baseline 573 tests in ~1.4 s plus lint and typecheck |

---

## Sampling Rate

- **After every task commit:** Run the task's scoped `npx vitest run <paths>` (all under 10 seconds)
- **After every plan wave:** Run `npx vitest run data app/services app/api/reserve-runs utils "app/(app)/overview" scripts` plus `npm run typecheck`
- **Before `/gsd-verify-work`:** Full suite must be green: `npm run lint && npm run typecheck && npm run test`
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

Filled from the final eleven plans on 2026-10-14 (plan check revision). Task ID is `<plan>-T<n>`. Commands are each task's `<automated>` verify (typecheck and lint steps omitted for width). `nyquist_compliant` stays false and `status` stays draft until the executor confirms the map against the built tests.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-T1 | 02-01 | 1 | EXPN-03 | T-02-01-01 | Captured only from the unmodified seeder; CI mode never writes | golden file snapshot (Classic) | `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts` | ❌ W0 (capture BEFORE refactor) | ⬜ pending |
| 02-01-T2 | 02-01 | 1 | EXPN-03 | T-02-01-02 | No re-baseline after capture | golden file snapshot (four more) plus determinism | `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts` | ❌ W0 | ⬜ pending |
| 02-02-T1 | 02-02 | 1 | EXPN-06 (dependency) | T-02-SC | Blocking-human legitimacy check before any install | manual checkpoint (exempt) | none: owner replies "approved" or exact versions | n/a | ⬜ pending |
| 02-02-T2 | 02-02 | 1 | EXPN-01, EXPN-04 | T-02-02-01, T-02-02-02 | Strict schema; schema module kept out of the client barrel | unit (independent transcription, mutated copies) | `npx vitest run data/expansions/__tests__/manifest-gate.test.ts` | ❌ W0 | ⬜ pending |
| 02-03-T1 | 02-03 | 2 | EXPN-01, EXPN-05 | T-02-03-01, T-02-03-03 | Insert-only sync; Forever only | unit plus golden | `CI=true npx vitest run app/services/__tests__/expansionSeeder.test.ts app/services/__tests__/expansionSeeder-golden.test.ts app/services/__tests__/raid-phase-coverage.test.ts` | ✅ extend seeder test | ⬜ pending |
| 02-03-T2 | 02-03 | 2 | EXPN-05 | T-02-03-01, T-02-03-02, T-02-03-06 | Zero update, delete or upsert on a stateful fake | unit (stateful fake) | `npx vitest run app/services/__tests__/expansionCatalogSync.test.ts data/expansions/__tests__/forever-lookup.test.ts app/services/__tests__/expansionSeeder.test.ts` | ❌ W0 | ⬜ pending |
| 02-04-T1 | 02-04 | 3 | EXPN-02, EXPN-03 | T-02-04-01, T-02-04-02, T-02-04-03 | Own-property guard; golden files unchanged | golden plus unit | `CI=true npx vitest run app/services app/api/guilds app/api/expansions data/expansions` | ✅ golden from 02-01 | ⬜ pending |
| 02-04-T2 | 02-04 | 3 | EXPN-02 (D-05) | none | N/A | unit (registry slug, Forever mutated copy) | `CI=true npx vitest run app/services/__tests__/raid-phase-coverage.test.ts app/services/__tests__/expansionSeeder-golden.test.ts` | ✅ extend | ⬜ pending |
| 02-05-T1 | 02-05 | 4 | EXPN-02 | T-02-05-01, T-02-05-02, T-02-05-03 | Prototype-pollution guard; client-safe files; chain-free seeder | unit plus source scan | `npx vitest run app/services/__tests__/expansionSeeder-registry.test.ts && CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts` | ❌ W0 | ⬜ pending |
| 02-05-T2 | 02-05 | 4 | EXPN-02 | T-02-05-04 | Forever 400 with no service-role client | route unit | `npx vitest run app/api/reserve-runs/raid-tiers` | ❌ W0 | ⬜ pending |
| 02-06-T1 | 02-06 | 4 | EXPN-04 | T-02-06-01 | Real registry passes; duplicated native id fails | unit (real plus mutated inputs) | `npx vitest run data/expansions/__tests__/manifest-gate.test.ts app/services/__tests__/raid-phase-coverage.test.ts` | ✅ extend (02-02) | ⬜ pending |
| 02-06-T2 | 02-06 | 4 | EXPN-04 | T-02-06-02, T-02-06-03, T-02-06-04 | Ratcheted legacy fixture; frozen shipped names; dates in data only | unit plus source scan | `npx vitest run data/expansions/__tests__/manifest-gate.test.ts` | ✅ extend | ⬜ pending |
| 02-07-T1 | 02-07 | 2 | EXPN-06 | T-02-07-01, T-02-07-02 | Strict snapshot schema; canonical hash excludes fetchedAt | unit | `npx vitest run data/expansions/__tests__/forever-reference.test.ts` | ❌ W0 | ⬜ pending |
| 02-07-T2 | 02-07 | 2 | EXPN-01, EXPN-06 | T-02-07-03, T-02-07-04 | Shrink-only allowlist; forced promotion | unit | `npx vitest run data/expansions/__tests__/forever-reference.test.ts` | ✅ extend (T1) | ⬜ pending |
| 02-08-T1 | 02-08 | 3 | EXPN-06 | T-02-08-01, T-02-08-03 | Injected fetch only; global fetch stubbed and unused; validate before write | unit plus CLI help run | `npx vitest run scripts/lib/__tests__/wago-snapshot.test.ts data/expansions/__tests__/forever-reference.test.ts && npx tsx scripts/expansions/snapshot-reference.ts --help` | ❌ W0 | ⬜ pending |
| 02-08-T2 | 02-08 | 3 | EXPN-06 | T-02-08-02, T-02-08-04, T-02-08-06 | Outage set (403 after User-Agent retry, 429, 5xx, network, timeout) exits 0; 404, header, build and schema failures exit 1 | unit (injected fetch and sleep) | `npx vitest run scripts/lib/__tests__/wago-snapshot.test.ts && npx tsx scripts/expansions/snapshot-reference.ts --help` | ✅ extend (T1) | ⬜ pending |
| 02-09-T1 | 02-09 | 4 | EXPN-06 | T-02-09-04 | No live network to wago or Wowhead from runtime or tests | source scan (700-file floor, self-checks) | `npx vitest run data/expansions/__tests__/no-live-fetch.test.ts` | ❌ W0 | ⬜ pending |
| 02-09-T2 | 02-09 | 4 | EXPN-06 | T-02-09-01, T-02-09-03 | Least-privilege token; outage stays green; never a required check | plain-text workflow check (no YAML parser) plus manual first dispatch | comment-stripped `grep` chain over `.github/workflows/refresh-wago-snapshot.yml` and `refresh-item-data.yml` (exact command in 02-09 Task 2 `<verify>`) | ❌ W0 | ⬜ pending |
| 02-10-T1 | 02-10 | 3 | EXPN-05 | T-02-10-01, T-02-10-02 | Dry run by default; ids and counts only | unit plus CLI help run | `npx vitest run scripts/lib/__tests__/forever-sync.test.ts && npm run sync:forever -- --help` | ❌ W0 | ⬜ pending |
| 02-10-T2 | 02-10 | 3 | EXPN-05 | T-02-10-03, T-02-10-04, T-02-10-05 | Insert-only apply; duplicates reported, never deleted; no request-path sync | unit (stateful fake) plus source scan | `npx vitest run scripts/lib/__tests__/forever-sync.test.ts app/services/__tests__/expansionCatalogSync.test.ts` | ✅ extend (T1) | ⬜ pending |
| 02-11-T1 | 02-11 | 3 | EXPN-01 | T-02-11-01, T-02-11-02 | React-escaped manifest strings; Unconfirmed carried by text | component | `npx vitest run "app/(app)/overview/components/__tests__/SetupGuide.test.tsx"` | ✅ extend | ⬜ pending |
| 02-11-T2 | 02-11 | 3 | EXPN-01 | T-02-11-03, T-02-11-04, T-02-11-05 | Visibility gating; copy held for sign-off; importer scan | component plus source scan | `npx vitest run "app/(app)/overview/components/__tests__/SetupGuide.test.tsx" app/services/__tests__/expansionCatalogSync.test.ts` | ✅ extend | ⬜ pending |
| 02-11-T3 | 02-11 | 3 | EXPN-01 (D-04) | T-02-11-06 | Forever icon path never reads the name map | unit plus source scan (call-site inventory) | `npx vitest run utils/__tests__/raidIcons.test.ts "app/(app)/overview" "app/(app)/reserve" "app/(app)/master-sheet" "app/(app)/loot-submissions"` | ❌ W0 | ⬜ pending |

Sampling continuity: 23 tasks; only 02-02-T1 (the blocking-human checkpoint) has no automated command, and its neighbours 02-01-T2 and 02-02-T2 both do, so no three consecutive tasks lack automated verify.

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `app/services/__tests__/expansionSeeder-golden.test.ts` plus `__golden__/*.rows.txt` (five files) captured from the UNMODIFIED seeder — covers EXPN-03; richer recording mock with deterministic ids (plan 02-01)
- [ ] `data/expansions/__tests__/manifest-gate.test.ts` (02-02, extended 02-06), `forever-reference.test.ts` (02-07), `no-live-fetch.test.ts` (02-09) — EXPN-04, EXPN-06
- [ ] `app/services/__tests__/expansionCatalogSync.test.ts` with a stateful in-memory fake for `raid_tiers` (select, insert, throwing update or delete) — EXPN-05 (02-03)
- [ ] `app/services/__tests__/expansionSeeder-registry.test.ts` and `app/api/reserve-runs/raid-tiers/__tests__/route.test.ts` — EXPN-02 (02-05)
- [ ] `scripts/lib/__tests__/wago-snapshot.test.ts` (02-08), `scripts/lib/__tests__/forever-sync.test.ts` (02-10) — EXPN-05, EXPN-06
- [ ] `utils/__tests__/raidIcons.test.ts` — D-04 expansion-scoped raid icons and call-site inventory (02-11)
- [ ] Update `expansionSeeder.test.ts` (Forever now seeds three tiers, 02-03) and `raid-phase-coverage.test.ts` (slug via registry, 02-04)
- [ ] Framework install: none. Dependencies: `npm install --save-exact zod@4.6.5` and `npm install --save-dev --save-exact csv-parse@7.0.2` (human-verify checkpoint first, 02-02)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Staging Forever guild shows three raids with Unconfirmed badges in the setup guide, and Forever tiers show the neutral raid icon (not Classic Onyxia or TBC Archimonde art) on the overview, loot list and master sheet | EXPN-01, D-04 | Visual copy check and owner sign-off on copy (02-11) | Create a Forever guild on staging, open Overview, confirm raids, bosses, badges and lines match the signed-off copy; open the loot list and master sheet and confirm the Forever tier icons are neutral |
| Admin sync dry-run output on the real database | EXPN-05 | Needs production data and owner eyeballing (02-10) | Run the sync script in dry-run (default), confirm per-guild tier names and counts, then run with `--apply` once |
| First `workflow_dispatch` run of "Refresh wago snapshot" after PR 5 merges | EXPN-06 (SC5) | Needs the default-branch workflow and live wago; SC5 is conditionally met until it succeeds (02-07, 02-09 verifier notes) | Run the workflow once from the Actions tab; expect a green run with either an outage notice (no PR) or a PR from `chore/refresh-wago-snapshot` carrying the GITHUB_TOKEN note and the promotable list |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
