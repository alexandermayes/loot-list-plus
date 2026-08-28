#!/usr/bin/env python3
"""
Append one AI-answer test cell to the weekly results log
(scripts/analytics/ai-answer-log.csv). See scripts/analytics/RUNBOOK.md for
the full weekly procedure: the three AI surfaces, the six fixed prompts,
session hygiene, and what to record.

Example (a cell where LootList+ did not appear in the answer):
    python3 scripts/analytics/log-ai-answer.py \\
        --date 2026-08-28 --surface chatgpt --prompt-id P1 \\
        --appeared no --correct n/a --cited-url "" \\
        --competing-sources "https://thatsmybis.com" \\
        --notes "answer named TMB and DKP, not LootList+"

stdlib only — no node, no third-party packages.
"""
import argparse
import csv
import datetime
import os
import sys

HEADER = [
    "date",
    "ai_surface",
    "prompt_id",
    "lootlist_appeared",
    "factually_correct",
    "cited_url",
    "competing_sources",
    "notes",
]

SURFACES = ["chatgpt", "google-ai-overviews", "claude"]

PROMPT_IDS = ["P1", "P2", "P3", "P4", "P5", "P6"]

# Transcribed character for character from the sprint plan's weekly test
# set. P3 contains a typographic right single quotation mark (U+2019) in
# "That's" — preserve it exactly. Normalizing it to an ASCII apostrophe or
# paraphrasing the wording changes what was actually asked and breaks
# week-over-week comparability.
PROMPTS = {
    "P1": "What is LootList+ for World of Warcraft?",
    "P2": "What are the best loot-management tools for a WoW Classic guild?",
    "P3": "What is a good alternative to That’s My BiS for a Classic guild?",
    "P4": "How can a WoW Classic guild combine ranked loot lists with attendance?",
    "P5": "Which WoW loot systems show raiders exactly why someone has priority?",
    "P6": "Is LootList+ free and what does Premium include?",
}

APPEARED_VALUES = ["yes", "no"]
CORRECT_VALUES = ["yes", "no", "partial", "n/a"]

LOG_PATH = "scripts/analytics/ai-answer-log.csv"

REQUIRED_FIELDS = ["date", "ai_surface", "prompt_id", "lootlist_appeared", "factually_correct"]


def validate_row(row):
    """Return a list of human readable problems with row, empty when valid."""
    problems = []

    for field in REQUIRED_FIELDS:
        if not row.get(field):
            problems.append(f"{field} is required and cannot be empty")

    surface = row.get("ai_surface")
    if surface and surface not in SURFACES:
        problems.append(f"ai_surface must be one of {SURFACES}, got {surface!r}")

    prompt_id = row.get("prompt_id")
    if prompt_id and prompt_id not in PROMPT_IDS:
        problems.append(f"prompt_id must be one of {PROMPT_IDS}, got {prompt_id!r}")

    appeared = row.get("lootlist_appeared")
    if appeared and appeared not in APPEARED_VALUES:
        problems.append(f"lootlist_appeared must be one of {APPEARED_VALUES}, got {appeared!r}")

    correct = row.get("factually_correct")
    if correct and correct not in CORRECT_VALUES:
        problems.append(f"factually_correct must be one of {CORRECT_VALUES}, got {correct!r}")

    date_value = row.get("date")
    if date_value:
        try:
            datetime.date.fromisoformat(date_value)
        except ValueError:
            problems.append(f"date must be ISO format YYYY-MM-DD, got {date_value!r}")

    # There is no product answer to grade and no product URL to cite when
    # LootList+ did not appear at all.
    if appeared == "no":
        if correct not in (None, "n/a"):
            problems.append("factually_correct must be 'n/a' when lootlist_appeared is 'no'")
        if row.get("cited_url"):
            problems.append("cited_url must be empty when lootlist_appeared is 'no'")

    return problems


def append_row(log_path, row):
    """Validate row, then append it to log_path as one CSV data row.

    Creates the parent directory and writes HEADER first when log_path is
    missing or zero bytes. Never assembles a line by joining on a comma;
    competing_sources routinely holds several URLs and cited_url holds
    query strings, so csv.writer is the only writer. Refuses to write, and
    returns the problems instead, when validate_row reports anything.
    """
    problems = validate_row(row)
    if problems:
        return problems

    dirname = os.path.dirname(log_path)
    if dirname:
        os.makedirs(dirname, exist_ok=True)

    needs_header = not os.path.exists(log_path) or os.path.getsize(log_path) == 0

    with open(log_path, "a", newline="") as f:
        writer = csv.writer(f)
        if needs_header:
            writer.writerow(HEADER)
        writer.writerow([row.get(column, "") for column in HEADER])

    return []


def read_rows(log_path):
    """Return every data row in log_path, in append (file) order.

    The log is append only: two cells with the same date, surface, and
    prompt id are two separate records, not a collision, because a
    legitimate re-run of a cell must remain visible rather than quietly
    replacing the first result. Never sorts, deduplicates, or rewrites.
    """
    with open(log_path, newline="") as f:
        return list(csv.DictReader(f))


def parse_args():
    parser = argparse.ArgumentParser(
        description="Append one AI-answer test cell to the weekly results log."
    )
    parser.add_argument("--date", required=True, help="ISO date the cell was recorded, e.g. 2026-08-28")
    parser.add_argument("--surface", required=True, dest="ai_surface", help="AI surface tested (see RUNBOOK.md)")
    parser.add_argument("--prompt-id", required=True, dest="prompt_id", help="Prompt id, P1 through P6")
    parser.add_argument(
        "--appeared",
        required=True,
        dest="lootlist_appeared",
        help="Did LootList+ appear in the answer: yes or no",
    )
    parser.add_argument(
        "--correct",
        required=True,
        dest="factually_correct",
        help="Was the answer factually correct: yes, no, partial, or n/a",
    )
    parser.add_argument("--cited-url", default="", dest="cited_url", help="LootList+ URL cited, empty if none")
    parser.add_argument(
        "--competing-sources",
        default="",
        dest="competing_sources",
        help="Semicolon separated list of the other products or sites the answer named",
    )
    parser.add_argument("--notes", default="", help="Free text notes")
    parser.add_argument("--log", default=LOG_PATH, dest="log", help="Path to the results log CSV")
    return parser.parse_args()


def main():
    args = parse_args()
    row = {
        "date": args.date,
        "ai_surface": args.ai_surface,
        "prompt_id": args.prompt_id,
        "lootlist_appeared": args.lootlist_appeared,
        "factually_correct": args.factually_correct,
        "cited_url": args.cited_url,
        "competing_sources": args.competing_sources,
        "notes": args.notes,
    }

    problems = append_row(args.log, row)
    if problems:
        for problem in problems:
            print(problem)
        sys.exit(1)

    print(f"Recorded {row['date']} / {row['ai_surface']} / {row['prompt_id']}")


if __name__ == "__main__":
    main()
