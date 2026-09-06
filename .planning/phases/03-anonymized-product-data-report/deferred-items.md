# Deferred Items — Phase 03

Out-of-scope discoveries found during plan execution, logged per the executor's
scope-boundary rule (not fixed, not part of this phase's task files).

## From 03-01

1. **`npm run lint` fails repo-wide with an ESLint config error**, unrelated to
   any file this plan touches:
   ```
   ESLint: 9.39.2
   A configuration object specifies rule "react-hooks/purity", but could not
   find plugin "react-hooks".
   ```
   Pre-existing (`eslint.config.mjs` last touched at commit `b807e2f`,
   "Ratchet React Compiler react-hooks rules to error with grandfathered
   files (#159)"). Confirmed unrelated to this plan: `npx eslint <file>` run
   directly against every file this plan created/modified passes with zero
   errors. Full-project `npm run lint` needs `eslint-plugin-react-hooks`
   registered correctly in `eslint.config.mjs` for the `react-hooks/purity`
   rule to resolve.

2. **`npm run build` cannot complete in this sandbox** because the
   pre-existing `/api/guild-count` route (unrelated to this phase, last
   touched well before this session) requires `SUPABASE_SERVICE_ROLE_KEY` at
   build time to prerender, and that secret is not present in this
   environment (and this executor did not fabricate or source one, since it
   is a real production credential, not a `NEXT_PUBLIC_*` value). Verified
   instead via Turbopack's compile phase (`✓ Compiled successfully`) and by
   grepping the emitted server chunk for this plan's page, which confirmed
   the aggregates JSON import resolves to `h.default.sample.active_guilds...`
   in the compiled bundle rather than a hardcoded number, before the build
   aborted later on the unrelated route. Full `npm run build` should be
   re-verified in CI/Vercel, where `SUPABASE_SERVICE_ROLE_KEY` is genuinely
   configured.

## From 03-06

3. **`LootListContext.doAutoSave` silently reverts an approved or pending
   loot list to `draft` with no audit-log entry.** Discovered while
   diagnosing the research-report reproduction drift
   (`.planning/debug/research-report-one-row-drift.md`, H2): the client-side
   auto-save path (`app/contexts/LootListContext.tsx`) calls a raw
   `supabase.from('loot_submissions').upsert()` directly from the browser
   whenever a raider edits an already-reviewed list, clearing `reviewed_at`,
   `review_notes`, `reviewed_by`, and `change_rejected_at` and dropping
   `status` back to `draft`. Unlike every other status transition in the
   loot-submission lifecycle (submit, review, revert, delete), this path
   never calls `logAudit()`, so the reversion is invisible to `audit_logs`
   and to any monitoring or reporting built on that table. Consider routing
   this write through an audited server API route instead of a direct
   client-side upsert, matching the pattern already used by
   `/api/loot-submissions/submit` and `/api/loot-submissions/review`.

4. **Post-sprint candidate: redefine the research-report population on
   first-ever approval timestamps (monotonic) instead of
   `COALESCE(reviewed_at, submitted_at)` (current, non-monotonic).** The
   current definition lets a list that was approved once, edited, and
   re-approved later move out of a closed historical window purely because
   its `reviewed_at` was overwritten by the later review, even though the
   list qualified at the time the original report was generated. Keying the
   population on each list's first-ever transition into `approved` status
   (derivable from `audit_logs`, since every `pending`→`approved` review is
   logged) would make the window's population stable across re-runs, so a
   later re-run of a closed historical window would no longer legitimately
   move published numbers for reasons unrelated to new data entering the
   window. Not undertaken in this phase: it is a query/schema change to the
   report's own definition of "approved," not a bug fix, and needs its own
   sign-off on the changed definition before implementation.
