# Phase 4: Verified Guild Case Study - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-05
**Phase:** 4-verified-guild-case-study
**Areas discussed:** Route architecture, Proof-strip data source, Interview timing & phase shape, Template review mechanism

---

## Route architecture

| Option | Description | Selected |
|--------|-------------|----------|
| Dynamic [slug] route (Recommended) | `app/customers/[slug]/page.tsx` + `generateStaticParams()` reading a typed data module; zero entries = unreachable route; second guild = one new data file | ✓ |
| Static folder per guild | Matches the blog/report convention; simpler for exactly one guild, copy-paste for a second | |
| Static folder + extracted components | One static folder, reusable at the component level only | |

**User's choice:** Dynamic [slug] route

| Option | Description | Selected |
|--------|-------------|----------|
| No index page (Recommended) | Bare `/customers` 404s; only per-guild slugs exist; index deferred until volume justifies it | ✓ |
| Index page now | A `/customers` landing page listing published case studies | |

**User's choice:** No index page
**Notes:** Data module placement/shape, component extraction mechanics, and `dynamicParams`/404 behavior left to planner discretion.

---

## Proof-strip data source

| Option | Description | Selected |
|--------|-------------|----------|
| Extra interview questions (Recommended) | Roster size, expansion/tier, months-using asked as explicit questions 11 and 12; single data source, single consent surface | ✓ |
| Guild's product data, with consent | Pull from the guild's LootList+ records with a separate explicit consent line | |
| Interview first, data to verify | Ask in interview, cross-check against product data before publish | |

**User's choice:** Extra interview questions

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, interview kit (Recommended) | Committed artifact: ten verbatim questions + drafted additions + question-10 linking ask + written-approval checklist | ✓ |
| No, I'll use the sprint plan doc | User works directly from the sprint plan's list | |

**User's choice:** Yes, interview kit

---

## Interview timing & phase shape

| Option | Description | Selected |
|--------|-------------|----------|
| Not scheduled yet | No guild lined up or time booked | ✓ |
| Guild identified, not interviewed | Guild known, interview pending | |
| Interview done or imminent | Answers exist or arrive within days | |

**User's choice:** Not scheduled yet

| Option | Description | Selected |
|--------|-------------|----------|
| Complete without waiting (Recommended) | Ship template/tests/kit, record EVID-05 blocked, publish as follow-up plan when interview clears | ✓ |
| Pause at a checkpoint | Phase stays open on a human-action checkpoint until the interview happens | |

**User's choice:** Complete without waiting

| Option | Description | Selected |
|--------|-------------|----------|
| Self-contained publish plan (Recommended) | Future publish carries its own contextual links, atomic sitemap+robots commit, and single recrawl request; Phase 5 proceeds without the case study | ✓ |
| Phase 5 waits for the case study | Hold the one-time recrawl until the case study publishes | |

**User's choice:** Self-contained publish plan

---

## Template review mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Dev-only fixture route (Recommended) | Fixture entry gated out of production static params and the sitemap; user reviews at `/customers/{fixture-slug}` via `npm run dev` | ✓ |
| Vitest render only | Fixture inside the test file; assertions only, no browser review | |
| Screenshot artifact | Executor commits full-page screenshots for review; no route anywhere | |

**User's choice:** Dev-only fixture route

| Option | Description | Selected |
|--------|-------------|----------|
| Obviously fake, realistic lengths (Recommended) | Clearly-labeled placeholder content (e.g. "Example Guild (Fixture)") with realistic lengths so wrapping/hierarchy can be judged | ✓ |
| Literal {token} placeholders | Render the raw sprint-plan tokens verbatim; zero fabrication but proves less visually | |

**User's choice:** Obviously fake, realistic lengths

---

## Claude's Discretion

- Data module directory placement and file shape (TS vs JSON)
- Export-vs-extract mechanics for `QuoteCard`/`VerificationLine`/`TestimonialVerification`
- Fixture gating mechanism (NODE_ENV, env flag, or equivalent)
- `dynamicParams` setting and unknown-slug 404 behavior
- Drafted wording of interview questions 11/12 and kit layout
- Draft CTA copy (still passes the user copy sign-off gate)

## Deferred Ideas

- `/customers` index page listing published case studies — when there is more than one to list
