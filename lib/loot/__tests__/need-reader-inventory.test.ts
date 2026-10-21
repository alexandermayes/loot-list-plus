// @vitest-environment node
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

/**
 * Reader inventory (DISC-06, D-16). Phase 3 puts "need" rows (kind = 'need',
 * wowhead_id null, boss_name 'Needs') in loot_items, and rankings and awards
 * point at them from loot_submission_items and loot_history. The phase's main
 * risk is a forgotten reader: one file that still assumes every loot row is a
 * game item will export a null wowhead id, collide a map key or crash a
 * render. Research ("Reader inventory test") answered with this scan: every
 * file that reads the three tables, calls an inventoried SQL function through
 * .rpc, consumes the addon or bot payloads, or is an owner-run script is
 * listed here with how it treats a need row. A new reader fails CI until it
 * is listed, which is what makes "every reader has a mode branch" reviewable.
 *
 * Dispositions:
 *   exclude   the reader filters need rows out (kind = 'item', list_mode =
 *             'known' or an isNeedRow call) and the source holds that marker
 *   label     the reader renders a need row through wowheadIdForDisplay,
 *             ItemLink or NeedLabel instead of building a Wowhead link
 *   key       the reader keys rows with itemIdentityKey, never wowhead_id
 *   branch    the reader has an explicit need branch (isNeedRow or kind = 'need')
 *   guard     the reader refuses or skips a need row (isNeedRow, noteNeedSkipped
 *             or isHeldNeedRanking)
 *   ok        the reader handles a need row unchanged and cites a test that
 *             holds a need fixture, so "ok" always means a test exercises one
 *   agnostic  the reader counts, links or deletes rows by id and its source
 *             names no item column, so a need row behaves exactly like an item
 *   writer    the reader inserts rows with column defaults (kind 'item')
 *   script    owner-run admin tooling, not a request-time reader
 *   consumer  the companion or the bot, which read no table but consume the
 *             addon and bot payloads; `via` names the 'exclude' route that
 *             keeps need rows out of the payload before it leaves the server
 *
 * companion and discord-bot are scanned for direct table reads too (none
 * today), so a future direct read fails CI until it is listed. Their payload
 * consumers are tied to the item-only route that feeds them through `via`.
 */

const REPO_ROOT = path.resolve(__dirname, '../../..')

export type NeedDisposition =
  | 'exclude'
  | 'label'
  | 'key'
  | 'branch'
  | 'guard'
  | 'ok'
  | 'agnostic'
  | 'writer'
  | 'script'
  | 'consumer'

interface NeedReader {
  file: string
  dispositions: readonly NeedDisposition[]
  plan: string
  note: string
  /** Required for 'ok': the test that exercises a need row. */
  test?: string
  /** Required for 'consumer': the NEED_READERS 'exclude' routes feeding it. */
  via?: readonly string[]
}

// Every regex of the scan lives here so a reviewer sees the whole contract.
export const READER_PATTERN =
  /from\(\s*['"](loot_items|loot_submission_items|loot_history)['"]\s*\)|loot_items\s*(![a-z_]+)?\s*\(|loot_item\s*:\s*loot_items/
// A code file that calls an inventoried SQL function is a reader too.
export const RPC_NAMES = [
  'save_submission_items',
  'reset_guild_season',
  'delete_guild',
  'get_guild_submissions',
  'recompute_blp_for_item',
  'recompute_blp_for_event',
  'recompute_blp_for_guild',
  'increment_blp',
  'increment_blp_bulk',
] as const
export const RPC_CALL_PATTERN = new RegExp(`\\.rpc\\(\\s*['"](${RPC_NAMES.join('|')})['"]`)
export const SQL_SCRIPT_PATTERN = /\b(loot_items|loot_submission_items|loot_history)\b/i
export const CONSUMER_ROOTS = ['companion', 'discord-bot'] as const
export const CONSUMER_PATTERN =
  /\bwowhead_id\b|\bwowheadId\b|\bloot_item_id\b|\/api\/addon\/(guild-data|export-string)\b|\/api\/bot\/priority\b/

const CODE_ROOTS = ['app', 'lib', 'domain', 'utils', 'companion', 'discord-bot'] as const
const SCRIPT_ROOTS = ['scripts'] as const

// One skip list serves every root. companion/out and companion/release are the
// gitignored electron-vite and electron-builder output; no directory with a
// build-output name exists under app, lib, domain, utils or scripts today.
export const SKIP_DIRS: ReadonlySet<string> = new Set([
  '__tests__',
  'node_modules',
  'out',
  'release',
  'dist',
  'build',
  '.next',
])
const SOURCE_EXTENSION = /\.(ts|tsx|js|mjs|cjs)$/
const SQL_EXTENSION = /\.sql$/
// discord-bot keeps help.test.mjs and interactions.test.mjs beside its code.
const TEST_FILE = /\.test\.(m?[jt]sx?|cjs)$/

export const MIN_READER_FILES = 45
export const MIN_SCRIPT_READER_FILES = 40
export const MIN_SQL_SCRIPT_FILES = 10
export const MIN_SQL_FUNCTION_READERS = 12
export const MIN_CONSUMER_FILES = 3

const SCRIPT_RUN_NOTE =
  ' Run by hand against legacy expansions, never a Forever expansion; need rows are written only by npm run sync:forever (D-12), which restores any need row a script removes.'
const SCRIPT_NOTES = {
  catalog:
    'Legacy item catalog maintenance; matches by name or wowhead_id, so a need row with no wowhead_id is never targeted.' +
    SCRIPT_RUN_NOTE,
  seeding:
    'Legacy raid seeding or cleanup by raid name; never pointed at a Forever expansion.' +
    SCRIPT_RUN_NOTE,
  diagnostics: 'Local test data, RLS probes or diagnostics; reads or deletes by id.' + SCRIPT_RUN_NOTE,
  schema: 'Legacy one-off schema script, superseded by migrations.' + SCRIPT_RUN_NOTE,
}
const ANALYTICS_NOTE =
  "Analytics query; after Phase 4 it counts need rows, so add li.kind = 'item' before rerunning it for a Forever sample (research A12)."

// Sorted by file. Scripts and SQL scripts carry 'script' and plan '-'.
export const NEED_READERS: readonly NeedReader[] = [
  {
    file: 'app/(app)/loot-management/components/LootSettingsContent.tsx',
    dispositions: ['exclude'],
    plan: '03-07',
    note: 'officer classification editor lists items only',
  },
  {
    file: 'app/(app)/loot-management/components/PriorityListTab.tsx',
    dispositions: ['exclude'],
    plan: '03-07',
    note: 'officer priority editor lists items only',
  },
  {
    file: 'app/(app)/loot-submissions/components/LootSubmissionsContent.tsx',
    dispositions: ['label'],
    plan: '03-05',
    note: 'officer review renders rows through ItemLink, which falls back to NeedLabel',
  },
  {
    file: 'app/(app)/master-loot/_client.tsx',
    dispositions: ['label'],
    plan: '03-05',
    note: 'ids and counts; names through ItemLink',
  },
  {
    file: 'app/(app)/master-sheet/components/MasterSheetContent.tsx',
    dispositions: ['exclude', 'key'],
    plan: '03-10',
    note: 'items plus ranked needs only; identity-keyed receive skip',
  },
  {
    file: 'app/(app)/overview/components/DashboardContent.tsx',
    dispositions: ['key', 'label'],
    plan: '03-11',
    note: 'identity-keyed received skip; need awards shown with a null wowhead id',
  },
  {
    file: 'app/(app)/raid-tracking/_client.tsx',
    dispositions: ['exclude', 'label'],
    plan: '03-11',
    note: 'name matching on items only; need awards shown with a null wowhead id',
  },
  {
    file: 'app/(app)/raid-tracking/import/_client.tsx',
    dispositions: ['writer'],
    plan: '-',
    note: 'CSV item insert; column defaults give kind \'item\'; the database refuses any need-row write from a browser session (03-01)',
  },
  {
    file: 'app/api/addon/export-string/route.ts',
    dispositions: ['exclude'],
    plan: '03-06',
    note: 'import string flattens items only; need BLP and rankings skipped',
  },
  {
    file: 'app/api/addon/guild-data/route.ts',
    dispositions: ['exclude'],
    plan: '03-06',
    note: 'companion payload items only (wowhead_id key collision)',
  },
  {
    file: 'app/api/admin/analytics/route.ts',
    dispositions: ['agnostic'],
    plan: '-',
    note: 'counts loot_history rows by guild and date',
  },
  {
    file: 'app/api/admin/diagnose/route.ts',
    dispositions: ['agnostic'],
    plan: '-',
    note: 'counts live submission items per list',
  },
  {
    file: 'app/api/admin/sheet-import/route.ts',
    dispositions: ['exclude'],
    plan: '03-16',
    note: 'update ids come from an item-only read',
  },
  {
    file: 'app/api/bis-items/route.ts',
    dispositions: ['exclude'],
    plan: '03-07',
    note: 'BIS import maps by wowhead_id',
  },
  {
    file: 'app/api/bot/priority/route.ts',
    dispositions: ['exclude'],
    plan: '03-06',
    note: 'bot stays item-only until the Drop Desk (D-14)',
  },
  {
    file: 'app/api/character-gear/route.ts',
    dispositions: ['guard'],
    plan: '03-11',
    note: 'need awards skipped with one warning',
  },
  {
    file: 'app/api/characters/[id]/route.ts',
    dispositions: ['agnostic'],
    plan: '-',
    note: 'deletes a character\'s submission items by list id',
  },
  {
    file: 'app/api/discord/post-raid-summary/route.ts',
    dispositions: ['ok'],
    plan: '03-19',
    note: 'need award renders bold, no link',
    test: 'lib/__tests__/discord-raid-summary.test.ts',
  },
  {
    file: 'app/api/guild-count/route.ts',
    dispositions: ['agnostic'],
    plan: '-',
    note: 'head count of loot_history',
  },
  {
    file: 'app/api/guild-settings/route.ts',
    dispositions: ['agnostic'],
    plan: '-',
    note: 'calls recompute_blp_for_guild on a reset-anchor change; the SQL keys on loot_item_id (need rows proven in 03-15)',
  },
  {
    file: 'app/api/guilds/delete/route.ts',
    dispositions: ['agnostic'],
    plan: '-',
    note: 'calls delete_guild; need rows cascade like items',
  },
  {
    file: 'app/api/guilds/reset-season/route.ts',
    dispositions: ['agnostic'],
    plan: '-',
    note: 'calls reset_guild_season by guild',
  },
  {
    file: 'app/api/guilds/route.ts',
    dispositions: ['agnostic'],
    plan: '-',
    note: 'calls delete_guild; need rows cascade like items',
  },
  {
    file: 'app/api/landing-stats/route.ts',
    dispositions: ['agnostic'],
    plan: '-',
    note: 'head count of loot_history (a need award is an award)',
  },
  {
    file: 'app/api/loot-history/bulk/route.ts',
    dispositions: ['ok'],
    plan: '03-19',
    note: 'need award keyed on the need row; recompute by id',
    test: 'app/api/loot-history/bulk/__tests__/route.test.ts',
  },
  {
    file: 'app/api/loot-history/route.ts',
    dispositions: ['label'],
    plan: '03-11',
    note: 'null wowhead id for need awards',
  },
  {
    file: 'app/api/loot-items/officer-notes/route.ts',
    dispositions: ['agnostic'],
    plan: '-',
    note: 'reads notes by id; need rows carry none and the PATCH routes refuse them',
  },
  {
    file: 'app/api/loot-items/route.ts',
    dispositions: ['guard'],
    plan: '03-07',
    note: 'PATCH refuses need rows; GET reads items through fetchFilteredLootItems',
  },
  {
    file: 'app/api/loot-items/specs/route.ts',
    dispositions: ['guard'],
    plan: '03-07',
    note: 'refuses need rows',
  },
  {
    file: 'app/api/loot-list/bootstrap/route.ts',
    dispositions: ['ok'],
    plan: '03-18',
    note: 'items through fetchFilteredLootItems with no options (D-02); rankings by id',
    test: 'app/api/loot-list/bootstrap/__tests__/route.test.ts',
  },
  {
    file: 'app/api/loot-submissions/item-counts/route.ts',
    dispositions: ['ok'],
    plan: '03-17',
    note: 'counts by id',
    test: 'app/api/loot-submissions/item-counts/__tests__/route.test.ts',
  },
  {
    file: 'app/api/loot-submissions/remove-item/route.ts',
    dispositions: ['ok'],
    plan: '03-17',
    note: 'already_obtained on a need writes a need-keyed history row',
    test: 'app/api/loot-submissions/remove-item/__tests__/route.test.ts',
  },
  {
    file: 'app/api/loot-submissions/revert/route.ts',
    dispositions: ['ok'],
    plan: '03-17',
    note: 're-inserts by id',
    test: 'app/api/loot-submissions/revert/__tests__/route.test.ts',
  },
  {
    file: 'app/api/loot-submissions/review/route.ts',
    dispositions: ['ok'],
    plan: '03-17',
    note: 'snapshot uses the need\'s name',
    test: 'app/api/loot-submissions/review/__tests__/route.test.ts',
  },
  {
    file: 'app/api/loot-submissions/route.ts',
    dispositions: ['ok'],
    plan: '03-18',
    note: 'rankings by id',
    test: 'app/api/loot-submissions/__tests__/route.test.ts',
  },
  {
    file: 'app/api/loot-submissions/submit/route.ts',
    dispositions: ['branch', 'guard'],
    plan: '03-09',
    note: 'D-22 hold (isHeldNeedRanking); need rows out of bracket rules; need copy caps',
  },
  {
    file: 'app/api/master-sheet/visibility/route.ts',
    dispositions: ['ok'],
    plan: '03-17',
    note: 'rankings by id; earned-phase filter by tier',
    test: 'app/api/master-sheet/visibility/__tests__/route.test.ts',
  },
  {
    file: 'app/api/prio-list/route.ts',
    dispositions: ['ok'],
    plan: '03-18',
    note: 'a need-embedded priority is returned unchanged',
    test: 'app/api/prio-list/__tests__/route.test.ts',
  },
  {
    file: 'app/api/reserve-runs/[id]/awards/route.ts',
    dispositions: ['exclude'],
    plan: '03-08',
    note: 'award check reads items only',
  },
  {
    file: 'app/api/reserve-runs/[id]/route.ts',
    dispositions: ['exclude'],
    plan: '03-08',
    note: 'run items only',
  },
  {
    file: 'app/api/reserve-runs/items/route.ts',
    dispositions: ['exclude'],
    plan: '03-08',
    note: 'public item list',
  },
  {
    file: 'app/api/reserve-runs/join/[token]/route.ts',
    dispositions: ['exclude'],
    plan: '03-08',
    note: 'public join list and submit validation',
  },
  {
    file: 'app/api/user/delete-account/route.ts',
    dispositions: ['agnostic'],
    plan: '-',
    note: 'deletes loot_history by character',
  },
  {
    file: 'app/contexts/LootListContext.tsx',
    dispositions: ['ok'],
    plan: '03-15',
    note: 'saves rankings through save_submission_items; the picker offers items only (03-07) and the RPC\'s insert is held by enforce_need_ranking_hold, proven by the raider case (D-22)',
    test: 'app/services/__tests__/discovery-schema-pglite.test.ts',
  },
  {
    file: 'app/services/expansionSeeder.ts',
    dispositions: ['writer'],
    plan: '-',
    note: 'legacy insert payload golden-pinned; column defaults',
  },
  {
    file: 'companion/src/main/addon-format.ts',
    dispositions: ['consumer'],
    plan: '03-06',
    note: 'writes the addon item table keyed by String(item.wowhead_id), so a need row reaching it would collide on "null" (research D1); award and attendance uploads carry the addon\'s real wowhead ids',
    via: ['app/api/addon/guild-data/route.ts'],
  },
  {
    file: 'companion/src/main/api-client.ts',
    dispositions: ['consumer'],
    plan: '03-06',
    note: 'fetches and types the guild-data and export-string payloads (wowhead_id: number)',
    via: ['app/api/addon/guild-data/route.ts', 'app/api/addon/export-string/route.ts'],
  },
  {
    file: 'discord-bot/interactions.js',
    dispositions: ['consumer'],
    plan: '03-06',
    note: 'builds the Wowhead link from item_wowhead_id; the route answers items only until the Drop Desk (D-14)',
    via: ['app/api/bot/priority/route.ts'],
  },
  {
    file: 'discord-bot/lootlist-api.js',
    dispositions: ['consumer'],
    plan: '03-06',
    note: 'calls /api/bot/priority, and /api/bot/score, which returns no loot row',
    via: ['app/api/bot/priority/route.ts'],
  },
  {
    file: 'lib/addon/member-ranked-items.ts',
    dispositions: ['guard'],
    plan: '03-06',
    note: 'need rankings skipped with the scope',
  },
  {
    file: 'lib/discord-loot-announcements.ts',
    dispositions: ['ok'],
    plan: '03-19',
    note: 'need award renders bold, no link',
    test: 'lib/__tests__/discord-loot-announcements.test.ts',
  },
  {
    file: 'lib/loot-items-query.ts',
    dispositions: ['exclude'],
    plan: '03-07',
    note: 'includeNeeds off by default (D-02)',
  },
  {
    file: 'lib/loot/addon-award-insert.ts',
    dispositions: ['ok'],
    plan: '03-18',
    note: 'a null wowhead id never keys an addon award',
    test: 'lib/loot/__tests__/addon-award-insert.test.ts',
  },
  {
    file: 'lib/loot/guild-scoped-lookup.ts',
    dispositions: ['ok'],
    plan: '03-18',
    note: 'wowhead lookups never return a need; need ids resolve like item ids',
    test: 'lib/loot/__tests__/guild-scoped-lookup.test.ts',
  },
  {
    file: 'lib/loot/master-sheet-summary.ts',
    dispositions: ['exclude', 'key'],
    plan: '03-10',
    note: 'items plus ranked needs; identity-keyed award counts',
  },
  {
    file: 'lib/loot/tier-need-rows.ts',
    dispositions: ['branch'],
    plan: '03-10',
    note: 'the deliberate need-row reader',
  },
  {
    file: 'scripts/add-item-classification.sql',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.schema,
  },
  {
    file: 'scripts/add-loot-availability.sql',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.schema,
  },
  {
    file: 'scripts/add-loot-item-classes-rls.sql',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.schema,
  },
  {
    file: 'scripts/add-missing-items.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/add-missing-tbc-items.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/analytics/queries/week-4-review/01-activated-cohort.sql',
    dispositions: ['script'],
    plan: '-',
    note: ANALYTICS_NOTE,
  },
  {
    file: 'scripts/analytics/queries/wow-classic-loot-systems-2026/01-sample-definition.sql',
    dispositions: ['script'],
    plan: '-',
    note: ANALYTICS_NOTE,
  },
  {
    file: 'scripts/analytics/queries/wow-classic-loot-systems-2026/02-median-list-length.sql',
    dispositions: ['script'],
    plan: '-',
    note: ANALYTICS_NOTE,
  },
  {
    file: 'scripts/analytics/queries/wow-classic-loot-systems-2026/03-attendance-weighting.sql',
    dispositions: ['script'],
    plan: '-',
    note: ANALYTICS_NOTE,
  },
  {
    file: 'scripts/analytics/queries/wow-classic-loot-systems-2026/04-bad-luck-protection-usage.sql',
    dispositions: ['script'],
    plan: '-',
    note: ANALYTICS_NOTE,
  },
  {
    file: 'scripts/analytics/queries/wow-classic-loot-systems-2026/05-expansion-distribution.sql',
    dispositions: ['script'],
    plan: '-',
    note: ANALYTICS_NOTE,
  },
  {
    file: 'scripts/analytics/queries/wow-classic-loot-systems-2026/06-funnel-cohort-coverage.sql',
    dispositions: ['script'],
    plan: '-',
    note: ANALYTICS_NOTE,
  },
  {
    file: 'scripts/analytics/queries/wow-classic-loot-systems-2026/07-top-bracket-coverage.sql',
    dispositions: ['script'],
    plan: '-',
    note: ANALYTICS_NOTE,
  },
  {
    file: 'scripts/analytics/queries/wow-classic-loot-systems-2026/08-top-priority-bracket.sql',
    dispositions: ['script'],
    plan: '-',
    note: ANALYTICS_NOTE,
  },
  {
    file: 'scripts/apply-rls-via-supabase.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.diagnostics,
  },
  {
    file: 'scripts/backfill-team-event-routing.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.diagnostics,
  },
  {
    file: 'scripts/check-item-specs.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/check-items.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/check-missing-items.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/check-my-role.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.diagnostics,
  },
  {
    file: 'scripts/check-tbc-status.js',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/clean-and-reseed-all-raids.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.seeding,
  },
  {
    file: 'scripts/clean-duplicate-raids.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.seeding,
  },
  {
    file: 'scripts/consolidate-multi-boss-items.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/debug-fang.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/debug-loaded-specs.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/debug-seed.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/ensure-items-available.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/fix-missing-items.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/fix-tempest-keep.js',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/fix-token-classes.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/fix-weapon-types.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/link-loot-to-raids.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.seeding,
  },
  {
    file: 'scripts/migrate-add-classification.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/populate-item-types.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/populate-missing-types.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/populate-primary-stat.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/populate-token-classes.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/purge-test-characters.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.diagnostics,
  },
  {
    file: 'scripts/remove-classic-fresh.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.seeding,
  },
  {
    file: 'scripts/reseed-bwl.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.seeding,
  },
  {
    file: 'scripts/run-complete-tbc-migration.js',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.seeding,
  },
  {
    file: 'scripts/run-karazhan-migration.js',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.seeding,
  },
  {
    file: 'scripts/run-migration.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.seeding,
  },
  {
    file: 'scripts/seed-classic-raids.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.seeding,
  },
  {
    file: 'scripts/seed-test-data-multiuser.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.diagnostics,
  },
  {
    file: 'scripts/seed-test-data.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.diagnostics,
  },
  {
    file: 'scripts/setup-item-classification.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/setup-loot-availability.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/setup-loot-database.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/sync-naxx-tokens.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/test-rls-policy.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.diagnostics,
  },
  {
    file: 'scripts/update-all-item-classifications.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/update-item-classifications-from-sheet.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/update-tbc-item-classifications.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/update-tbc-year2-item-classifications.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/validate-item-classifications.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/verify-mop-migration.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/verify-unlimited-items.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'scripts/verify-updates.ts',
    dispositions: ['script'],
    plan: '-',
    note: SCRIPT_NOTES.catalog,
  },
  {
    file: 'utils/analytics/funnel.ts',
    dispositions: ['agnostic'],
    plan: '-',
    note: 'existence check by id',
  },
  {
    file: 'utils/blp/recompute.ts',
    dispositions: ['agnostic'],
    plan: '-',
    note: 'calls recompute_blp_for_item and recompute_blp_for_event with ids; the SQL keys on loot_item_id (need rows proven in 03-15)',
  },
  {
    file: 'utils/raid-events/link-unlinked-awards.ts',
    dispositions: ['agnostic'],
    plan: '-',
    note: 'links awards to raid events by id',
  },
]

// Positive markers: the source must contain one for each listed disposition.
// 'ok' (a cited test), 'writer' and 'script' (a note) and 'consumer' (a via)
// have no source marker.
export const DISPOSITION_MARKERS: Partial<Record<NeedDisposition, RegExp>> = {
  exclude:
    /\.eq\(\s*['"]kind['"]\s*,\s*['"]item['"]\s*\)|\.eq\(\s*['"]list_mode['"]\s*,\s*['"]known['"]\s*\)|isNeedRow\(/,
  guard: /isNeedRow\(|noteNeedSkipped\(|isHeldNeedRanking\(/,
  key: /itemIdentityKey\(/,
  branch: /isNeedRow\(|\.eq\(\s*['"](loot_items\.)?kind['"]\s*,\s*['"]need['"]\s*\)/,
  label: /wowheadIdForDisplay\(|<ItemLink\b|<NeedLabel\b/,
}
// Negative marker for 'agnostic': a reader that names an item column can tell
// a need row from an item, so it must be 'exclude', 'branch' or 'label'.
export const AGNOSTIC_FORBIDDEN = /wowhead_id|wowheadId|boss_name|item_slot|allocation_cost/
// A SQL function body is a reader when it names one of the tables.
const SQL_TABLE_PATTERN = /\b(loot_items|loot_submission_items|loot_history)\b/i
// 'ok' fixtures: a TypeScript test builds a row with kind: 'need'; the PGlite
// test seeds the string 'need' into SQL.
const NEED_FIXTURE_TS = /kind: 'need'/
const NEED_FIXTURE_SQL = /'need'/
const SQL_BODY_NEED = /'need'/
const MIGRATIONS_DIR = 'supabase/migrations'

export interface SqlFunctionReader {
  name: string
  dispositions: readonly NeedDisposition[]
  /** Timestamp of the migration holding the latest definition. */
  definedIn: string
  note: string
  test?: string
}

const PGLITE = 'app/services/__tests__/discovery-schema-pglite.test.ts'

// Every SQL function whose latest definition names a table, sorted by name.
// The D-27 lock (enforce_loot_item_need_delete_lock) names none of them today.
export const SQL_FUNCTION_READERS: readonly SqlFunctionReader[] = [
  {
    name: 'delete_guild',
    dispositions: ['agnostic'],
    definedIn: '20261004020000',
    note: 'deletes a guild\'s rows; need rows cascade like items',
  },
  {
    name: 'enforce_loot_history_guild_refs',
    dispositions: ['ok'],
    definedIn: '20260929180000',
    note: 'resolves a need row\'s tier and guild like an item (need-keyed award insert in 03-15)',
    test: PGLITE,
  },
  {
    name: 'enforce_loot_item_need_pin_refs',
    dispositions: ['branch'],
    definedIn: '20261020120000',
    note: 'pin integrity (03-01, 03-15)',
    test: PGLITE,
  },
  {
    name: 'enforce_loot_item_need_rules',
    dispositions: ['branch'],
    definedIn: '20261020120000',
    note: 'D-12 and D-17: need rows come only from the service role and sit only in Forever Discovery tiers; listed because its body names loot_items in error text (03-01, 03-15)',
    test: PGLITE,
  },
  {
    name: 'enforce_loot_submission_item_rules',
    dispositions: ['agnostic'],
    definedIn: '20260930000000',
    note: 'list status rules by parent list',
  },
  {
    name: 'enforce_need_ranking_hold',
    dispositions: ['guard'],
    definedIn: '20261020120000',
    note: 'D-22 hold on rankings from browser sessions, dropped in Phase 4',
    test: PGLITE,
  },
  {
    name: 'enforce_raid_tier_list_mode_rules',
    dispositions: ['branch'],
    definedIn: '20261020120000',
    note: 'D-17 and the D-03 backstop',
    test: PGLITE,
  },
  {
    name: 'enforce_reserve_award_refs',
    dispositions: ['agnostic'],
    definedIn: '20261003230000',
    note: 'reserve item reads exclude needs (03-08)',
  },
  {
    name: 'get_guild_submissions',
    dispositions: ['agnostic'],
    definedIn: '20260101000000',
    note: 'item_count counts a list\'s live rows',
  },
  {
    name: 'increment_blp',
    dispositions: ['agnostic'],
    definedIn: '20260101000000',
    note: 'legacy incremental counter keyed on loot_item_id; no app caller',
  },
  {
    name: 'increment_blp_bulk',
    dispositions: ['agnostic'],
    definedIn: '20260101000000',
    note: 'same',
  },
  {
    name: 'recompute_blp_for_event',
    dispositions: ['ok'],
    definedIn: '20260609000001',
    note: 'DISC-07 ordering case',
    test: PGLITE,
  },
  {
    name: 'recompute_blp_for_guild',
    dispositions: ['ok'],
    definedIn: '20260721000001',
    note: 'DISC-07 ordering case',
    test: PGLITE,
  },
  {
    name: 'recompute_blp_for_item',
    dispositions: ['ok'],
    definedIn: '20260721000001',
    note: 'DISC-07 adjacency, ordering and empty cases',
    test: PGLITE,
  },
  {
    name: 'reset_guild_season',
    dispositions: ['agnostic'],
    definedIn: '20260721000002',
    note: 'resets a guild\'s history by guild',
  },
  {
    name: 'save_submission_items',
    dispositions: ['ok'],
    definedIn: '20260727000001',
    note: 'body unchanged; its insert hits enforce_need_ranking_hold (D-22), proven by the raider RPC case in 03-15',
    test: PGLITE,
  },
]

/** Recursive walk of one root under baseDir; paths come back repo-relative with forward slashes. */
function walkSourceFiles(baseDir: string, root: string, extension: RegExp): string[] {
  const start = path.join(baseDir, root)
  if (!fs.existsSync(start)) return []
  const found: string[] = []
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) visit(full)
      } else if (
        entry.isFile() &&
        extension.test(entry.name) &&
        !entry.name.endsWith('.d.ts') &&
        !TEST_FILE.test(entry.name)
      ) {
        found.push(path.relative(baseDir, full).split(path.sep).join('/'))
      }
    }
  }
  visit(start)
  return found
}

/** Every file under the roots that reads the tables or calls an inventoried RPC, plus matching scripts/**\/*.sql. */
export function findReaderFiles(roots: readonly string[], baseDir: string = REPO_ROOT): string[] {
  const found: string[] = []
  for (const root of roots) {
    for (const file of walkSourceFiles(baseDir, root, SOURCE_EXTENSION)) {
      const source = fs.readFileSync(path.join(baseDir, file), 'utf8')
      if (READER_PATTERN.test(source) || RPC_CALL_PATTERN.test(source)) found.push(file)
    }
    if (root === 'scripts') {
      for (const file of walkSourceFiles(baseDir, root, SQL_EXTENSION)) {
        if (SQL_SCRIPT_PATTERN.test(fs.readFileSync(path.join(baseDir, file), 'utf8'))) {
          found.push(file)
        }
      }
    }
  }
  return found.sort()
}

/** Files that consume the addon and bot payloads (wowhead ids, guild-data, export-string, bot priority). */
export function findConsumerFiles(roots: readonly string[], baseDir: string = REPO_ROOT): string[] {
  const found: string[] = []
  for (const root of roots) {
    for (const file of walkSourceFiles(baseDir, root, SOURCE_EXTENSION)) {
      if (CONSUMER_PATTERN.test(fs.readFileSync(path.join(baseDir, file), 'utf8'))) {
        found.push(file)
      }
    }
  }
  return found.sort()
}

/** missing: scanned but unlisted. stale: listed but no longer scanned (gone, or no longer matching). */
export function findInventoryGaps(
  found: readonly string[],
  inventory: ReadonlyArray<{ file: string }>,
): { missing: string[]; stale: string[] } {
  const listed = new Set(inventory.map((entry) => entry.file))
  const scanned = new Set(found)
  return {
    missing: [...scanned].filter((file) => !listed.has(file)).sort(),
    stale: [...listed].filter((file) => !scanned.has(file)).sort(),
  }
}

type MarkerEntry = { file: string; dispositions: readonly NeedDisposition[] }

/** Reports each disposition whose source marker is absent, and each 'agnostic' source that names an item column. */
export function findMissingMarkers(
  entries: readonly MarkerEntry[],
  readSource: (file: string) => string,
): string[] {
  const problems: string[] = []
  for (const entry of entries) {
    const source = readSource(entry.file)
    for (const disposition of entry.dispositions) {
      const marker = DISPOSITION_MARKERS[disposition]
      if (marker && !marker.test(source)) {
        problems.push(`${entry.file}: '${disposition}' but the source has no ${disposition} marker`)
      }
      if (disposition === 'agnostic') {
        const named = AGNOSTIC_FORBIDDEN.exec(source)
        if (named) problems.push(`${entry.file}: 'agnostic' but the source names ${named[0]}`)
      }
    }
  }
  return problems
}

type CitableEntry = {
  file?: string
  name?: string
  dispositions: readonly NeedDisposition[]
  test?: string
}

/**
 * Reports each entry that needs a test and has none, and each cited test that
 * is missing or holds no need fixture. `needsTest` names the dispositions that
 * must cite one: 'ok' for code, 'ok', 'guard' and 'branch' for SQL functions.
 */
export function findBadCitations(
  entries: readonly CitableEntry[],
  readFile: (file: string) => string,
  exists: (file: string) => boolean,
  needsTest: readonly NeedDisposition[] = ['ok'],
): string[] {
  const problems: string[] = []
  for (const entry of entries) {
    const label = entry.file ?? entry.name ?? '(unnamed)'
    const required = entry.dispositions.some((disposition) => needsTest.includes(disposition))
    if (entry.test === undefined) {
      if (required) problems.push(`${label}: needs a test citation`)
      continue
    }
    if (!exists(entry.test)) {
      problems.push(`${label}: cited test ${entry.test} does not exist`)
      continue
    }
    const fixture = entry.test.includes('-pglite.') ? NEED_FIXTURE_SQL : NEED_FIXTURE_TS
    if (!fixture.test(readFile(entry.test))) {
      problems.push(`${label}: cited test ${entry.test} holds no need fixture`)
    }
  }
  return problems
}

/** Every 'consumer' entry's via files must be inventory entries carrying 'exclude'. */
export function findBadVia(
  entries: ReadonlyArray<{
    file: string
    dispositions: readonly NeedDisposition[]
    via?: readonly string[]
  }>,
  inventory: ReadonlyArray<{ file: string; dispositions: readonly NeedDisposition[] }>,
): string[] {
  const problems: string[] = []
  for (const entry of entries) {
    if (!entry.dispositions.includes('consumer')) continue
    const via = entry.via ?? []
    if (via.length === 0) problems.push(`${entry.file}: 'consumer' has no via`)
    for (const route of via) {
      const listed = inventory.find((candidate) => candidate.file === route)
      if (!listed) problems.push(`${entry.file}: via ${route} is not a NEED_READERS entry`)
      else if (!listed.dispositions.includes('exclude')) {
        problems.push(`${entry.file}: via ${route} is not an 'exclude' entry`)
      }
    }
  }
  return problems
}

const SQL_CREATE_FUNCTION =
  /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:"?public"?\.)?"?([A-Za-z_][A-Za-z0-9_]*)"?\s*\(/gi
const SQL_DROP_FUNCTION =
  /DROP\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?(?:"?public"?\.)?"?([A-Za-z_][A-Za-z0-9_]*)"?\s*\(/gi

/**
 * Functions whose latest definition names one of the three tables. Files are
 * applied in name order; a later CREATE replaces an earlier body, and a DROP
 * with no re-create after it removes the function. Bodies are dollar-quoted
 * with any tag.
 */
export function findSqlFunctionReaders(
  files: ReadonlyArray<{ name: string; sql: string }>,
): Array<{ name: string; definedIn: string; body: string }> {
  const latest = new Map<string, { definedIn: string; body: string }>()
  for (const file of [...files].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
    const definedIn = file.name.split('_')[0]
    const events: Array<{ index: number; end: number; kind: 'create' | 'drop'; fn: string; body: string }> = []
    for (const match of file.sql.matchAll(SQL_CREATE_FUNCTION)) {
      const headerEnd = match.index + match[0].length
      const open = /\$([A-Za-z_]*)\$/.exec(file.sql.slice(headerEnd))
      let body = ''
      let end = headerEnd
      if (open && !file.sql.slice(headerEnd, headerEnd + open.index).includes(';')) {
        const bodyStart = headerEnd + open.index + open[0].length
        const close = file.sql.indexOf(open[0], bodyStart)
        if (close !== -1) {
          body = file.sql.slice(bodyStart, close)
          end = close + open[0].length
        }
      }
      events.push({ index: match.index, end, kind: 'create', fn: match[1], body })
    }
    for (const match of file.sql.matchAll(SQL_DROP_FUNCTION)) {
      events.push({ index: match.index, end: match.index + match[0].length, kind: 'drop', fn: match[1], body: '' })
    }
    events.sort((a, b) => a.index - b.index)
    let cursor = 0
    for (const event of events) {
      // An event inside an earlier function body is body text, not a statement.
      if (event.index < cursor) continue
      cursor = event.end
      if (event.kind === 'create') latest.set(event.fn, { definedIn, body: event.body })
      else latest.delete(event.fn)
    }
  }
  return [...latest.entries()]
    .filter(([, definition]) => SQL_TABLE_PATTERN.test(definition.body))
    .map(([name, definition]) => ({ name, ...definition }))
    .sort((a, b) => (a.name < b.name ? -1 : 1))
}

const codeReaderFiles = findReaderFiles(CODE_ROOTS)
const scriptReaderFiles = findReaderFiles(SCRIPT_ROOTS)
const scriptCodeFiles = scriptReaderFiles.filter((file) => !file.endsWith('.sql'))
const sqlScriptFiles = scriptReaderFiles.filter((file) => file.endsWith('.sql'))
const consumerFiles = findConsumerFiles(CONSUMER_ROOTS)

describe('need reader inventory: files', () => {
  it(`finds at least ${MIN_READER_FILES} readers in app, lib, domain, utils, companion and discord-bot`, () => {
    expect(codeReaderFiles.length).toBeGreaterThanOrEqual(MIN_READER_FILES)
  })

  it('finds the RPC callers the table pattern misses', () => {
    expect(codeReaderFiles).toContain('app/contexts/LootListContext.tsx')
    expect(codeReaderFiles).toContain('utils/blp/recompute.ts')
    expect(codeReaderFiles).toContain('app/api/guilds/reset-season/route.ts')
  })

  it(`finds at least ${MIN_SCRIPT_READER_FILES} script readers and ${MIN_SQL_SCRIPT_FILES} SQL scripts`, () => {
    expect(scriptCodeFiles.length).toBeGreaterThanOrEqual(MIN_SCRIPT_READER_FILES)
    expect(sqlScriptFiles.length).toBeGreaterThanOrEqual(MIN_SQL_SCRIPT_FILES)
  })

  it(`finds at least ${MIN_CONSUMER_FILES} payload consumers, one under each of companion and discord-bot`, () => {
    expect(consumerFiles.length).toBeGreaterThanOrEqual(MIN_CONSUMER_FILES)
    expect(consumerFiles.some((file) => file.startsWith('companion/'))).toBe(true)
    expect(consumerFiles.some((file) => file.startsWith('discord-bot/'))).toBe(true)
  })

  it('never scans build output, node_modules or test files', () => {
    const scanned = [...codeReaderFiles, ...scriptReaderFiles, ...consumerFiles]
    const offenders = scanned.filter(
      (file) =>
        /(^|\/)(node_modules|__tests__|out|release|dist|build|\.next)\//.test(file) ||
        TEST_FILE.test(file) ||
        file.endsWith('.d.ts'),
    )
    expect(offenders).toEqual([])
  })

  it('lists every reader and consumer, and names only files the scan still finds', () => {
    const found = [...new Set([...codeReaderFiles, ...scriptReaderFiles, ...consumerFiles])]
    const { missing, stale } = findInventoryGaps(found, NEED_READERS)
    expect(
      missing,
      `readers missing from NEED_READERS (add each with a need disposition):\n${missing.join('\n')}`,
    ).toEqual([])
    expect(
      stale,
      `NEED_READERS entries that no longer exist or no longer match their pattern:\n${stale.join('\n')}`,
    ).toEqual([])
  })

  it('lists every payload consumer, and every consumer entry still matches the consumer pattern', () => {
    const consumerEntries = NEED_READERS.filter((entry) => entry.dispositions.includes('consumer'))
    const { missing, stale } = findInventoryGaps(consumerFiles, consumerEntries)
    expect(missing, `consumers missing a 'consumer' entry:\n${missing.join('\n')}`).toEqual([])
    expect(stale, `stale 'consumer' entries:\n${stale.join('\n')}`).toEqual([])
  })

  it('keeps NEED_READERS sorted by file with no duplicates', () => {
    const files = NEED_READERS.map((entry) => entry.file)
    expect(files).toEqual([...files].sort())
    expect(new Set(files).size).toBe(files.length)
  })
})

describe('need reader inventory: entry shape', () => {
  it('gives every entry a disposition, a plan and a note', () => {
    const bad = NEED_READERS.filter(
      (entry) =>
        entry.dispositions.length === 0 ||
        entry.plan.trim() === '' ||
        entry.note.trim() === '',
    ).map((entry) => entry.file)
    expect(bad).toEqual([])
  })

  it("gives 'script' to every scripts/ entry and to no other file", () => {
    const bad = NEED_READERS.filter(
      (entry) => entry.file.startsWith('scripts/') !== entry.dispositions.includes('script'),
    ).map((entry) => entry.file)
    expect(bad).toEqual([])
  })

  it("gives 'consumer' only to companion and discord-bot files, each with a non-empty via", () => {
    const bad = NEED_READERS.filter((entry) => {
      const isConsumer = entry.dispositions.includes('consumer')
      const underConsumerRoot = CONSUMER_ROOTS.some((root) => entry.file.startsWith(`${root}/`))
      if (isConsumer !== underConsumerRoot) return true
      return isConsumer && (entry.via ?? []).length === 0
    }).map((entry) => entry.file)
    expect(bad).toEqual([])
  })
})

const readRepoFile = (file: string) => fs.readFileSync(path.join(REPO_ROOT, file), 'utf8')
const repoFileExists = (file: string) => fs.existsSync(path.join(REPO_ROOT, file))
const sqlFunctions = findSqlFunctionReaders(
  fs
    .readdirSync(path.join(REPO_ROOT, MIGRATIONS_DIR))
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => ({ name, sql: readRepoFile(`${MIGRATIONS_DIR}/${name}`) })),
)
const sqlFunctionByName = new Map(sqlFunctions.map((fn) => [fn.name, fn]))
const codeEntries = NEED_READERS.filter((entry) => !entry.file.endsWith('.sql'))

describe('need reader inventory: dispositions are checked in the source', () => {
  it('finds each disposition marker in the source (agnostic sources name no item column)', () => {
    expect(findMissingMarkers(codeEntries, readRepoFile)).toEqual([])
  })

  it('makes every ok entry cite an existing test that holds a need fixture', () => {
    expect(findBadCitations(NEED_READERS, readRepoFile, repoFileExists)).toEqual([])
  })

  it('ties every payload consumer to an item-only route', () => {
    expect(findBadVia(NEED_READERS, NEED_READERS)).toEqual([])
  })
})

describe('need reader inventory: SQL functions', () => {
  it(`finds at least ${MIN_SQL_FUNCTION_READERS} functions whose latest definition names a table`, () => {
    expect(sqlFunctions.length).toBeGreaterThanOrEqual(MIN_SQL_FUNCTION_READERS)
    for (const name of [
      'save_submission_items',
      'reset_guild_season',
      'delete_guild',
      'get_guild_submissions',
      'recompute_blp_for_item',
      'recompute_blp_for_event',
      'recompute_blp_for_guild',
    ]) {
      expect(sqlFunctionByName.has(name), name).toBe(true)
    }
  })

  it('lists every such function, and only functions the scan still finds', () => {
    const { missing, stale } = findInventoryGaps(
      sqlFunctions.map((fn) => fn.name),
      SQL_FUNCTION_READERS.map((fn) => ({ file: fn.name })),
    )
    expect(missing, `SQL functions missing from SQL_FUNCTION_READERS:\n${missing.join('\n')}`).toEqual([])
    expect(stale, `stale SQL_FUNCTION_READERS entries:\n${stale.join('\n')}`).toEqual([])
  })

  it('keeps SQL_FUNCTION_READERS sorted by name with a note on every entry', () => {
    const names = SQL_FUNCTION_READERS.map((fn) => fn.name)
    expect(names).toEqual([...names].sort())
    expect(new Set(names).size).toBe(names.length)
    expect(
      SQL_FUNCTION_READERS.filter((fn) => fn.dispositions.length === 0 || fn.note.trim() === ''),
    ).toEqual([])
  })

  it('records the migration that holds each latest definition, so a redefinition forces a re-review', () => {
    const wrong = SQL_FUNCTION_READERS.filter(
      (fn) => sqlFunctionByName.get(fn.name)?.definedIn !== fn.definedIn,
    ).map((fn) => `${fn.name}: listed ${fn.definedIn}, latest ${sqlFunctionByName.get(fn.name)?.definedIn}`)
    expect(wrong).toEqual([])
  })

  it("keeps 'agnostic' bodies free of item columns", () => {
    const bad = SQL_FUNCTION_READERS.filter(
      (fn) =>
        fn.dispositions.includes('agnostic') &&
        AGNOSTIC_FORBIDDEN.test(sqlFunctionByName.get(fn.name)?.body ?? ''),
    ).map((fn) => fn.name)
    expect(bad).toEqual([])
  })

  it("makes 'ok', 'guard' and 'branch' functions cite a test, and 'guard' and 'branch' bodies name 'need'", () => {
    expect(
      findBadCitations(SQL_FUNCTION_READERS, readRepoFile, repoFileExists, ['ok', 'guard', 'branch']),
    ).toEqual([])
    const bad = SQL_FUNCTION_READERS.filter(
      (fn) =>
        (fn.dispositions.includes('guard') || fn.dispositions.includes('branch')) &&
        !SQL_BODY_NEED.test(sqlFunctionByName.get(fn.name)?.body ?? ''),
    ).map((fn) => fn.name)
    expect(bad).toEqual([])
  })

  it('inventories every function a scanned .rpc call can reach', () => {
    const listed = new Set(SQL_FUNCTION_READERS.map((fn) => fn.name))
    expect(RPC_NAMES.filter((name) => !listed.has(name))).toEqual([])
  })
})

describe('need reader inventory: synthetic self-checks (the scan has teeth)', () => {
  it('1: reports an unlisted reader as missing', () => {
    const found = ['app/api/synthetic-reader/route.ts', ...NEED_READERS.map((entry) => entry.file)]
    expect(findInventoryGaps(found, NEED_READERS).missing).toEqual(['app/api/synthetic-reader/route.ts'])
  })

  it('1b: reports an entry that no longer matches as stale', () => {
    const found = NEED_READERS.map((entry) => entry.file).slice(1)
    expect(findInventoryGaps(found, NEED_READERS).stale).toEqual([NEED_READERS[0].file])
  })

  it("2: reports an 'exclude' entry with no marker, and passes one with an item kind filter", () => {
    const entry = { file: 'synthetic.ts', dispositions: ['exclude'] as const }
    const plain = () => "await supabase.from('loot_items').select('id')"
    const filtered = () => "await supabase.from('loot_items').select('id').eq('kind', 'item')"
    expect(findMissingMarkers([entry], plain)).toHaveLength(1)
    expect(findMissingMarkers([entry], filtered)).toEqual([])
  })

  it('3: matches embeds and not prose', () => {
    expect(READER_PATTERN.test('loot_item:loot_items(wowhead_id)')).toBe(true)
    expect(READER_PATTERN.test('loot_items!inner(kind)')).toBe(true)
    expect(READER_PATTERN.test("supabase.from('loot_history')")).toBe(true)
    expect(READER_PATTERN.test('// the loot_items table holds every row')).toBe(false)
  })

  it("4: reports an 'ok' entry citing a missing test, or a test with no need fixture", () => {
    const missing = { file: 'a.ts', dispositions: ['ok'] as const, test: 'gone.test.ts' }
    const noFixture = { file: 'b.ts', dispositions: ['ok'] as const, test: 'plain.test.ts' }
    const uncited = { file: 'c.ts', dispositions: ['ok'] as const }
    const good = { file: 'd.ts', dispositions: ['ok'] as const, test: 'need.test.ts' }
    const files: Record<string, string> = {
      'plain.test.ts': "const row = { kind: 'item' }",
      'need.test.ts': "const row = { kind: 'need' }",
    }
    const problems = findBadCitations(
      [missing, noFixture, uncited, good],
      (file) => files[file],
      (file) => file in files,
    )
    expect(problems).toHaveLength(3)
    expect(problems.join('\n')).toContain('does not exist')
    expect(problems.join('\n')).toContain('holds no need fixture')
    expect(problems.join('\n')).toContain('needs a test citation')
  })

  it("5: reports an 'agnostic' entry whose source names wowhead_id", () => {
    const entry = { file: 'synthetic.ts', dispositions: ['agnostic'] as const }
    expect(findMissingMarkers([entry], () => "select('id, wowhead_id')")).toHaveLength(1)
    expect(findMissingMarkers([entry], () => "select('id')")).toEqual([])
  })

  it('6: lists a function by its latest body, drops one a later migration drops', () => {
    const create = (fn: string, table: string, tag = '$$') =>
      `CREATE OR REPLACE FUNCTION "public"."${fn}"() RETURNS void\n    LANGUAGE plpgsql\n    AS ${tag}\nBEGIN\n  DELETE FROM public.${table};\nEND;\n${tag};\n`
    const named = (files: Array<{ name: string; sql: string }>) =>
      findSqlFunctionReaders(files).map((fn) => fn.name)

    expect(named([{ name: '1_a.sql', sql: create('synthetic_fn', 'loot_history') }])).toEqual(['synthetic_fn'])
    // Re-created without the tables: leaves the list.
    expect(
      named([
        { name: '1_a.sql', sql: create('synthetic_fn', 'loot_history') },
        { name: '2_b.sql', sql: create('synthetic_fn', 'raid_events') },
      ]),
    ).toEqual([])
    // Created, then dropped: not listed.
    expect(
      named([
        { name: '1_a.sql', sql: create('synthetic_fn', 'loot_history') },
        { name: '2_b.sql', sql: 'DROP FUNCTION IF EXISTS "public"."synthetic_fn"();\n' },
      ]),
    ).toEqual([])
    // Dropped, then re-created: listed again. Any dollar tag works.
    expect(
      named([
        { name: '1_a.sql', sql: create('synthetic_fn', 'loot_history') },
        { name: '2_b.sql', sql: 'DROP FUNCTION "public"."synthetic_fn"();\n' },
        { name: '3_c.sql', sql: create('synthetic_fn', 'loot_items', '$fn$') },
      ]),
    ).toEqual(['synthetic_fn'])
  })

  it("7: reports a consumer whose via names an 'ok'-only entry or an unlisted file", () => {
    const okOnly = {
      file: 'companion/src/synthetic.ts',
      dispositions: ['consumer'] as const,
      via: ['app/api/loot-submissions/route.ts'],
    }
    const absent = {
      file: 'discord-bot/synthetic.js',
      dispositions: ['consumer'] as const,
      via: ['app/api/synthetic-missing/route.ts'],
    }
    const good = {
      file: 'discord-bot/synthetic-ok.js',
      dispositions: ['consumer'] as const,
      via: ['app/api/bot/priority/route.ts'],
    }
    expect(findBadVia([okOnly], NEED_READERS)).toHaveLength(1)
    expect(findBadVia([absent], NEED_READERS)).toHaveLength(1)
    expect(findBadVia([good], NEED_READERS)).toEqual([])
  })

  it('8: finds a synthetic companion consumer and skips build output, node_modules and test files', () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'need-inventory-'))
    try {
      const source = "const key = String(item.wowhead_id)\n"
      for (const file of [
        'companion/src/synthetic.ts',
        'companion/out/synthetic.ts',
        'companion/release/synthetic.ts',
        'companion/node_modules/pkg/synthetic.ts',
        'companion/src/synthetic.test.mjs',
        'companion/src/synthetic.d.ts',
      ]) {
        fs.mkdirSync(path.dirname(path.join(base, file)), { recursive: true })
        fs.writeFileSync(path.join(base, file), source)
      }
      expect(findConsumerFiles(['companion'], base)).toEqual(['companion/src/synthetic.ts'])
      const found = findConsumerFiles(['companion'], base)
      expect(findInventoryGaps(found, NEED_READERS).missing).toEqual(['companion/src/synthetic.ts'])
    } finally {
      fs.rmSync(base, { recursive: true, force: true })
    }
  })
})
