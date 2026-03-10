# Quality Audit

Deep audit of the entire app for fragile code patterns that could break for specific guilds. Goes beyond `/regression-check` to find issues that are latent (working for some guilds but not others).

## Instructions

Run ALL checks below. For each, search the codebase thoroughly and report findings.

---

## 1. Fragile Supabase Queries

### 1a. Nested joins without fallbacks
Search for Supabase `.select()` queries with nested joins (e.g., `table1 ( table2 ( ... ) )`). These can fail if any link in the chain has missing data. Each should either use optional chaining in the consumer code or have a try/catch fallback.

```
grep -rn "\.select(" --include="*.ts" --include="*.tsx" app/ | grep -c "("
```

Read each file with complex nested selects and verify:
- Consumer code handles `null` for each joined table
- No assumption that joined data always exists

### 1b. Queries missing guild_id filter
Any query on guild-scoped tables (`loot_history`, `raid_events`, `attendance_records`, `loot_submissions`, `raid_tiers`, `expansions`) MUST filter by `guild_id` or a related FK chain. Missing filters could leak data across guilds.

### 1c. Queries with .single() that could return 0 rows
`.single()` throws when 0 rows match. If the record might not exist, use `.maybeSingle()` instead.

```
grep -rn "\.single()" --include="*.ts" --include="*.tsx" app/
```

Check each: is the query guaranteed to return exactly 1 row? If not, flag it.

### 1d. Unbounded queries
Queries without `.limit()` on potentially large tables could timeout or return too much data. Check for queries on `loot_history`, `attendance_records`, `loot_submissions`, `loot_submission_items` without limits.

### 1e. `!inner` joins (from regression-check)
```
grep -rn "!inner" --include="*.ts" --include="*.tsx" app/
```
Flag any on tables with possible orphaned FKs (`loot_history`, `loot_items`, `attendance_records`).

---

## 2. Error Handling Gaps

### 2a. Silent error swallowing
Search for patterns where Supabase errors are logged but execution continues with potentially bad state:
```typescript
if (error) {
  console.error(...)
  // continues anyway with undefined data
}
```

### 2b. Missing error UI feedback
API calls from client components that don't show user-facing errors on failure. The user should always know when something fails.

### 2c. API routes returning generic errors
API routes that catch errors but return "Internal server error" without logging the actual error message. These make debugging production issues impossible.

---

## 3. Data Assumptions

### 3a. Assuming expansion/raid tier exists
Code that accesses `activeGuild.active_expansion_id` without checking if it's null. Guilds might not have an active expansion set.

### 3b. Assuming character has class/spec
Code that accesses `character.class.name` or `character.spec.name` without null checks. Characters might have incomplete data (especially imported ones).

### 3c. Assuming guild settings exist
Code that reads guild settings without defaults. New guilds might not have all settings populated.

### 3d. Hardcoded limits or magic numbers
Values like `5`, `50`, `100` that limit display or data without being configurable or documented. These cause "works for small guilds, breaks for large guilds" bugs.

---

## 4. Race Conditions & State Issues

### 4a. Stale closures in useEffect/useCallback
Check for useEffect/useCallback hooks that reference state variables but don't include them in dependency arrays.

### 4b. Concurrent save operations
Check if any save/update operations could be triggered multiple times (e.g., double-clicking a save button) without debounce or loading state protection.

### 4c. Optimistic updates without rollback
Code that updates local state before confirming server success, without rolling back on failure.

---

## 5. Cross-Guild Safety

### 5a. Guild context assumptions
Pages/components that use `activeGuild` from context without handling the case where:
- User has no guild
- User switched guilds mid-operation
- Guild was deleted while user was viewing it

### 5b. Expansion mismatch
Operations that assume the active expansion matches the data being displayed. User could switch expansions while a page is loading.

---

## Output Format

For each check:
- ✅ Pass - no issues found
- ❌ Fail - with file:line and description
- ⚠️ Warning - potential issue, needs manual review

Group by severity:
1. **Critical** - Data loss, security, or complete feature breakage
2. **High** - Feature broken for some guilds
3. **Medium** - Poor UX or intermittent issues
4. **Low** - Code quality, no user impact

End with a prioritized action list.
