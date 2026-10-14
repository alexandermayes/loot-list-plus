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
| **Quick run command** | `npx vitest run data/expansions app/services/__tests__ "app/(app)/overview/components/__tests__/SetupGuide.test.tsx"` |
| **Full suite command** | `npm run lint && npm run typecheck && npm run test` |
| **Estimated runtime** | ~10 seconds scoped; full suite baseline 573 tests in ~1.4 s plus lint and typecheck |

---

## Sampling Rate

- **After every task commit:** Run the task's scoped `npx vitest run <paths>` (all under 10 seconds)
- **After every plan wave:** Run `npx vitest run data app/services utils/supabase "app/(app)/overview" scripts` plus `npm run typecheck`
- **Before `/gsd-verify-work`:** Full suite must be green: `npm run lint && npm run typecheck && npm run test`
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD (filled from PLAN.md tasks at execution) | — | — | EXPN-01 | — | N/A | unit + component | `npx vitest run app/services/__tests__/expansionSeeder.test.ts data/expansions/__tests__/manifest-gate.test.ts "app/(app)/overview/components/__tests__/SetupGuide.test.tsx"` | ✅ seeder/SetupGuide exist (extend), ❌ W0 manifest-gate | ⬜ pending |
| TBD | — | — | EXPN-02 | — | N/A | unit + source scan | `npx vitest run app/services/__tests__/expansionSeeder.test.ts app/services/__tests__/expansionSeeder-registry.test.ts` | ❌ W0 registry scan | ⬜ pending |
| TBD | — | — | EXPN-03 | — | N/A | golden file snapshot | `npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts` | ❌ W0 (capture BEFORE refactor) | ⬜ pending |
| TBD | — | — | EXPN-04 | — | prototype-pollution guard on registry lookups | unit (real + mutated inputs) | `npx vitest run data/expansions/__tests__/manifest-gate.test.ts data/expansions/__tests__/forever-reference.test.ts app/services/__tests__/raid-phase-coverage.test.ts` | ❌ W0 / ✅ extend raid-phase-coverage | ⬜ pending |
| TBD | — | — | EXPN-05 | — | sync is insert-only; zero update/delete calls | unit (stateful fake) | `npx vitest run app/services/__tests__/expansionCatalogSync.test.ts scripts/lib/__tests__/forever-sync.test.ts` | ❌ W0 | ⬜ pending |
| TBD | — | — | EXPN-06 | — | no live network to wago.tools / Wowhead from runtime or tests | unit + source scan | `npx vitest run scripts/lib/__tests__/wago-snapshot.test.ts data/expansions/__tests__/forever-reference.test.ts data/expansions/__tests__/no-live-fetch.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `app/services/__tests__/expansionSeeder-golden.test.ts` plus `__golden__/*.rows.txt` (five files) captured from the UNMODIFIED seeder — covers EXPN-03; richer recording mock with deterministic ids
- [ ] `data/expansions/__tests__/manifest-gate.test.ts`, `forever-reference.test.ts`, `no-live-fetch.test.ts` — EXPN-04, EXPN-06
- [ ] `app/services/__tests__/expansionCatalogSync.test.ts` with a stateful in-memory fake for `raid_tiers` (select, insert, throwing update or delete) — EXPN-05
- [ ] `scripts/lib/__tests__/wago-snapshot.test.ts`, `scripts/lib/__tests__/forever-sync.test.ts` — EXPN-05, EXPN-06
- [ ] Update `expansionSeeder.test.ts` (Forever now seeds three tiers) and `raid-phase-coverage.test.ts` (slug via registry)
- [ ] Framework install: none. Dependencies: `npm install --save-exact zod@4.6.5` and `npm install --save-dev --save-exact csv-parse@7.0.2` (human-verify checkpoint first)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Staging Forever guild shows three raids with Unconfirmed badges in the setup guide | EXPN-01 | Visual copy check and owner sign-off on copy | Create a Forever guild on staging, open Overview, confirm raids, bosses, badges and lines match the signed-off copy |
| Admin sync dry-run output on the real database | EXPN-05 | Needs production data and owner eyeballing | Run the sync script in dry-run (default), confirm per-guild tier names and counts, then run with `--apply` once |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
