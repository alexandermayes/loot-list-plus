---
phase: 10-colour-literal-migration
plan: 05
subsystem: ui
tags: [design-tokens, vitest, guard-test, colour-literal, react]

requires:
  - phase: 10-03
    provides: "lib/design-system/quality-colors.ts (QUALITY_COLORS/BRAND_COLORS) and the 5 named tailwind.config.js colour keys, stable and unconsumed by data sites until this plan"
provides:
  - "All 19 remaining plain JS/TS data sites (9 non-landing + 10 landing) rewired to import QUALITY_COLORS/BRAND_COLORS from lib/design-system/quality-colors.ts instead of spelling the five hex values"
  - "AccentColorContext.tsx:14's comment reworded so it no longer spells a hex literal in prose, closing the gap 10-03 flagged as unrouted"
  - "__tests__/quality-brand-color-literals.test.ts: the COLOR-05 absence guard, scanning app/ and components/ with no landing carve-out"
affects: [10-06, 10-07-post-phase-capture]

actuals:
  tokens: 4151
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Hex-plus-alpha composition via template literal around an imported constant (\`${QUALITY_COLORS.epic}80\`) instead of spelling the base hex again, verified by evaluating the composed expression before and after rather than reading the diff."
    - "A hex-keyed lookup record's key rewired to a computed property (\`[QUALITY_COLORS.epic]: ...\`) so the object's own key and a sibling array's value can no longer drift apart, the same technique 10-03 used for the parity guard between Tailwind keys and TS constants."

key-files:
  created:
    - "__tests__/quality-brand-color-literals.test.ts"
  modified:
    - "app/contexts/AccentColorContext.tsx"
    - "app/components/ItemLink.tsx"
    - "app/components/KonamiEasterEgg.tsx"
    - "app/(app)/design-system/_client.tsx"
    - "app/components/landing/ClickEffects.tsx"
    - "app/components/landing/ParallaxItem.tsx"

key-decisions:
  - "Scope branch: the WIDE/34-occurrence COLOR-05 scope locked at 10-02's gate (\"approve as presented\"). Task 2's ten landing-subtree sites (ClickEffects.tsx x8, ParallaxItem.tsx x2) were executed, not skipped."
  - "AccentColorContext.tsx:14's comment reword -- flagged by 10-03 as locked-but-unrouted -- was executed here as this plan's own Task 1 site 3, per the orchestrator's explicit instruction."
  - "COLOR-05's guard has no landing carve-out, unlike the sibling COLOR-07 purple-gradient guard's D-05 exclusion, because REQUIREMENTS.md's COLOR-05 wording covers app/ and components/ with no exception and the landing subtree's quality hexes are squarely in this phase's scope. The guard's header states this contrast explicitly."
  - "Used single-quoted import strings in app/(app)/design-system/_client.tsx (which otherwise uses double quotes throughout) for the one new import line, to satisfy the plan's own single-quote-pattern acceptance-criteria grep. No eslint quotes rule is configured, so this is stylistically harmless."

requirements-completed: [COLOR-05]

coverage:
  - id: D1
    description: "Nine non-landing JS/TS data sites (AccentColorContext.tsx x3, ItemLink.tsx x1, KonamiEasterEgg.tsx x4, design-system/_client.tsx x1) rewired to import QUALITY_COLORS/BRAND_COLORS from the direct module path; ACCENT_COLORS array and ACCENT_FILTERS record unchanged in entry count and every value; the Epic entry's value and its matching filter key both reference the same constant"
    requirement: "COLOR-05"
    verification:
      - kind: unit
        ref: "grep -rniE raw-hex check across the four files -- zero matches; node -e entry-count assertion -- 6/6 passed"
        status: pass
      - kind: other
        ref: "ACCENT_COLORS/DEFAULT_ACCENT_COLOR name/value pairs parsed from before (git show HEAD~1) and after files, deep-compared -- byte-identical"
        status: pass
    human_judgment: false
  - id: D2
    description: "AccentColorContext.tsx:14's comment reworded to stop spelling a hex literal in prose (the darkened-green code value on that line, #15b300, is untouched and remains outside the five centralized values per D-14)"
    requirement: "COLOR-05"
    verification:
      - kind: unit
        ref: "guard fail-first part C (opposite-case reintroduction) confirms the guard's code/comment limitation is real; grep -ci comment >=1 in the guard's header discloses it"
        status: pass
    human_judgment: false
  - id: D3
    description: "Ten landing-subtree data sites (ClickEffects.tsx x8, ParallaxItem.tsx x2) rewired, including four alpha-carrying hex-plus-alpha sites composed by template literal; all ten evaluated runtime strings proven byte-identical before/after; quality map key count and marketing-purple absence both pinned"
    requirement: "COLOR-05"
    verification:
      - kind: unit
        ref: "npx tsx before/after evaluated-string comparison across all 10 sites -- 10/10 MATCH; node -e quality-map key-count check -- 4/4; git diff purple/9940ec grep -- 0"
        status: pass
    human_judgment: false
  - id: D4
    description: "COLOR-05 absence guard (__tests__/quality-brand-color-literals.test.ts) scans app/ and components/ with no landing carve-out, derives its pattern from lib/design-system/quality-colors.ts, matches case-insensitively and non-right-anchored, discloses the code/comment limitation and its own scope limit, and has been observed failing on all three reintroduction shapes then restored to a byte-clean tree"
    requirement: "COLOR-05"
    verification:
      - kind: unit
        ref: "npx vitest run __tests__/quality-brand-color-literals.test.ts -- 2/2 passed"
        status: pass
      - kind: other
        ref: "three-part fail-first proof: (a) six-digit reintroduction at ItemLink.tsx:117 -- caught, named; (b) eight-digit hex-plus-alpha reintroduction at ClickEffects.tsx:194 -- caught, named; (c) opposite-case reintroduction at design-system/_client.tsx:330 -- caught, named. All three restored to empty git diff."
        status: pass
    human_judgment: false
  - id: D5
    description: "npm run lint zero errors, npm run typecheck exit 0, npx vitest run (and --maxWorkers=2) green across the whole suite, including the sibling quality-brand-token-parity and purple-gradient guards"
    verification:
      - kind: unit
        ref: "npm run typecheck exit 0; npm run lint -- 0 errors, 397 pre-existing warnings unchanged; npx vitest run --maxWorkers=2 -- 71 files / 1209 tests passed"
        status: pass
    human_judgment: false

duration: 30min
completed: 2026-09-21
status: complete
---

# Phase 10 Plan 05: Quality/Brand Colour Tokens (JS/TS Data Sites) Summary

**All 19 remaining hard-coded WoW-quality/brand hex sites (object values, an object key, SVG attributes, inline style strings, and a docs display string) across six files rewired onto `lib/design-system/quality-colors.ts` imports, closing ROADMAP success criterion 3 alongside 10-03, with a COLOR-05 absence guard proven against three reintroduction shapes.**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-09-21T00:41:00Z
- **Tasks:** 3/3 complete
- **Files modified:** 6 modified + 1 new test file

## Scope branch statement (backstop verification, per plan requirement)

This plan executed on the **WIDE/34-occurrence branch**, locked at 10-02's gate ("approve as presented"). Concretely, that means Task 2's ten landing-subtree sites — `ClickEffects.tsx` lines 177, 185, 193, 200, 206, 234, 235, 275 and `ParallaxItem.tsx`'s two quality-map entries — were IN SCOPE and were migrated in full, not skipped. Combined with 10-03's 15 class-site migrations, all 34 occurrences named at the gate are now accounted for: 15 Tailwind class sites (10-03) + 19 JS/TS data sites (10-05, this plan) = 34.

Also per the gate's locked decisions, `AccentColorContext.tsx:14`'s comment — spelling `#1eff00` in prose even though that line's actual code value is a different, darkened green (`#15b300`) not among the five centralized values — was reworded here as this plan's Task 1 site 3.

## Accomplishments

- Rewired all nine non-landing JS/TS data sites (`AccentColorContext.tsx` x3, `ItemLink.tsx` x1, `KonamiEasterEgg.tsx` x4, `design-system/_client.tsx` x1) onto `QUALITY_COLORS`/`BRAND_COLORS` imports from the direct module path `@/lib/design-system/quality-colors`.
- Rewired the `ACCENT_FILTERS` hex-keyed lookup's Epic entry to a computed key (`[QUALITY_COLORS.epic]: ...`) so the array's value and the lookup's key can no longer drift apart from each other.
- Reworded `AccentColorContext.tsx:14`'s comment from "(darkened from #1eff00)" to "(darkened from the standard Uncommon green)" — no hex characters remain, the line's actual code value (`#15b300`) is untouched.
- Rewired all ten landing-subtree data sites (`ClickEffects.tsx` x8 including four hex-plus-alpha forms composed via template literal, `ParallaxItem.tsx` x2), verified byte-identical output for every composed runtime string by evaluating each expression before and after rather than reading the diff.
- Left the four non-centralized `ACCENT_COLORS`/`qualityColors` tiers (Legendary, Rare, Artifact, Heirloom) exactly as literals in both files, per D-14.
- Left `design-system/_client.tsx`'s `bg: 'bg-discord'` field untouched; only its `hex` display string now references `BRAND_COLORS.discord` (the Tailwind-key/literal-hex duplicate is a disclosed finding routed to Phase 12).
- Stood up `__tests__/quality-brand-color-literals.test.ts`: derives its detection pattern from `lib/design-system/quality-colors.ts`'s own exported values (not restated), matches case-insensitively, is not right-anchored (catches the six-digit form embedded in eight-digit hex-plus-alpha forms), has no landing carve-out (contrast with COLOR-07's D-05 exclusion, stated explicitly in the header), and discloses both the code/comment limitation and its own scope limit.
- Ran and recorded all three parts of the guard's fail-first proof, restoring the working tree to a byte-clean state after each.

## Task Commits

1. **Task 1: Rewire the nine non-landing JS/TS data sites** — `449eea65` (feat)
2. **Task 2: Rewire the ten landing-subtree data sites, including the hex-plus-alpha forms** — `bc7c1dfc` (feat)
3. **Task 3: Stand up the COLOR-05 absence guard and prove it fails without the migration** — `859942b6` (feat)

## Files Created/Modified

- `app/contexts/AccentColorContext.tsx` — Epic entry's `value` and matching `ACCENT_FILTERS` key reference `QUALITY_COLORS.epic`; site 3's comment reworded
- `app/components/ItemLink.tsx` — inline style `color` references `QUALITY_COLORS.epic`
- `app/components/KonamiEasterEgg.tsx` — four Epic `color` array entries reference `QUALITY_COLORS.epic`
- `app/(app)/design-system/_client.tsx` — Discord swatch's `hex` display field references `BRAND_COLORS.discord`
- `app/components/landing/ClickEffects.tsx` — three plain SVG attributes, two eight-digit hex-plus-alpha strokes, the ring border, box-shadow and radial-gradient background all reference `QUALITY_COLORS.uncommon`/`epic`
- `app/components/landing/ParallaxItem.tsx` — quality map's `epic`/`uncommon` entries reference the constants
- `__tests__/quality-brand-color-literals.test.ts` — new: COLOR-05 absence guard

## Task 1 evidence: ACCENT_COLORS/DEFAULT_ACCENT_COLOR byte-equality

Parsed `name`/`value` pairs from `git show HEAD~1` (pre-edit) and the post-edit file, resolving `QUALITY_COLORS.epic` to its literal value the same way TypeScript evaluates it:

```
before: [{"name":"Legendary","value":"#ff8000"},{"name":"Epic","value":"#a335ee"},{"name":"Rare","value":"#0070dd"},{"name":"Uncommon","value":"#15b300"},{"name":"Artifact","value":"#c5a840"},{"name":"Heirloom","value":"#0099cc"}]
after:  [{"name":"Legendary","value":"#ff8000"},{"name":"Epic","value":"#a335ee"},{"name":"Rare","value":"#0070dd"},{"name":"Uncommon","value":"#15b300"},{"name":"Artifact","value":"#c5a840"},{"name":"Heirloom","value":"#0099cc"}]
byte-identical: true
DEFAULT_ACCENT_COLOR before/after: #ff8000 #ff8000 (unchanged)
```

`ACCENT_FILTERS` key count: 6 before, 6 after (unchanged); the Epic key is now `[QUALITY_COLORS.epic]` resolving to the identical `'#a335ee'` string.

## Task 2 evidence: ten before/after evaluated string pairs (verbatim)

Each pair is the exact live-file "before" text (from `git show HEAD~1`, before Task 2's edit) against the runtime value the "after" expression composes using the live `QUALITY_COLORS` constant (`epic: '#a335ee'`, `uncommon: '#1eff00'`), confirmed programmatically, not by reading the diff:

| # | File:Line | Before (live) | After (composed) | Match |
|---|---|---|---|---|
| 1 | ClickEffects.tsx:177 | `stroke="#1eff00" strokeWidth={4}...` | `stroke={QUALITY_COLORS.uncommon}` -> `#1eff00` | identical |
| 2 | ClickEffects.tsx:185 | `stroke="#1eff00" strokeWidth={4}...` | `stroke={QUALITY_COLORS.uncommon}` -> `#1eff00` | identical |
| 3 | ClickEffects.tsx:193 | `stroke="#1eff0050" strokeWidth={14}...` | `` stroke={`${QUALITY_COLORS.uncommon}50`} `` -> `#1eff0050` | identical |
| 4 | ClickEffects.tsx:200 | `stroke="#1eff0050" strokeWidth={14}...` | `` stroke={`${QUALITY_COLORS.uncommon}50`} `` -> `#1eff0050` | identical |
| 5 | ClickEffects.tsx:206 | `fill="#1eff00" filter="url(#slash-glow)"` | `fill={QUALITY_COLORS.uncommon}` -> `#1eff00` | identical |
| 6 | ClickEffects.tsx:234 | `border: '2px solid #a335ee',` | `` border: `2px solid ${QUALITY_COLORS.epic}`, `` -> `2px solid #a335ee` | identical |
| 7 | ClickEffects.tsx:235 | `boxShadow: '0 0 30px #a335ee80, 0 0 60px #a335ee40',` | `` boxShadow: `0 0 30px ${QUALITY_COLORS.epic}80, 0 0 60px ${QUALITY_COLORS.epic}40`, `` -> `0 0 30px #a335ee80, 0 0 60px #a335ee40` | identical (both alpha pairs `80`/`40` preserved) |
| 8 | ClickEffects.tsx:275 | `background: 'radial-gradient(circle at 50% 50%, #a335ee15 0%, transparent 60%)'` | template-literal equivalent -> `radial-gradient(circle at 50% 50%, #a335ee15 0%, transparent 60%)` | identical (alpha `15` preserved) |
| 9 | ParallaxItem.tsx (epic) | `epic: '#a335ee',` | `epic: QUALITY_COLORS.epic,` -> `#a335ee` | identical |
| 10 | ParallaxItem.tsx (uncommon) | `uncommon: '#1eff00',` | `uncommon: QUALITY_COLORS.uncommon,` -> `#1eff00` | identical |

All ten: **byte-identical**. Particular attention paid to sites 3, 4, 7 and 8 — the four alpha-carrying values — where the alpha characters (`50`, `80`/`40`, `15`) were transcribed from the live file via `grep -n` immediately before editing, not retyped from the plan text, and re-confirmed against the post-edit file's actual `sed`-extracted lines.

Quality map key count: `ParallaxItem.tsx`'s `qualityColors` object has 4 keys before and after (unchanged); `legendary`/`rare` remain literals per D-14. `git diff` for Task 2's commit grepped for `purple|9940ec` returns 0 matches — no marketing purple touched.

## Task 3 evidence: three-part fail-first proof (all run, all restored)

**(a) Six-digit literal reintroduction.** Temporarily changed `ItemLink.tsx`'s `color: QUALITY_COLORS.epic` back to `color: '#a335ee'`, re-ran the guard:
```
AssertionError: .../app/components/ItemLink.tsx:117: color: '#a335ee': expected [ { …(3) } ] to have a length of +0 but got 1
```
File restored (`git diff --stat` empty), guard re-confirmed green.

**(b) Eight-digit hex-plus-alpha reintroduction.** Temporarily replaced one of `ClickEffects.tsx`'s composed alpha strokes with the raw literal `stroke="#1eff0050"`, re-ran the guard:
```
AssertionError: .../app/components/landing/ClickEffects.tsx:194: stroke="#1eff0050" strokeWidth={14} strokeLinecap="round": expected [ { …(3) } ] to have a length of +0 but got 1
```
File restored (`git diff --stat` empty), guard re-confirmed green.

**(c) Opposite letter-case reintroduction.** Temporarily changed `design-system/_client.tsx`'s `hex: BRAND_COLORS.discord` back to the historical uppercase literal `hex: '#5865F2'` (the constants module normalises to lowercase `5865f2`), re-ran the guard:
```
AssertionError: .../app/(app)/design-system/_client.tsx:330: { name: 'discord', ..., hex: '#5865F2' },: expected [ { …(3) } ] to have a length of +0 but got 1
```
File restored (`git diff --stat` empty), guard re-confirmed green.

After all three restores, `git diff --stat` across all three touched files was empty and `npx vitest run __tests__/quality-brand-color-literals.test.ts __tests__/quality-brand-token-parity.test.ts __tests__/purple-gradient-guard.test.ts __tests__/faction-color-literals.test.ts` ran 4 files / 10 tests, all passing.

## Verification Results

- `grep -rniE "#(a335ee|1eff00|0074E0|5865F2|e35e15)" app/ components/` — zero matches
- `grep -c "from '@/lib/design-system/quality-colors'"` — `1` for each of the six touched files
- `grep -rn "from '@/lib/design-system'"` (index import) across all six files — zero matches (direct module path confirmed used throughout)
- `grep -c "bg: 'bg-discord'"` in `design-system/_client.tsx` — `1` (untouched)
- ACCENT_COLORS entry count and every name/value pair — unchanged (6 entries, byte-identical)
- ACCENT_FILTERS key count — unchanged (6 keys)
- ParallaxItem.tsx quality map key count — unchanged (4 keys)
- All ten landing evaluated string pairs — byte-identical, including all four alpha-carrying values
- `git diff HEAD~1 -- app/components/landing/` grepped for `purple|9940ec` — 0 matches
- `npx vitest run __tests__/quality-brand-color-literals.test.ts` — 2/2 passed
- Guard's three-part fail-first proof — all three shapes caught, all three restores byte-clean
- `npm run typecheck` — exit 0
- `npm run lint` — 0 errors, 397 pre-existing warnings (unchanged from 10-03's baseline)
- `npx vitest run --maxWorkers=2` — 71 test files / 1209 tests passed (up from 70/1207 pre-plan, +1 file/+2 tests from the new guard)

## Decisions Made

- Followed the plan's locked scope decision exactly: the WIDE/34-occurrence branch, including all ten landing sites and the `AccentColorContext.tsx:14` comment reword.
- Used a computed object key (`[QUALITY_COLORS.epic]: ...`) for the `ACCENT_FILTERS` record's matching entry, per the plan's explicit instruction that this is "the one site where the literal is a key rather than a value, and a computed key is how TypeScript expresses that."
- Built the guard's detection pattern from `Object.values({...QUALITY_COLORS, ...BRAND_COLORS})` at test-file load time rather than hardcoding a five-item array literal, so the pattern is provably derived rather than restated (matches `hand-rolled-cards.test.ts`'s established idiom of reading a predicate from a committed source rather than re-typing it).
- Used single-quoted import syntax for the one new import line in `design-system/_client.tsx` (which otherwise uses double quotes throughout) so the plan's own single-quote-pattern acceptance-criteria grep (`grep -c "from '@/lib/design-system/quality-colors'"`) matches this file too. No eslint `quotes` rule is configured in this repo, so this causes no lint violation; it is a one-line stylistic inconsistency in an otherwise double-quoted file, disclosed here rather than silently introduced.

## Deviations from Plan

None — plan executed exactly as written, including both locked-decision items (the wide scope branch for Task 2, and the `AccentColorContext.tsx:14` comment reword as this plan's own Task 1 action).

## Issues Encountered

None. A sibling executor (10-06) was running concurrently in the same working directory during Task 3; its in-flight, uncommitted changes to `app/globals.css` and `tailwind.config.js` were visible in `git status` but were not staged, touched, or included in any of this plan's three commits — confirmed via `git diff --name-only HEAD~1 HEAD` on each of this plan's three commits, each listing exactly the files that commit's acceptance criteria named.

## User Setup Required

None — no external service configuration required for this plan.

## Next Phase Readiness

- COLOR-05 is now fully shipped end to end: all 15 Tailwind class sites (10-03) and all 19 JS/TS data sites (10-05, this plan) — 34 occurrences total — reference named tokens, with two guards (`quality-brand-token-parity.test.ts` for Tailwind/TS parity, `quality-brand-color-literals.test.ts` for absence) both green and both proven against fail-first reintroductions.
- REQUIREMENTS.md already listed COLOR-05 as `Complete` (marked during 10-03, ahead of this plan's own completion of the data-site half). No requirements-mark-complete action was needed; the traceability table's status was already accurate as of this plan's completion and was left as-is.
- 10-07 (post-phase capture) can now run its after-screenshot against a tree with zero raw quality/brand hex literals under `app/` or `components/`.
- The disclosed `bg: 'bg-discord'`/`hex` Tailwind-key duplicate in `design-system/_client.tsx` remains routed to Phase 12, unchanged by this plan.

## Self-Check: PASSED

- FOUND: `app/contexts/AccentColorContext.tsx`
- FOUND: `app/components/ItemLink.tsx`
- FOUND: `app/components/KonamiEasterEgg.tsx`
- FOUND: `app/(app)/design-system/_client.tsx`
- FOUND: `app/components/landing/ClickEffects.tsx`
- FOUND: `app/components/landing/ParallaxItem.tsx`
- FOUND: `__tests__/quality-brand-color-literals.test.ts`
- FOUND: commit `449eea65`
- FOUND: commit `bc7c1dfc`
- FOUND: commit `859942b6`

---
*Phase: 10-colour-literal-migration*
*Plan: 05*
*Completed: 2026-09-21*
