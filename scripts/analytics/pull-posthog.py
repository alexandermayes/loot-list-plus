#!/usr/bin/env python3
"""
Pull traffic and funnel analytics from PostHog via its HogQL query API.

One-time setup (yours): create a read-only Personal API Key in PostHog
(Settings -> Personal API Keys, scope: "Query Read"), then add these to
.env.local (gitignored):

    POSTHOG_PERSONAL_API_KEY=phx_...
    POSTHOG_PROJECT_ID=12345
    POSTHOG_HOST=https://us.posthog.com   # or https://eu.posthog.com

Then anyone (including future sessions) can run:

    python3 scripts/analytics/pull-posthog.py [days]
        # Legacy report mode: three relative-window pageview queries
        # (top pages, top referrers, top entry pages), unchanged.

    python3 scripts/analytics/pull-posthog.py --check-env
        # Offline preflight: prints POSTHOG_PERSONAL_API_KEY,
        # POSTHOG_PROJECT_ID and POSTHOG_HOST status (present/missing/
        # default) -- never a value -- and exits 0 if key+project are
        # present, 1 otherwise. Touches no network.

    python3 scripts/analytics/pull-posthog.py --query-dir scripts/analytics/queries/week-4-review
        # Lints every *.hogql file in the directory (sprint-window
        # literals present, no forbidden identity token) before any
        # network call, runs each against PostHog, checks the returned
        # columns match the file's declared header, and writes the
        # committed CSV export. Continues past a failed file.

    python3 scripts/analytics/pull-posthog.py --describe-dashboards 2036463,2036464,2036465,2036466
        # Reads each dashboard's definition (name, tile count, per-tile
        # insight name and the event names its query/filters reference)
        # -- never a data value -- so the committed HogQL set can be
        # cross-checked against what is actually pinned.

No node required -- stdlib only.
"""
import argparse
import csv
import glob
import json
import os
import sys
import urllib.error
import urllib.request

# D-09: pull-posthog.py's own directory must be importable as a sibling
# module path regardless of how this file is loaded (direct script run,
# `python3 -m unittest discover`, or a bare importlib.util.spec_from_file_location
# with no sys.path setup by the caller) -- so this insert happens before
# the sibling import below, keyed off this file's own location, not cwd.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from research_report import parse_query_header  # noqa: E402

# D-09/D-12 reproducibility: the sprint window is baked into every
# committed HogQL file as these two literals. lint_hogql refuses any file
# missing either one, so the queried window can never silently drift the
# way a relative "last N days" window would.
SPRINT_START = "2026-08-24"
SPRINT_END = "2026-09-24"

# T-06-07/T-06-15: any of these lowercase substrings, found anywhere in a
# committed HogQL file's text (comments included), means the query is
# reaching for an identity-bearing column or is at risk of mixing the
# person identity space with the guild identity space. Checked as a raw
# substring match, the same convention research_report.py's
# FORBIDDEN_SQL_TOKENS uses for the SQL side of this sprint.
FORBIDDEN_HOGQL_TOKENS = (
    "guild_name",
    "realm",
    "email",
    "$ip",
    "person.properties",
    "user_id",
    "character_name",
)

DEFAULT_QUERY_DIR = "scripts/analytics/queries/week-4-review"
EXPORTS_DIR = "scripts/analytics/exports"
EXPORT_NAME_TEMPLATE = "posthog-{metric_id}-2026-08-24_2026-09-24.csv"

# The four dashboards pinned in Sprint #4 (#245-#246); see PROJECT.md and
# 06-CONTEXT.md D-09. describe_dashboards reads their tile definitions
# only -- never a result value -- to confirm the HogQL set actually
# reproduces what's pinned (RESEARCH.md Open Question 2).
DASHBOARD_IDS = (2036463, 2036464, 2036465, 2036466)


class PostHogAPIError(RuntimeError):
    """Raised on any PostHog HTTP error. Carries the HTTP status code and
    response body -- never the API key, which is never interpolated into
    an exception message anywhere in this file."""

    def __init__(self, code, body):
        super().__init__(f"HTTP {code}: {body}")
        self.code = code
        self.body = body


def load_env(path=".env.local"):
    env = dict(os.environ)
    if os.path.exists(path):
        for line in open(path):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    return env


def check_env_status(env):
    """Returns presence-only status for the three PostHog env vars:
    "present" or "missing" for the two credentials, and "present" or
    "default" for POSTHOG_HOST (which has a working default). Never
    returns, logs, or otherwise exposes a credential value -- callers
    only ever see this dict, which is what decides whether the D-09
    credential checkpoint is needed."""
    key_present = bool(env.get("POSTHOG_PERSONAL_API_KEY"))
    project_present = bool(env.get("POSTHOG_PROJECT_ID"))
    host_present = bool(env.get("POSTHOG_HOST"))
    return {
        "POSTHOG_PERSONAL_API_KEY": "present" if key_present else "missing",
        "POSTHOG_PROJECT_ID": "present" if project_present else "missing",
        "POSTHOG_HOST": "present" if host_present else "default",
    }


def lint_hogql(text, path):
    """D-09 preflight guard, run before any network call: raises
    ValueError naming `path` for a missing required header key (via
    parse_query_header), a missing SPRINT_START or SPRINT_END literal, or
    any FORBIDDEN_HOGQL_TOKENS entry found anywhere in the text --
    comments included, since this is a raw substring scan rather than a
    SELECT-list parse. Returns the parsed header dict on success so
    callers do not have to re-parse the file."""
    try:
        header = parse_query_header(text)
    except ValueError as e:
        raise ValueError(f"{path}: {e}") from None

    missing_dates = [d for d in (SPRINT_START, SPRINT_END) if d not in text]
    if missing_dates:
        raise ValueError(
            f"{path}: missing required sprint window literal(s) {missing_dates}; "
            f"every HogQL file must contain both {SPRINT_START} and {SPRINT_END} "
            "literally so the queried window cannot silently drift"
        )

    lowered = text.lower()
    for token in FORBIDDEN_HOGQL_TOKENS:
        if token in lowered:
            raise ValueError(
                f"{path}: forbidden identity token '{token}' found in query "
                "text -- no committed HogQL file may reference an "
                "identity-bearing property, even in a comment"
            )

    return header


def assert_columns_match(declared, returned, path):
    """Raises ValueError naming `path` and the difference if `returned`
    (PostHog's actual response columns) does not match `declared` (the
    file's own header `columns` list) exactly, in order. A reordered,
    missing, or extra column is a mismatch -- this is what stops an
    unexpected column from ever reaching a committed CSV export."""
    declared = list(declared)
    returned = list(returned)
    if declared != returned:
        raise ValueError(
            f"{path}: returned columns {returned} do not match declared "
            f"columns {declared}"
        )


def export_path_for(metric_id):
    """Returns the committed export path for `metric_id`, e.g.
    scripts/analytics/exports/posthog-cta-funnel-2026-08-24_2026-09-24.csv."""
    return os.path.join(EXPORTS_DIR, EXPORT_NAME_TEMPLATE.format(metric_id=metric_id))


def write_result_csv(path, columns, results):
    """Writes `columns` as the header row followed by `results` in the
    order PostHog returned them. Deterministic: writing the same
    (columns, results) pair twice produces byte-identical files."""
    out_dir = os.path.dirname(path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(columns)
        for row in results:
            writer.writerow(row)


def events_referenced(obj):
    """Recursively walks `obj` (nested dicts/lists, e.g. a dashboard
    tile's insight JSON) and returns the sorted unique string values of
    every `event` key found at any depth -- covers both an EventsNode's
    own `event` field and a legacy filters block's nested `event` keys.
    None and non-string values are ignored."""
    found = set()

    def walk(node):
        if isinstance(node, dict):
            for key, value in node.items():
                if key == "event" and isinstance(value, str):
                    found.add(value)
                walk(value)
        elif isinstance(node, list):
            for item in node:
                walk(item)

    walk(obj)
    return sorted(found)


def build_report_queries(days):
    """The legacy report's three fixed HogQL queries, with `days`
    substituted into the relative window. Same three titles and query
    bodies as before this file was refactored to be import-safe."""
    return {
        "Top pages (pageviews)": f"""
            SELECT properties.$pathname AS path, count() AS views, uniq(person_id) AS visitors
            FROM events WHERE event = '$pageview'
              AND timestamp > now() - INTERVAL {days} DAY
            GROUP BY path ORDER BY views DESC LIMIT 30
        """,
        "Top referrers": f"""
            SELECT properties.$referring_domain AS referrer, count() AS views
            FROM events WHERE event = '$pageview'
              AND timestamp > now() - INTERVAL {days} DAY
            GROUP BY referrer ORDER BY views DESC LIMIT 20
        """,
        "Top entry (landing) pages": f"""
            SELECT properties.$pathname AS path, count() AS sessions
            FROM events WHERE event = '$pageview' AND properties.$session_entry_url != ''
              AND timestamp > now() - INTERVAL {days} DAY
            GROUP BY path ORDER BY sessions DESC LIMIT 20
        """,
    }


def hogql(host, project, key, query):
    """POSTs `query` verbatim to PostHog's HogQL query endpoint and
    returns the parsed JSON response ({"columns": [...], "results": [...]})."""
    body = json.dumps({"query": {"kind": "HogQLQuery", "query": query}}).encode()
    req = urllib.request.Request(
        f"{host}/api/projects/{project}/query/",
        data=body,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        raise PostHogAPIError(e.code, e.read().decode(errors="replace")) from None


def fetch_dashboard(host, project, key, dashboard_id):
    """GETs a dashboard's definition (name, tiles, each tile's insight
    JSON) -- never a data value, only what the dashboard is configured to
    chart."""
    req = urllib.request.Request(
        f"{host}/api/projects/{project}/dashboards/{dashboard_id}/",
        headers={"Authorization": f"Bearer {key}"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        raise PostHogAPIError(e.code, e.read().decode(errors="replace")) from None


def run_query_dir(env, query_dir):
    """Lints every *.hogql file in `query_dir` (sorted order) before any
    network call, then runs each against PostHog, checks its returned
    columns match its declared header via assert_columns_match, and
    writes its export CSV via write_result_csv. Prints one line per file
    and continues past a failure. Returns 4 if any file failed, 0 if all
    succeeded (including the case of zero files found)."""
    key = env.get("POSTHOG_PERSONAL_API_KEY")
    project = env.get("POSTHOG_PROJECT_ID")
    host = env.get("POSTHOG_HOST", "https://us.posthog.com").rstrip("/")

    paths = sorted(glob.glob(os.path.join(query_dir, "*.hogql")))

    texts = {}
    headers = {}
    for path in paths:
        with open(path) as f:
            texts[path] = f.read()
        headers[path] = lint_hogql(texts[path], path)

    had_failure = False
    for path in paths:
        header = headers[path]
        metric_id = header["metric-id"]
        try:
            result = hogql(host, project, key, texts[path])
            columns = result.get("columns", [])
            assert_columns_match(header["columns"], columns, path)
            out_path = export_path_for(metric_id)
            write_result_csv(out_path, columns, result.get("results", []))
            print(f"{metric_id}: rows written to {out_path}")
        except Exception as e:
            had_failure = True
            print(f"{metric_id}: FAILED ({e})")

    return 4 if had_failure else 0


def describe_dashboards(env, ids):
    """Reads each dashboard's definition and prints its id, name, tile
    count, then per tile the insight name and events_referenced of the
    tile JSON. Prints a `not readable` line and continues past an HTTP
    error. Never prints a result/data value -- only tile configuration."""
    key = env.get("POSTHOG_PERSONAL_API_KEY")
    project = env.get("POSTHOG_PROJECT_ID")
    host = env.get("POSTHOG_HOST", "https://us.posthog.com").rstrip("/")

    for dashboard_id in ids:
        try:
            dashboard = fetch_dashboard(host, project, key, dashboard_id)
        except PostHogAPIError as e:
            print(f"dashboard {dashboard_id}: not readable (HTTP {e.code})")
            continue

        name = dashboard.get("name")
        tiles = dashboard.get("tiles") or []
        print(f"dashboard {dashboard_id}: {name} ({len(tiles)} tiles)")
        for tile in tiles:
            insight = tile.get("insight") or {}
            insight_name = insight.get("name")
            events = events_referenced(tile)
            print(f"  - {insight_name}: events={events}")


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "days",
        nargs="?",
        type=int,
        default=90,
        help="legacy report mode: relative window in days (default 90)",
    )
    parser.add_argument(
        "--check-env",
        action="store_true",
        help="print credential presence (never values) and exit; no network call",
    )
    parser.add_argument(
        "--query-dir",
        nargs="?",
        const=DEFAULT_QUERY_DIR,
        default=None,
        metavar="DIR",
        help=f"lint and run every *.hogql file in DIR against PostHog (default {DEFAULT_QUERY_DIR})",
    )
    parser.add_argument(
        "--describe-dashboards",
        default=None,
        metavar="IDS",
        help=(
            "comma-separated dashboard ids to read tile definitions for "
            "(no data values); e.g. 2036463,2036464,2036465,2036466"
        ),
    )
    return parser.parse_args(argv)


def main():
    args = parse_args()
    env = load_env()

    if args.check_env:
        status = check_env_status(env)
        for name in ("POSTHOG_PERSONAL_API_KEY", "POSTHOG_PROJECT_ID", "POSTHOG_HOST"):
            print(f"{name}: {status[name]}")
        ready = (
            status["POSTHOG_PERSONAL_API_KEY"] == "present"
            and status["POSTHOG_PROJECT_ID"] == "present"
        )
        sys.exit(0 if ready else 1)

    key = env.get("POSTHOG_PERSONAL_API_KEY")
    project = env.get("POSTHOG_PROJECT_ID")
    host = env.get("POSTHOG_HOST", "https://us.posthog.com").rstrip("/")

    if args.query_dir is not None:
        if not key or not project:
            print("Missing POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID in .env.local — see the docstring.")
            sys.exit(1)
        sys.exit(run_query_dir(env, args.query_dir))

    if args.describe_dashboards is not None:
        if not key or not project:
            print("Missing POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID in .env.local — see the docstring.")
            sys.exit(1)
        ids = [x.strip() for x in args.describe_dashboards.split(",") if x.strip()]
        describe_dashboards(env, ids)
        sys.exit(0)

    if not key or not project:
        print("Missing POSTHOG_PERSONAL_API_KEY / POSTHOG_PROJECT_ID in .env.local — see the docstring.")
        sys.exit(1)

    print(f"PostHog — last {args.days} days (project {project} @ {host})\n")
    for title, q in build_report_queries(args.days).items():
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
