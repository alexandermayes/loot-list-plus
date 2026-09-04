#!/usr/bin/env python3
"""
Unit tests for research_report.py: the 10-guild floor merge, the window
and forbidden-column guards, the ROUND_HALF_UP display quantizer, the
zero-row-to-unavailable routing, CSV row ordering, and the output-path
guard.

Run with:
    python3 -m unittest discover -s scripts/analytics -p 'test_research_report.py' -v

(`python3 -m unittest scripts/analytics/test_research_report.py` does not
work here because this file imports the sibling module `research_report`
by bare name; the discovery form puts scripts/analytics on sys.path
first.)
"""
import csv
import os
import tempfile
import unittest

from research_report import (
    FORBIDDEN_SQL_TOKENS,
    WINDOW_END,
    WINDOW_START,
    WITHHELD,
    apply_floor,
    assert_no_forbidden_columns,
    assert_window_literals,
    build_artifact,
    quantize_display,
    resolve_output_path,
    write_csv,
)


class TestApplyFloor(unittest.TestCase):
    def test_keeps_boundary_segment_and_merges_a_segment_of_nine(self):
        # A=10 clears the floor and is kept as its own segment. B=9 is
        # below the floor and merges into Other. C=5 also merges into
        # Other so the accumulated Other (14) itself clears the floor --
        # this test is about the boundary-keep and the merge, not about
        # the withhold case (covered separately below).
        result = apply_floor({"A": 10, "B": 9, "C": 5})
        self.assertEqual(result, {"A": 10, "Other": 14})

    def test_merges_several_sub_floor_segments_into_one_other(self):
        result = apply_floor({"A": 15, "B": 5, "C": 4, "D": 3})
        self.assertEqual(result, {"A": 15, "Other": 12})

    def test_withholds_whole_breakdown_when_other_itself_below_floor(self):
        result = apply_floor({"A": 15, "B": 3})
        self.assertIs(result, WITHHELD)

    def test_empty_input_returns_empty_result_with_no_other_key(self):
        result = apply_floor({})
        self.assertEqual(result, {})
        self.assertNotIn("Other", result)

    def test_respects_custom_floor(self):
        result = apply_floor({"A": 6, "B": 3, "C": 3}, floor=5)
        self.assertEqual(result, {"A": 6, "Other": 6})


class TestAssertWindowLiterals(unittest.TestCase):
    def test_raises_when_window_start_missing(self):
        sql = f"SELECT 1 WHERE d < DATE '{WINDOW_END}'"
        with self.assertRaises(ValueError):
            assert_window_literals(sql, "scratch.sql")

    def test_raises_when_window_end_missing(self):
        sql = f"SELECT 1 WHERE d >= DATE '{WINDOW_START}'"
        with self.assertRaises(ValueError):
            assert_window_literals(sql, "scratch.sql")

    def test_returns_cleanly_when_both_present(self):
        sql = f"SELECT 1 WHERE d >= DATE '{WINDOW_START}' AND d < DATE '{WINDOW_END}' + INTERVAL '1 day'"
        assert_window_literals(sql, "scratch.sql")  # must not raise


class TestAssertNoForbiddenColumns(unittest.TestCase):
    def test_raises_for_every_forbidden_token(self):
        for token in FORBIDDEN_SQL_TOKENS:
            sql = f"SELECT id, {token} FROM some_table"
            with self.assertRaises(ValueError, msg=f"expected a raise for token {token!r}"):
                assert_no_forbidden_columns(sql, "scratch.sql")

    def test_does_not_over_reject_expansion_and_raid_tier_names(self):
        sql = (
            "SELECT expansions.name AS expansion_name, COUNT(*) AS n "
            "FROM raid_events re "
            "JOIN raid_tiers ON raid_tiers.id = re.raid_tier_id "
            "JOIN expansions ON expansions.id = raid_tiers.expansion_id "
            "GROUP BY expansions.name, raid_tiers.name"
        )
        assert_no_forbidden_columns(sql, "scratch.sql")  # must not raise


class TestQuantizeDisplay(unittest.TestCase):
    def test_percentage_rounds_half_up_not_bankers(self):
        self.assertEqual(quantize_display(41.65, "percentage"), "41.7")

    def test_percentage_leaves_exact_tenth_unchanged(self):
        self.assertEqual(quantize_display(0.5, "percentage"), "0.5")

    def test_median_rounds_half_up_not_bankers(self):
        self.assertEqual(quantize_display(2.25, "median"), "2.3")

    def test_count_has_no_decimal_point(self):
        self.assertEqual(quantize_display(5, "count"), "5")
        self.assertEqual(quantize_display(5.0, "count"), "5")


class TestBuildArtifact(unittest.TestCase):
    def test_zero_row_metric_routes_to_unavailable_never_findings(self):
        artifact = build_artifact(
            window={"start": WINDOW_START, "end": WINDOW_END},
            definitions={},
            sample={"active_guilds": 20, "raid_events": 100, "loot_awards": 50, "raiders_with_approved_lists": 40},
            findings=[
                {
                    "metric_id": "empty-metric",
                    "label": "A metric with no rows",
                    "kind": "count",
                    "value": None,
                    "reason": "query returned zero rows",
                },
                {
                    "metric_id": "real-metric",
                    "label": "A metric with a real value",
                    "kind": "count",
                    "value": 7,
                    "display": "7",
                },
            ],
            unavailable=[],
            generated_at="2026-09-04T00:00:00Z",
        )
        self.assertEqual(
            [f["metric_id"] for f in artifact["findings"]],
            ["real-metric"],
        )
        self.assertEqual(
            artifact["unavailable"],
            [{"metric_id": "empty-metric", "label": "A metric with no rows", "reason": "query returned zero rows"}],
        )
        # never published as a zero or null value
        for f in artifact["findings"]:
            self.assertIsNotNone(f["value"])

    def test_sums_to_100_false_when_segments_exceed_active_guilds(self):
        artifact = build_artifact(
            window={"start": WINDOW_START, "end": WINDOW_END},
            definitions={},
            sample={"active_guilds": 10, "raid_events": 1, "loot_awards": 1, "raiders_with_approved_lists": 1},
            findings=[
                {
                    "metric_id": "expansion-breakdown",
                    "label": "Expansion breakdown",
                    "kind": "percentage",
                    "value": 100.0,
                    "display": "100.0",
                    "segments": [
                        {"segment": "MoP", "guild_count": 8, "share": 80.0, "display": "80.0"},
                        {"segment": "Wrath", "guild_count": 5, "share": 50.0, "display": "50.0"},
                    ],
                },
            ],
            unavailable=[],
            generated_at="2026-09-04T00:00:00Z",
        )
        self.assertFalse(artifact["findings"][0]["sums_to_100"])


class TestWriteCsv(unittest.TestCase):
    def _sample_artifact(self):
        return {
            "sample": {
                "active_guilds": 20,
                "raid_events": 100,
                "loot_awards": 50,
                "raiders_with_approved_lists": 40,
            },
            "sample_query_file": "01-sample-definition.sql",
            "findings": [
                {
                    "metric_id": "expansion-breakdown",
                    "label": "Expansion breakdown",
                    "kind": "percentage",
                    "value": 100.0,
                    "display": "100.0",
                    "denominator": "active_guilds",
                    "share_basis": "guild",
                    "query_file": "02-expansion-breakdown.sql",
                    "segments": [
                        {"segment": "Wrath", "guild_count": 5, "display": "25.0"},
                        {"segment": "MoP", "guild_count": 12, "display": "60.0"},
                        {"segment": "Other", "guild_count": 3, "display": "15.0"},
                    ],
                },
            ],
        }

    def test_orders_sample_then_findings_then_segments_by_count_desc_name_asc(self):
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, "out.csv")
            write_csv(self._sample_artifact(), path)
            with open(path, newline="") as f:
                rows = list(csv.reader(f))

        # header, 4 sample rows, 1 finding row, 3 segment rows
        self.assertEqual(rows[0], [
            "metric_id", "label", "kind", "segment", "value", "display",
            "denominator", "share_basis", "query_file",
        ])
        self.assertEqual(rows[1][0], "sample.active_guilds")
        self.assertEqual(rows[2][0], "sample.raid_events")
        self.assertEqual(rows[3][0], "sample.loot_awards")
        self.assertEqual(rows[4][0], "sample.raiders_with_approved_lists")
        self.assertEqual(rows[5][0], "expansion-breakdown")
        self.assertEqual(rows[5][3], "")  # segment column blank on the finding row
        # segments ordered by guild_count descending (12, 5, 3), then name
        # ascending on ties (none here)
        self.assertEqual([r[3] for r in rows[6:9]], ["MoP", "Wrath", "Other"])

    def test_two_runs_over_unchanged_data_produce_identical_bytes(self):
        with tempfile.TemporaryDirectory() as d:
            path = os.path.join(d, "out.csv")
            write_csv(self._sample_artifact(), path)
            with open(path, "rb") as f:
                first = f.read()
            write_csv(self._sample_artifact(), path)
            with open(path, "rb") as f:
                second = f.read()
        self.assertEqual(first, second)


class TestResolveOutputPath(unittest.TestCase):
    def test_rejects_dotdot_segment(self):
        with self.assertRaises(ValueError):
            resolve_output_path("../escape.json")


if __name__ == "__main__":
    unittest.main()
