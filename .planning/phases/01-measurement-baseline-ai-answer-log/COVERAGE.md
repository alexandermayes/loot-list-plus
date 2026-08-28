# Phase 1 API Coverage Matrix

**Produced:** 2026-08-28 (plan time)
**External API in scope:** Google Search Console API (Search Analytics v3 `webmasters/v3`, Search Console v1 `searchconsole/v1`) plus the Google OAuth 2.0 token and authorization endpoints it depends on.
**Detector:** `api-coverage.cjs --json` returned `detected: true` on the phase scope.

Default is `INTEGRATE`. This table is the subtraction record: every `OPT-OUT` carries a reason.

## Google OAuth 2.0 (credential surface)

| capability | decision | reason |
|---|---|---|
| `POST oauth2.googleapis.com/token` (refresh_token grant) | INTEGRATE | Already implemented in `pull-gsc.py:get_access_token`; every pull exchanges the stored refresh token for a short lived access token. |
| `oauth2/v2/auth` loopback authorization code grant | INTEGRATE | Implemented in `scripts/analytics/gsc-auth.py`; this phase commits that currently untracked file so the bootstrap is reproducible. |
| `POST oauth2.googleapis.com/revoke` | OPT-OUT | Not needed. Revocation is a one-off account action the user performs in the Google account UI; automating it would only add a way to break the working credential. |
| Service-account / domain-wide delegation flow | OPT-OUT | Not needed. Search Console properties are owned by the user's personal Google account, which service accounts cannot read without being added as a property user. |

## Search Analytics (`webmasters/v3`)

| capability | decision | reason |
|---|---|---|
| `searchanalytics.query` dimension `query` | INTEGRATE | The core capability of MEAS-01. Produces the clustered baseline export. |
| `searchanalytics.query` dimension `page` | INTEGRATE | Already used by the existing stdout report; this phase exposes it through the new `--dimension page` flag and commits a page-dimension trend export for Phase 6. |
| `searchanalytics.query` dimension `date` | INTEGRATE | Used to establish the true final-data end date for a requested window, which is what makes the PARTIAL label honest instead of guessed (D-03). |
| `searchanalytics.query` dimension `country` | OPT-OUT | Not needed yet. The baseline is a single-property global cohort; no phase requirement segments by country. |
| `searchanalytics.query` dimension `device` | OPT-OUT | Not needed yet. No phase requirement segments by device. |
| `searchanalytics.query` dimension `searchAppearance` | OPT-OUT | Not needed yet. Cannot be combined with other dimensions in one request, and no requirement asks for rich-result breakdowns. |
| `searchanalytics.query` `dimensionFilterGroups` | OPT-OUT | Not needed. Clustering happens locally in `cluster_query()` against the sprint plan's keyword lists, which is testable offline; server-side filters would move that rule out of version control. |
| `searchanalytics.query` `dataState: all` | OPT-OUT | Explicitly out of scope. Only `dataState: final` is used, because fresh data changes under the reader and a baseline must reproduce. |
| `searchanalytics.query` `aggregationType` | OPT-OUT | Not needed. Default aggregation matches how the sprint plan defines the clusters. |

## Sites (`webmasters/v3`)

| capability | decision | reason |
|---|---|---|
| `sites.list` | OPT-OUT | Not needed. The property is pinned by `GSC_SITE_URL` in `.env.local`; enumerating properties adds no measurement value. |
| `sites.get` | OPT-OUT | Not needed. Permission problems already surface as an actionable 403 with a site-URL-form hint in `pull-gsc.py`. |
| `sites.add` | OPT-OUT | Explicitly out of scope. Property management is a one-time human account action, not sprint measurement. |
| `sites.delete` | OPT-OUT | Explicitly out of scope and destructive. Nothing in this milestone should be able to remove a Search Console property. |

## Sitemaps (`webmasters/v3`)

| capability | decision | reason |
|---|---|---|
| `sitemaps.list` | OPT-OUT | Scoped to Phase 5 (LINK-02 audits sitemap contents and `lastmod`), not the Phase 1 baseline. |
| `sitemaps.get` | OPT-OUT | Scoped to Phase 5 (LINK-02). |
| `sitemaps.submit` | OPT-OUT | Scoped to Phase 5, and the roadmap requires submissions to happen exactly once after all content is final. Wiring it in Phase 1 would create a way to fire it early. |
| `sitemaps.delete` | OPT-OUT | Explicitly out of scope and destructive. |

## URL Inspection (`searchconsole/v1`)

| capability | decision | reason |
|---|---|---|
| `urlInspection.index.inspect` | OPT-OUT | Scoped to Phase 5 (LINK-02 recrawl work reads index status). Note that this endpoint is read-only; the recrawl request itself has no public API and stays a human action in the Search Console UI. |

## Deprecated

| capability | decision | reason |
|---|---|---|
| `urlTestingTools.mobileFriendlyTest.run` | OPT-OUT | Deprecated and shut down by Google; no replacement is needed for this phase. |

## AI answer surfaces (not an API integration)

The three AI surfaces locked by D-01 (ChatGPT, Google AI Overviews / AI Mode, Claude) are deliberately **not** integrated as APIs. Their answers are UI-rendered and personalization-sensitive, and the success criterion requires a clean non-personalized session, so MEAS-02 is a human-performed procedure recorded through a local CSV appender (D-02). There is no capability surface to enumerate and no opt-out to justify: no programmatic call is made to any of the three.
