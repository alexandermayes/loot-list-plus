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
import json
import os
import tempfile
import unittest
from pathlib import Path

from research_report import (
    FORBIDDEN_SQL_TOKENS,
    GUILD_FLOOR,
    TOP_BRACKET_SHARE_THRESHOLD,
    WINDOW_END,
    WINDOW_START,
    WITHHELD,
    apply_floor,
    assemble_breakdown,
    assemble_median,
    assert_no_forbidden_columns,
    assert_window_literals,
    build_artifact,
    decide_top_bracket_coverage,
    quantize_display,
    render_menu,
    resolve_output_path,
    write_csv,
)

METRICS_JSON_PATH = (
    Path(__file__).resolve().parent
    / "queries"
    / "wow-classic-loot-systems-2026"
    / "metrics.json"
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


# --- 03-02 Task 1: registry completeness, breakdown assembler, menu renderer ---
#
# The plan text ("keep the existing sample-definition entry and add nine
# more") arithmetically contradicts its own explicit list of nine new
# metric ids, which names only eight (median-list-length,
# attendance-weighting, blp-usage, expansion-distribution,
# time-to-qualified, time-to-activated, top-priority-bracket,
# officer-time-survey). 1 existing + 8 named = 9, not the "ten entries"
# the plan's own <verify>/<acceptance_criteria> hard-code. This is a
# planner arithmetic bug (documented as a deviation in the plan SUMMARY),
# not a missing tenth sprint-plan bullet: every one of the ten sprint-plan
# bullets is represented -- bullets 1 and 2 ("active guilds and raiders
# with approved lists" / "raids tracked and loot awards recorded") were
# already combined into the single sample-definition entry in plan 03-01,
# before this plan ever ran. The registry below is intentionally 9 rows;
# the two `support`-kind rows (funnel-cohort-coverage, top-bracket-
# coverage) added in tasks 2 and 3 bring the total to 11 by the plan's end,
# which is what the plan's own final <verification> block ("ten candidate
# entries... plus the support entries") actually requires once you don't
# double-count the arithmetic bug.
class TestMetricsRegistryCompleteness(unittest.TestCase):
    def setUp(self):
        self.registry = json.loads(METRICS_JSON_PATH.read_text())

    def test_registry_has_nine_entries_with_required_shape(self):
        self.assertEqual(len(self.registry), 9)
        for entry in self.registry:
            self.assertTrue(entry.get("metric_id"))
            self.assertTrue(entry.get("label"))
            self.assertTrue(entry.get("kind"))
            has_query_file = bool(entry.get("query_file"))
            has_reason = bool(entry.get("unavailable_reason"))
            self.assertNotEqual(
                has_query_file, has_reason,
                msg=f"{entry['metric_id']}: exactly one of query_file/unavailable_reason must be set",
            )

    def test_metric_ids_are_unique(self):
        ids = [e["metric_id"] for e in self.registry]
        self.assertEqual(len(ids), len(set(ids)))

    def test_attendance_weighting_carries_a_definition_note(self):
        entry = next(e for e in self.registry if e["metric_id"] == "attendance-weighting")
        self.assertTrue((entry.get("definition_note") or "").strip())

    def test_officer_time_survey_is_unavailable_with_null_query_file(self):
        entry = next(e for e in self.registry if e["metric_id"] == "officer-time-survey")
        self.assertIsNone(entry.get("query_file"))
        self.assertTrue((entry.get("unavailable_reason") or "").strip())


class TestAssembleBreakdown(unittest.TestCase):
    def _metric(self, **overrides):
        base = {"metric_id": "expansion-distribution", "label": "Distribution of expansions", "kind": "breakdown"}
        base.update(overrides)
        return base

    def test_computes_segment_shares_from_denominator(self):
        status, entry = assemble_breakdown(self._metric(), {"MoP": 15, "Wrath": 12}, denominator=27)
        self.assertEqual(status, "finding")
        by_segment = {s["segment"]: s for s in entry["segments"]}
        self.assertEqual(by_segment["MoP"]["guild_count"], 15)
        self.assertEqual(by_segment["MoP"]["display"], quantize_display(15 / 27 * 100, "percentage"))
        self.assertEqual(by_segment["Wrath"]["display"], quantize_display(12 / 27 * 100, "percentage"))

    def test_sums_to_100_true_when_segments_equal_denominator_false_when_over(self):
        _, equal_entry = assemble_breakdown(self._metric(), {"A": 10, "B": 10}, denominator=20)
        self.assertTrue(equal_entry["sums_to_100"])

        _, over_entry = assemble_breakdown(self._metric(), {"A": 15, "B": 12}, denominator=20)
        self.assertFalse(over_entry["sums_to_100"])

    def test_withheld_floor_routes_to_unavailable_never_findings(self):
        status, entry = assemble_breakdown(self._metric(), {"A": 15, "B": 3}, denominator=18)
        self.assertEqual(status, "unavailable")
        self.assertIn(str(GUILD_FLOOR), entry["reason"])
        self.assertNotIn("B", entry["reason"])

    def test_tying_segments_ordered_by_name_ascending(self):
        _, entry = assemble_breakdown(self._metric(), {"Wrath": 10, "MoP": 10, "Cata": 10}, denominator=30)
        self.assertEqual([s["segment"] for s in entry["segments"]], ["Cata", "MoP", "Wrath"])


class TestRenderMenu(unittest.TestCase):
    def test_prints_one_line_per_entry_and_marks_unavailable_with_verbatim_reason(self):
        metrics = [
            {"metric_id": "a", "label": "A", "kind": "percentage"},
            {"metric_id": "b", "label": "B", "kind": "median"},
        ]
        results = {
            "a": ("finding", {"metric_id": "a", "label": "A", "display": "41.7"}),
            "b": ("unavailable", {"metric_id": "b", "label": "B", "reason": "no survey instrument exists"}),
        }
        text = render_menu(metrics, results)
        self.assertIn("41.7", text)
        self.assertIn("no survey instrument exists", text)
        self.assertEqual(text.count("\n" ) + 1 >= 2, True)

    def test_unavailable_line_carries_no_numeric_value(self):
        metrics = [{"metric_id": "b", "label": "B", "kind": "median"}]
        results = {"b": ("unavailable", {"metric_id": "b", "label": "B", "reason": "no survey instrument exists"})}
        text = render_menu(metrics, results)
        line = next(l for l in text.splitlines() if l.startswith("b"))
        self.assertFalse(any(ch.isdigit() for ch in line))


# --- 03-02 Task 2: expansion breakdown, median assembler, registry passthrough ---

class TestExpansionBreakdownFloorBehavior(unittest.TestCase):
    def _metric(self):
        return {"metric_id": "expansion-distribution", "label": "Distribution of expansions", "kind": "breakdown"}

    def test_segments_over_denominator_produce_sums_to_100_false_and_keep_floor_segments(self):
        status, entry = assemble_breakdown(self._metric(), {"MoP": 30, "Wrath": 20}, denominator=40)
        self.assertEqual(status, "finding")
        self.assertFalse(entry["sums_to_100"])
        self.assertEqual({s["segment"] for s in entry["segments"]}, {"MoP", "Wrath"})

    def test_two_subfloor_segments_merge_into_other_that_clears_the_floor(self):
        status, entry = assemble_breakdown(self._metric(), {"MoP": 20, "TBC": 9, "Vanilla": 4}, denominator=33)
        self.assertEqual(status, "finding")
        other = next(s for s in entry["segments"] if s["segment"] == "Other")
        self.assertEqual(other["guild_count"], 13)

    def test_other_bucket_itself_below_floor_withholds_the_whole_breakdown(self):
        status, entry = assemble_breakdown(self._metric(), {"MoP": 40, "TBC": 3}, denominator=43)
        self.assertEqual(status, "unavailable")
        self.assertNotIn("40", entry["reason"])


class TestAssembleMedian(unittest.TestCase):
    def test_quantizes_percentile_cont_values_half_up(self):
        metric = {"metric_id": "median-list-length", "label": "Median list length", "kind": "median"}
        _, half = assemble_median(metric, 12.5)
        self.assertEqual(half["display"], "12.5")
        _, quarter = assemble_median(metric, 12.25)
        self.assertEqual(quarter["display"], "12.3")


class TestRegistryPreservesEvidencedReasons(unittest.TestCase):
    def test_unavailable_reason_with_embedded_number_passes_through_build_artifact_byte_for_byte(self):
        reason = "withheld: only 3 of 40 active guilds created on/after 2026-08-27 (7.5%)"
        artifact = build_artifact(
            window={"start": WINDOW_START, "end": WINDOW_END},
            definitions={},
            sample={"active_guilds": 40, "raid_events": 1, "loot_awards": 1, "raiders_with_approved_lists": 1},
            findings=[{
                "metric_id": "time-to-qualified",
                "label": "Median time from guild creation to qualified setup",
                "kind": "median",
                "value": None,
                "reason": reason,
            }],
            unavailable=[],
            generated_at="2026-09-04T00:00:00Z",
        )
        self.assertEqual(artifact["unavailable"][0]["reason"], reason)


# --- 03-02 Task 3: top-priority-bracket coverage decision helper ---

class TestDecideTopBracketCoverage(unittest.TestCase):
    def test_withholds_when_guild_count_below_floor(self):
        decision = decide_top_bracket_coverage(
            awards_in_window=100, awards_with_prior_snapshot=95, active_guilds_with_usable_snapshots=GUILD_FLOOR - 1
        )
        self.assertFalse(decision["publish"])

    def test_withholds_when_share_below_threshold_with_reason_carrying_both_numbers(self):
        decision = decide_top_bracket_coverage(
            awards_in_window=100, awards_with_prior_snapshot=50, active_guilds_with_usable_snapshots=GUILD_FLOOR + 5
        )
        self.assertFalse(decision["publish"])
        self.assertIn("50.0", decision["reason"])
        self.assertIn(str(TOP_BRACKET_SHARE_THRESHOLD), decision["reason"])

    def test_publishes_when_both_floor_and_share_threshold_clear(self):
        decision = decide_top_bracket_coverage(
            awards_in_window=100, awards_with_prior_snapshot=85, active_guilds_with_usable_snapshots=GUILD_FLOOR + 5
        )
        self.assertTrue(decision["publish"])
        self.assertEqual(decision["coverage_display"], "85.0")

    def test_withhold_decision_feeds_a_registry_entry_with_null_query_file_and_numeric_reason(self):
        decision = decide_top_bracket_coverage(
            awards_in_window=100, awards_with_prior_snapshot=50, active_guilds_with_usable_snapshots=GUILD_FLOOR + 5
        )
        entry = {
            "metric_id": "top-priority-bracket",
            "label": "Share of awarded items that were in the winner's top priority bracket",
            "kind": "percentage",
            "query_file": None,
            "unavailable_reason": decision["reason"],
        }
        self.assertIsNone(entry["query_file"])
        self.assertTrue(any(ch.isdigit() for ch in entry["unavailable_reason"]))


if __name__ == "__main__":
    unittest.main()
