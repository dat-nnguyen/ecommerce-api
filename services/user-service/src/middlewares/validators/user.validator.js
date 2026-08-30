import { z } from 'zod';

/**
 * Strong password schema for password changes.
 */
const strongPasswordSchema = z
  .string({ required_error: 'New password is required' })
  .min(8, 'New password must be at least 8 characters long')
  .regex(/[A-Z]/, 'New password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'New password must contain at least one lowercase letter')
  .regex(/\d/, 'New password must contain at least one number')
  .regex(/[^\w\s]/, 'New password must contain at least one special character');

/**
 * UUID validation helper for route parameters.
 */
export const userIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user UUID format'),
  }),
});

/**
 * Validation schema for updating user profile (PATCH /api/v1/users/profile).
 */
export const updateProfileSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(2, 'Name must be at least 2 characters long')
        .max(100, 'Name cannot exceed 100 characters')
        .optional(),
      email: z.string().trim().toLowerCase().email('Invalid email address format').optional(),
    })
    .refine((data) => data.name !== undefined || data.email !== undefined, {
      message: 'At least one field (name or email) must be provided for update',
    }),
});

/**
 * Validation schema for changing password (PUT /api/v1/users/change-password).
 */
export const changePasswordSchema = z.object({
  body: z
    .object({
      currentPassword: z
        .string({ required_error: 'Current password is required' })
        .min(1, 'Current password cannot be empty'),
      newPassword: strongPasswordSchema,
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
      message: 'New password must be different from current password',
      path: ['newPassword'],
    }),
});

export default {
  userIdParamSchema,
  updateProfileSchema,
  changePasswordSchema,
};
