# Debug Knowledge Base

Patterns extracted from resolved `/gsd-debug` sessions. Check here first: a matching
signature can collapse a full investigation into a single confirmation.

---

## KB-001 — A resolved setting used to bound a fetch must also be threaded into the engine that scores it

**Session:** `.planning/debug/resolved/deleted-team-attendance-zero.md` (2026-09-02)
**Area:** attendance scoring, raid-team setting resolution
**Bug class:** Bohrbug (deterministic, reproduces on every load)

### Signature

- A metric reads **zero with a zero denominator** ("0 of 0"), not a wrong non-zero value
- The wrongness is **uniform across every row/user**, a constant delta rather than scattered
- **Some surfaces are correct and some are not**, and the correct ones are exactly those that
  either ignore the scoped override or thread it correctly (here: addon export and Discord bot
  were right; Overview, Master Sheet and the attendance page were wrong)
- No error anywhere; the empty result renders as ordinary "nothing yet" copy

### Root cause pattern

One logical window, two independent computations. Each web surface resolved the team's
`rolling_weeks_override`, used it to bound the `raid_events` **fetch**, and then passed the
**guild's** settings object as `computeAttendance`'s `config`. Fetch window and scoring window
could therefore disagree. A second defect supplied the disagreement: `rolling_weeks_override = 0`
was storable (input `min={0}`, no API validation, no DB CHECK, `resolveRollingWeeks` passed it
through), and a zero-week window makes `getAttendanceWindowStart` return `windowEnd + 1` — a
start after the end.

Both were required. A sane override hid the code drift; correct threading would have made the
bad override visible as a consistently narrow window instead of a silent zero.

### Generalizable lessons

1. **Pair the window with its consumer.** If a value bounds a query, return it and the derived
   bound together from one function so a caller cannot fetch by one and score by another.
   `resolveAttendanceWindow()` exists for this: it returns `{ rollingWeeks, fetchStart }`.
2. **"Inherit" must have exactly one representation.** The field's contract was "leave empty to
   inherit", so `null` means inherit and `0` means nothing at all. A value with no defined
   meaning that still typechecks will eventually be stored. Reject it at the write boundary,
   normalize it on read, and make the UI incapable of producing it.
3. **A browser number input with `min={0}` will produce 0.** A stepper click on an empty field
   lands on the floor. The floor should be the smallest *meaningful* value.
4. **Surface asymmetry localizes the defect faster than any single surface.** "Why is the export
   right when the page is wrong?" pointed at the exact line. Diff the working path against the
   broken one before reading either in depth.
5. **A test can encode the bug.** `settings.test.ts` asserted `resolveRollingWeeks(4, 0) === 0`
   with the comment "0 is a valid override (e.g., no rolling window)". Nothing in docs,
   migrations, or the UI supported that. When a fix requires inverting an assertion, check
   whether the assertion was ever a product decision or just an unexamined edge case, and get
   sign-off before flipping it.

### Watch for the same shape elsewhere

- The **raid-days-per-week** override input also uses `min={0}`. Explicitly out of scope for the
  session (different symptom: an empty `raidDays` array disables the day filter rather than
  emptying the result), but it is the same input-floor defect and is worth auditing.
- Any other place that pre-filters rows by date before handing them to a domain engine that also
  computes its own window.

### Investigation notes worth reusing

- **Arithmetic elimination beat a production query.** The stored value was pinned to exactly `0`
  by testing each candidate against the reported dates: `null`/`2` leave ≥3 of 4 events in range,
  `1` leaves 1, only `0` leaves none. This satisfied the org data policy (no customer rows pulled
  into the session) and was faster than obtaining prod access.
- **The intake hypothesis was wrong and cost nothing to kill.** "Deleting a raid team orphaned the
  events" died on two schema facts: the FK is `ON DELETE SET NULL`, and `resolveOwnedEvents`
  explicitly *includes* null-team events. Read the FK actions and the filter before theorizing
  about orphaned rows. The deletion was the *occasion* (it prompted the officer to open the team
  editor and "reset" it), not the cause — beware trigger/cause conflation in user reports.

### Open residual risk on this session

Production verification is **pending post-deploy**. If the Overview shows a **non-zero but wrong**
denominator after deploy, the stored override was not `0`/negative: fix (a) did not apply to that
guild, only the fetch-vs-score fixes (b)/(c) did. Reopen on the window pairing, not on the
override value.
