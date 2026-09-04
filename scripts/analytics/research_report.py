#!/usr/bin/env python3
"""
Pure, no-network helpers for the wow-classic-loot-systems-2026 research
report pipeline: query-header parsing, the window and forbidden-column
guards, the centralized 10-guild floor merge, the ROUND_HALF_UP display
quantizer, and the artifact/CSV writers.

See run-research-report.py for the CLI that calls these against production.

stdlib only -- no node, no google client libraries, no pip packages.
"""
import csv
import decimal
import json
import os

WINDOW_START = "2026-06-01"
WINDOW_END = "2026-08-31"
GUILD_FLOOR = 10
REPORT_SLUG = "wow-classic-loot-systems-2026"
OUTPUT_DIR = "public/research"

CSV_HEADER = [
    "metric_id",
    "label",
    "kind",
    "segment",
    "value",
    "display",
    "denominator",
    "share_basis",
    "query_file",
]

# D-04 / T-03-02: every entry here is a lowercase substring that, if found
# anywhere in a committed query's text, means the query is reaching for a
# name or other identity column this report must never publish. Checked as
# a raw substring match (not a column-name parse) so a token embedded in a
# comment, alias, or debug SELECT is caught just as reliably as one in the
# final SELECT list.
FORBIDDEN_SQL_TOKENS = (
    "character_name",
    "characters.name",
    "guilds.name",
    "guild_name",
    "player_name",
    ".realm",
    "battle_net_id",
    "user_id",
    "discord_server_id",
    "created_by",
    "awarded_by",
    "notes",
)

# Sentinel returned by apply_floor when the merged "Other" bucket is itself
# below the floor: the caller must route the whole breakdown to
# `unavailable` rather than publish a small cohort under a different label.
WITHHELD = object()

REQUIRED_HEADER_KEYS = ("metric-id", "label", "columns", "window")


def parse_query_header(sql_text):
    """Parses the leading `-- key: value` comment block of a committed
    query file. Returns a dict with the four required keys, `columns`
    split into a list. Raises ValueError naming the missing key(s) if any
    of `metric-id`, `label`, `columns`, `window` is absent."""
    header = {}
    for line in sql_text.splitlines():
        stripped = line.strip()
        if not stripped.startswith("--"):
            if header:
                break
            continue
        content = stripped.lstrip("-").strip()
        if ":" not in content:
            continue
        key, _, value = content.partition(":")
        header[key.strip()] = value.strip()

    missing = [k for k in REQUIRED_HEADER_KEYS if k not in header]
    if missing:
        raise ValueError(
            f"query header missing required key(s): {', '.join(missing)}"
        )

    header["columns"] = [c.strip() for c in header["columns"].split(",") if c.strip()]
    return header


def assert_window_literals(sql_text, path):
    """D-12 reproducibility guard: raises ValueError unless both
    WINDOW_START and WINDOW_END appear literally in the SQL body. This is
    the reason no date is ever interpolated into SQL at run time."""
    missing = [w for w in (WINDOW_START, WINDOW_END) if w not in sql_text]
    if missing:
        raise ValueError(
            f"{path}: missing required window literal(s) {missing}; every "
            f"query must contain both {WINDOW_START} and {WINDOW_END} "
            "literally so the published window cannot silently drift"
        )


def assert_no_forbidden_columns(sql_text, path):
    """T-03-01 guard: raises ValueError naming the offending token if any
    entry of FORBIDDEN_SQL_TOKENS appears in the (lowercased) SQL text.
    `expansions.name` and `raid_tiers.name` must pass -- D-14 groups
    expansions by name text, and neither string matches any forbidden
    token."""
    lowered = sql_text.lower()
    for token in FORBIDDEN_SQL_TOKENS:
        if token in lowered:
            raise ValueError(
                f"{path}: forbidden identity column/token '{token}' found "
                "in query text -- every committed query selects aggregates "
                "and join/group keys only"
            )


def apply_floor(segment_counts, floor=GUILD_FLOOR):
    """D-04: the single centralized k-anonymity function. Segments at or
    above `floor` are kept verbatim. Segments below it accumulate into one
    `Other` entry. If that accumulated `Other` is nonzero but itself below
    `floor`, returns the module's WITHHELD sentinel instead of a dict, so
    the caller routes the whole breakdown to `unavailable` rather than
    publishing a small cohort under a different label. An empty input
    returns an empty dict with no `Other` key."""
    if not segment_counts:
        return {}

    kept = {}
    other = 0
    for name, count in segment_counts.items():
        if count >= floor:
            kept[name] = count
        else:
            other += count

    if other:
        if other < floor:
            return WITHHELD
        kept["Other"] = other

    return kept


def quantize_display(value, kind):
    """The precision contract. For `kind` in `percentage`/`median`,
    quantizes with decimal.Decimal + ROUND_HALF_UP (never the builtin
    `round`, which is banker's rounding) and returns the display string
    with no unit suffix. For `kind == "count"`, returns the integer as a
    string with no decimal point."""
    if kind in ("percentage", "median"):
        d = decimal.Decimal(str(value)).quantize(
            decimal.Decimal("0.1"), rounding=decimal.ROUND_HALF_UP
        )
        return str(d)
    if kind == "count":
        return str(int(value))
    raise ValueError(f"unknown kind for quantize_display: {kind!r}")


def build_artifact(window, definitions, sample, findings, unavailable, generated_at):
    """Returns the D-05 artifact dict: report_slug, window, generated_at,
    guild_floor, definitions, sample, findings, unavailable.

    `findings` is a list of candidate finding dicts (metric_id, label,
    kind, value, display, denominator, share_basis, segments,
    floor_applied, query_file). A candidate whose `value` is None (the
    query returned zero rows) is routed into the returned `unavailable`
    list with its `reason` instead of ever appearing in `findings` with a
    zero or null published value (EVID-02 empty).

    For any finding carrying `segments`, sets `sums_to_100` to False when
    the segments' guild counts sum above `sample["active_guilds"]` (the
    D-14 multi-bucket case), so a pair-keyed count can never be
    misread as a partition of the guild-keyed total.
    """
    final_findings = []
    final_unavailable = list(unavailable)

    for candidate in findings:
        if candidate.get("value") is None:
            final_unavailable.append({
                "metric_id": candidate["metric_id"],
                "label": candidate["label"],
                "reason": candidate.get("reason", "query returned zero rows"),
            })
            continue

        segments = candidate.get("segments") or []
        sums_to_100 = candidate.get("sums_to_100")
        if segments and sample.get("active_guilds") is not None:
            total_segment_guilds = sum(s.get("guild_count", 0) for s in segments)
            sums_to_100 = total_segment_guilds <= sample["active_guilds"]

        final_findings.append({
            "metric_id": candidate["metric_id"],
            "label": candidate["label"],
            "kind": candidate["kind"],
            "value": candidate["value"],
            "display": candidate.get("display"),
            "denominator": candidate.get("denominator"),
            "share_basis": candidate.get("share_basis"),
            "sums_to_100": sums_to_100,
            "segments": segments,
            "floor_applied": candidate.get("floor_applied", False),
            "query_file": candidate.get("query_file"),
        })

    return {
        "report_slug": REPORT_SLUG,
        "window": window,
        "generated_at": generated_at,
        "guild_floor": GUILD_FLOOR,
        "definitions": definitions,
        "sample": sample,
        "findings": final_findings,
        "unavailable": final_unavailable,
    }


def resolve_output_path(path):
    """Reuses gsc_export.resolve_export_path's guard shape with
    OUTPUT_DIR as the default parent: rejects a `..` path segment, and
    joins a bare filename onto OUTPUT_DIR."""
    if ".." in path.split(os.sep):
        raise ValueError(f"refusing output path containing '..' segment: {path}")
    if os.sep not in path and (os.altsep is None or os.altsep not in path):
        path = os.path.join(OUTPUT_DIR, path)
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    return path


def write_json(artifact, path):
    """Writes the artifact with indent=2, sort_keys=False, and a trailing
    newline so the committed file diffs cleanly."""
    resolved = resolve_output_path(path)
    with open(resolved, "w") as f:
        json.dump(artifact, f, indent=2, sort_keys=False)
        f.write("\n")
    return resolved


_SAMPLE_ORDER = ("active_guilds", "raid_events", "loot_awards", "raiders_with_approved_lists")
_SAMPLE_LABELS = {
    "active_guilds": "Active guilds",
    "raid_events": "Raid events",
    "loot_awards": "Loot awards",
    "raiders_with_approved_lists": "Raiders with approved lists",
}


def _segment_sort_key(segment):
    # Segment guild_count descending, then segment name ascending (EVID-02
    # ordering: fully specified row order so two runs over unchanged data
    # produce byte-identical files).
    return (-segment.get("guild_count", 0), segment.get("segment", ""))


def write_csv(artifact, path):
    """Writes CSV_HEADER then one row per sample number, then one row per
    finding, then one row per segment of that finding, always through
    csv.writer -- never a manual comma join. Row order: published-selection
    order (sample numbers in their fixed order, then findings in the order
    the artifact lists them), then within a finding's segments,
    guild_count descending then segment name ascending."""
    resolved = resolve_output_path(path)
    sample = artifact.get("sample", {})
    sample_query_file = artifact.get("sample_query_file", "")

    rows = []
    for key in _SAMPLE_ORDER:
        if key in sample:
            value = sample[key]
            rows.append([
                f"sample.{key}",
                _SAMPLE_LABELS.get(key, key),
                "count",
                "",
                value,
                str(int(value)),
                "",
                "",
                sample_query_file,
            ])

    for finding in artifact.get("findings", []):
        rows.append([
            finding["metric_id"],
            finding["label"],
            finding["kind"],
            "",
            finding.get("value", ""),
            finding.get("display", ""),
            finding.get("denominator") or "",
            finding.get("share_basis") or "",
            finding.get("query_file") or "",
        ])
        segments = finding.get("segments") or []
        for segment in sorted(segments, key=_segment_sort_key):
            rows.append([
                finding["metric_id"],
                finding["label"],
                finding["kind"],
                segment.get("segment", ""),
                segment.get("guild_count", ""),
                segment.get("display", ""),
                finding.get("denominator") or "",
                finding.get("share_basis") or "",
                finding.get("query_file") or "",
            ])

    with open(resolved, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(CSV_HEADER)
        for row in rows:
            w.writerow(row)

    return resolved
