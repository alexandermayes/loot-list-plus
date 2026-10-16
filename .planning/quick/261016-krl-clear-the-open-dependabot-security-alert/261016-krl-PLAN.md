---
quick_id: 261016-krl
slug: clear-the-open-dependabot-security-alert
date: 2026-10-16
status: complete
---

# Quick 261016-krl: clear the open Dependabot security alerts

## Objective

Main carried 54 open Dependabot alerts (3 critical, 24 high) across the root, companion and discord-bot lockfiles, and 18 stale Dependabot PRs that each conflicted with the next on package-lock.json. Land every bump that has a patched version without a dozen serial rebase rounds.

## Constraint found during execution

Resolving the root lockfile locally needs the npm.hugeicons.com credentials (`@hugeicons-pro/*`); only CI holds them, and npm's arborist crashes in `#loadPeerSet` when that registry answers 401. The root tree therefore had to land through Dependabot's own lockfile output.

## Tasks

1. companion/ and discord-bot/: `npm audit fix` (no private deps), verify with the companion typecheck, electron-vite build and unit tests, one PR.
2. Root: merge the open Dependabot branches into one combined branch so CI validates a single lockfile; skip any branch that conflicts and let Dependabot rebase it afterwards.
3. Close the superseded Dependabot PRs with a pointer to the PR that landed the bump; close majors that fail CI (tailwind 4 in the companion).
4. Repeat step 2 for the PRs Dependabot reopens against the new main.

## Verification

- CI Test and Companion jobs on each combined PR (npm ci rejects an inconsistent lockfile)
- `gh api repos/.../dependabot/alerts?state=open` after the merges
