# Regression Check

Scan the entire codebase for known recurring bug patterns and anti-patterns that have caused production issues.

## Instructions

Run ALL of the following checks and report any violations found. This should be run after any significant code changes or before deployments.

---

## Database & Query Patterns

### 1. Dangerous `!inner` joins

Supabase `!inner` joins silently return 0 rows when ANY record has an orphaned foreign key reference. This has caused "data shows 0 items" bugs repeatedly.

**Check:** Search for `!inner` in ALL `.ts` and `.tsx` files. Flag any `!inner` join, especially on `loot_history`, `loot_items`, `attendance_records`, or any table with foreign keys that could be orphaned.

```
grep -rn "!inner" --include="*.ts" --include="*.tsx" app/
```

**Fix:** Replace `table!inner (...)` with `table (...)` (regular left join). Handle null results in the consuming code.

### 2. Supabase silent failures

- **RLS blocking writes**: Regular client `supabase` silently returns 0 rows on blocked operations. API routes that have already verified permissions should use `serviceSupabase` for writes.
- **Missing `.eq()` filters**: Could cause cross-guild data leakage.
- **Missing error checks**: Supabase errors are easy to ignore since they return `{ data: null, error }` instead of throwing.

**Check:**
```
grep -rn "\.insert\|\.update\|\.delete\|\.upsert" --include="*.ts" app/api/ | grep -v "serviceSupabase\|service_role"
```

### 3. Date handling timezone bugs

`new Date(str + 'T00:00:00')` and `.toISOString().split('T')[0]` cause timezone shift (e.g., Sunday → Monday in US timezones).

**Check:**
```
grep -rn "T00:00:00\|toISOString.*split.*T" --include="*.ts" --include="*.tsx" app/
```

**Fix:** Use `parseDate()` and `toDateString()` helpers defined in the attendance and raid-tracking pages.

---

## Component & Rendering Patterns

### 4. Virtualized vs non-virtualized render paths

Multiple components have two render paths: one for small datasets and one for large (virtualized). Props MUST be passed in BOTH paths.

**Check:** In `VirtualizedMasterSheet.tsx`, compare all props passed to `<BossSection>` in both render paths (~line 145 non-virtualized, ~line 200 virtualized). Every prop must match.

**Broader check:** Search for any component that conditionally renders based on data size and verify both branches pass the same props.
```
grep -rn "useVirtualizer\|virtualize\|\.slice(" --include="*.tsx" app/
```

### 5. Missing prop forwarding through component chains

When a prop is added to a leaf component, verify ALL parent components thread it through. Common chains:
- `page.tsx` → `VirtualizedMasterSheet` → `BossSection`
- `page.tsx` → `LootListContext` → child components
- `Modal` → `ModalHeader` → `ModalTitle`

**Check:** For any recently modified component, trace its usage up the tree and verify all callers pass required props.

### 6. Nested button violations

HTML forbids `<button>` inside `<button>`. When a clickable container has interactive children, use `<div role="button">` with keyboard handlers instead.

**Check:**
```
grep -rn "<Button" --include="*.tsx" app/ | grep -i "inside\|nested\|wrapper"
```

---

## State & Data Flow Patterns

### 7. Auto-save status sync

In `LootListContext`, `originalStatus` must be synced after save operations or button state gets stuck in "saving" indefinitely.

**Check:** Any modification to the save flow in `LootListContext.tsx` must update `originalStatus` after successful save.

### 8. Auth redirect loops

`GuildContext` must NOT hard-redirect to `/` on initial `getUser()` failure. Only redirect on explicit `SIGNED_OUT` event. Violations cause infinite redirect loops.

### 9. Guild data dual-write

All join flows MUST write to BOTH `guild_members` (legacy) AND `character_guild_memberships` (new). Missing either causes permission failures or missing members.

**Check:**
```
grep -rn "guild_members\|character_guild_memberships" --include="*.ts" app/api/
```
Verify any insert/delete on one table has a corresponding operation on the other.

---

## Content & Display Patterns

### 10. Wowhead tooltip flash

Pages with wowhead item links need a `contentReady` state (150ms delay) + `transition-opacity duration-200` fade-in to prevent blue flash before tooltips load.

### 11. Spec/class display deduplication

When `spec.name === class.name` (Mage, Hunter, Warlock, Rogue), show only the class name. Check all 5 locations: CharacterSelector (3), CharacterCard (1), overview (1), MemberManager (1).

### 12. InfoTooltip portal rendering

`InfoTooltip` uses `createPortal` to `document.body` with `position: fixed` and `z-[9999]`. Never revert to CSS-only absolute positioning or it will clip inside overflow containers.

---

## Output Format

For each check:
- ✅ Pass - no issues found
- ❌ Fail - violations found, with file paths, line numbers, and suggested fix
- ⚠️ Warning - potential issue that needs manual review

Summarize total pass/fail/warning counts at the end.
