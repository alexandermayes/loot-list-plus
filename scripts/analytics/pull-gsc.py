#!/usr/bin/env python3
"""
Pull Google Search Console performance data (queries + pages) via the Search
Analytics API, using a stored OAuth refresh token. Surfaces the actionable SEO
views: top queries/pages, striking-distance keywords, and low-CTR pages.

One-time setup (yours):
  1. Google Cloud Console -> enable "Google Search Console API" -> create an
     OAuth client (type: Desktop app) -> copy client_id + client_secret.
  2. OAuth Playground (https://developers.google.com/oauthplayground):
     gear icon -> "Use your own OAuth credentials" (paste the client id/secret)
     -> authorize scope  https://www.googleapis.com/auth/webmasters.readonly
     -> "Exchange authorization code for tokens" -> copy the refresh_token.
  3. Add to .env.local (gitignored):
        GSC_CLIENT_ID=...
        GSC_CLIENT_SECRET=...
        GSC_REFRESH_TOKEN=...
        GSC_SITE_URL=sc-domain:getlootlist.com    # or https://www.getlootlist.com/

Then, any session:
    python3 scripts/analytics/pull-gsc.py [days]        # default 90

stdlib only — no node, no google client libraries.
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, timedelta

DAYS = int(sys.argv[1]) if len(sys.argv) > 1 else 90


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


def main():
    env = load_env()
    cid = env.get("GSC_CLIENT_ID")
    secret = env.get("GSC_CLIENT_SECRET")
    refresh = env.get("GSC_REFRESH_TOKEN")
    site = env.get("GSC_SITE_URL", "sc-domain:getlootlist.com")
    if not (cid and secret and refresh):
        print("Missing GSC_CLIENT_ID / GSC_CLIENT_SECRET / GSC_REFRESH_TOKEN in .env.local — see docstring.")
        sys.exit(1)

    end = date.today() - timedelta(days=3)  # GSC data lags ~2-3 days
    start = end - timedelta(days=DAYS)
    try:
        token = get_access_token(cid, secret, refresh)
    except urllib.error.HTTPError as e:
        print(f"Token exchange failed ({e.code}): {e.read().decode('utf-8', 'ignore')}")
        sys.exit(1)

    base = {"startDate": str(start), "endDate": str(end), "rowLimit": 1000, "dataState": "final"}
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
