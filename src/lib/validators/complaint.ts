import { z } from 'zod';

export const complaintSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .min(10, 'Title must be at least 10 characters')
    .max(200, 'Title must be less than 200 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .min(20, 'Description must be at least 20 characters')
    .max(5000, 'Description must be less than 5000 characters'),
  address: z
    .string()
    .min(1, 'Address is required')
    .max(500, 'Address must be less than 500 characters'),
  landmark: z.string().max(200, 'Landmark must be less than 200 characters').optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  affected_count: z.number().min(1).max(10000).default(1),
});

export type ComplaintFormData = z.infer<typeof complaintSchema>;

export const complaintUpdateSchema = z.object({
  complaint_id: z.string().uuid('Invalid complaint ID'),
  new_status: z.enum([
    'SUBMITTED',
    'AI_ANALYZED',
    'ASSIGNED',
    'ACCEPTED',
    'IN_PROGRESS',
    'RESOLVED',
    'CITIZEN_VERIFICATION',
    'CLOSED',
    'REOPENED',
  ]),
  notes: z
    .string()
    .max(2000, 'Notes must be less than 2000 characters')
    .optional(),
  is_internal: z.boolean().default(false),
});

export type ComplaintUpdateFormData = z.infer<typeof complaintUpdateSchema>;

export const complaintAssignmentSchema = z.object({
  complaint_id: z.string().uuid('Invalid complaint ID'),
  officer_id: z.string().uuid('Invalid officer ID'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

export type ComplaintAssignmentFormData = z.infer<typeof complaintAssignmentSchema>;

export const feedbackSchema = z.object({
  complaint_id: z.string().uuid('Invalid complaint ID'),
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().max(1000, 'Comment must be less than 1000 characters').optional(),
  is_resolution_accepted: z.boolean(),
});

export type FeedbackFormData = z.infer<typeof feedbackSchema>;

export const complaintFilterSchema = z.object({
  status: z.enum([
    'SUBMITTED', 'AI_ANALYZED', 'ASSIGNED', 'ACCEPTED',
    'IN_PROGRESS', 'RESOLVED', 'CITIZEN_VERIFICATION', 'CLOSED', 'REOPENED',
  ]).optional(),
  priority_level: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  department_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
  search: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  sla_breached: z.boolean().optional(),
  page: z.number().min(1).default(1),
  page_size: z.number().min(1).max(100).default(20),
  sort_by: z.enum(['created_at', 'priority_score', 'updated_at', 'sla_deadline']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export type ComplaintFilterData = z.infer<typeof complaintFilterSchema>;
