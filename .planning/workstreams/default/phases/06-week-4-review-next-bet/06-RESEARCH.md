# Phase 6: Week-4 Review & Next Bet - Research

**Researched:** 2026-09-25
**Domain:** Internal analytics review — SQL cohort reconstruction, Search Console analysis, PostHog HogQL funnel queries, AI-answer log comparison
**Confidence:** MEDIUM (HIGH for schema/code facts read this session; MEDIUM for the PostHog dashboard-event mapping, which was inferred from client-tracking code rather than a committed dashboard-definition file)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Cohort timing and comparison**
- **D-01:** The cohort comparison runs on or after **2026-10-01**, in one clean pass. That is when the Sep 18 to 24 cohort's 7-day activation window closes, and Search Console data for Sep 24 is final by then (2 to 3 day lag). The review must not publish a partial cohort number. Plans may prepare tooling and non-cohort inputs earlier, but the cohort query and final write-up are gated to on or after Oct 1 with a dated checkpoint. This supersedes the roadmap's "Sep 20 to 24" calendar note for the cohort section.
- **D-02:** Both cohorts are **recomputed from source rows** (guild creation plus the underlying raid, loot-award and list rows that define activation) using one definition, with a 7-day window measured from each guild's creation. Do not rely on `guild_funnel_milestones.activated_at`: the evaluator stamps the time it re-observes a condition, so guilds created Aug 24 to 26 (before migration `20260827000000`) carry late or missing stamps. If the activation definition in `utils/analytics/funnel.ts` cannot be reproduced from source rows, the researcher must say so explicitly and propose the closest faithful reconstruction. Do not silently fall back to the stamps.
- **D-03:** Metrics: **activated guilds are the headline** and the pass/fail line against the +30% target. **Qualified guilds are secondary context**, recomputed the same way. The cohort denominator (guilds created in each week) is reported alongside.
- **D-04:** Verdict format: absolute counts plus percentage change plus a plain-language verdict, with an explicit small-denominator caveat (e.g. "7 vs 5 guilds (+40%): target met, but a one-guild swing would change the result"). No statistical significance test.
- Privacy floor still applies to anything published outside the phase folder. Cohort counts in the internal review are aggregate counts with no guild names or IDs anywhere, including committed exports.

**Week-4 AI-answer run**
- **D-05:** The user reruns all **18 cells** (6 fixed prompts × ChatGPT, Google AI Overviews/AI Mode, Claude) following `scripts/analytics/RUNBOOK.md`, in clean non-personalized sessions. Results are recorded through `scripts/analytics/log-ai-answer.py`. This is a `checkpoint:human-action`, exactly like Phase 1 D-02. Never automate the user's browser, and never fabricate or approximate a cell.
- **D-06:** The run happens as soon as convenient, **before Oct 1**. It does not depend on the cohort window, and doing it early lets the Oct 1 write-up happen in one sitting.
- **D-07:** Success criterion 3 is reported as the full 6×3 grid (appeared / factually correct) against the Aug 28 run. A prompt counts as "returns LootList+ correctly" when **at least 2 of 3 surfaces** include LootList+ with correct facts.
- **D-08:** Every miss or error is annotated with an error type (not mentioned, wrong price or plan, outdated feature claim, wrong category, etc.) and the cited URL from the log. These annotations are inputs to the next-bet ranking.

**Funnel, CTA drop-off and search data**
- **D-09:** Funnel and CTA drop-off numbers come from a **PostHog HogQL pull** (extend or reuse `scripts/analytics/pull-posthog.py`) against the events behind the four pinned dashboards (2036463 to 2036466). Query text and outputs are committed so the numbers are reproducible. The dashboards are only a visual cross-check, and screenshots are included only if they show data. This needs the user's `POSTHOG_PERSONAL_API_KEY` / `POSTHOG_PROJECT_ID` in `.env.local`. If they are missing, add a `checkpoint:human-action` for the user to add them. Never read or print `.env.local`.
- **D-10:** If PostHog data is empty or broken (see the pending "admin analytics dashboard showing zero data" todo), the review **reports the gap**: which drop-off points could not be measured and why. The phase does not diagnose or fix PostHog. The fix stays in its existing todo and may itself be ranked as a next-bet candidate on evidence.
- Respect the project rule that PostHog funnels must not mix user-scoped events with guild-scoped milestone events (different distinct-id spaces).
- **D-11:** "Meaningful impressions" and "weak CTR" are **data-relative** thresholds, derived from the site's own distribution (e.g. an impression floor, and CTR below the site's median for the position 4 to 20 band). The rule is **written down in the review before candidates are listed**, so pages aren't cherry-picked.
- **D-12:** Search Console window: the **sprint window Aug 24 to Sep 24, 2026** (explicit dates, never "last N days"), compared against the Aug 24 to 30 baseline week using the committed baseline export. Reuse the query clusters (brand/competitor/problem/expansion) from `gsc_clusters.py`.

**Review document and next-bet handoff**
- **D-13:** The review is `06-REVIEW.md` in the phase folder (internal, not published). Every number traces back to a committed query or export under `scripts/analytics/` (e.g. `scripts/analytics/exports/`, with a provenance row in its `README.md`, following the Phase 1 convention).
- **D-14:** Next bet: the review ranks **2 to 3 candidates** with the supporting evidence (queries, impressions and CTR, AI-answer errors, funnel drop-off) and recommends one. A **`checkpoint:decision` sign-off** lets the user approve or swap it. The approved bet is then captured as a **pending todo** under `.planning/todos/pending/` for the next milestone. It is not added as a roadmap phase in this milestone.
- **D-15:** Candidate pool: bets surfaced by the data, plus the existing SEO todos (the "loot list" query cannibalization between changelog and homepage, and the /compare snippet rework) and a possible WoW Forever landing page, **only if the data supports them**. Each candidate is one page or content piece. Apply the sprint rule "improve the page already earning impressions before creating a new page for a near-duplicate query." Product features (e.g. WoW Forever data support) are not eligible as the bet.
- **D-16:** The case study (EVID-05, blocked on the user interview) is listed as **open sprint carry-over**, not as a next-bet candidate.
- Copy voice rules apply to any user-facing wording that ends up in the next-bet todo: no em dashes.

### Claude's Discretion
- Exact SQL for the source-row cohort reconstruction, and whether it lives as a new saved query next to `scripts/analytics/queries/`.
- Exact data-relative threshold formula (D-11), provided it is stated before candidates are listed.
- Structure and section order of `06-REVIEW.md`, and the ranking rubric for next-bet candidates.
- Whether the Search Console pull reuses `pull-gsc.py` / `gsc_export.py` as-is or adds a page-dimension export, as long as dates are explicit.

### Deferred Ideas (OUT OF SCOPE)
- Publishing a public sprint recap page: a new capability, not in this phase.
- Diagnosing or fixing the PostHog admin dashboards: stays in its existing todo (D-10).
- Adding the next bet as a roadmap phase: it goes to a pending todo for the next milestone instead (D-14).
- Case study publication (EVID-05): remains blocked on the user interview and is tracked as carry-over (D-16).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MEAS-03 | Week-4 review compares the Sep 18–24 cohort to the Aug 24–30 baseline and selects the next bet from observed queries | This research documents (1) the exact source-row reconstruction for "activated"/"qualified" per D-02, with an explicit reproducibility verdict per condition; (2) the existing GSC/PostHog/AI-answer tooling and the small extensions each needs; (3) a proposed data-relative threshold rule for D-11; (4) a ranking rubric and todo-capture format for the next bet (D-14/D-15). |
</phase_requirements>

## Summary

Phase 6 is an internal, read-only analytics phase: no new UI, no new product code, no new npm/pip packages. Its hardest technical question — D-02's source-row cohort reconstruction — has a **split verdict**: the headline metric (**activated**) is faithfully reconstructable from source rows with a 7-day window; the secondary metric (**qualified**) is only **partially** reconstructable, with one condition (schedule configuration) that cannot be pinned to a precise point in time from the current schema. This must be stated in `06-REVIEW.md`, not silently smoothed over.

Everything else in this phase is gluing together already-built, tested, stdlib-only Python tooling (`run-research-report.py`'s Management-API pattern, `pull-gsc.py`, `pull-posthog.py`, `log-ai-answer.py`) with two small, additive extensions: a page+query combined GSC export, and an `error_type` column on the AI-answer log. No existing script needs to be broken or rewritten; two need a small, backward-compatible addition, and one new lightweight query-runner script is needed for the Phase 6-specific SQL (the existing `run-research-report.py` is tightly coupled to the `wow-classic-loot-systems-2026` report's publish pipeline — same *pattern*, different *purpose*).

**Primary recommendation:** Reuse `run-research-report.py`'s Management-API pattern (Keychain token, curl-like User-Agent, forbidden-column and window-literal guards) in a new, smaller script under `scripts/analytics/` dedicated to the Phase 6 cohort queries, writing aggregate-only output to `scripts/analytics/exports/`. Do not force the cohort queries through `research_report.py`'s `metrics.json`/`published-findings.txt` machinery, which exists specifically to gate the public `/research` report page and does not fit an internal review document.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Cohort activation/qualification reconstruction | Database / Storage (Supabase Postgres via Management API) | Scripts (`scripts/analytics/`) | The definition lives in `utils/analytics/funnel.ts` (application code) but must be recomputed from committed SQL against source tables, not from the app's live-evaluated milestone stamps |
| Search Console page/query performance | External Service (Google Search Console API) | Scripts (`pull-gsc.py`) | GSC is the sole source of truth for impressions/CTR/position; the app has no local copy |
| PostHog funnel/CTA drop-off | External Service (PostHog HogQL API) | Scripts (`pull-posthog.py`) | Same pattern; PostHog holds both guild-scoped milestone events (`groups: {guild: guildId}`) and user-scoped landing/CTA events (anonymous `distinctId`) in separate identity spaces |
| AI-answer log comparison | Scripts (local CSV, `ai-answer-log.csv`) | Human (browser sessions, `RUNBOOK.md`) | The data only exists because a human manually runs 18 prompts each week; the script only validates and appends |
| Review document and next-bet decision | Docs (`06-REVIEW.md`, phase folder) | Human (`checkpoint:decision`) | Internal artifact, not a served page; no Frontend/API tier involvement at all |

## Standard Stack

### Core
No new libraries. This phase is 100% additive to the existing stdlib-only Python analytics toolchain already used by Phases 1, 3, and 5.

| Tool | Version | Purpose | Why Standard (for this repo) |
|------|---------|---------|-------------------------------|
| Python 3 stdlib (`argparse`, `csv`, `json`, `urllib.request`, `subprocess`, `unittest`) | system Python 3 | All `scripts/analytics/*.py` tooling | [VERIFIED: scripts/analytics/run-research-report.py:36-38, pull-gsc.py:25-26, pull-posthog.py:17] Every existing analytics script's docstring states "stdlib only — no node, no google client libraries, no pip packages." This phase must follow the same rule. |
| Supabase Management API (`api.supabase.com/v1/projects/{ref}/database/query`) | n/a (HTTP API) | Production-DB read access for the cohort SQL | [VERIFIED: scripts/analytics/run-research-report.py:77] `MANAGEMENT_API = "https://api.supabase.com/v1/projects/{ref}/database/query"`; the sole prod-read mechanism in this repo (no Supabase keys in `.env.local`). |
| Google Search Console `searchAnalytics.query` (Webmasters v3) | n/a (HTTP API) | Page/query impressions, CTR, position | [VERIFIED: scripts/analytics/pull-gsc.py:70-73] `"https://www.googleapis.com/webmasters/v3/sites/" + ... + "/searchAnalytics/query"` |
| PostHog HogQL Query API | n/a (HTTP API) | Funnel/CTA drop-off, milestone event counts | [VERIFIED: scripts/analytics/pull-posthog.py:41] `f"{host}/api/projects/{project}/query/"` with `{"query": {"kind": "HogQLQuery", "query": query}}` |

### Supporting
No new supporting libraries are needed.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| A new lightweight query-runner script | Extending `run-research-report.py`'s `metrics.json`/`published-findings.txt` publish pipeline to cover Phase 6 queries too | Rejected: that pipeline is purpose-built to gate what the **public** `/research` page can state (D-01 selection menu, k-anonymity floor merge into the JSON artifact, `public/research/` output paths). Phase 6's output is an **internal** review document with no publish/withhold selection ceremony — forcing it through that machinery adds coupling with no benefit. |
| Recomputing "qualified" precisely at day 7 | Accepting `guild_funnel_milestones.qualified_at`/`activated_at` timestamps as-is | Rejected by D-02 explicitly: pre-migration guilds (created before 2026-08-27) carry late/missing stamps, confirmed by the existing pitfall comment in `06-funnel-cohort-coverage.sql`. |

**Installation:** None. No `npm install` or `pip install` required.

**Version verification:** N/A — no new package dependencies; only HTTP calls to already-integrated external APIs (Supabase Management API, GSC, PostHog) using the same auth mechanisms already committed and working in Phases 1, 3, and 5.

## Package Legitimacy Audit

**Not applicable.** This phase installs no new npm or pip packages. All tooling reuses the existing stdlib-only Python scripts under `scripts/analytics/` and the project's existing npm dependencies (none of which are touched). No `package-legitimacy check` run was needed.

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────────────────────────┐
                    │  Human operator (checkpoint:human-action)    │
                    │  runs 18 AI-answer prompts (D-05/D-06)        │
                    └───────────────────┬───────────────────────────┘
                                        │ python3 log-ai-answer.py (per cell)
                                        ▼
                         scripts/analytics/ai-answer-log.csv  (append-only)
                                        │
                                        │ read + filter by date (baseline vs week-4)
                                        ▼
┌──────────────────┐   Management API   ┌─────────────────────────┐
│ Supabase Postgres │◄──────────────────│ new cohort-query runner  │
│ (production)      │  POST /database/  │ (Keychain token,         │
│ guilds,           │  query             │  curl/8.7.1 UA,          │
│ guild_settings,    │                    │  window/forbidden-       │
│ character_guild_   │                    │  column guards reused)   │
│ memberships,       │                    └────────────┬─────────────┘
│ loot_submissions,   │                                │ writes aggregate JSON/CSV
│ raid_events,        │                                ▼
│ attendance_records,│                    scripts/analytics/exports/
│ loot_history        │                    (+ provenance row in README.md)
└──────────────────┘                                │
                                                     │
┌───────────────────┐  Search Analytics  ┌──────────┴─────────────┐
│ Google Search      │◄───────────────────│ pull-gsc.py             │
│ Console API        │  query API         │ (--start/--end explicit,│
│ (getlootlist.com)  │                    │  --dimension page|query,│
│                     │                    │  extension: page+query) │
└───────────────────┘                    └──────────┬─────────────┘
                                                     │ CSV
                                                     ▼
                                        scripts/analytics/exports/
                                        gsc-*-2026-08-24_2026-09-24.csv

┌───────────────────┐   HogQL query API  ┌──────────────────────────┐
│ PostHog project    │◄───────────────────│ pull-posthog.py           │
│ (guild groups +     │                    │ (extended: funnel/CTA     │
│  person events,     │                    │  HogQL queries against    │
│  separate identity   │                    │  dashboards 2036463-6)    │
│  spaces)             │                    └──────────┬────────────────┘
└───────────────────┘                                │ committed query text + output
                                                     ▼
                                        scripts/analytics/exports/
                                                     │
                    ┌────────────────────────────────┴───────────────────────┐
                    │  All four data sources feed the internal review          │
                    │  06-REVIEW.md (never published outside phase folder)     │
                    │  → ranks 2-3 next-bet candidates                          │
                    │  → checkpoint:decision (user approves/swaps)              │
                    │  → approved bet captured as .planning/todos/pending/*.md  │
                    └────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
scripts/analytics/
├── queries/
│   ├── wow-classic-loot-systems-2026/   # existing (Phase 3, public report) — do not touch
│   └── week-4-review/                    # NEW: Phase 6 cohort SQL, mirrors the existing
│       ├── activated-cohort.sql          #   metric-id/label/columns/window header
│       ├── qualified-cohort.sql          #   convention from research_report.py's
│       └── cohort-denominator.sql        #   parse_query_header()
├── run-cohort-query.py                   # NEW: thin Management-API runner (D-02/D-13),
│                                          #   reuses get_access_token()/run_sql() pattern
├── test_run_cohort_query.py              # NEW: unit tests for any pure assembly logic
├── pull-posthog.py                        # EXTEND: add funnel/CTA HogQL queries (D-09)
├── pull-gsc.py / gsc_export.py            # EXTEND (small): page+query combined dimension
├── log-ai-answer.py                       # EXTEND (small, additive): error_type column (D-08)
└── exports/
    ├── README.md                          # add provenance rows for every new export
    ├── gsc-sprint-window-*.csv            # NEW: Aug 24 - Sep 24 explicit-date pulls
    └── posthog-funnel-*.{json,csv}        # NEW: committed HogQL query + output
```

### Pattern 1: Management API query runner (reuse, don't extend, `run-research-report.py`)
**What:** A short Python script that reads a `.sql` file, POSTs its verbatim text to the Supabase Management API using a Keychain-sourced token and a curl-like `User-Agent`, and writes an aggregate-only artifact.
**When to use:** Any new production-read query this phase needs (cohort activation/qualification counts, cohort denominators).
**Example:**
```python
# Source: scripts/analytics/run-research-report.py:107-144 (read this session)
def get_access_token() -> str:
    """Reads the Supabase personal access token from the macOS Keychain.
    Never logged, never written to any file, never placed in a URL."""
    return subprocess.check_output(
        ["security", "find-generic-password", "-s", "Supabase CLI", "-w"]
    ).decode().strip()

def run_sql(project_ref: str, token: str, sql: str):
    req = urllib.request.Request(
        MANAGEMENT_API.format(ref=project_ref),
        data=json.dumps({"query": sql}).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "curl/8.7.1",   # required: default urllib UA is blocked by
                                            # Cloudflare (HTTP 403, error code 1010)
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        raise RuntimeError(f"Management API error (HTTP {e.code}): {body}") from None
```
`DEFAULT_PROJECT_REF = "zjnhjstbqekudlsozsvi"` [VERIFIED: scripts/analytics/run-research-report.py:76]. The new Phase 6 runner should import/copy this exact `get_access_token()`/`run_sql()` pair (12 lines, no external state) rather than importing `run-research-report.py` itself, since that module's `main()` is hard-wired to `public/research/` output paths and the `metrics.json` registry.

### Pattern 2: Query-header guards (reuse from `research_report.py`)
**What:** `parse_query_header()`, `assert_window_literals()`, `assert_no_forbidden_columns()` — pure, already-tested functions with zero coupling to the publish pipeline.
**When to use:** Every new `.sql` file this phase adds, to keep the same "no interpolated dates, no identity columns" discipline the Phase 3 report established.
**Example:**
```python
# Source: scripts/analytics/research_report.py:114-141 (read this session)
FORBIDDEN_SQL_TOKENS = (
    "character_name", "characters.name", "guilds.name", "guild_name",
    "player_name", ".realm", "battle_net_id", "user_id",
    "discord_server_id", "created_by", "awarded_by", "notes",
)
def assert_window_literals(sql_text, path):
    """Raises ValueError unless both WINDOW_START and WINDOW_END appear
    literally in the SQL body."""
```
These are directly `from research_report import assert_window_literals, assert_no_forbidden_columns, parse_query_header` — importable with no side effects, since `research_report.py` has no module-level network or file I/O at import time. Note: `FORBIDDEN_SQL_TOKENS` and `WINDOW_START`/`WINDOW_END` are module constants scoped to the wow-classic-loot-systems-2026 report's window (`2026-06-01`..`2026-08-31`); the Phase 6 runner needs its **own** window-literal guard (`2026-08-24`/`2026-09-24` sprint window, or the two cohort weeks `2026-08-24`/`2026-08-30` and `2026-09-18`/`2026-09-24`), not the imported constants. Copy the guard *function shape*, not the constants.

### Pattern 3: PostHog Groups vs. person events — two separate identity spaces
**What:** Guild-scoped funnel milestones use a synthetic group-scoped identity (`distinctId: "guild:${guildId}"` plus `groups: {guild: guildId}`); landing/CTA/onboarding events use the browser's real (anonymous or identified) `distinctId`.
**When to use:** Building the D-09 HogQL queries — never join or `UNION` these two event sets on `distinct_id`.
**Example:**
```typescript
// Source: utils/analytics/server.ts:58-78 and utils/analytics/funnel.ts:170-172 (read this session)
// Milestone events (guild-scoped):
client.capture({
  distinctId: userId,              // == `guild:${guildId}` for funnel.ts callers
  event,
  properties: { ...properties, $lib: 'posthog-node', environment: process.env.NODE_ENV },
  ...(guildId ? { groups: { guild: guildId } } : {}),
})
```
```typescript
// Landing/CTA events (person-scoped) fire via trackClientEvent, e.g.:
// app/components/landing/LandingHero.tsx:158
trackClientEvent('landing_cta_clicked', { cta: 'hero_create_guild' })
// app/components/CreateGuildModal.tsx:93,357
trackClientEvent('guild_creation_started')
trackClientEvent('guild_creation_completed', { guild_name: ..., expansion, faction, realm })
```
For CTA drop-off (landing_cta_clicked → guild_creation_started → guild_creation_completed → onboarding_viewed → onboarding_guild_joined), query the `events` table filtered by `distinct_id` (PostHog's normal person identity). For the guild-activation funnel (`guild_qualified` → `first_raid_recorded`/`first_loot_awarded` → `guild_activated`), query using the `guild` **group** (`groups.guild`), not `distinct_id`. HogQL supports both `person_id`/`distinct_id` filtering and the `events.$group_0` (or equivalent group-key) column for group-scoped queries — confirm the exact HogQL group-column syntax against the live PostHog project at query-writing time (not verified in this session; PostHog's group-query syntax is UI/version-dependent).

### Anti-Patterns to Avoid
- **Falling back to `guild_funnel_milestones.activated_at`/`qualified_at` for the cohort comparison:** Explicitly forbidden by D-02. These columns record *when the evaluator happened to re-run*, not when the condition became true — confirmed both by the code comment in `utils/analytics/funnel.ts:16-22` ("Concurrency note...only ever setting a milestone column once") and by the documented pitfall in `06-funnel-cohort-coverage.sql:6-19`.
- **Filtering `hasRaid` on `attended = true`:** The live evaluator does not do this. `attendanceRes` is `.select('id, raid_events!inner(guild_id)').eq('raid_events.guild_id', guildId).limit(1)` [VERIFIED: utils/analytics/funnel.ts:95-99] — **any** row in `attendance_records` tied to one of the guild's `raid_events` counts, including a `no_call_no_show` or `excused` entry. A reconstruction SQL that adds `AND attended = true` would silently diverge from the product's own definition.
- **Interpolating dates into SQL text at runtime:** Every existing query file in this repo bakes window dates in as literals, checked by `assert_window_literals`. Follow the same discipline for the two Phase 6 cohort weeks so the published (internal) numbers cannot silently drift if the script is re-run later with different CLI flags.
- **Publishing per-guild or per-page-and-day-level PostHog/GSC rows in a committed export without checking counts:** the sprint's privacy floor (≥10 guilds per segment) applies to anything published outside the phase folder; `06-REVIEW.md` itself is internal (D-13), but any export copied into a future public artifact would need the floor re-applied.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Production DB access | A new Supabase client / service-role key wiring for a one-off script | The existing Keychain + Management API pattern (`get_access_token()`/`run_sql()`) | There are no Supabase keys in `.env.local` anywhere in this project [VERIFIED: run-research-report.py:12-15 docstring, cross-confirmed by STATE.md's repeated "Production data access" notes]; this is the *only* prod-read mechanism that exists. |
| Cloudflare 403 on urllib requests to the Management API | Retrying, adding delays, or switching to `requests`/`httpx` | Set `"User-Agent": "curl/8.7.1"` on the request | Already diagnosed and fixed once this sprint [VERIFIED: run-research-report.py:121-127, and STATE.md Phase 3 decision log: "Fixed Cloudflare/urllib User-Agent block (HTTP 403, error code 1010)...by setting a curl-like User-Agent"]. Re-discovering this would waste a full debugging cycle. |
| K-anonymity / small-cohort floor merging | A bespoke "if count < 10, hide it" branch | `apply_floor()` from `research_report.py` (WITHHELD sentinel pattern) if the review ever needs to withhold a segment | Already implemented, tested, and the exact floor value (`GUILD_FLOOR = 10`) matches PROJECT.md's stated privacy floor. Cohort counts themselves (7 vs 5 guilds) are the headline number and are NOT floor-gated per D-04's own worked example, but any further segmentation (e.g., by acquisition channel) inside the cohort would need this. |
| AI-answer log writing | Hand-editing `ai-answer-log.csv` | `log-ai-answer.py` (validates vocabulary, quoting, required fields) | The RUNBOOK explicitly warns: "a `competing_sources` value containing a comma will corrupt columns if the file is hand edited" [VERIFIED: scripts/analytics/RUNBOOK.md:118-121]. |
| GSC OAuth token refresh | A new auth flow | `pull-gsc.py`'s existing `get_access_token()` (refresh-token exchange) plus `.env.local` `GSC_REFRESH_TOKEN` | Already working; STATE.md records the token was "re-minted 2026-08-28, so no 7-day expiry." A `checkpoint:human-action` should still confirm the token is still valid before the Oct 1 run (see Environment Availability). |

**Key insight:** Every piece of infrastructure this phase needs — production DB reads, GSC pulls, PostHog pulls, AI-answer logging, privacy floor application, export provenance — was already built in Phases 1, 3, and 5 and is unit-tested where it's pure logic. The work here is composition (new SQL, new HogQL, two small schema extensions) and analysis, not new plumbing.

## D-02: Source-Row Cohort Reconstruction — Reproducibility Verdict

This is the highest-priority finding. The activation-funnel evaluator [VERIFIED: utils/analytics/funnel.ts, read in full this session] defines:

```typescript
// Source: utils/analytics/funnel.ts:24-25, 78-159 (verbatim, read this session)
const ROSTER_THRESHOLD = 5
const LIST_THRESHOLD = 5
// ...
const qualifiedNow =
  !!guild.active_expansion_id &&
  scheduleConfigured &&
  rosterCount >= ROSTER_THRESHOLD
// scheduleConfigured = raidDayCount > 0 && settingsRes.data?.first_raid_day != null
// rosterCount = COUNT(character_guild_memberships WHERE guild_id=X AND is_active=true)
// approvedLists = COUNT(DISTINCT character_id) FROM loot_submissions WHERE guild_id=X AND status='approved'  (client-side dedup, limit 500 rows)
// hasRaid = EXISTS(attendance_records JOIN raid_events ON raid_event_id WHERE raid_events.guild_id=X)  -- no filter on attended/signed_up
// hasLoot = EXISTS(loot_history WHERE guild_id=X)
if (!m.activated_at && approvedLists >= LIST_THRESHOLD && (hasRaid || hasLoot)) {
  updates.activated_at = now
  // ...
}
```

### Verdict: ACTIVATED (headline metric, D-03) — reconstructable with reasonable fidelity

Every condition in the `activated` definition has a **timestamped source column** that can be bounded to "as of guild.created_at + 7 days":

| Condition | Source table.column | Time-bound field | Faithfulness |
|---|---|---|---|
| ≥5 distinct characters with an approved loot submission | `loot_submissions` (`status='approved'`, `COUNT(DISTINCT character_id)`) | `COALESCE(reviewed_at, submitted_at)` [VERIFIED: lib/database.types.ts:1491-1520, columns `reviewed_at`, `submitted_at`, `status`, `character_id`, `guild_id` all present] | High. This is the exact same `COALESCE` convention the Phase 3 report already uses for "when an approved list counts" [VERIFIED: scripts/analytics/queries/wow-classic-loot-systems-2026/01-sample-definition.sql:18-19]. `status` is *current* status (if a list was later un-approved, that history is lost — acceptable, minor edge case). |
| At least one raid attendance record OR one loot award | `attendance_records` JOIN `raid_events` (existence only, no `attended` filter) OR `loot_history` (existence only) | `raid_events.raid_date` [VERIFIED: lib/database.types.ts:1622-1635, column `raid_date` present, `is_skipped` also present] or `loot_history.awarded_date` [VERIFIED: lib/database.types.ts:1207-1223, column `awarded_date` present] | High, with one caveat: the live evaluator's `hasRaid` check does **not** filter on `attended=true`, `is_skipped=false`, or any status — merely that a row exists in `attendance_records` for one of the guild's raid events. A faithful reconstruction must reproduce this loosely (do not add `attended=true` or `is_skipped=false` filters the product itself does not apply), though the researcher recommends noting this as a documented interpretation choice in `06-REVIEW.md`, since it means a raid that was later cancelled/skipped-but-still-has-an-attendance-row would count. |

**Proposed reconstruction (for the plan's SQL):**
```sql
-- activated_by_day7(guild_id) :=
--   (SELECT COUNT(DISTINCT ls.character_id) FROM loot_submissions ls
--    WHERE ls.guild_id = g.id AND ls.status = 'approved'
--      AND COALESCE(ls.reviewed_at, ls.submitted_at) <= g.created_at + INTERVAL '7 days') >= 5
--   AND (
--     EXISTS (SELECT 1 FROM attendance_records ar JOIN raid_events re ON re.id = ar.raid_event_id
--             WHERE re.guild_id = g.id AND re.raid_date <= (g.created_at + INTERVAL '7 days')::date)
--     OR EXISTS (SELECT 1 FROM loot_history lh
--                WHERE lh.guild_id = g.id AND lh.awarded_date <= (g.created_at + INTERVAL '7 days')::date)
--   )
```

### Verdict: QUALIFIED (secondary metric, D-03) — **cannot be reconstructed with full fidelity from source rows; propose closest faithful approximation**

```typescript
// Source: utils/analytics/funnel.ts:133-136 (verbatim)
const qualifiedNow =
  !!guild.active_expansion_id &&
  scheduleConfigured &&
  rosterCount >= ROSTER_THRESHOLD
```

| Condition | Source column(s) | Point-in-time reconstruction? | Gap |
|---|---|---|---|
| `active_expansion_id` set | `guilds.active_expansion_id` | **No dedicated timestamp column exists.** [VERIFIED: lib/database.types.ts:1106-1120] `guilds` Row has `active_expansion_id`, `created_at`, `created_by`, `discord_server_id`, `faction`, `icon_url`, `id`, `is_active`, `name`, `realm`, `require_discord_verification`, `subscription_tier` — **zero occurrences of `updated_at`** in the table (confirmed by direct grep of the type block, count = 0). | The app sets `active_expansion_id: null` at guild creation, then immediately `.update({ active_expansion_id: expansionId })` in the same onboarding request [VERIFIED: app/api/guilds/route.ts:74,110], so for the large majority of guilds the expansion is effectively set at creation time. But a guild can later change expansion via a separate endpoint [VERIFIED: existence of app/api/guilds/change-expansion/route.ts, confirmed via file listing], and nothing in the schema records *when*. Using "current `active_expansion_id IS NOT NULL`" as the day-7 proxy will be correct for guilds that never change expansion (the common case) but cannot distinguish "set at creation" from "set on day 40" for the rare guild that changes it. |
| Schedule configured (`raid_days_per_week > 0 AND first_raid_day IS NOT NULL`) | `guild_settings` | **No.** `guild_settings.updated_at` is bumped by a `BEFORE UPDATE` trigger on **any** column write [VERIFIED: supabase/migrations/20260101000000_baseline_schema.sql:3018, `CREATE OR REPLACE TRIGGER "update_guild_settings_updated_at" BEFORE UPDATE ON "public"."guild_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_guild_settings_updated_at"();`], not only by writes to `raid_days_per_week`/`first_raid_day`. `guild_settings` is a single wide row created at guild-creation time **without** these two columns set [VERIFIED: app/api/guilds/route.ts:144-151, the creation `.insert({...})` supplies `attendance_type`, `rolling_attendance_weeks`, `use_signups`, `signup_weight` only — no `raid_days_per_week`, no `first_raid_day`] — they are set later via a settings-edit flow at an unknown time. | **This is the genuine reproducibility gap.** If a guild configures its schedule on day 2 (bumping `updated_at` to day 2) and then edits an unrelated bonus setting on day 40 (bumping `updated_at` to day 40, since the trigger fires on any UPDATE), a `guild_settings.updated_at <= day7` filter would **wrongly exclude** that guild even though it was actually schedule-configured within 7 days. There is no per-column audit trail: `audit_logs` exists in this schema but its application-level `INSERT`s are only wired up for `loot_history` bulk edits and item-candidate moderation [VERIFIED: `grep -rl "audit_logs"` over app/ lib/ domain/ utils/ returned only `app/(app)/master-sheet/components/ItemCandidateModal.tsx`, `app/api/audit-logs/route.ts`, `app/api/admin/analytics/route.ts`, `app/api/loot-history/bulk/route.ts`, `lib/db.ts`, `domain/types.ts`, `utils/audit/log.ts` — none of which touch `guild_settings` or `guilds`]; it is **not** a database trigger firing on every table, so it cannot be used to backfill this history either. |
| Roster ≥5 active characters | `character_guild_memberships` | **Partial.** `joined_at` exists [VERIFIED: lib/database.types.ts:420-432, columns `character_id`, `guild_id`, `is_active`, `joined_at`, `joined_via`, `membership_status`, `promoted_at`, `role`, `trial_started_at`] and can bound "joined by day 7." `is_active` has no deactivation timestamp, so a member who joined then left cannot be told apart from one currently active as of day 7 if they left *after* day 7 (fine) vs. *before* day 7 (would overcount, since `joined_at` doesn't change). | Minor edge case relative to the schedule-configuration gap; recommend `COUNT(joined_at <= day7)` without an `is_active` filter as the closest faithful reconstruction, noting the small overcount risk explicitly. |

**Recommended disposition for the plan:** Report **activated** as the fully-reconstructed headline metric per D-03/D-04. Report **qualified** using the closest faithful reconstruction above (current `active_expansion_id IS NOT NULL` as a creation-time proxy; `guild_settings.updated_at <= day7` AND current values satisfy the condition, **explicitly labeled as a conservative/undercounting proxy**; `character_guild_memberships.joined_at <= day7` without an `is_active` filter). `06-REVIEW.md` must state this gap in plain language next to the qualified-guild numbers — do not present qualified as equally precise to activated.

### Test/internal/demo guild exclusion — no existing mechanism found

CONTEXT.md flagged this because small denominators make one stray guild material. Checked three places for an existing exclusion mechanism:
1. The Phase 3 report's own `active_guilds` CTE (the closest precedent for "which guilds count") [VERIFIED: scripts/analytics/queries/wow-classic-loot-systems-2026/01-sample-definition.sql, read in full] applies **no** name-based, `created_by`-based, or flag-based exclusion — every guild meeting the OR-definition (raid, loot award, or 5 approved lists in-window) is counted.
2. `app/api/admin/analytics/route.ts` [VERIFIED: grepped for exclude/test/filter/guild patterns, lines 82-96] filters only on `is_active`, no test/demo exclusion.
3. No `is_test`, `is_demo`, or similar boolean column exists anywhere in `guilds` or related tables [VERIFIED: lib/database.types.ts:1106-1120, full column list quoted above has no such column].

**Finding: there is no existing, code-referenced way to exclude test/internal/demo guilds from a cohort count.** [ASSUMED — recommendation, not a verified existing pattern] Propose excluding guilds where `guilds.created_by` matches an id in the `SUPER_ADMIN_IDS` env var [VERIFIED: app/api/admin/clear-all-guilds/route.ts:7, `app/api/discord/post-update/route.ts:30`, `app/api/admin/analytics/route.ts:127` all read `process.env.SUPER_ADMIN_IDS?.split(',')` — this is an existing, already-used admin-identification mechanism] as a defensible heuristic, run as a one-off, **non-committed** manual spot-check (since guild names/created_by cannot appear in any committed export per the privacy floor) before the final cohort count is written into `06-REVIEW.md`. This should be a plan task, not an automated query — the researcher recommends flagging it to the planner as a manual verification step rather than a mechanical filter, since `SUPER_ADMIN_IDS` may not cover every test guild the founder created before that env var existed.

## Query Execution Path (Priority 2)

`run-research-report.py` [VERIFIED: read in full, 502 lines] and `research_report.py` [VERIFIED: read first 150 lines + targeted sections] together implement:
- **Auth:** `get_access_token()` reads a macOS Keychain entry (`security find-generic-password -s "Supabase CLI" -w`) — no secrets in `.env.local`, nothing logged.
- **Transport:** `run_sql()` POSTs verbatim `.sql` file text to the Management API with `User-Agent: curl/8.7.1` (the Cloudflare-403 fix, discovered live in Phase 3).
- **Determinism:** `stable_generated_at()` reuses the previous run's `generated_at` timestamp when nothing else in the artifact changed, so re-running over unchanged production data stays git-clean.
- **Guards:** `assert_window_literals()` (dates must appear literally in the SQL, never interpolated) and `assert_no_forbidden_columns()` (an explicit token blocklist: `character_name`, `guild_name`, `user_id`, `created_by`, `notes`, etc.) run on every query file before it ever reaches production.
- **Output shape:** `build_artifact()`/`write_json()`/`write_csv()` are wired specifically to the public `/research` report's aggregates JSON/CSV shape and `public/research/` output directory — **not** reusable as-is for an internal review.

**Recommendation:** the Phase 6 plan should add a small new script (proposed name: `scripts/analytics/run-cohort-query.py`) that:
1. Imports (not duplicates) `get_access_token()`/`run_sql()`'s *logic* (12 lines, copy or share via a tiny shared module if the planner prefers zero duplication — `research_report.py` has no such helpers today, they live only in `run-research-report.py`, so either copy the two functions or extract them into a new shared module e.g. `scripts/analytics/supabase_mgmt_api.py`).
2. Imports `parse_query_header`, `assert_window_literals`, `assert_no_forbidden_columns` from `research_report.py` directly (these are pure and side-effect-free at import time).
3. Writes aggregate-only JSON/CSV to `scripts/analytics/exports/`, with each new `.sql` file living under a new `scripts/analytics/queries/week-4-review/` directory (mirroring the existing `wow-classic-loot-systems-2026/` convention).
4. Gets its own `test_*.py` beside it per repo convention (only pure logic needs coverage; the network call itself is untested in every existing analytics script, e.g. no test file exists for `pull-gsc.py`, `pull-posthog.py`, or `gsc-auth.py` — only the pure `gsc_clusters.py`/`gsc_export.py` modules have tests).

## Search Console (Priority 3)

`pull-gsc.py` [VERIFIED: read in full, 220 lines] **already supports** everything D-12 needs for a single-dimension pull:
- Explicit `--start`/`--end` dates (not relative windows) — [VERIFIED: pull-gsc.py:100-101, 171-175].
- `--dimension page` as well as `--dimension query` — [VERIFIED: pull-gsc.py:102].
- The 2-3 day GSC lag is already handled for the *default* relative-window path (`date.today() - timedelta(days=3)`) [VERIFIED: pull-gsc.py:174] but is **irrelevant** when `--start`/`--end` are passed explicitly, since D-12 requires the fixed dates Aug 24 – Sep 24, 2026 regardless of "today."
- `coverage_end()` issues a live date-dimension query to discover the *true* final-data end date rather than assuming the lag, and `gsc_export.partial_suffix_path()` appends a `-PARTIAL-through-<date>` marker automatically if the requested window isn't fully final yet — this is the exact same mechanism that produced the committed `gsc-baseline-cohort-query-2026-08-24_2026-08-30.csv` [VERIFIED: scripts/analytics/exports/README.md:41-51].
- Query clustering (`gsc_clusters.cluster_query`, precedence brand > competitor > problem > expansion) is wired in automatically for `--dimension query` exports [VERIFIED: pull-gsc.py:153, gsc_clusters.py:1-52], with existing test coverage (`test_gsc_clusters.py`).

**Gap requiring a small extension:** GSC's `searchAnalytics.query` API supports combined dimensions (e.g. `dimensions: ["page", "query"]`), and `pull-gsc.py`'s internal `query()` function already accepts an arbitrary `dimensions` list [VERIFIED: pull-gsc.py:68-81, the function signature takes a `body` dict, `write_export()` calls it with `{**base, "dimensions": [args.dimension]}`], but the **CLI only exposes a single dimension** (`--dimension` is `choices=["query", "page"]` [VERIFIED: pull-gsc.py:102]) and `gsc_export.py`'s CSV headers are single-dimension only (`CSV_HEADER_QUERY`, `CSV_HEADER_PAGE`) [VERIFIED: gsc_export.py:12-13]. Success criterion 2 ("names the **pages** that have meaningful impressions at positions 4 to 20 with weak CTR") is inherently a **query-level** signal (position/CTR are per-query, not meaningfully averaged at the page level) that needs to be **rolled up to pages** — this requires the combined `["page", "query"]` dimension so each row carries both.

**Proposed small extension:** add a `--dimension page-query` choice to `pull-gsc.py` that requests `dimensions: ["page", "query"]`, plus a `CSV_HEADER_PAGE_QUERY = ["page", "query", "clicks", "impressions", "ctr", "position", "cluster"]` header in `gsc_export.py`. This is additive (new choice, new header constant) and does not change either existing single-dimension path.

**Proposed D-11 threshold rule (data-relative, to be written into `06-REVIEW.md` before candidates are listed):**
> Within the position 4–20 band of the Aug 24–Sep 24, 2026 page+query export: "meaningful impressions" = at or above the **band's own median impression count**; "weak CTR" = below the **band's own median CTR**. A candidate page qualifies if it has at least one query row meeting both thresholds.

This directly implements CONTEXT.md's own phrasing ("an impression floor, and CTR below the site's median for the position 4 to 20 band") [CITED: 06-CONTEXT.md D-11] using a self-relative median rather than an arbitrary fixed number, so it cannot be tuned after candidates are seen.

**GSC credentials status:** STATE.md records the OAuth blocker as resolved: "user recreated the OAuth client (Testing mode, added as test user), authorized via `scripts/analytics/gsc-auth.py`... `pull-gsc.py` verified a full pull. App published to production and token re-minted 2026-08-28, so no 7-day expiry." [CITED: STATE.md Blockers/Concerns section] This was not re-verified this session (`.env.local` was never read, per the hard constraint). Recommend a `checkpoint:human-action` confirming the pull still works before the Oct 1 write-up, since nearly a month will have passed.

## PostHog Funnel / CTA Drop-off (Priority 4)

`pull-posthog.py` [VERIFIED: read in full, 96 lines] today runs three fixed HogQL queries (top pages, top referrers, top entry pages) against the raw `events` table filtered on `event = '$pageview'`. It has no funnel-specific or CTA-specific queries yet, and no test file exists for it (network-calling glue code, consistent with the repo's untested-glue-code / tested-pure-logic convention seen elsewhere).

**Event names identified for the CTA/landing funnel** (all fire via `trackClientEvent`, user/browser-distinct-id scoped): `landing_cta_clicked` (with `cta` values including `hero_create_guild`, `nav_start_free`, `bottom_get_started`) [VERIFIED: app/components/landing/LandingHero.tsx:158, LandingNav.tsx:118, LandingCTA.tsx:83], `guild_creation_started`, `guild_creation_completed` [VERIFIED: app/components/CreateGuildModal.tsx:93,357], `onboarding_viewed`, `onboarding_guild_joined` (with `join_method` of `discord` or `invite_code`) [VERIFIED: app/components/WelcomeScreen.tsx:150,182,208,226].

**Event names identified for the guild-activation funnel** (server-side, group-scoped): `raid_schedule_configured`, `loot_settings_completed`, `roster_threshold_reached`, `guild_qualified`, `first_raid_recorded`, `first_loot_awarded`, `guild_activated` [VERIFIED: utils/analytics/server.ts:36-43 `AnalyticsEvent` union type, and utils/analytics/funnel.ts:118-159 where each is fired].

**Identity-space separation (verified in code, not just asserted by CONTEXT.md):** milestone events use `distinctId: "guild:${guildId}"` plus `groups: { guild: guildId }` [VERIFIED: utils/analytics/funnel.ts:171 `trackEvent({ event: e.event, userId: \`guild:${guildId}\`, guildId, properties: e.properties })`, and utils/analytics/server.ts:63-72 shows this becomes `distinctId: userId` + `groups: {guild: guildId}` in the PostHog `capture()` call]; CTA/landing events use the real browser identity via `trackClientEvent` (client-side, presumably PostHog's default anonymous-then-identified distinct_id — the client-side `trackClientEvent` implementation itself was not read this session, only its call sites). **Never join these two event sets on `distinct_id`** — use `groups.guild` (or PostHog's documented group-filter HogQL syntax) for the milestone/activation funnel, and `distinct_id`/`person_id` for the CTA funnel, as two separate queries.

**Dashboard IDs 2036463–2036466:** no dashboard-definition file, setup script, or further reference exists anywhere in the repo beyond the one line in `PROJECT.md` ("four pinned PostHog dashboards (2036463–2036466)") [VERIFIED: grep across the repo for the four IDs returned only PROJECT.md and 06-CONTEXT.md]. **This is a gap**: the exact panels/queries behind these dashboard IDs cannot be confirmed from the repo; they must be inspected live in the PostHog UI (read-only, a human or the assistant via screenshot) or reconstructed from the event names above. [ASSUMED] that the four dashboards correspond to: (1) acquisition/landing traffic, (2) CTA click-through, (3) guild-creation funnel, (4) activation-milestone funnel — inferred from the `AnalyticsEvent` union's own section comments ("Premium funnel," "Activation funnel milestones") rather than confirmed against the live dashboards.

**Risk of empty PostHog data (D-10):** the pending todo confirms Blog/Funnel/Traffic sections of `/admin/analytics` already show zero/empty data as of 2026-08-29, while Guilds/Revenue tabs (which read straight from the database, not PostHog) show real numbers [VERIFIED: .planning/todos/pending/2026-08-29-fix-admin-analytics-dashboard-showing-zero-data.md]. The todo's own hypothesis is "missing/wrong PostHog API key or project ID for this environment, events that were never actually instrumented client-side, or a query/date-range filter that's excluding all real events" — unresolved as of this research session. **The plan must budget for D-10's "report the gap" outcome as a real possibility, not an edge case**, and should sequence the PostHog pull *before* drafting `06-REVIEW.md`'s funnel section so the gap (if any) is known before the section is written, not discovered after.

## AI-Answer Rerun (Priority 5)

`ai-answer-log.csv` currently has exactly the 18 baseline rows, all dated `2026-08-28` [VERIFIED: read in full, 19 lines including header]. Schema (header row, verbatim): `date,ai_surface,prompt_id,lootlist_appeared,factually_correct,cited_url,competing_sources,notes` [VERIFIED: scripts/analytics/ai-answer-log.csv:1] — **no `error_type` column exists**. `log-ai-answer.py`'s `HEADER` constant matches this list exactly [VERIFIED: scripts/analytics/log-ai-answer.py:23-32].

**D-08 requires an error-type annotation** ("not mentioned, wrong price or plan, outdated feature claim, wrong category, etc.") on every miss/error, plus the cited URL (already present). **Minimal, backward-compatible extension:** append `error_type` as a new optional column at the end of `HEADER`, add a `--error-type` CLI flag (default `""`) to `log-ai-answer.py`, and add it as an optional key in `validate_row`'s vocabulary check (empty string allowed; a small fixed vocabulary like `not_mentioned`, `wrong_price_or_plan`, `outdated_feature_claim`, `wrong_category`, `other` recommended, mirroring the `factually_correct`/`lootlist_appeared` vocabulary-check pattern already in the file). Because `append_row()` writes `[row.get(column, "") for column in HEADER]` [VERIFIED: log-ai-answer.py:125], adding a new `HEADER` entry is safe for new rows; the file's **existing header row** (written once at file creation, currently missing the new column) needs a one-line edit to add `error_type` so future `csv.DictReader` reads stay column-aligned — this is a small, mechanical migration step, not a schema redesign.

**Baseline-row identification:** trivial — every existing row has `date == "2026-08-28"`. A comparison-grid script can `csv.DictReader` the file, `filter(rows, date == "2026-08-28")` for baseline and `filter(rows, date == <week-4 date>)` for the rerun, then group by `(ai_surface, prompt_id)` to build the 6×3 grid. This is a new small pure-logic script (testable, following the repo's convention), not an extension of `log-ai-answer.py` itself (which is append-only and has no read/report mode beyond `read_rows()`).

**D-07's "2 of 3 surfaces" rule** is a pure aggregation over the grid: for each `prompt_id`, count surfaces where `lootlist_appeared == "yes" AND factually_correct == "yes"`; `>= 2` means "returns LootList+ correctly." (`factually_correct == "partial"` should NOT count per D-07's plain reading of "correct facts" — recommend the planner confirm this interpretation explicitly in the review, since the baseline log already has at least one `partial` row (`P6/chatgpt`) that would be a judgment call.)

## Next-Bet Inputs (Priority 6)

**Todo file format** [VERIFIED: read three existing pending todos in full]: YAML frontmatter (`created` ISO timestamp, `title`, `area`, `severity`, `files` list) followed by `## Problem` and `## Solution` markdown sections. The approved next bet should be captured in this exact shape under `.planning/todos/pending/`, dated at capture time, with `area: seo` (or `area: content`) and `files:` pointing at the target page's route.

**Candidate pool status (from this session's reading, to inform — not replace — the live GSC/AI-answer data the plan will pull):**
- `2026-08-28-fix-loot-list-query-cannibalization-changelog-vs-homepage.md`: still pending (not completed in Phase 2 despite being scoped there) [VERIFIED: file present in `.planning/todos/pending/`]. Evidence already on file: "loot list" query, 597 impressions/59% of site impressions, position 7.3, 1.0% CTR, landing on `/changelog` not the homepage.
- `2026-08-28-rework-compare-page-search-snippet-for-competitor-queries.md`: still pending [VERIFIED: file present]. Evidence on file: "tmb loot"/"tmb loot system" queries at 0% CTR, `/compare` at 1.31% CTR overall; Claude cites `/compare` in 3/6 baseline answers (content works for AI, snippet doesn't convert humans).
- WoW Forever: the existing pending todo (`2026-09-13-...`) is scoped as a **product-data feature** (repeatable expansion-onboarding format, item verification gates), explicitly **not** a landing page, and is **ineligible as the bet under D-15** ("Product features...are not eligible as the bet"). A *separate*, narrower "WoW Forever landing page" candidate would need its own search-demand evidence (queries mentioning "WoW Forever," "Classic Plus," etc.) in the Sep 24 GSC pull — none exists yet in any committed export read this session, since the announcement was 2026-09-12, inside the sprint window but very recent. [ASSUMED] this candidate will likely show low-to-no query volume by Sep 24 and should be treated skeptically unless the data clearly supports it.

**Proposed ranking rubric** (Claude's discretion per CONTEXT.md, to be finalized in `06-REVIEW.md`):
| Axis | 0 | 1 | 2 |
|---|---|---|---|
| Search demand (GSC) | No queries clear the D-11 threshold | Some position 4-20 queries clear it | Multiple queries, high combined impressions |
| AI-answer evidence | No related error/miss in the week-4 grid | One surface's error maps to this candidate | Multiple surfaces/prompts map to this candidate |
| Funnel/CTA relevance | No connection to a measured drop-off point | Loosely related | Directly sits at a measured drop-off point |
| Effort vs. "improve existing page" rule | Requires a brand-new page for a near-duplicate query | New page, but no existing page competes | Improves an already-earning page (sprint's stated preference) |

Highest total wins; ties broken toward the "improve existing page" axis per the sprint's own stated rule.

## Common Pitfalls

### Pitfall 1: Treating `guild_funnel_milestones` timestamps as ground truth
**What goes wrong:** Cohort counts computed from `qualified_at`/`activated_at` undercount pre-migration guilds (created before 2026-08-27) whose stamps only reflect a later incidental re-evaluation.
**Why it happens:** The evaluator is fire-and-forget, invoked opportunistically after mutations, not backfilled historically [VERIFIED: utils/analytics/funnel.ts:5-22 docstring].
**How to avoid:** Always recompute from source rows per the D-02 verdict above.
**Warning signs:** A cohort count that looks suspiciously low for guilds created near the start of the measurement window.

### Pitfall 2: Silently narrowing `hasRaid` with an `attended=true` filter
**What goes wrong:** Reconstruction SQL undercounts activation relative to the live product definition.
**Why it happens:** It's the intuitive filter to add; the live code deliberately does not apply it.
**How to avoid:** Match the exact existence check in `utils/analytics/funnel.ts:95-99` (verbatim, quoted above).
**Warning signs:** Reconstructed activation counts lower than what a spot-check of a known-activated guild would suggest.

### Pitfall 3: Using `guild_settings.updated_at` as if it were per-column
**What goes wrong:** Treating "qualified" as precisely reconstructable when it isn't; publishing a false-precision number.
**Why it happens:** `updated_at` looks like exactly the right column at a glance.
**How to avoid:** Explicitly label the qualified-guild reconstruction as a conservative proxy in `06-REVIEW.md`, per the D-02 verdict section above.
**Warning signs:** A "qualified" count noticeably lower than "activated" for the same cohort (physically nonsensical, since activation implies a subset of qualification conditions in spirit, though the code paths are independent) with no caveat attached.

### Pitfall 4: Running the cohort query before Oct 1 (or before Sep 24 GSC data is final)
**What goes wrong:** Publishing a partial-cohort number that later needs correction, exactly the Phase 1 baseline-export mistake (`-PARTIAL-through-2026-08-26` re-pulled later).
**Why it happens:** Time pressure near the sprint's calendar-bound window (Sep 20-24).
**How to avoid:** D-01's explicit Oct 1 gate; the plan must include a dated `checkpoint` task, not just a note.
**Warning signs:** Any temptation to "run it now and refresh later" — Phase 1's `exports/README.md` documents exactly this happening once already and needing a superseding re-pull.

### Pitfall 5: Assuming `pull-posthog.py`'s existing queries answer D-09
**What goes wrong:** Discovering mid-write-up that none of the three existing HogQL queries (top pages, top referrers, top entry pages) touch funnel or CTA data at all.
**Why it happens:** The script's name suggests general PostHog capability; its actual query set is narrow (page-view traffic only).
**How to avoid:** Budget real implementation time for new HogQL queries against `guild_qualified`/`first_raid_recorded`/`first_loot_awarded`/`guild_activated` (group-scoped) and `landing_cta_clicked`/`guild_creation_started`/`guild_creation_completed`/`onboarding_guild_joined` (person-scoped), not a one-line extension.
**Warning signs:** Treating D-09 as "just run the existing script."

## Code Examples

### Reading the Keychain-backed Management API token (reuse verbatim)
```python
# Source: scripts/analytics/run-research-report.py:107-113 (read this session)
def get_access_token() -> str:
    return subprocess.check_output(
        ["security", "find-generic-password", "-s", "Supabase CLI", "-w"]
    ).decode().strip()
```

### Appending an AI-answer cell with the (proposed) new error_type flag
```python
# Pattern extrapolated from the existing log-ai-answer.py CLI shape
# (scripts/analytics/log-ai-answer.py:142-170, read this session)
python3 scripts/analytics/log-ai-answer.py \
  --date 2026-09-27 --surface chatgpt --prompt-id P6 \
  --appeared no --correct n/a --cited-url "" \
  --error-type not_mentioned \
  --competing-sources "thatsmybis.com" \
  --notes "no mention of LootList+ in week-4 rerun"
```

### Pulling the explicit-date GSC sprint window (page dimension, already supported)
```bash
# Source: scripts/analytics/pull-gsc.py CLI shape, verified this session
python3 scripts/analytics/pull-gsc.py --start 2026-08-24 --end 2026-09-24 \
  --dimension page --csv gsc-sprint-window-page-2026-08-24_2026-09-24.csv
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The four pinned PostHog dashboards (2036463-2036466) correspond to acquisition/landing traffic, CTA click-through, guild-creation funnel, and activation-milestone funnel | PostHog Funnel / CTA Drop-off | If wrong, the proposed HogQL queries may not match what the dashboards actually visualize, weakening the "dashboards are a visual cross-check" requirement in D-09. Low-cost to verify: open the four dashboards in the PostHog UI before writing queries. |
| A2 | `trackClientEvent`'s underlying PostHog client-side `distinctId` behavior (anonymous vs. identified) was not read this session — assumed to be PostHog's standard person-scoped identity, distinct from the `guild:${guildId}` synthetic identity | PostHog Funnel / CTA Drop-off, Pattern 3 | If `trackClientEvent` itself injects some guild-scoped identity, the "never mix identity spaces" guidance would need revision. Low risk: the function is only ever called with event name + properties in every call site read, no distinct-id override observed. |
| A3 | A "WoW Forever landing page" candidate will show low-to-no GSC query volume by Sep 24, 2026 (the announcement was 2026-09-12, 12 days before window close) | Next-Bet Inputs | If wrong (unexpectedly high early search interest), this candidate could rank higher than assumed; the plan should still pull real GSC data rather than trust this assumption, since D-15 requires data support before naming it. |
| A4 | `SUPER_ADMIN_IDS`-based `created_by` filtering is an adequate heuristic for excluding test/internal guilds from the cohort spot-check | D-02, test guild exclusion | If the founder created test guilds under a non-admin account, or if other team members created test guilds, this heuristic misses them; the manual spot-check step is recommended precisely because this heuristic is not guaranteed complete. |
| A5 | Existing PostHog dashboard/group-query HogQL syntax (`groups.guild` or equivalent) was not tested live this session (read-only against the repository, no live PostHog queries per the hard constraints) | Pattern 3 | The exact HogQL syntax for group-scoped filtering may differ from what's sketched here; the plan should verify syntax against the live PostHog project when the human/executor first runs a real query, not assume the sketch is copy-paste-ready. |

## Open Questions

1. **Does the current `guild_settings.updated_at`-based "qualified" proxy undercount enough to matter for the Sep 18-24 vs. Aug 24-30 comparison?**
   - What we know: The mechanism (whole-row trigger) creates a structural undercount risk.
   - What's unclear: Whether, in practice, guilds rarely touch settings again after initial configuration (making the undercount negligible) or commonly do (making it material). No data was pulled this session to check.
   - Recommendation: The plan should run a quick sanity query — for a sample of already-qualified guilds, compare `guild_settings.updated_at` to the earliest raid_events.raid_date or first attendance record — as a gut-check before finalizing the "qualified" number's caveat language.

2. **What do dashboards 2036463-2036466 actually show?**
   - What we know: They exist, were created in Sprint #4 (#245-#246), and cover "acquisition + activation funnel events."
   - What's unclear: The exact panel-by-panel breakdown; no dashboard-export file exists in the repo.
   - Recommendation: A plan task should open them live (human, or via a screenshot review) before finalizing the HogQL query set, to confirm the query set actually reproduces what's pinned.

3. **Is the admin-dashboard zero-data bug (D-10) a PostHog config issue that would also block the D-09 pull, or a bug isolated to the `/admin/analytics` UI's own query code?**
   - What we know: `/admin/analytics`'s Blog/Funnel/Traffic sections show zero data; Guilds/Revenue (DB-backed) work fine.
   - What's unclear: Whether a fresh, correctly-scoped HogQL query via `pull-posthog.py` (bypassing the admin UI's own query-building code entirely) would also return empty, which would point to a genuine PostHog-side data gap rather than a UI bug.
   - Recommendation: Run `pull-posthog.py`'s existing (already-working) top-pages query first as a smoke test — if it returns real traffic numbers, the PostHog project itself is receiving events fine and the admin UI's specific Funnel query is the bug; if it also returns empty, the gap is real and D-10 applies to everything.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| macOS Keychain "Supabase CLI" entry | Cohort SQL (D-02) | Not verified this session (would require running `security find-generic-password`, a live credential read — out of scope for a read-only research pass) | — | None; this is the only prod-read path. A `checkpoint:human-action` should confirm it still works, mirroring Phase 3's own setup note. |
| `GSC_CLIENT_ID`/`GSC_CLIENT_SECRET`/`GSC_REFRESH_TOKEN` in `.env.local` | GSC pull (D-12) | Per STATE.md, resolved 2026-08-28 with no 7-day expiry; not re-verified this session (`.env.local` was never read, per hard constraint) | — | None documented; `checkpoint:human-action` to confirm before Oct 1. |
| `POSTHOG_PERSONAL_API_KEY`/`POSTHOG_PROJECT_ID`/`POSTHOG_HOST` in `.env.local` | PostHog pull (D-09) | Unknown — CONTEXT.md itself flags this as possibly missing ("If they are missing, add a checkpoint:human-action") | — | `checkpoint:human-action` for the user to add them, per D-09's own instruction. |
| Python 3 (stdlib only) | All analytics scripts | Assumed available (every existing script in this repo already depends on it and runs in this environment per STATE.md's completed Phase 1/3/5 work) | System Python 3 | None needed; no version pin observed in any script. |

**Missing dependencies with no fallback:**
- Keychain "Supabase CLI" entry — the sole production-read path; if missing/expired, the cohort query cannot run at all.

**Missing dependencies with fallback (checkpoint:human-action already specified by CONTEXT.md):**
- GSC and PostHog credentials — both have an explicit `checkpoint:human-action` fallback already named in the locked decisions.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Python `unittest` (stdlib), repo convention [VERIFIED: scripts/analytics/test_ai_answer_log.py:11, scripts/analytics/test_research_report.py:11-15] |
| Config file | none — discovery-based |
| Quick run command | `python3 -m unittest discover -s scripts/analytics -p 'test_*.py' -v` |
| Full suite command | same command (this directory's tests run in well under a second; no separate "full" tier observed) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MEAS-03 | Cohort reconstruction SQL assembles correct activated/qualified counts from mocked row sets | unit | `python3 -m unittest scripts.analytics.test_run_cohort_query -v` (or discovery form) | ❌ Wave 0 — new script + new test |
| MEAS-03 | AI-answer 6x3 grid script correctly groups baseline vs. week-4 rows and applies the D-07 "2 of 3" rule | unit | `python3 -m unittest scripts.analytics.test_ai_answer_grid -v` | ❌ Wave 0 — new script + new test |
| MEAS-03 | `error_type` column addition to `log-ai-answer.py` doesn't break existing validation/append behavior | unit | existing `test_ai_answer_log.py`, extended with new cases | ❌ Wave 0 — extend existing file |
| MEAS-03 | D-11 threshold rule (median-of-band) computes correctly on a sample GSC export | unit | new small pure function + test, e.g. `test_gsc_threshold.py` | ❌ Wave 0 — new pure function + test |
| MEAS-03 | `06-REVIEW.md` contains no em dashes | grep-based check | `grep -P '\x{2014}' .planning/workstreams/default/phases/06-week-4-review-next-bet/06-REVIEW.md` (exit 1 = clean) | ❌ Wave 0 — add as a plan verification step, not a Python test |
| MEAS-03 | No guild names/IDs appear in any committed export under `scripts/analytics/exports/` from this phase | grep-based check | reuse `assert_no_forbidden_columns`-style token check, or a manual review step, against new export files before commit | ❌ Wave 0 — extend the forbidden-token guard pattern to the new query files |

### Sampling Rate
- **Per task commit:** `python3 -m unittest discover -s scripts/analytics -p 'test_*.py' -v`
- **Per wave merge:** same (no separate "full suite" tier in this part of the repo)
- **Phase gate:** All new pure-logic scripts (cohort assembly, AI-answer grid, threshold rule) must have passing unit tests before `06-REVIEW.md` is finalized; the network-calling scripts themselves (Management API runner, GSC/PostHog pull extensions) remain untested per existing repo convention (consistent with `pull-gsc.py`/`pull-posthog.py`/`gsc-auth.py` having no test files today).

### Wave 0 Gaps
- [ ] `scripts/analytics/run-cohort-query.py` + `test_run_cohort_query.py` — new script, no existing coverage
- [ ] `scripts/analytics/queries/week-4-review/*.sql` — new query files, need header/window-literal/forbidden-column guard coverage (reuse existing pure guard functions from `research_report.py`)
- [ ] A new AI-answer grid script + test — D-07's 6x3 comparison logic
- [ ] `log-ai-answer.py`'s `error_type` extension + additional test cases in `test_ai_answer_log.py`
- [ ] A new GSC page+query dimension extension (`pull-gsc.py`, `gsc_export.py`) — likely needs at least one new unit test for the new CSV header shape, following `test_gsc_export.py`'s existing pattern
- [ ] A new PostHog HogQL query set for D-09 — inherently untestable without live data (network-calling); document manually instead

*(Framework itself is already installed — Python 3 stdlib `unittest`; no install command needed.)*

## Security Domain

`security_enforcement` is `true` in `.planning/config.json`, `security_asvs_level: 1`. This phase, however, ships **no new user-facing surface, no new authentication/authorization path, and no new external package** — it is read-only production-DB analysis plus two small additive script extensions. The relevant ASVS surface is narrow.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No new auth path; reuses the existing macOS-Keychain-backed Management API token and existing OAuth refresh tokens for GSC/PostHog. |
| V3 Session Management | No | No sessions created or consumed by this phase's tooling. |
| V4 Access Control | No | No new access-control decision; production reads use the same service-role-equivalent Management API token already gated by macOS Keychain access. |
| V5 Input Validation | Yes (narrow) | `log-ai-answer.py`'s `validate_row()` already enforces a fixed vocabulary for `ai_surface`, `prompt_id`, `lootlist_appeared`, `factually_correct`; the proposed `error_type` addition must extend this same validation pattern, not accept free text unchecked. |
| V6 Cryptography | No | No new cryptographic operation; token retrieval reuses the existing Keychain/OAuth mechanisms verbatim. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection via interpolated dates/filters in cohort queries | Tampering | Never interpolate; every query is a static `.sql` file with literal dates, enforced by `assert_window_literals` (reused pattern). All queries run against production via a token with read access only through the Management API's `/database/query` endpoint. |
| Accidental PII/identity leakage in committed exports | Information Disclosure | Reuse `assert_no_forbidden_columns`'s token blocklist pattern for every new `.sql` file; extend the manual review to the new GSC page+query CSV and the PostHog HogQL query output, since neither is covered by the existing Phase 3 guard automatically. |
| Secret leakage via `.env.local` read/print | Information Disclosure | Hard constraint already respected this session (never read/printed); the plan must continue this — credential checks stay at the `checkpoint:human-action` level, never a script that prints or logs the value. |
| Committing a `guild_id` or guild name in the todo capture for the next bet | Information Disclosure | The approved next-bet todo should describe the *page/content piece* and its evidence (queries, impressions, error types) without naming any guild. |

## Sources

### Primary (HIGH confidence — read directly this session)
- `.planning/workstreams/default/phases/06-week-4-review-next-bet/06-CONTEXT.md` — locked decisions, canonical refs
- `.planning/workstreams/default/REQUIREMENTS.md`, `.planning/workstreams/default/STATE.md` — project state, blocker history
- `utils/analytics/funnel.ts` — full activation/qualification definition
- `utils/analytics/server.ts` — event taxonomy, `trackEvent`/PostHog capture shape
- `lib/database.types.ts` — schema for `guilds`, `guild_settings`, `character_guild_memberships`, `loot_submissions`, `raid_events`, `attendance_records`, `loot_history`
- `supabase/migrations/20260827000000_guild_funnel_milestones.sql`, `supabase/migrations/20260101000000_baseline_schema.sql` (targeted `guild_settings` trigger and `audit_logs` sections)
- `scripts/analytics/queries/wow-classic-loot-systems-2026/06-funnel-cohort-coverage.sql`, `01-sample-definition.sql`
- `scripts/analytics/run-research-report.py`, `research_report.py` (partial), `pull-gsc.py`, `gsc_export.py`, `gsc_clusters.py`, `pull-posthog.py`, `log-ai-answer.py`, `RUNBOOK.md`, `ai-answer-log.csv`, `exports/README.md`, `RECRAWL-LOG.md`, `test_ai_answer_log.py`/`test_research_report.py` headers
- `app/api/guilds/route.ts` (creation flow), `app/api/admin/analytics/route.ts` (targeted sections)
- `.planning/todos/pending/*.md` (all 8, three read in full)
- `app/components/landing/*.tsx`, `app/components/CreateGuildModal.tsx`, `app/components/WelcomeScreen.tsx` (grepped for `trackClientEvent` call sites)

### Secondary (MEDIUM confidence)
- PostHog dashboard IDs 2036463-2036466 content/panel mapping — inferred from `PROJECT.md`'s one-line Sprint #4 note and the `AnalyticsEvent` union's section comments, not confirmed against the live PostHog UI.
- PostHog HogQL group-scoped query syntax — sketched from general PostHog Groups knowledge, not verified against the live project (no PostHog API calls made this session, per hard constraints).

### Tertiary (LOW confidence)
- None used as authoritative in this document; all `[ASSUMED]`-tagged claims are logged in the Assumptions Log above rather than stated as fact.

## Metadata

**Confidence breakdown:**
- D-02 cohort reproducibility verdict: HIGH — every claim backed by direct reads of `utils/analytics/funnel.ts`, `lib/database.types.ts`, and the relevant migration/route files, with line-level citations.
- Query execution path / tooling reuse: HIGH — full or near-full reads of every relevant script.
- GSC extension need: HIGH — direct code read confirms the CLI gap.
- PostHog dashboard content and HogQL group-query syntax: MEDIUM — inferred, not confirmed live.
- Next-bet candidate evidence: MEDIUM — todo files give a snapshot as of their capture dates (Aug 28-29); the actual Sep 24 GSC pull may show different numbers.

**Research date:** 2026-09-25
**Valid until:** Most of this research (schema, code, tooling) is stable until the next schema migration or script refactor touches these files — treat as valid through the phase's Oct 1 execution window. The GSC/PostHog credential-availability findings should be re-checked at execution time (they're time-sensitive, not code-stable).
