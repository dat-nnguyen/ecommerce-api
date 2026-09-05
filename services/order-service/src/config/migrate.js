import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '@ecommerce/logger';
import env from './env.js';
import dbManager from './db.js';

const logger = createLogger('order-service', { logLevel: env.LOG_LEVEL });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Runs database migrations for order-service.
 * Reads and executes SQL migration files in transactional blocks.
 *
 * @returns {Promise<void>}
 */
export async function runMigrations() {
  const migrationsDir = path.resolve(__dirname, '../../migrations');
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (migrationFiles.length === 0) {
    logger.warn('No migration files found in migrations directory');
    return;
  }

  logger.info(`Found ${migrationFiles.length} migration file(s) to apply`);

  const client = await dbManager.getClient();

  try {
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      logger.info(`Applying migration: ${file}`);
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      logger.info(`Successfully applied migration: ${file}`);
    }

    logger.info('All database migrations completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Database migration failed, rolled back changes:', error);
    throw error;
  } finally {
    client.release();
    await dbManager.disconnectDB();
  }
}

// Execute directly if run as a CLI script
if (process.argv[1] === __filename) {
  runMigrations()
    .then(() => {
      logger.info('Migration process finished cleanly');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Migration process exited with failure:', err);
      process.exit(1);
    });
}

export default runMigrations;
