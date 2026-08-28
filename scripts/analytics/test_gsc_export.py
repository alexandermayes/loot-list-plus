#!/usr/bin/env python3
"""
Unit tests for gsc_export.py: PARTIAL naming, CSV quoting, row order, and
path guards.

Run with:
    python3 -m unittest discover -s scripts/analytics -p 'test_gsc_export.py' -v

(`python3 -m unittest scripts/analytics/test_gsc_export.py` does not work
here because this file imports the sibling module `gsc_export` by bare
name; the discovery form puts scripts/analytics on sys.path first.)
"""
import csv
import os
import tempfile
import unittest

from gsc_export import (
    CSV_HEADER_PAGE,
    CSV_HEADER_QUERY,
    EXPORTS_DIR,
    export_csv,
    max_date,
    partial_suffix_path,
    resolve_export_path,
)


class TestExportHelpers(unittest.TestCase):
    # -- partial_suffix_path -----------------------------------------

    def test_partial_suffix_path_unchanged_when_coverage_complete(self):
        self.assertEqual(
            partial_suffix_path("out.csv", "2026-08-25", "2026-08-25"),
            "out.csv",
        )

    def test_partial_suffix_path_inserts_through_marker_when_coverage_short(self):
        self.assertEqual(
            partial_suffix_path("out.csv", "2026-08-30", "2026-08-25"),
            "out-PARTIAL-through-2026-08-25.csv",
        )

    def test_partial_suffix_path_inserts_no_data_marker_when_actual_end_is_none(self):
        self.assertEqual(
            partial_suffix_path("out.csv", "2026-08-30", None),
            "out-PARTIAL-no-data.csv",
        )

    # -- max_date ------------------------------------------------------

    def test_max_date_returns_none_for_empty_rows(self):
        self.assertIsNone(max_date([]))

    def test_max_date_returns_greatest_key_regardless_of_arrival_order(self):
        rows = [
            {"keys": ["2026-08-24"]},
            {"keys": ["2026-08-26"]},
            {"keys": ["2026-08-25"]},
        ]
        self.assertEqual(max_date(rows), "2026-08-26")

    # -- export_csv: header selection ----------------------------------

    def test_export_csv_writes_query_header_for_query_dimension(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "q.csv")
            export_csv([], path, "query")
            with open(path, newline="") as f:
                reader = csv.reader(f)
                self.assertEqual(next(reader), CSV_HEADER_QUERY)

    def test_export_csv_writes_page_header_with_no_cluster_column(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "p.csv")
            export_csv([], path, "page")
            with open(path, newline="") as f:
                reader = csv.reader(f)
                header = next(reader)
                self.assertEqual(header, CSV_HEADER_PAGE)
                self.assertNotIn("cluster", header)

    # -- export_csv: quoting round trip --------------------------------

    def test_export_csv_quoting_round_trips_comma_and_quote_byte_identical(self):
        tricky_key = 'weird, "quoted" query'
        rows = [
            {
                "keys": [tricky_key],
                "clicks": 3,
                "impressions": 40,
                "ctr": 0.075,
                "position": 4.2,
            }
        ]
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "quoting.csv")
            export_csv(rows, path, "query", cluster_fn=lambda q: "unclustered")
            with open(path, newline="") as f:
                read_rows = list(csv.DictReader(f))
            self.assertEqual(read_rows[0]["query"], tricky_key)

    # -- export_csv: row order and count -------------------------------

    def test_export_csv_preserves_received_row_order(self):
        rows = [
            {"keys": ["zeta query"], "clicks": 1, "impressions": 1, "ctr": 1.0, "position": 1.0},
            {"keys": ["alpha query"], "clicks": 2, "impressions": 2, "ctr": 1.0, "position": 2.0},
            {"keys": ["mid query"], "clicks": 3, "impressions": 3, "ctr": 1.0, "position": 3.0},
        ]
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "order.csv")
            count = export_csv(rows, path, "query", cluster_fn=lambda q: "unclustered")
            with open(path, newline="") as f:
                read_rows = list(csv.DictReader(f))
            self.assertEqual([r["query"] for r in read_rows], ["zeta query", "alpha query", "mid query"])
            self.assertEqual(count, 3)

    def test_export_csv_on_empty_rows_writes_only_header_and_returns_zero(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "empty.csv")
            count = export_csv([], path, "query")
            self.assertEqual(count, 0)
            with open(path, newline="") as f:
                lines = f.readlines()
            self.assertEqual(len(lines), 1)

    # -- resolve_export_path --------------------------------------------

    def test_resolve_export_path_places_bare_filename_under_exports_dir(self):
        resolved = resolve_export_path("bare-name.csv")
        self.assertEqual(resolved, os.path.join(EXPORTS_DIR, "bare-name.csv"))

    def test_resolve_export_path_leaves_explicit_relative_path_alone(self):
        with tempfile.TemporaryDirectory() as tmp:
            explicit = os.path.join(tmp, "subdir", "explicit.csv")
            resolved = resolve_export_path(explicit)
            self.assertEqual(resolved, explicit)

    def test_resolve_export_path_rejects_dotdot_segment(self):
        with self.assertRaises(ValueError):
            resolve_export_path("../escape.csv")


if __name__ == "__main__":
    unittest.main()
