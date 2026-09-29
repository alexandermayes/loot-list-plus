---
status: complete
phase: 11-reading-and-browser-surfaces
source: [11-VERIFICATION.md]
started: 2026-09-21T18:10:00Z
updated: 2026-09-22T00:00:00Z
---

## Current Test

[testing complete]

note: |
  Tests 2-3 ran 2026-09-21 and are retained below unchanged. Test 4 was added
  2026-09-22 by the post-11-06 re-verification (11-VERIFICATION.md, which supersedes
  the stale 2026-09-21T18:00:00Z pass). G-11-1 is closed; see the Gaps section.

  Test 1 and Test 4 are the same checkpoint on the same surfaces: Test 1 is the
  pre-fix instance (it is what found G-11-1), Test 4 is its post-fix successor. The
  user's 2026-09-22 `pass` on Test 4 therefore resolves Test 1 as a re-test; Test 1's
  original `issue` result and its full defect evidence are preserved verbatim below
  under `original_result` / `original_evidence` rather than overwritten.

note_original: |
  Test 1 was expected to be blocked on an authenticated session. It was instead
  resolved on a public page, because the defect proved to be font-level and global
  rather than page-specific. No test users were created and no credentials were
  entered.

  The auth blocker itself remains real and unaddressed for FUTURE app-page UAT:
  `app/api/dev/test-users/route.ts` 404s when `loadtest/test-users.json` is absent,
  and `npm run test:users:create` would call `supabase.auth.admin.createUser`
  against a HOSTED project (zjnhjstbqekudlsozsvi.supabase.co), so it was not run.

## Tests

### 1. Score-dense app page shows tabular numerals with no jitter (ROADMAP criterion 4, app-page half)
expected: Score/attendance/rank/price columns render with fixed-width digit glyphs; no column re-flows or misaligns as values change; screenshot pair captured for the record.
result: pass
resolved_by: "Test 4 re-test (user pass, 2026-09-22) after G-11-1 was closed by 11-06"
resolution_note: |
  Same checkpoint, same surfaces as Test 4 — Test 1 is the pre-fix instance that found
  G-11-1; Test 4 is the post-fix successor added by the 2026-09-22 re-verification. The
  user confirmed the post-fix behaviour on an authenticated local session against Test 4,
  which is the observation this checkpoint was asking for. Not re-diagnosed and no new fix
  plan spawned, per the resolved-gap rule (#1921).
original_result: issue
original_severity: major
original_reported: "tabular-nums is a silent no-op — the shipped Poppins font has no tnum feature, so no numeric column in the app renders tabular figures. Digits vary 42-49% in width."
source: automated
verified_via: Claude-in-Chrome real Chrome, live glyph-advance measurement on localhost:3100, 2026-09-21
resolved_without_auth: true
original_evidence: |
  This checkpoint was expected to be blocked on an authenticated session. It is not —
  the failure reproduces on a PUBLIC page, because the defect is font-level and global.

  `.tabular-nums { font-variant-numeric: tabular-nums }` (globals.css:364-365) is
  applied in 19 app files to loot scores, score-breakdown lines, attendance
  percentages, ranks and prices (master-sheet/BossSection, attendance/
  AttendanceContent, overview/DashboardContent, ScoreComparisonModal, etc.).
  The computed style DOES resolve to `tabular-nums` on those elements. But the app
  font stack is `Poppins, "Poppins Fallback", system-ui, sans-serif`, and Poppins
  ships no `tnum` feature, so the declaration changes nothing at render time.

  Measured glyph advances, all four shipped weights, identical with and without the
  class (so the class is provably inert):
    weight 400: "1111" 20.48px vs "8888" 40.39px  (49% per-digit variance)
    weight 500: "1111" 22.41px vs "8888" 40.84px  (45%)
    weight 600: "1111" 23.17px vs "8888" 41.16px  (44%)
    weight 700: "1111" 24.07px vs "8888" 41.48px  (42%)

  Real-world score-column case (weight 600, .tabular-nums applied):
    "11.1" -> 21.54px   "88.8" -> 35.03px   => 13.49px of jitter at equal digit count
  Control, system-ui at same size with the same property:
    "11.1" -> 33.73px   "88.8" -> 33.73px   => 0px jitter

  METHOD VALIDATED: the same measurement harness detects the property working
  correctly on system-ui ("1111" 28.44px -> 39.06px, becoming exactly equal to
  "8888"). So this is not a measurement artifact and not a Chrome support gap --
  Chrome applies the feature correctly; Poppins simply does not provide it.
  Helvetica and Roboto likewise showed no response, confirming the probe only
  reports tabular behaviour where the font genuinely supplies it.

  SCOPE IS WIDER THAN THIS CHECKPOINT ASSUMED: the checkpoint was scoped to
  "ROADMAP criterion 4, app-page half". The criterion fails on BOTH halves, public
  and authenticated, everywhere `.tabular-nums` is used.
why_human: `GET /api/dev/test-users` returns 404 in this environment (no local test user provisioned) — both the 11-01 before-capture and 11-05 after-capture fell back to public-pages-only for all six authenticated routes. This is ROADMAP success criterion 4's app-page half, and it has never been captured in either baseline. Cannot be verified by grep/static analysis; requires a running authenticated session.

### 2. Themed scrollbar affordance is visible on overflowing content (ROADMAP criterion 2, universal scrollbar rule)
expected: A visible themed scrollbar affordance appears on the overflowing table and on the page's main scroll container, colored from --border / --border-strong in both themes — not the browser's unstyled default.
result: pass
source: automated
verified_via: Claude-in-Chrome real (non-headless) Chrome, dev server localhost:3100, 2026-09-21
evidence: |
  Reproduced the exact overflow condition from 11-05 by constraining the /compare
  feature-table wrapper (`div.overflow-x-auto.rounded-xl.border.border-border`) to
  340px: scrollWidth 670 vs clientWidth 338 (11-05 measured 670 vs 340).

  Live computed styles, both themes (theme switches on the `.dark` class on <html>;
  `:root` is light per globals.css:131, `.dark` per globals.css:213):
  - dark  (`--border: 0 0% 18%`):   scrollbar-color: rgb(46, 46, 46) rgba(0, 0, 0, 0)
  - light (`--border: 35 12% 82%`): scrollbar-color: rgb(215, 210, 204) rgba(0, 0, 0, 0)
  - both: scrollbar-width: thin; html scrollbar-gutter: stable
  Thumb colour resolves from `--border` and the track is transparent in both themes,
  i.e. the themed treatment is live, not the user-agent default.

  Both halves of the criterion are covered: the overflowing table wrapper AND the
  page's main scroll container (<html>, scrollHeight > clientHeight) report the same
  themed scrollbar-color.

  Visually confirmed: the rounded thumb pill renders on a transparent track and
  tracks the scroll offset (captured at two different scrollLeft positions in dark,
  and again in light). macOS overlay scrollbars auto-hide, so capture required
  scrolling and zooming in the same batch — this is why the earlier two headless
  Puppeteer attempts produced no visible affordance. Headless limitation confirmed,
  not a code gap. Only console exception during the session was the reviewer's own
  injected probe, not app code.
test: Open a real (non-headless) browser, go to `/compare` at 390px width where the feature table provably overflows (scrollWidth 670 vs clientWidth 340 per 11-05's own measurement), and confirm the themed thin scrollbar (border-token thumb, transparent track, border-strong on hover) is visible on the table and on the main scrollable content area, in both light and dark.
why_human: The CSS rule is confirmed present and correctly emitted (11-03's compile check, VERIFICATION.md's own read of app/globals.css lines 317-345), and ::selection/caret-color were confirmed live via Puppeteer, but two independent headless-Puppeteer attempts to screenshot the scrollbar itself produced no visible affordance — a known headless-Chromium limitation for custom scrollbar rendering, not a code gap. WINDOWS.md entry 28 already routes this to end-of-phase UAT.

### 3. Compare page table is not cramped at intermediate viewport widths (code review WR-01)
expected: The table renders with comfortable column spacing at both widths, matching the comfortable appearance already observed at 1440; no new horizontal-scroll trigger appears between 896px and 700px of available width.
result: pass
source: automated
verified_via: Claude-in-Chrome real Chrome measurement + static CSS analysis, 2026-09-21
evidence: |
  WR-01 is resolved analytically and decisively — the table's rendered width is
  width-invariant across the reviewer's entire named risk window (1024-1440px), so
  no capture at 1024/1280 can differ from the 1440 capture already inspected.

  Why it is invariant:
  - `.prose-measure` is `max-width: 70ch` (globals.css:623-625) and globals.css
    contains ZERO `@media` queries, so the clamp never changes with viewport width.
  - `app/compare/page.tsx` has only three responsive utilities in the whole file:
    `md:px-12`, `lg:px-20` (article padding) and `md:text-4xl` (h1). None touch the
    table, its wrapper, or `.prose-measure`.
  - Available inner width therefore stays far above the 70ch clamp across the window:
    at 1024 (`lg:px-20`, 80px/side) -> 864px available; just under 1024 (`md:px-12`,
    48px/side) -> 927px available. Both exceed the ~701px clamp, so the wrapper
    renders at exactly 70ch at 1024, 1280, 1440 and above, identically.

  Live measurement confirming the clamp and healthy layout (viewport 2194px, which is
  in the same invariant regime as 1024/1280/1440):
  - wrapper 701px; table scrollWidth 701 == clientWidth 701 -> table does NOT overflow
  - wrapperOverflows: false; document overflowX: false (no page-level h-scroll)
  - 6 columns at 232 / 97 / 96 / 90 / 90 / 96 px; body rows single-line at 49px height
    (no wrapping, no border overlap, proportionate spacing)
  - wrapper retains `overflow-x-auto`, so even under future overflow it scrolls
    within its own box rather than breaking the page.

  Note: the checkpoint text says "five-column"; the table actually has 6 columns
  (Feature + LootList+ / TMB / DKP / EPGP / Loot Council). Measurement covers all 6.
test: Load `/compare` at 1024px and 1280px viewport widths (not just 1440/390) in a real browser and visually confirm the five-column feature table is not visibly cramped, forced into unwanted horizontal scroll, or overlapping its own borders now that its wrapper narrowed from 896px (`max-w-4xl`) to ~700px (`.prose-measure`, 70ch).
why_human: Code review finding WR-01 (11-REVIEW.md) flagged this specific risk and it remains unresolved in the current code (`app/compare/page.tsx:127` still wraps the table inside the same `prose-measure mx-auto` div as the prose Q&A block). Direct visual inspection of the 1440px before/after screenshots found the table renders proportionately with no visible cramping or overflow at that width, which meaningfully de-risks the finding, but the reviewer's named risk window (1024-1440px) was never itself captured at 1024/1280, only at 1440/390. Static analysis cannot resolve a viewport-width layout question.

### 4. Authenticated score-dense surfaces render Figtree numerals without jitter (ROADMAP criteria 3 and 4, authenticated half)
expected: No column re-flow or misalignment as values change; the numeral face is legible and reads as intentional, not as a mismatched font swap; screenshot pair exists for the record, closing WINDOWS.md entry 34 and the app-page half of ROADMAP criterion 4.
result: pass
resolved_on: 2026-09-22
source: 11-VERIFICATION.md 2026-09-22 (post-11-06 re-verification)
verified_via: |
  Human attestation. User response `pass` on the rendered checkpoint, 2026-09-22.
  No agent-side measurement or capture was performed in this session; the agent did not
  create test users, did not run `npm run test:users:create`, and handled no credentials.
  The method the user used to reach an authenticated session was not recorded — only the
  verdict is. (The route offered at the checkpoint was: `npm run dev` on port 3100, which
  targets the same hosted Supabase project, then sign in with an existing personal
  account — which needs no test-user provisioning. Whether that is the route taken is not
  attested here.)
scope_closed: |
  Closes WINDOWS.md entry 34, the authenticated-surface portion of ROADMAP criterion 3,
  and the app-page half of ROADMAP criterion 4 — the single remaining gap in
  11-VERIFICATION.md's `gaps_remaining`.
evidence_strength: |
  HONEST SCOPE LIMIT, recorded rather than absorbed. Parts (a) no jitter and (b) Figtree
  reading as a coherent sibling face are human judgements and are now attested. But the
  expectation's third sub-clause -- "a light + dark screenshot pair exists for the record"
  -- is an ARTIFACT claim, and no new image was added to
  `.planning/workstreams/design-system/baselines/` in this session. So criterion 4's
  app-page half is satisfied by attestation, not by a committed artifact, and the
  authenticated-route screenshot gap named in 11-VERIFICATION.md's Required Artifacts
  table (`⚠ PARTIAL`) is still literally true on disk. Surfaced to the user at session
  close; not routed as a gap, because the behaviour it would have evidenced is confirmed.
test: |
  Get a local test user working (`npm run test:users:create` with a service-role key
  exported in your own shell, per 11-01-PLAN.md's user_setup, or any other route to an
  authenticated local session). Sign in and open /master-sheet, /attendance, /overview
  and the score-comparison modal at 1440px, in both light and dark. For at least one
  numeric column (loot score, score-breakdown line, attendance percentage, or rank),
  compare two different values in the same column and confirm:
    (a) digits hold a fixed, identical apparent width regardless of value -- no jitter
        as the value changes;
    (b) the Figtree numeral face reads as a coherent sibling to Poppins in the same row
        -- matched apparent size, matched weight, shared baseline, not visually jarring.
  Capture a screenshot pair (light + dark) of the page for the record.
why_human: |
  `GET /api/dev/test-users` returns 404 in every environment this workstream has run
  verification in (re-checked live 2026-09-22; unchanged since WINDOWS.md entry 22).
  `npm run test:users:create` writes real users into a hosted, non-local Supabase
  project and must not be run automatically. This is the single remaining piece of
  Phase 11's ROADMAP contract that static analysis, a real non-headless browser
  without credentials, or a synthetic-element probe cannot resolve.

  Scope note on what IS already proven: 11-06's glyph-advance probe measured 0px
  jitter at all four weights with rasterised family confirmed equal to declared family
  (Figtree), against a Poppins control that stayed non-uniform and a system-ui control
  that stayed uniform in the same run. But it measured synthetic spans injected into
  /pricing and /research -- 17 of ~19 real `.tabular-nums` call sites live under
  `app/(app)/` and were never directly measured. Same class, same cascade, same
  browser, so the mechanism generalizes with high confidence; this test closes the
  remaining distance between "the mechanism works" and "it works where it matters."
  Part (b) is a human judgement by construction and cannot be automated at all.

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0
blocked: 0

note: |
  Test 1's original `issue` result is preserved in place as `original_result` with its
  full defect evidence. It counts as passed here because its gap (G-11-1) was closed by
  11-06 and its post-fix successor checkpoint (Test 4) was confirmed by the user on
  2026-09-22. One defect was found and fixed during this phase's UAT; the final tally is
  the post-fix state, not a claim that nothing was ever wrong.

## Gaps

- gap_id: G-11-1
  truth: "Score/attendance/rank/price columns render with fixed-width digit glyphs; no column re-flows or misaligns as values change."
  status: closed
  closed_by: "11-06-PLAN.md (plans 11-06; commits b34d6188, 6446a17b, 0f9ebcc1, 6c6a6d73, 30f08b32)"
  closed_on: 2026-09-22
  closure_evidence: |
    Figtree wired as the `.tabular-nums` face via next/font (self-hosted, same-origin,
    loads under the existing `font-src 'self'` policy), declared in an UNLAYERED rule so
    it cannot be beaten by a same-element Tailwind family utility -- the silent-inertness
    mode that caused this gap.

    Closed EMPIRICALLY, per the decided_approach sign-off below, not declaratively:
      before -> declaredFamily/rasterisedFamily = Poppins, non-uniform at all 4 weights,
                weight-600 decimalJitterPx 10.125, probe exit 1
      after  -> declaredFamily/rasterisedFamily = Figtree, advanceSpreadPx 0 and
                decimalJitterPx 0 at weights 400/500/600/700
    Controls held in BOTH runs (forced-Poppins non-uniform, forced-system-ui uniform),
    so the instrument was still discriminating when it went green.
    Artifacts: baselines/2026-09-22-g11-1-{before,after}/result.json, 11-EVIDENCE.md.

    Residual scope, routed not fixed: WINDOWS.md 32 (td/th half keeps no family),
    33 (research stat callout keeps no class), 34 (authenticated surfaces unmeasured
    -- now Test 4 above).
  original_status: failed
  reason: "User-facing numerals are not tabular. `.tabular-nums` (font-variant-numeric: tabular-nums) is applied across 19 app files, but the shipped Poppins font provides no `tnum` feature, making every usage inert. Measured 13.49px of jitter between `11.1` and `88.8` at equal digit count; 42-49% per-digit width variance across all four shipped weights. Verified against a system-ui control that shows 0px jitter with the same property, so Chrome support is not the issue."
  severity: major
  test: 1
  root_cause: "Font capability gap, not a CSS gap. globals.css:364 declares the utility correctly and it computes correctly; Poppins simply has no tabular figure set."
  artifacts:
    - app/globals.css:364-365
    - tailwind.config.js (Poppins font stack)
    - app/(app)/master-sheet/components/BossSection.tsx
    - app/(app)/attendance/components/AttendanceContent.tsx
    - app/(app)/overview/components/DashboardContent.tsx
    - app/components/ScoreComparisonModal.tsx
  missing:
    - "A numeric font that actually supplies tabular figures for score-dense columns, OR a non-font fallback (fixed-width numeric cells / per-digit slots)."
  candidate_fixes:
    - "Scope a tnum-capable family (e.g. a self-hosted Roboto Mono / Inter / JetBrains Mono numeric face) to .tabular-nums via font-family, keeping Poppins for prose."
    - "Verify any replacement empirically with the same glyph-advance probe before accepting -- declaring the property is not evidence it renders."
  decided_approach: |
    User sign-off 2026-09-21: scope a tnum-capable family to the numerals only.
    `.tabular-nums` gains its own `font-family` from a self-hosted tnum-capable face;
    Poppins stays the prose/UI font. Smallest blast radius, no brand-level change.
    Acceptance is EMPIRICAL, not declarative: the chosen face must measure
    "11.1" and "88.8" at equal width via glyph-advance probe before the gap closes.
  scope_note: "Fails on public AND authenticated pages; the original checkpoint under-scoped this to the app-page half."
