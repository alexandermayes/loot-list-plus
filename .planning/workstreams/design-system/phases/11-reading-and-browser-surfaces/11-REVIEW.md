---
phase: 11-reading-and-browser-surfaces
reviewed: 2026-09-21T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - __tests__/browser-surface-theming.test.ts
  - __tests__/data-score-absence.test.ts
  - __tests__/numeral-font.test.ts
  - __tests__/prose-measure.test.ts
  - app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx
  - app/blog/guild-recruitment-guide-find-raiders-who-stay/page.tsx
  - app/blog/how-to-handle-loot-drama-without-losing-raiders/page.tsx
  - app/blog/how-to-onboard-new-raiders-without-killing-morale/page.tsx
  - app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx
  - app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx
  - app/blog/loot-priority-lists-vs-loot-council/page.tsx
  - app/blog/the-officer-burnout-problem-and-how-to-fix-it/page.tsx
  - app/blog/why-attendance-tracking-matters-more-than-loot-rules/page.tsx
  - app/compare/page.tsx
  - app/globals.css
  - app/layout.tsx
  - app/pricing/page.tsx
  - app/research/wow-classic-loot-systems-2026/page.tsx
  - package.json
  - scripts/visual/baseline.mjs
  - scripts/visual/numeral-probe.mjs
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-09-21
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

Reviewed the eleven prose-measure call sites, `app/globals.css`'s SURF-01 theming and the
unlayered `.tabular-nums` font-family rule, `app/layout.tsx`'s Figtree wiring, the four
regression-guard test files, the package.json script addition, and the ~29KB
`scripts/visual/numeral-probe.mjs` acceptance instrument in detail.

The CSS and layout wiring itself is sound: the `--font-tabular` variable name doesn't collide
with `--font-poppins`/`--font-wow`, it's correctly mounted on `<body>`'s className alongside the
other two, the `.tabular-nums { font-family: ... }` rule genuinely sits outside every `@layer`
block (verified by reading the full cascade), the fallback chain is well-formed, and — per the
CSS Cascade Layers spec — unlayered rules always outrank layered ones regardless of source
position, so the "outside layers" technique works as intended. The eleven `prose-measure`
call sites and the pricing FAQ line all match what the guard tests assert. No dependency drift:
`package.json`'s only change in scope is the new `visual:numerals` script line; puppeteer was
already a pinned devDependency used by `baseline.mjs`.

Two classes of issues were substantiated, both in the acceptance-instrument layer this phase adds
(exactly the area flagged as highest-risk): one dead safety check in `numeral-probe.mjs`'s server-
readiness guard (empirically verified against a live dev server, both on a successful render and
on a deliberately-thrown render error), and two brittleness gaps in `numeral-font.test.ts`'s
regex-over-source guard that would let a real regression slip through as a false pass. Neither
reaches Critical under this review's severity rubric (no crash, security, or data-loss path), but
both degrade the reliability of the exact instrumentation this phase built to prevent silent
regressions, so they are flagged as Warnings.

## Warnings

### WR-01: `assertServerReady`'s Next.js error-overlay check can never fire

**File:** `scripts/visual/numeral-probe.mjs:148-166`
**Issue:** The function fetches the page with a plain server-side `fetch()` and then checks
`body.includes('nextjs-portal')`, intending to catch "a server that boots without the Supabase env
vars [and] renders this instead of the real page" (comment at lines 81-85). This can never trigger.
The `<nextjs-portal>` element is created exclusively by client-side JavaScript in Next's dev-tools
overlay bundle (`document.createElement("nextjs-portal")`, confirmed in
`node_modules/next/dist/compiled/next-devtools/index.js`) — it is never written into the raw SSR
HTML that `fetch()` sees, on a successful page or a failed one. This was verified empirically
against the actual `npm run dev` server on port 3100: a normal `/pricing` fetch returns `HTTP 200`
with zero occurrences of `"nextjs-portal"` or even the substring `"portal"` in the body, and a
route made to `throw new Error(...)` during render returns `HTTP 404` (already caught by the
preceding `if (!response.ok)` check) with likewise zero occurrences. So this specific check is
unreachable dead code: it neither adds protection beyond `response.ok` nor can it distinguish a
real client-side-only error state (e.g. a runtime error surfacing only after hydration on an
`HTTP 200` response) from a healthy page — which is exactly the "app is broken" (1) vs "probe
could not measure" (2) conflation the file's own header comment (lines 62-64) warns against: a page
that fails post-hydration would sail past this guard as `HTTP 200`/no-marker, and the probe would
proceed to inject spans and report a verdict (likely `exitCode 1`, "app broken") when the real
diagnosis is "run is void, could not render."
**Fix:** Either remove the dead check and the misleading comment describing what it catches, or
replace it with something that can actually observe post-hydration state — e.g. have the Puppeteer
page navigation (which already runs later in `measureSurface`) check for a live
`document.querySelector('nextjs-portal')` / `[data-nextjs-dev-overlay]` in the real DOM after
`page.goto()`, before any measurement is taken, and treat a match as `exitCode 2` (void), not a
plain-HTTP-fetch text-includes check.

### WR-02: `numeral-font.test.ts`'s unlayered-placement guard checks line order, not layer scope

**File:** `__tests__/numeral-font.test.ts:70-85`
**Issue:** The test's stated purpose (per its own file-header comment, lines 13-17) is to stop "a
future tidy-up from moving the rule into a layer and silently re-breaking the fix." Its actual
assertion is only `ruleLine > markerLine` — that the `.tabular-nums { font-family: ... }`
declaration's line number is numerically greater than the line containing the "outside layers"
section-marker comment. It never checks whether an `@layer` block opens between the marker and the
rule. A regression that wraps the rule as `@layer components { .tabular-nums { font-family: ... } }`
placed anywhere after line 404 (the marker) would still satisfy `ruleLine > markerLine` and pass
this test green, while actually reintroducing the exact defect (a layered declaration losing to a
same-element Tailwind family utility) the guard exists to prevent.
**Fix:** Additionally scan the lines between `markerLine` and `ruleLine` for an unclosed `@layer`
open brace (or, more simply, scan the whole file for `@layer` block boundaries and assert the
`.tabular-nums` font-family rule's line index falls outside all of them), e.g.:
```ts
const layerRanges = []
let depth = 0, layerStart = -1
lines.forEach((l, i) => {
  if (/@layer\s+\w+\s*\{/.test(l)) { if (depth === 0) layerStart = i; depth++ }
  if (depth > 0 && /\}/.test(l)) { depth--; if (depth === 0) layerRanges.push([layerStart, i]) }
})
expect(layerRanges.some(([s, e]) => ruleLine > s && ruleLine < e)).toBe(false)
```

### WR-03: `numeral-font.test.ts`'s call-site collision guard only matches same-line occurrences

**File:** `__tests__/numeral-font.test.ts:87-97`
**Issue:** `matchesIn` (see `__tests__/design-tokens/source-files.ts:82-97`) matches strictly
per source line. This test filters `tabular-nums` matches for lines whose *same line text* also
matches `FAMILY_UTILITY_PATTERN`. If a future call site splits a className across lines — e.g. via
a multi-line `cn(...)`/`clsx(...)` call or a multi-line template literal, both idiomatic React
patterns and plausible given this codebase already depends on `clsx`/`tailwind-merge` — with
`tabular-nums` on one line and `font-sans`/`font-poppins`/`font-wow` on another, the collision this
guard exists to catch would go undetected and the test would still report green.
**Fix:** Collapse className content per JSX element (or at minimum per contiguous
`className={...}` block) before testing, rather than matching line-by-line, so a collision spread
across lines is still caught. A lighter-weight interim fix: broaden the scan to flag any file
where both patterns occur in the same file within N lines of each other, with a comment
disclosing the narrower (not full-AST) scope.

## Info

### IN-01: `runScreening` reports a misleading "unreachable" message for a whitespace-only `--screen` argument

**File:** `scripts/visual/numeral-probe.mjs:118-123, 733-737`
**Issue:** `parseArgs` computes `families` via `screenArg.split(',').map(trim).filter(Boolean)`. A
whitespace-only `--screen` value (e.g. `--screen "  "`) produces a truthy `screenArg` but an empty
`families` array. `runScreening` then computes `candidates = []`, and
`candidates.every((c) => c.unreachable)` is vacuously `true` for an empty array, so the run exits
`2` with `"VOID RUN: the Google Fonts stylesheet service could not be reached for any candidate."`
— a diagnosis that doesn't match the actual cause (no family names were parsed at all). The exit
code is still non-zero (fails loud), so this is a message-accuracy issue, not a silent-pass risk.
**Fix:** Guard `families.length === 0` explicitly in `main()`/`runScreening` with a distinct error
("no family names parsed from --screen").

### IN-02: "outside layers for higher specificity" mischaracterizes the cascade mechanism

**File:** `app/globals.css:404`, `app/globals.css:431-436`
**Issue:** The section marker and the rule's own comment describe the unlayered placement as
winning via "higher specificity." Cascade layers and selector specificity are separate cascade
steps — an unlayered rule outranks a layered one at the *layer* step, before specificity is even
compared, regardless of selector complexity. The behavior described is correct; the mechanism
named is not. A future maintainer relying on this comment could reach for `!important` or extra
selector weight to "raise specificity" instead of understanding why the rule actually wins.
**Fix:** Reword to "outside layers, so it outranks any layered rule regardless of specificity" (or
similar), matching the more precise explanation already given in the rule's own comment at
lines 431-436.

---

_Reviewed: 2026-09-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
