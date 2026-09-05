import { createLogger } from '@ecommerce/logger';
import { EVENT_EXCHANGES, ROUTING_KEYS } from '@ecommerce/event-contracts';
import rabbitmqManager from '../config/rabbitmq.js';
import env from '../config/env.js';

const logger = createLogger('order-service', { logLevel: env.LOG_LEVEL });

/**
 * Publishes an `order.created` domain event to the order topic exchange.
 * Triggers downstream saga steps in inventory and payment services.
 *
 * @param {Object} order - Order aggregate object.
 * @param {string} order.id - Unique order UUID.
 * @param {string} [order.user_id] - Snake_case owner ID.
 * @param {string} [order.userId] - CamelCase owner ID.
 * @param {Array<Object>} order.items - List of line items in the order.
 * @param {string|number} [order.total_amount] - Snake_case total price.
 * @param {string|number} [order.totalAmount] - CamelCase total price.
 * @param {string} [order.currency='USD'] - ISO currency code.
 * @param {string|Date} [order.created_at] - Creation timestamp.
 * @param {string|Date} [order.createdAt] - CamelCase creation timestamp.
 * @returns {boolean} True if the message was enqueued to the broker socket buffer.
 */
export function publishOrderCreated(order) {
  const channel = rabbitmqManager.getChannel();

  const totalAmount =
    order.total_amount != null
      ? Number(order.total_amount)
      : order.totalAmount != null
        ? Number(order.totalAmount)
        : 0;

  const payload = {
    orderId: order.id,
    userId: order.user_id ?? order.userId,
    items: order.items || [],
    totalAmount,
    currency: order.currency || 'USD',
    createdAt: order.created_at || order.createdAt || new Date().toISOString(),
  };

  const buffer = Buffer.from(JSON.stringify(payload));
  const published = channel.publish(
    EVENT_EXCHANGES.ORDER,
    ROUTING_KEYS.ORDER_CREATED,
    buffer,
    {
      persistent: true,
      contentType: 'application/json',
    }
  );

  logger.info('Published order.created event', {
    orderId: payload.orderId,
    userId: payload.userId,
    exchange: EVENT_EXCHANGES.ORDER,
    routingKey: ROUTING_KEYS.ORDER_CREATED,
  });

  return published;
}

/**
 * Publishes an `order.cancelled` domain event to the order topic exchange.
 * Triggers compensating actions in downstream services (e.g. inventory restock, payment refund).
 *
 * @param {Object} order - Order aggregate or identifier object.
 * @param {string} order.id - Unique order UUID.
 * @param {string} [order.user_id] - Snake_case owner ID.
 * @param {string} [order.userId] - CamelCase owner ID.
 * @param {string} [reason='Order was cancelled'] - Detailed justification for cancellation.
 * @returns {boolean} True if the message was enqueued to the broker socket buffer.
 */
export function publishOrderCancelled(order, reason = 'Order was cancelled') {
  const channel = rabbitmqManager.getChannel();

  const payload = {
    orderId: order.id,
    userId: order.user_id ?? order.userId,
    reason,
    cancelledAt: new Date().toISOString(),
  };

  const buffer = Buffer.from(JSON.stringify(payload));
  const published = channel.publish(
    EVENT_EXCHANGES.ORDER,
    ROUTING_KEYS.ORDER_CANCELLED,
    buffer,
    {
      persistent: true,
      contentType: 'application/json',
    }
  );

  logger.info('Published order.cancelled event', {
    orderId: payload.orderId,
    userId: payload.userId,
    reason,
    exchange: EVENT_EXCHANGES.ORDER,
    routingKey: ROUTING_KEYS.ORDER_CANCELLED,
  });

  return published;
}

export default {
  publishOrderCreated,
  publishOrderCancelled,
};
