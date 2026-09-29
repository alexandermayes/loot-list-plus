---
phase: 11
slug: reading-and-browser-surfaces
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
block_on: high
created: 2026-09-22
register_authored_at_plan_time: true
threats_total: 23
threats_closed: 22
threats_open_non_blocking: 1
audited_by: gsd-security-auditor (Claude), verified first-hand
---

# Phase 11 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

**Register source:** all six `11-0{1..6}-PLAN.md` `<threat_model>` blocks, parseable and
authored at plan time (`register_authored_at_plan_time: true`). No SUMMARY carries a
`## Threat Flags` section — confirmed by grep across all six summaries plus
`11-VERIFICATION.md` and `11-EVIDENCE.md`.

**ID collision note:** 11-05 and 11-06 each define `T-11-12`, `T-11-13` and `T-11-14`
with *different* content. Every reference below is disambiguated by source plan.

**Audit depth:** ASVS L1 (grep depth), `block_on: high`. The auditor did not accept plan
prose as evidence: it re-ran the four phase guards plus the Phase 08 focus-ring guard
(5 files / 49 tests, all green), re-measured every declared diff line count, read the
committed probe JSON directly, and exercised the probe's origin refusal live. No
implementation file was modified by the audit.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Puppeteer-driven browser → local dev server | Headless sessions navigate real app screens during baseline capture and numeral measurement | Rendered page content; localhost only, enforced before browser launch |
| User's shell → repository | `SUPABASE_SERVICE_ROLE_KEY` exists only in the user's shell and must never cross into the agent, the repo, or a committed capture | Service-role credential (must not cross; verified it did not) |
| Static CSS → every rendered page | `app/globals.css` declarations reach every rendered page; a universal selector here has app-wide reach, authenticated and public alike | Presentation only; no user data |
| Build machine → Google Fonts | `next/font/google` fetches font binaries at build time; the shipped app then serves them from its own origin | Font binaries; no user data, no runtime third-party fetch on browser surfaces |
| Puppeteer probe → web origin | A script that navigates and injects script into pages could be aimed at a deployed environment holding real user data | Refused at any non-localhost hostname before launch |
| Screening mode → content-security policy | Screening deliberately disables the page's CSP so a candidate face can be measured before it is chosen | Localhost only, screening mode only, never in acceptance mode |
| Guard test → repository source tree | A presence/absence guard can be weakened into a test that measures nothing | Test integrity (vacuous-pass risk) |
| Evidence document → project record | An evidence document that softens a not-met criterion misleads every later reader, including the milestone audit | Project truth (repudiation risk) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-11-01 (11-01) | Information Disclosure | `scripts/visual/baseline.mjs` capture output | high | mitigate | 4 added `PAGES` entries all `auth: false`, no `afterGoto` hook, no env read (`baseline.mjs:123-126`). `resolveOrigin` byte-unchanged (`git diff a022324a~1 a022324a -- scripts/visual/baseline.mjs \| grep -c resolveOrigin` → 0). Localhost-only refusal live at `:161-165`; sole env read is `BASE_URL` (`:154`). Credential grep over both committed manifests → zero hits. `test:users:create` never run; manifest `skipped[]` names all 6 auth routes, reason `404` | closed |
| T-11-02 (11-01) | Spoofing | `resolveOrigin()` capture target | medium | mitigate | Same grep = 0; `git log` shows last touch to the script is `a022324a` itself, so the capture target was never repointed at a deployed origin | closed |
| T-11-03 (11-01) | Tampering | `.prose-measure` reach | low | **accept** | Verified in code: `app/globals.css:633-634` sets exactly one property (`max-width: 70ch`), static literal, no interpolation. `git log -S "prose-measure"` → introduced only by `2a068b5c`, so the class name collided with nothing pre-existing. Zero focus/outline lines in any phase-11 code commit. See Accepted Risks R-11-01 | closed |
| T-11-04 (11-02) | Tampering | TYPE-04 guard integrity | high | mitigate | `__tests__/prose-measure.test.ts`: `SCANNED_PATHS` = exactly 11 entries (`:52-64`); header names both exclusions and why (`:23-38`) and discloses the 2 uncovered literal forms (`:40-48`); fail-loud-on-missing-path test (`:92-96`). Fail-first proof recorded verbatim in 11-02-SUMMARY.md (red naming `guild-recruitment-guide…/page.tsx:128`, restored byte-identical). Guard re-run by auditor: 4/4 | closed |
| T-11-05 (11-02) | Tampering | public page content integrity | medium | mitigate | Changed-line counts measured independently: `3a8529b7` = 18, `d2208801` = 4, exactly as declared. Every changed line is a `className` attribute value; no JSX structure, text node, import or data-flow change; no new interpolation. Diff contains zero visible page strings | closed |
| T-11-06 (11-03) | Tampering | universal selector scope creep | medium | mitigate | Universal rule sets only scrollbar properties (`app/globals.css:323-344`). `grep -c focus-visible` = 0 across all three 11-03 commits; a `focus\|outline` grep over all 17 phase-11 commits returns 0 code hits. Phase 08 PRIM-03 focus-ring guards re-run by auditor: green | closed |
| T-11-07 (11-03) | Tampering | SURF-01 guard integrity | high | mitigate | `__tests__/browser-surface-theming.test.ts` asserts all three token names by string (`:39-43`); fail-loud-on-missing-path test (`:88-92`); header discloses presence ≠ rendering correctness (`:14-23`). Fail-first proof recorded verbatim in 11-03-SUMMARY.md. Guard re-run by auditor: 4/4 | closed |
| T-11-08 (11-03) | Information Disclosure | `::selection` / caret values | low | **accept** | Verified: `app/globals.css:358-360` and `:348` are static literals over pre-existing Phase 07 custom properties, zero interpolation, no CSS-injection path. See Accepted Risks R-11-02 | closed |
| T-11-09 (11-04) | Tampering | SURF-02 guard integrity | high | mitigate | `__tests__/data-score-absence.test.ts`: absence assertion (`:38-42`) plus two sibling-survival assertions (`:44-47`, `:49-52`) and fail-loud test (`:54-58`). Both red modes recorded verbatim in 11-04-SUMMARY.md (reintroduced selector named `globals.css:364`; whole-block deletion failed both survival assertions). Guard re-run by auditor: 4/4 | closed |
| T-11-10 (11-04) | Tampering | unintended edit to earlier plans' rules | medium | mitigate | `c6d84102` diff is exactly one removed line (`-  [data-score],`), one file. Negative-grep of that diff for `prose-measure\|::selection\|caret-color\|scrollbar` → 0. All earlier-plan rules positively present in current source: `:325`, `:348`, `:358`, `:633` | closed |
| T-11-11 (11-04) | Repudiation | undocumented stale documentation | low | mitigate | `.planning/WINDOWS.md` entry 23 names `app/(app)/design-system/_client.tsx`, line 1801, quotes the sentence verbatim, routes to Phase 12 ENF-03. That page confirmed unedited across all 17 phase-11 commits | closed |
| T-11-12 (11-05) | Information Disclosure | `post-phase-11` capture output | high | mitigate | `git diff --name-only 6819ef60~1 6819ef60 -- scripts/visual/baseline.mjs` → empty; no commit touched the script between the two captures, so `resolveOrigin` could not be repointed between runs. Post-capture manifest: credential grep zero hits, `origin_hostname: localhost`, public pages only, 6 auth routes skipped (404) | closed |
| T-11-13 (11-05) | Repudiation | before-capture integrity | high | mitigate | `git log -- …/2026-09-21-pre-phase-11/` → exactly one commit (`a022324a`, its creation); never re-run, overwritten or deleted. `git status --porcelain` on that directory → empty. Missing-baseline stop-and-report honoured (partial-but-symmetric, recorded as WINDOWS 22/24, not manufactured) | closed |
| T-11-14 (11-05) | Repudiation | evidence completeness | medium | mitigate | 11-EVIDENCE.md carries an explicit verdict for all 16 public-page pairs (no silence). All three fold crossings have WINDOWS.md entries with named element and destination (25 blog H2, 26 research stat card, 27 compare rows). Unmet criterion stated unmet, not softened: "This half of criterion 4 is NOT met by this plan" | closed |
| T-11-12 (11-06) | Information Disclosure | `numeral-probe.mjs` origin targeting | high | mitigate | `assertLocalOrigin` at `scripts/visual/numeral-probe.mjs:133-146`, called **before** browser launch in both modes (`:490`→`:496`; `:706`→`:710`). Zero `process.env` reads and zero `screenshot` calls in the 774-line script. **Refusal exercised live by the auditor** — see Finding F-11-01: the executor's own declared one-time observation was never recorded | closed |
| T-11-13 (11-06) | Tampering | build-time font acquisition | medium | **accept** (scope narrowed) | Threat itself mitigated: Figtree arrives via `next/font/google` (`app/layout.tsx:2,40-41`, mounted `:216`), served from `/_next/static/media` on the app's own origin, zero dependency added; probe records console errors and failed requests (`result.json`: both empty). **The declared control's scope was overstated** — see Accepted Risks R-11-04 | open — below `high` threshold (non-blocking), accepted |
| T-11-14 (11-06) | Tampering | screening mode's CSP bypass | medium | mitigate | `page.setBypassCSP(true)` occurs exactly once, at `:717`, inside `runScreening` (`:705`), boundary stated inline. `runAcceptance` (`:489-551`) contains no bypass call — verified by sole-occurrence grep. Boundary also in the script header (`:32-42`). Code lives under `scripts/`, outside the app-tree grep scope | closed |
| T-11-15 (11-06) | Spoofing | fallback face mistaken for the declared face | high | mitigate | Highest-value control in the phase. CDP call present: `CSS.getPlatformFontsForNode` at `:291`. Fallback is **gated, not merely reported**: `:524-525` fails the run when `rasterisedFamily !== declaredFamily` on any weight of any surface → exit 1 (`:528`). Recorded run (`baselines/2026-09-22-g11-1-after/result.json`): `declared === rasterised === Figtree` at all 4 weights on both surfaces, `exitCode 0`, `consoleErrors: []`, `failedRequests: []` | closed |
| T-11-16 (11-06) | Tampering | measurement vacuity | high | mitigate | Controls run on every invocation (`:519`); `:523` voids the run if Poppins measures uniform or system-ui measures non-uniform; `:528` gives three distinct exit codes (2 void / 1 product broken / 0 pass), documented `:49-67`. Red-before observed and recorded (g11-1-before: exit 1, all 4 weights non-uniform, controls held). Green run's controls held (Poppins spread 14.344 non-uniform; system-ui 0 uniform). **Variance disclosed** — see Finding F-11-02 | closed |
| T-11-17 (11-06) | Tampering | silent re-inertness of the repaired rule | high | mitigate | Family rule genuinely unlayered: `@layer base` closes at `app/globals.css:401`, marker at `:404`, rule at `:437-438`, next layer at `:445`. Guard asserts placement structurally by line position vs the marker string (`__tests__/numeral-font.test.ts:70-85`); collision assertion over `app`+`components` `.tsx` (`:87-97`). All three structural assertions observed red verbatim in 11-EVIDENCE.md, each reverted with `git checkout --`. Guard re-run by auditor: 6/6 | closed |
| T-11-18 (11-06) | Repudiation | undisclosed guard scope | low | mitigate | `__tests__/numeral-font.test.ts:19-27` states it proves presence and placement in source only, "does not instantiate a DOM, compute a style, or measure a rendered glyph", and names `scripts/visual/numeral-probe.mjs` + `npm run visual:numerals` as the location of real proof | closed |
| T-11-19 (11-06) | Repudiation | unrecorded residue | low | mitigate | All three deliberate non-fixes present as routed WINDOWS.md entries with named files: **32** (`td, th` half keeps no family), **33** (`app/research/wow-classic-loot-systems-2026/page.tsx:461` stat callout keeps no class), **34** (authenticated score-dense surfaces → end-of-phase UAT, now closed by 11-UAT.md Test 4) | closed |
| T-11-SC (all plans) | Tampering | npm/pip/cargo installs | high | **accept** | Verified across all 17 phase-11 commits: the only `package.json` change is one npm script line (`+ "visual:numerals"`, in `b34d6188`); **zero** dependency additions and **zero** `package-lock.json` changes. Puppeteer pinned pre-existing at `package.json:91` (`24.43.1`). Font via first-party loader, no package. 11-RESEARCH.md:82-84 records `## Package Legitimacy Audit` = "Not applicable". See Accepted Risks R-11-03 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `block_on` count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

**threats_open: 0** — no open threat at or above the `high` block threshold. One medium
threat is open-and-accepted (T-11-13 (11-06)); it is non-blocking by the configured
threshold and is recorded below rather than silently absorbed.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-11-01 | T-11-03 (11-01) | `.prose-measure` sets exactly one property (`max-width: 70ch`) on a class name that existed nowhere in the codebase before `2a068b5c`, so it can collide with no existing selector. Static literal, no interpolation from user input, DB value or request parameter. Touches no focus indicator and no interactive affordance. Accepted at plan time as disposition `accept`; rationale re-verified in code by this audit | Plan-time disposition (11-01-PLAN.md), re-verified 2026-09-22 | 2026-09-22 |
| R-11-02 | T-11-08 (11-03) | `::selection` background and `caret-color` are static literals referencing pre-existing Phase 07 custom properties (`app/globals.css:348`, `:358-360`). Nothing is interpolated from user input, a database value or a request parameter, so there is no CSS-injection path. 11-RESEARCH.md records ASVS V5 Input Validation as not applicable for this reason | Plan-time disposition (11-03-PLAN.md), re-verified 2026-09-22 | 2026-09-22 |
| R-11-03 | T-11-SC (all plans) | Zero package-manager installs in the phase. Verified across all 17 commits: the only `package.json` change is one npm script line; zero dependency additions, zero `package-lock.json` changes. Puppeteer `24.43.1` is a pre-existing pinned devDependency from Phase 07; the font arrives through Next.js's first-party loader, not a package. No `[ASSUMED]`, `[SUS]` or `[SLOP]` package exists to gate | Plan-time disposition (all six plans), re-verified 2026-09-22 | 2026-09-22 |
| R-11-04 | T-11-13 (11-06) | **Overstated control, not an unhandled threat — scope narrowed on acceptance.** 11-06's mitigation claimed a negative-grep over `app/`, `components/` and `next.config.ts` for external font hosts would return clean. It does not: 2 hits at `app/reserve/join/[token]/opengraph-image.tsx:14-15`, fetching Poppins TTFs from `fonts.gstatic.com`. Both hits are **pre-existing and unrelated to Phase 11**, and are a server-side `next/og` Satori render — not a browser document load — so they are not governed by `next.config.ts:29`'s `font-src 'self' data:`. The threat the control existed to prevent (a runtime third-party font fetch on a shipped browser surface) **is** mitigated: Figtree arrives via `next/font/google` and is served self-hosted from the app's own origin; `app/layout.tsx` and `app/globals.css` are clean at the scoped level; the probe's console-error and failed-request recording is live and came back empty. **Accepted with the criterion's declared scope corrected to the browser-loaded font surface it actually protects.** The OG-route fetch remains routed as WINDOWS.md entry 35 for independent handling; it is not a Phase 11 regression | User sign-off 2026-09-22 (`/gsd-verify-work 11` security gate) | 2026-09-22 |

---

## Findings for the Record

Not threats. Recorded so they cannot later read as oversight.

| ID | Finding |
|----|---------|
| F-11-01 | **Unrecorded one-time process control — T-11-12 (11-06).** 11-06-PLAN.md required the probe's non-local-origin refusal to "be exercised once by hand and recorded, so the guard is observed rather than assumed." No such record exists: a `refus\|non-local\|127\.0\.0\.1\|origin guard\|T-11-12` grep over 11-06-SUMMARY.md, 11-EVIDENCE.md, 11-UAT.md, 11-VERIFICATION.md and `.planning/WINDOWS.md` returns nothing for the probe. The threat is closed on the **auditor's own** exercised refusal, 2026-09-22: `--url https://getlootlist.com.invalid/master-sheet` → `Refusing to run: … got "getlootlist.com.invalid"`, exit 2, no browser launched, no output directory created, working tree unchanged; same result for `http://127.0.0.2:3100/pricing`, confirming the allowlist is exact-hostname and not substring. The control is now genuinely observed — **but by the audit, not by the executor who promised it.** Attributed here rather than allowed to read as if execution had discharged it. |
| F-11-02 | **T-11-16's reproduction target was approximated, not hit.** The plan required the probe's weight-600 jitter to reproduce the 13.49px that 11-UAT.md Test 1 measured by hand. It landed at **10.125px**. 11-EVIDENCE.md discloses the delta and explains it (injected span vs real call site) rather than softening it. Same phenomenon, same order of magnitude, not an exact reproduction. Non-blocking: the control's purpose (prove the instrument discriminates) is served by the controls holding in both directions on both runs. |
| F-11-03 | **Every other one-time process control IS recorded**, and each was checked individually: 11-02 fail-first (named file + line), 11-03 fail-first (named assertion), 11-04 both red modes, 11-06 all three guard red modes with verbatim output and `git checkout --` restoration, plus `git status --porcelain` clean confirmations before each commit. |
| F-11-04 | **No unregistered attack surface.** All new surface this phase introduced (the `visual:numerals` script, the probe's script injection, the screening-mode CSP bypass, the build-time font fetch) maps to a registered threat ID. No SUMMARY carries a `## Threat Flags` section. |
| F-11-05 | **The audit modified nothing.** Commands were reads, greps, `git diff/log/status`, `npx vitest run` (5 files / 49 tests, all green), and two origin-refusal probe invocations that exited before launching a browser and wrote nothing. |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-22 | 23 | 22 | 1 (medium, accepted — non-blocking) | gsd-security-auditor (Claude), ASVS L1, `block_on: high` |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log (R-11-01 … R-11-04)
- [x] `threats_open: 0` confirmed — no open threat at or above the `high` block threshold
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-22
