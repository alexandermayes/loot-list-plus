STATUS: APPROVED

# Phase 5 Copy Draft: Internal Authority Links

**Purpose:** Every link this phase will ship, drafted into one table for the D-05 consolidated sign-off. Nothing here ships until this file reads `STATUS: APPROVED` with a dated `SIGN-OFF` line. The approved version of this table becomes three things at once: the copy sign-off, the record of which pages changed (feeding the sitemap `lastmod` bumps), and the frozen recrawl list.

Figure-bearing anchors are checked against `public/research/wow-classic-loot-systems-2026-aggregates.json`. Each such row names the `metric_id` it restates and the aggregate's own `label`, so a wording change that outruns the data is visible here rather than three plans later.

No em dash appears anywhere in this file. All `APPROVED-STRING` values use straight apostrophes and straight quotes only.

SIGN-OFF: APPROVED 2026-09-08

**Sign-off:** received via the orchestrator's checkpoint on 2026-09-08, reply `edit-rows`. Two rows were reworded to fix a duplicated word (Link 7: "the median loot list runs 18 items long", dropping the doubled "our data"; Link 9: "45.5% turn on bad-luck protection for exactly this reason", dropping the doubled "active guilds"). Every other row (1, 2, 3, 4, 5, 6, 8, 10, 11, 12) is approved byte-for-byte as drafted. All four open questions below are answered in this reply: the attendance-anchor rewording is confirmed, the officer-burnout guide stays no-link, the homepage slot is the subhead, and the reused-metric distribution is accepted as drafted with no redistribution.

---

## Link table

Each entry shows the page, the file, the sentence immediately before the new sentence, the new sentence with its anchor marked in **bold**, the sentence immediately after (or the next structural element, if the insertion sits at a section boundary), the anchor text alone, the target, the metric this anchor restates (if any), and the case-study slot note (D-08: a pointer for `04-PUBLISH-RUNBOOK.md` step 4, not a link shipped in this phase).

### Link 1: Homepage -> research report

- **Page:** Homepage, loot-decision section
- **File:** `app/components/landing/LandingLootDecision.tsx`
- **Proposed slot:** the subhead paragraph (lines 47-53), not the caption. Reason: the subhead is the sentence that already names the three inputs (list rank, attendance, bad-luck protection) the report measures, so the new sentence sits directly against the claim it proves. The caption ("Anonymized example...") is about the demo table, not the product-wide claim, and would make the link read like an aside about the mockup rather than about real guilds. Flagged as an open question below in case the caption is preferred.
- **Sentence before:** "Every candidate's list rank, attendance, and bad-luck protection roll into one Loot Score anyone can inspect."
- **Sentence carrying the link:** "See the real numbers: **45.5% of active guilds turn on bad-luck protection**, according to our research report on how guilds actually run loot."
- **Sentence after:** none in this paragraph; the next element is the item-card demo UI, not prose.
- **Anchor text:** `45.5% of active guilds turn on bad-luck protection`
- **Target:** `/research/wow-classic-loot-systems-2026`
- **Metric ID:** `blp-usage` (label: "Percentage of active guilds using bad-luck protection")
- **Case-study slot note:** once a case study is live, a case-study link could sit in the caption sentence ("Anonymized example. In the app, every score opens into its full calculation."), naming the guild whose real score this demo is styled after.

### Link 2: Compare -> research report

- **Page:** `/compare`, Q4 answer (TMB attendance)
- **File:** `app/compare/page.tsx`
- **Proposed slot:** the end of the Q4 answer (attendance), not Q8 (bad-luck protection). Reason: D-07 caps a page at one link per target, and Q4's claim ("attendance is a weighted component of the score itself") is the more load-bearing comparison claim on this page; Q8's BLP claim already has a strong home on the homepage (Link 1).
- **Sentence before:** "The difference is what happens to that number. In TMB, attendance is a number displayed next to a raider's name while your officers assign prios. It informs the decision, but a human still has to weigh it against everyone else's attendance, their list position, and what they've already received. In LootList+, attendance is a weighted component of the score itself, so a raider at 95% and a raider at 60% are already separated before anyone opens Discord, and both of them can see exactly how many points that gap was worth."
- **Sentence carrying the link:** "See the data: **84.8% of active guilds have changed their attendance weighting from the defaults**, according to our research report."
- **Sentence after:** none; next content is the Q5 heading ("What about DKP? Some guilds still swear by it.").
- **Anchor text:** `84.8% of active guilds have changed their attendance weighting from the defaults`
- **Target:** `/research/wow-classic-loot-systems-2026`
- **Metric ID:** `attendance-weighting` (label: "Share of active guilds whose attendance configuration differs from the shipped defaults") -- see the discrepancy note below; this wording is the faithful rewording of the anchor the user previously endorsed.
- **Case-study slot note:** a case-study link could sit near Q3 ("What about TMB specifically?") as a real before/after example of a guild that switched.

### Link 3: Pricing -> research report

- **Page:** `/pricing`, header block
- **File:** `app/pricing/page.tsx`
- **Sentence before:** "Start with the complete core loot system for free. Upgrade the whole guild only when you need multiple raid teams or deeper officer oversight."
- **Sentence carrying the link:** "Curious how real guilds use it? Across our data, **the median loot list runs 18 items long**."
- **Sentence after:** none; next element is the pricing card grid.
- **Anchor text:** `the median loot list runs 18 items long`
- **Target:** `/research/wow-classic-loot-systems-2026`
- **Metric ID:** `median-list-length` (label: "Median list length")
- **Note:** this page carries no `APPROVED_STRINGS` gate today, so the sentence is plain new prose with no byte-match risk.
- **Case-study slot note:** a case-study link could sit near the FAQ "Is LootList+ actually free?" answer as a real before/after guild story.

### Link 4: About -> research report

- **Page:** `/about`, "What LootList+ does" section
- **File:** `app/about/page.tsx`
- **Sentence before:** "Raiders submit ranked loot lists. Officers track attendance and configure the rules their guild actually uses. LootList+ combines those inputs into an item-specific Loot Score, so every drop has a visible priority order and every score can be explained."
- **Sentence carrying the link:** "Across active guilds, **29.5% of awarded items went to a top-priority-bracket pick**, the kind of number a spreadsheet never surfaces."
- **Sentence after:** "It supports Classic Era, The Burning Crusade, Wrath of the Lich King, Cataclysm, and Mists of Pandaria, with Discord, Warcraft Logs, Battle.net, WowSims, and in-game distribution workflows."
- **Anchor text:** `29.5% of awarded items went to a top-priority-bracket pick`
- **Target:** `/research/wow-classic-loot-systems-2026`
- **Metric ID:** `top-priority-bracket` (label: "Share of awarded items that were in the winner's top priority bracket")
- **Case-study slot note:** a case-study link could sit in the "Who built it" section, alongside Zev's bio, once a case study is live.

### Link 5: Research report -> Compare

- **Page:** `/research/wow-classic-loot-systems-2026`
- **File:** `app/research/wow-classic-loot-systems-2026/page.tsx`
- **Slot:** a new plain `<p>` sibling, placed after the Downloads block and before the existing Contextual CTA `<div>` (the `CTA_HEADING`/`CTA_BODY`/`CTA_URL` block at lines 535-541), per Pattern 2 (sibling outside the `.prose` wrapper is not required here since this new paragraph is plain text, not a button; it can sit as the last child inside `.prose`, immediately before the wrapper closes, since it introduces no new `<h2>` and does not touch `h2s.toHaveLength(...)`). No wording is edited inside `APPROVED_STRINGS`; this is a wholly new sentence.
- **Sentence before (existing content):** the Downloads `<h2>` block, ending with the CSV and JSON download links.
- **Sentence carrying the link:** "If you are comparing systems, see **how LootList+ compares to TMB, DKP, EPGP and loot council**."
- **Sentence after (existing content):** the Contextual CTA block (`CTA_HEADING`/`CTA_BODY`/button linking to the app host), unchanged.
- **Anchor text:** `how LootList+ compares to TMB, DKP, EPGP and loot council`
- **Target:** `/compare`
- **Metric ID:** none (not a figure-bearing anchor).
- **Case-study slot note:** the report page's existing Contextual CTA block already points at the app host per D-02; a case-study link could sit in a new sentence alongside this one once a case study is live, naming a guild that used the report's own findings.

### Link 6: Research report -> Pricing

- **Page:** `/research/wow-classic-loot-systems-2026`
- **File:** `app/research/wow-classic-loot-systems-2026/page.tsx`
- **Slot:** the same new paragraph as Link 5, as a second sentence, so only one new `<p>` is added to the page.
- **Sentence before:** "If you are comparing systems, see how LootList+ compares to TMB, DKP, EPGP and loot council."
- **Sentence carrying the link:** "LootList+'s core loot and attendance tools are free for one raid team; see **the free core plan and Premium pricing** for the full breakdown."
- **Sentence after (existing content):** the Contextual CTA block, unchanged.
- **Anchor text:** `the free core plan and Premium pricing`
- **Target:** `/pricing`
- **Metric ID:** none (not a figure-bearing anchor).
- **Case-study slot note:** same as Link 5; this pair of sentences is the natural home for a future case-study mention once one exists.

### Link 7: Guide -- Loot Priority Lists vs Loot Council -> research report

- **Page:** `/blog/loot-priority-lists-vs-loot-council`
- **File:** `app/blog/loot-priority-lists-vs-loot-council/page.tsx`
- **Slot:** end of the "Priority lists" `<h3>` section (lines 181-188), before the "Loot council" `<h3>` begins.
- **Sentence before:** "Some guilds add brackets, point costs, or caps to prevent one person from vacuuming up every drop. But the core idea is the same: raiders declare what they want in advance, and the system resolves conflicts automatically."
- **Sentence carrying the link:** "Across our data, **the median loot list runs 18 items long**."
- **Sentence after:** the "Loot council" heading follows; no prose sentence directly after.
- **Anchor text:** `the median loot list runs 18 items long`
- **Target:** `/research/wow-classic-loot-systems-2026`
- **Metric ID:** `median-list-length`
- **Case-study slot note:** a case-study link could sit in the "Which One Should Your Guild Use?" section as a real example of a guild that switched to priority lists.

### Link 8: Guide -- DKP Is Dead -> research report

- **Page:** `/blog/dkp-is-dead-what-classic-guilds-use-in-2026`
- **File:** `app/blog/dkp-is-dead-what-classic-guilds-use-in-2026/page.tsx`
- **Slot:** a new paragraph inserted after the "Why Priority Lists Are Winning" intro paragraph (lines 293-298) and before the bullet list that follows it.
- **Sentence before:** "The shift toward priority lists tracks with a broader change in how Classic guilds operate in 2026. Rosters are smaller, expectations are higher, and raiders have less patience for systems that feel opaque or gameable."
- **Sentence carrying the link:** "Across active guilds, **29.5% of awarded items go to a top-priority-bracket rank**, exactly the kind of pick priority lists are built to protect."
- **Sentence after:** "Priority lists work because they align incentives correctly:" (introduces the bullet list).
- **Anchor text:** `29.5% of awarded items go to a top-priority-bracket rank`
- **Target:** `/research/wow-classic-loot-systems-2026`
- **Metric ID:** `top-priority-bracket`
- **Case-study slot note:** a case-study link could sit in "Making the Switch" as a real migration story.

### Link 9: Guide -- How to Handle Loot Drama -> research report

- **Page:** `/blog/how-to-handle-loot-drama-without-losing-raiders`
- **File:** `app/blog/how-to-handle-loot-drama-without-losing-raiders/page.tsx`
- **Slot:** end of the "Show the data" `<h3>` section (lines 332-341).
- **Sentence before:** "If your system is transparent, the data is your best argument. Pull up the score comparison. Show both candidates' rankings, attendance, and modifiers. Walk through why the system produced this outcome. Most raiders accept the result once they understand how it was calculated. The ones who don't are usually arguing with the rules, not the outcome, and that's a conversation you can have between tiers."
- **Sentence carrying the link:** "Across active guilds, **45.5% turn on bad-luck protection for exactly this reason**."
- **Sentence after:** the "Building a Drama-Resistant System" `<h2>` follows; no prose sentence directly after.
- **Anchor text:** `45.5% turn on bad-luck protection for exactly this reason`
- **Target:** `/research/wow-classic-loot-systems-2026`
- **Metric ID:** `blp-usage`
- **Case-study slot note:** a case-study link could sit in "Building a Drama-Resistant System" as a real example of a guild whose drama dropped.

### Link 10: Guide -- How to Run Loot Without a Spreadsheet -> research report

- **Page:** `/blog/how-to-run-loot-without-a-spreadsheet`
- **File:** `app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx`
- **Slot:** end of the "Attendance is a separate problem" `<h3>` section (lines 222-233).
- **Sentence before:** "Most loot spreadsheets track loot but not attendance. Attendance lives in a different sheet, or a Discord bot, or the raid leader's head. Connecting attendance to loot priority means manual data entry every week. As we covered in why attendance tracking matters more than loot rules, your loot system is only as good as your attendance data. If the two live in different tools, one of them is always out of date."
- **Sentence carrying the link:** "Across our data, **84.8% of active guilds run attendance settings that differ from the defaults**, proof that attendance rules are not one-size-fits-all."
- **Sentence after:** the "Scales badly" `<h3>` follows; no prose sentence directly after.
- **Anchor text:** `84.8% of active guilds run attendance settings that differ from the defaults`
- **Target:** `/research/wow-classic-loot-systems-2026`
- **Metric ID:** `attendance-weighting`
- **Case-study slot note:** a case-study link could sit in the "Migration Isn't as Hard as You Think" section as a real migration timeline.

### Link 11: Guide -- Why Attendance Tracking Matters -> research report

- **Page:** `/blog/why-attendance-tracking-matters-more-than-loot-rules`
- **File:** `app/blog/why-attendance-tracking-matters-more-than-loot-rules/page.tsx`
- **Slot:** end of the "Attendance and the Loot Score" `<h3>`/`<h2>` section (lines 268-284).
- **Sentence before:** "What this means in practice: two raiders want the same item. One has it ranked #3 on their list, the other has it ranked #1. But the first raider has near-perfect attendance while the second has missed a third of the raids. The Loot Score balances these factors automatically. Everyone can see the math. No arguments, no judgment calls."
- **Sentence carrying the link:** "See **how 84.8% of active guilds tune their attendance weighting** away from the shipped defaults."
- **Sentence after:** the "The Compounding Effect" `<h2>` section follows.
- **Anchor text:** `how 84.8% of active guilds tune their attendance weighting`
- **Target:** `/research/wow-classic-loot-systems-2026`
- **Metric ID:** `attendance-weighting`
- **Case-study slot note:** a case-study link could sit in "The Compounding Effect" as a real before/after attendance story.

### Link 12: Guide -- How to Set Up a Fair Loot System -> research report

- **Page:** `/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild`
- **File:** `app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx`
- **Slot:** end of the "2. Raiders have agency" `<h3>` section (lines 296-301).
- **Sentence before:** "People want input into their own gearing. Being told 'the council decided' with no visibility into why breeds resentment. Let raiders express their priorities."
- **Sentence carrying the link:** "Across our data, **raiders rank lists that run a median of 18 items long**, evidence that they take this seriously when given the chance."
- **Sentence after:** "Every raider should be able to see the current standings, understand how scores are calculated, and verify that the system is working as intended." (start of "3. Transparency isn't optional").
- **Anchor text:** `raiders rank lists that run a median of 18 items long`
- **Target:** `/research/wow-classic-loot-systems-2026`
- **Metric ID:** `median-list-length`
- **Case-study slot note:** a case-study link could sit in "How LootList+ Approaches This" as a real guild's setup story.

---

## APPROVED-STRING lines

APPROVED-STRING: homepage.link-1 = 45.5% of active guilds turn on bad-luck protection
APPROVED-STRING: compare.link-1 = 84.8% of active guilds have changed their attendance weighting from the defaults
APPROVED-STRING: pricing.link-1 = the median loot list runs 18 items long
APPROVED-STRING: about.link-1 = 29.5% of awarded items went to a top-priority-bracket pick
APPROVED-STRING: report.link-1 = how LootList+ compares to TMB, DKP, EPGP and loot council
APPROVED-STRING: report.link-2 = the free core plan and Premium pricing
APPROVED-STRING: blog-loot-priority-lists-vs-loot-council.link-1 = the median loot list runs 18 items long
APPROVED-STRING: blog-dkp-is-dead-what-classic-guilds-use-in-2026.link-1 = 29.5% of awarded items go to a top-priority-bracket rank
APPROVED-STRING: blog-how-to-handle-loot-drama-without-losing-raiders.link-1 = 45.5% turn on bad-luck protection for exactly this reason
APPROVED-STRING: blog-how-to-run-loot-without-a-spreadsheet.link-1 = 84.8% of active guilds run attendance settings that differ from the defaults
APPROVED-STRING: blog-why-attendance-tracking-matters-more-than-loot-rules.link-1 = how 84.8% of active guilds tune their attendance weighting
APPROVED-STRING: blog-how-to-set-up-a-fair-loot-system-for-your-wow-guild.link-1 = raiders rank lists that run a median of 18 items long

---

## The attendance-anchor discrepancy (read before approving Link 2, 10 and 11)

CONTEXT.md's `<specifics>` block records the user endorsing the anchor "84.8% of guilds weight attendance." That phrasing is not what the report measures. The aggregate holding the value 84.8 is `attendance-weighting`, labelled: "Share of active guilds whose attendance configuration differs from the shipped defaults." Attendance scoring is on for every guild by default (confirmed in `03-CONTEXT.md`), so "84.8% of guilds weight attendance" claims something the data does not show; every guild weights attendance, only 84.8% have changed the weighting away from what LootList+ ships with.

This draft does not ship the endorsed phrasing. It also does not silently substitute different wording without flagging it. The three anchors that touch this metric (Link 2, Link 10, Link 11 above) are all reworded to say "have changed their attendance weighting from the defaults" / "run attendance settings that differ from the defaults" / "tune their attendance weighting," which match the aggregate's own label. This is raised again as the first open question below.

---

## No-link rows

Every candidate surface this draft proposes leaving alone, with the reason:

| Surface | Decision | Reason |
|---------|----------|--------|
| `/blog/guild-recruitment-guide-find-raiders-who-stay` | No link | D-03 keeps recruitment and onboarding posts out of the topic-matched subset; this guide's subject (writing applications, running trials) is not something the report measures. |
| `/blog/how-to-onboard-new-raiders-without-killing-morale` | No link | Same reason: onboarding and morale content, no loot-system claim the report proves. |
| `/blog/the-officer-burnout-problem-and-how-to-fix-it` | No link (pending) | Borderline call per D-03: this guide is neither a loot-system post nor a recruitment post, and the report's `unavailable` array explicitly withholds `officer-time-survey` for lack of any instrument, so there is no finding to back a burnout claim. Raised as an open question below rather than decided here. |
| `/premium` | No link | No sentence on this page currently makes a claim the report proves; the page is a feature/upgrade surface, not a narrative page with a natural prose slot. |
| `/changelog` | No link | A running log of dated updates has no single sentence that would carry a contextual claim; forcing one would be a sentence written for a crawler, not a reader. |
| `/blog` (index) | No link | A listing page (post cards), not prose; there is no sentence to attach an anchor to. |
| `/terms` | No link | Legal boilerplate carries no product claim for the report to back up. |
| `/privacy` | No link | Same reason as `/terms`. |

---

## D-03 guide subset

**Included (topic-matched, get a report link):**

- `loot-priority-lists-vs-loot-council` -- directly compares the two systems the report's findings describe (list rank, attendance weighting); the report's median-list-length finding is a natural fit inside the "Priority lists" explanation.
- `dkp-is-dead-what-classic-guilds-use-in-2026` -- argues priority lists are winning because attendance multiplies list ranking, which is exactly what the report's attendance-weighting and top-priority-bracket findings measure.
- `how-to-handle-loot-drama-without-losing-raiders` -- the "Show the data" section is literally about presenting score data to defuse disputes; bad-luck protection usage is a natural citation there.
- `how-to-run-loot-without-a-spreadsheet` -- has a dedicated "Attendance is a separate problem" section that the attendance-weighting finding backs up directly.
- `why-attendance-tracking-matters-more-than-loot-rules` -- the whole post is about attendance feeding the loot score; the attendance-weighting finding is its most natural citation of any guide in the set.
- `how-to-set-up-a-fair-loot-system-for-your-wow-guild` -- walks through "what actually makes a fair loot system," including raiders ranking real lists; the median-list-length finding grounds that claim in real usage data.

**Excluded (untouched, per D-03):**

- `guild-recruitment-guide-find-raiders-who-stay` -- recruitment content, out of scope per D-03.
- `how-to-onboard-new-raiders-without-killing-morale` -- onboarding content, out of scope per D-03.

**Borderline (raised as an open question, not decided here):**

- `the-officer-burnout-problem-and-how-to-fix-it` -- neither a loot-system post nor a recruitment post; the report has no officer-time finding behind it (the `officer-time-survey` metric is explicitly `unavailable` in the aggregates artifact). Drafted as no-link by default; see open questions.

---

## Recrawl list

RECRAWL-LIST:
https://www.getlootlist.com
https://www.getlootlist.com/compare
https://www.getlootlist.com/pricing
https://www.getlootlist.com/about
https://www.getlootlist.com/research/wow-classic-loot-systems-2026
https://www.getlootlist.com/blog/loot-priority-lists-vs-loot-council
https://www.getlootlist.com/blog/dkp-is-dead-what-classic-guilds-use-in-2026
https://www.getlootlist.com/blog/how-to-handle-loot-drama-without-losing-raiders
https://www.getlootlist.com/blog/how-to-run-loot-without-a-spreadsheet
https://www.getlootlist.com/blog/why-attendance-tracking-matters-more-than-loot-rules
https://www.getlootlist.com/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild

This list covers exactly the pages that carry at least one approved link row above: the homepage, `/compare`, `/pricing`, `/about`, the research report (which carries two outbound rows but is one URL), and the six topic-matched guides. No untouched page and no no-link page appears here.

---

## Open questions

1. **The attendance-anchor discrepancy (see full explanation above).** The user previously endorsed "84.8% of guilds weight attendance." This draft ships the faithful rewording instead ("have changed their attendance weighting from the defaults" and its two variants) on Links 2, 10 and 11. Confirm this rewording, or provide different wording that still matches the metric's label: "Share of active guilds whose attendance configuration differs from the shipped defaults."

   **ANSWERED (2026-09-08):** Rewording confirmed. Rows 2, 10 and 11 ship the faithful "changed / differ from the defaults / tune their attendance weighting" variants exactly as drafted. The originally endorsed "84.8% of guilds weight attendance" is not used.

2. **The officer-burnout guide (`the-officer-burnout-problem-and-how-to-fix-it`).** Drafted as no-link. It is not a loot-system post and not a recruitment post, and the report has no officer-time finding to back a claim on it (see the `officer-time-survey` entry in `unavailable`). Confirm no-link, or say what claim (if any) belongs there and which finding backs it.

   **ANSWERED (2026-09-08):** No link, confirmed. The guide subset is final as drafted: six included, two excluded, the officer-burnout guide excluded.

3. **The homepage slot: subhead vs. caption.** Link 1 is drafted against the subhead paragraph ("Every candidate's list rank, attendance, and bad-luck protection roll into one Loot Score anyone can inspect.") because it already names the inputs the report measures. The caption ("Anonymized example. In the app, every score opens into its full calculation.") is the other candidate slot named in CONTEXT.md. Confirm the subhead, or say to move the link to the caption instead.

   **ANSWERED (2026-09-08):** Subhead, confirmed.

4. **Reused metrics across pages.** Attendance-weighting appears on three pages (Compare, the spreadsheet guide, the attendance guide) and median-list-length on three pages (Pricing, the priority-lists guide, the fair-system guide), each with page-specific wording. This is allowed under D-07 (the cap is one link per target per page, not one use of a metric across the whole site), but flagging it in case a different distribution is preferred, for example swapping one guide to cite top-priority-bracket or blp-usage instead for variety.

   **ANSWERED (2026-09-08):** Accepted as drafted; no redistribution.
