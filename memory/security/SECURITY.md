# Security Implementation Guide

## Overview

North Star Nav has implemented comprehensive security protections against the following attack vectors:

1. **Rate Limiting** - Prevents API abuse and DoS attacks
2. **Server-Side Request Forgery (SSRF)** - Prevents unauthorized external requests
3. **Denial of Service (DoS)** - Prevents resource exhaustion attacks
4. **Cross-Site Scripting (XSS)** - Prevents malicious script injection
5. **SQL Injection** - Prevents database manipulation attacks

## Security Architecture

### Backend Security (Supabase Edge Functions)

**Location:** `supabase/functions/_shared/security.ts`

#### 1. Rate Limiting Protection

**Implementation:**
- In-memory rate limiter tracking requests per user
- Limits: 10 requests per minute per user
- Minimum 2-second interval between requests
- Returns 429 status with `Retry-After` header when exceeded

**Configuration:**
```typescript
const RATE_LIMIT_CONFIG = {
  maxRequests: 10,          // Max requests per window
  windowMs: 60000,           // 1 minute window
  minRequestInterval: 2000,  // Minimum 2 seconds between requests
};
```

**Headers Added:**
- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Remaining requests in current window
- `X-RateLimit-Reset` - Timestamp when the limit resets
- `Retry-After` - Seconds to wait before retrying (when rate limited)

#### 2. SSRF (Server-Side Request Forgery) Protection

**Implementation:**
- Hardcoded AI gateway URL - no user-controlled URLs
- Pattern detection for private IP ranges and localhost
- Only HTTPS connections allowed to approved domain

**Protected Against:**
- Internal network scanning (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
- Localhost access (127.0.0.1, localhost)
- File system access (file://)
- Credential injection in URLs (@username:password)

**Code Example:**
```typescript
const aiGatewayUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions';
// No user input can modify this URL
```

#### 3. Denial of Service (DoS) Protection

**Implementation:**
- Request payload size limit: 50KB
- Prompt length limit: 5,000 characters
- Request timeout: 30 seconds
- Minimum prompt length: 10 characters
- Object depth validation (max 10 levels)

**Configuration:**
```typescript
const DOS_PROTECTION_CONFIG = {
  maxPayloadSize: 50000,    // 50KB max payload
  maxPromptLength: 5000,     // Max characters in prompt
  requestTimeout: 30000,     // 30 second timeout
  minRequestInterval: 2000,  // Anti-spam protection
};
```

**Error Responses:**
- 413 Payload Too Large - Request exceeds size limits
- 504 Gateway Timeout - Request took longer than 30 seconds
- 400 Bad Request - Prompt too long or too short

#### 4. Cross-Site Scripting (XSS) Protection

**Implementation:**

**Backend:**
- Input sanitization removes dangerous characters
- Pattern detection for XSS attempts
- Security headers prevent inline scripts

**Frontend:** `src/lib/security.ts`
- All user inputs sanitized before display
- HTML encoding of special characters
- Validation integrated into Zod schemas

**Patterns Detected:**
- `<script>` tags
- `<iframe>`, `<object>`, `<embed>` tags
- `javascript:` protocol
- Event handlers (`onclick`, `onerror`, etc.)
- `eval()` and `expression()` functions

**Sanitization:**
```typescript
// Characters encoded:
< → &lt;
> → &gt;
" → &quot;
' → &#x27;
/ → &#x2F;
```

**Security Headers:**
```typescript
'Content-Security-Policy': "default-src 'none'; script-src 'none'; object-src 'none'"
'X-Content-Type-Options': 'nosniff'
'X-Frame-Options': 'DENY'
'X-XSS-Protection': '1; mode=block'
'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
```

#### 5. SQL Injection Protection

**Implementation:**

**Primary Protection (Supabase):**
- Parameterized queries via Supabase SDK
- Row Level Security (RLS) policies enforce user isolation
- No raw SQL concatenation

**Additional Validation Layer:**
- Pattern detection for SQL keywords
- Client-side validation before submission
- Server-side validation before processing

**Patterns Blocked:**
- SQL keywords: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `DROP`, `UNION`, etc.
- Comment sequences: `--`, `/*`, `*/`
- Logic operators in suspicious contexts: `OR 1=1`, `AND 1=1`
- System stored procedures: `xp_`, `sp_`

**Database Security:**
```sql
-- All tables have RLS enabled
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own strategies"
ON public.strategies FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

### Frontend Security

**Location:** `src/lib/security.ts`, `src/lib/validation.ts`

#### Input Validation with Zod

All user inputs validated through Zod schemas with security checks:

```typescript
// Example: Strategy validation
export const strategySchema = z.object({
  okr: z.string()
    .trim()
    .min(10, "OKR must be at least 10 characters")
    .max(2000, "OKR must be less than 2000 characters")
    .pipe(safeString)      // XSS protection
    .pipe(sqlSafeString),  // SQL injection protection
});
```

#### Content Security Policy

Recommended CSP configuration in `index.html`:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.lovable.dev;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
">
```

## Security Monitoring

### Logging Events

All security events are logged with the following types:

```typescript
type SecurityEvent =
  | 'rate_limit'        // Rate limit exceeded
  | 'threat_detected'   // XSS, SSRF, or SQL injection attempt
  | 'invalid_request'   // Malformed or oversized request
  | 'success'           // Successful request
```

**Log Format:**
```json
{
  "timestamp": "2025-10-16T10:30:45.123Z",
  "userId": "uuid-here",
  "eventType": "threat_detected",
  "threats": ["Potential XSS pattern detected"],
  "promptPreview": "First 100 chars of prompt..."
}
```

### Monitoring Checklist

Monitor logs for:
- [ ] Repeated rate limit violations from same user
- [ ] Multiple threat detections (possible attack)
- [ ] Unusual patterns of 413/504 errors (possible DoS)
- [ ] Authentication failures with valid tokens (possible token theft)

## Security Best Practices

### For Developers

1. **Never bypass validation** - Always use Zod schemas for input
2. **Use Supabase SDK** - Never write raw SQL queries
3. **Sanitize before display** - Always use `sanitizeInput()` or `sanitizeDisplayText()`
4. **Validate URLs** - Use `isSafeUrl()` before opening links
5. **Check RLS policies** - Ensure new tables have proper policies

### For Deployment

1. **Environment Variables:**
   - Never commit `.env` files
   - Rotate `LOVABLE_API_KEY` regularly
   - Use strong Supabase service role keys

2. **Database Security:**
   - Regularly review RLS policies
   - Monitor for policy bypasses
   - Keep Supabase updated

3. **Edge Functions:**
   - Deploy with minimum required permissions
   - Monitor function execution times
   - Review logs for security events

## Testing Security

### Manual Testing

**Test Rate Limiting:**
```bash
# Make 11 rapid requests - 11th should fail with 429
for i in {1..11}; do
  curl -H "Authorization: Bearer YOUR_TOKEN" \
       -H "Content-Type: application/json" \
       -d '{"prompt":"test","type":"features"}' \
       https://YOUR_PROJECT.supabase.co/functions/v1/generate-features
done
```

**Test XSS Protection:**
```typescript
// Should be rejected with "Security threat detected"
const maliciousInput = "<script>alert('xss')</script>";
// Try submitting in OKR field
```

**Test SQL Injection Protection:**
```typescript
// Should be rejected with "dangerous SQL patterns"
const sqlInjection = "'; DROP TABLE users; --";
// Try submitting in any text field
```

**Test DoS Protection:**
```typescript
// Should fail with 413 Payload Too Large
const hugePrompt = "x".repeat(6000);
```

### Automated Testing

Create test suite in `src/lib/__tests__/security.test.ts`:

```typescript
import { sanitizeInput, containsDangerousPatterns } from '../security';

describe('Security Utils', () => {
  test('sanitizes XSS attempts', () => {
    expect(sanitizeInput('<script>alert("xss")</script>'))
      .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
  });

  test('detects dangerous patterns', () => {
    expect(containsDangerousPatterns('<script>')).toBe(true);
    expect(containsDangerousPatterns('javascript:')).toBe(true);
    expect(containsDangerousPatterns('normal text')).toBe(false);
  });
});
```

## Incident Response

### If Security Breach Detected

1. **Immediate Actions:**
   - Revoke compromised API keys
   - Review recent database changes
   - Check authentication logs
   - Disable affected user accounts if necessary

2. **Investigation:**
   - Review security event logs
   - Identify attack vector
   - Assess data exposure
   - Document findings

3. **Remediation:**
   - Patch vulnerability
   - Update security rules
   - Notify affected users
   - Implement additional monitoring

4. **Prevention:**
   - Review and update security policies
   - Add tests for new attack vector
   - Update security documentation

## Security Updates

**Last Updated:** October 16, 2025
**Version:** 4.0
**Status:** Production Ready

### Recent Changes

- ✅ Implemented comprehensive rate limiting
- ✅ Added SSRF protection with URL validation
- ✅ Implemented DoS protection with size/timeout limits
- ✅ Added XSS protection with input sanitization
- ✅ Enhanced SQL injection protection with pattern detection
- ✅ Added security event logging
- ✅ Implemented security headers

### Future Enhancements

- [ ] Implement Redis-based rate limiting for multi-instance deployments
- [ ] Add IP-based blocking for repeated violations
- [ ] Implement CAPTCHA for suspicious activity
- [ ] Add anomaly detection for unusual request patterns
- [ ] Implement request signing for API calls
- [ ] Add automated security scanning in CI/CD

## Contact

For security issues, contact: [Your Security Contact]

**Report vulnerabilities via:** [Your Security Email]

---

**⚠️ IMPORTANT:** This document should be kept up-to-date as security measures evolve. Review quarterly or after any security-related changes.
