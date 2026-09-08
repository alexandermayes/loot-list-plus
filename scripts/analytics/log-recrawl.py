#!/usr/bin/env python3
"""
Append-only writer and checker for scripts/analytics/RECRAWL-LOG.md, the
one place in this repository that records which URLs have been submitted
to Google Search Console for a recrawl request. Shared by Phase 5's own
contextual-link sweep and by
.planning/phases/04-verified-guild-case-study/04-PUBLISH-RUNBOOK.md's
case-study publish step 5 -- neither keeps a second table of its own. This
script is the only thing that writes to that log.

Append a prepared event once a URL has passed the production probe
(scripts/analytics/probe-recrawl-urls.py) and the GSC inspection
(scripts/analytics/inspect-url.py), before anything is submitted:
    python3 scripts/analytics/log-recrawl.py \\
        --url https://www.getlootlist.com/compare \\
        --deploy-sha a1b2c3d4 --deploy-build-id dpl_abc123 \\
        --probe-result pass --inspection-result pass

Append the requested event after the human clicks Request Indexing:
    python3 scripts/analytics/log-recrawl.py \\
        --url https://www.getlootlist.com/compare \\
        --deploy-sha a1b2c3d4 --deploy-build-id dpl_abc123 \\
        --probe-result pass --inspection-result pass \\
        --request-date 2026-09-08 --requester zev

Check whether a URL has already been requested (usable as a shell guard --
exits 0 when it has not, 1 when it has):
    python3 scripts/analytics/log-recrawl.py --check https://www.getlootlist.com/compare

List every row in file order:
    python3 scripts/analytics/log-recrawl.py --list

stdlib only -- no node, no third-party packages.
"""
import argparse
import datetime
import os
import sys
import urllib.parse

HEADER = [
    "url",
    "deploy_sha",
    "deploy_build_id",
    "probe_result",
    "inspection_result",
    "request_date",
    "requester",
]

REQUIRED_FIELDS = ["url", "deploy_sha", "probe_result"]

LOG_PATH = "scripts/analytics/RECRAWL-LOG.md"

LOG_HEADER_BLOCK = """# Recrawl Log

This is the one place in this repository that records which URLs have
been submitted to Google Search Console for a recrawl request. It is
shared by Phase 5's own contextual-link sweep and by
`.planning/phases/04-verified-guild-case-study/04-PUBLISH-RUNBOOK.md`'s
case-study publish step 5, neither of which keeps a second table of its
own.

This is an event log, not a one-row-per-URL table. A prepared event is
appended once a URL has passed the production probe
(`scripts/analytics/probe-recrawl-urls.py`) and the Search Console URL
Inspection check (`scripts/analytics/inspect-url.py`), with an empty
`request_date` and an empty `requester`. A separate requested event is
appended after a human actually submits the Request Indexing click,
carrying the date and the requester. A URL can therefore appear more
than once; a row with a non-empty `request_date` is what "already
requested" means.

Nothing in this file is ever edited, sorted, deduplicated or removed.
The append order is the audit trail, and a tidied log can no longer
answer whether a URL was already submitted, which is the entire reason
this file exists. Only `scripts/analytics/log-recrawl.py` writes to it.

| url | deploy_sha | deploy_build_id | probe_result | inspection_result | request_date | requester |
|-----|------------|------------------|--------------|--------------------|--------------|-----------|
"""


def _escape(value):
    """Escape a pipe character so a field value cannot forge an extra column."""
    return str(value if value is not None else "").replace("|", "\\|")


def validate_row(row):
    """Return a list of human readable problems with row, empty when valid.

    Runs before anything is written. A prepared event legitimately has an
    empty request_date and an empty requester; a requested event must
    carry both.
    """
    problems = []

    for field in REQUIRED_FIELDS:
        if not row.get(field):
            problems.append(f"{field} is required and cannot be empty")

    url = row.get("url")
    if url:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            problems.append(f"url must be an absolute http or https URL, got {url!r}")

    request_date = row.get("request_date") or ""
    requester = row.get("requester") or ""

    if request_date:
        try:
            datetime.date.fromisoformat(request_date)
        except ValueError:
            problems.append(f"request_date must be ISO format YYYY-MM-DD, got {request_date!r}")

    if bool(request_date) != bool(requester):
        problems.append(
            "a requested event must carry both request_date and requester; "
            "a prepared event must carry neither"
        )

    return problems


def already_requested(url, rows):
    """Return True when any row for url carries a non-empty request_date."""
    for row in rows:
        if row.get("url") == url and row.get("request_date"):
            return True
    return False


def append_row(log_path, row):
    """Validate row, then append it as one Markdown table row to log_path.

    Writes the header block (explanation plus table header and separator)
    only when log_path is missing or zero bytes. Refuses to write anything
    -- returning the list of problems instead -- when validate_row reports
    a problem, or when row carries a non-empty request_date for a url that
    already has a non-empty request_date on an earlier row (the
    one-request rule; see already_requested). Always opens in append
    mode: never reads the whole file, rewrites it and writes it back, so
    an existing row can never be edited, sorted or reordered by this
    function.
    """
    problems = validate_row(row)
    if problems:
        return problems

    if row.get("request_date"):
        existing = read_rows(log_path)
        if already_requested(row["url"], existing):
            prior = next(
                r["request_date"]
                for r in existing
                if r.get("url") == row["url"] and r.get("request_date")
            )
            return [
                f"{row['url']} was already requested on {prior}; "
                "refusing to double-request the same URL"
            ]

    dirname = os.path.dirname(log_path)
    if dirname:
        os.makedirs(dirname, exist_ok=True)

    needs_header = not os.path.exists(log_path) or os.path.getsize(log_path) == 0

    with open(log_path, "a", encoding="utf-8") as f:
        if needs_header:
            f.write(LOG_HEADER_BLOCK)
        cells = [_escape(row.get(column, "")) for column in HEADER]
        f.write("| " + " | ".join(cells) + " |\n")

    return []


def _split_row_line(line):
    """Split one Markdown table row line into unescaped cell values.

    Splits on pipe characters that are not escaped with a backslash, then
    unescapes any `\\|` back into a literal `|`, so a field value
    containing a pipe round-trips as one field rather than splitting the
    row into an extra column.
    """
    stripped = line.strip()
    if stripped.startswith("|"):
        stripped = stripped[1:]
    if stripped.endswith("|"):
        stripped = stripped[:-1]

    cells = []
    current = []
    i = 0
    while i < len(stripped):
        ch = stripped[i]
        if ch == "\\" and i + 1 < len(stripped) and stripped[i + 1] == "|":
            current.append("|")
            i += 2
            continue
        if ch == "|":
            cells.append("".join(current).strip())
            current = []
            i += 1
            continue
        current.append(ch)
        i += 1
    cells.append("".join(current).strip())
    return cells


def read_rows(log_path):
    """Return every data row in log_path, in file (append) order.

    Never sorts, deduplicates, reorders or normalizes -- the append order
    is the audit trail. Skips the header block's prose, the table header
    row and the separator row, returning only rows that carry exactly
    len(HEADER) fields.
    """
    if not os.path.exists(log_path):
        return []

    rows = []
    with open(log_path, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line.startswith("|"):
                continue

            cells = _split_row_line(line)
            if len(cells) != len(HEADER):
                continue
            if cells == HEADER:
                continue
            if all(c == "" or set(c) <= {"-"} for c in cells):
                continue

            rows.append(dict(zip(HEADER, cells)))

    return rows


def parse_args():
    parser = argparse.ArgumentParser(
        description="Append-only recrawl log writer and checker."
    )
    parser.add_argument("--url", help="URL for this event")
    parser.add_argument("--deploy-sha", dest="deploy_sha", help="short git SHA of origin/main at deploy time")
    parser.add_argument(
        "--deploy-build-id", dest="deploy_build_id", default="",
        help="deployment identifier returned by /api/version",
    )
    parser.add_argument("--probe-result", dest="probe_result", help="short verdict from probe-recrawl-urls.py")
    parser.add_argument(
        "--inspection-result", dest="inspection_result", default="",
        help="short verdict from inspect-url.py",
    )
    parser.add_argument(
        "--request-date", dest="request_date", default="",
        help="ISO date the human submitted Request Indexing; empty for a prepared event",
    )
    parser.add_argument("--requester", default="", help="who submitted the request; empty for a prepared event")
    parser.add_argument(
        "--check", dest="check_url", default=None,
        help="print whether URL has already been requested; exits 0 if not, 1 if so",
    )
    parser.add_argument("--list", action="store_true", help="print every row in file order")
    parser.add_argument(
        "--log-path", dest="log_path", default=LOG_PATH,
        help="path to the recrawl log (tests point this at a temporary file)",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    if args.check_url:
        rows = read_rows(args.log_path)
        matches = [r for r in rows if r.get("url") == args.check_url and r.get("request_date")]
        if matches:
            latest = matches[-1]
            print(
                f"{args.check_url} was already requested on {latest['request_date']} "
                f"by {latest.get('requester', '')}"
            )
            sys.exit(1)
        print(f"{args.check_url} has not been requested yet")
        sys.exit(0)

    if args.list:
        for row in read_rows(args.log_path):
            print(" | ".join(f"{k}={row.get(k, '')}" for k in HEADER))
        sys.exit(0)

    row = {
        "url": args.url,
        "deploy_sha": args.deploy_sha,
        "deploy_build_id": args.deploy_build_id,
        "probe_result": args.probe_result,
        "inspection_result": args.inspection_result,
        "request_date": args.request_date,
        "requester": args.requester,
    }

    problems = append_row(args.log_path, row)
    if problems:
        for problem in problems:
            print(problem)
        sys.exit(1)

    print(f"Recorded {row['url']}")


if __name__ == "__main__":
    main()
