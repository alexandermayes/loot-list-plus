---
phase: quick-260928-m5n
plan: 01
subsystem: repo-sync
tags: [git, merge, squash, design-system, preservation, publication]
status: complete
requires: []
provides:
  - "Local-only backup branch sync/local-main-2026-09-28 at 5ea55492 (a8a2c6d1 + docs merge + origin merge + conformance commit), never pushed"
  - "Pushed branch sync/local-main-2026-09-28-squashed: ONE commit ab21fd3c on origin/main aafb4a63"
  - "Draft PR #305 to main (open, unmerged): https://github.com/alexandermayes/loot-list-plus/pull/305"
affects: [local main reset after merge, wt-phase06 session (shares main)]
tech-stack:
  added: []
  patterns: ["merge-only integration, hunk-by-hunk resolution, scripted both-direction preservation check, plumbing squash via temporary GIT_INDEX_FILE + commit-tree"]
key-files:
  created:
    - /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/sync-checks/preserve.mjs
    - /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/sync-checks/resolutions.md
    - /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/sync-checks/squash-msg.txt
    - /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/sync-checks/squash-verify.txt
    - /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/sync-checks/scan-results.txt
    - /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/sync-checks/pr-body.md
    - /private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/231d8fc6-02b5-498f-83b0-d947fb328259/scratchpad/sync-checks/push-result.txt
  modified:
    - (worktree, M) .planning/workstreams/default/STATE.md, the 15 conflicted files and 4 conformance files
    - (S tree only, plumbing) .gitignore, scripts/analytics/exports/README.md (origin's blob), 2 ud3 planning docs (redacted), 9 exports removed
decisions:
  - "ForeverAnnouncementModal: inner dialog container tabIndex -1 to 0 (container excluded from its own Tab-trap list) so local Modal's focus trap lands on the dialog container, keeping origin's tested focus-on-open; nested-dialog semantics filed as GH #304, user chose to ship as-is"
  - "scripts/analytics/exports/README.md in S takes origin/main's blob (26307977), not M's (280ce166): local main's provenance notes are not published (user decision d)"
  - "Build: Turbopack rejects a node_modules symlink that points outside the project root; the wt-sync worktree now holds an APFS clone (cp -cR) of the main checkout's install instead"
metrics:
  started: 2026-09-28
  completed: 2026-09-28
actuals:
  tokens: 50900   # chars/4 over authored changes: resolved/conformed files + STATE.md diff vs a8a2c6d1, diff M..S, PR body, squash msg, preserve.mjs, resolutions.md
  tasks: 3
  commits: 4      # 3 on the local backup branch (docs merge, origin merge, conformance) + 1 squashed commit S
---

# Quick 260928-m5n: local main synced to GitHub as one squashed commit, draft PR #305

The 356 unpushed local-main commits are now in a single commit, `ab21fd3c` on origin/main `aafb4a63`, together with the docs/273 planning docs and a verified merge of origin's 17 PRs. That commit is open as draft PR #305. The 9 new analytics exports are excluded, the placeholder is redacted, and the full-history branch stays local.

## Outcome

| Item | Value |
|---|---|
| PR | **#305**, https://github.com/alexandermayes/loot-list-plus/pull/305, DRAFT, OPEN, base main, head sync/local-main-2026-09-28-squashed, 1 commit, 759 files |
| Squashed commit S | `ab21fd3c50c520b50e0f9c8fc22c5fbffcc98980`, sole parent `aafb4a63fb05b36e6f8069c0190d99e7801b87e7`, tree `0621cdec498f3fe8283f51c5b4dce1095a1a5177`, author alexandermayes@me.com, trailer present |
| Merged tree M (local backup) | `5ea5549245f04b440972a87369809c68390b7854` on sync/local-main-2026-09-28, **not on the remote** (ls-remote empty, checked after the push) |
| Push | Succeeded (`push-result.txt`, exit 0). Push protection did not trigger, so there are no unblock URLs. Explicit single refspec, no force, hooks active |
| Remote sync/* refs | Only `refs/heads/sync/local-main-2026-09-28-squashed` at ab21fd3c |
| Shared refs | main still `a8a2c6d1`, origin/main still `aafb4a63` (Part B fetch), the main checkout is still on docs/273-debug-resolved, and the wt-phase06 worktree (at a8a2c6d1 [main]) was never entered |

## Commits

| Commit | SHA | Where |
|---|---|---|
| Docs merge (DOCS = cec4f2ed) | 28d61528f0a548b601faf48082d1bc9c74135bc7 | local backup branch |
| Origin merge | 054efa22429357ee3d690ad2f55158da664ce829 | local backup branch |
| Conformance | 5ea5549245f04b440972a87369809c68390b7854 | local backup branch (= M) |
| Squashed sync | ab21fd3c50c520b50e0f9c8fc22c5fbffcc98980 | sync/local-main-2026-09-28-squashed, pushed |

Part A added no fix commit, so M is still 5ea55492.

## Task 1 (recap)

- **Deps gate:** passed. The manifests are byte-identical to the main checkout's, and origin changed neither. node_modules was a symlink at first; see the Part A build below.
- **STATE.md docs merge:** both sides' rows are kept in the 6-column layout, with the 2026-09-28 Last activity line.
- **Lint baseline:** 0 errors, 397 warnings.
- **Origin merge:** conflicts matched the 15 predicted paths.
- **Tracer:** 2 files, 34 tests, pass.

## Task 2 (recap)

**Resolutions.** All 15 conflicts were resolved hunk by hunk, keeping origin's behaviour with local's design-system changes. react-server-client-directive.test.ts is kept at local's version (U-02). The table is in PR #305 section 4 and `sync-checks/resolutions.md`.

**Conformance.** Four origin files were conformed to the guards:
- GuildPicker: LabelText replaced by Text (OI-7).
- GuildSettingsContent: text-11.
- ForeverAnnouncementBar: text-13.
- ForeverAnnouncementModal: text-13, plus the tabIndex semantic fix.

No guard, ceiling, allowlist or scanExclusions entry changed.

**Preservation:**
- Origin direction: 129 files (98 byte-identical, 31 line-checked, 830 lines). 0 unexplained misses, 9 explained.
- Local direction: 293 files (265 byte-identical, 28 line-checked, 338 lines). 0 misses.
- Origin test files: 44 byte-identical.
- Migrations: 4 origin, 0 local, no duplicates.

**Key symbols:** 29 of 29 checks, covering 17 of 17 origin commits.

**Origin test run:** 42 files, 778 tests, all pass.

## Task 3

### Part A: whole-tree verification on M

- **vitest (full suite):** 122 files and 2144 tests, all pass, exit 0 (`vitest-full.txt`). It ran at default concurrency with no worker timeouts, so --maxWorkers=2 was not needed.
- **tsc:** `npx tsc --noEmit` exits 0 (`tsc-full.txt`).
- **lint:** exit 0 (`lint-merged.txt`).
  - Errors: 0 on the baseline and 0 on M.
  - Warnings: 397 on the baseline and 398 on M, so +1 net.
  - Origin removed 2 no-unused-vars warnings (SetupGuide.tsx, app/api/guilds/change-expansion/route.ts).
  - Origin's expansion-image `<img>` tags added 3 `@next/next/no-img-element` warnings (CreateGuildModal.tsx +1, app/guild-select/create/page.tsx +2).
  - The other differences are only shifted line numbers. There are no new errors, so no fix commit was needed.
- **build:** PASS on the second attempt (`build.txt`): compiled in 32.2s, 145 of 145 static pages, exit 0. It used `NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-public-anon-key`, exported inline, and no env file was read.
  - Attempt 1 (`build-attempt1-symlink.txt`) failed with a Turbopack panic: "Symlink [project]/node_modules is invalid, it points out of the filesystem root".
  - Per the plan, the symlink was replaced with an APFS clone: `cp -cR` of the main checkout's node_modules onto the same volume (disk3s5). There was no network access, no install and no credential.
  - `npm ls --depth=0` then showed 0 missing/invalid/ERR lines.

### Part B: refs gate

After `git fetch origin`, origin/main is `aafb4a63` (unchanged) and main is `a8a2c6d1` (unchanged). No ref moved.

### Part C: squashed commit built with plumbing

The build used a temporary `GIT_INDEX_FILE` (`sync-checks/squash.index`, deleted afterwards). No checkout or reset was run, and no working tree or real index changed.
- **Exports:** M has 13 exports and origin/main has 4, so 9 were removed from the index (`exports-removed.txt`).
- **README:** `scripts/analytics/exports/README.md` was set to origin/main's blob `26307977` (M's blob is `280ce166`), per locked user decision (d).
- **.gitignore:** mode 100644. Two lines were added: a comment, and the exact line `scripts/analytics/exports/`.
- **Redaction:** the PLAN had 4 prefixed and 4 bare matches before and 0 after, with 4 tokens. The SUMMARY had 2 prefixed and 2 bare before and 0 after, with 2 tokens.
- **Commit:** `git write-tree`, then `git commit-tree -p aafb4a63`, then `git branch` (ref only).

### Part D: verification of S

`squash-verify.txt` records **32 PASS, 0 FAIL**:

1. S has one parent, `aafb4a63`, and `rev-list --count aafb4a63..S` is 1. origin/main is still aafb4a63.
2. `git diff --name-status M S` has exactly 9 D lines, equal to exports-removed.txt, and exactly **4** M lines: `.gitignore`, the two 260921-ud3 files and `scripts/analytics/exports/README.md`. No other line appears. Neither origin's 3 CSV exports nor ai-answer-log.csv are in the diff.
3. The .gitignore change removes no line, adds 2, and contains `scripts/analytics/exports/` as an exact line.
4. Redaction equivalence holds: after neutral-token mapping, the PLAN and SUMMARY are byte-identical between M and S. Token counts are 4 and 2, with no placeholder body left.
5. S's `ls-tree` under exports equals origin's 4 files exactly. **The 3 kept CSVs and scripts/analytics/ai-answer-log.csv equal M's blobs.** **README.md equals origin/main's blob** (26307977) and differs from M's. The 3 CSVs also equal origin's.
6. Repo-wide in S, 0 files have a live-key shape and 0 files have the placeholder body.
7. Toolchain equivalence:
   - No `*.ts/tsx/js/mjs/cjs/json` file names `analytics/exports` or `260921-ud3`.
   - The code in `eslint.config.mjs` has no includeIgnoreFile, no .gitignore read and no fs import. Its only textual "gitignored" is a comment at line 15, and it uses globalIgnores.
   - `vitest.config.ts` and `tsconfig.json` name none of the paths.
   - Result: the suite, tsc, lint and build on M apply to S unchanged. The PR's CI runs on S.
   - The first run of checks 5c, 7b, 7c and 7d was invalid. zsh read `$S:e`, `$S:s` and `$S:t` as history modifiers. Those checks were re-run with `${S}:` and the file holds the corrected lines.

The plan's Task 3 automated verify block (`sync-checks/task3-verify.sh`) was adapted for decision (d): 4 M lines, and the README equal to origin's. It prints **PASS**. It also asserts that main is still a8a2c6d1.

### Part E: pre-push scans (paths and counts only; `scan-results.txt`)

- **Secret shapes:** 759 files in `git diff aafb4a63 S` were scanned. **0 files hit** each of these patterns: Stripe live/restricted keys, whsec webhook secrets, JWT, PEM private-key headers, GitHub tokens, Slack tokens, AWS access key ids, Discord bot tokens, and the placeholder body.
- **Positive control:** the pattern `use client` hit 122 files, so the scan harness does report hits.
- **Data files in the diff:** only `scripts/analytics/ai-answer-log.csv`. It has 0 email shapes and 0 17-to-20-digit snowflake shapes.

### Part F: PR body

`pr-body.md` has all 12 sections: 0 em dashes, 0 conflict markers, 0 placeholder copies. Its last line is exactly the attribution line, and GitHub's stored body ends with it.
- The body says the README was kept at GitHub's version by user choice.
- The unresolved section references **#304**.

The area groups, as files against origin/main:

| Group | Files |
|---|---|
| Design system | 168 (includes the 3 KB-002 files) |
| Billing | 18 |
| Analytics | 21 |
| Blog/research/customers | 13 (design-system migrations only) |
| Agent tooling | 63 |
| Sync conformance | 4 |
| .planning | 472 |
| **Total** | **759** |

### Part G: push and PR

- **Push:** `git push -u origin sync/local-main-2026-09-28-squashed:sync/local-main-2026-09-28-squashed` exited 0 and created the new branch. There was no push-protection message.
- **PR:** `gh pr create --draft --base main` created #305. `gh pr view`: number 305, isDraft true, state OPEN, base main, head sync/local-main-2026-09-28-squashed, headRefOid ab21fd3c, 1 commit, 759 changed files.
- **Backup branch:** `git ls-remote --heads origin refs/heads/sync/local-main-2026-09-28` is empty.
- **Checks snapshot 1** (`pr-checks.txt`, about 20s after opening): Vercel Preview Comments pass, Companion pass, Load Test with Test Data skipping. Analyze (actions), Analyze (javascript-typescript), Run Load Tests, Test and Vercel were pending.
- **Checks snapshot 2** (`pr-checks-2.txt`, a few minutes later): **Vercel pass**, Vercel Preview Comments pass, Analyze (actions) pass, Run Load Tests pass, Companion pass. CodeQL (aggregate) and Load Test with Test Data were skipping. **Test and Analyze (javascript-typescript) were still pending.**

Not waited on, per the plan: the PR was not merged, no --admin was used and it was not marked ready.

## Excluded exports and restore command

The 9 files not in S are listed in `exports-removed.txt`:
- gsc-sprint-window-page-2026-08-24_2026-09-24.csv
- gsc-sprint-window-page-query-2026-08-24_2026-09-24.csv
- gsc-sprint-window-query-2026-08-24_2026-09-24.csv
- gsc-week4-cohort-query-2026-09-18_2026-09-24.csv
- posthog-activation-milestones-2026-08-24_2026-09-24.csv
- posthog-cta-breakdown-2026-08-24_2026-09-24.csv
- posthog-cta-funnel-2026-08-24_2026-09-24.csv
- posthog-dashboard-events-2036463_2036466.txt
- posthog-traffic-smoke-2026-08-24_2026-09-24.csv

All 9 are under scripts/analytics/exports/.

What stays in S:
- The 3 origin CSVs (gsc-baseline-cohort-query-2026-08-24_2026-08-30, gsc-trend-page-2026-05-24_2026-08-23, gsc-trend-query-2026-05-24_2026-08-23) are identical in M, S and origin.
- scripts/analytics/ai-answer-log.csv has M's content (user-approved).
- The exports README.md is **origin's** version (decision d).

After the reset of local main, restore only the 9, untracked, from the main checkout root:

```sh
git archive sync/local-main-2026-09-28 \
  scripts/analytics/exports/gsc-sprint-window-page-2026-08-24_2026-09-24.csv \
  scripts/analytics/exports/gsc-sprint-window-page-query-2026-08-24_2026-09-24.csv \
  scripts/analytics/exports/gsc-sprint-window-query-2026-08-24_2026-09-24.csv \
  scripts/analytics/exports/gsc-week4-cohort-query-2026-09-18_2026-09-24.csv \
  scripts/analytics/exports/posthog-activation-milestones-2026-08-24_2026-09-24.csv \
  scripts/analytics/exports/posthog-cta-breakdown-2026-08-24_2026-09-24.csv \
  scripts/analytics/exports/posthog-cta-funnel-2026-08-24_2026-09-24.csv \
  scripts/analytics/exports/posthog-dashboard-events-2036463_2036466.txt \
  scripts/analytics/exports/posthog-traffic-smoke-2026-08-24_2026-09-24.csv \
  | tar -x -C /Users/alexander.mayes/Code/personal/loot-list-plus
```

## After merge (post-merge reset steps, as in PR section 10)

1. The user, or the orchestrator once wt-phase06 frees main, resets local main to origin/main. Keep `sync/local-main-2026-09-28` as the backup.
2. Before the reset, confirm main still equals `a8a2c6d1`. If it does not, carry the newer local commits over first.
3. The reset deletes the working-tree copies of the 9 excluded exports. Restore them with the command above, or copy them aside first. The same applies to the docs/273-debug-resolved checkout when it next moves to a branch without them.
4. The reset also returns the exports README to origin's version. Local main's provenance notes remain on the backup branch.

## UNRESOLVED-FOR-USER

- **ForeverAnnouncementModal nested dialog semantics: GH #304 (open).** The user chose to ship as-is. There are two nested dialogs and two traps (they agree, and the tests pass). The outer dialog has no accessible name.
- **CI still pending at handback:** Test and CodeQL Analyze (javascript-typescript). Vercel already passes. Do not merge until both are green and the user has reviewed.
- No guard site was left unfixed, no ref moved, and no push-protection allowance was needed.

## Deviations from Plan

- **[Rule 1 - Bug] ForeverAnnouncementModal focus test (Task 2).** Fixed inside that file only, as recorded above.
- **[Plan-anticipated fallback] Build.** Turbopack rejected the node_modules symlink, so it was replaced with an APFS clone and the build was retried once. The wt-sync worktree's node_modules is now a real directory (a clone), not a symlink. Deleting the worktree later removes only the clone.
- **[User decision d] Exports README.** `scripts/analytics/exports/README.md` in S takes origin's blob. Part D therefore expects 4 M lines, not 3. The "4 blobs equal M's" check became "3 CSVs plus ai-answer-log.csv equal M's, and the README equals origin's".
- **Part C split.** The index work and `write-tree` ran in one Bash invocation, with GIT_INDEX_FILE scoped to it. `commit-tree` and `git branch` ran in a second invocation, after the group counts were computed from the tree for the commit message. commit-tree takes a tree SHA, so no index was involved.
- **Part D shell quoting.** The first pass of 4 checks was invalidated by zsh history modifiers and was re-run correctly (see Part D).
- **Area grouping.** "Blog, research and customers pages" turned out to be design-system edits only (13 files, no new posts). The PR body says so.
- Not committed: this SUMMARY and the other docs artifacts (per the instructions). STATE.md and ROADMAP.md were not updated.

## Artifacts (scratchpad/sync-checks)

resolutions.md, preserve.mjs, preserve-origin.txt, preserve-local.txt, preserve-explained.txt, symbols.txt, origin-tests.txt, conform-allowlist.txt, lint-baseline.txt, lint-merged.txt, vitest-full.txt, tsc-full.txt, build-attempt1-symlink.txt, build.txt, exports-in-merged.txt, exports-already-public.txt, exports-removed.txt, gitignore.new, redacted-PLAN.md, redacted-SUMMARY.md, squash-tree.txt, squash-msg.txt, diff-M-S.txt, squash-verify.txt, scan-files.txt, data-files.txt, scan-results.txt, groups.mjs, groups.json, pr-files.txt, pr-body.md, push-result.txt, pr-view.json, pr-checks.txt, pr-checks-2.txt, task3-verify.sh.

## Self-Check: PASSED

- The 4 commits exist: 28d61528, 054efa22 and 5ea55492 on the backup branch, and ab21fd3c on the squashed branch and the remote.
- PR #305 is open and in draft.
- The key artifacts exist.
- The Task 3 verify block prints PASS.
- The backup branch is absent from the remote.
