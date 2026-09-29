---
phase: 09
slug: type-and-card-migration
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-19
---

# Phase 09 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0, jsdom environment, `globals: true`, `@` alias to repo root |
| **Config file** | `vitest.config.ts` (no `maxWorkers` override) |
| **Quick run command** | `npx vitest run __tests__/arbitrary-text-sizes.test.ts __tests__/hand-rolled-cards.test.ts` |
| **Full suite command** | `npm run test` (= `vitest run`) — if unrelated failures appear, re-run with `npx vitest run --maxWorkers=2` (Phase 08 precedent for worker-pool exhaustion, not a regression) |
| **Estimated runtime** | ~30-60 seconds for the full suite (Phase 07/08 precedent) |

---

## Sampling Rate

- **After every task commit:** `npx vitest run __tests__/arbitrary-text-sizes.test.ts __tests__/hand-rolled-cards.test.ts` plus `npm run lint` and `npm run typecheck` (hard constraint: CI green on every commit in the phase, not only at the end).
- **After every plan wave:** `npm run test` (full suite).
- **Before `/gsd-verify-work`:** Full suite green, plus the D-17 before/after screenshot comparison across the fixed page set and the three heaviest card screens (`ExpansionManager`, `GuildSettingsContent`, `SettingsModal`).
- **Max feedback latency:** ~60 seconds (full suite runtime).

---

## Per-Task Verification Map

> Task IDs are assigned by the planner in PLAN.md; this table maps each requirement to its test obligation ahead of that so no task is planned without one. Reconcile Task ID / Plan / Wave columns against PLAN.md once written.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | 0 | TYPE-03 | — | N/A (styling only) | unit (guard/regex scan, ratchet) | `npx vitest run __tests__/arbitrary-text-sizes.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | PRIM-01 | — | N/A (styling only) | unit (guard/regex scan, ratchet) | `npx vitest run __tests__/hand-rolled-cards.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | 0 | PRIM-01 (nested variant, D-10/D-11) | — | `Card variant="nested"` renders only `border-t border-border`; base surface classes (background, border, radius) switched off | component test | `npx vitest run components/ui/__tests__/card.test.tsx` (new file; no existing `Card` component test found) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/arbitrary-text-sizes.test.ts` — new file, covers TYPE-03 (D-16); reuse `sourceFiles`/`matchesIn` from `__tests__/design-tokens/source-files.ts` verbatim; ratchet ceiling starting value set at Batch 1, lowered per batch, zero and ceiling removed at the final batch; rejects interpolated `text-[${...}px]` as `type-scale-floor.test.ts` already does.
- [ ] `__tests__/hand-rolled-cards.test.ts` — new file, covers PRIM-01 (D-16); same ratchet pattern; order-independent regex per D-08.
- [ ] `components/ui/__tests__/card.test.tsx` — new file (directory `components/ui/__tests__/` already exists per Phase 08); covers the `nested` variant's rendered output (D-10/D-11) — no existing `Card` component test found this session.
- [ ] `scripts/codemods/` — new directory (does not exist yet); houses `text-sizes.mjs` and `hand-rolled-cards.mjs` (D-15), both using already-installed dependencies (`typescript` is a confirmed existing dependency — no package-legitimacy audit needed).
- No test framework install needed — Vitest, `typescript`, and Puppeteer are already present.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Before/after visual comparison across the fixed page set plus the three heaviest card screens, both themes, 1440/390 widths | TYPE-03, PRIM-01 (Success Criterion 5) | Layout/spacing/density regressions from a mass mechanical sweep are not meaningfully assertable as unit tests; the phase treats this as a gate, not a courtesy (D-17) | Run `scripts/visual/baseline.mjs` before the first edit and after the last batch (user runs `npm run test:users:create` with the service-role key in their own shell first, per OI-6 precedent); side-by-side compare each pair against the written expected-change list (D-02, D-03, D-04's ~51 heading sites, D-06's radius deltas) — anything not on the list is a finding, not an assumption. |
| Cards-in-cards enumeration and conversion (D-12) | PRIM-01 | A DOM-ancestry check (JSX parent chain) for `Card` rendered directly inside another `Card` is not a regex-scannable guard; the resulting list and its before/after is presented at its own checkpoint | Review the DOM-ancestry check's output list at the nested-plan checkpoint against the three named screens (`ExpansionManager`, `GuildSettingsContent`, `SettingsModal`) plus any others found; confirm each converts cleanly to `variant="nested"`. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
