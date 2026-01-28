# Load Testing

This directory contains load testing configurations for LootList+.

## Prerequisites

### k6 (Recommended)
```bash
brew install k6
```

### Artillery (Alternative)
```bash
npm install -g artillery
```

## Quick Start

### Option A: Basic Load Testing (Single User)

```bash
# Seed test data
npm run seed:test

# Start dev server
npm run dev

# Run load test
npm run loadtest:smoke
```

### Option B: Multi-User Load Testing (Recommended)

This simulates real users with actual authentication - the most realistic test.

```bash
# Step 1: Create test users in Supabase (creates 20 users by default)
npm run test:users:create

# Step 2: Seed data distributed across test users
npm run seed:test:multi

# Step 3: Start the dev server
npm run dev

# Step 4: Run authenticated load test
npm run loadtest:auth
```

**Customize:**
```bash
# Create more test users
npx tsx scripts/create-test-users.ts --count 50

# Seed more data
npx tsx scripts/seed-test-data-multiuser.ts --guilds 5 --members 50 --submissions 200

# Clean up test users (deletes users and their data)
npm run test:users:clean
```

### Running Load Tests

**Basic (unauthenticated):**
```bash
npm run loadtest:smoke     # Quick sanity check
npm run loadtest           # Full test suite
```

**Authenticated (multi-user):**
```bash
npm run loadtest:auth          # Authenticated load test
npm run loadtest:auth:stress   # Stress test with auth
```

**Custom:**
```bash
k6 run --vus 50 --duration 2m loadtest/k6-loadtest.js
k6 run --vus 30 --duration 5m -e SUPABASE_ANON_KEY=your-key loadtest/k6-loadtest-auth.js
```

**Artillery:**
```bash
npm run loadtest:artillery

# Generate HTML report
artillery run --output results.json loadtest/artillery.yml
artillery report results.json
```

## Test Scenarios

### k6 Scenarios
| Scenario | VUs | Duration | Purpose |
|----------|-----|----------|---------|
| smoke | 1 | 10s | Verify system works |
| load | 0→20 | 2m | Normal expected load |
| stress | 0→100 | 3m | Beyond normal load |
| spike | 5→150→5 | 1m15s | Sudden traffic burst |

### Artillery Scenarios
| Scenario | Weight | Purpose |
|----------|--------|---------|
| Anonymous User Flow | 30% | Unauthenticated browsing |
| Member View Flow | 50% | Typical member journey |
| API Heavy User | 20% | Rapid API calls |
| Page Navigation | 40% | SSR page loads |

## Performance Thresholds

Default thresholds (adjust in config files):
- **P95 Response Time**: < 500ms
- **P99 Response Time**: < 1000ms
- **Error Rate**: < 5%

## Tips

1. **Local vs Production**: Always test locally first, then consider a staging environment
2. **Database**: Ensure your Supabase plan can handle the load
3. **Monitoring**: Watch Supabase dashboard during tests
4. **Cleanup**: Run `npm run seed:test:clean` to remove test data

## Interpreting Results

### k6 Output
```
http_req_duration..........: avg=150ms  p(95)=320ms  p(99)=450ms
http_req_failed............: 0.5%
errors.....................: 2.1%
```

### Key Metrics
- **http_req_duration**: Response time distribution
- **http_req_failed**: HTTP error rate (4xx/5xx)
- **errors**: Custom error rate (includes logic errors)
- **vus**: Concurrent virtual users
- **iterations**: Total test iterations completed

## CI Integration (GitHub Actions)

Load tests can also run in CI via `.github/workflows/load-test.yml`.

### Automatic Triggers
- **PR to main**: Runs smoke test automatically when API routes or loadtest files change
- **Manual**: Trigger from Actions tab with custom settings

### Manual Workflow Dispatch
1. Go to **Actions** tab in GitHub
2. Select **"Load Test"** workflow
3. Click **"Run workflow"**
4. Choose scenario: `smoke`, `load`, `stress`, or `full`
5. Optionally set custom VUs, duration, or target URL

### Required Secrets
| Secret | Description | Required |
|--------|-------------|----------|
| `LOAD_TEST_URL` | Target URL for tests (e.g., staging) | For remote tests |
| `SUPABASE_URL` | Supabase project URL | For seeded tests |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | For seeded tests |
| `TEST_GUILD_ID` | Guild ID for authenticated tests | Optional |

### Example: Setting up for Vercel Preview
```bash
# In GitHub repo settings → Secrets → Actions
LOAD_TEST_URL=https://your-app-preview.vercel.app
```

### CI Results
- Results are uploaded as artifacts (retained 30 days)
- PR comments show summary metrics
- Check the Actions tab for detailed output
