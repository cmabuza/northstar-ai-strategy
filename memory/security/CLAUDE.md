You are an expert Node.js/TypeScript developer specializing in security best practices.

## Security Implementation Status ✅

North Star Nav has comprehensive security protections against all major attack vectors:

### Implemented Protections

1. **Rate Limiting** ✅
   - 10 requests per minute per user
   - 2-second minimum interval between requests
   - Location: `supabase/functions/_shared/security.ts`

2. **SSRF (Server-Side Request Forgery)** ✅
   - Hardcoded AI gateway URL (no user-controlled URLs)
   - IP address validation blocks private ranges
   - Only HTTPS to approved domains

3. **DoS (Denial of Service)** ✅
   - Max payload: 50KB
   - Max prompt length: 5,000 characters
   - Request timeout: 30 seconds
   - Object depth validation

4. **XSS (Cross-Site Scripting)** ✅
   - Input sanitization on frontend and backend
   - Pattern detection for malicious scripts
   - CSP headers block inline scripts
   - All user input validated before display
   - Location: `src/lib/security.ts`, `src/lib/validation.ts`

5. **SQL Injection** ✅
   - Supabase parameterized queries (primary protection)
   - Row Level Security (RLS) policies enforce data isolation
   - Additional pattern detection layer
   - All inputs validated with Zod schemas

### Security Files

```
Security Implementation:
├── supabase/functions/_shared/security.ts      # Backend security utilities
├── supabase/functions/generate-features/index.ts  # Secured edge function
├── src/lib/security.ts                          # Frontend security utilities
├── src/lib/validation.ts                        # Input validation with security
├── memory/security/SECURITY.md                  # Complete documentation
└── memory/security/SECURITY_QUICK_REFERENCE.md  # Quick reference guide
```

### Key Security Principles

- **Environment variables** for all sensitive configuration
- **Validation at every layer** - frontend, edge function, database
- **Sanitization before display** - never render raw user input
- **Defense in depth** - multiple overlapping protections
- **Security logging** - all threats logged for monitoring
- **Principle of least privilege** - RLS ensures user isolation

### When Adding New Features

Always:
1. Add input validation with Zod schemas
2. Include security checks (XSS, SQL injection)
3. Sanitize before display or storage
4. Test with malicious inputs
5. Update RLS policies for new tables
6. Review security documentation

### Quick Security Checklist

- [ ] User input validated with Zod schemas
- [ ] Input sanitized before display
- [ ] Using Supabase SDK (no raw SQL)
- [ ] RLS policies in place for new tables
- [ ] No user-controlled URLs or file paths
- [ ] Size/length limits enforced
- [ ] Error handling doesn't leak sensitive info
- [ ] Security headers included in responses

### Documentation

See `/memory/security/SECURITY.md` for complete security implementation details, testing procedures, and incident response protocols.

See `/memory/security/SECURITY_QUICK_REFERENCE.md` for quick reference on limits, patterns, and common tasks.