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
 * Zod validation schema for Payment Service environment variables.
 * Enforces strict types, defaults, and fail-fast validation.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive('PORT must be a positive integer').default(3005),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  RABBITMQ_URL: z
    .string()
    .min(1, 'RABBITMQ_URL is required')
    .default('amqp://guest:guest@localhost:5672'),
  STRIPE_SECRET_KEY: z
    .string()
    .min(1, 'STRIPE_SECRET_KEY is required')
    .default('sk_test_placeholder'),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .min(1, 'STRIPE_WEBHOOK_SECRET is required')
    .default('whsec_placeholder'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ [payment-service] Invalid environment variables:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

/**
 * Validated, typed, immutable application configuration for Payment Service.
 * @type {Readonly<z.infer<typeof envSchema> & { isDevelopment: boolean, isProduction: boolean, isTest: boolean }>}
 */
export const env = Object.freeze({
  ...parsed.data,
  isDevelopment: parsed.data.NODE_ENV === 'development',
  isProduction: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
});

export default env;
