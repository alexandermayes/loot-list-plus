---
phase: 4
slug: verified-guild-case-study
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-05
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.0 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run <changed test files>` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <changed test files>`
- **After every plan wave:** Run `npm test` plus `npm run typecheck`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (filled by planner) | — | — | EVID-04 | — | — | unit/component | — | ❌ W0 | ⬜ pending |
| (filled by planner) | — | — | EVID-05 | — | — | manual (blocked on interview) | — | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Component/unit test stubs for the case-study template (EVID-04) in the pattern of existing `__tests__` directories
- [ ] Fixture data module test covering the typed case-study data shape (no real guild data — placeholder fixture only)

*Existing vitest + @testing-library/react infrastructure covers the framework needs; no install required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Published case study uses only interview-approved quotes/numbers/identifying details | EVID-05 | Content approval is a human/legal act; blocked on user interview + written approval | Compare published page content against the approved interview record before publish |
| Page verification display (public profile link or verified-customer note) matches what the guild permitted | EVID-05 | Permission (interview question ten) is user-held knowledge | Confirm question-ten answer before choosing link vs note |
| Rendered template visual review (H1, proof strip, before/after narrative, limitation section) | EVID-04 | Visual/UX judgment | Render template with fixture data; user reviews |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
