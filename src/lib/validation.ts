import { z } from 'zod';
import { containsDangerousPatterns } from './security';

// Custom validator to check for XSS and dangerous patterns
const safeString = z.string().refine(
  (val) => !containsDangerousPatterns(val),
  { message: "Input contains potentially dangerous content" }
);

// Custom validator to check for SQL injection patterns
const sqlSafeString = z.string().refine(
  (val) => !containsSQLInjectionPatterns(val),
  { message: "Input contains potentially dangerous SQL patterns" }
);

/**
 * Check for SQL injection patterns
 * Note: This is an additional layer - Supabase already protects via parameterized queries
 */
function containsSQLInjectionPatterns(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }

  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/i,
    /(--|;|\/\*|\*\/)/,
    /(\bOR\b.*=.*)/i,
    /('.*OR.*'.*=.*')/i,
    /(\bAND\b.*=.*)/i,
    /(xp_|sp_)/i,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

// Strategy validation with security checks
export const strategySchema = z.object({
  okr: z.string()
    .trim()
    .min(10, "OKR must be at least 10 characters")
    .max(2000, "OKR must be less than 2000 characters")
    .pipe(safeString)
    .pipe(sqlSafeString),
  softwareContext: z.string()
    .trim()
    .max(1000, "Software context must be less than 1000 characters")
    .pipe(safeString)
    .pipe(sqlSafeString)
    .optional(),
});

export type StrategyInput = z.infer<typeof strategySchema>;

// Feature validation with security checks
export const featureSchema = z.object({
  title: z.string()
    .trim()
    .min(3, "Feature title must be at least 3 characters")
    .max(200, "Feature title must be less than 200 characters")
    .pipe(safeString)
    .pipe(sqlSafeString),
  description: z.string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must be less than 1000 characters")
    .pipe(safeString)
    .pipe(sqlSafeString),
  impact: z.string()
    .trim()
    .max(500, "Impact must be less than 500 characters")
    .pipe(safeString)
    .optional(),
  effort: z.string()
    .trim()
    .max(500, "Effort must be less than 500 characters")
    .pipe(safeString)
    .optional(),
});

// KPI validation with security checks
export const kpiSchema = z.object({
  name: z.string()
    .trim()
    .min(3, "KPI name must be at least 3 characters")
    .max(200, "KPI name must be less than 200 characters")
    .pipe(safeString)
    .pipe(sqlSafeString),
  description: z.string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must be less than 1000 characters")
    .pipe(safeString)
    .pipe(sqlSafeString),
});

export const validateStrategy = (data: unknown): StrategyInput => {
  return strategySchema.parse(data);
};

export const validateFeature = (data: unknown) => {
  return featureSchema.parse(data);
};

export const validateKPI = (data: unknown) => {
  return kpiSchema.parse(data);
};