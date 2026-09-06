import { app, logger } from './app.js';
import env from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { connectRabbitMQ, disconnectRabbitMQ } from './config/rabbitmq.js';
import { startPaymentConsumer } from './consumers/payment.consumer.js';
import { startInventoryConsumer } from './consumers/inventory.consumer.js';

let server;

/**
 * Initializes database connection, message queues, saga event consumers,
 * and starts the Express HTTP server listener.
 *
 * @returns {Promise<import('http').Server>} The running HTTP server instance.
 */
async function startServer() {
  try {
    // 1. Connect to PostgreSQL database pool
    await connectDB();
    logger.info('PostgreSQL database connected');

    // 2. Connect to RabbitMQ message broker & initialize channel
    await connectRabbitMQ();
    logger.info('RabbitMQ connection established');

    // 3. Register and start background saga consumers
    await startPaymentConsumer();
    logger.info('Payment saga consumer initialized and listening');

    await startInventoryConsumer();
    logger.info('Inventory saga consumer initialized and listening');

    // 4. Start HTTP server
    server = app.listen(env.PORT, () => {
      logger.info(`Order Service listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });

    return server;
  } catch (error) {
    logger.error('Failed to start Order Service:', error);
    process.exit(1);
  }
}

/**
 * Gracefully shuts down the HTTP server, message queue channels, and database pool.
 *
 * @param {string} signal - The termination signal received (e.g. SIGTERM, SIGINT).
 * @returns {Promise<void>}
 */
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed. Cleaning up background resources...');
      try {
        await disconnectRabbitMQ();
        logger.info('RabbitMQ connection closed cleanly');

        await disconnectDB();
        logger.info('PostgreSQL connection pool drained cleanly');

        process.exit(0);
      } catch (err) {
        logger.error('Error during graceful shutdown cleanup:', err);
        process.exit(1);
      }
    });

    // Fallback force shutdown timeout (10 seconds)
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout waiting for resources to drain.');
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

export { startServer, gracefulShutdown, server };
export default server;
