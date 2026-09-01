import mongoose from 'mongoose';
import env from './env.js';

/**
 * TODO 4.1.2: MongoDB / Mongoose Connection Layer
 *
 * Requirements:
 * 1. Establish connection to MongoDB using `env.MONGODB_URI`.
 * 2. Configure connection event listeners ('connected', 'error', 'disconnected').
 * 3. Provide `connectDB()` and `disconnectDB()` helper methods for graceful server shutdown and testing.
 */

/**
 * Connects to MongoDB with connection pooling.
 * @returns {Promise<typeof mongoose>}
 */
export async function connectDB() {
  // TODO: Implement Mongoose connection logic with retry handling
  return mongoose.connect(env.MONGODB_URI);
}

/**
 * Disconnects from MongoDB cleanly.
 * @returns {Promise<void>}
 */
export async function disconnectDB() {
  // TODO: Implement Mongoose disconnection logic
  return mongoose.disconnect();
}

export default {
  connectDB,
  disconnectDB,
};
