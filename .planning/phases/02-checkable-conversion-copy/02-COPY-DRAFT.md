STATUS: DRAFT, PENDING SIGN-OFF

# Phase 2 Copy Draft

**Purpose:** Every proposed string this phase will ship, drafted in one place, so the D-16 consolidated sign-off (plan 02-02, Task 2) can approve it as one voice. Nothing here has shipped. `02-COPY-AUDIT.md` is the evidence this draft is built from; nothing here contradicts it except one flagged evidence discrepancy in Section D, called out explicitly rather than silently corrected.

---

## A. Signup copy (COPY-01)

Surface: `app/components/LoginPage.tsx` (rendered at `app/page.tsx`, the `lootlistplus.com` root). This H1 is **not** the marketing homepage H1 (`app/components/landing/LandingHero.tsx`, "Epic loot" + shimmer span) - that one is D-10's sacred, unchanged H1 and this phase never touches it.

Prohibitions every candidate below is checked against (from this plan's frontmatter):
- **P1 (no time claim):** must not assert a time-to-value or time-saved claim nothing in this repo measures.
- **P2 (no urgency/scarcity):** must not use urgency, scarcity, shaming, or loss-aversion framing.
- **P3 (no Retail implication):** must not imply Retail or current-expansion support, which does not exist today.

### A1. Page title

| | Value |
|---|---|
| Current shipped | `LootList+ ∙ Sign up` |
| Sprint plan starting point | `Create or join a LootList+ guild` |

Candidates:

| ID | Candidate | Clears P1/P2/P3? | Rationale |
|----|-----------|-------------------|-----------|
| T-A | `Create or join a guild ∙ LootList+` | Yes / Yes / Yes | Adapts the plan's action-forward wording into the shipped punctuation-mark voice already used on this exact page today. |
| T-B | `Sign up ∙ LootList+` | Yes / Yes / Yes | Minimal change from the current shipped title; lowest-risk option if the user prefers not to touch this string at all. |

### A2. H1

| | Value |
|---|---|
| Current shipped | `Epic loot deserves an epic system.` (`app/components/LoginPage.tsx:145`) |
| Sprint plan starting point | `Set up fair loot in minutes.` |

**Flagged, not a candidate:** the sprint plan's literal starting-point H1 asserts a setup speed ("in minutes") that no measurement in this repo supports. This is the exact class of claim PROOF-02 exists to remove from the homepage, so it fails P1 and is not offered as a candidate. It is recorded here only to document why it was rejected rather than silently dropped.

Candidates (both carry no time claim, satisfying the must-have that at least one H1 candidate contains none):

| ID | Candidate | Clears P1/P2/P3? | Rationale |
|----|-----------|-------------------|-----------|
| H-A | `Set up fair loot for your guild.` | Yes / Yes / Yes | The plan's own wording with the unverifiable time claim removed; keeps the plan's chosen verb ("set up") and keeps "fair loot" as the category anchor. |
| H-B | `Fair loot decisions, out of the spreadsheet.` | Yes / Yes / Yes | Ties into vocabulary already shipped elsewhere on the site ("0 spreadsheets needed" stat, `/compare`'s "no spreadsheets, no guesswork"), giving the signup page a voice thread that matches the rest of the product rather than restating the marketing hero's tagline. |

### A3. Body

| | Value |
|---|---|
| Current shipped | `LootList+ is a transparent loot management system for WoW guilds. Includes loot submissions, attendance tracking and more.` |
| Sprint plan starting point | `Connect with Discord to create your guild or join one you have been invited to. The core LootList+ plan is free.` |

Candidates:

| ID | Candidate | Clears P1/P2/P3? | Rationale |
|----|-----------|-------------------|-----------|
| B-A | `Connect with Discord to create your guild or join one you have already been invited to. Core features are free.` | Yes / Yes / Yes | Adapts the plan's wording; uses "Core features are free" per the repo's own house style (`app/layout.tsx`'s comment: never say "completely free," always "free core plan" / "core features are free"). |
| B-B | `Create your guild or join one with Discord. LootList+ is a transparent loot system for World of Warcraft guilds, core features free.` | Yes / Yes / Yes | Leads with the action (matches the CTA immediately below it), states the category plainly, uses the broadened D-12 wording ("World of Warcraft," not "WoW Classic"). |

### A4. Primary CTA

| | Value |
|---|---|
| Current shipped | `Sign up with Discord` |
| Sprint plan starting point | `Continue with Discord` |

Candidates:

| ID | Candidate | Clears P1/P2/P3? | Rationale |
|----|-----------|-------------------|-----------|
| C-A | `Continue with Discord` | Yes / Yes / Yes | The plan's starting point, adopted directly; neutral and accurate for both new signups and returning logins (the button is shared by both flows via `handleDiscordLogin`). |
| C-B | `Sign up with Discord` | Yes / Yes / Yes | Keep the currently shipped label; offered as the no-change option. |

### A5. Secondary link text

| | Value |
|---|---|
| Current shipped | `See how it works` (href today: `https://www.getlootlist.com`) |
| Sprint plan starting point | `See how LootList+ works` |

Candidates:

| ID | Candidate | Clears P1/P2/P3? | Rationale |
|----|-----------|-------------------|-----------|
| S-A | `See how LootList+ works` | Yes / Yes / Yes | The plan's starting point; names the product explicitly since this link sits on a different domain than the brand's marketing pages. |
| S-B | `See how it works` | Yes / Yes / Yes | Keep the currently shipped label; offered as the no-change option. |

**Destination (locked, D-08, not a candidate):** the href becomes the absolute cross-domain URL `https://www.getlootlist.com/#how-it-works`. Verified: the target section id (`id="how-it-works"`) exists at `app/components/landing/LandingHowItWorks.tsx:40`, and that component renders on the marketing domain, not on the signup domain where `LoginPage.tsx` renders. A relative `/#how-it-works` would not resolve on the signup domain (RESEARCH.md Pitfall 2).

**Unchanged (not a candidate, stated for completeness):** `robots: { index: false }` stays as-is on `app/page.tsx`. D-09/D-10/D-11 govern indexed marketing/content pages; this is a login surface and is intentionally not indexed.

---

## B. Testimonial verification lines (PROOF-01)

Locked line format (D-03, sprint plan verbatim shape): quote, then `Verified LootList+ customer ∙ Interviewed {Month Year} ∙ [Guild or Warcraft Logs profile]`. Per D-04, all four guilds below resolved as **currently active** (within the 30-day window ending 2026-08-29), so none carry the dated variant, that variant is reserved for guilds whose most recent activity falls outside the window. Per D-02, every metadata field the user did not supply is recorded here as the literal `NOT SUPPLIED`, not invented. Per D-05, no Review/AggregateRating structured data is proposed anywhere in this section, this is visible text only.

### B1. Scizophrenic, Crucible

- Guild as written in JSX: `Crucible`
- Author: `Scizophrenic`
- Role: `NOT SUPPLIED`
- Expansion/tier: `NOT SUPPLIED`
- Interviewed (month/year): `NOT SUPPLIED`
- D-03/D-04 variant: active guild, no public Warcraft Logs URL on file, plain text-only note.
- **Exact rendered line:** `Verified LootList+ customer` (no link)

### B2. Para/Kidney, Indecisive

- Guild as written in JSX: `Indecisive`
- Author: `Para/Kidney`
- Role: `NOT SUPPLIED`
- Expansion/tier: `NOT SUPPLIED`
- Interviewed (month/year): `NOT SUPPLIED`
- D-03/D-04 variant: active guild, public Warcraft Logs URL on file, guild name links out.
- **Exact rendered line:** `Verified LootList+ customer`, with the guild name `Indecisive` rendered as a link to `https://fresh.warcraftlogs.com/guild/us/nightslayer/indecisive`

### B3. 2laxs, Bad Guys

- Guild as written in JSX: `Bad Guys`
- Author: `2laxs`
- Role: `NOT SUPPLIED`
- Expansion/tier: `NOT SUPPLIED`
- Interviewed (month/year): `NOT SUPPLIED`
- D-03/D-04 variant: active guild, no public Warcraft Logs URL on file, plain text-only note.
- **Exact rendered line:** `Verified LootList+ customer` (no link)

### B4. Xx_, Soul Stoned

- Guild as written in JSX: `Soul Stoned`
- Author: `Xx_`
- Role: `NOT SUPPLIED`
- Expansion/tier: `NOT SUPPLIED`
- Interviewed (month/year): `NOT SUPPLIED`
- D-03/D-04 variant: active guild, public Warcraft Logs URL on file, guild name links out.
- **Exact rendered line:** `Verified LootList+ customer`, with the guild name `Soul Stoned` rendered as a link to `https://fresh.warcraftlogs.com/guild/us/dreamscythe/soul%20stoned`

**No quote wording changes (D-01):** all four quote texts stay exactly as shipped in `app/components/landing/LandingValueProps.tsx`. **No structured data (D-05):** no Review/AggregateRating schema is added for any of these four blocks; this line item is a statement of what is deliberately absent, not a proposal.

---

## C. Stats block (PROOF-02)

### C1. The one locked replacement (D-06)

Row 2 of `app/components/landing/LandingValueProps.tsx` (currently three side-by-side `StatCard`s):

| Card | Current | Proposed |
|------|---------|----------|
| Card 1 (line 143) | `value="3+"` / `label="hours saved a week"` | `value="5"` / `label="supported Classic expansions"` |
| Card 2 (line 144, untouched) | `value="0"` / `label="spreadsheets needed"` | No change |
| Card 3 (line 145, untouched) | `value="1"` / `label="system for loot, attendance, and priorities"` | No change |

Fact-check (from `02-COPY-AUDIT.md`'s Expansion Fact Check section): `/about` lists five named expansions (Classic Era, TBC, Wrath, Cataclysm, MoP) and `/pricing` and `LandingHero.tsx` both use the shorthand "Classic Era through Mists of Pandaria" describing the same five-expansion range. The replacement stat is accurate and consistent with what is already shipped on two other pages.

### C2. Undecided superlatives and unverifiable claims (require a sign-off answer; see Section G item 2)

**C2a. The "100% transparent" stat, Row 1 (`app/components/landing/LandingValueProps.tsx:128`)**

Current: `value="100%"` / `label="transparent"`

| Option | Proposal |
|--------|----------|
| Fix (qualitative reword, recommended) | `value="Every"` / `label="score fully explained"`, a non-numeric claim that matches what the product actually does (every Loot Score's inputs are visible) without implying a measured percentage. |
| Remove | Drop the card; Row 1 becomes the quote card alone. Not recommended, this breaks the existing two-column grid layout for no functional reason. |
| Keep as-is | Keep `100%` / `transparent`. Not recommended; "100%" implies a measured metric with no defined methodology, which is exactly the PROOF-02 class of claim this phase exists to remove. |

**C2b. "Best parts of every/any loot system" superlative, bundled across two files**

| File | Current |
|------|---------|
| `app/components/landing/LandingCompare.tsx:91` | "LootList+ combines the best parts of every loot system into one. No spreadsheets, no guesswork, full transparency for every raider." |
| `app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx:334` | "LootList+ combines the best parts of loot council and priority lists into what it calls a Loot Score system." |

| Option | Proposal |
|--------|----------|
| Fix (recommended, consistent across both) | Homepage: "LootList+ combines ranked loot lists, attendance-weighted scoring, and transparent priority into one system. No spreadsheets, no guesswork." Blog: "LootList+ combines ranked loot lists and attendance-weighted scoring into what it calls a Loot Score system." Both describe the actual mechanism (checkable against the product) instead of an unverifiable "best" claim. |
| Keep as-is | Not recommended; "best parts of X" is a superlative comparative claim no visitor can verify against every loot system that exists. |

**C2c. "The ultimate loot management system" superlative, bundled across three surfaces**

| File | Current |
|------|---------|
| `public/site.webmanifest:4` | `"description": "The ultimate loot management system for World of Warcraft Classic guilds"` |
| `app/(landing)/landing/page.tsx:30` (openGraph.description) | "The ultimate loot management system for World of Warcraft Classic guilds. Track attendance, manage priority lists, and streamline loot distribution." |
| `app/(landing)/landing/page.tsx:45` (twitter.description) | "The ultimate loot management system for World of Warcraft Classic guilds." |

| Option | Proposal |
|--------|----------|
| Fix (recommended, synced with Section D's homepage rewrite) | Drop "ultimate" and drop "Classic" (D-12). Manifest: `"A transparent loot management system for World of Warcraft guilds"`. openGraph/twitter: reuse the homepage description drafted in Section D2 below rather than authoring a third variant, closing the drift RESEARCH.md flagged between the plain description and the superlative openGraph/twitter copy. |
| Keep as-is | Not recommended; "the ultimate" is an unverifiable superlative and this string is also flagged in Section E's repositioning inventory for the same reason independent of PROOF-02. |

**C2d. Blog migration-speed claim (`app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx:368`)**

Current: "Most guilds are fully migrated within two raid resets."

| Option | Proposal |
|--------|----------|
| Fix (recommended) | "Most guilds find the migration lighter than expected once rosters and rules are set up once." No specific timeframe, no implied statistic, still sets realistic expectations. |
| Remove | Delete the sentence with no replacement. |
| Keep as-is | Not recommended; "within two raid resets" reads as a specific, sourced statistic with no data or methodology behind it. |

### C3. Already resolved, no sign-off needed (carried forward from the audit for completeness, per PROOF-02's "nothing silently left standing")

- `app/components/landing/LandingValueProps.tsx:166` quote text ("...it's a 10/10 and the best loot management system I've ever used.") - **Keep.** Author's own quoted wording; D-01 forbids editing quote content even though it contains a superlative.
- `app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx:414` ("The best system in the world fails if it depends on one person's free time.") - **Keep.** A generic aphorism about tooling in general, not a claim about LootList+ itself.
- `app/compare/page.tsx:32` `APP_URL` constant defect - **Not fixed in this section.** Out of scope for PROOF-02/D-11; carried to Section G item 3 as its own named sign-off question, since the executor is already editing this file for D-11's metadata but the defect is unrelated to metadata copy.

---

## D. Titles and metadata (D-09, D-10, D-11)

Each block below treats `title`, `description`, `openGraph.title`, `openGraph.description`, `twitter.title`, `twitter.description`, and (where present) `jsonLd.headline` / `jsonLd.description` as one copy unit, per this task's instruction to close drift between siblings rather than reproduce it.

### D1. Evidence used below (verified directly against the primary-source files, not just the audit's summary)

- **Changelog cannibalization:** `/changelog` receives 514 of 597 total impressions (86%) for the query "loot list" at a 0.19% CTR, position ~12.36 (source: `scripts/analytics/exports/gsc-trend-page-2026-05-24_2026-08-23.csv`, `gsc-trend-query-2026-05-24_2026-08-23.csv`).
- **Compare competitor-query position:** the query-level export shows "tmb loot" at position 9.35 and "tmb loot system" at position 9.25 (both competitor-cluster queries); the page-level export shows `/compare` overall at position 12.59, clicks 4, impressions 305, CTR 1.31%. This is the source of "position roughly 9 to 12.6."
- **AI answer log, flagged evidence discrepancy:** CONTEXT.md's D-11 and this plan's own Task 1 instructions state "the week-1 AI answer log shows Claude citing /compare in 4 of 6 answers." Re-reading `scripts/analytics/ai-answer-log.csv` directly (all 6 Claude rows, P1 through P6): P1 and P2 have no cited_url; P3, P4, and P5 cite `https://www.getlootlist.com/compare`; P6 cites `https://www.getlootlist.com/pricing`. That is **3 of 6**, not 4 of 6. Per this plan's own instruction to flag rather than silently resolve a factual inconsistency against the audit/context, this discrepancy is not corrected here, the citation below uses the verified 3-of-6 figure and the discrepancy is carried to the checkpoint for the user to confirm which number is correct (see the checkpoint return).

### D2. Homepage (`app/(landing)/landing/page.tsx`)

| | Current |
|---|---------|
| title | `LootList+ \| Transparent Loot Management for WoW Classic` |
| description | `Rank loot lists, track attendance, and calculate transparent item priority for your WoW Classic guild. Create your guild free with Discord.` |
| openGraph.title | `LootList+ - Loot Management for WoW Classic Guilds` |
| openGraph.description | `The ultimate loot management system for World of Warcraft Classic guilds. Track attendance, manage priority lists, and streamline loot distribution.` |
| openGraph image alt | `LootList+ - Loot Management for WoW Classic Guilds` |
| twitter.title | `LootList+ - Loot Management for WoW Classic Guilds` |
| twitter.description | `The ultimate loot management system for World of Warcraft Classic guilds.` |

Note: the site-wide JSON-LD (`WebSite`/`Organization`/`SoftwareApplication` in `app/layout.tsx`) also renders on this route but is a global block shared by every page; its wording change is tracked once, in Section E (repositioning rows 5 and 6), not duplicated here.

**Title candidates** (category-forward, leading with searched words, brand attached, per D-10):

| ID | Candidate |
|----|-----------|
| H-T1 | `Loot List & Attendance Tracker for World of Warcraft Guilds \| LootList+` |
| H-T2 | `Loot Lists, Attendance & Loot Score Tracking \| LootList+` |

**Description candidate** (this single string also satisfies Section E's repositioning row 27, drafted once here per this task's explicit instruction not to draft it twice):

`Rank loot lists, track attendance, and calculate transparent item priority for your World of Warcraft guild. Create your guild free with Discord.`

**openGraph.description candidate** (drops "ultimate," drops "Classic," closes the drift against the plain description above):

`LootList+ is a transparent loot management system for World of Warcraft guilds. Track attendance, manage priority lists, and streamline loot distribution.`

**twitter.description candidate** (short form, same non-superlative core claim):

`A transparent loot management system for World of Warcraft guilds.`

**openGraph.title / twitter.title / image alt:** this exact string is also Section E's repositioning rows 28, 30, and 31; the proposed replacement is drafted once there (`LootList+ - Loot Management for World of Warcraft Guilds`) and referenced here rather than re-derived.

### D3. Changelog (`app/changelog/layout.tsx`)

| | Current |
|---|---------|
| title | `Changelog` (renders as "Changelog \| LootList+" via the root layout's title template) |
| description | `Every LootList+ update: new features, improvements, and fixes for WoW guild loot management, attendance tracking, and Discord integration.` |
| openGraph.title | `LootList+ Changelog` |
| openGraph.description | `New features, improvements, and fixes across LootList+ for WoW guild loot management.` |
| noindex? | No (already correct today, D-09's "no noindex" requirement is already met) |

Cannibalization evidence: see D1 above, 514 of 597 impressions on "loot list" at 0.19% CTR. The goal is an unambiguous changelog-intent title that does not compete with the homepage's "loot list" positioning above (D-10).

**Title candidates:**

| ID | Candidate |
|----|-----------|
| CH-T1 | `LootList+ Changelog: Every Update` |
| CH-T2 | `LootList+ Changelog: Recent Updates` |

**Description candidates:**

| ID | Candidate |
|----|-----------|
| CH-D1 | `Every LootList+ update: new features, improvements, and fixes for World of Warcraft guild loot management, attendance tracking, and Discord integration.` |
| CH-D2 | `Recent LootList+ releases: new features, fixes, and improvements. See what shipped and when.` |

**openGraph.title candidate:** `LootList+ Changelog` (unchanged; already changelog-unambiguous).
**openGraph.description candidate:** `New features, improvements, and fixes across LootList+ for World of Warcraft guild loot management.` (repositioned per D-12, synced with whichever description candidate is chosen).

### D4. Compare (`app/compare/page.tsx`)

| | Current |
|---|---------|
| title | `LootList+ vs TMB, DKP, EPGP, and Loot Council` |
| description | `An honest comparison of WoW Classic loot systems. See how LootList+ stacks up against That's My BiS, DKP, EPGP, and traditional loot council.` |
| openGraph.title | Same as title |
| openGraph.description | `An honest comparison of WoW Classic loot systems. See how LootList+ stacks up against the alternatives.` |
| jsonLd.headline | Same as title |
| jsonLd.description | Same as openGraph.description (duplicates it verbatim) |

Note: `metadata.description`, `metadata.openGraph.description`, and `jsonLd.description` are three separate copies of the same sentence in this file today and must move together, per this task's explicit instruction.

Evidence: see D1 above (position ~9 to 12.6, 0 to 1.31% CTR on competitor queries; AI answer log discrepancy flagged in D1, verified figure is 3 of 6 Claude answers citing `/compare`, one of which explicitly flagged the page as "vendor-written marketing").

**Title candidates** (checkable claims, not superlatives; both already name real competitor systems, which is the checkable part):

| ID | Candidate |
|----|-----------|
| CO-T1 | `LootList+ vs TMB, DKP, EPGP and Loot Council: Feature Comparison` |
| CO-T2 | `LootList+ vs That's My BiS, DKP, EPGP and Loot Council` |

**Description candidates** (drop the self-assessed "honest," which is itself an unverifiable marketing-toned claim, in favor of naming the specific, checkable thing being compared):

| ID | Candidate |
|----|-----------|
| CO-D1 | `Feature-by-feature comparison of LootList+, That's My BiS, DKP, EPGP, and loot council: ranked lists, attendance tracking, and computed loot priority.` |
| CO-D2 | `See exactly which loot-system features LootList+, TMB, DKP, EPGP, and loot council each support, and where LootList+ fits your guild.` |

**openGraph.description candidate:** `How LootList+ compares to TMB, DKP, EPGP, and loot council on ranked lists, attendance, and computed priority.`

**jsonLd.headline / jsonLd.description:** move together with whichever title/openGraph.description candidates are chosen at sign-off (jsonLd.headline mirrors the final title, jsonLd.description mirrors the final openGraph.description), per the instruction that these three copies must move together.

**Also repositioned in this same file (D-12, drafted once here, referenced from Section E rows 23-25):** every remaining "WoW Classic loot systems" instance in this file becomes "World of Warcraft loot systems" as part of whichever candidate above is selected.

---

## E. Repositioning dispositions (D-12)

Every row below is carried forward from `02-COPY-AUDIT.md`'s Repositioning Inventory (34 occurrences, 13 files, reconciled with zero drift against a fresh grep at audit time). Rows already drafted in full in Section D above are cross-referenced rather than re-derived, per this task's explicit instruction not to draft the same string twice.

| # | File | Line | Current string (verbatim) | Proposed replacement | Disposition |
|---|------|------|---------------------------|----------------------|-------------|
| 1 | `app/layout.tsx` | 33 | `default: "LootList+ - Loot Management for WoW Classic Guilds"` | `"LootList+ - Loot Management for World of Warcraft Guilds"` | replace |
| 2 | `app/layout.tsx` | 39 | "...for World of Warcraft Classic guilds. Raiders submit..." (the one definitive product description) | Replace "World of Warcraft Classic guilds" -> "World of Warcraft guilds" | replace |
| 3 | `app/layout.tsx` | 40 | `keywords: ["WoW Classic", ...]` | No change | keep, per the user's added CONTEXT.md note that "WoW" shorthand and "WoW Classic" stay present as distinct valid search keywords alongside "World of Warcraft" |
| 4 | `app/layout.tsx` | 54 | `alt: "LootList+ - Loot Management for WoW Classic Guilds"` | `"LootList+ - Loot Management for World of Warcraft Guilds"` | replace |
| 5 | `app/layout.tsx` | 100 | `"description": "...for WoW Classic guilds."` (WebSite node) | Replace "WoW Classic guilds" -> "World of Warcraft guilds" | replace |
| 6 | `app/layout.tsx` | 130 | `"description": "...for WoW Classic guilds."` (SoftwareApplication node) | Replace "WoW Classic guilds" -> "World of Warcraft guilds" | replace |
| 7 | `app/about/page.tsx` | 9 | `title: 'About LootList+: Built by a WoW Classic Guild'` | `"About LootList+: Built by a World of Warcraft Guild"` | replace |
| 8 | `app/about/page.tsx` | 11 | `description: '...built by a WoW Classic guild...'` | Replace "WoW Classic guild" -> "World of Warcraft guild" | replace |
| 9 | `app/terms/page.tsx` | 8 | `description: '...for World of Warcraft Classic guilds.'` | Replace "World of Warcraft Classic guilds" -> "World of Warcraft guilds" | replace |
| 10 | `app/terms/page.tsx` | 40 | "...loot management tool for World of Warcraft Classic. The Service..." | Replace "World of Warcraft Classic" -> "World of Warcraft" | replace |
| 11 | `app/privacy/page.tsx` | 33 | "...our loot management service for World of Warcraft Classic." | Replace "World of Warcraft Classic" -> "World of Warcraft" | replace |
| 12 | `app/blog/page.tsx` | 62 | `title: 'How to Run Loot in WoW Classic Without a Spreadsheet'` (index card) | Mirrors row 13's resolution | **Contingent, pending Section G item 1.** Default recommendation below assumes full broaden. |
| 13 | `app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx` | 10 | `title: 'How to Run Loot in WoW Classic Without a Spreadsheet'` (indexed page title) | `"How to Run Loot in World of Warcraft Without a Spreadsheet"` | **Named sign-off question, Section G item 1.** Not defaulted silently. |
| 14 | `app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx` | 30 | `openGraph.title: '...WoW Classic...'` | Mirrors row 13's resolution | same named sign-off question |
| 15 | `app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx` | 45 | `headline: '...WoW Classic...'` (JSON-LD Article) | Mirrors row 13's resolution | same named sign-off question |
| 16 | `app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx` | 101 | `name: '...WoW Classic...'` (BreadcrumbList item) | Mirrors row 13's resolution | same named sign-off question |
| 17 | `app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx` | 121 | `<BlogTracker ... title="...WoW Classic..." />` (analytics prop, not rendered) | Mirrors row 13's resolution | same named sign-off question, kept in sync so the tracked label never drifts from the visible title |
| 18 | `app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx` | 139 | H1: "How to Run Loot in WoW Classic Without a Spreadsheet" | Mirrors row 13's resolution | same named sign-off question |
| 19 | `app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx` | 11 | `description: '...for your WoW Classic guild.'` | Replace "WoW Classic guild" -> "World of Warcraft guild" | replace |
| 20 | `app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx` | 44 | `description: '...for your WoW Classic guild.'` (JSON-LD, duplicates row 19) | Replace "WoW Classic guild" -> "World of Warcraft guild" | replace |
| 21 | `app/components/landing/LandingHero.tsx` | 135 | "LootList+ is loot management for WoW Classic guilds. Raiders rank..." | Replace "WoW Classic guilds" -> "World of Warcraft guilds" | replace |
| 22 | `app/components/landing/BlogRelatedPosts.tsx` | 28 | `title: 'How to Run Loot in WoW Classic Without a Spreadsheet'` (related-post card) | Mirrors row 13's resolution | **Contingent, pending Section G item 1.** |
| 23 | `app/compare/page.tsx` | 10 | `description: 'An honest comparison of WoW Classic loot systems...'` | Drafted in Section D4 | replace, drafted once in D4 |
| 24 | `app/compare/page.tsx` | 26 | `openGraph.description: 'An honest comparison of WoW Classic loot systems...'` | Drafted in Section D4 | replace, drafted once in D4 |
| 25 | `app/compare/page.tsx` | 39 | `jsonLd.description: 'An honest comparison of WoW Classic loot systems...'` | Drafted in Section D4 | replace, drafted once in D4 |
| 26 | `app/(landing)/landing/page.tsx` | 23 | `title: 'LootList+ \| Transparent Loot Management for WoW Classic'` | Drafted in Section D2 (feeds D-09/D-10's category-forward rewrite too) | replace, drafted once in D2 |
| 27 | `app/(landing)/landing/page.tsx` | 24 | `description: '...for your WoW Classic guild...'` | Drafted in Section D2 | replace, drafted once in D2 |
| 28 | `app/(landing)/landing/page.tsx` | 29 | `openGraph.title: 'LootList+ - Loot Management for WoW Classic Guilds'` | `"LootList+ - Loot Management for World of Warcraft Guilds"` | replace |
| 29 | `app/(landing)/landing/page.tsx` | 30 | `openGraph.description: 'The ultimate loot management system for World of Warcraft Classic guilds...'` | Drafted in Section D2 (also Section C2c, the "ultimate" superlative in this same string) | replace, drafted once in D2/C2c |
| 30 | `app/(landing)/landing/page.tsx` | 39 | `alt: 'LootList+ - Loot Management for WoW Classic Guilds'` | `"LootList+ - Loot Management for World of Warcraft Guilds"` | replace |
| 31 | `app/(landing)/landing/page.tsx` | 44 | `twitter.title: 'LootList+ - Loot Management for WoW Classic Guilds'` | `"LootList+ - Loot Management for World of Warcraft Guilds"` | replace |
| 32 | `app/(landing)/landing/page.tsx` | 45 | `twitter.description: 'The ultimate loot management system for World of Warcraft Classic guilds.'` | Drafted in Section D2 (also Section C2c) | replace, drafted once in D2/C2c |
| 33 | `README.md` | 3 | "...for World of Warcraft Classic guilds. Raiders submit..." (identical sentence to row 2) | Replace "World of Warcraft Classic guilds" -> "World of Warcraft guilds" | replace, must change together with row 2 |
| 34 | `public/site.webmanifest` | 4 | `"description": "The ultimate loot management system for World of Warcraft Classic guilds"` | Drafted in Section C2c | replace, drafted once in C2c |

**Not in scope for this in-repo sweep (D-14):** Discord server description, GitHub repository description field, and old external posts. See Section F.

### Residual allowances

One line per file in the inventory, including files whose approved count is 0. Defaults below assume the **Section G item 1 recommendation (full broaden)**; if the user instead chooses the lower-risk partial option for the blog-title question, the three contingent files' numbers change as noted in Section G item 1, and this section is corrected at Task 2 to match the actual answer.

RESIDUAL-ALLOWANCE: app/layout.tsx = 1
RESIDUAL-ALLOWANCE: app/about/page.tsx = 0
RESIDUAL-ALLOWANCE: app/terms/page.tsx = 0
RESIDUAL-ALLOWANCE: app/privacy/page.tsx = 0
RESIDUAL-ALLOWANCE: app/blog/page.tsx = 0
RESIDUAL-ALLOWANCE: app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx = 0
RESIDUAL-ALLOWANCE: app/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild/page.tsx = 0
RESIDUAL-ALLOWANCE: app/components/landing/LandingHero.tsx = 0
RESIDUAL-ALLOWANCE: app/components/landing/BlogRelatedPosts.tsx = 0
RESIDUAL-ALLOWANCE: app/compare/page.tsx = 0
RESIDUAL-ALLOWANCE: app/(landing)/landing/page.tsx = 0
RESIDUAL-ALLOWANCE: README.md = 0
RESIDUAL-ALLOWANCE: public/site.webmanifest = 0

(If the user instead picks the partial/lower-risk option in Section G item 1: `app/blog/page.tsx` becomes 1, `app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx` becomes 6, `app/components/landing/BlogRelatedPosts.tsx` becomes 1, and `app/layout.tsx` stays 1, all other files unchanged.)

---

## F. External handoff checklist (D-14)

No executor edits any of the three items below. These are founder-owned surfaces outside this repo; the user executes them directly.

| Surface | Current wording (as known to the executor) | Proposed wording | Where to change it |
|---------|---------------------------------------------|-------------------|---------------------|
| Discord server description | Not captured in this repo; unknown to the executor. | `Transparent loot management for World of Warcraft guilds. Ranked lists, attendance tracking, and Loot Score priority.` | Discord server, Server Settings, Overview, Description field. |
| GitHub repository description field (distinct from the in-repo `README.md`, which this phase does edit, see row 33 above) | Not captured in this repo; unknown to the executor. | `Transparent loot management for World of Warcraft guilds: ranked lists, attendance, and Loot Score priority.` | github.com/alexandermayes/loot-list-plus, gear icon next to "About" in the repo sidebar, Description field. |
| Old external posts (Reddit, Blizzard forum launch posts) | Historical posts, not in this repo; predate the current pricing and current "World of Warcraft" wording. | Add this banner at the top of each post without rewriting the historical post underneath: `Update, August 25, 2026: LootList+ is now out of beta. The core loot system remains free. Optional Premium adds multiple raid teams and the officer activity feed for $4.99 per month or $39 per year per guild. The original post below predates Premium.` | Top of the existing Reddit thread and the existing Blizzard forum post, as an edit/update to each, not a new post. |

---

## G. Open questions for sign-off

**1. Blog ranking-title scope (rows 12, 13, 14, 15, 16, 17, 18, 22 in Section E).**

The indexed title, on-page H1, and JSON-LD headline of `app/blog/how-to-run-loot-without-a-spreadsheet/page.tsx` are three copies of one ranking title, mirrored by two other files (the blog index card and the related-posts card).

- **Option A, full broaden (recommended):** change all 8 occurrences (6 in the main post, 1 in the blog index, 1 in the related-posts card) to "World of Warcraft." Consistent with D-12's general mandate that a half-applied broadening is worse than either consistent state. Cost: changing an indexed ranking title carries more SEO volatility than a metadata-only edit (RESEARCH.md Open Question 2); this specific post's search volume was not separately measured in the audit, so the size of that risk is unquantified.
- **Option B, partial (leave the indexed title, H1, and JSON-LD headline alone; only the tracker-title (analytics) sync stays whatever Option is chosen, since it must not drift from whatever ships):** zero ranking-volatility risk, but leaves 8 occurrences of "WoW Classic" standing while every other in-repo surface says "World of Warcraft," which is the precise half-applied state D-12's own rationale calls worse than either consistent option.

**Recommendation:** Option A. **Your answer sets Section E rows 12-18 and 22's final disposition and the three contingent RESIDUAL-ALLOWANCE lines in Section E.**

**2. Each undecided superlative from Section C2.** Choose fix (using the proposed replacement), remove, or keep with a reason, for each of:
- C2a: the "100% transparent" stat (recommended: fix, qualitative reword)
- C2b: the "best parts of every/any loot system" superlative, both instances (recommended: fix, consistent across both)
- C2c: the "ultimate loot management system" superlative, all three instances (recommended: fix, synced with the homepage rewrite)
- C2d: the blog migration-speed claim (recommended: fix, remove the specific timeframe)

**3. The `/compare` CTA destination defect (`app/compare/page.tsx:32`).** `const APP_URL = 'https://www.getlootlist.com'` sends every CTA on this page to the marketing homepage domain instead of the signup domain, while every sibling page (`LandingNav.tsx`, `LandingHero.tsx`, `app/about/page.tsx`, `app/pricing/page.tsx`) correctly uses `https://www.lootlistplus.com`. This is out of D-11's locked scope (it is not a copy claim), and it was flagged rather than silently fixed because this plan's own instructions say to flag rather than auto-fix inconsistencies inside a copy-only plan. **Recommendation:** fix it to `https://www.lootlistplus.com`, since the executor is already editing this file for the D-11 metadata rewrite and the current behavior sends a clicking officer to the wrong domain. Cost of fixing: a one-line constant change. Cost of not fixing: officers who click any CTA on `/compare` land on the marketing homepage instead of the signup flow.

**4. D-04 activity window and any unresolved guild.** Already answered, not a new decision. `ACTIVITY-WINDOW: 30 days from 2026-08-29 (cutoff 2026-07-30)`, confirmed final by the user at plan 02-01's Task 3 checkpoint. All four guilds (Crucible, Indecisive, Bad Guys, Soul Stoned) resolved to a real, active `guilds` row; none required exclusion. Recorded here only so it is visible at this consolidated sign-off, not because it needs to be re-decided.

**5. Whether the quote count is four or five.** Already answered, not a new decision. Confirmed at 4 at plan 02-01's Task 3 checkpoint; the codebase has never had a fifth `QuoteCard`. CONTEXT.md's D-01 "all 5 homepage quotes stay up" reflected an assumption that did not match the actual codebase, not a real fifth quote. Recorded here only for this consolidated sign-off's visibility.

---
