---
phase: 07-token-foundation
verified: 2026-09-16T12:52:00Z
status: passed
score: 8/9 must-haves verified (1 present-but-incomplete-as-written, routed to human review)
behavior_unverified: 0
overrides_applied: 0
mode_note: "Phase frontmatter declares mode: mvp, but the ROADMAP goal line for Phase 07 is outcome-shaped, not user-story-shaped ('The scale steps and colour tokens... are correct, contrast-verified...'). gsd-tools query user-story.validate confirms valid=false against this goal text. This mismatch was identified and explicitly accepted during planning (07-01-PLAN.md's <phase_goal_note>, which states 'the plans below are unaffected either way'). Verification proceeded using standard goal-backward methodology against the ROADMAP's five numbered success criteria, matching how the phase was planned, executed and self-evidenced (07-EVIDENCE.md). The User Flow Coverage table format was not applicable and was not produced. This is a process/config note for the developer, not a phase defect."
re_verification: null
human_verification:

  - test: "Open .planning/workstreams/design-system/baselines/2026-09-16-pre-phase-07/ and 2026-09-16-post-phase-07/ side by side, plus (once available) a card-dense authenticated screen such as Overview, guild settings, or raid tracking, in dark mode at 1440 and 390."
    expected: "Cards read as cards against the page without a second border; the border is visible; a hovered row (--muted) is visibly lighter than its card; an unchecked switch track is still visible on a card; the page is as deep as before (near-black, unchanged); nothing looks washed out."
    why_human: "No automated check inspects rendered pixel appearance. Recorded as WINDOWS.md entry 4 (07-04 Task 3 human-check, deferred to end-of-phase UAT per workflow.human_verify_mode=end-of-phase). Both before and after screenshot sets that exist in the repo are Home-only (a public marketing page with no cards, borders or hover surfaces in view), so this judgment has not been exercised against any card-dense surface yet."

  - test: "On the raid-tracking page, in dark mode at 1440 and 390 and then in light mode, compare the standby cell rail, the legend swatch, and the RaidMemberList StatusPill against the pre-phase-07 baseline (or live app)."
    expected: "All three standby renderings read as the same amber as each other; that amber is visually distinct from the late-yellow chip and from the accent-orange used elsewhere; a benched raider is not mistakable for a late one."
    why_human: "No automated check inspects rendered colour perception. Recorded as WINDOWS.md entry 5 (07-05 Task 3 human-check, deferred to end-of-phase UAT). The contrast numbers are proven by test (dark standby 7.716:1 on card, light 3.003:1 non-regression vs orange-500's 5.884/2.803), but distinguishability from neighbouring hues at hue 30/38/45 is a perceptual judgment, not an arithmetic one."

  - test: "Capture an authenticated, card-dense app-page screenshot (Overview, or another screen with cards/borders/hover states) at 1440 and 390, light and dark, and add it to a baseline set alongside the existing Home-only pre/post-phase-07 captures, OR make an explicit human decision that the Home-only symmetric pair satisfies ROADMAP success criterion 5's screenshot-set requirement ('one public page, one app page') for this phase."
    expected: "Either a matching app-page before/after pair exists in the repo, or a recorded decision (e.g. a VERIFICATION.md override, a WINDOWS.md waiver, or a phase-close note) states why the Home-only pair is accepted as sufficient given the D-16 fallback (loadtest/test-users.json and SUPABASE_SERVICE_ROLE_KEY were out of scope for the two plans that captured baselines)."
    why_human: "ROADMAP success criterion 5 literally asks for 'one public page, one app page.' Both the pre-phase-07 and post-phase-07 captures in .planning/workstreams/design-system/baselines/ contain only Home (public) images; Overview (app) is recorded as symmetrically 'skipped' in both manifests with an identical reason (GET /api/dev/test-users returned 404). This is a deliberate, symmetric, well-documented fallback (D-16, OI-6, and its 2026-09-16 amendment) rather than an oversight, and lint/typecheck/test all pass independently of it — but the letter of the success criterion is not fully met, and 07-EVIDENCE.md's own Carried Forward section (item 7) and WINDOWS.md entry 6 already flag that the Home-only comparison 'cannot itself confirm the ramp/standby visual judgments' the phase's own risk section calls out. This needs a human decision, not a silent pass or fail."
---

# Phase 07: Token Foundation Verification Report

**Phase Goal:** The scale steps and colour tokens that every primitive, sweep and page resolves against are correct, contrast-verified, and no functional text can be smaller than 11px
**Verified:** 2026-09-16
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth (ROADMAP Success Criterion) | Status | Evidence |
|---|---|---|---|
| 1 | `tailwind.config.js` defines `xs` at 11px, adds a 15px step, and `grep -rE "text-\[(9\|10)px\]" app components` returns zero matches | ✓ VERIFIED | `node -e` against `tailwind.config.js`: `xs` = `["11px",{"lineHeight":"1.5"}]`, `15` = `["15px",...]`, plus 10 pixel-named aliases all deep-equal to their semantic twins. `grep -rE "text-\[(9\|10)px\]" app components \| wc -l` → `0` (re-run live). Dynamic-interpolation bypass check (`text-\[\$\{`) also → `0`. |
| 2 | Committed contrast check reports dark `--foreground-muted` ≥ 4.5:1 against `--background`, `--background-elevated`, `--background-subtle`, and accent text on white ≥ 4.5:1 in light mode via a dedicated accent-text token | ✓ VERIFIED | `npx tsx __tests__/design-tokens/report.ts` (re-run live): dark muted text 5.625 (page), 4.601 (card), 5.462 (sidebar) — all ≥ 4.5. Light `--accent-text` (`30 100% 36%`) vs white card = 4.613 ≥ 4.5. `__tests__/token-contrast.test.ts` asserts all of these (31/31 passing, re-run live). |
| 3 | Dark `--border` ≥ 1.2:1 against `--background-elevated`, and `--background`→`--background-elevated` ≥ 1.2:1, with before/after values recorded for DESIGN.md | ✓ VERIFIED | Report re-run: dark `page` 1.223 (before 1.086), dark `border` 1.213 (before 1.062) — both ≥ 1.2. Before/after values recorded verbatim in `07-EVIDENCE.md`'s Contrast record and Token record sections, sourced from the same committed generator both plans cite. |
| 4 | `components/ui/status-badge.tsx` and `components/ui/alert.tsx` contain no Tailwind palette colour class; render from `--warning`/`--success`/`--error`/`--info`; new `--standby` replaces the 3 duplicated orange-500 literals in raid tracking | ✓ VERIFIED (see note) | `grep -rE 'yellow-500\|orange-500'` and a full 22-hue palette-class regex across both primitives and the 3 raid-tracking files → `0` matches, re-run live. `--standby`/`--standby-foreground` exist in both theme blocks; `colors.standby` in `tailwind.config.js` is a full `{DEFAULT, foreground}` object; `border-l-standby`, `text-standby bg-standby/15` confirmed at all 3 former literal sites. **Note:** the two primitives actually render "rejected"/"no_show" from `--destructive` (not a token literally named `--error`) and the alert's `info` variant from `--accent` (not `--info`). This is pre-existing, unedited-by-this-phase code (07-05-PLAN.md's own interfaces section documents these as "already token-clean... the destructive equivalent... the accent equivalent" before the phase began) — the phase's actual task was only the 4 badge entries and 1 alert entry that carried literals, and it correctly left the rest untouched. The substantive intent (zero Tailwind palette classes, fully semantic-token-driven) is met; the exact token *names* in the roadmap's parenthetical don't perfectly match the pre-existing code's token choices, which this phase did not introduce and was not asked to change. |
| 5 | `npm run lint`, `npm run typecheck`, `npm run test` pass, and a fixed screenshot set (one public page, one app page, light and dark, 1440 and 390) captured before and after | ⚠️ PARTIAL — see human verification | Lint: `0 errors` (397 pre-existing warnings), typecheck: exit 0, test: `1176/1176 passing` — all re-run live, matching claims exactly. Screenshot set: both `.../baselines/2026-09-16-pre-phase-07/` and `.../2026-09-16-post-phase-07/` exist, are committed, and match each other image-for-image (4 Home PNGs: light/dark × 1440/390). **However**, the literal criterion asks for "one public page, one app page" — Overview (the app page) is recorded as symmetrically skipped in both manifests (`GET /api/dev/test-users returned 404`), a deliberate D-16 fallback, not an oversight. The lint/typecheck/test portion is fully verified; the screenshot-set portion is short of the criterion's letter, routed to human verification below. |

**Score:** 4/5 ROADMAP success criteria fully verified as written; 1 partially verified (mechanically proven except for the app-page half of the screenshot set, which is a known, symmetric, documented gap requiring a human decision).

### Standing Constraints (from verification task, cross-cutting the whole phase)

| # | Constraint | Status | Evidence |
|---|---|---|---|
| 1 | No user-facing string changed in swept files (only class literals changed) | ✓ VERIFIED | `git diff` across the two sub-11px sweep commits (`6c63b82a~1..6b64fd3f`), scoped to `app`/`components`, with every changed `+`/`-` line filtered against the class-literal pattern → `0` non-class-literal lines. Same check on the badge/alert/raid-tracking commits (`3342da80..81927d93`) shows only `className`/`toContain` literal substitutions plus one new test assertion; `0` `label:` lines touched; all 11 badge labels present by exact string (re-verified via grep). |
| 2 | Dark `--background` and `--background-subtle` unchanged from pre-phase values | ✓ VERIFIED | `git show 073c87fe:app/globals.css` vs current `app/globals.css`: both lines (`--background: 230 18% 3%`, `--background-subtle: 225 15% 5%`) byte-identical, re-verified directly. |
| 3 | Marketing purple untouched | ✓ VERIFIED | `git diff 073c87fe..010babb3` filtered for `purple\|violet\|pink` shows matches only inside the new palette-literal guard test's own hue-name list (`__tests__/token-palette-literals.test.ts`), which is scanning *for* those spellings, not introducing them. No production file's rendered colour changed. |
| 4 | None of the 305 `text-accent` call sites migrated | ✓ VERIFIED | `grep -roE 'text-accent\b' app components \| wc -l` → `305` and `grep -roE 'text-accent-foreground' app components \| wc -l` → `9`, both re-run live, matching the pre-phase and post-phase counts recorded throughout the plans and SUMMARYs. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `tailwind.config.js` | 11px `xs`, 15px step, 10 pixel-named aliases, `textColor.accent`, `colors.standby` | ✓ VERIFIED | All present and correctly wired; re-verified with `node -e` config checks. |
| `app/globals.css` | Corrected muted, new `--accent-text`, lifted dark ramp, new `--standby`/`--standby-foreground` | ✓ VERIFIED | All values match the plan's value tables exactly, confirmed with direct grep of every changed line. |
| `__tests__/design-tokens/contrast.ts`, `report.ts`, `source-files.ts` | Shared contrast/scan library and runnable report | ✓ VERIFIED | Exist, exports match spec, `report.ts` re-run live produces the exact table cited in `07-EVIDENCE.md`. |
| `__tests__/type-scale-floor.test.ts`, `token-contrast.test.ts`, `token-palette-literals.test.ts` | Executable guards for TYPE-01/COLOR-01/COLOR-02/COLOR-06 | ✓ VERIFIED | All exist; combined with the raid-tracking test, 74/74 pass on live re-run. |
| `scripts/visual/baseline.mjs` | Puppeteer capture instrument | ✓ VERIFIED | Exists, produced the committed before/after baselines. |
| `.planning/workstreams/design-system/baselines/2026-09-16-{pre,post}-phase-07/` | Fixed screenshot set | ⚠️ PARTIAL | Both directories exist, are committed, and match each other exactly — but contain only the public (Home) half of the fixed set, not the app-page half. See criterion 5 above. |
| `.planning/workstreams/design-system/phases/07-token-foundation/07-EVIDENCE.md` | Phase evidence record | ✓ VERIFIED | Exists, contains all 6 required sections, every contrast number re-verified live against the committed report script with zero drift. |
| `07-DECISIONS.md` | Recorded open-item resolutions and go-ahead | ✓ VERIFIED | Contains all 4 `OI-N RESOLVED:` lines, the `GO-AHEAD: approved 2026-09-16 by Alexander Mayes` line, and the `PUPPETEER-24.43.1: approved` line. No environment-variable value present anywhere in the file (re-checked with the exact acceptance-criteria grep). |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `__tests__/type-scale-floor.test.ts` | `tailwind.config.js` | imports config, asserts `fontSize` | ✓ WIRED | Test imports and asserts live; 17/17 passing. |
| `__tests__/token-contrast.test.ts` | `app/globals.css` | parses `:root`/`.dark`, computes WCAG ratios | ✓ WIRED | 31/31 passing, numbers match `report.ts` verbatim. |
| `tailwind.config.js` `theme.extend.textColor.accent` | `app/globals.css` `--accent-text` | `hsl(var(--accent-text))` | ✓ WIRED | Confirmed by compiled-CSS probe in 07-04 (re-verified: `text-accent` 305 sites, `text-accent-foreground` 9 sites unchanged). |
| `app/(app)/raid-tracking/components/RaidMemberList.tsx` | `tailwind.config.js` `colors.standby` | `text-standby`/`bg-standby/15` | ✓ WIRED | Confirmed present at line 73, `colors.standby` is a full object resolving both utilities. |
| `package.json` `visual:baseline` | `scripts/visual/baseline.mjs` | npm script | ✓ WIRED | Confirmed: `node -e` reads exact script string; baselines exist as a result of running it. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| TYPE-01 | 07-03 | 11px floor, 15px step, zero sub-11px arbitrary sizes | ✓ SATISFIED | Marked Complete in REQUIREMENTS.md; grep and test evidence above. |
| COLOR-01 | 07-04 | Dark muted 4.5:1 on 3 surfaces; light accent-text 4.5:1 on white | ✓ SATISFIED | Marked Complete in REQUIREMENTS.md; contrast evidence above. |
| COLOR-02 | 07-04 | Dark border and page-to-card step ≥ 1.2:1, values recorded | ✓ SATISFIED | Marked Complete in REQUIREMENTS.md; contrast evidence above. |
| COLOR-06 | 07-05 | status-badge/alert off Tailwind palette; `--standby` replaces 3 literals | ✓ SATISFIED | Marked Complete in REQUIREMENTS.md; palette-guard and grep evidence above. |

No orphaned requirements: REQUIREMENTS.md's Phase 07 row shows exactly these four IDs, all declared across the six plans' frontmatter and all marked Complete.

### Anti-Patterns Found

None. Scanned every file this phase created or modified for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` and placeholder-style prose (`placeholder`, `coming soon`, `not yet implemented`, etc.) — zero matches across `app/globals.css`, `tailwind.config.js`, all `__tests__/design-tokens/*`, the three guard test files, `scripts/visual/baseline.mjs`, both status primitives, and the three raid-tracking files.

### Behavioral Spot-Checks / Probe Execution

Not applicable in the probe-execution sense (no `scripts/*/tests/probe-*.sh` files exist and none are referenced by this phase's plans). The phase's own guard tests serve this role and were run directly:

| Behavior | Command | Result | Status |
|---|---|---|---|
| Type-scale floor and sub-11px absence | `npx vitest run __tests__/type-scale-floor.test.ts` | included in combined run below | ✓ PASS |
| Contrast floors (muted, accent, ramp, standby) | `npx vitest run __tests__/token-contrast.test.ts` | included in combined run below | ✓ PASS |
| Palette-literal absence (5 files) | `npx vitest run __tests__/token-palette-literals.test.ts` | included in combined run below | ✓ PASS |
| Standby cell-state distinctness | `npx vitest run "app/(app)/raid-tracking/components/__tests__/cell-state.test.ts"` | included in combined run below | ✓ PASS |
| Combined | `npx vitest run __tests__/type-scale-floor.test.ts __tests__/token-contrast.test.ts __tests__/token-palette-literals.test.ts "app/(app)/raid-tracking/components/__tests__/cell-state.test.ts"` | 4 files, 74 tests, all passing | ✓ PASS |
| Full workspace test suite (run once) | `npm run test` | 1176/1176 passing | ✓ PASS |
| Lint | `npm run lint` | 0 errors, 397 pre-existing warnings | ✓ PASS |
| Typecheck | `npm run typecheck` | exit 0 | ✓ PASS |

### Human Verification Required

Harvested from `.planning/WINDOWS.md` (entries 4, 5, 6, all `unrun-verify`, phase 07, `status: open`) plus one item this verification identified independently (the criterion-5 screenshot-set shortfall). See the frontmatter `human_verification` list above for full detail; summarized:

1. **Dark surface/border ramp visual judgment** (WINDOWS #4) — card-readability against the pre-phase baseline, on a card-dense screen. Not resolvable against the current Home-only baseline set.
2. **Standby colour distinctness** (WINDOWS #5) — the standby amber must read as visually distinct from late-yellow and accent-orange on the actual raid-tracking page.
3. **Combined ramp/standby judgment on an authenticated screen** (WINDOWS #6) — explicitly notes the post-phase-07 capture is Home-only and "cannot itself confirm" the above two.
4. **ROADMAP success criterion 5's app-page screenshot requirement** — needs either an app-page capture (requires a service-role credential currently out of scope) or an explicit human decision to accept the Home-only symmetric pair as sufficient.

## Gaps Summary

No must-have is definitively FAILED. Every mechanically-checkable claim in this phase — the type floor, the two contrast requirement families, the palette-literal migration, the standby token, lint/typecheck/test, and all four standing constraints (no copy changes, page/sidebar backgrounds untouched, marketing purple untouched, no `text-accent` migration) — was independently re-run against the current codebase and matched the SUMMARY and EVIDENCE claims exactly, with no drift.

The one open item is process, not defect: ROADMAP success criterion 5 literally asks for a screenshot set covering "one public page, one app page," and the committed before/after baselines are Home-only by a deliberate, symmetric, transparently-documented fallback (D-16: no `loadtest/test-users.json`, no `SUPABASE_SERVICE_ROLE_KEY` in scope for the two capturing plans). The phase's own evidence record and the project's Broken Windows Ledger already flag this and the two visual-judgment items it blocks as open — nothing here was hidden or silently absorbed. This phase's own artifacts already did the work of surfacing it; this verification is escalating the same three ledger entries plus the specific criterion-5 gap to a human decision rather than letting the phase report "passed" while a literal success criterion and three open ledger entries remain unresolved.

---
*Verified: 2026-09-16*
*Verifier: Claude (gsd-verifier)*
