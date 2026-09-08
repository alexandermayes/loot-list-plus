#!/usr/bin/env python3
"""
Tests for scripts/analytics/probe-recrawl-urls.py's pure parsers: namespaced
sitemap parsing, canonical extraction, robots-meta/header detection, anchor
detection, and lastmod comparison. No network calls.

probe-recrawl-urls.py uses a hyphen in its filename, matching this repo's
existing scripts/analytics/*.py naming convention, so it cannot be imported
with a plain `import probe_recrawl_urls`. Load it directly from its file
path with importlib instead, following test_ai_answer_log.py's pattern.

Run: python3 -m unittest discover -s scripts/analytics -p 'test_*.py' -v
"""
import importlib.util
import os
import unittest

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_MODULE_PATH = os.path.join(_THIS_DIR, "probe-recrawl-urls.py")

_spec = importlib.util.spec_from_file_location("probe_recrawl_urls", _MODULE_PATH)
probe = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(probe)

parse_sitemap = probe.parse_sitemap
SitemapParseError = probe.SitemapParseError
extract_canonical = probe.extract_canonical
has_noindex_meta = probe.has_noindex_meta
has_noindex_header = probe.has_noindex_header
contains_anchor = probe.contains_anchor
dates_equal = probe.dates_equal


# A document shaped exactly like the one Next.js's app/sitemap.ts actually
# emits: a default namespace declared with no prefix anywhere in the
# document. A bare root.findall("url") returns an empty list against this;
# parse_sitemap must still resolve it through the sitemaps.org namespace map.
DEFAULT_NAMESPACE_SITEMAP = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>https://www.getlootlist.com</loc>
<lastmod>2026-09-08T00:21:11.560Z</lastmod>
</url>
<url>
<loc>https://www.getlootlist.com/research/wow-classic-loot-systems-2026</loc>
<lastmod>2026-09-04T00:00:00.000Z</lastmod>
</url>
</urlset>"""

# The same content, but the source document uses an explicit "sm:" prefix
# rather than a bare default namespace. ElementTree's namespace map resolves
# both forms to the same fully-qualified tag names, so parse_sitemap must
# handle this shape identically.
PREFIXED_NAMESPACE_SITEMAP = """<?xml version="1.0" encoding="UTF-8"?>
<sm:urlset xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9">
<sm:url>
<sm:loc>https://www.getlootlist.com/compare</sm:loc>
<sm:lastmod>2026-04-03T00:00:00.000Z</sm:lastmod>
</sm:url>
</sm:urlset>"""

EMPTY_URLSET = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>"""


class ParseSitemapTests(unittest.TestCase):
    def test_default_namespace_document_parses_to_loc_lastmod_map(self):
        result = parse_sitemap(DEFAULT_NAMESPACE_SITEMAP)
        self.assertEqual(
            result,
            {
                "https://www.getlootlist.com": "2026-09-08T00:21:11.560Z",
                "https://www.getlootlist.com/research/wow-classic-loot-systems-2026": "2026-09-04T00:00:00.000Z",
            },
        )

    def test_prefixed_namespace_document_also_parses(self):
        result = parse_sitemap(PREFIXED_NAMESPACE_SITEMAP)
        self.assertEqual(result, {"https://www.getlootlist.com/compare": "2026-04-03T00:00:00.000Z"})

    def test_empty_input_raises(self):
        with self.assertRaises(SitemapParseError):
            parse_sitemap("")

    def test_whitespace_only_input_raises(self):
        with self.assertRaises(SitemapParseError):
            parse_sitemap("   \n  ")

    def test_zero_url_elements_raises_rather_than_returning_empty_dict(self):
        with self.assertRaises(SitemapParseError):
            parse_sitemap(EMPTY_URLSET)

    def test_malformed_xml_raises(self):
        with self.assertRaises(SitemapParseError):
            parse_sitemap("<urlset><url><loc>unclosed")


class ExtractCanonicalTests(unittest.TestCase):
    def test_rel_before_href(self):
        html = '<link rel="canonical" href="https://www.getlootlist.com/pricing">'
        self.assertEqual(extract_canonical(html), "https://www.getlootlist.com/pricing")

    def test_href_before_rel(self):
        html = '<link href="https://www.getlootlist.com/pricing" rel="canonical">'
        self.assertEqual(extract_canonical(html), "https://www.getlootlist.com/pricing")

    def test_case_insensitive_rel_value(self):
        html = '<link href="https://www.getlootlist.com/pricing" REL="Canonical">'
        self.assertEqual(extract_canonical(html), "https://www.getlootlist.com/pricing")

    def test_returns_none_when_no_canonical_link_present(self):
        html = '<link rel="stylesheet" href="/style.css"><link rel="icon" href="/favicon.ico">'
        self.assertIsNone(extract_canonical(html))


class NoindexDetectionTests(unittest.TestCase):
    def test_has_noindex_meta_true(self):
        html = '<meta name="robots" content="noindex, nofollow">'
        self.assertTrue(has_noindex_meta(html))

    def test_has_noindex_meta_false_when_absent(self):
        html = '<meta name="description" content="a page">'
        self.assertFalse(has_noindex_meta(html))

    def test_has_noindex_meta_false_when_content_is_index(self):
        html = '<meta name="robots" content="index, follow">'
        self.assertFalse(has_noindex_meta(html))

    def test_has_noindex_header_true(self):
        self.assertTrue(has_noindex_header({"X-Robots-Tag": "noindex"}))

    def test_has_noindex_header_true_case_insensitive_key(self):
        self.assertTrue(has_noindex_header({"x-robots-tag": "NOINDEX"}))

    def test_has_noindex_header_false_when_absent(self):
        self.assertFalse(has_noindex_header({"Content-Type": "text/html"}))


class ContainsAnchorTests(unittest.TestCase):
    def test_requires_both_text_and_href_present(self):
        html = '<p>See <a href="/compare">how LootList+ compares to TMB</a>.</p>'
        self.assertTrue(contains_anchor(html, "how LootList+ compares to TMB", "/compare"))

    def test_false_when_text_missing(self):
        html = '<p>See <a href="/compare">a different sentence</a>.</p>'
        self.assertFalse(contains_anchor(html, "how LootList+ compares to TMB", "/compare"))

    def test_false_when_href_missing(self):
        html = '<p>See <a href="/pricing">how LootList+ compares to TMB</a>.</p>'
        self.assertFalse(contains_anchor(html, "how LootList+ compares to TMB", "/compare"))

    def test_rejects_curly_vs_straight_apostrophe_near_match(self):
        # The document has a curly right single quotation mark (U+2019);
        # the expected anchor text uses a straight ASCII apostrophe. These
        # are different characters and must not be treated as equal.
        html = '<a href="/compare">how LootList+ compares to TMB’s pricing</a>'
        self.assertFalse(contains_anchor(html, "how LootList+ compares to TMB's pricing", "/compare"))

    def test_matches_through_ampersand_entity(self):
        html = '<a href="/compare?a=1&amp;b=2">terms &amp; conditions</a>'
        self.assertTrue(contains_anchor(html, "terms & conditions", "/compare?a=1&b=2"))

    def test_matches_through_straight_apostrophe_entity(self):
        html = "<a href=\"/pricing\">what&#39;s included</a>"
        self.assertTrue(contains_anchor(html, "what's included", "/pricing"))


class DatesEqualTests(unittest.TestCase):
    def test_passes_on_equal_dates(self):
        self.assertTrue(dates_equal("2026-09-04T00:00:00.000Z", "2026-09-04"))

    def test_passes_on_equal_bare_dates(self):
        self.assertTrue(dates_equal("2026-09-04", "2026-09-04"))

    def test_fails_on_one_day_difference(self):
        self.assertFalse(dates_equal("2026-09-04T00:00:00.000Z", "2026-09-05"))

    def test_fails_when_either_side_is_missing(self):
        self.assertFalse(dates_equal(None, "2026-09-04"))
        self.assertFalse(dates_equal("2026-09-04", None))


if __name__ == "__main__":
    unittest.main()
