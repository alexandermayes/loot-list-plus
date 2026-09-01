# Phase 02: API Coverage Decision

This phase ships zero runtime code that calls an external service. The only API use is a single authoring-time lookup, decided in the matrix below.

## Why the detector fired

`api-coverage.cjs` matched the noun `api` in CONTEXT.md D-04 ("checks each quoted guild's recent activity via the Supabase Management API"). That match is real but it is not an integration.

## What actually happens

The Supabase Management API is called **once, at authoring time**, by the executor during plan `02-01`:

| Capability | Decision | Reason |
|---|---|---|
| `POST /v1/projects/{ref}/database/query` (read-only SELECT) | INTEGRATE | Authoring-time only: one aggregate lookup per quoted guild for the D-03 Warcraft Logs URL and D-04 activity flag, hand-typed into static JSX props. |
| All other Management API capabilities | OPT-OUT | Out of phase scope (projects, branches, secrets, functions, backups, config). This phase changes copy; it provisions and mutates nothing. |
| Any runtime API surface (route handler, client fetch, cron, webhook) | OPT-OUT | Forbidden by 02-RESEARCH.md anti-patterns: a live D-04 activity check would add runtime and attack surface no requirement asks for. |

No `app/api/**` route, no client fetch, no new environment variable, and no new dependency is created by this phase. The committed diff contains only static copy.

*Recorded at plan time, 2026-08-28.*
