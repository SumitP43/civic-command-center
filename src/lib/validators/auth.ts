import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    full_name: z
      .string()
      .min(1, 'Full name is required')
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be less than 100 characters'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    phone: z
      .string()
      .optional()
      .refine(
        (val) => !val || /^(\+91)?[6-9]\d{9}$/.test(val.replace(/\s/g, '')),
        'Please enter a valid Indian phone number'
      ),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    address: z.string().optional(),
    city: z.string().optional().default('Noida'),
    pincode: z
      .string()
      .optional()
      .refine(
        (val) => !val || /^\d{6}$/.test(val),
        'Pincode must be 6 digits'
      ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const updateProfileSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^(\+91)?[6-9]\d{9}$/.test(val.replace(/\s/g, '')),
      'Please enter a valid Indian phone number'
    ),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{6}$/.test(val),
      'Pincode must be 6 digits'
    ),
});

export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
