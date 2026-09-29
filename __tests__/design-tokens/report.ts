// Runnable, fixed-order contrast report (not a test suite) for COLOR-01 and
// COLOR-02. Every commit body, this plan's SUMMARY, and Phase 12's
// DESIGN.md cite the same rows in the same sequence, computed by
// ./contrast.ts, so no number in this milestone is asserted from memory.
//
// Fixed order (matches 07-DECISIONS.md's measured-baseline order): page,
// card, inset, border, border-strong, hover surface, muted text, accent
// text, standby. Within each row: dark value, then light value.
//
// A row whose token does not exist yet in a theme (accent text before
// Task 2 adds it, standby until Plan 05 adds it) prints "absent" instead of
// throwing, so this script stays runnable at every commit in the phase.
//
// Run with: npx tsx __tests__/design-tokens/report.ts

import { loadThemeTokens, ratio, type Hsl } from './contrast'

type Row = {
  label: string
  a: string
  b: string
}

const ROWS: Row[] = [
  { label: 'page', a: '--background', b: '--background-elevated' },
  { label: 'card', a: '--background-elevated', b: '--background-inset' },
  { label: 'inset', a: '--background', b: '--background-inset' },
  { label: 'border', a: '--border', b: '--background-elevated' },
  { label: 'border-strong', a: '--border-strong', b: '--background-elevated' },
  { label: 'hover surface', a: '--muted', b: '--background-elevated' },
  { label: 'muted text', a: '--foreground-muted', b: '--background-elevated' },
  { label: 'accent text', a: '--accent-text', b: '--background-elevated' },
  { label: 'standby', a: '--standby', b: '--background-elevated' },
]

function safeRatio(tokens: Record<string, Hsl>, a: string, b: string): string {
  try {
    return ratio(tokens, a, b).toFixed(3)
  } catch {
    return 'absent'
  }
}

function printReport(): void {
  const { light, dark } = loadThemeTokens()
  const lines: string[] = []
  lines.push('| pair | dark | light |')
  lines.push('|------|------|-------|')
  for (const row of ROWS) {
    const darkValue = safeRatio(dark, row.a, row.b)
    const lightValue = safeRatio(light, row.a, row.b)
    lines.push(`| ${row.label} | ${darkValue} | ${lightValue} |`)
  }
  console.log(lines.join('\n'))
}

// D-11 additional pairs (07-06, Rule 3 additive extension): the primary
// ROWS table above only measures muted text and accent text against
// --background-elevated (the card). D-11 also asks for muted text and
// accent text against the page and the sidebar in light mode, which no
// row above covers. Printed as a second, clearly separate table so the
// primary table's fixed order and every existing citation of it (commit
// bodies, SUMMARYs) stay untouched; this table exists so 07-EVIDENCE.md
// never has to type one of these numbers by hand.
const D11_EXTRA_ROWS: Row[] = [
  { label: 'muted text vs page', a: '--foreground-muted', b: '--background' },
  { label: 'muted text vs sidebar', a: '--foreground-muted', b: '--background-subtle' },
  { label: 'accent text vs page', a: '--accent-text', b: '--background' },
  { label: 'accent text vs sidebar', a: '--accent-text', b: '--background-subtle' },
]

function printD11ExtraReport(): void {
  const { light, dark } = loadThemeTokens()
  const lines: string[] = []
  lines.push('| pair | dark | light |')
  lines.push('|------|------|-------|')
  for (const row of D11_EXTRA_ROWS) {
    const darkValue = safeRatio(dark, row.a, row.b)
    const lightValue = safeRatio(light, row.a, row.b)
    lines.push(`| ${row.label} | ${darkValue} | ${lightValue} |`)
  }
  console.log('\n' + lines.join('\n'))
}

// PRIM-03 focus-ring contrast rows (08-03, Rule 3 additive extension): Input,
// Textarea and Select now share the identical focus-visible ring class Button,
// Switch, Checkbox and RadioGroup already carry. These three rows measure the
// --ring token against every surface that ring actually renders on. Light
// mode measures below 3:1 against the plain page and the modal's own surface
// (--background, --background-subtle); this is recorded here as an accepted,
// pre-existing characteristic of the --ring token shared by all five
// primitives (08-DECISIONS.md OI-3), not a defect this row set is meant to
// hide. Printed as a third, separate table so the primary ROWS table and
// D11_EXTRA_ROWS keep their existing row order and citations untouched.
const PRIM03_RING_ROWS: Row[] = [
  { label: 'focus ring vs page', a: '--ring', b: '--background' },
  { label: 'focus ring vs modal surface', a: '--ring', b: '--background-subtle' },
  { label: 'focus ring vs card', a: '--ring', b: '--background-elevated' },
]

function printPrim03Report(): void {
  const { light, dark } = loadThemeTokens()
  const lines: string[] = []
  lines.push('| pair | dark | light |')
  lines.push('|------|------|-------|')
  for (const row of PRIM03_RING_ROWS) {
    const darkValue = safeRatio(dark, row.a, row.b)
    const lightValue = safeRatio(light, row.a, row.b)
    lines.push(`| ${row.label} | ${darkValue} | ${lightValue} |`)
  }
  console.log('\n' + lines.join('\n'))
}

printReport()
printD11ExtraReport()
printPrim03Report()
