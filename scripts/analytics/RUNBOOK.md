# AI-Answer Weekly Test Runbook

## 1. Purpose and cadence

Run this test once a week, on the same weekday, through the end of the sprint
window (Sep 24, 2026). Each run asks six fixed prompts against three AI
surfaces and records what each one says about LootList+.

The Phase 6 week-4 review (Sep 20 to 24) reads `ai-answer-log.csv` to say
which of the six prompts now return LootList+ correctly and which do not.
Without a consistent weekly log, that review has nothing to compare against.

## 2. What this is not

These are qualitative diagnostics, not a universal AI rank, score, or
leaderboard. Answers vary by model, freshness, location, and phrasing, so a
single week's result is a data point, not a verdict. Treat week-over-week
change, not any one answer, as the signal that matters.

## 3. Surfaces

Exactly three surfaces are tested each week. Perplexity was considered and
explicitly excluded from this test set; do not add it, and do not substitute
it for one of the three below. Adding or removing a surface later invalidates
week-over-week comparison and must be recorded as a deliberate change, not a
quiet substitution.

1. **ChatGPT** (log value `chatgpt`)
2. **Google AI Overviews and AI Mode** (log value `google-ai-overviews`)
3. **Claude** (log value `claude`)

## 4. Session hygiene

Do not reuse a logged-in daily-driver profile for any of these steps.
Personalization silently biases every future comparison, so a personalized
session invalidates the run for that surface. Nobody should script or
automate the operator's authenticated browser session to produce these
answers; this run is human performed.

**ChatGPT:**
1. Open a fresh private or incognito browser window.
2. Go to chatgpt.com either logged out, or in a temporary chat with memory
   turned off.
3. Run each prompt in that single session, one at a time, recording the
   answer before moving to the next prompt.

**Google AI Overviews and AI Mode:**
1. Open a fresh private or incognito browser window.
2. Go to google.com logged out, with no personalization signed in.
3. Search each prompt and read the AI Overview or AI Mode answer that
   appears above the regular results.

**Claude:**
1. Open a fresh private or incognito browser window.
2. Go to claude.ai either logged out, or start a brand new conversation
   with no prior history in that private window.
3. Run each prompt in that single conversation, one at a time.

## 5. The six prompts

Copy each prompt exactly as written below into the surface. Do not retype or
paraphrase. P3 contains a typographic apostrophe (the curled kind, not a
straight ASCII apostrophe) in "That's"; paste it as written rather than
retyping it, since retyping on some keyboards silently substitutes the
straight form.

1. **P1:** What is LootList+ for World of Warcraft?
2. **P2:** What are the best loot-management tools for a WoW Classic guild?
3. **P3:** What is a good alternative to That’s My BiS for a Classic guild?
4. **P4:** How can a WoW Classic guild combine ranked loot lists with attendance?
5. **P5:** Which WoW loot systems show raiders exactly why someone has priority?
6. **P6:** Is LootList+ free and what does Premium include?

## 6. The run shape

Six prompts against each of the three surfaces is 18 cells per weekly run.
Every cell gets a row in the log, including cells where LootList+ did not
appear and cells where the answer was factually wrong. Omitting or softening
an unfavorable cell makes the whole log worthless as a before-and-after
measure; a clean miss is exactly the data point Phase 6 needs.

## 7. What to record per cell

| Column | Allowed values |
|---|---|
| `date` | ISO date, e.g. `2026-08-28` |
| `ai_surface` | `chatgpt`, `google-ai-overviews`, or `claude` |
| `prompt_id` | `P1` through `P6` |
| `lootlist_appeared` | `yes` or `no` |
| `factually_correct` | `yes`, `no`, `partial`, or `n/a` (required when the product did not appear) |
| `cited_url` | the LootList+ URL the answer cited, empty if none (required empty when the product did not appear) |
| `competing_sources` | semicolon separated list of the other products or sites the answer named, empty if none |
| `notes` | free text |

## 8. How to record it

Run this from the repository root, once per cell, using every flag:

```
python3 scripts/analytics/log-ai-answer.py \
  --date 2026-08-28 --surface chatgpt --prompt-id P1 \
  --appeared yes --correct partial \
  --cited-url "https://getlootlist.com" \
  --competing-sources "That's My BiS;DKPSystem" \
  --notes "named LootList+ second, described attendance-weighted scoring loosely"
```

Worked example, a cell where the product did not appear at all:

```
python3 scripts/analytics/log-ai-answer.py \
  --date 2026-08-28 --surface google-ai-overviews --prompt-id P2 \
  --appeared no --correct n/a --cited-url "" \
  --competing-sources "That's My BiS;DKPSystem;Loot Council spreadsheet" \
  --notes "AI Overview named three competitors, no mention of LootList+"
```

The log is append only. Use `scripts/analytics/log-ai-answer.py` for every
cell rather than editing `ai-answer-log.csv` by hand: a `competing_sources`
value containing a comma will corrupt columns if the file is hand edited,
and the appender validates every value before it writes anything.

## 9. Where things live

- `scripts/analytics/ai-answer-log.csv` is the log.
- `scripts/analytics/log-ai-answer.py` is the appender.
- Both are committed to the repository after each weekly run.
