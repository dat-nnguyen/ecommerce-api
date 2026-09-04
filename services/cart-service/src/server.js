import { app, logger } from './app.js';
import env from './config/env.js';
import { connectRedis, disconnectRedis } from './config/redis.js';

let server;

/**
 * Starts the Cart Service HTTP server and connects to Redis.
 */
async function startServer() {
  try {
    // Connect to Redis database
    await connectRedis();
    logger.info('Connected to Redis database');

    server = app.listen(env.PORT, () => {
      logger.info(`Cart Service listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error('Failed to start Cart Service:', error);
    process.exit(1);
  }
}

/**
 * Gracefully shuts down the HTTP server and disconnects from Redis.
 *
 * @param {string} signal - The termination signal received.
 */
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');
      try {
        await disconnectRedis();
        logger.info('Redis connection closed.');
        process.exit(0);
      } catch (err) {
        logger.error('Error during Redis disconnect:', err);
        process.exit(1);
      }
    });

    // Fallback force shutdown timeout
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout.');
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', reason);
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { server };
export default server;
