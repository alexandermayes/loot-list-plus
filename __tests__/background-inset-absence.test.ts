import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import path from 'node:path'
import defaultImportedConfig from '../tailwind.config.js'
import { matchesIn, sourceFiles } from './design-tokens/source-files'

// COLOR-03 (10-06-PLAN.md, D-07/D-08): the --background-inset token and its
// twelve call sites are gone. Six sites (2, 3, 6, 7, 8, 10 in the phase's
// 12-site inventory) were never a real card level and were rewritten by
// 10-04 onto a plain background/border treatment. The other six --
// ProfileContent.tsx:908, DashboardContent.tsx:2239 and :2411,
// EditCharacterModal.tsx:405, and skeletons.tsx:69 and :133 -- were
// genuinely card-shaped and were converted by this plan's Task 2 onto
// `<Card variant="nested">`, the primitive Phase 09 built for exactly this
// hand-off. Task 3 then deleted the token from both its definition sites:
// the `--background-inset` custom property (`app/globals.css`, `:root` and
// `.dark`) and the `inset` key in `tailwind.config.js`'s `background`
// colour object.
//
// This guard discharges Phase 09's own hand-off (09-02-PLAN.md Task 1,
// echoed in `hand-rolled-cards.test.ts`'s header comment): the PRIM-01 card
// guard deliberately left the five then-live `bg-background-inset`
// card-shaped lines out of its own scope, on the stated basis that "Phase
// 10's own criterion 1 already asserts that token is gone". This is that
// assertion, made executable.
//
// Three assertions cover the three spellings the token can take, because a
// guard that only covered the utility-class form would let the token be
// re-added at the definition layer (the custom property or the config key)
// and go completely unnoticed until some future call site used it again:
//
//   1. The class form -- any Tailwind utility built on `background-inset`
//      (any utility prefix, any variant prefix) -- scanned across app/ and
//      components/.
//   2. The custom-property form -- the `--background-inset` declaration --
//      scanned as raw text across app/globals.css, so a reintroduction in
//      either the :root or the .dark block is caught by the same assertion.
//   3. The Tailwind config key -- the `inset` key inside
//      theme.extend.colors.background -- imported via the same
//      createRequire interop the sibling config guards use, asserting the
//      key is gone while its three sibling keys (DEFAULT, subtle, elevated)
//      still exist. Asserting the siblings survive is what makes this a
//      targeted absence test: a guard that only checked "no inset key"
//      would trivially pass if the entire background colour object were
//      deleted, which is not what this guard is verifying.
//
// Scope limit (disclosed, not hidden): this guard covers this one token, by
// name, in these three spellings. It says nothing about any other surface
// token in the ramp (background, background-subtle, background-elevated).
// A green result here must not be read as "the surface ramp has no further
// levels" -- only that --background-inset specifically has not come back.

const CLASS_PATTERN = /\b(?:[a-z-]+:)?[a-z]+-background-inset\b/
const CUSTOM_PROPERTY_PATTERN = /--background-inset\b/

const SCAN_ROOTS = ['app', 'components']

describe('background-inset absence guard (COLOR-03)', () => {
  it('finds no bg-background-inset (or any other utility built on the token) anywhere under app/ or components/', () => {
    const files = sourceFiles(SCAN_ROOTS)
    const matches = matchesIn(files, CLASS_PATTERN)
    const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
    expect(matches, report).toHaveLength(0)
  })

  it('finds no --background-inset custom-property declaration in app/globals.css', () => {
    // sourceFiles() walks directories (fs.readdirSync); globals.css is a
    // single file, so it is scanned directly via matchesIn() against its
    // resolved path, exactly as the plan's own action describes: "scan the
    // file rather than parsing it, so a declaration reintroduced in either
    // the light or the dark block is caught by the same assertion."
    const globalsCssPath = path.resolve(process.cwd(), 'app/globals.css')
    const matches = matchesIn([globalsCssPath], CUSTOM_PROPERTY_PATTERN)
    const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
    expect(matches, report).toHaveLength(0)
  })

  it('finds no inset key in tailwind.config.js\'s background colour object, while its three sibling keys survive', () => {
    const tailwindConfig =
      defaultImportedConfig ?? createRequire(import.meta.url)('../tailwind.config.js')

    const themeExtendColorsRaw = tailwindConfig.theme?.extend?.colors
    if (!themeExtendColorsRaw) {
      throw new Error(
        'tailwind.config.js: theme.extend.colors is missing -- the config was restructured; update this guard rather than reading it as a pass'
      )
    }
    const themeExtendColors = themeExtendColorsRaw as Record<string, unknown>

    const background = themeExtendColors.background as Record<string, unknown> | undefined
    if (!background) {
      throw new Error(
        'tailwind.config.js: theme.extend.colors.background is missing -- the config was restructured; update this guard rather than reading it as a pass'
      )
    }

    expect('inset' in background).toBe(false)
    expect('DEFAULT' in background).toBe(true)
    expect('subtle' in background).toBe(true)
    expect('elevated' in background).toBe(true)
  })

  it('fails loud naming the path when a file it is asked to scan does not exist, so a renamed file cannot turn the guard into a silent pass', () => {
    expect(() => sourceFiles(['app/this-file-does-not-exist.css'])).toThrowError(
      /this-file-does-not-exist/
    )
  })
})
