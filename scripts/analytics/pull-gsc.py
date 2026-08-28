#!/usr/bin/env python3
"""
Pull Google Search Console performance data (queries + pages) via the Search
Analytics API, using a stored OAuth refresh token. Surfaces the actionable SEO
views: top queries/pages, striking-distance keywords, and low-CTR pages.

One-time setup (yours):
  1. Google Cloud Console -> enable "Google Search Console API" -> create an
     OAuth client (type: Desktop app) -> copy client_id + client_secret.
  2. Run  python3 scripts/analytics/gsc-auth.py  to mint GSC_REFRESH_TOKEN via
     a local loopback OAuth flow (replaces the old OAuth Playground steps).
  3. Add to .env.local (gitignored):
        GSC_CLIENT_ID=...
        GSC_CLIENT_SECRET=...
        GSC_REFRESH_TOKEN=...
        GSC_SITE_URL=sc-domain:getlootlist.com    # or https://www.getlootlist.com/

Then, any session:
    python3 scripts/analytics/pull-gsc.py [days]        # default 90, trailing window, prints report

Explicit historical window, clustered CSV export:
    python3 scripts/analytics/pull-gsc.py --start 2026-08-24 --end 2026-08-30 \\
        --dimension query --csv gsc-baseline-cohort.csv

stdlib only — no node, no google client libraries.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, timedelta

import gsc_clusters
import gsc_export


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


def query(token, site, body):
    url = (
        "https://www.googleapis.com/webmasters/v3/sites/"
        + urllib.parse.quote(site, safe="")
        + "/searchAnalytics/query"
    )
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r).get("rows", [])


def show(rows, dim_label):
    print(f"  {dim_label:52} clicks   impr    ctr    pos")
    print("  " + "-" * 78)
    for row in rows:
        key = row["keys"][0]
        print(
            f"  {key[:52]:52} {int(row['clicks']):5}  {int(row['impressions']):6}  "
            f"{row['ctr'] * 100:5.1f}%  {row['position']:5.1f}"
        )
    if not rows:
        print("  (none)")


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("days", nargs="?", type=int, default=90)
    parser.add_argument("--start", help="ISO date, e.g. 2026-08-24 (requires --end)")
    parser.add_argument("--end", help="ISO date, e.g. 2026-08-30 (requires --start)")
    parser.add_argument("--dimension", choices=["query", "page"], default="query")
    parser.add_argument("--csv", help="output CSV path; bare filename lands under scripts/analytics/exports/")
    args = parser.parse_args()

    if bool(args.start) != bool(args.end):
        parser.error("--start and --end must be supplied together")

    if args.start and args.end:
        # Let a malformed date's ValueError reach the operator rather than
        # swallowing it — the message names exactly what was invalid.
        start_date = date.fromisoformat(args.start)
        end_date = date.fromisoformat(args.end)
        if start_date > end_date:
            parser.error(f"--start ({start_date}) must not be after --end ({end_date})")
        args.start_date = start_date
        args.end_date = end_date
    else:
        args.start_date = None
        args.end_date = None
    return args


def coverage_end(token, site, start, end):
    """Issue a date-dimension query for the same window and return the true
    final-data end date, instead of assuming the requested end date is final."""
    rows = query(token, site, {
        "startDate": str(start),
        "endDate": str(end),
        "rowLimit": 1000,
        "dataState": "final",
        "dimensions": ["date"],
    })
    return gsc_export.max_date(rows)


def write_export(token, site, base, args):
    try:
        out_path = gsc_export.resolve_export_path(args.csv)
    except ValueError as e:
        print(str(e))
        sys.exit(1)

    try:
        rows = query(token, site, {**base, "dimensions": [args.dimension]})
        actual_end = coverage_end(token, site, base["startDate"], base["endDate"])
    except urllib.error.HTTPError as e:
        msg = e.read().decode("utf-8", "ignore")
        print(f"Search Analytics query failed ({e.code}): {msg}")
        sys.exit(1)

    out_path = gsc_export.partial_suffix_path(out_path, base["endDate"], actual_end)
    cluster_fn = gsc_clusters.cluster_query if args.dimension == "query" else None
    gsc_export.export_csv(rows, out_path, args.dimension, cluster_fn=cluster_fn)

    print(f"coverage: requested {base['startDate']} to {base['endDate']}, actual final data through {actual_end}")
    print(f"wrote: {out_path}")


def main():
    args = parse_args()
    env = load_env()
    cid = env.get("GSC_CLIENT_ID")
    secret = env.get("GSC_CLIENT_SECRET")
    refresh = env.get("GSC_REFRESH_TOKEN")
    site = env.get("GSC_SITE_URL", "sc-domain:getlootlist.com")
    if not (cid and secret and refresh):
        print("Missing GSC_CLIENT_ID / GSC_CLIENT_SECRET / GSC_REFRESH_TOKEN in .env.local — see docstring.")
        sys.exit(1)

    if args.start_date and args.end_date:
        start, end = args.start_date, args.end_date
    else:
        end = date.today() - timedelta(days=3)  # GSC data lags ~2-3 days
        start = end - timedelta(days=args.days)

    try:
        token = get_access_token(cid, secret, refresh)
    except urllib.error.HTTPError as e:
        print(f"Token exchange failed ({e.code}): {e.read().decode('utf-8', 'ignore')}")
        sys.exit(1)

    base = {"startDate": str(start), "endDate": str(end), "rowLimit": 1000, "dataState": "final"}

    if args.csv:
        write_export(token, site, base, args)
        return

    print(f"Search Console — {site} — {start} to {end}\n")

    try:
        queries = query(token, site, {**base, "dimensions": ["query"]})
        pages = query(token, site, {**base, "dimensions": ["page"]})
    except urllib.error.HTTPError as e:
        msg = e.read().decode("utf-8", "ignore")
        print(f"Search Analytics query failed ({e.code}): {msg}")
        if e.code == 403:
            print("\nHint: the OAuth user must have access to this property, and GSC_SITE_URL must match\n"
                  "exactly — try the other form (sc-domain:getlootlist.com vs https://www.getlootlist.com/).")
        sys.exit(1)

    queries.sort(key=lambda r: -r["impressions"])
    pages.sort(key=lambda r: -r["impressions"])

    print("== Top queries (by impressions) ==")
    show(queries[:30], "query")
    print("\n== Top pages (by impressions) ==")
    show(pages[:30], "page")

    print("\n== Striking distance: queries ranking #8–20 (push to page 1) ==")
    sd = sorted((r for r in queries if 8 <= r["position"] <= 20), key=lambda r: -r["impressions"])
    show(sd[:25], "query")

    print("\n== High impressions, low CTR pages (title/description opportunities) ==")
    lc = sorted((r for r in pages if r["impressions"] >= 50 and r["ctr"] < 0.02), key=lambda r: -r["impressions"])
    show(lc[:20], "page")


if __name__ == "__main__":
    main()
