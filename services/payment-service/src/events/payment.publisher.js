import { createLogger } from '@ecommerce/logger';
import { EVENT_EXCHANGES, ROUTING_KEYS } from '@ecommerce/event-contracts';
import rabbitmqManager from '../config/rabbitmq.js';
import env from '../config/env.js';

const logger = createLogger('payment-service', { logLevel: env.LOG_LEVEL });

/**
 * Publishes a `payment.completed` domain event to the payment topic exchange.
 * Advances the distributed Saga in `order-service` to transition the order to `CONFIRMED`.
 *
 * @param {Object} payment - Payment aggregate or details.
 * @param {string} [payment.id] - Payment UUID.
 * @param {string} [payment.orderId] - Order UUID in camelCase.
 * @param {string} [payment.order_id] - Order UUID in snake_case.
 * @param {string} [payment.userId] - Customer ID in camelCase.
 * @param {string} [payment.user_id] - Customer ID in snake_case.
 * @param {number} payment.amount - Payment total amount.
 * @param {string} [payment.currency='USD'] - ISO currency code.
 * @param {string} [payment.transactionId] - External gateway transaction ID.
 * @param {string} [payment.transaction_id] - Snake_case external gateway transaction ID.
 * @returns {boolean} True if the message was enqueued to the broker socket buffer.
 */
export function publishPaymentCompleted(payment) {
  const channel = rabbitmqManager.getChannel();

  const payload = {
    paymentId: payment.id,
    orderId: payment.orderId ?? payment.order_id,
    userId: payment.userId ?? payment.user_id,
    amount: payment.amount,
    currency: payment.currency || 'USD',
    transactionId: payment.transactionId ?? payment.transaction_id ?? null,
    completedAt: new Date().toISOString(),
  };

  const buffer = Buffer.from(JSON.stringify(payload));
  const published = channel.publish(
    EVENT_EXCHANGES.PAYMENT,
    ROUTING_KEYS.PAYMENT_COMPLETED,
    buffer,
    {
      persistent: true,
      contentType: 'application/json',
    }
  );

  logger.info('Published payment.completed event', {
    paymentId: payload.paymentId,
    orderId: payload.orderId,
    userId: payload.userId,
    exchange: EVENT_EXCHANGES.PAYMENT,
    routingKey: ROUTING_KEYS.PAYMENT_COMPLETED,
  });

  return published;
}

/**
 * Publishes a `payment.failed` domain event to the payment topic exchange.
 * Triggers compensating rollback transactions in `order-service` to cancel the order and release inventory.
 *
 * @param {Object} payment - Payment aggregate or identifier details.
 * @param {string} [payment.id] - Payment UUID.
 * @param {string} [payment.orderId] - Order UUID in camelCase.
 * @param {string} [payment.order_id] - Order UUID in snake_case.
 * @param {string} [payment.userId] - Customer ID in camelCase.
 * @param {string} [payment.user_id] - Customer ID in snake_case.
 * @param {number} [payment.amount] - Transaction amount.
 * @param {string} [payment.currency='USD'] - ISO currency code.
 * @param {string} [reason='Payment processing failed'] - Detailed explanation for payment failure.
 * @returns {boolean} True if the message was enqueued to the broker socket buffer.
 */
export function publishPaymentFailed(payment, reason = 'Payment processing failed') {
  const channel = rabbitmqManager.getChannel();

  const payload = {
    paymentId: payment.id,
    orderId: payment.orderId ?? payment.order_id,
    userId: payment.userId ?? payment.user_id,
    amount: payment.amount,
    currency: payment.currency || 'USD',
    reason,
    failedAt: new Date().toISOString(),
  };

  const buffer = Buffer.from(JSON.stringify(payload));
  const published = channel.publish(
    EVENT_EXCHANGES.PAYMENT,
    ROUTING_KEYS.PAYMENT_FAILED,
    buffer,
    {
      persistent: true,
      contentType: 'application/json',
    }
  );

  logger.warn('Published payment.failed event', {
    paymentId: payload.paymentId,
    orderId: payload.orderId,
    userId: payload.userId,
    reason,
    exchange: EVENT_EXCHANGES.PAYMENT,
    routingKey: ROUTING_KEYS.PAYMENT_FAILED,
  });

  return published;
}

export default {
  publishPaymentCompleted,
  publishPaymentFailed,
};
