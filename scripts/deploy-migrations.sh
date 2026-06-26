#!/usr/bin/env bash
#
# Apply pending Supabase migrations to the production database via the
# Management API (https://api.supabase.com/v1/projects/{ref}/database/query).
#
# Unlike `supabase db push`, this needs only an access token — no DB password.
# Applied migrations are recorded in supabase_migrations.schema_migrations
# (keyed by version) so each runs exactly once and stays compatible with the
# Supabase CLI's migration tracking.
#
# Required env:
#   SUPABASE_ACCESS_TOKEN  - Supabase personal access token (sbp_...)
#   SUPABASE_PROJECT_ID    - project ref (e.g. zjnhjstbqekudlsozsvi)
#
set -euo pipefail

: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN is required}"
: "${SUPABASE_PROJECT_ID:?SUPABASE_PROJECT_ID is required}"

API="https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/database/query"
MIG_DIR="supabase/migrations"

# Send SQL (read from stdin) to the Management API. Echoes the JSON response
# body; exits non-zero on any non-2xx status.
run_sql() {
  local body resp http
  body=$(python3 -c 'import json,sys; print(json.dumps({"query": sys.stdin.read()}))')
  resp=$(curl -sS -w $'\n%{http_code}' -X POST "$API" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$body")
  http=$(printf '%s' "$resp" | tail -n1)
  body=$(printf '%s' "$resp" | sed '$d')
  if [ "$http" -lt 200 ] || [ "$http" -ge 300 ]; then
    echo "Management API error (HTTP $http): $body" >&2
    return 1
  fi
  printf '%s' "$body"
}

# Versions already recorded as applied on the remote.
applied=$(printf '%s' \
  "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;" \
  | run_sql \
  | python3 -c 'import json,sys; print("\n".join(r["version"] for r in json.load(sys.stdin)))')

echo "Recorded as applied: $(printf '%s' "$applied" | tr '\n' ' ')"

count=0
for file in $(ls "$MIG_DIR"/*.sql | sort); do
  base=$(basename "$file")
  version="${base%%_*}"
  name="${base#*_}"; name="${name%.sql}"

  if printf '%s\n' "$applied" | grep -qx "$version"; then
    echo "skip   $base"
    continue
  fi

  echo "apply  $base"
  run_sql < "$file" > /dev/null

  # Record it. Dollar-quoting avoids any escaping of the version/name.
  printf '%s' \
    "INSERT INTO supabase_migrations.schema_migrations (version, name, statements) \
     VALUES (\$mig\$${version}\$mig\$, \$mig\$${name}\$mig\$, '{}'::text[]) \
     ON CONFLICT (version) DO NOTHING;" \
    | run_sql > /dev/null
  echo "       recorded $version"
  count=$((count + 1))
done

if [ "$count" -eq 0 ]; then
  echo "No pending migrations."
else
  echo "Applied $count migration(s)."
fi
