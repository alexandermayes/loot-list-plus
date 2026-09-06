STATUS: APPROVED

# Phase 4 Copy Draft

**Purpose:** Every visible string the `/customers/{guild-slug}` case-study template will render, drafted in one place, for the ROADMAP's hard copy sign-off gate. Guild-specific values appear as declared `CONTENT-TOKEN` placeholders rather than as words, because the interview has not happened and this phase forbids inventing any part of it. This approval covers wording and token placement only, not a finished sentence about a real guild. The resolved sentences with real guild values cannot exist until the interview clears and a registry entry is committed at `data/case-studies/`; that resolved text gets its own sign-off at the publish plan, before anything is indexed.

**Sign-off:** received 2026-09-06 as `approve-all` at the plan 04-02 checkpoint. Every string below is approved as drafted, and the Section F open calls are settled by the stated defaults. The `SIGN-OFF: APPROVED` line at the end of this file is the marker plan 04-03 requires.

---

## Token declarations

Every guild-supplied value below is a declared token, never a hand-typed literal. Each line names the exact field it resolves from in `data/case-studies/types.ts`.

CONTENT-TOKEN: guild = CaseStudy.guild
CONTENT-TOKEN: size = CaseStudy.size
CONTENT-TOKEN: expansion_tier = CaseStudy.expansionTier
CONTENT-TOKEN: old_process = CaseStudy.oldProcess
CONTENT-TOKEN: old_process_cost = CaseStudy.oldProcessCost
CONTENT-TOKEN: old_process_failure = CaseStudy.oldProcessFailure
CONTENT-TOKEN: time_period = CaseStudy.timePeriod
CONTENT-TOKEN: verified_result = CaseStudy.verifiedResult
CONTENT-TOKEN: before_admin_time = CaseStudy.title.beforeAdminTime
CONTENT-TOKEN: after_admin_time = CaseStudy.title.afterAdminTime
CONTENT-TOKEN: roster_size = CaseStudy.proofStrip.rosterSize
CONTENT-TOKEN: admin_time_delta = CaseStudy.proofStrip.adminTimeDelta
CONTENT-TOKEN: months_using = CaseStudy.proofStrip.monthsUsing

The sprint plan's human-readable brace labels (`{Guild}`, `{old system}`, `{expansion/tier}`, and so on) are normalized to the snake_case identifiers declared above, so the resolver's word-character token pattern matches. This rename touches the placeholder identifier only; it changes no approved wording.

---

## A. Page frame

These five strings were locked by the approved `04-UI-SPEC.md` Copywriting Contract and are reproduced here, not redrafted. Only the sprint plan's brace labels are replaced by the declared token names above; nothing else in the wording changes.

`page.h1-preferred` is selectable only when the entry carries both admin-time figures (the `CaseStudy.title` preferred variant requires `beforeAdminTime` and `afterAdminTime`); otherwise the entry uses the fallback variant and `page.h1-fallback` renders instead. Whichever H1 string is approved becomes the Article structured-data headline as well, so the rendered H1 and the JSON-LD `headline` can never diverge.

`page.title` mirrors `page.h1-preferred`'s wording rather than adding a distinguishing detail of its own (unlike the research report's title, which added a literal year the H1 dropped). The sprint plan's "Preferred title" and "H1" lines are the same underlying content for this template, so one drafted string covers both the browser `<title>` and the preferred-variant H1; the fallback variant covers both surfaces the same way, through `page.h1-fallback`.

### Approved

APPROVED-STRING: page.title = How {guild} Cut Weekly Loot Admin from {before_admin_time} to {after_admin_time}
APPROVED-STRING: page.h1-preferred = How {guild} Cut Weekly Loot Admin from {before_admin_time} to {after_admin_time}
APPROVED-STRING: page.h1-fallback = How {guild} Made Every Loot Decision Explainable
APPROVED-STRING: page.meta-description = How {guild}, a {size}-player {expansion_tier} guild, replaced {old_process} with ranked lists, attendance-weighted scores, and visible loot decisions.
APPROVED-STRING: page.lead = {guild} is a {size}-player {expansion_tier} guild. Before LootList+, its officers used {old_process}. The system took {old_process_cost} and created {old_process_failure}. After {time_period} with LootList+, the guild {verified_result}.

---

## B. Header chrome

These three strings were left open by the UI contract. Each is drafted below with the alternative that was considered, so approving these is a real choice, not a rubber stamp on a default.

`page.eyebrow`: drafted as a short accent label above the H1, matching the research report's eyebrow treatment. The alternative was no eyebrow at all, letting the H1 carry the page's identity alone; the eyebrow is drafted in because it costs one short word and gives a scanning reader an immediate category signal before they reach the H1.

`page.breadcrumb-label`: drafted as the visible label for the breadcrumb's second segment. The alternative was a label naming the specific guild instead of the section; the section-level label is drafted because there is no `/customers` index page (D-02) for it to link toward, so the label describes what kind of page this is rather than implying a browsable listing that does not exist.

`page.byline`: kept identical to the research report's existing byline, word for word, so both evidence pages carry the same authorship signal and neither reads as a different voice.

### Approved

APPROVED-STRING: page.eyebrow = Case Study
APPROVED-STRING: page.breadcrumb-label = Customers
APPROVED-STRING: page.byline = By Zev, creator of LootList+

---

## C. Proof-strip captions

These four short labels sit under the four 42px accent stat numbers (16px caption per the UI contract's typography scale). Each is drafted short on purpose: a stat whose figure the interview did not collect has its whole block omitted rather than rendered with a caption and no value, so these captions never need to describe an absence.

### Approved

APPROVED-STRING: proofstrip.roster-caption = Roster size
APPROVED-STRING: proofstrip.expansion-caption = Expansion and tier
APPROVED-STRING: proofstrip.metric-caption = Weekly admin time saved
APPROVED-STRING: proofstrip.tenure-caption = Months using LootList+

---

## D. Narrative panels and the credible limitation

`narrative.before-label` and `narrative.after-label` head the two required before/after panels. `limitation.h2` heads the section built from interview question nine. This heading must read as honest rather than alarming: the UI contract deliberately renders this section in standard body treatment with no accent color and no destructive color, because a guild's honest limitation is a credibility feature, not a warning. A heading that sounds like an error notice would undo that visual decision in words, so the drafted heading below is plain and matter-of-fact rather than dramatic.

### Approved

APPROVED-STRING: narrative.before-label = Before LootList+
APPROVED-STRING: narrative.after-label = After LootList+
APPROVED-STRING: limitation.h2 = What still needs work

---

## E. Contextual CTA

The UI contract marks this row draft and not locked, and recommends mirroring the research report's own CTA for visual-family consistency across both evidence pages. That recommendation is carried here as the draft. The alternative is a case-study-specific ask (for example, one referencing the interviewed guild's own expansion or roster size), which was not drafted because no guild content exists yet to reference; a guild-specific CTA can be proposed once a real entry exists, at the publish plan's own sign-off.

### Approved

APPROVED-STRING: cta.heading = See how the same rules work with your roster.
APPROVED-STRING: cta.body = Create a free guild, import your raiders, and compare the priority order before your next raid night.
APPROVED-STRING: cta.button = Create your guild free

---

## F. Open questions

Each open wording call below carries the drafter's own default, so an approve-all reply settles all four rather than leaving a gap.

1. Does the eyebrow appear at all? Default: yes, reading "Case Study" (Section B).
2. What does the breadcrumb's second segment read? Default: "Customers" (Section B), since no `/customers` index page exists to link toward.
3. Does the credible-limitation heading use the guild's own framing, or a neutral one? Default: neutral, "What still needs work" (Section D), so no invented guild framing is required before a real entry exists.
4. Does the contextual CTA mirror the research report's CTA, or get written fresh for this page? Default: mirrors the report's CTA verbatim (Section E), for visual-family consistency between the two evidence pages.

---

This file contains no guild name, no quote text, no role, no realm, and no number presented as a customer figure anywhere above, including in the drafting notes. Every guild-specific value is a declared `CONTENT-TOKEN`, resolved only once a real, interview-approved registry entry exists.

SIGN-OFF: APPROVED 2026-09-06
