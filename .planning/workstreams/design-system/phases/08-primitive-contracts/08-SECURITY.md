---
phase: 08
slug: primitive-contracts
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-09-18
---

# Phase 08 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| none in scope (08-01, 08-03, 08-04, 08-05, 08-06) | Pure client-rendered presentational/token/component changes — label consolidation, focus-ring classes, skeleton fixes, planning-artifact writes | No untrusted input; no auth, session, access-control, or data-access surface touched |
| `components/ui/modal.tsx`'s focus-trap effect (08-02) | Client-side keyboard focus management inside an already-rendered dialog | Keyboard focus state only — no network or data boundary |
| the phase's six plans' claims to the phase's evidence (08-07) | 08-07's EVIDENCE.md turns 08-01..08-06's assertions into command output | Screenshot/contrast/count evidence, git history |
| Puppeteer process to local dev server (08-07) | After-baseline capture drives the same dev-only login flow as the before capture | Session cookies scoped to `localhost`/`127.0.0.1` only (origin-guarded) |
| committed PNGs and the evidence record to git history (08-07) | Baseline screenshots and 08-EVIDENCE.md are permanent | Home-only capture this run (D-16 fallback) — no authenticated-page PNGs committed |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-08-00 | N/A (no applicable STRIDE category) | planning-artifact write under `.planning/` (08-01) | low | accept | ASVS V2-V6 all N/A; no source change in this plan | closed |
| T-08-04 | N/A (WCAG 2.1.2 keyboard-trap risk, not a STRIDE category) | `components/ui/modal.tsx`'s focus-trap effect (08-02) | high | mitigate | `components/ui/__tests__/modal.test.tsx` — 7/7 tests pass, including the same-zIndex stacking regression test added post-review (commit `027129cd`) that proves Escape/Tab/focus-return target the correct (topmost/last-mounted) modal | closed |
| T-08-03 | N/A (no applicable STRIDE category) | `input.tsx`/`textarea.tsx`/`select.tsx` focus-visible ring classes (08-03) | low | accept | Pure CSS change; grep-verified class-string presence, contrast numbers committed in `report.ts` | closed |
| T-08-05a | N/A (no applicable STRIDE category) | `components/ui/skeletons.tsx`'s three fixed exports (08-04) | low | accept | Pure presentational loading-state markup; vitest render-count assertions | closed |
| T-08-05b | N/A (no applicable STRIDE category) | 29 `LabelText`→`Text` call-site swaps across 7 client components (08-05) | low | accept | Pure component-rename/prop-swap; `must_haves.prohibitions` + per-site text-preservation acceptance criteria guard against an accidental copy change | closed |
| T-08-06a | N/A (no applicable STRIDE category) | docs-page/Sidebar call-site swap, primitive deletion, label.tsx alias swap (08-06) | low | accept | Pure presentational component deletion and call-site swap | closed |
| T-08-06-GOV | N/A (copy-governance risk, not a STRIDE category) | `app/components/Sidebar.tsx`'s 4 hand-rolled label strings, OI-4 branch (b) (08-06) | medium | mitigate | `must_haves.prohibitions` gate required a recorded sign-off naming each string's before/after value before recasing; verified present in `08-DECISIONS.md`'s `## GO-AHEAD` section (approved by Alexander Mayes, 2026-09-17) and confirmed applied at all 4 sites by both code review and phase verification | closed |
| T-08-07-01 | Repudiation | Asymmetric before/after baseline comparison (08-07) | medium | mitigate | Task 1's verify step diffs the two directories' image name lists, compares manifest origin/count, requires differing `git_sha` | closed |
| T-08-07-02 | Repudiation | Hand-typed contrast/count number drifting from real values (08-07) | medium | mitigate | Every number in `08-EVIDENCE.md` is verbatim command output, re-run in Task 2's verify step | closed |
| T-08-07-03 | Information Disclosure | Committed PNGs of an authenticated dashboard (08-07) | medium | mitigate | Baseline script's origin guard hard-exits unless hostname is `localhost`/`127.0.0.1`; this run's capture was Home-only (D-16 fallback), no authenticated-page PNGs committed | closed |
| T-08-07-04 | Information Disclosure | The two public Supabase env vars needed to boot the dev server (08-07) | high | mitigate | Values stay in the developer's own shell; precondition asserted via read-only HTTP status check; nothing reads/prints `.env.local` | closed |
| T-08-07-05 | Repudiation | An out-of-scope finding declared acceptable without a recorded destination (08-07) | medium | mitigate | `## Carried forward` section in `08-EVIDENCE.md` names a destination for each of 6 findings (light-mode `--ring` shortfall → Phase 12; Sidebar OI-4 outcome confirmed resolved; deferred skeleton audit → unscheduled; baseline scope and the two Manual-Only Verifications → end-of-phase UAT, now both passed) | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

**Post-close-out addition (not in any PLAN.md's original register):** code review (`08-REVIEW.md`) found a CRITICAL correctness bug in `components/ui/modal.tsx`'s `getTopmostModalId()` — a strict `>` tie-break meant two modals sharing the same default `zIndex` had the FIRST-registered one win instead of the most-recently-mounted one, contradicting D-04. This is the concrete failure mode T-08-04's WCAG 2.1.2 keyboard-trap mitigation exists to prevent, and the original vitest test (which used distinct zIndexes) did not cover it. Fixed in commit `027129cd` (`>=` tie-break) with a new same-zIndex regression test verified to fail against the old code and pass against the fix. T-08-04's status above reflects the post-fix state.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-08-01 | T-08-00, T-08-03, T-08-05a, T-08-05b, T-08-06a | Pure presentational/styling/component-rename changes with zero auth, session, access-control, input-validation or cryptographic surface (ASVS V2-V6 all N/A per 08-RESEARCH.md's Security Domain section) | Alexander Mayes (phase 08-01 GO-AHEAD, 2026-09-17) | 2026-09-17 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-18 | 11 | 11 | 0 | orchestrator (register authored at plan time across 08-01..08-07; ASVS L1 short-circuit — no deeper auditor pass required) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-18
