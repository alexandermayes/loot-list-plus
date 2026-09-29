# Phase 11: Reading and Browser Surfaces - Pattern Map

**Mapped:** 2026-09-21
**Files analyzed:** 16 (1 CSS file, 12 call-site page files, 3 new Wave-0 test files, 1 script)
**Analogs found:** 16 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/globals.css` (`.prose-measure` addition, `@layer components`) | config (CSS) | transform (static rule) | `app/globals.css:596-610` (`.nav-item-active`, `.card-gradient`) | exact — same file, same layer |
| `app/globals.css` (`::selection`, `caret-color` addition, `@layer base`) | config (CSS) | transform (static rule) | `app/globals.css:317-319` (`html { scrollbar-gutter: stable }`) | exact — extending the same selector block |
| `app/globals.css` (universal scrollbar rule, `@layer base`) | config (CSS) | transform (static rule) | `app/globals.css:367-390` (`.sidebar-scrollable::-webkit-scrollbar*`) | exact — verbatim value reuse, generalized selector |
| `app/globals.css` (`[data-score]` deletion) | config (CSS) | transform (static rule) | same file, `td, th, [data-score], .tabular-nums` block (lines 325-330) | exact — in-place edit |
| `app/blog/*/page.tsx` ×9 (wrapper className swap) | component (page) | request-response (static render) | `app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx` (this file itself is the analog for the other 8 — byte-identical structure) | exact |
| `app/research/wow-classic-loot-systems-2026/page.tsx:410` (wrapper className swap) | component (page) | request-response (static render) | any of the 9 blog post files (identical wrapper shape) | exact |
| `app/compare/page.tsx:127` (wrapper className swap) | component (page) | request-response (static render) | blog post files (same `max-w-*-mx-auto` wrapper convention, different width) | role-match |
| `app/pricing/page.tsx:152` (inline `<p>` className addition, no `mx-auto`) | component (page) | request-response (static render) | `app/pricing/page.tsx` itself — FAQ `.map()` block at lines 146-153 | exact (self-contained, no external analog needed) |
| `__tests__/prose-measure.test.ts` | test | transform (text-scan guard) | `__tests__/background-inset-absence.test.ts` | exact — absence-guard shape; needs an added presence-assertion (new pattern, see below) |
| `__tests__/browser-surface-theming.test.ts` | test | transform (text-scan guard, presence) | `__tests__/background-inset-absence.test.ts` (structure) + `__tests__/token-palette-literals.test.ts` (header-comment convention) | role-match — no existing presence-only guard in repo; this is the first one, built from the same primitives |
| `__tests__/data-score-absence.test.ts` | test | transform (text-scan guard, absence + sibling-survival) | `__tests__/background-inset-absence.test.ts` | exact — near-identical structure (absence of one selector, survival of siblings) |
| `scripts/visual/baseline.mjs` (`PAGES` array, 4 new entries) | config/script | batch (screenshot capture) | same file — Phase 10's own precedent of appending `master-sheet`/`raid-tracking`/`profile` entries | exact — same array, same append pattern |

## Pattern Assignments

### `app/globals.css` — `.prose-measure` (config, transform)

**Analog:** `app/globals.css:596-610` (`@layer components` block)

**Core pattern to copy** (lines 596-610, verified live):
```css
@layer components {
  /* Nav item active state */
  .nav-item-active {
    background-color: hsl(var(--accent) / 0.2);
    border: 0.5px solid hsl(var(--accent) / 0.2);
    color: hsl(var(--accent));
  }

  /* Card with gradient (from Figma - guild/character selectors) */
  .card-gradient {
    background: linear-gradient(90deg, hsl(var(--background-elevated)) 0%, hsl(var(--background-elevated)) 100%);
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
  }
}
```
New rule to add in the same block, same single-purpose named-class convention (comment above the rule, one declaration, no nesting):
```css
  /* Reading measure for long-form prose (TYPE-04). Controls width only —
     the existing prose typography block (colors, margins, per-element
     overrides) is untouched and lives at each call site as it always has. */
  .prose-measure {
    max-width: 70ch;
  }
```

### `app/globals.css` — `::selection` / `caret-color` (config, transform)

**Analog:** `app/globals.css:317-319` (existing `html` rule, to extend in place, not duplicate)
```css
  html {
    scrollbar-gutter: stable;
  }
```
Extend to:
```css
  html {
    scrollbar-gutter: stable;
    caret-color: hsl(var(--accent));
  }
```
Add a sibling top-level rule inside `@layer base` (not nested under `html`, since `::selection` is its own selector) mirroring the file's flat-rule style used by `a[data-wowhead]` etc.:
```css
  ::selection {
    background-color: hsl(var(--accent) / 0.3);
  }
```

### `app/globals.css` — universal scrollbar rule (config, transform)

**Analog:** `app/globals.css:367-390` (`.sidebar-scrollable` block — values to copy verbatim, selector to generalize)
```css
  /* Custom scrollbar styles */
  .sidebar-scrollable::-webkit-scrollbar {
    width: 6px;
  }

  .sidebar-scrollable::-webkit-scrollbar-track {
    background: transparent;
  }

  .sidebar-scrollable::-webkit-scrollbar-thumb {
    background: hsl(var(--border));
    border-radius: 3px;
  }

  .sidebar-scrollable::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--border-strong));
  }

  /* Firefox scrollbar */
  .sidebar-scrollable {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--border)) transparent;
  }
```
Replace `.sidebar-scrollable` selectors with `*` (per UI-SPEC's locked mechanism), add `height: 6px` alongside `width: 6px` on the base `::-webkit-scrollbar` rule (new addition, no existing analog for the height line — the sidebar rule was vertical-only).

### `app/globals.css` — `[data-score]` deletion (config, transform)

**Before** (lines 325-330, exact live text):
```css
  td, th,
  [data-score],
  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }
```
**After:**
```css
  td, th,
  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }
```

### `app/blog/*/page.tsx` ×9, `app/research/.../page.tsx`, `app/compare/page.tsx` — wrapper className swap (component, request-response)

**Analog:** `app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx:122` (verbatim structure repeated across all 9 blog posts and, with a different outer width, research/compare)
```tsx
<div className="max-w-3xl mx-auto">
  {/* Breadcrumb */}
  <nav className="mb-8 text-sm text-foreground-secondary">...</nav>
  <header className="mb-12">...</header>
  <div className="prose prose-invert prose-lg max-w-none [&_h2]:... [&_p]:...">
    ...
  </div>
</div>
```
Diff: replace `className="max-w-3xl mx-auto"` (or `max-w-4xl mx-auto` on `compare`) with `className="prose-measure mx-auto"`. **Only the outer wrapper's className string changes** — the inner `prose prose-invert prose-lg ...` div's className is untouched (D-01, verbatim). No other JSX structure changes on any of these 11 files; this is a single-attribute string edit per file.

### `app/pricing/page.tsx` — FAQ answer inline `<p>` (component, request-response)

**Analog:** the file's own FAQ block, lines 146-153 (verified live):
```tsx
{FAQ.map(({ q, a }) => (
  <div key={q}>
    <h3 className="font-poppins font-semibold text-16 text-white mb-2">{q}</h3>
    <p className="font-poppins text-15 text-[#bababa] leading-relaxed">{a}</p>
  </div>
))}
```
Diff (D-03): the `<p>`'s className becomes `"font-poppins text-15 text-[#bababa] leading-relaxed prose-measure"` — append only, no `mx-auto` (this `<p>` is not centered; it sits flush-left under its own `<h3>` inside `<div key={q}>`, unlike the 11 wrapper sites above). The `text-[#bababa]` literal is left untouched (out of scope, flagged in CONTEXT.md's Deferred Ideas for Phase 12).

### `__tests__/prose-measure.test.ts` (test, transform)

**Analog:** `__tests__/background-inset-absence.test.ts` (full structure to copy)

**Imports pattern** (line 1-5 of analog):
```typescript
import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { matchesIn, sourceFiles } from './design-tokens/source-files'
```

**Presence assertion** (new half — this class must exist, unlike every existing guard which only asserts absence):
```typescript
const globalsCssPath = path.resolve(process.cwd(), 'app/globals.css')

it('finds .prose-measure { max-width: 70ch } in app/globals.css', () => {
  const matches = matchesIn([globalsCssPath], /\.prose-measure\s*\{/)
  expect(matches.length, 'expected a .prose-measure rule in app/globals.css').toBeGreaterThan(0)
  const widthMatches = matchesIn([globalsCssPath], /max-width:\s*70ch/)
  expect(widthMatches.length, 'expected max-width: 70ch inside .prose-measure').toBeGreaterThan(0)
})
```

**Absence + explicit-file-list assertion** (copy `background-inset-absence.test.ts`'s exact shape, lines 58-64 and 103-107, but with an explicit array of the 12 named files instead of `sourceFiles(SCAN_ROOTS)` over a directory — this is the Pattern 3 / Pitfall 2 correctness requirement from RESEARCH.md, critical: do not scan `app/blog` as a directory, it will false-positive on `app/blog/page.tsx:136`):
```typescript
const SCANNED_PATHS = [
  'app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx',
  // ...8 more named blog post files, exact 9...
  'app/research/wow-classic-loot-systems-2026/page.tsx',
  'app/compare/page.tsx',
  'app/pricing/page.tsx',
]

it('finds no max-w-3xl mx-auto / max-w-4xl mx-auto literal on the 12 named call sites', () => {
  const files = SCANNED_PATHS.map((p) => path.resolve(process.cwd(), p))
  const matches = matchesIn(files, /max-w-(3xl|4xl)\s+mx-auto/)
  const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
  expect(matches, report).toHaveLength(0)
})

it('fails loud naming the path when a file it is asked to scan does not exist', () => {
  expect(() => sourceFiles(['app/this-file-does-not-exist.tsx'])).toThrowError(
    /this-file-does-not-exist/
  )
})
```

### `__tests__/browser-surface-theming.test.ts` (test, transform — presence guard, new pattern)

**Analog:** `__tests__/background-inset-absence.test.ts` (structural shape) — inverted assertion direction, no exact repo precedent for a presence-only guard, per RESEARCH.md's own Pattern 2 callout.
```typescript
import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { matchesIn } from './design-tokens/source-files'

const globalsCssPath = path.resolve(process.cwd(), 'app/globals.css')

describe('browser surface theming (SURF-01)', () => {
  it('themes ::selection from --accent', () => {
    const matches = matchesIn([globalsCssPath], /::selection/)
    expect(matches.length, 'expected a ::selection rule in app/globals.css').toBeGreaterThan(0)
  })

  it('sets caret-color to hsl(var(--accent)) on html', () => {
    const matches = matchesIn([globalsCssPath], /caret-color:\s*hsl\(var\(--accent\)\)/)
    expect(matches.length).toBeGreaterThan(0)
  })

  it('themes the universal scrollbar rule from --border / --border-strong', () => {
    const colorMatches = matchesIn([globalsCssPath], /scrollbar-color:\s*hsl\(var\(--border\)\)/)
    expect(colorMatches.length).toBeGreaterThan(0)
    const hoverMatches = matchesIn([globalsCssPath], /hsl\(var\(--border-strong\)\)/)
    expect(hoverMatches.length).toBeGreaterThan(0)
  })
})
```

### `__tests__/data-score-absence.test.ts` (test, transform — absence + sibling-survival)

**Analog:** `__tests__/background-inset-absence.test.ts` lines 66-76 and 78-101 (the "siblings survive" idiom is the load-bearing part — a guard asserting `[data-score]` is gone must also assert `td, th,`/`.tabular-nums` did not get deleted along with it)
```typescript
import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { matchesIn } from './design-tokens/source-files'

const globalsCssPath = path.resolve(process.cwd(), 'app/globals.css')

describe('data-score absence guard (SURF-02)', () => {
  it('finds no [data-score] selector in app/globals.css', () => {
    const matches = matchesIn([globalsCssPath], /\[data-score\]/)
    const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
    expect(matches, report).toHaveLength(0)
  })

  it('the td, th, and .tabular-nums siblings survive the deletion', () => {
    expect(matchesIn([globalsCssPath], /\btd,\s*th,/).length).toBeGreaterThan(0)
    expect(matchesIn([globalsCssPath], /\.tabular-nums\s*\{/).length).toBeGreaterThan(0)
  })
})
```

### `scripts/visual/baseline.mjs` — `PAGES` array extension (config/script, batch)

**Analog:** the file's own `PAGES` array (current state, lines ~110-118, verified live) and its own header-comment precedent for Phase 10's addition of `master-sheet`/`raid-tracking`/`profile`.
```javascript
const PAGES = [
  { name: 'home', path: '/', auth: false },
  { name: 'overview', path: '/overview', auth: true },
  { name: 'guild-settings', path: '/guild-settings', auth: true, afterGoto: expandExpansionSchedule },
  { name: 'loot-management', path: '/loot-management', auth: true, afterGoto: openLootSettingsModal },
  { name: 'master-sheet', path: '/master-sheet', auth: true },
  { name: 'raid-tracking', path: '/raid-tracking', auth: true },
  { name: 'profile', path: '/profile', auth: true },
]
```
Append (all `auth: false`, no `afterGoto` needed per RESEARCH.md Pitfall 1):
```javascript
  { name: 'blog-post', path: '/blog/dkp-is-dead-what-classic-guilds-use-in-2026', auth: false },
  { name: 'research', path: '/research/wow-classic-loot-systems-2026', auth: false },
  { name: 'compare', path: '/compare', auth: false },
  { name: 'pricing', path: '/pricing', auth: false },
```
Update the file's own header-comment page/image count (currently "7 pages x 2 themes x 2 widths = 28 images") to "11 pages x 2 themes x 2 widths = 44 images", matching the convention Phase 10 followed when it updated the same comment for its own 3-page addition.

## Shared Patterns

### Text-scan guard scaffolding (all 3 new test files)
**Source:** `__tests__/design-tokens/source-files.ts` (`sourceFiles`, `matchesIn`)
**Apply to:** `prose-measure.test.ts`, `browser-surface-theming.test.ts`, `data-score-absence.test.ts`
Every guard in this repo imports these two helpers rather than hand-rolling a file walk or regex scan. `matchesIn` strips a global flag internally to avoid `lastIndex` bugs across repeated calls — do not construct a fresh `RegExp` per call site expecting different behavior, it already handles reuse safely.

### Explicit-file-list scope discipline (TYPE-04 guard only)
**Source:** RESEARCH.md Pattern 3 / Pitfall 2, `__tests__/token-palette-literals.test.ts`'s `SCAN_ROOTS`/explicit-list precedent
**Apply to:** `prose-measure.test.ts`'s absence assertion
Never scan `app/blog` as a directory root for the `max-w-3xl mx-auto` absence check — `app/blog/page.tsx:136` (the index/listing page) shares the literal for an unrelated reason (centering a card grid) and is explicitly out of scope. Always enumerate the 9 blog post files + research + compare + pricing by exact path.

### `@layer` placement convention
**Source:** `app/globals.css`'s own existing structure — `@layer base` (lines ~311-391) for element/pseudo-state rules, `@layer components` (lines ~595-611) for single-purpose named classes
**Apply to:** all `app/globals.css` edits in this phase
`.prose-measure` goes in `@layer components` (matches `.nav-item-active`/`.card-gradient`'s shape); `::selection`, `caret-color`, and the universal scrollbar rule go in `@layer base` (matches `html`, `body`, the tabular-nums block, and the existing `.sidebar-scrollable` rules they are extending/generalizing).

## No Analog Found

None — every file in scope has a direct or role-match analog either elsewhere in `app/globals.css`, in an existing blog/research/compare page, in the pricing page's own FAQ block, in an existing guard test, or in `scripts/visual/baseline.mjs`'s own prior extension.

## Metadata

**Analog search scope:** `app/globals.css`, `app/blog/*/page.tsx`, `app/research/wow-classic-loot-systems-2026/page.tsx`, `app/compare/page.tsx`, `app/pricing/page.tsx`, `__tests__/*.test.ts`, `__tests__/design-tokens/source-files.ts`, `scripts/visual/baseline.mjs`
**Files scanned:** 7 read directly (globals.css, background-inset-absence.test.ts, source-files.ts, token-palette-literals.test.ts, baseline.mjs, one blog post page.tsx, pricing/page.tsx) — sufficient given UI-SPEC/RESEARCH already live-verified every other file's line numbers this session
**Pattern extraction date:** 2026-09-21
