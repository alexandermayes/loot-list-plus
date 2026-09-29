#!/usr/bin/env python3
"""
Unit tests for gsc_review.py: the D-11 band/threshold rule, candidate-page
rollup, D-12 cluster comparison, and CSV row parsing.

Run with:
    python3 -m unittest discover -s scripts/analytics -p 'test_gsc_review.py' -v

(`python3 -m unittest scripts/analytics/test_gsc_review.py` does not work
here because this file imports the sibling module `gsc_review` by bare
name; the discovery form puts scripts/analytics on sys.path first.)
"""
import csv
import os
import subprocess
import sys
import tempfile
import unittest

from gsc_review import (
    BAND_MAX_POSITION,
    BAND_MIN_POSITION,
    CLUSTER_ORDER,
    RULE_TEXT,
    band_medians,
    candidate_pages,
    cluster_totals,
    in_band,
    meets_threshold,
    read_csv_rows,
    render_cluster_markdown,
    render_threshold_markdown,
)

BASELINE_QUERY_EXPORT = os.path.join(
    "scripts", "analytics", "exports", "gsc-baseline-cohort-query-2026-08-24_2026-08-30.csv"
)


def query_row(query="q", clicks=0, impressions=10, ctr=0.0, position=10.0, cluster="unclustered"):
    return {
        "query": query,
        "clicks": clicks,
        "impressions": impressions,
        "ctr": ctr,
        "position": position,
        "cluster": cluster,
    }


def page_query_row(page="/page", query="q", clicks=0, impressions=10, ctr=0.0, position=10.0, cluster="unclustered"):
    return {
        "page": page,
        "query": query,
        "clicks": clicks,
        "impressions": impressions,
        "ctr": ctr,
        "position": position,
        "cluster": cluster,
    }


class TestInBand(unittest.TestCase):
    def test_band_bounds_are_4_and_20(self):
        self.assertEqual(BAND_MIN_POSITION, 4.0)
        self.assertEqual(BAND_MAX_POSITION, 20.0)

    def test_in_band_true_at_lower_bound(self):
        self.assertTrue(in_band(4.0))

    def test_in_band_true_in_middle(self):
        self.assertTrue(in_band(12.3))

    def test_in_band_true_at_upper_bound(self):
        self.assertTrue(in_band(20.0))

    def test_in_band_false_just_below_lower_bound(self):
        self.assertFalse(in_band(3.99))

    def test_in_band_false_just_above_upper_bound(self):
        self.assertFalse(in_band(20.01))


class TestBandMedians(unittest.TestCase):
    def test_band_medians_over_in_band_rows_only(self):
        rows = [
            page_query_row(impressions=10, ctr=0.0, position=5.0),
            page_query_row(impressions=20, ctr=0.10, position=15.0),
            page_query_row(impressions=999, ctr=0.99, position=1.0),  # out of band, excluded
        ]
        median_impr, median_ctr = band_medians(rows)
        self.assertEqual(median_impr, 15)
        self.assertEqual(median_ctr, 0.05)

    def test_band_medians_none_none_when_no_row_in_band(self):
        rows = [page_query_row(position=1.0), page_query_row(position=25.0)]
        self.assertEqual(band_medians(rows), (None, None))


class TestMeetsThreshold(unittest.TestCase):
    def test_meets_threshold_at_or_above_impressions_and_at_or_below_ctr(self):
        row = page_query_row(impressions=10, clicks=0, ctr=0.0, position=10.0)
        self.assertTrue(meets_threshold(row, median_impressions=10, median_ctr=0.0))

    def test_meets_threshold_false_when_impressions_below_median(self):
        row = page_query_row(impressions=9, clicks=0, ctr=0.0, position=10.0)
        self.assertFalse(meets_threshold(row, median_impressions=10, median_ctr=0.0))

    def test_meets_threshold_true_when_at_median_impressions_and_ctr(self):
        row = page_query_row(impressions=30, ctr=0.05, position=10.0)
        self.assertTrue(meets_threshold(row, median_impressions=20, median_ctr=0.05))

    def test_meets_threshold_false_when_ctr_above_median(self):
        row = page_query_row(impressions=30, ctr=0.06, position=10.0)
        self.assertFalse(meets_threshold(row, median_impressions=20, median_ctr=0.05))

    def test_meets_threshold_false_for_out_of_band_row_even_if_values_qualify(self):
        row = page_query_row(impressions=30, ctr=0.05, position=1.0)
        self.assertFalse(meets_threshold(row, median_impressions=20, median_ctr=0.05))


class TestCandidatePages(unittest.TestCase):
    def test_candidate_pages_groups_sums_and_orders(self):
        rows = [
            page_query_row(page="/a", query="q1", impressions=10, clicks=1, ctr=0.0, position=10.0),
            page_query_row(page="/a", query="q2", impressions=30, clicks=2, ctr=0.0, position=12.0),
            page_query_row(page="/b", query="q3", impressions=50, clicks=3, ctr=0.0, position=8.0),
            page_query_row(page="/c", query="q4", impressions=5, clicks=0, ctr=0.99, position=8.0),  # fails CTR
        ]
        candidates = candidate_pages(rows, median_impressions=10, median_ctr=0.0)
        self.assertEqual([c["page"] for c in candidates], ["/b", "/a"])

        page_b = candidates[0]
        self.assertEqual(page_b["qualifying_queries"], 1)
        self.assertEqual(page_b["qualifying_impressions"], 50)
        self.assertEqual(page_b["qualifying_clicks"], 3)

        page_a = candidates[1]
        self.assertEqual(page_a["qualifying_queries"], 2)
        self.assertEqual(page_a["qualifying_impressions"], 40)
        self.assertEqual(page_a["qualifying_clicks"], 3)
        self.assertEqual([q["query"] for q in page_a["queries"]], ["q2", "q1"])

    def test_candidate_pages_orders_ties_by_page_ascending(self):
        rows = [
            page_query_row(page="/z", query="q1", impressions=10, ctr=0.0, position=10.0),
            page_query_row(page="/a", query="q2", impressions=10, ctr=0.0, position=10.0),
        ]
        candidates = candidate_pages(rows, median_impressions=10, median_ctr=0.0)
        self.assertEqual([c["page"] for c in candidates], ["/a", "/z"])

    def test_candidate_pages_empty_when_nothing_qualifies(self):
        rows = [page_query_row(impressions=1, ctr=0.99, position=10.0)]
        self.assertEqual(candidate_pages(rows, median_impressions=10, median_ctr=0.0), [])


class TestRenderThresholdMarkdown(unittest.TestCase):
    def test_rule_and_medians_precede_first_candidate_row(self):
        rows = [
            page_query_row(page="/a", query="q1", impressions=20, ctr=0.0, position=10.0),
            page_query_row(page="/a", query="q2", impressions=10, ctr=0.0, position=8.0),
        ]
        output = render_threshold_markdown(rows, "source.csv")
        rule_idx = output.index(RULE_TEXT)
        candidate_idx = output.index("/a")
        self.assertLess(rule_idx, candidate_idx)
        self.assertIn("Computed from: source.csv", output)

    def test_empty_band_prints_no_rows_message_and_no_table(self):
        rows = [page_query_row(position=1.0), page_query_row(position=25.0)]
        output = render_threshold_markdown(rows, "source.csv")
        self.assertIn("No rows in the position 4 to 20 band", output)
        self.assertNotIn("|", output)

    def test_threshold_output_from_real_page_query_csv_states_rule_before_candidates(self):
        rows = [
            page_query_row(page="/guide", query="loot spreadsheet", impressions=50, clicks=1, ctr=0.02, position=9.0),
            page_query_row(page="/guide", query="loot priority", impressions=5, clicks=2, ctr=0.4, position=9.0),
        ]
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "pq.csv")
            with open(path, "w", newline="") as f:
                w = csv.writer(f)
                w.writerow(["page", "query", "clicks", "impressions", "ctr", "position", "cluster"])
                for r in rows:
                    w.writerow([r["page"], r["query"], r["clicks"], r["impressions"], r["ctr"], r["position"], r["cluster"]])
            parsed = read_csv_rows(path)
            output = render_threshold_markdown(parsed, path)
            self.assertLess(output.index(RULE_TEXT), output.index("/guide"))


class TestClusterTotals(unittest.TestCase):
    def test_cluster_totals_includes_every_cluster_in_order(self):
        rows = [query_row(query="lootlist", clicks=1, impressions=10, cluster="brand")]
        totals = cluster_totals(rows)
        self.assertEqual([t["cluster"] for t in totals], list(CLUSTER_ORDER))

    def test_cluster_totals_sums_and_computes_ctr(self):
        rows = [
            query_row(query="lootlist", clicks=2, impressions=10, cluster="brand"),
            query_row(query="lootlist plus", clicks=1, impressions=10, cluster="brand"),
        ]
        totals = {t["cluster"]: t for t in cluster_totals(rows)}
        brand = totals["brand"]
        self.assertEqual(brand["queries"], 2)
        self.assertEqual(brand["clicks"], 3)
        self.assertEqual(brand["impressions"], 20)
        self.assertEqual(brand["ctr"], 0.15)

    def test_cluster_totals_ctr_zero_when_no_impressions(self):
        totals = {t["cluster"]: t for t in cluster_totals([])}
        for cluster in CLUSTER_ORDER:
            self.assertEqual(totals[cluster]["ctr"], 0.0)
            self.assertEqual(totals[cluster]["impressions"], 0)


class TestRenderClusterMarkdown(unittest.TestCase):
    def test_shows_both_paths_and_all_clusters(self):
        baseline_rows = [query_row(query="lootlist", clicks=2, impressions=10, cluster="brand")]
        week4_rows = [query_row(query="lootlist", clicks=4, impressions=10, cluster="brand")]
        output = render_cluster_markdown(baseline_rows, week4_rows, "baseline.csv", "week4.csv")
        self.assertIn("baseline.csv", output)
        self.assertIn("week4.csv", output)
        for cluster in CLUSTER_ORDER:
            self.assertIn(cluster, output)

    def test_same_export_against_itself_has_zero_change(self):
        rows = [query_row(query="lootlist", clicks=2, impressions=10, cluster="brand")]
        output = render_cluster_markdown(rows, rows, "same.csv", "same.csv")
        self.assertIn("+0", output)


class TestReadCsvRows(unittest.TestCase):
    def test_read_csv_rows_converts_types_for_page_query_header(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "pq.csv")
            with open(path, "w", newline="") as f:
                w = csv.writer(f)
                w.writerow(["page", "query", "clicks", "impressions", "ctr", "position", "cluster"])
                w.writerow(["/a", "q", "3", "40", "0.075", "8.5", "unclustered"])
            rows = read_csv_rows(path)
            self.assertEqual(rows[0]["clicks"], 3)
            self.assertEqual(rows[0]["impressions"], 40)
            self.assertEqual(rows[0]["ctr"], 0.075)
            self.assertEqual(rows[0]["position"], 8.5)
            self.assertIsInstance(rows[0]["clicks"], int)
            self.assertIsInstance(rows[0]["ctr"], float)

    def test_read_csv_rows_converts_types_for_query_header(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "q.csv")
            with open(path, "w", newline="") as f:
                w = csv.writer(f)
                w.writerow(["query", "clicks", "impressions", "ctr", "position", "cluster"])
                w.writerow(["q", "1", "20", "0.05", "5.0", "brand"])
            rows = read_csv_rows(path)
            self.assertEqual(rows[0]["clicks"], 1)
            self.assertEqual(rows[0]["impressions"], 20)
            self.assertEqual(rows[0]["ctr"], 0.05)
            self.assertEqual(rows[0]["position"], 5.0)


class TestNoTypographicLongDash(unittest.TestCase):
    def test_threshold_output_has_no_em_dash(self):
        rows = [page_query_row(page="/a", query="q1", impressions=20, ctr=0.0, position=10.0)]
        self.assertNotIn("—", render_threshold_markdown(rows, "source.csv"))

    def test_cluster_output_has_no_em_dash(self):
        rows = [query_row()]
        self.assertNotIn("—", render_cluster_markdown(rows, rows, "a.csv", "b.csv"))


class TestClustersSubcommandOnCommittedExport(unittest.TestCase):
    def test_clusters_subcommand_against_itself_exits_0_and_shows_all_clusters(self):
        result = subprocess.run(
            [sys.executable, "scripts/analytics/gsc_review.py", "clusters", BASELINE_QUERY_EXPORT, BASELINE_QUERY_EXPORT],
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        for cluster in CLUSTER_ORDER:
            self.assertIn(cluster, result.stdout)


if __name__ == "__main__":
    unittest.main()
