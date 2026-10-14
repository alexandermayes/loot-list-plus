---
quick_id: 261013-ngb
slug: fix-gh-357-item-3-master-sheet-hover-and
date: 2026-10-13
status: complete
issue: 357
branch: fix/357-master-sheet-bonus-reasons
---

# Quick 261013-ngb: master sheet score hovers show raider bonus reason and end date (GH #357)

## Objective
GH #357 item 2 (the last open item): since #329 a raider bonus has a reason and an end date, but the master sheet's
score hover (`ScoreBreakdownPopover` in BossSection.tsx) and the candidate modal's inline top-3 breakdown
(ItemCandidateModal.tsx) still show only the total. Make both show the text the overview breakdown already shows,
for example `Full enchants: +2 until Oct 12. Officer bonus: +5`. No new copy: the text is the existing
`describeRaiderBonusEntries` output.

## Context
- Work ONLY in `/Users/alexander.mayes/Code/personal/loot-list-plus-wt-357` (detached at origin/main 523e2efe).
  `node_modules` is a symlink to the primary install: never unlink it, never run `npm ci`/`npm install`.
- `domain/scoring/explain.ts` `explainScore(result, configOrInput = {})`: with a full `ScoreInput` the raider bonus
  line's `detail` is `describeRaiderBonusEntries(getActiveRaiderBonusEntries(characterId, config, asOfDate))`.
  Config-only callers (both master sheet surfaces) get `'Officer-assigned modifier for this raider'`.
- CORRECTION to the brief: omitting `asOfDate` does NOT mean today. `isRaiderBonusEntryActive` (modifiers.ts ~line 77)
  treats any entry with a start or end date as inactive when `asOfDate` is missing. Both components must pass
  `asOfDate: toDateString(new Date())` (from `@/utils/date`), the same value MasterSheetContent.tsx scores with
  (lines 331/341). Otherwise every "until Oct 12" entry silently drops out.
- No `text-10` token exists in tailwind.config.js; the smallest size is `text-11` (11px). Use `text-11`.
- `ScoreLine.context` is a `Record`, so ItemCandidateModal's `` ` (${line.context})` `` would print `[object Object]` if
  ever set. It is never set for config-only calls. Do not set `context`; leave that rendering alone (out of scope,
  mention in PR). `app/components/ScoreComparisonModal.tsx` (calls `explainScore` with no config) is also out of scope.
- Why an exported const and not a new `ScoreLine` field: `ScoreLine` must not grow fields, `context` is unsafe to
  render (above), and comparing against one exported const keeps the fallback string single-sourced so the
  components cannot drift from explain.ts.

## Tasks

### Task 1: explainScore lists raider bonus reasons for config-only callers
Files: `domain/scoring/explain.ts`, `domain/scoring/__tests__/engine.test.ts`
1. In explain.ts, above `explainScore`, add:
   ```ts
   /** Raider bonus detail when the active entries are unknown (no character id, or a legacy flat number). */
   export const RAIDER_BONUS_GENERIC_DETAIL = 'Officer-assigned modifier for this raider'

   /** Extra context for config-only callers such as the master sheet. */
   export interface ExplainScoreOptions {
     /** Character the result belongs to, so the raider bonus line can list each reason and end date. */
     characterId?: string | null
     /** YYYY-MM-DD date the score was computed for. Omit it and dated bonus entries are left out. */
     asOfDate?: string
   }
   ```
2. Signature becomes `explainScore(result, configOrInput = {}, opts: ExplainScoreOptions = {})`. Add a JSDoc
   `@param opts` line: used only when `configOrInput` is a config; the ScoreInput path ignores it.
3. Replace the raider bonus `entries`/`detail` code with:
   ```ts
   const entries = input
     ? getActiveRaiderBonusEntries(input.character.characterId, input.config, input.asOfDate)
     : getActiveRaiderBonusEntries(opts.characterId ?? null, config, opts.asOfDate)
   // detail: entries.length > 0 ? describeRaiderBonusEntries(entries) : RAIDER_BONUS_GENERIC_DETAIL
   ```
   Update the `#329` comment above it to mention config-only callers can pass `opts` (GH #357). ScoreInput path unchanged.
4. Tests: add to the existing `describe('raider bonus detail (#329)')` in engine.test.ts (~line 420; reuse `char`,
   `makeInput`, `computeScore`). Import `RAIDER_BONUS_GENERIC_DETAIL` from `'../explain'`. Config:
   `{ single_raider_overall_bonus: true, single_raider_modifiers: { 'char-1': [{ amount: 2, label: 'Full enchants', expires_at: '2026-10-12' }] } }`,
   result = `computeScore(makeInput({ character: char, config, asOfDate: '2026-10-10' }))` (raiderBonus 2).
   - config-only with `{ characterId: 'char-1', asOfDate: '2026-10-10' }` gives detail `'Full enchants: +2 until Oct 12'`
   - config-only with `{ characterId: null, asOfDate: '2026-10-10' }` gives `RAIDER_BONUS_GENERIC_DETAIL`
   - same result explained with `{ ...config, single_raider_overall_bonus: false }` and the char-1 opts gives the generic detail
   - char-1 opts WITHOUT `asOfDate` gives the generic detail (documents why callers must pass today)
   Leave the existing "keeps the generic detail for config-only callers" test untouched; it must still pass.
Verify: `npx vitest run domain/scoring` all green.

### Task 2: score hover popover shows the reasons
Files: `app/(app)/master-sheet/components/BossSection.tsx`, NEW `app/(app)/master-sheet/components/__tests__/BossSection.test.tsx`
1. Import `toDateString` from `'@/utils/date'` and `RAIDER_BONUS_GENERIC_DETAIL` alongside `explainScore`.
2. In `ScoreBreakdownPopover`: `explainScore(result, config, { characterId: ranking.character_id, asOfDate: toDateString(new Date()) })`.
3. Lines map: move `key={line.key}` to a new outer `<div>`, keep the existing label/value row inside it unchanged,
   then render only when `line.key === 'raiderBonus' && line.detail !== RAIDER_BONUS_GENERIC_DETAIL`:
   `<p className="text-11 text-muted-foreground leading-snug mt-0.5">{line.detail}</p>`. Other lines unchanged.
4. Widen the card `w-56` to `w-64`: a 60-character reason plus "+N until Mon D" wraps to three lines at 224px.
   If you edit the line-75 docstring, replace its em dash with a colon.
5. Test (cheap: boss quotes are a dynamic import, the portal targets document.body which `screen` covers). Mock
   `@/app/components/ItemLink` like ItemCandidateModal.test.tsx does, and `vi.mock('@/data/boss-quotes', () => ({ getBossQuote: () => null }))`.
   `beforeEach`: `vi.useFakeTimers({ toFake: ['Date'] })` + `vi.setSystemTime(new Date(2026, 9, 10, 12))` (only Date is
   faked so RTL timers stay real). `afterEach`: `cleanup()` + `vi.useRealTimers()`. Render
   `<BossSection boss="Ragnaros" items={[{ item, rankings: [ranking({ raider_bonus: 2, loot_score: 12 })] }]} isCollapsed={false} onToggleCollapse={() => {}} isOfficer guildSettings={...} />`
   (copy the `ranking()` fixture shape from ItemCandidateModal.test.tsx, `character_id: 'char-thrall'`), then
   `fireEvent.mouseEnter(screen.getByText('Thrall').parentElement!)`.
   - B1: modifiers `{ 'char-thrall': [{ amount: 2, label: 'Full enchants', expires_at: '2026-10-12' }] }` with
     `single_raider_overall_bonus: true`: `await screen.findByText('Full enchants: +2 until Oct 12')`.
   - B2: same entry keyed to `'char-other'`: `await screen.findByText('Raider bonus')`, and
     `screen.queryByText(RAIDER_BONUS_GENERIC_DETAIL)` is null.
Verify: `npx vitest run "app/(app)/master-sheet/components/__tests__/BossSection.test.tsx"` green.

### Task 3: candidate modal inline breakdown shows the reasons
Files: `app/(app)/master-sheet/components/ItemCandidateModal.tsx`, `app/(app)/master-sheet/components/__tests__/ItemCandidateModal.test.tsx`
1. Import `RAIDER_BONUS_GENERIC_DETAIL` with `explainScore` (`toDateString` is already imported, line 13).
2. `rankingToExplanation` (line 140) passes `{ characterId: r.character_id, asOfDate: toDateString(new Date()) }`.
3. In the inline top-3 explanation (~line 613-626), directly before the existing `line.context` expression, add
   `{line.key === 'raiderBonus' && line.detail !== RAIDER_BONUS_GENERIC_DETAIL ? ` (${line.detail})` : ''}`.
   Keep the `line.context` rendering as is.
4. Test: give `renderModal` a third optional param `guildSettings: ComponentProps<typeof ItemCandidateModal>['guildSettings'] = {}`
   passed through (existing calls unchanged). New `describe('ItemCandidateModal raider bonus reasons (GH #357)')`:
   `beforeEach` resets `showNotification`, calls `stubFetch([])`, fakes Date to `new Date(2026, 9, 10, 12)` as in Task 2;
   `afterEach` `cleanup()`, `vi.useRealTimers()`, `vi.unstubAllGlobals()`. Match the whole inline span:
   `screen.findByText((_, el) => el?.tagName === 'SPAN' && el.textContent === text)`.
   - M6: `ranking({ raider_bonus: 2, loot_score: 12 })` + the B1 settings reads `Raider bonus: +2.00 (Full enchants: +2 until Oct 12)`
   - M7: entry keyed to `'char-other'` reads exactly `Raider bonus: +2.00`
Verify: `npx vitest run "app/(app)/master-sheet"` green (M1 to M5 still pass).

### Task 4: full verification (from the worktree root)
- `npx vitest run domain/scoring "app/(app)/master-sheet"`
- `npm run typecheck`
- `npm run lint`
- No em dash in added lines: `git diff -U0 -- domain app | grep '^+' | grep -v '^+++' | grep -c $'\xe2\x80\x94'` prints `0`.

## Commit and PR
1. `git fetch origin && git switch -c fix/357-master-sheet-bonus-reasons origin/main` (do this before editing).
2. Stage ONLY the six code files by explicit path (never `git add -A` or `git add .`):
   explain.ts, engine.test.ts, BossSection.tsx, BossSection.test.tsx, ItemCandidateModal.tsx, ItemCandidateModal.test.tsx.
3. Commit (trailer mandated by the caller, do not substitute):
   `git commit -m "fix(master-sheet): show raider bonus reason and end date in score hovers (GH #357)" -m "explainScore takes an optional characterId and asOfDate so config-only callers list each active raider bonus reason and end date." -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`
4. `git push -u origin fix/357-master-sheet-bonus-reasons`, then `gh pr create --base main --title "<commit subject>" --body-file "$BODY"`
   with the body in a temp file outside the worktree (`BODY=$(mktemp)`). Body contents:
   - "Third and last item of #357; items 1 and 3 are PR #399." Use "Part of #357", not a closing keyword.
   - What changed: the optional `opts` on `explainScore`, both master sheet surfaces pass character id and today.
   - Before/after. Popover before: `Raider bonus  +2.00`. Popover after: `Raider bonus  +2.00` with
     `Full enchants: +2 until Oct 12` underneath in small muted text. Candidate modal before: `Raider bonus: +2.00`;
     after: `Raider bonus: +2.00 (Full enchants: +2 until Oct 12)`. Popover widened from w-56 to w-64.
   - "No new copy: the reason text is the existing describeRaiderBonusEntries output already shown on the overview."
   - Out of scope: `line.context` would render `[object Object]` if ever set (never set here);
     ScoreComparisonModal still shows the generic detail.
   - Test commands run and results.
   - Last line exactly: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
5. Report the PR URL. Leave this PLAN.md untracked on the code branch; the docs PR is handled separately.

## Must not
- No em dashes in code, comments, tests, commit message or PR body.
- Do not touch the primary checkout `/Users/alexander.mayes/Code/personal/loot-list-plus`.
- Do not commit planning docs (`.planning/**`) on the code branch.
- Do not run `npm ci` or `npm install`; do not unlink or replace the `node_modules` symlink.
- Do not add or make required any field on `ScoreLine`; do not start setting `line.context`.
- Do not change the ScoreInput path of `explainScore` or the existing generic-detail test.
