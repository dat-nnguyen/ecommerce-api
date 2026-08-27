import { PrismaClient } from '@prisma/client';

/**
 * Singleton instance of PrismaClient for user-service database operations.
 * Configured with environment-specific logging levels.
 *
 * @type {PrismaClient}
 */
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export default prisma;
