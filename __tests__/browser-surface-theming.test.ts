import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { matchesIn, sourceFiles } from './design-tokens/source-files'

// SURF-01 (11-03-PLAN.md): text selection, the text caret and content-area
// scrollbars are themed from --accent / --border / --border-strong in
// app/globals.css's @layer base. This is this repo's first
// PRESENCE-direction guard -- every other guard built on matchesIn/
// sourceFiles in this codebase (background-inset-absence.test.ts,
// token-palette-literals.test.ts, etc.) asserts a pattern's ABSENCE
// (toHaveLength(0)). This guard asserts the opposite: that each of the
// three SURF-01 rules exists and resolves against the named tokens.
//
// Scope limit (disclosed, not hidden): this guard proves the three rules
// are PRESENT in source and resolve against the correct custom properties.
// It does NOT prove they render correctly in a browser -- it does not
// instantiate a DOM, compute a style, or take a screenshot. Visual
// confirmation of the selection wash's legibility and the scrollbar's
// appearance in both themes is a screenshot-gate matter, handled in 11-05.
// A green result here must not be read as "every scrollable region in the
// app was audited" -- the universal selector's reach into modals,
// dropdowns and horizontally-scrolling tables is a property of the CSS
// selector itself, not something this text-scan measures region by region.
//
// Because this guard's assertion direction is inverted from its siblings,
// its own vacuous-pass failure mode is inverted too: a sibling absence
// guard degenerates dangerously if it silently scans nothing (an empty
// result reads as "clean" either way). A presence guard degenerates the
// opposite way -- scanning a renamed or missing file would also silently
// return zero matches, but here zero matches means FAIL, not pass. The
// last test below (copied verbatim from background-inset-absence.test.ts)
// guards the shared sourceFiles() primitive itself: it must fail loud and
// name the path when asked to scan a file that doesn't exist, so neither
// direction of guard can be quietly defeated by a bad path.

const globalsCssPath = path.resolve(process.cwd(), 'app/globals.css')

const SELECTION_SELECTOR_PATTERN = /::selection\b/
const SELECTION_BACKGROUND_PATTERN = /background-color:\s*hsl\(var\(--accent\)\s*\/\s*0?\.\d+\)/
const CARET_PATTERN = /caret-color:\s*hsl\(var\(--accent\)\)/
const SCROLLBAR_COLOR_PATTERN = /scrollbar-color:\s*hsl\(var\(--border\)\)\s+transparent/
const SCROLLBAR_THUMB_PATTERN = /\*::-webkit-scrollbar-thumb\b/
const SCROLLBAR_HOVER_PATTERN = /hsl\(var\(--border-strong\)\)/

describe('browser surface theming (SURF-01)', () => {
  it('themes ::selection from --accent with a slash-alpha background expression', () => {
    const selectorMatches = matchesIn([globalsCssPath], SELECTION_SELECTOR_PATTERN)
    expect(
      selectorMatches.length,
      'expected a ::selection rule in app/globals.css'
    ).toBeGreaterThan(0)

    const backgroundMatches = matchesIn([globalsCssPath], SELECTION_BACKGROUND_PATTERN)
    expect(
      backgroundMatches.length,
      'expected ::selection background-color to resolve to hsl(var(--accent) / <alpha>)'
    ).toBeGreaterThan(0)
  })

  it('sets caret-color to the bare accent token (no alpha) on html', () => {
    const matches = matchesIn([globalsCssPath], CARET_PATTERN)
    expect(
      matches.length,
      'expected caret-color: hsl(var(--accent)) in app/globals.css'
    ).toBeGreaterThan(0)
  })

  it('themes the universal scrollbar rule from --border and --border-strong', () => {
    const colorMatches = matchesIn([globalsCssPath], SCROLLBAR_COLOR_PATTERN)
    expect(
      colorMatches.length,
      'expected scrollbar-color: hsl(var(--border)) transparent in app/globals.css'
    ).toBeGreaterThan(0)

    const thumbMatches = matchesIn([globalsCssPath], SCROLLBAR_THUMB_PATTERN)
    expect(
      thumbMatches.length,
      'expected a universal *::-webkit-scrollbar-thumb rule in app/globals.css'
    ).toBeGreaterThan(0)

    const hoverMatches = matchesIn([globalsCssPath], SCROLLBAR_HOVER_PATTERN)
    expect(
      hoverMatches.length,
      'expected hsl(var(--border-strong)) used as the scrollbar thumb hover value'
    ).toBeGreaterThan(0)
  })

  it('fails loud naming the path when a file it is asked to scan does not exist, so a renamed file cannot turn the guard into a silent pass', () => {
    expect(() => sourceFiles(['app/this-file-does-not-exist.css'])).toThrowError(
      /this-file-does-not-exist/
    )
  })
})
