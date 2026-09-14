---
phase: quick-260913-oer
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - data/classic-wow-raids.ts
  - data/token-class-mapping.ts
  - data/__tests__/classic-wow-raids.test.ts
  - supabase/migrations/20260913000000_fix_naxx_token_names.sql
autonomous: true
requirements:
  - GH-269

estimate:
  tokens: 48000
  raw_tokens: 48000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "Every one of the 24 Naxxramas Tier 3 Desecrated tokens in data/classic-wow-raids.ts carries the name that Wowhead and wow-classic-items give for its wowhead_id, so the row label and the tooltip it opens finally agree (GH-269)"
    - "getTokenClasses() returns the real Wowhead class restriction for all 24 Desecrated tokens: Warrior plus Rogue for the plate set, Paladin plus Hunter plus Shaman plus Druid for the mail set, Priest plus Mage plus Warlock for the cloth set, so a raider of the right class can actually add the token to a loot list"
    - "'Desecrated Mantle' and 'Desecrated Pants' no longer appear as TOKEN_CLASS_MAPPING keys, because neither is a real WoW item, and 'Desecrated Shoulderpads' (22368) does appear"
    - "data/__tests__/classic-wow-raids.test.ts fails on the pre-fix data and passes after it, asserting every Classic raid item name against wow-classic-items by itemId and all 24 token names plus class lists against a table transcribed independently of the data file"
    - "supabase/migrations/20260913000000_fix_naxx_token_names.sql relabels every existing loot_items token row in place (each row keeps its wowhead_id), re-points loot_submission_items to preserve what the player actually picked by name, and rebuilds loot_item_classes from the authoritative table"
    - "The migration is idempotent, scoped to wowhead_id 22349 to 22372 with item_slot 'Token', touches only loot_items, loot_item_classes, loot_submission_items and wow_classes, and contains no schema or RLS mutation of any kind"
    - "Existing classification and allocation_cost values on loot_items rows are left exactly as guilds tuned them"
    - "`npx vitest run data`, `npm run typecheck` and `npm run lint` all pass"
  artifacts:
    - data/classic-wow-raids.ts (24 corrected Tier 3 token names, Jin'do's Judgement spelling)
    - data/token-class-mapping.ts (24 Desecrated keys in three correct class groups)
    - data/__tests__/classic-wow-raids.test.ts (new regression suite for GH-269)
    - supabase/migrations/20260913000000_fix_naxx_token_names.sql (data migration for the 9 already-seeded guild tiers)
  key_links:
    - "getTokenClasses() matches with `tokenName.includes(tokenType)`, so a TOKEN_CLASS_MAPPING key that is a substring of another key would silently return the wrong class list for whichever key is declared first. Verified today: zero substring collisions among the current 73 keys, and none among the 24 replacement Desecrated keys. The new test locks this invariant."
    - "loot_item_classes rows are attached by loot_item_id, not by name, so renaming a loot_items row does NOT fix its class restrictions. The class rows must be deleted and rebuilt, or the rename alone would leave the wrong classes on every token."
    - "loot_history and the addon award path resolve items by wowhead_id, so keeping each row's wowhead_id and changing only its name leaves all 204 existing loot_history references pointing at the item the officer actually awarded. Shuffling ids instead would corrupt them."
    - "loot_submission_items rows record what the player saw on screen, which was the wrong label. Re-pointing each one to the row in the SAME raid_tier_id whose NEW name equals the old label preserves the player's intent. The rename must therefore happen AFTER the re-point, which is also what makes the re-point idempotent on a second run."
    - "loot_item_classes has UNIQUE (loot_item_id, spec_id, spec_type) with spec_id NULL. Postgres treats NULLs as distinct in a UNIQUE constraint, so the 2 to 4 primary rows per token that expansionSeeder writes do not collide, and a delete-then-insert rebuild needs no ON CONFLICT clause. Verified in the baseline schema."
    - "data/classic-wow-item-classifications.ts is keyed by NAME and consumed only by expansionSeeder at seed time. All four Desecrated names it lists (Breastplate, Gauntlets, Helmet, Legplates) still exist after the rename and all four still belong to the Warrior/Rogue plate set, so the file needs no edit and existing rows keep their tuned classification."
---

<objective>
Fix GitHub issue GH-269, "Naxxramas Tier 3 token names and class restrictions are wrong."
An officer setting up Naxxramas on Era sees rows whose names do not match the tooltip they
open: the row labelled "Desecrated Spaulders" shows the Helmet tooltip, "Desecrated Helmet"
shows the Bracers tooltip, and raiders cannot add the tokens at all because the class
restriction is looked up by NAME and therefore lands on the wrong item.

Root cause: in data/classic-wow-raids.ts the 24 Desecrated tokens were given sequential
wowhead_ids grouped by armor slot instead of their real ids. 20 of the 24 names are attached
to the wrong id, one name ("Desecrated Mantle") is not a real item at all, and the real item
at that position ("Desecrated Shoulderpads", 22368) is missing. TOKEN_CLASS_MAPPING then
compounds it by assigning single-class restrictions that Wowhead contradicts: the real
Tier 3 tokens are shared by two, four and three classes respectively.

The ids in the data file are already right, and the tooltip and icon both key off the id.
So the fix is to correct the NAMES to match the ids, never the other way round. That choice
keeps every existing loot_history row correct for free, because the addon award and
import-string paths resolve items by wowhead_id.

Purpose: make the Naxxramas loot list say what it means, and let raiders of the correct
class add Tier 3 tokens to their loot lists again, both for new guilds seeding Naxxramas
and for the 9 guild tiers already seeded from the wrong data.
Output: corrected token names and class mappings, a regression suite that locks every
Classic raid item name to the wow-classic-items package, and a scoped, idempotent data
migration that repairs the already-seeded rows.

Tracer-first decomposition does not apply. This is a data correction plus its regression
test plus a repair migration for rows already written from the bad data, not layers of one
new capability. Each task is a self-contained `auto` fix with its own atomic commit, in the
order the orchestrator fixed: the data fix lands first so the new test can be run green,
and the migration lands last because it transcribes the same authoritative table.

Verified during planning, so the executor does not need to rediscover it:
- All 24 names in the authoritative table below match wow-classic-items v2.0.1 byte for byte,
  and 19884 is "Jin'do's Judgement" in the package.
- With those 25 corrections applied, all 743 items across all 7 exported Classic raids match
  the package by itemId with zero mismatches and zero ids missing from the package. The
  strict form of assertion (a) in Task 2 will therefore pass with no skip list.
- Pre-fix, the same check reports 20 of 24 token names wrong, which is the RED signal.
- `import { Items } from 'wow-classic-items'` typechecks cleanly under this repo's tsconfig
  (probed with tsc), and the package resolves and reads its JSON fine under tsx.

Commit trailer note: the invoking brief named the trailer
`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`, while this environment's current
attribution guidance may specify a different one. The executor must use whichever trailer its
own attribution guidance specifies at execution time, and must not omit the trailer. Record
in the SUMMARY which trailer was actually used.
</objective>

<execution_context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/workflows/execute-plan.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md

# Task 1 source
@data/classic-wow-raids.ts
@data/token-class-mapping.ts
@data/classic-wow-item-classifications.ts

# Task 2 convention reference (read, do not edit)
@data/__tests__/tbc-raids.test.ts

# Task 3 convention reference (read, do not edit)
@supabase/migrations/README.md
@supabase/migrations/20260825000000_dedupe_raid_events.sql

# How tokens get their class rows at seed time, which the migration must reproduce
@app/services/expansionSeeder.ts
</context>

<authoritative_data>
Verified against Wowhead Classic tooltips for all 24 ids on 2026-09-13 by the orchestrator,
and re-verified during planning against wow-classic-items v2.0.1 (names match exactly).
This table is the single source of truth for all three tasks.

`old name` is the wrong label the row currently carries in data/classic-wow-raids.ts and in
every already-seeded loot_items row. It is needed ONLY by Task 3, to preserve what a player
actually picked. 4 of the 24 (22349, 22350, 22351, 22366) are already correct.

| wowhead_id | correct name | old name (current, wrong) | classes |
|---|---|---|---|
| 22349 | Desecrated Breastplate | Desecrated Breastplate | Warrior, Rogue |
| 22350 | Desecrated Tunic | Desecrated Tunic | Paladin, Hunter, Shaman, Druid |
| 22351 | Desecrated Robe | Desecrated Robe | Priest, Mage, Warlock |
| 22352 | Desecrated Legplates | Desecrated Pauldrons | Warrior, Rogue |
| 22353 | Desecrated Helmet | Desecrated Spaulders | Warrior, Rogue |
| 22354 | Desecrated Pauldrons | Desecrated Mantle | Warrior, Rogue |
| 22355 | Desecrated Bracers | Desecrated Helmet | Warrior, Rogue |
| 22356 | Desecrated Waistguard | Desecrated Headpiece | Warrior, Rogue |
| 22357 | Desecrated Gauntlets | Desecrated Circlet | Warrior, Rogue |
| 22358 | Desecrated Sabatons | Desecrated Waistguard | Warrior, Rogue |
| 22359 | Desecrated Legguards | Desecrated Girdle | Paladin, Hunter, Shaman, Druid |
| 22360 | Desecrated Headpiece | Desecrated Belt | Paladin, Hunter, Shaman, Druid |
| 22361 | Desecrated Spaulders | Desecrated Gauntlets | Paladin, Hunter, Shaman, Druid |
| 22362 | Desecrated Wristguards | Desecrated Handguards | Paladin, Hunter, Shaman, Druid |
| 22363 | Desecrated Girdle | Desecrated Gloves | Paladin, Hunter, Shaman, Druid |
| 22364 | Desecrated Handguards | Desecrated Legplates | Paladin, Hunter, Shaman, Druid |
| 22365 | Desecrated Boots | Desecrated Legguards | Paladin, Hunter, Shaman, Druid |
| 22366 | Desecrated Leggings | Desecrated Leggings | Priest, Mage, Warlock |
| 22367 | Desecrated Circlet | Desecrated Sandals | Priest, Mage, Warlock |
| 22368 | Desecrated Shoulderpads | Desecrated Sabatons | Priest, Mage, Warlock |
| 22369 | Desecrated Bindings | Desecrated Boots | Priest, Mage, Warlock |
| 22370 | Desecrated Belt | Desecrated Bindings | Priest, Mage, Warlock |
| 22371 | Desecrated Gloves | Desecrated Wristguards | Priest, Mage, Warlock |
| 22372 | Desecrated Sandals | Desecrated Bracers | Priest, Mage, Warlock |

Reading of the id layout, for whoever writes the comments: 22349, 22350 and 22351 are the
three chest tokens, one per class group. 22352 through 22358 complete the Warrior/Rogue set,
22359 through 22365 complete the Paladin/Hunter/Shaman/Druid set, and 22366 through 22372
complete the Priest/Mage/Warlock set.

Old-to-new name mapping, derived from the table above, is a bijection with exactly one
exception in each direction: old "Desecrated Mantle" has no new counterpart (it is not a real
item) and new "Desecrated Shoulderpads" has no old counterpart. Task 3 must leave submission
rows that point at 22354 unchanged for exactly that reason.

Production state, measured by the orchestrator on 2026-09-13, aggregate counts only:
9 loot_items rows per wowhead_id in the 22349 to 22372 range (9 guild Naxxramas tiers, all
seeded from this file), 351 loot_item_classes rows attached to them, 9 loot_submission_items
rows in ONE raid tier, 204 loot_history rows across 2 tiers (already id-resolved, so correct),
and zero references from guild_item_priorities, reserve_awards, blp_tracking or blp_credits.
wow_classes contains rows named exactly Warrior, Paladin, Hunter, Rogue, Priest, Shaman, Mage,
Warlock, Druid, plus Death Knight and Monk.
</authoritative_data>

<tasks>

<task type="auto">
  <name>Task 1: Correct the 24 Tier 3 token names and their class restrictions</name>
  <files>data/classic-wow-raids.ts, data/token-class-mapping.ts</files>
  <action>
Two files, one commit.

In data/classic-wow-raids.ts, replace the 24 item lines inside the Naxxramas group named
"Tier 3 Tokens" (currently lines 1143 to 1178) so that each wowhead_id carries the correct
name from the authoritative table. Keep every id, keep slot 'Token' on all 24, keep the
existing object shape and 2-space indentation, and list the 24 entries in ascending
wowhead_id order. The six existing slot-based comment headers inside the group
("Chest Tokens", "Shoulder Tokens", "Helm Tokens", "Waist Tokens (from trash)",
"Gloves Tokens", "Legs Tokens", "Feet Tokens", "Wrist Tokens (from trash)") are wrong now
that the ids are grouped by armor set rather than by slot, so delete them and put ONE short
comment above the 24 entries citing GH-269 and stating that the ids are authoritative and
the names follow Wowhead and the wow-classic-items package. Do not reorder, add or remove
any other group or item in the file.

Still in data/classic-wow-raids.ts, correct the single spelling at line 677: the item at
wowhead_id 19884 is "Jin'do's Judgement", not "Jin'do's Judgment". This is cosmetic, it gets
no migration, and it is included here because the Task 2 package check covers every Classic
item and would otherwise fail on it. Leave the same spelling in data/classic-item-roles.ts
and data/item-types.ts alone: the roles map is keyed by the old spelling and changing it is
not in scope for GH-269, and item-types.ts is keyed by id with the spelling only in a trailing
comment. Note this deliberate inconsistency in the SUMMARY as a follow-up candidate.

In data/token-class-mapping.ts, replace the whole "CLASSIC TIER 3 TOKENS" block (currently
lines 43 to 77, from the banner comment through the last Desecrated entry) with 24 keys, one
per correct token name, grouped into the three class groups from the authoritative table:
the eight plate names get ['Warrior', 'Rogue'], the eight mail names get
['Paladin', 'Hunter', 'Shaman', 'Druid'], and the eight cloth names get
['Priest', 'Mage', 'Warlock']. Keep the banner comment style and add one line per group
naming the classes and the armor set. The two keys that name items which do not exist must
be gone, and the key for 22368 must be present. Do not touch any other entry in the file,
and do not change getTokenClasses, canClassUseToken, TOKEN_SLOTS or isTokenSlot.

Before writing the mapping, confirm the substring hazard is clear: getTokenClasses matches
with `tokenName.includes(tokenType)` and returns the first hit in declaration order, so a key
that is a substring of another key would shadow it. Planning verified zero collisions among
the current 73 keys and none among the 24 replacements (the closest pair is Leggings versus
Legguards, which diverge at the fifth character). The Task 1 verify command re-checks this
mechanically, and Task 2 locks it as a permanent assertion.

Leave data/classic-wow-item-classifications.ts unchanged. Planning confirmed all four
Desecrated names it lists (Breastplate, Gauntlets, Helmet, Legplates) still exist after the
rename and all four still sit in the Warrior/Rogue plate set, so the file stays correct.
The verify command below proves that rather than assuming it. Do not change any
classification or allocation_cost anywhere.

Commit subject: `fix(data): correct Naxxramas Tier 3 token names and class restrictions (#269)`
  </action>
  <verify>
    <automated>
npx tsx -e "
import { naxxramas } from './data/classic-wow-raids'
import { TOKEN_CLASS_MAPPING, getTokenClasses } from './data/token-class-mapping'
import { ITEM_CLASSIFICATIONS } from './data/classic-wow-item-classifications'
import { Items } from 'wow-classic-items'
const byId = new Map<number, string>()
const realNames = new Set<string>()
for (const i of new Items({ iconSrc: false })) { byId.set(i.itemId, i.name); realNames.add(i.name) }
const group = naxxramas.bosses.find(b => b.name === 'Tier 3 Tokens')!.items
const badName = group.filter(i => byId.get(i.wowhead_id) !== i.name).map(i => i.wowhead_id)
const badSlot = group.filter(i => i.slot !== 'Token')
const keys = Object.keys(TOKEN_CLASS_MAPPING)
const des = keys.filter(k => k.startsWith('Desecrated'))
const collisions = keys.filter(a => keys.some(b => b !== a && b.includes(a)))
const ghost = des.filter(k => !realNames.has(k))
const classified = Object.keys(ITEM_CLASSIFICATIONS).filter(n => n.startsWith('Desecrated'))
const orphan = classified.filter(n => !group.some(i => i.name === n))
const wrongGroup = classified.filter(n => JSON.stringify(getTokenClasses(n)) !== JSON.stringify(['Warrior','Rogue']))
console.log({ groupSize: group.length, badName, badSlot: badSlot.length, desKeys: des.length, collisions, ghost, orphan, wrongGroup })
if (group.length !== 24 || badName.length || badSlot.length || des.length !== 24 || collisions.length || ghost.length || orphan.length || wrongGroup.length) process.exit(1)
console.log('OK: 24 token names match wow-classic-items, 24 mapping keys, no substring collisions, classifications still valid')
"

Measured against the pre-fix data during planning, this exact command exits 1 and reports
badName with 20 ids, desKeys 25, ghost ['Desecrated Mantle', 'Desecrated Pants'] and
wrongGroup with the four classified names. After Task 1 every one of those must be empty,
groupSize 24 and desKeys 24. Do not weaken any condition to make it pass.
    </automated>
    <automated>
npx tsx -e "
import { classicRaids } from './data/classic-wow-raids'
import { Items } from 'wow-classic-items'
const byId = new Map<number, string>()
for (const i of new Items({ iconSrc: false })) byId.set(i.itemId, i.name)
const norm = (s: string) => s.replace(/\s*\([^)]*\)\s*\$/, '').toLowerCase().replace(/[^a-z0-9]/g, '')
const bad = classicRaids.flatMap(r => r.bosses.flatMap(b => b.items)).filter(i => norm(byId.get(i.wowhead_id) ?? '') !== norm(i.name))
console.log('classic items with a name that disagrees with the package:', bad.length, bad.slice(0, 5))
if (bad.length) process.exit(1)
"
    </automated>
    <automated>npm run typecheck && npm run lint</automated>
  </verify>
  <done>
All 24 Tier 3 token names equal the wow-classic-items name for their wowhead_id, all 24 keep
slot 'Token', TOKEN_CLASS_MAPPING holds exactly 24 Desecrated keys in the three correct class
groups with no substring collisions and no key naming a non-existent item, all 743 Classic
raid items agree with the package including 19884, the four classified Desecrated names still
resolve to the Warrior/Rogue group, and typecheck plus lint pass. One atomic commit with the
required trailer.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Lock Classic raid item names and token class lists with a regression suite</name>
  <files>data/__tests__/classic-wow-raids.test.ts</files>
  <behavior>
    - Every item in every raid of `classicRaids` has a wowhead_id that exists in wow-classic-items, and its name, normalised, equals the package name for that id. Pre-fix this reports 21 failures (20 token names plus the Jin'do spelling), post-fix zero. Verified during planning: 743 items, 7 raids, 0 mismatches after the fix.
    - Normalisation strips a trailing parenthetical suffix first, then lowercases and strips non-alphanumerics, so deliberate suffixes like "(Heroic)", "(Main Hand)", "(Off Hand)" and apostrophe variants like "Ikfirus' Sack of Wonder" are tolerated. Classic itself needs none of that tolerance today, but the same helper is what any future TBC or Wrath extension of this suite would need, so it is written once and correctly.
    - The Naxxramas group named "Tier 3 Tokens" contains exactly 24 items.
    - For each of the 24 rows of the authoritative table: the group contains an item with that wowhead_id, its name is exactly the expected name, and its slot is 'Token'.
    - For each of the 24 names: getTokenClasses(name) returns exactly the expected class list, compared order-insensitively so the declaration order in TOKEN_CLASS_MAPPING is not load-bearing.
    - No TOKEN_CLASS_MAPPING key is a substring of any other key, because getTokenClasses matches with `includes` and returns the first hit.
  </behavior>
  <action>
Create data/__tests__/classic-wow-raids.test.ts, following the style of the neighbouring
data/__tests__/tbc-raids.test.ts: a header comment citing GH-269 that says what went wrong and
why the file exists, then describe blocks with it.each tables.

The header comment must also record that every expectation in this file is transcribed from
Wowhead and the wow-classic-items package, independently of data/classic-wow-raids.ts, which
is what makes it a real regression guard rather than a restatement of the data. State the RED
evidence measured during planning: run against the pre-fix data this suite reports 20 wrong
token names plus one wrong spelling. The executor does not need to reproduce RED by checking
out the old tree, because Task 1 has already landed; it must instead confirm the table in this
file was typed from the authoritative table in the plan and not read back out of the source file.

Imports: describe, it and expect from vitest; classicRaids and naxxramas from
'../classic-wow-raids'; TOKEN_CLASS_MAPPING and getTokenClasses from '../token-class-mapping';
Items from 'wow-classic-items'. The package is already a dependency, pinned at ^2.0.1, so no
install step and no new dependency.

Build the id-to-name lookup once at module scope with a plain for-of loop over
`new Items({ iconSrc: false })`, pushing each itemId and name into a Map. Pass iconSrc false
so the constructor skips building 38k icon URLs, and use the loop rather than .map so nothing
depends on how the package's Array subclass handles species construction. Planning confirmed
this import typechecks under the repo tsconfig and loads under tsx and Node.

Write the normalisation helper as a single small function so assertion (a) and any future
caller share it. For assertion (a), do NOT use it.each over 743 items. Follow the collect-then-
assert shape the TBC suite already uses for its icon check: one test that collects every id
missing from the package into an array and expects an empty array with a readable message,
and one test that collects every normalised-name disagreement into an array of readable
strings and expects an empty array. Planning verified both are empty post-fix, so no skip list
or allow list is needed and none should be added. If either test fails, the data is wrong, not
the test.

For assertions (b) and (c), declare one local constant holding the 24 rows as
[wowhead_id, name, classes] tuples in ascending id order, typed, transcribed from the
authoritative table. Use it.each over that constant for the id-to-name-and-slot test and again
for the getTokenClasses test. Compare class lists with sorted copies on both sides. Add the
separate exactly-24 test on the group, and the substring-collision test over
Object.keys(TOKEN_CLASS_MAPPING).

No em dashes anywhere in the file. Do not modify data/__tests__/tbc-raids.test.ts or any
source file in this task.

Commit subject: `test(data): lock classic raid item names to wow-classic-items and Wowhead token classes (#269)`
  </action>
  <verify>
    <automated>npx vitest run data</automated>
    <automated>npm run typecheck && npm run lint</automated>
    <automated>
T=data/__tests__/classic-wow-raids.test.ts
N=$(grep -oE '\b223(49|5[0-9]|6[0-9]|7[0-2])\b' "$T" | sort -u | wc -l | tr -d ' ')
test "$N" -eq 24 || { echo "FAIL: suite names $N of the 24 token ids, expected 24"; exit 1; }
grep -q '269' "$T" || { echo "FAIL: suite does not cite the issue"; exit 1; }
echo OK
    </automated>
  </verify>
  <done>
`npx vitest run data` passes with both the existing TBC suite and the new Classic suite green,
the new file asserts all 24 token ids by name and slot plus all 24 class lists plus the
substring-collision invariant plus every Classic item name against the package, typecheck and
lint pass, and the suite's own table lists all 24 ids. One atomic commit with the required
trailer.
  </done>
</task>

<task type="auto">
  <name>Task 3: Relabel the already-seeded token rows and rebuild their class rows</name>
  <files>supabase/migrations/20260913000000_fix_naxx_token_names.sql</files>
  <precondition>supabase/migrations/ contains no file dated 20260913000000 or later, so this migration sorts last in apply order. Latest existing file is 20260827000000_guild_funnel_milestones.sql.</precondition>
  <action>
Create one new migration file, supabase/migrations/20260913000000_fix_naxx_token_names.sql,
written in the style of 20260825000000_dedupe_raid_events.sql: a header comment block that
cites GH-269 and explains the defect and the repair strategy, then numbered steps each
introduced by its own comment. Line comments only, prefixed with a double hyphen, no block
comment syntax, and no em dashes anywhere including inside comments.

The migration repairs the 9 guild Naxxramas tiers already seeded from the bad data. Do not run
it here against any database: the orchestrator deploys it through the repo's normal push, and
migrations auto-deploy roughly 12 seconds after merge. Verification for this task is static only.

Step 1. Create a temp mapping table named _naxx_t3 with ON COMMIT DROP, exactly as the dedupe
migration creates its temp table, with columns wowhead_id integer primary key, correct_name
text not null, old_name text not null, classes text array not null. Insert exactly 24 rows,
one per row of the authoritative table in the plan, in ascending id order, with the classes
column as a text array literal listing the class names as they appear in wow_classes.

Step 2. Re-point loot_submission_items to preserve what the player actually picked. This must
run BEFORE the rename, while the stale label is still on the row. For each submission item
whose loot_item_id points at a source row in scope, find the target row in the SAME
raid_tier_id whose correct_name equals the source row's old_name, and set loot_item_id to that
target. Express it as a single UPDATE with a FROM clause joining: the source loot_items row,
its mapping row m, a second mapping row t whose correct_name equals m.old_name, and the target
loot_items row on t.wowhead_id with item_slot 'Token' and raid_tier_id equal to the source's
raid_tier_id. Guard the statement with: source item_slot is 'Token', source wowhead_id between
22349 and 22372, source name still equals m.old_name, m.old_name is different from
m.correct_name, and target id is different from source id.

Those guards carry the whole safety argument, so do not drop any of them:
  - The name equality guard is what makes the step idempotent. On a second run the rows already
    carry correct_name, so nothing matches and nothing moves.
  - The old_name versus correct_name guard turns the four already-correct ids into no-ops.
  - Joining t on correct_name equals old_name is what drops id 22354 (old label
    "Desecrated Mantle"), because no real item carries that name. Submissions pointing at 22354
    are deliberately left alone, which is the plan's stated decision.
  - Requiring raid_tier_id equality, with a plain equality and not a null-tolerant comparison,
    confines every move to one guild's own tier. Rows with a null raid_tier_id are deliberately
    skipped, because there is no way to scope them to a single guild and a cross-guild move
    would be far worse than a stale label. State that in the step's comment.
The unique constraint on loot_submission_items is (submission_id, rank, slot), so re-pointing
loot_item_id cannot violate it, and the old-to-new name mapping is a bijection so two items in
one submission cannot collide on the same target. Note that in the comment too.

Step 3. Rename in place. One UPDATE on loot_items setting name to m.correct_name, joined to
_naxx_t3 on wowhead_id, filtered to item_slot 'Token' and wowhead_id between 22349 and 22372,
and skipping rows whose name already equals correct_name so a second run is a no-op. Change
nothing else on the row: not wowhead_id, not classification, not allocation_cost, not
icon_url, not is_available, not notes. Add a comment saying each row keeps its wowhead_id on
purpose, because loot_history and the addon award path resolve by id and are therefore already
correct.

Step 4. Rebuild the class rows. First DELETE from loot_item_classes every row whose
loot_item_id points at a loot_items row in scope, using the same _naxx_t3 join and the same
item_slot filter. Then INSERT one row per allowed class: select the loot_items id, the
wow_classes id, null for spec_id and the literal 'primary' for spec_type, from loot_items
joined to _naxx_t3 on wowhead_id and joined to wow_classes on wow_classes.name being ANY of
m.classes, filtered to item_slot 'Token'. Use the ANY form against the array rather than an
unnest in the FROM clause, so the statement references no table beyond the four allowed ones
and the temp table. That reproduces exactly what expansionSeeder writes for tokens: one row
per allowed class, spec_id null, spec_type 'primary', class id resolved by joining wow_classes
on name. Delete-then-insert is what makes this step idempotent. Add a comment recording that
the unique constraint is (loot_item_id, spec_id, spec_type) with spec_id null, that Postgres
treats those nulls as distinct so the 2 to 4 rows per token do not collide, and that no
conflict clause is therefore needed.

Step 5. A final verification block written as line comments and NOT executed: the queries an
operator can paste into Supabase Studio after deploy to confirm the repair. Include a count of
in-scope loot_items rows whose name disagrees with the authoritative name, which should be
zero, and a per-token count of loot_item_classes rows, which should be 2 for the eight plate
tokens, 4 for the eight mail tokens and 3 for the eight cloth tokens. Add a line stating that
these are aggregate counts only and that no player, character or guild identifying data is to
be pulled into a chat, a commit or any artifact.

Scope discipline for the whole file: no schema mutation of any kind beyond the temp table, no
row level security statement of any kind, no privilege statement, no truncation, and no table
referenced other than loot_items, loot_item_classes, loot_submission_items, wow_classes and
_naxx_t3. The verify commands below enforce each of those mechanically. Do not touch any other
file in this task, and in particular do not touch scripts/, README.md or .planning/phases/.

Commit subject: `fix(db): relabel Naxxramas token loot_items and rebuild their class rows (#269)`
  </action>
  <verify>
    <automated>
M=supabase/migrations/20260913000000_fix_naxx_token_names.sql
test -f "$M" || exit 1
BODY=$(grep -vE '^[[:space:]]*--' "$M")
echo "$BODY" | grep -inE '\b(alter|drop[[:space:]]+table|disable[[:space:]]+row[[:space:]]+level[[:space:]]+security|truncate|grant|revoke|create[[:space:]]+policy|security[[:space:]]+definer)\b' && { echo "FAIL: forbidden statement in migration body"; exit 1; }
echo "$BODY" | grep -ioE '\b(from|join|update|into|using)[[:space:]]+[a-z_][a-z0-9_]*' | awk '{print tolower($2)}' | sort -u | grep -vxE '(loot_items|loot_item_classes|loot_submission_items|wow_classes|_naxx_t3)' && { echo "FAIL: migration references a table outside the allowlist"; exit 1; }
test "$(grep -cE '^[[:space:]]*\(223[0-9]{2},' "$M")" -eq 24 || { echo "FAIL: mapping table does not hold exactly 24 rows"; exit 1; }
test "$(echo "$BODY" | grep -c '_naxx_t3')" -ge 5 || { echo "FAIL: not every statement is scoped through the mapping table"; exit 1; }
test "$(echo "$BODY" | grep -c 'ON COMMIT DROP')" -eq 1 || { echo "FAIL: temp mapping table is not ON COMMIT DROP"; exit 1; }
test "$(echo "$BODY" | grep -c "item_slot = 'Token'")" -ge 4 || { echo "FAIL: a statement is not scoped to token rows"; exit 1; }
echo OK
    </automated>
    <automated>
M=supabase/migrations/20260913000000_fix_naxx_token_names.sql
DASH=$(printf '\xe2\x80\x94')
test "$(grep -c "$DASH" "$M")" -eq 0 || { echo "FAIL: long dash found in migration"; exit 1; }
test "$(grep -c "$DASH" data/__tests__/classic-wow-raids.test.ts)" -eq 0 || { echo "FAIL: long dash found in test file"; exit 1; }
grep -q '269' "$M" || { echo "FAIL: migration does not cite the issue"; exit 1; }
echo OK
    </automated>
    <automated>npx vitest run data && npm run typecheck</automated>
  </verify>
  <done>
The migration exists, sorts last, holds a 24-row ON COMMIT DROP mapping table, re-points
submissions before renaming, renames in place without touching classification or
allocation_cost, rebuilds class rows by delete-then-insert, carries a commented-out aggregate
verification block, references no table outside the four allowed plus the temp table, contains
no schema, privilege or row level security statement, cites GH-269 and contains no long dash.
It has NOT been run against any database. One atomic commit with the required trailer.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| migration role to guild-owned rows | The migration runs with a role that bypasses row level security, so its own WHERE clauses are the only thing standing between one guild's data and another's. |
| seed data to guild database | data/classic-wow-raids.ts and data/token-class-mapping.ts are copied into each guild's loot_items and loot_item_classes at seed time, so a wrong value here becomes wrong rows in every guild that seeds afterwards. This is exactly how GH-269 spread to 9 tiers. |
| npm dependency to test process | wow-classic-items reads a bundled JSON file from disk at import time inside the test run. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-269-01 | Tampering | Step 2 UPDATE on loot_submission_items | high | mitigate | The target row is joined on `raid_tier_id` equality with plain equality, not a null-tolerant comparison, so a re-point can never cross a raid tier and therefore never crosses a guild. Null-tier rows are skipped by construction. The `source.name = m.old_name` guard means only rows still carrying the stale label move, which also makes a second run a no-op. |
| T-269-02 | Tampering | Step 4 DELETE on loot_item_classes | medium | mitigate | The delete is joined through _naxx_t3 and filtered to `item_slot = 'Token'`, so it can only remove class rows belonging to the 24 token items, and the insert in the same step rebuilds them from the authoritative table before the transaction commits. Officer-tuned fields on loot_items (classification, allocation_cost, notes) are explicitly not in any SET clause. |
| T-269-03 | Elevation of Privilege | migration role | high | mitigate | The file contains plain DML plus one temp table and nothing else. The verify gate greps the comment-stripped body and fails on any schema mutation, policy creation, privilege grant, security definer function or row level security statement, so row level security cannot be weakened by this change. |
| T-269-04 | Information Disclosure | Step 5 verification queries | medium | mitigate | The verification queries ship commented out and are never executed by the migration. They select aggregate counts only, no character, player or guild identifying columns, and the file states that these counts are the only thing to be reported. No production row is read into this workflow, a chat transcript, a commit or a SUMMARY. |
| T-269-05 | Tampering | getTokenClasses substring lookup | medium | mitigate | A TOKEN_CLASS_MAPPING key that is a substring of another key would silently hand the wrong class restriction to the seeder for every future guild. Task 1 verifies zero collisions mechanically and Task 2 locks it as a permanent test assertion. |
| T-269-06 | Repudiation | already-awarded loot | low | accept | 204 existing loot_history rows point at these items. Because the repair changes names and never ids, and the award and import paths resolve by wowhead_id, every historical award keeps pointing at the item that was actually awarded. No history is rewritten, so there is nothing to repudiate. |
| T-269-SC | Tampering | npm, pip, cargo installs | low | accept | No package is installed by this plan. wow-classic-items is already a committed dependency at ^2.0.1 in package.json and package-lock.json, already resolved in node_modules, and is used at test time only. No package legitimacy checkpoint is required because there is no install task. |
</threat_model>

<verification>
1. `npx vitest run data` passes, with the pre-existing TBC suite and the new Classic suite
   both green and no skipped tests.
2. `npm run typecheck` exits 0.
3. `npm run lint` exits 0. If it reports a failure in a file none of these three tasks touched,
   do not chase it: record it in the SUMMARY as pre-existing and continue.
4. The Task 3 static gates pass: no forbidden statement in the comment-stripped migration body,
   no table referenced outside loot_items, loot_item_classes, loot_submission_items, wow_classes
   and the temp mapping table, exactly 24 mapping rows, one ON COMMIT DROP, and no long dash in
   either the migration or the new test file.
5. `git log --oneline -3` shows exactly three new commits with the subjects named in the tasks,
   each carrying the attribution trailer, each touching only its own declared files.
6. `git status --short` shows no edits to scripts/analytics/, .planning/phases/, README.md,
   .env.local, .env.example, app/, domain/ or utils/.
7. The migration has not been executed against any database from this workflow. Confirm no
   `supabase db push`, no `scripts/run-sql.ts` invocation and no Supabase Management API call
   was made.
8. Human check, non-blocking, recorded in the SUMMARY rather than gating the commits: after the
   orchestrator merges and the migration auto-deploys, an officer on an already-seeded
   Naxxramas tier opens the Tier 3 Tokens list and sees each row's name match the tooltip it
   opens, and a raider whose class is on the token can add it to a loot list. Report the
   outcome as a yes or no plus aggregate counts only.
</verification>

<success_criteria>
- Every Naxxramas Tier 3 token in the seed data names the item its wowhead_id actually points
  at, so a new guild seeding Naxxramas today gets a correct list.
- Class restrictions on all 24 tokens match Wowhead: two classes on the plate set, four on the
  mail set, three on the cloth set, so raiders can add the tokens again.
- A regression suite fails the moment any Classic raid item name drifts from wow-classic-items,
  any of the 24 token ids gets the wrong name or class list, or a token mapping key becomes a
  substring of another.
- The 9 already-seeded guild tiers are repaired by an idempotent, tightly scoped migration that
  preserves each player's actual pick, leaves officer-tuned classification and allocation cost
  alone, keeps every historical award pointing at the right item, and changes no schema and no
  row level security policy.
- Three atomic commits, each naming GH-269.
- No production data was read, displayed or copied into this workflow.
</success_criteria>

<output>
Create `.planning/quick/260913-oer-fix-269-naxxramas-tier-3-token-names-and/260913-oer-SUMMARY.md` when done.

Record in it:
- The vitest count for `npx vitest run data` before and after, and the `npm run lint` result
  including any failure judged pre-existing.
- That the migration was written but deliberately NOT executed, and that deployment happens
  through the orchestrator's normal push, with migrations auto-deploying roughly 12 seconds
  after merge. Note the repo convention that a migration-only PR needs an admin merge.
- The deploy note for affected guilds: the 9 seeded tiers keep their rows and ids, so loot
  history and awards are untouched. Token labels change to the correct names on the next page
  load, class restrictions are rebuilt, and any raider who had picked the token formerly shown
  as "Desecrated Mantle" keeps that pick pointing at id 22354, now correctly labelled
  "Desecrated Pauldrons", because no real item carries the old label.
- The deliberate follow-up left open: data/classic-item-roles.ts still keys the Zul'Gurub staff
  by the old spelling, which is out of scope for GH-269.
- Which attribution trailer was actually used, since the brief and the environment may specify
  different ones.
- Whether the post-deploy human check in step 8 of `<verification>` was run, and its result as
  a yes or no plus aggregate counts only, with no guild, character or player identifiers.
</output>
