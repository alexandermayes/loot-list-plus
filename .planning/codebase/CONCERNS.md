# Codebase Concerns

**Analysis Date:** 2026-08-27

## Tech Debt

**Duplicated Query Filter Logic in Loot History API:**
- Issue: `app/api/loot-history/route.ts` (lines 93-189 and 203-230) duplicates the entire filter-building logic for both primary and fallback queries
- Files: `app/api/loot-history/route.ts`
- Impact: Adding a new filter parameter requires changes in two places. Missing either location causes filters to silently drop when the fallback path is triggered, breaking user expectations
- Fix approach: Extract filter-building logic into a shared function that both queries use, or unify the primary/fallback paths into a single robust query

**Oversized Component State in Raid Tracking:**
- Issue: `app/(app)/raid-tracking/_client.tsx` (2788 lines) manages 30+ useState hooks across attendance tracking, loot assignments, import modals, and modal states in a single component
- Files: `app/(app)/raid-tracking/_client.tsx` (lines 118-173)
- Impact: Difficult to maintain state mutations, high risk of state synchronization bugs, difficult to test individual concerns, poor performance due to global re-renders
- Fix approach: Break into smaller sub-components with focused state; consider extracting modal state to separate contexts

**Oversized Context Providers:**
- Issue: `app/contexts/LootListContext.tsx` (1251 lines) and `app/contexts/GuildContext.tsx` (1011 lines) bundle data fetching, state management, and complex business logic in single contexts
- Files: `app/contexts/LootListContext.tsx`, `app/contexts/GuildContext.tsx`
- Impact: Any change to context triggers re-renders across entire app; difficult to reason about dependencies; hard to test in isolation
- Fix approach: Split data fetching logic from state management; consider using a lighter state management approach (Zustand) or further modularization

**Large Static Data Files:**
- Issue: `lib/help-content.ts` (1488 lines) and `lib/updates-data.ts` (1396 lines) contain hardcoded data that should be loaded from a database or CMS
- Files: `lib/help-content.ts`, `lib/updates-data.ts`
- Impact: Bundle size bloat; difficult to update without code deployment; not searchable or indexable dynamically
- Fix approach: Migrate to database tables or a headless CMS; load on-demand rather than bundled

**Auto-Generated Database Types File:**
- Issue: `lib/database.types.ts` (78KB, 2526 lines) is auto-generated from Supabase schema and needs manual re-generation via `npm run gen:types`
- Files: `lib/database.types.ts`
- Impact: Schema drift if types aren't regenerated; large bundled file; not tracked properly in CI (Dependabot can't help)
- Fix approach: Automate type generation in CI; consider splitting types file into logical chunks; verify schema changes in pre-commit hooks

## Known Issues

**Loot History Phase Filter Unreliable:**
- Symptoms: Filtering by content phase (raid_tiers.phase) may return inconsistent results; `loot_history.expansion_id` is unreliable for phase grouping
- Files: `app/api/loot-history/route.ts` (lines 131-148), client usage in loot history queries
- Trigger: User applies phase filter on loot history view
- Workaround: Filter both API queries on phase and expansion_id separately; client-side re-filtering if needed

**Companion App is Unshipped Scaffolding:**
- Symptoms: Companion Electron app builds and runs (since #223) but has never been released or distributed
- Files: `companion/` directory (entire subtree)
- Current state: Builds on Node 22 via CI; excluded from root tsconfig; uses own lockfile
- Impact: Maintains technical debt; takes CI resources; not customers aren't using it; represents incomplete feature
- Recommendation: Either complete and release, or remove entirely. If completing, ensure it's properly tested and integrated with release pipeline

**CI Private Registry Configuration (.npmrc) Requires Manual Setup:**
- Symptoms: Private npm packages fail with E401 (Unauthorized) during CI/Dependabot runs
- Files: `.npmrc` (not committed), `package.json` preinstall script
- Current mitigation: `package.json` preinstall script writes `.npmrc` from `NPM_RC` environment variable; requires separate Dependabot secrets configuration
- Recommendation: Verify Dependabot has separate `NPM_RC` secret configured; Node is installed at `~/.local/node20/bin`, verify it's on PATH in CI

**Migration-Only PRs Don't Pass CodeQL Checks:**
- Symptoms: SQL-only diffs (schema migrations without code changes) fail required CodeQL checks; PRs stall in `action_required` state silently
- Files: Any migration-only PR (e.g., `supabase/migrations/*.sql`)
- Current mitigation: Requires `--admin` merge flag to bypass checks
- Recommendation: Configure GitHub branch protection to skip CodeQL for migration-only paths, or require manual review instead of automation

## Missing Error Handling

**Async Operations Without Proper Error Boundaries:**
- Issue: Codebase has 1842 `await` statements but only ~64 `.catch()` handlers and 519 `console.error()` calls
- Files: Widespread across `app/`, `lib/`, `domain/` directories
- Impact: Unhandled promise rejections silently fail; users see no feedback; errors not tracked in PostHog/Sentry; hard to debug production issues
- Recommendation: Implement error boundary components around data-fetching sections; add try/catch wrappers in useEffect hooks; centralize error tracking

**Missing Error Boundary Components:**
- Issue: React error boundaries not found in component tree; client-side JavaScript errors crash entire pages
- Impact: Users see blank page instead of graceful error state
- Fix approach: Add ErrorBoundary wrapper to main layout and critical sections

## Performance Bottlenecks

**Large Component Re-Renders:**
- Problem: Components like `LootListContent.tsx` (2533 lines) and `DashboardContent.tsx` (2477 lines) re-render entire tree on any state change
- Files: `app/(app)/loot-list/components/LootListContent.tsx`, `app/(app)/overview/components/DashboardContent.tsx`, others
- Cause: State lifted to component level rather than isolated to needed sub-components; missing React.memo on child components
- Improvement path: Break into smaller memoized sub-components; use callback refs to isolate state changes

**Heavy Context Providers:**
- Problem: `LootListContext` and `GuildContext` cause app-wide re-renders on any data change
- Files: `app/contexts/LootListContext.tsx`, `app/contexts/GuildContext.tsx`
- Cause: Single context for both data and derived state; consumers don't re-render selectively
- Improvement path: Split into separate contexts (data vs UI state); use useShallow or manual memo checks to prevent unnecessary re-renders

**Database Queries Without Pagination Optimization:**
- Problem: Some API routes don't optimize for large datasets (e.g., item lookups, character searches)
- Files: `app/api/loot-items/route.ts`, `lib/loot-items-query.ts`, and various ad-hoc queries
- Improvement path: Add cursor-based pagination; index frequently-searched columns; consider caching hot queries

## Fragile Areas

**Phase/Expansion Logic:**
- Files: `app/api/loot-history/route.ts`, `domain/expansion/phase-groups.ts`, throughout loot-list views
- Why fragile: Multiple overlapping ways to reference phases (raw number, phase group, expansion, raid tier); filters can diverge (primary vs fallback query)
- Safe modification: Add integration tests for each filter combination; verify both primary and fallback paths handle all filters identically
- Test coverage: Minimal testing of filter combinations; edge cases around phase transitions untested

**Loot Scoring Engine:**
- Files: `domain/scoring/` directory (engine.ts, calculations.ts, etc.)
- Why fragile: Complex business logic with interdependencies between attendance, donations, class restrictions; small changes affect guild's entire ranking system
- Safe modification: All changes require full test suite run; add regression tests for known guild configurations; get officer review before merging
- Test coverage: Comprehensive unit tests present (`domain/scoring/__tests__/`), but missing integration tests with real guild data

**Character Linking & Guild Membership:**
- Files: `domain/guild/permissions.ts`, character/guild membership queries across API routes
- Why fragile: Sync between `characters`, `character_guild_memberships`, and `guild_members` tables; linking/unlinking can orphan records; RLS policies must match queries
- Safe modification: Verify both table queries AND RLS policies in any membership-related change
- Test coverage: `domain/guild/__tests__/` has basic tests, but missing edge cases (re-linking, multi-guild scenarios)

**Raid Tracking Import Logic:**
- Files: `app/(app)/raid-tracking/_client.tsx` (lines 222-400+), `app/(app)/raid-tracking/components/ImportModal.tsx`
- Why fragile: Fuzzy name matching, alias resolution, batch processing of imports with side effects; error recovery not clear
- Safe modification: Add comprehensive tests for edge cases (duplicate names, missing aliases, partial imports); test rollback scenarios
- Test coverage: No automated tests for import pipeline; all validation is manual

## Test Coverage Gaps

**No Tests for Major UI Components:**
- What's not tested: `LootListContent.tsx`, `DashboardContent.tsx`, `RaidTrackingPage`, `LootManagement` component, and most page-level components
- Files: `app/(app)/loot-list/`, `app/(app)/overview/`, `app/(app)/raid-tracking/`, `app/(app)/loot-management/`
- Risk: UI bugs and regressions not caught; state management bugs go unnoticed; integration with API changes is untested
- Priority: High — these are core features used daily

**Incomplete Import/Export Testing:**
- What's not tested: Gargul DFT export format validation, WoW Sims import parsing edge cases, sheet import edge cases
- Files: `lib/wowsims-parser.ts`, `lib/sheet-import/`, `domain/loot/gargul-dft.ts` (has tests but limited to happy path)
- Risk: Imports fail silently or corrupt guild data; exports don't match add-on expectations
- Priority: High — data integrity risk

**No API Integration Tests:**
- What's not tested: Full request/response cycles; error handling paths; permission boundaries; data consistency across endpoints
- Files: All `app/api/*/route.ts` files
- Risk: API contract changes break client; permission leaks go unnoticed; error responses don't match client expectations
- Priority: Medium-High — security and data integrity

## Scaling Limits

**Raid Tracking State Explosion:**
- Current capacity: Works smoothly for ~100 members, ~20 raids/month visible at once
- Limit: Virtual scrolling or pagination not implemented; loading 50+ raids with 100+ members each causes UI lag
- Scaling path: Implement virtualized list for raid history; paginate raid events by week/month; consider server-side filtering on date ranges

**Attendance Matching Performance:**
- Current capacity: Character name resolution works for ~500 unique character names
- Limit: O(n) fuzzy matching on every import; repeated comparisons during reconciliation
- Scaling path: Pre-build trie or suffix tree of character names; batch name resolution; cache aliases

**Loot Item Search Indexing:**
- Current capacity: Linear search over ~5000 items; fast enough for single-query
- Limit: No full-text search; wildcard queries slow down as item list grows
- Scaling path: Add database full-text search index; implement autocomplete with debouncing

## Dependencies at Risk

**Missing Error Tracking in Production:**
- Risk: PostHog analytics captured but error tracking not visible; can't debug production user issues
- Impact: Lost visibility into production bugs; users frustrated with silent failures
- Migration plan: Integrate Sentry for error tracking; configure error boundary to send to Sentry; set up alerts for high error rates

**Companion App Electron Dependencies:**
- Risk: Electron 43, electron-builder 26 are latest versions; may diverge from production app React 19
- Impact: Ecosystem incompatibility if not maintained regularly
- Recommendation: If shipping, lock versions and test against production; if not shipping, remove

**Database Schema Type Drift:**
- Risk: Auto-generated types go stale if `npm run gen:types` not run after schema changes
- Impact: Type mismatches; false sense of type safety
- Recommendation: Add pre-commit hook to verify types are up-to-date; add CI check to compare against source

## Missing Critical Features

**No Undo/Rollback for Loot Awards:**
- Problem: Loot awards are permanent once submitted; no way to reverse accidental awards without admin intervention
- Blocks: Officers can't self-correct mistakes; disputes require manual data cleanup
- Improvement: Add soft delete with 24-hour grace period for officer reviews; audit log with diffs

**No Bulk Character Linking:**
- Problem: Guild admins must link each character individually; no batch import/linking UI
- Blocks: Onboarding new guilds is slow; player alt roster updates are tedious
- Improvement: Add bulk character upload (CSV) with conflict resolution UI

**No Data Export Beyond Gargul Format:**
- Problem: Can only export to Gargul DFT format; no CSV, JSON, or PDF reports
- Blocks: Officers can't generate reports for guild; no audit trail for guild records
- Improvement: Add CSV export for loot history, attendance records, scoring breakdown

## Security Considerations

**Supabase RLS Policy Coverage Gaps:**
- Risk: RLS policies may not cover all API paths; queries using service role bypass policies
- Files: `app/api/*/route.ts` files using `createServiceRoleClient()`
- Current mitigation: Manual permission checks in code before queries
- Recommendations: Audit each service-role use to verify permission check precedes query; add integration tests for permission boundaries

**No Rate Limiting on User-Facing APIs:**
- Risk: Bulk imports, character searches, loot exports could be abused to DoS
- Files: `app/api/` endpoints without rate limiting
- Current mitigation: Upstash Redis available but not configured on endpoints
- Recommendation: Apply @upstash/ratelimit to data-heavy endpoints; implement per-user and per-guild quotas

**Secrets Not Isolated from Logs:**
- Risk: Debugging logs may capture sensitive data (tokens, user IDs, guild configs)
- Impact: PostHog/Sentry logs could leak data; console errors exposed in browser dev tools
- Recommendation: Sanitize logs before capture; mark sensitive fields; never log full request/response bodies

---

*Concerns audit: 2026-08-27*
