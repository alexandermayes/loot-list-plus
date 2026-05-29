# Database migrations — canonical source of truth

**This directory is the _only_ migration system for LootList+.** Every schema change ships
as a timestamped `.sql` file here and is applied with:

```bash
supabase db push   # applies every pending migration in this directory
```

## Rules

- **One file per change**, named `<UTC timestamp>_<description>.sql`
  (e.g. `20260528120000_add_blp_bulk_rpc.sql`). The timestamp ordering is the apply order.
- **Forward-only.** Never edit a migration that has already been pushed to production; add a
  new one instead.
- **RLS stays on.** Every public/table-bearing migration must keep Row Level Security enabled.
  Use the `is_guild_officer` / `is_guild_master` SECURITY DEFINER helpers in policies rather
  than literal role-name checks.
- **`supabase db push` applies _all_ pending files.** Don't commit a half-finished "draft"
  migration here until it's ready to deploy.

## History note

A legacy top-level `migrations/` directory (un-timestamped files, last touched March 2026,
many referencing the dropped `guild_members` table) and several loose root `.sql` files were
removed in the S0 migration-hygiene pass. They were never part of the applied schema chain.
If you need to reference them, they're in git history prior to the `refactor/s0-migration-hygiene`
branch.

## Ad-hoc SQL

`scripts/run-sql.ts` can run a one-off query or push a `.sql` file as a migration, but it now
refuses RLS-disabling SQL and requires an explicit `--confirm` flag before any DDL/DML push to
production. Prefer writing a normal migration file here over ad-hoc pushes.
