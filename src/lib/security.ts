/**
 * Frontend Security Utilities
 * Provides XSS protection and input sanitization for the client-side
 */

/**
 * Sanitize user input to prevent XSS attacks
 * Removes HTML tags and encodes special characters
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove HTML tags and encode special characters
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Sanitize text for safe display in HTML context
 * More lenient than sanitizeInput - allows basic formatting
 */
export function sanitizeDisplayText(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }

  // Only encode the most dangerous characters
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .trim();
}

/**
 * Validate URL to prevent javascript: and data: URIs
 */
export function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const trimmedUrl = url.trim().toLowerCase();

  // Block dangerous URL schemes
  const dangerousSchemes = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:',
  ];

  for (const scheme of dangerousSchemes) {
    if (trimmedUrl.startsWith(scheme)) {
      return false;
    }
  }

  // Only allow http, https, and relative URLs
  if (trimmedUrl.startsWith('http://') ||
      trimmedUrl.startsWith('https://') ||
      trimmedUrl.startsWith('/') ||
      trimmedUrl.startsWith('./') ||
      trimmedUrl.startsWith('../')) {
    return true;
  }

  return false;
}

/**
 * Escape special characters for safe use in regex
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate and sanitize object for database storage
 * Recursively sanitizes all string values
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'string' ? sanitizeInput(item) : item
      );
    } else if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Check for potentially dangerous patterns in user input
 */
export function containsDangerousPatterns(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }

  const dangerousPatterns = [
    /<script[^>]*>/i,
    /<iframe[^>]*>/i,
    /<object[^>]*>/i,
    /<embed[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /eval\s*\(/i,
    /expression\s*\(/i,
  ];

  return dangerousPatterns.some(pattern => pattern.test(input));
}

/**
 * Validate input length
 */
export function validateLength(
  input: string,
  min: number,
  max: number
): { valid: boolean; error?: string } {
  if (typeof input !== 'string') {
    return { valid: false, error: 'Input must be a string' };
  }

  const length = input.trim().length;

  if (length < min) {
    return {
      valid: false,
      error: `Input must be at least ${min} characters`,
    };
  }

  if (length > max) {
    return {
      valid: false,
      error: `Input must be less than ${max} characters`,
    };
  }

  return { valid: true };
}

/**
 * Create a Content Security Policy meta tag
 * Should be added to the HTML head
 */
export function getCSPMetaContent(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://*.lovable.dev",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.lovable.dev",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}
