#!/usr/bin/env python3
"""
Pull traffic analytics from PostHog via its HogQL query API.

One-time setup (yours): create a read-only Personal API Key in PostHog
(Settings -> Personal API Keys, scope: "Query Read"), then add these to
.env.local (gitignored):

    POSTHOG_PERSONAL_API_KEY=phx_...
    POSTHOG_PROJECT_ID=12345
    POSTHOG_HOST=https://us.posthog.com   # or https://eu.posthog.com

Then anyone (including future sessions) can run:

    python3 scripts/analytics/pull-posthog.py [days]

No node required — stdlib only.
"""
import json
import os
import sys
import urllib.request

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


def hogql(host, project, key, query):
    body = json.dumps({"query": {"kind": "HogQLQuery", "query": query}}).encode()
    req = urllib.request.Request(
        f"{host}/api/projects/{project}/query/",
        data=body,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


QUERIES = {
    "Top pages (pageviews)": f"""
        SELECT properties.$pathname AS path, count() AS views, uniq(person_id) AS visitors
        FROM events WHERE event = '$pageview'
          AND timestamp > now() - INTERVAL {DAYS} DAY
        GROUP BY path ORDER BY views DESC LIMIT 30
    """,
    "Top referrers": f"""
        SELECT properties.$referring_domain AS referrer, count() AS views
        FROM events WHERE event = '$pageview'
          AND timestamp > now() - INTERVAL {DAYS} DAY
        GROUP BY referrer ORDER BY views DESC LIMIT 20
    """,
    "Top entry (landing) pages": f"""
        SELECT properties.$pathname AS path, count() AS sessions
        FROM events WHERE event = '$pageview' AND properties.$session_entry_url != ''
          AND timestamp > now() - INTERVAL {DAYS} DAY
        GROUP BY path ORDER BY sessions DESC LIMIT 20
    """,
}


def main():
    env = load_env()
    key = env.get("POSTHOG_PERSONAL_API_KEY")
    project = env.get("POSTHOG_PROJECT_ID")
    host = env.get("POSTHOG_HOST", "https://us.posthog.com").rstrip("/")
    if not key or not project:
        print("Missing POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID in .env.local — see the docstring.")
        sys.exit(1)

    print(f"PostHog — last {DAYS} days (project {project} @ {host})\n")
    for title, q in QUERIES.items():
        print(f"== {title} ==")
        try:
            res = hogql(host, project, key, q)
            cols = res.get("columns", [])
            print("  " + " | ".join(cols))
            for row in res.get("results", []):
                print("  " + " | ".join(str(c) for c in row))
        except Exception as e:
            print(f"  query failed: {e}")
        print()


if __name__ == "__main__":
    main()
