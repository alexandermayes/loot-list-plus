#!/usr/bin/env python3
"""
D-11 candidate pages and D-12 cluster comparison for the week-4 review.

D-11: within the position 4 to 20 band of a combined page-and-query Search
Console export, find pages that already earn meaningful impressions but
lose the click, using a rule fixed before any real data is seen.
D-12: compare a baseline query export against a week-4 query export,
cluster by cluster (brand, competitor, problem, expansion, unclustered).

Usage:
    python3 scripts/analytics/gsc_review.py threshold <page-query.csv>
    python3 scripts/analytics/gsc_review.py clusters <baseline-query.csv> <week4-query.csv>

stdlib only (csv, statistics, sys, argparse) — no node, no google client
libraries.

Rule rationale: CTR uses at or below the band median, not strictly below,
because on a small site most in-band rows have zero clicks, which makes
the median CTR zero. A strict below-median test would then admit nothing
and say nothing about the data.
"""
import argparse
import csv
import statistics
import sys

BAND_MIN_POSITION = 4.0
BAND_MAX_POSITION = 20.0

CLUSTER_ORDER = ("brand", "competitor", "problem", "expansion", "unclustered")

RULE_TEXT = (
    "Within the position 4 to 20 band of the page and query export, a row has "
    "meaningful impressions when its impressions are at or above the band "
    "median, and weak CTR when its CTR is at or below the band median. A page "
    "is a candidate when at least one of its rows meets both."
)

EXPECTED_THRESHOLD_HEADER = ["page", "query", "clicks", "impressions", "ctr", "position", "cluster"]
EXPECTED_CLUSTER_HEADER = ["query", "clicks", "impressions", "ctr", "position", "cluster"]


def read_header(path):
    with open(path, newline="") as f:
        return next(csv.reader(f))


def read_csv_rows(path):
    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        rows = []
        for row in reader:
            row["clicks"] = int(row["clicks"])
            row["impressions"] = int(row["impressions"])
            row["ctr"] = float(row["ctr"])
            row["position"] = float(row["position"])
            rows.append(row)
        return rows


def in_band(position):
    return BAND_MIN_POSITION <= position <= BAND_MAX_POSITION


def band_medians(rows):
    band_rows = [r for r in rows if in_band(r["position"])]
    if not band_rows:
        return None, None
    return (
        statistics.median(r["impressions"] for r in band_rows),
        statistics.median(r["ctr"] for r in band_rows),
    )


def meets_threshold(row, median_impressions, median_ctr):
    if not in_band(row["position"]):
        return False
    return row["impressions"] >= median_impressions and row["ctr"] <= median_ctr


def candidate_pages(rows, median_impressions, median_ctr):
    qualifying = [r for r in rows if meets_threshold(r, median_impressions, median_ctr)]
    by_page = {}
    for r in qualifying:
        by_page.setdefault(r["page"], []).append(r)

    candidates = []
    for page, page_rows in by_page.items():
        sorted_queries = sorted(page_rows, key=lambda r: -r["impressions"])
        candidates.append(
            {
                "page": page,
                "qualifying_queries": len(page_rows),
                "qualifying_impressions": sum(r["impressions"] for r in page_rows),
                "qualifying_clicks": sum(r["clicks"] for r in page_rows),
                "queries": sorted_queries,
            }
        )
    candidates.sort(key=lambda c: (-c["qualifying_impressions"], c["page"]))
    return candidates


def _fmt_impressions(value):
    if value == int(value):
        return f"{int(value)}"
    return f"{value:.1f}"


def render_threshold_markdown(rows, source_path):
    lines = []
    lines.append(f"Rule: {RULE_TEXT}")
    lines.append(f"Computed from: {source_path}")

    band_rows = [r for r in rows if in_band(r["position"])]
    median_impressions, median_ctr = band_medians(rows)
    lines.append(f"Band rows (position 4 to 20): {len(band_rows)}")

    if median_impressions is None:
        lines.append("No rows in the position 4 to 20 band")
        return "\n".join(lines) + "\n"

    lines.append(f"Median impressions in band: {_fmt_impressions(median_impressions)}")
    lines.append(f"Median CTR in band: {median_ctr * 100:.2f}%")
    lines.append("")

    candidates = candidate_pages(rows, median_impressions, median_ctr)
    lines.append("| Page | Qualifying queries | Qualifying impressions | Qualifying clicks | Top queries |")
    lines.append("|---|---|---|---|---|")
    for c in candidates:
        top = c["queries"][:3]
        top_str = "; ".join(
            f"{q['query']} (impr {q['impressions']}, ctr {q['ctr'] * 100:.2f}%, pos {q['position']:.1f})"
            for q in top
        )
        lines.append(
            f"| {c['page']} | {c['qualifying_queries']} | {c['qualifying_impressions']} | "
            f"{c['qualifying_clicks']} | {top_str} |"
        )
    return "\n".join(lines) + "\n"


def cluster_totals(rows):
    totals = {
        c: {"cluster": c, "queries": 0, "clicks": 0, "impressions": 0, "ctr": 0.0}
        for c in CLUSTER_ORDER
    }
    for r in rows:
        c = r.get("cluster", "unclustered")
        if c not in totals:
            c = "unclustered"
        totals[c]["queries"] += 1
        totals[c]["clicks"] += r["clicks"]
        totals[c]["impressions"] += r["impressions"]
    for c in CLUSTER_ORDER:
        impressions = totals[c]["impressions"]
        totals[c]["ctr"] = (totals[c]["clicks"] / impressions) if impressions else 0.0
    return [totals[c] for c in CLUSTER_ORDER]


def render_cluster_markdown(baseline_rows, week4_rows, baseline_path, week4_path):
    baseline_totals = {t["cluster"]: t for t in cluster_totals(baseline_rows)}
    week4_totals = {t["cluster"]: t for t in cluster_totals(week4_rows)}

    lines = []
    lines.append(f"Baseline: {baseline_path}")
    lines.append(f"Week 4: {week4_path}")
    lines.append("")
    lines.append(
        "| Cluster | Baseline queries | Baseline clicks | Baseline impr | Baseline CTR | "
        "Week 4 queries | Week 4 clicks | Week 4 impr | Week 4 CTR | Impr change | CTR change (pp) |"
    )
    lines.append("|---|---|---|---|---|---|---|---|---|---|---|")
    for c in CLUSTER_ORDER:
        b = baseline_totals[c]
        w = week4_totals[c]
        impr_change = w["impressions"] - b["impressions"]
        ctr_change_pp = (w["ctr"] - b["ctr"]) * 100
        lines.append(
            f"| {c} | {b['queries']} | {b['clicks']} | {b['impressions']} | {b['ctr'] * 100:.2f}% | "
            f"{w['queries']} | {w['clicks']} | {w['impressions']} | {w['ctr'] * 100:.2f}% | "
            f"{impr_change:+d} | {ctr_change_pp:+.2f} |"
        )
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    threshold_parser = sub.add_parser("threshold", help="D-11 candidate pages from a page-query export")
    threshold_parser.add_argument("csv_path")

    clusters_parser = sub.add_parser("clusters", help="D-12 cluster comparison between two query exports")
    clusters_parser.add_argument("baseline_csv")
    clusters_parser.add_argument("week4_csv")

    args = parser.parse_args()

    if args.command == "threshold":
        header = read_header(args.csv_path)
        if header != EXPECTED_THRESHOLD_HEADER:
            print(
                f"threshold requires the page-query export header {EXPECTED_THRESHOLD_HEADER}; "
                f"got {header} from {args.csv_path}"
            )
            sys.exit(2)
        rows = read_csv_rows(args.csv_path)
        print(render_threshold_markdown(rows, args.csv_path))
    elif args.command == "clusters":
        for path in (args.baseline_csv, args.week4_csv):
            header = read_header(path)
            if header != EXPECTED_CLUSTER_HEADER:
                print(
                    f"clusters requires the query export header {EXPECTED_CLUSTER_HEADER} with a "
                    f"cluster column; got {header} from {path}"
                )
                sys.exit(2)
        baseline_rows = read_csv_rows(args.baseline_csv)
        week4_rows = read_csv_rows(args.week4_csv)
        print(render_cluster_markdown(baseline_rows, week4_rows, args.baseline_csv, args.week4_csv))


if __name__ == "__main__":
    main()
