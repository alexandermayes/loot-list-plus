#!/usr/bin/env python3
"""
Tests for scripts/analytics/log-ai-answer.py: schema, vocabulary, quoting,
empty-input, adjacency, ordering, and (later) runbook-sync behavior.

log-ai-answer.py uses a hyphen in its filename, matching this repo's
existing scripts/analytics/*.py naming convention, so it cannot be imported
with a plain `import log_ai_answer` (Python module names cannot contain
hyphens). Load it directly from its file path with importlib instead.

Run: python3 -m unittest discover -s scripts/analytics -p 'test_*.py' -v
"""
import csv
import importlib.util
import os
import tempfile
import unittest

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_MODULE_PATH = os.path.join(_THIS_DIR, "log-ai-answer.py")

_spec = importlib.util.spec_from_file_location("log_ai_answer", _MODULE_PATH)
log_ai_answer = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(log_ai_answer)

HEADER = log_ai_answer.HEADER
SURFACES = log_ai_answer.SURFACES
PROMPT_IDS = log_ai_answer.PROMPT_IDS
PROMPTS = log_ai_answer.PROMPTS
validate_row = log_ai_answer.validate_row
append_row = log_ai_answer.append_row
read_rows = log_ai_answer.read_rows

COMMITTED_LOG = os.path.join(_THIS_DIR, "ai-answer-log.csv")


def base_row(**overrides):
    row = {
        "date": "2026-08-28",
        "ai_surface": "chatgpt",
        "prompt_id": "P1",
        "lootlist_appeared": "yes",
        "factually_correct": "yes",
        "cited_url": "https://getlootlist.com",
        "competing_sources": "",
        "notes": "",
    }
    row.update(overrides)
    return row


class TestAiAnswerLog(unittest.TestCase):
    # --- Schema and vocabulary ---

    def test_header_is_exact(self):
        self.assertEqual(
            HEADER,
            [
                "date",
                "ai_surface",
                "prompt_id",
                "lootlist_appeared",
                "factually_correct",
                "cited_url",
                "competing_sources",
                "notes",
            ],
        )

    def test_surfaces_is_exact(self):
        self.assertEqual(SURFACES, ["chatgpt", "google-ai-overviews", "claude"])

    def test_prompt_ids_is_exact(self):
        self.assertEqual(PROMPT_IDS, ["P1", "P2", "P3", "P4", "P5", "P6"])

    def test_prompts_maps_every_id_to_nonempty_text(self):
        self.assertEqual(set(PROMPTS.keys()), set(PROMPT_IDS))
        for pid in PROMPT_IDS:
            self.assertTrue(PROMPTS[pid])

    def test_prompt_p3_preserves_typographic_apostrophe(self):
        self.assertIn("’", PROMPTS["P3"])
        self.assertIn("That’s My BiS", PROMPTS["P3"])

    # --- append_row / read_rows behavior ---

    def test_append_row_creates_missing_file_with_header_and_one_row(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "log.csv")
            problems = append_row(path, base_row())
            self.assertEqual(problems, [])
            with open(path, newline="") as f:
                lines = f.read().splitlines()
            self.assertEqual(lines[0], ",".join(HEADER))
            self.assertEqual(len(lines), 2)

    def test_append_row_on_header_only_file_yields_exactly_one_data_row(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "log.csv")
            with open(path, "w", newline="") as f:
                csv.writer(f).writerow(HEADER)
            append_row(path, base_row())
            rows = read_rows(path)
            self.assertEqual(len(rows), 1)

    def test_read_rows_on_header_only_file_returns_empty_list_and_raises_nothing(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "log.csv")
            with open(path, "w", newline="") as f:
                csv.writer(f).writerow(HEADER)
            rows = read_rows(path)
            self.assertEqual(rows, [])

    def test_competing_sources_with_comma_and_quote_round_trips_byte_identical(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "log.csv")
            tricky = 'https://thatsmybis.com/a,b "quoted" ;https://wowhead.com/x'
            append_row(path, base_row(competing_sources=tricky))
            rows = read_rows(path)
            self.assertEqual(rows[0]["competing_sources"], tricky)

    def test_duplicate_date_surface_prompt_triple_retains_both_rows(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "log.csv")
            append_row(path, base_row(notes="first"))
            append_row(path, base_row(notes="second"))
            rows = read_rows(path)
            self.assertEqual(len(rows), 2)
            self.assertEqual(rows[0]["notes"], "first")
            self.assertEqual(rows[1]["notes"], "second")

    def test_read_rows_returns_append_order_not_sorted(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "log.csv")
            for pid in ["P3", "P1", "P2"]:
                append_row(path, base_row(prompt_id=pid, notes=pid))
            rows = read_rows(path)
            self.assertEqual([r["notes"] for r in rows], ["P3", "P1", "P2"])

    # --- validate_row rules ---

    def test_validate_row_rejects_unknown_surface(self):
        self.assertTrue(validate_row(base_row(ai_surface="perplexity")))

    def test_validate_row_rejects_unknown_prompt_id(self):
        self.assertTrue(validate_row(base_row(prompt_id="P7")))

    def test_validate_row_rejects_unknown_appeared_value(self):
        self.assertTrue(validate_row(base_row(lootlist_appeared="maybe")))

    def test_validate_row_rejects_unknown_correct_value(self):
        self.assertTrue(validate_row(base_row(factually_correct="mostly")))

    def test_validate_row_rejects_non_iso_date(self):
        self.assertTrue(validate_row(base_row(date="not-a-date")))

    def test_validate_row_rejects_empty_value_in_any_required_field(self):
        for field in ["date", "ai_surface", "prompt_id", "lootlist_appeared", "factually_correct"]:
            problems = validate_row(base_row(**{field: ""}))
            self.assertTrue(problems, f"expected a problem when {field} is empty")

    def test_validate_row_accepts_empty_cited_url_competing_sources_and_notes(self):
        problems = validate_row(base_row(cited_url="", competing_sources="", notes=""))
        self.assertEqual(problems, [])

    def test_validate_row_requires_na_and_empty_cited_url_when_not_appeared(self):
        self.assertEqual(
            validate_row(base_row(lootlist_appeared="no", factually_correct="n/a", cited_url="")),
            [],
        )
        self.assertTrue(
            validate_row(base_row(lootlist_appeared="no", factually_correct="yes", cited_url=""))
        )
        self.assertTrue(
            validate_row(
                base_row(
                    lootlist_appeared="no",
                    factually_correct="n/a",
                    cited_url="https://getlootlist.com",
                )
            )
        )

    # --- committed log state ---

    def test_committed_log_has_header_and_zero_data_rows(self):
        rows = read_rows(COMMITTED_LOG)
        self.assertEqual(rows, [])
        with open(COMMITTED_LOG, newline="") as f:
            first_line = f.readline().strip("\n")
        self.assertEqual(first_line, ",".join(HEADER))


if __name__ == "__main__":
    unittest.main()
