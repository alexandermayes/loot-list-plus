import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { matchesIn, sourceFiles } from './design-tokens/source-files'

// TYPE-04 (11-02-PLAN.md Task 3): the reading measure for long-form prose is
// a single shared class (`.prose-measure { max-width: 70ch }`, defined in
// app/globals.css's @layer components block by 11-01's tracer), applied by
// className swap at the twelve call sites this workstream touches -- nine
// blog posts, research, compare, and the pricing FAQ answer paragraph --
// never a per-page max-width literal.
//
// This guard covers both halves of the criterion: the class must exist with
// the right value (presence, the inverted assertion direction this repo's
// existing guards don't otherwise use -- see 11-RESEARCH.md Pattern 2), and
// the old per-page width literal it superseded must be gone from the eleven
// wrapper-div call sites (absence, this repo's usual guard shape).
//
// The absence check below scans an explicit eleven-file list, never a
// directory scan of app/blog. Two files that carry the exact same literal
// are deliberately EXCLUDED from that list, both for reasons unrelated to
// TYPE-04:
//
//   - app/blog/page.tsx (the blog index/listing page, not a post): its
//     `max-w-3xl mx-auto` centers a card grid, not a prose column. Scanning
//     it as part of a directory walk would either force an unwanted edit to
//     an out-of-scope page or make this guard permanently red on work this
//     plan never touches (11-RESEARCH.md Pitfall 2, 11-PATTERNS.md's
//     corrected scanned-files note).
//   - app/pricing/page.tsx: its page-level wrapper at a different line
//     legitimately carries the 896px literal plus centering plus padding
//     utilities, wrapping the *entire pricing page*, not a prose block --
//     that usage is out of this phase's scope. Only the FAQ answer
//     paragraph deep in the same file is in scope, and it cannot be proven
//     by absence (the file will always contain the page-wrapper literal),
//     so pricing's TYPE-04 participation is asserted by a separate presence
//     check instead (11-01-SUMMARY.md discrepancy 2 -- this is the plan-time
//     correction to 11-PATTERNS.md's own sketch, which had included pricing
//     in the absence list and would have made this guard red forever).
//
// Scope limit (disclosed, not hidden): this guard's absence check covers
// exactly two Tailwind width-literal spellings --
// `max-w-3xl mx-auto`/`max-w-4xl mx-auto` -- because those are the only two
// forms that were actually present on the eleven wrapper sites. A different
// width literal, an arbitrary-value width class (e.g. `max-w-[48rem]`), or
// an inline `style={{ maxWidth }}` would pass this guard untouched. A green
// result here means those eleven wrapper sites are clean of the specific
// literal that was actually there -- it does not mean the app carries no
// width constraint anywhere else.

const globalsCssPath = path.resolve(process.cwd(), 'app/globals.css')

const SCANNED_PATHS = [
  'app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx',
  'app/blog/guild-recruitment-guide-find-raiders-who-stay/page.tsx',
  'app/blog/how-to-handle-loot-drama-without-losing-raiders/page.tsx',
  'app/blog/how-to-onboard-new-raiders-without-killing-morale/page.tsx',
  'app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx',
  'app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx',
  'app/blog/loot-priority-lists-vs-loot-council/page.tsx',
  'app/blog/the-officer-burnout-problem-and-how-to-fix-it/page.tsx',
  'app/blog/why-attendance-tracking-matters-more-than-loot-rules/page.tsx',
  'app/research/wow-classic-loot-systems-2026/page.tsx',
  'app/compare/page.tsx',
]

const scannedFiles = () => SCANNED_PATHS.map((f) => path.resolve(process.cwd(), f))

describe('prose-measure guard (TYPE-04)', () => {
  it('finds .prose-measure { max-width: 70ch } in app/globals.css', () => {
    const ruleMatches = matchesIn([globalsCssPath], /\.prose-measure\s*\{/)
    expect(ruleMatches.length, 'expected a .prose-measure rule in app/globals.css').toBeGreaterThan(0)

    const widthMatches = matchesIn([globalsCssPath], /max-width:\s*70ch/)
    expect(widthMatches.length, 'expected max-width: 70ch inside .prose-measure').toBeGreaterThan(0)
  })

  it('finds no max-w-3xl mx-auto / max-w-4xl mx-auto wrapper literal on the eleven named call sites', () => {
    const matches = matchesIn(scannedFiles(), /max-w-(3xl|4xl)\s+mx-auto/)
    const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
    expect(matches, report).toHaveLength(0)
  })

  it('finds prose-measure on the pricing FAQ answer line, alongside its existing typography', () => {
    const pricingPath = path.resolve(process.cwd(), 'app/pricing/page.tsx')
    const matches = matchesIn([pricingPath], /prose-measure/)
    expect(matches.length, 'expected a prose-measure occurrence in app/pricing/page.tsx').toBeGreaterThan(0)

    const onFaqTypographyLine = matches.some((m) => m.text.includes('font-poppins'))
    expect(onFaqTypographyLine, 'expected the prose-measure occurrence to share a line with font-poppins (the FAQ answer paragraph)').toBe(true)
  })

  it('fails loud naming the path when a file it is asked to scan does not exist, so a renamed file cannot turn the guard into a silent pass', () => {
    expect(() => sourceFiles(['app/this-file-does-not-exist.tsx'])).toThrowError(
      /this-file-does-not-exist/
    )
  })
})
