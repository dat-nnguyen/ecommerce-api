import {
  userIdParamSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '../../src/middlewares/validators/user.validator.js';

describe('User Validation Schemas (Unit Tests)', () => {
  describe('userIdParamSchema', () => {
    it('should validate valid UUID route parameters', async () => {
      const validPayload = {
        params: {
          id: '550e8400-e29b-41d4-a716-446655440000',
        },
      };

      const result = await userIdParamSchema.safeParseAsync(validPayload);
      expect(result.success).toBe(true);
    });

    it('should reject non-UUID route parameters', async () => {
      const invalidPayload = {
        params: {
          id: 'not-a-uuid-123',
        },
      };

      const result = await userIdParamSchema.safeParseAsync(invalidPayload);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toBe('Invalid user UUID format');
    });
  });

  describe('updateProfileSchema', () => {
    it('should validate update with name and/or email', async () => {
      const validPayload = {
        body: {
          name: 'Jane Doe',
          email: 'jane@example.com',
        },
      };

      const result = await updateProfileSchema.safeParseAsync(validPayload);
      expect(result.success).toBe(true);
    });

    it('should reject update payload when neither name nor email is provided', async () => {
      const invalidPayload = {
        body: {},
      };

      const result = await updateProfileSchema.safeParseAsync(invalidPayload);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((i) =>
          i.message.includes('At least one field (name or email) must be provided')
        )
      ).toBe(true);
    });
  });

  describe('changePasswordSchema', () => {
    it('should validate valid password change payload', async () => {
      const validPayload = {
        body: {
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword456@',
        },
      };

      const result = await changePasswordSchema.safeParseAsync(validPayload);
      expect(result.success).toBe(true);
    });

    it('should reject when new password is identical to current password', async () => {
      const invalidPayload = {
        body: {
          currentPassword: 'SamePassword123!',
          newPassword: 'SamePassword123!',
        },
      };

      const result = await changePasswordSchema.safeParseAsync(invalidPayload);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((i) =>
          i.message.includes('New password must be different from current password')
        )
      ).toBe(true);
    });

    it('should reject weak new password', async () => {
      const invalidPayload = {
        body: {
          currentPassword: 'OldPassword123!',
          newPassword: 'short',
        },
      };

      const result = await changePasswordSchema.safeParseAsync(invalidPayload);
      expect(result.success).toBe(false);
    });
  });
});
