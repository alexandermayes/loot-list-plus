---
phase: 11-reading-and-browser-surfaces
verified: 2026-09-22T07:00:00Z
status: passed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
closed_by_uat:
  date: 2026-09-22
  source: 11-UAT.md Test 4 (human attestation, user response `pass`)
  closes:
    - "Truth 3, authenticated-surface half — the 17 of ~19 `.tabular-nums` call sites under `app/(app)/` that the 2026-09-22 probe could not reach (it measured synthetic spans injected into public pages). Now attested on a real authenticated session: digits hold fixed apparent width as values change, and Figtree reads as a coherent sibling face to Poppins in situ."
    - "Truth 4, app-page half — confirmed behaviourally on an authenticated score-dense surface."
    - "WINDOWS.md entry 34."
  evidence_grade: |
    HUMAN ATTESTATION, not an agent measurement or a committed artifact. The user opened
    authenticated score-dense surfaces themselves and answered `pass` on the rendered
    checkpoint. The agent performed no measurement in that session, created no test users,
    ran no `npm run test:users:create`, and handled no credentials. The route the user took
    to an authenticated session was not recorded — only the verdict.
  residual_artifact_gap: |
    Test 4's expectation had three clauses. (a) no jitter and (b) Figtree reads as a
    coherent sibling face are human judgements and are attested. (c) "a light + dark
    screenshot pair exists for the record" is an ARTIFACT claim and is NOT satisfied: no
    new image was written to `baselines/` in that session. So the Required Artifacts
    table's `⚠ PARTIAL` on the authenticated-route screenshot set below remains literally
    true on disk. Criterion 4's app-page half is closed on attested behaviour, not on a
    committed capture. Recorded rather than absorbed; `scripts/visual/baseline.mjs`'s
    PAGES matrix still has no authenticated entry with a same-named counterpart.
re_verification:
  previous_status: human_needed
  previous_score: 3/4
  gaps_closed:

    - "SURF-01 universal scrollbar visual affordance — previously unconfirmed in headless Chromium (2 failed attempts). 11-UAT.md Test 2 confirmed it live in real, non-headless Chrome in both themes (computed scrollbar-color resolving to --border/--border-strong, visible thumb tracking scroll offset). Now fully VERIFIED."
    - "Compare-page table cramping risk at 1024-1280px (code review WR-01) — previously unresolved. 11-UAT.md Test 3 resolved it analytically and decisively: globals.css has zero @media queries and compare/page.tsx has no responsive utility touching the table or its wrapper, so the 70ch clamp is width-invariant across the entire named risk window. Now fully VERIFIED (closed, not merely de-risked)."
    - "G-11-1 (numerals do not actually render tabular — Poppins has no tnum feature, up to 49% per-digit width variance) — found by 11-UAT.md Test 1 AFTER the previous verification's 2026-09-21T18:00:00Z timestamp, and closed by 11-06-PLAN.md's gap-closure plan. Verified independently in this pass: scripts/visual/numeral-probe.mjs exists, __tests__/numeral-font.test.ts (5 assertions + fail-loud test) passes, and the recorded probe result (baselines/2026-09-22-g11-1-after/result.json) shows declaredFamily === rasterisedFamily === Figtree and decimalJitterPx: 0 at all four weights on both measured public surfaces, against a Poppins control that is provably non-uniform (advanceSpreadPx 14.344, decimalJitterPx 10.125) and a system-ui control that is provably uniform (0/0) — the instrument discriminates correctly in both directions."
  gaps_remaining:

    - "Score-dense authenticated app page (master-sheet / attendance / overview / score-comparison modal) has never been screenshotted or measured in either theme, in any baseline across this entire workstream (WINDOWS.md entries 10, 15, 20, 22, 24, 34). This blocks the app-page half of ROADMAP criterion 4 and the authenticated-surface portion of criterion 3's rendering claim — same root cause both times: GET /api/dev/test-users returns 404 in every environment this workstream has run in, and npm run test:users:create writes real users into a hosted Supabase project, so it is correctly never run automatically."
  regressions: []
  gaps_remaining_resolution: |
    RESOLVED 2026-09-22 by 11-UAT.md Test 4 (human attestation). The blocker named above
    was only ever test-user PROVISIONING, not authentication itself — the local dev server
    targets the same hosted Supabase project, so an existing personal account reaches an
    authenticated local session without `npm run test:users:create` and without the agent
    handling credentials. Six WINDOWS.md entries (10, 15, 20, 22, 24, 34) had recorded the
    404 as though it blocked authenticated verification outright; it did not. See
    `closed_by_uat` above for the evidence grade and the residual artifact gap.
gaps: []
deferred: []
behavior_unverified_items: []
behavior_unverified_items_resolved:

  - truth: "Scores, attendance percentages, ranks and prices render with tabular numerals through a class the app actually applies (SURF-02, criterion 3) — specifically on the authenticated score-dense surfaces, which are where the large majority of real .tabular-nums call sites live (master-sheet/BossSection, attendance/AttendanceContent, overview/DashboardContent, ScoreComparisonModal, loot-management, raid-tracking — 17 of the class's ~19-20 call sites are under app/(app)/, versus one public reserve-join page)."
    test: "Sign in (npm run test:users:create with a local/dev Supabase service-role key, or any other route to a real session), open /master-sheet, /attendance, /overview and the score-comparison modal at 1440 in both light and dark, and either (a) run scripts/visual/numeral-probe.mjs against those live elements (not synthetic injected spans), or (b) visually confirm two different score/percentage/rank values in the same column hold identical apparent digit width and a shared baseline."
    expected: "decimalJitterPx: 0 and uniform: true at every weight actually rendered on those elements (probe path), or, visually, no column re-flow/misalignment as values change and Figtree reads as a coherent sibling face to Poppins in the same row (human-judgment path)."
    why_human: "GET /api/dev/test-users returns 404 in this environment (loadtest/test-users.json absent) and npm run test:users:create would write real users into a hosted, non-local Supabase project, so it must not be run here. The 2026-09-22 probe run proved the CSS mechanism (.tabular-nums resolving to Figtree, cascade-layer placement, real rendered glyph-advance) against synthetic spans injected into /pricing and /research — genuine behavioral evidence, not a CSS-declaration read-back — but it did not measure the actual authenticated DOM elements where the criterion's own language ('scores, attendance percentages, ranks') is centered."

  - truth: "Screenshots in both themes of one score-dense app page show the intended measure and no numeric column jitter (criterion 4, app-page half)."
    test: "With an authenticated session, capture /master-sheet (or another score-dense route) at 1440 and 390, light and dark, and add it to scripts/visual/baseline.mjs's PAGES matrix so it has a same-named counterpart in a future capture."
    expected: "Four images exist (2 viewports x 2 themes) showing normal layout with no numeral jitter in the score/attendance/rank columns."
    why_human: "Same root cause as the item above — no authenticated session reachable in this or any prior verification pass across this workstream (WINDOWS.md entries 10, 15, 20, 22, 24, 34 all name the identical 404 blocker). This is a genuine environmental limitation, not a code defect; the public-reading-page half of this criterion (16 before/after pairs, all named and inspected) is fully met."
    resolution: |
      CLOSED ON BEHAVIOUR, NOT ON ARTIFACT — stated precisely because this item is itself
      an artifact claim. 11-UAT.md Test 4 attested that an authenticated score-dense
      surface shows the intended measure and no numeric column jitter in both themes. But
      the four images this item asks for do NOT exist, and `scripts/visual/baseline.mjs`'s
      PAGES matrix still has no authenticated entry, so there is still no same-named
      counterpart for a future capture to diff against. The behavioural claim behind
      criterion 4's app-page half is satisfied; the durable evidence artifact is not.
      Anyone re-reading this for the milestone audit should treat the app-page screenshot
      set as still absent.
    resolution: "CLOSED 2026-09-22 — 11-UAT.md Test 4, human attestation on a real authenticated session. Path (b), the human-judgment path, is the one taken; the probe path against live authenticated elements was not run."
coincidental_reliance_items: []
human_verification: []
human_verification_discharged:

  - test: "Get a local test user working (npm run test:users:create with a service-role key exported in your own shell, per 11-01-PLAN.md's user_setup, or any other route to an authenticated local session). Sign in and open /master-sheet, /attendance, /overview and the score-comparison modal at 1440px, in both light and dark. For at least one numeric column (loot score, score-breakdown line, attendance percentage, or rank), compare two different values in the same column and confirm: (a) digits hold a fixed, identical apparent width regardless of value — no jitter as the value changes; (b) the Figtree numeral face reads as a coherent sibling to Poppins in the same row — matched apparent size, matched weight, shared baseline, not visually jarring. Capture a screenshot pair (light + dark) of the page for the record."
    expected: "No column re-flow or misalignment as values change; the numeral face is legible and reads as intentional, not as a mismatched font swap; screenshot pair exists for the record, closing WINDOWS.md entry 34 and the app-page half of ROADMAP criterion 4."
    why_human: "GET /api/dev/test-users returns 404 in every environment this workstream has run verification in (re-checked live this session; unchanged since WINDOWS.md entry 22). npm run test:users:create writes real users into a hosted, non-local Supabase project and must not be run automatically. This is the single remaining piece of Phase 11's ROADMAP contract that static analysis, a real (non-headless) browser without credentials, or a synthetic-element probe cannot resolve — it requires an authenticated session."
    discharged: 2026-09-22
    discharged_by: "11-UAT.md Test 4 — user response `pass` on the rendered checkpoint"
    discharged_how: |
      Clauses (a) no jitter and (b) Figtree reads as a coherent sibling face: ATTESTED by
      the user on a real authenticated session. Clause (c) "capture a screenshot pair for
      the record": NOT DONE — no image was added to `baselines/` (see
      `closed_by_uat.residual_artifact_gap`). The agent measured nothing, created no test
      users, and handled no credentials in the discharging session.
---

# Phase 11: Reading and Browser Surfaces Verification Report

**Phase Goal:** Long-form reading and the browser's own chrome obey the palette instead of the user agent defaults
**Verified:** 2026-09-22T07:00:00Z
**Status:** passed (was `human_needed`; canonicalized 2026-09-22 after 11-UAT.md Test 4 discharged the sole human-verification item)
**UAT closure:** The one item this report routed to a human is discharged — see `closed_by_uat` in frontmatter. Read its `evidence_grade` and `residual_artifact_gap` before citing criterion 4 as fully evidenced: the behaviour is attested by the user, the screenshot artifact was never created.
**Re-verification:** Yes — supersedes the 2026-09-21T18:00:00Z verification. That prior pass predates 11-06 (the G-11-1 gap-closure plan) and 11-UAT.md's Test 2/Test 3 resolutions; its verdict is stale and is not treated as current. See `re_verification` frontmatter for exactly what changed.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A single reusable prose container class exists; long-form text on research, compare, blog and pricing FAQ measures 65-75ch at 1440, down from 87-112ch, with no per-page max-width literals left on those pages | ✓ VERIFIED | `.prose-measure { max-width: 70ch }` confirmed by direct read at `app/globals.css:633-636`, inside `@layer components`. 70 is the exact midpoint of 65-75, and this workstream's own ROADMAP text uses "ch" and "characters" interchangeably throughout (compare "measures 65 to 75 characters" against the same sentence's own "down from the audited 87 to 112ch" for the *before* state) — the criterion is expressed and satisfied in `ch` units, not a rendered-glyph character count, which is the standard technique for setting readable measure in proportional-font web typography. All 12 call sites (9 blog posts, research, compare, pricing FAQ line) confirmed present by direct grep, run by this verifier: `grep -rl "prose-measure" app/blog app/research app/compare app/pricing` returns exactly 12 files. `grep -n "max-w-3xl\|max-w-4xl" app/blog/*/page.tsx app/research/*/page.tsx app/compare/page.tsx app/pricing/page.tsx`, run by this verifier, returns zero hits on any of the 11 touched wrapper sites; the only two remaining repo-wide hits (`app/blog/page.tsx:136`, the index card-grid; `app/pricing/page.tsx:62`, pricing's own page-level wrapper) are both explicitly out of scope by design (11-02-PLAN.md's documented prohibition) and are not prose wrappers. `npx vitest run __tests__/prose-measure.test.ts` re-run by this verifier: 4/4 pass. This verifier read the guard's own source: it asserts CSS-rule presence/value and literal absence by text scan, not a rendered character count — that scope limit is disclosed in the test file's own header comment, and does not undermine the ch-unit satisfaction above. |
| 2 | `::selection`, `caret-color` and content-area scrollbars are themed from the palette in both light and dark, not only the sidebar scrollbar | ✓ VERIFIED | All three rules confirmed present by direct read at `app/globals.css:317-360` (`* { scrollbar-width/scrollbar-color }`, `*::-webkit-scrollbar*`, `html { caret-color }`, `::selection { background-color }`), resolving against `--accent`/`--border`/`--border-strong`. `npx vitest run __tests__/browser-surface-theming.test.ts` re-run by this verifier: 4/4 pass. `::selection` and `caret-color` were confirmed live in both themes via Puppeteer (11-EVIDENCE.md). The universal scrollbar rule's visual affordance — unconfirmable in two prior headless-Chromium attempts — was subsequently confirmed live in **real, non-headless** Chrome by 11-UAT.md Test 2 (2026-09-21): live computed `scrollbar-color` resolving to `--border`/`--border-strong` in both themes on both the overflowing `/compare` table and the page's main scroll container, with a visible thumb tracking scroll offset, captured in both themes. This closes the previous verification's only open item for this truth. |
| 3 | Scores, attendance percentages, ranks and prices render with tabular numerals through a class the app actually applies, and the dead `[data-score]` rule is removed or wired to real elements | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | **Dead-rule removal: fully verified.** `app/globals.css:362-366` reads `td, th, .tabular-nums { font-variant-numeric: tabular-nums; }` — `[data-score]` is gone; both surviving selectors intact. `grep -rn "data-score" app components`, run by this verifier, finds only the stale doc-page prose at `app/(app)/design-system/_client.tsx:1801`, correctly named and routed to Phase 12 ENF-03 (WINDOWS.md entry 23). **Rendering mechanism: proven by real behavioral measurement, not by CSS presence.** 11-06-PLAN.md's own prohibition explicitly forbids accepting a CSS declaration or a passing text-scan guard as evidence here — this verifier independently confirmed the actual instrument: `scripts/visual/numeral-probe.mjs` exists and launches real Chrome; its recorded run (`.planning/workstreams/design-system/baselines/2026-09-22-g11-1-after/result.json`, read directly by this verifier) shows `declaredFamily === rasterisedFamily === "Figtree"` and `decimalJitterPx: 0`, `uniform: true` at all four shipped weights on both measured public surfaces (`/pricing`, `/research/wow-classic-loot-systems-2026`), against a Poppins control in the same run that is provably non-uniform (`advanceSpreadPx: 14.344`, `decimalJitterPx: 10.125`) and a system-ui control that is provably uniform (`0`/`0`) — the instrument discriminates correctly in both directions, not just reporting green. `npx vitest run __tests__/numeral-font.test.ts`, re-run by this verifier: 6/6 pass (5 structural-wiring assertions plus the fail-loud path test; the test file's own header discloses it proves wiring placement, not rendering, and explicitly defers the rendering claim to the probe above). **What remains unverified:** the probe measured *synthetic spans injected into public pages* (confirmed by direct read of `scripts/visual/numeral-probe.mjs`'s `page.evaluate` blocks, which `document.createElement('span')` and append rather than reading real page content) — the same CSS class, same cascade, same browser, so the mechanism generalizes with high confidence, but it did not measure the actual authenticated DOM elements. `grep -rl "tabular-nums" app components --include="*.tsx"`, run by this verifier, shows 17 of the ~19 real call sites live under `app/(app)/` (master-sheet, attendance, overview, loot-management, raid-tracking, the score-comparison modal) — i.e. the large majority of what the criterion's own language ("scores, attendance percentages, ranks") actually refers to was never directly measured. This is WINDOWS.md entry 34, unresolved, routed to human UAT. See Human Verification below. |
| 4 | Screenshots in both themes of one public reading page and one score-dense app page show the intended measure and no numeric column jitter, and lint, typecheck and test pass | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | **Public-reading-page half: fully met.** 16 before/after pairs exist at `.planning/workstreams/design-system/baselines/{2026-09-21-pre,2026-09-21-post}-phase-11/`; 11-EVIDENCE.md's fold comparison names every one of the three above-the-fold crossings individually (blog-post H2, research stat card, compare table rows) with before/after state and routes each to the sprint workstream's conversion-cohort owner (WINDOWS.md entries 25-27) — none absorbed as "expected re-flow." `npx tsc --noEmit` re-run by this verifier: exit 0. `npm run lint` re-run by this verifier: `0 errors, 397 warnings`, exact match to 11-EVIDENCE.md's recorded baseline. Full test suite trusted from the orchestrator's own independently-measured run at final HEAD (80 files / 1302 tests, all passing, 58s) plus this verifier's own targeted re-run of all four phase guard files (18/18 pass) and `npm run build` (orchestrator-confirmed clean). **Score-dense app-page half: not met — an absent artifact, not a defect.** No master-sheet (or other authenticated-route) screenshot exists in any baseline this workstream has ever captured (`GET /api/dev/test-users` returns 404, re-confirmed live this session; WINDOWS.md entries 10, 15, 20, 22, 24). Routed to human verification below, same posture the phase's own plans anticipated throughout. |

**Score:** 4/4 truths verified, as of the 2026-09-22 UAT closure.

At the time this report was written the score was 2/4: truths 3 and 4 were present, wired
and behaviorally proven on public surfaces, but not exercised on the authenticated surfaces
the criteria's own language centers on. 11-UAT.md Test 4 closed both on 2026-09-22 by human
attestation on a real authenticated session. Two caveats a later reader must carry forward
rather than round off:

1. **Truths 3 and 4 are closed on human judgment, not on agent measurement.** The probe was
   never run against live authenticated DOM elements; a person looked at real score columns
   and confirmed no jitter and a coherent Figtree/Poppins pairing. That is the appropriate
   evidence for clause (b), which is a judgment call by construction, and acceptable for
   clause (a).
2. **Criterion 4's app-page screenshot artifact still does not exist.** The behaviour is
   attested; the four images are not on disk and the capture matrix still has no
   authenticated entry. The Required Artifacts table's `⚠ PARTIAL` below is still literally
   accurate.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app/globals.css` `.prose-measure` rule | TYPE-04 measure class | ✓ VERIFIED | Present at line 633, correct value, wired at 12 call sites, guard green |
| `app/globals.css` `::selection`/`caret-color`/scrollbar rules | SURF-01 theming | ✓ VERIFIED | Present at lines 317-360, correct token references, guard green, now visually confirmed live (11-UAT.md Test 2) |
| `app/globals.css` tabular-nums rule (post-deletion) | SURF-02 dead-rule removal | ✓ VERIFIED | `[data-score]` gone, siblings intact, guard green |
| `app/layout.tsx` Figtree declaration | SURF-02 numeral-face wiring (G-11-1) | ✓ VERIFIED | `next/font/google` Figtree, `--font-tabular` variable, mounted on the same className as Poppins/Friz Quadrata — confirmed by `npx vitest run __tests__/numeral-font.test.ts` (6/6, checks exactly this wiring) |
| `scripts/visual/numeral-probe.mjs` | G-11-1 acceptance instrument | ✓ VERIFIED | Exists, launches real Chrome, measures `getBoundingClientRect().width` and reads rasterised family via CDP `CSS.getPlatformFontsForNode`; recorded result confirmed by direct read |
| `__tests__/prose-measure.test.ts` | TYPE-04 guard | ✓ VERIFIED | Exists, substantive, passes (4/4, re-run) |
| `__tests__/browser-surface-theming.test.ts` | SURF-01 guard | ✓ VERIFIED | Exists, substantive, passes (4/4, re-run) |
| `__tests__/data-score-absence.test.ts` | SURF-02 dead-rule guard | ✓ VERIFIED | Exists, substantive, passes (4/4, re-run) |
| `__tests__/numeral-font.test.ts` | SURF-02 numeral-wiring guard | ✓ VERIFIED | Exists, substantive, passes (6/6, re-run); its own header correctly discloses it proves wiring, not rendering |
| `.planning/workstreams/design-system/baselines/2026-09-21-{pre,post}-phase-11/` | Before/after screenshot set | ⚠️ PARTIAL | 20 public-page images each, confirmed present on disk. Authenticated-route images absent from both — unchanged from the prior verification's finding. |
| `.planning/workstreams/design-system/baselines/2026-09-22-g11-1-after/result.json` | G-11-1 rendered-measurement acceptance record | ✓ VERIFIED | Confirmed by direct read: red-before/green-after controls plus the two public-surface measurements, all consistent with 11-EVIDENCE.md's and 11-06-SUMMARY.md's claims |
| `11-EVIDENCE.md` | Evidence answering all 4 criteria | ✓ VERIFIED | Answers all four criteria; every quoted grep/command output spot-checked and reproduced by this verifier; criterion 4's app-page gap and criterion 3's original G-11-1 defect are both disclosed honestly, not hidden |
| `.planning/WINDOWS.md` entries 32-35 | G-11-1 residue routing | ✓ VERIFIED | Confirmed present at exactly those IDs with the content the task described: 32 (td/th half keeps no family), 33 (research stat callout keeps no class), 34 (authenticated surfaces unverified — same blocker as this report's human-verification item), 35 (pre-existing unrelated OG-image finding) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| 12 prose call sites | `.prose-measure` CSS rule | className reference | WIRED | Confirmed by grep |
| `app/globals.css` universal selectors | `--accent`/`--border`/`--border-strong` tokens | `hsl(var(--x))` | WIRED | Confirmed by direct read; Phase 07 tokens, distinct light/dark values |
| `td`/`th`/`.tabular-nums` | rendered tables and hand-applied numeric elements | CSS selector match | WIRED | `td`/`th` apply structurally app-wide; `.tabular-nums` at ~19-20 call sites, 17 of them under `app/(app)/` |
| `app/layout.tsx` Figtree `variable` | `app/globals.css` `.tabular-nums { font-family: var(--font-tabular) }` | CSS custom property, unlayered placement | WIRED and BEHAVIORALLY PROVEN (public surfaces) | `next/font` variable mounted on `<body>` className (confirmed `grep -c "font-tabular" app/layout.tsx` = 2), rule placed below the "outside layers" marker so it outranks any Tailwind family utility (guard assertion 4), and the real-Chrome probe confirms the rendered family actually resolves to Figtree, not merely that the declaration exists |

### Data-Flow Trace (Level 4)

Not applicable — this phase ships CSS rules and a font declaration, not dynamic data-bound components. The relevant trace is the rendering-mechanism proof above (CSS declaration through to real rasterised glyph), which is covered under Truth 3 and the key-link table.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase's 4 guard test files pass | `npx vitest run __tests__/browser-surface-theming.test.ts __tests__/data-score-absence.test.ts __tests__/prose-measure.test.ts __tests__/numeral-font.test.ts` (run by this verifier) | 4 files, 18 tests, all passed | ✓ PASS |
| Typecheck passes | `npx tsc --noEmit` (run by this verifier) | exit 0, no output | ✓ PASS |
| Lint passes with known baseline warning count | `npm run lint` (run by this verifier) | `0 errors, 397 warnings` | ✓ PASS (exact match to 11-EVIDENCE.md's claim) |
| `.prose-measure` class defined once, correct value | direct file read of `app/globals.css:633-636` | Confirmed | ✓ PASS |
| `[data-score]` absent from shared CSS, siblings intact | direct file read of `app/globals.css:362-366` | Confirmed | ✓ PASS |
| SURF-01 rules present and token-wired | direct file read of `app/globals.css:317-360` | Confirmed | ✓ PASS |
| G-11-1 probe result record | direct file read of `baselines/2026-09-22-g11-1-after/result.json` | `declaredFamily === rasterisedFamily === Figtree`, `decimalJitterPx: 0` at all 4 weights on both surfaces; Poppins control non-uniform, system-ui control uniform | ✓ PASS |
| 12 prose-measure call sites | `grep -rl "prose-measure" app/blog app/research app/compare app/pricing` | 12 files | ✓ PASS |
| No residual max-width literal on the 11 in-scope wrapper sites | `grep -n "max-w-3xl\|max-w-4xl" app/blog/*/page.tsx app/research/*/page.tsx app/compare/page.tsx app/pricing/page.tsx` | 0 hits | ✓ PASS |
| No debt markers in phase-touched files | `grep -nE "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER"` across `app/globals.css`, `app/layout.tsx`, the probe script, the four blog/research/compare/pricing pages, and all four `__tests__` files | 0 hits | ✓ PASS |

Full test suite (`npm test`) and `npm run build` were not re-run in full by this verifier, per the single-full-run constraint; this pass relies on the orchestrator's own independently-measured post-merge run (80 files / 1302 tests, all passing; build succeeded with the full route table emitted) plus this verifier's own targeted guard re-runs above, which found no contradiction.

### Probe Execution

No `scripts/*/tests/probe-*.sh` convention applies to this phase; the phase's own rendered-measurement instrument (`scripts/visual/numeral-probe.mjs`) is not shaped as a pass/fail shell probe but as a measurement tool whose recorded JSON output this verifier read directly (see Required Artifacts and Behavioral Spot-Checks above) rather than re-executed, since re-execution requires a running dev server this verifier did not start per the spot-check constraints (no server starts, no state mutation).

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|--------------|--------|----------|
| TYPE-04 | 11-01, 11-02, 11-05 | Reusable prose measure class, 65-75ch, no per-page literals | ✓ SATISFIED | Truth #1 above |
| SURF-01 | 11-03, 11-05 | Selection/caret/scrollbar theming, both themes | ✓ SATISFIED | Truth #2 above — the previous verification's one open item (scrollbar visual affordance) is now closed by 11-UAT.md Test 2 |
| SURF-02 | 11-04, 11-05, 11-06 | Tabular numerals class actually renders tabular, dead `[data-score]` rule removed | ⚠️ SATISFIED WITH DISCLOSED GAP | Truth #3 above — dead-rule removal and the rendering mechanism are both proven; the specific authenticated call sites (the majority of real usage) are unverified and routed to human UAT |

No orphaned requirements: all three phase-11 IDs (TYPE-04, SURF-01, SURF-02) are declared across the six plans and REQUIREMENTS.md marks all three Complete. Regarding this task's traceability question: REQUIREMENTS.md's SURF-02 checkbox was flipped to Complete by the `docs(11-05)` commit (`f0fa0a4`, 2026-09-21T17:00:43-07:00) — i.e. by 11-05's evidence close-out, not by 11-04 directly as 11-06's executor summary stated (11-04-SUMMARY.md's own frontmatter carries `requirements-completed: []`, deferring the claim). That premature marking happened *before* 11-UAT.md's Test 1 found G-11-1 the same evening and *before* 11-06 closed it. The checkbox is accurate now that 11-06 has landed; it was briefly inaccurate in between. This is a process observation (evidence closed before the gap it was closing on was itself fully proven), not a currently-open discrepancy — REQUIREMENTS.md today correctly reflects a genuinely (if incompletely, per Truth #3) satisfied requirement.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/components/Sidebar.tsx` | 342 | Dead `sidebar-scrollable` class name left on element after its only backing CSS rule was deleted (confirmed still present, and confirmed the class has zero backing rule in `app/globals.css`) | Info (non-blocking) | Harmless — the universal scrollbar selector already styles this element identically — but a misleading hook for a future reader. Not a ROADMAP success-criterion violation. |
| `app/(app)/design-system/_client.tsx` | 1801 | Stale prose describing the deleted `[data-score]` selector as "applied globally" | Info (non-blocking, named and routed) | WINDOWS.md entry 23, routed to Phase 12 ENF-03, which already owns "shows no primitive that this milestone deleted" for this exact page |

No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER debt markers found in any phase-touched file this verifier scanned (see Behavioral Spot-Checks). The compare-page table wrapper concern flagged by the prior verification (code review WR-01) is now closed, not merely de-risked — 11-UAT.md Test 3 demonstrated analytically that the 70ch clamp and the file's only three responsive utilities never interact with the table, making the wrapper width-invariant across the reviewer's entire named risk window (1024-1440px), and confirmed this with a live measurement.

### Human Verification Required — DISCHARGED 2026-09-22

The one item below was the sole blocker on this phase. It is now discharged; see frontmatter `human_verification_discharged`.

1. ~~**Authenticated score-dense app page (master-sheet, attendance, overview, score-comparison modal), both themes**~~ — **CLOSED** by 11-UAT.md Test 4, user response `pass`, 2026-09-22. Confirmed: real numeral columns hold no jitter, and Figtree reads as a coherent sibling face to Poppins in situ. Closes WINDOWS.md entry 34, the authenticated-surface portion of ROADMAP criterion 3, and the behavioural half of ROADMAP criterion 4's app-page clause.

   **Two corrections to this item's own framing, worth recording:**

   - **The stated blocker was wrong in scope.** This report (and WINDOWS.md entries 10, 15, 20, 22, 24 and 34 before it) treated `GET /api/dev/test-users` returning 404 as though it blocked authenticated verification outright. It did not — it blocked only test-user *provisioning*. The local dev server points at the same hosted Supabase project, so an existing personal account reaches an authenticated local session with no test-user creation, no service-role key, and no credential ever crossing into the agent. Six entries across this workstream recorded a harder blocker than the one that actually existed.
   - **Clause (c) was not satisfied.** The item asked for a captured screenshot pair "for the record." No image was written. The behavioural claims are attested; the artifact is absent. Do not cite this item as having produced a capture.

### Gaps Summary

No FAILED truths, no missing or stub artifacts, no unwired key links, and no blocking anti-patterns. Every artifact required by TYPE-04, SURF-01 and SURF-02 exists, is substantive, is wired, and is guarded by a passing, non-trivial test this verifier independently re-ran. This re-verification closes two of the three items the prior pass (2026-09-21T18:00:00Z) had routed to human verification — the scrollbar visual affordance and the compare-table cramping risk are both now resolved with concrete evidence (11-UAT.md Tests 2 and 3) — and closes the G-11-1 defect that UAT itself found and flagged as `failed` *after* that prior verification ran (11-06 closed it with a rendered-measurement instrument this verifier independently confirmed, not a CSS-declaration read-back).

What remained at the time of writing was a single, apparently environmentally-forced gap: no phase of this milestone had ever captured or measured an authenticated, score-dense app screen, because `GET /api/dev/test-users` 404s in every environment verification had run in and `npm run test:users:create` correctly must not be run automatically against a hosted Supabase project. Per the decision tree, that non-empty human-verification list forced `human_needed`.

**That gap closed on 2026-09-22** via 11-UAT.md Test 4, and the closure carries a lesson worth more than the closure itself: **the blocker was mis-scoped for six phases.** The 404 blocked test-user *provisioning*, not authentication. Because the local dev server targets the same hosted Supabase project, an existing personal account reaches an authenticated local session directly — no test user, no service-role key, no credential crossing into the agent. Every prior pass treated a provisioning limitation as an authentication limitation and routed the criterion to "cannot be verified here" on that basis. The correct reading was available the whole time.

Two honest limits on the closure, both recorded in frontmatter rather than rounded off:

- It rests on **human attestation**, not agent measurement. The probe was never pointed at live authenticated elements. For clause (b) — "Figtree reads as a coherent sibling face" — human judgment is the only valid instrument. For clause (a) — no jitter — a probe run would have been stronger evidence and is still available via `npm run visual:numerals` against an authenticated origin.
- The **screenshot artifact was never created.** Criterion 4's app-page clause is closed behaviourally, not evidentially. `scripts/visual/baseline.mjs`'s PAGES matrix still has no authenticated entry, so a future capture still has nothing same-named to diff against. The Required Artifacts table's `⚠ PARTIAL` stands.

Separately, the phase's security pass (`11-SECURITY.md`, 2026-09-22) closed 22 of 23 threats with first-hand evidence and `threats_open: 0`. It surfaced one finding relevant to this report's own standards: 11-06's plan required the numeral probe's non-local-origin refusal to be exercised by hand and recorded, and **no such record was ever written** — the security auditor had to exercise it itself to close the threat. Recorded as F-11-01 there. Evidence obligations that live only in plan prose are exactly the failure mode this phase's own G-11-1 defect came from.

---

_Verified: 2026-09-22T07:00:00Z_
_Verifier: Claude (gsd-verifier)_
