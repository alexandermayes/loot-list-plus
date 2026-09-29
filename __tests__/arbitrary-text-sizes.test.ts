import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import defaultImportedConfig from '../tailwind.config.js'
import { matchesIn, sourceFiles } from './design-tokens/source-files'
import textSizeMap from '../scripts/codemods/text-size-map.json'

// TYPE-03's guard (D-16). The type sweep migrated every arbitrary
// text-[Npx] literal under app/ and components/ onto its scale-step alias
// via scripts/codemods/text-sizes.mjs, batch by batch (09-03/09-04) with
// the ratchet ceiling lowered one commit at a time. The sweep is now
// complete: the ceiling constant is gone and the guard is a plain
// zero-match assertion that fails the moment a new arbitrary size appears.

const SCAN_ROOTS = ['app', 'components']

// The reintroduction vector RESEARCH.md named (Pitfall 4), copied verbatim
// from __tests__/type-scale-floor.test.ts rather than re-derived: a
// literal-string scan is bypassed the moment a site builds the pixel value
// from a variable instead of a literal, e.g. className={`text-[${n}px]`}.
const DYNAMIC_INTERPOLATION_PATTERN = /text-\[\$\{/

describe('arbitrary text-[Npx] sizes (TYPE-03)', () => {
  it('finds no arbitrary text size anywhere under app/ or components/', () => {
    const files = sourceFiles(SCAN_ROOTS)
    const matches = matchesIn(files, /text-\[\d+px\]/)
    const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
    expect(matches, report).toHaveLength(0)
  })

  it('finds no dynamically-interpolated text-[...px] size anywhere under app/ or components/, confirming the literal scan is not bypassable', () => {
    const files = sourceFiles(SCAN_ROOTS)
    const matches = matchesIn(files, DYNAMIC_INTERPOLATION_PATTERN)
    const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
    expect(matches, report).toHaveLength(0)
  })

  it('asserts every value in text-size-map.json resolves to a real theme.extend.fontSize key', () => {
    const tailwindConfig =
      defaultImportedConfig ?? createRequire(import.meta.url)('../tailwind.config.js')
    const themeExtend = tailwindConfig.theme?.extend
    if (!themeExtend?.fontSize) {
      throw new Error('tailwind.config.js: theme.extend.fontSize is missing')
    }
    const fontSize = themeExtend.fontSize as Record<string, unknown>

    for (const [pixelValue, aliasKey] of Object.entries(textSizeMap)) {
      expect(
        fontSize[aliasKey],
        `text-size-map.json maps ${pixelValue}px to "${aliasKey}", which is not a key of theme.extend.fontSize`
      ).toBeDefined()
    }
  })
})
