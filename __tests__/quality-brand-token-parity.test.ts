import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import defaultImportedConfig from '../tailwind.config.js'
import { matchesIn, sourceFiles } from './design-tokens/source-files'
import { QUALITY_COLORS, BRAND_COLORS } from '../lib/design-system/quality-colors'

// Parity guard for COLOR-05 (D-12/D-13, 10-03-PLAN.md): the five quality/
// brand hex values live in two places that no language-level mechanism
// keeps in sync -- lib/design-system/quality-colors.ts (a plain TS data
// module, consumed by JS/TS call sites) and tailwind.config.js's
// theme.extend.colors (consumed by Tailwind class sites). The duplication
// exists because a CJS Tailwind config cannot import a TS module, and
// importing the config into a client bundle would drag the whole
// design-system module in -- so two literal copies proven equal by
// assertion is the cheaper correct answer than either a build-time
// codegen step or a runtime bridge.
//
// This file proves two things, and only two things: the two
// representations agree (parity), and every declared constant has at
// least one real consumer under app/ or components/ (consumer
// existence -- the guard against a second lib/design-system/tokens.ts
// `discord: { 500: '#5865F2' }`, which has zero consumers anywhere in this
// codebase). It does not prove the five values are the *right* colours --
// that is the screenshot gate's job, not a unit test's.

// The default ESM interop over a CommonJS `module.exports = {...}` file
// normally yields the object directly under vitest/vite, but fall back to
// createRequire() if that ever resolves to undefined at runtime, rather
// than adding a type suppression (same defensive pattern as
// type-scale-floor.test.ts and token-contrast.test.ts).
const tailwindConfig =
  defaultImportedConfig ?? createRequire(import.meta.url)('../tailwind.config.js')

const themeExtendColorsRaw = tailwindConfig.theme?.extend?.colors
if (!themeExtendColorsRaw) {
  throw new Error('quality-brand-token-parity.test.ts: tailwind.config.js theme.extend.colors is missing')
}
const themeExtendColors = themeExtendColorsRaw as Record<string, unknown>

// Maps each TS constant key to the tailwind.config.js key that must carry
// the identical value.
const TAILWIND_KEY_MAP: Record<string, string> = {
  epic: 'quality-epic',
  uncommon: 'quality-uncommon',
  battlenet: 'brand-battlenet',
  discord: 'brand-discord',
  wcl: 'brand-wcl',
}

const ALL_CONSTANTS: Record<string, string> = { ...QUALITY_COLORS, ...BRAND_COLORS }

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

describe('quality/brand token parity (COLOR-05)', () => {
  it('deep-equals the five tailwind.config.js colour keys against QUALITY_COLORS/BRAND_COLORS', () => {
    const tailwindValues: Record<string, string | undefined> = {}
    for (const [constantKey, tailwindKey] of Object.entries(TAILWIND_KEY_MAP)) {
      const value = themeExtendColors[tailwindKey]
      tailwindValues[constantKey] = typeof value === 'string' ? value.toLowerCase() : undefined
    }

    const normalizedConstants = Object.fromEntries(
      Object.entries(ALL_CONSTANTS).map(([key, value]) => [key, value.toLowerCase()])
    )

    expect(tailwindValues).toEqual(normalizedConstants)
  })

  it('finds a real consumer under app/ or components/ for every declared constant, so no constant ships as a second dead token (precedent: lib/design-system/tokens.ts\'s unconsumed discord: { 500: \'#5865F2\' } entry, zero consumers anywhere in this codebase)', () => {
    const files = sourceFiles(['app', 'components'])
    const missing: string[] = []

    for (const constantKey of Object.keys(ALL_CONSTANTS)) {
      const tailwindKey = TAILWIND_KEY_MAP[constantKey]
      const hasClassConsumer = tailwindKey
        ? matchesIn(files, new RegExp(escapeRegExp(tailwindKey))).length > 0
        : false
      const hasImportConsumer =
        matchesIn(files, new RegExp(`(QUALITY_COLORS|BRAND_COLORS)\\.${constantKey}\\b`)).length > 0

      if (!hasClassConsumer && !hasImportConsumer) {
        missing.push(constantKey)
      }
    }

    expect(
      missing,
      `no consumer found under app/ or components/ for: ${missing.join(', ')}`
    ).toHaveLength(0)
  })

  it('fails loud naming the path when a file it is asked to scan does not exist, so a renamed file cannot turn the guard into a silent pass', () => {
    expect(() => sourceFiles(['components/ui/this-file-does-not-exist.tsx'])).toThrowError(
      /this-file-does-not-exist/
    )
  })
})
