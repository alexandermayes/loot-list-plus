---
phase: 03-anonymized-product-data-report
plan: 06
subsystem: content
tags: [nextjs, seo, sitemap, python, data-provenance, research-report]

requires:
  - phase: 03-anonymized-product-data-report
    provides: "03-05 shipped the finished report page with all approved copy, methodology, downloads, and contextual CTA byte-matched to 03-COPY-DRAFT.md"
provides:
  - "The report page is published: listed in the sitemap exactly once, indexable, self-canonical, structured data agreeing with visible copy"
  - "A pinned, provenance-documented final snapshot of the committed research-data artifacts, reproducible from a stranger's re-run"
  - "An honest methodology.window sentence disclosing that a re-approval after the window closes can legitimately move a published number on re-run"
  - "A root-cause debug record (research-report-one-row-drift.md) proving the reproduction drift was a legitimate data change, not a pipeline defect"
affects: ["Phase 5 (recrawl request), any future report using the same COALESCE(reviewed_at, submitted_at) population definition"]

actuals:
  tokens: 9000
  tasks: 2
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Approved-string parity gate: every APPROVED-STRING key/value in 03-COPY-DRAFT.md must appear verbatim (token-segment-aware) in page.tsx; a fresh SIGN-OFF ADDENDUM line records mid-phase copy revisions without re-litigating the whole sign-off"
    - "Pin-and-fix publication: for a report over live production data, publish one run's output as final rather than chasing byte-identical reproduction against an earlier generation, gated on the displayed finding values (not raw denominators) staying stable"

key-files:
  created:
    - public/research/README.md
    - .planning/debug/research-report-one-row-drift.md
  modified:
    - app/sitemap.ts
    - app/__tests__/sitemap.test.ts
    - app/research/wow-classic-loot-systems-2026/page.tsx
    - app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx
    - .planning/phases/03-anonymized-product-data-report/03-COPY-DRAFT.md
    - public/research/wow-classic-loot-systems-2026-aggregates.json
    - public/research/wow-classic-loot-systems-2026-aggregates.csv
    - .planning/phases/03-anonymized-product-data-report/deferred-items.md
    - .planning/STATE.md

key-decisions:
  - "Live-data drift accepted via pinned final snapshot rather than treating the reproduction check as failed"
  - "methodology.window sentence revised with fresh user sign-off (2026-09-05) to disclose the live-data caveat honestly"
  - "Root cause documented via systematic debugging as a legitimate post-window re-approval (H2), not a pipeline defect"

patterns-established:
  - "Displayed-value gate over raw-denominator gate: when a report's population is drawn from live, editable data, the publication contract should verify the rendered/rounded finding values and wording-coupled claims stay true, not require byte-identical raw counts across time"

requirements-completed: [EVID-01, EVID-02, EVID-03]

coverage:
  - id: D1
    description: "Report URL appears exactly once in the sitemap with a literal ship-date lastModified, and the page is self-canonical and indexable (interim robots directive removed)"
    requirement: EVID-03
    verification:
      - kind: unit
        ref: "app/__tests__/sitemap.test.ts"
        status: pass
      - kind: unit
        ref: "app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx#exports a self-canonical metadata URL"
        status: pass
    human_judgment: false
  - id: D2
    description: "public/research/README.md provenance record names both committed artifacts, the fixed window, row counts, the exact reproducing command, the metric-to-query mapping, and the data-sensitivity note"
    requirement: EVID-02
    verification:
      - kind: other
        ref: "grep -q 'Reproducing command'/'2026-06-01'/'2026-08-31'/'run-research-report.py' public/research/README.md (all pass, this session)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Pipeline re-run pins the final published snapshot; the four displayed finding values (18.0/84.8/45.5/29.5) hold after rounding, every wording-coupled H2 claim still matches its value, every published segment clears the 10-guild floor, and a second immediate re-run reproduces byte-identically against the pinned snapshot"
    requirement: EVID-02
    verification:
      - kind: other
        ref: "python3 scripts/analytics/run-research-report.py (x2, this session) + diff -q against pinned commit + python3 floor/selection-order check"
        status: pass
      - kind: unit
        ref: "python3 -m unittest discover -s scripts/analytics -v (101/101)"
        status: pass
    human_judgment: false
  - id: D4
    description: "methodology.window copy revised byte-for-byte per fresh user sign-off, in the copy draft, page.tsx, and the render test, with the approved-string parity gate green"
    verification:
      - kind: unit
        ref: "app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx#renders every approved methodology string with tokens resolved"
        status: pass
      - kind: other
        ref: "token-aware APPROVED-STRING literal-match loop against 03-COPY-DRAFT.md (this session, excluding the documented page.read-time pre-ship-recalculation exception)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Root cause of the reproduction drift is documented and classified as a legitimate data change (not a pipeline defect)"
    verification:
      - kind: other
        ref: ".planning/debug/research-report-one-row-drift.md (status: diagnosed, classification: legitimate-data-change)"
        status: pass
    human_judgment: false

duration: 50min
completed: 2026-09-06
status: complete
---

# Phase 03 Plan 06: Publish the Report, Pin the Final Snapshot, and Fix the Reproducibility Claim Summary

**Final report published (sitemap entry, indexable, self-canonical) with a pinned live-data snapshot, a provenance-documented `public/research/README.md`, and an honestly revised methodology sentence disclosing that post-window re-approvals can legitimately move a published number.**

## Performance

- **Duration:** ~50 min (across two sessions: Task 1 same-day, Task 2 following day after a debugging detour)
- **Tasks:** 2 completed
- **Files modified:** 11 across the whole plan (9 in this continuation)

## Accomplishments

- Report URL is in the sitemap exactly once with a literal `new Date(2026, 8, D)` `lastModified`; the interim `robots` directive is removed; the page is self-canonical (Task 1, prior session)
- `public/research/README.md` created: provenance table, metric-to-query-file mapping, four withheld-metric reasons, and a data-sensitivity note, extending the Phase 1 exports README convention
- Root cause of a reproduction-drift blocker fully diagnosed via systematic, read-only, aggregate-only debugging: a raider's client-side auto-save silently reverted an already-approved list to `draft` with no audit trail, the raider resubmitted it, and an officer re-approved it after the report's fixed window closed, moving that one list out of the window under the report's own `COALESCE(reviewed_at, submitted_at)` definition. Classified as a legitimate data change, not a pipeline defect.
- User authorized a pin-and-fix publication: the pipeline was re-run once, that run's output was pinned as the final snapshot, and a second immediate re-run proved idempotence (byte-identical) against the pinned commit
- `methodology.window` revised, with a fresh user sign-off, to honestly disclose the live-data reproducibility caveat instead of claiming indefinite reproducibility
- Both STATE.md reproduction-drift blockers cleared as resolved
- Two items logged to `deferred-items.md`: the unaudited `doAutoSave` draft-reversion gap, and a post-sprint candidate to redefine the report population on first-ever approval timestamps

## Task Commits

Each task was committed atomically:

1. **Task 1: Sitemap entry, indexability, and the self-canonicality gate** - `c2df325` (feat)
2. **(Blocker record) Reproduction-drift blocker pending human decision** - `0512127` (docs)
3. **(Blocker record) Second reproduction-drift blocker beyond diagnosed case** - `4d56b0a` (docs)
4. **Task 2a: Revise methodology.window copy per fresh user sign-off** - `7b02265` (docs)
5. **Task 2b: Pin final research-report snapshot and publish provenance** - `6786b68` (feat)

**Plan metadata:** (this commit, see below)

## Files Created/Modified

- `app/sitemap.ts` - Adds the report's sitemap entry with a literal ship-date `lastModified`
- `app/__tests__/sitemap.test.ts` - Guards single-occurrence, whole-array uniqueness, `lastModified` stability, sitemap-to-canonical agreement, and the absent robots override
- `app/research/wow-classic-loot-systems-2026/page.tsx` - Robots directive removed (Task 1); `methodology.window` string revised (Task 2)
- `app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx` - `methodology.window` parity fixture updated to match the revised sentence
- `.planning/phases/03-anonymized-product-data-report/03-COPY-DRAFT.md` - `methodology.window` APPROVED-STRING revised; SIGN-OFF ADDENDUM recorded (2026-09-05)
- `public/research/README.md` - New: provenance table, metric-to-query mapping, data-sensitivity note, live-data drift disclosure
- `public/research/wow-classic-loot-systems-2026-aggregates.json` / `.csv` - Regenerated and pinned as the final published snapshot (`generated_at: 2026-09-06T01:01:48Z`)
- `.planning/debug/research-report-one-row-drift.md` - Root-cause debug record (H2 confirmed, H1/H3 ruled out)
- `.planning/phases/03-anonymized-product-data-report/deferred-items.md` - Two new items logged
- `.planning/STATE.md` - Both reproduction-drift blockers marked resolved

## Decisions Made

- **Pin-and-fix over byte-identical reproduction:** given the dataset is live and edits happen in production between generations, the publication contract was adapted to gate on the four displayed finding values and their wording-coupled claims staying true, rather than requiring the exact 452/583/2296 denominators from the original committed artifact. This is the user's explicit decision, made after the debug session ruled out a pipeline defect.
- **methodology.window revised, not just re-approved as-is:** the original sentence ("stays reproducible against the exact same window, indefinitely") was an overreach once the drift was understood to be a real phenomenon, not a bug to fix once and forget. The user signed off on a replacement sentence disclosing the caveat honestly.
- **Root cause classified as legitimate-data-change, not defect:** confirmed via six independent read-only aggregate probes against production (no PII, no character/guild/user identifiers ever selected) that a single list's `reviewed_at` moved out of the window through an ordinary edit-resubmit-reapprove cycle, made possible by an unaudited client-side draft-reversion path (`LootListContext.doAutoSave`).

## Deviations from Plan

### Auto-fixed / Sanctioned Deviations

**1. [User-authorized pin-and-fix] Task 2's `<verify>` byte-identical reproduction check adapted to the pinned snapshot**
- **Found during:** Task 2, on resume after two blocker checkpoints
- **Issue:** The plan's original verify block diffs a fresh re-run against the artifact committed at the *start* of this plan (452/583/2296 baseline). Two independent debug sessions established that production data legitimately changed between that commit and every subsequent re-run (a real re-approval moving a list out of the fixed window), so the literal "diff against the old commit" check could never pass again without either a data rollback (impossible and undesirable) or a rewritten check.
- **Fix:** Per explicit user authorization ("pin-and-fix-the-sentence": publish the pipeline's next snapshot as final), re-ran the pipeline once, pinned that output as the new committed artifact, then re-ran the reproduction check against *that* pinned commit instead of the stale pre-drift baseline. A second immediate re-run proved idempotence against the pinned snapshot, and the plan's hard gate (18.0/84.8/45.5/29.5 unchanged after rounding, every wording-coupled H2 claim still true, 10-guild floor cleared) was honored throughout.
- **Files modified:** `public/research/wow-classic-loot-systems-2026-aggregates.json`, `.csv`, `public/research/README.md`
- **Verification:** Two consecutive re-runs of `python3 scripts/analytics/run-research-report.py` produced byte-identical output; the plan's `python3 -c` floor/selection-order check passed; the four displayed values matched exactly.
- **Committed in:** `6786b68`

**2. [Rule 2 - Missing critical, honest disclosure] Revised methodology.window instead of shipping the original overreaching sentence**
- **Found during:** Task 2, after root-cause debugging confirmed the drift is a recurring, structural phenomenon of the report's own population definition, not a one-time anomaly
- **Issue:** The originally approved sentence claimed every number "stays reproducible against the exact same window, indefinitely," which the debug session proved false in a way that will recur (any future re-approval of an edited, previously-approved list can move a number again)
- **Fix:** User provided a fresh, explicit sign-off (2026-09-05) for a replacement sentence disclosing the caveat. Applied byte-for-byte to `03-COPY-DRAFT.md` (with a SIGN-OFF ADDENDUM line), `page.tsx`, and the render test's parity fixture. Approved-string parity gate re-run green (excluding the pre-existing, separately-documented `page.read-time` recalculation exception).
- **Files modified:** `.planning/phases/03-anonymized-product-data-report/03-COPY-DRAFT.md`, `app/research/wow-classic-loot-systems-2026/page.tsx`, `app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx`
- **Verification:** `npx vitest run` on both suites (31/31 pass); manual token-aware parity check against `03-COPY-DRAFT.md`; em/en-dash grep clean (verified via Python, since shell glob-based grep for these Unicode characters was unreliable in this environment)
- **Committed in:** `7b02265`

---

**Total deviations:** 2, both user-authorized adaptations of the publication contract to reflect that the underlying dataset is live, not a fixed historical snapshot.
**Impact on plan:** No scope creep. Both deviations were anticipated by the plan's own "PLANNER ASSUMPTION (byte-identical re-run)" flagged assumption, which explicitly named "a legitimate number move" as an expected case requiring re-run, re-verify-floor, and record, not a relaxed check.

## Issues Encountered

- **Two-round reproduction drift, requiring a full debugging session:** the first re-run of the committed pipeline produced a stable, reproducible single-row drift (452→451, 583→582) rather than an error. A systematic debugging session (H1 hard-delete, H2 update-escape, H3 pipeline nondeterminism) ruled out a pipeline defect and confirmed H2: an unaudited client-side draft-reversion path let a raider silently knock an approved list back to `draft`, then legitimately resubmit and get it re-approved after the window closed. A second re-run (following day) surfaced *additional* movement beyond the diagnosed case (denominator 582→581, top-priority-bracket 2296→2298), which the user recognized as further evidence the dataset is genuinely live rather than a fixable anomaly, and authorized pinning whatever the pipeline reports at execution time, gated only on the four displayed finding values.
- **`npm run lint` and `npm run build` pre-existing, out-of-scope gaps:** consistent with prior phase documentation, whole-project `npm run lint` fails on an unrelated `react-hooks/purity` plugin-resolution error, and `npm run build` aborts on the unrelated `/api/guild-count` route's missing `SUPABASE_SERVICE_ROLE_KEY`. Both verified instead via scoped `npx eslint` (clean on every file this plan touched) and Turbopack compile + TypeScript phases (both succeed) per the environment notes.

## Next Phase Readiness

- Phase 03 is complete: all 6 plans executed, EVID-01/EVID-02/EVID-03 marked complete in REQUIREMENTS.md
- The report is live, indexable, self-canonical, and its data is downloadable with a provenance record a stranger can follow
- No search-engine recrawl was requested (correctly deferred to Phase 5, per the roadmap's "recrawl once, after all content is final" constraint)
- Two items carried forward in `deferred-items.md` for future consideration (the unaudited autosave path; a population-definition change to make future re-runs of closed windows stable)

---
*Phase: 03-anonymized-product-data-report*
*Completed: 2026-09-06*

## Self-Check: PASSED

- All key files verified present on disk (11/11): `app/sitemap.ts`, `app/__tests__/sitemap.test.ts`, `app/research/wow-classic-loot-systems-2026/page.tsx`, `app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx`, `public/research/README.md`, `public/research/wow-classic-loot-systems-2026-aggregates.json`, `.csv`, `.planning/debug/research-report-one-row-drift.md`, `.planning/phases/03-anonymized-product-data-report/03-COPY-DRAFT.md`, `deferred-items.md`, this SUMMARY.
- All 5 commits verified in `git log --oneline --all` (`c2df325`, `0512127`, `4d56b0a`, `7b02265`, `6786b68`).
- Both tasks' full acceptance criteria and the plan-level `<verification>` block re-run at close-out: `npx vitest run app/__tests__/sitemap.test.ts app/research/wow-classic-loot-systems-2026/__tests__/page.test.tsx` (31/31 pass), `grep -c` sitemap-entry count (1), `npm run typecheck` (clean), scoped `npx eslint` on every file this plan touched (clean), `python3 -m unittest discover -s scripts/analytics -v` (101/101), `npm test` (845/845), README provenance grep checks (all pass), two consecutive pipeline re-runs byte-identical against the pinned commit, floor/selection-order Python check (4 findings, order matched, all segments clear the floor), diff-scoped em/en-dash check via Python (0 in every file this plan touched).
