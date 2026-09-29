---
phase: 07
slug: token-foundation
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-15
---

# Phase 07 Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Filled during planning; `status` and `nyquist_compliant` are set by `/gsd-validate-phase`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0, jsdom environment, globals enabled |
| **Config file** | `vitest.config.ts` (already present; no new test dependency is added by this phase) |
| **Quick run command** | `npx vitest run <file>` for a single suite |
| **Full suite command** | `npm run test` (which is `vitest run`, no watch) |
| **Estimated runtime** | Measure at execution. The existing suite runs inside the 15 minute CI budget alongside lint and typecheck; the four suites this phase touches are pure arithmetic and filesystem reads with no browser and no component render beyond one `StatusBadge` case. |

---

## Sampling Rate

- **After every task commit:** `npm run test`
- **After every plan wave:** `npm run lint && npm run typecheck && npm run test`, which is the exact CI job sequence in `.github/workflows/ci.yml` lines 40 to 42
- **Before `/gsd-verify-work`:** full suite green, plus both baseline directories committed
- **Max feedback latency:** one full `npm run test` run

ROADMAP hard constraint 3 makes this stricter than usual: every commit in the phase must be green on its own, so no guard may be added before the change that makes it pass. That is why the new test files land inside the plans that need them rather than in a separate wave 0.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | TYPE-01, COLOR-01, COLOR-02, COLOR-06 | T-07-04 | No environment value is recorded in the decision artifact | gate | `grep -cE '^OI-(1\|2\|3\|6) RESOLVED: ' 07-DECISIONS.md` is 4 and no line matches the anon-key assignment | created by the task | ⬜ pending |
| 07-01-02 | 01 | 1 | TYPE-01, COLOR-01, COLOR-02, COLOR-06 | T-07-SC, T-07-06 | Install approval is recorded before any install runs | gate | `grep -cE '^GO-AHEAD: approved ' 07-DECISIONS.md` is 1 and `git status --porcelain` for source paths is empty | created by the task | ⬜ pending |
| 07-02-01 | 02 | 2 | TYPE-01, COLOR-01, COLOR-02, COLOR-06 | T-07-SC | Exact version pin, download suppressed in the shared CI job | unit + CLI | `node -e` pin assertion, `grep -c 'PUPPETEER_SKIP_DOWNLOAD' .github/workflows/ci.yml`, then `npm run lint && npm run typecheck && npm run test` | ✅ existing config | ⬜ pending |
| 07-02-02 | 02 | 2 | TYPE-01, COLOR-01, COLOR-02, COLOR-06 | T-07-01, T-07-02 | Non-local origin refused, no secret logged | CLI | `node --check scripts/visual/baseline.mjs`, plus a non-local origin probe that must exit non-zero | created by the task | ⬜ pending |
| 07-02-03 | 02 | 2 | TYPE-01, COLOR-01, COLOR-02, COLOR-06 | T-07-02, T-07-04 | Capture came from a local origin, no Supabase name in the artifacts | CLI | manifest assertion on `origin_hostname` and image count, plus `grep -rl 'NEXT_PUBLIC_SUPABASE' baselines/` printing nothing | created by the task | ⬜ pending |
| 07-03-01 | 03 | 3 | TYPE-01 | T-07-05, T-07-07 | Class-only diff on every touched line | unit | `npx vitest run __tests__/type-scale-floor.test.ts` | created by the task | ⬜ pending |
| 07-03-02 | 03 | 3 | TYPE-01 | T-07-07, T-07-08, T-07-09 | No visible string changed, Phase 08 and 09 files untouched | unit + CLI | `grep -rE 'text-\[(9\|10)px\]' app components \| wc -l` is 0, then `npx vitest run __tests__/type-scale-floor.test.ts` | ✅ from 07-03-01 | ⬜ pending |
| 07-04-01 | 04 | 4 | COLOR-01 | T-07-13 | Contrast read from source tokens, never from a browser | unit | `npx vitest run __tests__/token-contrast.test.ts` | created by the task | ⬜ pending |
| 07-04-02 | 04 | 4 | COLOR-01 | T-07-10 | Sibling text utilities keep resolving; no call site migrated | unit + CLI | `npx vitest run __tests__/token-contrast.test.ts`, plus the compiled-CSS probe greps | ✅ from 07-04-01 | ⬜ pending |
| 07-04-03 | 04 | 4 | COLOR-02 | T-07-11, T-07-12 | Page and sidebar pinned; lift consequences measured not absorbed | unit | `npx vitest run __tests__/token-contrast.test.ts` and `npx tsx __tests__/design-tokens/report.ts` | ✅ from 07-04-01 | ⬜ pending |
| 07-05-01 | 05 | 5 | COLOR-06 | T-07-14 | Standby hue distinct from accent and warning; non-regression on the replaced literal | unit | `npx vitest run __tests__/token-contrast.test.ts` | ✅ from 07-04-01 | ⬜ pending |
| 07-05-02 | 05 | 5 | COLOR-06 | T-07-15, T-07-05 | All eleven labels byte-identical; palette class absent | unit | `npx vitest run __tests__/token-palette-literals.test.ts` | created by the task | ⬜ pending |
| 07-05-03 | 05 | 5 | COLOR-06 | T-07-14, T-07-16, T-07-17 | Five states stay five colours; sanctioned rails preserved | unit | `npx vitest run __tests__/token-palette-literals.test.ts "app/(app)/raid-tracking/components/__tests__/cell-state.test.ts"` | ✅ existing plus 07-05-02 | ⬜ pending |
| 07-06-01 | 06 | 6 | TYPE-01, COLOR-01, COLOR-02, COLOR-06 | T-07-18, T-07-02 | Symmetric comparison, local origin, later commit | CLI | `diff` of the two directories' image lists plus the two-manifest assertion | created by the task | ⬜ pending |
| 07-06-02 | 06 | 6 | TYPE-01, COLOR-01, COLOR-02, COLOR-06 | T-07-19, T-07-20 | Every number generated, every finding routed | CLI | section-presence check on `07-EVIDENCE.md` plus re-running `npx tsx __tests__/design-tokens/report.ts` | created by the task | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No separate wave 0. The four guards this phase needs are created inside the plans that need them, in the same commit as the change each one proves, because ROADMAP hard constraint 3 forbids a red intermediate commit and a guard added early would be red until its change lands.

- [ ] `__tests__/design-tokens/source-files.ts`: the recursive source walker and line-accurate matcher (created in 07-03-01, reused by 07-05-02)
- [ ] `__tests__/type-scale-floor.test.ts`: TYPE-01, both halves (created in 07-03-01, widened in 07-03-02)
- [ ] `__tests__/design-tokens/contrast.ts`: the single WCAG implementation and the `globals.css` theme-block parser (created in 07-04-01, reused by 07-05-01)
- [ ] `__tests__/design-tokens/report.ts`: the fixed-order contrast report used by every commit body and by `07-EVIDENCE.md` (created in 07-04-01)
- [ ] `__tests__/token-contrast.test.ts`: COLOR-01 and COLOR-02 (created in 07-04-01, extended in 07-04-02, 07-04-03 and 07-05-01)
- [ ] `__tests__/token-palette-literals.test.ts`: COLOR-06 (created in 07-05-02, widened in 07-05-03)
- [ ] Update `app/(app)/raid-tracking/components/__tests__/cell-state.test.ts`: the standby expectation plus a five-distinct-borders assertion (07-05-03)
- [ ] Framework install: none needed. Vitest is already configured; the only new package in the phase is `puppeteer`, which the baseline script uses outside vitest.

Every guard is proven non-vacuous by its own task: each one temporarily reverts the value it just set, confirms the suite goes red, and restores it. A guard that has never been observed failing is not evidence.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The 11px raise did not clip, wrap or cramp anything on chip-heavy screens, and no visible string changed | TYPE-01 | The tests prove the absence of sub-11px classes, not that the result reads well. Density is a judgement, and D-03 defers per-screen tuning. | `<verify><human-check>` on task 07-03-02: compare the sidebar, the master-sheet boss sections and the member manager against the pre-phase-07 baseline at 1440 and 390 in both themes. |
| A card reads as a card, its border is visible, a hovered row is visible and lighter than the card, an unchecked switch track is visible, and the page is as deep as it was | COLOR-02 | Ratios prove the arithmetic clears the floor; they cannot tell you the result looks washed out. | `<verify><human-check>` on task 07-04-03: card-dense screens in dark mode at 1440 and 390, then light mode. |
| Standby still reads as its own state, distinguishable from late and from accent | COLOR-06 | Hue 38 versus hue 45 versus hue 30 is a legibility judgement about a colour that records an officer's decision. | `<verify><human-check>` on task 07-05-03: the raid-tracking cell rail, legend swatch and member pill in both themes. |
| The whole phase's appearance change, before against after | all four | ROADMAP success criterion 5 and D-14. This is the phase gate; nothing else can answer it. | `<verify><human-check>` on task 07-06-01: step through every before and after pair at 1440 and 390 in both themes. |

---

## Validation Sign-Off

- [x] All tasks have an `<automated>` verify; no task carries a MISSING reference
- [x] Sampling continuity: no 3 consecutive tasks without an automated verify
- [x] Wave 0 covered inside the plans that need it, for the green-per-commit reason recorded above
- [x] No watch-mode flags anywhere
- [ ] Feedback latency measured at execution
- [ ] `nyquist_compliant: true` set by `/gsd-validate-phase`

**Approval:** pending
