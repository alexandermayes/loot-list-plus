#!/usr/bin/env python3
"""
Tests for scripts/analytics/pull-posthog.py: the import-safe module guard,
credential-presence reporting, the HogQL lint (header, sprint-window
literals, forbidden identity tokens), the returned-columns guard, the CSV
writer, the dashboard-tile event walk, and the legacy report-query
builder.

pull-posthog.py uses a hyphen in its filename, matching this repo's
existing scripts/analytics/*.py naming convention, so it cannot be
imported with a plain `import pull_posthog` (Python module names cannot
contain hyphens). Load it directly from its file path with importlib
instead.

Run: python3 -m unittest discover -s scripts/analytics -p 'test_pull_posthog.py' -v
"""
import csv
import glob
import importlib.util
import os
import tempfile
import unittest

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_MODULE_PATH = os.path.join(_THIS_DIR, "pull-posthog.py")

_spec = importlib.util.spec_from_file_location("pull_posthog", _MODULE_PATH)
pull_posthog = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(pull_posthog)

SPRINT_START = pull_posthog.SPRINT_START
SPRINT_END = pull_posthog.SPRINT_END
FORBIDDEN_HOGQL_TOKENS = pull_posthog.FORBIDDEN_HOGQL_TOKENS
DEFAULT_QUERY_DIR = pull_posthog.DEFAULT_QUERY_DIR
check_env_status = pull_posthog.check_env_status
lint_hogql = pull_posthog.lint_hogql
assert_columns_match = pull_posthog.assert_columns_match
export_path_for = pull_posthog.export_path_for
write_result_csv = pull_posthog.write_result_csv
events_referenced = pull_posthog.events_referenced
build_report_queries = pull_posthog.build_report_queries


def sample_header_text(extra_body=""):
    """A minimal, well-formed HogQL file text: full header block (all
    four REQUIRED_HEADER_KEYS), both sprint literals, no forbidden
    tokens. `extra_body` is appended after the SELECT line so tests can
    inject a forbidden token or corrupt a literal without touching the
    header block itself."""
    return (
        "-- metric-id: sample-metric\n"
        "-- label: Sample label\n"
        "-- columns: period,step\n"
        f"-- window: {SPRINT_START}..{SPRINT_END}\n"
        "--\n"
        "-- prose describing the query, no identity tokens here.\n"
        f"SELECT 1 -- {SPRINT_START} {SPRINT_END}\n"
        f"{extra_body}"
    )


class ImportSafetyTests(unittest.TestCase):
    def test_module_reloads_without_side_effects(self):
        # Loading the module a second time (mirroring a bare
        # importlib.util.spec_from_file_location with an unrelated
        # sys.argv, as the plan's acceptance criteria run it) must not
        # raise and must not have parsed any CLI arguments at import time.
        spec = importlib.util.spec_from_file_location("pull_posthog_reload", _MODULE_PATH)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        self.assertTrue(hasattr(module, "main"))
        self.assertTrue(hasattr(module, "parse_args"))


class CheckEnvStatusTests(unittest.TestCase):
    def test_reports_presence_only(self):
        status = check_env_status({
            "POSTHOG_PERSONAL_API_KEY": "phx_secret",
            "POSTHOG_PROJECT_ID": "",
        })
        self.assertEqual(status, {
            "POSTHOG_PERSONAL_API_KEY": "present",
            "POSTHOG_PROJECT_ID": "missing",
            "POSTHOG_HOST": "default",
        })

    def test_never_leaks_a_credential_value(self):
        status = check_env_status({
            "POSTHOG_PERSONAL_API_KEY": "phx_canary_value",
            "POSTHOG_PROJECT_ID": "1",
        })
        self.assertNotIn("phx_canary_value", repr(status))


class LintHogqlTests(unittest.TestCase):
    def test_passes_with_full_header_and_both_literals(self):
        header = lint_hogql(sample_header_text(), "sample.hogql")
        self.assertEqual(header["metric-id"], "sample-metric")
        self.assertEqual(header["columns"], ["period", "step"])

    def test_raises_for_missing_header_key(self):
        text = (
            "-- metric-id: sample-metric\n"
            "-- label: Sample label\n"
            f"-- window: {SPRINT_START}..{SPRINT_END}\n"
            "--\n"
            f"SELECT 1 -- {SPRINT_START} {SPRINT_END}\n"
        )
        with self.assertRaises(ValueError) as ctx:
            lint_hogql(text, "missing-key.hogql")
        self.assertIn("missing-key.hogql", str(ctx.exception))

    def test_raises_for_missing_sprint_start_literal(self):
        text = sample_header_text().replace(SPRINT_START, "2020-01-01")
        with self.assertRaises(ValueError) as ctx:
            lint_hogql(text, "missing-start.hogql")
        self.assertIn("missing-start.hogql", str(ctx.exception))

    def test_raises_for_missing_sprint_end_literal(self):
        text = sample_header_text().replace(SPRINT_END, "2020-12-31")
        with self.assertRaises(ValueError) as ctx:
            lint_hogql(text, "missing-end.hogql")
        self.assertIn("missing-end.hogql", str(ctx.exception))

    def test_raises_for_each_forbidden_token(self):
        for token in FORBIDDEN_HOGQL_TOKENS:
            text = sample_header_text(extra_body=f"-- oops {token}\n")
            with self.assertRaises(ValueError) as ctx:
                lint_hogql(text, "forbidden.hogql")
            message = str(ctx.exception)
            self.assertIn("forbidden.hogql", message)
            self.assertIn(token, message)


class AssertColumnsMatchTests(unittest.TestCase):
    def test_passes_for_identical_columns(self):
        assert_columns_match(["period", "step"], ["period", "step"], "ok.hogql")

    def test_raises_for_reordered_columns(self):
        with self.assertRaises(ValueError) as ctx:
            assert_columns_match(["period", "step"], ["step", "period"], "bad.hogql")
        self.assertIn("bad.hogql", str(ctx.exception))

    def test_raises_for_missing_column(self):
        with self.assertRaises(ValueError):
            assert_columns_match(["period", "step"], ["period"], "bad.hogql")

    def test_raises_for_extra_column(self):
        with self.assertRaises(ValueError):
            assert_columns_match(["period", "step"], ["period", "step", "extra"], "bad.hogql")


class ExportPathForTests(unittest.TestCase):
    def test_builds_the_expected_export_path(self):
        self.assertEqual(
            export_path_for("cta-funnel"),
            "scripts/analytics/exports/posthog-cta-funnel-2026-08-24_2026-09-24.csv",
        )


class WriteResultCsvTests(unittest.TestCase):
    def test_writes_header_then_rows_in_order_and_is_deterministic(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "out.csv")
            columns = ["period", "step", "events"]
            results = [["sprint_window", "a", 1], ["sprint_window", "b", 2]]

            write_result_csv(path, columns, results)
            with open(path, newline="") as f:
                first = f.read()

            write_result_csv(path, columns, results)
            with open(path, newline="") as f:
                second = f.read()

            self.assertEqual(first, second)

            with open(path, newline="") as f:
                rows = list(csv.reader(f))
            self.assertEqual(rows[0], columns)
            self.assertEqual(rows[1], ["sprint_window", "a", "1"])
            self.assertEqual(rows[2], ["sprint_window", "b", "2"])


class EventsReferencedTests(unittest.TestCase):
    def test_walks_nested_dicts_and_lists(self):
        tile = {
            "insight": {
                "query": {
                    "source": {
                        "kind": "EventsNode",
                        "event": "landing_cta_clicked",
                    }
                },
                "filters": {
                    "events": [
                        {"id": "1", "event": "guild_activated"},
                        {"id": "2", "event": None},
                        {"id": "3", "event": 42},
                    ]
                },
            }
        }
        self.assertEqual(
            events_referenced(tile),
            ["guild_activated", "landing_cta_clicked"],
        )

    def test_ignores_none_and_non_string_values(self):
        self.assertEqual(events_referenced({"event": None}), [])
        self.assertEqual(events_referenced({"event": 1}), [])

    def test_returns_empty_list_for_no_matches(self):
        self.assertEqual(events_referenced({"a": [1, 2, {"b": "c"}]}), [])


class BuildReportQueriesTests(unittest.TestCase):
    def test_same_three_titles_with_interval_substituted(self):
        queries = build_report_queries(30)
        self.assertEqual(
            set(queries.keys()),
            {"Top pages (pageviews)", "Top referrers", "Top entry (landing) pages"},
        )
        for query in queries.values():
            self.assertIn("INTERVAL 30 DAY", query)


class CommittedHogqlFilesLintCleanTests(unittest.TestCase):
    def test_every_committed_hogql_file_lints_clean(self):
        paths = sorted(glob.glob(os.path.join(DEFAULT_QUERY_DIR, "*.hogql")))
        if not paths:
            self.skipTest("no .hogql files committed yet")
        for path in paths:
            with open(path) as f:
                text = f.read()
            lint_hogql(text, path)  # raises on failure


if __name__ == "__main__":
    unittest.main()
