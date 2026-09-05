import amqp from 'amqplib';
import { createLogger } from '@ecommerce/logger';
import { EVENT_EXCHANGES } from '@ecommerce/event-contracts';
import env from './env.js';

const logger = createLogger('order-service', { logLevel: env.LOG_LEVEL });

/** @type {import('amqplib').Connection|null} */
let connection = null;

/** @type {import('amqplib').Channel|null} */
let channel = null;

/**
 * Establishes an AMQP connection to RabbitMQ, opens a channel, and asserts
 * all durable topic exchanges required by the event-driven Saga workflow.
 *
 * @returns {Promise<import('amqplib').Channel>} The initialized RabbitMQ channel.
 */
export async function connectRabbitMQ() {
  try {
    connection = await amqp.connect(env.RABBITMQ_URL);

    connection.on('error', (err) => {
      logger.error('RabbitMQ connection error:', err);
    });

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
      connection = null;
      channel = null;
    });

    channel = await connection.createChannel();

    channel.on('error', (err) => {
      logger.error('RabbitMQ channel error:', err);
    });

    channel.on('close', () => {
      logger.warn('RabbitMQ channel closed');
      channel = null;
    });

    // Assert durable topic exchanges defined in event-contracts
    for (const exchange of Object.values(EVENT_EXCHANGES)) {
      await channel.assertExchange(exchange, 'topic', { durable: true });
      logger.debug(`Asserted durable topic exchange: ${exchange}`);
    }

    logger.info('Connected to RabbitMQ and initialized event exchanges');
    return channel;
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ:', error);
    connection = null;
    channel = null;
    throw error;
  }
}

/**
 * Gracefully closes the active RabbitMQ channel and connection.
 *
 * @returns {Promise<void>}
 */
export async function disconnectRabbitMQ() {
  try {
    if (channel) {
      await channel.close().catch((err) => {
        logger.warn('Error closing RabbitMQ channel:', err);
      });
      channel = null;
      logger.info('RabbitMQ channel closed');
    }

    if (connection) {
      await connection.close().catch((err) => {
        logger.warn('Error closing RabbitMQ connection:', err);
      });
      connection = null;
      logger.info('RabbitMQ connection closed');
    }
  } catch (error) {
    logger.error('Error during RabbitMQ disconnect:', error);
    throw error;
  }
}

/**
 * Retrieves the currently active RabbitMQ channel for publishing or consuming.
 *
 * @throws {Error} If RabbitMQ channel has not been initialized via connectRabbitMQ().
 * @returns {import('amqplib').Channel} Active channel.
 */
export function getChannel() {
  if (!channel) {
    throw new Error('RabbitMQ channel is not initialized. Call connectRabbitMQ() first.');
  }
  return channel;
}

/**
 * Retrieves the currently active RabbitMQ connection.
 *
 * @returns {import('amqplib').Connection|null}
 */
export function getConnection() {
  return connection;
}

export default {
  connectRabbitMQ,
  disconnectRabbitMQ,
  getChannel,
  getConnection,
};
