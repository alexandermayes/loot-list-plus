#!/usr/bin/env python3
"""
Report what Google Search Console currently thinks of one or more URLs, via
the read-only URL Inspection API. Reuses the exact OAuth token exchange and
.env.local keys that scripts/analytics/pull-gsc.py already uses -- no second
OAuth client, no broader scope, no new consent flow. The stored refresh
token carries webmasters.readonly, which Google's own documentation lists
as sufficient for inspection.

Examples:
    python3 scripts/analytics/inspect-url.py --url https://www.getlootlist.com/compare

    python3 scripts/analytics/inspect-url.py \\
        --url-list scripts/analytics/recrawl-urls.txt --json

    python3 scripts/analytics/inspect-url.py \\
        --url https://www.getlootlist.com/pricing --site sc-domain:getlootlist.com

Does not call the sitemap-submission endpoint (needs the write scope this
token does not carry) and does not call the separate Indexing API (scoped
to JobPosting and BroadcastEvent pages only, which none of this phase's
URLs are). Sitemap resubmission and clicking Request Indexing stay a
manual, one-time GSC UI action (D-16) -- this script only reports what
Google currently sees.

stdlib only -- no node, no google client libraries.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

INSPECT_URL = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect"

# The five fields that decide whether a URL is ready for a recrawl request,
# per the documented UrlInspectionResult schema.
READY_VERDICT = "PASS"
READY_INDEXING_STATE = "INDEXING_ALLOWED"
READY_PAGE_FETCH_STATE = "SUCCESSFUL"
READY_ROBOTS_TXT_STATE = "ALLOWED"


def load_env(path=".env.local"):
    env = dict(os.environ)
    if os.path.exists(path):
        for line in open(path):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    return env


def get_access_token(cid, secret, refresh):
    data = urllib.parse.urlencode({
        "client_id": cid,
        "client_secret": secret,
        "refresh_token": refresh,
        "grant_type": "refresh_token",
    }).encode()
    req = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)["access_token"]


def inspect(token, site, url):
    """POST one URL Inspection request and return the parsed response."""
    req = urllib.request.Request(
        INSPECT_URL,
        data=json.dumps({
            "inspectionUrl": url,
            "siteUrl": site,
            "languageCode": "en-US",
        }).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def summarize(result):
    """Reduce one inspect() response to the five fields that decide readiness.

    Reports a field the API omitted as absent (None) rather than
    substituting a default -- an absent field and a failing field are
    different facts, and only one of them means the URL is not ready. A
    URL Google has never crawled legitimately has no indexStatusResult at
    all; that is reported plainly as a non-fatal "never crawled" outcome,
    not an error.
    """
    inspection_result = result.get("inspectionResult") or {}
    index_status = inspection_result.get("indexStatusResult")

    if index_status is None:
        return {
            "verdict": None,
            "googleCanonical": None,
            "userCanonical": None,
            "indexingState": None,
            "pageFetchState": None,
            "robotsTxtState": None,
            "neverCrawled": True,
            "ready": False,
        }

    verdict = index_status.get("verdict")
    google_canonical = index_status.get("googleCanonical")
    user_canonical = index_status.get("userCanonical")
    indexing_state = index_status.get("indexingState")
    page_fetch_state = index_status.get("pageFetchState")
    robots_txt_state = index_status.get("robotsTxtState")

    ready = (
        verdict == READY_VERDICT
        and google_canonical is not None
        and google_canonical == user_canonical
        and indexing_state == READY_INDEXING_STATE
        and page_fetch_state == READY_PAGE_FETCH_STATE
        and robots_txt_state == READY_ROBOTS_TXT_STATE
    )

    return {
        "verdict": verdict,
        "googleCanonical": google_canonical,
        "userCanonical": user_canonical,
        "indexingState": indexing_state,
        "pageFetchState": page_fetch_state,
        "robotsTxtState": robots_txt_state,
        "neverCrawled": False,
        "ready": ready,
    }


def load_url_list(path):
    """Read one URL per line; blank lines and lines beginning with # are ignored."""
    urls = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            urls.append(line)
    return urls


def print_summary(url, summary):
    print(f"\n{url}")
    if summary.get("neverCrawled"):
        print("  Google has never crawled this URL (no indexStatusResult yet)")
        return
    for field in ("verdict", "googleCanonical", "userCanonical", "indexingState", "pageFetchState", "robotsTxtState"):
        value = summary.get(field)
        print(f"  {field:20} {value if value is not None else '(absent)'}")
    print(f"  {'ready':20} {summary.get('ready')}")


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Report Search Console's current URL Inspection verdict for one or more URLs."
    )
    parser.add_argument("--url", action="append", default=[], help="URL to inspect (repeatable)")
    parser.add_argument("--url-list", dest="url_list", help="file of one URL per line")
    parser.add_argument("--site", default=None, help="GSC site URL; defaults to GSC_SITE_URL from .env.local")
    parser.add_argument("--json", dest="as_json", action="store_true", help="print a machine-readable JSON array")
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)

    urls = list(args.url)
    if args.url_list:
        urls.extend(load_url_list(args.url_list))
    if not urls:
        print("No URLs supplied. Use --url or --url-list.", file=sys.stderr)
        return 1

    env = load_env()
    cid = env.get("GSC_CLIENT_ID")
    secret = env.get("GSC_CLIENT_SECRET")
    refresh = env.get("GSC_REFRESH_TOKEN")
    site = args.site or env.get("GSC_SITE_URL", "sc-domain:getlootlist.com")
    if not (cid and secret and refresh):
        print("Missing GSC_CLIENT_ID / GSC_CLIENT_SECRET / GSC_REFRESH_TOKEN in .env.local.", file=sys.stderr)
        return 1

    try:
        token = get_access_token(cid, secret, refresh)
    except urllib.error.HTTPError as e:
        print(f"Token exchange failed ({e.code}). Re-run scripts/analytics/gsc-auth.py.", file=sys.stderr)
        return 1
    except urllib.error.URLError as e:
        print(f"Token exchange failed: {e.reason}", file=sys.stderr)
        return 1

    results = []
    for url in urls:
        try:
            response = inspect(token, site, url)
            summary = summarize(response)
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "ignore")
            if e.code in (401, 403):
                print(
                    f"Inspection failed for {url} ({e.code}): re-run scripts/analytics/gsc-auth.py "
                    "to refresh credentials.",
                    file=sys.stderr,
                )
            else:
                print(f"Inspection failed for {url} ({e.code}): {body}", file=sys.stderr)
            return 1
        except urllib.error.URLError as e:
            print(f"Inspection failed for {url}: {e.reason}", file=sys.stderr)
            return 1

        summary["url"] = url
        results.append(summary)

    if args.as_json:
        print(json.dumps(results, indent=2))
    else:
        for r in results:
            print_summary(r["url"], r)

    return 0


if __name__ == "__main__":
    sys.exit(main())
