import dotenv from 'dotenv';
import { z } from 'zod';

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test', override: true });
} else {
  dotenv.config();
}

/**
 * Zod Schema for User Service environment variables.
 * Enforces strict types, defaults, and fail-fast validation.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ [user-service] Invalid environment variables:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

/**
 * Validated, typed, immutable application configuration.
 */
export const env = Object.freeze(parsed.data);
export default env;
