# Spike: Battle.net Classic equipment API, per-slot item level

## Question

Does the Battle.net Classic (MoP) character equipment endpoint return an item level for each equipped slot, and how stale is that data? The answer gates storing item level per slot and showing it in the officer item candidate panel.

## Method

- Endpoint: `GET /profile/wow/character/{realmSlug}/{name}/equipment?locale=en_US`, plus the character summary at `/profile/wow/character/{realmSlug}/{name}` for last login.
- Namespace: `profile-classic-{region}`, retried once in `profile-classic1x-{region}` on a 404.
- Token type: app token from the client-credentials grant.
- Sample: up to 10 linked characters sampled from the production database (`--from-db 10`), or an owner-supplied list via `SPIKE_CHARACTERS`. Characters are never listed.
- Probe: `scripts/spikes/armory-item-level-spike.ts` on branch `feat/armory-item-level` (commit a11e3d86). It prints labels, numbers, booleans and key names only, and exits 3 if a sampled name or realm would appear in its output.

The probe was written, linted and type-checked. It has not yet been run against live data (see Results).

## Results

| Measure | Value |
|---|---|
| Samples tried | not run |
| Samples fetched (HTTP 200) | not run |
| Coverage of non-cosmetic items with a level | not measured |
| Item level range | not measured |
| Median / max hours since last login | not measured |
| Last-Modified header present | not measured |

Why not run: the script exited with code 2 and reported that `BLIZZARD_CLIENT_ID` and `BLIZZARD_CLIENT_SECRET` are missing from the environment when run from the main checkout. `.env.local` exists but does not provide them. No values were read or printed.

## Item level field path

Expected, not yet confirmed: `equipped_items[].level.value`, an integer. This is what the Battle.net Profile API documents for retail and what Classic profile responses have returned for equipment. The probe also records any other numeric level-like key at an item's top level, so a different path would show up in the report.

## Staleness

Blizzard profile data reflects the character's last logout. The probe records the character summary's `last_login_timestamp` age and the `Last-Modified` header age in hours. Not measured yet. `sync-gear` is user-triggered, so the stored level is at most as fresh as the last sync, and the panel shows the sync age.

## Rate limits

Unverified. The Battle.net getting-started guide could not be read in this run (the page did not return usable text without a browser). Check https://develop.battle.net/documentation/guides/getting-started before any bulk use. The probe makes 2 requests per character with a 150 ms pause, and the production sync makes 1 request per user action.

## User token vs app token

Production sync calls the same endpoint through `battlenetFetch` with the linked user's token. The endpoint, namespace and response shape are the same; only the Authorization header differs. The spike uses an app token because it needs no user consent flow. A user-token run is the final proof if the app token returns 403 for Classic profiles.

## Verdict

**Verdict:** INCONCLUSIVE

## Consequences

- Tasks 2 and 3 (storage migration, writers, slot rules, read route, panel column) are not executed. The plan allows them only on GO.
- Nothing was built past the gate. No migration branch or migration worktree was created.
- The owner provides Blizzard credentials, or supplies their own characters, and reruns the probe. The exact command is in the SUMMARY.
- If a later run gives NO-GO (coverage below 90 percent), the alternative is the Game Data item endpoint in `static-classic-{region}`, which returns base item level per item id and ignores upgrades. That is an owner decision and is not implemented here.
