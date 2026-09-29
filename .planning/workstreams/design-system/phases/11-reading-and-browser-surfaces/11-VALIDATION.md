---
phase: 11
slug: reading-and-browser-surfaces
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-21
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.0 |
| **Config file** | `vitest.config.ts` (jsdom environment, globals enabled, `@/` alias, `./vitest.setup.ts` setup file) |
| **Quick run command** | `npx vitest run __tests__/<new-guard-file>.test.ts` |
| **Full suite command** | `npm test` (= `vitest run`) |
| **Estimated runtime** | Not benchmarked this session — full suite is ~1219 tests per `.planning/WINDOWS.md`'s last known-green count; new guard files are text-scan only, <1s each |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <new-guard-file>.test.ts`
- **After every plan wave:** Run `npm test` (full suite)
- **Before `/gsd-verify-work`:** `npm run lint && npm run typecheck && npm test && npm run build` must be green, plus the full-page before/after screenshot diff (both themes, 1440 + 390) named per the UI-SPEC's above-the-fold protocol
- **Max feedback latency:** Not benchmarked this session; individual guard tests are sub-second

---

## Per-Task Verification Map

Task IDs are not yet assigned (plans have not been created — this seeds the requirement-to-test contract; the planner should map its task IDs onto these rows).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | TYPE-04 | — | `.prose-measure` class exists in `app/globals.css` with `max-width: 70ch` | unit (text-scan guard) | `npx vitest run __tests__/prose-measure.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TYPE-04 | — | No `max-w-3xl mx-auto` / `max-w-4xl mx-auto` literal remains on the 12 named call sites (explicit file list, not a directory scan) | unit (absence guard) | `npx vitest run __tests__/prose-measure.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SURF-01 | — | `::selection` themed from `--accent` | unit (presence guard) | `npx vitest run __tests__/browser-surface-theming.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SURF-01 | — | `caret-color` set to `hsl(var(--accent))` on `html` | unit (presence guard) | `npx vitest run __tests__/browser-surface-theming.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SURF-01 | — | Universal scrollbar rule (`scrollbar-color`, `::-webkit-scrollbar*`) present, themed from `--border`/`--border-strong` | unit (presence guard) | `npx vitest run __tests__/browser-surface-theming.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SURF-02 | — | `[data-score]` selector removed from `app/globals.css`; `td, th,`/`.tabular-nums` siblings survive | unit (absence + sibling-survival guard) | `npx vitest run __tests__/data-score-absence.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SURF-02 (D-09 scope limit) | — | Existing 19-file `.tabular-nums` hand-applied usage unaffected | manual/visual | Screenshot gate — no dedicated automated test, per D-09's explicit scope limit | n/a | ⬜ pending |
| TBD | TBD | TBD | ROADMAP success criterion 4 | — | Screenshots in both themes of one public reading page + `master-sheet` show intended measure, no numeric-column jitter | manual/visual | `npm run visual:baseline -- --label phase-11-before` / `--label phase-11-after` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | ROADMAP success criterion 4 | — | `lint`, `typecheck`, `test` pass | automated | `npm run lint && npm run typecheck && npm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `__tests__/prose-measure.test.ts` — covers TYPE-04 (presence of `.prose-measure` + `max-width: 70ch`; absence of the old `max-w-3xl mx-auto`/`max-w-4xl mx-auto` literals across the explicit 12-file list — not a directory scan, see RESEARCH.md Pitfall 2)
- [ ] `__tests__/browser-surface-theming.test.ts` — covers SURF-01 (`::selection`, `caret-color`, universal scrollbar presence, all referencing `--accent`/`--border`/`--border-strong`)
- [ ] `__tests__/data-score-absence.test.ts` — covers SURF-02 (mirrors `background-inset-absence.test.ts`'s structure: absence of `[data-score]`, survival of `td, th,`/`.tabular-nums` siblings)
- [ ] `scripts/visual/baseline.mjs`'s `PAGES` array — needs 4 new entries (one blog post, research, compare, pricing, all `auth: false`, no `afterGoto`) before the required screenshot gate can capture the pages this phase's own risk note is about
- [ ] No framework install needed — Vitest, Puppeteer, and the guard-test scaffolding (`__tests__/design-tokens/source-files.ts`) already exist and are already in active use

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| No above-the-fold content shift on public pages | ROADMAP risk note / TYPE-04 | Whether the H1/intro paragraph wraps an extra line depends on each page's specific headline length at each viewport — not mechanically checkable without a visual diff | Screenshot the full page (not just the prose block) at 1440 and 390, both themes, before and after, for one blog post, research, compare, and pricing; name any element that crosses the fold |
| Existing `.tabular-nums` sites render without regression at zero/one/many numeric columns | SURF-02 (D-09 scope limit) | D-09 explicitly excludes a completeness audit of every numeric surface this phase | Screenshot `master-sheet` (or the `ItemCandidateModal`) in both themes and visually confirm no numeric column jitter |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < N/A (not benchmarked)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
