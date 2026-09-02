import mongoose from 'mongoose';
import { createLogger } from '@ecommerce/logger';
import env from './env.js';

const logger = createLogger('product-service', { logLevel: env.LOG_LEVEL });

/**
 * Connects to MongoDB with connection pooling and event listeners.
 *
 * @param {string} [uri] - Optional custom connection string (defaults to env.MONGODB_URI).
 * @param {import('mongoose').ConnectOptions} [options] - Optional Mongoose connection options.
 * @returns {Promise<typeof mongoose>} Resolved Mongoose instance.
 */
export async function connectDB(uri = env.MONGODB_URI, options = {}) {
  // Bind connection event listeners once
  if (mongoose.connection.listenerCount('connected') === 0) {
    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connection established successfully');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection lost / disconnected');
    });
  }

  const defaultOptions = {
    serverSelectionTimeoutMS: 5000,
    ...options,
  };

  return mongoose.connect(uri, defaultOptions);
}

/**
 * Disconnects cleanly from MongoDB.
 *
 * @returns {Promise<void>}
 */
export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB connection closed cleanly');
  }
}

export default {
  connectDB,
  disconnectDB,
};
