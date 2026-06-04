#!/usr/bin/env bash
#
# Run the Next dev server against the local Supabase stack.
# Assumes the stack is up (run `npm run db:local:seed` first).
#
#   npm run dev:local        # port 3100 (override with PORT=3xxx)
set -euo pipefail

if ! supabase status >/dev/null 2>&1; then
  echo "error: local Supabase isn't running — run 'npm run db:local:seed' first." >&2
  exit 1
fi

eval "$(supabase status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=')"

NEXT_PUBLIC_SUPABASE_URL="$API_URL" \
NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY" \
SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" \
exec npx next dev --port "${PORT:-3100}"
