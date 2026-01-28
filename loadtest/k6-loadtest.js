/**
 * k6 Load Test Configuration for LootList+
 *
 * Installation:
 *   brew install k6
 *
 * Usage:
 *   # Run with default settings (10 VUs for 30s)
 *   k6 run loadtest/k6-loadtest.js
 *
 *   # Run with custom VUs and duration
 *   k6 run --vus 50 --duration 60s loadtest/k6-loadtest.js
 *
 *   # Run specific scenario
 *   k6 run --env SCENARIO=api-only loadtest/k6-loadtest.js
 *
 *   # Run with HTML report
 *   k6 run --out json=results.json loadtest/k6-loadtest.js
 *
 * Environment Variables:
 *   BASE_URL      - Target URL (default: http://localhost:3100)
 *   GUILD_ID      - Test guild ID for authenticated tests
 *   AUTH_TOKEN    - Supabase auth token for authenticated tests
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')
const apiLatency = new Trend('api_latency')

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3100'
const GUILD_ID = __ENV.GUILD_ID || ''
const AUTH_TOKEN = __ENV.AUTH_TOKEN || ''

// Test scenarios
export const options = {
  scenarios: {
    // Smoke test - verify system works
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '10s',
      tags: { scenario: 'smoke' },
    },

    // Load test - normal expected load
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },  // Ramp up to 20 users
        { duration: '1m', target: 20 },   // Stay at 20 users
        { duration: '30s', target: 0 },   // Ramp down
      ],
      tags: { scenario: 'load' },
      startTime: '15s', // Start after smoke test
    },

    // Stress test - beyond normal load
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },  // Ramp up to 50 users
        { duration: '1m', target: 50 },   // Stay at 50 users
        { duration: '30s', target: 100 }, // Push to 100 users
        { duration: '1m', target: 100 },  // Stay at 100 users
        { duration: '30s', target: 0 },   // Ramp down
      ],
      tags: { scenario: 'stress' },
      startTime: '2m30s', // Start after load test
    },

    // Spike test - sudden burst of traffic
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 5 },   // Normal load
        { duration: '5s', target: 150 },  // Spike!
        { duration: '30s', target: 150 }, // Stay at spike
        { duration: '10s', target: 5 },   // Back to normal
        { duration: '20s', target: 0 },   // Ramp down
      ],
      tags: { scenario: 'spike' },
      startTime: '6m', // Start after stress test
    },
  },

  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    errors: ['rate<0.1'],                            // Error rate < 10%
    // Note: http_req_failed counts non-2xx as failures, but 401/302/307 are expected
    // for unauthenticated tests. Only count 5xx as true failures via the 'errors' rate.
  },
}

// Headers for authenticated requests
function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  }
  if (AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`
  }
  return headers
}

// Main test function
export default function () {
  // Public endpoints (may redirect to login)
  group('Public Endpoints', () => {
    // Homepage - may redirect to login for unauthenticated users
    const homeRes = http.get(`${BASE_URL}/`)
    check(homeRes, {
      'homepage responds': (r) => r.status === 200 || r.status === 302 || r.status === 307 || r.status === 401,
    })
    errorRate.add(homeRes.status >= 500) // Only count server errors
    apiLatency.add(homeRes.timings.duration)

    sleep(0.5)
  })

  // API endpoints (may require auth)
  group('API Endpoints', () => {
    // Test characters endpoint
    const charsRes = http.get(`${BASE_URL}/api/characters`, {
      headers: getAuthHeaders(),
    })
    check(charsRes, {
      'characters endpoint responds': (r) => r.status === 200 || r.status === 401,
    })
    errorRate.add(charsRes.status >= 500)
    apiLatency.add(charsRes.timings.duration)

    sleep(0.3)

    // Test guilds endpoint
    const guildsRes = http.get(`${BASE_URL}/api/guilds`, {
      headers: getAuthHeaders(),
    })
    check(guildsRes, {
      'guilds endpoint responds': (r) => r.status === 200 || r.status === 401,
    })
    errorRate.add(guildsRes.status >= 500)
    apiLatency.add(guildsRes.timings.duration)

    sleep(0.3)

    // Test prio-list endpoint (if guild ID provided)
    if (GUILD_ID) {
      const prioRes = http.get(
        `${BASE_URL}/api/prio-list?guild_id=${GUILD_ID}`,
        { headers: getAuthHeaders() }
      )
      check(prioRes, {
        'prio-list endpoint responds': (r) => r.status === 200 || r.status === 401 || r.status === 403,
      })
      errorRate.add(prioRes.status >= 500)
      apiLatency.add(prioRes.timings.duration)
    }

    sleep(0.5)
  })

  // App pages (SSR/RSC)
  group('App Pages', () => {
    const pages = [
      '/overview',
      '/loot-list',
      '/loot-submissions',
      '/profile',
    ]

    for (const page of pages) {
      const pageRes = http.get(`${BASE_URL}${page}`, {
        headers: getAuthHeaders(),
      })
      check(pageRes, {
        [`${page} page loads`]: (r) => r.status === 200 || r.status === 302 || r.status === 307,
      })
      errorRate.add(pageRes.status >= 500)
      apiLatency.add(pageRes.timings.duration)

      sleep(0.5)
    }
  })

  // Think time between iterations
  sleep(Math.random() * 2 + 1) // 1-3 seconds
}

// Lifecycle hooks
export function setup() {
  console.log(`Load testing ${BASE_URL}`)
  console.log(`Guild ID: ${GUILD_ID || 'not set'}`)
  console.log(`Auth: ${AUTH_TOKEN ? 'configured' : 'not configured'}`)

  // Verify target is reachable
  const res = http.get(`${BASE_URL}/`)
  if (res.status !== 200) {
    console.warn(`Warning: Target returned status ${res.status}`)
  }

  return { startTime: new Date().toISOString() }
}

export function teardown(data) {
  console.log(`Test started at: ${data.startTime}`)
  console.log(`Test completed at: ${new Date().toISOString()}`)
}

// Handle summary
export function handleSummary(data) {
  const summary = {
    total_requests: data.metrics.http_reqs?.values?.count || 0,
    failed_requests: data.metrics.http_req_failed?.values?.passes || 0,
    avg_duration: data.metrics.http_req_duration?.values?.avg?.toFixed(2) || 0,
    p95_duration: data.metrics.http_req_duration?.values['p(95)']?.toFixed(2) || 0,
    p99_duration: data.metrics.http_req_duration?.values['p(99)']?.toFixed(2) || 0,
    error_rate: ((data.metrics.errors?.values?.rate || 0) * 100).toFixed(2),
  }

  console.log('\n' + '='.repeat(60))
  console.log('LOAD TEST SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total Requests:    ${summary.total_requests}`)
  console.log(`Failed Requests:   ${summary.failed_requests}`)
  console.log(`Avg Response Time: ${summary.avg_duration}ms`)
  console.log(`P95 Response Time: ${summary.p95_duration}ms`)
  console.log(`P99 Response Time: ${summary.p99_duration}ms`)
  console.log(`Error Rate:        ${summary.error_rate}%`)
  console.log('='.repeat(60))

  return {
    'loadtest/results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  }
}

// Text summary helper (k6 built-in function reference)
function textSummary(data, options) {
  // k6 will use its built-in text summary if we return an empty string
  // This is a placeholder - k6 handles the actual formatting
  return ''
}
