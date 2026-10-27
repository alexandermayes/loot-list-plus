---
phase: quick-261026-wpw
plan: 01
subsystem: battle-net-armory-gear-sync
tags: [spike, battle-net, item-level, blocked]
status: incomplete
verdict: INCONCLUSIVE
requirements: [WPW-R1, WPW-R2, WPW-R3, WPW-R4, WPW-R5, DELIVERY-R1]
key-files:
  created:
    - scripts/spikes/armory-item-level-spike.ts (branch feat/armory-item-level)
    - .planning/workstreams/forever/quick/261026-wpw-v1-armory-gear-sync-spike-battle-net-cla/261026-wpw-SPIKE.md
actuals:
  tasks: 1
  commits: 1
---

# Quick 261026-wpw: v1 armory gear sync, spike stopped at the gate

**Spike probe written, linted and committed, but it could not run: Blizzard credentials are not available to it, so the verdict is INCONCLUSIVE and Tasks 2 and 3 were not executed.**

## Verdict

**INCONCLUSIVE.** Per the plan, execution halted after Task 1. No guess was made.

Why: the probe ran from the main checkout (so `.env.local` resolves) and exited with code 2, printing only the names `BLIZZARD_CLIENT_ID` and `BLIZZARD_CLIENT_SECRET` as missing. `.env.local` exists but does not provide them. A further attempt to list which variable names `.env.local` does contain was blocked by the permission system, and I did not work around it. No variable values were read or printed.

## Task status

| Task | Status | Notes |
|---|---|---|
| 1 Spike and gate | Probe built, not run live. Verdict INCONCLUSIVE | SPIKE.md written with exactly one verdict line (grep count 1). `eslint` on the script is clean. |
| 2 Storage (migration and writers) | Blocked | Needs a GO verdict. No migration worktree or branch created. Timestamp collision check not yet done. |
| 3 Slot rules, read route, panel column | Blocked | Needs Task 2 Part B. Nothing written. |

Not run: `npm run lint`, `npm run typecheck`, `npm test` on the full code branch. The only change on it is the standalone spike script (eslint and a strict tsc check of that file pass), so full-suite results would say nothing about the feature.

## What the owner must run

Provide credentials to the probe in either of two ways, then run it from the main checkout.

Option A, add to `.env.local` (a Blizzard developer client, https://develop.battle.net/access/clients) the variables `BLIZZARD_CLIENT_ID` and `BLIZZARD_CLIENT_SECRET`, then:

```
cd /Users/alexander.mayes/Code/personal/loot-list-plus && npx tsx /Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-code/scripts/spikes/armory-item-level-spike.ts --from-db 10
```

Option B, samples of your own characters instead of the database (still needs the two Blizzard variables). Replace the placeholders with region/realm-slug/name entries separated by semicolons:

```
cd /Users/alexander.mayes/Code/personal/loot-list-plus && SPIKE_CHARACTERS="us/<realm-slug>/<name>;us/<realm-slug>/<name2>;us/<realm-slug>/<name3>" npx tsx /Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-code/scripts/spikes/armory-item-level-spike.ts
```

At least 3 samples must return 200. The printed JSON contains only labels, numbers, booleans and key names (no character or realm names, and the script exits 3 rather than print if one slipped in). Paste that JSON back and the verdict can be set:

- GO: at least 3 samples at 200 and at least 90 percent of non-cosmetic equipped items carry a positive integer at `equipped_items[].level.value`. Then re-run this plan from Task 2.
- NO-GO: coverage below 90 percent. The alternative (Game Data item endpoint in `static-classic-{region}`, base item level only) is an owner decision.

If the app token returns 403 for Classic character profiles, a user-token run is the next step; the production sync uses the linked user's token.

## Branches and commits

| Branch | Where | Commit | Content |
|---|---|---|---|
| `feat/armory-item-level` (from origin/main 1b8c5b0a) | `/Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-code` | a11e3d86 | chore(spike): Battle.net Classic equipped item level probe |
| `feat/equipped-item-level-migration` | not created | none | blocked |
| `gsd/quick-261026-wpw-v1-armory-gear-sync-spike-battle-net-cla` | main checkout | none by me | SPIKE.md and this SUMMARY are uncommitted for the orchestrator's docs commit |

Final migration timestamp: not chosen (planned 20261026120000, not yet collision checked). Anchored older test: none.

## Deviations from Plan

- **SPIKE.md not committed.** The plan says to commit it on the gsd/quick branch, but the run constraints say the orchestrator commits docs artifacts. It is left in the working tree.
- **Rate limits unverified.** WebFetch is not available to this agent; a curl of the getting-started page returned no readable text. SPIKE.md marks the limits unverified.
- **Probe typecheck.** The script sits outside the app's tsconfig include, so it was checked with an explicit strict `tsc` invocation plus eslint.

## Awaiting owner sign-off

The Equipped column copy (Equipped header, Empty, No ilvl, Not synced, hover text) is specified in the plan but nothing is implemented yet, so there is no copy to approve. Still pending for when Task 3 runs.

## Recommended merge order (once a GO is obtained and Tasks 2 and 3 are done)

1. Push `feat/equipped-item-level-migration`, open the migration-only PR, merge with `--admin` on a non-raid day, confirm the deploy (about 12 seconds after merge).
2. Push `feat/armory-item-level`, open the code PR, give copy sign-off on the Equipped column, merge after the migration is live.
3. Push the `gsd/quick-261026-...` branch and open the docs-only PR.

Until then, the only thing on `feat/armory-item-level` is the spike script, which is safe to merge or discard at any time.

## Worktrees to remove after merge

- `/Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-code` (exists; contains a node_modules symlink, remove it with `git worktree remove`)
- `/Users/alexander.mayes/Code/personal/loot-list-plus-wt-ilvl-migration` (not created yet)

## Privacy check

No guild, character or realm names, ids, tokens or credentials appear in the script, SPIKE.md, this SUMMARY or the commit message.

## Self-Check: PASSED

- Probe script exists on `feat/armory-item-level`; commit a11e3d86 present.
- SPIKE.md exists with exactly one verdict line.
