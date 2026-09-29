---
created: 2026-09-26T23:45:00.000Z
title: Forever follow-ups - remaining "expansion" wording and broken expansion logos on /guild-select/create
area: ui
severity: minor
files:
  - app/guild-select/create/page.tsx
  - app/(app)/expansions/[expansionId]/_client.tsx
---

## Problem

1. **DONE 2026-09-26 (PR #283, a6c77045).** ~~Broken logos on /guild-select/create (pre-existing, every officer sees it).~~ The five Classic expansion tiles load images from https://beta.softres.it/img/editions/*.big.png, which fail in production (confirmed 2026-09-26: naturalWidth 0 for all five). Officers see empty tiles with alt text right below the new Game version tiles. The Create a guild modal already uses local /images/expansions/*.webp logos (WoWlogo, TBCLogo, WrathLogo, Cataclysmlogo, MoPlogo).
2. **Forever guilds can still see the word "expansion"** on less-visited screens, deferred by the user from quick task 260926-lj6: the /expansions/[id] page ("No raid tiers found for this expansion", "Expansion not found"), the PriorityListTab hint "Enable raid tiers in Guild Settings → Expansions", the sheet-import "Expansion" label, CreateReserveRunModal, the help page, and ExpansionManager failure-only toasts.

## Solution

1. Point the page's EXPANSIONS images at the local /images/expansions/*.webp files (same as CreateGuildModal). No copy change.
2. Gate each string on the guild's game version (getGuildGame from domain/expansion/game.ts); new wording needs user sign-off, no em dashes.
