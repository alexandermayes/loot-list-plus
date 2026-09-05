STATUS: APPROVED

# Phase 3 Copy Draft

**Purpose:** Every visible string the `/research/wow-classic-loot-systems-2026` page will show, drafted in one place, for the D-07/ROADMAP consolidated copy sign-off. Every number is a `NUMBER-TOKEN` resolved from `public/research/wow-classic-loot-systems-2026-aggregates.json`; no approved string carries a literal numeral for a value that could drift from a query. Publication order for the four findings matches `03-FINDINGS.md`'s `SELECTED:` order: median-list-length, attendance-weighting, blp-usage, top-priority-bracket.

**Sign-off:** received directly, 2026-09-04, reply `approve-all`. Every string below ships exactly as drafted, including the drafter's own defaults for the four open questions raised in Section G. Provenance: the user was shown the page frame, all four findings' H2s and number sentences, the methodology highlights, the CTA, and the four open questions, with a pointer to this file in full, and replied `approve-all`. This satisfies the ROADMAP's "user sign-off required on user-facing copy" rule for the 45 `APPROVED-STRING` entries recorded in this file. Any future wording change to any of these strings needs fresh sign-off; this approval covers only the wording recorded here.

---

## Number tokens

NUMBER-TOKEN: window_start = window.start
NUMBER-TOKEN: window_end = window.end
NUMBER-TOKEN: sample_active_guilds = sample.active_guilds
NUMBER-TOKEN: sample_raid_events = sample.raid_events
NUMBER-TOKEN: sample_loot_awards = sample.loot_awards
NUMBER-TOKEN: sample_raiders = sample.raiders_with_approved_lists
NUMBER-TOKEN: guild_floor = guild_floor
NUMBER-TOKEN: finding_median_list_length_value = findings[0].display
NUMBER-TOKEN: finding_median_list_length_denominator = findings[0].denominator
NUMBER-TOKEN: finding_attendance_weighting_value = findings[1].display
NUMBER-TOKEN: finding_attendance_weighting_denominator = findings[1].denominator
NUMBER-TOKEN: finding_blp_usage_value = findings[2].display
NUMBER-TOKEN: finding_blp_usage_denominator = findings[2].denominator
NUMBER-TOKEN: finding_top_priority_bracket_value = findings[3].display
NUMBER-TOKEN: finding_top_priority_bracket_denominator = findings[3].denominator

Each token was checked against the committed artifact before this draft was finished:
- `window.start` = `2026-06-01`, `window.end` = `2026-08-31`
- `sample.active_guilds` = 33, `sample.raid_events` = 454, `sample.loot_awards` = 5432, `sample.raiders_with_approved_lists` = 452
- `guild_floor` = 10
- `findings[0]` (median-list-length): display `18.0`, denominator 583
- `findings[1]` (attendance-weighting): display `84.8`, denominator 33
- `findings[2]` (blp-usage): display `45.5`, denominator 33
- `findings[3]` (top-priority-bracket): display `29.5`, denominator 2296

---

## A. Page frame

Surface: the page header block, mirroring `app/blog/*/page.tsx`'s existing eyebrow, H1, standfirst, and byline pattern (D-08, D-11), plus the browser title and meta description.

Drafting notes, carried forward for the record:
- `page.title` keeps the sprint plan's literal working title, including the "2026" year, with the guild-count token in place of `{N}`. `page.h1` drops the literal "2026" and keeps only the guild-count token, because a bare year in an approved string cannot be bound to a query token (there is no "year" field in the aggregates artifact to point at) and the no-literal-numeral rule applies to every string except `page.title` and `page.meta-description`. The two strings therefore differ on purpose. This was Section G item 1; resolved below as the drafted default (no further difference, no matching).
- Whichever string is approved for `page.h1` becomes the Article JSON-LD `headline` as well, per the plan's binding requirement that the two match.
- `page.read-time` is a placeholder estimate. It is not bound to a query (there is no "read time" field in the aggregates artifact). It ships as approved wording, but the number itself must still be recalculated against the final page word count once the page is assembled, before ship. This is an explicit carry-forward action item for plans 03-05 and 03-06, not a reopened wording question.

### Approved

User sign-off received directly (`approve-all`), 2026-09-04. All Section A strings ship exactly as drafted. G1 resolved as the drafted default: `page.h1` keeps dropping the literal "2026" while `page.title` keeps it; the two strings stay different. G4 resolved as the drafted default: `page.read-time` ships as the placeholder text below; plans 03-05/03-06 must recalculate the actual minute figure against final word count before the page goes live and before it is added to the sitemap.

APPROVED-STRING: page.title = How WoW Classic Guilds Actually Run Loot in 2026: Data from {sample_active_guilds} Guilds
APPROVED-STRING: page.meta-description = An anonymized look at how WoW Classic guilds use ranked lists, attendance, bad-luck protection, and officer judgment to distribute raid loot.
APPROVED-STRING: page.eyebrow = Research
APPROVED-STRING: page.h1 = How WoW Classic Guilds Actually Run Loot: Data from {sample_active_guilds} Guilds
APPROVED-STRING: page.standfirst = An inside look at how {sample_active_guilds} World of Warcraft Classic guilds actually run loot: what raiders rank, how guilds weight attendance, how often bad-luck protection is on, and how often the top of the list wins the item.
APPROVED-STRING: page.breadcrumb-label = Research
APPROVED-STRING: page.byline = By Zev, creator of LootList+
APPROVED-STRING: page.read-time = 6 min read

---

## B. Opening copy

Adapted from the sprint plan's exact opening-copy template (RESEARCH.md, "Sprint plan exact copy"), tightened where it read like a fill-in-the-blank template, keeping both required honest-framing clauses: that no names are included, and that this is usage data rather than a survey.

### Approved

User sign-off received directly (`approve-all`), 2026-09-04. Both paragraphs ship exactly as drafted, including both honest-framing clauses (no names included; product usage data, not a survey).

APPROVED-STRING: opening.paragraph-1 = Between {window_start} and {window_end}, {sample_active_guilds} active guilds used LootList+ to manage {sample_raid_events} raid events and {sample_loot_awards} loot awards across {sample_raiders} raiders with approved lists. We looked at aggregated, anonymized activity to see how these guilds balance wishlist rank, attendance, bad-luck protection, and officer judgment. No player or guild names are included in the dataset.
APPROVED-STRING: opening.paragraph-2 = This is product usage data, not a survey of every WoW guild. It shows how guilds using a transparent, list-based system behave in practice.

---

## C. Findings

One four-part block per selected finding, in publication order, per the sprint plan's finding format (H2 claim, one number sentence, one officer-meaning paragraph, one limits paragraph) plus a callout label for the big-number box. None of the four published findings are segmented breakdowns (`segments: []` on all four in the committed artifact), so no finding in this draft needs `table-caption`, `table-header-segment`, or `table-header-count` strings.

### C1. finding.median-list-length

APPROVED-STRING: finding.median-list-length.h2 = Raiders keep long, ranked wishlists, not short top-five picks
APPROVED-STRING: finding.median-list-length.number-sentence = The median approved loot list held {finding_median_list_length_value} items, measured across {finding_median_list_length_denominator} approved lists in the window.
APPROVED-STRING: finding.median-list-length.officer-meaning = If you are used to thinking of a raider's list as "their five or six BiS items," this is bigger than that. A typical approved list ranks well past the obvious wishlist items, which means loot decisions for an officer are rarely a two-item choice. Knowing the fuller list matters for items well outside anyone's top pick.
APPROVED-STRING: finding.median-list-length.limits = This counts only the items still on a list at the end of the window, not everything a raider ever typed in. A raider who ranked forty items and later trimmed the list down keeps the length they ended up with, not the length they started with, so this number reflects a maintained list, not a first draft.
APPROVED-STRING: finding.median-list-length.callout-label = median items per approved list

### C2. finding.attendance-weighting

APPROVED-STRING: finding.attendance-weighting.h2 = Most guilds don't leave attendance scoring on the default settings
APPROVED-STRING: finding.attendance-weighting.number-sentence = {finding_attendance_weighting_value}% of the {finding_attendance_weighting_denominator} active guilds measured had changed at least one attendance-scoring setting away from what LootList+ ships by default.
APPROVED-STRING: finding.attendance-weighting.officer-meaning = Attendance scoring is on for every guild out of the box, so the interesting question isn't whether guilds track attendance, it's whether the default weighting fits how a specific guild actually runs raids. Most guilds we measured went in and adjusted it, which suggests the shipped defaults are a reasonable starting point for a new guild, not a setting most officers should assume is already tuned for them.
APPROVED-STRING: finding.attendance-weighting.limits = This does not measure whether a guild tracks attendance. Attendance scoring is on by default for every guild, with a nonzero bonus, so a simple presence check would say nearly everyone tracks it and would tell you nothing useful. What this measures instead is whether a guild's attendance configuration differs from the shipped defaults on at least one setting, which is a narrower and more honest question about active tuning, not passive presence.
APPROVED-STRING: finding.attendance-weighting.callout-label = of active guilds tuned attendance away from the default

### C3. finding.blp-usage

APPROVED-STRING: finding.blp-usage.h2 = Bad-luck protection is common, but far from universal
APPROVED-STRING: finding.blp-usage.number-sentence = {finding_blp_usage_value}% of the {finding_blp_usage_denominator} active guilds measured had bad-luck protection turned on.
APPROVED-STRING: finding.blp-usage.officer-meaning = Roughly half of active guilds run without bad-luck protection at all, so if your guild has been debating whether to turn it on, you are not choosing between "everyone does this" and "no one does this." Either choice puts you alongside a large, normal group of other guilds.
APPROVED-STRING: finding.blp-usage.limits = This only tells you whether the setting is switched on, not how any guild has it tuned, and it says nothing about how often bad-luck protection actually changed who won an item during the window. A guild with the setting on and a guild with it off could both be running loot fairly; this number describes a configuration choice, not an outcome.
APPROVED-STRING: finding.blp-usage.callout-label = of active guilds using bad-luck protection

### C4. finding.top-priority-bracket

APPROVED-STRING: finding.top-priority-bracket.h2 = About three in ten drops go to someone whose list already had it at the top
APPROVED-STRING: finding.top-priority-bracket.number-sentence = {finding_top_priority_bracket_value}% of the {finding_top_priority_bracket_denominator} awarded items with a determinable prior rank went to a raider whose list already ranked that item in the top priority bracket.
APPROVED-STRING: finding.top-priority-bracket.officer-meaning = A meaningful share of loot decisions land exactly where the list said they should: at the top. That is a useful gut-check for an officer weighing a close call between two raiders. It does not mean every award goes to the top of someone's list, so this number is a baseline for "how often does the list agree with the outcome," not a claim that the system always hands the item to the top-ranked raider.
APPROVED-STRING: finding.top-priority-bracket.limits = This share only covers awards where the winner had a usable snapshot of their list from before the raid, and where the awarded item could be found on that snapshot with a determinable rank. An award without a usable prior snapshot or without a determinable rank is left out of both the numerator and the denominator here, it is not counted as a miss. "Top priority bracket" is a fixed rank range built into LootList+ itself, the same for every guild; it is not a setting any guild configures.
APPROVED-STRING: finding.top-priority-bracket.callout-label = of ranked awards landed in the top bracket

### Approved

User sign-off received directly (`approve-all`), 2026-09-04. All four findings ship exactly as drafted. G3 resolved as the drafted default: `finding.attendance-weighting.h2` and its officer-meaning paragraph stand as drafted, including the "changed the shipped defaults" framing rather than a "tracks attendance" framing.

---

## D. Methodology

APPROVED-STRING: methodology.h2 = Methodology
APPROVED-STRING: methodology.window = This report uses a fixed calendar window, {window_start} through {window_end}, not a window that moves forward with the calendar. The dates are locked in place so every number here stays reproducible against the exact same window, indefinitely.
APPROVED-STRING: methodology.active-guild = A guild counts as active in this window if it had at least one raid event that was not marked skipped, or at least one loot award, or at least five approved loot lists. A raid marked skipped in the scheduler does not count toward activity. A loot list counts as approved as of whichever timestamp exists: an officer's review, or, if no review was ever logged, the raider's own submission time.
APPROVED-STRING: methodology.raider = Raiders are counted as distinct characters holding an approved loot list in the window. This is a character count, not a person count: a player who raids on two characters, each with an approved list, is counted twice.
APPROVED-STRING: methodology.expansion = Where a guild had qualifying activity in more than one expansion during the window, it is counted in every expansion it was active in, not just one. That means an expansion-by-expansion breakdown can add up to more than the whole, by design, and the report says so wherever such a breakdown appears.
APPROVED-STRING: methodology.floor = Every number in this report represents at least {guild_floor} guilds. Where a segment would fall under that floor on its own, it is folded into an "Other" row rather than published on its own, so no individual guild can be identified by process of elimination.
APPROVED-STRING: methodology.rounding = Percentages and medians in this report are rounded to one decimal place, rounding half up.
APPROVED-STRING: methodology.reproduce = Every number on this page comes from a saved SQL query committed to our GitHub repository. You can read the exact queries, and run them yourself, in the saved-queries directory: https://github.com/alexandermayes/loot-list-plus/tree/main/scripts/analytics/queries/wow-classic-loot-systems-2026.
APPROVED-STRING: methodology.absences = This report does not publish four measures the original plan recommended. A breakdown of active guilds by expansion is withheld because even after merging small segments into an "Other" row, that merged row itself falls under our guild-privacy floor, so it cannot be published without risking identifying a specific guild. Median time from guild creation to a qualified setup, and median time from a qualified setup to activation, are both withheld because the timestamps needed to measure them only started being recorded shortly before this window closed, leaving almost no guild in the window with a reliable timestamp for either milestone. A self-reported measure of officer time saved per week is not published because no survey of that kind has ever been run; the original plan calls for self-reported figures to be kept separate from behavioral data, and we have none to report. No other candidate metric was declined: every measure that could be computed accurately and safely within this window was published above.

### Approved

User sign-off received directly (`approve-all`), 2026-09-04. All methodology strings ship exactly as drafted, including the full absences paragraph naming all four withheld metrics.

---

## E. Downloads

APPROVED-STRING: downloads.h2 = Get the data
APPROVED-STRING: downloads.csv-label = Download the aggregates as CSV
APPROVED-STRING: downloads.json-label = Download the aggregates as JSON

### Approved

User sign-off received directly (`approve-all`), 2026-09-04. All three download labels ship exactly as drafted.

---

## F. Contextual CTA

Locked verbatim from the sprint plan template and the UI-SPEC Copywriting Contract. Presented here for approval rather than silently adopted, per the ROADMAP rule that this phase's visible copy is subject to the same sign-off gate.

APPROVED-STRING: cta.heading = See how the same rules work with your roster.
APPROVED-STRING: cta.body = Create a free guild, import your raiders, and compare the priority order before your next raid night.
APPROVED-STRING: cta.button = Create your guild free

### Approved

User sign-off received directly (`approve-all`), 2026-09-04. All three CTA strings ship exactly as drafted, locked verbatim per the sprint plan and UI-SPEC.

---

## G. Open questions for sign-off

1. **`page.h1` already differs from `page.title` above (it drops the literal "2026").** Is that the right difference, or would you rather the H1 keep the year too (accepting it as a fixed, non-token editorial fact rather than binding it to a query, the same way `page.title` already does), or would you rather shorten the H1 further still? The metadata title has more room to be descriptive for search; the H1 is what a reader actually sees at the top of the page.

   **Resolved (`approve-all`), 2026-09-04:** drafted default stands. `page.h1` keeps dropping "2026"; `page.title` keeps it. No further change.

2. **`page.eyebrow`: "Research," or something else?** The blog pattern uses a single word ("Guide") in this slot. "Research" was chosen to match the page's actual content (a data report), but "Report," "Data," or no eyebrow at all are equally valid choices.

   **Resolved (`approve-all`), 2026-09-04:** drafted default stands. `page.eyebrow` = "Research".

3. **`finding.attendance-weighting.h2` and its officer-meaning paragraph.** This is the one finding whose honest wording matters most: the measurement is "guilds that changed the shipped attendance defaults," not "guilds that track attendance" or "guilds that weight attendance heavily." I am not fully confident the drafted H2 ("Most guilds don't leave attendance scoring on the default settings") lands this distinction as clearly in your voice as it should. If this reads as splitting hairs to you, or if it still reads as overclaiming, this is the string to rewrite rather than lightly edit.

   **Resolved (`approve-all`), 2026-09-04:** drafted default stands. The H2, number sentence, officer-meaning, and limits wording for `finding.attendance-weighting` ship exactly as drafted.

4. **`page.read-time`.** Drafted as a placeholder ("6 min read"). This should be recalculated against the final page word count once the rest of this draft is locked; it is not bound to a query so it carries no privacy or provenance risk either way, but it should not ship un-recalculated.

   **Resolved (`approve-all`), 2026-09-04:** drafted default text stands as the approved wording, but the placeholder is explicitly not final as a number. **Carried forward as an action item for plans 03-05 and 03-06:** recalculate the minute figure in `page.read-time` against the final assembled page's word count before the page is indexed or added to the sitemap.

---

SIGN-OFF: APPROVED 2026-09-04
