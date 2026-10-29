# Phase 3: Discovery Schema and Need Pipeline - Pattern Map

**Mapped:** 2026-10-19
**Files analyzed:** 24 new or modified
**Analogs found:** 22 / 24 (PGlite harness and `NOT VALID` then `VALIDATE` have no in-repo precedent)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/migrations/<ts>_discovery_schema.sql` | migration | batch (DDL) | `20261004040000_loot_item_officer_notes_officers_only.sql` (grants, DO check, header), `20261003230000_blp_and_reserve_award_rules.sql` (trigger fn), `20260930100000_create_guild_join_grants.sql` (new table, RLS) | role-match (composite) |
| `app/services/__tests__/discovery-schema-migration.test.ts` | test (contract) | transform | `app/services/__tests__/second-same-night-award-migration.test.ts` | exact |
| `app/services/__tests__/discovery-schema-pglite.test.ts` + `helpers/pglite-chain.ts` | test (behaviour) | batch | none in repo (research spike only) | no analog |
| `domain/loot/needs.ts` | domain (frozen list) | transform | `data/expansions/forever/manifest.ts` + `domain/loot/slot-capacity.ts` | role-match |
| `domain/loot/__tests__/needs.test.ts` + `__fixtures__/need-keys.json` | test (frozen list) | transform | `data/expansions/__tests__/manifest-gate.test.ts` + `data/expansions/forever/__fixtures__/shipped-names.json` | exact |
| `domain/loot/list-mode.ts` (+ test) | domain (pure) | transform | `domain/loot/apply-receive-skip.ts` / `slot-capacity.ts` | role-match |
| `domain/loot/slot-capacity.ts` (MOD, `maxCopiesForNeed`) | domain | transform | itself (`maxCopiesForItem`, lines 88-110) | exact |
| `domain/loot/bracket-validation.ts` (MOD) | domain | transform | itself + `domain/loot/__tests__/bracket-validation.test.ts` | exact |
| `domain/loot/apply-receive-skip.ts` + `itemIdentityKey` (MOD/NEW) | domain | transform | itself (`pickReceivedEntries`) | exact |
| `lib/loot/__tests__/need-reader-inventory.test.ts` | test (source scan) | file-I/O | `utils/supabase/__tests__/typed-client-usage.test.ts` | exact |
| `app/api/raid-tiers/route.ts` (MOD, PATCH `list_mode`) | route | request-response | itself (PATCH, lines 71-132) | exact |
| `app/api/raid-tiers/__tests__/route.test.ts` (NEW) | test (route) | request-response | `app/api/raid-events/bonus/__tests__/route.test.ts`, `loot-submissions/revert/__tests__/route.test.ts` | role-match |
| `app/services/need-row-seeder.ts` (NEW) | service | CRUD (read-then-insert) | `app/services/expansionCatalogSync.ts` | exact |
| `app/services/expansionCatalogSync.ts` (MOD) + its test | service | CRUD | itself + `app/services/__tests__/expansionCatalogSync.test.ts` | exact |
| `scripts/lib/forever-sync.ts` (MOD) + `scripts/lib/__tests__/forever-sync.test.ts` | script lib | batch | itself | exact |
| `lib/loot/tier-need-rows.ts` (NEW; research called it `ranked-need-rows.ts`) | utility | request-response | `app/api/addon/guild-data/route.ts:131-139` (`selectAllPagesOrThrow`) | role-match |
| `app/components/NeedLabel.tsx` + test | component | render | `app/components/NoRaidsEmptyState` + `__tests__/NoRaidsEmptyState.test.tsx` | role-match |
| `app/components/ItemLink.tsx` (MOD, null guard) | component | render | itself (lines 40-100) | exact |
| `app/api/addon/guild-data/route.ts`, `addon/export-string/route.ts` (MOD) | route | request-response | `guild-data/route.ts:120-160` | exact |
| `lib/addon/member-ranked-items.ts`, `domain/loot/gargul-dft.ts` (MOD) | utility | transform | themselves | exact |
| `app/api/bot/priority/route.ts`, `bis-items`, `reserve-runs/*`, `loot-items/*` (MOD) | route | request-response | the typed-client routes above | role-match |
| `lib/loot-items-query.ts` (MOD, `includeNeeds`) | utility | request-response | itself | exact |
| `MasterSheetContent.tsx`, `master-sheet-summary.ts` (MOD) | component/util | transform | themselves (receive-skip around lines 781-790) | exact |
| `lib/database.types.ts` (regen) | types | n/a | PR #342 hand diff (`git show 4b3f66e6 -- lib/database.types.ts`) | exact |

## Pattern Assignments

### Discovery migration (migration, DDL batch)

Three analogs, copy different parts.

**Header + lock + grant + verifying DO block**: `supabase/migrations/20261004040000_loot_item_officer_notes_officers_only.sql`. Header sections to copy in order: Problem, Fix, Readers and writers checked, Error contract, Production safety, Not changed, Deploy, Rollback (with commented reverse SQL). Body (lines after header):

```sql
SET LOCAL lock_timeout = '5s';

REVOKE SELECT ON TABLE "public"."loot_items" FROM "anon", "authenticated";

GRANT SELECT ("id", "raid_tier_id", "name", "boss_name", ... ) ON TABLE "public"."loot_items" TO "anon", "authenticated";

DO $$
DECLARE
  v_role text;
  v_column text;
BEGIN
  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF has_column_privilege(v_role, 'public.loot_items', 'officer_notes', 'SELECT') THEN
      RAISE EXCEPTION 'loot_items.officer_notes is still readable by %', v_role;
    END IF;
    FOR v_column IN
      SELECT a.attname FROM pg_attribute a
      WHERE a.attrelid = 'public.loot_items'::regclass AND a.attnum > 0 AND NOT a.attisdropped AND a.attname <> 'officer_notes'
    LOOP
      IF NOT has_column_privilege(v_role, 'public.loot_items', v_column, 'SELECT') THEN
        RAISE EXCEPTION 'loot_items.% is not readable by %', v_role, v_column;
      END IF;
    END LOOP;
  END LOOP;
END
$$;
```

Discovery adds only `GRANT SELECT ("kind", "need_key") ON TABLE "public"."loot_items" TO "anon", "authenticated";` (no REVOKE). `officer_notes` must stay unreadable, so do not grant it. A DO check asserting `kind` and `need_key` are readable and `officer_notes` is not is a cheap copy of the block above. Note the existing grant lists every column, so a column added later without a grant is unreadable to sessions (research Pitfall 1).

**Trigger function (pins integrity)**: `supabase/migrations/20261003230000_blp_and_reserve_award_rules.sql` lines 150-end. Copy the structure for `enforce_loot_item_need_pin_refs`:

```sql
CREATE OR REPLACE FUNCTION "public"."enforce_reserve_award_refs"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
...
  -- A BEFORE trigger runs before the RLS WITH CHECK. A caller RLS would
  -- refuse anyway gets the error RLS gives, so the check reveals nothing.
  IF coalesce(current_setting('role', true), '') IN ('anon', 'authenticated') AND NOT EXISTS (
    SELECT 1 FROM public.reserve_runs rr
    WHERE rr.id = NEW.reserve_run_id AND public.is_guild_officer(rr.guild_id)
  ) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'new row violates row-level security policy for table "reserve_awards"',
      ERRCODE = 'insufficient_privilege';
  END IF;
  RAISE EXCEPTION USING MESSAGE = v_error, ERRCODE = 'check_violation', DETAIL = v_detail;
END;
$$;

COMMENT ON FUNCTION ... IS '...';
REVOKE ALL ON FUNCTION "public"."enforce_reserve_award_refs"() FROM PUBLIC, "anon", "authenticated";
CREATE OR REPLACE TRIGGER "enforce_reserve_award_refs" BEFORE INSERT OR UPDATE OF ... ON "public"."reserve_awards" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_reserve_award_refs"();
COMMENT ON TRIGGER ...
```

Use `is_guild_officer(guild_id)` for the masking check. Pin rule: item is `kind='item'`, need is `kind='need'`, same guild and same raid tier.

**New table + RLS + policies**: `20260930100000_create_guild_join_grants.sql` (table with named constraints, `ENABLE ROW LEVEL SECURITY`, `REVOKE ALL ... FROM PUBLIC, "anon", "authenticated"`, `GRANT ALL ... TO "service_role"`). For session policies copy the `DROP POLICY IF EXISTS` then `CREATE POLICY` pairs in `20261004010000_reserve_run_rules.sql` (lines 112-130 and its commented rollback). Member-SELECT shape (lines 87-90): `EXISTS (SELECT 1 FROM character_guild_memberships cgm JOIN characters c ON c.id = cgm.character_id WHERE cgm.guild_id = <t>.guild_id AND c.user_id = auth.uid() AND cgm.is_active = true)` plus `is_guild_officer(guild_id)` for INSERT/DELETE. The pins table has no UPDATE policy.

**Gap: `NOT VALID` then `VALIDATE CONSTRAINT`**. Grep of `supabase/migrations` finds no `NOT VALID` anywhere; the house style for new CHECKs is an inline `ADD COLUMN IF NOT EXISTS ... CONSTRAINT ... CHECK (...)` (see the contract test below, chunk[1]). The planner follows RESEARCH.md "Migration Spec" for the `ADD CONSTRAINT ... NOT VALID; ALTER TABLE ... VALIDATE CONSTRAINT` pairs, preceded by `DROP CONSTRAINT IF EXISTS` for idempotence. The contract test must then pin them with its own regexes.

---

### `app/services/__tests__/discovery-schema-migration.test.ts` (contract test)

**Analog:** `app/services/__tests__/second-same-night-award-migration.test.ts`. Copy helpers verbatim (lines 12-78): `MIGRATIONS_DIR`, anchored `MIGRATION_TIMESTAMP`/`MIGRATION_FILE`, `stripComments`, `readMigrationRaw` with `MIGRATION_FILE_OVERRIDE`, `splitStatements` (it already ignores `;` inside `$$`), `blankStrings`, `q()`.

```ts
const MIGRATION_TIMESTAMP = '20261001120000'
// anchored to the newest migration that existed when written, not a directory scan (#309)
it('the file exists, sorts after every migration that preceded it, and has a unique timestamp', () => {
  expect(fs.existsSync(MIGRATION_FILE)).toBe(true)
  expect(Number(MIGRATION_TIMESTAMP)).toBeGreaterThan(20260930100000)
  ...
})
it('has exactly N statements, in the required order', () => {
  const chunks = statements()
  expect(chunks).toHaveLength(N)
  expect(chunks[0]).toMatch(/^SET LOCAL lock_timeout\s*=\s*'5s'$/i)
  expect(chunks[1]).toMatch(new RegExp(`^ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS ${q('award_copy')} ...`, 'i'))
```

Differences for Discovery: this analog asserts `not.toContain('$$')`; the Discovery file has a trigger function and DO block, so drop that assertion and assert the forbidden set instead (no `UPDATE`/`INSERT`/`DELETE` of data, no `CONCURRENTLY`, no `DROP TABLE`/`DROP COLUMN`, no `guild_settings` change per D-18). New timestamp must exceed `20261013120000`. Keep the "self-check" idea: run the matcher against a synthetic bad file through `MIGRATION_FILE_OVERRIDE`.

---

### `app/services/__tests__/discovery-schema-pglite.test.ts` and `helpers/pglite-chain.ts`

No committed analog. Use RESEARCH.md "Migration Spec" and the spike recipe (15 lines of stubs, apply all migrations in filename order, apply the Discovery file twice for idempotence). Test header must be `// @vitest-environment node`. Style for case naming: mirror the contract test's `describe`/`it` phrasing. Assertions required: constraints, partial unique index, RLS matrix (raider, officer, non-member, ex-member) on `loot_item_need_pins`, `kind`/`need_key` column grant for `authenticated` and `officer_notes` still denied, BLP need accrual (winner 0, other 1, three recomputes identical). Only exact-pinned devDependency `@electric-sql/pglite@0.5.8` (D-20).

---

### `domain/loot/needs.ts` and `domain/loot/__tests__/needs.test.ts` (frozen list)

**Analog for the test:** `data/expansions/__tests__/manifest-gate.test.ts`.

```ts
// @vitest-environment node
import shippedNamesFixture from '@/data/expansions/forever/__fixtures__/shipped-names.json'
// The expected names ... are transcribed by hand from the plan ..., not read back
// from the manifest, so this is a real guard rather than a restatement of the data
const EXPECTED_RAID_NAMES = ['Barrow Deeps', 'Hyjal Summit', "Onyxia's Lair"]
const EM_DASH = String.fromCharCode(0x2014)
function clone(): ExpansionManifest { return structuredClone(FOREVER_MANIFEST) }
it('lists exactly three raids in size order with plain names', () => {
  expect(FOREVER_MANIFEST.raids.map((raid) => raid.name)).toEqual(EXPECTED_RAID_NAMES)
})
```

Copy: independent JSON fixture (`__fixtures__/need-keys.json`, an array of 145 keys transcribed separately, like `shipped-names.json`), `EM_DASH` guard over every display name, `structuredClone` mutate-and-expect-fail checks for shape rules, count assertions (19 Big, 22 Medium, 104 Standard). Add a `previousNames`-style alias test (D-12). Keep `needs.ts` plain TypeScript with no server imports (client-safe). Use `Role` from `domain/loot/spec-role-mapping.ts:4` (`'tank' | 'healer' | 'physical' | 'caster'`) for the `roles` column mapping. Cost/class mapping per D-06 to D-08.

**`list-mode.ts`:** pure, exported type `ListMode = 'known' | 'discovery'` and `canSwitchToKnown({ rankedNeedCount, needAwardCount })`. Style: copy the doc-comment-why plus small pure exports of `domain/loot/apply-receive-skip.ts`. Test beside it in `domain/loot/__tests__/list-mode.test.ts` (plain vitest, no env pragma needed; see `slot-capacity.test.ts` header).

---

### `domain/loot/slot-capacity.ts` (MOD, B5)

Add `kind?: 'item' | 'need'` to the param of `maxCopiesForItem` (current signature):

```ts
export function maxCopiesForItem(item: {
  item_slot?: string | null
  wowhead_id?: number | null
}): number {
  if (item.item_slot && isTokenSlot(item.item_slot)) { ... }
```

Put the need branch first and return `maxCopiesForNeed(item_slot)` (2 for Finger and Trinket via `MAX_COPIES_PER_SLOT`, else 1). Test by extending `domain/loot/__tests__/slot-capacity.test.ts` (existing style: named wowhead id constants, `describe('maxCopiesForItem')`).

---

### `domain/loot/apply-receive-skip.ts` and `itemIdentityKey` (D-19, C2)

Existing core to reuse unchanged: `pickReceivedEntries(entries, receivedByKey)` (lines 36-57) groups by `key`, sorts `b.rank - a.rank || (a.slot ?? 0) - (b.slot ?? 0)`, consumes N. The need branch only changes how `key` is built: `itemIdentityKey(item) = item.wowhead_id != null ? String(item.wowhead_id) : 'need:' + item.id`. `ReceiveSkipItemRankings.item` is typed `{ wowhead_id: number }` and must widen to `{ id: string; wowhead_id: number | null }`. Call-site to change: `app/(app)/.../MasterSheetContent.tsx` around lines 781-790, 826-831, 916-921 (history is selected as `loot_item:loot_items(wowhead_id)` and keyed `${character_id}-${wowhead_id}`; add `id` to the embed). Test in `domain/loot/__tests__/apply-receive-skip.test.ts` (existing).

---

### `domain/loot/bracket-validation.ts` (MOD, B3) and submit route (B2)

Add `kind?: string` to `BracketItem` and skip need entries in `validateBracketRules`, `canPlaceInBracket`, `placeInBracket` (lines ~112, 175, 264 sum `allocation_cost` against a limit of 3). In `app/api/loot-submissions/submit/route.ts` (select at lines 87-93, validation 144-172) add `kind` to the select, filter needs out of the `validateBracketRules` input, and keep them in `validateItemCopyLimits`. Tests: extend `domain/loot/__tests__/bracket-validation.test.ts` and `app/api/loot-submissions/submit/__tests__/route.test.ts`.

---

### `lib/loot/__tests__/need-reader-inventory.test.ts` (source scan)

**Analog:** `utils/supabase/__tests__/typed-client-usage.test.ts` (whole file, 90 lines). Copy structure exactly:

```ts
// @vitest-environment node
const REPO_ROOT = path.resolve(__dirname, '../../..')
const MIN_ROUTE_FILES = 10
function collectRouteFiles(dir: string): string[] { ...recursive readdirSync withFileTypes... }
it(`finds at least ${MIN_ROUTE_FILES} route.ts files, so the scan is not vacuous`, () => {
  expect(routeFiles.length).toBeGreaterThanOrEqual(MIN_ROUTE_FILES)
})
it('flags a synthetic route that uses the untyped factory', () => { ...findUntypedClientUse(violating)... })
it('accepts a synthetic route that uses the typed factory', () => { ... })
```

Adapt: roots `app`, `lib`, `domain`, `utils`; pattern `/from\(['"](loot_items|loot_submission_items|loot_history)['"]\)|loot_items ?\(|loot_item:loot_items/`; skip `__tests__`; floor about 55 (set slightly below the real count); `NEED_READERS` array typed `{ file; disposition: 'exclude'|'label'|'key'|'ok'|'guard'; note }`; fail both directions (file missing from array, array names a file that no longer matches); two synthetic self-checks (a source string that matches and is absent from the inventory; one that is listed). Keep file lists sorted. Inventory content comes from the RESEARCH.md Reader Audit sections A to F.

---

### `app/api/raid-tiers/route.ts` (MOD, PATCH) and new route test

**Analog:** the PATCH handler itself (lines 71-132):

```ts
const { user, error: authError } = await getAuthenticatedUser()
if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const body = await request.json()
const { guild_id, tier_id, updates } = body
const serviceSupabase = createServiceRoleClient()
const { hasPermission } = await verifyPermission(serviceSupabase, user.id, guild_id, 'manage_settings')
if (!hasPermission) return NextResponse.json({ error: 'Officer permissions required' }, { status: 403 })
const allowedFields = ['is_guild_active', 'master_sheet_visible']
...
const { data, error } = await serviceSupabase.from('raid_tiers').update(sanitized).eq('id', tier_id).select()
```

Changes: add `list_mode` to the allowlist with value validation (`'known' | 'discovery'`); insert the missing tier-to-guild ownership check before the update (read `raid_tiers.expansion_id`, then `expansions.guild_id`, 404 on mismatch); D-17 guard (discovery only for the Forever expansion, one function so Phase 4 can lift it); D-03 409 on Known switch via `canSwitchToKnown`; call `seedNeedRows` on switch to discovery; `logAudit` per `@/utils/audit/log` (see bonus route test mock). Add `list_mode` to the GET select (line 48). `console.error('Error in PATCH /api/raid-tiers:', error)` already uses a fixed first argument (CodeQL rule). `app/api/raid-tiers/__tests__/` does not exist yet.

**Test analog:** `app/api/raid-events/bonus/__tests__/route.test.ts` (header + mocks + recording fake client) and `app/api/loot-submissions/revert/__tests__/route.test.ts` (simpler: lines 4-12, 116):

```ts
// @vitest-environment node
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyPermission: vi.fn(), ... }))
vi.mock('@/utils/audit/log', () => ({ logAudit: vi.fn() }))
vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: true } as unknown as Awaited<ReturnType<typeof verifyPermission>>)
```

Use synthetic UUID constants (`'aaaaaaaa-0000-0000-0000-000000000001'` style) and the recording-fake `Call`/`Fixture` shape from the bonus test. Cases: 401, 403, cross-guild tier 404, legacy tier to discovery rejected (D-17), forever tier to discovery seeds rows, known switch blocked 409 with ranked need, allowed with none.

---

### `app/services/need-row-seeder.ts` and `expansionCatalogSync.ts` (MOD) with tests

**Analog:** `app/services/expansionCatalogSync.ts`. Pattern: pure `plan*` function plus thin async writer, read-then-insert, `dryRun`, thrown errors with context.

```ts
export function planCatalogSync({ expansionId, existingTiers, raids, slug }): { matched; inserted } { ... }
export async function syncExpansionCatalog(supabase: SupabaseClient, { expansionId, expansionName, dryRun = false }) {
  if (expansionName !== FOREVER_MANIFEST.storedName) throw new Error(`syncExpansionCatalog supports Forever only (got "${expansionName}")`)
  const { data, error } = await supabase.from('raid_tiers').select('id, name').eq('expansion_id', expansionId)
  if (error) throw new Error(`Failed to read raid_tiers for expansion ${expansionId}: ${error.message}`)
  const { matched, inserted } = planCatalogSync({ ... })
  if (!dryRun && inserted.length > 0) {
    const { error: insertError } = await supabase.from('raid_tiers').insert(inserted)
    if (insertError) throw new Error(`Failed to insert raid_tiers ...: ${insertError.message}`)
  }
  return { expansionId, matched, inserted, dryRun }
}
```

Changes: `ForeverTierInsert` gains `list_mode: 'discovery'`; insert returns ids (`.select('id, name')`); then `seedNeedRows(supabase, tierIds)` reads existing `need_key` per tier with `selectAllPagesOrThrow` (from `@/utils/supabase/paginate`, signature `selectAllPagesOrThrow('table', (start, end) => query.order(...).range(start, end))`, mandatory `.order`), inserts only missing rows. Update the file header: it currently says "INSERT-ONLY. This file never updates", and the one deliberate exception is `flipTiersToDiscovery`. Do not add `kind` or `list_mode` to the legacy seeder insert (golden `app/services/__tests__/__golden__/*.rows.txt`, see `expansionSeeder-golden.test.ts` header).

**Test analog:** `app/services/__tests__/expansionCatalogSync.test.ts`: stateful `createRaidTiersFake` whose `update`, `delete`, `upsert` are `forbidden(...)` stubs that throw (lines 22-80). The fake must be extended with a `loot_items` table; the `update` stub must now allow only the `list_mode` flip. The assertions at the `fake.writes()` call sites (research cites lines 170, 235, 282, 311) assert no non-insert writes on matched tiers and need to be revised for the flip. Header pragma `// @vitest-environment node`.

**Script lib:** `scripts/lib/forever-sync.ts` (report shape `ForeverSyncExpansionReport { expansionId, guildId, matched, toInsert }`; header rule "report carries expansion ids, guild ids, manifest tier names and counts only"). Add `needRowsToInsert` and `tiersToFlip` counts only, no names. Test: `scripts/lib/__tests__/forever-sync.test.ts`.

---

### Reader branches

**Typed service-role client + paged read** (use for `tier-need-rows.ts`, addon routes). Analog `app/api/addon/guild-data/route.ts:131-139`:

```ts
raidTierIds.length === 0
  ? Promise.resolve([])
  : selectAllPagesOrThrow('loot_items', (start, end) =>
      supabase.from('loot_items').select('id, name, wowhead_id, boss_name, item_slot, item_type, classification, raid_tier_id')
        .in('raid_tier_id', raidTierIds)
        .order('name', { ascending: true }).order('id', { ascending: true })
        .range(start, end)),
```

Add `kind` to the select and `.eq('kind', 'item')`. The client is `createTypedServiceRoleClient()` from `@/utils/supabase/typed-service-role` (`SupabaseClient<Database>`, so selecting `kind` fails typecheck until `lib/database.types.ts` is regenerated). The nested `loot_submission_items (..., loot_items (wowhead_id))` embed at line ~143 should also select `kind`. Guard test: the `typed-client-usage.test.ts` scan already covers addon and bot routes.

**`ItemLink` guard (E1).** `app/components/ItemLink.tsx` is a `memo` component with hooks (`useContext`, `useState`, `useEffect`) and `wowheadId: number`. Because hooks cannot sit behind an early return, split: outer `ItemLink` (hooks-free) returns `<NeedLabel name=... className=... />` when `wowheadId == null`, else renders the existing body renamed `WowheadItemLink`. Change the prop type to `wowheadId: number | null`. Extend `app/components/__tests__/ItemLink.test.ts` (currently tests only `getWowheadDomain`; plain vitest, no render) with a `.tsx` sibling or switch to render tests.

**`NeedLabel` test.** Analog `app/components/__tests__/NoRaidsEmptyState.test.tsx`: `render` + `screen` from `@testing-library/react`, `toBeInTheDocument`, and the em dash check `expect(document.body.textContent).not.toMatch(/—/)`. Assertions: renders the need name, renders no `a` element/href, contains no `wowhead` text.

**Addon export filtering (D1 to D4).** Filter `kind = 'item'` on the read; replace the silent skips with a counted warn-once helper:
- `lib/addon/member-ranked-items.ts:89-91`: `const wowheadId = lootItem?.wowhead_id; if (!wowheadId) continue`
- `domain/loot/gargul-dft.ts:61-63`: `const wowheadId = ir.item.wowhead_id; if (!wowheadId || wowheadId <= 0) continue`
Tests: `lib/addon/__tests__/member-ranked-items.test.ts`, `domain/loot/__tests__/gargul-dft.test.ts` (add a named "skips need rows" case).

**Receive-skip site (master sheet).** Existing shape (MasterSheetContent.tsx ~781-790):

```ts
paginatedSelect<{ character_id: string; loot_item: { wowhead_id: number } | null }>((start, end) =>
  supabase.from('loot_history').select('character_id, loot_item:loot_items(wowhead_id)')
    .eq('guild_id', guildId).order('id', { ascending: true }).range(start, end)
).then(data => ({ data })),
```

Add `id` and `kind` to the embed and build keys with `itemIdentityKey`. Note the 1000-row cap rule (`.order` required) and the Phase 1 read-error-500 policy: read errors surface, never return a partial result.

**Read pattern that must be kept:** `lib/loot-items-query.ts` `fetchFilteredLootItems` gets `.eq('kind', 'item')` plus an `includeNeeds` option (Phase 4 flips it); test `lib/__tests__/loot-items-query.test.ts`.

## Shared Patterns

### Typed client and read errors
**Source:** `utils/supabase/typed-service-role.ts`, `utils/supabase/paginate.ts` (`selectAllPagesOrThrow`, `paginatedSelect`)
**Apply to:** every new or changed server-side read of `loot_items`, `loot_submission_items`, `loot_history`. Always include a deterministic `.order(...)`; throw on error (Phase 1 policy).

### Permission gate
**Source:** `app/api/raid-tiers/route.ts:103-113`
**Apply to:** the list-mode PATCH and any other tier-setting write. `verifyPermission(serviceSupabase, user.id, guild_id, 'manage_settings')` then 403 `Officer permissions required`.

### Warn once per request (D-16)
**Source:** none yet; new shared helper `warnOnceNeedSkipped(scope)` per RESEARCH.md Pattern 3. Use a fixed first argument to `console.warn` (CodeQL tainted-format rule, CLAUDE.md).

### Test environment pragma
**Source:** `app/api/raid-events/bonus/__tests__/route.test.ts:1-3`, `manifest-gate.test.ts:1`
**Apply to:** route, scan, migration and service tests: `// @vitest-environment node` (default env is jsdom, which lacks `Response`/`Request`). Component tests stay on the default jsdom.

### Copy rules
No em dashes in any display name (assert with `String.fromCharCode(0x2014)` as in `manifest-gate.test.ts`). Imports through `@/`. No guild names or ids in fixtures; use synthetic UUID constants.

### Golden fixtures
`app/services/__tests__/__golden__/*.rows.txt` and Loot Score fixtures run under `CI=true`; never regenerate. Do not touch the legacy seeder insert payload.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `helpers/pglite-chain.ts`, `discovery-schema-pglite.test.ts` | test harness | batch | PGlite was used only as an uncommitted scratchpad (commits `3f57adc1`, `b7dea47c` mention it); use RESEARCH.md spike recipe |
| `NOT VALID` then `VALIDATE CONSTRAINT` pairs | migration | DDL | No migration under `supabase/migrations` uses `NOT VALID`; follow RESEARCH.md Migration Spec and pin with contract-test regexes |
| `warnOnceNeedSkipped` helper | utility | request-scoped | No existing warn-once-per-request utility |
| Feature flag for the held switch | n/a | n/a | `useFeatureFlag` has no consumers; D-02 is held by defaults (no toggle, pickers default to items) |

## Metadata

**Analog search scope:** `supabase/migrations`, `app/services`, `app/api` (raid-tiers, addon, raid-events, loot-submissions), `app/components`, `domain/loot`, `data/expansions`, `lib/addon`, `scripts/lib`, `utils/supabase`
**Files read or grepped:** about 30
**Pattern extraction date:** 2026-10-19
