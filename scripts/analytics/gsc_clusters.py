#!/usr/bin/env python3
"""
Pure keyword-based query clustering for GSC baseline segmentation. No I/O,
no network — see pull-gsc.py for the caller.

Every exported query row gets exactly one cluster from CLUSTER_NAMES. A query
that matches keywords from more than one cluster resolves by PRECEDENCE:
brand first, because identifying brand demand matters most; expansion last,
because it is the broadest bucket and would otherwise swallow everything
(sprint plan does not define overlap behavior — this precedence is a planner
choice, not a sprint-plan requirement).

stdlib only — no node, no google client libraries.
"""
import re

CLUSTERS = {
    "brand": ["lootlist", "loot list plus", "lootlist+", "getlootlist", "lootlistplus"],
    "competitor": ["thatsmybis", "that's my bis", "tmb", "dkp", "epgp", "loot council", "suicide kings"],
    "problem": ["loot spreadsheet", "loot attendance", "loot drama", "fair loot system", "loot priority list"],
    "expansion": ["classic", "tbc", "wrath", "wotlk", "cata", "mop"],
}

PRECEDENCE = ["brand", "competitor", "problem", "expansion"]
CLUSTER_NAMES = PRECEDENCE + ["unclustered"]


def _normalise(q):
    if q is None:
        return ""
    q = q.lower().replace("’", "'")
    return re.sub(r"\s+", " ", q).strip()


def _keyword_pattern(kw):
    return re.compile(r"(?<![a-z0-9])" + re.escape(kw) + r"(?![a-z0-9])")


_PATTERNS = {
    cluster: [_keyword_pattern(kw) for kw in keywords]
    for cluster, keywords in CLUSTERS.items()
}


def cluster_query(q):
    ql = _normalise(q)
    if not ql:
        return "unclustered"
    for cluster in PRECEDENCE:
        if any(p.search(ql) for p in _PATTERNS[cluster]):
            return cluster
    return "unclustered"
