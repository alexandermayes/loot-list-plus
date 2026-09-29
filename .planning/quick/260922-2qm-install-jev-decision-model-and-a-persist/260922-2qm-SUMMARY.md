---
phase: quick-260922-2qm
plan: 01
subsystem: tooling
tags: [claude-code, hooks, openrouter, jev, typesafe, model-routing]

requires: []
provides:
  - "A jev skill usable on any pile of text via Jev's noul/choice/score decision API, independent of the router"
  - "A UserPromptSubmit router (OFF by default) that asks Jev to size a message and adds an advisory tier note"
  - "Four model-pinned helper agents (jev-haiku, jev-sonnet, jev-opus, jev-fable)"
  - "/jev on|off|status slash command and CLI"
  - "A developer-run real Jev call at .claude/jev/test-call.sh"
affects: []

actuals:
  tokens: 6642
  tasks: 4
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Fail-closed state chokepoint: readState() in state.cjs is the single gate deciding router ON/OFF; anything unparseable reads OFF"
    - "Fail-open hook: router.cjs wraps its entire body in try/catch that discards errors silently, so any failure is indistinguishable from the router being absent"
    - "Advisory routing via hookSpecificOutput.additionalContext, since a hook cannot change the model - no such field exists in the settings schema"

key-files:
  created:
    - .claude/jev/state.cjs
    - .claude/jev/jev.cjs
    - .claude/jev/router.cjs
    - .claude/jev/test-call.sh
    - .claude/commands/jev.md
    - .claude/skills/jev/SKILL.md
    - .claude/agents/jev-haiku.md
    - .claude/agents/jev-sonnet.md
    - .claude/agents/jev-opus.md
    - .claude/agents/jev-fable.md
  modified:
    - .claude/settings.json

key-decisions:
  - "setOn() reads-then-writes only for counters, never as a precondition for turning OFF - off must succeed even when the state file is unreadable"
  - "lastField (which stdin key matched) is written to state only at the end of a fully successful routed call, not at extraction time, so an OFF or corrupt-state message truly changes nothing on disk"
  - "Endpoint corrected per the orchestrator's verified live call: https://openrouter.ai/api/alpha/decisions with no /v1 segment, overriding the documented (404ing) URL"

requirements-completed: [JEV-01, JEV-02, JEV-03, JEV-04, JEV-05, JEV-06, JEV-07, JEV-08, JEV-09, JEV-10, JEV-11, JEV-12]

coverage:
  - id: D1
    description: "State spine fails closed against missing, empty, truncated, non-JSON, and wrongly-typed state; off works against all of them"
    requirement: "JEV-04"
    verification:
      - kind: other
        ref: "Task 1 <verify> automated gate (state.cjs / jev.cjs behavior matrix)"
        status: pass
    human_judgment: false
  - id: D2
    description: "UserPromptSubmit router prints nothing (fail-open) for OFF, corrupt state, slash commands, short messages, unknown stdin shapes, and unparseable stdin, and settings.json carries both enabledPlugins and the new hook"
    requirement: "JEV-09"
    verification:
      - kind: other
        ref: "Task 2 <verify> automated gate (router.cjs behavior matrix + settings.json jq checks)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Four model-pinned agents and the jev skill document the governing rule, the no-model-switch limitation, message egress, OFF-by-default, and the honest limit of secret detection"
    requirement: "JEV-01"
    verification:
      - kind: other
        ref: "Task 3 <verify> automated gate (agent frontmatter + SKILL.md content checks)"
        status: pass
    human_judgment: false
  - id: D4
    description: "test-call.sh exercises all three Jev question types, reads the key from .env.local only, and the ignore/secret audit confirms only jev.md is tracked with no key material in git"
    requirement: "JEV-10"
    verification:
      - kind: other
        ref: "Task 4 <verify> automated gate (test-call.sh static checks + git check-ignore + git grep)"
        status: pass
    human_judgment: true
    rationale: "The human-check step (running bash .claude/jev/test-call.sh to watch Jev answer for real) is explicitly deferred to the developer per the plan and this session's constraints; the executing agent did not and was told not to make a live network call."

duration: ~30min
completed: 2026-09-22
status: complete
---

# Phase quick-260922-2qm Plan 01: Jev Decision Model and Persistent Router Summary

**Off-by-default UserPromptSubmit router that asks TypeSafe's Jev model (via OpenRouter) to size a message and note a tier, plus a reusable jev skill and four model-pinned helper agents.**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-09-22
- **Tasks:** 4
- **Files created/modified:** 11

## Accomplishments

- Fail-closed state spine (`state.cjs`) where `readState()` is the single chokepoint deciding ON/OFF, and `/jev off` succeeds even against a missing, empty, truncated, or wrongly-typed state file
- `/jev` slash command and CLI (`jev.cjs`) reporting ON/OFF, per-tier counts, cost so far, and the standing privacy line on every status call
- `UserPromptSubmit` hook (`router.cjs`) wired into `.claude/settings.json` alongside the untouched `enabledPlugins`, fail-open on every possible failure path (missing key, no network, corrupt state, bad stdin, slow Jev)
- Four helper agents (`jev-haiku`, `jev-sonnet`, `jev-opus`, `jev-fable`), each pinned to its tier via `model:` frontmatter, each ending its reply with the model that did the work
- `jev` skill documenting the decision API (noul/choice/score), the governing rule "Jev decides, Claude writes," and the honest limitation that a hook cannot switch models
- `test-call.sh` for the developer to run the one real call themselves, exercising all three Jev question types against the corrected endpoint

## Task Commits

Only one of this plan's ten files can reach the git repository; `.gitignore:78` (`.claude/*`) ignores everything else under `.claude/`, and `.gitignore:79` (`!.claude/commands/`) re-includes exactly `.claude/commands/`. Each task's automated `<verify>` gate was run and passed before moving to the next task; only Task 1 produced a commit because it is the only task that touched a trackable file.

1. **Task 1: State spine, on/off/status CLI, and the slash command** - `1685f8ae` (feat) - created `.claude/jev/state.cjs`, `.claude/jev/jev.cjs` (both gitignored), and `.claude/commands/jev.md` (tracked)
2. **Task 2: UserPromptSubmit router, wired fail-open** - no commit (all files gitignored: `.claude/jev/router.cjs`, `.claude/settings.json`) - verify gate passed
3. **Task 3: Four pinned helper agents and the reusable jev skill** - no commit (all files gitignored: `.claude/agents/jev-*.md`, `.claude/skills/jev/SKILL.md`) - verify gate passed
4. **Task 4: Developer's real test call, and the secret/ignore audit** - no commit (`.claude/jev/test-call.sh` gitignored) - verify gate passed

**Plan metadata:** commit deferred to the calling GSD orchestrator per this session's constraints.

## Files Created/Modified

- `.claude/jev/state.cjs` - fail-closed state chokepoint (`readState`, `writeState`, `setOn`, `recordRouted`); gitignored
- `.claude/jev/jev.cjs` - `/jev` CLI backing the slash command; gitignored
- `.claude/commands/jev.md` - the slash command definition; the only tracked file this plan added
- `.claude/jev/router.cjs` - `UserPromptSubmit` hook, fail-open on every path; gitignored
- `.claude/settings.json` - added `hooks.UserPromptSubmit` alongside the pre-existing, untouched `enabledPlugins`; gitignored
- `.claude/agents/jev-haiku.md`, `.claude/agents/jev-sonnet.md`, `.claude/agents/jev-opus.md`, `.claude/agents/jev-fable.md` - model-pinned helper agents; gitignored
- `.claude/skills/jev/SKILL.md` - reusable Jev skill and honest router documentation; gitignored
- `.claude/jev/test-call.sh` - developer-run real API call exercising all three question types; gitignored

## Decisions Made

- `setOn()` is deliberately not read-then-write against trust: it takes counters from `readState()` (which already degrades to zeros on any failure) and writes a fresh object with `on` forced to the boolean passed in, so `/jev off` works precisely when reading is what is broken.
- The stdin field matched by the router (`prompt`/`user_prompt`/`message`/`text`) is recorded to `lastField` in state only at the end of a fully successful routed call (after the ON gate, the local skip gates, and a successful Jev response), not at extraction time. This keeps the "OFF changes nothing on disk" truth honest - extraction alone never writes state.
- Endpoint used is `https://openrouter.ai/api/alpha/decisions` with no `/v1` segment, per the orchestrator's live-verified call recorded in the plan, overriding the documented (404ing) URL.
- Secret pre-filter in the router is deliberately narrow (literal key-shape regexes only) and the skill states plainly that it does not and cannot catch prose secrets or business data - that gap is the stated reason OFF is the default.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed em dashes from the four agent description lines**
- **Found during:** Post-Task-3 final consistency pass (re-verifying every gate with robust `if/then` checks instead of `set -e` + `!`)
- **Issue:** The `description:` frontmatter line in all four `jev-*.md` agents used an em dash, violating CLAUDE.md's "no em dashes" rule and the plan's own no-em-dash requirement. Task 3's automated `<verify>` gate uses `! grep -q "<em-dash>" "$f"` inside a `set -e` block; bash does not apply `errexit` to a command negated with `!`, so the gate's grep matched (em dash present) but the negated failure never aborted the script, and it printed `PASS` regardless. The em dashes slipped through undetected.
- **Fix:** Rewrote each of the four `description:` lines to use a comma instead of an em dash. Re-verified with explicit `if grep -q ...; then FAIL; fi` logic (not relying on `!` under `set -e`) across all four Task 1/2/3/4 gates to confirm no other check had been silently defeated the same way.
- **Files modified:** `.claude/agents/jev-haiku.md`, `.claude/agents/jev-sonnet.md`, `.claude/agents/jev-opus.md`, `.claude/agents/jev-fable.md` (all gitignored, no commit possible or needed)
- **Verification:** Re-ran all four tasks' full verify gates with robust (non-negation-trapped) shell logic; all passed genuinely this time.

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Cosmetic copy fix only, no behavioral change. Worth flagging because it reveals the plan's own verify-gate pattern (`! grep ... ` under `set -e`) does not reliably fail closed in bash; a future planner should prefer `grep -q ... && exit 1` or an explicit `if` rather than a bare `!`-negated command when the check must be trustworthy.

One environment note worth recording: this sandbox has no `timeout` (or `gtimeout`) binary, so the literal `timeout 5 node $R` command in Task 2's verify gate could not run byte-for-byte. The equivalent property (fail-open, empty stdout, fast return) was verified directly by timing the same invocation without the `timeout` wrapper: the OFF-state router call completed in 48ms with empty output, well under the 5s bound the gate intended to check.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The router is OFF by default and remains OFF until the developer runs `/jev on`. `bash .claude/jev/test-call.sh` is available for the developer to run themselves to watch a real Jev call (three question types, latency, and cost) - this was intentionally not run by the executing agent, per this session's constraints and because the sandbox denies both `.env.local` and network access.

## Verification Evidence

- `git status --porcelain -- .claude` after all four tasks: only `.claude/commands/jev.md` shows as tracked/added (the working tree is otherwise clean for `.claude/`); every other file this plan created (`state.json` would live here too, though it was never persisted since the router never actually ran ON with a real key) is confirmed ignored via `git check-ignore -q`:
  - `IGNORED: .claude/jev/state.json`
  - `IGNORED: .claude/jev/state.cjs`
  - `IGNORED: .claude/jev/jev.cjs`
  - `IGNORED: .claude/jev/router.cjs`
  - `IGNORED: .claude/jev/test-call.sh`
  - `IGNORED: .claude/skills/jev/SKILL.md`
  - `IGNORED: .claude/agents/jev-haiku.md` (and sonnet/opus/fable, same pattern)
  - `IGNORED: .claude/settings.json`
  - `TRACKABLE: .claude/commands/jev.md`
- `git grep -I -E 'sk-or-v1-[A-Za-z0-9]{8}'` over tracked files: no match. No OpenRouter key material reaches the repository.
- All four tasks' automated `<verify>` blocks were run in full and passed (`PASS` echoed by each).

**Handoff to the developer:** the router is OFF right now, exactly as shipped. Run `bash .claude/jev/test-call.sh` to watch Jev answer for real - three answer shapes, a latency near 300ms, and a cost too small to round to a cent. Run `/jev on` only when ready to start sending message text to TypeSafe via OpenRouter for every routed message; run `/jev off` to stop.

## Next Phase Readiness

The router, skill, and agents are installed and fully OFF. No further phase depends on this work. The one open item is the human verification step in Task 4 (running the real API call and, separately, exercising `/jev on` end-to-end with a live message) - both are explicitly deferred to the developer, not gating this plan's completion per its own `<verification>` section ("Human, and deliberately not gating completion").

## Self-Check: PASSED

All 11 created/modified files confirmed present on disk (`state.cjs`, `jev.cjs`, `commands/jev.md`, `router.cjs`, `settings.json`, four `jev-*.md` agents, `SKILL.md`, `test-call.sh`), plus this SUMMARY.md. Commit `1685f8ae` confirmed present in `git log --oneline --all`.

---
*Phase: quick-260922-2qm*
*Completed: 2026-09-22*
