# Phase 2: Expansion Onboarding Manifest - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-13
**Phase:** 02-expansion-onboarding-manifest
**Areas discussed:** Where Forever bosses live, Forever raid names and tier defaults, Reaching existing Forever guilds, Snapshots and provisional sources

---

## Where Forever bosses live

| Option | Description | Selected |
|--------|-------------|----------|
| Manifest only | Bosses static in data/expansions/forever, looked up by tier name; no migration, no RLS | ✓ |
| New raid_bosses table | Expand-only migration with name, encounter_id, provisional; officer edits later | |
| JSON column on raid_tiers | bosses jsonb on raid_tiers; smaller migration, harder to reference | |

**User's choice:** Manifest only
**Notes:** Phase 3 need rows are per tier, so nothing downstream needs boss rows yet.

| Option | Description | Selected |
|--------|-------------|----------|
| Setup guide only | Replace the Forever waiting rows with raids and bosses | ✓ |
| Setup guide and raid tier settings | Also list bosses on the loot management tier screen | |
| Master sheet BossSection | Reuse boss grouping with empty item lists | |

**User's choice:** Setup guide only

| Option | Description | Selected |
|--------|-------------|----------|
| "Unconfirmed" badge | Badge after the name plus "Boss names are confirmed when the raid opens." | ✓ |
| "Provisional" badge | Matches the manifest field name | |
| Muted name, no badge | Muted text with tooltip | |

**User's choice:** "Unconfirmed" badge (copy pending owner sign-off)

| Option | Description | Selected |
|--------|-------------|----------|
| One line: "Bosses to be announced" | Raid still listed, one muted line under it | ✓ |
| Hide the raid's boss area | Raid name only | |
| Do not allow empty raids | Gate fails on bosses: [] | |

**User's choice:** One line: "Bosses to be announced"

---

## Forever raid names and tier defaults

| Option | Description | Selected |
|--------|-------------|----------|
| Plain names | Barrow Deeps, Hyjal Summit, Onyxia's Lair; helpers resolve by (expansion, name) | ✓ |
| "(Forever)" suffix | Follows the "Naxxramas (Wrath)" precedent; suffix shows everywhere | |

**User's choice:** Plain names

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 1, active and visible | forever entry in expansion-phases.ts; tiers seed like Classic Phase 1 | ✓ |
| Phase 1, hidden until an officer enables | Same entry, tiers seed inactive and hidden | |
| Opens_on date drives it | Tiers activate once the manifest date passes | |

**User's choice:** Phase 1, active and visible

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, data only | opens_on in the manifest, shown in the setup guide, never drives state | ✓ |
| No, leave dates out | No date field | |

**User's choice:** Yes, data only

| Option | Description | Selected |
|--------|-------------|----------|
| By raid size: 10, 20, 40 | Barrow Deeps, Hyjal Summit, Onyxia's Lair | ✓ |
| Alphabetical | Same today by coincidence | |

**User's choice:** By raid size

---

## Reaching existing Forever guilds

| Option | Description | Selected |
|--------|-------------|----------|
| Admin script, run once by you | Service-role script over every Forever expansion row, dry-run flag | ✓ |
| Lazy sync on officer visit | Sync on first setup guide load; write on a read path | |
| Both: script now, lazy as safety net | Two paths to test | |

**User's choice:** Admin script, run once by the owner

| Option | Description | Selected |
|--------|-------------|----------|
| Freeze names, allow aliases | Shipped names frozen in a fixture; previousNames aliases for renames | ✓ |
| Add a manifest_key column to raid_tiers | Expand-only migration on this phase | |
| Never rename, ever | Gate fails on any change; wrong names stay wrong | |

**User's choice:** Freeze names, allow aliases

| Option | Description | Selected |
|--------|-------------|----------|
| Re-run the same admin script | One path, idempotent | ✓ |
| Scheduled cron sync | Nightly sync over every Forever guild | |

**User's choice:** Re-run the same admin script

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, Forever through sync, legacy unchanged | Legacy keeps the insert loop under the golden-row test | ✓ |
| Everything through sync | One path; golden-row test must prove sync equality | |

**User's choice:** Forever through sync, legacy unchanged

---

## Snapshots and provisional sources

| Option | Description | Selected |
|--------|-------------|----------|
| Guide-sourced names, all Unconfirmed | Ship the Sep 13 guide list as provisional with source noted | ✓ |
| Empty until Oct 21 | bosses: [] for both raids | |
| Only names you confirm in chat now | Owner types the lists here | |

**User's choice:** Guide-sourced names, all Unconfirmed

| Option | Description | Selected |
|--------|-------------|----------|
| Weekly, opens a PR, never fails red | Weekly cron plus dispatch; PR only on change; 503 exits green | ✓ |
| Manual dispatch only | No schedule | |
| Daily | Daily cron | |

**User's choice:** Weekly, opens a PR, never fails red

| Option | Description | Selected |
|--------|-------------|----------|
| Ship with every boss provisional | Reference test passes with no snapshot; allowlist holds all | ✓ |
| Block the phase on a snapshot | Gate fails until a snapshot exists | |

**User's choice:** Ship with every boss provisional

| Option | Description | Selected |
|--------|-------------|----------|
| Fail until promoted | Allowlist can only shrink | ✓ |
| Warn only | Notice, passes | |

**User's choice:** Fail until promoted

---

## Claude's Discretion

- zod manifest schema shape (previousNames, opens_on, verification, source)
- Snapshot provenance fields and which wago tables are pinned
- Golden-row snapshot format
- No-live-fetch test implementation
- Retry and backoff parameters; admin script name, flags and output
- Client-safe manifest read in the setup guide
- Whether data/raid-catalog-names.ts needs a Forever entry

## Deferred Ideas

- Per-guild boss table for officer renames of provisional bosses (when the Drop Desk needs it)
- Lazy sync safety net and nightly cron sync
- manifest_key column on raid_tiers (PLAT-06)
- Boss lists on the raid tier settings screen and master sheet BossSection
- opens_on-driven tier activation
