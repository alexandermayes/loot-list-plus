---
phase: 08
slug: primitive-contracts
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-17
---

# Phase 08 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0, jsdom environment, @testing-library/react + user-event |
| **Config file** | `vitest.config.ts` (globals enabled, jsdom, `@/` alias, `vitest.setup.ts` for cleanup) |
| **Quick run command** | `npx vitest run <touched test file>` (e.g. `npx vitest run components/ui/__tests__/modal.test.tsx`) |
| **Full suite command** | `npm run test` (= `vitest run`) |
| **Estimated runtime** | ~30-60 seconds for the full suite (per Phase 07 precedent) |

---

## Sampling Rate

- **After every task commit:** Run the quick run command for whichever file that commit touches.
- **After every plan wave:** Run `npm run test` (full suite).
- **Before `/gsd-verify-work`:** Full suite green, plus the manual keyboard walk (PRIM-03) and a manual click-through of the three previously-title-less modals (`JoinGuildModal`, `OnboardingModal`, `UpgradeModal`).
- **Max feedback latency:** ~60 seconds (full suite runtime).

---

## Per-Task Verification Map

> Task IDs are assigned by the planner in PLAN.md; this table maps each requirement to its test obligation ahead of that so no task is planned without one. Reconcile Task ID / Plan / Wave columns against PLAN.md once written.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | TYPE-02 | — | N/A (styling only) | unit (source scan) | extend `__tests__/type-scale-floor.test.ts` (or sibling) with `matchesIn()` over `components/ui/label.tsx`, `components/ui/typography.tsx` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | PRIM-02 | — | N/A (styling only) | unit (source scan) + manual visual check | `matchesIn()` scan for `LabelText\|section-label` across `app/`, `components/` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | PRIM-03 | — | N/A (styling only) | unit (contrast) + manual keyboard walk | extend `__tests__/design-tokens/report.ts` `ROWS` with `--ring` vs `--background` / `--background-subtle`; keyboard `Tab` walk is manual-only | ❌ W0 (contrast row); manual walk always manual | ⬜ pending |
| TBD | TBD | 0 | PRIM-04 | — | Focus cannot escape the modal or be lost off-screen (WCAG 2.1.2); Escape always closes and returns focus | component test (RTL + userEvent) | `npx vitest run components/ui/__tests__/modal.test.tsx` (new file, new directory) | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | PRIM-05 | — | N/A (styling only) | unit (render-count assertion) | `npx vitest run components/ui/__tests__/skeletons.test.tsx` (new file) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `components/ui/__tests__/modal.test.tsx` — new file, new directory (`components/ui/__tests__/` does not exist yet); covers PRIM-04 (role="dialog", aria-modal, focus trap, focus return, Escape), following `app/(app)/raid-tracking/components/__tests__/SkipDayModal.test.tsx`'s RTL + userEvent pattern.
- [ ] Source-scan test for TYPE-02 / PRIM-02 — extend `__tests__/type-scale-floor.test.ts` or add a small sibling, using `matchesIn()` from `__tests__/design-tokens/source-files.ts` against explicit file paths (not `sourceFiles()`, which walks directories).
- [ ] `__tests__/design-tokens/report.ts`'s `ROWS` extended with a `{ label: 'focus ring', a: '--ring', b: '--background' }` row and a `--background-subtle` variant, covering PRIM-03's numeric claim.
- [ ] `components/ui/__tests__/skeletons.test.tsx` — new file; no existing skeleton test file was found in the repo. Covers PRIM-05's card/swatch counts.
- [ ] Framework install: none — Vitest, RTL, and `@testing-library/user-event` are already devDependencies.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Keyboard `Tab` walk reaches every control with a visible focus ring | PRIM-03 | A real keyboard `Tab` walk through a live form is not automatable in jsdom | Open one real form (e.g. loot submission or guild settings) in a browser, `Tab` through every control, confirm a visible ring on Input/Textarea/Select/Switch/Checkbox/Radio/Button/nav links in both light and dark mode. |
| Click-through of the three previously-title-less modals | PRIM-04, PRIM-05 D-05 | Confirms the added `ModalTitle` reads correctly (visible or `sr-only`) and that focus trap/return/Escape behave correctly in the real stacking context (e.g. `DashboardContent.tsx`'s stacked first-run modals) | Open `JoinGuildModal`, `OnboardingModal`, and `UpgradeModal` in the running app; confirm each has an accessible name, Escape closes it, and focus returns to the trigger. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
