#!/usr/bin/env python3
"""
D-07 grid and D-08 miss list for the week-4 review. Read only: this script
never writes to the log or to any file, it only reads
scripts/analytics/ai-answer-log.csv (or a --log override) and prints a
report.

Invocations:
    python3 scripts/analytics/ai-answer-grid.py --baseline 2026-08-28
    python3 scripts/analytics/ai-answer-grid.py --baseline 2026-08-28 --week4 2026-09-22

stdlib only, no node, no third-party packages.
"""
import argparse
import importlib.util
import os
import sys

VERDICT_CORRECT = "returns LootList+ correctly"
VERDICT_INCORRECT = "does not return LootList+ correctly"


def load_log_module():
    """Load log-ai-answer.py from this directory via importlib.

    SURFACES, PROMPT_IDS and read_rows all come from that one source of
    truth rather than this script re-parsing or re-declaring its own copy.
    """
    this_dir = os.path.dirname(os.path.abspath(__file__))
    module_path = os.path.join(this_dir, "log-ai-answer.py")
    spec = importlib.util.spec_from_file_location("log_ai_answer_for_grid", module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_LOG = load_log_module()
SURFACES = _LOG.SURFACES
PROMPT_IDS = _LOG.PROMPT_IDS
read_rows = _LOG.read_rows

# D-07: a prompt returns LootList+ correctly when at least 2 of its 3
# surfaces have lootlist_appeared yes and factually_correct yes. Partial
# never counts as correct.
CORRECT_THRESHOLD = 2


def rows_for_date(rows, date):
    """Return every row whose date field exactly equals date (ISO string)."""
    return [row for row in rows if row.get("date") == date]


def build_grid(rows):
    """Build a (surface, prompt_id) -> row grid from rows for one date.

    The log is append only, so a legitimate re-run of a cell produces two
    rows for the same (surface, prompt_id) key. The later row (append
    order) wins in the grid; every duplicated key is also returned so
    callers can surface it rather than silently overwrite.
    """
    grid = {}
    duplicates = []
    for row in rows:
        key = (row.get("ai_surface"), row.get("prompt_id"))
        if key in grid and key not in duplicates:
            duplicates.append(key)
        grid[key] = row
    return grid, duplicates


def cell_correct(row):
    """True only when the row has appeared yes and factually_correct yes.

    partial, no, and n/a are all False -- a partial answer never counts as
    correct (D-07).
    """
    if row is None:
        return False
    return row.get("lootlist_appeared") == "yes" and row.get("factually_correct") == "yes"


def count_correct(grid, prompt_id):
    """Return (correct, recorded) surface counts for prompt_id across SURFACES."""
    correct = 0
    recorded = 0
    for surface in SURFACES:
        row = grid.get((surface, prompt_id))
        if row is not None:
            recorded += 1
            if cell_correct(row):
                correct += 1
    return correct, recorded


def prompt_verdict(correct, recorded, total=None):
    """Apply the D-07 2-of-3 rule, honestly reporting missing cells.

    A missing cell is never scored as a hit or a miss. The verdict is
    decided as soon as the outcome cannot change regardless of what a
    missing cell later records: already at or above threshold is decided
    correct; unable to reach threshold even if every missing cell turned
    out correct is decided incorrect. Otherwise the missing cell(s) could
    still decide it, so the verdict is incomplete.
    """
    if total is None:
        total = len(SURFACES)
    missing = total - recorded
    if correct >= CORRECT_THRESHOLD:
        return VERDICT_CORRECT
    max_possible = correct + missing
    if max_possible < CORRECT_THRESHOLD:
        return VERDICT_INCORRECT
    return f"incomplete ({recorded} of {total} cells recorded)"


def list_misses(grid):
    """Every recorded cell that is a miss or an error, in PROMPT_IDS then
    SURFACES order, with error_type and cited_url normalized for display
    (D-08). A missing cell (no row at all) is not a miss -- it is simply
    not recorded, and is not included here.
    """
    misses = []
    for prompt_id in PROMPT_IDS:
        for surface in SURFACES:
            row = grid.get((surface, prompt_id))
            if row is None:
                continue
            appeared = row.get("lootlist_appeared")
            correct = row.get("factually_correct")
            if appeared == "no" or correct in ("no", "partial"):
                misses.append(
                    {
                        "surface": surface,
                        "prompt_id": prompt_id,
                        "appeared": appeared,
                        "correct": correct,
                        "error_type": row.get("error_type") or "not recorded",
                        "cited_url": row.get("cited_url") or "none",
                        "notes": row.get("notes", ""),
                    }
                )
    return misses


def render_grid_table(grid, date):
    """One row per prompt: appeared / correct per surface, correct-surface
    count, and the D-07 verdict."""
    lines = [f"### AI-answer grid ({date})"]
    lines.append("| Prompt | " + " | ".join(SURFACES) + " | correct surfaces | verdict |")
    lines.append("|" + "---|" * (len(SURFACES) + 3))
    for prompt_id in PROMPT_IDS:
        cells = []
        for surface in SURFACES:
            row = grid.get((surface, prompt_id))
            if row is None:
                cells.append("not run")
            else:
                appeared = row.get("lootlist_appeared") or ""
                correct = row.get("factually_correct") or ""
                cells.append(f"{appeared} / {correct}")
        correct, recorded = count_correct(grid, prompt_id)
        verdict = prompt_verdict(correct, recorded)
        lines.append(
            f"| {prompt_id} | " + " | ".join(cells) + f" | {correct} of {len(SURFACES)} | {verdict} |"
        )
    return "\n".join(lines)


def render_comparison_table(baseline_grid, week4_grid):
    """One row per prompt: baseline verdict, week-4 verdict, and change.

    change is 'not comparable' when either side is incomplete -- an
    incomplete verdict has no fixed direction to compare against.
    """
    lines = ["### Baseline vs week-4 comparison"]
    lines.append("| Prompt | baseline verdict | week-4 verdict | change |")
    lines.append("|---|---|---|---|")
    for prompt_id in PROMPT_IDS:
        b_correct, b_recorded = count_correct(baseline_grid, prompt_id)
        b_verdict = prompt_verdict(b_correct, b_recorded)
        w_correct, w_recorded = count_correct(week4_grid, prompt_id)
        w_verdict = prompt_verdict(w_correct, w_recorded)

        if b_verdict.startswith("incomplete") or w_verdict.startswith("incomplete"):
            change = "not comparable"
        elif b_verdict == VERDICT_INCORRECT and w_verdict == VERDICT_CORRECT:
            change = "improved"
        elif b_verdict == VERDICT_CORRECT and w_verdict == VERDICT_INCORRECT:
            change = "regressed"
        else:
            change = "unchanged"

        lines.append(f"| {prompt_id} | {b_verdict} | {w_verdict} | {change} |")
    return "\n".join(lines)


def render_misses_table(grid, date):
    """List every miss or error cell for one date, with error_type and
    cited_url (D-08), so the annotations can feed the next-bet ranking."""
    misses = list_misses(grid)
    lines = [f"### Misses and errors ({date})"]
    if not misses:
        lines.append("None.")
        return "\n".join(lines)
    lines.append("| Prompt | Surface | Appeared | Correct | Error type | Cited URL | Notes |")
    lines.append("|---|---|---|---|---|---|---|")
    for miss in misses:
        lines.append(
            f"| {miss['prompt_id']} | {miss['surface']} | {miss['appeared']} | "
            f"{miss['correct']} | {miss['error_type']} | {miss['cited_url']} | {miss['notes']} |"
        )
    return "\n".join(lines)


def render_report(log_path, baseline, week4=None):
    """Read log_path once and print, in order: the baseline grid, and when
    week4 is given, the week-4 grid, the comparison table, the week-4
    misses and the baseline misses, then a line listing any duplicated
    cells. Raises ValueError if a requested date has zero rows.
    """
    rows = read_rows(log_path)

    baseline_rows = rows_for_date(rows, baseline)
    if not baseline_rows:
        raise ValueError(f"No rows recorded for date {baseline!r} in {log_path}")
    baseline_grid, baseline_dupes = build_grid(baseline_rows)

    sections = [render_grid_table(baseline_grid, baseline)]
    all_dupes = list(baseline_dupes)

    if week4:
        week4_rows = rows_for_date(rows, week4)
        if not week4_rows:
            raise ValueError(f"No rows recorded for date {week4!r} in {log_path}")
        week4_grid, week4_dupes = build_grid(week4_rows)

        sections.append(render_grid_table(week4_grid, week4))
        sections.append(render_comparison_table(baseline_grid, week4_grid))
        sections.append(render_misses_table(week4_grid, week4))
        sections.append(render_misses_table(baseline_grid, baseline))
        all_dupes += week4_dupes

    if all_dupes:
        described = ", ".join(f"{surface}/{prompt_id}" for surface, prompt_id in all_dupes)
        sections.append(f"Duplicated cells (last row kept): {described}")
    else:
        sections.append("Duplicated cells: none")

    return "\n\n".join(sections)


def main():
    parser = argparse.ArgumentParser(
        description="Print the D-07 grid and D-08 miss list from the AI-answer log."
    )
    parser.add_argument("--baseline", required=True, help="Baseline ISO date, e.g. 2026-08-28")
    parser.add_argument(
        "--week4", default=None, help="Week-4 ISO date to compare against the baseline"
    )
    parser.add_argument("--log", default=_LOG.LOG_PATH, help="Path to the results log CSV")
    args = parser.parse_args()

    try:
        report = render_report(args.log, args.baseline, args.week4)
    except ValueError as exc:
        print(str(exc))
        sys.exit(1)

    print(report)


if __name__ == "__main__":
    main()
