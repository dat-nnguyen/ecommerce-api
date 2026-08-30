import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../../src/middlewares/validators/auth.validator.js';

describe('Auth Validation Schemas (Unit Tests)', () => {
  describe('registerSchema', () => {
    it('should validate a valid registration payload', async () => {
      const validPayload = {
        body: {
          email: 'valid.user@example.com',
          password: 'Password123!',
          name: 'John Doe',
          role: 'CUSTOMER',
        },
      };

      const result = await registerSchema.safeParseAsync(validPayload);
      expect(result.success).toBe(true);
      expect(result.data.body.email).toBe('valid.user@example.com');
    });

    it('should reject invalid email format', async () => {
      const invalidPayload = {
        body: {
          email: 'bad-email-format',
          password: 'Password123!',
        },
      };

      const result = await registerSchema.safeParseAsync(invalidPayload);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toBe('Invalid email address format');
    });

    it('should reject passwords shorter than 8 characters or missing required complexity', async () => {
      const shortPasswordPayload = {
        body: {
          email: 'user@example.com',
          password: 'P1!',
        },
      };

      const result = await registerSchema.safeParseAsync(shortPasswordPayload);
      expect(result.success).toBe(false);
      expect(result.error.issues.some((i) => i.message.includes('at least 8 characters'))).toBe(
        true
      );
    });
  });

  describe('loginSchema', () => {
    it('should validate valid login credentials', async () => {
      const validPayload = {
        body: {
          email: 'user@example.com',
          password: 'anyPassword123',
        },
      };

      const result = await loginSchema.safeParseAsync(validPayload);
      expect(result.success).toBe(true);
    });

    it('should reject missing email or password', async () => {
      const result = await loginSchema.safeParseAsync({ body: {} });
      expect(result.success).toBe(false);
      expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('refreshTokenSchema', () => {
    it('should validate valid refresh token payload', async () => {
      const validPayload = {
        body: {
          refreshToken: 'valid_opaque_refresh_token_string',
        },
      };

      const result = await refreshTokenSchema.safeParseAsync(validPayload);
      expect(result.success).toBe(true);
    });

    it('should reject empty refresh token', async () => {
      const invalidPayload = {
        body: {
          refreshToken: '',
        },
      };

      const result = await refreshTokenSchema.safeParseAsync(invalidPayload);
      expect(result.success).toBe(false);
    });
  });
});
