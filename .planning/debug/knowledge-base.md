# Debug Knowledge Base

Patterns extracted from resolved `/gsd-debug` sessions. Check here first: a matching
signature can collapse a full investigation into a single confirmation.

---

## KB-001 — A resolved setting used to bound a fetch must also be threaded into the engine that scores it

**Session:** `.planning/debug/resolved/deleted-team-attendance-zero.md` (2026-09-02)
**Area:** attendance scoring, raid-team setting resolution
**Bug class:** Bohrbug (deterministic, reproduces on every load)

### Signature

- A metric reads **zero with a zero denominator** ("0 of 0"), not a wrong non-zero value
- The wrongness is **uniform across every row/user**, a constant delta rather than scattered
- **Some surfaces are correct and some are not**, and the correct ones are exactly those that
  either ignore the scoped override or thread it correctly (here: addon export and Discord bot
  were right; Overview, Master Sheet and the attendance page were wrong)
- No error anywhere; the empty result renders as ordinary "nothing yet" copy

### Root cause pattern

One logical window, two independent computations. Each web surface resolved the team's
`rolling_weeks_override`, used it to bound the `raid_events` **fetch**, and then passed the
**guild's** settings object as `computeAttendance`'s `config`. Fetch window and scoring window
could therefore disagree. A second defect supplied the disagreement: `rolling_weeks_override = 0`
was storable (input `min={0}`, no API validation, no DB CHECK, `resolveRollingWeeks` passed it
through), and a zero-week window makes `getAttendanceWindowStart` return `windowEnd + 1` — a
start after the end.

Both were required. A sane override hid the code drift; correct threading would have made the
bad override visible as a consistently narrow window instead of a silent zero.

### Generalizable lessons

1. **Pair the window with its consumer.** If a value bounds a query, return it and the derived
   bound together from one function so a caller cannot fetch by one and score by another.
   `resolveAttendanceWindow()` exists for this: it returns `{ rollingWeeks, fetchStart }`.
2. **"Inherit" must have exactly one representation.** The field's contract was "leave empty to
   inherit", so `null` means inherit and `0` means nothing at all. A value with no defined
   meaning that still typechecks will eventually be stored. Reject it at the write boundary,
   normalize it on read, and make the UI incapable of producing it.
3. **A browser number input with `min={0}` will produce 0.** A stepper click on an empty field
   lands on the floor. The floor should be the smallest *meaningful* value.
4. **Surface asymmetry localizes the defect faster than any single surface.** "Why is the export
   right when the page is wrong?" pointed at the exact line. Diff the working path against the
   broken one before reading either in depth.
5. **A test can encode the bug.** `settings.test.ts` asserted `resolveRollingWeeks(4, 0) === 0`
   with the comment "0 is a valid override (e.g., no rolling window)". Nothing in docs,
   migrations, or the UI supported that. When a fix requires inverting an assertion, check
   whether the assertion was ever a product decision or just an unexamined edge case, and get
   sign-off before flipping it.

### Watch for the same shape elsewhere

- The **raid-days-per-week** override input also uses `min={0}`. Explicitly out of scope for the
  session (different symptom: an empty `raidDays` array disables the day filter rather than
  emptying the result), but it is the same input-floor defect and is worth auditing.
- Any other place that pre-filters rows by date before handing them to a domain engine that also
  computes its own window.

### Investigation notes worth reusing

- **Arithmetic elimination beat a production query.** The stored value was pinned to exactly `0`
  by testing each candidate against the reported dates: `null`/`2` leave ≥3 of 4 events in range,
  `1` leaves 1, only `0` leaves none. This satisfied the org data policy (no customer rows pulled
  into the session) and was faster than obtaining prod access.
- **The intake hypothesis was wrong and cost nothing to kill.** "Deleting a raid team orphaned the
  events" died on two schema facts: the FK is `ON DELETE SET NULL`, and `resolveOwnedEvents`
  explicitly *includes* null-team events. Read the FK actions and the filter before theorizing
  about orphaned rows. The deletion was the *occasion* (it prompted the officer to open the team
  editor and "reset" it), not the cause — beware trigger/cause conflation in user reports.

### Open residual risk on this session

Production verification is **pending post-deploy**. If the Overview shows a **non-zero but wrong**
denominator after deploy, the stored override was not `0`/negative: fix (a) did not apply to that
guild, only the fetch-vs-score fixes (b)/(c) did. Reopen on the window pairing, not on the
override value.

---

## KB-002 — A shared primitive using client-only React without `'use client'` is a landmine armed by its first Server Component importer

**Session:** `.planning/workstreams/design-system/debug/resolved/blog-build-createcontext.md` (2026-09-21)
**Area:** Next.js App Router RSC/client boundary, `components/ui` design-system primitives
**Bug class:** Bohrbug (fully deterministic; only the *reported* route varies)
**Fix commit:** `50a91c9e`

### Signature

- `npm run build` dies in **"Collecting page data"** with `TypeError: <x>.createContext is not a
  function` (or `.useState` / `.useEffect` / `.useContext` / `.useRef`), never at dev time
- The **failing route differs on every run** but is always from the same family, and exactly one
  route fails per build — this looks like a bundler race and is not one
- The stack has no app frames, only `module evaluation` inside a minified
  `.next/server/chunks/ssr/[root-of-the-server]__<hash>._.js` plus turbopack runtime frames
- `node_modules` has exactly **one** copy of React, so the usual "two Reacts" answer is wrong

### Root cause pattern

React ships two builds. `react/package.json` maps the `react-server` export condition to
`react/react.react-server.js`, whose export surface **omits `createContext`, `useContext`,
`useState`, `useEffect` and `useRef`** while keeping `forwardRef`, `memo`, `useMemo`,
`useCallback`, `useId` and `createElement`. Any module Turbopack compiles into the RSC server
layer that touches the first set throws at module evaluation.

`'use client'` is what keeps a module out of that layer. `components/ui/card.tsx` used
`React.createContext` to pass its `variant` down to `CardHeader`/`CardContent`/`CardFooter` but
never declared the directive. That was harmless for seven months because every importer happened
to be a client component. Commit `5688967e` added the first genuine Server Component importers
(`BlogRelatedPosts`, `app/blog`, `app/research`, `app/customers`) and armed it.

**Two conditions, both required** — the primitive uses client-only React AND a real Server
Component reaches it. Neither alone produces a symptom, which is why the defect and the commit
that surfaced it are seven months apart. Do not bisect for "what broke it" when the code has
been latent; bisect for *who first imported it from the server*.

### Generalizable lessons

1. **A nondeterministic failing route with a deterministic failing module is reporting order,
   not a race.** Next.js collects page data across 9 parallel workers and aborts on the first
   reported failure. Before theorizing about concurrency, ask: how many routes reach this
   module? If the answer is "all of them", the nondeterminism is cosmetic.
2. **Read the minified chunk at the exact byte offset in the stack.** `:1:1491` resolved
   straight to card.tsx's compiled body — recognizable by its verbatim Tailwind class strings.
   That single read replaced an entire hypothesis tree.
3. **Source-map layer analysis names the boundary objectively.** Parsing every `.map` under
   `.next/server/chunks/` shows which files are *real modules* in `[root-of-the-server]__*`
   chunks versus mere `__nextjs-internal-proxy.mjs` client references. A `'use client'` peer
   appears only as a proxy. That is how you prove which layer a file landed in.
4. **Find the working control and diff it.** `components/ui/modal.tsx` also calls
   `createContext` and never fails — because it has the directive. One working sibling turns a
   hypothesis into a differential test.
5. **Derive the oracle, do not hardcode it.** The regression test reads the installed
   `react-server` build's real export list at test time instead of hardcoding a forbidden-API
   set, so it follows React upgrades. It also asserts boundary neighbours in both directions
   (`forwardRef`/`memo`/`useMemo` must be **present**) so server-safe primitives are provably
   not over-flagged, plus self-guards (scanner must resolve React, scan >20 files, detect >5
   unsafe modules) so a broken scanner cannot pass vacuously.
6. **Fix the class, not the instance.** The session swept the whole tree and found
   `app/components/ItemLink.tsx` carrying the identical latent defect — safe only by the
   accident that all 21 of its importers are client components. Shipped in the same commit.

### Watch for the same shape elsewhere

- Any new `components/ui` primitive that reaches for context to share state with sub-components.
  Context is the specific temptation here: it is the natural way to write a compound component
  and it is exactly what the server build refuses.
- The contract test now covers `components/ui`, `app/components` and `app/contexts`. A new
  top-level source directory is **not** scanned until it is added to that test's roots.
- The same trap exists for any dependency that resolves export conditions (`react-dom`,
  libraries shipping a `react-server` entry). The test only guards first-party files.

### Investigation notes worth reusing

- **"Only one copy of React" eliminates the common cause, not the error class.** The same
  message is produced by a single React resolved under a different export condition. When the
  duplicate-React check comes back clean, pivot to *which build* is being loaded, not *how many*.
- **`node -e "Object.keys(require('react/react.react-server.js'))"`** prints the server build's
  real export surface in one line. Do this before reasoning about what should or should not work
  in an RSC.
- `forwardRef` surviving is a useful tell: the crash lands precisely on the `createContext` line
  rather than earlier, which pins the offending call instead of the whole file.

### Process note worth reusing

Phase 10 hit this red build and routed around it — WINDOWS.md entry 19 recorded a substituted
proof (direct `tailwindcss` CLI compile) in place of `npm run build`, correctly scoped as
"pre-existing, phase-unrelated". That was the right call for the phase and it also meant a
repo-wide broken production build sat open for a day. When a deviation's reason is "the build is
already broken for unrelated reasons", that is itself a P0 finding, not just a footnote on the
current task.

---

## KB-003 — A static catalog copied into each guild at seed time: a data fix alone never reaches existing guilds

**Session:** `.planning/debug/resolved/era-aq40-bwl-missing-loot.md` (2026-09-26 to 2026-09-28, GH #273)
**Area:** raid loot catalogs (`data/*-raids.ts`), `app/services/expansionSeeder.ts`, per-guild `loot_items`
**Bug class:** Bohrbug (deterministic data omission, latent since the 2026-01-09 catalog rewrite)
**Fix:** PR #275 (catalog, `605499dd`) then PR #282 (backfill migration, `f1c9beee`)

### Signature

- A raider **and** an officer both fail to find an item: the raider picker says "No items found",
  and the officer item table has **no row at all** (not a row switched off)
- Other items from the **same raid and boss** show fine, so the tier is active and no filter is at fault
- The reported items share a category the catalog never modelled: non-equippable tokens,
  trash (no boss) drops, shared-boss drops
- The id is absent from `data/<expansion>-raids.ts`

### Root cause pattern

`expansionSeeder` copies the static catalog into each guild's own `raid_tiers` / `loot_items`
when the guild adds the expansion. A curated rewrite kept only equippable, single-boss epics, so
whole categories were never seeded. Because of the copy-at-seed design, **fixing the data file
only helps guilds created after the deploy**. Existing guilds need a per-guild backfill migration.
The existing id/name agreement test (#269) could not see omissions.

### Generalizable lessons

1. **"No row" versus "row switched off" splits catalog bugs from settings bugs.** Ask for, or
   look at, the officer item table before reading any query code.
2. **Diff the catalog against two independent sources** (`wow-classic-items` zone attribution
   and AtlasLoot). Where they agree, it is a real miss; items only one source lists need a decision.
   The package leaves `source.zone` blank for many drops (Onyxia, caches, recipes), so a
   package-only completeness gate has blind spots (#278).
3. **Ship the catalog before the backfill.** Migrations deploy about 12s after merge, while the
   seeder change goes live only after the Vercel deploy. Guilds created in that gap get the old
   catalog and are never backfilled. Two PRs, merged in order, close the gap.
4. **Guard backfills on id and on name plus boss.** Early catalogs stored some items under wrong
   ids. Matching name alone breaks on items that share a name across bosses (Bindings of the
   Windseeker halves).
5. **Make the migration equal the seeder, and test it.** The parity test runs the real seeder
   against an in-memory fake and asserts the migration's rows and token class rows match.
6. **Adding an item can switch on a dormant rule.** Class mappings for items that were never
   seeded (Imperial Qiraji Armaments/Regalia) had never been exercised and were wrong.
