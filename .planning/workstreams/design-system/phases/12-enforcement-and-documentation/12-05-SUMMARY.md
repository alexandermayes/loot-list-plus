---
phase: 12-enforcement-and-documentation
plan: 05
subsystem: design-system
tags: [impeccable, hook-probing, detector, measurement, enf-02, enf-05]

requires:
  - phase: 12-enforcement-and-documentation
    provides: "12-01's answered phase gate (items 2.2, 2.4, 2.5, 2.6 are binding); 12-02/12-03's DESIGN.md as the design authority the hook enforces"
provides:
  - "scripts/design-system/exercise-hook.mjs: repeatable two-pass (PostToolUse + Stop) hook probe harness with skip detection, per-emission cap raise, empty-override config swap, and hash-verified restore"
  - "scripts/design-system/enf02-probes.json: 19-probe manifest covering every sanctioned exception category, both D-13 audit items, the marketing-purple decision, all five pre-rewrite config entries, and two controls"
  - "12-CONFIG-BEFORE.json: byte-identical, hash-verified copy of the pre-rewrite .impeccable/config.json (D-07 provenance)"
  - "12-HOOK-PROBES-RED.json: red-arm transcript, both runs (currentConfig, emptyOverride), every probe valid, config hash restored after each"
  - "scripts/design-system/local-detector-run.mjs: localhost-only seven-page rendered detector wrapper, both viewports, labelled environment local"
  - "12-DETECTOR-LOCAL-RAW.json / 12-DETECTOR-SOURCE-DS.json: the local rendered census and the source-side DESIGN.md census"
  - "The ENF-02 classification table (below) -- proposed disposition for every category, backed by an observation -- presented to the user at the Task 3 blocking gate"
affects: [12-06, 12-07]

actuals:
  tokens: 189972
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Two-directional-control hook probing: every red-arm run carries a control that must flag on each hook tier (PostToolUse, Stop), or the run is discarded as instrument-not-discriminating"
    - "Config-swap-with-hash-verified-restore: an .impeccable/config.json override is backed up to the OS temp dir and restored in a finally block regardless of probe-loop exceptions, with a SHA-256 comparison as the correctness proof"
    - "stdout-to-file-descriptor workaround for spawnSync-captured child processes that call process.exit() immediately after a large stdout.write() (nodejs/node#6379)"

key-files:
  created:
    - scripts/design-system/exercise-hook.mjs
    - scripts/design-system/enf02-probes.json
    - scripts/design-system/local-detector-run.mjs
    - .planning/workstreams/design-system/phases/12-enforcement-and-documentation/12-CONFIG-BEFORE.json
    - .planning/workstreams/design-system/phases/12-enforcement-and-documentation/12-HOOK-PROBES-RED.json
    - .planning/workstreams/design-system/phases/12-enforcement-and-documentation/12-DETECTOR-LOCAL-RAW.json
    - .planning/workstreams/design-system/phases/12-enforcement-and-documentation/12-DETECTOR-SOURCE-DS.json
  modified: []

key-decisions:
  - "Task 1's own literal <verify> script requires control C1 (ai-color-palette on app/reserve/join/[token]/page.tsx) to flag in BOTH the currentConfig and emptyOverride runs. The measured, triply-confirmed behavior is that C1 does not flag under currentConfig -- the pre-existing config entry is still active during that run by its own 'no override' definition and correctly suppresses the finding. Kept the honest transcript rather than fabricating a false positive; documented as a deviation (see below). This is itself the plan's central D-07 finding for this file."
  - "The top-3 'quality-/brand- class usage' probe files were chosen excluding app/(app)/design-system/_client.tsx (the docs page itself, 12 uses -- a demonstration surface, not a production usage site): PremiumItemTooltip.tsx (5), RaidCardHeader.tsx (5), EditCharacterModal.tsx (2, tied with two others; picked by grep's listing order)."
  - "12-DETECTOR-SOURCE-DS.json measured 73 design-system-* findings in 31 files (67 colour, 3 radius, 3 font-size), close to but not identical to the plan-time synthetic estimate of ~79 in 31 files (68/3/8) -- the file count matches exactly, the per-rule breakdown differs slightly; both figures are recorded per the plan's own instruction to state the measured figure beside the estimate, not force agreement."

patterns-established: []

requirements-completed: []

status: complete
---

# Phase 12 Plan 05: ENF-02 Hook-Probe Harness, Red-Arm Transcript, Local Detector Census -- Classification Gate Answered

**Built and ran a two-pass hook-probing harness (19 probes, two controls, two full red-arm passes) plus a localhost-only seven-page rendered-detector wrapper; measured, rather than inferred, every sanctioned exception category and all five pre-rewrite config entries; the Task 3 blocking classification gate has now been answered (`approve-with-changes`) and the final entry list is recorded below for 12-06 to write.**

## Status

**All 3 tasks complete.** Tasks 1 and 2 executed and committed in the original run (`97f42373`, `4c6457bf`). Task 3 (`checkpoint:decision`, `gate="blocking-human"`) was UNANSWERED when the interim SUMMARY (`c09a1ada`) was committed; per the plan's own frontmatter (`autonomous: false`) and the checkpoint protocol this gate is never auto-approved, in any mode. **The user has since answered it** (`approve-with-changes`, verdict recorded verbatim below). This SUMMARY appends the answer to the original Tasks 1-2 record and closes the plan. `.impeccable/config.json` is still unmodified by this plan -- 12-06 is the plan that writes it for the first time, from the list recorded here.

At the moment this SUMMARY was finalized, `.impeccable/config.json`'s SHA-256 is identical to `12-CONFIG-BEFORE.json`'s (`2af6891edcd25cc06d1ec1429d0110b4f1a0552b557cdff352feec29f6a8b4c3`) -- reconfirmed below. No application code, and no `.impeccable/config.json` byte, was changed by this plan.

## Performance

- **Tasks:** 2 of 3 complete (Task 3 is the blocking gate, unanswered)
- **Files created:** 7 (3 scripts, 4 evidence artifacts)
- **Commits:** 2 (Task 1, Task 2)

## Accomplishments

- Built `scripts/design-system/exercise-hook.mjs`: drives `.claude/skills/impeccable/scripts/hook.mjs` (the hook this repo actually wires) with a PostToolUse event then a Stop event per probe, sharing one fresh `session_id`, argv-array `spawnSync` with no shell, env stripped of `IMPECCABLE_HOOK_DEPTH`/`CLAUDE_HOOK_DEPTH`/`IMPECCABLE_HOOK_DISABLED`. Raises the per-emission finding cap via a temporary, gitignored `.impeccable/config.local.json` (`{"hook":{"limits":{"maxFindings":200,"maxChars":200000}}}` -- key path confirmed against `hook-lib.mjs`'s `applyConfigSource`/`hookSection`). Refuses to start if that file already exists (exit 6) and always deletes it in a `finally` block.
- Built `scripts/design-system/enf02-probes.json`: 19 probes -- every criterion-2 category, both D-13 audit items, the marketing-purple decision, all five pre-rewrite config entries (re-judged from scratch per D-07), and two controls.
- Ran the red arm twice (`12-HOOK-PROBES-RED.json`): once under the unmodified current config, once with `ignoreValues` overridden to an empty array via a backed-up-and-restored `.impeccable/config.json`. Both runs: every probe valid (the hook actually scanned every file), config SHA-256 restored to the starting hash.
- Proved the harness correctly reports an unscanned file as invalid rather than clean: a single-probe manifest pointed at `package.json` (a `.json` extension the hook never scans) exits 3 with `invalidReasons: ["PostToolUse: extension", "Stop: no-touched-files"]` (verbatim below).
- Built `scripts/design-system/local-detector-run.mjs`: localhost/127.0.0.1-only wrapper (refuses any other origin before any network call, exit 2, no file written) running the rendered detector over exactly the seven ENF-04 pages at 1440x900 and 390x844, labelled `environment: "local"` everywhere.
- Ran the raw local pass (`12-DETECTOR-LOCAL-RAW.json`): 1230 non-advisory findings across 7 pages x 2 viewports; all four ENF-05 gating rules present in `gatingCounts`; every single gating finding is confined to the home page (`/`) at both viewports -- the other six pages show zero gating findings.
- Ran a separate source-side scan (`12-DETECTOR-SOURCE-DS.json`, `detect.mjs` over `app/`, `components/`, `lib/` with DESIGN.md active, filtered to `design-system-*`): 73 findings in 31 files, close to the plan-time synthetic estimate of ~79 in 31 files.
- Found and worked around a real bug in the shared, untracked `.claude/skills/impeccable/` detector CLI: `detectCli()` calls `process.stdout.write()` immediately followed by `process.exit()`, which truncates a `spawnSync`-captured JSON payload under Node's non-TTY pipe-write-vs-exit race (nodejs/node#6379) -- reproduced directly (a run was silently cut off mid-string at exactly 65520 bytes, no error, no stderr). Worked around in `local-detector-run.mjs` by redirecting the child's stdout to a real file descriptor instead of capturing the pipe.

## Task Commits

1. **Task 1: Hook probe harness and manifest, preserve the current exception list, red-arm** -- `97f42373` (feat)
2. **Task 2: Localhost-only seven-page detector wrapper and the raw local run** -- `4c6457bf` (feat)

Task 3 (the blocking classification gate) has no commit -- it is unanswered.

## Files Created

- `scripts/design-system/exercise-hook.mjs` -- the two-pass hook probe harness
- `scripts/design-system/enf02-probes.json` -- the 19-probe manifest
- `scripts/design-system/local-detector-run.mjs` -- the localhost-only seven-page detector wrapper
- `.planning/workstreams/design-system/phases/12-enforcement-and-documentation/12-CONFIG-BEFORE.json` -- verbatim pre-rewrite exception list
- `.planning/workstreams/design-system/phases/12-enforcement-and-documentation/12-HOOK-PROBES-RED.json` -- red-arm transcript, both runs
- `.planning/workstreams/design-system/phases/12-enforcement-and-documentation/12-DETECTOR-LOCAL-RAW.json` -- raw local rendered census
- `.planning/workstreams/design-system/phases/12-enforcement-and-documentation/12-DETECTOR-SOURCE-DS.json` -- source-side DESIGN.md census

## Task 1: Unscanned-file exit-3 check (verbatim)

```
$ node scripts/design-system/exercise-hook.mjs --probes <single-probe manifest for package.json> --out <out.json> --mode discover
EXIT: 3
```
Result: `{"valid": false, "invalidReasons": ["PostToolUse: extension", "Stop: no-touched-files"]}`. `test ! -e .impeccable/config.local.json` succeeds afterward. Confirms an unscanned file is reported invalid, never clean.

## Task 1: Per-probe observation table

Rules observed per pass (`PostToolUse` / `Stop`), per run. Empty means nothing fired. `#` after a rule name is the raw (pre-filter) `findings` count from the audit record where it differs between the two runs' rendered text (D-15: `findings` counts BEFORE ignore filtering, so a suppressed exception can still read `findings > 0`).

| Probe | File | Role | currentConfig (post / stop) | emptyOverride (post / stop) | Raw findings |
|---|---|---|---|---|---|
| rails | `app/(app)/raid-tracking/_client.tsx` | exception | -- / -- | -- / **side-tab** | 5 |
| quality-module | `lib/design-system/quality-colors.ts` | exception | -- / -- | -- / -- | 0 |
| quality-config | `tailwind.config.js` | exception | -- / -- | -- / -- | 0 |
| quality-brand-1 | `app/components/PremiumItemTooltip.tsx` | exception | -- / -- | -- / -- | 0 |
| quality-brand-2 | `app/(app)/raid-tracking/components/RaidCardHeader.tsx` | exception | -- / -- | -- / -- | 0 |
| quality-brand-3 | `app/components/EditCharacterModal.tsx` | exception | -- / -- | -- / -- | 0 |
| class-colours | `app/reserve/join/[token]/page.tsx` | exception | **design-system-color** / -- | **design-system-color** / **ai-color-palette** | 11 |
| skeletons | `components/ui/skeletons.tsx` | exception | -- / -- | -- / -- | 0 |
| mono-invite | `app/(app)/guild-settings/components/InviteCodeManager.tsx` | exception | -- / -- | -- / -- | 0 |
| mono-guild-confirm | `app/(app)/guild-settings/components/GuildSettingsContent.tsx` | exception | -- / -- | -- / -- | 0 |
| mono-profile-confirm | `app/(app)/profile/components/ProfileContent.tsx` | exception | -- / -- | -- / -- | 0 |
| score-numbers | `app/components/ScoreComparisonModal.tsx` | exception | -- / -- | -- / -- | 0 |
| how-it-works | `app/components/landing/LandingHowItWorks.tsx` | exception | **design-system-color** / -- | **design-system-color** / -- | 1 |
| marketing-purple | `app/globals.css` | exception | **design-system-color, design-system-radius** / -- | **design-system-color, design-system-radius** / -- | 3 |
| existing-skeletons-test | `components/ui/__tests__/skeletons.test.tsx` | existing-entry | -- / -- | -- / **side-tab** | 1 |
| existing-lootlist | `app/(app)/loot-list/components/LootListContent.tsx` | existing-entry | -- / -- | -- / **side-tab** | 1 |
| existing-onboarding | `app/components/OnboardingModal.tsx` | existing-entry | -- / -- | -- / -- | 0 |
| C1 (control) | `app/reserve/join/[token]/page.tsx` | control | design-system-color / -- (**ai-color-palette suppressed**) | design-system-color / **ai-color-palette** | 11 |
| C2 (control) | `app/components/KonamiEasterEgg.tsx` | control | **design-system-color** / -- | **design-system-color** / -- | 4 |

`startHash === endHash` in both runs (`2af6891e...`), confirmed byte-identical to `12-CONFIG-BEFORE.json`.

**Values observed (design-system-color, extracted from the finding lines' `ignore-value` hints):**
- **class-colours / C1** (`app/reserve/join/[token]/page.tsx`, the `WOW_CLASSES` array, lines 30-40): `#C79C6E` (Warrior), `#F58CBA` (Paladin), `#ABD473` (Hunter), `#FFF569` (Rogue), `#C41E3A` (Death Knight), `#0070DE` (Shaman), `#69CCF0` (Mage), `#9482C9` (Warlock), `#00FF96` (Monk), `#FF7D0A` (Druid) -- 10 distinct values (Priest's `#FFFFFF` does not flag; white is already an in-palette token). Raw `findings` is 11 (one value beyond these 10 was not individually identified from the capped rendered text; visible in the full transcript). **Every one of these ten values already exists, byte-identical, as a Tailwind theme key** (`class-warrior`, `class-paladin`, `class-hunter`, `class-rogue`, `class-deathknight`, `class-shaman`, `class-mage`, `class-warlock`, `class-monk`, `class-druid` -- confirmed in `tailwind.config.js`).
- **how-it-works** (`app/components/landing/LandingHowItWorks.tsx`): `#17151B` -- an unrelated, pre-existing off-palette literal in this file. `numbered-section-labels` (the rule this probe was actually testing) did **not** fire.
- **marketing-purple** (`app/globals.css`): `#9940ec` (the sanctioned marketing purple, `.text-shimmer-purple`) **and** `#ff8000` (a second, unrelated literal also present in `globals.css`) both flag `design-system-color`; `design-system-radius` also flags (this is the already-known `app/globals.css:339` `*::-webkit-scrollbar-thumb` `border-radius: 3px` finding from Phase 11, one of gate 2.6's three predicted radius findings -- pre-existing, not new, not this plan's to fix).
- **C2** (`app/components/KonamiEasterEgg.tsx`): `#ff8000`, `#0070dd`.

## Task 2: Origin-refusal check (verbatim)

```
$ node scripts/design-system/local-detector-run.mjs --origin https://example.com --mode raw --out /tmp/p12-refuse.json
Refusing to run: local-detector-run.mjs only ever measures a local dev server (protocol must be http, hostname must be "localhost" or "127.0.0.1"), got "https://example.com".
EXIT: 2
```
`test ! -e /tmp/p12-refuse.json` confirmed -- no file written.

## Task 2: LOCAL attribution table (raw local run, `12-DETECTOR-LOCAL-RAW.json`)

Every gating finding (`undersized-ui-text`, `tiny-text`, `low-contrast`, `nested-cards`) in the file, one row each; occurs identically at both viewports. `undersized-ui-text` and `tiny-text`: zero findings at either viewport, on any of the seven pages.

| Page | Viewport | Rule | Detail | Attribution |
|---|---|---|---|---|
| `/` | both | low-contrast | `3.4:1 (need 4.5:1) -- text #ff8000 on #50495f` | token/primitive (accent literal on a non-token background) |
| `/` | both | low-contrast | `4.4:1 (need 4.5:1) -- text #bababa on #50495f` | token/primitive (`#bababa` is the gate-2.11-named pre-existing off-token literal) |
| `/` | both | low-contrast | `2.5:1 (need 4.5:1) -- text #ffffff on #ff8000` | token/primitive |
| `/` | both | nested-cards | `Card inside card` (35 occurrences per viewport) | page-level layout (a repeated structural pattern on the homepage; carries to milestone B per ENF-05's own wording) |

Zero gating findings on `/pricing`, `/compare`, `/about`, `/research/wow-classic-loot-systems-2026`, `/blog/dkp-is-dead-what-classic-guilds-use-in-2026`, `/changelog`, at either viewport.

**Not required by the acceptance criteria, but notable and honestly recorded:** `ai-color-palette` fired 525 times per viewport, home page only (`perRuleCounts.ai-color-palette: 1050` total across both viewports) -- almost certainly a repeated decorative element (a starfield/particle background is the leading candidate) rather than 525 distinct design decisions. `ai-color-palette` is not one of ENF-05's four gating rules; not investigated further within this plan's scope. `line-length` (100) and `cramped-padding` (4) also fired, also not gating rules.

**Sanctioned-pattern cross-reference:** none of the sanctioned-pattern components (item-quality/brand colours, skeleton pulse, monospace sites, `ScoreComparisonModal`, `LandingHowItWorks`) are among the seven public pages this local run covers -- they are all authenticated-app or already-covered-by-source-scan surfaces. No cross-reference findings to report here.

## Task 2: Source-side DESIGN.md census (`12-DETECTOR-SOURCE-DS.json`)

`node .claude/skills/impeccable/scripts/detect.mjs detect app components lib --json`, filtered to `design-system-*`: **73 findings in 31 files** (plan-time estimate: ~79 in 31 files) -- `design-system-color` 67, `design-system-radius` 3, `design-system-font-size` 3 (estimate: 68 / 3 / 8). File count matches exactly; the per-rule split differs slightly from the synthetic estimate. Routed by count in 12-06, not suppressed (gate item 2.6).

## ENF-02 classification table (Task 3's content, presented verbatim)

One row per category. "Fired (nothing suppressed)" is read from the emptyOverride run (D-15: the run where an existing suppression cannot hide a live finding). "Proposed disposition" follows the plan's own classification rules exactly, with the observation that justifies it.

| Category | Source | Fired (nothing suppressed) | Proposed disposition |
|---|---|---|---|
| Raid-tracking legend rails | criterion 2 | `side-tab`, Stop pass, 5 raw findings (lines 2523/2527/2531/2535/2539) | **KEEP**: `{rule: "side-tab", value: "*", files: ["app/(app)/raid-tracking/_client.tsx"]}` -- reason unchanged (justified, 2026-09-15 audit + 07-05-PLAN.md) |
| Item-quality / brand hex (source module, config, and 3 highest-usage files) | criterion 2 | **NOTHING**, in either run, across all 5 probed files | **NO ENTRY** -- already tokenized (Phase 10 COLOR-05); recorded with this probe evidence per D-13/D-15 |
| DB/WoW class colours (`WOW_CLASSES`, `app/reserve/join/[token]/page.tsx:30-40`) | D-13 audit item / audit decision | `design-system-color`, PostToolUse, 10 distinct hex values | **10 file-scoped entries**, one per observed value (the rule carries a value, so the narrowest entry is value-specific, not wildcard) -- `{rule: "design-system-color", value: "<hex>", files: ["app/reserve/join/[token]/page.tsx"]}` for each of the 10 values above -- **plus a WINDOWS entry** routing the local colour map onto the already-existing, byte-identical `class-*` Tailwind tokens (confirmed present in `tailwind.config.js`). *Alternative for the user to consider: a single `{rule: "design-system-color", value: "*", files: [...]}` entry is simpler and still file-scoped, at the cost of being less literally "narrowest".* |
| Skeleton pulse (`animate-pulse`) | criterion 2 | **NOTHING** -- `pulsing-dot` never fired on `components/ui/skeletons.tsx` | **NO ENTRY** -- D-15 holds; recorded with this probe evidence |
| Monospace (3 files, all 8 sanctioned sites) | criterion 2 / D-14 (gate item 2.4, default branch) | **NOTHING** -- `design-system-font` did not fire on any of `InviteCodeManager.tsx`, `GuildSettingsContent.tsx`, `ProfileContent.tsx` | **NO ENTRY**, per the gate's own default branch. The other 15 `font-mono` sites route via WINDOWS unchanged |
| `ScoreComparisonModal` big numbers (D-13 item 1) | D-13 audit item | **NOTHING** | **NO ENTRY** -- consciously dropped, evidence nothing fires |
| Numbered how-it-works steps (D-13 item 2) | D-13 audit item | **NOTHING** for `numbered-section-labels` (an unrelated `design-system-color` literal `#17151B` fired instead) | **NO ENTRY** for the numbered-steps sanction -- consciously dropped, evidence nothing fires. `#17151B` is routed via WINDOWS by count as a separate, pre-existing off-palette literal, not suppressed |
| Marketing purple `#9940ec` (`app/globals.css`) | 2026-09-15 UI audit decision | `design-system-color`, PostToolUse, value `#9940ec` (plus an unrelated `#ff8000` and a `design-system-radius` finding in the same file) | **1 entry**: `{rule: "design-system-color", value: "#9940ec", files: ["app/globals.css"]}`. The co-located `#ff8000` and the `design-system-radius` (3px scrollbar-thumb, already-known Phase-11 finding) are **not** part of this sanction -- both route via WINDOWS by count, not suppressed |
| Existing: `components/ui/__tests__/skeletons.test.tsx`, `side-tab` | pre-rewrite entry | `side-tab`, Stop pass, 1 raw finding (line 25) | **KEEP**, re-labelled: false positive on a negative assertion (`expect(...).not.toContain('border-l-4')`), not a usage -- same file-scoped entry |
| Existing: `app/(app)/loot-list/components/LootListContent.tsx`, `side-tab` | pre-rewrite entry | `side-tab`, Stop pass, 1 raw finding (line 600) | **PROPOSED: REMOVE.** The entry's stated reason ("Phase 10 COLOR-04 scope") is wrong (COLOR-04 was faction colours only); the 2026-09-15 UI audit itself lists `side-tab rails LootListContent.tsx:599` among its **P1 findings**, not its legitimate exceptions. Route the live finding to milestone C's bracket-colour work via WINDOWS. **Flagged as an open question** -- keep as a named exception if the user prefers |
| Existing: `app/components/OnboardingModal.tsx`, `ai-color-palette` | pre-rewrite entry | **NOTHING**, raw findings = 0, in either run | **REMOVE** -- expired exactly as D-07 predicted (Phase 10 migrated the gradient, commit `5967189e`) |
| Existing: `app/reserve/join/[token]/page.tsx`, `ai-color-palette` (same file as class-colours / control C1) | pre-rewrite entry | Does **not** fire under currentConfig (suppressed by this very entry); **does** fire under emptyOverride, Stop pass, live finding at line 866 (`from-purple-500 to-pink-500` gradient). The entry's stated reason ("avatar-fallback gradient") does not match the live literal | **REMOVE** -- this is the exact finding D-07/D-08 exist to surface: the entry is currently live-suppressing the literal D-08 wants routed. The live gradient routes to milestone C, not suppressed |

**Controls (both runs):** C2 (`design-system-color` on `KonamiEasterEgg.tsx`) flagged on the PostToolUse pass in both runs, proving the immediate tier was live and discriminating throughout. C1 (`ai-color-palette` on `app/reserve/join/[token]/page.tsx`) flagged on the Stop pass in the emptyOverride run, proving the deep tier was live and discriminating once the suppressing entry was out of the way; it did **not** flag under currentConfig, because the config's own entry was still suppressing it there -- see the deviation below.

**Proposed final `ignoreValues` order** (criterion 2's order: rails, item quality and class colours, brand, skeleton pulse, monospace; then audit-decision entries; then retained false positives):

1. `side-tab` / `*` / `app/(app)/raid-tracking/_client.tsx` (rails, kept)
2. `design-system-color` / `#C79C6E` / `app/reserve/join/[token]/page.tsx` (class-warrior)
3. `design-system-color` / `#F58CBA` / `app/reserve/join/[token]/page.tsx` (class-paladin)
4. `design-system-color` / `#ABD473` / `app/reserve/join/[token]/page.tsx` (class-hunter)
5. `design-system-color` / `#FFF569` / `app/reserve/join/[token]/page.tsx` (class-rogue)
6. `design-system-color` / `#C41E3A` / `app/reserve/join/[token]/page.tsx` (class-deathknight)
7. `design-system-color` / `#0070DE` / `app/reserve/join/[token]/page.tsx` (class-shaman)
8. `design-system-color` / `#69CCF0` / `app/reserve/join/[token]/page.tsx` (class-mage)
9. `design-system-color` / `#9482C9` / `app/reserve/join/[token]/page.tsx` (class-warlock)
10. `design-system-color` / `#00FF96` / `app/reserve/join/[token]/page.tsx` (class-monk)
11. `design-system-color` / `#FF7D0A` / `app/reserve/join/[token]/page.tsx` (class-druid)
    -- (item quality/brand: no entries; skeleton pulse: no entry; monospace: no entry)
12. `design-system-color` / `#9940ec` / `app/globals.css` (marketing purple, audit decision)
    -- (both D-13 items: no entries)
13. `side-tab` / `*` / `components/ui/__tests__/skeletons.test.tsx` (retained, re-labelled)

No two proposed entries share the same rule, value and file set. `existing-lootlist` (open question) and both `ai-color-palette` entries (proposed removal) are excluded from this ordered list; the user's answer determines whether `existing-lootlist` is entry 14.

## ENF-02 classification: answered

**Verdict: `approve-with-changes`.** Both open branches flagged in the classification table above (the class-colours entry shape, and `existing-lootlist`'s disposition) were delegated to the orchestrator's judgement and resolved below as Decision A and Decision B. Everything else in the classification table is approved exactly as presented. This section is the authoritative, actionable input for 12-06 -- it records row identity so 12-06 can write `.impeccable/config.json` without re-deriving anything from the transcripts.

### Decision A -- class-colour entry shape: 10 narrow value-scoped entries, explicitly provisional

**Resolved:** one `design-system-color` entry per hex value for the 10 `WOW_CLASSES` literals at `app/reserve/join/[token]/page.tsx:30-40`. **NOT** a single wildcard file-scoped entry.

**Rationale:** a file-scoped wildcard suppresses every current *and future* colour finding in that file, which is structurally the identical mistake being removed from this same file this phase -- the `ai-color-palette` entry hid an unrelated live literal for two phases precisely because it was not pinned to specific values (see Decision B on `existing-reserve-ai-palette` below and the deviation discussion). Narrow, value-scoped entries keep a new, unsanctioned literal in that file visible to the hook.

**Provisional status:** because all 10 values already exist byte-identical as `class-*` Tailwind theme keys (`class-warrior`, `class-paladin`, `class-hunter`, `class-rogue`, `class-deathknight`, `class-shaman`, `class-mage`, `class-warlock`, `class-monk`, `class-druid` -- confirmed in `tailwind.config.js`), these 10 entries are **provisional, not permanent**. A WINDOWS entry (owned by 12-06 or 12-07, whichever plan owns routing) migrates the `WOW_CLASSES` literal array onto those existing tokens; once that migration lands, all 10 entries should be deleted. **The migration itself does NOT happen this phase** -- gate Section 6 records that guards widen and fixes route separately. Each of the 10 entries' `reason` field MUST state it is provisional and name the migration WINDOWS entry, so a future reader of `.impeccable/config.json` cannot mistake these for permanent sanctions.

### Decision B -- `side-tab` on `app/(app)/loot-list/components/LootListContent.tsx`: REMOVE, route to milestone C

**Resolved:** REMOVE the existing entry; route the live rail finding to milestone C via WINDOWS.

**Rationale:** the orchestrator independently confirmed that `.planning/workstreams/design-system/UI-AUDIT-2026-09-15.md` lists this exact line under its **P1 findings** ("side-tab rails LootListContent.tsx:599" plus configs 2022-2077), not among its legitimate exceptions. The entry's stated reason ("Phase 10 COLOR-04 scope") is also wrong -- COLOR-04 was faction colours only. Keeping the entry would place `.impeccable/config.json` in direct contradiction with the project's own audit, and D-07 is explicit that an entry which cannot be justified against current code does not go back in. Removed; the rail fix routes via WINDOWS to milestone C.

### Approved as presented (no change)

- **KEEP unchanged:** `side-tab` on `app/(app)/raid-tracking/_client.tsx` -- fires on Stop, 5 findings, matches `12-MEASUREMENTS.md` exactly.
- **KEEP, re-labelled:** `side-tab` on `components/ui/__tests__/skeletons.test.tsx` -- fires (1 finding), confirmed false positive on a negative assertion.
- **NEW, 1 entry:** `design-system-color` value `#9940ec` on `app/globals.css` (marketing purple, sanctioned). The co-located `#ff8000` literal and the `design-system-radius` 3px scrollbar-thumb finding are explicitly **NOT** sanctioned and route via WINDOWS. (The 3px radius is pre-existing Phase 11 work, commit `37a5b0d3`, and is one of gate item 2.6's three predicted radius findings -- route by count, do not suppress, do not fix.)
- **NO ENTRY, nothing fired in either run:** item-quality/brand hex (already tokenized in Phase 10); skeleton pulse (D-15 upheld -- no entry written on faith); all three monospace sanctioned-site files covering the 8 sites (gate item 2.4's default branch taken: nothing fired, so no entry, and the other 15 `font-mono` sites still route via WINDOWS unchanged); both D-13 audit extras (`ScoreComparisonModal` big numbers, numbered how-it-works steps) recorded as consciously dropped **with the evidence that nothing fires**. The unrelated `#17151B` literal that fired on the how-it-works file routes via WINDOWS separately.
- **PROPOSED REMOVE, approved:** `ai-color-palette` on `app/components/OnboardingModal.tsx` -- expired exactly as D-07 predicted; raw findings 0 in both runs; Phase 10 migrated the gradient (commit `5967189e`).
- **PROPOSED REMOVE, approved:** `ai-color-palette` on `app/reserve/join/[token]/page.tsx` -- the plan's central finding. This entry is currently, actively suppressing the live `from-purple-500 to-pink-500` literal at line 866 while its stated reason names an "avatar-fallback gradient" that is not what is there. Control probe C1 flags correctly once the entry is removed and is silently blocked while it stands.

### Deviation acknowledged, not to be forced to pass

Task 1's literal `<verify>` asserts control C1 must flag under both red-arm runs. It flags only under the `emptyOverride` run, because the `currentConfig` run by definition still has the live suppressing entry active. This is correct, expected behaviour -- confirmed three independent ways (manual hook invocation, `--no-config` CLI census matching `12-MEASUREMENTS.md`, static read of the suppression-matching logic; see the "Deviation Not Auto-Fixed" entry below, which remains the canonical record). Kept recorded as a deviation with that reasoning. The harness and the verify script were **NOT** edited to make the literal clause true -- the clause was written before the expired entry was understood.

### D-07 provenance requirement -- confirmed

Before 12-06 rewrites the config, the reasons and `createdAt` of every entry being dropped must survive in phase evidence. `12-CONFIG-BEFORE.json` (byte-identical to the pre-plan `.impeccable/config.json`, SHA-256 `2af6891edcd25cc06d1ec1429d0110b4f1a0552b557cdff352feec29f6a8b4c3`, reconfirmed above) already preserves them. The dropped entries and their preserved provenance:

| Dropped entry | `createdAt` (preserved in `12-CONFIG-BEFORE.json`) | Reason (preserved verbatim) |
|---|---|---|
| `side-tab` / `*` / `app/(app)/loot-list/components/LootListContent.tsx` | `2026-09-17T23:38:30.060Z` | "Pre-existing dynamic rank/quality-tier border color coding (borderColorClass variable)... Domain-meaningful color coding is Phase 10 (COLOR-04) scope, not Phase 08 primitives-only work." |
| `ai-color-palette` / `*` / `app/components/OnboardingModal.tsx` | `2026-09-17T20:39:50.271Z` | "Pre-existing purple/cyan gradient predates this session's edit... ROADMAP.md Phase 10 (COLOR-05) explicitly names 'the onboarding modal gradients and animated borders' as its own scoped, checkpoint-gated visual-proposal change..." |
| `ai-color-palette` / `*` / `app/reserve/join/[token]/page.tsx` | `2026-09-17T23:38:30.098Z` | "Pre-existing avatar-fallback gradient (no Discord avatar case)... ROADMAP.md Phase 10 explicitly names 'the sidebar and layout avatar fallback' gradients as its own scoped migration, not Phase 08's." |

Confirmed: no entry's provenance is lost. `12-CONFIG-BEFORE.json` is the durable record.

### Final intended `ignoreValues` set (explicit, in order) -- 12-06 writes this, does not re-decide it

1. `{rule: "side-tab", value: "*", files: ["app/(app)/raid-tracking/_client.tsx"]}` -- KEEP unchanged
2. `{rule: "design-system-color", value: "#C79C6E", files: ["app/reserve/join/[token]/page.tsx"]}` -- class-warrior, **provisional** (Decision A)
3. `{rule: "design-system-color", value: "#F58CBA", files: ["app/reserve/join/[token]/page.tsx"]}` -- class-paladin, **provisional** (Decision A)
4. `{rule: "design-system-color", value: "#ABD473", files: ["app/reserve/join/[token]/page.tsx"]}` -- class-hunter, **provisional** (Decision A)
5. `{rule: "design-system-color", value: "#FFF569", files: ["app/reserve/join/[token]/page.tsx"]}` -- class-rogue, **provisional** (Decision A)
6. `{rule: "design-system-color", value: "#C41E3A", files: ["app/reserve/join/[token]/page.tsx"]}` -- class-deathknight, **provisional** (Decision A)
7. `{rule: "design-system-color", value: "#0070DE", files: ["app/reserve/join/[token]/page.tsx"]}` -- class-shaman, **provisional** (Decision A)
8. `{rule: "design-system-color", value: "#69CCF0", files: ["app/reserve/join/[token]/page.tsx"]}` -- class-mage, **provisional** (Decision A)
9. `{rule: "design-system-color", value: "#9482C9", files: ["app/reserve/join/[token]/page.tsx"]}` -- class-warlock, **provisional** (Decision A)
10. `{rule: "design-system-color", value: "#00FF96", files: ["app/reserve/join/[token]/page.tsx"]}` -- class-monk, **provisional** (Decision A)
11. `{rule: "design-system-color", value: "#FF7D0A", files: ["app/reserve/join/[token]/page.tsx"]}` -- class-druid, **provisional** (Decision A)
12. `{rule: "design-system-color", value: "#9940ec", files: ["app/globals.css"]}` -- marketing purple, sanctioned (2026-09-15 UI audit decision)
13. `{rule: "side-tab", value: "*", files: ["components/ui/__tests__/skeletons.test.tsx"]}` -- KEEP, re-labelled false positive

Each of entries 2-11's `reason` field must state, verbatim or near-verbatim: "Provisional -- these 10 class-colour literals already exist as `class-*` Tailwind tokens; route via WINDOWS to migrate `WOW_CLASSES` onto the existing tokens, then delete this entry." Entries **NOT** in the final list (explicitly removed, per Decision B and the approved removals above): the former `side-tab` entry on `LootListContent.tsx`, and both `ai-color-palette` entries (`OnboardingModal.tsx`, `app/reserve/join/[token]/page.tsx`).

### WINDOWS routing owed (for 12-06 / 12-07 to write)

1. **WOW_CLASSES token migration** -- migrate the 10 hardcoded class-colour literals at `app/reserve/join/[token]/page.tsx:30-40` onto the existing, byte-identical `class-*` Tailwind theme keys; then delete the 10 provisional entries above (Decision A).
2. **LootListContent.tsx rail fix** -- the `side-tab` finding at `app/(app)/loot-list/components/LootListContent.tsx:599` (plus configs at 2022-2077), routed to milestone C per the 2026-09-15 UI audit's P1 classification (Decision B).
3. **`#ff8000` literal in `app/globals.css`** -- co-located with, but distinct from, the sanctioned `#9940ec` marketing purple; not sanctioned, route by count.
4. **3px scrollbar-thumb radius** -- `app/globals.css:339` `*::-webkit-scrollbar-thumb { border-radius: 3px }`, pre-existing Phase 11 work (commit `37a5b0d3`), one of gate item 2.6's three predicted radius findings; route by count, do not suppress, do not fix.
5. **`#17151B` literal** -- `app/components/landing/LandingHowItWorks.tsx`, an unrelated off-palette literal that fired instead of `numbered-section-labels` on the how-it-works probe; route by count.
6. **15 unsanctioned `font-mono` sites** -- the remaining `font-mono` usages outside the 8 sanctioned sites (3 of which -- `InviteCodeManager.tsx`, `GuildSettingsContent.tsx`, `ProfileContent.tsx` -- fired nothing and got no entry); route for a legitimacy review per gate item 2.4's default branch.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Worked around a stdout-truncation race in the shared, untracked detector CLI**
- **Found during:** Task 2 (raw local detector run)
- **Issue:** `detector/cli/main.mjs`'s `detectCli()` calls `process.stdout.write(...)` immediately followed by `process.exit(...)`. Under `spawnSync`'s piped (non-TTY) stdout, this write is asynchronous, and `process.exit()` terminated the process before the pipe finished flushing -- reproduced directly: the captured JSON was silently cut off mid-string at exactly 65520 bytes, `JSON.parse` throwing `Unterminated string`, no error and no stderr from the child. This is a well-known Node.js gotcha (nodejs/node#6379), not something specific to this harness.
- **Fix:** `local-detector-run.mjs` redirects the child's stdout to a real file descriptor (`openSync`/synchronous fs I/O) instead of capturing the `stdout` pipe, and reads the file back after the child exits. `.claude/skills/impeccable/` is shared, untracked infrastructure (`.gitignore:78`); fixing the root cause there is out of this plan's file scope.
- **Files modified:** `scripts/design-system/local-detector-run.mjs`
- **Verification:** The raw run now completes and parses correctly (1230 findings, all four gating rules present).
- **Committed in:** `4c6457bf` (Task 2 commit)

### Deviation Not Auto-Fixed (documented per the HARD GATE's "log as deviation if unsatisfiable after 2 attempts" rule)

**2. [Rule 1 - Plan/verify inconsistency] Task 1's literal `<verify>` script cannot pass on one sub-assertion, and should not be forced to**
- **Found during:** Task 1 (red-arm transcript)
- **Issue:** Task 1's `<verify><automated>` script requires control C1 (`ai-color-palette` on `app/reserve/join/[token]/page.tsx`) to appear in `rulesObserved` under **both** the `currentConfig` and `emptyOverride` runs. The `currentConfig` run is defined, by the plan's own action text, as "once with no override" -- i.e. the live, unmodified `.impeccable/config.json`, which **currently contains** `{rule: "ai-color-palette", value: "*", files: ["app/reserve/join/[token]/page.tsx"]}`. That entry legitimately suppresses this exact (rule, file) pair via `findingMatchesScopedIgnoreFile`'s trailing-path-segment-suffix match (confirmed by static code read of `hook-lib.mjs`'s `isIgnoredFindingValue`). Three independent confirmations, before concluding this was not a harness bug: (a) a manual `PostToolUse` + `Stop` invocation against the live hook, before this harness was even built, showed an empty Stop pass for this exact file; (b) a `--no-config` CLI census matches `12-MEASUREMENTS.md`'s independently-corroborated finding (1 finding, line 866) -- confirming the literal exists and the raw rule detects it, but only when config is bypassed; (c) the harness's own transcript shows `controlFailures: ["C1"]` under `currentConfig` and `controlFailures: []` under `emptyOverride`, with `startHash === endHash` in both runs (the config genuinely was, and remained, unmodified during the `currentConfig` run).
- **Why not "fixed":** The only ways to make the literal `<verify>` pass would be to (i) fabricate `rulesObserved` data that contradicts the real hook output, or (ii) redefine what "currentConfig" means, contradicting the plan's own explicit definition ("once with no override"). Neither preserves the plan's actual, stated purpose (D-09: proving the hook tiers were live and discriminating **at the moment the exceptions were observed**). The finding this produced -- that the reserve/join `ai-color-palette` entry is *currently, actively* suppressing a live literal -- is exactly the D-07 evidence Task 3's classification table above uses to propose removing that entry. Forcing a false "C1 flagged under currentConfig too" would have hidden the single most load-bearing observation in this plan.
- **Resolution:** Kept the honest, triply-confirmed transcript. C1's actual discriminating-power proof is anchored to the `emptyOverride` run (where it correctly flags, `controlFailures: []`, exit 0); C2 independently proves the PostToolUse tier in both runs. All other Task 1 acceptance criteria pass without qualification (unscanned-file check, config hash restoration in both runs, all 19 probes valid in both runs, 5 preserved entries with `createdAt` provenance, zero lint errors, no `shell: true`).
- **Files affected:** None (no code change -- this is a data/observation finding, not a bug in the harness).
- **Verification:** `12-HOOK-PROBES-RED.json`'s `emptyOverride.controlFailures` is `[]`; `currentConfig.controlFailures` is `["C1"]`, with the reason fully traceable in the same transcript.
- **Committed in:** `97f42373` (Task 1 commit; this finding is not itself a code change, so it carries no separate commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in shared infrastructure, worked around), 1 documented-not-fixed (Rule 1 - plan/verify inconsistency, resolved in favor of the empirically correct, more informative transcript).
**Impact on plan:** Neither deviation changes the plan's substance or scope. The second deviation IS the plan's substance -- it is the exact kind of measurement-over-assumption result D-07/D-09/D-15 exist to produce.

## Issues Encountered

None beyond the two deviations above.

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness

- **Task 3's classification gate is answered** (`approve-with-changes`; see "ENF-02 classification: answered" above). Both open questions are resolved: class-colours uses 10 narrow, explicitly provisional value-scoped entries (Decision A), and `existing-lootlist` (the `LootListContent.tsx` `side-tab` entry) is removed and routed to milestone C (Decision B).
- 12-06 writes `.impeccable/config.json` for the first time (its first-ever commit) from the final, ordered, 13-entry `ignoreValues` list recorded above, and writes `12-HOOK-PROBES-GREEN.json` proving the new config suppresses exactly what it should and nothing more.
- 12-07 (or 12-06, whichever owns routing) records the routed WINDOWS entries this plan named but did not act on: the WOW_CLASSES token migration (then delete the 10 provisional entries); the `LootListContent.tsx` rail fix to milestone C; the `app/globals.css` `#ff8000` literal (co-located with, but distinct from, the sanctioned marketing purple); the already-known `app/globals.css:339` radius finding; the `LandingHowItWorks.tsx` `#17151B` literal; the 15 unsanctioned `font-mono` sites; the 73 `design-system-*` source-scan findings by count; the home-page `nested-cards` layout finding (carries to milestone B); the 525-per-viewport `ai-color-palette` home-page anomaly (not a gating rule, not investigated further here).
- ENF-05 has its first LOCAL measurement (`12-DETECTOR-LOCAL-RAW.json`), correctly and consistently labelled `local` throughout, with every gating finding attributed. It does not satisfy ENF-05, which remains blocked on the deploy per D-01.
- `.impeccable/config.json` remains untouched by this plan (still `2af6891e...`, matching `12-CONFIG-BEFORE.json`). STATE.md and ROADMAP.md were intentionally NOT modified by this continuation -- that remains the orchestrator's responsibility once 12-06 executes.

## Self-Check: PASSED

- `scripts/design-system/exercise-hook.mjs` -- FOUND
- `scripts/design-system/enf02-probes.json` -- FOUND
- `scripts/design-system/local-detector-run.mjs` -- FOUND
- `.planning/workstreams/design-system/phases/12-enforcement-and-documentation/12-CONFIG-BEFORE.json` -- FOUND, SHA-256 `2af6891e...` matches `.impeccable/config.json`'s current hash
- `.planning/workstreams/design-system/phases/12-enforcement-and-documentation/12-HOOK-PROBES-RED.json` -- FOUND, parses as JSON, has `currentConfig` and `emptyOverride`, `startHash === endHash` in both
- `.planning/workstreams/design-system/phases/12-enforcement-and-documentation/12-DETECTOR-LOCAL-RAW.json` -- FOUND, `environment: "local"`, exactly the seven pages, both viewports, all four gating rules in `gatingCounts`
- `.planning/workstreams/design-system/phases/12-enforcement-and-documentation/12-DETECTOR-SOURCE-DS.json` -- FOUND, every finding has a `design-system-*` rule id, a value, and a file
- Commit `97f42373` (Task 1) -- FOUND in `git log --oneline`
- Commit `4c6457bf` (Task 2) -- FOUND in `git log --oneline`
- Commit `c09a1ada` (interim SUMMARY, Tasks 1-2 + classification table) -- FOUND in `git log --oneline`
- `npm run lint` -- 0 errors (397 pre-existing warnings, unchanged from 12-04's baseline)
- `test ! -e .impeccable/config.local.json` -- succeeds
- `.impeccable/config.json`'s current SHA-256 equals `12-CONFIG-BEFORE.json`'s -- reconfirmed at close-out (`2af6891edcd25cc06d1ec1429d0110b4f1a0552b557cdff352feec29f6a8b4c3`)
- Task 3 classification gate -- ANSWERED (`approve-with-changes`), recorded verbatim under "ENF-02 classification: answered"

---
*Phase: 12-enforcement-and-documentation*
*Plan: 05*
*Status: complete -- Task 3 classification gate answered; final ordered ignoreValues list recorded for 12-06*
