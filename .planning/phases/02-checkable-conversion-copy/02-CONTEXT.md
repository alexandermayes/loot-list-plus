# Phase 2: Checkable Conversion Copy - Context

**Gathered:** 2026-08-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Every claim an officer reads on the path to signup is either verifiable or gone. Covers COPY-01 (signup page copy), PROOF-01 (testimonial verification format), PROOF-02 (unsupported claims replaced with checkable facts), plus two folded SEO todos (title/meta copy on the same path) and a wording-level repositioning of in-repo surfaces from "WoW Classic" to "World of Warcraft". No new product capabilities.

</domain>

<decisions>
## Implementation Decisions

### Testimonial proof (PROOF-01)
- **D-01:** All 5 homepage quotes stay up. They are already author-sourced: the user collected each quote directly from its author on Discord, and the wording is the author's own. No quote is pulled, no re-approval round is needed, wording is not edited.
- **D-02:** Per-quote metadata (role, expansion/tier, interview month/year) is supplied by the user at an execution checkpoint, the same pattern as the Phase 1 AI-answer run. The executor must not invent, infer, or approximate any metadata field. A quote whose metadata the user cannot supply keeps only the attribution that is already true on the page today.
- **D-03:** Verification line format follows the sprint plan: link the guild's public Warcraft Logs page where one exists; otherwise use the "Verified LootList+ customer" note. — **Reversibility:** costly — the format becomes the public proof pattern the case study (Phase 4) and report (Phase 3) pages will echo; changing it later means touching every proof surface.
- **D-04:** The executor checks each quoted guild's recent activity via the Supabase Management API (aggregate lookup only, no player data). Currently active guilds get "Verified LootList+ customer"; inactive guilds get date-anchored phrasing ("Verified customer, interviewed {Month Year}") so the page never implies a historical quote is from a currently active guild.
- **D-05:** No structured data for testimonials. Self-serving review markup violates Google guidelines; the verification lines are visible text for humans and AI crawlers. Executors must not add Review/AggregateRating schema to quotes.

### Stats block (PROOF-02)
- **D-06:** Replace only the "3+ hours saved a week" StatCard. Its replacement is "5 supported Classic expansions", which must be fact-checked against the product (Era through MoP) before shipping. The existing "0 spreadsheets needed" and "1 system for loot, attendance, and priorities" cards stay as-is.

### Signup copy (COPY-01)
- **D-07:** The sprint plan's signup copy (title, H1 "Set up fair loot in minutes.", body, CTA "Continue with Discord", secondary link) is the starting point. The executor drafts a voice-adapted version (concise, personality-first, matching the established hero voice) for the user's sign-off. Plan copy is never shipped without that approval.
- **D-08:** The signup page's secondary link "See how LootList+ works" anchors to the homepage LandingHowItWorks section.

### SEO/metadata copy (folded todos)
- **D-09:** /changelog gets an unambiguous changelog-intent title/meta and the homepage title is strengthened to own "loot list" intent. No noindex on /changelog. — **Reversibility:** reversible.
- **D-10:** Homepage title tag is category-forward (searcher's words first, brand attached), e.g. leading with loot list / attendance / Loot Score vocabulary. The on-page H1 "Epic loot deserves an epic system" is sacred and does not change.
- **D-11:** /compare title/meta are rewritten to earn clicks from competitor queries ("tmb loot" etc.) using checkable claims, not marketing superlatives. Context: the week-1 AI answer log shows Claude cites /compare in 4 of 6 answers but flagged it as vendor-written marketing; GSC shows position ~9 to 12.6 with 0 to 1.31% CTR on those queries.

### Repositioning (wording only)
- **D-12:** Broaden positioning wording from "WoW Classic" to "World of Warcraft" across ALL in-repo user-facing surfaces: marketing pages, titles/metas, app text, JSON-LD schema. — **Reversibility:** costly — this touches many surfaces and the standing full-sweep rule; a half-applied broadening (marketing broad, schema narrow) is worse than either consistent state.
- **D-13:** No Retail-support claim ships anywhere. Retail support does not exist today; the user wants to investigate building it (deferred, see below). Feature-level claims stay expansion-specific and checkable ("5 supported Classic expansions" is true and stays). "For World of Warcraft guilds" is acceptable broad wording because Classic is WoW; "works with Retail" is not.
- **D-14:** External founder-owned surfaces (Discord server description, GitHub repo description, old external posts) are NOT edited by executors. The phase produces a handoff checklist of externally needed wording changes for the user, consistent with the sprint #8 out-of-scope decision.

### Audit and process
- **D-15:** The unsupported-claims audit sweeps the FULL marketing surface: homepage, /about, /pricing, /compare, and blog posts. Every unverifiable claim is flagged and fixed or removed, subject to sign-off.
- **D-16:** Copy sign-off is ONE consolidated checkpoint: all drafted copy (signup, stats, quote formats, titles/metas, repositioned wording) is presented in a single approval pass. Nothing user-facing ships before that approval. No em dashes in any authored copy (repo-enforced).

### Claude's Discretion
- Exact voice-adapted phrasing of drafts (within the plan's copy as starting point and the established voice), presented at the sign-off checkpoint.
- Which pages beyond the named ones contain unverifiable claims (audit findings).
- Mechanics of the guild-activity lookup query (aggregate only, no player/guild-identifying data in artifacts or commits).

### Folded Todos
- **Fix "loot list" query cannibalization (changelog vs homepage)** (.planning/todos/pending/2026-08-28-fix-loot-list-query-cannibalization-changelog-vs-homepage.md): /changelog soaks 514 of 597 impressions for the top generic query at 0.19% CTR. Folded as D-09/D-10.
- **Rework /compare search snippet for competitor queries** (.planning/todos/pending/2026-08-28-rework-compare-page-search-snippet-for-competitor-queries.md): competitor queries at ~position 9 with 0% CTR. Folded as D-11.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Sprint plan (exact copy sources)
- `/Users/alexander.mayes/Downloads/LootList_30_Day_Search_AI_Sprint.md` — the sprint plan. Relevant sections: "Signup page" (exact signup copy), "Testimonial display format" (verification line format and internal verification rule), "Replace the unsupported stats block" (approved replacement facts), "Exact positioning and site copy" (homepage metadata, product description). Plan copy is a starting point; user sign-off is required on all final wording (D-07, D-16).

### Current copy surfaces (code)
- `app/components/landing/LandingValueProps.tsx` — the 5 QuoteCards (name+guild attribution today) and the StatCard row including the "3+ hours" card at line ~143
- `app/components/LoginPage.tsx` — signup/login surface for COPY-01
- `app/changelog/` and `app/compare/` — pages whose titles/metas change (D-09, D-11)
- `app/components/landing/LandingHowItWorks.tsx` — anchor target for the signup secondary link (D-08)

### Evidence baselines (numbers behind D-09/D-11)
- `scripts/analytics/exports/gsc-trend-query-2026-05-24_2026-08-23.csv` and `gsc-trend-page-2026-05-24_2026-08-23.csv` — GSC baseline; provenance in `scripts/analytics/exports/README.md`
- `scripts/analytics/ai-answer-log.csv` — week-1 AI answer run (2026-08-28)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- QuoteCard and StatCard components in `app/components/landing/LandingValueProps.tsx` already carry the layout; PROOF-01 extends the author attribution shape (role, expansion, date, verification line), it does not rebuild the section
- Next.js App Router metadata API for all title/meta changes; JSON-LD schema already exists on /about and /pricing (shipped #243) and must stay consistent with the repositioned wording (D-12)

### Established Patterns
- Copy voice: concise, personality-first; "Epic loot deserves an epic system" is sacred as H1; no em dashes anywhere (repo-enforced in #253)
- Full-sweep rule: positioning changes require auditing all surfaces; D-12/D-14 implement the in-repo half and hand off the external half

### Integration Points
- Prod data access only via Supabase Management API (CLI token in macOS keychain) for the guild-activity lookups (D-04); aggregate only, no player/guild-identifying data committed
</code_context>

<specifics>
## Specific Ideas

- Verification line format from the plan, verbatim shape: quote, then "Verified LootList+ customer · Interviewed {Month Year} · [Guild or Warcraft Logs profile]"
- Homepage title should lead with the words officers actually search ("loot list", attendance, Loot Score) with "World of Warcraft" present as surfaced words; brand attached, tagline stays on-page only
- Keep the shorthand "WoW" alongside "World of Warcraft" in titles/copy where natural: searchers shorten it constantly, and both forms should be present across the repositioned surfaces (user-added 2026-08-28)
</specifics>

<deferred>
## Deferred Ideas

- **Investigate Retail loot-system support** (item data, current-tier loot tables, addon implications). New product capability, user explicitly wants to explore it; belongs in its own phase or next milestone. Until it exists, no Retail claim ships (D-13).
- **External-surface repositioning sweep** (Discord server, GitHub description, old posts): founder-owned; Phase 2 delivers the checklist (D-14), the user executes it.
- **"loot list" cluster gap**: the top generic query is unclustered in the fixed GSC keyword scheme; do not edit cluster lists mid-sprint, flag at the Phase 6 review.
</deferred>

---

*Phase: 2-Checkable Conversion Copy*
*Context gathered: 2026-08-28*
