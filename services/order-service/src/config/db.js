import pkg from 'pg';
const { Pool } = pkg;
import { createLogger } from '@ecommerce/logger';
import env from './env.js';

const logger = createLogger('order-service', { logLevel: env.LOG_LEVEL });

/**
 * PostgreSQL connection pool instance.
 * @type {import('pg').Pool}
 */
let pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  logger.info('New client connected to PostgreSQL pool');
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client:', err);
});

/**
 * Executes a single SQL query against the PostgreSQL pool.
 *
 * @param {string} text - SQL query string.
 * @param {Array<any>} [params] - Optional parameterized query values.
 * @returns {Promise<import('pg').QueryResult>} Query result.
 */
export async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;

  logger.debug('Query executed', {
    query: text,
    params,
    duration,
    rows: res.rowCount,
  });

  return res;
}

/**
 * Acquires a dedicated PostgreSQL client from the pool for multi-statement transactions.
 * NOTE: Callers must invoke `client.release()` in a finally block when finished.
 *
 * @returns {Promise<import('pg').PoolClient>} Dedicated pool client.
 */
export async function getClient() {
  const client = await pool.connect();
  logger.debug('Dedicated PostgreSQL client acquired from pool');
  return client;
}

/**
 * Verifies database connectivity by acquiring a client and executing a test query.
 *
 * @returns {Promise<import('pg').Pool>} Active connection pool.
 */
export async function connectDB() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    logger.info('Connected to PostgreSQL database successfully');
    return pool;
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL database:', error);
    throw error;
  }
}

/**
 * Drains and closes all active clients in the connection pool during shutdown.
 *
 * @returns {Promise<void>}
 */
export async function disconnectDB() {
  try {
    if (pool) {
      await pool.end();
      logger.info('PostgreSQL connection pool closed cleanly');
    }
  } catch (error) {
    logger.error('Error during PostgreSQL pool disconnect:', error);
    throw error;
  }
}

/**
 * Retrieves the raw underlying PostgreSQL Pool instance.
 *
 * @returns {import('pg').Pool}
 */
export function getPool() {
  return pool;
}

export default {
  query,
  getClient,
  connectDB,
  disconnectDB,
  getPool,
};
