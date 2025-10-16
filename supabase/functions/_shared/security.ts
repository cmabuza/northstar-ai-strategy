// Security utilities for edge functions
// Provides protection against rate limiting, DoS, SSRF, XSS, and prompt injection attacks

interface RateLimitEntry {
  count: number;
  resetAt: number;
  lastRequest: number;
}

// In-memory rate limiter (use Redis/KV for production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configuration
const RATE_LIMIT_CONFIG = {
  maxRequests: 10, // Max requests per window
  windowMs: 60000, // 1 minute window
  minRequestInterval: 2000, // Minimum 2 seconds between requests
  maxPromptLength: 5000, // Max total prompt length
  maxPayloadSize: 50000, // Max 50KB payload
  requestTimeout: 30000, // 30 second timeout
};

// Dangerous patterns for prompt injection detection
const DANGEROUS_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|commands?)/gi,
  /disregard\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|commands?)/gi,
  /forget\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|commands?)/gi,
  /new\s+(instructions?|prompts?|commands?|task)/gi,
  /system\s*:\s*/gi,
  /role\s*:\s*system/gi,
  /\[system\]/gi,
  /<\s*script[^>]*>/gi,
  /javascript\s*:/gi,
  /on(load|error|click|mouse)/gi,
  /eval\s*\(/gi,
  /document\s*\./gi,
  /window\s*\./gi,
];

// Suspicious URL patterns for SSRF detection
const SSRF_PATTERNS = [
  /https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/gi,
  /https?:\/\/192\.168\.\d+\.\d+/gi,
  /https?:\/\/10\.\d+\.\d+\.\d+/gi,
  /https?:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+/gi,
  /file:\/\//gi,
  /ftp:\/\//gi,
  /@[^/]+/g, // Credentials in URLs
];

// XSS patterns
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gis,
  /<iframe[^>]*>/gi,
  /<object[^>]*>/gi,
  /<embed[^>]*>/gi,
  /<link[^>]*>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
];

/**
 * Rate limiter with per-user tracking
 * Returns true if request should be allowed, false if rate limited
 */
export function checkRateLimit(userId: string): {
  allowed: boolean;
  retryAfter?: number;
  reason?: string;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(userId);

  // Clean up old entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }

  // First request from this user
  if (!entry) {
    rateLimitStore.set(userId, {
      count: 1,
      resetAt: now + RATE_LIMIT_CONFIG.windowMs,
      lastRequest: now,
    });
    return { allowed: true };
  }

  // Window has reset
  if (now > entry.resetAt) {
    rateLimitStore.set(userId, {
      count: 1,
      resetAt: now + RATE_LIMIT_CONFIG.windowMs,
      lastRequest: now,
    });
    return { allowed: true };
  }

  // Check minimum interval between requests (DoS protection)
  const timeSinceLastRequest = now - entry.lastRequest;
  if (timeSinceLastRequest < RATE_LIMIT_CONFIG.minRequestInterval) {
    return {
      allowed: false,
      retryAfter: Math.ceil((RATE_LIMIT_CONFIG.minRequestInterval - timeSinceLastRequest) / 1000),
      reason: 'Too many requests in quick succession. Please wait before retrying.',
    };
  }

  // Check if exceeded max requests
  if (entry.count >= RATE_LIMIT_CONFIG.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      reason: `Rate limit exceeded. You can make ${RATE_LIMIT_CONFIG.maxRequests} requests per minute. Please try again in ${retryAfter} seconds.`,
    };
  }

  // Increment counter
  entry.count++;
  entry.lastRequest = now;
  rateLimitStore.set(userId, entry);

  return { allowed: true };
}

/**
 * Sanitize user input to prevent prompt injection
 */
export function sanitizePromptInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Trim and normalize whitespace
  let sanitized = input.trim().replace(/\s+/g, ' ');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Validate input for dangerous patterns
 * Returns array of detected threats
 */
export function detectThreats(input: string): string[] {
  if (!input || typeof input !== 'string') {
    return [];
  }

  const threats: string[] = [];

  // Check for prompt injection patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(input)) {
      threats.push('Potential prompt injection detected');
      break;
    }
  }

  // Check for SSRF patterns
  for (const pattern of SSRF_PATTERNS) {
    if (pattern.test(input)) {
      threats.push('Suspicious URL pattern detected');
      break;
    }
  }

  // Check for XSS patterns
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      threats.push('Potential XSS pattern detected');
      break;
    }
  }

  return threats;
}

/**
 * Validate request payload size (DoS protection)
 */
export function validatePayloadSize(payload: any): {
  valid: boolean;
  size: number;
  reason?: string;
} {
  const size = JSON.stringify(payload).length;

  if (size > RATE_LIMIT_CONFIG.maxPayloadSize) {
    return {
      valid: false,
      size,
      reason: `Payload too large: ${size} bytes (max: ${RATE_LIMIT_CONFIG.maxPayloadSize} bytes)`,
    };
  }

  return { valid: true, size };
}

/**
 * Validate prompt length (DoS protection)
 */
export function validatePromptLength(prompt: string): {
  valid: boolean;
  length: number;
  reason?: string;
} {
  const length = prompt.length;

  if (length > RATE_LIMIT_CONFIG.maxPromptLength) {
    return {
      valid: false,
      length,
      reason: `Prompt too long: ${length} characters (max: ${RATE_LIMIT_CONFIG.maxPromptLength} characters)`,
    };
  }

  if (length < 10) {
    return {
      valid: false,
      length,
      reason: 'Prompt too short: minimum 10 characters required',
    };
  }

  return { valid: true, length };
}

/**
 * Extract user ID from Supabase JWT token
 */
export function extractUserId(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    // Extract JWT token
    const token = authHeader.substring(7);

    // Decode JWT payload (basic decoding, not verification)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode base64url
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.sub || null;
  } catch (error) {
    console.error('Error extracting user ID:', error);
    return null;
  }
}

/**
 * Create security headers for responses
 */
export function getSecurityHeaders(allowedOrigin?: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigin || '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400', // 24 hours
    'Content-Security-Policy': "default-src 'none'; script-src 'none'; object-src 'none'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Type': 'application/json',
  };
}

/**
 * Validate request type parameter
 */
export function validateRequestType(type: string): {
  valid: boolean;
  reason?: string;
} {
  const validTypes = ['features', 'kpis', 'implementation'];

  if (!type || typeof type !== 'string') {
    return {
      valid: false,
      reason: 'Missing or invalid type parameter',
    };
  }

  if (!validTypes.includes(type)) {
    return {
      valid: false,
      reason: `Invalid type: ${type}. Must be one of: ${validTypes.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Create rate limit info headers
 */
export function getRateLimitHeaders(userId: string): Record<string, string> {
  const entry = rateLimitStore.get(userId);

  if (!entry) {
    return {
      'X-RateLimit-Limit': RATE_LIMIT_CONFIG.maxRequests.toString(),
      'X-RateLimit-Remaining': RATE_LIMIT_CONFIG.maxRequests.toString(),
      'X-RateLimit-Reset': new Date(Date.now() + RATE_LIMIT_CONFIG.windowMs).toISOString(),
    };
  }

  const remaining = Math.max(0, RATE_LIMIT_CONFIG.maxRequests - entry.count);

  return {
    'X-RateLimit-Limit': RATE_LIMIT_CONFIG.maxRequests.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': new Date(entry.resetAt).toISOString(),
  };
}

/**
 * Log security events for monitoring
 */
export function logSecurityEvent(
  userId: string,
  eventType: 'rate_limit' | 'threat_detected' | 'invalid_request' | 'success',
  details: Record<string, any>
): void {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({
    timestamp,
    userId,
    eventType,
    ...details,
  }));
}
