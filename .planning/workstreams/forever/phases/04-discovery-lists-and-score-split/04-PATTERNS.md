# Phase 4: Discovery Lists and Score Split - Pattern Map

**Mapped:** 2026-11-10
**Files analyzed:** 58 (new and modified, from 04-CONTEXT.md, 04-RESEARCH.md and the 04-UI-SPEC.md component inventory)
**Analogs found:** 44 / 58 with a usable analog (14 with no close analog or analog located but not excerpted; see "Gaps")

Worktree root: the phase worktree (local path omitted). All paths below are relative to it.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `domain/loot/need-picks.ts` (new) | utility (pure) | transform | `domain/loot/prio-violations.ts` + `domain/loot/needs.ts` | role-match |
| `domain/loot/need-budget.ts` (new) | utility (pure check) | transform | `domain/loot/need-ranking-hold.ts`, `prio-violations.ts` | role-match |
| `domain/loot/need-eligibility.ts` (new) | utility (pure check) | transform | `domain/loot/prio-violations.ts` | role-match |
| `domain/loot/need-defaults.ts` (new) | config (frozen data) | transform | `domain/loot/needs.ts` (frozen tables) | role-match |
| `domain/loot/__tests__/need-{picks,budget,eligibility,defaults}.test.ts` (new) | test | transform | `domain/loot/__tests__/` neighbours (not excerpted) | role-match |
| `domain/guild/loot-style-presets.ts` (new) | config (frozen data + pure compare) | transform | `domain/loot/needs.ts` (`Object.freeze` maps) | role-match |
| `domain/loot/need-list-rules.ts` (new, pure; plan 04-08) | utility (pure check) | transform | `findPrioViolations` call in `app/api/loot-submissions/submit/route.ts` and `domain/loot/prio-violations.ts` | role-match |
| `app/api/discord/set-your-five/route.ts` (new) | controller | request-response, batch | `app/api/discord/post-raid-summary/route.ts` + `lib/billing/trial-ending.ts` | exact |
| `app/api/discord/set-your-five/__tests__/route.test.ts` (new) | test | request-response | `app/api/raid-tiers/__tests__/route.test.ts` (recording fakes) | role-match |
| `app/(app)/loot-list/components/NeedPicker.tsx` (new) | component | request-response | `app/contexts/LootListContext.tsx` (save path, consumed not copied) | partial |
| `app/(app)/loot-list/components/NeedPickerRow.tsx` (new) | component | event-driven | `app/components/NeedLabel.tsx` (neutral look) | partial |
| `app/components/need-picker/NeedQuestionFlow.tsx` (new) | component (controlled) | event-driven | none (no question-flow component exists) | none |
| `app/components/need-picker/NeedQuestionSheet.tsx` (new) | component | event-driven | `components/ui/modal.tsx` (wrap, `placement` prop, not excerpted) | partial |
| `app/components/need-picker/NeedCostMarker.tsx`, `BudgetLine.tsx`, `need-slot-icons.ts` (new) | component / config | transform | `app/components/NeedLabel.tsx` (HugeiconsIcon usage) | partial |
| `app/(app)/overview/components/SetYourFiveCard.tsx` (new) | component | request-response | `app/(app)/overview/components/SetupGuide.tsx` (not excerpted) | role-match |
| `app/components/ScoreSplit.tsx` (new) | component | transform | `app/(app)/master-sheet/components/BossSection.tsx` score popover (not excerpted) | partial |
| `app/components/LootStylePicker.tsx` (new) | component | request-response | `app/(app)/loot-management/components/SettingsModal.tsx` + `ConfirmModal` usage | partial |
| `components/ui/skeletons.tsx` (modify: `NeedPickerSkeleton`) | component | transform | existing skeletons in the same file (not excerpted) | role-match |
| `components/ui/modal.tsx` (modify: additive `placement` prop) | component | event-driven | itself (default `center` unchanged) | exact |
| `supabase/migrations/<UTC ts>_need_lists.sql` (new) | migration | batch (DDL) | `supabase/migrations/20261028120000_award_slot_locks.sql`, `20261020120000_discovery_schema.sql` | exact |
| `app/services/__tests__/need-lists-migration.test.ts` (new) | test (contract) | file-I/O | `app/services/__tests__/discovery-schema-migration.test.ts` | exact |
| `app/services/__tests__/need-lists-pglite.test.ts` (new) | test (SQL proof) | CRUD | `app/services/__tests__/discovery-schema-pglite.test.ts` | exact |
| `app/services/__tests__/discovery-schema-pglite.test.ts` (modify) | test | CRUD | itself (`GUARD_TRIGGERS`, line 70) | exact |
| `app/api/loot-submissions/submit/route.ts` (modify) | controller | request-response | itself, prio check block (lines 156-245) | exact |
| `app/api/loot-submissions/submit/__tests__/route.test.ts` (modify) | test | request-response | the same file, hold describe blocks (lines 334, 387) | exact |
| `app/api/raid-tiers/route.ts` (modify: `list_mode`, `sort_order` in select if needed) | controller | request-response | itself (PATCH, lines 111-130) | exact |
| `app/api/raid-tiers/__tests__/route.test.ts` (modify: invert the "expansion page does not mention list_mode" guard at line ~609) | test | request-response | itself (recording fake, lines 1-60) | exact |
| `app/api/loot-list/bootstrap/route.ts` (modify: `list_mode`, `sort_order`, `includeNeeds` for Discovery tiers) | controller | request-response | itself (tier select, research F11, line 90) | exact |
| `app/api/loot-items/route.ts` and `lib/loot-items-query.ts` (modify: `includeNeeds` per tier) | controller / service | request-response | itself (`fetchFilteredLootItems`, research line refs) | exact |
| `app/api/master-sheet/visibility/route.ts` (modify: WR-02 chunk + `selectAllPagesOrThrow`) | controller | batch | `lib/loot/guild-award-refs.ts:27` (`CHUNK_SIZE = 100`), `utils/supabase/paginate.ts` | role-match |
| `app/api/prio-list/route.ts` (modify: WR-03 select `kind`, drop need rows) | controller | request-response | itself; `isNeedRow` from `domain/loot/item-identity.ts` | exact |
| `app/contexts/LootListContext.tsx` (modify: `saveSubmission` carries `code`, picker save path) | provider | request-response | itself, `saveSubmission` (lines 940-960) | exact |
| `app/(app)/expansions/[expansionId]/_client.tsx` (modify: list-mode control D-15) | component | request-response | itself, `handleToggleGuildActive` / `handleToggleMasterSheetVisibility` (research refs lines 369, 397) | exact |
| `app/api/guild-settings/route.ts` (modify: `loot_style` in `ALLOWED_SETTINGS_FIELDS`, PUT validation) | controller | CRUD | itself (lines 16-101, PUT at 279, boolean validation at 330) | exact |
| `app/api/guilds/route.ts` (modify: optional `loot_style` and preset knobs in settings insert) | controller | CRUD | itself (settings insert, lines 213-222) | exact |
| `app/components/CreateGuildModal.tsx` (modify: preset block, `loot_style` in POST body) | component | request-response | itself (POST body, lines 363-372) | exact |
| `app/(app)/loot-management/components/SettingsModal.tsx` (modify: preset block at top, Fine-tune disclosure) | component | event-driven | itself (Modal, ModalHeader, Card unified, lines 60-80) | exact |
| `app/(app)/loot-management/components/LootSettingsContent.tsx` (modify: `loot_style` in state and `safeSettings`) | component | CRUD (autosave) | itself (`safeSettings`, research F3, line ~359) | exact |
| `app/(app)/guild-settings/components/GuildSettingsContent.tsx` (modify: "Send Set your 5" row) | component | request-response | itself, Discord integration card (lines 682-770, research refs) | role-match |
| `domain/types.ts` (modify: `ScoreResult` gains `standing`, `interest`; `ScoreExplanation` gains sentences) | model (types) | transform | itself | exact |
| `domain/scoring/engine.ts` (modify: `toScoreResult` helper, `computeScore` return at line 57) | service (pure) | transform | itself | exact |
| `domain/scoring/explain.ts` (modify: standing and interest sentences) | utility (pure) | transform | itself (`explainScore`, lines 35-70) | exact |
| `app/(app)/master-sheet/components/BossSection.tsx` (modify: `rankingToScoreResult` uses shared helper) | component | transform | itself (lines 58-76) | exact |
| `app/components/ScoreComparisonModal.tsx` (modify: `rankingToScoreResult` line 54; tiles and group rows) | component | transform | `BossSection.tsx:64` (same helper shape) | exact |
| `app/components/ItemCandidateModal.tsx` (modify: explainScore call line 229, Standing column) | component | transform | itself | exact |
| `app/(app)/overview/components/DashboardContent.tsx` (modify: ScoreSplit widget, loot priority grouping) | component | transform | itself (score widget, research lines 1137-1158, 1565) | role-match |
| `app/(app)/master-sheet/components/MasterSheetContent.tsx` (modify: `computeScore` callers, visibility chunks) | component | transform | itself (research lines 841-848, 1007, 1500) | role-match |
| `app/components/NeedLabel.tsx` (modify: hover underline, focus ring, `text-left`) | component | event-driven | itself | exact |
| `app/components/__tests__/NeedLabel.test.tsx` (modify) | test | event-driven | itself (not excerpted) | role-match |
| `lib/loot/__tests__/need-reader-inventory.test.ts` (modify: drop hold entry, add guard entry, add `branch` for `loot-items-query.ts`) | test | file-I/O | itself (`READER_PATTERN` lines 69-83; `SQL_FUNCTION_READERS` entry lines 955-975) | exact |
| `proxy.ts` (modify: `next` keeps `request.nextUrl.search`, line 318) | middleware | request-response | itself (lines 306-324) | exact |
| `lib/__tests__/post-auth-redirect.test.ts` or a proxy test (modify/new: `next` with query survives) | test | request-response | `lib/post-auth-redirect.ts` tests; `app/api/addon/auth/__tests__/rate-limit.test.ts` (drives `proxy()`, per research) | role-match |
| `lib/database.types.ts` (modify: `loot_style` on `guild_settings` Row, Insert, Update) | config (types) | — | `award_slot_lock_enabled` entries (lines 891, 962, 1033, per research) | exact |
| `app/api/addon/guild-data/route.ts`, `app/api/addon/export-string/route.ts` (modify: drop `loot_style` from payload) | controller | request-response | itself (`select('*')` line 92 / 87; spread line 327) | exact |
| `domain/loot/need-ranking-hold.ts` and its test (delete, D-08) | utility | transform | itself (excerpted) | n/a |
| `app/services/need-row-seeder.ts` | service | batch | unchanged; reference for `NeedRowInsert` and `planNeedRows` | reference |

## Pattern Assignments

### `domain/loot/need-budget.ts` (utility, pure check) and `domain/loot/need-eligibility.ts` (utility, pure check)

**Analog:** `domain/loot/prio-violations.ts` (the prio check that submit already calls), and `domain/loot/need-ranking-hold.ts` (the predicate being replaced).

**Pure check shape** (`domain/loot/prio-violations.ts` lines 1-14, 13, 52-56): a header comment that says why, a stable code constant, typed entries, and one exported `find...` function that returns violations and never touches I/O.
```ts
/**
 * Ranked items that sit outside their zone's officer prio pool (#484).
 * The submit route and the editor marker both use this, so a raider sees in the
 * editor exactly what submit will refuse.
 */
import { positionKey } from './list-row-updates'
import { canRankInZone, zoneForRank, type ListZone, type PrioZoneItem } from './prio-zones'

export const PRIO_VIOLATION_CODE = 'PRIO_VIOLATION'

export function findPrioViolations(
  entries: readonly PrioRankedEntry[],
  items: readonly PrioCheckItem[],
  locks: readonly PrioLockPosition[] = [],
): PrioViolation[] { /* ... */ }
```
Apply to: `checkNeedBudget(rows)` and `needBudgetUsed(rows)` in `need-budget.ts` (take `{ rank, need_key, allocation_cost }[]`, sum the distinct `(rank, need_key)` picks, per RESEARCH Topic 3), and `eligibleNeedsFor` / `isNeedEligible` in `need-eligibility.ts`. Export a `NEED_BUDGET_POINTS = 10` constant and a `NEED_BUDGET_CODE` string shaped like `PRIO_VIOLATION_CODE`.

**Copy-of-the-hold to delete** (`domain/loot/need-ranking-hold.ts` lines 1-31): the file's own header lists the exact Phase 4 removal steps (delete the route check, delete this module and its test, ship the migration). Delete the module and its test in the code PR that adds the budget check (D-08), after the migration is live.

### `domain/loot/need-defaults.ts` (config, frozen data) and its gate test

**Analog:** `domain/loot/needs.ts` (lines 93-103 and 215-250).

**Frozen map pattern** (`needs.ts` 93-103):
```ts
export const NEED_COST_BY_TIER: Readonly<Record<NeedCostTier, 1 | 2 | 3>> = Object.freeze({
  big: 3,
  medium: 2,
  standard: 1,
})
```
**Lookup through a Map, never by indexing an object with input** (`needs.ts` 226-248), so `constructor` and `__proto__` cannot answer from the prototype:
```ts
const DEFINITION_BY_KEY = indexDefinitions(NEED_DEFINITIONS)
export function findNeedDefinition(key: unknown, definitions = NEED_DEFINITIONS): NeedDefinition | null {
  if (typeof key !== 'string') return null
  const index = definitions === NEED_DEFINITIONS ? DEFINITION_BY_KEY : indexDefinitions(definitions)
  return index.get(key) ?? null
}
```
Apply to `defaultNeedsFor(className, specName)`: a frozen array of `{ className, specName, needs: [5 keys] }`, and a `Map` built once. A spec with no entry returns `null` (D-11).

**Gate test:** the defaults file is gated like `needs.ts` is gated by its fixture. Assert five distinct keys, `findNeedDefinition(key)?.key === key`, budget at most `NEED_BUDGET_POINTS`, eligibility for that spec, and every fixture `(className, specName)` pair has a default or appears in an explicit `SPECS_WITHOUT_DEFAULT`.

### `domain/guild/loot-style-presets.ts` (config, frozen map and pure compare)

**Analog:** `domain/loot/needs.ts` frozen maps (above).

**Shape to copy:** `Object.freeze` per preset id; a `LOOT_STYLE_IDS` tuple that must equal the DB check constraint values (`reward_attendance`, `even_rotation`, `officers_decide`, per RESEARCH Topic 2); `isLootStyleId` as a type guard; `presetMatches(settings, id)` and `presetDiff(settings, id)`. Compare numerics with `Number()` because `signup_weight` is `numeric(3,2)`. Do not add any key to `DEFAULT_SETTINGS` or `ScoringConfig` defaults (F9). The Lua exporter prints `getDefaultSettings()`.

### `domain/loot/need-list-rules.ts` (utility, pure check; plan 04-08)

**Analog:** the prio read in `app/api/loot-submissions/submit/route.ts` lines 225-246.
```ts
// Lists saved before an officer changed prio keep items the editor would
// now refuse, and a direct save never went through the editor (#484).
// A read failure throws to the catch (500) rather than skipping the check.
const prioItems = await fetchListPrioItems(serviceSupabase, {
  character_id: submission.character_id,
  expansion_id: submission.expansion_id,
  phase: submission.phase,
})
const prioViolations = findPrioViolations(
  itemRows.map((row) => ({ loot_item_id: row.loot_item_id, rank: row.rank, slot: Number(row.slot) })),
  prioItems,
  locks,
)
```
Keep it "rows in, pure result out": `checkNeedList(rows, character)` takes the need rows and the class and spec names the route already read, calls `checkNeedBudget` and `isNeedEligible`, and reads no tables itself, so it lives in `domain/` with the other pure rules rather than in `lib/` (see the reader inventory note below). The route keeps the reads and the 422 responses.

### `app/api/loot-submissions/submit/route.ts` (controller, request-response) (modify)

**Analog:** itself. Order today, lines 156-245: D-22 hold (164-166), GH #357 filter (172-177), need rows exempt from brackets (183), bracket and copy checks (187-211), prio check (224-242).

**Current hold to remove** (lines 7, 164-166):
```ts
import { isHeldNeedRanking, NEED_RANKING_HOLD_ERROR } from '@/domain/loot/need-ranking-hold'
// ...
if (itemRows.some((si) => isHeldNeedRanking(si.loot_item))) {
  return NextResponse.json({ error: NEED_RANKING_HOLD_ERROR }, { status: 422 })
}
```
**Insertion point for the budget and eligibility checks:** after `validateItemCopyLimits` (line 211, the `if (violations.length > 0)` block) and before `fetchListPrioItems` (line 225). Return `422` for budget and eligibility, through the same `{ error, code }` shape as the prio refusal (lines 237-241), but with a distinct `code` (Claude's discretion per CONTEXT). The refusal happens before the status update, so `status`, `submitted_at` and `resubmission_count` stay untouched (P1).

**Prio refusal shape to mirror** (lines 237-242):
```ts
return NextResponse.json({
  error: prioViolationMessage(named),
  code: PRIO_VIOLATION_CODE,
  prio_violations: named,
}, { status: 400 })
```
**Character read to extend:** the route reads the character for `user_id`. Extend the existing read (do not add a read) with `class:wow_classes(name), spec:class_specs(name)` (RESEARCH Topic 8).

### `app/api/loot-submissions/submit/__tests__/route.test.ts` (test, recording fake)

**Analog:** same file, `makeClient(fixture)` at lines 56-125 (`select/update/eq/in/is` record `[col, val]` into `call.filters`; `then` answers per table). Replace the two hold describes (line 334 "ranking needs is held (D-22)" and line 387 "with the hold lifted (Phase 4 state)") with: over-budget answers 422 and writes nothing; ineligible need answers 422; a 15-row list of 3 tiers and 5 keys passes. Fixtures default `kind` to `'item'`; the new need fixture sets `kind: 'need'` and `need_key`.

### `app/api/raid-tiers/route.ts` (controller, PATCH) and its test

**Analog:** itself. PATCH lines 111-130:
```ts
export async function PATCH(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { guild_id, tier_id, updates } = body
    if (!guild_id || !tier_id || !updates) {
      return NextResponse.json({ error: 'guild_id, tier_id, and updates are required' }, { status: 400 })
    }
    const serviceSupabase = createTypedServiceRoleClient()
    const { hasPermission } = await verifyPermission(serviceSupabase, user.id, guild_id, 'manage_settings')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Officer permissions required' }, { status: 403 })
    }
```
WR-01 is already fixed on main (RESEARCH F1). Keep the single-update shape. Do not re-fix. Add `list_mode` and `sort_order` to the GET select (line 56 selects `list_mode` but not `sort_order`).

**Test analog:** `app/api/raid-tiers/__tests__/route.test.ts` lines 1-30 (`vi.mock` of `createServiceRoleClient`, `getAuthenticatedUser`, `verifyPermission`, `logAudit`; `// @vitest-environment node`; import `DISCOVERY_FOREVER_ONLY_REASON` and `KNOWN_SWITCH_BLOCKED_REASON` from `@/domain/loot/list-mode`). The guard test at around line 609 ("the expansion page does not mention list_mode") must be inverted in the same PR as D-15.

### `app/api/discord/set-your-five/route.ts` (controller, request-response + batch)

**Analog 1:** `app/api/discord/post-raid-summary/route.ts` lines 39-70 (route shape, auth, permission, channel lookup).
```ts
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { guild_id, raid_event_id } = body
    if (!guild_id || !raid_event_id) {
      return NextResponse.json({ error: 'guild_id and raid_event_id are required' }, { status: 400 })
    }
    const botToken = process.env.DISCORD_BOT_TOKEN
    if (!botToken) {
      return NextResponse.json({ error: 'Discord notifications temporarily unavailable' }, { status: 503 })
    }
    const supabase = createServiceRoleClient()
    const { hasPermission } = await verifyPermission(supabase, user.id, guild_id, 'manage_attendance')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Only officers can post raid summaries' }, { status: 403 })
    }
```
Use `verifyPermission(..., 'manage_settings')` (D-23). Read `raid_summary_channel_id` the same way as `post-raid-summary` lines 79-91 (400 with "No raid summary channel configured" when missing). Add the Discovery gate: active expansion has a `raid_tiers` row with `list_mode = 'discovery'` and `is_guild_active = true`, else 400.

**Analog 2:** `lib/billing/trial-ending.ts` lines 360-394 (the DM send contract).
```ts
const sendOutcome = await sendDirectMessage(botToken, purchaser.discordId, {
  embeds: [message],
  // Belt to sanitizeGuildName's braces (T-wiy-04): no payload can ping
  // anyone regardless of what any interpolated text contains.
  allowed_mentions: { parse: [] },
})
if (!sendOutcome.ok) {
  if (sendOutcome.status === 403) {
    // DMs closed to the bot / no shared server / stale id - a state of
    // the world, not a fault.
    return { sent: false, reason: 'dm_refused' }
  }
  console.error(`... DM send failed at ${sendOutcome.stage} (status ${sendOutcome.status})`)
  return { sent: false, reason: 'send_failed' }
}
```
Copy this: 403 is quiet (D-30, code 50007), other failures log `stage` and `status` only, never a Discord id (no ids in logs). Use `sendDirectMessage` from `lib/discord.ts` (lines 97-120, never throws, returns `{ ok, stage, status }`). Do not inline `discordFetch` pairs.

**Member Discord ids:** read `user_preferences.discord_id` (F10; `app/api/discord/notify-officers/route.ts:146` and `app/api/cron/resubmit-reminders/route.ts:111`), paged with `selectAllPagesOrThrow` (`utils/supabase/paginate.ts`). Do not read `profiles.discord_id` (none exists in app code).

**Link button body** (RESEARCH Code Examples, Discord docs): `{ embeds or content, allowed_mentions: { parse: [] }, components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Set my 5', url }] }] }`. No component pattern exists in the repo, so this is a new shape. The URL is `${NEXT_PUBLIC_APP_URL}/loot-list?guild=<guild_id>&picker=1` (D-24). `resolveAppOrigin` at `lib/billing/trial-ending.ts:266` is the fallback to copy or export.

**Route config (D-30):** add `export const maxDuration = ...` and a bounded concurrency loop. No `maxDuration` exists in `app/` today (RESEARCH A6). Add the server-side 60-minute per-guild cooldown (D-30) with an audit row via `logAudit` (`utils/audit/log.ts`).

### `app/api/discord/set-your-five/__tests__/route.test.ts` (test)

**Analog:** `app/api/raid-tiers/__tests__/route.test.ts` (mocks at lines 1-30 and recording fake at lines 36-60). Mock `@/lib/discord` (`sendDirectMessage`) and `@/utils/server-roles`. Assert: 403 for non-officer; 400 with no Discovery tier; counts-only body; a 403 outcome is counted as skipped; no id appears in `console.error` calls.

### `supabase/migrations/<UTC ts>_need_lists.sql` (migration, expand-only)

**Analog:** `supabase/migrations/20261028120000_award_slot_locks.sql` (header sections and guard style) and `20261020120000_discovery_schema.sql` (WHEN-gated guards, `NOT VALID` then `VALIDATE`).

**Header house style** (`20261028120000_award_slot_locks.sql` lines 1-30). The contract test requires these exact headings, each as `-- Name` followed by a `-- ----` underline (see the migration test pattern below): `Problem`, `Fix`, `Readers and writers checked`, `Error contract`, `Production safety`, `Not changed`, `Deploy`, `Rollback`. The Phase 3 test also requires `Guards on existing tables`.

**Statement pattern to copy** (RESEARCH Topic 2, verified in the PGlite probe):
```sql
ALTER TABLE "public"."loot_submission_items" ADD CONSTRAINT "loot_submission_items_slot_range_check"
  CHECK (("slot" >= 1 AND "slot" <= 8)) NOT VALID;
ALTER TABLE "public"."loot_submission_items" VALIDATE CONSTRAINT "loot_submission_items_slot_range_check";
ALTER TABLE "public"."loot_submission_items" DROP CONSTRAINT IF EXISTS "loot_submission_items_slot_check";
```
**WHEN-gated guard** (RESEARCH Topic 2, probe-proven):
```sql
CREATE OR REPLACE TRIGGER "enforce_raid_tier_need_delete_lock" BEFORE DELETE ON "public"."raid_tiers"
  FOR EACH ROW WHEN (OLD.list_mode = 'discovery')
  EXECUTE FUNCTION "public"."enforce_raid_tier_need_delete_lock"();
```
Guard body returns `OLD` (not `NULL`, which would silently skip trusted deletes). Use `format()` only with column values through `%s` (CodeQL rule). Drop the hold: `DROP TRIGGER IF EXISTS "enforce_need_ranking_hold" ON "public"."loot_submission_items"` then `DROP FUNCTION IF EXISTS "public"."enforce_need_ranking_hold"()`. Add `loot_style` the same way as `award_slot_lock_enabled` (`guild_settings`, nullable text, check on the three ids, `NOT VALID` then `VALIDATE`). Do not change `save_submission_items` (no slot check; RESEARCH Topic 1 step 3).

### `app/services/__tests__/need-lists-migration.test.ts` (contract test)

**Analog:** `app/services/__tests__/discovery-schema-migration.test.ts` (749 lines).

Header and helpers (lines 1-30): `// @vitest-environment node`, `MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations')`, a `MIGRATION_FILE` constant, `stripComments` (drop `--` lines), `splitStatements` (split on `;` outside `$$`).

House-style headings test (lines 540-556):
```ts
for (const section of sections) {
  expect(raw, `header section ${section}`).toMatch(new RegExp(`^-- ${section}\\n-- -{3,}$`, 'm'))
}
```
ADD CONSTRAINT and VALIDATE pairing (lines 530-538): every `ADD CONSTRAINT` ends in `NOT VALID` and the next statement is `ALTER TABLE ... VALIDATE CONSTRAINT <same name>`. Copy both. Add the WHEN-clause check for the new `raid_tiers` trigger, and a no-data-statement check.

### `app/services/__tests__/need-lists-pglite.test.ts` (SQL proof)

**Analog:** `app/services/__tests__/discovery-schema-pglite.test.ts`.

Fixture ids as synthetic UUIDs (lines 60-70, e.g. `'00000000-0000-4000-8000-000000000025'`). The guard-trigger list (lines 70-80):
```ts
const GUARD_TRIGGERS = [
  'enforce_loot_item_need_pin_refs',
  'enforce_raid_tier_discovery_forever_only',
  // ...
  'enforce_need_ranking_hold',   // remove this line in Phase 4
  // ...
  'enforce_loot_item_need_delete_lock',
]
```
Chain setup (lines 120-135): `createChainedDb(files)`, `SET search_path TO public, extensions; RESET role;`, then seed as the superuser ("stands in for the service role: the guard locks check only anon and authenticated sessions"). Per RESEARCH F5, the new file must not re-apply the Phase 3 migration on the clean chain; in `discovery-schema-pglite.test.ts` either drop the re-apply at line 126 or apply the Phase 4 file after it.

### `app/contexts/LootListContext.tsx` (provider, save path) (modify)

**Analog:** itself, `saveSubmission` lines 940-960. The picker reuses this path (D-27), so there is no new save route.
```ts
// Atomic save: DELETE + INSERT in a single transaction via RPC
const itemsJson = Object.entries(rankings).map(([key, loot_item_id]) => {
  const [rankStr, slotStr] = key.split('-')
  return { loot_item_id, rank: parseInt(rankStr), slot: parseInt(slotStr) }
})
const { error: saveError } = await supabase.rpc('save_submission_items', {
  p_submission_id: submissionId,
  p_items: itemsJson,
})
if (saveError) {
  console.error('[saveSubmission] Failed to save items:', saveError)
  throw new Error(saveError.message)
}
```
Gap: `saveSubmission` drops the server `code` (RESEARCH P12), so the picker cannot tell an over-budget refusal from a not-usable one. Extend the thrown error with `code` (or a sibling `{ ok, code, error }` variant); do not parse the sentence. The key format `"rank-slot"` is `positionKey` in `domain/loot/list-row-updates.ts:12`, so the picker should build keys with that helper.

### `app/(app)/expansions/[expansionId]/_client.tsx` (component, list-mode control D-15) (modify)

**Analog:** itself. The tier read is a direct client select near line 307 (`.select('id, name, phase, is_guild_active, master_sheet_visible')`), local `RaidTier` interface at line 23, handlers `handleToggleGuildActive` (369) and `handleToggleMasterSheetVisibility` (397) that post `{ guild_id, tier_id, updates }` to `PATCH /api/raid-tiers`, show `errBody.error`, then `mutate` the SWR keys. Copy that shape for `list_mode`. Gate on `hasPermission('manage_settings')` (line 234). Confirm before Known to Discovery with `useConfirm`/`ConfirmModal variant="default"`.

### `app/api/guild-settings/route.ts` and the settings modal chain (CRUD) (modify)

**Analog:** itself. `ALLOWED_SETTINGS_FIELDS` (lines 16-101) is the allowlist; `pickAllowedSettings` (around line 109) drops anything outside it silently (P11). PUT at line 279. Boolean validation pattern at line 330:
```ts
if ('award_slot_lock_enabled' in sanitizedSettings && typeof sanitizedSettings.award_slot_lock_enabled !== 'boolean') { /* 400 */ }
```
Add a `loot_style` validation the same way (null or one of the three ids via `isLootStyleId`), and the DB check is the backstop.

**Settings modal:** `app/(app)/loot-management/components/SettingsModal.tsx` lines 60-80 (controlled `Modal size="xl"`, `ModalHeader` with the `Saving...` / `Saved` / `Save failed` states, `ModalBody className="space-y-6"`, first `Card variant="unified"`). The preset block goes first inside `ModalBody`. `useConfirm` is already imported (line 62) for the D-19 overwrite prompt.

**Autosave:** `LootSettingsContent` autosaves 800 ms after a change using the explicit `safeSettings` object (research F3, around line 359). A preset apply is one `setSettings({ ...settings, ...knobs, loot_style })`, which becomes one PUT. Add `loot_style` to the state defaults and to `safeSettings`, or it is silently dropped on the next autosave (P11).

### `app/api/guilds/route.ts` and `app/components/CreateGuildModal.tsx` (CRUD, creation) (modify)

**Analog:** itself. The default settings insert (`app/api/guilds/route.ts` lines 213-222):
```ts
const { error: settingsError } = await supabase
  .from('guild_settings')
  .insert({
    guild_id: guild.id,
    attendance_type: 'linear',
    rolling_attendance_weeks: 8,
    use_signups: false,
    signup_weight: 0,
  })
```
Merge the chosen preset knobs and an optional validated `loot_style` into this insert. Do not call the settings PUT from creation: that marks `loot_settings_completed_at` (F4). The modal's POST (`app/components/CreateGuildModal.tsx` lines 363-372) sends `{ name, realm, faction, discord_server_id, expansion, game }`; add `loot_style` to that body.

### `domain/scoring/engine.ts`, `domain/scoring/explain.ts`, `domain/types.ts` (score split) (modify)

**Helper shape** (RESEARCH Code Examples, to add beside `computeScore`; the total expression at lines 47-55 is untouched and `return { total, components }` at line 57 becomes the helper call):
```ts
export function toScoreResult(total: number, components: ScoreComponents): ScoreResult {
  return { total, components, interest: components.itemRank, standing: total - components.itemRank }
}
```
Tests must use `toBeCloseTo` for `standing` (float noise, e.g. 7.299999999999997). Dashboard rounds with `toFixed(decimalPlaces)` (DashboardContent.tsx:2101).

**`explainScore` analog** (`domain/scoring/explain.ts` lines 35-70). The signature takes `(result, configOrInput, opts)`; add `voice` through `ExplainScoreOptions` and do not change positional arguments. Existing per-line pattern to copy for the sentences:
```ts
lines.push({
  label: 'Item rank',
  value: s.itemRank,
  detail: s.itemRank > 0 ? `Position #${51 - s.itemRank} on your list` : 'No item selected',
  key: 'itemRank',
})
```
Position `51 - itemRank` already gives "your number N pick" with no need-specific branch (D-22).

**Hand-built `ScoreResult` callers** (replace with `toScoreResult` so the new required fields do not break them): `app/(app)/master-sheet/components/BossSection.tsx` lines 58-76:
```ts
/** Reconstruct a ScoreResult from the flat PlayerRanking fields */
function rankingToScoreResult(r: PlayerRanking): ScoreResult {
  const components: ScoreComponents = {
    itemRank: r.rank,
    attendanceScore: r.attendance_score,
    rankModifier: r.role_modifier,
    roleBonus: r.role_bonus,
    badLuckBonus: r.bad_luck_bonus,
    priorityBonus: r.priority_bonus,
    trialPenalty: r.trial_penalty,
    donationBonus: r.donation_bonus,
    raiderBonus: r.raider_bonus,
  }
  return { total: r.loot_score, components }
}
```
The same function is duplicated at `app/components/ScoreComparisonModal.tsx:54-67` (RESEARCH F8). `ItemCandidateModal.tsx:229` builds the input inline for `explainScore`.

### `app/components/NeedLabel.tsx` (component) and `NeedLabel.test.tsx` (modify)

**Analog:** itself. Current render (lines 35-61): a `button` when `onClick` is given, else a `span`, both with `data-need-label=""`, `Target02Icon` at 16px with `aria-hidden="true"` and `text-muted-foreground`, and `<span className="truncate min-w-0">{name}</span>`. Add to the button only (UI-SPEC section 6): `text-left hover:underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring rounded-sm`. Keep the neutral look and the `title` of the full name in the row. Do not add a Wowhead link.

### `app/components/need-picker/*` and `app/(app)/loot-list/components/*` (components, new)

**Analog (partial):** `app/components/NeedLabel.tsx` for the `HugeiconsIcon` import pattern (`import { HugeiconsIcon } from '@hugeicons/react'` and `import { Target02Icon } from '@hugeicons/core-free-icons'`). Icons come from the installed package; verify each name (UI-SPEC lists candidates). `Modal` gets an additive `placement="sheet"` prop (UI-01); the default stays `center`. No question-flow analog exists, so `NeedQuestionFlow` is new and controlled (`value`, `onChange`, `onComplete`, `eligibility`, `optionState`, `variant`). Card, Button, Badge and StatusBadge come from `components/ui/*` (UI-SPEC Design System).

### `app/components/LootStylePicker.tsx` and the creation step (components, new)

**Analog (partial):** `SettingsModal.tsx` (ConfirmModal via `useConfirm`) and the `RadioGroup` from `components/ui/*` (UI-SPEC section 3). Preset cards are a `RadioGroup` of three card-styled items; Radix handles arrow keys.

### `app/api/master-sheet/visibility/route.ts` (WR-02) (modify)

**Analog:** `lib/loot/guild-award-refs.ts:27` (`const CHUNK_SIZE = 100`) for chunking, and `utils/supabase/paginate.ts` (`selectAllPagesOrThrow`) for error-checked paging. The current page loop ignores the error (`const { data: page } = ... if (!page || page.length === 0) break`, route lines 268-275, RESEARCH P3). Replacement shape (RESEARCH Code Examples):
```ts
const CHUNK = 100
for (let i = 0; i < allowedItemIds.length; i += CHUNK) {
  const ids = allowedItemIds.slice(i, i + CHUNK)
  const rows = await selectAllPagesOrThrow<RankingRow>('master sheet rankings', (s, e) =>
    serviceSupabase.from('loot_submission_items').select('rank, slot, submission_id, loot_item_id')
      .in('loot_item_id', ids).is('removed_at', null).order('id', { ascending: true }).range(s, e))
  rankings.push(...rows)
}
```
A read failure then throws to the route's catch and answers 500 (Phase 1 owner decisions 7 and 8). Keep the item-only BLP call unchanged.

### `app/api/prio-list/route.ts` (WR-03) (modify)

**Analog:** itself. The embed does not select `kind`, so the need test cannot fail. Select `kind` in the embed, drop need rows with `isNeedRow(...)` from `domain/loot/item-identity.ts` after the read, and assert on the recorded select list in the test (the fake must apply the select list). A bare `.eq('loot_item.kind', 'item')` would not satisfy the reader-inventory `exclude` marker regex (RESEARCH Topic 7). POST `/api/prio-list` should also refuse need rows (D-03).

### `proxy.ts` (middleware) and its test (modify)

**Analog:** itself, lines 306-324. The sign-in redirect keeps only the pathname (line 318):
```ts
const loginUrl = new URL('/', request.url)
loginUrl.searchParams.set('next', pathname)
```
Change to `pathname + request.nextUrl.search`. `isSafeNextPath` (`lib/post-auth-redirect.ts:29-58`) already accepts a path with a query, so this stays same-origin. Add a test beside `lib/__tests__/post-auth-redirect.test.ts`; `app/api/addon/auth/__tests__/rate-limit.test.ts` shows how to drive `proxy()` in a test.

### `app/services/__tests__/discovery-schema-pglite.test.ts` (modify)

**Analog:** itself. Remove `'enforce_need_ranking_hold'` from `GUARD_TRIGGERS` (line 70 list). Replace `describe('D-22 need-ranking hold')` (around line 926) with the inverse proof in the new need-lists file. The `'lets the guild creator delete the guild...'` case (around line 1187) stays and is the `delete_guild` regression.

### `lib/loot/__tests__/need-reader-inventory.test.ts` (modify)

**Analog:** itself.

**Scanner patterns** (lines 60-90): `READER_PATTERN` matches `from('loot_items' | 'loot_submission_items' | 'loot_history')` and `loot_item:loot_items`; `RPC_CALL_PATTERN` matches the inventoried RPC names; the entry type has `plan`, `note`, `test` (required for `ok`) and `via` (for `consumer`).

**Function entry to replace** (lines 960-966): remove the `enforce_need_ranking_hold` entry (the scanner treats a `DROP FUNCTION` as removal). Add the new guard as a `guard` entry:
```ts
{
  name: 'enforce_need_ranking_hold',
  dispositions: ['guard'],
  definedIn: '20261020120000',
  note: 'D-22 hold on rankings from browser sessions, dropped in Phase 4',
  test: PGLITE,
},
```
Replace with `name: 'enforce_raid_tier_need_delete_lock'`, `dispositions: ['guard']`, `definedIn` = the new timestamp, `note`, `test` = the new PGlite file. Also: `lib/loot-items-query.ts` gets `branch` (marker `isNeedRow(` at line ~200), and `app/contexts/LootListContext.tsx` (line ~410) note is updated to the new proof.

### `app/api/addon/guild-data/route.ts` and `export-string/route.ts` (modify)

**Analog:** itself. Both `select('*')` from `guild_settings` (`guild-data` line 92, `export-string` line 87) and spread `...settings` (line 327 in `guild-data`). Drop `loot_style` from the payload server-side so Known guild payload bytes do not change (D-30, F14).

### `lib/database.types.ts` (modify)

**Analog:** the `award_slot_lock_enabled` entries (lines 891, 962, 1033 per RESEARCH Topic 2). Add `loot_style: string | null` to Row and `loot_style?: string | null` to Insert and Update, alphabetically after `loot_announcements_enabled`. Edit by hand, as Phase 3 did (`gen:types` needs the live project).

## Shared Patterns

### Pure rule in `domain/`, one route call (applies to budget, eligibility, presets, need picks)
**Source:** `domain/loot/prio-violations.ts` (pure, typed, exported code constant) and `domain/loot/need-ranking-hold.ts` (the predicate pattern being replaced).
**Apply to:** `need-budget.ts`, `need-eligibility.ts`, `need-picks.ts`, `need-defaults.ts`, `loot-style-presets.ts`. The picker and submit must call the same function so they cannot disagree.

### Error refusal shape with a code
**Source:** `app/api/loot-submissions/submit/route.ts` lines 237-242 (`{ error, code: PRIO_VIOLATION_CODE, prio_violations }`, status 400) and the bracket refusal (lines 205-211, 422).
**Apply to:** budget and eligibility refusals in submit (422, distinct codes), and the `saveSubmission` caller in `LootListContext.tsx` (must carry `code`, RESEARCH P12).

### Auth and permission in routes
**Source:** `app/api/raid-tiers/route.ts` lines 111-130 and `app/api/discord/post-raid-summary/route.ts` lines 39-62 (`getAuthenticatedUser`, then `verifyPermission(client, user.id, guild_id, '<permission>')`, 401 then 403).
**Apply to:** `set-your-five` (`manage_settings`), `PATCH /api/raid-tiers` (already), the list-mode control (client gate `hasPermission('manage_settings')`).

### Error-checked reads and chunking
**Source:** `utils/supabase/paginate.ts` (`selectAllPagesOrThrow`) and `lib/loot/guild-award-refs.ts:27` (`CHUNK_SIZE = 100`).
**Apply to:** WR-02 visibility route, the `tier-need-rows.ts` reads, the Discord member read.

### Discord sending
**Source:** `lib/discord.ts` (`sendDirectMessage`, lines 97-120; never throws, returns `{ ok, stage, status }`) and `lib/billing/trial-ending.ts` lines 373-390 (403 quiet, others log stage and status only).
**Apply to:** `set-your-five`. Never log a Discord id or a member name (counts only).

### Frozen data with a gate
**Source:** `domain/loot/needs.ts` (`Object.freeze` maps at lines 93-103; Map-based lookup at lines 226-248 with the T-03-03-02 comment).
**Apply to:** `need-defaults.ts`, `loot-style-presets.ts`.

### Expand-only migration with house-style contract test
**Source:** `supabase/migrations/20261028120000_award_slot_locks.sql` (header sections) and `app/services/__tests__/discovery-schema-migration.test.ts` lines 530-556 (`NOT VALID` then `VALIDATE`; header section regex).
**Apply to:** `<ts>_need_lists.sql`, `need-lists-migration.test.ts`, `need-lists-pglite.test.ts`.

### Reader inventory
**Source:** `lib/loot/__tests__/need-reader-inventory.test.ts` lines 60-90 (`READER_PATTERN`, `RPC_CALL_PATTERN`) and the entries at lines 955-975.
**Apply to:** any new file that calls `.from('loot_items' | 'loot_submission_items' | 'loot_history')` or `.rpc('save_submission_items')`. The set-your-five route reads memberships, preferences, settings and tiers only, so it needs no entry. The picker reuses `LootListContext` (already listed). The pure modules read nothing.

### Recording test fakes
**Source:** `app/api/raid-tiers/__tests__/route.test.ts` lines 36-60 (`Call { table, op, filters, selectCols, payload }`, `NeedRowState`) and `app/api/loot-submissions/submit/__tests__/route.test.ts` lines 56-125.
**Apply to:** every new route test. Fixtures default `kind` to `'item'`; the fake must apply `eq`, `in` and the select list, so a filter cannot pass vacuously (WR-03).

## No Analog Found

Files with no close match in the codebase (planner should use RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `app/components/need-picker/NeedQuestionFlow.tsx` | component (controlled question flow) | event-driven | No multi-step option-picker component exists; built from UI-SPEC section 1b |
| `app/components/need-picker/NeedQuestionSheet.tsx` | component | event-driven | The `Modal` `placement="sheet"` prop does not exist yet (additive change, UI-01) |
| Discord link-button components (`components:` action row) | config (message JSON) | request-response | No component is sent anywhere in the repo today; use RESEARCH Code Examples and the Discord docs |
| `domain/loot/need-eligibility.ts` slot table for dual-wield and relic classes | config | transform | `data/class-proficiencies.ts` lacks dual-wield and relic data; new table is `[ASSUMED]` (RESEARCH Topic 3) |
| `app/components/ScoreSplit.tsx` tiles and compact variants | component | transform | No split score component exists; only the line list in `ScoreBreakdownModal` |
| Rate-limit or cooldown for the sender | service | request-response | No server-side cooldown for Discord sends exists; use `logAudit` (`utils/audit/log.ts`) as the record (D-30) |

## Gaps

These analogs were located but not excerpted in this pass, so the planner should read them before writing the plan action:
- `app/components/BisImportModal.tsx` (list save path reference; the picker uses `LootListContext` instead)
- `app/(app)/overview/components/SetupGuide.tsx` (card pattern for `SetYourFiveCard`)
- `app/components/__tests__/NeedLabel.test.tsx` and `components/ui/modal.tsx` (for the `placement` prop)
- `app/api/loot-list/bootstrap/route.ts` (tier select at line 90 per RESEARCH F11) and `app/api/loot-items/route.ts`
- `app/services/need-row-seeder.ts` is a reference only (`planNeedRows`, `NeedRowInsert`); it is not modified.
- `domain/scoring/__tests__/` and the Lua exporter (`export-fixtures.ts`), used as the byte-identical gate.

## Metadata

**Analog search scope:** `domain/loot`, `domain/scoring`, `app/api/loot-submissions`, `app/api/raid-tiers`, `app/api/discord`, `app/api/guilds`, `app/api/guild-settings`, `app/contexts`, `app/components`, `app/(app)/loot-management`, `app/(app)/master-sheet`, `app/(app)/overview`, `app/services`, `lib/loot`, `lib/billing`, `lib/discord.ts`, `proxy.ts`, `lib/post-auth-redirect.ts`, `supabase/migrations`.
**Files scanned:** 27 read in full or in excerpt; line counts checked for all 27 listed analogs.
**Pattern extraction date:** 2026-11-10

Notes on the inputs: the RESEARCH.md line references (F1 to F14, the route line numbers and the Phase 3 test names) were checked against the excerpts above where they overlap and are cited as RESEARCH where not re-verified. The WR-01 fix is already on main, so the raid-tiers PATCH is a regression check, not new work.
