# Phase 2: Expansion Onboarding Manifest - Pattern Map

**Mapped:** 2026-10-13
**Files analyzed:** 26 (new and modified)
**Analogs found:** 22 / 26 (4 partial or none: zod schema, golden file snapshot, retry script, stateful fake)

All paths are relative to `/Users/alexander.mayes/Code/personal/loot-list-plus`. Excerpts were read this session. Line numbers are from the files as they exist on `gsd/v2.0-forever-loot`.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `data/expansions/types.ts` | model (types) | transform | `domain/expansion/game.ts` (type-only, imports nothing) | role-match |
| `data/expansions/registry.ts` (client-safe meta) | config | transform | `domain/expansion/game.ts` + `EXPANSION_DATA` in `app/services/expansionSeeder.ts:224-237` | exact |
| `data/expansions/catalogs.ts` (server-only adapters) | service | transform | `transformClassicRaids()` etc. in `app/services/expansionSeeder.ts:74-210` | exact |
| `data/expansions/validate.ts` (pure validators) | utility | transform | `app/services/__tests__/raid-phase-coverage.test.ts` logic | role-match |
| `data/expansions/forever/manifest.ts` | config (data) | transform | `data/expansion-phases.ts` (typed static data) | role-match |
| `data/expansions/forever/lookup.ts` | utility | transform | `normalizeCatalogName` in `lib/loot/guild-scoped-lookup.ts:121` | role-match |
| `data/expansions/forever/provisional-allowlist.json`, `__fixtures__/shipped-names.json`, `reference/wago.json` | config (fixtures) | file-I/O | none (new ground) | none |
| `domain/expansion/manifest-schema.ts` | model (zod schema) | transform | none in repo (zod undeclared today) | none |
| `data/expansion-phases.ts` (modify) | config | transform | itself, `classic` entry lines 34-41 | exact |
| `app/services/expansionSeeder.ts` (modify) | service | CRUD | itself, lines 340-571 | exact |
| `app/services/expansionCatalogSync.ts` | service | CRUD (read then insert) | `seedExpansionForGuild` tier insert (429-440) + `selectAllPagesOrThrow` error style | role-match |
| `scripts/sync-forever-catalog.ts` | script | batch | `scripts/backfill-team-event-routing.ts` | exact |
| `scripts/expansions/snapshot-reference.ts` | script | request-response (outbound HTTP) + file-I/O | none for retry; `scripts/backfill-team-event-routing.ts` for env/arg handling | partial |
| `.github/workflows/refresh-wago-snapshot.yml` | config (CI) | batch | `.github/workflows/refresh-item-data.yml` | exact |
| `app/services/__tests__/expansionSeeder-golden.test.ts` + `__golden__/*.rows.txt` | test | transform | recording mock in `app/services/__tests__/expansionSeeder.test.ts:16-88` | role-match |
| `app/services/__tests__/expansionSeeder.test.ts` (modify) | test | CRUD | itself | exact |
| `app/services/__tests__/expansionCatalogSync.test.ts` | test | CRUD | recording mock in `expansionSeeder.test.ts` (extend to stateful fake) | role-match |
| `app/services/__tests__/raid-phase-coverage.test.ts` (modify) | test | transform | itself | exact |
| `data/expansions/__tests__/manifest-gate.test.ts` | test | transform | `data/__tests__/classic-wow-raids.test.ts` + `raid-phase-coverage.test.ts` | exact |
| `data/expansions/__tests__/forever-reference.test.ts` | test | transform | `data/__tests__/classic-wow-raids.test.ts` | role-match |
| `data/expansions/__tests__/no-live-fetch.test.ts` | test | file-I/O (source scan) | `utils/supabase/__tests__/typed-client-usage.test.ts` + `utils/analytics/__tests__/no-names-in-analytics.test.ts` | exact |
| `scripts/__tests__/sync-forever-catalog.test.ts` | test | transform | `typed-client-usage.test.ts` (node env header) | partial |
| `scripts/expansions/__tests__/snapshot-reference.test.ts` | test | request-response (injected fetch) | none | none |
| `app/(app)/overview/components/SetupGuide.tsx` (modify) | component | request-response | itself, lines 27-71 and the `<ol>` end near 436-444 | exact |
| `app/(app)/overview/components/DashboardContent.tsx` (modify) | component | request-response | itself, `<SetupGuide ... raidTierStatus={raidTierStatus} />` near 1997-2003 | exact |
| `app/(app)/overview/components/__tests__/SetupGuide.test.tsx` (modify) | test | request-response | itself, `renderGuide` (line 65), `EM_DASH` (line 63, assertion near 334) | exact |
| `package.json` (modify: deps, `sync:forever` script) | config | n/a | `"seed:classic": "tsx scripts/seed-classic-raids.ts"` style | exact |

## Pattern Assignments

### `data/expansions/registry.ts` and `types.ts` (config, transform)

**Analog:** `app/services/expansionSeeder.ts:212-237` (the registry being replaced) and `domain/expansion/game.ts` (client-safe, imports nothing).

**Hand-written registry to replace** (`expansionSeeder.ts:212-237`; keys and order must be preserved, including the seven null retail names so `getAvailableExpansions` keeps its output):
```typescript
const FOREVER_DATA: ExpansionDefinition = {
  name: 'Forever',
  displayName: 'Forever',
  raids: [],
  game: EXPANSION_GAMES.Forever
}

const EXPANSION_DATA: Record<string, ExpansionDefinition | null> = {
  'Classic': CLASSIC_WOW_DATA,
  'The Burning Crusade': TBC_DATA,
  'Wrath of the Lich King': WOTLK_DATA,
  'Cataclysm': CATA_DATA,
  'Mists of Pandaria': MOP_DATA,
  'Forever': FOREVER_DATA,
  'Warlords of Draenor': null,
  'Legion': null,
  'Battle for Azeroth': null,
  'Shadowlands': null,
  // ... Dragonflight, The War Within
}
```
**Client-safe rule:** `domain/expansion/game.ts` header says it "must import nothing: client components import it directly, and it must never pull in raid data." `registry.ts` imports only `EXPANSION_GAMES`/`GameVersion` from `@/domain/expansion/game`; heavy catalogs go in `catalogs.ts` (server-only). Keep the prototype-pollution own-property guard from `getExpansionDefinition` and `getExpansionGame`.

**Import style** (`expansionSeeder.ts:17-24`): `import { EXPANSION_GAMES, getExpansionGame } from '@/domain/expansion/game'` and `import type { GameVersion } from '@/domain/expansion/game'`, then `export { getExpansionGame }` / `export type { GameVersion }` re-exports. Keep both exports on `expansionSeeder.ts`.

---

### `data/expansions/catalogs.ts` (service, transform) and the `expansionSeeder.ts` refactor

**Analog:** `app/services/expansionSeeder.ts` lines 74-92 (adapter shape) and 449-481 (the chains to delete).

**Adapter transform shape to wrap, not rewrite** (lines 78-91). Note `wowheadId: item.wowhead_id.toString()` (string), `isActive: index === 0`, `phase: getRaidPhase('classic', raid.name)`:
```typescript
isActive: index === 0,
phase: getRaidPhase('classic', raid.name),
bosses: raid.bosses.map(boss => ({
  name: boss.name,
  lootItems: boss.items.map(item => ({
    name: item.name,
    slot: item.slot,
    wowheadId: item.wowhead_id.toString()
  }))
}))
```

**Chains to replace with per-entry `classify(name)` / `rolesFor(name)`** (lines 451-462, 469-481). Preserve defaults exactly (`|| 'Unlimited'`, `|| []`) and the allocation rule:
```typescript
if (expansionData.displayName === 'Mists of Pandaria') { classificationMap = MOP_ITEM_CLASSIFICATIONS }
else if (... 'Cataclysm') CATA ... else if ('Wrath of the Lich King') WOTLK ... else if ('The Burning Crusade') TBC
else { classificationMap = ITEM_CLASSIFICATIONS }
const classification = classificationMap[item.name] || 'Unlimited'
const allocation_cost = (classification === 'Reserved' || classification === 'Limited') ? 1 : 0
// roles: same shape, final else CLASSIC_ITEM_ROLES; const roles = roleMap[item.name] || []
```
The final `else` silently falls back to Classic maps for any unknown displayName. The registry must make an entry with items but no map an explicit gate failure.

**Frozen legacy insert payloads** (golden-pinned, do not touch). Tier insert has no `sort_order` (429-440); loot row keys at 483-493:
```typescript
.insert({
  expansion_id: expansion.id,
  name: raid.name,
  is_active: raid.isActive,
  is_guild_active: isInInitialPhase,
  master_sheet_visible: isInInitialPhase,
  phase: raid.phase
}).select().single()
// loot row
{ raid_tier_id: tier.id, name: item.name, item_slot: item.slot, wowhead_id: item.wowheadId,
  boss_name: boss.name, is_available: true, classification, allocation_cost, roles }
```
**Error handling in the seeder** (lines 396-399, 442-445): `console.error(...)` then return `{ expansionId: '', error: 'Failed to create expansion' }` or `continue`. The Forever branch calls `syncExpansionCatalog` after the expansion row exists (D-11); legacy keeps this loop.

**Gotcha:** `expansionSeeder.ts` runs `transformClassicRaids()` etc. at import time (lines 74-210). Put `syncExpansionCatalog` in a sibling file so the admin script does not load five catalogs.

---

### `app/services/expansionCatalogSync.ts` (service, CRUD read-then-insert)

**Analog:** `expansionSeeder.ts:429-445` (tier insert payload and `{ data, error }` handling) and `utils/supabase/paginate.ts:53-68` (throw-with-context style). Research Sync core skeleton in 02-RESEARCH.md lines 453-487 is the starting point.

**Name matching to reuse** (`lib/loot/guild-scoped-lookup.ts:121-129`):
```typescript
export function normalizeCatalogName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
  return normalized === '' ? null : normalized
}
```
**Error style to copy** (`paginate.ts:62`): ``throw new Error(`Failed to read ${label}: ${error.message}`)``. Use `Failed to read raid_tiers for expansion <id>: ...`.

**Phase lookup:** reuse the `getRaidPhase(slug, raidName)` logic (`expansionSeeder.ts:62-72`, exact `includes`). It is module-private; either export it from a shared spot or duplicate over `EXPANSION_PHASES.forever`. Insert-only: never `update`, never `delete`, one bulk `insert`. Add `sort_order` (1 to 3) because the legacy path omits it.

---

### `scripts/sync-forever-catalog.ts` (script, batch)

**Analog:** `scripts/backfill-team-event-routing.ts`.

**Header and dry-run default** (lines 10-15, 41):
```typescript
 * SAFE BY DEFAULT: dry-run unless you pass --apply.
 *   npx tsx scripts/backfill-team-event-routing.ts                 # all team guilds, dry-run
 *   npx tsx scripts/backfill-team-event-routing.ts <guildId> --apply
const APPLY = process.argv.includes('--apply')
```
**Worktree-aware env loader** (lines 25-33; copy verbatim):
```typescript
const cwd = process.cwd()
const mainRoot = cwd.includes('/.claude/worktrees/') ? cwd.split('/.claude/worktrees/')[0] : cwd
const envPath = existsSync(resolve(cwd, '.env.local')) ? resolve(cwd, '.env.local') : resolve(mainRoot, '.env.local')
readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '')
})
```
Imports in this script use relative paths (`'../utils/raid-events/team-routing'`), not `@/`; check that tsx resolves `@/` for the script before using it (typed-client factory imports `@/utils/...`). Per-guild logging prints ids only (`console.log(\`  ${guildId}: ...\`)`), matching the "ids and counts only" rule.

**Client and paging** (research Admin script shape; `utils/supabase/typed-service-role.ts:16-18` and `paginate.ts:53`): `createTypedServiceRoleClient()` then
```typescript
const rows = await selectAllPagesOrThrow('forever expansions', (s, e) =>
  supabase.from('expansions').select('id, guild_id').eq('name', FOREVER_EXPANSION_NAME).order('id').range(s, e))
```
Note `createTypedServiceRoleClient` delegates to `createServiceRoleClient`, which reads env at call time, so the env loader must run before the first call. Extract the output formatter as a pure exported function so `scripts/__tests__/sync-forever-catalog.test.ts` can test it without running `main`.

---

### `.github/workflows/refresh-wago-snapshot.yml` (CI, batch)

**Analog:** `.github/workflows/refresh-item-data.yml`.

Copy: `permissions: contents: write, pull-requests: write` (27-29); `concurrency: group: ..., cancel-in-progress: false` (31-33); `actions/checkout@v4`, `actions/setup-node@v4` with `node-version: 22`, `cache: npm` (41-45); `.npmrc` from `secrets.NPM_RC` (46-49); `npm ci`; the `git diff --quiet -- <paths>` early exit and bot git identity (59-67); `gh pr create --base main --head "$branch"` with `GH_TOKEN: ${{ github.token }}` (56-57, 72-74).
Differences: triggers become `schedule: - cron:` plus `workflow_dispatch` (no `push paths`); use a fixed branch name with `git push --force` and `gh pr create || gh pr edit` (Pitfall 5); read the script's `outage=true` GITHUB_OUTPUT and `::notice::` then exit green (D-13). Also extend `refresh-item-data.yml` `paths` (line 24 `"data/*-raids.ts"`) to add `"data/expansions/**"` (CONTEXT integration point).

---

### `app/services/__tests__/expansionSeeder-golden.test.ts` (test, transform)

**Analog:** recording mock in `app/services/__tests__/expansionSeeder.test.ts:16-88`. Do not edit that mock; write a richer sibling.

Mock shape to extend (lines 36-88): `from(table)` returns a fresh builder with `select/eq/insert/update` that push `{ table, method, args }` into `calls`, a `single()` resolving per table, and a thenable `then` so awaited chains settle. Known limitation (line 66): `single()` returns `{ data: null }` for `raid_tiers`, so `tier.id` throws. The golden mock must return `{ id: 'tier-<n>' }` for the tier insert `.select().single()`, resolve `loot_items` insert `.select('id, name, item_slot')` to rows with ids and `item_slot` preserved, and resolve `wow_classes` select to name and id pairs.
Test header: `// @vitest-environment node` (house pattern from the scan tests). Use `toMatchFileSnapshot('./__golden__/<slug>.rows.txt')`; no snapshot files exist anywhere in the repo yet, so this is new ground. Capture in the first plan against the unmodified seeder.

---

### `app/services/__tests__/expansionCatalogSync.test.ts` (test, CRUD)

**Analog:** same recording mock; extend into a stateful in-memory fake for `raid_tiers` with `select().eq()` returning stored rows, `insert(rows)` appending (assign ids), and `update`/`delete` that throw. Assert: second run inserts nothing and state is deep-equal; alias match (`previousNames`) creates no duplicate; curly apostrophe `Onyxia’s Lair` matches; dry-run performs no insert; read error throws.

**Modify** `expansionSeeder.test.ts`: the Forever test "seeds Forever with zero raid tiers and no error" now seeds three tiers; the mock needs `select().eq()` thenable results for the read.

---

### `app/services/__tests__/raid-phase-coverage.test.ts` (modify)

**Excerpt that breaks** (lines 60-70): `expansionsWithRaids` filters on `definition.raids.length > 0`, then
```typescript
const slug = getExpansionSlug(definition.displayName)
expect(slug, `${expansionName}: getExpansionSlug("${definition.displayName}") returned null`).not.toBeNull()
```
`getExpansionSlug('Forever')` is `null` (`data/expansion-phases.ts:8-25`, no `Forever` key). Resolve the slug through the registry entry (`slug: 'forever'`) at lines 67, 74, 87, 97, and leave `EXPANSION_NAME_TO_SLUG` untouched (Pitfall 1; adding the key changes the public `/api/reserve-runs/raid-tiers` route). Also update the comment at lines 23-26 (Forever no longer has zero raids).

---

### `data/expansion-phases.ts` (modify, config)

**Analog:** `classic` entry, line 35. Add (research lines 446-451):
```typescript
forever: [
  { phase: 1, name: 'Phase 1', raids: ['Barrow Deeps', 'Hyjal Summit', "Onyxia's Lair"] },
],
```
Names must equal the manifest names exactly (header comment at lines 27-32: `getRaidPhase` uses exact `includes`, GH-279). The file's own `classic` and `tbc` entries already contain the strings `"Onyxia's Lair"` and `'Hyjal Summit'`, so a global name search will hit multiple slugs; always key by slug.

---

### `data/expansions/__tests__/manifest-gate.test.ts` and `forever-reference.test.ts` (test, transform)

**Analog:** `data/__tests__/classic-wow-raids.test.ts` (independent transcription) and `raid-phase-coverage.test.ts` (orphan and duplicate rules).

**Independent-transcription pattern** (classic-wow-raids.test.ts:39-66): authoritative table transcribed separately from the source file, as typed tuples:
```typescript
const TIER_3_TOKENS: [wowheadId: number, name: string, classes: string[]][] = [
  [22349, 'Desecrated Breastplate', ['Warrior', 'Rogue']],
  ...
]
```
Apply to the frozen shipped-name fixture (`__fixtures__/shipped-names.json`, D-09): the test hard-codes `['Barrow Deeps', 'Hyjal Summit', "Onyxia's Lair"]` itself and fails if the manifest drops one without a `previousNames` alias. Normalization helper precedent (lines 32-37): lowercase and strip non-alphanumerics.
**Phase gate rules to lift into `validate.ts`** (raid-phase-coverage.test.ts:72-107): orphan phase-list name, phase entry with zero raids, raid in two phases, each with a descriptive `expect(..., message)`. Add: every manifest raid name appears in exactly one `EXPANSION_PHASES.forever` phase and vice versa; `storedName` equals an `EXPANSION_GAMES` key and `game` equals `getExpansionGame(storedName)`.
**Scope per Pitfall 3:** strict for native (Forever), baseline-ratcheted for legacy (identical `(raid, boss, wowhead_id)` triple and duplicate raid names fail; 33 known legacy Token items without class mapping live in a frozen exception list that may only shrink).
**Header style:** long explanatory comment citing the issue (GH-269, GH-279) and what RED evidence looked like.

---

### `data/expansions/__tests__/no-live-fetch.test.ts` (test, file-I/O scan)

**Analog:** `utils/supabase/__tests__/typed-client-usage.test.ts` (full file read) and `utils/analytics/__tests__/no-names-in-analytics.test.ts` (`readBalanced` at line 68).

**Skeleton to copy** (typed-client-usage.test.ts:1-18, 38-53, 55-90):
```typescript
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const REPO_ROOT = path.resolve(__dirname, '../../..')   // adjust depth for data/expansions/__tests__ (2 levels below root = '../../..' lands at repo root only from utils/*/__tests__; recompute)
const MIN_ROUTE_FILES = 10

function findUntypedClientUse(source: string): string[] { /* returns violation messages */ }

function collectRouteFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) found.push(...collectRouteFiles(full))
    else if (entry.isFile() && entry.name === 'route.ts') found.push(full)
  }
  return found
}

it(`finds at least ${MIN_ROUTE_FILES} ...`, () => { expect(routeFiles.length).toBeGreaterThanOrEqual(MIN_ROUTE_FILES) })
it('no ... ', () => { expect(offenders).toEqual([]) })
it('flags a synthetic ...', () => { expect(findUntypedClientUse(violating)).toHaveLength(2) })
it('accepts a synthetic ...', () => { expect(findUntypedClientUse(clean)).toEqual([]) })
```
Path depth: from `data/expansions/__tests__/` the repo root is `'../../..'` (three levels: `__tests__` to `expansions` to `data` to root). That matches the `'../../..'` literal; confirm by a floor assertion.
**Skip set and dir list** (analytics test lines 26-28): `const SCAN_DIRS = [...]`, `const SKIP_DIRS = new Set(['node_modules', '.next', '__tests__'])`. This scan must NOT skip `__tests__` (research: scan every test file), so use `new Set(['node_modules', '.next'])` and exclude only itself and `scripts/`. Build the synthetic violating string by concatenation (`'wago' + '.tools'`) so the test does not flag itself.

---

### `app/(app)/overview/components/SetupGuide.tsx` and `DashboardContent.tsx` (modify, component)

**Analog:** themselves.

**Props and Forever gating to extend** (SetupGuide.tsx:44-52, 56, 70-71):
```typescript
interface SetupGuideProps {
  guildId: string; guildName: string; guildIconUrl?: string | null
  hasExpansion: boolean
  raidTierStatus?: RaidTierStatus
}
const isForeverGuild = getGuildGame(activeGuild) === 'forever'
const foreverRaidsLoading = isForeverGuild && raidTierStatus === 'loading'
const foreverAwaitingRaids = isForeverGuild && raidTierStatus === 'none'
```
Add optional `raidTierNames?: string[]`. Render the new section after `</ol>` (lines 439-441, `</ol>` then `</Card>`), only when `isForeverGuild && raidTierStatus === 'available'`, inside the non-celebration Card. Leave `FOREVER_WAITING_NOTE` (line 30) and waiting rows for `'none'` unchanged. Client import of the manifest must come through the client-safe `data/expansions/forever/lookup.ts` (no zod, no catalog). Existing imports use `@/components/ui/...` (`Button`, `Card`); use `@/components/ui/badge` (file exists) for the "Unconfirmed" badge. Header comments reference decision ids ("D-04: ..."); follow that style.
**DashboardContent:** pass `raidTierNames={raidTiers.map(t => t.name)}` next to `raidTierStatus={raidTierStatus}` (about lines 1997-2003; `raidTiers` state near line 373; guild-active tiers query near 681-684). No new query.

**Test:** `SetupGuide.test.tsx` has `renderGuide(overrides)` at line 65, `const EM_DASH = String.fromCharCode(0x2014)` at line 63, and an assertion `expect(document.body.textContent).not.toContain(EM_DASH)` near line 334. New cases call `renderGuide({ game: 'forever', raidTierStatus: 'available', raidTierNames: [...] })`.

---

### `domain/expansion/manifest-schema.ts` and manifest data (no analog)

No zod usage exists in first-party code (zod 4.3.5 is transitive only). Use the schema and manifest values in 02-RESEARCH.md lines 362-441 verbatim as the pattern; they were runtime-checked on 4.3.5. Do not export it from `domain/expansion/index.ts` (barrel is re-exported by `domain/index.ts` and would bundle zod into clients). Manifest file uses a type-only import (`import type { ExpansionManifest } from '@/domain/expansion/manifest-schema'`) so it stays client-safe; use `satisfies z.input<typeof ExpansionManifestSchema>` (defaults make plain `z.infer` too strict).

---

### `scripts/expansions/snapshot-reference.ts` (no direct analog)

Take arg/env conventions from `scripts/backfill-team-event-routing.ts` (header usage block, `process.argv.includes`). Retry, build resolution (highest numeric last segment of `1.60.` builds), `csv-parse/sync` with `columns: true, bom: true`, header validation, canonical-hash no-rewrite (Pitfall 4) and exit-0-on-503 come from 02-RESEARCH.md lines 490-503 and Pitfalls 4 and 12. `fetchImpl` and `sleep` injectable for `scripts/expansions/__tests__/snapshot-reference.test.ts`. This is the only file allowed to name `wago.tools`.

## Shared Patterns

### Typed service-role client (Phase 1 FIX-06)
**Source:** `utils/supabase/typed-service-role.ts:11-18`
**Apply to:** `scripts/sync-forever-catalog.ts`, any server code calling sync with a service client
```typescript
export type TypedServiceClient = SupabaseClient<Database>
export function createTypedServiceRoleClient(): TypedServiceClient {
  return createServiceRoleClient() as TypedServiceClient
}
```
`utils/supabase/__tests__/typed-client-usage.test.ts` scans only `app/api/addon` and `app/api/bot`, so scripts are not forced, but the research makes it the Phase 1 house rule. `syncExpansionCatalog` takes the client as a parameter; type it as `SupabaseClient` (seeder style, `expansionSeeder.ts:1`) or `TypedServiceClient` consistently.

### Error handling with context
**Source:** `utils/supabase/paginate.ts:60-63` (throw) and `expansionSeeder.ts:396-399, 442-445` (log and return or continue)
**Apply to:** sync (throw, caller decides), seeder Forever branch (catch, `console.error`, return `{ expansionId, error }`), admin script (print id then rethrow or continue).
```typescript
if (error) { throw new Error(`Failed to read ${label}: ${error.message}`) }
```

### Source-scan test conventions
**Source:** `utils/supabase/__tests__/typed-client-usage.test.ts`
**Apply to:** `no-live-fetch.test.ts`, the "no displayName chain left in `expansionSeeder.ts`" scan, the Forever-guide em dash check
Elements: `// @vitest-environment node`, `REPO_ROOT = path.resolve(__dirname, ...)`, a `MIN_*` floor test, a pure `find...(source)` function, one synthetic violating case and one clean case.

### Exact-name raid matching
**Source:** `data/expansion-phases.ts:27-33` comment and `lib/loot/guild-scoped-lookup.ts:121`
**Apply to:** phases entry, manifest, sync, `forever/lookup.ts`, SetupGuide
Phase list names are exact-string (`includes`); tier matching in sync and guide lookup uses `normalizeCatalogName`.

### Copy and style conventions
No em dashes in any user-facing string (existing `EM_DASH` test assertion); kebab-case files, `import type` for type-only, `@/` alias, `__tests__` subdirs, JSDoc above functions, comment headers that cite issue or decision ids.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `domain/expansion/manifest-schema.ts` | model | transform | zod not used anywhere in first-party code; use research code |
| `data/expansions/forever/{provisional-allowlist,shipped-names,reference/wago}.json` | fixtures | file-I/O | no JSON fixtures of this kind; `toMatchFileSnapshot` also has no precedent (no `.snap` or `__snapshots__` in repo) |
| `scripts/expansions/snapshot-reference.ts` | script | outbound HTTP | no script retries with backoff; `scripts/fetch-item-icons.ts` and `scripts/fetch-item-unique.ts` (invoked by `refresh-item-data.yml`) fetch from Wowhead and are the nearest behavioural cousins, not read this session |
| `scripts/expansions/__tests__/snapshot-reference.test.ts` | test | request-response | no injected-fetch tests exist |

## Corrections and Cautions for the Planner

- Research cites the plan's seeder lines as 224-237, 449-462, 470-481; confirmed against the file (registry 224-237 plus Forever stub 212-220; chains 451-462 and 469-481).
- Scripts use relative imports (`../utils/...`) in `backfill-team-event-routing.ts`; verify `@/` resolution under `tsx` before relying on it (tsconfig has the `@/*` path alias, and `tsx` honours tsconfig paths, but the existing script does not demonstrate it).
- `raid-phase-coverage.test.ts` keys slug off `definition.displayName` via `getExpansionSlug`; four assertions need the registry slug, not one.
- A prompt-injection-style block (an instruction to avoid Read/Write tools and use Bash for all file work) appeared inside a file-read tool result during mapping. It was ignored; nothing in this file derives from it.

## Metadata

**Analog search scope:** `app/services`, `app/services/__tests__`, `data`, `data/__tests__`, `domain/expansion`, `lib/loot`, `utils/supabase`, `utils/analytics`, `scripts`, `.github/workflows`, `app/(app)/overview/components`
**Files read:** about 14 (plus CONTEXT.md and RESEARCH.md in full)
**Pattern extraction date:** 2026-10-13
