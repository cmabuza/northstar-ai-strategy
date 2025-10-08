import { z } from 'zod';

// Strategy validation
export const strategySchema = z.object({
  okr: z.string()
    .trim()
    .min(10, "OKR must be at least 10 characters")
    .max(2000, "OKR must be less than 2000 characters"),
  softwareContext: z.string()
    .trim()
    .max(1000, "Software context must be less than 1000 characters")
    .optional(),
});

export type StrategyInput = z.infer<typeof strategySchema>;

// Feature validation
export const featureSchema = z.object({
  title: z.string()
    .trim()
    .min(3, "Feature title must be at least 3 characters")
    .max(200, "Feature title must be less than 200 characters"),
  description: z.string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must be less than 1000 characters"),
  impact: z.string()
    .trim()
    .max(500, "Impact must be less than 500 characters")
    .optional(),
  effort: z.string()
    .trim()
    .max(500, "Effort must be less than 500 characters")
    .optional(),
});

// KPI validation
export const kpiSchema = z.object({
  name: z.string()
    .trim()
    .min(3, "KPI name must be at least 3 characters")
    .max(200, "KPI name must be less than 200 characters"),
  description: z.string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must be less than 1000 characters"),
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