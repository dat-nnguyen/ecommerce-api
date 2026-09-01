import { app, logger } from './app.js';
import env from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

let server;

/**
 * Starts the Product Service HTTP server and connects to MongoDB.
 */
async function startServer() {
  try {
    // Connect to database
    await connectDB();
    logger.info('Connected to MongoDB database');

    server = app.listen(env.PORT, () => {
      logger.info(`Product Service listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error('Failed to start Product Service:', error);
    process.exit(1);
  }
}

/**
 * Gracefully shuts down the HTTP server and disconnects from MongoDB.
 *
 * @param {string} signal - The termination signal received.
 */
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');
      try {
        await disconnectDB();
        logger.info('MongoDB connection closed.');
        process.exit(0);
      } catch (err) {
        logger.error('Error during database disconnect:', err);
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
