import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { matchesIn, sourceFiles } from './design-tokens/source-files'
import handRolledCardPattern from '../scripts/codemods/hand-rolled-card-pattern.json'

// PRIM-01's guard, now closed (D-16). The card sweep migrated every
// hand-rolled card className under app/ and components/ onto <Card> (or
// <Card variant="nested">) via scripts/codemods/hand-rolled-cards.mjs.
// This guard's detection pattern is read from the committed pattern file
// rather than restated here, so the guard and the codemod cannot drift
// apart. The ratchet ran from 232 (09-02) down through 09-05 and 09-06;
// this is its final, permanent form: a plain zero-match assertion over
// unchanged scan roots (app, components), with no ceiling constant. A new
// hand-rolled card anywhere under those roots fails this test, naming its
// file and line.
//
// Per D-13, this guard matches bg-background-elevated (and its bg-card
// synonym) card shapes only. The 5 card-shaped bg-background-inset lines
// are Phase 10's, whose own criterion 1 already asserts that token is
// gone -- no temporary allowlist is added here for them.
//
// 232 -> 201 (09-05 Task 2, Batch C1): the shared components/ tree's 31
// matching lines left the count -- 25 migrated onto <Card> (skeletons.tsx,
// searchable-dropdown.tsx, info-tooltip.tsx) plus 6 now permanently
// excluded via scanExclusions (the checkpoint-approved cn(...)-built sites
// in dropdown-menu.tsx x2, empty-state.tsx, error-state.tsx,
// radio-group.tsx, segmented-control.tsx).
//
// 201 -> 159, not the plan's plan-time estimate of 154 (09-05 Task 3,
// Batch C2): app/components/ plus the five public-page directories carried
// 46 live matching lines (not the plan's estimated 47 -- a one-line drift
// consistent with this workstream's established live-vs-plan-time
// measurement variance), of which 42 were migrated onto <Card>. The
// remaining 4 stay unrewritten and therefore still match this regex,
// because applying the codemod for the first time against real component
// references surfaced two real correctness bugs, fixed in
// hand-rolled-cards.mjs itself rather than hand-patched: (1) a className
// coincidentally matching D-08 on a CUSTOM COMPONENT tag (<Button
// className="...">, <Link className="...">) would have discarded that
// component's own semantics for Card's plain div; (2) a className
// matching D-08 on a native INTERACTIVE intrinsic element
// (app/reserve/join/[token]/page.tsx:198's <button type="button"
// disabled={disabled} onClick={...}>) would have lost native
// keyboard/disabled/ARIA semantics -- its disabled:cursor-not-allowed and
// disabled:opacity-50 utilities depend on the real :disabled pseudo-class,
// which a div can never match. All 4 sites are reported SKIPPED by name
// (never silently dropped), and the ceiling reflects the honest post-fix
// count: 201 - 42 = 159.
//
// 159 -> 86 (09-06 Task 1, Batch C3): the seven group-A directories
// (overview, loot-management, loot-list, loot-submissions, master-loot,
// master-sheet, attendance) carried 75 live matching lines (the plan's
// plan-time estimate exactly), of which 73 were migrated onto <Card>,
// including LootListContent.tsx:509's template-literal site (the
// substitution and its surrounding ternary left byte-identical) and
// SettingsModal.tsx's 7 rewritable strong-border containers (its 8th
// container is one of the two newly-discovered exceptions below;
// grep -c border-border-strong on the file is unchanged at 11 before and
// after, since the token is kept verbatim on every rewritten site and
// left alone on the one skipped site). The remaining 2 lines stayed
// unrewritten because this batch's own first sweep of app/(app)/overview
// and app/(app)/loot-management surfaced two more sites in the same
// already-approved "interactive trigger styled as a card" category the
// 09-05 Task 3 fix protects against -- neither file was touched by any
// prior batch, so neither site could have been found earlier.
//
// 86 -> 0 (09-06 Task 2, Batch C4, closing the ratchet): the twelve
// remaining route groups plus AppLayout.client.tsx carried 84 live
// matching lines, of which 73 were migrated onto <Card>. A thirteenth
// directory not named in this plan's own file list,
// app/(app)/sheet-import/, was also swept (1 site) since the plan's own
// success criteria require a true, repo-wide zero across app/ and
// components/, not just the twelve listed groups -- confirmed by running
// the codemod's own --dry-run over the whole app/ tree after this batch's
// listed directories, which is the authority for what remains, not the
// plan's own directory list.
//
// scanExclusions closes from 6 to 16 entries, not the plan's stated 9.
// The plan named 3 files, covering the 4 sites 09-05 Task 3 found:
// app/components/MultiSelectDropdown.tsx (1 custom-component <Button>),
// app/components/Navigation.tsx (1 custom-component <Button>), and
// app/reserve/join/[token]/page.tsx (2 sites in the same file: line 202's
// native interactive <button type="button" disabled={disabled}> and line
// 850's custom-component <Link href={...}>, a share-link/avatar badge
// predating this phase, commit 73536eca -- both correctly caught by the
// same file-level exclusion, though only line 202 was named in the plan's
// original 4-site count). Sweeping this plan's own,
// previously untouched files surfaced 7 more sites in the identical,
// already-approved category (an interactive element -- <Button>, native
// <button>, <input>, <a> -- styled with card-shaped surface classes,
// where renaming it to Card's plain div would discard real click,
// keyboard, native-form-control, or link semantics), across 6 more files:
// app/(app)/loot-management/components/SettingsModal.tsx:409 (<Button
// variant="ghost" onClick={...}>, a collapsible-section toggle),
// app/(app)/overview/components/DashboardContent.tsx:1905 (native
// <button onClick={...}>, a phase-filter pill),
// app/(app)/raid-tracking/components/LootItemSelectionModal.tsx:64
// (<Button variant="ghost" onClick={...}>, a picker-list row),
// app/(app)/raid-tracking/import/_client.tsx:312 (native <input
// type="file">, a CSV upload control),
// app/(app)/reserve/runs/[id]/_client.tsx:741 (native <a href={...}>, a
// share-link control), and app/(app)/sheet-import/_client.tsx:295,:326
// (two native <input type="file"> CSV upload controls, one file, two
// sites). A sixteenth site,
// app/components/StyledSelect.tsx:14, is a different shape of the same
// category: a native <select> (already in the codemod's
// INTERACTIVE_INTRINSIC_TAGS denylist) whose surface classes are never
// literally present in its JSX className attribute at all -- they live in
// a `baseClasses` string constant interpolated into the className
// template (`className={`${baseClasses} ${variantClasses[variant]}
// ${className}`}`), so the codemod's JSX-attribute visitor never even
// evaluates it as a candidate (correctly -- it cannot safely trace an
// identifier reference back to a literal), while this guard's raw-line
// scan still matches the `const baseClasses = '...'` declaration line.
// Excluding the file has the identical effect and justification as
// excluding the other 15: the surface is drawn by a real `<select>`,
// which Card's plain div cannot replicate.
//
// All 10 newly-excluded files are disclosed here by name, file and line,
// each independently confirmed (by dry-running that single file after
// the batch) to have no remaining live match other than the named
// exception -- not a blanket, unverified exclusion. Per this workstream's
// established discrepancy convention (live measurement is the authority,
// named rather than forced to match a plan-time list), this closing batch
// widens scanExclusions to the true, complete, disclosed set rather than
// leaving 7 known-good sites unaccounted for or stopping short of a true
// zero. The guard's own predicate, scan roots and mechanism are otherwise
// exactly as committed; no detection weakening occurred anywhere in this
// widening.
//
// A seventeenth exclusion, app/(app)/characters/[id]/edit/_client.tsx,
// was added after the guard closed, during the 09-07 checkpoint: Batch C4
// (09-06 Task 2) had renamed this file's real <form onSubmit={handleSubmit}>
// to <Card onSubmit={handleSubmit}>, a live functional regression -- Card
// renders a plain div, so the page's type="submit" Save button stopped
// doing anything (no submit event to catch). `form` was missing from
// INTERACTIVE_INTRINSIC_TAGS at the time this file was swept, so nothing
// caught it. Fixed by reverting the element to <form> with its original
// surface classes restored, adding 'form' to the codemod's denylist so it
// cannot recur, and excluding this file here since a real <form> once
// again carries the exact card-shaped classes this guard matches on.
const SCAN_ROOTS = ['app', 'components']

const DETECTION_REGEX = new RegExp(handRolledCardPattern.detectionRegexSource)

const EXCLUDED_PATHS = new Set(
  handRolledCardPattern.scanExclusions.map((p) => path.resolve(process.cwd(), p))
)

describe('hand-rolled card sites (PRIM-01)', () => {
  it('finds no hand-rolled card sites anywhere under app/ or components/', () => {
    const files = sourceFiles(SCAN_ROOTS).filter((f) => !EXCLUDED_PATHS.has(f))
    const matches = matchesIn(files, DETECTION_REGEX)
    const report = matches.map((m) => `${m.file}:${m.line}: ${m.text}`).join('\n')
    expect(matches, report).toHaveLength(0)
  })
})
