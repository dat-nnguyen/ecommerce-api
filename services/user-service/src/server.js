import app, { logger } from './app.js';
import env from './config/env.js';
import prisma from './config/db.js';

/**
 * Start HTTP Server Listener
 */
const server = app.listen(env.PORT, () => {
  logger.info(`🚀 [user-service] started in ${env.NODE_ENV} mode on port ${env.PORT}`);
});

/**
 * Flag to prevent concurrent shutdown executions.
 */
let isShuttingDown = false;

/**
 * Handles graceful shutdown of HTTP server and database connections.
 * @param {string} signal - The signal or event that initiated the shutdown.
 */
export async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  logger.info(`Received ${signal}. Initiating graceful shutdown...`);

  // Force exit if cleanup takes longer than 10 seconds
  const forceExitTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out. Forcing process exit.');
    process.exit(1);
  }, 10000);

  // Prevent timeout from holding the process open if everything finishes cleanly
  forceExitTimer.unref();

  try {
    // 1. Stop accepting new HTTP requests
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) return reject(err);
        logger.info('HTTP server closed cleanly.');
        resolve();
      });
    });

    // 2. Disconnect database connection pool
    await prisma.$disconnect();
    logger.info('Database connection pool disconnected.');

    logger.info('Graceful shutdown completed. Exiting.');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// ----------------------------------------------------
// Process Termination Signals
// ----------------------------------------------------
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ----------------------------------------------------
// Unhandled Exceptions & Rejections
// ----------------------------------------------------
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

export default server;
