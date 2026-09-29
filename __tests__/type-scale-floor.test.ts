import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import path from 'node:path'
import defaultImportedConfig from '../tailwind.config.js'
import { matchesIn, sourceFiles } from './design-tokens/source-files'

// Regression suite for TYPE-01: the 2026-09-15 audit found a 10px floor in
// theme.extend.fontSize.xs, letting functional UI text render below a
// legible size. This file makes both halves of the requirement executable:
// the theme config never defines a step under 11px, and no sub-11px
// arbitrary Tailwind class (`text-[9px]` / `text-[10px]`) survives anywhere
// under app/ or components/. Neither half may regress silently again.

// The default ESM interop over a CommonJS `module.exports = {...}` file
// normally yields the object directly under vitest/vite, but fall back to
// createRequire() if that ever resolves to undefined at runtime, rather
// than adding a type suppression.
const tailwindConfig =
  defaultImportedConfig ?? createRequire(import.meta.url)('../tailwind.config.js')

const themeExtend = tailwindConfig.theme?.extend
if (!themeExtend) {
  throw new Error('tailwind.config.js: theme.extend is missing')
}

const fontSize = themeExtend.fontSize as Record<string, [string, { lineHeight: string }]>

// Converts a CSS length string ('11px' or '0.625rem') to a px number, at
// 16px per rem, so the floor is judged on the resolved length rather than
// the raw token text (a step written as 0.625rem must be caught as 10px).
function toPx(value: string): number {
  if (value.endsWith('rem')) {
    return parseFloat(value) * 16
  }
  if (value.endsWith('px')) {
    return parseFloat(value)
  }
  throw new Error(`toPx: unrecognized CSS length unit in "${value}"`)
}

const ALIAS_PAIRS: Array<[alias: string, semantic: string]> = [
  ['11', 'xs'],
  ['12', 'sm'],
  ['13', 'base'],
  ['14', 'md'],
  ['16', 'lg'],
  ['18', 'xl'],
  ['20', '2xl'],
  ['24', '3xl'],
  ['32', '4xl'],
  ['42', '5xl'],
]

describe('tailwind fontSize scale (TYPE-01)', () => {
  it("sets 'xs' to 11px", () => {
    expect(fontSize.xs[0]).toBe('11px')
  })

  it("adds a '15' step at 15px", () => {
    expect(fontSize['15']).toBeDefined()
    expect(fontSize['15'][0]).toBe('15px')
  })

  // Tailwind's own inherited default scale (unaffected by this extend
  // block) starts at 6xl (3.75rem = 60px), well above the floor. This
  // extend block is therefore the entire sub-11px surface in the theme.
  it('resolves every entry in the extend block to at least 11 CSS px', () => {
    for (const [key, tuple] of Object.entries(fontSize)) {
      const px = toPx(tuple[0])
      expect(px, `fontSize key "${key}" resolves to ${px}px (raw: "${tuple[0]}")`).toBeGreaterThanOrEqual(11)
    }
  })

  it.each(ALIAS_PAIRS)('pixel-named alias "%s" matches its semantic twin "%s"', (aliasKey, semanticKey) => {
    const alias = fontSize[aliasKey]
    const semantic = fontSize[semanticKey]
    expect(alias, `missing pixel-named alias '${aliasKey}'`).toBeDefined()
    expect(semantic, `missing semantic step '${semanticKey}'`).toBeDefined()
    expect(alias).toEqual(semantic)
  })
})

describe('sub-11px arbitrary sizes (TYPE-01)', () => {
  // Widened in 09-03 Task 2 (D-03) from the literal (9|10) pair to any
  // arbitrary pixel value below 11, after the two 8px sites in
  // BossSection.tsx proved a value the literal pair did not cover. Matches
  // a single digit (0-9) or the literal 10, each anchored immediately
  // before 'px]' so no multi-digit value (e.g. 80, 108) can partially match.
  const SUB_11_PATTERN = /text-\[(?:[0-9]|10)px\]/
  // The reintroduction vector RESEARCH.md named (Pitfall 4): a literal-string
  // scan is bypassed the moment a site builds the pixel value from a
  // variable instead of a literal, e.g. className={`text-[${n}px]`}. This
  // pattern catches that bypass so the literal scan above cannot quietly
  // stop being sufficient.
  const DYNAMIC_INTERPOLATION_PATTERN = /text-\[\$\{/
  const SCAN_ROOTS = ['app', 'components']

  it('finds no sub-11px arbitrary size anywhere under app/ or components/', () => {
    const files = sourceFiles(SCAN_ROOTS)
    const matches = matchesIn(files, SUB_11_PATTERN)
    const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
    expect(matches, report).toHaveLength(0)
  })

  it('finds no dynamically-interpolated text-[...px] size anywhere under app/ or components/, confirming the literal scan is not bypassable', () => {
    const files = sourceFiles(SCAN_ROOTS)
    const matches = matchesIn(files, DYNAMIC_INTERPOLATION_PATTERN)
    const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
    expect(matches, report).toHaveLength(0)
  })

  it('throws an Error naming the root when sourceFiles is given a path that does not exist', () => {
    expect(() => sourceFiles(['this-root-does-not-exist'])).toThrowError(/this-root-does-not-exist/)
  })

  it('treats a zero-match result as a pass rather than an error (scanned-and-clean, not scanned-nothing)', () => {
    const sidebarPath = path.resolve(process.cwd(), 'app/components/Sidebar.tsx')
    const matches = matchesIn([sidebarPath], /this-pattern-should-never-match-anything-xyz123/)
    expect(matches).toEqual([])
  })
})

describe('label.tsx and typography.tsx arbitrary pixel sizes (TYPE-02)', () => {
  it('finds no text-[Npx] arbitrary size in components/ui/label.tsx or components/ui/typography.tsx', () => {
    const files = [
      path.resolve(process.cwd(), 'components/ui/label.tsx'),
      path.resolve(process.cwd(), 'components/ui/typography.tsx'),
    ]
    const matches = matchesIn(files, /text-\[\d+px\]/)
    const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
    expect(matches, report).toHaveLength(0)
  })
})

describe('LabelText and section-label repo-wide scan (PRIM-02)', () => {
  it('finds no LabelText or section-label reference anywhere under app/ or components/', () => {
    const files = sourceFiles(['app', 'components'])
    const matches = matchesIn(files, /LabelText|section-label/)
    const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
    expect(matches, report).toHaveLength(0)
  })
})
