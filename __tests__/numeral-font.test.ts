import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { matchesIn, sourceFiles } from './design-tokens/source-files'

// G-11-1 (11-06-PLAN.md): a regression tripwire for the wiring that this
// plan's own acceptance instrument -- scripts/visual/numeral-probe.mjs,
// `npm run visual:numerals` -- cannot exercise inside this suite, because
// it requires a running dev server and a real browser. Five structural
// assertions: the --font-tabular variable is declared in app/layout.tsx,
// it reaches the same className string that carries the other font
// variables, .tabular-nums resolves it to a family in app/globals.css,
// that family rule sits outside every cascade layer (the structural
// assertion that is the real point of this guard -- it is what stops a
// future tidy-up from moving the rule into a layer and silently
// re-breaking the fix), and no call site under app/ or components/ carries
// the numerals class together with a Tailwind font-family utility.
//
// Scope limit (disclosed, not hidden): this guard proves the wiring is
// PRESENT and correctly PLACED in source. It does not instantiate a DOM,
// compute a style, or measure a rendered glyph. A green result here is
// NOT evidence that numerals render tabular -- that substitution is
// precisely what let G-11-1 ship in the first place. The evidence for
// rendering is scripts/visual/numeral-probe.mjs (`npm run
// visual:numerals`), which cannot run in this suite. See
// __tests__/browser-surface-theming.test.ts for this repo's original
// presence-direction guard, whose conventions this file follows.

const layoutPath = path.resolve(process.cwd(), 'app/layout.tsx')
const globalsCssPath = path.resolve(process.cwd(), 'app/globals.css')

const VARIABLE_DECLARED_PATTERN = /variable:\s*["']--font-tabular["']/
const UNLAYERED_MARKER = 'outside layers for higher specificity'
const CALL_SITE_TABULAR_NUMS_PATTERN = /tabular-nums/
const FAMILY_UTILITY_PATTERN = /font-(poppins|sans|mono|wow)\b/

describe('numeral font wiring (G-11-1)', () => {
  it('declares the --font-tabular variable in a font declaration', () => {
    const matches = matchesIn([layoutPath], VARIABLE_DECLARED_PATTERN)
    expect(
      matches.length,
      'expected a `variable: "--font-tabular"` font declaration in app/layout.tsx'
    ).toBeGreaterThan(0)
  })

  it('mounts --font-tabular on the same className string that carries the other font variables', () => {
    const content = fs.readFileSync(layoutPath, 'utf8')
    const lines = content.split('\n')
    const classNameLine = lines.find(
      (l) => l.includes('poppins.variable') && l.includes('frizQuadrata.variable')
    )
    expect(
      classNameLine,
      'expected to find the className line carrying poppins.variable and frizQuadrata.variable in app/layout.tsx'
    ).toBeDefined()
    expect(
      classNameLine?.includes('figtree.variable'),
      'expected figtree.variable on the same className string as the other font variables -- a variable declared but never mounted is undefined at the class and the family falls back silently'
    ).toBe(true)
  })

  it('gives .tabular-nums a font-family that resolves to var(--font-tabular)', () => {
    const content = fs.readFileSync(globalsCssPath, 'utf8')
    expect(
      /\.tabular-nums\s*\{\s*\n\s*font-family:\s*var\(--font-tabular\)/.test(content),
      'expected `.tabular-nums {` immediately followed by a `font-family: var(--font-tabular)` declaration in app/globals.css'
    ).toBe(true)
  })

  it('places the family rule outside every cascade layer, below the unlayered section marker', () => {
    const lines = fs.readFileSync(globalsCssPath, 'utf8').split('\n')
    const markerLine = lines.findIndex((l) => l.includes(UNLAYERED_MARKER))
    expect(
      markerLine,
      `expected to find the "${UNLAYERED_MARKER}" section marker in app/globals.css`
    ).toBeGreaterThanOrEqual(0)

    const ruleLine = lines.findIndex(
      (l, i) => i > markerLine && /font-family:\s*var\(--font-tabular/.test(l)
    )
    expect(
      ruleLine,
      'expected the .tabular-nums font-family rule to sit below the unlayered section marker -- a layered declaration loses to any same-element Tailwind family utility, which is how the declaration this repairs became silently inert'
    ).toBeGreaterThan(markerLine)
  })

  it('finds no call site where the numerals class collides with a Tailwind font-family utility', () => {
    const files = sourceFiles(['app', 'components']).filter((f) => f.endsWith('.tsx'))
    const matches = matchesIn(files, CALL_SITE_TABULAR_NUMS_PATTERN).filter((m) =>
      FAMILY_UTILITY_PATTERN.test(m.text)
    )
    const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
    expect(
      matches,
      report || 'expected zero .tabular-nums call sites carrying a Tailwind font-family utility on the same line'
    ).toHaveLength(0)
  })

  it('fails loud naming the path when a file it is asked to scan does not exist, so a renamed file cannot turn the guard into a silent pass', () => {
    expect(() => sourceFiles(['app/this-file-does-not-exist.css'])).toThrowError(
      /this-file-does-not-exist/
    )
  })
})
