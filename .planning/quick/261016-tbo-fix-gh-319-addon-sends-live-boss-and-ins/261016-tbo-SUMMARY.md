---
phase: quick-261016-tbo
plan: 01
subsystem: addon API (loot-award, import-string), companion sync, in-game addon
tags: [addon, companion, loot-award, multi-tier, gh-319, gh-307]
requirements: [GH-319]
key-files:
  created:
    - (addon repo) tests/test_live_context.lua
  modified:
    - app/api/addon/loot-award/route.ts
    - app/api/addon/loot-award/__tests__/route.test.ts
    - app/api/addon/import-string/route.ts
    - app/api/addon/import-string/__tests__/route.test.ts
    - companion/src/main/addon-format.ts
    - companion/src/main/__tests__/addon-format.test.ts
    - (addon repo) Core/VersionCompat.lua
    - (addon repo) Modules/LootDistribution.lua
    - (addon repo) Modules/LootHook.lua
    - (addon repo) tests/harness.lua
    - (addon repo) tests/run.lua
    - (addon repo) CHANGELOG.md
status: complete
completed: 2026-10-16
---

# Quick 261016-tbo: addon sends the live boss and instance name with each award (GH #319)

## Commits

Website and companion: branch fix/319-live-boss-and-raid-name, PR #438, squash-merged to main as 1f626b53:
- 6b606385 fix(addon-api): file multi-tier awards by the live raid name (#319)
- f0ec2216 fix(companion): forward the addon's live instanceName as raid_name (#319)

Addon (alexandermayes/loot-list-plus-addon): branch fix/319-live-boss-and-instance, PR #3, open pending changelog copy sign-off:
- 6e23906 fix: stamp the live boss and instance on each award (#319)
- a8a667d test: cover the live boss and instance on awards (#319)

## What changed

- Server: POST /api/addon/loot-award accepts an optional raid_name and passes it to resolveGuildLootItem as the raidName hint GH #307 already supported, so a multi-tier item whose boss is a group label ("Shared Boss Loot", "Trash") is filed by the live instance. The paste import (import-string) accepts instanceName on each award and, when no attendance session matches, uses the award's own bossName and instanceName as hints; the live lookup now also runs for awards that carry a cached lootItemId but no session, which the plan missed.
- Companion: toPendingAwardRequests forwards the addon's instanceName as raid_name, only when it is a non-blank string. The award's raidName (the cached catalog raid) is never forwarded.
- Addon: new VC:GetLiveInstanceName (raid or party instances only); LD:SetBossName remembers the instance the boss was killed in; LD:LiveContext returns the instance and the boss only while still in that instance; OnLootOpened and the roll-off path prefer the live boss over the catalog label and stamp instanceName on each item, which AwardItem and ManualAward copy to the award record. raidName is unchanged. The export string carries instanceName because Sync:ToJSON serialises every pending field.

## Verification

- Root `npm test`: 4105 to 4114 tests (+4 loot-award, +2 import-string, +3 companion), all passing. `npm run lint` 0 errors, `npm run typecheck` clean at the root and in companion/.
- Addon `luajit tests/run.lua`: 66 to 70 passing; the fix commit alone still passes the 66 existing tests.
- CI on PR #438 green (CodeQL, Companion, Test, Load, Vercel). The addon repo has no CI workflow.

## Deviations from Plan

- import-string: the live resolveGuildLootItem lookup ran only when a session matched; the condition became `session || liveInstance` so a sessionless award with instanceName can resolve. Awards with neither keep the old path with no extra query.
- The companion has no vitest script of its own (its tests are in the root suite); `npx vitest run companion` from the root plus the companion typecheck were used.
- The plan's "same award without instanceName" import test already existed; a non-string instanceName test was added instead.
- Addon L2 test uses "Test Boss" (what H.sampleGuild gives H.WOWHEAD_ID), not "Shared Boss Loot".

## Flags for the user

- Addon CHANGELOG copy needs sign-off before PR #3 merges: "Awards now record the boss you actually killed and the raid you are standing in, so an item that drops in more than one raid is filed under the right one on the website."
- Compatibility: addon 1.1.0 + new companion sends no raid_name (fallback tier as today); new addon + companion 1.1.0 drops instanceName (same as today); paste import with the new addon uses instanceName when there is no session. Companion package.json is still 1.1.0; the JSDoc names 1.2.0 as the version that sends raid_name, so bump it at release time.
- Open-world loot after a boss kill with no live instance still takes the last boss label (nil == nil in LiveContext), which matches 1.1.0 behaviour; say if an instance should be required.

## Known Stubs

None.

## Threat Flags

None. raid_name and instanceName only choose among the guild's own rows (resolveGuildLootItem never widens scope); malformed values are ignored, never rejected.
