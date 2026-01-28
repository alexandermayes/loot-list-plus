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

### 8. Supabase-Specific Security
Based on common vulnerabilities found in indie apps (11% exposure rate per SupaExplorer Jan 2026 report):

**Credential Exposure Checks:**
- Verify `SUPABASE_SERVICE_ROLE_KEY` is NOT prefixed with `NEXT_PUBLIC_`, `VITE_`, or `PUBLIC_`
- Ensure service-role/admin clients are ONLY imported in server-side code (`/app/api/`, server actions)
- Check for hardcoded Supabase URLs or keys in frontend components
- Scan JS bundles for leaked credentials (grep for `sb_secret`, `service_role`, Supabase URL patterns)
- Verify `.env` files are in `.gitignore` and not committed

**RLS Policy Completeness:**
- Verify RLS is enabled on ALL tables, not just some
- Check for overly permissive policies (e.g., `using (true)` for SELECT/INSERT/UPDATE/DELETE)
- Look for RLS policies that use hardcoded role names instead of position-based checks
- Test that RLS policies align with application-level permission checks
- Verify RLS policies use `auth.uid()` correctly

**Service Role Usage Patterns:**
- Document every use of service-role client and verify it's necessary
- Ensure service-role operations are preceded by proper authorization checks
- Check that service-role client isn't used where anon client would suffice

**Additional Supabase Checks:**
- Check for unprotected RPC functions (should require authentication)
- Verify storage bucket policies restrict access appropriately
- Look for direct table access that should go through RPC functions
- Check for missing foreign key constraints that could allow orphaned data

### 9. AI-Generated Code Vulnerabilities
Common security issues introduced by AI coding assistants:

- Credentials in frontend code (AI often suggests inline configs)
- Missing authentication on API routes (AI may scaffold without auth)
- Overly permissive CORS settings
- Debug/test endpoints left in production code
- Hardcoded secrets in example code that wasn't updated
- Missing input validation (AI focuses on happy path)
- Insecure default configurations

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

## Supabase Security Quick Checks

Run these grep commands to quickly identify potential issues:

```bash
# Check for service_role key exposure in frontend
grep -r "service.role\|sb_secret" --include="*.tsx" --include="*.ts" app/

# Verify service-role imports are only in API routes
grep -r "from.*service-role\|createServiceRoleClient\|createAdminClient" app/ | grep -v "/api/"

# Check for NEXT_PUBLIC_ prefix on sensitive vars
grep -r "NEXT_PUBLIC_.*SERVICE\|NEXT_PUBLIC_.*SECRET\|NEXT_PUBLIC_.*ROLE" .

# Find all env var usage to review
grep -r "process\.env\." --include="*.ts" --include="*.tsx" --include="*.js" | grep -v node_modules
```

## References

- [AuditYourApp](https://www.audityour.app/) - Supabase/Firebase security scanner
- [SupaExplorer Cybersecurity Report](https://supaexplorer.com/cybersecurity-insight-report-january-2026) - Common Supabase vulnerabilities
- [Supabase Security Docs](https://supabase.com/docs/guides/security) - Official security guidelines
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security) - Row Level Security best practices
