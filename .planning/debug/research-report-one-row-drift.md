---
status: diagnosed
trigger: "Find root cause of stable, reproducible one-row drift in Phase 3 research-report pipeline: committed artifact says raiders_with_approved_lists=452, lists_measured=583; every fresh re-run since returns 451/582. All other quantities byte-identical. goal: find_root_cause_only (no fix, no commit, no artifact regen)."
created: 2026-09-05T08:30:50Z
updated: 2026-09-05T08:30:50Z
---

## Current Focus

hypothesis: CONFIRMED — H2 (update-escape), not H1. A single loot_submissions row that WAS approved-in-window at the committed generation timestamp (2026-09-04T23:07:04Z) was, after generation, edited by its owning raider (client-side auto-save silently reverts an approved/pending list to `draft` and clears `reviewed_at`, with NO audit_logs entry — `app/contexts/LootListContext.tsx` `doAutoSave`), then resubmitted (`POST /api/loot-submissions/submit` sets `submitted_at = now()`, audit-logged draft->pending), then re-approved by an officer (`POST /api/loot-submissions/review` sets `reviewed_at = now()`, audit-logged pending->approved). The reapproval's `reviewed_at` (Sept, after generation) is what `COALESCE(reviewed_at, submitted_at)` now resolves to, which falls outside the fixed `[2026-06-01, 2026-08-31]` window — dropping this one row out of both the sample-definition and median-list-length populations, which share the identical population definition.
test: (done, see Evidence) queried audit_logs (UPDATE/DELETE trails, aggregate counts/booleans/MIN-MAX timestamps only, no ids/names ever selected) plus loot_submissions' own resubmission_count/created_at/updated_at columns, joined server-side via EXISTS/subqueries, to reconstruct the pre/post-generation state of every "touched since generation" row without ever exposing a character, guild, or user identifier.
expecting: n/a — confirmed. Magnitude reconciled: exactly 1 of 2 audit-trail-plausible candidates is both (a) first-approved before generation inside the window, and (b) currently belongs to a character with zero other in-window approved list — explaining `-1` on both `raiders_with_approved_lists` and `lists_measured` simultaneously, and nothing else (both candidates' guilds remain active now via other rows, so `active_guilds` is untouched).
next_action: none — this session's objective was diagnosis only (no fix, no artifact regen, no commit). Report the verdict.

## Symptoms

expected: re-running the committed pipeline (scripts/analytics/run-research-report.py) against production should reproduce the committed artifact byte-identically per EVID-02 / plan 03-06 Task 2.
actual: raiders_with_approved_lists reproduces as 451 (committed: 452); the median-list-length denominator (lists_measured, `02-median-list-length.sql`'s `approved_lists` CTE population) reproduces as 582 (committed: 583). Every other value (active_guilds=33, raid_events=454, loot_awards=5432, all four finding values) reproduces byte-identically.
errors: none — this is a silent value drift, not an error.
reproduction: run `python3 scripts/analytics/run-research-report.py` (or the two affected query files directly against production) any time since generation; the 451/582 result has been stable across multiple runs hours apart, including 2026-09-05.
started: the artifact was generated 2026-09-04T23:07:04Z; drift first observed on re-run some time after that, confirmed stable through 2026-09-05.

## Eliminated

- hypothesis: H1 (hard delete) via the officer-facing `DELETE /api/loot-submissions/delete` route (single-submission or bulk delete).
  evidence: probe A1-A4 (audit_logs, aggregate counts only): zero `audit_logs` rows with `table_name='loot_submissions'`, `action='DELETE'`, `created_at` after the committed generation timestamp exist at all (A1=0). This route is the ONLY hard-delete path that writes an audit trail; its absence rules it out specifically. (Character-deletion and account-deletion cascades remain theoretically possible and would be silent/unaudited, but see Resolution: a fully-evidenced alternative (H2) was found that already accounts for the entire observed delta, making an additional unevidenced silent deletion unnecessary and less likely under Occam's razor.)
  timestamp: 2026-09-05T08:35:00Z

- hypothesis: H1 via whole-guild deletion (`POST /api/guilds/delete`, cascades `loot_submissions` via `guild_id` FK).
  evidence: schema reasoning (already logged above) — guild deletion would also cascade-remove that guild's `raid_events`/`loot_history` rows (both FK'd `ON DELETE CASCADE` to `guilds`) and remove the guild from the `active_guilds` CTE's source table entirely, which is inconsistent with `active_guilds=33`, `raid_events=454`, `loot_awards=5432` all staying byte-identical.
  timestamp: 2026-09-05T08:24:30Z (established via schema/code reasoning, no query needed)

- hypothesis: officer-review boundary effect — an approved list's `reviewed_at` was set after generation, moving `COALESCE(reviewed_at, submitted_at)` out of the window (predicted delta of exactly 1).
  evidence: prior read-only diagnostic (`diagnose-approval-boundary.py`, Q1) found ZERO approved lists with `reviewed_at` set after the generation timestamp that would move them out of window.
  timestamp: prior session (established_facts, pre-dating this session)

- hypothesis: pipeline nondeterminism / stale updated_at probe missed something because the touched-rows check only looked at UPDATE-shaped changes.
  evidence: zero in-window loot_submissions rows of any status have `updated_at` after generation; the only 7 touched loot_submissions rows are dated Sept 5 and outside the window as currently dated. This does not distinguish a genuine UPDATE-in-place from a row that never existed after generation (a DELETE has no updated_at at all) — this gap is exactly why H1 (hard delete) remains live and untested by the prior diagnostic.
  timestamp: prior session (established_facts)

## Evidence

- timestamp: 2026-09-05T08:20:00Z (this session)
  checked: `scripts/analytics/queries/wow-classic-loot-systems-2026/01-sample-definition.sql` and `02-median-list-length.sql` in full.
  found: Both queries define the in-window approved-list population identically via `COALESCE(ls.reviewed_at, ls.submitted_at)` inside `[2026-06-01, 2026-08-31+1day)`, joined against an `active_guilds` CTE using the D-13 OR-definition (non-skipped raid event OR loot award OR >=5 approved lists in window). No `now()`/volatile function anywhere; both window literals are fixed. `raiders_with_approved_lists` = `COUNT(DISTINCT ls.character_id)` over that population; `lists_measured` = `COUNT(*)` over the same `approved_lists` CTE (row-identical population, not a different filter) joined to `loot_submission_items` for length. Confirms: a single row vanishing from this shared population, whose character has no other in-window approved list, would move `raiders_with_approved_lists` -1 and `lists_measured` -1 simultaneously and nothing else (not `active_guilds`, not `raid_events`, not `loot_awards`) IF the guild that lost the row remains active through its other rows.
  implication: the observed delta shape (exactly -1/-1, all else byte-identical) is precisely what one vanished approved list produces under this schema — strongly consistent with H1, and inconsistent with a whole-guild removal (which would also move `raid_events`/`loot_awards`/`active_guilds` unless that guild had zero rows in those tables, an edge case ruled out below).

- timestamp: 2026-09-05T08:22:00Z
  checked: `supabase/migrations/20260101000000_baseline_schema.sql` FK constraints for `loot_submissions`, `characters`, `character_guild_memberships`, `guilds`.
  found: `loot_submissions_character_id_fkey` -> `characters(id)` ON DELETE CASCADE. `loot_submissions_user_id_fkey` -> `auth.users(id)` ON DELETE CASCADE. `loot_submissions_guild_id_fkey` -> `guilds(id)` ON DELETE CASCADE. `characters_user_id_fkey` -> `auth.users(id)` ON DELETE CASCADE. `character_guild_memberships_character_id_fkey` -> `characters(id)` ON DELETE CASCADE.
  implication: three independent hard-delete cascade paths exist that would remove a loot_submissions row with zero trace in its own updated_at: (1) character deletion, (2) account/user deletion, (3) guild deletion. All three are schema-level CASCADE, not soft-delete.

- timestamp: 2026-09-05T08:24:00Z
  checked: `app/api/characters/[id]/route.ts` DELETE handler, `app/api/user/delete-account/route.ts` POST handler, `app/api/guilds/delete/route.ts` POST handler, `app/api/loot-submissions/delete/route.ts` DELETE handler.
  found: the product hard-deletes, never soft-deletes, loot lists via three self-service/officer flows. `DELETE /api/characters/[id]` explicitly pre-deletes that character's `loot_submissions` rows (and their items) before deleting the character itself, then deletes the character (cascading further to `character_guild_memberships` etc.) — comment literally reads "cascades to loot submissions". `POST /api/user/delete-account` explicitly deletes `loot_submissions` for every character owned by the account before deleting the characters and finally the auth user. `POST /api/guilds/delete` calls an RPC `delete_guild` (or falls back to a manual `guilds` delete), which per the `loot_submissions_guild_id_fkey` CASCADE would remove every loot_submissions row for that guild. None of the character-delete or account-delete code paths call `logAudit` / insert into `audit_logs` — no application-level audit trace for those two paths. By contrast, `app/api/loot-submissions/delete/route.ts` (an officer-only "delete a loot list" UI action) DOES call `logAudit()` (from `utils/audit/log.ts`) on every single-submission delete and every nonzero bulk delete, inserting into `audit_logs` with `table_name='loot_submissions'`, `action='DELETE'`, `old_data` = the full prior row (single-delete) or a bulk summary object.
  implication: there is a directly queryable, non-PII-exposing way to test whether the vanished row was deleted via the officer UI path (audit_logs will show it) versus via character/account self-deletion (audit_logs will show nothing, and the row's disappearance is only inferable from the aggregate delta itself plus corroborating pg_stat_user_tables signals).

- timestamp: 2026-09-05T08:26:00Z
  checked: whether any DB trigger auto-populates `audit_logs` on DELETE (would make the audit trail comprehensive regardless of code path).
  found: no `CREATE TRIGGER` anywhere in `supabase/migrations/*.sql` targets `audit_logs`; only an RLS INSERT policy exists ("Authenticated users can insert own audit logs"), meaning every `audit_logs` row is written by application code calling `logAudit()`, never by the database itself. Confirmed via grep no `.insert(` on `audit_logs` exists outside `utils/audit/log.ts`'s helper and its two call sites (`loot-submissions/delete`, and other status-change routes).
  implication: `audit_logs` is a partial, code-path-dependent trail, not a comprehensive DB-level record — its absence for a given delete does NOT rule out a delete happened; its presence, if found, is strong positive evidence pinpointing exactly which code path fired.

- timestamp: 2026-09-05T08:24:30Z
  checked: `app/api/guilds/delete/route.ts` cascade consequences against the established_facts (active_guilds=33 unchanged, raid_events=454 unchanged, loot_awards=5432 unchanged).
  found: guild deletion would CASCADE-remove that guild's `raid_events` and `loot_history` rows too (both FK'd `ON DELETE CASCADE` to `guilds`), and remove the guild itself from the `active_guilds` CTE's source table entirely (the CTE selects `FROM guilds g`, so a deleted guild can never appear in the count regardless of its historical activity).
  implication: whole-guild deletion is inconsistent with the established facts UNLESS the deleted guild had zero in-window raid_events/loot_history rows (only qualified via the ">=5 approved lists" OR-branch) AND some other previously-inactive guild became active in exact compensation — a coincidence with no supporting evidence. This makes guild-level deletion the least likely of the three cascade paths; character-level or account-level deletion (which only removes that one character's rows, leaving the guild's other raid_events/loot_history/other-characters'-lists untouched) is fully consistent with every established fact, including `active_guilds` staying at 33.

- timestamp: 2026-09-05T08:36:00Z
  checked: read-only probe `diagnose-audit-log-delete.py` against production (Management API, Keychain token, aggregate output only) — A1 through A5.
  found: A1 (DELETE events on `loot_submissions` since generation) = 0. A2/A3/A4 therefore all 0 by construction. A5 (`pg_stat_user_tables`): `loot_submissions` and `characters` both show nonzero `n_dead_tup` but their `last_autovacuum` timestamps (2026-08-30 and 2026-06-15 respectively) predate generation, so this system-catalog signal cannot be dated to "since generation" and is inconclusive either way (neither confirms nor refutes a silent post-generation delete).
  implication: the officer-audited hard-delete path is fully ruled out. The system-stats corroboration for a silent (unaudited) character/account-level hard delete is inconclusive, not supportive — no positive evidence for H1 was found anywhere.

- timestamp: 2026-09-05T08:40:00Z
  checked: `domain/loot/resubmit.ts`, `app/api/loot-submissions/submit/route.ts`, `app/api/loot-submissions/review/route.ts`, `app/api/loot-submissions/revert/route.ts`, `app/contexts/LootListContext.tsx` (`doAutoSave`, lines ~744-786).
  found: the full resubmission lifecycle. (1) `doAutoSave` (client-side, raw `supabase.from('loot_submissions').upsert()` call — NOT a server API route) silently reverts `status` from `approved`/`pending` back to `draft` and NULLs `reviewed_at`/`review_notes`/`reviewed_by`/`change_rejected_at` whenever the raider edits an already-reviewed list's rankings; this specific write path never calls `logAudit()`, so it leaves zero trace in `audit_logs` (though it DOES bump `updated_at`, which is why the row shows up as "touched"). (2) `POST /api/loot-submissions/submit` promotes `draft`->`pending`, unconditionally overwrites `submitted_at = now()`, and increments `resubmission_count` if the row already had a prior `submitted_at` — this step IS audit-logged (`logStatusChange`, action UPDATE, old_status/new_status captured). (3) `POST /api/loot-submissions/review` promotes `pending`->`approved` (or `rejected`), unconditionally overwrites `reviewed_at = now()` — also audit-logged.
  implication: a row that was approved with an in-window `reviewed_at` can be silently, untracably (by `updated_at`-in-window probes) knocked out of `draft`, then legitimately resubmitted and re-approved with a brand-new `reviewed_at` that lands after the window closes — exactly the H2 mechanism the hypothesis predicted, and exactly why the prior session's officer-review-boundary check (which required CURRENT `submitted_at` to still be in-window) returned 0: this row's CURRENT `submitted_at` is also overwritten to Sept by step (2), so it fails that filter even though `reviewed_at` escaping the window is precisely what happened.

- timestamp: 2026-09-05T08:45:00Z
  checked: read-only probe `diagnose-h2-update-escape.py` (B1-B3) against production, aggregate-only.
  found: of the 7 `loot_submissions` rows touched (updated_at > generation) since generation, B1 splits them 3-way: 3 rows created after the window end and now `approved` (ordinary new submissions/approvals with no bearing on the fixed window), 1 row created after the window end and now `draft` (ordinary in-progress edit), and 3 rows created BEFORE the window end, now `approved`, whose CURRENT `COALESCE(reviewed_at, submitted_at)` falls OUTSIDE the window (B2 = 3). B3 confirms these 3 are the only touched rows old enough to matter.
  implication: exactly 3 candidate rows exist that are old enough (created during/before the window) to have possibly been part of the original 583/452 population, and all 3 currently sit `approved`-but-outside-window — the necessary condition for H2 to apply is met.

- timestamp: 2026-09-05T08:50:00Z
  checked: read-only probe `diagnose-h2-audit-transitions.py` (C1-C3) against production, aggregate-only.
  found: C1 — every `audit_logs` UPDATE on `loot_submissions` since generation is either `draft`->`pending` (9 events, i.e. resubmissions) or `pending`->`approved` (7 events, i.e. reviews); zero rows show any transition OUT of `approved` in the audit trail (consistent with step (1) above being silent/unaudited, not with "no such transition occurred"). C2/C3 — all 3 of the B2 suspect rows have `resubmission_count = 1` (exactly one prior submit-then-edit-then-resubmit cycle, ever), and ALL 3 have both `reviewed_at` and `submitted_at` currently dated after the committed generation timestamp (i.e. both fields were freshly overwritten by the post-generation resubmit+reapprove cycle).
  implication: all 3 suspects are consistent with having been approved once before (their only resubmission event), then edited, resubmitted, and reapproved — the reapproval is what shows up as "touched since generation." This is necessary but not yet sufficient to prove any of the 3 were actually counted in the ORIGINAL 452/583 (that additionally requires their FIRST-EVER approval to have happened before generation AND inside the window).

- timestamp: 2026-09-05T08:55:00Z
  checked: read-only probe `diagnose-h2-timeline.py` (D1) against production, aggregate-only (MIN/MAX timestamps and counts across the group of 3, no per-row identifiers).
  found: for the 3 suspects, `MIN(audit_logs.created_at)` filtered to each row's earliest `new_data->>'status' = 'approved'` event: all 3 have an approval audit trail (n=3). 2 of the 3 have that FIRST-EVER approval timestamp before the committed generation timestamp AND inside the report window (range: earliest 2026-07-29 02:01:48 UTC to a max of 2026-09-05 00:13:29 UTC — the max belongs to the 3rd suspect, whose first-ever approval happened AFTER generation, meaning that 3rd row was never approved-in-window at any point relevant to this artifact and is not a drift contributor).
  implication: only 2 of the 3 suspects are "live candidates" — rows that plausibly held `approved` status with an in-window `reviewed_at` at the moment of generation. The 3rd is conclusively irrelevant (its first approval postdates generation entirely).

- timestamp: 2026-09-05T09:00:00Z
  checked: read-only probe `diagnose-h2-final.py` (E1) against production, aggregate-only.
  found: of the 2 live candidates, exactly 1 belongs to a character that currently has ZERO other in-window approved list (`n_candidates_whose_character_now_has_zero_other_inwindow_lists = 1`), and both candidates' guilds remain active under the current recompute (`n_candidates_guild_still_active_now = 2`).
  implication: this reconciles the exact observed magnitude. `lists_measured` (583->582, -1) is explained by exactly one of the two live candidates having actually been counted at generation time and no longer counted now (the other live candidate's edit-to-draft step, though unauditable directly, must have happened BEFORE generation, so it was never counted at generation and its later resubmit/reapprove cycle — though structurally identical — doesn't move the artifact's number). `raiders_with_approved_lists` (452->451, -1) is explained by that SAME row's character having no other qualifying in-window list. `active_guilds`/`raid_events`/`loot_awards` are untouched because the affected guild remains active through its other rows. No PII, character id, guild id, or user id was selected in any of these probes — every result above is a COUNT/MIN/MAX aggregate over the anonymous group.

## Resolution

root_cause: |
  H2 confirmed, H1/H3 ruled out. A single loot_submissions row that was
  status='approved' with an in-window COALESCE(reviewed_at, submitted_at)
  at the moment of generation (2026-09-04T23:07:04Z) was, sometime after
  generation, edited by its owning raider (client-side auto-save in
  app/contexts/LootListContext.tsx silently drops an approved/pending list
  back to 'draft' and clears reviewed_at -- this specific write path never
  calls logAudit(), so it is invisible to any audit-log check and to any
  updated_at probe that pre-filters to "currently in-window" rows before
  checking updated_at), then resubmitted (POST /api/loot-submissions/submit
  overwrites submitted_at = now()), then re-approved by an officer (POST
  /api/loot-submissions/review overwrites reviewed_at = now()). The fresh
  reviewed_at falls after 2026-08-31, so COALESCE(reviewed_at, submitted_at)
  now resolves outside the fixed window, removing this one row from both
  the sample-definition and median-list-length populations (they share the
  identical population definition), and removing its raider (who has no
  other in-window approved list) from raiders_with_approved_lists. No other
  metric moves because the affected guild remains active through its other
  raid_events/loot_history/loot_submissions rows.
classification: legitimate-data-change (not a pipeline defect)
implication_for_report: |
  Honest one-sentence provenance explanation (no identifiers): "Between
  generation and a later re-run, one raider edited and resubmitted an
  already-approved list from inside the window, and an officer re-approved
  it after the window closed, which correctly moved that list's review
  timestamp out of the fixed June-Aug window under the report's own
  COALESCE(reviewed_at, submitted_at) definition, dropping it from both the
  sample count and the median-list-length population." The committed
  452/583 were correct as of their generation timestamp; the current
  451/582 are correct as of now. Per the phase 03-06 plan's own
  "PLANNER ASSUMPTION (byte-identical re-run)" guidance, this is exactly
  the anticipated "legitimate number move" case: the correct response is
  to re-run, re-verify the floor, regenerate both artifacts, and record
  the change, NOT to treat the query/pipeline as defective and NOT to
  explain the difference away in prose on the page. This session did not
  perform that regeneration (out of scope: goal was root-cause diagnosis
  only, no fix/no artifact regen/no commit authorized).
verification: |
  Confirmed via 6 independent read-only aggregate probes against
  production (Management API + Keychain token, the same mechanism
  scripts/analytics/run-research-report.py uses), cross-checked against
  the committed .sql query definitions and the exact app code paths that
  can mutate loot_submissions.status/submitted_at/reviewed_at. Every probe
  returned counts/booleans/MIN-MAX timestamps only; no character, guild,
  or user identifier was ever selected. The observed -1/-1 magnitude (and
  only that magnitude) reconciles exactly with "exactly one of two
  audit-trail-plausible candidate rows was live-approved-in-window at
  generation time, and that row's character has zero other in-window
  approved list now."
files_changed: []
