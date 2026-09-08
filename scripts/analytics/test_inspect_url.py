#!/usr/bin/env python3
"""
Tests for scripts/analytics/inspect-url.py's pure, non-network functions:
load_url_list (accepting both a plain line-list and the JSON target-array
shape) and summarize (reducing a raw API response to the five named
readiness fields, including the never-crawled outcome). No network calls,
no OAuth.

inspect-url.py uses a hyphen in its filename, matching this repo's
existing scripts/analytics/*.py naming convention, so it cannot be
imported with a plain `import inspect_url`. Load it directly from its
file path with importlib instead, following test_probe_recrawl_urls.py's
pattern.

Run: python3 -m unittest discover -s scripts/analytics -p 'test_*.py' -v
"""
import importlib.util
import json
import os
import tempfile
import unittest

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_MODULE_PATH = os.path.join(_THIS_DIR, "inspect-url.py")

_spec = importlib.util.spec_from_file_location("inspect_url", _MODULE_PATH)
inspect_url = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(inspect_url)

load_url_list = inspect_url.load_url_list
summarize = inspect_url.summarize


class LoadUrlListTests(unittest.TestCase):
    def _write(self, content):
        f = tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8")
        f.write(content)
        f.close()
        self.addCleanup(os.unlink, f.name)
        return f.name

    def test_plain_line_list_ignores_blanks_and_comments(self):
        path = self._write("https://www.getlootlist.com/compare\n\n# a comment\nhttps://www.getlootlist.com/pricing\n")
        self.assertEqual(
            load_url_list(path),
            ["https://www.getlootlist.com/compare", "https://www.getlootlist.com/pricing"],
        )

    def test_json_array_of_target_objects_extracts_url_in_order(self):
        targets = [
            {"url": "https://www.getlootlist.com/compare", "anchor": "a", "href": "/x"},
            {"url": "https://www.getlootlist.com/pricing", "anchor": "b", "href": "/y"},
        ]
        path = self._write(json.dumps(targets))
        self.assertEqual(
            load_url_list(path),
            ["https://www.getlootlist.com/compare", "https://www.getlootlist.com/pricing"],
        )


class SummarizeTests(unittest.TestCase):
    def test_ready_when_every_field_matches_the_ready_state(self):
        response = {
            "inspectionResult": {
                "indexStatusResult": {
                    "verdict": "PASS",
                    "googleCanonical": "https://www.getlootlist.com/compare",
                    "userCanonical": "https://www.getlootlist.com/compare",
                    "indexingState": "INDEXING_ALLOWED",
                    "pageFetchState": "SUCCESSFUL",
                    "robotsTxtState": "ALLOWED",
                }
            }
        }
        result = summarize(response)
        self.assertTrue(result["ready"])
        self.assertFalse(result["neverCrawled"])

    def test_never_crawled_is_reported_plainly_not_as_a_failure(self):
        response = {"inspectionResult": {}}
        result = summarize(response)
        self.assertTrue(result["neverCrawled"])
        self.assertFalse(result["ready"])
        self.assertIsNone(result["verdict"])

    def test_not_ready_when_canonicals_disagree(self):
        response = {
            "inspectionResult": {
                "indexStatusResult": {
                    "verdict": "PASS",
                    "googleCanonical": "https://www.getlootlist.com/other",
                    "userCanonical": "https://www.getlootlist.com/compare",
                    "indexingState": "INDEXING_ALLOWED",
                    "pageFetchState": "SUCCESSFUL",
                    "robotsTxtState": "ALLOWED",
                }
            }
        }
        self.assertFalse(summarize(response)["ready"])

    def test_not_ready_when_indexing_state_blocks(self):
        response = {
            "inspectionResult": {
                "indexStatusResult": {
                    "verdict": "PASS",
                    "googleCanonical": "https://www.getlootlist.com/compare",
                    "userCanonical": "https://www.getlootlist.com/compare",
                    "indexingState": "BLOCKED_BY_META_TAG",
                    "pageFetchState": "SUCCESSFUL",
                    "robotsTxtState": "ALLOWED",
                }
            }
        }
        self.assertFalse(summarize(response)["ready"])


if __name__ == "__main__":
    unittest.main()
