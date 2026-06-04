#!/usr/bin/env bash
#
# One-command local test environment: brings up a local Supabase, rebuilds the
# schema from the baseline migration, seeds reference data + a test guild with
# loot history, all without touching production.
#
#   npm run db:local:seed
#
# Tunables (env): USERS (default 8), GUILDS (1), MEMBERS (20).
# Requires Docker/OrbStack running and the Supabase CLI installed.
set -euo pipefail

USERS="${USERS:-8}"
GUILDS="${GUILDS:-1}"
MEMBERS="${MEMBERS:-20}"

if ! command -v supabase >/dev/null 2>&1; then
  echo "error: supabase CLI not found — https://supabase.com/docs/guides/cli" >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "error: Docker engine not reachable — start Docker/OrbStack first." >&2
  exit 1
fi

echo "==> Starting local Supabase..."
supabase start

echo "==> Resetting DB (baseline migration + seed.sql reference data)..."
supabase db reset

echo "==> Reading local credentials..."
eval "$(supabase status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=')"
export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"

echo "==> Creating $USERS test users..."
npx tsx scripts/create-test-users.ts --count "$USERS"

echo "==> Seeding $GUILDS guild(s) / $MEMBERS members / loot history..."
npx tsx scripts/seed-test-data-multiuser.ts --guilds "$GUILDS" --members "$MEMBERS"

cat <<DONE

✅ Local Supabase is seeded. loadtest1 (first quick-login) is a Guild Master.

Start the app against local:
  npm run dev:local

Then open http://localhost:3100/dev-login and use a quick-login button.
DONE
