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
 * Environment configuration validation schema for Product Service.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive('PORT must be a positive integer').default(3002),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z
    .string()
    .min(1, 'MONGODB_URI cannot be empty')
    .default('mongodb://localhost:27017/ecommerce_products'),
  REDIS_URI: z.string().default('redis://localhost:6379'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ [product-service] Invalid environment variables:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

/**
 * Validated, typed, immutable application configuration for Product Service.
 */
export const env = Object.freeze(parsed.data);
export default env;
