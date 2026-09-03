import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
const serviceEnvPath = path.resolve(__dirname, '../../', envFile);

// Load service-level env file followed by root fallback
dotenv.config({ path: serviceEnvPath });
dotenv.config();

/**
 * Zod validation schema for Cart Service environment variables.
 * Enforces strict types, defaults, and fail-fast validation.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive('PORT must be a positive integer').default(3003),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_URI: z.string().min(1, 'REDIS_URI cannot be empty').default('redis://localhost:6379'),
  CART_TTL_SECONDS: z.preprocess(
    (val) => (typeof val === 'string' ? val.split('#')[0].trim() : val),
    z.coerce.number().int().positive('CART_TTL_SECONDS must be a positive integer').default(604800)
  ),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ [cart-service] Invalid environment variables:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

/**
 * Validated, typed, immutable application configuration for Cart Service.
 */
export const env = Object.freeze(parsed.data);
export default env;
