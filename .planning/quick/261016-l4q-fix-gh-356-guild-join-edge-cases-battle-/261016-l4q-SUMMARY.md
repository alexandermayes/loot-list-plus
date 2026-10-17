---
phase: quick-261016-l4q
plan: 01
subsystem: guild membership (domain/guild, character and Battle.net routes, CreateCharacterModal)
tags: [guilds, characters, battlenet, trial, gh-356]
requirements: [GH-356]
key-files:
  created:
    - domain/guild/join-membership.ts
    - domain/guild/__tests__/join-membership.test.ts
    - app/components/__tests__/CreateCharacterModal.test.tsx
  modified:
    - domain/guild/join-grants.ts
    - domain/guild/__tests__/join-grants.test.ts
    - app/api/characters/[id]/guilds/route.ts
    - app/api/characters/[id]/guilds/__tests__/route.test.ts
    - app/api/battlenet/characters/import/route.ts
    - app/api/battlenet/characters/import/__tests__/route.test.ts
    - app/api/guilds/route.ts
    - app/components/CreateCharacterModal.tsx
status: complete
completed: 2026-10-16
---

# Quick 261016-l4q: guild join edge cases (GH #356)

## Commits

Branch fix/356-guild-join-edge-cases, PR #429, squash-merged to main as f5d33714 after copy sign-off (#356 closed):
- b47db258 fix(domain): decide guild join role, trial and joined_via in one pure rule (#356)
- 49f294a9 fix(api): creator gets Guild Master on Battle.net import, alts inherit trial, joined_via from the recorded join (#356)
- d943ca24 fix(ui): drop the dead pending_guild_join hint from CreateCharacterModal (#356)
- bcfe60bc fix(ui): tell the user when the new character was not added to the guild (#356)

## What changed

- New pure rule `resolveJoinMembershipFields` in `domain/guild/join-membership.ts`: the guild creator gets Guild Master, a grant holder gets the default role plus trial per the guild setting, and an alt added through the "already a member" path inherits trial from any sibling character still on trial (earliest sibling trial start wins). `resolveJoinedVia` derives joined_via from the recorded grant source. `resolveGuildJoinAccess` now returns siblings on the member path and source on the grant path.
- Both attach routes (manual and Battle.net import) call the rule; the Battle.net route no longer writes the default role for the creator.
- CreateCharacterModal drops the never-set `pending_guild_join` sessionStorage read. When the guild attach fails it shows a 10 second warning naming the guild and reason, saves the active character without the guild, skips the raid-team add and refreshes characters instead of a hard reload (the reload is what wiped the earlier warnings).
- No migration: role, membership_status, trial_started_at and guild_join_grants.source already exist.

## Verification

- `npm test` (full): 219 files, 3924 tests pass; filtered domain/guild 82, routes plus domain 113, modal 8
- `npm run lint` 0 errors (377 warnings, baseline 379, none in touched files); `npm run typecheck` clean
- TDD per task: each test set seen failing before the implementation

## Deviations from Plan

- Typed test builders (creator/member/grant) moved into Task 1 so that commit typechecks after the GuildJoinAccess union grew.
- Earliest sibling trial start is compared by Date.parse, not lexical ISO order (Postgres may return +00:00 offsets).
- Battle.net route guard narrowed to `guildId && guildAccess?.allowed`, same behaviour.

## Flags for the user

- Copy signed off 2026-10-16 (shown as a 10 second warning; guildName falls back to "the guild"):
  1. 403: "Character created, but not added to {guildName}. You are not a member of this guild. Ask an officer for a new invite link."
  2. Other server error with a message: "Character created, but not added to {guildName}. {serverError}"
  3. Thrown request or no message: "Character created, but not added to {guildName}. Try again from the character settings."
- Owner decisions taken as defaults: any sibling on trial makes the alt trial, no downgrade on reactivation; the creator gets the literal Guild Master; joined_via for grant holders comes from the recorded source (say "keep the client value" to drop resolveJoinedVia); the failure path skips the hard reload.
- Pre-existing em dash in a DELETE handler comment at app/api/characters/[id]/guilds/route.ts left alone.

## Known Stubs

None.

## Threat Flags

None new: service-role writes still happen after the ownership check; RLS unchanged.
