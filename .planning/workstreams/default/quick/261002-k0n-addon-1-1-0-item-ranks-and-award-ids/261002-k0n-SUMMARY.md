---
phase: quick-261002-k0n
plan: 01
subsystem: wow-addon
status: complete
tags: [addon, lua, luajit, scoring-parity, savedvariables, idempotency, admin-copy]
requires:
  - PR #344 (server: addon2 award key from awardId, ranks best last, removed rows and received copies left out)
  - PR #346 (companion 1.1.0: items and itemRanks in guildData, awardId forwarded)
provides:
  - addon 1.1.0 on alexandermayes/loot-list-plus-addon feat/addon-1.1.0 (local, 5 commits)
  - web-parity ScoreEngine.lua plus SE:GetCurrentItemRank
  - DB:GetAwardCount and DB:IncrementAwardCount (counts since the last import)
  - LD:NewAwardId, LD:RefreshSiblingLists, LD:ConsumeRank, LootFrame:RefreshAll
  - luajit test runner, harness and web-parity fixture generator in the addon repo
  - this repo without addon/ (W1) and the AP-2 admin line with a render test (W2)
affects:
  - in-game loot window, award records, /llp export string, score breakdown tooltip
  - app/(app)/admin/addon/_client.tsx
tech-stack:
  added: []
  patterns:
    - parity fixtures generated from the website's own scoring code, run with tsx from a LootList+ checkout
    - real addon module files loaded outside WoW with loadfile(path)("LootListPlus", LLP) and small API stubs
    - per-award id awardedAt-slot-random24 bits, matched against the server's own regex
key-files:
  created:
    - ADDON/tests/run.lua
    - ADDON/tests/harness.lua
    - ADDON/tests/test_score_engine.lua
    - ADDON/tests/test_ranks.lua
    - ADDON/tests/test_award_id.lua
    - ADDON/tests/tools/gen_web_fixtures.mts
    - ADDON/tests/fixtures/web_scoring.json
    - ADDON/tests/fixtures/export_string_ranks.txt
    - ADDON/tests/README.md
    - ADDON/CHANGELOG.md
    - WT/app/(app)/admin/addon/__tests__/client.test.tsx
  modified:
    - ADDON/Modules/ScoreEngine.lua
    - ADDON/Modules/Sync.lua
    - ADDON/Core/DB.lua
    - ADDON/Modules/LootDistribution.lua
    - ADDON/UI/LootFrame.lua
    - ADDON/UI/ScoreBreakdownTooltip.lua
    - ADDON/Core/Constants.lua
    - ADDON/LootListPlus*.toc (six files)
    - WT/README.md
    - WT/domain/scoring/index.ts
    - WT/domain/scoring/__tests__/fixtures.ts
    - WT/domain/scoring/__tests__/export-fixtures.ts
    - WT/app/(app)/admin/addon/_client.tsx
  deleted:
    - WT/addon/LootListPlus/Modules/ScoreEngine.lua
decisions:
  - "Addon import keeps every listed rank per item (itemRanks, best first) and the best rank in items, independent of the server's entry order (D-04)"
  - "Copies awarded since the last import are counted in profile.guildData.awardCounts, so /reload keeps them and every import resets them; a reset profile is never written into (D-05, OD-2)"
  - "Every addon award carries awardId = awardedAt-slot-six hex digits, accepted by the server's AWARD_ID regex (D-07)"
  - "Addon import accepts only numeric ranks (tonumber), so a malformed rank skips the entry instead of breaking the sort and the whole import"
  - "This repo no longer carries an addon copy; the addon repo is the only copy (OD-3)"
metrics:
  duration: "about 65 minutes"
  completed: 2026-10-02
estimate:
  tokens: 160000
  tasks: 4
actuals:
  tokens: 49236
  tasks: 4
  commits: 7
---

# Quick Task 261002-k0n: Addon 1.1.0, item ranks and award ids Summary

Addon 1.1.0 built locally: the web-parity ScoreEngine ported byte for byte, 60 luajit tests (43 checked against fixtures generated from the website's own scoring code), best-unawarded-rank selection with counts since the last import, per-award ids the server accepts, Role bonus and Raider bonus breakdown lines, version 1.1.0 with the signed-off changelog, a hand-share zip; this repo drops its stale addon/ copy and shows AP-2 on the admin page. Nothing pushed.

Paths: ADDON = SCRATCH/addon-repo (branch feat/addon-1.1.0 from 0c67406), WT = SCRATCH/wtaddon (branch chore/remove-in-repo-addon-copy, fast-forwarded to origin/main f87a359c before any change), SCRATCH = /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad.

## Commits

### Addon repo (feat/addon-1.1.0, local only, no upstream)

| # | Hash | Message | Files |
|---|------|---------|-------|
| A1 | 6bb1035 | Port the web-parity ScoreEngine from the LootList+ repo | Modules/ScoreEngine.lua (cmp-identical to origin/main:addon/LootListPlus/Modules/ScoreEngine.lua; body lists 3a4b1995, 8c74a2af, e7c57b6f, a50aaabb, f1b1e29e, 30a7422b, 6089e0d8) |
| A2 | 349ee8e | Add luajit unit tests and web-parity scoring fixtures | tests/ (run.lua, harness.lua, test_score_engine.lua, tools/gen_web_fixtures.mts, fixtures/web_scoring.json, fixtures/export_string_ranks.txt, README.md) |
| A3 | 0a1f3ed | Use each raider's best rank not yet awarded, and give every award its own id | Modules/Sync.lua, Core/DB.lua, Modules/ScoreEngine.lua, Modules/LootDistribution.lua, UI/LootFrame.lua, tests/test_ranks.lua, tests/test_award_id.lua, tests/run.lua, tests/harness.lua |
| A4 | ef11c23 | Show role and raider bonuses in the score breakdown | UI/ScoreBreakdownTooltip.lua |
| A5 | 5271850 | Version 1.1.0 and changelog | six .toc files, Core/Constants.lua, CHANGELOG.md |

### This repo (worktree WT, chore/remove-in-repo-addon-copy, local only)

| # | Hash | Message | Files |
|---|------|---------|-------|
| W1 | 9bfaa7b9 | chore(addon): remove the in-repo addon copy, the addon repo is the only copy (OD-3) | addon/ deleted; README.md, domain/scoring/index.ts, domain/scoring/__tests__/fixtures.ts, domain/scoring/__tests__/export-fixtures.ts (comments and README only) |
| W2 | 6d7e17fd | fix(admin): addon download line until the store listings exist (AP-2) | app/(app)/admin/addon/_client.tsx, app/(app)/admin/addon/__tests__/client.test.tsx |

Every commit carries "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". The addon clone got a local identity (Alexander Mayes, alexandermayes@me.com); global config untouched.

## Tests and parity

- `luajit tests/run.lua` (addon repo root): 60 passed, 0 failed, 0 known gaps. `--selftest-fail` exits 1. `--print-award-ids` prints 20 ids; SCRATCH/k0n-check-award-ids.mjs read the AWARD_ID literal `/^[A-Za-z0-9][A-Za-z0-9:._-]{7,63}$/` out of WT/lib/loot/addon-award-insert.ts and accepted all 20, all distinct (a negative input exits 1).
- Parity: 27 attendance cases (points-per-raid, linear, breakpoint at each threshold; late, benched, excused, no-call-no-show, points_override; empty records, zero raids, all excused), 4 loot score cases and 11 full score cases (import through Sync:ProcessImport, scored with GetItemPriorityList: rank modifiers on and off, role bonus, raider bonus with permanent, active-on-asOfDate, ended and not-yet-started entries, role, spec and character priorities including a null value, bad luck below and above the cap, trial penalty, a tie on total broken by rank) all match the website within 1e-9, including order. T5 imports a real LLP1:1 string built by buildMemberRankedItems (removed rank 60 absent, Sylvanas's received 45 skipped).
- Discrimination check: swapping in the 1.0.0 ScoreEngine makes 18 of the 43 parity tests fail; restored afterwards (git checkout of that one file).
- Regeneration: re-running the generator from WT at f87a359c reproduced both fixture files byte for byte (`git diff --exit-code -- tests/fixtures`). generatedFrom is the WT HEAD sha, so regenerating from a later LootList+ commit changes that field only.
- Every tracked non-library Lua file compiles under `luajit -b`; no goto, labels, bit library or require added outside tests/; no luac5.1 on the machine (none installed).
- Known gaps: none. No case was moved to KNOWN_GAPS.

### This repo, baseline vs final

| Check | Baseline (before any change) | Final |
|-------|------------------------------|-------|
| `npx tsc --noEmit` | exit 0 | exit 0 |
| `npx vitest run` | 18 files / 26 tests failed of 160 files / 2893 tests (nearly all 5000 ms timeouts; load average 68 to 111) | run 1: 3 failed of 2919 tests, 164 files (2 baseline timeouts, 1 new: ForeverAnnouncementModal); run 2: 34 failed of 2893, 162 files (33 timeouts and one follow-on failure; load average 150 to 210) |
| new FAIL lines (k0n-new-fails.sh) | n/a | run 1: 1 (it passed alone, together with the one file whose worker did not start); run 2: 19, all in files W1 and W2 do not touch; a targeted re-run of those 16 files plus the 3 unstarted ones failed only 3 tests that already fail in the baseline. Gate NOT green on a full run (open item below) |
| eslint on the four existing files | 0 errors, 3 warnings (export-fixtures.ts unused imports, pre-existing) | same 3 warnings, new test file clean |
| client.test.tsx alone | n/a (file did not exist; P1 and P2 failed before the AP-2 change) | 3 passed |

### Open item: the full-run vitest gate

Per the plan's flaky-timeout rule (h0v A-1): run 1 had one new FAIL line, which passed alone; the full suite was re-run once more, and run 2, at load average 150 to 210, had 19 new FAIL lines, all timeouts in files W1 and W2 do not touch (guards over app/, raid-tracking and master-sheet modals, blog, login, customers page, addon import dialog). A targeted re-run of those files passed apart from three tests that already fail in the baseline. The gate therefore did not pass on a full run, and this report stops there as the plan requires; nothing was committed around it. The code changes are a README edit, comment edits, the removed unused addon/ file, one text line on the admin page and its new test. Suggested: re-run the full suite once the machine is quieter, or let CI on the PR be the full run. Outputs: SCRATCH/final-k0n-vitest.txt, final-k0n-rerun-files.txt, final-k0n-vitest-run2.txt, final-k0n-rerun2-files.txt.

SCRATCH/k0n-new-fails.sh was fixed during the run: its trailing-whitespace strip also ate line breaks, and vitest's progress output uses carriage returns, so the first version compared one long blob. The fixed script gives exit 0 on the baseline against itself and reports the single real new line for run 1.

Incident: while filling in this SUMMARY, an unquoted shell heredoc turned two backquoted "npx vitest run" strings into command substitutions, which started vitest in the MAIN checkout. Both runs were stopped within a few minutes; git status in MAIN shows no tracked change.

## Deliverables in SCRATCH

- LootListPlus-1.1.0.zip: built with `git archive --format=zip --prefix=LootListPlus/ HEAD -- . ':(exclude)tests'`. 77 entries under one top folder LootListPlus/: the six .toc files, embeds.xml, CHANGELOG.md, Core/, Modules/, UI/, Textures/, Libs/ (LibDeflate included). No tests/ path. The .toc inside says ## Version: 1.1.0.
- pr-k0n-addon-body.md (addon repo PR draft) and pr-k0n-remove-addon-body.md (this repo's PR draft, W1 and W2).

## Decisions applied

- OD-8 (CurseForge and Wago via the packager once the projects and tokens exist): no .pkgmeta, workflow or store ids added; the zip is in SCRATCH only; the admin page shows AP-2.
- OD-10: commit A4 adds "Role bonus" and "Raider bonus".
- OD-2, OD-3, OD-7, OD-9 as settled in the plan.

## COPY status

- AR-1 to AR-5: applied verbatim in ADDON/CHANGELOG.md (heading plus four bullets).
- IG-1 "Role bonus" and IG-2 "Raider bonus": applied (A4).
- AP-2: applied (W2), pinned by the render test.
- AP-1: not applied; it replaces AP-2 once the store listings exist.
- No other player-facing or in-app text changed. No em dash in any added line, commit message or draft.

## Deviations from Plan

1. [Rule 3 - Blocking] origin/main had moved to f87a359c (the h0v docs PR #350) since the plan was written. WT was fast-forwarded to it first, as instructed. The engine file is identical at 8d81b1dc and f87a359c, so the port and A1's message (which names 8d81b1dc) are unaffected; the fixtures' generatedFrom is f87a359c.
2. [Rule 2 - Robustness] Sync:ProcessImport stores `tonumber(item.rank)` and skips entries whose rank is not a number. Without this, one string rank would make the best-first sort raise a Lua error and fail the whole import (T-k0n-02).
3. [Structure] The count increment, sibling rescore and RefreshAll call live in one helper, LD:ConsumeRank, called by AwardItem and ManualAward (ManualAward passes the single name match or nil). Behaviour is as D-08 and D-09 specify.
4. [Tracer gate] Config has auto mode off, which would pause after the Task 1 tracer for a human check. The tracer's verify is fully automated and passed (TASK1-VERIFY-OK), the plan is autonomous and the orchestrator asked for every task, so execution continued; the in-game human check is at the end.
5. [Generator detail] Section rules in gen_web_fixtures.mts use ASCII dashes, not box-drawing characters, so every added file is ASCII.

## Known limitations (unchanged by this plan)

- N-1: consumption is per officer; another officer's broadcast award does not count here (OnRemoteAward is a no-op and the broadcast has no awardId).
- N-2: a mid-raid import resets the counts, and awards not yet pasted on the website show their ranks again. Paste the export first, then import.
- N-3: the hover tooltip (TooltipHook) and Roster still show the best listed rank.
- N-4: web donation bonuses are not in game.
- N-5: the Lua default rank_modifiers is empty where the web default has sample ranks (the parity cases always send rank_modifiers).
- N-6: local BLP adds a pass per copy for non-winners, now also visible in the rescored second copy.
- N-7: the reset buttons point guildData at the defaults table by reference; D-05's guard keeps counts out of it (C7).
- N-8: .claude/CLAUDE.md (GSD-managed) still says the Lua addon lives in addon/.
- N-9: companion writes land only while WoW is closed.
- N-10: LootFrame rows are rebuilt on every Show; RefreshAll adds one rebuild per duplicate-item award.
- In LuaJIT the unseeded generator gives the same id sequence on every process start; in WoW math.random is a secure source. Ids would only collide for the same item, raider and second anyway.

## Human checks

Install SCRATCH/LootListPlus-1.1.0.zip into a test WoW client's Interface/AddOns. Run /llp import with a fresh website export for a guild where one raider listed Qiraji Bindings twice. With two Bindings in one loot window, award the first to that raider: the second row should show them at their second rank. Award it to them too, then paste /llp export on the website: it records copy 1 and copy 2, and pasting again reports both as already recorded. Check that a /reload between the two awards keeps the second rank and a fresh /llp import resets it. Hover a score for the Role bonus and Raider bonus lines. On the website, the WoW Addon admin page's info card shows the AP-2 line.

## Next steps

1. You approve the push and the PRs: the addon repo branch feat/addon-1.1.0, and this repo's PR with W1 and W2 (chore/remove-in-repo-addon-copy).
2. You create the CurseForge and Wago projects and tokens; a follow-up adds the packaging files and store ids and swaps AP-2 for AP-1.
3. Publish the companion-v1.1.0 draft together with the addon release (h0v OD-6).

## Threat Flags

None. No new endpoints, auth paths or schema changes. awardId is client-chosen, as designed in PR #344 (T-k0n-01).

## Self-Check: PASSED

All created files exist; commits 6bb1035, 349ee8e, 0a1f3ed, ef11c23, 5271850 (addon repo) and 9bfaa7b9, 6d7e17fd (WT) exist; the zip and both PR drafts exist in SCRATCH. Task 1, 2 and 3 verify chains printed OK; Task 4 passed every step except the full-run vitest gate (open item above). Nothing pushed, tagged, released, uploaded or opened as a PR; neither branch has an upstream. STATE.md and ROADMAP.md not touched (left to the orchestrator).

## Delivery (orchestrator, 2026-10-02)

- The full vitest gate that failed under heavy load was re-run by the orchestrator on a quiet machine after W2: 165 files, 2925 tests passing, tsc clean.
- Addon repo: feat/addon-1.1.0 pushed and merged into main as alexandermayes/loot-list-plus-addon PR #1 (rebase merge, keeping the five commits). The addon repo has no CI.
- This repo: PR #358 (W1 and W2) squash-merged as 20d7049d after every CI check passed.
- Not published: no CurseForge or Wago projects exist yet (the user creates them and the API tokens; a follow-up then adds .pkgmeta, the packager workflow and the store ids, and switches the admin page to AP-1). The companion-v1.1.0 release is still a draft. The 1.1.0 zip exists only in the session scratchpad for the user's in-game check.
- Still open: the four in-game and website checks in the verification report.
