#!/bin/bash
# Create PostHog "LootList+ Core Metrics" dashboard with insights
#
# Prerequisites: Your PostHog personal API key must have these scopes:
#   - dashboard:read
#   - dashboard:write
#   - insight:read
#   - insight:write
#
# To add scopes:
#   1. Go to https://us.posthog.com/settings/user-api-keys
#   2. Click the pencil/edit icon on your API key
#   3. Under "Scopes", add: dashboard:read, dashboard:write, insight:read, insight:write
#   4. Save changes
#
# Usage: bash scripts/create-posthog-dashboard.sh

set -euo pipefail

API_KEY="${POSTHOG_PERSONAL_API_KEY:?Set POSTHOG_PERSONAL_API_KEY before running this script}"
HOST="https://us.i.posthog.com"
PROJECT_ID="310668"
BASE_URL="${HOST}/api/projects/${PROJECT_ID}"

# Helper: POST to PostHog API, return body, exit on error
api_post() {
  local endpoint="$1"
  local data="$2"
  local response http_code body

  response=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Authorization: Bearer ${API_KEY}" \
    -H "Content-Type: application/json" \
    "${BASE_URL}${endpoint}" \
    -d "$data")

  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" -ge 400 ]]; then
    echo "ERROR (HTTP $http_code): $body" >&2
    exit 1
  fi

  echo "$body"
}

# Helper: extract field from JSON
json_field() {
  python3 -c "import sys,json; print(json.load(sys.stdin)['$1'])"
}

echo "=== Creating PostHog Dashboard: LootList+ Core Metrics ==="
echo ""

# ---------------------------------------------------------------
# Step 1: Create the dashboard
# ---------------------------------------------------------------
echo "1. Creating dashboard..."
DASHBOARD_RESPONSE=$(api_post "/dashboards/" '{
  "name": "LootList+ Core Metrics",
  "description": "Core product metrics: activation funnel, feature adoption, engagement and growth.",
  "pinned": true,
  "tags": ["product", "core"]
}')

DASHBOARD_ID=$(echo "$DASHBOARD_RESPONSE" | json_field id)
echo "   Dashboard ID: $DASHBOARD_ID"
echo ""

# ---------------------------------------------------------------
# Step 2: Activation Funnel
# ---------------------------------------------------------------
echo "2. Creating insight: Activation Funnel..."
INSIGHT_1=$(api_post "/insights/" "{
  \"name\": \"Activation Funnel\",
  \"description\": \"User journey from sign-in through first loot list submission. 14-day conversion window.\",
  \"dashboards\": [$DASHBOARD_ID],
  \"query\": {
    \"kind\": \"InsightVizNode\",
    \"source\": {
      \"kind\": \"FunnelsQuery\",
      \"series\": [
        {\"kind\": \"EventsNode\", \"event\": \"sign_in_clicked\", \"name\": \"Sign in clicked\"},
        {\"kind\": \"EventsNode\", \"event\": \"onboarding_viewed\", \"name\": \"Onboarding viewed\"},
        {\"kind\": \"EventsNode\", \"event\": \"onboarding_guild_joined\", \"name\": \"Guild joined\"},
        {\"kind\": \"EventsNode\", \"event\": \"loot_list_saved\", \"name\": \"Loot list saved\"},
        {\"kind\": \"EventsNode\", \"event\": \"loot_list_submitted\", \"name\": \"Loot list submitted\"}
      ],
      \"dateRange\": {\"date_from\": \"-30d\"},
      \"filterTestAccounts\": true,
      \"funnelsFilter\": {
        \"funnelWindowInterval\": 14,
        \"funnelWindowIntervalUnit\": \"day\",
        \"funnelVizType\": \"steps\",
        \"layout\": \"horizontal\"
      }
    }
  }
}")
echo "   ID: $(echo "$INSIGHT_1" | json_field id), short_id: $(echo "$INSIGHT_1" | json_field short_id)"
echo ""

# ---------------------------------------------------------------
# Step 3: Feature Adoption Trends
# ---------------------------------------------------------------
echo "3. Creating insight: Feature Adoption (weekly unique users)..."
INSIGHT_2=$(api_post "/insights/" "{
  \"name\": \"Feature Adoption\",
  \"description\": \"Weekly unique users for key features: Master Sheet, BiS Import, WowSims, Gargul Export, Score Breakdown, Score Comparison\",
  \"dashboards\": [$DASHBOARD_ID],
  \"query\": {
    \"kind\": \"InsightVizNode\",
    \"source\": {
      \"kind\": \"TrendsQuery\",
      \"series\": [
        {\"kind\": \"EventsNode\", \"event\": \"master_sheet_viewed\", \"name\": \"Master Sheet viewed\", \"math\": \"dau\"},
        {\"kind\": \"EventsNode\", \"event\": \"bis_import_completed\", \"name\": \"BiS import completed\", \"math\": \"dau\"},
        {\"kind\": \"EventsNode\", \"event\": \"wowsims_gear_imported\", \"name\": \"WowSims gear imported\", \"math\": \"dau\"},
        {\"kind\": \"EventsNode\", \"event\": \"gargul_export_completed\", \"name\": \"Gargul export completed\", \"math\": \"dau\"},
        {\"kind\": \"EventsNode\", \"event\": \"score_breakdown_viewed\", \"name\": \"Score breakdown viewed\", \"math\": \"dau\"},
        {\"kind\": \"EventsNode\", \"event\": \"score_comparison_viewed\", \"name\": \"Score comparison viewed\", \"math\": \"dau\"}
      ],
      \"interval\": \"week\",
      \"dateRange\": {\"date_from\": \"-90d\"},
      \"filterTestAccounts\": true,
      \"trendsFilter\": {
        \"display\": \"ActionsLineGraph\"
      }
    }
  }
}")
echo "   ID: $(echo "$INSIGHT_2" | json_field id), short_id: $(echo "$INSIGHT_2" | json_field short_id)"
echo ""

# ---------------------------------------------------------------
# Step 4: Engagement Events
# ---------------------------------------------------------------
echo "4. Creating insight: Engagement Events (weekly totals)..."
INSIGHT_3=$(api_post "/insights/" "{
  \"name\": \"Engagement Events\",
  \"description\": \"Weekly total counts: feedback submitted, accent color changed, guild creation, invite codes created\",
  \"dashboards\": [$DASHBOARD_ID],
  \"query\": {
    \"kind\": \"InsightVizNode\",
    \"source\": {
      \"kind\": \"TrendsQuery\",
      \"series\": [
        {\"kind\": \"EventsNode\", \"event\": \"feedback_submitted\", \"name\": \"Feedback submitted\", \"math\": \"total\"},
        {\"kind\": \"EventsNode\", \"event\": \"accent_color_changed\", \"name\": \"Accent color changed\", \"math\": \"total\"},
        {\"kind\": \"EventsNode\", \"event\": \"guild_creation_completed\", \"name\": \"Guild creation completed\", \"math\": \"total\"},
        {\"kind\": \"EventsNode\", \"event\": \"invite_code_created\", \"name\": \"Invite code created\", \"math\": \"total\"}
      ],
      \"interval\": \"week\",
      \"dateRange\": {\"date_from\": \"-90d\"},
      \"filterTestAccounts\": true,
      \"trendsFilter\": {
        \"display\": \"ActionsLineGraph\"
      }
    }
  }
}")
echo "   ID: $(echo "$INSIGHT_3" | json_field id), short_id: $(echo "$INSIGHT_3" | json_field short_id)"
echo ""

# ---------------------------------------------------------------
# Step 5: DAU/WAU Trends
# ---------------------------------------------------------------
echo "5. Creating insight: DAU/WAU Trends..."
INSIGHT_4=$(api_post "/insights/" "{
  \"name\": \"DAU/WAU Trends\",
  \"description\": \"Daily active users and weekly active users based on all events\",
  \"dashboards\": [$DASHBOARD_ID],
  \"query\": {
    \"kind\": \"InsightVizNode\",
    \"source\": {
      \"kind\": \"TrendsQuery\",
      \"series\": [
        {\"kind\": \"EventsNode\", \"event\": null, \"name\": \"DAU (all events)\", \"math\": \"dau\"},
        {\"kind\": \"EventsNode\", \"event\": null, \"name\": \"WAU (all events)\", \"math\": \"weekly_active\"}
      ],
      \"interval\": \"day\",
      \"dateRange\": {\"date_from\": \"-30d\"},
      \"filterTestAccounts\": true,
      \"trendsFilter\": {
        \"display\": \"ActionsLineGraph\"
      }
    }
  }
}")
echo "   ID: $(echo "$INSIGHT_4" | json_field id), short_id: $(echo "$INSIGHT_4" | json_field short_id)"
echo ""

# ---------------------------------------------------------------
# Step 6: Top Pages by Unique Visitors
# ---------------------------------------------------------------
echo "6. Creating insight: Top Pages by Unique Visitors..."
INSIGHT_5=$(api_post "/insights/" "{
  \"name\": \"Top Pages by Unique Visitors\",
  \"description\": \"Most visited pages by unique users, broken down by pathname\",
  \"dashboards\": [$DASHBOARD_ID],
  \"query\": {
    \"kind\": \"InsightVizNode\",
    \"source\": {
      \"kind\": \"TrendsQuery\",
      \"series\": [
        {\"kind\": \"EventsNode\", \"event\": \"\$pageview\", \"name\": \"Pageviews\", \"math\": \"dau\"}
      ],
      \"interval\": \"day\",
      \"dateRange\": {\"date_from\": \"-30d\"},
      \"filterTestAccounts\": true,
      \"breakdownFilter\": {
        \"breakdown\": \"\$pathname\",
        \"breakdown_type\": \"event\"
      },
      \"trendsFilter\": {
        \"display\": \"ActionsTable\"
      }
    }
  }
}")
echo "   ID: $(echo "$INSIGHT_5" | json_field id), short_id: $(echo "$INSIGHT_5" | json_field short_id)"
echo ""

# ---------------------------------------------------------------
# Step 7: Retention (week-over-week)
# ---------------------------------------------------------------
echo "7. Creating insight: Weekly Retention..."
INSIGHT_6=$(api_post "/insights/" "{
  \"name\": \"Weekly Retention\",
  \"description\": \"Week-over-week retention: users who return after first activity. 8-week window.\",
  \"dashboards\": [$DASHBOARD_ID],
  \"query\": {
    \"kind\": \"InsightVizNode\",
    \"source\": {
      \"kind\": \"RetentionQuery\",
      \"dateRange\": {\"date_from\": \"-8w\"},
      \"filterTestAccounts\": true,
      \"retentionFilter\": {
        \"retentionType\": \"retention_first_time\",
        \"totalIntervals\": 8,
        \"period\": \"Week\",
        \"targetEntity\": {\"id\": null, \"type\": \"events\", \"name\": \"All events\"},
        \"returningEntity\": {\"id\": null, \"type\": \"events\", \"name\": \"All events\"}
      }
    }
  }
}")
echo "   ID: $(echo "$INSIGHT_6" | json_field id), short_id: $(echo "$INSIGHT_6" | json_field short_id)"
echo ""

# ---------------------------------------------------------------
# Step 8: Guild Health (events per guild group)
# ---------------------------------------------------------------
echo "8. Creating insight: Active Guilds..."
INSIGHT_7=$(api_post "/insights/" "{
  \"name\": \"Active Guilds (weekly)\",
  \"description\": \"Number of guilds with at least one event per week. Uses guild group analytics.\",
  \"dashboards\": [$DASHBOARD_ID],
  \"query\": {
    \"kind\": \"InsightVizNode\",
    \"source\": {
      \"kind\": \"TrendsQuery\",
      \"series\": [
        {\"kind\": \"EventsNode\", \"event\": null, \"name\": \"Active guilds\", \"math\": \"unique_group\", \"math_group_type_index\": 0}
      ],
      \"interval\": \"week\",
      \"dateRange\": {\"date_from\": \"-90d\"},
      \"filterTestAccounts\": true,
      \"trendsFilter\": {
        \"display\": \"ActionsLineGraph\"
      }
    }
  }
}")
echo "   ID: $(echo "$INSIGHT_7" | json_field id), short_id: $(echo "$INSIGHT_7" | json_field short_id)"
echo ""

# ---------------------------------------------------------------
# Step 9: Error Monitoring
# ---------------------------------------------------------------
echo "9. Creating insight: API Errors by Endpoint..."
INSIGHT_8=$(api_post "/insights/" "{
  \"name\": \"API Errors by Endpoint\",
  \"description\": \"Weekly api_error events broken down by endpoint. Spot regressions fast.\",
  \"dashboards\": [$DASHBOARD_ID],
  \"query\": {
    \"kind\": \"InsightVizNode\",
    \"source\": {
      \"kind\": \"TrendsQuery\",
      \"series\": [
        {\"kind\": \"EventsNode\", \"event\": \"api_error\", \"name\": \"API errors\", \"math\": \"total\"}
      ],
      \"interval\": \"week\",
      \"dateRange\": {\"date_from\": \"-30d\"},
      \"filterTestAccounts\": true,
      \"breakdownFilter\": {
        \"breakdown\": \"endpoint\",
        \"breakdown_type\": \"event\"
      },
      \"trendsFilter\": {
        \"display\": \"ActionsTable\"
      }
    }
  }
}")
echo "   ID: $(echo "$INSIGHT_8" | json_field id), short_id: $(echo "$INSIGHT_8" | json_field short_id)"
echo ""

# ---------------------------------------------------------------
# Step 10: Page Load Performance (p50/p95)
# ---------------------------------------------------------------
echo "10. Creating insight: Page Load Performance..."
INSIGHT_9=$(api_post "/insights/" "{
  \"name\": \"Page Load Time by Page (p95)\",
  \"description\": \"95th percentile page load times from usePagePerf hook. Broken down by page name.\",
  \"dashboards\": [$DASHBOARD_ID],
  \"query\": {
    \"kind\": \"InsightVizNode\",
    \"source\": {
      \"kind\": \"TrendsQuery\",
      \"series\": [
        {\"kind\": \"EventsNode\", \"event\": \"page_load_time\", \"name\": \"p95 load time (ms)\", \"math\": \"p95\", \"math_property\": \"duration_ms\"}
      ],
      \"interval\": \"week\",
      \"dateRange\": {\"date_from\": \"-30d\"},
      \"filterTestAccounts\": true,
      \"breakdownFilter\": {
        \"breakdown\": \"page\",
        \"breakdown_type\": \"event\"
      },
      \"trendsFilter\": {
        \"display\": \"ActionsTable\"
      }
    }
  }
}")
echo "   ID: $(echo "$INSIGHT_9" | json_field id), short_id: $(echo "$INSIGHT_9" | json_field short_id)"
echo ""

# ---------------------------------------------------------------
# Step 11: Landing Page Conversion
# ---------------------------------------------------------------
echo "11. Creating insight: Landing Page Funnel..."
INSIGHT_10=$(api_post "/insights/" "{
  \"name\": \"Landing Page Funnel\",
  \"description\": \"Landing page visitors through CTA click to sign-in. 7-day window.\",
  \"dashboards\": [$DASHBOARD_ID],
  \"query\": {
    \"kind\": \"InsightVizNode\",
    \"source\": {
      \"kind\": \"FunnelsQuery\",
      \"series\": [
        {\"kind\": \"EventsNode\", \"event\": \"\$pageview\", \"name\": \"Landing page view\", \"properties\": [{\"key\": \"\$pathname\", \"value\": \"/\", \"type\": \"event\", \"operator\": \"exact\"}]},
        {\"kind\": \"EventsNode\", \"event\": \"landing_cta_clicked\", \"name\": \"CTA clicked\"},
        {\"kind\": \"EventsNode\", \"event\": \"sign_in_clicked\", \"name\": \"Sign in clicked\"},
        {\"kind\": \"EventsNode\", \"event\": \"user_signed_up\", \"name\": \"Account created\"}
      ],
      \"dateRange\": {\"date_from\": \"-30d\"},
      \"filterTestAccounts\": true,
      \"funnelsFilter\": {
        \"funnelWindowInterval\": 7,
        \"funnelWindowIntervalUnit\": \"day\",
        \"funnelVizType\": \"steps\",
        \"layout\": \"horizontal\"
      }
    }
  }
}")
echo "   ID: $(echo "$INSIGHT_10" | json_field id), short_id: $(echo "$INSIGHT_10" | json_field short_id)"
echo ""

# ---------------------------------------------------------------
# Step 12: Monetization Funnel
# ---------------------------------------------------------------
echo "12. Creating insight: Pro Upgrade Funnel..."
INSIGHT_11=$(api_post "/insights/" "{
  \"name\": \"Pro Upgrade Funnel\",
  \"description\": \"Pro modal views to upgrade clicks. Tracks monetization intent.\",
  \"dashboards\": [$DASHBOARD_ID],
  \"query\": {
    \"kind\": \"InsightVizNode\",
    \"source\": {
      \"kind\": \"FunnelsQuery\",
      \"series\": [
        {\"kind\": \"EventsNode\", \"event\": \"pro_modal_viewed\", \"name\": \"Pro modal viewed\"},
        {\"kind\": \"EventsNode\", \"event\": \"pro_upgrade_clicked\", \"name\": \"Upgrade clicked\"}
      ],
      \"dateRange\": {\"date_from\": \"-30d\"},
      \"filterTestAccounts\": true,
      \"funnelsFilter\": {
        \"funnelWindowInterval\": 7,
        \"funnelWindowIntervalUnit\": \"day\",
        \"funnelVizType\": \"steps\",
        \"layout\": \"horizontal\"
      }
    }
  }
}")
echo "   ID: $(echo "$INSIGHT_11" | json_field id), short_id: $(echo "$INSIGHT_11" | json_field short_id)"
echo ""

# ---------------------------------------------------------------
# Step 13: Officer vs Member Activity
# ---------------------------------------------------------------
echo "13. Creating insight: Officer vs Member Activity..."
INSIGHT_12=$(api_post "/insights/" "{
  \"name\": \"Officer vs Member Activity\",
  \"description\": \"Weekly active users broken down by guild_role super property.\",
  \"dashboards\": [$DASHBOARD_ID],
  \"query\": {
    \"kind\": \"InsightVizNode\",
    \"source\": {
      \"kind\": \"TrendsQuery\",
      \"series\": [
        {\"kind\": \"EventsNode\", \"event\": null, \"name\": \"Active users by role\", \"math\": \"dau\"}
      ],
      \"interval\": \"week\",
      \"dateRange\": {\"date_from\": \"-90d\"},
      \"filterTestAccounts\": true,
      \"breakdownFilter\": {
        \"breakdown\": \"guild_role\",
        \"breakdown_type\": \"event\"
      },
      \"trendsFilter\": {
        \"display\": \"ActionsLineGraph\"
      }
    }
  }
}")
echo "   ID: $(echo "$INSIGHT_12" | json_field id), short_id: $(echo "$INSIGHT_12" | json_field short_id)"
echo ""

# ---------------------------------------------------------------
# Done!
# ---------------------------------------------------------------
echo "=== All done! ==="
echo ""
echo "Dashboard URL: https://us.posthog.com/project/${PROJECT_ID}/dashboard/${DASHBOARD_ID}"
echo ""
echo "Insights created:"
echo "  1.  Activation Funnel (sign_in → loot_list_submitted)"
echo "  2.  Feature Adoption (weekly unique users per feature)"
echo "  3.  Engagement Events (weekly event counts)"
echo "  4.  DAU/WAU Trends (daily)"
echo "  5.  Top Pages by Unique Visitors (table)"
echo "  6.  Weekly Retention (8-week cohort)"
echo "  7.  Active Guilds (weekly, group analytics)"
echo "  8.  API Errors by Endpoint (table)"
echo "  9.  Page Load Time by Page (p95)"
echo "  10. Landing Page Funnel (visit → signup)"
echo "  11. Pro Upgrade Funnel (modal → click)"
echo "  12. Officer vs Member Activity (role breakdown)"
