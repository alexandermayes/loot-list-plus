#!/usr/bin/env python3
"""
Unit tests for gsc_clusters.py: precedence, keyword coverage, normalisation,
and degenerate input.

Run with:
    python3 -m unittest discover -s scripts/analytics -p 'test_gsc_clusters.py' -v

(`python3 -m unittest scripts/analytics/test_gsc_clusters.py` does not work
here because this file imports the sibling module `gsc_clusters` by bare
name; the discovery form puts scripts/analytics on sys.path first.)
"""
import unittest

from gsc_clusters import CLUSTERS, CLUSTER_NAMES, PRECEDENCE, cluster_query


class TestClusterQuery(unittest.TestCase):
    def test_brand_keyword_matches_brand(self):
        self.assertEqual(cluster_query("lootlist reviews"), "brand")

    def test_competitor_keyword_matches_competitor(self):
        self.assertEqual(cluster_query("thatsmybis addon reviews"), "competitor")

    def test_problem_keyword_matches_problem(self):
        self.assertEqual(cluster_query("our loot spreadsheet is a mess"), "problem")

    def test_expansion_keyword_matches_expansion(self):
        self.assertEqual(cluster_query("classic raid guide"), "expansion")

    def test_every_keyword_in_every_cluster_matches(self):
        # Iterate CLUSTERS directly so a future keyword addition is covered
        # without editing this test.
        for cluster, keywords in CLUSTERS.items():
            for kw in keywords:
                query = f"how to use {kw} today"
                result = cluster_query(query)
                self.assertEqual(
                    result,
                    cluster,
                    f"keyword {kw!r} from cluster {cluster!r} resolved to {result!r}",
                )

    def test_overlap_prefers_brand_over_expansion(self):
        self.assertEqual(cluster_query("classic lootlist guide"), "brand")

    def test_overlap_prefers_problem_over_expansion(self):
        self.assertEqual(cluster_query("classic loot spreadsheet"), "problem")

    def test_overlap_prefers_competitor_over_problem(self):
        self.assertEqual(cluster_query("thatsmybis loot spreadsheet"), "competitor")

    def test_matching_is_case_insensitive(self):
        self.assertEqual(cluster_query("LootList Reviews"), cluster_query("lootlist reviews"))
        self.assertEqual(cluster_query("LOOT SPREADSHEET"), "problem")

    def test_typographic_apostrophe_matches_straight_apostrophe_keyword(self):
        # U+2019 right single quotation mark, not the straight ASCII apostrophe
        # used in the CLUSTERS keyword list.
        self.assertEqual(cluster_query("that’s my bis addon"), "competitor")

    def test_short_keywords_do_not_match_inside_longer_words(self):
        self.assertEqual(cluster_query("mopping the floor"), "unclustered")
        self.assertEqual(cluster_query("catalog of items"), "unclustered")
        self.assertEqual(cluster_query("dkpx is not a real word"), "unclustered")

    def test_unrelated_query_is_unclustered(self):
        self.assertEqual(cluster_query("random unrelated query"), "unclustered")

    def test_empty_string_is_unclustered(self):
        self.assertEqual(cluster_query(""), "unclustered")

    def test_whitespace_only_is_unclustered(self):
        self.assertEqual(cluster_query("   \t  "), "unclustered")

    def test_none_is_unclustered(self):
        self.assertEqual(cluster_query(None), "unclustered")

    def test_result_is_always_a_member_of_cluster_names(self):
        cases = [
            "lootlist reviews",
            "thatsmybis",
            "loot spreadsheet",
            "classic",
            "mopping the floor",
            "",
            "   ",
            None,
        ]
        for case in cases:
            self.assertIn(cluster_query(case), CLUSTER_NAMES)

    def test_precedence_constant_matches_expected_order(self):
        self.assertEqual(PRECEDENCE, ["brand", "competitor", "problem", "expansion"])


if __name__ == "__main__":
    unittest.main()
