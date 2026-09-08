#!/usr/bin/env python3
"""
Tests for scripts/analytics/log-recrawl.py: row validation, header
creation, append-only behaviour, the already-requested refusal, and the
empty and malformed input cases.

log-recrawl.py uses a hyphen in its filename, matching this repo's
existing scripts/analytics/*.py naming convention, so it cannot be
imported with a plain `import log_recrawl` (Python module names cannot
contain hyphens). Load it directly from its file path with importlib
instead, exactly as test_ai_answer_log.py does for log-ai-answer.py.

Run: python3 -m unittest discover -s scripts/analytics -p 'test_*.py' -v
"""
import importlib.util
import os
import tempfile
import unittest

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_MODULE_PATH = os.path.join(_THIS_DIR, "log-recrawl.py")

_spec = importlib.util.spec_from_file_location("log_recrawl", _MODULE_PATH)
log_recrawl = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(log_recrawl)

HEADER = log_recrawl.HEADER
validate_row = log_recrawl.validate_row
append_row = log_recrawl.append_row
read_rows = log_recrawl.read_rows
already_requested = log_recrawl.already_requested


def base_row(**overrides):
    row = {
        "url": "https://example.com/a",
        "deploy_sha": "abc12345",
        "deploy_build_id": "dpl_x",
        "probe_result": "pass",
        "inspection_result": "pass",
        "request_date": "",
        "requester": "",
    }
    row.update(overrides)
    return row


class ValidateRowTests(unittest.TestCase):
    def test_valid_prepared_row_has_no_problems(self):
        self.assertEqual(validate_row(base_row()), [])

    def test_valid_requested_row_has_no_problems(self):
        row = base_row(request_date="2026-09-08", requester="tester")
        self.assertEqual(validate_row(row), [])

    def test_missing_url_rejected_by_name(self):
        problems = validate_row(base_row(url=""))
        self.assertTrue(any("url" in p for p in problems))

    def test_missing_deploy_sha_rejected_by_name(self):
        problems = validate_row(base_row(deploy_sha=""))
        self.assertTrue(any("deploy_sha" in p for p in problems))

    def test_missing_probe_result_rejected_by_name(self):
        problems = validate_row(base_row(probe_result=""))
        self.assertTrue(any("probe_result" in p for p in problems))

    def test_non_http_url_rejected(self):
        problems = validate_row(base_row(url="not-a-url"))
        self.assertTrue(problems)

    def test_ftp_scheme_url_rejected(self):
        problems = validate_row(base_row(url="ftp://example.com/a"))
        self.assertTrue(problems)

    def test_malformed_request_date_rejected(self):
        problems = validate_row(base_row(request_date="09/08/2026", requester="tester"))
        self.assertTrue(problems)

    def test_request_date_without_requester_rejected(self):
        problems = validate_row(base_row(request_date="2026-09-08", requester=""))
        self.assertTrue(problems)

    def test_requester_without_request_date_rejected(self):
        problems = validate_row(base_row(request_date="", requester="tester"))
        self.assertTrue(problems)


class AppendRowTests(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.log_path = os.path.join(self.tmpdir, "RECRAWL-LOG.md")

    def test_valid_row_appends_and_creates_header_when_absent(self):
        self.assertFalse(os.path.exists(self.log_path))
        problems = append_row(self.log_path, base_row())
        self.assertEqual(problems, [])
        self.assertTrue(os.path.exists(self.log_path))
        with open(self.log_path) as f:
            content = f.read()
        for column in HEADER:
            self.assertIn(column, content)
        rows = read_rows(self.log_path)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["url"], "https://example.com/a")

    def test_second_append_leaves_first_row_byte_identical(self):
        append_row(self.log_path, base_row(url="https://example.com/a"))
        with open(self.log_path) as f:
            before = f.read()
        append_row(self.log_path, base_row(url="https://example.com/b"))
        with open(self.log_path) as f:
            after = f.read()
        self.assertTrue(after.startswith(before))
        self.assertIn("https://example.com/b", after[len(before):])

    def test_row_missing_url_writes_nothing(self):
        problems = append_row(self.log_path, base_row(url=""))
        self.assertTrue(problems)
        self.assertFalse(os.path.exists(self.log_path))

    def test_row_missing_deploy_sha_writes_nothing(self):
        problems = append_row(self.log_path, base_row(deploy_sha=""))
        self.assertTrue(problems)
        self.assertFalse(os.path.exists(self.log_path))

    def test_row_missing_probe_result_writes_nothing(self):
        problems = append_row(self.log_path, base_row(probe_result=""))
        self.assertTrue(problems)
        self.assertFalse(os.path.exists(self.log_path))

    def test_requested_event_for_url_already_requested_is_refused(self):
        append_row(
            self.log_path,
            base_row(url="https://example.com/a", request_date="2026-09-08", requester="tester"),
        )
        problems = append_row(
            self.log_path,
            base_row(url="https://example.com/a", request_date="2026-09-09", requester="tester"),
        )
        self.assertTrue(problems)
        self.assertTrue(any("https://example.com/a" in p for p in problems))
        rows = read_rows(self.log_path)
        self.assertEqual(len(rows), 1)

    def test_requested_event_accepted_when_prior_row_has_empty_request_date(self):
        append_row(self.log_path, base_row(url="https://example.com/a"))
        problems = append_row(
            self.log_path,
            base_row(url="https://example.com/a", request_date="2026-09-08", requester="tester"),
        )
        self.assertEqual(problems, [])
        rows = read_rows(self.log_path)
        self.assertEqual(len(rows), 2)

    def test_pipe_character_round_trips_as_one_field(self):
        append_row(self.log_path, base_row(inspection_result="fail | robots blocked"))
        rows = read_rows(self.log_path)
        self.assertEqual(rows[0]["inspection_result"], "fail | robots blocked")


class ReadRowsTests(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.log_path = os.path.join(self.tmpdir, "RECRAWL-LOG.md")

    def test_already_requested_false_for_url_absent_from_log(self):
        append_row(self.log_path, base_row(url="https://example.com/a"))
        rows = read_rows(self.log_path)
        self.assertFalse(already_requested("https://example.com/never-seen", rows))

    def test_read_rows_returns_file_order_not_sorted(self):
        append_row(self.log_path, base_row(url="https://example.com/z"))
        append_row(self.log_path, base_row(url="https://example.com/a"))
        rows = read_rows(self.log_path)
        self.assertEqual(
            [r["url"] for r in rows],
            ["https://example.com/z", "https://example.com/a"],
        )

    def test_read_rows_on_missing_file_returns_empty(self):
        self.assertEqual(read_rows(self.log_path), [])


if __name__ == "__main__":
    unittest.main()
