import { createLogger } from '@ecommerce/logger';
import { EVENT_EXCHANGES, ROUTING_KEYS } from '@ecommerce/event-contracts';
import rabbitmqManager from '../config/rabbitmq.js';
import paymentRepository from '../repositories/payment.repository.js';
import paymentPublisher from '../events/payment.publisher.js';
import { PAYMENT_STATUS } from '../models/payment.model.js';
import { getDefaultPaymentAdapter } from '../adapters/index.js';
import env from '../config/env.js';

const logger = createLogger('payment-service', { logLevel: env.LOG_LEVEL });

/**
 * Queue dedicated to payment-service for consuming order lifecycle events.
 * @type {string}
 */
export const ORDER_EVENT_QUEUE = 'payment-service.order-events';

/**
 * Starts the RabbitMQ consumer listening for order domain events.
 * Listens for `order.created` to process charges via the payment gateway and emit
 * `payment.completed` or `payment.failed` to drive the distributed Saga.
 * Also listens for `order.cancelled` to refund payments when necessary.
 *
 * @returns {Promise<{ consumerTag: string }>} Consumer registration metadata.
 */
export async function startOrderConsumer() {
  const channel = rabbitmqManager.getChannel();

  // 1. Assert durable queue
  await channel.assertQueue(ORDER_EVENT_QUEUE, { durable: true });

  // 2. Bind queue to ORDER topic exchange for created and cancelled events
  await channel.bindQueue(
    ORDER_EVENT_QUEUE,
    EVENT_EXCHANGES.ORDER,
    ROUTING_KEYS.ORDER_CREATED
  );
  await channel.bindQueue(
    ORDER_EVENT_QUEUE,
    EVENT_EXCHANGES.ORDER,
    ROUTING_KEYS.ORDER_CANCELLED
  );

  // 3. Set prefetch limit for balanced consumer workload
  channel.prefetch(10);

  // 4. Register message consumer
  const { consumerTag } = await channel.consume(ORDER_EVENT_QUEUE, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());
      const routingKey = msg.fields.routingKey;

      const orderId = event.orderId || event.id;
      if (!orderId) {
        throw new Error(`Missing orderId in order event payload: ${msg.content.toString()}`);
      }

      logger.info('Received order event in payment consumer', {
        orderId,
        routingKey,
      });

      if (routingKey === ROUTING_KEYS.ORDER_CREATED) {
        const userId = event.userId || event.user_id;
        const rawAmount = event.totalAmount ?? event.total_amount;
        const amount = Number(rawAmount);

        if (!userId || isNaN(amount) || amount <= 0) {
          throw new Error(
            `Invalid order.created payload: missing userId or invalid totalAmount (userId=${userId}, amount=${rawAmount})`
          );
        }

        // Idempotency check: prevent duplicate charges if event was re-delivered
        const existingPayment = await paymentRepository.findPaymentByOrderId(orderId);
        if (existingPayment) {
          logger.warn('Payment for order already exists, skipping duplicate event', {
            orderId,
            paymentId: existingPayment.id,
            status: existingPayment.status,
          });
          channel.ack(msg);
          return;
        }

        // Record initial PENDING payment in PostgreSQL
        const currency = (event.currency || 'USD').toUpperCase();
        const paymentMethod = event.paymentMethod || 'card';

        const payment = await paymentRepository.createPayment({
          orderId,
          userId,
          amount,
          currency,
          paymentMethod,
          status: PAYMENT_STATUS.PENDING,
        });

        const adapter = getDefaultPaymentAdapter();
        try {
          // Charge payment via configured gateway adapter (Stripe / Mock)
          const intent = await adapter.createPaymentIntent({
            amount,
            currency: payment.currency,
            orderId,
            userId,
          });

          const captureResult = await adapter.capturePayment({
            transactionId: intent.transactionId,
            paymentMethod: payment.paymentMethod,
          });

          // Transition payment status to COMPLETED
          const completedPayment = await paymentRepository.updatePaymentStatus(payment.id, {
            status: PAYMENT_STATUS.COMPLETED,
            transactionId: captureResult.transactionId,
          });

          // Publish Saga progression event to payment topic exchange
          paymentPublisher.publishPaymentCompleted(completedPayment);

          logger.info('Order payment processed and completed successfully', {
            orderId,
            paymentId: payment.id,
            transactionId: captureResult.transactionId,
          });
        } catch (gatewayError) {
          logger.error('Gateway charge failed for order payment:', {
            orderId,
            paymentId: payment.id,
            error: gatewayError.message,
          });

          // Transition payment status to FAILED
          const failedPayment = await paymentRepository.updatePaymentStatus(payment.id, {
            status: PAYMENT_STATUS.FAILED,
            errorMessage: gatewayError.message,
          });

          // Publish Saga compensation event to payment topic exchange
          paymentPublisher.publishPaymentFailed(
            failedPayment || { id: payment.id, orderId, userId, amount, currency },
            gatewayError.message
          );
        }
      } else if (routingKey === ROUTING_KEYS.ORDER_CANCELLED) {
        // Compensating action: refund payment if order was cancelled
        const existingPayment = await paymentRepository.findPaymentByOrderId(orderId);
        if (existingPayment && existingPayment.status === PAYMENT_STATUS.COMPLETED) {
          logger.info('Initiating refund for cancelled order', {
            orderId,
            paymentId: existingPayment.id,
          });

          const adapter = getDefaultPaymentAdapter();
          await adapter.refundPayment({
            transactionId: existingPayment.transactionId,
            amount: existingPayment.amount,
            reason: event.reason || 'Order cancelled',
          });

          await paymentRepository.updatePaymentStatus(existingPayment.id, {
            status: PAYMENT_STATUS.REFUNDED,
          });

          logger.info('Refund completed for cancelled order', {
            orderId,
            paymentId: existingPayment.id,
          });
        }
      }

      channel.ack(msg);
    } catch (error) {
      logger.error('Failed to process order event message:', error);
      // Nack message without requeue to prevent poison message loops
      channel.nack(msg, false, false);
    }
  });

  logger.info(`Started Order Event Consumer on queue: ${ORDER_EVENT_QUEUE}`);
  return { consumerTag };
}

export default {
  startOrderConsumer,
  ORDER_EVENT_QUEUE,
};
