# API Coverage: Phase 4 Verified Guild Case Study

> Full coverage by default. Opt-outs are explicit, reasoned decisions.
>
> Phase 4 integrates no external API. It touches only the committed case-study data
> module (`data/case-studies/`), the dynamic route template (`app/customers/[slug]/`),
> the interview kit and publish runbook (planning documents), and the sitemap. The
> surfaces below are the ones a case-study page could plausibly have reached for, and
> each is declined on purpose so the decision is recorded rather than implied.

| capability | decision | reason |
|---|---|---|
| Warcraft Logs API (guild and report lookups) | OPT-OUT | the page renders only an outbound link the guild supplied and approved in writing (interview question ten); no request fetches or verifies profile data |
| Supabase product data (the guild's own LootList+ usage tables) | OPT-OUT | D-03: every published figure comes from the written interview answers; reading a guild's account data is a separate consent surface and is prohibited by plans 04-01 and 04-02 |
| Google Search Console URL inspection and indexing requests | OPT-OUT | recrawl requests belong to Phase 5's single pass; the publish runbook records the one manual request the case study needs after Phase 5 has run |
| Battle.net guild and character profile API | OPT-OUT | not needed; roster size and expansion tier are collected as interview questions eleven and twelve, never pulled from Blizzard data |
| Discord webhooks and announcements | OPT-OUT | not needed; publishing the case study is a repository commit plus a sitemap entry, with no notification surface in this phase |

**Coverage note.** Zero capabilities are integrated, deliberately. The case study is
evidence content built from one written, approved interview; every automated data
source above would either undercut that consent boundary or belongs to another phase.
