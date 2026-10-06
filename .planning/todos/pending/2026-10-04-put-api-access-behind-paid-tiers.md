---
created: 2026-10-04
area: billing
source: user, 2026-10-04 ("api access needs to be put behind paid tiers")
---

# Put API access behind paid tiers

The user decided on 2026-10-04 that API access is a paid feature. In scope (user-selected):

1. **New guild API (GH #271).** The requested read-only API for guilds to pull loot history is built Premium-only from the start.
2. **Discord bot commands.** /priority, /score and the other bot lookups answer only for Premium guilds.
3. **Addon and companion sync.** The in-game addon export and import and the companion app sync require Premium.
4. **Reserve run API.** Every reserve-run route enforces the Premium gate on the server, not only in the UI.

Open questions to settle in planning (need the user):

- Rollout for guilds that use the bot or addon today on the free tier: immediate cutoff, grace period, or grandfathering (utils/feature-gate.ts already has a reserve grandfather check to compare against).
- What a free guild sees in each surface (bot reply, addon import error, companion message, app upsell) and the copy for each.
- Whether trials count as Premium for API access.
- How the bot and the addon identify the guild's tier (both already resolve a guild; the gate should reuse the server-side subscription check, not a client flag).

Sequencing: after quick task 261004-29l (reserve run API access) lands, since both touch app/api/reserve-runs/**.

## Progress

- Slice 1 (shared gate plus reserve runs): done in quick task 261004-jgk, PR #387 (2026-10-04). Decisions: the tier decides (trials, comped and past_due count); runs of guilds without Premium are read only; pre-2026-08-27 runs stay grandfathered.
- Slice 2 (Discord bot /score and /priority): done in quick task 261004-ue3 (2026-10-05). Bot PR #390 merged and the bot redeployed on Railway, then app PR #391 merged and deployed. /help and announcements stay free; immediate cutoff for free guilds.
- Slice 3 (addon and companion sync): not started. Decided: grandfather guilds with recorded addon or companion use. Still open: whether the addon download stays free with only sync gated (OD-6 in 261004-jgk), and the addon-related marketing copy.
- GH #271 (guild API): build Premium-only using guildHasPaidAccess(..., 'guild_api'), no grandfathering.
