#!/usr/bin/env python3
"""
Run the committed research-report queries for wow-classic-loot-systems-2026
against production via the Supabase Management API, and write the
committed aggregates JSON + CSV artifact that the report page at
app/research/wow-classic-loot-systems-2026/page.tsx imports at build time
(D-05: the page can never state a number the committed query did not
produce).

One-time setup (yours):
  The macOS Keychain already holds a "Supabase CLI" generic-password entry
  (service name "Supabase CLI") whose password is a Supabase personal
  access token. There are no Supabase keys in .env.local anywhere in this
  project -- this Management API + Keychain path is the only prod-read
  mechanism, the same one scripts/deploy-migrations.sh already uses.

Then, any session:
    python3 scripts/analytics/run-research-report.py --lint-queries
        # Offline preflight only: parses every committed .sql file's
        # header, checks both window literals are present, and checks no
        # forbidden identity column appears anywhere in the text. Touches
        # no network and requires no Keychain entry.

    python3 scripts/analytics/run-research-report.py --menu
        # Runs every registry entry that has a query_file against
        # production (D-01 checkpoint menu), prints one line per entry --
        # a pickable value or an "unavailable: <reason>" line, with support
        # measurements in their own non-pickable block -- and writes
        # nothing to public/research/.

    python3 scripts/analytics/run-research-report.py
        # Runs every metrics.json entry that has a query_file against
        # production and writes the committed JSON + CSV artifact under
        # public/research/.

stdlib only -- no node, no google client libraries, no pip packages
(argparse, csv, decimal, json, os, subprocess, sys, urllib.request,
urllib.error, unittest).
"""
import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from research_report import (
    GUILD_FLOOR,
    WINDOW_END,
    WINDOW_START,
    assemble_breakdown,
    assemble_median,
    assemble_percentage_from_counts,
    assemble_scalar_finding,
    assemble_support,
    assert_no_forbidden_columns,
    assert_window_literals,
    build_artifact,
    parse_query_header,
    render_menu,
    resolve_output_path,
    write_csv,
    write_json,
)

DEFAULT_QUERIES_DIR = "scripts/analytics/queries/wow-classic-loot-systems-2026"
DEFAULT_JSON = "public/research/wow-classic-loot-systems-2026-aggregates.json"
DEFAULT_CSV = "public/research/wow-classic-loot-systems-2026-aggregates.csv"
DEFAULT_PROJECT_REF = "zjnhjstbqekudlsozsvi"  # same ref the gen:types npm script uses
MANAGEMENT_API = "https://api.supabase.com/v1/projects/{ref}/database/query"

SAMPLE_METRIC_ID = "sample-definition"

# D-13/D-15 resolutions, restated verbatim in the published methodology so
# the artifact's definitions block matches the SQL comment header.
DEFINITIONS = {
    "active_guild": (
        "A guild qualifies as active if, during the window, it has at "
        "least one non-skipped raid event, OR at least one loot award, "
        "OR at least five approved loot lists. A raid_events row with "
        "is_skipped true is excluded. An approved list counts when "
        "COALESCE(reviewed_at, submitted_at) falls inside the window."
    ),
    "raiders": (
        "Raiders are counted as distinct characters holding an approved "
        "list inside the window. No alt de-duplication is applied; this "
        "is a character count, not a person count."
    ),
}


def get_access_token() -> str:
    """Reads the Supabase personal access token from the macOS Keychain.
    Never logged, never written to any file, never placed in a URL."""
    return subprocess.check_output(
        ["security", "find-generic-password", "-s", "Supabase CLI", "-w"]
    ).decode().strip()


def run_sql(project_ref: str, token: str, sql: str):
    """POSTs the verbatim SQL text to the Management API's /database/query
    endpoint and returns the parsed JSON response (a list of row dicts).
    Never assembled from a runtime variable -- `sql` is always the full
    text of a committed .sql file, read and passed through unmodified.

    The User-Agent header is required: the endpoint sits behind Cloudflare,
    and Python urllib's default "Python-urllib/x.y" User-Agent is blocked
    by Cloudflare's bot protection (HTTP 403, Cloudflare error code 1010)
    before the request ever reaches Supabase's auth check. curl's default
    User-Agent is not blocked, which is why scripts/deploy-migrations.sh's
    curl-based run_sql works unmodified; urllib needs the same treatment
    explicitly. Verified this session against the live endpoint.
    """
    req = urllib.request.Request(
        MANAGEMENT_API.format(ref=project_ref),
        data=json.dumps({"query": sql}).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "curl/8.7.1",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        raise RuntimeError(f"Management API error (HTTP {e.code}): {body}") from None


def lint_queries(queries_dir: str):
    """Offline preflight: parses and guards every .sql file in
    `queries_dir`. Returns [(path, header), ...] on success; raises
    ValueError naming the file on the first failure. Runs first on every
    invocation (not only under --lint-queries) so a bad query can never
    reach production."""
    results = []
    for path in sorted(Path(queries_dir).glob("*.sql")):
        text = path.read_text()
        header = parse_query_header(text)
        assert_window_literals(text, str(path))
        assert_no_forbidden_columns(text, str(path))
        results.append((str(path), header))
    return results


def load_metrics(queries_dir: str):
    return json.loads((Path(queries_dir) / "metrics.json").read_text())


def stable_generated_at(json_path: str, candidate_artifact: dict, candidate_generated_at: str) -> str:
    """Reuses the previously committed `generated_at` timestamp when
    nothing else in the artifact changed, so re-running the pipeline over
    unchanged production data produces a byte-identical file (EVID-02
    ordering/determinism: `git status --porcelain public/research/` must
    stay clean on a second run)."""
    resolved = resolve_output_path(json_path)
    if not os.path.exists(resolved):
        return candidate_generated_at
    try:
        with open(resolved) as f:
            existing = json.load(f)
    except (json.JSONDecodeError, OSError):
        return candidate_generated_at

    existing_sans_ts = dict(existing)
    existing_sans_ts.pop("generated_at", None)
    candidate_sans_ts = dict(candidate_artifact)
    candidate_sans_ts.pop("generated_at", None)

    if existing_sans_ts == candidate_sans_ts and "generated_at" in existing:
        return existing["generated_at"]
    return candidate_generated_at


def run_all_metrics(metrics, args, token):
    """Executes every registry entry with a `query_file` against production,
    in registry order, and assembles each into a `(status, entry)` result
    via the shared `assemble_*` helpers -- the one code path `--menu` and
    the full run both use, so a value shown at the checkpoint can never
    diverge from what a later run of the same query would produce (D-05).

    Returns `(sample, sample_query_file, results)`, where `results` maps
    every metric_id -- including those with no `query_file` -- to a
    `(status, entry)` pair. A metric with no `query_file` maps to its
    registered `unavailable_reason` without ever touching the network.
    """
    sample = None
    sample_query_file = None
    results = {}

    for metric in metrics:
        query_file = metric.get("query_file")
        if not query_file:
            results[metric["metric_id"]] = ("unavailable", {
                "metric_id": metric["metric_id"],
                "label": metric["label"],
                "reason": metric.get("unavailable_reason") or "no query file",
            })
            continue

        path = Path(args.queries_dir) / query_file
        sql = path.read_text()
        header = parse_query_header(sql)
        assert_window_literals(sql, str(path))
        assert_no_forbidden_columns(sql, str(path))
        columns = header["columns"]

        rows = run_sql(args.project_ref, token, sql)

        def check_columns(row):
            actual = set(row.keys())
            if set(columns) != actual:
                raise RuntimeError(
                    f"{path}: response columns {sorted(actual)} do not match "
                    f"declared columns {sorted(columns)} -- refusing to publish "
                    "a mismatched result set"
                )

        if metric["metric_id"] == SAMPLE_METRIC_ID:
            if not rows:
                print("error: the sample-definition metric did not produce a sample block", file=sys.stderr)
                sys.exit(1)
            row = rows[0]
            check_columns(row)
            sample = {k: int(v) for k, v in row.items()}
            sample_query_file = query_file
            continue

        if metric["kind"] == "breakdown":
            segment_counts = {}
            for row in rows:
                check_columns(row)
                seg_col, count_col = columns[0], columns[1]
                segment_counts[row[seg_col]] = int(row[count_col])
            denominator = sample.get("active_guilds") if sample else None
            results[metric["metric_id"]] = assemble_breakdown(metric, segment_counts, denominator)
            continue

        if not rows:
            results[metric["metric_id"]] = ("unavailable", {
                "metric_id": metric["metric_id"],
                "label": metric["label"],
                "reason": "query returned zero rows",
            })
            continue

        row = rows[0]
        check_columns(row)

        if metric["kind"] == "support":
            results[metric["metric_id"]] = assemble_support(metric, row)
        elif metric["kind"] == "percentage" and len(columns) == 2:
            results[metric["metric_id"]] = assemble_percentage_from_counts(
                metric, row[columns[0]], row[columns[1]]
            )
        elif metric["kind"] == "median":
            measured = row[columns[1]] if len(columns) > 1 else None
            results[metric["metric_id"]] = assemble_median(metric, row[columns[0]], measured)
        else:
            value_col = next(iter(row))
            results[metric["metric_id"]] = assemble_scalar_finding(metric, row[value_col])

    return sample, sample_query_file, results


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--queries-dir", default=DEFAULT_QUERIES_DIR)
    parser.add_argument("--json", default=DEFAULT_JSON)
    parser.add_argument("--csv", default=DEFAULT_CSV)
    parser.add_argument("--project-ref", default=DEFAULT_PROJECT_REF)
    parser.add_argument("--start", default=WINDOW_START)
    parser.add_argument("--end", default=WINDOW_END)
    parser.add_argument("--floor", type=int, default=GUILD_FLOOR)
    parser.add_argument("--lint-queries", action="store_true", help="offline preflight only, no network")
    parser.add_argument("--menu", action="store_true", help="print the candidate table, write nothing")
    return parser


def main():
    args = build_parser().parse_args()

    try:
        linted = lint_queries(args.queries_dir)
    except ValueError as e:
        print(f"lint failed: {e}", file=sys.stderr)
        sys.exit(1)

    if args.lint_queries:
        print(f"lint ok: {len(linted)} query file(s) passed the window and forbidden-column guards")
        return

    metrics = load_metrics(args.queries_dir)

    if args.menu:
        token = get_access_token()
        _sample, _sample_query_file, results = run_all_metrics(metrics, args, token)
        print(render_menu(metrics, results))
        return

    token = get_access_token()
    sample, sample_query_file, results = run_all_metrics(metrics, args, token)

    if sample is None:
        print("error: the sample-definition metric did not produce a sample block", file=sys.stderr)
        sys.exit(1)

    findings = []
    unavailable = []
    for metric in metrics:
        if metric["metric_id"] == SAMPLE_METRIC_ID:
            continue
        if metric["kind"] == "support":
            # Support measurements are evidence for a grey-out/decision,
            # never a pickable finding -- they never reach the published
            # artifact (D-01/D-02).
            continue
        status, entry = results[metric["metric_id"]]
        (findings if status == "finding" else unavailable).append(entry)

    window = {"start": args.start, "end": args.end}
    candidate_generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    artifact = build_artifact(window, DEFINITIONS, sample, findings, unavailable, candidate_generated_at)
    artifact["sample_query_file"] = sample_query_file
    artifact["generated_at"] = stable_generated_at(args.json, artifact, candidate_generated_at)

    json_path = write_json(artifact, args.json)
    csv_path = write_csv(artifact, args.csv)

    print(f"wrote {json_path} and {csv_path}")
    print(f"sample: {sample}")


if __name__ == "__main__":
    main()
