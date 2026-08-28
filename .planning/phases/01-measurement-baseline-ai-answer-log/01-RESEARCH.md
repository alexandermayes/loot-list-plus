# Phase 1: Measurement Baseline & AI Answer Log - Research

**Researched:** 2026-08-28
**Domain:** Analytics scripting (Google Search Console API via stdlib Python) + repeatable manual test methodology (AI-answer diagnostics) + repo-committed data artifacts
**Confidence:** HIGH for the scripting/API domain, MEDIUM for the AI-answer methodology (sprint plan under-specifies which AI surfaces to test)

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MEAS-01 | GSC baseline is exported and segmented into brand/competitor/problem/expansion query clusters | Confirms `pull-gsc.py`/`gsc-auth.py` current state and gaps; gives exact verbatim cluster keyword lists from the sprint plan; flags the GSC data-lag timing problem that blocks a *complete* Aug 24-30 export today |
| MEAS-02 | Weekly AI-answer test set (6 fixed prompts) has a runbook and a results log recording date, product inclusion, factual accuracy, cited URL | Gives verbatim six prompts; defines log schema and file location; separates automatable (runbook doc) from human-only (actually running the prompts in a browser) work |
</phase_requirements>

## Summary

Phase 1 has two independent deliverables that share almost no code: a Python/GSC data-export problem (MEAS-01) and a documentation-plus-manual-procedure problem (MEAS-02). Both are small in scope — this is not a phase that needs a new framework, a database migration, or a UI. The existing `scripts/analytics/` directory already has 90% of the GSC plumbing (`pull-gsc.py`, and a brand-new untracked `gsc-auth.py` that replaced the old OAuth Playground flow). What's missing is: (1) the script only prints to stdout, has no clustering, and only supports a single trailing-N-days window, not an explicit historical date range; (2) nothing in the repo defines the AI-answer runbook or log at all — those are pure net-new artifacts.

The single most important finding for planning is a **timing constraint that isn't visible from the roadmap**: `pull-gsc.py` already accounts for a 2-3 day GSC data lag (`end = date.today() - timedelta(days=3)`), and today is 2026-08-28. That means the "Aug 24-30 baseline cohort" the success criteria demand **cannot be pulled complete today** — only Aug 24-25 have finalized data as of this research date. A genuinely complete Aug 24-30 export is not obtainable until on/after 2026-09-02. The planner needs to decide now whether Phase 1 ships a script capable of producing the cohort export (parameterized by explicit start/end dates) plus a clearly-labeled *partial* pull today, with a scheduled re-run before Phase 6 (Sep 20-24, which has ample lead time), or whether the cohort-specific commit is deferred as an explicit open item. Do not let a plan quietly assume "pull last 7 days" will produce a real Aug 24-30 number today — it will not.

Second-most important finding: two `.gitignore` rules directly threaten this phase's deliverables if a plan places files carelessly. `docs/` is fully ignored (any runbook placed there is silently never committed), and `scripts/*.md` ignores markdown files **directly** inside `scripts/` (but not inside `scripts/analytics/`, which is one level deeper). The runbook and results log must live under `scripts/analytics/` (or another non-ignored path), not `docs/` or bare `scripts/`.

Third: the sprint plan document names the exact six AI-answer prompts and the exact GSC cluster keyword lists, but it does **not** name which AI products/surfaces to run those prompts against for the weekly test (it only implies ChatGPT and Google's generative features are in scope, elsewhere in the doc). This is a genuine gap the planner should either resolve with the user or make an explicit, clearly-flagged default choice for — it directly determines what the runbook instructs and what the log's `ai_surface` column contains.

**Primary recommendation:** Extend `pull-gsc.py` (or add a small importable module) with explicit `--start`/`--end` date arguments and a `--csv <path>` export flag, plus a pure, unit-testable clustering function using the sprint plan's exact keyword lists; commit both a 3-month trend export and a clearly-labeled Aug 24-25 partial cohort now, with a follow-up task to re-pull the complete Aug 24-30 cohort after 2026-09-02. Separately, write `scripts/analytics/RUNBOOK.md` documenting the exact six prompts, session-hygiene method (private/incognito, logged out), and the chosen AI surfaces; create `scripts/analytics/ai-answer-log.csv` with one row per (date, ai_surface, prompt_id) and get one full run recorded via a `checkpoint:human-verify` task (or an explicit incognito-session automated run, if the user opts into browser automation) to satisfy success criterion 4.

## Architectural Responsibility Map

This phase produces no application code (no Next.js routes, no React components, no Supabase schema changes) — its "tiers" are project-tooling tiers, not the app's usual Browser/SSR/API/DB tiers. Mapping is included for completeness and to make explicit that this phase sits entirely outside the app's request path.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| GSC data pull (OAuth token exchange + Search Analytics query) | Local dev/ops tooling (`scripts/analytics/pull-gsc.py`) | External API (Google Search Console API) | Runs on a developer's machine or CI runner, not the deployed app; talks directly to Google's API over HTTPS |
| OAuth credential bootstrap | Local dev/ops tooling (`scripts/analytics/gsc-auth.py`) | External API (Google OAuth 2.0) | One-time-per-token-lifetime loopback flow, not part of the running product |
| Query clustering (brand/competitor/problem/expansion) | Local dev/ops tooling (pure function, ideally in its own importable module) | — | Deterministic keyword matching, no external dependency, easy to unit test in isolation |
| GSC export artifact (committed CSV/JSON) | Repo documentation/data (static, committed file) | — | Read by humans (Phase 6 review) and potentially re-parsed by a future script; not served by the app |
| AI-answer runbook | Repo documentation (static markdown) | — | Procedure document, no code |
| AI-answer results log | Repo documentation (structured CSV, committed, append-only) | — | Read by humans and by Phase 6's review; not served by the app |
| Actually running the 6 prompts against AI surfaces | Human (manual browser session) or browser-automation tooling outside the app | — | Cannot be done by a script calling a documented API — ChatGPT/Perplexity/Google AI Overview answers are UI-rendered, session-and-personalization-sensitive, and explicitly required to come from a "clean, non-personalized session" |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Python 3 (stdlib only: `json`, `os`, `sys`, `urllib`, `datetime`, `csv`) | 3.9.6 confirmed locally `[VERIFIED: local machine, python3 --version, this session]` | GSC OAuth + Search Analytics API pull, clustering, CSV export | Matches the existing repo convention exactly: all three existing scripts in `scripts/analytics/` (`pull-gsc.py`, `gsc-auth.py`, `pull-posthog.py`) are stdlib-only by explicit docstring choice ("stdlib only — no node, no google client libraries"), with no `requirements.txt` or venv anywhere in the repo `[VERIFIED: scripts/analytics/pull-gsc.py:23, scripts/analytics/gsc-auth.py:17]` |

No third-party packages are needed or should be introduced. The `csv` module (stdlib, not yet imported by any existing script) is the one addition — see Don't Hand-Roll.

### Supporting
None. This phase does not touch the Next.js app, npm packages, or any TypeScript code.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| stdlib `urllib`/`csv` | `google-api-python-client` + `requests`/`pandas` | Would add a `requirements.txt`, a venv, and a dependency surface for a script that runs a handful of times; breaks the established convention with no benefit at this scale |
| Manual AI-answer browser runs | A scripted browser-automation approach (e.g. the `claude-in-chrome` skill, or Playwright) hitting ChatGPT/Perplexity/Google | Automation risks violating "clean, non-personalized session" if it reuses a logged-in profile/cookies, and some AI surfaces actively rate-limit or CAPTCHA automated traffic; manual is slower but methodologically safer and matches what the sprint plan actually describes ("from a clean, non-personalized session") |

**Installation:** None required.

## Package Legitimacy Audit

Not applicable. This phase installs no external packages (npm, pip, or otherwise) — every script in scope is stdlib-only Python by existing repo convention, and no new dependency is being introduced. Skip the legitimacy gate for this phase.

## Architecture Patterns

### System Architecture Diagram

**GSC baseline (MEAS-01):**
```
Google Search Console (getlootlist.com property)
        │  OAuth 2.0 (one-time, already done 2026-08-28)
        ▼
gsc-auth.py  ──writes──▶  .env.local (GSC_CLIENT_ID/SECRET/REFRESH_TOKEN, gitignored)
        │
        ▼
pull-gsc.py
  1. load_env()                       reads .env.local
  2. get_access_token()               refresh_token → short-lived access_token
  3. query() × N                      POST searchAnalytics.query
       - "prior 3 months" window      (startDate/endDate = today-3-90 .. today-3)
       - "Aug 24-30" cohort window    (startDate/endDate = explicit, NEW capability needed)
  4. cluster_query(query_text)        NEW pure function: brand/competitor/problem/expansion/unclustered
  5. write CSV                        NEW: csv.writer, not print()
        ▼
scripts/analytics/exports/*.csv  ──committed to git──▶  read by Phase 6 review
```

**AI-answer log (MEAS-02):**
```
Sprint plan's 6 fixed prompts (verbatim, see Common Pitfalls)
        ▼
scripts/analytics/RUNBOOK.md            (static doc: exact prompts, session hygiene, surfaces, fields)
        │  followed by
        ▼
Human (or explicitly-incognito browser automation) opens a clean/private session
  per AI surface × runs each of the 6 prompts × records outcome
        ▼
scripts/analytics/ai-answer-log.csv    (append-only, one row per date × ai_surface × prompt_id)
        ▼
committed to git  ──▶  read by Phase 6 review ("which of the six prompts now return LootList+ correctly")
```

### Recommended Project Structure
```
scripts/analytics/
├── gsc-auth.py              # existing, untracked — commit as-is this phase
├── pull-gsc.py              # existing — extend with --start/--end and CSV export
├── gsc_clusters.py          # NEW — pure clustering function + keyword constants (importable + testable)
├── test_gsc_clusters.py     # NEW — stdlib unittest for the clustering function
├── pull-posthog.py          # existing, unrelated to this phase — do not touch
├── exports/                 # NEW dir — committed CSV exports live here
│   ├── gsc-trend-<start>_<end>.csv
│   └── gsc-baseline-cohort-<start>_<end>.csv   # label partial vs complete explicitly in a header row or filename
├── RUNBOOK.md               # NEW — AI-answer weekly test procedure
└── ai-answer-log.csv        # NEW — append-only results log
```
`docs/` and bare `scripts/*.md` are both git-ignored `[VERIFIED: .gitignore:71,73; confirmed empirically this session with git check-ignore against candidate paths — scripts/analytics/RUNBOOK.md was NOT ignored, scripts/RUNBOOK.md WAS ignored (.gitignore:73), docs/measurement/RUNBOOK.md WAS ignored (.gitignore:71)]`. Do not put the runbook or log one directory higher or in `docs/`.

### Pattern 1: Explicit date-range parameterization for cohort pulls
**What:** Add `--start YYYY-MM-DD --end YYYY-MM-DD` optional args to `pull-gsc.py`, defaulting to the current trailing-N-days behavior when omitted.
**When to use:** Any time a specific historical week (like Aug 24-30) needs to be isolated from a rolling trend window — the current script only supports "N days back from today-3," which cannot express a fixed past week once more than N days have elapsed.
**Example:**
```python
# Source: extends scripts/analytics/pull-gsc.py's existing base dict, this session's design
import argparse
parser = argparse.ArgumentParser()
parser.add_argument("days", nargs="?", type=int, default=90)
parser.add_argument("--start")  # YYYY-MM-DD, overrides days-based calc
parser.add_argument("--end")
parser.add_argument("--csv")    # output path; if omitted, keep existing print behavior
args = parser.parse_args()
```

### Pattern 2: Pure, testable clustering function
**What:** A single function `cluster_query(query: str) -> str` returning one of `"brand" | "competitor" | "problem" | "expansion" | "unclustered"`, backed by the sprint plan's exact keyword lists, with deterministic precedence when a query matches more than one cluster.
**When to use:** Any query-to-segment classification where the rule is "does this string contain any of these substrings" — no ML, no fuzzy matching needed given the sprint plan's own keyword lists are exact strings.
**Example:**
```python
# Source: sprint plan verbatim keyword lists (see Common Pitfalls for provenance), this session's design
CLUSTERS = {
    "brand": ["lootlist", "loot list plus", "lootlist+", "getlootlist", "lootlistplus"],
    "competitor": ["thatsmybis", "that's my bis", "tmb", "dkp", "epgp", "loot council", "suicide kings"],
    "problem": ["loot spreadsheet", "loot attendance", "loot drama", "fair loot system", "loot priority list"],
    "expansion": ["classic", "tbc", "wrath", "wotlk", "cata", "mop"],
}
# Precedence when a query matches multiple clusters is UNDEFINED by the sprint plan — see Open Questions.
PRECEDENCE = ["brand", "competitor", "problem", "expansion"]

def cluster_query(q: str) -> str:
    ql = q.lower()
    for cluster in PRECEDENCE:
        if any(kw in ql for kw in CLUSTERS[cluster]):
            return cluster
    return "unclustered"
```

### Anti-Patterns to Avoid
- **Hand-rolled CSV writing via string joins:** the existing scripts only `print()` — do not extend that with `",".join(...)` for the new committed export; a query or competing-source URL containing a comma will silently corrupt columns. Use the stdlib `csv` module (see Don't Hand-Roll).
- **Assuming "last 7 days" equals "Aug 24-30":** once today's date has passed the target week, a relative "last N days" pull silently drifts away from the intended fixed cohort. Always compute cohort pulls from explicit dates, never from `date.today() - timedelta(...)` for a specific historical week.
- **Running AI-answer prompts from a logged-in daily-driver browser:** defeats the sprint plan's explicit "clean, non-personalized session" requirement and would silently bias every future weekly comparison.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV export with fields that may contain commas/quotes (query text, cited URLs, competing-source lists) | String concatenation with `,`.join | stdlib `csv.writer` / `csv.DictWriter` | Handles quoting/escaping correctly with zero dependencies; already imported nowhere in the repo's Python scripts but it's stdlib, so no new install is needed |
| OAuth token refresh | A hand-rolled JWT/token cache | The existing `get_access_token()` in `pull-gsc.py`, called fresh each run | It already works (`[VERIFIED per STATE.md 2026-08-28: pull-gsc.py verified a full pull after gsc-auth.py-based reauthorization]`); a refresh token exchange is cheap and stateless, no need to cache access tokens across runs for a script invoked a few times a week |
| Date-range cohort math | Custom calendar logic for "this week" | Explicit `--start`/`--end` ISO date strings, parsed with `datetime.date.fromisoformat` | Removes ambiguity about which week "the baseline cohort" means once the script is run on a date other than the week itself |

**Key insight:** everything in this phase is small enough that the main risk isn't reinventing a hard algorithm — it's silent data corruption (comma-broken CSV, a "last 7 days" pull silently drifting off the intended calendar week, or an AI-answer session that isn't actually clean). Guard against those specifically rather than over-engineering the scripts.

## Common Pitfalls

### Pitfall 1: The Aug 24-30 baseline cohort cannot be pulled complete as of this research/planning date
**What goes wrong:** A plan or executor runs `pull-gsc.py` today (2026-08-28) expecting a full Aug 24-30 export and gets a truncated week without realizing it, because the script silently returns whatever data exists rather than erroring on an incomplete window.
**Why it happens:** `pull-gsc.py` hardcodes `end = date.today() - timedelta(days=3)` because "GSC data lags ~2-3 days" `[VERIFIED: scripts/analytics/pull-gsc.py:103]`. On 2026-08-28 that means the latest finalized data is for 2026-08-25. Aug 26-30 data does not exist yet in GSC's `dataState: final` view.
**How to avoid:** Give the script explicit `--start`/`--end` args (Pattern 1). Commit what's available now, but label it explicitly as partial (filename or a header comment stating the true coverage, e.g. `gsc-baseline-cohort-2026-08-24_2026-08-30-PARTIAL-through-08-25.csv`), and schedule a follow-up pull for on/after 2026-09-02 (still >2 weeks before Phase 6's Sep 20-24 window). Do not fabricate or extrapolate the missing days — this mirrors the roadmap's own explicit instruction not to fabricate or approximate baseline numbers.
**Warning signs:** A committed export whose date range says "2026-08-24 to 2026-08-30" but whose row counts look implausibly low relative to the 90-day trend export's daily average.

### Pitfall 2: `docs/` and `scripts/*.md` are git-ignored — a runbook placed there vanishes silently
**What goes wrong:** An executor creates `docs/ai-answer-runbook.md` or `scripts/RUNBOOK.md`, `git add`s it, commits, and the file is silently excluded (or `git add` warns and is ignored without anyone noticing in a non-interactive run).
**Why it happens:** `.gitignore` has `docs/` (ignores the whole directory, matched empirically) and `scripts/*.md` (ignores markdown files directly inside `scripts/`, but the glob does not cross the `/` into `scripts/analytics/`) `[VERIFIED: .gitignore:71,73, confirmed with git check-ignore -v against exact candidate paths this session]`.
**How to avoid:** Put the runbook and log at `scripts/analytics/RUNBOOK.md` and `scripts/analytics/ai-answer-log.csv` (both confirmed NOT ignored this session) or another path outside `docs/` and not directly under `scripts/`.
**Warning signs:** `git status` doesn't show the new file as untracked/staged after `git add -A`; `git log --follow <path>` shows nothing after a claimed commit.

### Pitfall 3: The sprint plan doesn't say which AI products to test
**What goes wrong:** A plan just says "run the AI-answer test" without picking concrete surfaces, and the runbook ends up vague enough that a future run isn't actually repeatable — defeating the phase's stated goal ("so any future run is repeatable without re-reading the sprint plan").
**Why it happens:** The sprint plan's "Weekly Google and AI-answer test set" section gives the six exact prompts and the fields to record, but never names ChatGPT/Perplexity/Google AI Overview/Gemini explicitly for that weekly loop (it references ChatGPT and OAI-SearchBot elsewhere, in the context of crawler access, not the weekly diagnostic) `[VERIFIED: /Users/alexander.mayes/Downloads/LootList_30_Day_Search_AI_Sprint.md:630-641, read this session — the section contains no surface list]`.
**How to avoid:** Pick and hard-code a small fixed set of surfaces in the runbook (recommend: Google AI Overview via a logged-out/incognito google.com search, ChatGPT via chatgpt.com's temporary/no-memory chat mode, and Perplexity.ai logged out — see Open Questions) and record that choice as an explicit assumption, not an implicit one.
**Warning signs:** Week-over-week log entries with an inconsistent or missing `ai_surface` value, making the Phase 6 comparison impossible to do cleanly.

### Pitfall 4: A query can match more than one cluster keyword list
**What goes wrong:** A query like `"classic loot spreadsheet"` contains both an expansion keyword (`classic`) and a problem keyword (`loot spreadsheet`); without a defined precedence, two runs of the clustering logic (or two different people extending it later) could classify it differently, silently changing the cluster percentages reported to the user.
**Why it happens:** The sprint plan states the four cluster keyword lists but never addresses overlap `[VERIFIED: /Users/alexander.mayes/Downloads/LootList_30_Day_Search_AI_Sprint.md:622-627, read this session]`.
**How to avoid:** Fix an explicit precedence order in code (recommended: brand > competitor > problem > expansion > unclustered, matching business priority — brand queries matter most to identify) and document the choice in a code comment, so it's a stated decision rather than an accident of dict iteration order.
**Warning signs:** Cluster totals across the four buckets plus "unclustered" don't sum to the total query count, or re-running the classifier on the same data produces different totals.

## Code Examples

### Search Analytics API call with explicit date range (extends the existing pattern)
```python
# Source: current scripts/analytics/pull-gsc.py:64-77 (query() function, unchanged),
# combined with explicit start/end per Pattern 1 above
base = {
    "startDate": "2026-08-24",
    "endDate": "2026-08-30",
    "rowLimit": 1000,          # API max is 25000; 1000 is plenty for query-level clustering
    "dataState": "final",       # excludes fresh/unfinalized data — correct for a stable, reproducible export
}
rows = query(token, site, {**base, "dimensions": ["query"]})
```
`dataState: final` and the 25,000-row `rowLimit` ceiling are documented API behavior `[CITED: developers.google.com/webmaster-tools/v1/how-tos/all-your-data — "rowLimit ... 1 to 25,000", "dataState ... final ... only finalized data"]`.

### Committed CSV export using stdlib `csv` (replaces ad hoc `print()`)
```python
# Source: this session's design, extending scripts/analytics/pull-gsc.py's existing query()/show() flow
import csv

def export_csv(rows, cluster_fn, path):
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["query", "clicks", "impressions", "ctr", "position", "cluster"])
        for r in rows:
            key = r["keys"][0]
            w.writerow([key, r["clicks"], r["impressions"], r["ctr"], r["position"], cluster_fn(key)])
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The weekly AI-answer test should run against Google AI Overview, ChatGPT (no-memory/temporary chat), and Perplexity.ai, all logged out | Common Pitfalls (Pitfall 3), Architecture Patterns | If the user actually wants different or additional surfaces (e.g. Gemini, Bing Copilot), the runbook and log's `ai_surface` values will need revision after the first run, wasting one week's log entries or requiring a schema migration on the CSV |
| A2 | Cluster precedence for overlapping keyword matches should be brand > competitor > problem > expansion > unclustered | Architecture Patterns (Pattern 2), Common Pitfalls (Pitfall 4) | If the user has a different priority in mind (e.g. expansion should win because it's used for content-gap analysis), the published cluster percentages would need recomputation, but the underlying raw export is unaffected since precedence only affects display/aggregation |
| A3 | The GSC export and the AI-answer log are internal engineering artifacts, not "user-facing copy," so the CLAUDE.md copy-sign-off gate does not apply to them | Project Constraints | Low risk — these are data/procedure files, not marketing strings; if wrong, the fix is a quick sign-off request before commit, not a rebuild |
| A4 | Committing GSC query-performance data and the AI-answer log to this public repo is an accepted tradeoff, not an oversight, because the project already treats its GitHub repo as a public transparency signal (per the About page copy's own claim of developing "in public view... through its... GitHub repository") and because EVID-02 explicitly requires committed, reproducible saved queries | Summary, Environment Availability | If wrong, exported SEO/marketing performance data becomes visible to competitors on a public repo; mitigation would be moving these specific files to a private location, which conflicts with "committed export" in the success criteria as currently written |

## Open Questions

1. **Which AI surfaces should the six prompts run against each week?**
   - What we know: the sprint plan gives the exact six prompts and the exact fields to record (date, product inclusion, factual accuracy, cited URL, competing sources), and separately references ChatGPT and Google's generative search features elsewhere in the document.
   - What's unclear: it never lists concrete AI surfaces for *this specific* weekly loop.
   - Recommendation: default to Google AI Overview, ChatGPT (temporary/logged-out chat), and Perplexity.ai, all in a private/incognito window; log this choice explicitly in the runbook's first paragraph so future runs (and the user) can see the assumption and correct it early rather than after several weeks of data.

2. **How should "at least one complete test-set run" (success criterion 4) actually get executed, given the executing agent has no default browser access?**
   - What we know: this environment has a `claude-in-chrome` skill capable of driving a real Chrome session, but it operates on the user's existing Chrome profile/session state unless a private/incognito context is explicitly used, which risks violating "clean, non-personalized session."
   - What's unclear: whether the user wants to grant site permissions for chatgpt.com/perplexity.ai/google.com to `claude-in-chrome` for an automated incognito run, or wants to run the six prompts manually and report structured results back for the executor to log.
   - Recommendation: plan this as a `checkpoint:human-verify`-style task — the executor prepares the runbook and an empty/templated log row set, and either the user runs the prompts and reports back, or the user explicitly authorizes an incognito `claude-in-chrome` session for this specific purpose.

3. **Is a fully complete Aug 24-30 GSC cohort required before this phase can be marked done, or is a documented partial-plus-follow-up acceptable?**
   - What we know: GSC's 2-3 day data lag means the full week isn't finalized until ~2026-09-02; Phase 6 (which consumes this baseline) doesn't run until Sep 20-24, so there's no calendar pressure forcing a premature pull.
   - What's unclear: whether "committed... export covers the Aug 24 to 30 baseline cohort" (success criterion 1, as literally written) tolerates a two-step process (partial now, completed later) or requires the phase to stay open until Sep 2+.
   - Recommendation: ship the capability (parameterized script) and the 3-month trend now, commit an explicitly-labeled partial Aug 24-25 slice, and record an open follow-up in STATE.md to re-run and replace it after Sep 2 — consistent with how the roadmap already tracks the (now-resolved) OAuth blocker as a STATE.md item.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3 | Both scripts | ✓ | 3.9.6 `[VERIFIED: python3 --version, this session]` | — |
| `.env.local` GSC OAuth credentials (`GSC_CLIENT_ID`, `GSC_CLIENT_SECRET`, `GSC_REFRESH_TOKEN`, `GSC_SITE_URL`) | `pull-gsc.py` | ✓ per STATE.md `[CITED: .planning/STATE.md — "RESOLVED 2026-08-28: ... pull-gsc.py verified a full pull ... App published to production and token re-minted 2026-08-28, so no 7-day expiry"]` | n/a (secret) | none needed — do not re-verify by printing/reading the file contents; STATE.md's resolution note is sufficient provenance |
| Browser access to AI answer surfaces (ChatGPT, Perplexity, Google AI Overview) | MEAS-02 runbook execution | Not probeable from this CLI session; `claude-in-chrome` skill exists in-environment but requires explicit site permissions and an incognito context to satisfy "clean, non-personalized" | — | Human manually runs the six prompts per the runbook and reports results for logging |
| Git repo write access / public GitHub repo | Committing both deliverables | ✓ `[VERIFIED: gh repo view --json visibility → "PUBLIC", this session]` | — | — |

**Missing dependencies with no fallback:** None — everything required for the automatable half (MEAS-01 scripting) is present and verified working.

**Missing dependencies with fallback:** Automated AI-surface browser access is not confirmed; falls back to a human-run procedure per the runbook (see Open Question 2).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None configured for Python in this repo; Vitest 4.1.0 exists for the TS/Next.js app but does not apply to this phase's Python/markdown/CSV deliverables `[VERIFIED: vitest.config.ts exists per package.json/CLAUDE.md tech stack notes; no pytest/unittest config or requirements.txt found anywhere in the repo this session]` |
| Config file | none — recommend stdlib `unittest`, which needs no config file and no new dependency |
| Quick run command | `python3 -m unittest scripts/analytics/test_gsc_clusters.py -v` |
| Full suite command | same (single small test module; no broader Python suite exists) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MEAS-01 | `cluster_query()` assigns brand/competitor/problem/expansion/unclustered correctly, including the overlap-precedence rule from Pitfall 4 | unit | `python3 -m unittest scripts/analytics/test_gsc_clusters.py -v` | ❌ Wave 0 |
| MEAS-01 | `pull-gsc.py --start --end --csv` produces a non-empty CSV with the expected header row for a given date range | smoke | `python3 scripts/analytics/pull-gsc.py --start 2026-08-24 --end 2026-08-25 --csv /tmp/test.csv && test -s /tmp/test.csv` | ❌ Wave 0 (flag depends on planned CLI extension) |
| MEAS-02 | `ai-answer-log.csv` header matches the required field set (date, ai_surface, prompt_id, lootlist_appeared, factually_correct, cited_url, competing_sources) | unit | `python3 -m unittest scripts/analytics/test_ai_answer_log.py -v` (optional — validates schema, not content) | ❌ Wave 0 |
| MEAS-02 | Runbook exists and names concrete AI surfaces + the six verbatim prompts | manual review | n/a — not meaningfully automatable; a plan task should be "read RUNBOOK.md end to end and confirm it needs no external context to execute" | n/a |

### Sampling Rate
- **Per task commit:** `python3 -m unittest scripts/analytics/test_gsc_clusters.py -v` (sub-second, no network)
- **Per wave merge:** same, plus a manual smoke run of `pull-gsc.py` against the real API (network-dependent, cannot be scripted into CI without committing credentials)
- **Phase gate:** all unit tests green; runbook manually re-read once by someone who did not write it, to confirm it's actually self-contained; at least one real log row exists in `ai-answer-log.csv`

### Wave 0 Gaps
- [ ] `scripts/analytics/test_gsc_clusters.py` — covers MEAS-01 clustering precedence and keyword matching
- [ ] `scripts/analytics/gsc_clusters.py` — the clustering logic itself needs to exist as an importable module before it can be tested
- [ ] Optional: `scripts/analytics/test_ai_answer_log.py` — schema-only validation for MEAS-02's CSV header
- [ ] No framework install needed — stdlib `unittest` requires nothing beyond the Python 3 already present

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | This phase uses an already-provisioned OAuth refresh token (Google-side auth); no new authentication surface is built |
| V3 Session Management | No | No sessions are created by this phase's code |
| V4 Access Control | No | Single-operator local script, no multi-user access model |
| V5 Input Validation | Yes, minimal | Validate `--start`/`--end` CLI args parse as real ISO dates before use (`datetime.date.fromisoformat`, which already raises `ValueError` on bad input — just don't swallow that silently); validate the Search Analytics API JSON response has the expected `rows` key/shape before indexing into it (existing `query()` already does `.get("rows", [])` defensively) |
| V6 Cryptography | No | No custom crypto; OAuth token exchange happens entirely over Google's HTTPS endpoints using existing, already-verified code — do not add any hand-rolled encryption for the exported CSV data |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Accidental secret commit (`GSC_REFRESH_TOKEN`, `GSC_CLIENT_SECRET`) | Information Disclosure | Already mitigated by `.gitignore`'s `.env*` and `.env*.local` rules `[VERIFIED: .gitignore:45,54]`; the new work in this phase should never print, log, or write these values into any committed export or the runbook — the existing scripts already avoid printing tokens |
| Path traversal via an optional `--csv <path>` output argument | Tampering | If the CLI extension accepts an arbitrary output path, keep it a simple relative-path convenience (default to `scripts/analytics/exports/`) rather than accepting fully attacker-influenced paths — low real risk here since the only "attacker" is whoever runs the script locally, but worth a one-line guard for hygiene |
| Business-sensitive (not personally-identifying) data exposure via a public repo | Information Disclosure | Not a legal privacy issue (GSC query/page data carries no user or guild PII), but is a competitive-intelligence exposure given the repo is confirmed public `[VERIFIED: gh repo view --json visibility → PUBLIC, this session]` — flagged as Assumption A4, not blocked, since the project's own stated design already treats the public repo as a transparency asset and EVID-02 requires this pattern |

## Sources

### Primary (HIGH confidence)
- `/Users/alexander.mayes/Code/loot-list-plus/scripts/analytics/pull-gsc.py` — read in full this session
- `/Users/alexander.mayes/Code/loot-list-plus/scripts/analytics/gsc-auth.py` — read in full this session
- `/Users/alexander.mayes/Code/loot-list-plus/scripts/analytics/pull-posthog.py` — read in full this session (context/convention only, unrelated to this phase's deliverables)
- `/Users/alexander.mayes/Code/loot-list-plus/.gitignore` — read in full this session; verified empirically with `git check-ignore -v` against six candidate paths
- `/Users/alexander.mayes/Downloads/LootList_30_Day_Search_AI_Sprint.md` — read in full this session (six prompts, cluster keyword lists, all "exact copy" sections)
- `/Users/alexander.mayes/Code/loot-list-plus/.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/config.json` — read in full this session

### Secondary (MEDIUM confidence)
- Google Search Console API `searchAnalytics.query` rowLimit/dataState behavior — WebSearch this session, corroborated by `developers.google.com/webmaster-tools/v1/how-tos/all-your-data`

### Tertiary (LOW confidence)
- None used as the basis for any recommendation in this document.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — repo convention (stdlib-only Python) is explicit and unambiguous in three existing files
- Architecture: HIGH for the GSC scripting half (extends verified, working code); MEDIUM for the AI-answer half (methodology sound, but concrete AI surfaces are an unresolved product decision, not a research gap)
- Pitfalls: HIGH — the GSC data-lag and `.gitignore` findings were both verified empirically this session, not inferred

**Research date:** 2026-08-28
**Valid until:** 2026-09-24 (end of the sprint window this phase serves). The GSC API mechanics and stdlib-Python conventions documented here are stable well beyond that; the AI-answer prompt *results* are explicitly time-sensitive by design and must be re-run weekly per the runbook, not treated as a one-time finding.
