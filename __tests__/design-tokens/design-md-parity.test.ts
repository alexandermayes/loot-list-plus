import { describe, it, expect } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createRequire } from 'node:module'
import { readDesignMd, parseFrontmatterSubset, sectionBody, parseTable, type YamlValue } from './design-md'
import { loadThemeTokens, hslToRgb, rgbToHex, ratio, parseTokenAlphas } from './contrast'

// tailwind.config.js is CommonJS (`module.exports`); Vitest runs ESM, so it
// is loaded through createRequire rather than a static import (12-02-PLAN.md
// Task 2 read_first: tailwind.config.js is CommonJS).
const require = createRequire(import.meta.url)
const tailwindConfig = require('../../tailwind.config.js')
const fontSizeConfig = tailwindConfig.theme.extend.fontSize as Record<string, [string, { lineHeight: string }]>
const borderRadiusConfig = tailwindConfig.theme.extend.borderRadius as Record<string, string>
const spacingConfig = tailwindConfig.theme.extend.spacing as Record<string, string>
const fontFamilySansConfig = tailwindConfig.theme.extend.fontFamily.sans as string[]

const layoutSource = fs.readFileSync(
  path.resolve(process.cwd(), 'app/layout.tsx'),
  'utf-8'
)

// 12-03 Task 1: the body-layer guard reads app/globals.css's raw text
// directly (for --radius, which parseTokens's HSL-only regex never sees,
// and for the .tabular-nums family rule) and tailwind.config.js's
// borderRadius extension.
const globalsCssSource = fs.readFileSync(
  path.resolve(process.cwd(), 'app/globals.css'),
  'utf-8'
)
const fontFamilyWowConfig = tailwindConfig.theme.extend.fontFamily.wow as string[]

// The 19 distinct pixel steps (12-01 gate item 2.6, amending D-06): Tailwind
// duplicates 10 of its fontSize keys under a purely-numeric alias (`xs`/`11`
// are twins, `sm`/`12` are twins, etc. -- see tailwind.config.js's own
// comment on this), so filtering to keys that are ENTIRELY digits yields
// exactly the 19 distinct pixel values without re-asserting each twin pair
// separately.
const NUMERIC_FONT_SIZE_KEYS = Object.keys(fontSizeConfig).filter((key) => /^\d+$/.test(key))

// ENF-01, D-04, D-05, D-06: DESIGN.md's frontmatter is a guard-enforced
// mirror of app/globals.css's `:root` (light-theme) HSL custom properties.
// This guard prevents the G-11-1 failure shape: a documented value that
// silently stops matching the code it claims to describe, with no signal
// anywhere that the two have drifted apart. "Match exactly" means equal
// after conversion (rgbToHex(hslToRgb(token))), never a string comparison
// against the hand-typed `/* #rrggbb */` comments in globals.css -- those
// comments are known to be wrong in at least one case (`--foreground`
// computes to #080a0c while its comment reads #09090c).
//
// Scope limit (disclosed, not hidden): a green result here proves the
// documented colour values equal the light-theme source after conversion.
// It says nothing about whether those colours are good, accessible, or
// complete beyond the five families asserted below -- that judgment is out
// of scope for this guard.

const COLOR_FAMILIES = ['primary', 'accent', 'background', 'foreground', 'border']

describe('DESIGN.md frontmatter parity guard (ENF-01)', () => {
  it('parses through readDesignMd and parseFrontmatterSubset', () => {
    const { frontmatter } = readDesignMd()
    const parsed = parseFrontmatterSubset(frontmatter)
    expect(parsed.name).toBeTruthy()
    expect(parsed.colors).toBeTruthy()
    expect(typeof parsed.colors).toBe('object')
  })

  it('every colors key names a :root token in app/globals.css', () => {
    const { frontmatter } = readDesignMd()
    const parsed = parseFrontmatterSubset(frontmatter)
    const colors = parsed.colors as Record<string, YamlValue>
    const { light } = loadThemeTokens()

    const unknown: string[] = []
    for (const key of Object.keys(colors)) {
      if (!(`--${key}` in light)) unknown.push(key)
    }
    expect(unknown, `DESIGN.md colors keys with no matching :root token: ${unknown.join(', ')}`).toHaveLength(0)
  })

  it('every colors value equals rgbToHex(hslToRgb(light token)) exactly', () => {
    const { frontmatter } = readDesignMd()
    const parsed = parseFrontmatterSubset(frontmatter)
    const colors = parsed.colors as Record<string, YamlValue>
    const { light } = loadThemeTokens()

    const mismatches: string[] = []
    for (const [key, documented] of Object.entries(colors)) {
      const token = light[`--${key}`]
      if (!token) continue // reported by the previous test
      const computed = rgbToHex(hslToRgb(token))
      if (documented !== computed) {
        mismatches.push(`${key}: documented="${documented}" computed="${computed}"`)
      }
    }
    expect(mismatches, `DESIGN.md colour(s) drifted from app/globals.css:\n${mismatches.join('\n')}`).toHaveLength(0)
  })

  it('covers the primary, accent, background, foreground and border families (no vacuous pass)', () => {
    const { frontmatter } = readDesignMd()
    const parsed = parseFrontmatterSubset(frontmatter)
    const colors = parsed.colors as Record<string, YamlValue>
    const keys = Object.keys(colors)

    const missingFamilies = COLOR_FAMILIES.filter(
      (family) => !keys.some((key) => key === family || key.startsWith(`${family}-`))
    )
    expect(missingFamilies, `DESIGN.md colors is missing entries for families: ${missingFamilies.join(', ')}`).toHaveLength(0)
  })

  it('fails loud naming the path when DESIGN.md does not exist, so a renamed file cannot turn this guard into a silent pass', () => {
    expect(() => readDesignMd('/tmp/this-design-md-does-not-exist.md')).toThrowError(
      /this-design-md-does-not-exist/
    )
  })

  // Task 2: typography.display/body equal Tailwind's '5xl'/'base' fontSize
  // tuples, both directions checked on rounded/spacing, and the 19-step
  // scale traced back to tailwind.config.js. The Poppins binding is a
  // source-text assertion against app/layout.tsx because next/font defines
  // the --font-poppins CSS variable outside the CSS custom-property
  // pipeline this file's other assertions walk (D-04's Figtree wrinkle
  // applies identically to Poppins).

  it('typography.display fontSize/lineHeight equal the 5xl tuple', () => {
    const { frontmatter } = readDesignMd()
    const parsed = parseFrontmatterSubset(frontmatter)
    const typography = parsed.typography as Record<string, YamlValue>
    const display = typography.display as Record<string, YamlValue>
    const [size, meta] = fontSizeConfig['5xl']
    expect(display.fontSize).toBe(size)
    expect(display.lineHeight).toBe(meta.lineHeight)
  })

  it('typography.body fontSize/lineHeight equal the base tuple', () => {
    const { frontmatter } = readDesignMd()
    const parsed = parseFrontmatterSubset(frontmatter)
    const typography = parsed.typography as Record<string, YamlValue>
    const body = typography.body as Record<string, YamlValue>
    const [size, meta] = fontSizeConfig['base']
    expect(body.fontSize).toBe(size)
    expect(body.lineHeight).toBe(meta.lineHeight)
  })

  it('both typography roles bind Poppins, which tailwind.config.js and app/layout.tsx also declare', () => {
    const { frontmatter } = readDesignMd()
    const parsed = parseFrontmatterSubset(frontmatter)
    const typography = parsed.typography as Record<string, YamlValue>
    for (const role of ['display', 'body'] as const) {
      const fontFamily = (typography[role] as Record<string, YamlValue>).fontFamily as string
      expect(fontFamily.split(',')[0].trim()).toBe('Poppins')
    }
    expect(fontFamilySansConfig[0]).toBe('var(--font-poppins)')
    expect(layoutSource).toMatch(/Poppins\(\s*\{[^}]*variable:\s*["']--font-poppins["']/)
  })

  it('rounded and Tailwind borderRadius have identical key sets and values, both directions', () => {
    const { frontmatter } = readDesignMd()
    const parsed = parseFrontmatterSubset(frontmatter)
    const rounded = parsed.rounded as Record<string, YamlValue>

    const documentedKeys = Object.keys(rounded).sort()
    const sourceKeys = Object.keys(borderRadiusConfig).sort()
    expect(documentedKeys, 'rounded key set differs from borderRadius').toEqual(sourceKeys)

    const mismatches: string[] = []
    for (const key of sourceKeys) {
      if (rounded[key] !== borderRadiusConfig[key]) {
        mismatches.push(`${key}: documented="${rounded[key]}" source="${borderRadiusConfig[key]}"`)
      }
    }
    expect(mismatches, `rounded value(s) drifted from borderRadius:\n${mismatches.join('\n')}`).toHaveLength(0)
  })

  it('spacing and the Tailwind spacing extension have identical key sets and values, both directions', () => {
    const { frontmatter } = readDesignMd()
    const parsed = parseFrontmatterSubset(frontmatter)
    const spacing = parsed.spacing as Record<string, YamlValue>

    const documentedKeys = Object.keys(spacing).sort()
    const sourceKeys = Object.keys(spacingConfig).sort()
    expect(documentedKeys, 'spacing key set differs from the spacing extension').toEqual(sourceKeys)

    const mismatches: string[] = []
    for (const key of sourceKeys) {
      if (spacing[key] !== spacingConfig[key]) {
        mismatches.push(`${key}: documented="${spacing[key]}" source="${spacingConfig[key]}"`)
      }
    }
    expect(mismatches, `spacing value(s) drifted from the spacing extension:\n${mismatches.join('\n')}`).toHaveLength(0)
  })

  it('typography.scale keys equal the 19 numeric-only fontSize keys, each value equal to its pixel size', () => {
    const { frontmatter } = readDesignMd()
    const parsed = parseFrontmatterSubset(frontmatter)
    const typography = parsed.typography as Record<string, YamlValue>
    const scale = typography.scale as Record<string, YamlValue>

    expect(NUMERIC_FONT_SIZE_KEYS).toHaveLength(19)
    const documentedKeys = Object.keys(scale).sort((a, b) => Number(a) - Number(b))
    const sourceKeys = [...NUMERIC_FONT_SIZE_KEYS].sort((a, b) => Number(a) - Number(b))
    expect(documentedKeys, 'typography.scale key set differs from the 19 numeric fontSize keys').toEqual(sourceKeys)

    const mismatches: string[] = []
    for (const key of sourceKeys) {
      const [size] = fontSizeConfig[key]
      if (scale[key] !== size) {
        mismatches.push(`${key}: documented="${scale[key]}" source="${size}"`)
      }
    }
    expect(mismatches, `typography.scale value(s) drifted from fontSize:\n${mismatches.join('\n')}`).toHaveLength(0)
  })
})

// 12-03 Task 1: the body-layer guard. D-05 puts the complete 45-token
// colour table and both themes in the body (the frontmatter above only
// asserts the light theme, per D-06), so this describe block is where dark
// mode is actually checked against source. It also covers the complete
// 29-step type table, the 11-key radius table, and every carried-forward
// contrast figure -- each recomputed from the live tokens, never read back
// from a hand-typed number.
describe('DESIGN.md body-layer guard (ENF-01, 12-03 Task 1)', () => {
  const { body } = readDesignMd()
  const { light, dark } = loadThemeTokens()
  const lightAlphas = parseTokenAlphas(globalsCssSource, ':root')
  const darkAlphas = parseTokenAlphas(globalsCssSource, '.dark')

  const colorsSection = sectionBody(body, '## Colors')
  const colorRows = parseTable(colorsSection, 'Token')

  it('the Colors table has exactly 45 data rows, one per :root colour token, and the :root/.dark token sets are identical', () => {
    const lightKeys = Object.keys(light).sort()
    const darkKeys = Object.keys(dark).sort()
    expect(lightKeys).toHaveLength(45)
    expect(darkKeys, ':root and .dark colour token sets differ').toEqual(lightKeys)

    expect(colorRows).toHaveLength(45)
    const tableTokens = colorRows.map((row) => row[0]).sort()
    expect(tableTokens, 'Colors table token set differs from :root').toEqual(lightKeys)
  })

  it('every Colors row Light/Dark hex equals rgbToHex(hslToRgb()) of :root/.dark, and Alpha matches parseTokenAlphas exactly', () => {
    const mismatches: string[] = []
    for (const [token, lightHex, darkHex, alpha] of colorRows) {
      if (!light[token] || !dark[token]) continue // reported by the previous test
      const computedLight = rgbToHex(hslToRgb(light[token]))
      const computedDark = rgbToHex(hslToRgb(dark[token]))
      if (lightHex !== computedLight) {
        mismatches.push(`${token}: Light documented="${lightHex}" computed="${computedLight}"`)
      }
      if (darkHex !== computedDark) {
        mismatches.push(`${token}: Dark documented="${darkHex}" computed="${computedDark}"`)
      }
      const hasAlpha = lightAlphas[token] !== undefined || darkAlphas[token] !== undefined
      const expectedAlpha = hasAlpha ? `${lightAlphas[token]} / ${darkAlphas[token]}` : ''
      if (alpha !== expectedAlpha) {
        mismatches.push(`${token}: Alpha documented="${alpha}" expected="${expectedAlpha}"`)
      }
    }
    expect(mismatches, `Colors table drifted from app/globals.css:\n${mismatches.join('\n')}`).toHaveLength(0)
  })

  const typographySection = sectionBody(body, '## Typography')
  const typeRows = parseTable(typographySection, 'Class')

  it('the Typography table has exactly 29 rows, its class set equals text- plus every fontSize key, and each size/line-height equals its tuple', () => {
    expect(typeRows).toHaveLength(29)
    const expectedClasses = Object.keys(fontSizeConfig)
      .map((key) => `text-${key}`)
      .sort()
    const tableClasses = typeRows.map((row) => row[0]).sort()
    expect(tableClasses, 'Typography table class set differs from fontSize').toEqual(expectedClasses)

    const mismatches: string[] = []
    for (const [cls, size, lineHeight] of typeRows) {
      const key = cls.replace(/^text-/, '')
      const [expectedSize, meta] = fontSizeConfig[key]
      if (size !== expectedSize) {
        mismatches.push(`${cls}: size documented="${size}" source="${expectedSize}"`)
      }
      if (lineHeight !== meta.lineHeight) {
        mismatches.push(`${cls}: line-height documented="${lineHeight}" source="${meta.lineHeight}"`)
      }
    }
    expect(mismatches, `Typography table drifted from fontSize:\n${mismatches.join('\n')}`).toHaveLength(0)
  })

  it('Typography names Poppins, Friz Quadrata and Figtree, each bound exactly as tailwind.config.js and app/layout.tsx declare', () => {
    expect(typographySection).toContain('--font-poppins')
    expect(typographySection).toContain('--font-wow')
    expect(typographySection).toContain('--font-tabular')
    expect(typographySection).toMatch(/Poppins/)
    expect(typographySection).toMatch(/Friz Quadrata/)
    expect(typographySection).toMatch(/Figtree/)

    // app/layout.tsx binds Figtree( to --font-tabular and localFont( with the
    // FrizQuadrata source to --font-wow (D-04's second wrinkle: next/font
    // defines these CSS variables outside the custom-property pipeline the
    // other assertions in this file walk, so they need a source-text check).
    expect(layoutSource).toMatch(/Figtree\(\s*\{[^}]*variable:\s*["']--font-tabular["']/)
    expect(layoutSource).toMatch(
      /localFont\(\s*\{[^}]*src:[^}]*FrizQuadrata[^}]*variable:\s*["']--font-wow["']/
    )
    expect(fontFamilyWowConfig[0]).toBe('var(--font-wow)')

    // app/globals.css applies var(--font-tabular) in the .tabular-nums rule
    // -- the wrinkle a globals.css-only parser cannot see if it only reads
    // custom-property declarations and never the rules that consume them.
    expect(globalsCssSource).toMatch(/\.tabular-nums\s*\{[^}]*var\(--font-tabular\)/)
  })

  const shapesSection = sectionBody(body, '## Shapes')
  const shapeRows = parseTable(shapesSection, 'Class')

  it('the Shapes table has exactly 11 rows matching borderRadius both directions, and --radius equals the lg value', () => {
    expect(shapeRows).toHaveLength(11)
    const expectedClasses = Object.keys(borderRadiusConfig)
      .map((key) => (key === 'DEFAULT' ? 'rounded' : `rounded-${key}`))
      .sort()
    const tableClasses = shapeRows.map((row) => row[0]).sort()
    expect(tableClasses, 'Shapes table class set differs from borderRadius').toEqual(expectedClasses)

    const mismatches: string[] = []
    for (const [cls, radius] of shapeRows) {
      const key = cls === 'rounded' ? 'DEFAULT' : cls.replace(/^rounded-/, '')
      const expected = borderRadiusConfig[key]
      if (radius !== expected) {
        mismatches.push(`${cls}: documented="${radius}" source="${expected}"`)
      }
    }
    expect(mismatches, `Shapes table drifted from borderRadius:\n${mismatches.join('\n')}`).toHaveLength(0)

    const radiusMatch = globalsCssSource.match(/:root\s*\{[\s\S]*?--radius:\s*([\d.]+px)/)
    if (!radiusMatch) throw new Error('could not find --radius in app/globals.css :root block')
    const sourceRadius = radiusMatch[1]
    expect(sourceRadius, '--radius drifted from borderRadius.lg').toBe(borderRadiusConfig.lg)
    expect(shapesSection).toContain(sourceRadius)
  })

  const contrastRows = parseTable(colorsSection, 'Pair')

  it('the Contrast record has 29 rows, each Ratio equal to ratio() recomputed from the current tokens to three decimals', () => {
    expect(contrastRows).toHaveLength(29)
    const mismatches: string[] = []
    for (const [pairLabel, foreground, surface, theme, documentedRatio] of contrastRows) {
      const tokens = theme === 'dark' ? dark : theme === 'light' ? light : null
      if (!tokens) {
        mismatches.push(`${pairLabel}: unknown Theme "${theme}"`)
        continue
      }
      const computed = ratio(tokens, foreground, surface, pairLabel).toFixed(3)
      if (documentedRatio !== computed) {
        mismatches.push(`${pairLabel} (${theme}): documented="${documentedRatio}" computed="${computed}"`)
      }
    }
    expect(mismatches, `Contrast record drifted from source:\n${mismatches.join('\n')}`).toHaveLength(0)
  })
})

// 12-03 Task 2: the structural guard over the whole document -- section
// order, fabricated-or-deleted-token names, the em-dash prohibition
// (CLAUDE.md), and the two remaining source-comparison tables (Elevation &
// Depth's boxShadow, Components' Motion transitionDuration).
describe('DESIGN.md structural guard (ENF-01, 12-03 Task 2)', () => {
  const { raw, body } = readDesignMd()
  const { light } = loadThemeTokens()

  const CANONICAL_HEADINGS = [
    'Overview',
    'Colors',
    'Typography',
    'Layout',
    'Elevation & Depth',
    'Shapes',
    'Components',
    "Do's and Don'ts",
  ]

  it("the file's ## headings are exactly the eight canonical headings, in order", () => {
    const headings = body
      .split(/\r?\n/)
      .filter((line) => /^##\s/.test(line))
      .map((line) => line.replace(/^##\s+/, '').trim())
    expect(headings).toEqual(CANONICAL_HEADINGS)
  })

  it('every named custom property, text- size class and rounded- class exists in source (no fabricated or deleted tokens)', () => {
    const knownTokenNames = new Set(Object.keys(light)) // == Object.keys(dark), asserted above
    const allowedNonColorProperties = new Set(['--radius'])
    const nextFontVariables = new Set(['--font-poppins', '--font-wow', '--font-tabular'])

    const propertyMatches = body.match(/--[a-zA-Z][a-zA-Z0-9-]*/g) || []
    const unknownProperties = [...new Set(propertyMatches)].filter(
      (name) =>
        !knownTokenNames.has(name) &&
        !allowedNonColorProperties.has(name) &&
        !nextFontVariables.has(name)
    )
    expect(
      unknownProperties,
      `Unknown custom properties named in DESIGN.md: ${unknownProperties.join(', ')}`
    ).toHaveLength(0)

    // Colour-suffixed classes such as text-accent are deliberately out of
    // this check's scope (12-03-PLAN.md Task 2, guard clause (i)) -- only
    // digit- or scale-keyword-suffixed size classes are fontSize keys.
    const sizeClassMatches = body.match(/\btext-(?:\d+|xs|sm|base|md|lg|xl|2xl|3xl|4xl|5xl)\b/g) || []
    const validSizeClasses = new Set(Object.keys(fontSizeConfig).map((key) => `text-${key}`))
    const unknownSizeClasses = [...new Set(sizeClassMatches)].filter(
      (cls) => !validSizeClasses.has(cls)
    )
    expect(
      unknownSizeClasses,
      `Unknown text- size classes named in DESIGN.md: ${unknownSizeClasses.join(', ')}`
    ).toHaveLength(0)

    const roundedClassMatches = body.match(/\brounded(?:-[a-zA-Z0-9]+)*\b/g) || []
    const validRoundedClasses = new Set(
      Object.keys(borderRadiusConfig).map((key) => (key === 'DEFAULT' ? 'rounded' : `rounded-${key}`))
    )
    const unknownRoundedClasses = [...new Set(roundedClassMatches)].filter(
      (cls) => !validRoundedClasses.has(cls)
    )
    expect(
      unknownRoundedClasses,
      `Unknown rounded- classes named in DESIGN.md: ${unknownRoundedClasses.join(', ')}`
    ).toHaveLength(0)
  })

  it('contains no em dash character (U+2014)', () => {
    expect(raw.includes('—')).toBe(false)
  })

  const elevationSection = sectionBody(body, '## Elevation & Depth')
  const componentsSection = sectionBody(body, '## Components')

  it('the boxShadow table in Elevation & Depth matches tailwind.config.js boxShadow, both directions', () => {
    const boxShadowConfig = tailwindConfig.theme.extend.boxShadow as Record<string, string>
    const shadowRows = parseTable(elevationSection, 'Class')
    // Table Class cells are the full Tailwind utility (`shadow-glow-accent`);
    // boxShadowConfig's own keys are the bare suffix (`glow-accent`).
    const documented: Record<string, string> = Object.fromEntries(
      shadowRows.map(([cls, value]) => [cls.replace(/^shadow-/, ''), value])
    )

    expect(Object.keys(documented).sort(), 'Shadow table class set differs from boxShadow').toEqual(
      Object.keys(boxShadowConfig).sort()
    )
    const mismatches: string[] = []
    for (const key of Object.keys(boxShadowConfig)) {
      if (documented[key] !== boxShadowConfig[key]) {
        mismatches.push(`shadow-${key}: documented="${documented[key]}" source="${boxShadowConfig[key]}"`)
      }
    }
    expect(mismatches, `Shadow table drifted from boxShadow:\n${mismatches.join('\n')}`).toHaveLength(0)
  })

  it('the Motion table in Components matches tailwind.config.js transitionDuration, both directions', () => {
    const transitionDurationConfig = tailwindConfig.theme.extend.transitionDuration as Record<string, string>
    const durationRows = parseTable(componentsSection, 'Class')
    // Table Class cells are the full Tailwind utility (`duration-fast`);
    // transitionDurationConfig's own keys are the bare suffix (`fast`).
    const documented: Record<string, string> = Object.fromEntries(
      durationRows.map(([cls, value]) => [cls.replace(/^duration-/, ''), value])
    )

    expect(
      Object.keys(documented).sort(),
      'Motion table class set differs from transitionDuration'
    ).toEqual(Object.keys(transitionDurationConfig).sort())
    const mismatches: string[] = []
    for (const key of Object.keys(transitionDurationConfig)) {
      if (documented[key] !== transitionDurationConfig[key]) {
        mismatches.push(
          `duration-${key}: documented="${documented[key]}" source="${transitionDurationConfig[key]}"`
        )
      }
    }
    expect(mismatches, `Motion table drifted from transitionDuration:\n${mismatches.join('\n')}`).toHaveLength(0)
  })
})
