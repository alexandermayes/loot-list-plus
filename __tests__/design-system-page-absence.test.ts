import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { matchesIn, sourceFiles } from './design-tokens/source-files'
import { loadThemeTokens, ratio } from './design-tokens/contrast'

// ENF-03 (12-04-PLAN.md), D-12 (Claude's Discretion guard, 12-CONTEXT.md):
// this guard proves the in-app design-system page names none of the five
// primitives this milestone deleted -- LabelText and .section-label
// (Phase 08), --background-inset (Phase 10), [data-score] and
// .sidebar-scrollable (Phase 11) -- in any spelling (className, CSS
// selector, code element, or prose). At the time this guard was first
// written the page still carried the known stale [data-score] sentence at
// line 1801 (WINDOWS entry 23), so this file's own first run is expected
// to fail on that one pattern before the page is fixed.
//
// Scope limit (disclosed, not hidden): this guard proves the page names no
// deleted primitive and still carries its surviving siblings. It says
// nothing about whether the page's examples look right -- that is UAT's
// job (12-04-PLAN.md's <verify><human-check> blocks), not this test's.
// Later tasks in this same plan extend this file with region-scoped
// assertions for the type scale, colour swatches, Card nested variant,
// focus ring and Modal callout -- each added alongside the page edit it
// proves, in the same shape as this first block.
//
// Absence-only assertions would pass trivially if someone emptied or
// truncated the whole page; each is paired with a sibling-survival
// assertion (tabular-nums, Text, Card, Modal) proving the file was
// meaningfully scanned, not merely empty.

const pagePath = path.resolve(
  process.cwd(),
  'app/(app)/design-system/_client.tsx'
)

const DELETED_PRIMITIVE_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'LabelText', pattern: /LabelText/ },
  { name: 'section-label', pattern: /section-label/ },
  { name: 'data-score', pattern: /data-score/ },
  { name: 'background-inset', pattern: /background-inset/ },
  { name: 'sidebar-scrollable', pattern: /sidebar-scrollable/ },
]

describe('design-system page absence guard (ENF-03, D-12)', () => {
  for (const { name, pattern } of DELETED_PRIMITIVE_PATTERNS) {
    it(`finds no "${name}" anywhere in the page (className, selector, code, or prose)`, () => {
      const matches = matchesIn([pagePath], pattern)
      const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
      expect(matches, report).toHaveLength(0)
    })
  }

  it('tabular-nums survives (sibling-survival control)', () => {
    const matches = matchesIn([pagePath], /tabular-nums/)
    expect(matches.length, 'expected tabular-nums to still appear on the page').toBeGreaterThan(0)
  })

  it('a Text element survives (sibling-survival control)', () => {
    const matches = matchesIn([pagePath], /<Text/)
    expect(matches.length, 'expected <Text to still appear on the page').toBeGreaterThan(0)
  })

  it('a Card element survives (sibling-survival control)', () => {
    const matches = matchesIn([pagePath], /<Card/)
    expect(matches.length, 'expected <Card to still appear on the page').toBeGreaterThan(0)
  })

  it('a Modal element survives (sibling-survival control)', () => {
    const matches = matchesIn([pagePath], /<Modal/)
    expect(matches.length, 'expected <Modal to still appear on the page').toBeGreaterThan(0)
  })

  it('fails loud naming the path when the page file does not exist, so a rename cannot turn this guard into a silent pass', () => {
    expect(() =>
      sourceFiles(['app/(app)/design-system/this-file-does-not-exist.tsx'])
    ).toThrowError(/this-file-does-not-exist/)
  })
})

// UI-SPEC item 1 (12-04 Task 2): the Type Scale cluster stops hand-typing a
// pixel figure per row and gains a text-15 row, per D-10 (point to
// DESIGN.md instead of re-inlining a value). Region cut by content markers
// (the subsection headers), not line numbers, since every task in this
// plan edits this same file.
describe('design-system page type-scale region (ENF-03, UI-SPEC item 1)', () => {
  const pageSource = fs.readFileSync(pagePath, 'utf8')
  const typeScaleStart = pageSource.indexOf('title="Type Scale"')
  const headingComponentStart = pageSource.indexOf('title="Heading Component"')

  it('locates both region markers', () => {
    expect(typeScaleStart).toBeGreaterThanOrEqual(0)
    expect(headingComponentStart).toBeGreaterThan(typeScaleStart)
  })

  const region = pageSource.slice(typeScaleStart, headingComponentStart)

  it('contains no hand-typed size property or pixel figure', () => {
    expect(/size:\s*'/.test(region)).toBe(false)
    expect(/\d+px/.test(region)).toBe(false)
  })

  it('lists exactly eleven rows including text-15', () => {
    const classEntries = region.match(/class: 'text-/g) || []
    expect(classEntries).toHaveLength(11)
    expect(region.includes(`'text-15'`)).toBe(true)
  })
})

// UI-SPEC item 1, cluster B (12-04 Task 2): the Text component's own
// "Sizes" preview also stops hand-typing a parenthesised pixel figure.
describe('design-system page Text Sizes cluster (ENF-03, UI-SPEC item 1 cluster B)', () => {
  const pageSource = fs.readFileSync(pagePath, 'utf8')
  const sizesCardStart = pageSource.indexOf('mb-3">Sizes</Text>')
  const sizesCardEnd = pageSource.indexOf('mb-3">Colors</Text>')

  it('has no parenthesised pixel figure in the Sizes preview', () => {
    expect(sizesCardStart).toBeGreaterThanOrEqual(0)
    expect(sizesCardEnd).toBeGreaterThan(sizesCardStart)
    const region = pageSource.slice(sizesCardStart, sizesCardEnd)
    expect(/\(\d+px\)/.test(region)).toBe(false)
  })
})

// UI-SPEC Color section and item 2 (12-04 Task 2): the standby, faction,
// quality and brand swatches, and the reading-measure example, all render
// from source rather than being hand-typed.
describe('design-system page colour and reading-measure additions (ENF-03, UI-SPEC Color section, item 2)', () => {
  const pageSource = fs.readFileSync(pagePath, 'utf8')
  const requiredStrings = [
    'bg-standby',
    'text-standby-foreground',
    'bg-alliance',
    'bg-horde',
    'QUALITY_COLORS',
    'bg-quality-epic',
    'bg-brand-wcl',
    'prose-measure',
  ]

  for (const needle of requiredStrings) {
    it(`the page contains "${needle}"`, () => {
      expect(pageSource.includes(needle)).toBe(true)
    })
  }
})

// UI-SPEC item 3 (12-04 Task 3): the parent Card contains exactly three
// variant="nested" children, demonstrating first:border-t-0.
describe('design-system page Cards nested example region (ENF-03, UI-SPEC item 3)', () => {
  const pageSource = fs.readFileSync(pagePath, 'utf8')
  const cardsStart = pageSource.indexOf('id="cards"')
  const modalsStart = pageSource.indexOf('id="modals"')

  it('the Cards section contains exactly three variant="nested" occurrences', () => {
    expect(cardsStart).toBeGreaterThanOrEqual(0)
    expect(modalsStart).toBeGreaterThan(cardsStart)
    const region = pageSource.slice(cardsStart, modalsStart)
    const occurrences = region.match(/variant="nested"/g) || []
    expect(occurrences).toHaveLength(3)
  })
})

// UI-SPEC item 5 (12-04 Task 3): the Modal callout names all six behaviours
// the existing demo already proves, including the stacked-modal case.
describe('design-system page Modal callout region (ENF-03, UI-SPEC item 5)', () => {
  const pageSource = fs.readFileSync(pagePath, 'utf8')
  const modalsStart = pageSource.indexOf('id="modals"')
  const badgesStart = pageSource.indexOf('id="badges"')

  it('the Modals section names aria-modal, ModalTitle, the tie-break commit and "topmost"', () => {
    expect(modalsStart).toBeGreaterThanOrEqual(0)
    expect(badgesStart).toBeGreaterThan(modalsStart)
    const region = pageSource.slice(modalsStart, badgesStart)
    for (const needle of ['aria-modal', 'ModalTitle', '027129cd', 'topmost']) {
      expect(region.includes(needle), `expected "${needle}" in the Modals region`).toBe(true)
    }
  })
})

// UI-SPEC item 4 (12-04 Task 3): the focus-ring caption's two ratios are
// recomputed from the tokens by this guard, not asserted as fixed strings,
// so a future --ring change turns this test red and forces the caption to
// follow (per T-12-11 in the plan's threat register).
describe('design-system page focus-ring caption recomputed against tokens (ENF-03, UI-SPEC item 4)', () => {
  const pageSource = fs.readFileSync(pagePath, 'utf8')
  const { light, dark } = loadThemeTokens()

  const lightCard = ratio(light, '--ring', '--card')
  const lightPage = ratio(light, '--ring', '--background')
  const lightModal = ratio(light, '--ring', '--background-subtle')
  const darkCard = ratio(dark, '--ring', '--card')
  const darkPage = ratio(dark, '--ring', '--background')
  const darkModal = ratio(dark, '--ring', '--background-subtle')

  it('the page names the recomputed light-mode page and modal-surface ratios verbatim', () => {
    expect(pageSource.includes(lightPage.toFixed(3))).toBe(true)
    expect(pageSource.includes(lightModal.toFixed(3))).toBe(true)
  })

  it('light ring against the card surface clears 3:1', () => {
    expect(lightCard).toBeGreaterThanOrEqual(3)
  })

  it('light ring against the page and modal surfaces falls short of 3:1', () => {
    expect(lightPage).toBeLessThan(3)
    expect(lightModal).toBeLessThan(3)
  })

  it('dark ring clears 3:1 against all three surfaces', () => {
    expect(darkCard).toBeGreaterThanOrEqual(3)
    expect(darkPage).toBeGreaterThanOrEqual(3)
    expect(darkModal).toBeGreaterThanOrEqual(3)
  })
})
