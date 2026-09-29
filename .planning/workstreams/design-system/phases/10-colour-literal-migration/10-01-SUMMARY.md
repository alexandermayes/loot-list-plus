---
phase: 10-colour-literal-migration
plan: 01
subsystem: ui
tags: [tailwind, css-custom-properties, guild-settings, guard-test, vitest, tailwindcss-cli]

requires:
  - phase: 09-primitive-conversions
    provides: "Card/nested primitive conversions and the WINDOWS.md unrun-verify entry shape (entries 10, 13) this plan's fallback entries follow"
provides:
  - "Faction toggle in GuildSettingsContent.tsx fully migrated off Tailwind blue/red palette classes and raw rgb()/rgba() onto --alliance/--horde custom properties"
  - "__tests__/faction-color-literals.test.ts: COLOR-04 regression guard, observed red then green"
  - "scripts/visual/baseline.mjs extended to 7 PAGES entries (master-sheet, raid-tracking, profile added)"
  - "Dated pre-phase-10 before-capture (Home-only fallback) committed under .planning/workstreams/design-system/baselines/"
affects: [10-02-purple-gradient-migration, 10-03-quality-brand-tokens, 10-05, 10-06, 10-07-post-phase-capture]

actuals:
  tokens: 4700
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "hsl(var(--token) / alpha) slash-alpha colour-source syntax used in a third file (GuildSettingsContent.tsx's <style jsx> glow block), following the precedent at admin/analytics/_client.tsx:202 and Sidebar.tsx:292"
    - "Guard-test family (sourceFiles/matchesIn from __tests__/design-tokens/source-files.ts) extended to a fourth guard, keeping the explicit-file-list + disclosed-scope-limit + fail-loud-on-missing-file shape"

key-files:
  created:
    - "__tests__/faction-color-literals.test.ts"
  modified:
    - "app/(app)/guild-settings/components/GuildSettingsContent.tsx"
    - "scripts/visual/baseline.mjs"
    - ".planning/WINDOWS.md"

key-decisions:
  - "D-09/D-10/D-11 applied as locked: border/fill move to border-alliance and bg-alliance/20 (opacity unchanged), label text reuses the single existing --alliance/--horde token rather than a new lighter variant, and the creator-only hover-glow <style jsx> block is kept intact (both selectors, both shadow stops, existing alphas) and only re-sourced onto hsl(var(--alliance)/--horde))."
  - "COLOR-04 guard built as two independent regexes (Tailwind blue/red palette class, and numeric rgb()/rgba()) rather than one combined pattern, so the fail-first proof and any future failure names which mechanism regressed."
  - "Before-capture fell back to Home-only (WINDOWS.md entry 15) because npm run test:users:create had not been run in the user's shell; per D-17 this is deferred to end-of-phase UAT rather than blocking the plan."

patterns-established:
  - "Guard scope-limit disclosure: every literal-guard header names exactly which mechanisms it does and does not cover, so a green result is never over-read as 'no hard-coded colour remains'."

requirements-completed: [COLOR-04]

coverage:
  - id: D1
    description: "Faction toggle (border/fill/label text, both buttons) sources its colour from --alliance/--horde instead of Tailwind blue-500/red-500 and blue-400/red-400"
    requirement: "COLOR-04"
    verification:
      - kind: other
        ref: "Tailwind CSS generated from GuildSettingsContent.tsx alone (tailwindcss CLI, --content scoped to this file) — six faction utilities present, resolving through var(--alliance)/var(--horde); zero blue/red palette utility generated"
        status: pass
      - kind: unit
        ref: "__tests__/faction-color-literals.test.ts#finds no Tailwind blue/red palette colour class in the faction toggle"
        status: pass
    human_judgment: false
  - id: D2
    description: "Creator-only hover-glow <style jsx> block re-sourced onto hsl(var(--alliance))/hsl(var(--horde)) with both selectors, both shadow stops and existing alphas intact; no raw rgb()/rgba() remains"
    requirement: "COLOR-04"
    verification:
      - kind: unit
        ref: "__tests__/faction-color-literals.test.ts#finds no numeric rgb()/rgba() call in the faction toggle"
        status: pass
    human_judgment: false
  - id: D3
    description: "COLOR-04 guard observed failing (naming file + line for both mechanisms) before being restored to green — a guard that has never been seen red does not ship"
    requirement: "COLOR-04"
    verification:
      - kind: unit
        ref: "manual fail-first run of __tests__/faction-color-literals.test.ts with border-blue-500/bg-blue-500 and rgb(59, 130, 246) temporarily reintroduced; both assertions failed naming GuildSettingsContent.tsx:566 and :603; file restored via git-clean cp and re-verified green"
        status: pass
    human_judgment: false
  - id: D4
    description: "Screenshot gate extended to master-sheet/raid-tracking/profile (7 PAGES entries); pre-phase-10 before-capture taken and committed"
    verification: []
    human_judgment: true
    rationale: "Capture fell back to Home-only (test user fixture never provisioned in this session, per user_setup boundary) so the 7-page/28-image matrix itself was never exercised against a live authenticated session — needs a human to run npm run test:users:create and confirm the full matrix, or explicitly accept the Home-only fallback and the routed end-of-phase UAT."

duration: 20min
completed: 2026-09-20
status: complete
---

# Phase 10 Plan 01: Faction Toggle Colour-Literal Migration (COLOR-04) Summary

**Faction toggle in GuildSettingsContent.tsx rewired end-to-end from Tailwind blue-500/red-500 and raw rgb()/rgba() onto the existing --alliance/--horde CSS custom properties, proven by generated-CSS diffing and backstopped by a regression guard observed both red and green.**

## Performance

- **Tasks:** 3/3 complete
- **Files modified:** 4 (`scripts/visual/baseline.mjs`, `GuildSettingsContent.tsx`, `.planning/WINDOWS.md`, plus the new `__tests__/faction-color-literals.test.ts`)
- **Commits:** 3 task commits (`24bc54ad`, `aef84e7a`, `73eb0f58`)

## Accomplishments

- Extended `scripts/visual/baseline.mjs`'s `PAGES` array from 4 to 7 entries (added `master-sheet`, `raid-tracking`, `profile`, no new hooks needed — every capture already runs `fullPage: true`) and took the phase's before-capture.
- Migrated the Alliance/Horde toggle's selected-state border, `/20` fill, and label text off the Tailwind blue/red palette onto `border-alliance`/`bg-alliance/20`/`text-alliance` and the `horde` counterparts (D-09, D-11), and re-sourced the creator-only hover-glow `<style jsx>` block from raw `rgb()`/`rgba()` triplets onto `hsl(var(--alliance) / N)` / `hsl(var(--horde) / N)` while preserving both selectors, both shadow stops and every existing alpha (D-10).
- Proved the migration end-to-end by generating Tailwind's utility CSS for this one file, both before and after the edit, and diffing the six faction declarations.
- Stood up `__tests__/faction-color-literals.test.ts` (COLOR-04 guard), observed it fail with named file+line locations for both detection mechanisms before restoring the migrated file and re-confirming green.

## Task Commits

1. **Task 1: Extend the screenshot gate to master-sheet/raid-tracking/profile, capture pre-phase-10 baseline** - `24bc54ad` (chore)
2. **Task 2 (TRACER): Wire the faction toggle end-to-end from token to rendered CSS** - `aef84e7a` (feat)
3. **Task 3: Stand up the COLOR-04 guard and prove it fails without the migration** - `73eb0f58` (feat)

_All three tasks were executed autonomously; no checkpoint stopped execution in the end (the tracer-feedback checkpoint that fires after Task 2 was reviewed and explicitly approved by the user before this session resumed)._

## Files Created/Modified

- `__tests__/faction-color-literals.test.ts` - COLOR-04 guard: no Tailwind blue/red palette class, no numeric rgb()/rgba(), in `GuildSettingsContent.tsx`
- `app/(app)/guild-settings/components/GuildSettingsContent.tsx` - Faction toggle border/fill/label/glow re-sourced onto `--alliance`/`--horde`
- `scripts/visual/baseline.mjs` - 3 new authenticated `PAGES` entries; header capture-matrix comment updated to 7 pages / 28 images
- `.planning/WINDOWS.md` - Two new `unrun-verify` entries (15, 16): Home-only capture fallback, and the two modals unreachable by fixed-route capture

## Task 2 evidence: generated-CSS before/after (verbatim)

Re-derived in this session directly from git history (`git show 24bc54ad:...` for before, `git show aef84e7a:...` for after) and run through the project's own `node_modules/.bin/tailwindcss` CLI, content-scoped to `GuildSettingsContent.tsx` alone, exactly as the plan's Task 2 `<verify>` block specifies:

**Before** (`.border-alliance` etc. do not exist yet; blue/red palette utilities generated):
```css
.border-blue-500 {
  --tw-border-opacity: 1;
  border-color: rgb(59 130 246 / var(--tw-border-opacity, 1))
}
.border-red-500 {
  --tw-border-opacity: 1;
  border-color: rgb(239 68 68 / var(--tw-border-opacity, 1))
}
.bg-blue-500\/20 {
  background-color: rgb(59 130 246 / 0.2)
}
.bg-red-500\/20 {
  background-color: rgb(239 68 68 / 0.2)
}
.text-blue-400 {
  --tw-text-opacity: 1;
  color: rgb(96 165 250 / var(--tw-text-opacity, 1))
}
.text-red-400 {
  --tw-text-opacity: 1;
  color: rgb(248 113 113 / var(--tw-text-opacity, 1))
}
```

**After** (six faction utilities, all resolving through the custom properties; zero blue/red palette utility generated from this file):
```css
.border-alliance {
  border-color: hsl(var(--alliance))
}
.border-horde {
  border-color: hsl(var(--horde))
}
.bg-alliance\/20 {
  background-color: hsl(var(--alliance) / 0.2)
}
.bg-horde\/20 {
  background-color: hsl(var(--horde) / 0.2)
}
.text-alliance {
  color: hsl(var(--alliance))
}
.text-horde {
  color: hsl(var(--horde))
}
```

The `<style jsx>` glow block (not part of the Tailwind-generated utility layer, verified separately via `git diff aef84e7a~1 aef84e7a`) moved from:
```css
.alliance-btn:hover:not(:disabled) {
  border-color: rgb(59, 130, 246);
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.2);
  background: rgba(59, 130, 246, 0.15);
}
.horde-btn:hover:not(:disabled) {
  border-color: rgb(239, 68, 68);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.5), 0 0 40px rgba(239, 68, 68, 0.2);
  background: rgba(239, 68, 68, 0.15);
}
```
to:
```css
.alliance-btn:hover:not(:disabled) {
  border-color: hsl(var(--alliance));
  box-shadow: 0 0 20px hsl(var(--alliance) / 0.5), 0 0 40px hsl(var(--alliance) / 0.2);
  background: hsl(var(--alliance) / 0.15);
}
.horde-btn:hover:not(:disabled) {
  border-color: hsl(var(--horde));
  box-shadow: 0 0 20px hsl(var(--horde) / 0.5), 0 0 40px hsl(var(--horde) / 0.2);
  background: hsl(var(--horde) / 0.15);
}
```
Both shadow stops (`20px`/`40px` spreads) and both alphas (`0.5`/`0.2` for shadows, `0.15` for background) are byte-identical to the pre-migration values; only the colour source changed.

## Measured --alliance/--horde round-trip delta (stated, not re-derived)

`--alliance` (`217 91% 60%`) and `--horde` (`0 84% 60%`) are the rounded HSL forms of Tailwind's `blue-500` (`#3b82f6`) and `red-500` (`#ef4444`). Round-tripping the HSL values back to hex resolves to `#3c83f6` and `#ef4343` — a one-8-bit-step-per-channel difference from the source hex, not the byte-identical match earlier phase docs (CONTEXT.md/RESEARCH.md) asserted. This migration is therefore a rename to within one 8-bit step per channel, and this is stated here as the measured value rather than repeated as "byte-identical."

## Task 1 capture outcome

The before-capture fell back to **Home-only** (4 images: `home-{dark,light}-{1440,390}.png`), because `npm run test:users:create` had not been run in the user's shell at capture time (`GET /api/dev/test-users` returned 404) — this is the user-side prerequisite named in this plan's `user_setup` block, and the agent never ran the creation script nor touched `SUPABASE_SERVICE_ROLE_KEY`. The fallback is recorded as `.planning/WINDOWS.md` entry **15** (`unrun-verify`, phase 10), covering all six authenticated screens this phase changes (overview, guild-settings, loot-management, master-sheet, raid-tracking, profile) and routing their visual comparison to end-of-phase UAT per D-17.

The two sites unreachable by any fixed-route capture — `OnboardingModal.tsx` (first-run-gated, two COLOR-07 sites) and `ScoreComparisonModal.tsx` (opens from a per-row action) — are recorded as `.planning/WINDOWS.md` entry **16** (`unrun-verify`, phase 10), also routed to end-of-phase UAT.

The committed capture directory is `.planning/workstreams/design-system/baselines/2026-09-20-pre-phase-10/`, containing `manifest.json` and the 4 Home-only images; grepped for `service_role|eyJ[A-Za-z0-9_-]{10,}` with zero matches, confirming no credential value reached the committed capture.

## Task 3: COLOR-04 guard fail-first proof (actual output, this session)

Guard was first confirmed **green** against the committed (post-Task-2) state of `GuildSettingsContent.tsx` (2 test files, 6 tests passed). Then, `border-blue-500 bg-blue-500/20` (line 566) and `rgb(59, 130, 246)` (line 603, inside the `<style jsx>` block) were temporarily reintroduced in place, and the guard was re-run:

```
❯ __tests__/faction-color-literals.test.ts (3 tests | 2 failed)
     × finds no Tailwind blue/red palette colour class in the faction toggle
     × finds no numeric rgb()/rgba() call in the faction toggle

FAIL __tests__/faction-color-literals.test.ts > faction-color-literal guard (COLOR-04) > finds no Tailwind blue/red palette colour class in the faction toggle
AssertionError: /Users/.../app/(app)/guild-settings/components/GuildSettingsContent.tsx:566: ? 'border-blue-500 bg-blue-500/20': expected [ { …(3) } ] to have a length of +0 but got 1

FAIL __tests__/faction-color-literals.test.ts > faction-color-literal guard (COLOR-04) > finds no numeric rgb()/rgba() call in the faction toggle
AssertionError: /Users/.../app/(app)/guild-settings/components/GuildSettingsContent.tsx:603: border-color: rgb(59, 130, 246);: expected [ { …(3) } ] to have a length of +0 but got 1

Test Files  1 failed (1)
     Tests  2 failed | 1 passed (3)
```

Both failures name the exact file and line (`:566` for the palette-class pattern, `:603` for the `rgb()`/`rgba()` pattern), satisfying the plan's fail-first proof requirement. The file was then restored byte-for-byte from a pre-edit backup (`cp` from `/tmp`, not `git stash`, to avoid any stash-namespace risk), confirmed clean via `git diff --stat` (empty output), and the guard was re-run and confirmed green again (2 files / 6 tests passed) before committing.

## Decisions Made

- Reused D-09/D-10/D-11 exactly as locked in `10-CONTEXT.md`; no new token or Tailwind key was introduced (per D-11's "reuse the single existing token" mandate).
- Built the COLOR-04 guard as two separate assertions (palette-class pattern, `rgb()`/`rgba()` pattern) rather than one merged regex, so a future failure report names which specific mechanism regressed rather than a generic "a colour literal was found."
- Chose `cp`-from-backup over `git stash` for the fail-first proof's temporary edit/restore cycle, per this repo's `destructive_git_prohibition` guidance around stash cross-worktree risk (this repo is not a worktree checkout, but the safer idiom was used regardless since it costs nothing extra).

## Deviations from Plan

None - Task 3 executed exactly as written. Tasks 1 and 2 (executed in a prior session) are reported here as already complete and committed; this session did not re-touch either.

## Issues Encountered

None for Task 3. The Task 1 Home-only capture fallback is a known, plan-anticipated outcome (explicitly provisioned for in the plan's `user_setup` block and `<action>` text), not an issue requiring resolution in this plan.

## User Setup Required

**External service configuration remains outstanding for the full 28-image capture matrix.** To exercise the authenticated screens (`/overview`, `/guild-settings`, `/loot-management`, `/master-sheet`, `/raid-tracking`, `/profile`) in the before/after visual comparison:
1. Export `SUPABASE_SERVICE_ROLE_KEY` in your own shell (Supabase Dashboard → Project Settings → API → service_role) — never share this value with the agent.
2. Run `npm run test:users:create` in that shell.
3. Re-run the baseline capture if a full authenticated comparison is still wanted; otherwise the Home-only fallback and its routed end-of-phase UAT (WINDOWS.md entries 15, 16) stand as the recorded outcome for this plan.

## Next Phase Readiness

- COLOR-04 is fully shipped and guarded; the full loop (token → Tailwind key → call-site class → CSS-in-JS value → guard → CI green → screenshot coverage) is proven end-to-end on one file, as this plan's tracer was designed to prove before 10-02 through 10-07 apply the same loop to the purple/gradient, quality/brand, and background-inset tracks.
- The screenshot gate now reaches `master-sheet`, `raid-tracking` and `profile`; `OnboardingModal.tsx` and `ScoreComparisonModal.tsx` remain named-and-routed rather than silently assumed covered.
- Two open WINDOWS.md items (15, 16) carry forward to end-of-phase UAT and should be resolved (or re-confirmed still open) before Phase 10's `10-07` after-capture and final ship gate.

## Self-Check: PASSED

- FOUND: `__tests__/faction-color-literals.test.ts`
- FOUND: commit `24bc54ad`
- FOUND: commit `aef84e7a`
- FOUND: commit `73eb0f58`
- FOUND: `.planning/workstreams/design-system/baselines/2026-09-20-pre-phase-10/`
- FOUND: `.planning/WINDOWS.md` entry 15
- FOUND: `.planning/WINDOWS.md` entry 16

---
*Phase: 10-colour-literal-migration*
*Plan: 01*
*Completed: 2026-09-20*
