/**
 * k6 Authenticated Load Test for LootList+
 *
 * This test simulates real users by authenticating as different test users
 * and performing realistic actions. Auth tokens are cached per VU to avoid
 * hitting Supabase rate limits.
 *
 * Prerequisites:
 *   1. Run: npx tsx scripts/create-test-users.ts
 *   2. Run: npx tsx scripts/seed-test-data-multiuser.ts
 *
 * Usage:
 *   k6 run loadtest/k6-loadtest-auth.js
 *   k6 run --vus 20 --duration 2m loadtest/k6-loadtest-auth.js
 *
 * Environment Variables:
 *   BASE_URL - Target URL (default: http://localhost:3100)
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'
import { SharedArray } from 'k6/data'

// Custom metrics
const errorRate = new Rate('errors')
const apiLatency = new Trend('api_latency')
const authSuccess = new Counter('auth_success')
const authFailure = new Counter('auth_failure')


// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3100'

// Load test users from JSON file (shared across all VUs)
const testUsers = new SharedArray('users', function () {
  const data = JSON.parse(open('./test-users.json'))
  return data.users
})

// Load user-guild mappings
const userGuildMap = new SharedArray('guilds', function () {
  try {
    const data = JSON.parse(open('./user-guild-map.json'))
    return data.mappings
  } catch (e) {
    return []
  }
})

// Test scenarios
export const options = {
  scenarios: {
    // Smoke test with auth
    auth_smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      tags: { scenario: 'auth_smoke' },
    },

    // Realistic load test
    auth_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 20 },
        { duration: '30s', target: 0 },
      ],
      tags: { scenario: 'auth_load' },
      startTime: '35s',
    },

    // Stress test
    auth_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 30 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 50 },
        { duration: '30s', target: 0 },
      ],
      tags: { scenario: 'auth_stress' },
      startTime: '3m',
    },
  },

  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    errors: ['rate<0.05'], // 5% error rate
    auth_success: ['count>0'],
  },
}

// Get Supabase URL from test users file
const SUPABASE_URL = new SharedArray('config', function () {
  const data = JSON.parse(open('./test-users.json'))
  return [data.supabase_url]
})[0]

// Authenticate user and get session token
function authenticateUser(email, password) {
  const authUrl = `${SUPABASE_URL}/auth/v1/token?grant_type=password`

  const response = http.post(authUrl, JSON.stringify({
    email: email,
    password: password,
  }), {
    headers: {
      'Content-Type': 'application/json',
      'apikey': __ENV.SUPABASE_ANON_KEY || '',
    },
  })

  if (response.status === 200) {
    const data = JSON.parse(response.body)
    authSuccess.add(1)
    return {
      access_token: data.access_token,
      user_id: data.user?.id,
    }
  } else {
    authFailure.add(1)
    console.error(`Auth failed for ${email}: ${response.status}`)
    return null
  }
}

// Get auth headers for authenticated requests
function getAuthHeaders(accessToken) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  }
}

// Get guild IDs for a user
function getUserGuilds(userId) {
  const mapping = userGuildMap.find(m => m.user_id === userId)
  return mapping ? mapping.guild_ids : []
}

// Setup function - runs once before all VUs start
// Pre-authenticate all users to avoid rate limits during the test
export function setup() {
  console.log(`Load testing ${BASE_URL}`)
  console.log(`Test users: ${testUsers.length}`)
  console.log(`Supabase URL: ${SUPABASE_URL}`)

  // Verify target is reachable
  const res = http.get(`${BASE_URL}/`)
  if (res.status >= 500) {
    console.error(`Target unreachable: ${res.status}`)
  }

  // Pre-authenticate all test users with staggered requests to avoid rate limits
  console.log('Pre-authenticating test users...')
  const authenticatedUsers = []

  for (let i = 0; i < testUsers.length; i++) {
    const user = testUsers[i]

    // Stagger auth requests to avoid rate limits (1.5s between each)
    if (i > 0) {
      sleep(1.5)
    }

    const auth = authenticateUser(user.email, user.password)
    if (auth) {
      authenticatedUsers.push({
        index: i,
        email: user.email,
        access_token: auth.access_token,
        user_id: auth.user_id,
        guilds: getUserGuilds(auth.user_id),
      })
      console.log(`  Authenticated: ${user.email}`)
    } else {
      console.error(`  Failed to authenticate: ${user.email}`)
    }
  }

  console.log(`Pre-authenticated ${authenticatedUsers.length}/${testUsers.length} users`)

  return {
    startTime: new Date().toISOString(),
    authenticatedUsers: authenticatedUsers,
  }
}

// Main test function - each VU runs this
export default function (data) {
  // Use pre-authenticated tokens from setup
  const authenticatedUsers = data.authenticatedUsers

  if (!authenticatedUsers || authenticatedUsers.length === 0) {
    console.error('No authenticated users available')
    errorRate.add(1)
    sleep(1)
    return
  }

  // Each VU picks a user from the pre-authenticated pool
  const userIndex = __VU % authenticatedUsers.length
  const user = authenticatedUsers[userIndex]

  const headers = getAuthHeaders(user.access_token)
  const userGuilds = user.guilds || []

  // Simulate realistic user journey
  group('Dashboard Load', () => {
    // Load overview page
    const overviewRes = http.get(`${BASE_URL}/overview`, { headers })
    check(overviewRes, {
      'overview loads': (r) => r.status === 200 || r.status === 302,
    })
    errorRate.add(overviewRes.status >= 500)
    apiLatency.add(overviewRes.timings.duration)

    sleep(0.5)
  })

  group('Character Operations', () => {
    // Get user's characters
    const charsRes = http.get(`${BASE_URL}/api/characters`, { headers })
    check(charsRes, {
      'characters endpoint': (r) => r.status === 200,
    })
    errorRate.add(charsRes.status >= 500)
    apiLatency.add(charsRes.timings.duration)

    sleep(0.3)
  })

  group('Guild Operations', () => {
    // Get guilds
    const guildsRes = http.get(`${BASE_URL}/api/guilds`, { headers })
    check(guildsRes, {
      'guilds endpoint': (r) => r.status === 200,
    })
    errorRate.add(guildsRes.status >= 500)
    apiLatency.add(guildsRes.timings.duration)

    // If user has guilds, load guild data
    if (userGuilds.length > 0) {
      const guildId = userGuilds[0]

      sleep(0.3)

      // Load loot list page
      const lootListRes = http.get(`${BASE_URL}/loot-list`, { headers })
      check(lootListRes, {
        'loot list page': (r) => r.status === 200 || r.status === 302,
      })
      errorRate.add(lootListRes.status >= 500)
      apiLatency.add(lootListRes.timings.duration)

      sleep(0.3)

      // Load prio list API
      const prioRes = http.get(`${BASE_URL}/api/prio-list?guild_id=${guildId}`, { headers })
      check(prioRes, {
        'prio list API': (r) => r.status === 200 || r.status === 403,
      })
      errorRate.add(prioRes.status >= 500)
      apiLatency.add(prioRes.timings.duration)

      sleep(0.3)

      // Load submissions page
      const submissionsRes = http.get(`${BASE_URL}/loot-submissions`, { headers })
      check(submissionsRes, {
        'submissions page': (r) => r.status === 200 || r.status === 302,
      })
      errorRate.add(submissionsRes.status >= 500)
      apiLatency.add(submissionsRes.timings.duration)
    }

    sleep(0.5)
  })

  group('Profile Operations', () => {
    // Load profile page
    const profileRes = http.get(`${BASE_URL}/profile`, { headers })
    check(profileRes, {
      'profile loads': (r) => r.status === 200 || r.status === 302,
    })
    errorRate.add(profileRes.status >= 500)
    apiLatency.add(profileRes.timings.duration)

    sleep(0.3)
  })

  // Simulate user thinking/reading time between actions
  sleep(Math.random() * 2 + 1)
}

// Teardown
export function teardown(data) {
  console.log(`Test started: ${data.startTime}`)
  console.log(`Test ended: ${new Date().toISOString()}`)
}

// Summary handler
export function handleSummary(data) {
  const summary = {
    total_requests: data.metrics.http_reqs?.values?.count || 0,
    avg_duration: data.metrics.http_req_duration?.values?.avg?.toFixed(2) || 0,
    p95_duration: data.metrics.http_req_duration?.values['p(95)']?.toFixed(2) || 0,
    p99_duration: data.metrics.http_req_duration?.values['p(99)']?.toFixed(2) || 0,
    error_rate: ((data.metrics.errors?.values?.rate || 0) * 100).toFixed(2),
    auth_success: data.metrics.auth_success?.values?.count || 0,
    auth_failure: data.metrics.auth_failure?.values?.count || 0,
  }

  console.log('\n' + '='.repeat(60))
  console.log('AUTHENTICATED LOAD TEST SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total Requests:    ${summary.total_requests}`)
  console.log(`Avg Response Time: ${summary.avg_duration}ms`)
  console.log(`P95 Response Time: ${summary.p95_duration}ms`)
  console.log(`P99 Response Time: ${summary.p99_duration}ms`)
  console.log(`Error Rate:        ${summary.error_rate}%`)
  console.log(`Auth Success:      ${summary.auth_success}`)
  console.log(`Auth Failures:     ${summary.auth_failure}`)
  console.log('='.repeat(60))

  return {
    'loadtest/results-auth.json': JSON.stringify(data, null, 2),
    stdout: '',
  }
}
