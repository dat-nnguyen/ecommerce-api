import { createLogger } from '@ecommerce/logger';
import { EVENT_EXCHANGES, ROUTING_KEYS } from '@ecommerce/event-contracts';
import rabbitmqManager from '../config/rabbitmq.js';
import orderRepository from '../repositories/order.repository.js';
import orderPublisher from '../events/order.publisher.js';
import { ORDER_STATUS } from '../models/order.model.js';
import env from '../config/env.js';

const logger = createLogger('order-service', { logLevel: env.LOG_LEVEL });

/**
 * Queue dedicated to order-service for consuming inventory reservation events.
 * @type {string}
 */
export const INVENTORY_QUEUE = 'order-service.inventory-events';

/**
 * Starts the RabbitMQ consumer listening for inventory reservation lifecycle events.
 * Advances the Saga state machine (inventory reserved -> PAYMENT_PENDING; inventory failed -> CANCELLED & compensation).
 *
 * @returns {Promise<{ consumerTag: string }>} Consumer registration metadata.
 */
export async function startInventoryConsumer() {
  const channel = rabbitmqManager.getChannel();

  // 1. Assert durable queue
  await channel.assertQueue(INVENTORY_QUEUE, { durable: true });

  // 2. Bind queue to INVENTORY exchange for both reserved and failed keys
  await channel.bindQueue(
    INVENTORY_QUEUE,
    EVENT_EXCHANGES.INVENTORY,
    ROUTING_KEYS.INVENTORY_RESERVED
  );
  await channel.bindQueue(
    INVENTORY_QUEUE,
    EVENT_EXCHANGES.INVENTORY,
    ROUTING_KEYS.INVENTORY_FAILED
  );

  // 3. Consume messages
  const { consumerTag } = await channel.consume(INVENTORY_QUEUE, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());
      const routingKey = msg.fields.routingKey;

      if (!event.orderId) {
        throw new Error(`Missing orderId in inventory event payload: ${msg.content.toString()}`);
      }

      logger.info('Received inventory event', {
        orderId: event.orderId,
        routingKey,
      });

      if (routingKey === ROUTING_KEYS.INVENTORY_RESERVED) {
        await orderRepository.updateOrderStatus(event.orderId, ORDER_STATUS.PAYMENT_PENDING);
        logger.info('Order transitioned to PAYMENT_PENDING following stock reservation', {
          orderId: event.orderId,
        });
      } else if (routingKey === ROUTING_KEYS.INVENTORY_FAILED) {
        const updatedOrder = await orderRepository.updateOrderStatus(
          event.orderId,
          ORDER_STATUS.CANCELLED
        );
        logger.warn('Order transitioned to CANCELLED following inventory failure', {
          orderId: event.orderId,
          reason: event.reason || 'Inventory reservation failed',
        });

        // Trigger compensation for downstream services
        if (updatedOrder) {
          orderPublisher.publishOrderCancelled(
            updatedOrder,
            event.reason || 'Inventory reservation failed'
          );
        }
      }

      channel.ack(msg);
    } catch (error) {
      logger.error('Failed to process inventory event message:', error);
      // Nack message without requeue to avoid poison message loops
      channel.nack(msg, false, false);
    }
  });

  logger.info(`Started Inventory Event Consumer on queue: ${INVENTORY_QUEUE}`);
  return { consumerTag };
}

export default {
  startInventoryConsumer,
  INVENTORY_QUEUE,
};
