# Phase 5 — External API Coverage Matrix

**API:** Google Search Console API (`searchconsole.googleapis.com` v1, `webmasters/v3`)
**Detector:** `api-coverage.cjs` fired on the CONTEXT.md line "URL Inspection API is read-only diagnostics under the current OAuth scope"
**Stored credential scope:** `https://www.googleapis.com/auth/webmasters.readonly` (`scripts/analytics/gsc-auth.py:28`)
**Property:** `sc-domain:getlootlist.com`
**Default disposition:** INTEGRATE. Every OPT-OUT below carries a one-line reason.

## Capability surface

| Capability | Method | Disposition | Where / Reason |
|---|---|---|---|
| `urlInspection.index.inspect` | `POST /v1/urlInspection/index:inspect` | INTEGRATE | `scripts/analytics/inspect-url.py` (plan 05-02), run per URL in plan 05-08. Covered by the stored read-only scope. This is D-14's inspection half. |
| `searchanalytics.query` | `POST /webmasters/v3/sites/{siteUrl}/searchAnalytics/query` | INTEGRATE (already) | Already integrated by `scripts/analytics/pull-gsc.py` in Phase 1; this phase reuses its `get_access_token()` and adds no second client. |
| `sitemaps.submit` | `PUT /webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}` | OPT-OUT | Requires the write scope `.../auth/webmasters`; the stored refresh token carries `.readonly` only. D-16 puts the one-time resubmission in the user's hands in the same Search Console session, so re-consenting to a broader scope for a single manual action is not warranted. |
| `sitemaps.list` | `GET /webmasters/v3/sites/{siteUrl}/sitemaps` | OPT-OUT | The probe reads production `/sitemap.xml` directly, which is what crawlers actually fetch; Search Console's stored copy would answer a different question than "what is the CDN serving right now". |
| `sitemaps.get` | `GET /webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}` | OPT-OUT | Same reason as `sitemaps.list`; the last-downloaded timestamp is not the phase's evidence, the live document is. The user confirms the resubmission visually in the same session per D-16. |
| `sitemaps.delete` | `DELETE /webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}` | OPT-OUT | Destructive, requires the write scope, and no phase requirement removes a sitemap. |
| `sites.list` | `GET /webmasters/v3/sites` | OPT-OUT | The property is a committed constant (`DEFAULT_SITE_URL` in `gsc-auth.py`); discovering it at runtime adds a call and no information. |
| `sites.get` | `GET /webmasters/v3/sites/{siteUrl}` | OPT-OUT | Only reports permission level for an already-known, already-verified property; a 401 or 403 from the inspection call carries the same signal at the point it matters. |
| `sites.add` | `PUT /webmasters/v3/sites/{siteUrl}` | OPT-OUT | Requires the write scope; the property is already verified and no phase requirement adds one. |
| `sites.delete` | `DELETE /webmasters/v3/sites/{siteUrl}` | OPT-OUT | Destructive, requires the write scope, and no phase requirement removes a property. |

## Not this API

**Indexing API** (`indexing.googleapis.com`) is a separate product, not part of the Search Console API surface above. It is documented as usable only for pages carrying `JobPosting` or `BroadcastEvent` inside a `VideoObject`. None of this phase's URLs (homepage, `/compare`, `/pricing`, `/about`, the research report, blog guides) carry either type, so it is **OPT-OUT: outside its documented contract for these page types**, and it is not a substitute for the manual Request indexing action D-16 assigns to the user. `scripts/analytics/inspect-url.py` is forbidden by an acceptance criterion in plan 05-02 from referencing `indexing.googleapis.com`.

**"Request indexing"** has no API at all in either product. That absence is the reason D-16 exists.

## Quota

2,000 requests per day and 600 per minute per verified property; 10,000,000 per day and 15,000 per minute per Cloud project. This phase inspects well under thirty URLs, so no throttling or backoff logic is planned.
</content>
