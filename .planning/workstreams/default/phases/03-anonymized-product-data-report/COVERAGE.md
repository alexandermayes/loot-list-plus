# API Coverage — Supabase Management API (api.supabase.com v1)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.
>
> Phase 3 integrates the Supabase Management API from an offline Python runner
> (`scripts/analytics/run-research-report.py`) to execute committed read-only SQL
> against production. The token is a personal access token retrieved from the macOS
> Keychain; it is superuser-equivalent for this project, which is why the opt-outs
> below are security decisions and not merely scope decisions.

| capability | decision | reason |
|---|---|---|
| database/query (POST arbitrary SQL) | INTEGRATE | |
| database/migrations (apply, list) | OPT-OUT | already owned by `scripts/deploy-migrations.sh`; this phase creates no migration and runs only reads |
| database/backups (list, restore, download) | OPT-OUT | not needed; this phase mutates nothing, so no restore path is in scope |
| database/branches (create, merge, delete, reset) | OPT-OUT | not needed; the report reads the production window directly and a branch would not carry the real data |
| database/read-replicas (setup, remove) | OPT-OUT | not needed; a single aggregate read per query over a fixed past window |
| database/pooler and postgres config | OPT-OUT | explicitly out of scope; changing connection or Postgres settings is not report work |
| database/webhooks (enable, list) | OPT-OUT | not needed; the pipeline is pull-based and offline, with no event surface |
| database/sql-snippets (list, get) | OPT-OUT | not needed; saved queries live in the repository as committed `.sql` files, which is what EVID-02 requires |
| secrets (list, create, delete) | OPT-OUT | explicitly out of scope; the project convention is zero Supabase secrets in `.env.local` and Keychain-only token retrieval |
| api-keys and postgrest config | OPT-OUT | not needed; no client-facing key is created, rotated, or read |
| auth config, SSO providers, third-party auth | OPT-OUT | explicitly out of scope; this phase adds no auth surface, per the RESEARCH.md security domain (V2 and V3 both not applicable) |
| storage buckets and objects | OPT-OUT | not needed; both committed artifacts live in the repository under `public/research/`, not in object storage |
| edge functions (deploy, list, delete) | OPT-OUT | not needed; the report page is a Server Component reading a build-time import, with no request-time function |
| typescript types generation | OPT-OUT | already owned by the `gen:types` npm script through the Supabase CLI |
| advisors (security and performance lints) | OPT-OUT | not needed yet; useful project hygiene but unrelated to publishing the report, and it would surface findings this phase has no mandate to act on |
| analytics and logs endpoints | OPT-OUT | not needed; the report describes product usage from application tables, not platform logs |
| custom hostnames and vanity subdomains | OPT-OUT | explicitly out of scope; domains are unchanged by this phase |
| network restrictions and bans | OPT-OUT | explicitly out of scope; no network policy change is part of publishing a page |
| projects (create, delete, pause, restore, transfer) | OPT-OUT | explicitly out of scope; lifecycle operations on the production project are never report work |
| organizations, members, billing | OPT-OUT | explicitly out of scope; no account administration is in this phase |

**Coverage note.** Exactly one capability is integrated, deliberately. Every other
capability on this surface is reachable with the same token, which is why
`03-01-PLAN.md` constrains the runner to posting the verbatim text of a committed,
reviewed `.sql` file with no statement assembled at run time (threat `T-03-04`), and
why `T-03-03` keeps the token out of stdout, the artifacts, and every commit. Adding
a second capability later starts from this same full-coverage baseline rather than
inheriting these opt-outs.
