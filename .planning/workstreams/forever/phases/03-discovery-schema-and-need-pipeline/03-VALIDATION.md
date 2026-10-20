---
phase: 3
slug: discovery-schema-and-need-pipeline
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-19
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.x (globals on, jsdom default; `// @vitest-environment node` for routes, migrations and PGlite) |
| **Config file** | `vitest.config.ts` (setup `./vitest.setup.ts`) |
| **Quick run command** | `npx vitest run <touched test paths>` |
| **Full suite command** | `npm test && npm run typecheck && npm run lint` |
| **Golden gate** | `CI=true npx vitest run app/services/__tests__/expansionSeeder-golden.test.ts domain/scoring` |
| **Estimated runtime** | ~30 seconds per touched-file set (PGlite file about 15 s) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run` on the test files the task touched
- **After every plan wave:** Run the full suite command plus the golden gate
- **Before `/gsd-verify-work`:** Full suite and golden gate must be green; migration PR merged and its deploy workflow recorded as success before the code PR opens
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (filled by planner from 03-RESEARCH.md "Phase Requirements -> Test Map") | | | DISC-01, DISC-06, DISC-07, DISC-12 | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `app/services/__tests__/helpers/pglite-chain.ts` and `app/services/__tests__/discovery-schema-pglite.test.ts` (DISC-12, DISC-07; needs `@electric-sql/pglite@0.5.8` exact devDependency, D-20)
- [ ] `app/services/__tests__/discovery-schema-migration.test.ts` (DISC-12 contract test)
- [ ] `domain/loot/needs.ts`, `domain/loot/__tests__/needs.test.ts`, `domain/loot/__fixtures__/need-keys.json` (DISC-06, D-12)
- [ ] `domain/loot/list-mode.ts` and `domain/loot/__tests__/list-mode.test.ts` (DISC-01, D-03)
- [ ] `lib/loot/__tests__/need-reader-inventory.test.ts` (DISC-06, D-16)
- [ ] `app/api/raid-tiers/__tests__/route.test.ts` (DISC-01, D-04, D-17)
- [ ] `app/components/__tests__/NeedLabel.test.tsx` (DISC-06, D-13)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Migration is live in production before any reader code merges | DISC-12 | Deploy happens on merge; needs the deploy workflow run | After the migration-only PR merges with `--admin`, confirm the migration deploy workflow run succeeded with `gh run list` before opening the code PR |
| Forever backfill applied in production | DISC-01 | Owner-run against production credentials | Owner runs `npm run sync:forever` dry run, reviews the counts, then `npm run sync:forever -- --apply` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
