# Phase 1: Forever Defect and Privacy Fixes - Pattern Map

**Mapped:** 2026-10-12
**Files analyzed:** 24 (14 modified source files, 4 new source files, 6 new or rewritten test files; some tests extend existing files)
**Analogs found:** 22 / 24 (2 partial, see "No Analog Found")

All line numbers are from the current branch (`gsd/v2.0-forever-loot`, app code identical to `origin/main`). Line numbers in the bulk route are for the pre-change file.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/api/loot-history/bulk/route.ts` (DELETE, PATCH, whitelist) | route | CRUD | same file POST (lines 384-395 recompute) + `utils/blp/recompute.ts` | exact (self) |
| `app/api/loot-history/bulk/__tests__/route.test.ts` (add DELETE harness) | test | request-response | same file `makeClient` (lines 76-160) | exact (self) |
| `app/api/addon/guild-data/route.ts` | route | request-response (read) | `app/api/bot/priority/route.ts` (error-checked reads) | role-match |
| `app/api/addon/export-string/route.ts` | route | request-response (read) | `app/api/bot/priority/route.ts` | role-match |
| `app/api/addon/guild-data/__tests__/route.test.ts` (rewrite fake) | test | request-response | `app/api/bot/priority/__tests__/route.test.ts` (`FailSpec`, lines 774-800) | role-match |
| `app/api/addon/export-string/__tests__/route.test.ts` (rewrite fake) | test | request-response | same as above | role-match |
| `utils/supabase/typed-service-role.ts` (NEW) | utility | factory | `utils/supabase/service-role.ts` | exact |
| `utils/supabase/__tests__/typed-service-role.test.ts` (NEW) | test | compile-time guard + file scan | `utils/supabase/__tests__/paginate.test.ts` (location and style) | partial |
| `utils/supabase/paginate.ts` (add or lift `selectAllPagesOrThrow`) | utility | batch | `selectAllPagesOrThrow` in `app/api/bot/priority/route.ts` lines 45-65 | exact (lift) |
| `app/api/addon/{sync-token,attendance,auth,auth/token,loot-award,import-string}/route.ts` (swap factory only) | route | request-response | `utils/supabase/typed-service-role.ts` | exact |
| `app/api/bot/priority/route.ts` (`item_url`, typed client) | route | request-response | self | exact (self) |
| `app/api/bot/priority/__tests__/route.test.ts` (extend) | test | request-response | self lines 774-800 | exact (self) |
| `app/api/bot/score/route.ts` (typed client, 2 casts) | route | request-response | self | exact (self) |
| `domain/expansion/wowhead.ts` (NEW) | utility (pure) | transform | `app/components/ItemLink.tsx` lines 42-60 (moved) + `domain/expansion/game.ts` | exact |
| `domain/expansion/__tests__/wowhead.test.ts` (NEW) | test | transform | `app/components/__tests__/ItemLink.test.ts` | exact |
| `domain/expansion/index.ts` | config (barrel) | n/a | self | exact (self) |
| `app/components/ItemLink.tsx` | component | transform | self (import and re-export) | exact (self) |
| `lib/discord-loot-announcements.ts` | service | event-driven (Discord post) | self | exact (self) |
| `lib/__tests__/discord-loot-announcements.test.ts` (NEW) | test | event-driven | `lib/__tests__/announcements.test.ts` | role-match |
| `app/api/discord/post-raid-summary/route.ts` (+ extracted formatter) | route | request-response | self | exact (self) |
| `discord-bot/interactions.js` and `interactions.test.mjs` | utility (bot formatter) | transform | self | exact (self) |
| `app/reserve/join/[token]/page.tsx` (conditional, Open Question 6) | component | request-response | `lib/discord-loot-announcements.ts` `wowheadLink` | partial |
| `app/(app)/master-loot/_client.tsx` | component | event-driven (analytics) | self lines 261-266 | exact (self) |
| `utils/analytics/master-loot-events.ts` (NEW, optional) | utility (pure) | transform | `domain/expansion/game.ts` style (pure, no imports) | partial |

## Pattern Assignments

### `app/api/loot-history/bulk/route.ts` (route, CRUD) FIX-01 and FIX-04

**Analog:** itself. POST already has the recompute pattern; DELETE and PATCH must copy it.

**Imports already present** (lines 1-15). Already imports `recomputeBlpForItems`, `logAudit`, `createServiceRoleClient`. Add only for FIX-04:
```typescript
import type { AwardReason, AwardOutcomeType, ScoreComponents } from '@/domain/types'
```

**POST recompute pattern to mirror** (lines 384-395; note POST uses `after()`, DELETE and PATCH must `await` per research):
```typescript
if (blpEnabled && item.loot_item_id && item.raid_event_id) {
  blpItemIds.add(item.loot_item_id)
}
...
if (blpItemIds.size > 0) {
  after(() => recomputeBlpForItems(serviceSupabase, guild_id, [...blpItemIds]))
}
```

**FIX-04 whitelist** (line 19, current, to replace) and consumer (lines 60-69, unchanged):
```typescript
const ALLOWED_COMPONENT_KEYS = ['itemRank', 'attendanceScore', 'rankModifier', 'roleBonus', 'priorityBonus', 'trialPenalty', 'badLuckBonus'] as const
...
for (const key of ALLOWED_COMPONENT_KEYS) {
  const n = asFiniteNumber(src[key])
  if (n !== null) out[key] = n
}
```
Replace with the `Record<keyof ScoreComponents, true>` derivation from RESEARCH.md FIX-04 (a missing key becomes a compile error). `MAX_AUDIT_PAYLOAD_BYTES = 4096` at line 27 and the `_truncated` fallback at lines 113-115 stay.

**DELETE: current pre-read to change** (lines 470-476 by-event branch, 500-506 ids branch). Both ignore the read error and omit `raid_event_id`:
```typescript
const { data: toDelete } = await serviceSupabase
  .from('loot_history')
  .select('id, loot_item_id, character_id, character_name')
  .in('id', ids)
  .eq('guild_id', guild_id)
```
Change to add `raid_event_id` to both selects, destructure `error: readError`, and `return NextResponse.json({ error: readError.message }, { status: 500 })` before deleting. Error-return style to copy is the existing delete error check (lines 484-486, 514-516): `return NextResponse.json({ error: error.message }, { status: 500 })`. After the audit loop (ends lines 499 and 529) and before `return NextResponse.json({ success: true })` (line 532), add `await recomputeBlpForItems(serviceSupabase, guild_id, blpItemsToRecompute(toDelete))` using the helper in RESEARCH.md "Code Examples". Pass the request's verified `guild_id`, never a row value. The audit `oldData` for the by-event branch spreads `{ ...entry, raid_event_id }` (line 497); adding `raid_event_id` to the select makes that spread redundant but harmless.

**PATCH: hook point.** The before-read (lines 605-610) already selects `loot_item_id, raid_event_id, character_id`. Insert the recompute after the update error check (line 638-640) and before or after `logAudit` (lines 643-652):
```typescript
if ('character_id' in sanitized && sanitized.character_id !== beforeRow?.character_id
    && beforeRow?.loot_item_id && beforeRow?.raid_event_id) {
  await recomputeBlpForItems(serviceSupabase, guild_id, [beforeRow.loot_item_id])
}
```
Existing guard shape to match (lines 615-621): `typeof newCharacterId === 'string' && beforeRow?.raid_event_id && beforeRow.loot_item_id && newCharacterId !== beforeRow.character_id`. Note the research version also covers unlinking (`character_id: null`); the existing award-copy guard does not. Decide deliberately.

**Error handling:** every handler ends with the shared catch (lines 533-536):
```typescript
} catch (error) {
  console.error('Error in DELETE /api/loot-history/bulk:', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```

---

### `app/api/loot-history/bulk/__tests__/route.test.ts` (test, request-response)

**Analog:** itself. No DELETE tests exist.

**Header and mocks to reuse** (lines 1-27): `// @vitest-environment node`, `vi.mock('@/utils/blp/recompute', () => ({ recomputeBlpForItems: vi.fn(), recomputeBlpForEvents: vi.fn() }))`, `next/server` mock with `after: (fn) => fn()`. Add `DELETE` to the import on line 5: `import { POST, PATCH, DELETE } from '../route'`.

**Fake client to extend** (lines 76-160). `Fixture` (lines 51-64) gets a new field such as `deleteRows?: Array<Record<string, unknown>>`. The `then` resolver (line ~122) has branches per table and falls through to `return Promise.resolve({ data: null, error: null }).then(resolve)`; add a `loot_history` branch returning `fixture.deleteRows` (and a `readError` flag). Builder methods `delete: () => builder` and `in`/`eq` already record filters on `call.filters`. Request helper to copy (lines 168-173):
```typescript
function patchRequest(body: unknown) {
  return new Request('http://localhost/api/loot-history/bulk', {
    method: 'PATCH',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof PATCH>[0]
}
```
Add a `deleteRequest` the same way. Keep the existing test `'blp_enabled with a raid_event_id still schedules recomputeBlpForItems'` green. Assert the item id arguments passed to the mocked `recomputeBlpForItems` (Pitfall 1), not just that it was called.

---

### `app/api/addon/guild-data/route.ts` and `app/api/addon/export-string/route.ts` (route, request-response) FIX-02 and FIX-06

**Analog:** `app/api/bot/priority/route.ts` (every query checks its error; a failure is thrown into the shared catch which answers 500).

**Current defect lines** (guild-data): line 88 `supabase.from('bad_luck_protection').select('character_id, loot_item_id, times_passed').eq('guild_id', guildId)`; lines 100-103 `.from('item_priorities')...in('loot_item_id', lootItemIds)`. Neither result's `.error` is read. export-string has the same at lines 179 and 185.

**Error-checked read pattern to copy** (`app/api/bot/priority/route.ts` lines 94-100):
```typescript
const { data: tiers, error: tiersError } = await supabase
  .from('raid_tiers')
  .select('id, is_guild_active, master_sheet_visible')
  .eq('expansion_id', guild.active_expansion_id)
if (tiersError) {
  throw new Error(`Failed to read raid tiers: ${tiersError.message}`)
}
```

**Paged, error-throwing read to lift** (`bot/priority/route.ts` lines 45-65; move to `utils/supabase/paginate.ts` as a named export, keep `PAGE_SIZE = 1000`, then import in all three routes):
```typescript
async function selectAllPagesOrThrow<T>(
  label: string,
  fetchPage: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const all: T[] = []
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await fetchPage(start, start + PAGE_SIZE - 1)
    if (error) {
      throw new Error(`Failed to read ${label}: ${error.message}`)
    }
    const rows = data ?? []
    all.push(...rows)
    if (rows.length < PAGE_SIZE) return all
  }
}
```
Usage pattern at `bot/priority/route.ts` lines 173-183 (`.order('id', { ascending: true }).range(start, end)` inside the callback). Use the sketches in RESEARCH.md "FIX-02" for `blp_tracking` and `guild_item_priorities` (filter by `guild_id` plus `.in('raid_tier_id', raidTierIds)`, never `.in('item_id', allItemIds)`; map `p.item_id` back to the existing output key).

**Route's current structure to preserve** (guild-data lines 64-72): a `Promise.all` of `.single()` reads. Switch `guild_settings` and `expansions` to `.maybeSingle()` and check `.error` (Pitfall 4). Guard `guild.active_expansion_id` null explicitly as `bot/priority` does (lines 90-92).

**Failure surface:** keep each route's existing `try/catch` returning `{ error: 'Internal server error' }` 500 plus `trackApiError(...)` as in `bot/priority/route.ts` lines 266-270:
```typescript
} catch (error) {
  console.error('Error in GET /api/bot/priority:', error)
  trackApiError('unknown', 'GET /api/bot/priority', error instanceof Error ? error : new Error(String(error)))
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```
CodeQL: user-derived values go in separate `console.*` arguments, never the first (see `utils/blp/recompute.ts` line 27).

**Typed client swap (FIX-06):** replace `import { createServiceRoleClient } from '@/utils/supabase/service-role'` with `import { createTypedServiceRoleClient } from '@/utils/supabase/typed-service-role'` and the call. Expect the nullability errors listed in RESEARCH.md spike A (narrow with guards; never `?? false` or `?? 0`).

---

### `app/api/addon/guild-data/__tests__/route.test.ts` and `export-string/__tests__/route.test.ts` (test, request-response)

**Analog for the fake and failure injection:** `app/api/bot/priority/__tests__/route.test.ts` (`FailSpec` type and the case table at lines 774-800).

**Failure-case table to copy** (lines 774-800):
```typescript
describe('GH #325: D-04 every query error returns 500 and calls trackApiError', () => {
  const cases: Array<{ label: string; fail: FailSpec[] }> = [
    { label: 'guilds', fail: [{ table: 'guilds' }] },
    ...
  ]
  for (const { label, fail } of cases) {
    it(`returns 500 when ${label} fails`, async () => {
      const tables = readyScenario()
      const { client } = makeClient(tables, { fail })
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
      const res = await GET(request({ ... }))
      expect(res.status).toBe(500)
      expect(await res.json()).toEqual({ error: 'Internal server error' })
      expect(vi.mocked(trackApiError)).toHaveBeenCalled()
    })
  }
})
```
Read the `FailSpec` and `makeClient` definitions in that file (near the top) before writing; they are the model for adding a `fail` option to the addon fakes.

**Fake to rewrite** (guild-data test, lines 62-160): `Fixture` keys `bad_luck_protection` (line 70) and `item_priorities` (line 72); `resolveRows` cases at lines ~121-123 and ~125-128, and a `default: return rows` branch that accepts any table. Rename to `blp_tracking` and `guild_item_priorities` (rows carry `item_id`, `guild_id`, `raid_tier_id`), filter priorities on `guild_id` and `raid_tier_id`, and replace `default: return rows` with a throw (or `{ data: null, error }`) for any table outside an allow-list. The builder already supports `.range()` (lines 141-148) and `.in/.eq/.order/.limit`; add `.maybeSingle` if the route switches to it. Keep `app/api/addon/__tests__/companion-bearer-routes.test.ts` and `lib/addon/__tests__` green; they mock `@/utils/supabase/service-role` with `{ createServiceRoleClient: vi.fn() }`, which is why the typed factory must delegate to it.

---

### `utils/supabase/typed-service-role.ts` (NEW, utility, factory) FIX-06

**Analog:** `utils/supabase/service-role.ts` (whole file, 28 lines). The new file must call `createServiceRoleClient()` rather than `createClient` so the nine test files that mock `@/utils/supabase/service-role` keep working.

**Pattern** (RESEARCH.md spike C, proven to compile and to consume both `@ts-expect-error` lines):
```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

export type TypedServiceClient = SupabaseClient<Database>

/** Service role client typed against the generated schema. Use for addon and bot routes. */
export function createTypedServiceRoleClient(): TypedServiceClient {
  return createServiceRoleClient() as TypedServiceClient
}
```
Naming follows conventions: kebab-case file, named export, `import type` for type-only imports, `@/` alias, JSDoc above the function. Also change the three `ReturnType<typeof createServiceRoleClient>` annotations in `app/api/addon/import-string/route.ts` (lines 267, 314, 419) to `TypedServiceClient`. Note `utils/blp/recompute.ts` line 1-3 types its client as `ReturnType<typeof createServiceRoleClient>`; spike B confirmed a `SupabaseClient<Database>` value is accepted, so no change there.

### `utils/supabase/__tests__/typed-service-role.test.ts` (NEW, test)

**Analog:** location and style from `utils/supabase/__tests__/paginate.test.ts` (read it for the vitest import header). No existing `@ts-expect-error` guard test exists. Use the sketch in RESEARCH.md "FIX-06: typecheck guard" plus a file-scan test (fs read of `app/api/addon/**/route.ts` and `app/api/bot/**/route.ts`, asserting none import `createServiceRoleClient`). Because `createTypedServiceRoleClient()` calls the real factory, mock `@/utils/supabase/service-role` in this test or wrap the `.from(...)` lines in a function that is never invoked, so no env vars are needed.

---

### `domain/expansion/wowhead.ts` (NEW, utility, transform) FIX-03

**Analog:** the map and function to move verbatim from `app/components/ItemLink.tsx` lines 42-60:
```typescript
/** Map expansion display names to wowhead URL/tooltip domains */
const EXPANSION_TO_WOWHEAD_DOMAIN: Record<string, string> = {
  'Classic': 'classic',
  'Classic WoW': 'classic',
  'The Burning Crusade': 'tbc',
  'Wrath of the Lich King': 'wotlk',
  'Cataclysm': 'cata',
  'Mists of Pandaria': 'mop-classic',
  'Forever': 'forever',
  'Warlords of Draenor': 'wow',
  ...
  'The War Within': 'wow',
}

export function getWowheadDomain(expansionName: string | undefined | null): string | null {
  if (!expansionName) return null
  ...
```
**Module-constraint analog:** `domain/expansion/game.ts` header (lines 1-14): "This file must import nothing: client components import it directly". Keep `wowhead.ts` import-free (research says "imports only `./game`"; it needs nothing from it, so import nothing). Add `wowheadItemUrl(expansionName, wowheadId)` per the RESEARCH.md sketch. Add `export * from './wowhead'` to `domain/expansion/index.ts` (currently `phase-groups`, `classes`, `game`); client code should import the module path, not the barrel. Phase 2 also edits this barrel, so expect a rebase conflict on one line.

### `app/components/ItemLink.tsx` (component)

Replace the local map and function (lines 42-60) with `import { getWowheadDomain } from '@/domain/expansion/wowhead'` and `export { getWowheadDomain }` so `app/components/__tests__/ItemLink.test.ts` (imports `getWowheadDomain` from `'../ItemLink'`) passes unchanged. Line 121 already builds `https://www.wowhead.com/${domain}/item=${wowheadId}`.

### `domain/expansion/__tests__/wowhead.test.ts` (NEW, test)

**Analog:** `app/components/__tests__/ItemLink.test.ts` (whole file, 17 lines):
```typescript
import { describe, it, expect } from 'vitest'
import { getWowheadDomain } from '../ItemLink'

describe('getWowheadDomain', () => {
  it('maps Forever to the forever Wowhead domain', () => {
    expect(getWowheadDomain('Forever')).toBe('forever')
  })
  ...
```
Copy the three cases against `../wowhead`, then add `wowheadItemUrl` cases: Forever to `https://www.wowhead.com/forever/item=271940`, each era domain, retail `wow` domain and unknown name to `https://www.wowhead.com/item=ID`. Existing sibling tests for style: `domain/expansion/__tests__/game.test.ts`.

---

### `lib/discord-loot-announcements.ts` (service, event-driven) FIX-03

**Analog:** itself.

**Link site to change** (lines 32-35):
```typescript
function wowheadLink(itemName: string, wowheadId: number | null): string {
  if (!wowheadId) return `**${itemName}**`
  return `[**${itemName}**](https://www.wowhead.com/item=${wowheadId})`
}
```
Add an `expansionName` parameter and use `wowheadItemUrl`.

**Guild read to extend** (lines 57-64): `supabase.from('guilds').select('name, discord_server_id').eq('id', guildId).single()` becomes `select('name, discord_server_id, active_expansion_id')`, then look up `expansions.name`. Failure-tolerance contract (file header lines 15-17, catch lines 117-120): "the function never throws". A failed or missing expansion lookup must fall back to the retail link, so do the lookup in its own guard (do not let it reach the outer catch and abort the post):
```typescript
} catch (err) {
  console.error('[loot-announce] error:', err)
  return false
}
```
Takes `SupabaseClient` (untyped default generics) as parameter; leave it, it is not an addon or bot route.

### `lib/__tests__/discord-loot-announcements.test.ts` (NEW, test)

**Analog:** `lib/__tests__/announcements.test.ts` (read for style; it is the closest existing `lib/__tests__` file). Mock `@/lib/discord` `discordFetch`, set `process.env.DISCORD_BOT_TOKEN`, pass a small fake supabase with `from(table)` returning chains for `guilds`, `guild_settings`, `loot_items`, `expansions`; capture the JSON body of the `discordFetch` call and assert the description contains `/forever/item=`. Add a case where the `expansions` lookup returns an error: assert `true` result and the retail link.

### `app/api/discord/post-raid-summary/route.ts` (route, request-response) FIX-03

**Analog:** itself. Current expansion read (lines 115-120) `select('current_phase')` becomes `select('current_phase, name')`; keep the name in scope for the formatter. Current link line (line 281):
```typescript
return `[${item.name}](https://www.wowhead.com/classic/item=${item.wowhead_id}) → ${charName}`
```
Extract the whole `lootRows.map` body into an exported pure function (suggested name `formatRaidSummaryLootLine`, in a sibling `lib/` file since a Next.js `route.ts` may only export HTTP handlers and route config) that takes `(item, charName, expansionName)` and uses `wowheadItemUrl`. The route has no test file today; the new unit test lives next to the extracted function. The `guild.active_expansion_id` null case leaves `expansionName` undefined and falls back to retail.

---

### `app/api/bot/priority/route.ts` (route, request-response) FIX-03 and FIX-06

**Analog:** itself. Add `item_url` only on the final ok path (lines 261-265) and keep `item_wowhead_id` (back-compat):
```typescript
return NextResponse.json({
  item_name: item.name,
  item_wowhead_id: item.wowhead_id,
  raiders: ordered.map((r) => ({ name: r.name, class: r.className, rank: r.rank })),
})
```
The `emptyAnswer` closure (lines 208-209) also returns `item_name` and `item_wowhead_id`; give it `item_url` too, otherwise the empty-state embed keeps the retail link. The 403 `rankings_hidden` body (lines 142-145) also carries `item_wowhead_id`, and the bot renders a link there too; decide whether to add `item_url`. Expansion name lookup must follow the error-checked pattern (lines 98-100) and be added to the case table in the test (lines 776-786). Typed client: `guild.active_expansion_id` is already null-guarded at line 90.

### `app/api/bot/score/route.ts` (route, request-response) FIX-06 only

Swap to `createTypedServiceRoleClient`. Two type errors at lines ~143 and ~145 (`attendance_type: string` vs the domain union, nullable booleans). Use narrow `as` casts with a comment; do not default values (Pitfall 9). Run `npx vitest run app/api/bot domain/scoring` after.

---

### `discord-bot/interactions.js` and `discord-bot/interactions.test.mjs` (bot formatter, transform) FIX-03

**Analog:** itself. The bot is a separate deploy and cannot import app code.

**Link site** (lines 79-81):
```javascript
const itemLine = payload.item_wowhead_id
  ? `[**${payload.item_name}**](https://www.wowhead.com/item=${payload.item_wowhead_id})`
  : `**${payload.item_name}**`;
```
Use `payload.item_url` when `typeof === 'string'` and `startsWith('https://www.wowhead.com/')`, else this existing form. Shape-check analog: `premiumRequiredEmbed`'s `startsWith('https://')` check in the same file. The rankings-hidden embed (test line ~40) also renders item text; check it for a link.

**Em-dash sites** (research-verified; proposals only, owner sign-off required, see Open Question 4 and Assumption A4): `/score` title lines 64-66 (`${payload.character_name} — Loot Score (${payload.team_name})` and without team), `/priority` titles lines 85 and 95 (`Top priority — ${payload.item_name}`), description line 91 (` — rank ${r.rank}`). Keep the footer on line 97 exactly: `'Sorted by loot list rank. Loot Scores are on the Master Sheet.'` (pinned by the test, "by list rank" Decision 10). Footer separator analog already in the file (line 71): `${payload.guild_name} · LootList+`.

**Test file** (`interactions.test.mjs`): imports `interactions from './interactions.js'` and destructures `{ priorityReply, scoreReply }`. Existing em-dash assertions use `—` escapes (lines 72-73 and ~207), so a literal grep misses them (Pitfall 7). Update those assertions to the signed-off copy, add cases for `item_url` valid, missing and non-wowhead (falls back), and a loop asserting no `title` from `priorityReply`/`scoreReply` contains `—`.

---

### `app/(app)/master-loot/_client.tsx` (component, event-driven) FIX-05

**Analog:** itself, lines 261-266 (current):
```typescript
const submission = submissions.find(s => s.id === submissionId)
trackClientEvent('master_loot_awarded', {
  guild_id: guildId,
  item_name: status,
  character_name: submission?.member?.character_name || 'Unknown'
})
```
Replace per RESEARCH.md FIX-05 with `{ guild_id, submission_id, new_status: status, item_count: submission?.item_count ?? null }` (ids and counts only), subject to Open Question 1. The sibling event pattern with ids is in `app/(app)/loot-submissions/components/LootSubmissionsContent.tsx` lines ~529-538 (`submission_id`, `new_status`), but that call site also sends `character_name`, so copy only the id properties. `trackClientEvent` signature (`utils/analytics/client.ts`): `trackClientEvent(event: ClientEvent, properties?: Record<string, unknown>)`; `master_loot_awarded` is in the `ClientEvent` union (line 88), so no union change.

### `utils/analytics/master-loot-events.ts` (NEW, optional, utility) and its test

No close analog exists for a pure analytics-props builder (`utils/analytics/` holds `client.ts`, `funnel.ts`, `server.ts`, `posthog-server.ts` only, none unit tested for props). Follow the pure-function, named-export, no-side-effects style of `domain/` modules. Test location: `utils/analytics/__tests__/master-loot-events.test.ts` (directory does not exist yet; create). Assert no `character_name` key and that `item_name` is absent.

---

### `app/reserve/join/[token]/page.tsx` (component, conditional on Open Question 6)

Line 682: `` `- ${item.name}: https://www.wowhead.com/item=${item.wowhead_id}` ``. If included, import `wowheadItemUrl` from `@/domain/expansion/wowhead` (client-safe, no imports) and obtain the run's expansion name; the public token page may not currently expose it. Defer unless the owner confirms.

## Shared Patterns

### Error-checked Supabase read, 500 on failure
**Source:** `app/api/bot/priority/route.ts` lines 94-100 and 266-270 (quoted above)
**Apply to:** `guild-data`, `export-string`, new `item_url` expansion lookup, DELETE pre-read in the bulk route
Rule: read `{ data, error }`, throw `new Error(\`Failed to read <thing>: ${error.message}\`)`, let the route's catch return `{ error: 'Internal server error' }` 500. Legitimate no-row cases use `.maybeSingle()` plus explicit null handling.

### BLP recompute call
**Source:** `utils/blp/recompute.ts` lines 16-29
**Apply to:** bulk route DELETE and PATCH
```typescript
export async function recomputeBlpForItems(
  supabase: ServiceClient,
  guildId: string,
  lootItemIds: Array<string | null | undefined>,
): Promise<void> {
  const ids = [...new Set(lootItemIds.filter((id): id is string => !!id))]
  for (const lootItemId of ids) {
    const { error } = await supabase.rpc('recompute_blp_for_item', { p_guild_id: guildId, p_loot_item_id: lootItemId })
    if (error) console.error('BLP recompute failed for item', lootItemId, error)
  }
}
```
It dedupes, tolerates nulls, swallows RPC errors (so awaiting cannot fail a delete), and logs with the id as a separate argument (CodeQL-safe). Do not use `recomputeBlpForEvents` after a delete (Pitfall 1).

### Auth and permission
**Source:** bulk route DELETE lines 447-468 (`getAuthenticatedUser`, then `verifyPermission(serviceSupabase, user.id, guild_id, 'manage_loot')`); bot routes `checkBotAuth` from `app/api/bot/_helpers.ts`; addon routes `authenticateAddonRequest` and `authorizeAddonGuild`.
**Apply to:** unchanged in this phase. Keep every `.eq('guild_id', guild_id)` filter on deletes and updates.

### Route test conventions
**Source:** `app/api/loot-history/bulk/__tests__/route.test.ts` lines 1-27 and `app/api/bot/priority/__tests__/route.test.ts`
**Apply to:** all route tests. `// @vitest-environment node` first line; `vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))`; `vi.mocked(createServiceRoleClient).mockReturnValue(client as never)`; recording fake clients that capture `table` and `filters`. New fakes must reject unknown tables.

### Pure module constraint for client-shared domain code
**Source:** `domain/expansion/game.ts` header lines 1-14
**Apply to:** `domain/expansion/wowhead.ts`. No imports, no data, safe for client components.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `utils/supabase/__tests__/typed-service-role.test.ts` | test | compile-time guard | No `@ts-expect-error` guard test or source-scan test exists; use the RESEARCH.md FIX-06 sketch. Style only from `utils/supabase/__tests__/paginate.test.ts` |
| `utils/analytics/master-loot-events.ts` (+ test) | utility | transform | No pure analytics-props builder or analytics unit tests exist; use the RESEARCH.md FIX-05 sketch |

## Metadata

**Analog search scope:** `app/api/loot-history`, `app/api/addon`, `app/api/bot`, `app/api/discord`, `lib/`, `lib/__tests__`, `utils/blp`, `utils/supabase`, `utils/analytics`, `domain/expansion`, `app/components`, `app/(app)/master-loot`, `discord-bot/`
**Files read or excerpted:** about 14 (bulk route and test, bot priority route and test, guild-data route and test, announcements lib, ItemLink and its test, `domain/expansion` index and game, post-raid-summary excerpts, `interactions.js` and test, `service-role.ts`, `recompute.ts`, `analytics/client.ts`)
**Not re-read (use RESEARCH.md line references):** `export-string` route and test, `bot/score` route, `import-string` route, `lib/__tests__/announcements.test.ts`, `paginate.test.ts`
**Pattern extraction date:** 2026-10-12
