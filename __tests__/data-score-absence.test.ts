import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { matchesIn, sourceFiles } from './design-tokens/source-files'

// SURF-02 (11-04-PLAN.md): the dead `[data-score]` attribute selector is
// deleted outright from the shared tabular-numerals rule in
// `app/globals.css`, not wired onto real elements. D-08 chose deletion over
// wiring because a live grep confirmed zero functional consumers of
// `[data-score]` anywhere under `app/` or `components/` -- its only other
// repo appearance was descriptive prose on the in-app design-system page
// (`app/(app)/design-system/_client.tsx:1801`), routed forward to Phase 12
// ENF-03 rather than fixed here (see `.planning/WINDOWS.md`).
//
// The survival assertions below are the load-bearing half of this guard.
// An absence-only check would pass trivially if someone deleted the entire
// `td, th, .tabular-nums { font-variant-numeric: tabular-nums }` rule block
// along with the dead selector -- a far worse outcome than `[data-score]`
// quietly coming back, since 20 files across the app hand-apply
// `.tabular-nums` and depend on that rule surviving. Asserting both
// siblings still match is what makes this a targeted absence test rather
// than a "the file still exists" tautology.
//
// Scope limit (disclosed, not hidden): this guard covers one selector in
// one file. It says nothing about whether any given numeric display in the
// app actually carries the `.tabular-nums` class -- a green result here
// must not be read as "every numeric column is aligned". D-09 explicitly
// excludes that app-wide audit from this phase; if a jittering numeric
// column is noticed elsewhere, it is named and routed forward, not folded
// into this guard's scope.

const DEAD_ATTRIBUTE_SELECTOR_PATTERN = /\[data-score\]/
const TABLE_CELL_SIBLING_PATTERN = /\btd,\s*th,/
const TABULAR_NUMS_SIBLING_PATTERN = /\.tabular-nums\s*\{/

const globalsCssPath = path.resolve(process.cwd(), 'app/globals.css')

describe('data-score absence guard (SURF-02)', () => {
  it('finds no [data-score] selector in app/globals.css', () => {
    const matches = matchesIn([globalsCssPath], DEAD_ATTRIBUTE_SELECTOR_PATTERN)
    const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
    expect(matches, report).toHaveLength(0)
  })

  it('the td, th, sibling selector survives the deletion', () => {
    const matches = matchesIn([globalsCssPath], TABLE_CELL_SIBLING_PATTERN)
    expect(matches.length, 'expected the td, th, selector pair to survive in app/globals.css').toBeGreaterThan(0)
  })

  it('the .tabular-nums sibling selector survives the deletion', () => {
    const matches = matchesIn([globalsCssPath], TABULAR_NUMS_SIBLING_PATTERN)
    expect(matches.length, 'expected the .tabular-nums class selector to survive in app/globals.css').toBeGreaterThan(0)
  })

  it('fails loud naming the path when a file it is asked to scan does not exist, so a renamed file cannot turn the guard into a silent pass', () => {
    expect(() => sourceFiles(['app/this-file-does-not-exist.css'])).toThrowError(
      /this-file-does-not-exist/
    )
  })
})
