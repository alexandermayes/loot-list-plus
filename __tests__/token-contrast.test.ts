import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import {
  parseTokens,
  loadThemeTokens,
  hslToRgb,
  hexToRgb,
  relativeLuminance,
  contrastRatio,
  ratio,
} from './design-tokens/contrast'
import defaultImportedConfig from '../tailwind.config.js'

// The default ESM interop over a CommonJS `module.exports = {...}` file
// normally yields the object directly under vitest/vite, but fall back to
// createRequire() if that ever resolves to undefined at runtime, rather
// than adding a type suppression (same defensive pattern as
// type-scale-floor.test.ts).
const tailwindConfig =
  defaultImportedConfig ?? createRequire(import.meta.url)('../tailwind.config.js')

// The executable form of COLOR-01 and COLOR-02 (07-04-PLAN.md). Measured
// pre-phase failures this suite guards against: dark muted text vs card
// 3.235:1, light accent text vs a white card 3.093:1, dark page vs card
// 1.086:1 — all below the floors those two requirements set. Every ratio
// below is computed by the shared WCAG helper in ./design-tokens/contrast.ts
// and parsed straight out of app/globals.css, never asserted in prose.

describe('contrast helper', () => {
  it('tolerates an alpha-suffixed token (--accent-subtle) without throwing', () => {
    const { light, dark } = loadThemeTokens()
    expect(light['--accent-subtle']).toEqual({ h: 30, s: 100, l: 45 })
    expect(dark['--accent-subtle']).toEqual({ h: 30, s: 100, l: 50 })
  })

  it('throws an error naming the selector when the block is absent', () => {
    expect(() => parseTokens(':root { --a: 0 0% 0%; }', '.does-not-exist')).toThrowError(
      /does-not-exist/
    )
  })

  it('throws on an empty or whitespace-only block rather than yielding a vacuous token map', () => {
    expect(() => parseTokens('.empty {   \n  }', '.empty')).toThrow()
  })

  it('ratio throws an error naming the missing property rather than returning NaN or undefined', () => {
    const { dark } = loadThemeTokens()
    expect(() => ratio(dark, '--does-not-exist', '--background')).toThrowError(/--does-not-exist/)
  })

  it('reproduces the WCAG reference values: white on black is 21, a colour on itself is 1', () => {
    expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 2)
    expect(contrastRatio([128, 128, 128], [128, 128, 128])).toBe(1)
  })

  it('hexToRgb converts a 6-digit hex literal to an RGB triple', () => {
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255])
    expect(hexToRgb('000000')).toEqual([0, 0, 0])
  })

  it('hslToRgb and relativeLuminance agree with contrastRatio on a known pair', () => {
    const white = hslToRgb({ h: 0, s: 0, l: 100 })
    const black = hslToRgb({ h: 0, s: 0, l: 0 })
    expect(relativeLuminance(white)).toBeCloseTo(1, 5)
    expect(relativeLuminance(black)).toBeCloseTo(0, 5)
    expect(contrastRatio(white, black)).toBeCloseTo(21, 2)
  })
})

describe('muted text (COLOR-01)', () => {
  const { light, dark } = loadThemeTokens()

  it('dark --foreground-muted clears 4.5:1 against --background', () => {
    expect(
      ratio(dark, '--foreground-muted', '--background'),
      'dark muted vs background'
    ).toBeGreaterThanOrEqual(4.5)
  })

  it('dark --foreground-muted clears 4.5:1 against --background-elevated (the card)', () => {
    expect(
      ratio(dark, '--foreground-muted', '--background-elevated'),
      'dark muted vs card'
    ).toBeGreaterThanOrEqual(4.5)
  })

  it('dark --foreground-muted clears 4.5:1 against --background-subtle (the sidebar)', () => {
    expect(
      ratio(dark, '--foreground-muted', '--background-subtle'),
      'dark muted vs sidebar'
    ).toBeGreaterThanOrEqual(4.5)
  })

  it('light --foreground-muted clears 4.5:1 against --background', () => {
    expect(
      ratio(light, '--foreground-muted', '--background'),
      'light muted vs background'
    ).toBeGreaterThanOrEqual(4.5)
  })
})

describe('accent text (COLOR-01)', () => {
  const { light, dark } = loadThemeTokens()

  it('light --accent-text clears 4.5:1 against --background-elevated (a white card)', () => {
    expect(
      ratio(light, '--accent-text', '--background-elevated'),
      'light accent-text vs card'
    ).toBeGreaterThanOrEqual(4.5)
  })

  it('light --accent-text is strictly better than light --accent on every light surface', () => {
    for (const surface of ['--background', '--background-elevated', '--background-subtle']) {
      const accentTextRatio = ratio(light, '--accent-text', surface)
      const accentRatio = ratio(light, '--accent', surface)
      expect(accentTextRatio, `light accent-text vs ${surface} (must beat plain --accent)`).toBeGreaterThan(
        accentRatio
      )
    }
  })

  it('dark --accent-text clears 4.5:1 against --background-elevated', () => {
    expect(
      ratio(dark, '--accent-text', '--background-elevated'),
      'dark accent-text vs card'
    ).toBeGreaterThanOrEqual(4.5)
  })
})

// Tailwind's own Config type declares theme.extend.textColor/colors as
// ResolvableTo<RecursiveKeyValuePair<...>>, which may be a function rather
// than a plain object, so TypeScript refuses to index `.accent` on it
// directly. This project's own config never uses the function form, so an
// explicit assertion (not a suppression) is accurate here.
type AccentColorScale = { DEFAULT: string; foreground?: string; subtle?: string }

describe('text-accent wiring (D-06)', () => {
  const themeExtend = tailwindConfig.theme?.extend
  if (!themeExtend) {
    throw new Error('tailwind.config.js: theme.extend is missing')
  }
  const textColorExtend = themeExtend.textColor as Record<string, AccentColorScale> | undefined
  const colorsExtend = themeExtend.colors as Record<string, AccentColorScale> | undefined
  const textColorAccent = textColorExtend?.accent
  const colorsAccent = colorsExtend?.accent

  it('theme.extend.textColor.accent.DEFAULT reads --accent-text', () => {
    expect(textColorAccent?.DEFAULT).toBe('hsl(var(--accent-text))')
  })

  it('theme.extend.colors.accent.DEFAULT still reads --accent, so bg-accent/border-accent/ring-accent are unaffected', () => {
    expect(colorsAccent?.DEFAULT).toBe('hsl(var(--accent))')
  })

  it('theme.extend.textColor.accent.foreground still reads --accent-foreground, so the 9 text-accent-foreground sites keep resolving', () => {
    expect(textColorAccent?.foreground).toBe('hsl(var(--accent-foreground))')
  })
})

describe('surface and border ramp (COLOR-02)', () => {
  const { dark } = loadThemeTokens()

  it('dark --background vs --background-elevated (page vs card) clears 1.2:1', () => {
    expect(
      ratio(dark, '--background', '--background-elevated'),
      'dark page vs card'
    ).toBeGreaterThanOrEqual(1.2)
  })

  it('dark --border vs --background-elevated (border vs card) clears 1.2:1', () => {
    expect(
      ratio(dark, '--border', '--background-elevated'),
      'dark border vs card'
    ).toBeGreaterThanOrEqual(1.2)
  })

  it('dark --border-strong vs --border clears 1.3:1, so the two border tiers stay distinguishable', () => {
    expect(
      ratio(dark, '--border-strong', '--border'),
      'dark border-strong vs border'
    ).toBeGreaterThanOrEqual(1.3)
  })

  it('dark --muted is strictly lighter than --background-elevated and clears 1.12:1 against it (the hover surface stays visible on a card)', () => {
    expect(
      dark['--muted'].l,
      'dark --muted lightness vs --background-elevated lightness'
    ).toBeGreaterThan(dark['--background-elevated'].l)
    expect(
      ratio(dark, '--muted', '--background-elevated'),
      'dark hover surface vs card'
    ).toBeGreaterThanOrEqual(1.12)
  })

  it('dark --card, --popover and --secondary are all exactly equal to --background-elevated, so the card family cannot drift apart', () => {
    expect(dark['--card']).toEqual(dark['--background-elevated'])
    expect(dark['--popover']).toEqual(dark['--background-elevated'])
    expect(dark['--secondary']).toEqual(dark['--background-elevated'])
  })

  it('dark --background and --background-subtle are byte-identical to their pre-phase values (the page and sidebar were not lifted)', () => {
    expect(dark['--background']).toEqual({ h: 230, s: 18, l: 3 })
    expect(dark['--background-subtle']).toEqual({ h: 225, s: 15, l: 5 })
  })

  it('dark --foreground-muted still clears 4.5:1 against the newly lifted --background-elevated (the paired L13%/53% assertion)', () => {
    expect(
      ratio(dark, '--foreground-muted', '--background-elevated'),
      'dark muted vs lifted card'
    ).toBeGreaterThanOrEqual(4.5)
  })

  it('ratio on a property absent from the .dark block throws naming both the block context and the missing property', () => {
    expect(() => ratio(dark, '--foreground-muted', '--does-not-exist', 'dark ramp probe')).toThrowError(
      /--does-not-exist/
    )
    expect(() => ratio(dark, '--foreground-muted', '--does-not-exist', 'dark ramp probe')).toThrowError(
      /dark ramp probe/
    )
  })
})

// The standby state (COLOR-06, D-07) replaces three duplicated Tailwind
// `orange-500` literals in raid tracking. `orange-500` is #f97316 — the
// literal being replaced, not a value this milestone introduces.
describe('standby token (COLOR-06)', () => {
  const { light, dark } = loadThemeTokens()
  const orangeLiteral = hexToRgb('#f97316')

  it('dark --standby clears 4.5:1 against --background-elevated (the card)', () => {
    expect(
      ratio(dark, '--standby', '--background-elevated'),
      'dark standby vs card'
    ).toBeGreaterThanOrEqual(4.5)
  })

  it('dark --standby clears 4.5:1 against --background (the page)', () => {
    expect(
      ratio(dark, '--standby', '--background'),
      'dark standby vs page'
    ).toBeGreaterThanOrEqual(4.5)
  })

  it('--standby-foreground clears 4.5:1 against --standby in both themes (the only surface where standby is a fill with text on it)', () => {
    expect(
      ratio(dark, '--standby-foreground', '--standby'),
      'dark standby-foreground vs standby'
    ).toBeGreaterThanOrEqual(4.5)
    expect(
      ratio(light, '--standby-foreground', '--standby'),
      'light standby-foreground vs standby'
    ).toBeGreaterThanOrEqual(4.5)
  })

  it('dark --standby measures strictly more than the orange-500 literal it replaces, on both the card and the page', () => {
    const cardRatio = contrastRatio(orangeLiteral, hslToRgb(dark['--background-elevated']))
    const pageRatio = contrastRatio(orangeLiteral, hslToRgb(dark['--background']))
    expect(
      ratio(dark, '--standby', '--background-elevated'),
      'dark standby vs card beats orange-500 vs card'
    ).toBeGreaterThan(cardRatio)
    expect(
      ratio(dark, '--standby', '--background'),
      'dark standby vs page beats orange-500 vs page'
    ).toBeGreaterThan(pageRatio)
  })

  it('light --standby measures strictly more than the orange-500 literal it replaces, on both the card and the page', () => {
    const cardRatio = contrastRatio(orangeLiteral, hslToRgb(light['--background-elevated']))
    const pageRatio = contrastRatio(orangeLiteral, hslToRgb(light['--background']))
    expect(
      ratio(light, '--standby', '--background-elevated'),
      'light standby vs card beats orange-500 vs card'
    ).toBeGreaterThan(cardRatio)
    expect(
      ratio(light, '--standby', '--background'),
      'light standby vs page beats orange-500 vs page'
    ).toBeGreaterThan(pageRatio)
  })

  it('--standby hue sits strictly between --accent hue and --warning hue in both themes, so the three ambers stay distinguishable', () => {
    expect(dark['--standby'].h, 'dark standby hue > accent hue').toBeGreaterThan(dark['--accent'].h)
    expect(dark['--standby'].h, 'dark standby hue < warning hue').toBeLessThan(dark['--warning'].h)
    expect(light['--standby'].h, 'light standby hue > accent hue').toBeGreaterThan(light['--accent'].h)
    expect(light['--standby'].h, 'light standby hue < warning hue').toBeLessThan(light['--warning'].h)
  })
})
