#!/usr/bin/env python3
"""
Tests for scripts/analytics/ai-answer-grid.py: the D-07 6x3 grid, the 2-of-3
verdict (including incomplete/decided edge cases), duplicate handling, and
the D-08 miss list.

Both ai-answer-grid.py and log-ai-answer.py use a hyphen in their filenames,
matching this repo's existing scripts/analytics/*.py naming convention, so
neither can be imported with a plain `import`. Load both directly from
their file paths with importlib instead.

Run: python3 -m unittest discover -s scripts/analytics -p 'test_*.py' -v
"""
import importlib.util
import os
import subprocess
import sys
import tempfile
import unittest

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_LOG_MODULE_PATH = os.path.join(_THIS_DIR, "log-ai-answer.py")
_GRID_MODULE_PATH = os.path.join(_THIS_DIR, "ai-answer-grid.py")


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


log_ai_answer = _load("log_ai_answer_test_grid", _LOG_MODULE_PATH)
ai_answer_grid = _load("ai_answer_grid", _GRID_MODULE_PATH)

SURFACES = log_ai_answer.SURFACES
PROMPT_IDS = log_ai_answer.PROMPT_IDS
append_row = log_ai_answer.append_row
read_rows = log_ai_answer.read_rows

CORRECT_THRESHOLD = ai_answer_grid.CORRECT_THRESHOLD
load_log_module = ai_answer_grid.load_log_module
rows_for_date = ai_answer_grid.rows_for_date
build_grid = ai_answer_grid.build_grid
cell_correct = ai_answer_grid.cell_correct
count_correct = ai_answer_grid.count_correct
prompt_verdict = ai_answer_grid.prompt_verdict
list_misses = ai_answer_grid.list_misses
render_report = ai_answer_grid.render_report

VERDICT_CORRECT = "returns LootList+ correctly"
VERDICT_INCORRECT = "does not return LootList+ correctly"

COMMITTED_LOG = os.path.join(_THIS_DIR, "ai-answer-log.csv")


def make_row(surface, prompt_id, appeared, correct, error_type="", cited_url="", notes="", date="2026-08-28"):
    return {
        "date": date,
        "ai_surface": surface,
        "prompt_id": prompt_id,
        "lootlist_appeared": appeared,
        "factually_correct": correct,
        "cited_url": cited_url,
        "competing_sources": "",
        "notes": notes,
        "error_type": error_type,
    }


class TestAiAnswerGrid(unittest.TestCase):
    # --- module wiring ---

    def test_correct_threshold_is_2(self):
        self.assertEqual(CORRECT_THRESHOLD, 2)

    def test_load_log_module_exposes_the_one_source_of_truth(self):
        module = load_log_module()
        self.assertEqual(module.SURFACES, SURFACES)
        self.assertEqual(module.PROMPT_IDS, PROMPT_IDS)
        self.assertTrue(callable(module.read_rows))

    # --- cell_correct ---

    def test_cell_correct_true_only_for_appeared_yes_and_correct_yes(self):
        self.assertTrue(cell_correct(make_row("chatgpt", "P1", "yes", "yes")))

    def test_cell_correct_false_for_partial_no_and_na(self):
        self.assertFalse(cell_correct(make_row("chatgpt", "P1", "yes", "partial")))
        self.assertFalse(cell_correct(make_row("chatgpt", "P1", "no", "n/a")))
        self.assertFalse(cell_correct(make_row("chatgpt", "P1", "yes", "no")))

    # --- prompt_verdict: fully recorded ---

    def test_prompt_verdict_three_correct(self):
        self.assertEqual(prompt_verdict(3, 3), VERDICT_CORRECT)

    def test_prompt_verdict_two_correct(self):
        self.assertEqual(prompt_verdict(2, 3), VERDICT_CORRECT)

    def test_prompt_verdict_one_correct(self):
        self.assertEqual(prompt_verdict(1, 3), VERDICT_INCORRECT)

    # --- prompt_verdict: missing cells, decided vs incomplete ---

    def test_prompt_verdict_two_recorded_both_correct_one_missing_is_decided_correct(self):
        self.assertEqual(prompt_verdict(2, 2), VERDICT_CORRECT)

    def test_prompt_verdict_two_recorded_one_correct_one_missing_is_incomplete(self):
        self.assertEqual(prompt_verdict(1, 2), "incomplete (2 of 3 cells recorded)")

    def test_prompt_verdict_one_recorded_not_correct_two_missing_is_incomplete_never_incorrect(self):
        verdict = prompt_verdict(0, 1)
        self.assertEqual(verdict, "incomplete (1 of 3 cells recorded)")
        self.assertNotEqual(verdict, VERDICT_INCORRECT)

    def test_prompt_verdict_two_recorded_neither_correct_one_missing_is_decided_incorrect(self):
        self.assertEqual(prompt_verdict(0, 2), VERDICT_INCORRECT)

    # --- build_grid: last-write-wins + duplicate tracking ---

    def test_build_grid_keeps_last_appended_row_and_flags_duplicate(self):
        rows = [
            make_row("chatgpt", "P1", "yes", "yes", notes="first"),
            make_row("chatgpt", "P1", "yes", "partial", notes="second"),
        ]
        grid, duplicates = build_grid(rows)
        self.assertEqual(grid[("chatgpt", "P1")]["notes"], "second")
        self.assertIn(("chatgpt", "P1"), duplicates)

    def test_build_grid_no_duplicates_for_distinct_cells(self):
        rows = [
            make_row("chatgpt", "P1", "yes", "yes"),
            make_row("claude", "P1", "yes", "yes"),
        ]
        grid, duplicates = build_grid(rows)
        self.assertEqual(duplicates, [])
        self.assertEqual(len(grid), 2)

    # --- list_misses ---

    def test_list_misses_includes_appeared_no_and_correct_no_or_partial(self):
        rows = [
            make_row("chatgpt", "P1", "yes", "yes"),
            make_row("chatgpt", "P2", "no", "n/a", error_type="not_mentioned", notes="missed"),
            make_row("claude", "P2", "yes", "partial", error_type="outdated_feature_claim", cited_url="https://getlootlist.com"),
            make_row("google-ai-overviews", "P3", "yes", "no", notes="wrong"),
        ]
        grid, _ = build_grid(rows)
        misses = list_misses(grid)
        self.assertEqual(len(misses), 3)
        # PROMPT_IDS then SURFACES order: P2 (chatgpt, claude) before P3
        self.assertEqual(
            [(m["prompt_id"], m["surface"]) for m in misses],
            [("P2", "chatgpt"), ("P2", "claude"), ("P3", "google-ai-overviews")],
        )

    def test_list_misses_shows_not_recorded_and_none_for_empty_fields(self):
        rows = [make_row("chatgpt", "P1", "no", "n/a", error_type="", cited_url="")]
        grid, _ = build_grid(rows)
        misses = list_misses(grid)
        self.assertEqual(misses[0]["error_type"], "not recorded")
        self.assertEqual(misses[0]["cited_url"], "none")

    def test_list_misses_excludes_clean_cells(self):
        rows = [make_row("chatgpt", "P1", "yes", "yes")]
        grid, _ = build_grid(rows)
        self.assertEqual(list_misses(grid), [])

    # --- committed baseline proof (D-07) ---

    def test_committed_log_baseline_verdicts(self):
        rows = read_rows(COMMITTED_LOG)
        baseline_rows = rows_for_date(rows, "2026-08-28")
        grid, duplicates = build_grid(baseline_rows)
        self.assertEqual(duplicates, [])
        expected_correct = {
            "P1": True,
            "P2": True,
            "P3": True,
            "P4": True,
            "P5": True,
            "P6": False,
        }
        for prompt_id, should_be_correct in expected_correct.items():
            correct, recorded = count_correct(grid, prompt_id)
            verdict = prompt_verdict(correct, recorded)
            expected = VERDICT_CORRECT if should_be_correct else VERDICT_INCORRECT
            self.assertEqual(verdict, expected, f"{prompt_id}: got {verdict!r}, correct={correct}, recorded={recorded}")

    # --- render_report: no typographic long dash ---

    def test_render_report_contains_no_typographic_long_dash(self):
        report = render_report(COMMITTED_LOG, "2026-08-28")
        self.assertEqual(report.count("—"), 0)

    def test_render_report_baseline_only_shows_expected_verdicts(self):
        report = render_report(COMMITTED_LOG, "2026-08-28")
        self.assertGreaterEqual(report.count(VERDICT_CORRECT), 5)
        self.assertIn(VERDICT_INCORRECT, report)

    def test_render_report_raises_on_unknown_date(self):
        with self.assertRaises(ValueError):
            render_report(COMMITTED_LOG, "1999-01-01")

    # --- CLI round trip through a temp log (main / --log / --baseline / --week4) ---

    def test_cli_round_trip_with_custom_log_and_week4_comparison(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "log.csv")
            for surface in SURFACES:
                append_row(
                    path,
                    {
                        "date": "2026-08-28",
                        "ai_surface": surface,
                        "prompt_id": "P1",
                        "lootlist_appeared": "yes",
                        "factually_correct": "yes",
                        "cited_url": "",
                        "competing_sources": "",
                        "notes": "",
                        "error_type": "",
                    },
                )
                append_row(
                    path,
                    {
                        "date": "2026-09-22",
                        "ai_surface": surface,
                        "prompt_id": "P1",
                        "lootlist_appeared": "yes",
                        "factually_correct": "yes",
                        "cited_url": "",
                        "competing_sources": "",
                        "notes": "",
                        "error_type": "",
                    },
                )

            result = subprocess.run(
                [
                    sys.executable,
                    _GRID_MODULE_PATH,
                    "--baseline",
                    "2026-08-28",
                    "--week4",
                    "2026-09-22",
                    "--log",
                    path,
                ],
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn(VERDICT_CORRECT, result.stdout)
            self.assertIn("unchanged", result.stdout)

    def test_main_exits_1_when_requested_date_has_zero_rows(self):
        result = subprocess.run(
            [sys.executable, _GRID_MODULE_PATH, "--baseline", "1999-01-01", "--log", COMMITTED_LOG],
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 1)


if __name__ == "__main__":
    unittest.main()
