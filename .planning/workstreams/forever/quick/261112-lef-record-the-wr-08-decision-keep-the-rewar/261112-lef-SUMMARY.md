---
phase: quick-261112-lef
plan: 01
subsystem: guild-creation, planning-docs
tags: [phase-4-review, wr-08, loot-style, decision-record]
requires: [04-15, 04-16, quick-261111-kgu]
provides:
  - "D-17 amendment in 04-CONTEXT.md: every new guild starts with the six officer-bonus flags off"
  - "WR-08 closed in 04-REVIEW.md with the owner's decision and the wording check"
  - "CreateGuildModal comment matches the shipped default"
affects: [app/components/CreateGuildModal.tsx, .planning/workstreams/forever/phases/04-discovery-lists-and-score-split]
tech-stack:
  added: []
  patterns: []
key-files:
  created: []
  modified:
    - app/components/CreateGuildModal.tsx
    - .planning/workstreams/forever/phases/04-discovery-lists-and-score-split/04-CONTEXT.md
    - .planning/workstreams/forever/phases/04-discovery-lists-and-score-split/04-REVIEW.md
    - .planning/workstreams/forever/STATE.md
key-decisions:
  - "WR-08 option (b): the Reward attendance preset keeps its six officer-bonus flags off at creation; recorded under D-17 as a change from the column defaults for every game"
  - "No copy change: the preset's 'Officer bonuses: off' line is the user-facing note and was reviewed under D-17; PriorityListTab and ScoreBreakdownModal show nothing about the feature while the flag is off"
status: complete
branch: fix/wr-08-create-guild-default-comment
estimate:
  tokens: 20000
  tasks: 2
actuals:
  tokens: 40000
  tasks: 2
  commits: 1
---

# Quick 261112-lef Plan 01: Record the WR-08 decision Summary

The owner picked option (b) for review finding WR-08 on 2026-11-12: the "Reward attendance" preset keeps its six officer-bonus flags off, and the fact that every new guild now starts that way is recorded under D-17 in `04-CONTEXT.md`. The one code change is the `CreateGuildModal` comment the finding named, on `fix/wr-08-create-guild-default-comment` (PR #513); no behaviour changes. The planning docs are on `gsd/quick-261112-lef-record-the-wr-08-decision-keep-the-rewar` as a docs-only PR.

## How it ran

The same desktop session that ran quick task 261111-kgu, after PRs #511 and #512 merged (6ff619f0 and 71b70fdf). Two scratch worktrees cut from origin/main at 71b70fdf under the session scratchpad (docs and code); nothing in the main checkout changed and no branch was switched there. `GSD_WORKSTREAM=forever` on the `init.quick` call.

## What changed

- `04-CONTEXT.md`: new subsection "Decision after code review (2026-11-12, owner)" with the D-17 amendment: every guild created through the picker starts with `guild_rank_bonuses_enabled`, `raid_roles_overall_bonus_priority`, `single_raider_overall_bonus`, `role_bonus_priority_single_item`, `class_bonus_priority_single_item` and `single_raider_bonus_single_item` off, because the default preset sets them false; the column defaults stay true for rows written without a preset; this applies to every game and is a change from the previous new-guild behaviour; scores are the same at creation, a rank modifier or per-raider bonus added later needs the matching flag turned on in the Loot system settings.
- `04-REVIEW.md`: the fix-status note no longer lists WR-08 as open; a "Decision (2026-11-12, owner)" block under WR-08 states option (b), the wording check and where the comment fix lives.
- `app/components/CreateGuildModal.tsx` (commit c4dba661 on `fix/wr-08-create-guild-default-comment`): the comment above the `lootStyle` state no longer says leaving the picker alone "changes nothing"; it says the default preset matches the column defaults for attendance and bad luck protection, turns the six officer-bonus flags off, and that the owner kept that (D-17, WR-08).
- `STATE.md`: this row, the 261111-kgu row marked merged, last activity.

## Wording check

While `single_raider_overall_bonus` is off, `PriorityListTab` does not render the raider bonuses card (`raiderBonusEnabled &&`), and `ScoreBreakdownModal` leaves " + Raider Bonus" out of the formula line and does not render the Raider Bonus card (`raiderBonusEnabled === true`). The "free for every guild" wording the finding mentions is a code comment on the settings type, not user-facing copy. Nothing on either screen claims the feature is on, so no copy change is needed and none is proposed.

## Not changed

- `domain/guild/loot-style-presets.ts` and `POST /api/guilds`: the preset values and their application at creation stay as reviewed under D-17.
- The preset's "What this sets" list: "Officer bonuses: off" already states the default and was reviewed with the copy; no new line.
- Follow-ups still open from `04-REVIEW.md` and 261111-kgu: the CR-01 database rule for item slots, the WR-02 cross-server channel check, the IN-05 allowlist. DRAFT copy from 261111-kgu (the audit-log label `sent Set your 5 to the guild`) is merged and still awaits the owner's sign-off.

## Checks

- `npx eslint app/components/CreateGuildModal.tsx`: clean.
- `npm run typecheck`: clean.
- `npx vitest run app/components domain/guild`: green (the component and preset tests; the change is a comment).

## Next

- Owner: merge PR #513 (comment only) and the docs PR after it.
- Then `/gsd-verify-work 4` (UAT) and Phase 5 (Drop Desk Core).
