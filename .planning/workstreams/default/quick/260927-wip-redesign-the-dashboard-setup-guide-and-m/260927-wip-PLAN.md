---
phase: quick-260927-wip
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - "app/(app)/overview/components/SetupGuide.tsx"
  - "app/(app)/overview/components/__tests__/SetupGuide.test.tsx"
  - "app/(app)/overview/components/DashboardContent.tsx"
  - "domain/expansion/game.ts"
  - "domain/expansion/__tests__/game.test.ts"
autonomous: true
requirements:
  - SG-01
  - SG-02
  - SG-03

estimate:
  # No calibration consulted: the gsd-tools estimate-calibration command lives
  # in the main checkout, which this session must not touch. Factor 1, 0
  # samples, confidence low, so tokens equals raw_tokens. Comparable quick
  # task 260927-sfi (9 files, 3 tasks) was planned at 90k.
  tokens: 60000
  raw_tokens: 60000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "D-01: the setup guide progress is ONE continuous track whose single accent fill is (done / total) wide, so the live Forever case (steps 1 and 3 done, step 2 current, 2 of 5) reads as a 40% bar with no gap and no dim segment. The track is role=progressbar with aria-valuenow=done, aria-valuemax=total, aria-valuetext reusing the existing 'N of M steps done' string, and is labelled by the existing 'Set up {guild}' heading."
    - "D-01: done rows have no strikethrough and no opacity dimming; the title uses text-foreground-secondary (AA in both themes: about 8:1 light, 7:1 dark); the status slot is a solid success disc with a check; the row is not a button and not focusable; visually hidden text announces it as done. The completed-step description line is dropped so every collapsed row is one line."
    - "D-01: every row uses one anatomy: a fixed 24px status slot (check, number or clock), the title in a column that starts at the same x on every row, a trailing chevron only on actionable rows (current and upcoming), and the same minimum row height. Actionable rows are real <button> elements with aria-expanded. The current step (first incomplete step that is not waiting) carries aria-current=step and a thin left accent bar instead of the tinted card, and expands in place with its existing description and CTA aligned to the title column."
    - "D-03: for a Forever guild whose active expansion has no raid tiers, 'Get your first loot lists' and 'Log your first raid' render as waiting rows: clock icon, readable muted title, the exact text 'Not available for WoW Forever yet', no chevron, not a button, never marked current. They still count toward M in 'N of M steps done' (live case reads 2 of 5). Once a raid tier exists they behave as normal steps. Classic guilds never show a waiting row."
    - "D-02: for a Forever guild whose active expansion has no raid tiers (or whose tiers are still loading), the overview hides the Insights row (Score breakdown, Attendance, Trial progress or Next raid), the Next in line and Recently received grid, and their loading skeleton, leaving the setup guide and the 'No raids yet' card with no empty gap. The cards return automatically when a raid tier exists. Classic guilds render exactly as today."
    - "No flip on load: while a Forever guild's raid tiers are still loading, the setup guide renders nothing (as it already does while its own progress loads), so rows 4 and 5 never switch from numbered to waiting on screen. Classic guilds are not delayed."
    - "D-04: the only new visible string is 'Not available for WoW Forever yet'; header, step titles, descriptions, CTAs, hrefs, completion logic, dismiss and celebration behavior are unchanged; no added line contains an em dash."
  artifacts:
    - "app/(app)/overview/components/SetupGuide.tsx: redesigned rows and progress bar, raidTierStatus prop, waiting state (Task 1)"
    - "app/(app)/overview/components/__tests__/SetupGuide.test.tsx: new component test covering done, current, upcoming, waiting, progress by count, Classic unchanged, Forever loading (Task 1)"
    - "domain/expansion/game.ts: RaidTierStatus type (Task 1) and hidesRaidDependentCards(game, status) (Task 2)"
    - "domain/expansion/__tests__/game.test.ts: hidesRaidDependentCards table (Task 2)"
    - "app/(app)/overview/components/DashboardContent.tsx: raidTierStatus derived from the existing loading and noRaidTiers state and passed to SetupGuide (Task 1); hideRaidCards guards on the skeleton, Insights row and loot grid (Task 2)"
  key_links:
    - "DashboardContent loadData: raid_tiers query -> setNoRaidTiers and setLoading(false) -> raidTierStatus ('loading' | 'none' | 'available') -> SetupGuide prop and hidesRaidDependentCards"
    - "SetupGuide: getGuildGame(activeGuild) === 'forever' AND raidTierStatus === 'none' -> waiting rows for the 'submissions' and 'raid' step ids; 'loading' -> render nothing"
    - "hidesRaidDependentCards(getGuildGame(activeGuild), raidTierStatus) -> hideRaidCards -> three render guards; NoRaidsEmptyState condition (noRaidTiers && !error) unchanged"
---

<objective>
Redesign the overview setup guide so it stops reading as broken, for every guild (Classic and Forever), and make the WoW Forever overview raid-aware. Locked decisions from the user (2026-09-27), cited below as:

- D-01 (SG-01): setup guide redesign for all guilds. One continuous progress fill by count; done rows readable (AA), no strikethrough, solid success check; one row anatomy for every state; current step marked by a subtle left accent and expanded in place; header, close, steps, completion logic, copy, links and analytics unchanged. Fewer elements, not more.
- D-02 (SG-03): Forever guild AND active expansion has no raid tiers: hide Attendance, Next raid, Next in line and Recently received (the Forever overview shows only the setup guide and the "No raids yet" card). They return once a raid tier exists. Classic unchanged. No layout gap.
- D-03 (SG-02): Forever guild AND no raid tiers: setup steps 4 and 5 (loot lists, first raid) show a waiting state: clock icon, muted but readable title, not clickable, no chevron, text exactly `Not available for WoW Forever yet`. Waiting steps still count toward M in "N of M steps done". Normal once raid tiers exist. Classic unchanged.
- D-04: the only new user-facing string is `Not available for WoW Forever yet` (approved). No other copy changes. No em dashes.

Visual design chosen (Claude's discretion inside D-01):
- Progress: a single h-1.5 rounded track (bg-muted) with one accent fill at (done / total) width. Chosen over count-filled segments because one element cannot imply "segment N = step N" and so can never show a gap.
- Row anatomy: every row is min-h-11 (44px), left padding so the 24px status slot's left edge lines up with the header avatar (20px from the card edge), then gap-3, then the title column, then a chevron only on actionable rows. Status slot: done = solid success disc with a check; current = accent disc with its number (today's treatment); upcoming = muted disc with its number; waiting = bare clock glyph. The done-row description line is dropped (D-01 allows it) so collapsed rows are all one line.
- Current step: a 2px rounded accent bar on the row's left edge spanning the header and its expanded panel, replacing the tinted card; the panel's left padding equals the title column offset so description and CTA sit under the title.
- Waiting: clock slot, title in text-muted-foreground, note in 11px text-muted-foreground, trailing on the same line from sm up and wrapping under the title below sm (it cannot fit beside the title at 390px). No chevron, no button.

Tracer note: the orchestrator fixed this quick task at two tasks. Task 1 is already an end-to-end slice (DashboardContent tier signal -> game.ts type -> SetupGuide -> rendered rows, proven by a component test), so no separate tracer task is added.

Purpose: officers judge the product by its first screen; a guide that reads as broken, and Forever cards that can only ever be empty, undercut activation.
Output: redesigned SetupGuide.tsx with a new component test; a two-export addition to domain/expansion/game.ts with tests; three render guards and one prop in DashboardContent.tsx.
</objective>

<execution_context>
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/workflows/execute-plan.md
@/Users/alexander.mayes/Code/personal/loot-list-plus/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
Code worktree (all paths below are relative to it; run every command from it):
/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/8235b620-ae38-4661-a5c0-23f69fed77f3/scratchpad/wt-setup-guide
(branch feat/setup-guide-redesign, based on origin/main 21853a3f)

Do NOT read or touch /Users/alexander.mayes/Code/personal/loot-list-plus (main checkout, another session). Use only Tailwind classes and tokens that exist on origin/main (for example text-[11px], text-foreground-secondary, text-muted-foreground, bg-success, text-success-foreground, bg-accent, ring-ring). No local-main-only design-system tokens.

@app/(app)/overview/components/SetupGuide.tsx
@app/(app)/overview/components/DashboardContent.tsx (lines 367-375 state, 640-722 loadData, 1837-1845 heroReady, 1974-1982 SetupGuide render, 2030-2471 cards)
@domain/expansion/game.ts
@domain/expansion/__tests__/game.test.ts
@app/components/NoRaidsEmptyState.tsx
@app/(app)/reserve/components/__tests__/CreateReserveRunModal.test.tsx (mocking pattern: vi.hoisted state, supabase client, GuildContext, next/navigation, stubbed fetch)
@/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/8235b620-ae38-4661-a5c0-23f69fed77f3/scratchpad/wt-phase06/.planning/workstreams/default/quick/260926-lj6-separate-wow-forever-from-the-classic-ex/260926-lj6-SUMMARY.md (SetupGuide already drops the expansion step for Forever)

Contrast facts (app/globals.css on origin/main), card = bg-background-elevated:
- light: card #ffffff; text-foreground-secondary and text-muted-foreground are both #574f49 (about 8:1, AA).
- dark: card #141519; text-foreground-secondary and text-muted-foreground are both #a1a1a1 (about 7:1, AA).
- The foreground-muted token is #666666 in dark (about 3.2:1 on the card, FAILS AA for text): never use it for any text in the guide.
- success disc: bg-success with a text-success-foreground check (dark green on green, about 6.8:1).

Existing DashboardContent signals (do not change how they are set):
- noRaidTiers: true once raid_tiers for the active expansion came back empty (line 699).
- loading: initial true, set false in loadData's finally after the tiers query resolves (line 720); never reset to true.
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Setup guide redesign (all guilds) plus Forever waiting steps, with component test</name>
  <files>app/(app)/overview/components/SetupGuide.tsx, app/(app)/overview/components/__tests__/SetupGuide.test.tsx, domain/expansion/game.ts, app/(app)/overview/components/DashboardContent.tsx</files>
  <read_first>
    - app/(app)/overview/components/SetupGuide.tsx (whole file, 405 lines)
    - app/(app)/overview/components/DashboardContent.tsx lines 367-375, 640-722, 1837-1845, 1974-1982 only (file is 2502 lines; do not read it whole)
    - domain/expansion/game.ts (whole file; note the header rule: it must import nothing)
    - app/(app)/reserve/components/__tests__/CreateReserveRunModal.test.tsx lines 1-60 (mock pattern)
  </read_first>
  <behavior>
    Write app/(app)/overview/components/__tests__/SetupGuide.test.tsx FIRST and watch it fail against today's component. Cases:
    - Test 1 (D-01 live regression, Forever, progress by count): Forever guild, raidTierStatus 'none', character present, 1 member (invite not done), first_raid_day set (schedule done), 0 approved submissions, 0 raid events. Expect text '2 of 5 steps done'; exactly one element with role progressbar, aria-valuenow '2', aria-valuemax '5', aria-valuetext '2 of 5 steps done'; that progressbar has exactly one child and its style.width is '40%'.
    - Test 2 (D-01 done rows): in the Test 1 render, 'Create your character' and 'Set your raid schedule' titles are present; queryByRole('button', { name: /Create your character/ }) is null; the rendered container contains no element whose className includes the strikethrough class or the 40% opacity class (assert via container.querySelector for both class names); visually hidden done text is present for each done row.
    - Test 3 (D-01 current row): in the Test 1 render, getByRole('button', { name: 'Invite your raiders' }) has aria-current 'step' and aria-expanded 'true'; its description ('Create an invite link so your raiders can join.' when the invite fetch returns no codes) and the CTA button 'Create invite' are visible; clicking the CTA calls router.push('/guild-settings').
    - Test 4 (D-03 waiting rows): in the Test 1 render, getAllByText('Not available for WoW Forever yet') has length 2; queryByRole('button', { name: /Get your first loot lists/ }) and queryByRole('button', { name: /Log your first raid/ }) are null; no element has aria-current other than the invite row.
    - Test 5 (D-03 all non-waiting steps done): Forever, raidTierStatus 'none', character, 2 members, schedule set. Expect '3 of 5 steps done', no element with aria-current, two waiting notes, and the celebration heading ('... is ready for loot') absent.
    - Test 6 (D-03 raids exist): Forever, raidTierStatus 'available', same data as Test 1. Expect no waiting note, and 'Get your first loot lists' and 'Log your first raid' are buttons with aria-expanded 'false' (upcoming).
    - Test 7 (no flip while loading): Forever, raidTierStatus 'loading'. After the supabase mock's from() has been called for 'raid_events' and state has flushed, queryByRole('heading', { name: /Set up/ }) is null. Rerender with raidTierStatus 'none' and the heading plus two waiting notes appear.
    - Test 8 (Classic unchanged): Classic guild (game 'classic'), raidTierStatus 'none' AND separately 'loading': the guide renders, lists 6 steps including 'Choose your expansion', shows no waiting note, and 'Get your first loot lists' is a button. With character done and expansion done and nothing else, text '2 of 6 steps done' and fill width is (2 / 6 * 100) + '%' computed in the test (do not hardcode a rounded literal).
    - Test 9 (upcoming row keyboard): in a Classic render, focus the 'Set your raid schedule' button, press Enter via userEvent; it gets aria-expanded 'true', its CTA 'Set raid days' appears, and the previously expanded current row reports aria-expanded 'false'.
    - Test 10: document.body.textContent contains no em dash character (build it in the test with String.fromCharCode(0x2014) so the test file itself contains no em dash).
  </behavior>
  <action>
Implements D-01, D-03 and D-04 (and the Forever half of the loading guard). Keep every step id, title, active description, CTA label, href, completion query and rule, the header (avatar, 'Set up {guild}' heading, 'N of M steps done' line, close button), dismiss and celebration logic exactly as they are.

Test file (write first, per the behavior block). Mock like CreateReserveRunModal.test.tsx:
- vi.hoisted state object holding: guild ({ id, game }), activeCharacter (an object or null), memberCount, firstRaidDay, approvedSubmissions, raidEvents, inviteCodes, plus one router push vi.fn.
- vi.mock next/navigation: useRouter returns an object whose push is the hoisted vi.fn.
- vi.mock @/utils/supabase/client: createClient must return the SAME hoisted client object on every call. SetupGuide calls createClient() on every render and lists supabase in its useCallback deps, so a fresh object per call re-runs the fetch effect forever. The client's from is a vi.fn(table) returning a builder where select and eq return the builder, single() resolves { data: { first_raid_day: state.firstRaidDay }, error: null }, and the builder is thenable (a then(resolve) method) resolving { count, error: null } with count picked by table name: character_guild_memberships -> memberCount, loot_submissions -> approvedSubmissions, raid_events -> raidEvents.
- vi.mock @/app/contexts/GuildContext: useGuildContext returns { activeGuild: state.guild, activeCharacter: state.activeCharacter }. Keep both as stable references per test (assign once in the test before render), since activeCharacter is a useCallback dep.
- vi.stubGlobal fetch resolving { ok: true, json: () => Promise.resolve({ invite_codes: state.inviteCodes }) }; vi.unstubAllGlobals in afterEach; localStorage.clear() in beforeEach so the dismissed and celebrated keys never leak between tests.
- Render with guildIconUrl null so next/image is not exercised.

domain/expansion/game.ts: add and export type RaidTierStatus = 'loading' | 'none' | 'available' with a short doc comment: whether the active expansion's raid tiers are still loading, came back empty, or exist. No imports (the file's header rule).

SetupGuide.tsx:
1. Props: add optional raidTierStatus?: RaidTierStatus (type-only import from '@/domain/expansion/game'), default 'available' so any other caller behaves as today.
2. Derived flags at render: foreverRaidsLoading = isForeverGuild && raidTierStatus === 'loading'; foreverAwaitingRaids = isForeverGuild && raidTierStatus === 'none'. A step is waiting when foreverAwaitingRaids is true, the step is not complete, and its id is 'submissions' or 'raid' (D-03; a completed step always renders as done). Define the approved note once as a module-level constant FOREVER_WAITING_NOTE = 'Not available for WoW Forever yet' and render it only through that constant; do not repeat the string in comments.
3. Early return: extend the existing guard so the component also returns null while foreverRaidsLoading is true. This stops rows 4 and 5 flipping from numbered to waiting after first paint. Classic guilds never hit it.
4. Step status at render time, not in checkSetupProgress: currentStepId = id of the first step that is neither complete nor waiting (null when none). Each step is 'done' (complete), 'waiting', 'current' (id === currentStepId) or 'upcoming'. Remove the setExpandedStep call from checkSetupProgress. Change expandedStep state to string | null | undefined, initial undefined, where undefined means follow the current step: expandedId = expandedStep === undefined ? currentStepId : expandedStep. Only current and upcoming rows can be expanded. Toggling a row sets expandedStep to null if that row is the expandedId, else to the row's id. Deriving here means a late raidTierStatus change never leaves a waiting row expanded and never triggers a refetch.
5. Drop the completed-step description line and remove the completedDescription field from the SetupStep interface and from all six step objects (D-01 allows dropping it; fewer elements, one-line rows). Leave the unused icon field alone.
6. Header: keep it byte-for-byte except give the h2 an id from React useId() so the progressbar and the list can be labelled by it.
7. Progress bar (D-01): replace the per-step segment map with one track div (mt-4 h-1.5 rounded-full bg-muted overflow-hidden) carrying role="progressbar", aria-labelledby the h2 id, aria-valuemin 0, aria-valuemax steps.length, aria-valuenow completedCount, aria-valuetext built from the same template as the visible line (completedCount + ' of ' + steps.length + ' steps done'). Its only child is the fill (h-full rounded-full bg-accent transition-[width] duration-500) with inline style width set from the already computed progress value as a percent string. Waiting steps count toward steps.length (D-03).
8. Rows (D-01): render steps as an ol (aria-labelledby the h2 id; class px-2 pb-3) of li elements (relative). Every row header uses the same box: flex items-center gap-3 min-h-11 pl-3 pr-2 py-2 w-full text-left, so the status slot's left edge sits 20px from the card edge like the header avatar, and the title column starts at the same x on every row. Status slot is always w-6 h-6 shrink-0 flex items-center justify-center and aria-hidden:
   - done: rounded-full bg-success text-success-foreground with HugeiconsIcon Tick02Icon size 14 (pass strokeWidth 2.5 if HugeiconsIcon accepts it).
   - current: rounded-full bg-accent text-accent-foreground text-[11px] font-semibold tabular-nums showing its 1-based position.
   - upcoming: rounded-full bg-muted text-muted-foreground text-[11px] font-semibold tabular-nums showing its position.
   - waiting: no disc; HugeiconsIcon Clock01Icon size 16 in text-muted-foreground.
   Title column: flex-1 min-w-0. Title text-[13px] font-medium leading-5: text-foreground for current; text-foreground-secondary for done and upcoming; text-muted-foreground for waiting. Never the foreground-muted token, and no strikethrough or reduced-opacity classes on any row.
   - done rows: header is a div (not focusable, no role, no chevron); after the title add a span with className sr-only containing ', done' (screen-reader state text required by the accessibility constraint; reuses the word already shown in 'steps done').
   - waiting rows: header is a div (not focusable, no chevron). The title column is flex flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-3, holding the title and a span (text-[11px] text-muted-foreground) rendering FOREVER_WAITING_NOTE. Below sm the note wraps under the title; from sm up it trails on the same line.
   - current and upcoming rows: header is a native button type="button" with aria-expanded, rounded-lg hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. The current row's button also gets aria-current="step". Trailing chevron: keep today's inline right-chevron svg, add aria-hidden="true", rotate-90 when expanded, shrink-0 text-muted-foreground. Replace the old div role=button and its manual Enter/Space onKeyDown with the native button (native keyboard handling).
   - current row marker: inside the current li render an aria-hidden span, absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent, so the bar spans the header and its expanded panel. No tinted background on any row (remove the old accent/[0.05] card tint).
   - expanded panel (current or upcoming when expandedId matches): a div under the header, inside the same li, with pl-12 pr-2 pb-3 so its left edge equals the title column (12px row padding + 24px slot + 12px gap). Contents unchanged: the step's description paragraph (text-[12px] text-muted-foreground mb-3) and the accent sm Button with the CTA and ArrowRight01Icon calling router.push(step.href).
9. Imports: add Clock01Icon and Tick02Icon; remove CheckmarkCircle01Icon if it is no longer referenced; add useId to the react import. Keep eslint at 0 errors.

DashboardContent.tsx (one small hunk only; the card hiding is Task 2):
- Add a type-only import of RaidTierStatus from '@/domain/expansion/game' (merge with the existing getGuildGame import line).
- Next to const heroReady (around line 1842) add const raidTierStatus: RaidTierStatus = loading ? 'loading' : noRaidTiers ? 'none' : 'available', with a one-line comment that loading clears only after the raid_tiers query resolves.
- Pass raidTierStatus={raidTierStatus} to the existing SetupGuide element. Change nothing else in the file.

Commit: stage exactly the four files above by explicit path (git add with each path quoted). Never use git add -A or git add . and never stage .agents/, .codex/, .gsd/, AGENTS.md or .planning/. Suggested message: feat(overview): redesign setup guide rows and progress, Forever waiting steps
  </action>
  <verify>
    <automated>npx vitest run "app/(app)/overview/components/__tests__/SetupGuide.test.tsx" && npm run typecheck && npx eslint "app/(app)/overview/components/SetupGuide.tsx" "app/(app)/overview/components/__tests__/SetupGuide.test.tsx" "app/(app)/overview/components/DashboardContent.tsx" domain/expansion/game.ts && test "$(grep -c 'Not available for WoW Forever yet' 'app/(app)/overview/components/SetupGuide.tsx')" = 1 && test "$(grep -c 'line-through' 'app/(app)/overview/components/SetupGuide.tsx')" = 0 && test "$(grep -c 'opacity-40' 'app/(app)/overview/components/SetupGuide.tsx')" = 0 && test "$(grep -c 'text-foreground-muted' 'app/(app)/overview/components/SetupGuide.tsx')" = 0 && test "$(grep -c 'role="progressbar"' 'app/(app)/overview/components/SetupGuide.tsx')" = 1 && test "$(git diff -U0 origin/main -- 'app/(app)/overview/components/SetupGuide.tsx' 'app/(app)/overview/components/__tests__/SetupGuide.test.tsx' 'app/(app)/overview/components/DashboardContent.tsx' domain/expansion/game.ts | grep '^+' | grep -c "$(printf '\342\200\224')")" = 0</automated>
    <human-check>After Task 2, see the plan-level verification section (390px and 1440px, dark and light, Classic mid-setup and the Forever test guild).</human-check>
  </verify>
  <acceptance_criteria>
    - All ten SetupGuide test cases pass; the file did not exist before this task.
    - grep gates above: approved string exactly once in SetupGuide.tsx; zero strikethrough, zero 40% opacity and zero foreground-muted classes in SetupGuide.tsx; exactly one progressbar; zero em dashes on added lines.
    - npm run typecheck exits 0; npx eslint on the four files reports 0 errors.
    - git show --stat HEAD lists only the four task files.
  </acceptance_criteria>
  <done>Every guild's setup guide shows one continuous progress fill by count, readable done rows with a solid check, one row anatomy with the current step marked by a left accent bar and expanded in place; a Forever guild with no raid tiers sees steps 4 and 5 as non-interactive waiting rows reading 'Not available for WoW Forever yet', and never sees them flip on load; Classic guilds show the same steps, copy and behavior as before apart from the D-01 visual changes.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Hide raid-dependent overview cards for Forever guilds with no raid tiers</name>
  <files>domain/expansion/game.ts, domain/expansion/__tests__/game.test.ts, app/(app)/overview/components/DashboardContent.tsx</files>
  <read_first>
    - domain/expansion/game.ts (as left by Task 1)
    - domain/expansion/__tests__/game.test.ts (import block and describe style)
    - app/(app)/overview/components/DashboardContent.tsx lines 2030-2045 (NoRaidsEmptyState, skeleton branch, Insights row condition) and 2225-2232 (loot grid open) and 2408-2418 (loot grid close, Actions needed open) only
  </read_first>
  <behavior>
    Add a describe('hidesRaidDependentCards') block to domain/expansion/__tests__/game.test.ts, written first and failing (function missing):
    - classic with 'loading', 'none' and 'available' -> false (Classic unchanged, D-02).
    - forever with 'none' -> true (no raid tiers, D-02).
    - forever with 'loading' -> true (no flash of cards before tiers resolve).
    - forever with 'available' -> false (cards return once a raid tier exists, D-02).
  </behavior>
  <action>
Implements D-02.

domain/expansion/game.ts: export function hidesRaidDependentCards(game: GameVersion, status: RaidTierStatus): boolean, returning true only when game is 'forever' and status is not 'available'. Doc comment: a Forever guild's overview hides the raid-dependent cards until a raid tier is known to exist; Classic guilds always show them. No imports.

DashboardContent.tsx:
- Add hidesRaidDependentCards to the existing import from '@/domain/expansion/game'.
- Directly under the raidTierStatus const from Task 1 add const hideRaidCards = hidesRaidDependentCards(getGuildGame(activeGuild), raidTierStatus).
- Add exactly three guards and change nothing else:
  1. Skeleton branch (around line 2038): the insightsLoading true branch renders DashboardDataSkeleton only when activeCharacter && !dataLoading && !hideRaidCards, else null.
  2. Insights row (around line 2043): prefix the existing condition with !hideRaidCards &&. This hides Score breakdown, Attendance and the Trial progress or Next raid widget together.
  3. Loot grid (the div with grid grid-cols-1 lg:grid-cols-2 gap-6 holding Next in line and Recently received, around lines 2228-2412): wrap it in {!hideRaidCards && ( ... )}.
- Leave the NoRaidsEmptyState condition, the Create character CTA, the error card, the resubmit nudge, the Guardian banner, the setup guide render and the Actions needed block exactly as they are (Actions needed is data-driven and has nothing to show when no raid tiers exist). The parent's space-y-6 applies only to rendered children, so no gap remains.

Commit: stage exactly the three files by explicit quoted path. Never git add -A or git add ., never stage .agents/, .codex/, .gsd/, AGENTS.md or .planning/. Suggested message: feat(overview): hide raid cards for Forever guilds until raids exist
  </action>
  <verify>
    <automated>npx vitest run domain/expansion/__tests__/game.test.ts && npm run typecheck && npx eslint "app/(app)/overview/components/DashboardContent.tsx" domain/expansion/game.ts domain/expansion/__tests__/game.test.ts && test "$(grep -c 'hideRaidCards' 'app/(app)/overview/components/DashboardContent.tsx')" -ge 4 && test "$(grep -c 'hidesRaidDependentCards' 'app/(app)/overview/components/DashboardContent.tsx')" -ge 2 && test "$(grep -c 'noRaidTiers && !error' 'app/(app)/overview/components/DashboardContent.tsx')" = 1 && test "$(git diff -U0 origin/main -- 'app/(app)/overview/components/DashboardContent.tsx' domain/expansion/game.ts domain/expansion/__tests__/game.test.ts | grep '^+' | grep -c "$(printf '\342\200\224')")" = 0 && npx vitest run</automated>
    <human-check>See the plan-level verification section.</human-check>
  </verify>
  <acceptance_criteria>
    - The six hidesRaidDependentCards cases pass; every pre-existing game.test.ts case still passes.
    - hideRaidCards appears at least 4 times in DashboardContent.tsx (declaration plus three guards); hidesRaidDependentCards at least twice (import plus call); the NoRaidsEmptyState condition is unchanged.
    - npm run typecheck exits 0; npx eslint on the three files reports 0 errors; full npx vitest run passes.
    - No em dash on any added line; git show --stat HEAD lists only the three task files.
  </acceptance_criteria>
  <done>A Forever guild with no raid tiers sees only the header, the setup guide (officers) and the "No raids yet" card below it, with no empty gap and no card flash while tiers load; the cards come back on their own when a raid tier exists; Classic guilds see exactly today's overview.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser -> Supabase (existing) | Setup-guide counts and raid_tiers are read through the existing RLS-scoped client; this plan adds no query, route, table or permission. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-wip-01 | Information disclosure | DashboardContent hideRaidCards guards | low | accept | Hiding is presentation only. The hidden cards show the viewer's own data, already fetched under RLS; a user who un-hides them via devtools sees nothing they could not already see. No data is newly exposed or withheld server-side. |
| T-wip-02 | Tampering | SetupGuide raidTierStatus prop and localStorage dismiss/celebrate keys | low | accept | Client-only UI state. Waiting rows only suppress navigation buttons to pages that already handle the no-raids case (NoRaidsEmptyState on loot list and master sheet, from 260925-f5j). Dismiss and celebrate keys are unchanged. |
| T-wip-03 | Denial of service | SetupGuide Forever loading guard | low | mitigate | The guard keys off DashboardContent's loading flag, which loadData always clears in its finally block (including on query error), so a Forever guide cannot stay hidden once loading completes. Test 7 proves the guide appears when the status moves from 'loading' to 'none'. |

No package installs in this plan, so no supply-chain row.
</threat_model>

<verification>
Automated (after Task 2, from the code worktree):
- npm run typecheck exits 0.
- npx eslint on all five changed files reports 0 errors.
- npx vitest run (full suite) passes.
- Grep gates from both tasks pass; git diff origin/main --stat lists only the five files in files_modified.

Human check (user, local dev or preview deploy), at 390px and 1440px wide, in dark and light mode:
1. Classic guild mid-setup (for example character and expansion done, invite not done): one continuous orange fill at 2 of 6 (about a third), no dim or broken segment; done rows read clearly with a solid green check and no strikethrough; the current row has a thin orange left bar and shows its description and button indented under its title; upcoming rows have number discs and right chevrons; all collapsed rows share one height and one left edge; Tab reaches the close button, the current row, its CTA and each upcoming row, never a done row.
2. Forever test guild "Forever Test (delete me)" (2 of 5): the bar is 40% filled with no gap; row 2 (Invite your raiders) is current and expanded; rows 4 and 5 show a clock, a readable title and "Not available for WoW Forever yet" (same line at 1440px, under the title at 390px), no chevron, not clickable or focusable; on reload the rows never flash as numbered first.
3. Forever overview below the guide: only the "No raids yet" card; no Score breakdown, Attendance, Next raid, Next in line or Recently received, and no blank space where they were.
4. Classic overview below the guide: unchanged from production.
</verification>

<success_criteria>
- D-01: continuous progress fill by count, AA-readable done rows with a solid check and no strikethrough, one row anatomy, current step marked by a left accent bar and expanded in place, for every guild.
- D-02: Forever guilds with no raid tiers see only the setup guide and "No raids yet" below the header; cards return when a raid tier exists; Classic unchanged; no gap.
- D-03: Forever steps 4 and 5 wait (clock, readable title, approved note, not interactive) while there are no raid tiers, count toward M, and behave normally once tiers exist; Classic unchanged.
- D-04: the only new visible string is "Not available for WoW Forever yet"; no em dash on any added line.
- Two commits on feat/setup-guide-redesign, each containing only its task's files.
</success_criteria>

<output>
Create `.planning/workstreams/default/quick/260927-wip-redesign-the-dashboard-setup-guide-and-m/260927-wip-SUMMARY.md` in the planning worktree (/private/tmp/claude-501/-Users-alexander-mayes-Code-personal-loot-list-plus/8235b620-ae38-4661-a5c0-23f69fed77f3/scratchpad/wt-phase06) when done. Do not commit planning files from the code worktree.
</output>
