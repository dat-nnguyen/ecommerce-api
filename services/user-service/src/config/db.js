import { PrismaClient } from '@prisma/client';
import env from './env.js';

/**
 * Singleton instance of PrismaClient for user-service database operations.
 * Configured with environment-specific logging levels.
 *
 * @type {PrismaClient}
 */
const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export default prisma;
