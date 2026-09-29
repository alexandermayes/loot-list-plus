import path from 'node:path'
import { describe, it, expect } from 'vitest'
import { matchesIn, sourceFiles, type SourceMatch } from './design-tokens/source-files'

// COLOR-07 (10-02-PLAN.md), widened by ENF-02 (12-06-PLAN.md, D-08, 12-01 gate
// item 2.7's default branch, option (a)): the six purple/violet/pink gradient
// and flat-fill sites across Sidebar.tsx, AppLayout.client.tsx,
// OnboardingModal.tsx (x2), MasterSheetContent.tsx and
// ScoreComparisonModal.tsx were migrated onto the app's existing --accent
// token (D-01 through D-04). This suite is the executable form of "the
// authenticated app never regresses onto a purple, violet, pink or fuchsia
// class again" -- it fails naming the file if any of those four hue
// families reappears, at any shade and behind any variant prefix -- not
// only the six exact strings this migration removed.
//
// SCOPE WIDENED TO ALL OF app/ (D-08, ENF-02): the original SCAN_ROOTS
// (`app/(app)` and `app/components`) missed every top-level public route --
// app/reserve/join/[token]/page.tsx among them, which carried a live
// `from-purple-500 to-pink-500` avatar-fallback gradient (line 866) that
// survived this guard for the whole lifetime of COLOR-07 because it was
// never in scope. 12-05's classification gate removed the `.impeccable`
// config entry that had been separately, and incorrectly, suppressing that
// exact finding at the hook level (a different, complementary enforcement
// layer) -- this guard is the test-suite-level control for the same
// literal. YELLOW is covered by no app-wide rule until this widening: it is
// added here as its own pattern and its own assertion so a regression in
// either hue family names itself.
//
// Landing carve-out (D-05, preserved by the widening): app/components/landing/
// is filtered out of the scanned file list by a path-prefix test, not by an
// exact-file exclusion set and not by a sourceFiles() parameter, because
// marketing purple on public pages is the established public-page brand
// colour and is deliberately out of scope for this phase.
//
// RATCHET SEMANTICS (D-08, gate item 2.7's default branch): each assertion is
// a pinned per-file ceiling map, not a bare toHaveLength(0) -- the two live
// literals (app/reserve/join/[token]/page.tsx:866 purple-to-pink,
// app/components/OnboardingModal.tsx:299 a yellow gradient stop) and the
// rest of the yellow ramp are NOT migrated by this plan (gate Section 6:
// guards widen, fixes route separately -- see WINDOWS.md). `toEqual` against
// the pinned map fails BOTH when a count rises (a new literal, or a literal
// growing in an already-ceilinged file) AND when a count falls without its
// ceiling being lowered in the same commit (a fix landed without updating
// the ratchet) -- a one-sided `<=` bound would let a fixed site silently
// drift the ceiling stale. CI stays green today because the ceilings equal
// the exact measured counts as of this commit; a future migration PR must
// lower the relevant ceiling entry in the same commit that removes the
// literal, or this guard fails naming the file that changed.
//
// Scope limit (disclosed, not hidden): this guard matches ASCII Tailwind
// class-name tokens only -- a utility prefix crossed with the purple,
// violet, pink, fuchsia or yellow hue names, crossed with any standard
// numeric shade, with an optional variant prefix (hover:, focus:, dark:,
// group-hover:, and so on) and an optional alpha suffix (/NN). A colour
// introduced as a raw hex literal, an rgb()/rgba() call, an oklch() call, or
// a CSS-in-JS value passes this guard untouched. All six sites the purple
// half of this guard was originally stood up behind were literal Tailwind
// class strings, which is why a class-name guard is sufficient today -- a
// green result here must not be read as "no purple or yellow remains in the
// authenticated app by any spelling".

const UTILITY_PREFIXES = [
  'bg',
  'text',
  'border-l',
  'border-r',
  'border-t',
  'border-b',
  'border',
  'ring',
  'from',
  'via',
  'to',
  'fill',
  'stroke',
  'divide',
  'outline',
  'shadow',
  'decoration',
  'placeholder',
  'caret',
  'accent',
]

const PURPLE_HUES = ['purple', 'violet', 'pink', 'fuchsia']
const YELLOW_HUES = ['yellow']

const STANDARD_SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']

function buildHuePattern(hues: string[]): RegExp {
  return new RegExp(
    `\\b(?:[a-z-]+:)?(?:${UTILITY_PREFIXES.join('|')})-(?:${hues.join('|')})-(?:${STANDARD_SHADES.join('|')})(?:\\/\\d{1,3})?\\b`
  )
}

const PURPLE_CLASS_PATTERN = buildHuePattern(PURPLE_HUES)
const YELLOW_CLASS_PATTERN = buildHuePattern(YELLOW_HUES)

// Scan roots widened to all of `app/` (D-08): the prior `app/(app)` +
// `app/components` scan missed every top-level public route.
// `app/components/landing/` is filtered out of the returned file list below
// by a path-prefix test -- the D-05 carve-out -- because landing is an
// entire subtree and sourceFiles() takes roots only, not an exclusion
// parameter.
const SCAN_ROOTS = ['app']

const scannedFiles = () => sourceFiles(SCAN_ROOTS).filter((f) => !f.includes('/landing/'))

/** Repo-relative path -> count of matching lines in that file. */
function countsByFile(matches: SourceMatch[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const m of matches) {
    const rel = path.relative(process.cwd(), m.file)
    counts[rel] = (counts[rel] || 0) + 1
  }
  return counts
}

function report(matches: SourceMatch[]): string {
  return matches.map((m) => `${path.relative(process.cwd(), m.file)}:${m.line}: ${m.text}`).join('\n')
}

// Measured live at 12-06 Task 3 (re-measured from the plan's own table;
// identical, no drift): purple 1 line in 1 file, yellow 19 lines in 7 files.
const PURPLE_CEILING: Record<string, number> = {
  'app/reserve/join/[token]/page.tsx': 1,
}

const YELLOW_CEILING: Record<string, number> = {
  'app/(app)/loot-list/components/LootListContent.tsx': 11,
  'app/(app)/loot-submissions/components/LootSubmissionsContent.tsx': 2,
  'app/(app)/master-sheet/components/MasterSheetContent.tsx': 1,
  'app/(app)/overview/components/DashboardContent.tsx': 1,
  'app/compare/page.tsx': 1,
  'app/components/OnboardingModal.tsx': 1,
  'app/components/ScoreComparisonModal.tsx': 2,
}

describe('purple/yellow gradient guard (COLOR-07, widened by ENF-02 D-08)', () => {
  it('purple, violet, pink and fuchsia classes stay pinned to the exact measured per-file ceiling across all of app/ minus landing/', () => {
    const matches = matchesIn(scannedFiles(), PURPLE_CLASS_PATTERN)
    const counts = countsByFile(matches)
    expect(counts, report(matches)).toEqual(PURPLE_CEILING)
  })

  it('yellow classes stay pinned to the exact measured per-file ceiling across all of app/ minus landing/', () => {
    const matches = matchesIn(scannedFiles(), YELLOW_CLASS_PATTERN)
    const counts = countsByFile(matches)
    expect(counts, report(matches)).toEqual(YELLOW_CEILING)
  })

  it('fails loud naming the path when a file it is asked to scan does not exist, so a renamed file cannot turn the guard into a silent pass', () => {
    expect(() => sourceFiles(['components/ui/this-file-does-not-exist.tsx'])).toThrowError(
      /this-file-does-not-exist/
    )
  })
})
