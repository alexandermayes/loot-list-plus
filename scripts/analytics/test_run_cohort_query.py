#!/usr/bin/env python3
"""
Tests for scripts/analytics/run-cohort-query.py: query-header and cohort
literal guards, the read-only and source-row guards, the dated
window-close gate, the Management-API row-shape validator, the CSV
writer/summarizer round-trip, and (Task 2) the D-04 verdict wording
(cohort_verdict, format_pct_change) plus the qualified-proxy metric.

run-cohort-query.py uses a hyphen in its filename, matching this repo's
existing scripts/analytics/*.py naming convention, so it cannot be
imported with a plain `import run_cohort_query` (Python module names
cannot contain hyphens). Load it directly from its file path with
importlib instead.

Run: python3 -m unittest discover -s scripts/analytics -p 'test_*.py' -v
"""
import importlib.util
import os
import tempfile
import unittest
from datetime import datetime, timedelta, timezone

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_MODULE_PATH = os.path.join(_THIS_DIR, "run-cohort-query.py")

_spec = importlib.util.spec_from_file_location("run_cohort_query", _MODULE_PATH)
rcq = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(rcq)

QUERIES_DIR = os.path.join(_THIS_DIR, "queries", "week-4-review")
ACTIVATED_SQL_PATH = os.path.join(QUERIES_DIR, "01-activated-cohort.sql")
QUALIFIED_SQL_PATH = os.path.join(QUERIES_DIR, "02-qualified-cohort-proxy.sql")

ALL_LITERALS_SQL = (
    "-- metric-id: x\n-- label: x\n-- columns: cohort,n\n-- window: x\n--\n"
    "SELECT 1 -- 2026-08-24 2026-08-30 2026-09-18 2026-09-24\n"
)


def _read(path):
    with open(path) as f:
        return f.read()


class LintCohortQueriesTests(unittest.TestCase):
    def test_activated_sql_passes_lint(self):
        results = rcq.lint_cohort_queries(QUERIES_DIR)
        metric_ids = [header["metric-id"] for _path, header in results]
        self.assertIn("activated-7d", metric_ids)

    def test_qualified_sql_passes_lint(self):
        results = rcq.lint_cohort_queries(QUERIES_DIR)
        metric_ids = [header["metric-id"] for _path, header in results]
        self.assertIn("qualified-7d-proxy", metric_ids)

    def test_lint_returns_both_files(self):
        results = rcq.lint_cohort_queries(QUERIES_DIR)
        self.assertEqual(len(results), 2)

    def test_activated_header_columns_start_with_cohort(self):
        results = rcq.lint_cohort_queries(QUERIES_DIR)
        for _path, header in results:
            self.assertEqual(header["columns"][0], "cohort")


class AssertCohortLiteralsTests(unittest.TestCase):
    def test_passes_when_all_literals_present(self):
        rcq.assert_cohort_literals(ALL_LITERALS_SQL, "test.sql")  # no raise

    def test_rejects_and_names_each_missing_literal(self):
        for missing in rcq.COHORT_LITERALS:
            text = ALL_LITERALS_SQL.replace(missing, "")
            with self.assertRaises(ValueError) as ctx:
                rcq.assert_cohort_literals(text, "test.sql")
            self.assertIn(missing, str(ctx.exception))


class AssertReadOnlyTests(unittest.TestCase):
    def test_passes_committed_activated_sql(self):
        rcq.assert_read_only(_read(ACTIVATED_SQL_PATH), ACTIVATED_SQL_PATH)  # no raise

    def test_passes_with_statement_mentioning_updated_at_and_created_at(self):
        text = "WITH x AS (SELECT updated_at, created_at FROM guilds) SELECT * FROM x;"
        rcq.assert_read_only(text, "test.sql")  # no raise

    def test_rejects_update(self):
        with self.assertRaises(ValueError):
            rcq.assert_read_only("UPDATE guilds SET name = 'x'", "test.sql")

    def test_rejects_delete(self):
        with self.assertRaises(ValueError):
            rcq.assert_read_only("DELETE FROM guilds", "test.sql")

    def test_rejects_drop(self):
        with self.assertRaises(ValueError):
            rcq.assert_read_only("DROP TABLE guilds", "test.sql")

    def test_rejects_two_statements_separated_by_semicolon(self):
        with self.assertRaises(ValueError):
            rcq.assert_read_only("SELECT 1; SELECT 2;", "test.sql")

    def test_rejects_statement_starting_with_other_keyword(self):
        with self.assertRaises(ValueError):
            rcq.assert_read_only("EXPLAIN SELECT 1;", "test.sql")

    def test_ignores_forbidden_keyword_only_in_comment(self):
        text = "-- this DROPs nothing, just documents intent\nSELECT 1;"
        rcq.assert_read_only(text, "test.sql")  # no raise


class AssertSourceRowsOnlyTests(unittest.TestCase):
    def test_passes_clean_sql(self):
        rcq.assert_source_rows_only("SELECT 1 FROM guilds;", "test.sql")  # no raise

    def test_rejects_milestone_table_reference(self):
        text = "SELECT * FROM guild_funnel_milestones;"
        with self.assertRaises(ValueError):
            rcq.assert_source_rows_only(text, "test.sql")

    def test_rejects_milestone_table_reference_in_comment(self):
        text = "-- do not read guild_funnel_milestones here\nSELECT 1;"
        with self.assertRaises(ValueError):
            rcq.assert_source_rows_only(text, "test.sql")


class AssertCohortWindowsClosedTests(unittest.TestCase):
    def test_raises_one_second_before_close(self):
        just_before = rcq.COHORT_WINDOWS_CLOSE_UTC - timedelta(seconds=1)
        with self.assertRaises(RuntimeError) as ctx:
            rcq.assert_cohort_windows_closed(just_before)
        self.assertIn("2026-10-02T00:00:00+00:00", str(ctx.exception))
        self.assertIn("cohort windows are not closed", str(ctx.exception))

    def test_passes_at_exact_close(self):
        rcq.assert_cohort_windows_closed(rcq.COHORT_WINDOWS_CLOSE_UTC)  # no raise

    def test_passes_after_close(self):
        after = rcq.COHORT_WINDOWS_CLOSE_UTC + timedelta(days=1)
        rcq.assert_cohort_windows_closed(after)  # no raise

    def test_naive_datetime_raises_value_error(self):
        naive = datetime(2026, 10, 2)
        with self.assertRaises(ValueError):
            rcq.assert_cohort_windows_closed(naive)


class RowsToCohortTableTests(unittest.TestCase):
    COLUMNS = ["cohort", "guilds_created", "activated_7d"]

    def _valid_rows(self):
        return [
            {"cohort": "baseline", "guilds_created": "5", "activated_7d": "3"},
            {"cohort": "week4", "guilds_created": "7", "activated_7d": "5"},
        ]

    def test_accepts_integer_strings(self):
        table = rcq.rows_to_cohort_table(self._valid_rows(), self.COLUMNS)
        self.assertEqual(table[0], {"cohort": "baseline", "guilds_created": 5, "activated_7d": 3})
        self.assertEqual(table[1], {"cohort": "week4", "guilds_created": 7, "activated_7d": 5})

    def test_rejects_third_row(self):
        rows = self._valid_rows() + [{"cohort": "week5", "guilds_created": "1", "activated_7d": "0"}]
        with self.assertRaises(ValueError):
            rcq.rows_to_cohort_table(rows, self.COLUMNS)

    def test_rejects_wrong_cohort_order(self):
        rows = list(reversed(self._valid_rows()))
        with self.assertRaises(ValueError):
            rcq.rows_to_cohort_table(rows, self.COLUMNS)

    def test_rejects_missing_column(self):
        rows = self._valid_rows()
        del rows[0]["activated_7d"]
        with self.assertRaises(ValueError):
            rcq.rows_to_cohort_table(rows, self.COLUMNS)

    def test_rejects_extra_column(self):
        rows = self._valid_rows()
        rows[0]["guild_id"] = "abc"
        with self.assertRaises(ValueError):
            rcq.rows_to_cohort_table(rows, self.COLUMNS)

    def test_rejects_non_integer_value(self):
        rows = self._valid_rows()
        rows[0]["activated_7d"] = "not-a-number"
        with self.assertRaises(ValueError):
            rcq.rows_to_cohort_table(rows, self.COLUMNS)


class WriteAndSummarizeCsvTests(unittest.TestCase):
    def test_round_trip_and_idempotent_rewrite(self):
        columns = ["cohort", "guilds_created", "activated_7d"]
        table = [
            {"cohort": "baseline", "guilds_created": 5, "activated_7d": 3},
            {"cohort": "week4", "guilds_created": 7, "activated_7d": 5},
        ]
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "export.csv")
            rcq.write_cohort_csv(path, columns, table)
            first_bytes = _read(path)

            summary = rcq.summarize_csv(path)
            self.assertIn("baseline: 3 of 5 guilds activated within 7 days (60.0%)", summary)
            self.assertIn("week4: 5 of 7 guilds activated within 7 days (71.4%)", summary)

            rcq.write_cohort_csv(path, columns, table)
            second_bytes = _read(path)
            self.assertEqual(first_bytes, second_bytes)

    def test_summarize_prints_na_for_zero_guilds_created(self):
        columns = ["cohort", "guilds_created", "activated_7d"]
        table = [
            {"cohort": "baseline", "guilds_created": 0, "activated_7d": 0},
            {"cohort": "week4", "guilds_created": 7, "activated_7d": 5},
        ]
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "export.csv")
            rcq.write_cohort_csv(path, columns, table)
            summary = rcq.summarize_csv(path)
            self.assertIn("baseline: 0 of 0 guilds activated within 7 days (n/a)", summary)


class ExportPathForTests(unittest.TestCase):
    def test_export_path_shape(self):
        path = rcq.export_path_for("activated-7d")
        self.assertEqual(
            path,
            os.path.join("scripts/analytics/exports", "db-cohort-activated-7d-2026-08-24_2026-09-24.csv"),
        )


class QualifiedSqlGuardTests(unittest.TestCase):
    """Task 2: the qualified-proxy SQL must pass the same guards as the
    activated SQL (assert_cohort_literals is exercised via lint above)."""

    def test_passes_read_only(self):
        rcq.assert_read_only(_read(QUALIFIED_SQL_PATH), QUALIFIED_SQL_PATH)  # no raise

    def test_passes_source_rows_only(self):
        rcq.assert_source_rows_only(_read(QUALIFIED_SQL_PATH), QUALIFIED_SQL_PATH)  # no raise

    def test_passes_no_forbidden_columns(self):
        rcq.assert_no_forbidden_columns(_read(QUALIFIED_SQL_PATH), QUALIFIED_SQL_PATH)  # no raise

    def test_lower_bound_uses_updated_at_upper_bound_does_not(self):
        text = _read(QUALIFIED_SQL_PATH)
        self.assertIn("updated_at", text)
        self.assertNotIn("is_active", text)


class FormatPctChangeTests(unittest.TestCase):
    def test_none_when_baseline_zero(self):
        self.assertIsNone(rcq.format_pct_change(0, 3))

    def test_positive_whole_percent_gets_leading_plus(self):
        self.assertEqual(rcq.format_pct_change(5, 7), "+40%")

    def test_zero_change_gets_leading_plus(self):
        self.assertEqual(rcq.format_pct_change(5, 5), "+0%")

    def test_one_decimal_round_half_up_trailing_zero_dropped(self):
        self.assertEqual(rcq.format_pct_change(6, 7), "+16.7%")

    def test_negative_change_no_double_sign(self):
        self.assertEqual(rcq.format_pct_change(10, 8), "-20%")


class CohortVerdictTests(unittest.TestCase):
    def test_met_and_swing_sensitive(self):
        v = rcq.cohort_verdict(5, 7)
        self.assertEqual(v["pct_change"], 40)
        self.assertTrue(v["target_met"])
        self.assertTrue(v["swing_sensitive"])
        self.assertEqual(
            v["text"],
            "7 vs 5 guilds (+40%): target met, but a one-guild swing would change the result",
        )

    def test_met_and_robust(self):
        v = rcq.cohort_verdict(10, 20)
        self.assertTrue(v["target_met"])
        self.assertFalse(v["swing_sensitive"])
        self.assertEqual(v["text"], "20 vs 10 guilds (+100%): target met")

    def test_not_met_and_swing_sensitive(self):
        v = rcq.cohort_verdict(4, 5)
        self.assertFalse(v["target_met"])
        self.assertTrue(v["swing_sensitive"])
        self.assertEqual(
            v["text"],
            "5 vs 4 guilds (+25%): target not met, and a one-guild swing would change the result",
        )

    def test_not_met_and_robust(self):
        v = rcq.cohort_verdict(5, 5)
        self.assertFalse(v["target_met"])
        self.assertFalse(v["swing_sensitive"])
        self.assertEqual(v["text"], "5 vs 5 guilds (+0%): target not met")

    def test_exactly_at_target_is_met_and_swing_sensitive(self):
        v = rcq.cohort_verdict(10, 13)
        self.assertTrue(v["target_met"])
        self.assertTrue(v["swing_sensitive"])

    def test_zero_baseline_is_undefined(self):
        v = rcq.cohort_verdict(0, 3)
        self.assertIsNone(v["pct_change"])
        self.assertIsNone(v["target_met"])
        self.assertEqual(
            v["text"],
            "3 vs 0 guilds: no baseline guilds activated, so the percentage "
            "change is undefined and the +30% target cannot be assessed",
        )

    def test_no_typographic_long_dash_in_any_verdict_text(self):
        for baseline, week4 in [(5, 7), (10, 20), (4, 5), (5, 5), (0, 3), (6, 7), (10, 8)]:
            text = rcq.cohort_verdict(baseline, week4)["text"]
            self.assertNotIn("—", text)


class SummarizeCsvQualifiedTests(unittest.TestCase):
    def test_qualified_export_prints_bounds_and_proxy_label_no_verdict(self):
        columns = [
            "cohort",
            "guilds_created",
            "qualified_7d_lower_bound",
            "qualified_7d_upper_bound",
        ]
        table = [
            {
                "cohort": "baseline",
                "guilds_created": 5,
                "qualified_7d_lower_bound": 2,
                "qualified_7d_upper_bound": 4,
            },
            {
                "cohort": "week4",
                "guilds_created": 7,
                "qualified_7d_lower_bound": 3,
                "qualified_7d_upper_bound": 6,
            },
        ]
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "export.csv")
            rcq.write_cohort_csv(path, columns, table)
            summary = rcq.summarize_csv(path)
            self.assertIn("baseline: between 2 and 4 of 5 guilds", summary)
            self.assertIn("week4: between 3 and 6 of 7 guilds", summary)
            self.assertIn("conservative proxy", summary)
            self.assertNotIn("Verdict", summary)
            self.assertNotIn("target met", summary)
            self.assertNotIn("target not met", summary)


if __name__ == "__main__":
    unittest.main()
