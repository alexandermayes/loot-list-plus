# Create Update Post

Generate an update entry for the Updates page based on recent changes.

## Instructions

1. Run `git log --oneline` to find commits since the last update entry in `lib/updates-data.ts`. Compare the most recent entry's date against the git log to determine which commits are new.

2. Read `lib/updates-data.ts` to understand the format and see existing entries for tone/style reference.

3. Group related commits into user-facing update items. Follow these rules:
   - **Skip** internal refactors, typo fixes, or changes users won't notice
   - **Merge** related commits into a single item (e.g., multiple pagination fixes = one "Pagination improvements" item)
   - **Categorize** each item as `feature` (new capability), `improvement` (enhancement to existing), or `fix` (bug fix)
   - **Title** should be short and describe what changed from the user's perspective
   - **Description** should explain what the user gets, not what code changed. Keep it to 1-2 sentences.
   - Follow the voice guidelines in CLAUDE.md: clear, specific, no em dashes, no marketing hype

4. Add a new entry at the TOP of the `updates` array in `lib/updates-data.ts` with today's date formatted as "Month DD, YYYY" (e.g., "March 18, 2026").

5. Show me the update before committing so I can review it.

## Format Reference

```typescript
{
  date: 'March 18, 2026',
  items: [
    {
      category: 'feature',
      title: 'Short user-facing title',
      description: 'What the user gets from this change. One to two sentences.',
    },
  ],
},
```
