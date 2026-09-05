import { createLogger } from '@ecommerce/logger';
import { EVENT_EXCHANGES, ROUTING_KEYS } from '@ecommerce/event-contracts';
import rabbitmqManager from '../config/rabbitmq.js';
import orderRepository from '../repositories/order.repository.js';
import orderPublisher from '../events/order.publisher.js';
import { ORDER_STATUS } from '../models/order.model.js';
import env from '../config/env.js';

const logger = createLogger('order-service', { logLevel: env.LOG_LEVEL });

/**
 * Queue dedicated to order-service for consuming payment events.
 * @type {string}
 */
export const PAYMENT_QUEUE = 'order-service.payment-events';

/**
 * Starts the RabbitMQ consumer listening for payment lifecycle events.
 * Handles saga state progression (payment success -> CONFIRMED; payment failure -> CANCELLED & compensation).
 *
 * @returns {Promise<{ consumerTag: string }>} Consumer registration metadata.
 */
export async function startPaymentConsumer() {
  const channel = rabbitmqManager.getChannel();

  // 1. Assert durable queue
  await channel.assertQueue(PAYMENT_QUEUE, { durable: true });

  // 2. Bind queue to PAYMENT exchange for both completed and failed routing keys
  await channel.bindQueue(
    PAYMENT_QUEUE,
    EVENT_EXCHANGES.PAYMENT,
    ROUTING_KEYS.PAYMENT_COMPLETED
  );
  await channel.bindQueue(
    PAYMENT_QUEUE,
    EVENT_EXCHANGES.PAYMENT,
    ROUTING_KEYS.PAYMENT_FAILED
  );

  // 3. Consume messages
  const { consumerTag } = await channel.consume(PAYMENT_QUEUE, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());
      const routingKey = msg.fields.routingKey;

      if (!event.orderId) {
        throw new Error(`Missing orderId in payment event payload: ${msg.content.toString()}`);
      }

      logger.info('Received payment event', {
        orderId: event.orderId,
        routingKey,
      });

      if (routingKey === ROUTING_KEYS.PAYMENT_COMPLETED) {
        await orderRepository.updateOrderStatus(event.orderId, ORDER_STATUS.CONFIRMED);
        logger.info('Order transitioned to CONFIRMED following payment completion', {
          orderId: event.orderId,
        });
      } else if (routingKey === ROUTING_KEYS.PAYMENT_FAILED) {
        const updatedOrder = await orderRepository.updateOrderStatus(
          event.orderId,
          ORDER_STATUS.CANCELLED
        );
        logger.warn('Order transitioned to CANCELLED following payment failure', {
          orderId: event.orderId,
          reason: event.reason || 'Payment verification failed',
        });

        // Trigger compensation for downstream services (e.g. inventory release)
        if (updatedOrder) {
          orderPublisher.publishOrderCancelled(
            updatedOrder,
            event.reason || 'Payment verification failed'
          );
        }
      }

      channel.ack(msg);
    } catch (error) {
      logger.error('Failed to process payment event message:', error);
      // Nack message without requeue to prevent poisoning / infinite redelivery
      channel.nack(msg, false, false);
    }
  });

  logger.info(`Started Payment Event Consumer on queue: ${PAYMENT_QUEUE}`);
  return { consumerTag };
}

export default {
  startPaymentConsumer,
  PAYMENT_QUEUE,
};
