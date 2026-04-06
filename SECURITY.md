# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| Latest (production) | Yes |
| Previous releases | No |

LootList+ is a continuously deployed web application. Only the latest production deployment is supported with security updates.

## Reporting a Vulnerability

If you discover a security vulnerability in LootList+, please report it responsibly. **Do not open a public GitHub issue for security vulnerabilities.**

### How to report

1. **Preferred:** Use GitHub's [private vulnerability reporting](https://github.com/alexandermayes/loot-list-plus/security/advisories/new) to submit a report directly.
2. **Alternative:** Email **security@getlootlist.com** with details of the vulnerability.

### What to include

- A description of the vulnerability and its potential impact
- Steps to reproduce the issue
- Any relevant screenshots or proof-of-concept code
- Your assessment of severity (critical, high, medium, low)

### What to expect

- **Acknowledgment** within 48 hours of your report
- **Status update** within 7 days with our assessment and planned timeline
- **Resolution** as quickly as possible, depending on severity and complexity
- **Credit** in our changelog if you'd like to be acknowledged (let us know your preference)

### Scope

The following are in scope for security reports:

- **getlootlist.com** (production web application)
- **API endpoints** under getlootlist.com/api/
- **Authentication and authorization** flaws
- **Data exposure** or access control issues
- **Injection vulnerabilities** (XSS, SQL injection, etc.)

The following are **out of scope**:

- The WoW addon (client-side Lua, no sensitive data handling)
- Denial of service attacks
- Social engineering
- Issues in third-party dependencies (report these to the upstream project)
- Issues that require physical access to a user's device

## Security Practices

LootList+ follows these security practices:

- **Row-Level Security (RLS)** on all database tables via Supabase
- **Server-side validation** on all score-affecting operations (submissions, loot awards, attendance)
- **Rate limiting** on all API endpoints
- **Audit logging** on sensitive operations
- **Secret scanning** enabled on the repository
- **No secrets in client code** -- all sensitive operations go through server-side API routes

## Disclosure Policy

We follow a coordinated disclosure process. We ask that you give us reasonable time to address the issue before making any information public. We will work with you to determine an appropriate disclosure timeline.
