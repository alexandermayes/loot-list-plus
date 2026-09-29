---
phase: 07
slug: token-foundation
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-09-16
---

# Phase 07 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

Register origin: authored at plan time. All six PLAN.md files (07-01 through 07-06) carry a `<threat_model>` block; no SUMMARY.md carries a `## Threat Flags` section (no new threats surfaced during execution). Verification depth: L1 (grep-level, ASVS level 1) run by the orchestrator per the secure-phase short-circuit rule; no auditor subagent was spawned.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Developer shell ↔ agent | The two `NEXT_PUBLIC_SUPABASE_*` vars needed to boot the dev server for the baseline capture (D-16, OI-6) | Public Supabase project URL and publishable anon key (low sensitivity, but never to be recorded in planning artifacts) |
| npm registry ↔ repository | `puppeteer@24.43.1` devDependency and its postinstall Chromium download | Third-party code executed on developer machines and (if unguarded) in CI |
| Local dev server ↔ baseline script | `scripts/visual/baseline.mjs` renders pages and writes PNGs plus `manifest.json` into `.planning/` | Screenshots of a seeded dev test-user session; must never come from production |
| Repository ↔ CI | Three guard tests enforce the token floors on every pull request | Token values, class strings; no secrets |
| Planning artifacts ↔ decisions | Confirm-before-change gate recorded as `GO-AHEAD` in 07-DECISIONS.md | Approver identity and date only |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-07-SC | Tampering | `npm install puppeteer@24.43.1` and its postinstall Chromium download | high | mitigate | `package.json:89` pins `"puppeteer": "24.43.1"` with no range operator; `.github/workflows/ci.yml:26` sets `PUPPETEER_SKIP_DOWNLOAD: 1`; `07-DECISIONS.md:67` records `PUPPETEER-24.43.1: approved` before Plan 02 installed | closed |
| T-07-04 | Information Disclosure | `.env.local` and the two public Supabase variables (D-16, OI-6) | high | mitigate | Grep of 07-DECISIONS.md and both baseline directories for `NEXT_PUBLIC_SUPABASE` returns no recorded value; `baseline.mjs` reads only `BASE_URL` and asserts the precondition by HTTP status. Deviation recorded in STATE.md: the orchestrator wrote the current publishable key to gitignored `.env.local` once to clear an auth-redirect loop, with no value read, printed or committed | closed |
| T-07-11 | Tampering | The dark card lift pushing other text tokens below the contrast floor | high | mitigate | `__tests__/token-contrast.test.ts` asserts the muted floor against the lifted card value; the three tokens that cross 4.5 (`--destructive`, `--error`, `--horde`, 4.910 → 4.360) are surfaced as OI-3 and carried forward in 07-EVIDENCE.md rather than absorbed | closed |
| T-07-15 | Tampering | A user-facing label changed while editing a class string on the same line | high | mitigate | 07-05-SUMMARY records the eleven badge labels counted by exact string and a diff with no `label:` or `Standby` text line; `token-palette-literals.test.ts:111-119` asserts `Pending` renders with unchanged text | closed |
| T-07-01 | Information Disclosure | `scripts/visual/baseline.mjs` logging and `manifest.json` | medium | mitigate | `baseline.mjs:265,291` log only file names and counts; `baseline.mjs:285` writes `origin_hostname` not the full origin; baseline tree grep for `NEXT_PUBLIC_SUPABASE` returns zero matches | closed |
| T-07-02 | Information Disclosure | Committed PNGs of an authenticated dashboard | medium | mitigate | `baseline.mjs:66-68` hard-exits unless hostname is `localhost` or `127.0.0.1`; both baseline sets are Home-only (public page) because the authenticated Overview capture was skipped under the D-16 fallback, so no authenticated PNG was committed | closed |
| T-07-05 | Tampering | A future regression silently lowering a floor (type scale, contrast, palette literal) | medium | mitigate | `__tests__/type-scale-floor.test.ts`, `__tests__/token-contrast.test.ts` and `__tests__/token-palette-literals.test.ts` exist and pass (51/51 on 2026-09-16); each SUMMARY records a temporary-revert non-vacuity proof; all run in the Node 20 CI test job | closed |
| T-07-06 | Repudiation | The confirm-before-change constraint | medium | mitigate | `07-DECISIONS.md:66` holds `GO-AHEAD: approved 2026-09-16 by Alexander Mayes` as an on-disk artifact; Plans 02 through 06 assert it as a precondition | closed |
| T-07-07 | Tampering | The bulk `perl -pi` substitution across 25 files | medium | mitigate | `grep -rE "text-\[(9\|10)px\]" app components` returns 0; 07-03-SUMMARY records the class-only diff check (84/13/25 → 0/0/0) | closed |
| T-07-10 | Tampering | `theme.extend.textColor.accent` override dropping sibling utilities | medium | mitigate | `tailwind.config.js:164-167` carries `DEFAULT`, `foreground` and `subtle` as an object; 07-04-SUMMARY records the 305/9 site re-count | closed |
| T-07-12 | Tampering | Accidental lift of the dark page or sidebar background | medium | mitigate | `app/globals.css:220-221` still pin `--background: 230 18% 3%` and `--background-subtle: 225 15% 5%`; structural assertions in `token-contrast.test.ts` | closed |
| T-07-14 | Tampering | Two statuses becoming visually indistinguishable on neighbouring ambers | medium | mitigate | `token-palette-literals.test.ts:111-118` asserts `pending` and `needs_revision` render different class strings; UAT test 2 (2026-09-16) confirmed a benched raider is not mistakable for a late one | closed |
| T-07-18 | Repudiation | Asymmetric before-and-after comparison | medium | mitigate | Image name lists of the pre and post baseline directories are identical (4 PNGs each); manifest `git_sha` differs (`010babb3` vs `073c87fe`); the Overview skip is symmetric | closed |
| T-07-19 | Repudiation | Hand-typed contrast numbers drifting from real token values | medium | mitigate | 07-EVIDENCE.md states every number is verbatim output of the committed report script, re-run in the 07-06 verify step; `__tests__/design-tokens/contrast.ts` parses `app/globals.css` directly | closed |
| T-07-20 | Repudiation | Out-of-scope finding declared acceptable at phase close | medium | mitigate | 07-EVIDENCE.md `## Carried forward` lists seven numbered findings, each with measured values and a named destination (Phase 09, 10, 12, milestone B or C) | closed |
| T-07-03 | Elevation of Privilege | Dev-only routes `/dev-login` and `/api/dev/test-users` | low | accept | `app/dev-login/page.tsx:13` and `app/api/dev/test-users/route.ts:6` gate on `NODE_ENV === 'development'`; phase added no route and changed no guard. See Accepted Risks AR-07-01 | closed |
| T-07-05a | Tampering | Unapproved scope creep into token families the user did not authorise (07-01 variant) | low | accept | Plan set enumerates every token and file; OI-3 surfaced as a decision; one-family-per-commit (D-12). See AR-07-02 | closed |
| T-07-08 | Tampering | Scope creep into Phase 08/09 files | low | mitigate | `git diff` from the first phase-07 commit to HEAD shows `components/ui/label.tsx` and `components/ui/typography.tsx` unchanged; `.section-label` still present in `app/globals.css` | closed |
| T-07-09 | Information Disclosure | Public marketing pages in the 11px sweep | low | accept | Only a size class changed on those lines; class-only diff check covers them. See AR-07-03 | closed |
| T-07-13 | Information Disclosure | Contrast helper reading files from disk inside a test | low | accept | `__tests__/design-tokens/contrast.ts:76-80` reads exactly `app/globals.css` from `process.cwd()`, throws naming that path when absent; no network, no env access, no write. See AR-07-04 | closed |
| T-07-16 | Tampering | Removing the sanctioned two-pixel coloured rails | low | mitigate | `app/(app)/raid-tracking/components/cell-state.ts` contains 5 `border-l-2` occurrences | closed |
| T-07-17 | Tampering | Scope creep into sanctioned item-quality, class and brand colours | low | mitigate | `token-palette-literals.test.ts:89-93` scans an explicit five-file list; sanctioned exceptions named as Phase 10 COLOR-05 work | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-07-01 | T-07-03 | Dev-only routes already refuse to serve outside `NODE_ENV === 'development'`; this phase adds no route and changes neither guard | Alexander Mayes (GO-AHEAD, 07-DECISIONS.md) | 2026-09-16 |
| AR-07-02 | T-07-05a | Residual risk of a reviewer missing an extra diff line is kept small by one-token-family-per-commit (D-12) and the enumerated plan scope | Alexander Mayes (GO-AHEAD, 07-DECISIONS.md) | 2026-09-16 |
| AR-07-03 | T-07-09 | Only a size class changed on public-page lines; no copy, claim or proof element touched; above-the-fold shift is a human-check item, not absorbed | Alexander Mayes (GO-AHEAD, 07-DECISIONS.md) | 2026-09-16 |
| AR-07-04 | T-07-13 | Test helper reads one known repo path with no network, env or write access | Alexander Mayes (GO-AHEAD, 07-DECISIONS.md) | 2026-09-16 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-16 | 21 | 21 | 0 | gsd-secure-phase orchestrator (L1 grep-depth, short-circuit: plan-time register, ASVS 1) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-16
