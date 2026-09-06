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
SELECTION_FILE_NAME = "published-findings.txt"

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

# D-02/Task 3: the top-priority-bracket metric ships only when the winner's
# list-snapshot coverage clears both bars -- below either one, the number
# would describe a biased subset of awards while reading as if it described
# every award in the window.
TOP_BRACKET_SHARE_THRESHOLD = 80.0


def parse_query_header(sql_text):
    """Parses the leading `-- key: value` comment block of a committed
    query file. Returns a dict with the four required keys, `columns`
    split into a list. Raises ValueError naming the missing key(s) if any
    of `metric-id`, `label`, `columns`, `window` is absent.

    WR-03: stops at the first blank `--` comment line (a `--` line with no
    content after stripping the dashes) -- every committed query file
    follows this shape: the four required `key: value` lines, then a bare
    `--` line, then free-form descriptive prose. Without this stop, a
    prose line that happens to start with a word containing a colon (e.g.
    a line like "endpoint in plan 03-01 (SUMMARY: ...)") would be parsed as
    an extra header key, and if a future prose line's key ever collided
    with a required key (`window`, `columns`, etc. all appear constantly
    in this report's own prose), it would silently overwrite the real
    header value with no error surfaced anywhere."""
    header = {}
    for line in sql_text.splitlines():
        stripped = line.strip()
        if not stripped.startswith("--"):
            if header:
                break
            continue
        content = stripped.lstrip("-").strip()
        if not content:
            if header:
                break
            continue
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
            "definition_note": candidate.get("definition_note"),
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


def assemble_scalar_finding(metric, value, denominator=None, share_basis=None):
    """Wraps a single computed value (a median or an already-computed
    percentage share) into a findings entry, quantized through
    `quantize_display` for the metric's own `kind`. A `None` value (the
    query returned zero usable rows) routes to `unavailable` with the
    generic zero-rows reason instead of ever reaching `findings`."""
    if value is None:
        return ("unavailable", {
            "metric_id": metric["metric_id"],
            "label": metric["label"],
            "reason": "query returned zero rows",
        })

    entry = {
        "metric_id": metric["metric_id"],
        "label": metric["label"],
        "kind": metric["kind"],
        "value": value,
        "display": quantize_display(value, metric["kind"]),
        "denominator": denominator,
        "share_basis": share_basis,
        "sums_to_100": None,
        "segments": [],
        "floor_applied": False,
        "query_file": metric.get("query_file"),
        "definition_note": metric.get("definition_note"),
    }
    return ("finding", entry)


def assemble_percentage_from_counts(metric, numerator, denominator):
    """Computes a percentage finding from a numerator/denominator count
    pair (e.g. guilds_with_blp / active_guilds) and hands it to
    `assemble_scalar_finding`. A zero or missing denominator routes to
    `unavailable` rather than dividing by zero."""
    if not denominator:
        return ("unavailable", {
            "metric_id": metric["metric_id"],
            "label": metric["label"],
            "reason": "query returned a zero denominator",
        })
    share = (numerator / denominator) * 100
    return assemble_scalar_finding(metric, share, denominator=denominator, share_basis="active_guilds")


def assemble_median(metric, value, measured_count=None):
    """Wraps a `percentile_cont` median value into a findings entry via
    `assemble_scalar_finding`, carrying the row-count denominator this
    median was measured over (e.g. `lists_measured`) for display."""
    share_basis = "measured" if measured_count is not None else None
    return assemble_scalar_finding(metric, value, denominator=measured_count, share_basis=share_basis)


def assemble_support(metric, row):
    """Wraps a raw multi-column support-measurement row -- never a
    pickable finding, and never routed through `quantize_display` (a
    support row's columns are not a single value/kind pair). Exists purely
    to put a real, auditable number behind a grey-out or a publish/withhold
    decision at the checkpoint and in the plan record."""
    return ("finding", {
        "metric_id": metric["metric_id"],
        "label": metric["label"],
        "kind": "support",
        "value": None,
        "display": ", ".join(f"{k}={v}" for k, v in row.items()),
        "denominator": None,
        "share_basis": None,
        "sums_to_100": None,
        "segments": [],
        "floor_applied": False,
        "query_file": metric.get("query_file"),
        "definition_note": metric.get("definition_note"),
        "raw": dict(row),
    })


def assemble_breakdown(metric, segment_counts, denominator, floor=GUILD_FLOOR):
    """D-04 breakdown assembler: the single call site every segmented
    breakdown passes through before it reaches a finding.

    Applies the centralized `apply_floor` merge to `segment_counts`. When
    the merged result is the module's `WITHHELD` sentinel (the merged
    "Other" bucket is itself below `floor`), returns an `unavailable` entry
    whose reason names the floor and never the withheld segments. An empty
    floored result (zero rows) also routes to `unavailable`.

    Otherwise returns a `finding` entry whose `segments` list carries each
    kept segment's `guild_count` and a `share` (`guild_count / denominator
    * 100`, quantized through `quantize_display`), sorted by `guild_count`
    descending then `segment` name ascending on ties. `sums_to_100` is
    `True` only when the kept segments' counts sum exactly to
    `denominator` -- a guild counted in more than one segment (D-14) makes
    the sum exceed the denominator and `sums_to_100` is `False`.
    """
    floored = apply_floor(segment_counts, floor)

    if floored is WITHHELD:
        return ("unavailable", {
            "metric_id": metric["metric_id"],
            "label": metric["label"],
            "reason": (
                f"withheld: after merging every segment under the {floor}-guild "
                "privacy floor into an \"Other\" bucket, that merged bucket "
                f"itself holds fewer than {floor} guilds, so no segment here "
                "can be published without risking identifying a specific guild"
            ),
        })

    if not floored:
        return ("unavailable", {
            "metric_id": metric["metric_id"],
            "label": metric["label"],
            "reason": "query returned zero rows",
        })

    segments = []
    total = 0
    for name, count in floored.items():
        total += count
        share = (count / denominator * 100) if denominator else 0.0
        segments.append({
            "segment": name,
            "guild_count": count,
            "share": share,
            "display": quantize_display(share, "percentage"),
        })
    segments.sort(key=_segment_sort_key)

    entry = {
        "metric_id": metric["metric_id"],
        "label": metric["label"],
        "kind": metric["kind"],
        "value": total,
        "display": quantize_display(total, "count"),
        "denominator": denominator,
        "share_basis": "active_guilds",
        "sums_to_100": denominator is not None and total == denominator,
        "segments": segments,
        "floor_applied": True,
        "query_file": metric.get("query_file"),
        "definition_note": metric.get("definition_note"),
    }
    return ("finding", entry)


def decide_top_bracket_coverage(
    awards_in_window,
    awards_with_prior_snapshot,
    active_guilds_with_usable_snapshots,
    guild_floor=GUILD_FLOOR,
    share_threshold=TOP_BRACKET_SHARE_THRESHOLD,
):
    """Task 3's coverage decision helper: decides whether the
    top-priority-bracket metric ships, on measured `loot_submission_snapshots`
    coverage rather than assumption. Publishes only when
    `active_guilds_with_usable_snapshots` clears `guild_floor` AND the share
    of `awards_in_window` that have a prior snapshot clears `share_threshold`
    percent. Either withhold reason carries every measured number so the
    registry entry it feeds is self-evidencing."""
    share = (awards_with_prior_snapshot / awards_in_window * 100) if awards_in_window else 0.0
    share_display = quantize_display(share, "percentage")

    if active_guilds_with_usable_snapshots < guild_floor:
        return {
            "publish": False,
            "coverage_share": share,
            "reason": (
                f"withheld: only {active_guilds_with_usable_snapshots} active guild(s) "
                f"have at least one usable prior-award list snapshot, below the "
                f"{guild_floor}-guild floor; {awards_with_prior_snapshot} of "
                f"{awards_in_window} awards in the window ({share_display}%) have a "
                "prior snapshot at all -- list snapshots do not cover enough of the "
                "awards in this window for a share to describe awards generally"
            ),
        }

    if share < share_threshold:
        return {
            "publish": False,
            "coverage_share": share,
            "reason": (
                f"withheld: only {share_display}% of the {awards_in_window} awards in "
                f"the window ({awards_with_prior_snapshot} awards) have a prior list "
                f"snapshot, below the {share_threshold}% coverage bar, even though "
                f"{active_guilds_with_usable_snapshots} active guilds have at least "
                "one usable snapshot -- list snapshots do not cover enough of the "
                "awards in this window for a share to describe awards generally "
                "rather than the subset that happens to have a snapshot"
            ),
        }

    return {
        "publish": True,
        "coverage_share": share,
        "coverage_display": share_display,
    }


def render_menu(metrics, results):
    """Renders the D-01/D-02 candidate menu: one line per registry entry,
    in registry order. A `finding` line prints its value/display and never
    a reason; an `unavailable` line prints its reason verbatim and never a
    numeric display, so a greyed metric cannot leak a number the human is
    not allowed to pick. Entries whose `kind` is `support` print in a
    separate trailing block and are never counted as pickable or
    unavailable -- a human cannot pick a support measurement as a finding.
    The `sample-definition` entry (`kind == "count"`) is likewise never
    pickable -- it is unconditionally published as the artifact's `sample`
    block, not chosen at this checkpoint -- and prints in its own leading
    block for full transparency without inflating the pickable/unavailable
    tally. Returns the full rendered text, including the trailing pickable/
    unavailable count."""
    main_lines = []
    support_lines = []
    sample_lines = []
    pickable_count = 0
    unavailable_count = 0

    for metric in metrics:
        result = results.get(metric["metric_id"])
        if result is None:
            continue
        status, entry = result
        is_support = metric["kind"] == "support"
        is_sample = metric["kind"] == "count"

        if status == "finding":
            line = f"{metric['metric_id']:<28} {metric['kind']:<12} {entry['display']}"
            if not is_support and not is_sample:
                pickable_count += 1
        else:
            reason = entry.get("reason", "unavailable")
            line = f"{metric['metric_id']:<28} {metric['kind']:<12} unavailable: {reason}"
            if not is_support and not is_sample:
                unavailable_count += 1

        if is_sample:
            sample_lines.append(line)
        elif is_support:
            support_lines.append(line)
        else:
            main_lines.append(line)

    lines = []
    if sample_lines:
        lines.append("-- sample block (always published, not pickable) --")
        lines.extend(sample_lines)
        lines.append("")
    lines.extend(main_lines)
    if support_lines:
        lines.append("")
        lines.append("-- support measurements (not pickable) --")
        lines.extend(support_lines)
    lines.append("")
    lines.append(f"{pickable_count} pickable, {unavailable_count} unavailable")
    return "\n".join(lines)


def load_selection_file(path):
    """Reads the D-01 selection file (one metric id per line, in
    publication order) and returns the ids as a list with that order
    preserved. Blank lines are skipped; no other commentary is permitted
    in the file (Task 3's writer never emits any). A missing file returns
    an empty list rather than raising, so `--menu` and `--lint-queries`
    (which never touch the selection) are unaffected, and a genuinely
    empty selection is a valid, if unpublishable, state (EVID-01 empty)."""
    if not os.path.exists(path):
        return []
    with open(path) as f:
        return [line.strip() for line in f if line.strip()]


def validate_selection(selection_ids, metrics):
    """Task 3's D-01/D-02 selection guard: raises ValueError naming the
    first offending id if `selection_ids` names anything other than a
    pickable candidate -- an unknown id, a greyed-out id (carries an
    `unavailable_reason`), or a support-kind id. A greyed metric cannot be
    selected and a support measurement is not a finding."""
    registry = {m["metric_id"]: m for m in metrics}
    for metric_id in selection_ids:
        metric = registry.get(metric_id)
        if metric is None:
            raise ValueError(f"selection lists unknown metric id: {metric_id}")
        if metric.get("unavailable_reason"):
            raise ValueError(f"selection lists a greyed-out metric id: {metric_id}")
        if metric.get("kind") == "support":
            raise ValueError(f"selection lists a support-kind metric id: {metric_id}")
        if metric["metric_id"] == "sample-definition" or metric.get("kind") == "count":
            raise ValueError(f"selection lists the sample block, which is never a pickable finding: {metric_id}")


def resolve_output_path(path):
    """Reuses gsc_export.resolve_export_path's guard shape with
    OUTPUT_DIR as the default parent: rejects a `..` path segment, joins a
    bare filename onto OUTPUT_DIR, and (WR-02) confines the final resolved
    path to OUTPUT_DIR -- a `..`-free path with no separator at all only
    ever reaches the bare-filename branch above, but a `..`-free *absolute*
    path (or one that steps outside OUTPUT_DIR via a symlinked parent) has
    a separator and skips that branch entirely, so without this check it
    would pass through untouched instead of being confined."""
    if ".." in path.split(os.sep):
        raise ValueError(f"refusing output path containing '..' segment: {path}")
    if os.sep not in path and (os.altsep is None or os.altsep not in path):
        path = os.path.join(OUTPUT_DIR, path)
    resolved = os.path.abspath(path)
    allowed_root = os.path.abspath(OUTPUT_DIR)
    if resolved != allowed_root and not resolved.startswith(allowed_root + os.sep):
        raise ValueError(f"refusing output path outside {OUTPUT_DIR}: {path}")
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
