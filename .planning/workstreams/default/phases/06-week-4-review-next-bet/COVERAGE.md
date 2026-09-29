# Phase 6 API Coverage Matrix

**Produced:** 2026-09-25 (plan time)
**External APIs in scope:** Supabase Management API (`/v1/projects/{ref}/database/query`), Google Search Console Search Analytics (`webmasters/v3`) plus the Google OAuth 2.0 token endpoint it depends on, and the PostHog project API (HogQL query endpoint and dashboard read endpoint).
**Detector:** `api-coverage.cjs --json` returned `detected: true` on the phase scope (signal: the Supabase Management API read path in plan 06-01).

This phase consumes these APIs read-only, through existing stdlib scripts, to produce an internal review. It adds two new call shapes (the Search Console page plus query dimension, and the PostHog dashboard read) and a new query set against the existing HogQL endpoint. Default is `INTEGRATE`; every `OPT-OUT` carries a reason.

## Supabase Management API

| capability | decision | reason |
|---|---|---|
| `POST /v1/projects/{ref}/database/query` with committed read-only SQL | INTEGRATE | The only production read path in the project (Keychain token, curl-like User-Agent). Plans 06-01 and 06-07 send the two committed cohort SQL files verbatim, after a read-only guard. |
| `POST /v1/projects/{ref}/database/query` with `SELECT 1 AS ok` preflight | INTEGRATE | Plan 06-01's tracer proves the token and transport live without reading guild data. |
| Any write, DDL or migration through the same endpoint | OPT-OUT | Explicitly out of scope and the main risk of a full-rights token; `assert_read_only` rejects any such statement before a call. This phase modifies no schema. |
| Project, branch, secrets, or config endpoints | OPT-OUT | Not needed. The review reads aggregate rows only; nothing about the project itself is inspected or changed. |

## Google OAuth 2.0 (credential surface)

| capability | decision | reason |
|---|---|---|
| `POST oauth2.googleapis.com/token` (refresh_token grant) | INTEGRATE | Already implemented in `pull-gsc.py:get_access_token`; every pull in plan 06-06 uses it. |
| Loopback authorization (`gsc-auth.py`) | INTEGRATE | Existing re-mint path, used only as a dynamic auth gate if the refresh token fails. |
| Token revocation | OPT-OUT | Not needed; revocation is an account action and would only break the working credential. |

## Search Console Search Analytics (`webmasters/v3`)

| capability | decision | reason |
|---|---|---|
| `searchanalytics.query` dimensions `["page", "query"]` | INTEGRATE | New in plan 06-03. Success criterion 2 names pages, but position and CTR are per query; the combined dimension is what the D-11 rule runs on. |
| `searchanalytics.query` dimension `query` | INTEGRATE | Sprint-window and week-4 query exports for the D-12 cluster comparison. |
| `searchanalytics.query` dimension `page` | INTEGRATE | Sprint-window page totals for context. |
| `searchanalytics.query` dimension `date` | INTEGRATE | `coverage_end()` finds the true final-data date so a partial window is never committed as complete. |
| `dataState: final` | INTEGRATE | Only final data is committed. |
| `dataState: all` | OPT-OUT | Fresh data changes under the reader; a review number must reproduce. |
| dimensions `country`, `device`, `searchAppearance` | OPT-OUT | No success criterion or decision segments by these; adding them would widen the evidence without a question to answer. |
| `dimensionFilterGroups` | OPT-OUT | Clustering and the D-11 rule run locally in tested code; server-side filters would move the rule out of version control. |
| Sitemaps, URL Inspection, sites management | OPT-OUT | Phase 5 owned recrawl and sitemap work; the recrawl log is read from the repo, not the API. |

## PostHog project API

| capability | decision | reason |
|---|---|---|
| `POST /api/projects/{id}/query/` with `HogQLQuery` from committed `.hogql` files | INTEGRATE | D-09's reproducible funnel and CTA pull; four committed queries (traffic smoke, CTA step reach, CTA breakdown, guild milestones), linted and column-checked. |
| `GET /api/projects/{id}/dashboards/{dashboard_id}/` | INTEGRATE | Reads which events dashboards 2036463 to 2036466 chart, so the HogQL set can be cross-checked against what is pinned (D-09). Event names only, no data values. |
| Insights, funnels or trends endpoints (non-HogQL query kinds) | OPT-OUT | HogQL covers the step counts with the query text committed; other query kinds would hide the query in PostHog-side configuration and break reproducibility. |
| Group-type or group-key query syntax | OPT-OUT | Not needed and unverified (RESEARCH.md A5); milestone events are counted by their `guild:` distinct id prefix, which funnel.ts sets, without a group lookup. |
| Persons and person properties endpoints | OPT-OUT | Explicitly out of scope: identity data; the lint guard rejects person property access. |
| Dashboard, insight or project writes; event capture | OPT-OUT | Out of scope by D-10: this phase does not diagnose or fix PostHog. |
| Feature flags, experiments, session recordings | OPT-OUT | No decision in this phase depends on them. |

## AI answer surfaces (not an API integration)

The three AI surfaces (ChatGPT, Google AI Overviews and AI Mode, Claude) are deliberately not integrated as APIs. D-05 makes the week-4 run a human-performed procedure in clean sessions, recorded through the local CSV appender; no programmatic call is made to any of them.
