# Interview Kit: Verified Guild Case Study

**Purpose:** This document is the one file the user runs the entire guild interview and the entire approval round from. Nothing said on the call becomes public until the guild reviews and approves the exact final wording in writing. The answers collected here become the fields of one committed case-study registry entry (`data/case-studies/`). Do not read this kit as a script to summarize afterward from memory; ask each question as written and record the answer as given.

---

## The Ten Required Questions

These ten are reproduced verbatim from the sprint plan (quoted in `04-RESEARCH.md`). Ask them in this order, using this exact wording. Do not paraphrase, renumber, merge, split, soften, or add a preamble to any of them.

1. What did you use before LootList+? [Feeds: the lead paragraph's "old process" and the meta description's "old system"]
2. What failed most often: list collection, attendance, prioritization, in-raid distribution, or explaining decisions? [Feeds: the lead paragraph's "specific failure"]
3. Roughly how much officer time did the old workflow take per week? [Feeds: the lead paragraph's "time/cost" phrase and the proof strip's before-admin-time figure]
4. What made you willing to try another system? [Feeds: background context for the before/after narrative's "before" panel]
5. How long did real setup take -- not just account creation? [Feeds: the before/after narrative's transition point between the two panels]
6. What changed during the first two raid nights? [Feeds: the before/after narrative's "after" panel]
7. What do raiders use or mention most? [Feeds: supporting detail for the "after" panel and the quote block]
8. What measurable difference can you defend publicly? [Feeds: the lead paragraph's "verified result" and the proof strip's after-admin-time figure]
9. What still needs improvement? [Feeds: the credible-limitation section. The roadmap requires this page to carry a limitation section, so a guild declining to name one here is a blocker for publishing this case study, not a gap the page can quietly absorb. If the guild has nothing to name, do not fill this in yourself -- treat it as a reason the interview has not yet produced a publishable entry.]
10. May the page link your Warcraft Logs, guild profile, or another public identity? [Feeds: the verification line under the quote block]

---

## Added Questions (Not Part of the Required Ten)

These two questions are additions this kit adds because the proof strip needs figures the ten required questions above never collect. They are numbered eleven and twelve, appended after the required ten, so the ten keep their original sprint-plan numbering and can still be quoted against the source without an offset. They are clearly additions, not part of the required set.

11. What is your roster size, and what expansion and tier does your guild currently raid? Answer in the short form the page will show: a number and a short label, not a paragraph. [Feeds: the proof strip's roster-size figure and expansion-and-tier figure]
12. How long has your guild used LootList+, in months? Answer with a short figure, such as a whole number of months. [Feeds: the proof strip's months-using figure]

These figures come from what the guild says in this interview, and only from what the guild says in this interview. They must never be read out of the guild's own LootList+ account data. Product usage data about a named guild would be a second, undisclosed source feeding a public page, needing its own consent conversation separate from "may we quote you." That is why these two questions live here, inside the interview, instead of being pulled from the database after the call ends.

---

## Linking (Built on Question 10)

Record which of the three outcomes the answer to question ten produces:

- A public profile link the guild supplies (a Warcraft Logs page, a guild website, or a similar public identity). Ask for the exact URL when the answer is yes.
- A plain "Verified LootList+ customer" note, with no link.
- A dated "Verified LootList+ customer, interviewed {Month Year}" note, with no link.

Whichever outcome applies, the page renders it through the same component the homepage testimonials already use, so no bespoke link handling is involved for any of the three outcomes.

---

## Written-Approval Checklist

Confirm each line below in writing before treating any of it as approved. A verbal yes given during the call is not sufficient; the approval must arrive in writing, as a separate step from the interview itself.

- [ ] The exact quote text, as it will appear on the page
- [ ] The guild name, as it will appear on the page
- [ ] The character or real name and role that will appear in the byline
- [ ] The expansion and tier
- [ ] Every number that will appear on the page, listed individually: roster size; months using LootList+; the before-figure for the measurable difference; the after-figure for the measurable difference
- [ ] The linking permission from question ten, and the exact URL if the answer is yes
- [ ] Confirmation that the guild has seen the assembled page text before it goes live

The approval record, once received, is filed at `.planning/phases/04-verified-guild-case-study/04-APPROVAL-RECORD.md`, committed to the repository alongside this kit.

---

## What Happens Next

The answers above become one entry in the committed case-study registry (`data/case-studies/`). The `CONTENT-TOKEN` placeholders declared in `04-COPY-DRAFT.md` resolve only from that entry, never from a hand-typed literal. The page is then published by the self-contained publish plan described in `04-PUBLISH-RUNBOOK.md`.

This kit contains no example answer, no sample guild, and no placeholder quote or number anywhere above. A plausible-looking illustration is exactly the kind of content a tired reader could later mistake for approved text, which is the failure this kit is built to prevent.
