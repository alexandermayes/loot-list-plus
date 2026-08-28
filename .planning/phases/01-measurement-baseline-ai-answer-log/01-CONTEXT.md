# Phase 1 Context: Measurement Baseline & AI Answer Log

**Gathered:** 2026-08-28
**Source:** Orchestrator-mediated decisions during /gsd-plan-phase 1 (no full discuss-phase was run; the user answered the researcher's three open product questions directly)

<decisions>

## D-01: AI surfaces for the weekly 6-prompt test

The weekly AI-answer test set runs against exactly three surfaces: **ChatGPT**, **Google AI Overviews / AI Mode**, and **Claude**. Perplexity was considered and explicitly excluded. The runbook's per-surface clean-session instructions and the results log's columns must reflect these three surfaces — each prompt is run once per surface per weekly run (18 prompt-surface cells per run).

## D-02: First complete test-set run is a human-run checkpoint

Success criterion 4 (at least one complete recorded run) is satisfied via a human-run checkpoint, not automation. The executor ships the runbook and the empty results log, then pauses at a `checkpoint:human-action` task; the user runs the six prompts in clean, non-personalized sessions following the runbook and reports results back, which are then recorded in the log as the week-1 run. Do NOT drive the user's logged-in browser and do NOT fabricate or approximate run results.

## D-03: GSC baseline export ships partial now, with a dated re-pull

GSC data lags 2-3 days, so the Aug 24-30 cohort cannot be fully exported before ~Sep 2. Decision: commit the export now covering the prior three months plus the partial Aug 24-30 cohort, clearly labeled as partial (state the actual data end date in the committed artifact), AND include an explicit follow-up task/checkpoint dated on-or-after Sep 2, 2026 to re-pull the complete Aug 24-30 window and update the committed export. Do not hold the phase's tooling hostage to the data lag, and never approximate the missing days from another source.

</decisions>

## Constraints reaffirmed

- Runbook and results log live under `scripts/analytics/` (`docs/` and bare `scripts/*.md` are gitignored — verified via `git check-ignore`).
- The six fixed prompts and the four cluster keyword lists are quoted verbatim in 01-RESEARCH.md; use those, not paraphrases.
- Internal repo docs (runbook, log) do not require user copy sign-off, but still: no em dashes in any authored content.
- Do not fabricate baseline numbers; MEAS-01 data comes only from the real GSC API via the restored credentials.
