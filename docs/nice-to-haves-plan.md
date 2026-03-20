# Nice-to-Haves Implementation Plan

6 remaining items ordered by value/effort ratio. Each can be done independently.

## Status Key

- 🔵 Ready to start
- ⏳ Needs design decision first
- 🔴 Blocked by another item

---

## 1. Supabase Type Generation (2 hours) 🔵

**Value:** Eliminates 3 type conflicts (Character, Guild, GuildMember), prevents future mismatches, gives autocomplete for every table.

**Why first:** Every other item benefits from having correct types. It's mechanical, low risk, and pays dividends immediately. The type-inconsistencies audit found 4 conflicts — this fixes them all at once.

**Files:**
```
NEW   lib/database.types.ts              (generated, ~3000 lines)
MOD   app/hooks/use-api.ts               (replace inline types with generated)
MOD   app/contexts/GuildContext.tsx        (replace inline types with generated)
MOD   app/api/guild-settings/route.ts     (type allowlist from generated types)
MOD   tsconfig.json or supabase config    (generation setup)
```

**Steps:**
1. Run `supabase gen types typescript --project-id zjnhjstbqekudlsozsvi > lib/database.types.ts`
2. Create a `lib/db.ts` that re-exports the useful table row types with friendly names
3. Replace `Character`, `Guild`, `GuildMember` in use-api.ts with generated types
4. Replace same in GuildContext.tsx
5. Type-check the entire build, fix any shape mismatches
6. Add a script to package.json: `"gen:types": "supabase gen types typescript --project-id zjnhjstbqekudlsozsvi > lib/database.types.ts"`

**Acceptance criteria:**
- `npm run gen:types` produces fresh types
- Zero inline interface definitions for DB tables in use-api.ts or GuildContext.tsx
- Build passes with strict type checking

**Risk:** Low. Generated types are additive. Existing code only breaks if the inline types were wrong (which is the point — we want to find those).

---

## 2. Attendance Status Column Migration (3 hours) ⏳

**Value:** Replaces 5 boolean columns with a single `status` enum. Simplifies every query, every UI component, and every status check. Makes `resolveStatus()` unnecessary (the DB stores the resolved value).

**Why second:** Depends on type generation (#1) for clean types. The boolean system works but is error-prone — every consumer must call `resolveStatus()` or risk a wrong priority chain.

**Design decision needed:** Migration strategy. Two options:
- **A. Add column + backfill + dual-write (safe):** Add `status` column, backfill from booleans, update writes to set both. Deprecate booleans later.
- **B. Replace in place (breaking):** Add column, backfill, drop booleans, update all queries. Faster but riskier.

**Recommend option A** (dual-write, like the guild_members pattern).

**Files:**
```
NEW   supabase/migrations/NNNN_add_attendance_status_column.sql
MOD   domain/scoring/attendance.ts         (read status column, fallback to booleans)
MOD   domain/scoring/attendance-score.ts    (use status instead of booleans)
MOD   domain/types.ts                      (AttendanceRecord gains status field)
MOD   app/api/attendance/bulk/route.ts      (write status on upsert/update)
MOD   app/(app)/admin/raid-tracking/page.tsx (write status on state change)
MOD   app/(app)/attendance/page.tsx         (read status instead of booleans)
```

**Steps:**
1. Migration: `ALTER TABLE attendance_records ADD COLUMN status TEXT CHECK (status IN ('attended','late','benched','no_show','excused','signed_up','absent')) DEFAULT 'absent'`
2. Backfill: `UPDATE attendance_records SET status = CASE WHEN no_call_no_show THEN 'no_show' WHEN is_excused THEN 'excused' WHEN was_benched THEN 'benched' WHEN attended AND was_late THEN 'late' WHEN attended THEN 'attended' WHEN signed_up THEN 'signed_up' ELSE 'absent' END`
3. Update attendance bulk API to set `status` alongside booleans on every write
4. Update raid tracking page to set `status` alongside booleans on state change
5. Update scoring to prefer `status` column over boolean resolution
6. Verify all pages work with the new column
7. (Future) Drop boolean columns once all consumers use `status`

**Acceptance criteria:**
- `status` column populated for all existing records
- New writes set both `status` and legacy booleans
- Scoring reads `status` first, falls back to boolean resolution
- Build passes, 216 tests pass

**Risk:** Medium. Dual-write adds complexity. Must not break existing queries that filter by booleans.

---

## 3. GuildContext Split (4-6 hours) 🔵

**Value:** Reduces re-render cascading (34 consumers re-render on any state change). Makes testing easier. Reduces cognitive load (1,051 lines → 3 focused files).

**Why third:** Biggest architectural improvement. Already partially done (GuildDataContext + GuildActionsContext split exists). But touching 34 files is high risk.

**Natural split:**

| New Context | State | Consumers | Lines |
|-------------|-------|-----------|-------|
| AuthGuildContext | user, activeGuild, activeMember, userGuilds, isOfficer | 34 (all) | ~400 |
| CharacterContext | activeCharacter, userCharacters, characterMemberships | ~10 | ~300 |
| ExpansionContext | currentExpansion, guildExpansions, viewingExpansionId | ~8 | ~200 |

**Files:**
```
MOD   app/contexts/GuildContext.tsx           (slim down to AuthGuildContext)
NEW   app/contexts/CharacterContext.tsx       (extracted)
NEW   app/contexts/ExpansionContext.tsx        (extracted)
MOD   app/(app)/layout.tsx                    (nest providers)
MOD   34 consumer files                       (update imports)
```

**Steps:**
1. Extract ExpansionContext first (most independent, fewest consumers)
2. Wrap in layout.tsx inside GuildContext provider
3. Update 8 consumer files
4. Verify build + test
5. Extract CharacterContext
6. Update 10 consumer files
7. Verify build + test
8. Slim GuildContext to auth + guild selection + permissions
9. Final verify

**Acceptance criteria:**
- Each context manages one concern
- No circular dependencies between contexts
- 34 consumers work without behavior changes
- Build passes

**Risk:** High. Every page depends on GuildContext. Must be done incrementally (expansion first, then character). Keep the combined `useGuildContext()` hook as a facade that reads from all 3 contexts during migration.

---

## 4. Dual Membership Table Deprecation (6-8 hours) 🔴

**Value:** Eliminates 28 dual-write code paths. Reduces write latency (one INSERT instead of two). Removes a class of bugs (out-of-sync tables).

**Why fourth:** Blocked by GuildContext split (#3) — the guild loading logic needs to be clean before changing the data layer. Also needs type generation (#1) for clean types.

**Blocked by:** #1 (types), #3 (GuildContext)

**Files:**
```
NEW   supabase/migrations/NNNN_deprecate_guild_members.sql
MOD   28 API route files                     (remove guild_members writes)
MOD   app/contexts/GuildContext.tsx           (remove guild_members queries)
MOD   utils/server-roles.ts                  (already uses character_guild_memberships only)
DEL   (eventually) guild_members table       (after verification period)
```

**Steps:**
1. Audit: grep all 28 files, categorize each usage as READ, WRITE, or DUAL-WRITE
2. Migration: add a DB trigger that auto-syncs `guild_members` from `character_guild_memberships` (replaces manual dual-write)
3. Remove all manual dual-writes from API routes (trigger handles it)
4. Verify all reads use `character_guild_memberships`
5. Monitor for 1 week
6. Drop the trigger, mark `guild_members` as deprecated
7. (Future) Drop the table

**Acceptance criteria:**
- Zero manual dual-writes in API routes
- DB trigger keeps tables in sync during transition
- All permission checks use `character_guild_memberships`
- Build passes

**Risk:** High. 28 files touched. The trigger approach de-risks the transition (both tables stay in sync automatically). Keep the table for 2+ weeks before dropping.

---

## 5. use-api.ts Split (1 hour) 🔵

**Value:** Better code organization. Smaller imports. Easier to find hooks by domain.

**Why fifth:** Low impact (only 4 consumers), but quick and satisfies the refactor plan.

**Files:**
```
NEW   app/hooks/use-characters.ts
NEW   app/hooks/use-guilds.ts
NEW   app/hooks/use-loot.ts
NEW   app/hooks/use-submissions.ts
NEW   app/hooks/use-raids.ts
NEW   app/hooks/use-gear.ts
MOD   app/hooks/use-api.ts                  (becomes barrel re-export)
```

**Steps:**
1. Split into 6 domain files
2. Make use-api.ts a barrel re-export (zero consumer changes needed)
3. Optionally update 4 consumers to import from domain files directly
4. Verify build

**Acceptance criteria:**
- Each domain file is <100 lines
- use-api.ts re-exports everything (no breaking changes)
- Build passes

**Risk:** None. Re-export bridge means zero consumer changes required.

---

## 6. i18n (Multi-day project) ⏳

**Value:** Opens the product to non-English WoW guilds (significant EU market: German, French, Spanish, Russian).

**Why last:** Largest scope. Touches every UI string. Needs decisions on translation workflow, language selection, and which languages to support first.

**Design decisions needed:**
- Which i18n library? (next-intl, react-i18next, or lingui)
- Which languages first? (Recommend: English + German + French — largest WoW Classic EU populations)
- Who translates? (Community, professional, AI-assisted)
- URL strategy? (/en/overview vs cookie-based)

**Files:**
```
NEW   messages/en.json                       (~500 strings)
NEW   messages/de.json
NEW   messages/fr.json
NEW   lib/i18n.ts                            (config + helpers)
MOD   app/(app)/layout.tsx                   (i18n provider)
MOD   ~60 page/component files               (string extraction)
NEW   app/(app)/profile/language-selector     (UI)
```

**Steps:**
1. Choose library and URL strategy
2. Extract all English strings to messages/en.json (bulk operation, ~500 keys)
3. Set up provider + hook
4. Convert pages one at a time (start with high-traffic: overview, loot-list, attendance)
5. Generate initial translations (AI-assisted + community review)
6. Add language selector to profile
7. Test RTL if supporting Arabic (probably not initially)

**Acceptance criteria:**
- English experience unchanged
- At least 2 additional languages functional
- Language persisted per user
- WoW-specific terms (class names, raid names) use Blizzard's official translations

**Risk:** Medium. String extraction is tedious but safe. The risk is in translation quality — WoW terminology must match what players expect in their language.

---

## Recommended Sequence

```
Week 1:  #1 Supabase Type Generation (2h)
         #5 use-api.ts Split (1h)
Week 2:  #3 GuildContext Split — ExpansionContext extraction (2h)
         #3 GuildContext Split — CharacterContext extraction (3h)
Week 3:  #2 Attendance Status Column (3h)
Week 4:  #4 Dual Membership Table Deprecation (6-8h)
Week 5+: #6 i18n (multi-day, ongoing)
```

Items #1 and #5 are quick wins that clear the path. #3 is the biggest structural improvement. #2 and #4 are data layer cleanups that benefit from #1 and #3 being done first. #6 is a separate ongoing effort.

**Total estimated effort:** ~20-25 hours (excluding i18n)
