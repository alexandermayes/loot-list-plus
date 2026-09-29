---
phase: 12
slug: enforcement-and-documentation
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: false
wave_0_complete: true
created: 2026-09-22
reconciled: 2026-09-24
---

# Phase 12 — Validation Strategy

> Seeded by `/gsd-plan-phase` from `12-RESEARCH.md`, then **reconciled against what
> actually shipped** after execution, UAT and the security audit closed.
>
> The seeded version carried `pending` placeholders because task IDs did not exist yet.
> Those are replaced below with the real plans, files and commands.

**Why `nyquist_compliant: false` (PARTIAL, not a gap):** ENF-02's central proof — that the
hook no longer flags each sanctioned exception while both controls still fire — **cannot run
in CI**. `.gitignore:78` excludes `.claude/*`, so the impeccable tooling is not in the
repository; the probe harness fails loud when the skill is absent. That proof is therefore a
recorded local evidence run (`12-HOOK-PROBES-RED.json`, `12-HOOK-PROBES-GREEN.json`), not a
repeatable automated test. ENF-04 and ENF-05 are Blocked on the deploy and have no automated
verification by design. Everything that *can* be automated is, and is green.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^4.1.0 |
| **Config file** | `vitest.config.ts` — jsdom, globals enabled, `@/*` aliases |
| **Quick run command** | `npx vitest run <path> -x` |
| **Full suite command** | `npm test` |
| **Measured runtime** | ~30s at `--maxWorkers=2`; 83 files / 1396 tests |

Non-CI instruments this phase depends on (recorded evidence, never CI tests):

| Instrument | Command | Proves | Artifact |
|------------|---------|--------|----------|
| impeccable context | `node .claude/skills/impeccable/scripts/context.mjs` | ENF-01 criterion 1 — DESIGN.md is the design authority | recorded in `12-02-SUMMARY.md` |
| hook probe harness | `node scripts/design-system/exercise-hook.mjs` | ENF-02 / D-09 — per-exception discrimination, both tiers | `12-HOOK-PROBES-RED.json`, `12-HOOK-PROBES-GREEN.json` |
| rendered detector | `node scripts/design-system/local-detector-run.mjs` | ENF-05 **substance only**, labelled `local`, does NOT satisfy ENF-05 | `12-DETECTOR-LOCAL-FINAL.json` |

---

## Sampling Rate

- **After every task commit:** `npx vitest run <changed-test-file> -x`
- **After every plan wave:** `npm test`, `npm run lint`, `npm run typecheck`
- **Phase gate:** full suite green plus both probe transcripts and the labelled local detector JSON present — **all satisfied**
- **Measured feedback latency:** ~3s per guard file, ~30s full suite

---

## Per-Requirement Verification Map (reconciled)

| Requirement | Plan(s) | Automated verification | Tests | Status |
|-------------|---------|------------------------|-------|--------|
| ENF-01 | 12-02, 12-03 | `npx vitest run __tests__/design-tokens/design-md-parity.test.ts` | **22** | ✅ green |
| ENF-02 | 12-05, 12-06 | `npx vitest run __tests__/purple-gradient-guard.test.ts` (widened ratchet) | **3** | ✅ green |
| ENF-02 | 12-05, 12-06 | hook discrimination — **not automatable**, see note above | n/a | ✅ recorded evidence |
| ENF-03 | 12-04 | `npx vitest run __tests__/design-system-page-absence.test.ts` | **28** | ✅ green |
| ENF-04 | 12-07 | none — Blocked on deploy (WINDOWS 53) | n/a | ⛔ blocked |
| ENF-05 | 12-05, 12-07 | none — Blocked on deploy (WINDOWS 52); local run is substance-only | n/a | ⛔ blocked |

**53 tests added by this phase.** Sampling continuity holds: no three consecutive tasks ran
without an automated verify, because every plan that touched code shipped its guard in the
same commit range.

**Red-first discipline (D-04), observed and recorded per guard:**

| Guard | Red observations | Recorded in |
|-------|------------------|-------------|
| `design-md-parity.test.ts` (frontmatter layer) | 3 — DESIGN.md drift, `globals.css` drift (the G-11-1 direction), `tailwind.config.js` drift | `12-02-SUMMARY.md` |
| `design-md-parity.test.ts` (body layer) | 3 — dark `--border` drift, `text-15` size drift, swapped section headings | `12-03-SUMMARY.md` |
| `design-system-page-absence.test.ts` | 1 on the real stale `[data-score]` line, plus fail-loud missing-path | `12-04-SUMMARY.md` |
| `purple-gradient-guard.test.ts` (ratchet) | 2 — a count rising, and a count falling without its ceiling lowering | `12-06-SUMMARY.md` |

---

## Wave 0 Requirements — all complete

- [x] `__tests__/design-tokens/design-md-parity.test.ts` — created (22 tests), reuses `parseTokens` / `loadThemeTokens` / `hslToRgb` / `hexToRgb` from `contrast.ts`; `rgbToHex` and `parseTokenAlphas` added there rather than duplicated
- [x] `__tests__/design-system-page-absence.test.ts` — created (28 tests), same shape as `__tests__/data-score-absence.test.ts`
- [x] `scripts/design-system/exercise-hook.mjs` — created; distinct `session_id` per probe (19/19 verified distinct), PostToolUse **then** Stop per probe for deferred-tier rules
- [x] `__tests__/purple-gradient-guard.test.ts` — widened to all of `app/` minus landing, yellow added, converted to a two-sided pinned ratchet (3 tests)
- [x] Framework install: **none needed** — Vitest and Puppeteer 24.43.1 pre-existing; the phase added zero dependencies (verified: `package.json` / `package-lock.json` diffs empty)

---

## Manual-Only Verifications — resolved at UAT

All six closed 2026-09-24, `12-UAT.md` status `complete`, 6 passed / 0 issues.

| Behavior | Requirement | Outcome |
|----------|-------------|---------|
| `/design-system` visual walkthrough, 1440 + 390, light + dark | ENF-03 | ✅ pass |
| DESIGN.md prose accuracy | ENF-01 | ✅ pass |
| No stray contrast ratio outside the guarded table | ENF-01 | ✅ pass — widened grep confirmed only WCAG constants and labelled history |
| Walkthrough genuinely performed | ENF-03 | ✅ pass |
| Local-detector attribution correctness | ENF-05 | ✅ pass — independently recomputed: `/changelog` 70 `nested-cards`, `/pricing` 4 + `/research` 2 `low-contrast`, all 76 mis-bucketed under `/` by `pageKeyFor` (WINDOWS 55) |
| ROADMAP MVP / user-story framing | process | ✅ pass — fixed in `9cec95ed` |

---

## Validation Sign-Off

- [x] All shipped tasks have automated verify, or a recorded reason they cannot
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 complete
- [x] No watch-mode flags
- [x] Feedback latency ~30s full suite, well inside budget
- [x] ENF-01 parity guard observed red before accepted green (D-04) — 6 observations across two layers
- [x] D-09 hook transcript recorded per exception with a flagging control
- [x] D-03 detector evidence labelled `local` in the JSON, the evidence file and WINDOWS 52
- [ ] `nyquist_compliant: true` — **deliberately not set.** ENF-02's hook proof is not CI-automatable (tooling gitignored) and ENF-04/05 are deploy-blocked. PARTIAL is the accurate state.

**Approval:** validated 2026-09-24 (PARTIAL — see the compliance note above)
