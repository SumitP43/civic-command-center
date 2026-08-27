import { z } from 'zod';

/**
 * Strict schema for Gemini AI Complaint Analysis response.
 * All AI output MUST pass through this validation before any DB operations.
 */
export const aiAnalysisRawResponseSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().min(1, 'Subcategory is required'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  recommendedDepartment: z.string().min(1, 'Recommended department is required'),
  confidence: z
    .number()
    .min(0, 'Confidence must be >= 0')
    .max(1, 'Confidence must be <= 1'),
  summary: z.string().min(1, 'Summary is required').max(500),
  risk: z.string().min(1, 'Primary risk is required'),
  reasoning: z.string().min(1, 'Reasoning is required'),
  riskFactors: z.array(z.string()).default([]),
  languageDetected: z.string().optional().default('en'),
  translatedText: z.string().optional(),
});

export type AiAnalysisRawResponse = z.infer<typeof aiAnalysisRawResponseSchema>;

/**
 * Validated & Normalized AI Analysis Result with backend deterministic calculations.
 */
export const aiAnalysisSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().min(1, 'Subcategory is required'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  priorityScore: z
    .number()
    .min(0, 'Priority score must be >= 0')
    .max(100, 'Priority score must be <= 100'),
  priorityLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  recommendedDepartment: z.string().nullable(),
  confidence: z
    .number()
    .min(0, 'Confidence must be >= 0')
    .max(1, 'Confidence must be <= 1'),
  summary: z.string().min(1, 'Summary is required').max(500),
  risk: z.string().min(1, 'Primary risk is required'),
  reasoning: z.string().min(1, 'Reasoning is required'),
  requiresManualReview: z.boolean().default(false),
  riskFactors: z.array(z.string()).default([]),
  languageDetected: z.string().optional().default('en'),
  translatedText: z.string().optional(),
});

export type AiAnalysisResult = z.infer<typeof aiAnalysisSchema>;

// Alias for backward compatibility
export const aiClassificationSchema = aiAnalysisSchema;
export type AiClassificationResult = AiAnalysisResult;

/**
 * Schema for Admin Manual AI Review & Correction
 */
export const manualCorrectionSchema = z.object({
  complaintId: z.string().uuid('Invalid complaint ID'),
  categoryId: z.string().uuid('Invalid category ID').optional(),
  departmentId: z.string().uuid('Invalid department ID').optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  priorityScore: z.number().min(0).max(100).optional(),
  priorityLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
});

export type ManualCorrectionData = z.infer<typeof manualCorrectionSchema>;

/**
 * Schema for AI image analysis response
 */
export const aiImageAnalysisSchema = z.object({
  issueDetected: z.boolean(),
  issueType: z.string().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  description: z.string().optional(),
  additionalNotes: z.string().optional(),
});

export type AiImageAnalysisResult = z.infer<typeof aiImageAnalysisSchema>;

/**
 * Schema for AI insight response
 */
export const aiInsightSchema = z.object({
  insights: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      type: z.enum(['trend', 'alert', 'recommendation', 'anomaly']),
      severity: z.enum(['info', 'warning', 'critical']).default('info'),
      metric: z.string().optional(),
      change: z.number().optional(),
      relatedDepartment: z.string().optional(),
      relatedArea: z.string().optional(),
    })
  ),
});

export type AiInsightResult = z.infer<typeof aiInsightSchema>;

/**
 * Schema for AI assistant response
 */
export const aiAssistantResponseSchema = z.object({
  answer: z.string().min(1, 'Response is required'),
  sources: z
    .array(
      z.object({
        type: z.string(),
        reference: z.string(),
      })
    )
    .optional()
    .default([]),
  confidence: z.number().min(0).max(1).optional().default(0.8),
  suggestedActions: z.array(z.string()).optional().default([]),
});

export type AiAssistantResponse = z.infer<typeof aiAssistantResponseSchema>;
