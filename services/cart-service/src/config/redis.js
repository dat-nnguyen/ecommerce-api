import Redis from 'ioredis';
import { createLogger } from '@ecommerce/logger';
import env from './env.js';

const logger = createLogger('cart-service', { logLevel: env.LOG_LEVEL });

/**
 * Singleton Redis client instance.
 * @type {import('ioredis').Redis | null}
 */
let redisClient = null;

/**
 * Creates and configures a new ioredis client instance.
 *
 * @param {string} [customUri] - Optional Redis URI override.
 * @param {import('ioredis').RedisOptions} [customOptions] - Optional connection options.
 * @returns {import('ioredis').Redis} Configured ioredis instance.
 */
export function createRedisClient(customUri, customOptions = {}) {
  const uri = customUri || env.REDIS_URI;

  const defaultOptions = {
    lazyConnect: true,
    retryStrategy: (times) => Math.min(times * 100, 3000),
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    ...customOptions,
  };

  const client = new Redis(uri, defaultOptions);

  client.on('connect', () => {
    logger.info('Connecting to Redis server...');
  });

  client.on('ready', () => {
    logger.info('Redis connection established and ready to process commands');
  });

  client.on('error', (err) => {
    logger.error('Redis connection error:', err);
  });

  client.on('close', () => {
    logger.warn('Redis connection closed');
  });

  client.on('reconnecting', (delay) => {
    logger.info(`Reconnecting to Redis in ${delay}ms...`);
  });

  return client;
}

/**
 * Connects the singleton Redis client instance to the database.
 *
 * @param {string} [customUri] - Optional Redis URI override.
 * @param {import('ioredis').RedisOptions} [customOptions] - Optional connection options.
 * @returns {Promise<import('ioredis').Redis>} Connected Redis client instance.
 */
export async function connectRedis(customUri, customOptions = {}) {
  if (!redisClient) {
    redisClient = createRedisClient(customUri, customOptions);
  }

  if (redisClient.status === 'wait') {
    await redisClient.connect();
  }

  return redisClient;
}

/**
 * Retrieves the current singleton Redis client, instantiating it if not yet created.
 *
 * @returns {import('ioredis').Redis} Active Redis client instance.
 */
export function getRedisClient() {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
}

/**
 * Gracefully disconnects the singleton Redis client, waiting for pending commands to finish.
 *
 * @returns {Promise<void>}
 */
export async function disconnectRedis() {
  if (redisClient && redisClient.status !== 'end') {
    try {
      await redisClient.quit();
      logger.info('Redis connection closed cleanly via QUIT');
    } catch (err) {
      logger.error('Error during Redis quit, forcing disconnect:', err);
      redisClient.disconnect();
    } finally {
      redisClient = null;
    }
  }
}

export default {
  createRedisClient,
  connectRedis,
  getRedisClient,
  disconnectRedis,
};
