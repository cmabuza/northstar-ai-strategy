# Security Quick Reference

## 🛡️ Protection Summary

| Attack Type | Status | Implementation |
|------------|--------|----------------|
| **Rate Limiting** | ✅ Active | 10 req/min per user, 2s min interval |
| **SSRF** | ✅ Active | Hardcoded URLs, IP validation |
| **DoS** | ✅ Active | 50KB max payload, 30s timeout |
| **XSS** | ✅ Active | Input sanitization, CSP headers |
| **SQL Injection** | ✅ Active | RLS policies, pattern detection |

## 📊 Rate Limits

```
Per User Limits:
• 10 requests per minute
• 2 seconds minimum between requests
• 60 requests per hour

Response Codes:
• 429 - Rate limit exceeded
• Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
```

## 🚫 Blocked Patterns

### XSS Patterns
- `<script>`, `<iframe>`, `<object>`, `<embed>`
- `javascript:`, `data:` URLs
- Event handlers: `onclick`, `onerror`, etc.
- Functions: `eval()`, `expression()`

### SQL Injection Patterns
- Keywords: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `DROP`, `UNION`
- Comments: `--`, `/*`, `*/`
- Logic: `OR 1=1`, `AND 1=1`
- Procedures: `xp_`, `sp_`

### SSRF Patterns
- Private IPs: `10.x.x.x`, `192.168.x.x`, `172.16-31.x.x`
- Localhost: `127.0.0.1`, `localhost`
- Protocols: `file://`, `ftp://`
- Credentials: URLs with `@` character

## 📏 Size Limits

```
Request Limits:
• Max payload: 50KB
• Max prompt: 5,000 characters
• Min prompt: 10 characters
• Request timeout: 30 seconds

Field Limits:
• OKR: 10-2,000 characters
• Software context: 1,000 characters max
• Feature title: 3-200 characters
• Feature description: 10-1,000 characters
• KPI name: 3-200 characters
• KPI description: 10-1,000 characters
```

## 🔧 Common Security Tasks

### Sanitize User Input
```typescript
import { sanitizeInput } from '@/lib/security';

const safeText = sanitizeInput(userInput);
```

### Validate Before Database
```typescript
import { validateStrategy } from '@/lib/validation';

try {
  const validated = validateStrategy({ okr, softwareContext });
  // Safe to save to database
} catch (error) {
  // Show validation error to user
}
```

### Check for Dangerous Patterns
```typescript
import { containsDangerousPatterns } from '@/lib/security';

if (containsDangerousPatterns(input)) {
  // Reject input
}
```

### Validate URLs
```typescript
import { isSafeUrl } from '@/lib/security';

if (isSafeUrl(url)) {
  // Safe to use
}
```

## 🚨 Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 400 | Bad Request | Check input validation |
| 401 | Unauthorized | User not authenticated |
| 413 | Payload Too Large | Reduce input size |
| 429 | Too Many Requests | Wait before retrying |
| 504 | Gateway Timeout | Request took too long |

## 📝 Security Headers

```
Response Headers:
✓ Content-Security-Policy
✓ X-Content-Type-Options: nosniff
✓ X-Frame-Options: DENY
✓ X-XSS-Protection: 1; mode=block
✓ Strict-Transport-Security
✓ X-RateLimit-* (rate limiting info)
```

## 🔍 Monitoring Checklist

Daily:
- [ ] Check rate limit violations
- [ ] Review threat detection events
- [ ] Monitor 429/413 error rates

Weekly:
- [ ] Review authentication logs
- [ ] Check for unusual patterns
- [ ] Verify RLS policies active

Monthly:
- [ ] Rotate API keys
- [ ] Security audit
- [ ] Update dependencies

## 🆘 Emergency Actions

**Rate Limit Exceeded:**
```typescript
// Client should respect Retry-After header
const retryAfter = response.headers.get('Retry-After');
await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
```

**Threat Detected:**
1. Log the event with user ID
2. Return 400 with threat details
3. Monitor for repeated attempts
4. Consider temporary user suspension

**DoS Attempt:**
1. Return 413 or 504
2. Log the attempt
3. Check if targeted attack
4. Consider IP-based blocking

## 📚 Files Reference

```
Security Implementation:
├── supabase/functions/_shared/security.ts      # Backend security utils
├── src/lib/security.ts                          # Frontend security utils
├── src/lib/validation.ts                        # Zod schemas with security
└── memory/security/
    ├── SECURITY.md                              # Full documentation
    └── SECURITY_QUICK_REFERENCE.md              # This file

Key Functions:
├── supabase/functions/generate-features/index.ts  # Secured edge function
└── src/services/database.ts                       # Database service
```

## 🎯 Testing Commands

```bash
# Test rate limiting (should fail on 11th request)
for i in {1..11}; do curl -H "Authorization: Bearer TOKEN" \
  https://PROJECT.supabase.co/functions/v1/generate-features -d '{"prompt":"test","type":"features"}'; done

# Test payload size (should return 413)
curl -H "Authorization: Bearer TOKEN" \
  https://PROJECT.supabase.co/functions/v1/generate-features \
  -d '{"prompt":"'$(printf 'x%.0s' {1..6000})'","type":"features"}'
```

## 💡 Best Practices

1. **Always validate** - Use Zod schemas for all inputs
2. **Sanitize before display** - Never render raw user input
3. **Use Supabase SDK** - Avoid raw SQL
4. **Check RLS policies** - Ensure user isolation
5. **Monitor logs** - Watch for attack patterns
6. **Keep updated** - Regular dependency updates
7. **Principle of least privilege** - Minimal permissions
8. **Defense in depth** - Multiple security layers

---

**Last Updated:** October 16, 2025 | **Version:** 4.0
