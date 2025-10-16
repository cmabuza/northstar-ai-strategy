# Security Testing Guide

## Manual Testing Procedures

### 1. Rate Limiting Tests

#### Test 1.1: Exceed Per-Minute Limit
**Objective:** Verify 10 requests/minute limit is enforced

**Steps:**
1. Open browser console on the application
2. Execute rapid requests:
```javascript
// Run this in browser console
const token = localStorage.getItem('supabase.auth.token');
const authToken = JSON.parse(token).currentSession.access_token;

async function testRateLimit() {
  for (let i = 1; i <= 12; i++) {
    const response = await fetch('YOUR_SUPABASE_URL/functions/v1/generate-features', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: 'Test prompt for rate limiting',
        type: 'features'
      })
    });

    console.log(`Request ${i}: ${response.status}`);
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      console.log(`Rate limited! Retry after ${retryAfter} seconds`);
    }
  }
}

testRateLimit();
```

**Expected Result:**
- First 10 requests: Status 200 (success)
- Request 11+: Status 429 (Too Many Requests)
- Response includes `Retry-After` header
- Response includes rate limit headers

**Pass Criteria:**
✅ 11th request returns 429
✅ `Retry-After` header present
✅ Error message mentions rate limit

---

#### Test 1.2: Rapid Succession Protection
**Objective:** Verify 2-second minimum interval

**Steps:**
```javascript
async function testRapidRequests() {
  const start = Date.now();

  const response1 = await fetch('YOUR_SUPABASE_URL/functions/v1/generate-features', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt: 'Test 1', type: 'features' })
  });
  console.log('Request 1:', response1.status);

  // Immediately send second request
  const response2 = await fetch('YOUR_SUPABASE_URL/functions/v1/generate-features', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt: 'Test 2', type: 'features' })
  });

  const elapsed = Date.now() - start;
  console.log(`Request 2: ${response2.status} (${elapsed}ms elapsed)`);
}

testRapidRequests();
```

**Expected Result:**
- Second request returns 429 if sent within 2 seconds
- Error mentions "quick succession"

**Pass Criteria:**
✅ Second rapid request blocked
✅ Appropriate error message

---

### 2. XSS Protection Tests

#### Test 2.1: Script Tag Injection
**Objective:** Verify `<script>` tags are blocked

**Steps:**
1. Navigate to OKR Input page
2. Enter in OKR field: `<script>alert('XSS')</script>My OKR`
3. Click "Generate Features"

**Expected Result:**
- Validation error appears
- Error message mentions "dangerous content"
- No alert box appears
- Text is sanitized in display

**Pass Criteria:**
✅ Input rejected with security error
✅ No script execution
✅ User notified of security issue

---

#### Test 2.2: Event Handler Injection
**Objective:** Verify event handlers are blocked

**Test Inputs:**
```
<img src=x onerror=alert('XSS')>
<div onclick="alert('XSS')">Click me</div>
javascript:alert('XSS')
```

**Steps:**
1. Try each input in OKR, Feature, or KPI fields
2. Attempt to save

**Expected Result:**
- All inputs rejected
- Security error displayed

**Pass Criteria:**
✅ All event handlers blocked
✅ No JavaScript execution

---

#### Test 2.3: Display Sanitization
**Objective:** Verify stored data is sanitized on display

**Steps:**
1. Use browser dev tools to bypass frontend validation
2. Modify API request to include: `Test & <b>bold</b>`
3. Check if data displays correctly sanitized

**Expected Result:**
- Special characters HTML-encoded
- Display shows: `Test &amp; &lt;b&gt;bold&lt;/b&gt;`

**Pass Criteria:**
✅ HTML tags encoded
✅ Special characters escaped
✅ No rendering of HTML

---

### 3. SQL Injection Tests

#### Test 3.1: Basic SQL Injection
**Objective:** Verify SQL keywords are blocked

**Test Inputs:**
```
' OR '1'='1
'; DROP TABLE strategies; --
' UNION SELECT * FROM users; --
admin'--
SELECT * FROM strategies WHERE id = 1
```

**Steps:**
1. Try each input in text fields (OKR, Feature, KPI)
2. Attempt to submit

**Expected Result:**
- Inputs rejected with validation error
- Error mentions "SQL patterns"

**Pass Criteria:**
✅ All SQL injection attempts blocked
✅ Appropriate error messages
✅ No database errors in console

---

#### Test 3.2: RLS Policy Verification
**Objective:** Verify Row Level Security prevents data access

**Steps:**
1. Login as User A
2. Create a strategy and note the ID
3. Login as User B
4. Try to access User A's strategy via direct API call:
```javascript
const { data, error } = await supabase
  .from('strategies')
  .select('*')
  .eq('id', 'USER_A_STRATEGY_ID');

console.log('Data:', data);
console.log('Error:', error);
```

**Expected Result:**
- User B receives empty array or RLS error
- Cannot access User A's data

**Pass Criteria:**
✅ Data isolation enforced
✅ User B cannot access User A's data
✅ No error reveals data existence

---

### 4. DoS Protection Tests

#### Test 4.1: Large Payload
**Objective:** Verify 50KB payload limit

**Steps:**
```javascript
const largePrompt = 'x'.repeat(60000); // 60KB of data

const response = await fetch('YOUR_SUPABASE_URL/functions/v1/generate-features', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: largePrompt,
    type: 'features'
  })
});

console.log('Status:', response.status);
console.log('Error:', await response.json());
```

**Expected Result:**
- Status: 413 (Payload Too Large)
- Error message mentions size limit

**Pass Criteria:**
✅ Large payloads rejected
✅ 413 status code
✅ Appropriate error message

---

#### Test 4.2: Prompt Length Limit
**Objective:** Verify 5,000 character prompt limit

**Steps:**
1. Create prompt with 5,100 characters
2. Submit via API or form

**Expected Result:**
- Request rejected
- Error mentions prompt length

**Pass Criteria:**
✅ Long prompts rejected
✅ Clear error message

---

#### Test 4.3: Request Timeout
**Objective:** Verify 30-second timeout (hard to test manually)

**Note:** This requires the AI gateway to be slow or unresponsive. In normal operation, requests complete quickly.

**Simulated Test:**
Modify edge function temporarily to add delay:
```typescript
await new Promise(resolve => setTimeout(resolve, 35000)); // 35 seconds
```

**Expected Result:**
- Request times out after 30 seconds
- 504 Gateway Timeout returned

---

### 5. SSRF Protection Tests

#### Test 5.1: URL Validation
**Objective:** Verify only approved domains allowed

**Note:** The current implementation uses a hardcoded URL, making SSRF impossible. This test verifies the protection is in place.

**Steps:**
1. Review `generate-features/index.ts`
2. Verify `aiGatewayUrl` is hardcoded
3. Verify no user input modifies the URL

**Expected Result:**
- URL is constant: `https://ai.gateway.lovable.dev/v1/chat/completions`
- No variables or user input in URL

**Pass Criteria:**
✅ URL is hardcoded
✅ No user-controlled URL components

---

#### Test 5.2: Pattern Detection
**Objective:** Verify private IP and localhost patterns are detected

**Test Inputs (in prompts):**
```
Visit http://localhost:8080
Check http://192.168.1.1
Access http://10.0.0.1
File at file:///etc/passwd
```

**Steps:**
1. Include these URLs in OKR or feature descriptions
2. Submit

**Expected Result:**
- Patterns detected as threats
- Request blocked

**Pass Criteria:**
✅ Suspicious URLs detected
✅ Request rejected

---

### 6. Authentication Tests

#### Test 6.1: Unauthenticated Access
**Objective:** Verify authentication is required

**Steps:**
```javascript
// Call without auth token
const response = await fetch('YOUR_SUPABASE_URL/functions/v1/generate-features', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'Test',
    type: 'features'
  })
});

console.log('Status:', response.status);
```

**Expected Result:**
- Status: 401 (Unauthorized)
- Error: "Authentication required"

**Pass Criteria:**
✅ 401 status for unauthenticated requests
✅ Clear error message

---

## Automated Test Suite

### Unit Tests for Security Functions

Create file: `src/lib/__tests__/security.test.ts`

```typescript
import { describe, test, expect } from 'vitest';
import {
  sanitizeInput,
  sanitizeDisplayText,
  containsDangerousPatterns,
  isSafeUrl,
  validateLength,
} from '../security';

describe('Security Utilities', () => {
  describe('sanitizeInput', () => {
    test('encodes script tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>'))
        .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    });

    test('encodes special characters', () => {
      expect(sanitizeInput('Test & <b>bold</b>'))
        .toBe('Test &amp; &lt;b&gt;bold&lt;&#x2F;b&gt;');
    });

    test('handles empty strings', () => {
      expect(sanitizeInput('')).toBe('');
    });

    test('handles non-strings', () => {
      expect(sanitizeInput(null as any)).toBe('');
      expect(sanitizeInput(undefined as any)).toBe('');
    });
  });

  describe('containsDangerousPatterns', () => {
    test('detects script tags', () => {
      expect(containsDangerousPatterns('<script>alert(1)</script>')).toBe(true);
      expect(containsDangerousPatterns('<SCRIPT>alert(1)</SCRIPT>')).toBe(true);
    });

    test('detects event handlers', () => {
      expect(containsDangerousPatterns('<img onerror="alert(1)">')).toBe(true);
      expect(containsDangerousPatterns('<div onclick="bad()">')).toBe(true);
    });

    test('detects javascript: protocol', () => {
      expect(containsDangerousPatterns('javascript:alert(1)')).toBe(true);
    });

    test('allows safe content', () => {
      expect(containsDangerousPatterns('This is a normal string')).toBe(false);
    });
  });

  describe('isSafeUrl', () => {
    test('allows https URLs', () => {
      expect(isSafeUrl('https://example.com')).toBe(true);
    });

    test('allows http URLs', () => {
      expect(isSafeUrl('http://example.com')).toBe(true);
    });

    test('blocks javascript: protocol', () => {
      expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    });

    test('blocks data: protocol', () => {
      expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    test('blocks file: protocol', () => {
      expect(isSafeUrl('file:///etc/passwd')).toBe(false);
    });

    test('allows relative URLs', () => {
      expect(isSafeUrl('/path/to/resource')).toBe(true);
      expect(isSafeUrl('./relative')).toBe(true);
    });
  });

  describe('validateLength', () => {
    test('validates minimum length', () => {
      const result = validateLength('abc', 5, 10);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 5');
    });

    test('validates maximum length', () => {
      const result = validateLength('a'.repeat(15), 5, 10);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('less than 10');
    });

    test('accepts valid length', () => {
      const result = validateLength('hello', 5, 10);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
});
```

### Validation Tests

Create file: `src/lib/__tests__/validation.test.ts`

```typescript
import { describe, test, expect } from 'vitest';
import { validateStrategy, validateFeature, validateKPI } from '../validation';

describe('Validation with Security', () => {
  describe('validateStrategy', () => {
    test('accepts valid strategy', () => {
      const result = validateStrategy({
        okr: 'Increase user engagement by 50%',
        softwareContext: 'Mobile app for fitness tracking',
      });
      expect(result).toBeDefined();
    });

    test('rejects XSS attempts', () => {
      expect(() => validateStrategy({
        okr: '<script>alert("xss")</script>',
      })).toThrow();
    });

    test('rejects SQL injection', () => {
      expect(() => validateStrategy({
        okr: "'; DROP TABLE strategies; --",
      })).toThrow();
    });

    test('enforces minimum length', () => {
      expect(() => validateStrategy({
        okr: 'Short',
      })).toThrow(/at least 10 characters/);
    });

    test('enforces maximum length', () => {
      expect(() => validateStrategy({
        okr: 'x'.repeat(2100),
      })).toThrow(/less than 2000 characters/);
    });
  });

  describe('validateFeature', () => {
    test('accepts valid feature', () => {
      const result = validateFeature({
        title: 'User Profile Page',
        description: 'A comprehensive user profile with customization options',
      });
      expect(result).toBeDefined();
    });

    test('rejects dangerous patterns', () => {
      expect(() => validateFeature({
        title: '<iframe src="evil.com">',
        description: 'Test description that is long enough',
      })).toThrow();
    });
  });

  describe('validateKPI', () => {
    test('accepts valid KPI', () => {
      const result = validateKPI({
        name: 'Daily Active Users',
        description: 'Number of unique users active each day',
      });
      expect(result).toBeDefined();
    });

    test('rejects SQL injection in KPI', () => {
      expect(() => validateKPI({
        name: "test' OR '1'='1",
        description: 'This is a test description that is long enough',
      })).toThrow();
    });
  });
});
```

### Running Tests

```bash
# Install vitest if not already installed
npm install -D vitest

# Add to package.json scripts:
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}

# Run tests
npm test
```

---

## Security Audit Checklist

Perform this audit monthly or after significant changes:

### Backend Security
- [ ] Rate limiting active and configured correctly
- [ ] All edge functions require authentication
- [ ] Payload size limits enforced
- [ ] Request timeouts configured
- [ ] Security headers in all responses
- [ ] Error messages don't leak sensitive info
- [ ] Logging captures security events

### Frontend Security
- [ ] All user inputs pass through validation
- [ ] Zod schemas include security checks
- [ ] No raw HTML rendering of user content
- [ ] URLs validated before use
- [ ] CSP headers configured
- [ ] No sensitive data in localStorage
- [ ] HTTPS enforced for all requests

### Database Security
- [ ] RLS policies enabled on all tables
- [ ] Users can only access own data
- [ ] No direct SQL in application code
- [ ] Supabase SDK used for all queries
- [ ] Foreign key constraints in place
- [ ] Audit logs reviewed

### Infrastructure
- [ ] Environment variables secured
- [ ] API keys rotated regularly
- [ ] Dependencies up to date
- [ ] Security patches applied
- [ ] Monitoring alerts configured
- [ ] Backup strategy in place

---

## Test Results Template

```markdown
# Security Test Results - [Date]

## Test Summary
- Total Tests: X
- Passed: X
- Failed: X
- Not Applicable: X

## Detailed Results

### Rate Limiting
- [ ] Per-minute limit: PASS/FAIL
- [ ] Rapid succession: PASS/FAIL
- Notes:

### XSS Protection
- [ ] Script tags: PASS/FAIL
- [ ] Event handlers: PASS/FAIL
- [ ] Display sanitization: PASS/FAIL
- Notes:

### SQL Injection
- [ ] Basic injection: PASS/FAIL
- [ ] RLS policies: PASS/FAIL
- Notes:

### DoS Protection
- [ ] Payload size: PASS/FAIL
- [ ] Prompt length: PASS/FAIL
- [ ] Timeout: PASS/FAIL
- Notes:

### SSRF Protection
- [ ] URL hardcoding: PASS/FAIL
- [ ] Pattern detection: PASS/FAIL
- Notes:

### Authentication
- [ ] Unauthenticated access: PASS/FAIL
- Notes:

## Issues Found
1. [Issue description]
   - Severity: High/Medium/Low
   - Action: [What needs to be done]

## Recommendations
1. [Recommendation]

## Tested By
Name: [Your Name]
Date: [Date]
Environment: Production/Staging/Development
```

---

**Last Updated:** October 16, 2025
