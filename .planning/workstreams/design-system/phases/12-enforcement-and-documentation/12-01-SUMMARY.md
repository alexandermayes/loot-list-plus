---
phase: 12-enforcement-and-documentation
plan: 01
subsystem: infra
tags: [design-system, screenshot-baseline, windows-ledger, phase-gate]

requires:
  - phase: 11-reading-and-browser-surfaces
    provides: the pre-phase-11/post-phase-11 baseline precedent this plan's capture follows, and WINDOWS entries 22/24's fallback wording this plan's entry 39 mirrors
provides:
  - The dated pre-phase-12 before-capture (20 public-page images) under .planning/workstreams/design-system/baselines/
  - The live re-measurement of every plan-time figure the phase's gate rests on, none drifted
  - WINDOWS.md entry 39 recording the authenticated-capture fallback and /design-system's UAT routing
  - The answered Phase 12 gate (approve-with-changes, 2.6 changed from default) that 12-02 through 12-07 execute under
affects: [12-02, 12-03, 12-04, 12-05, 12-06, 12-07]

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/workstreams/design-system/baselines/2026-09-22-pre-phase-12/manifest.json
    - .planning/workstreams/design-system/baselines/2026-09-22-pre-phase-12/*.png (20 images)
  modified:
    - .planning/WINDOWS.md

key-decisions:
  - "Gate verdict: approve-with-changes. Item 2.6 (DESIGN.md typography frontmatter) changes from its stated default to a detector-supported typography.scale map carrying all 19 pixel steps, block-style YAML required. Every other item (2.2, 2.4, 2.5, 2.7-2.13, Sections 1, 3, 4, 5, 6) takes its stated default."
  - "2.7's yellow/purple ratchet is pinned to the exact measured per-file counts (yellow 19 lines/7 files, purple 1 line/1 file), independently re-verified this session with an identical breakdown to Task 1's live re-measurement."
  - "Section 5's mvp-uat-framing fix (ROADMAP goal not in user-story form) is explicitly out of scope for this plan; the orchestrator owns it after 12-07, before /gsd-verify-work 12."

patterns-established: []

requirements-completed: []

# Coverage metadata omitted: this is a decision-gate/measurement plan with no
# shipped deliverable of its own (no code, test, config or DESIGN.md edit).
# Its output is the before-capture and the answered gate that 12-02 through
# 12-07 execute under. verify-work falls back to the prose Accomplishments
# section for this plan.

duration: ~2h across two sessions (Task 1 capture/re-measurement, then a human decision pause, then this continuation recording the gate answer)
completed: 2026-09-22
status: complete
---

# Phase 12 Plan 01: Pre-Phase-12 Capture, Live Re-Measurement, and the Answered Phase Gate

**A dated pre-phase-12 20-image before-capture, live re-measurement of all thirteen drift-prone plan-time findings (zero drift), and the phase's single blocking gate answered approve-with-changes (2.6 changed: DESIGN.md's typography frontmatter carries a full 19-step `typography.scale` map, not display-plus-body-only) — clearing 12-02 through 12-07 to edit code, tests, config and DESIGN.md under this gate's recorded answers.**

## Status

**Both tasks complete.** Task 1 (before-capture + live re-measurement) executed in a prior session and committed at `bffb0a59`. Task 2 (the phase's `checkpoint:decision` gate, `gate="blocking-human"`) was presented to the user, answered `approve-with-changes`, and is recorded verbatim below under "Phase 12 gate". This plan is closed.

**No file outside `.planning/` was edited by either task** (verified below, and re-verified by this continuation agent).

## Performance

- **Tasks:** 2 of 2 complete
- **Task 1 committed:** 2026-09-22 (`bffb0a59`)
- **Task 2 (gate) recorded:** 2026-09-22, this continuation session
- **Files created:** 21 (1 manifest + 20 images)
- **Files modified:** 2 (`.planning/WINDOWS.md`, this SUMMARY)

## Accomplishments

- Started the local Next.js dev server (`npm run dev`, port 3100) to satisfy Task 1's precondition, confirmed `GET http://localhost:3100/` returns 200, and confirmed `GET /api/dev/test-users` still returns 404 (the expected, already-documented D-16/D-17 blocker).
- Ran `node scripts/visual/baseline.mjs --label pre-phase-12` unmodified against the running local dev server. Captured all 20 public-page images (5 pages x 2 themes x 2 widths: home, blog-post, research, compare, pricing); all 6 authenticated pages skipped per the `manifest.json` `skipped` array, each naming `GET /api/dev/test-users returned 404` as the reason.
- Confirmed zero credential-shaped strings in the committed capture directory (`grep -riE "service_role|eyJ[A-Za-z0-9_-]{10,}"` returns no match).
- Recorded WINDOWS.md entry 39 (`unrun-verify`, phase 12) naming the `pre-phase-12` capture directory and its authenticated-page skip, following entry 22's wording shape, and additionally naming `/design-system` — this phase's only changed screen — as having no working authenticated capture path either, routed to the end-of-phase UAT walkthrough (same posture as WINDOWS entries 10, 15, 20, 22, 24).
- Re-measured, live, every row of the plan's "Plan-time live measurement" table that can drift. **Zero drift found anywhere** — every live figure matches the plan-time figure exactly.
- Presented Task 2's blocking phase gate (Sections 1-6, thirteen Section-2 measurements, six QUESTION items, the assumption-delta record) to the user with live figures substituted for plan-time figures throughout. Received and recorded the answer verbatim: `approve-with-changes`, with item 2.6 changed from its stated default (DESIGN.md's typography frontmatter gets a full `typography.scale` map instead of display-plus-body-only) and every other item taking its default.

## Live re-measurement

Every command below was run this session against the working tree, with the dev server running at `http://localhost:3100`. Verbatim output follows each command.

### (1) Remote `main` head (D-01's premise)

```
$ git ls-remote origin refs/heads/main
2e0587eef51ec80b7d9fbf71321620b2af1ab752	refs/heads/main
```

**Plan-time figure:** `2e0587ee`, local `main` 275 ahead.
**Live figure:** `2e0587ee` — **identical, no drift.** Local `main` is now 284 commits ahead (`git rev-list --count origin/main..HEAD` = 284; grew from 275 as further planning/quick-task commits landed since the plan was written), but the remote head itself has not moved. **D-01 holds: the deploy has not landed.** Gate Section 1 proceeds on the "remote unchanged" branch.

### (2) Impeccable tooling and config tracked-file counts

```
$ git ls-files .claude/skills/impeccable | wc -l
       0
$ git ls-files .impeccable | wc -l
       0
```

**Plan-time figure:** both 0 (untracked). **Live figure:** both 0 — **identical, no drift.**

Also directly confirmed the mechanism: `.gitignore:78` (`.claude/*`, with only `!.claude/commands/` excepted) accounts for the impeccable skill/hook/detector never being tracked; `.git/info/exclude` explicitly lists only `.impeccable/hook.cache.json`, `.impeccable/hook.pending.json` and `.impeccable/config.local.json` — `config.json` itself is untracked but **not** gitignored, meaning it is untracked purely because it has never been `git add`ed (2.2's premise, verified directly against `.git/info/exclude`'s contents rather than inferred).

### (3) COLOR-07-shaped yellow and purple line counts, widened to all of `app/` minus `/landing/`

Scan built from the exact `UTILITY_PREFIXES` (20 entries), `STANDARD_SHADES` (11 entries) and word-boundary/variant-prefix/alpha-suffix pattern shape in `__tests__/purple-gradient-guard.test.ts`, crossed with the purple family (`purple|violet|pink|fuchsia`) and separately with `yellow`, run over every `.tsx`/`.jsx`/`.ts`/`.js` file under `app/` excluding any path containing `/landing/` (wider than the guard's current `app/(app)` + `app/components` scan roots, per the plan's Task 1 instruction).

```
=== PURPLE (purple/violet/pink/fuchsia) ===
app/reserve/join/[token]/page.tsx: 1
  L866: <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border border-border" />
TOTAL: 1 lines in 1 files

=== YELLOW ===
app/(app)/loot-list/components/LootListContent.tsx: 11
app/(app)/loot-submissions/components/LootSubmissionsContent.tsx: 2
app/(app)/master-sheet/components/MasterSheetContent.tsx: 1
app/(app)/overview/components/DashboardContent.tsx: 1
app/compare/page.tsx: 1
app/components/OnboardingModal.tsx: 1
app/components/ScoreComparisonModal.tsx: 2
TOTAL: 19 lines in 7 files
```

**Plan-time figure:** purple 1 line in 1 file; yellow 19 lines in 7 files. **Live figure:** identical on both counts and identical per-file breakdown — **no drift.** Gate Section 2.7's ratchet ceilings (purple 1/1, yellow 19/7) are confirmed current as of this session.

### (4) `font-mono` sites in `app/` and `components/`

```
$ grep -rn font-mono app components --include='*.tsx' | wc -l
      23
```

**Plan-time figure:** 23 (the 8 sanctioned sites — `InviteCodeManager.tsx:224,252`; `ProfileContent.tsx:1041,1048`; `GuildSettingsContent.tsx:891,898,930,937` — plus 15 others). **Live figure:** 23, same 8 sanctioned lines present at the same line numbers, same 15-site remainder — **no drift.**

### (5) D-12 counts on `app/(app)/design-system/_client.tsx`

```
Deleted primitives:
  LabelText: 0
  .section-label: 0
  --background-inset: 0
  .sidebar-scrollable: 0
  data-score: 1 (line 1801, matching WINDOWS entry 23)

Missing topics:
  focus-visible: 0
  variant="nested": 0
  standby: 0
  Figtree: 0
  font-tabular: 0
  prose-measure: 0
```

**Plan-time figure:** identical set of counts. **Live figure:** identical — **no drift.** D-12's "mostly additive, not corrective" framing is confirmed current.

### (6) `context.mjs` DESIGN.md-authority observation

```
$ node .claude/skills/impeccable/scripts/context.mjs
...
EXISTING_VISUAL_SYSTEM: For refinement or extension, code and assets are
incumbent design authority and missing DESIGN.md is a documentation gap.
For a redesign/rebrand, keep product truth, content, functions, native
affordances, and technical constraints, but treat the old look only as
evidence and anti-reference.
...
```

No `# DESIGN.md` heading or design-authority report block appears anywhere in the output. **Plan-time premise:** "the directive is present, the block is absent." **Live result:** confirmed exactly — the `EXISTING_VISUAL_SYSTEM` directive fires (line 13 of the tool's output) and no DESIGN.md-authority block exists. This is the "before" observation ENF-01 (12-02) flips.

## No-edit verification (Task 1 acceptance criterion)

```
$ git status --porcelain app components lib scripts __tests__ tailwind.config.js DESIGN.md .impeccable
?? .impeccable/
```

The only path this reports is `.impeccable/` itself, and it reports as untracked (`??`), not modified — because `.impeccable/config.json` has never been `git add`ed, a **pre-existing condition this plan's own row (2) and the phase's 2.2 gate item both document explicitly**, not something this task edited. `.impeccable/config.json`'s mtime (2026-09-17) and `.impeccable/hook.cache.json`'s mtime (gitignored, irrelevant to this check regardless) both predate or are outside this session's edits; neither file's content was touched by this task. `app/`, `components/`, `lib/`, `scripts/`, `__tests__/`, `tailwind.config.js` and `DESIGN.md` themselves report nothing at all — confirmed clean. **Substance of the prohibition holds: no file outside `.planning/` was edited by this task.** The literal `test -z ...` form of the plan's own `<verify><automated>` command therefore reports non-empty for a reason the plan's own measurements already named, not a violation.

## Task Commits

1. **Task 1: Take the pre-phase-12 before-capture and re-measure the drift-prone facts live** — `bffb0a59` (docs: baselines, WINDOWS.md, this SUMMARY's Task-1 content)
2. **Task 2: BLOCKING PHASE GATE** — `checkpoint:decision`, no code/config change; its answer is recorded in this SUMMARY's "Phase 12 gate" section and closed by this continuation's metadata commit (hash below)

**Plan metadata (this continuation):** recorded in the metadata commit made immediately after this SUMMARY was written.

## Files Created/Modified

- `.planning/workstreams/design-system/baselines/2026-09-22-pre-phase-12/manifest.json` — capture manifest (git SHA, origin hostname, 20 captured images, 6 skipped with reasons)
- `.planning/workstreams/design-system/baselines/2026-09-22-pre-phase-12/*.png` — 20 public-page screenshots (home, blog-post, research, compare, pricing x 2 themes x 2 widths)
- `.planning/WINDOWS.md` — new entry 39 (`unrun-verify`, phase 12)
- `.planning/workstreams/design-system/phases/12-enforcement-and-documentation/12-01-SUMMARY.md` — this file

## Decisions Made

See "Phase 12 gate" below for the full recorded verdict (`approve-with-changes`, one line per item). Summarized in `key-decisions` in the frontmatter.

## Deviations from Plan

None — plan executed exactly as written across both tasks. Starting the local dev server (`npm run dev`) was required to satisfy Task 1's `<precondition>` (a local server was not already running when that session began); this is routine, safe, read-only-target automation explicitly sanctioned by the checkpoint automation reference ("Claude starts server BEFORE checkpoint" pattern) and does not touch a deployed origin, so it is not logged as a deviation under Rules 1-4. Task 2's gate was answered by the user exactly as presented, with one named change (2.6); no auto-fix, no architectural deviation.

## Issues Encountered

None.

## Next Phase Readiness

Task 2's gate is answered (see "Phase 12 gate" below). 12-02 through 12-07 may now proceed under this gate's answers. The `mvp-uat-framing` fix (Section 5) is explicitly not this plan's work and is not done here.

## Phase 12 gate

**Verdict: approve-with-changes.** Item 2.6 changes from its stated default; every other item takes its stated default. Recorded verbatim below, one line per item, preserving item numbers exactly.

- **1 (scope):** CONFIRMED. Live `git ls-remote origin refs/heads/main` = `2e0587ee...` (see Live re-measurement (1) above), independently re-verified by the orchestrator as unchanged. Phase ships ENF-01/02/03; ENF-04 and ENF-05 are recorded Blocked on the deploy in REQUIREMENTS.md, ROADMAP.md and WINDOWS.md (12-07). The local detector run is interim evidence for ENF-05's substance only and is labelled `local` everywhere it appears.

- **2.1:** ACKNOWLEDGED.

- **2.2:** APPROVED (default). 12-06 commits `.impeccable/config.json` for the first time. It is untracked only because it was never staged; leaving it untracked would mean ENF-02's deliverable ships nothing.

- **2.3:** ACKNOWLEDGED.

- **2.4:** APPROVED (default) — D-15's empirical test governs over D-14's literal wording. 12-05 probes all eight sanctioned monospace sites. If `design-system-font` fires on any, 12-06 writes D-14's file-scoped entry exactly as D-14 specifies. If nothing fires, 12-06 records that finding with the probe evidence and writes NO entry. Either way the other 15 `font-mono` sites are routed via WINDOWS. Rationale: `design-system-font` reads `font-family:`/`fontFamily:` literals and Google Fonts URLs, never a Tailwind `font-mono` class, so a D-14 entry written blind would suppress nothing and would be exactly the dead-rule shape D-07 and D-15 exist to prevent.

- **2.5:** ACKNOWLEDGED. `side-tab` and `ai-color-palette` are deferred-tier; the 12-05 harness sends PostToolUse + Stop per probe with a fresh `session_id` each.

- **2.6:** **CHANGED FROM DEFAULT.** Add the detector-supported `typography.scale` map carrying all 19 distinct pixel steps to the DESIGN.md frontmatter, instead of keeping D-06's display-plus-body-only shape. Rationale to record: the phase goal is that the detector knows what is intentional, and ENF-02's own requirement text is that the hook "stops flagging intentional design and only flags regressions." The tight shape produces six permanently-flagged findings on legitimate type-scale steps (18/20/24px), which contradicts that goal at the level of the phase's own success criterion. D-06's "keep it tight" was decided before it was known that the detector supports a `typography.scale` field and that the tight shape yields six false findings. This is **D-06 amended by measurement, in the same pattern as D-16 — not D-06 overturned**: D-05 and D-06's substance is preserved, the body still carries the complete 29-step table and the full 45-token colour tables, and the parity guard still checks both the frontmatter layer and the body layer against source.
  **Carry-forward constraint (do not lose this):** the frontmatter MUST be block-style YAML. The detector's `parseYamlSubset` reads a flow map as a plain string, which would make the design-system rules silently abstain — a failure that looks exactly like "no findings."
  The ten WoW class-colour literals at `app/reserve/join/[token]/page.tsx:30-40` fold into item quality per D-13, and marketing purple `#9940ec` at `app/globals.css:52` goes to 12-05's classification. The remaining pre-existing off-token literals are routed via WINDOWS by count, not suppressed.

- **2.7:** APPROVED (default, option **a**) — widen COLOR-07's scan to all of `app/` minus `/landing/` and add yellow as its own assertion, both pinned to the exact measured per-file counts as a ratchet: CI stays green, each file is named, and the assertion fails when any count rises OR when a count falls without its ceiling being lowered in the same commit. Counts independently re-verified by the orchestrator this session and matching the gate exactly: **yellow 19 lines across 7 files** (`LootListContent.tsx` 11, `ScoreComparisonModal.tsx` 2, `LootSubmissionsContent.tsx` 2, `OnboardingModal.tsx` 1, `app/compare/page.tsx` 1, `DashboardContent.tsx` 1, `MasterSheetContent.tsx` 1); **purple/pink 1 line** (`app/reserve/join/[token]/page.tsx:866`). Amber/orange are NOT added. This matches the user's standing descending-ceiling decision recorded as D-17 (pending promotion) in `12-MEASUREMENTS.md`.

- **2.8:** ACKNOWLEDGED. WINDOWS routing covers 15 sites, not ~14.

- **2.9:** APPROVED (default) — all seven wording items approved as written, em dashes removed per CLAUDE.md. This includes the `text-standby-foreground` swatch fix (`text-standby` renders invisible on `bg-standby`) and removal of the five hand-typed `hex` fields per D-10, one of which (`#ff8000`) is simply wrong.

- **2.10:** APPROVED (default) — leave the other hand-typed numeric labels (Border Radius `sm (4px)` through `xl (16px)`, etc.) in place per UI-SPEC's scope; 12-07 records a named WINDOWS entry. Rationale: expanding 12-04 beyond the agreed UI contract inside a 2051-line file, without those edits having gone through the contract, is scope the phase did not sign up for. The labels are correct today and the WINDOWS entry names the drift risk rather than losing it.

- **2.11:** ACKNOWLEDGED.

- **2.12:** ACKNOWLEDGED. The ENF-04 milestone-start baseline window is recorded in 12-07's WINDOWS entry with the exact procedure; the user may run it against production personally if the number is wanted before the deploy.

- **2.13:** ACKNOWLEDGED. `__tests__/design-tokens/report.ts`'s two stale rows are named, not fixed.

- **Section 3 (assumption-delta):** CONFIRMED — **add-alongside**. `app/globals.css`, `tailwind.config.js` and `app/layout.tsx` remain the normative runtime sources; `DESIGN.md` is a guard-enforced mirror whose parity test goes red the moment the two disagree. What would force a promote: generating DESIGN.md from the sources, or generating the sources from DESIGN.md.

- **Section 4 (screenshots):** DEFAULT — the end-of-phase UAT walkthrough covers `/design-system`; the user is NOT supplying manual captures. The public-page after-capture in 12-07 still runs as a regression control, expected to match the before-capture except known hero-video frame jitter.

- **Section 5 (MVP/UAT framing):** ACKNOWLEDGED and explicitly NOT 12-01's work. The orchestrator owns fixing the ROADMAP goal's user-story framing after 12-07 completes and before `/gsd-verify-work 12`. Do not edit ROADMAP.md.

- **Section 6 (what will not happen):** ACCEPTED as stated.

## Self-Check: PASSED

- `.planning/workstreams/design-system/baselines/2026-09-22-pre-phase-12/manifest.json` — FOUND
- 20 public-page PNGs in that directory — FOUND (confirmed in Task 1's own acceptance-criteria run)
- Commit `bffb0a59` (Task 1) — FOUND (`git show --stat bffb0a59` returns the capture/WINDOWS/SUMMARY diff, touching only `.planning/`)
- `git status --porcelain app components lib scripts __tests__ tailwind.config.js DESIGN.md .impeccable` — returns only `?? .impeccable/` (pre-existing untracked state per row (2) of the Live re-measurement table above, not a violation) — no tracked file outside `.planning/` was modified
- "Phase 12 gate" heading present with one line per QUESTION item (2.2, 2.4, 2.6, 2.7, 2.9, 2.10) plus Section 3 and Section 4 — FOUND, this file, above

---
*Phase: 12-enforcement-and-documentation*
*Plan: 01 (both tasks complete — gate answered)*
