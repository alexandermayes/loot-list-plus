# Security Audit

Run a comprehensive security audit of the LootList+ application.

## Instructions

Perform a thorough security analysis of the codebase, checking for vulnerabilities across the following categories:

### 1. Authentication & Authorization
- Check all API routes for proper authentication (user session validation)
- Verify role-based access control (Member < Officer < Guild Master)
- Look for endpoints missing `createClient()` session checks
- Check for hardcoded credentials or tokens
- Verify OAuth implementation security

### 2. API Security
- Scan `/app/api/` for unauthenticated endpoints
- Check for proper input validation on all POST/PUT/DELETE routes
- Look for SQL injection vulnerabilities
- Check for mass assignment vulnerabilities
- Verify rate limiting implementation

### 3. Database Security
- Review RLS (Row Level Security) policies in migrations
- Check service role client usage (`/utils/supabase/service-role.ts`)
- Look for queries that bypass RLS without proper authorization
- Check for exposed database credentials

### 4. Input Validation & Sanitization
- Check user input handling across all forms
- Look for XSS vulnerabilities in rendered content
- Verify file upload handling (if any)
- Check for command injection in any shell operations

### 5. Data Exposure
- Check for sensitive data in API responses
- Look for PII leakage in logs
- Verify error messages don't expose internal details
- Check for exposed environment variables

### 6. Third-Party Dependencies
- Check package.json for known vulnerable packages
- Review third-party integrations (Discord, Supabase)
- Check for supply chain risks

### 7. Configuration Security
- Review next.config.ts for security headers
- Check CORS configuration
- Verify cookie settings (httpOnly, secure, sameSite)
- Check for development mode in production

## Output Format

Generate a security report with:

1. **Executive Summary** - Overall security posture and critical findings count
2. **Critical Vulnerabilities** - Issues requiring immediate action
3. **High Risk Issues** - Significant security concerns
4. **Medium Risk Issues** - Moderate concerns to address
5. **Low Risk Issues** - Minor improvements recommended
6. **Recommendations** - Prioritized action items

For each finding include:
- **Location**: File path and line number
- **Description**: What the vulnerability is
- **Impact**: What could happen if exploited
- **Remediation**: How to fix it
- **Code Example**: Before/after fix if applicable

## Known Areas to Check

Based on previous audits, pay special attention to:

1. `/app/api/admin/` endpoints - historically lacked authentication
2. Service role client usage patterns
3. Discord webhook URLs in environment variables
4. User input in loot submissions and character names
5. Guild invite code validation
