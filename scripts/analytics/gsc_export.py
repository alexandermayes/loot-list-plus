#!/usr/bin/env python3
"""
CSV export helpers for the GSC pull: path resolution, PARTIAL-coverage
naming, and correctly-quoted CSV writing. No network — see pull-gsc.py for
the caller.

stdlib only — no node, no google client libraries.
"""
import csv
import os

CSV_HEADER_QUERY = ["query", "clicks", "impressions", "ctr", "position", "cluster"]
CSV_HEADER_PAGE = ["page", "clicks", "impressions", "ctr", "position"]
CSV_HEADER_PAGE_QUERY = ["page", "query", "clicks", "impressions", "ctr", "position", "cluster"]
EXPORTS_DIR = "scripts/analytics/exports"


def resolve_export_path(path):
    if ".." in path.split(os.sep):
        raise ValueError(f"refusing output path containing '..' segment: {path}")
    if os.sep not in path and (os.altsep is None or os.altsep not in path):
        path = os.path.join(EXPORTS_DIR, path)
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    return path


def max_date(date_rows):
    if not date_rows:
        return None
    return max(row["keys"][0] for row in date_rows)


def partial_suffix_path(path, requested_end, actual_end):
    if actual_end is None:
        suffix = "-PARTIAL-no-data"
    elif actual_end < requested_end:
        suffix = f"-PARTIAL-through-{actual_end}"
    else:
        return path
    base, ext = os.path.splitext(path)
    return f"{base}{suffix}{ext}"


def export_csv(rows, path, dimension, cluster_fn=None):
    headers = {
        "query": CSV_HEADER_QUERY,
        "page": CSV_HEADER_PAGE,
        "page-query": CSV_HEADER_PAGE_QUERY,
    }
    if dimension not in headers:
        raise ValueError(f"unknown export dimension: {dimension}")
    header = headers[dimension]
    count = 0
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        for row in rows:
            if dimension == "page-query":
                page, q = row["keys"][0], row["keys"][1]
                values = [
                    page,
                    q,
                    row["clicks"],
                    row["impressions"],
                    row["ctr"],
                    row["position"],
                    cluster_fn(q) if cluster_fn else "unclustered",
                ]
            else:
                key = row["keys"][0]
                values = [key, row["clicks"], row["impressions"], row["ctr"], row["position"]]
                if dimension == "query":
                    values.append(cluster_fn(key) if cluster_fn else "unclustered")
            w.writerow(values)
            count += 1
    return count
