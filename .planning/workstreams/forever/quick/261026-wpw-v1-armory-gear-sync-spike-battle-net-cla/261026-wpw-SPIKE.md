# Spike: Battle.net Classic equipment API, per-slot item level

## Question

Does the Battle.net Classic (MoP) character equipment endpoint return an item level for each equipped slot, and how stale is that data? The answer gates storing item level per slot and showing it in the officer item candidate panel.

## Method

- Endpoint: `GET /profile/wow/character/{realmSlug}/{name}/equipment?locale=en_US`, plus the character summary at `/profile/wow/character/{realmSlug}/{name}` for last login.
- Namespace: `profile-classic-{region}`, retried once in `profile-classic1x-{region}` on a 404.
- Token type: app token from the client-credentials grant.
- Sample: the first 10 characters in the production `characters` table with a Battle.net id and a realm (`--from-db 10`, no ordering, so the oldest links), labelled c1 to c10. Characters are never listed.
- Probe: `scripts/spikes/armory-item-level-spike.ts` on branch `feat/armory-item-level` (commit a11e3d86). It prints labels, numbers, booleans and key names only, and exits 3 if a sampled name or realm would appear in its output.
- Run: 2026-10-27 from the main checkout. The Blizzard client lives only in Vercel production, so the owner pulled a production env file to a temporary path outside the repo and the probe read it through `node --env-file`; the file was deleted after the run and no value was printed. The probe exited 0 and its report passed the privacy self-check.

## Results

| Measure | Value |
|---|---|
| Samples tried | 10 |
| Samples fetched (HTTP 200) | 6. The other 4 returned 404 in `profile-classic-{region}` and again in `profile-classic1x-{region}` |
| Non-cosmetic equipped items (Shirt and Tabard excluded) | 90 |
| Items with a positive integer at `equipped_items[].level.value` | 0 (coverage 0 percent) |
| Other numeric level-like keys at an item's top level | none |
| Item level range | none (no levels returned) |
| Character summary fetched (HTTP 200) | 6 of 6 |
| Summary has `equipped_item_level` or `average_item_level` | 6 of 6 |
| Median / max hours since last login | 6837.3 / 7122.4 (about 285 / 297 days) |
| Last-Modified header present | 6 of 6; its age matched the last login age on every character |
| Equipment call latency | 112 to 353 ms |

Keys observed on Classic equipped items (union across the 6 characters): armor, binding, description, durability, enchantments, inventory_type, is_subclass_hidden, item, item_class, item_subclass, limit_category, media, name, quality, quantity, requirements, sell_price, set, slot, spells, stats, transmog, unique_equipped, weapon. There is no `level` key. The `requirements` object carries the required character level, not the item level.

Slot types observed include RANGED and OFF_HAND alongside the retail set, as expected for Classic.

## Item level field path

`equipped_items[].level.value` does not exist in the Classic profile namespace. Retail returns it; Classic returned it on none of the 90 items checked. The only item level the Classic profile exposes is the per-character average on the summary endpoint (`equipped_item_level` or `average_item_level`), present on all 6 fetched characters.

## Staleness

Profile data reflects the character's last logout: on every fetched character the `Last-Modified` header age equalled the `last_login_timestamp` age. The sampled characters last logged in 285 to 297 days ago, which says more about the sample (the oldest linked rows) than about active raiders. `sync-gear` is user-triggered, so a stored value is at most as fresh as the last sync, and any panel should show the sync age. Four of the ten sampled characters no longer resolve on Battle.net (404 in both namespaces); a production sync should keep the last stored data on a 404 rather than clear it.

## Rate limits

Unverified. Blizzard's getting-started and throttling guide pages (read 2026-10-27) are rendered client-side and give no throttling figures to a plain fetch; check https://community.developer.battle.net/documentation/guides/throttling in a browser before any bulk use. The probe made 2 requests per character with a 150 ms pause (20 requests in total for this run); a production sync makes 1 request per user action.

## User token vs app token

The app token (client-credentials grant) was accepted for Classic character profiles: 200 on 6 of 10, 404 on the rest, no 401 or 403. Production sync calls the same endpoint through `battlenetFetch` with the linked user's token; endpoint, namespace and response shape are the same, so a user-token run would not add a `level` field.

## Verdict

**Verdict:** NO-GO

## Consequences

- Tasks 2 and 3 (storage migration, writers, slot rules, read route, panel column) are not executed. The plan allows them only on GO. No migration branch or worktree was created; the code branch holds only the probe.
- The alternative is an owner decision, not implemented here:
  1. Game Data item endpoint, `GET /data/wow/item/{itemId}` in `static-classic-{region}`: base item level per item id, so the per-slot column works as designed. One extra request per distinct item id per sync, cacheable per id since base level never changes. It ignores MoP item upgrades, which can lift an item up to 8 levels above base. The spike measured no level range, so the size of that error on real gear is unknown.
  2. The summary endpoint's average item level: already returned on Classic, one number per character, no per-slot comparison and no extra request. The column would read as average equipped item level rather than the slot the loot item fills.
  3. Drop the feature for v1.
- The probe script stays useful for re-running against fresh samples or adapting to option 1.
