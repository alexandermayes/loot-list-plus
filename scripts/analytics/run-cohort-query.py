#!/usr/bin/env python3
"""
Run the committed week-4-review cohort queries against production via the
Supabase Management API, and write the committed per-cohort CSV exports
under scripts/analytics/exports/ that 06-REVIEW.md quotes from (D-01/D-02).

One-time setup (yours):
  The macOS Keychain already holds a "Supabase CLI" generic-password entry
  (service name "Supabase CLI") whose password is a Supabase personal
  access token. There are no Supabase keys in .env.local anywhere in this
  project -- this Management API + Keychain path is the only prod-read
  mechanism, the same one run-research-report.py and
  scripts/deploy-migrations.sh already use.

Then, any session:
    python3 scripts/analytics/run-cohort-query.py --lint-queries
        # Offline preflight only: parses every committed .sql file's
        # header, checks all four cohort date literals are present, the
        # statement is read-only, and no forbidden identity column or
        # milestone-table reference appears anywhere in the text. Touches
        # no network and requires no Keychain entry.

    python3 scripts/analytics/run-cohort-query.py --preflight
        # Reads the Keychain token and reaches the Management API with a
        # single `SELECT 1 AS ok` -- proves the production read path is
        # live without reading any guild data.

    python3 scripts/analytics/run-cohort-query.py --summarize PATH
        # Offline: prints a human-readable summary of an already-written
        # committed cohort export.

    python3 scripts/analytics/run-cohort-query.py
        # Runs every committed cohort query against production and writes
        # its CSV export. Refuses with exit code 3 before 2026-10-02T00:00:00Z
        # UTC, the instant the Sep 18-24 cohort's own 7-day window closes --
        # there is no flag, environment variable, or clock override that
        # bypasses this gate (D-01).

stdlib only -- no node, no google client libraries, no pip packages
(argparse, csv, decimal, json, os, re, subprocess, sys, urllib.request,
urllib.error, unittest).
"""
import argparse
import csv
import decimal
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from research_report import assert_no_forbidden_columns, parse_query_header

DEFAULT_QUERIES_DIR = "scripts/analytics/queries/week-4-review"
DEFAULT_PROJECT_REF = "zjnhjstbqekudlsozsvi"  # same ref the gen:types npm script uses
MANAGEMENT_API = "https://api.supabase.com/v1/projects/{ref}/database/query"

# D-01/D-02: the four cohort date literals every committed query in this
# directory must contain verbatim, so the cohort windows cannot silently
# drift between the SQL text and whatever the review later claims.
COHORT_LITERALS = ("2026-08-24", "2026-08-30", "2026-09-18", "2026-09-24")

# The fixed, canonical row order the Management API response is validated
# and re-ordered into: baseline first, week4 second, always.
COHORTS = ("baseline", "week4")

# D-01: the instant the Sep 18-24 cohort's own 7-day activation window
# closes. Nothing before this timestamp may run the cohort queries.
COHORT_WINDOWS_CLOSE_UTC = datetime(2026, 10, 2, 0, 0, 0, tzinfo=timezone.utc)

# Distinct from a generic error exit (1) so a caller (or a human reading
# `$?`) can tell "the gate held" apart from "something else broke".
GATE_EXIT_CODE = 3

# D-04: the sprint's stated activation-growth target, expressed as a
# whole-number percentage so the met/not-met comparison stays in integer
# arithmetic (see cohort_verdict).
TARGET_PCT = 30

# The Management API preflight query: reads no table, no guild data.
PREFLIGHT_SQL = "SELECT 1 AS ok"

EXPORTS_DIR = "scripts/analytics/exports"
EXPORT_NAME_TEMPLATE = "db-cohort-{metric_id}-2026-08-24_2026-09-24.csv"

# D-02: the funnel-instrumentation table this runner must never read from
# or reference. Named here (once, in Python) purely so the guard below can
# name it in an error message; the guard itself checks committed .sql
# files, never this module.
_MILESTONE_TABLE_NAME = "guild_funnel_milestones"

# T-06-03: whole-word, case-insensitive keywords that must never appear in
# a committed cohort query -- the Keychain token this runner uses has full
# read/write rights, so the SQL text itself is the only thing standing
# between a read-only review and a mutation against production.
_DML_DDL_KEYWORDS = (
    "INSERT",
    "UPDATE",
    "DELETE",
    "MERGE",
    "DROP",
    "ALTER",
    "TRUNCATE",
    "CREATE",
    "GRANT",
    "REVOKE",
    "COPY",
    "CALL",
    "DO",
)

_WORD_RE = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")


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


def assert_cohort_literals(sql_text, path):
    """T-06-02: raises ValueError naming every missing member of
    COHORT_LITERALS. All four must appear verbatim in the SQL body so the
    cohort windows cannot silently drift between what the text says and
    what actually ran."""
    missing = [lit for lit in COHORT_LITERALS if lit not in sql_text]
    if missing:
        raise ValueError(
            f"{path}: missing required cohort literal(s) {missing}; every "
            f"query must contain all of {list(COHORT_LITERALS)} literally "
            "so the cohort windows cannot silently drift"
        )


def _strip_line_comments(sql_text):
    """Strips everything from `--` to end of line, on every line,
    preserving line structure otherwise. Comments never affect the
    read-only or literal-token guards below -- a forbidden keyword or
    token that only appears inside a comment must be ignored."""
    lines = []
    for line in sql_text.splitlines():
        idx = line.find("--")
        lines.append(line[:idx] if idx != -1 else line)
    return "\n".join(lines)


def assert_read_only(sql_text, path):
    """T-06-03 guard: the single check standing between a committed query
    and a Management API token with full read/write rights. Strips `--`
    line comments first, then requires exactly one statement (a single
    trailing semicolon is allowed; any other semicolon is rejected),
    requires the first keyword to be WITH or SELECT (case-insensitive),
    and rejects any whole-word, case-insensitive DML/DDL keyword. Whole-word
    matching means `updated_at` and `created_at` pass untouched."""
    body = _strip_line_comments(sql_text).strip()
    if not body:
        raise ValueError(f"{path}: query body is empty")

    body_wo_trailing = body[:-1] if body.endswith(";") else body
    if ";" in body_wo_trailing:
        raise ValueError(f"{path}: contains more than one SQL statement")

    words = _WORD_RE.findall(body)
    if not words:
        raise ValueError(f"{path}: query body has no SQL keywords")

    first_keyword = words[0].upper()
    if first_keyword not in ("WITH", "SELECT"):
        raise ValueError(
            f"{path}: statement must start with WITH or SELECT, found {words[0]!r}"
        )

    upper_words = {w.upper() for w in words}
    forbidden = sorted(kw for kw in _DML_DDL_KEYWORDS if kw in upper_words)
    if forbidden:
        raise ValueError(f"{path}: contains forbidden statement keyword(s): {forbidden}")


def assert_source_rows_only(sql_text, path):
    """D-02 guard: raises ValueError if the funnel-instrumentation table
    is referenced anywhere in the text (comments included), so this
    runner can never silently fall back to its re-observation stamps."""
    if _MILESTONE_TABLE_NAME in sql_text.lower():
        raise ValueError(
            f"{path}: references the funnel-instrumentation table directly; "
            "D-02 forbids falling back to its stamped timestamps -- "
            "recompute activation from source rows only"
        )


def lint_cohort_queries(queries_dir):
    """Offline preflight: parses and guards every `*.sql` file directly
    under `queries_dir` (HogQL files a sibling plan adds to the same
    directory are ignored, since this only globs `*.sql`). Returns
    [(path, header), ...] in sorted order; raises ValueError naming the
    file on the first failure. Also requires the header's declared
    columns to begin with `cohort` and every metric-id to be unique."""
    results = []
    seen_metric_ids = set()
    for path in sorted(Path(queries_dir).glob("*.sql")):
        text = path.read_text()
        header = parse_query_header(text)
        assert_cohort_literals(text, str(path))
        assert_read_only(text, str(path))
        assert_source_rows_only(text, str(path))
        assert_no_forbidden_columns(text, str(path))

        if not header["columns"] or header["columns"][0] != "cohort":
            raise ValueError(f"{path}: header columns must begin with 'cohort'")

        metric_id = header["metric-id"]
        if metric_id in seen_metric_ids:
            raise ValueError(f"{path}: duplicate metric-id {metric_id!r}")
        seen_metric_ids.add(metric_id)

        results.append((str(path), header))

    return results


def assert_cohort_windows_closed(now):
    """T-06-04 guard: `now` must be a timezone-aware datetime (a naive one
    raises ValueError -- comparing it to COHORT_WINDOWS_CLOSE_UTC would
    otherwise raise its own confusing TypeError). Raises RuntimeError
    naming COHORT_WINDOWS_CLOSE_UTC when `now` is earlier than it."""
    if now.tzinfo is None:
        raise ValueError("assert_cohort_windows_closed requires a timezone-aware datetime")
    if now < COHORT_WINDOWS_CLOSE_UTC:
        raise RuntimeError(
            "cohort windows are not closed: the Sep 18-24 cohort's own "
            "7-day activation window does not close until "
            f"{COHORT_WINDOWS_CLOSE_UTC.isoformat()}"
        )


def rows_to_cohort_table(rows, columns):
    """Validates the Management API response (a list of row dicts) and
    returns it re-ordered into the canonical two-row cohort table
    (baseline, then week4), with every non-cohort value coerced to int.
    Raises ValueError naming the problem -- but never echoing a row's
    values beyond the cohort label -- when: there are not exactly two
    rows, a row's keys do not exactly match `columns`, the cohort values
    are not exactly baseline then week4 in order, or a value cannot be
    coerced to int."""
    if len(rows) != 2:
        raise ValueError(f"expected exactly 2 rows, got {len(rows)}")

    declared = set(columns)
    table = []
    for expected_cohort, row in zip(COHORTS, rows):
        if not isinstance(row, dict):
            raise ValueError("row is not an object")
        if set(row.keys()) != declared:
            raise ValueError(
                f"row for expected cohort {expected_cohort!r} does not have "
                f"exactly the declared columns {sorted(declared)}"
            )

        cohort_value = row.get("cohort")
        if cohort_value != expected_cohort:
            raise ValueError(
                f"expected cohort {expected_cohort!r} at this position, got {cohort_value!r}"
            )

        ordered = {"cohort": cohort_value}
        for col in columns:
            if col == "cohort":
                continue
            value = row[col]
            try:
                int_value = int(value)
            except (TypeError, ValueError):
                raise ValueError(
                    f"column {col!r} for cohort {cohort_value!r} is not integer-valued"
                ) from None
            ordered[col] = int_value

        table.append(ordered)

    return table


def export_path_for(metric_id):
    """Returns the committed export path for `metric_id` under
    EXPORTS_DIR, following the same naming template every metric shares
    (EVID-02: no per-run timestamp in the filename, so a re-run over
    unchanged data writes a byte-identical file)."""
    return os.path.join(EXPORTS_DIR, EXPORT_NAME_TEMPLATE.format(metric_id=metric_id))


def write_cohort_csv(path, columns, table):
    """Writes `table` (the output of rows_to_cohort_table) to `path` via
    csv.writer: header row, then one row per cohort, in the order the
    table is already in. No timestamp column, so a re-run over unchanged
    production data produces a byte-identical file."""
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(columns)
        for row in table:
            writer.writerow([row[col] for col in columns])
    return path


def _pct_change_decimal(baseline, week4):
    """Shared core for format_pct_change and cohort_verdict: the signed
    percentage change from `baseline` to `week4`, quantized to one
    decimal place with ROUND_HALF_UP. None when baseline is 0 (there is
    no percentage to report against a zero denominator)."""
    if baseline == 0:
        return None
    change = decimal.Decimal(week4 - baseline) / decimal.Decimal(baseline) * 100
    return change.quantize(decimal.Decimal("0.1"), rounding=decimal.ROUND_HALF_UP)


def format_pct_change(baseline, week4):
    """D-04: the signed percentage-change string used in cohort_verdict's
    text. None when baseline is 0. Otherwise the change to one decimal
    place with decimal ROUND_HALF_UP, a trailing '.0' dropped, and a
    leading '+' for zero and positive values (never a typographic long
    dash -- only an ASCII '-' for negative values, supplied naturally by
    Decimal's own str())."""
    change = _pct_change_decimal(baseline, week4)
    if change is None:
        return None
    if change == change.to_integral_value():
        text = str(change.to_integral_value())
    else:
        text = str(change)
    if not text.startswith("-"):
        text = f"+{text}"
    return f"{text}%"


def cohort_verdict(baseline, week4, target_pct=TARGET_PCT):
    """D-04: turns two activated counts into a verdict against the
    sprint's +30% target using integer arithmetic only (week4 * 100 >=
    baseline * (100 + target_pct), so +30% exactly is met) -- no
    significance test, no confidence interval, no p-value. Also flags
    when the met/not-met result would flip under a one-guild swing in
    either count (week4 minus 1, skipped if negative; week4 plus 1;
    baseline minus 1, skipped if it would reach 0 since the change is
    then undefined; baseline plus 1)."""
    abs_change = week4 - baseline

    if baseline == 0:
        return {
            "baseline": baseline,
            "week4": week4,
            "abs_change": abs_change,
            "pct_change": None,
            "target_met": None,
            "swing_sensitive": None,
            "text": (
                f"{week4} vs {baseline} guilds: no baseline guilds activated, "
                "so the percentage change is undefined and the +30% target "
                "cannot be assessed"
            ),
        }

    def _target_met(b, w):
        return w * 100 >= b * (100 + target_pct)

    target_met = _target_met(baseline, week4)

    variants = [(baseline, week4 + 1), (baseline + 1, week4)]
    if week4 - 1 >= 0:
        variants.append((baseline, week4 - 1))
    if baseline - 1 > 0:
        variants.append((baseline - 1, week4))

    swing_sensitive = any(_target_met(b, w) != target_met for b, w in variants)

    pct_decimal = _pct_change_decimal(baseline, week4)
    pct_change = float(pct_decimal)
    pct_str = format_pct_change(baseline, week4)

    status = "target met" if target_met else "target not met"
    if swing_sensitive:
        suffix = (
            ", but a one-guild swing would change the result"
            if target_met
            else ", and a one-guild swing would change the result"
        )
    else:
        suffix = ""

    text = f"{week4} vs {baseline} guilds ({pct_str}): {status}{suffix}"

    return {
        "baseline": baseline,
        "week4": week4,
        "abs_change": abs_change,
        "pct_change": pct_change,
        "target_met": target_met,
        "swing_sensitive": swing_sensitive,
        "text": text,
    }


def summarize_csv(path):
    """Reads a committed cohort export and returns printable summary
    text.

    Activated export (columns include activated_7d): one line per cohort
    with its counts and the 7-day activation rate as a percentage to one
    decimal place (a cohort with zero guilds created prints "n/a" rather
    than dividing by zero), plus a trailing `Verdict: ` line with the
    D-04 cohort_verdict text comparing the two cohorts' activated counts.

    Qualified-proxy export (columns include the qualified bounds): one
    line per cohort as "between L and U of N guilds", labelled a
    conservative proxy, secondary context -- no target verdict is
    printed for this metric (D-03: it must never carry the activated
    metric's precision)."""
    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = reader.fieldnames or []

    if "activated_7d" in fieldnames:
        lines = []
        by_cohort = {}
        for row in rows:
            guilds_created = int(row["guilds_created"])
            activated = int(row["activated_7d"])
            by_cohort[row["cohort"]] = (guilds_created, activated)
            if guilds_created == 0:
                rate = "n/a"
            else:
                pct = decimal.Decimal(activated) / decimal.Decimal(guilds_created) * 100
                pct = pct.quantize(decimal.Decimal("0.1"), rounding=decimal.ROUND_HALF_UP)
                rate = f"{pct}%"
            lines.append(
                f"{row['cohort']}: {activated} of {guilds_created} guilds "
                f"activated within 7 days ({rate})"
            )

        if "baseline" in by_cohort and "week4" in by_cohort:
            baseline_guilds, baseline_activated = by_cohort["baseline"]
            week4_guilds, week4_activated = by_cohort["week4"]
            verdict = cohort_verdict(baseline_activated, week4_activated)
            lines.append(
                f"Verdict: {verdict['text']} "
                f"(baseline {baseline_guilds} guilds created, "
                f"week4 {week4_guilds} guilds created)"
            )
        return "\n".join(lines)

    if "qualified_7d_lower_bound" in fieldnames and "qualified_7d_upper_bound" in fieldnames:
        lines = ["Qualified within 7 days (conservative proxy, secondary context):"]
        for row in rows:
            guilds_created = int(row["guilds_created"])
            lower = int(row["qualified_7d_lower_bound"])
            upper = int(row["qualified_7d_upper_bound"])
            lines.append(
                f"{row['cohort']}: between {lower} and {upper} of {guilds_created} guilds"
            )
        return "\n".join(lines)

    raise ValueError(f"{path}: unrecognized cohort export columns {fieldnames}")


def build_parser():
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--lint-queries", action="store_true", help="offline preflight only, no network")
    parser.add_argument(
        "--preflight",
        action="store_true",
        help="reach the Management API with the Keychain token, reading no guild data",
    )
    parser.add_argument(
        "--summarize",
        default=None,
        metavar="PATH",
        help="offline: print a summary of an already-written committed cohort export",
    )
    parser.add_argument("--queries-dir", default=DEFAULT_QUERIES_DIR)
    parser.add_argument("--project-ref", default=DEFAULT_PROJECT_REF)
    return parser


def main():
    args = build_parser().parse_args()

    if args.summarize:
        print(summarize_csv(args.summarize))
        return

    if args.preflight:
        token = get_access_token()
        rows = run_sql(args.project_ref, token, PREFLIGHT_SQL)
        ok = rows[0].get("ok") if len(rows) == 1 and isinstance(rows[0], dict) else None
        if ok is None or int(ok) != 1:
            print(f"preflight failed: unexpected response {rows}", file=sys.stderr)
            sys.exit(1)
        print("preflight ok: Management API reachable with the Keychain token")
        return

    try:
        linted = lint_cohort_queries(args.queries_dir)
    except ValueError as e:
        print(f"lint failed: {e}", file=sys.stderr)
        sys.exit(1)

    if args.lint_queries:
        for path, header in linted:
            print(f"{path}: {header['metric-id']}")
        return

    # D-01: the dated gate. Checked before the Keychain is ever touched --
    # there is no flag, environment variable, or clock override that skips
    # this for any invocation that reaches this point.
    try:
        assert_cohort_windows_closed(datetime.now(timezone.utc))
    except RuntimeError as e:
        print(str(e), file=sys.stderr)
        sys.exit(GATE_EXIT_CODE)

    token = get_access_token()
    for path, header in linted:
        sql_text = Path(path).read_text()
        rows = run_sql(args.project_ref, token, sql_text)
        table = rows_to_cohort_table(rows, header["columns"])
        out_path = export_path_for(header["metric-id"])
        write_cohort_csv(out_path, header["columns"], table)
        print(summarize_csv(out_path))


if __name__ == "__main__":
    main()
