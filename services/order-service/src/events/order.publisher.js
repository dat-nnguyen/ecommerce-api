/**
 * TODO 6.3.2: Order Event Publisher
 *
 * Requirements:
 * 1. publishOrderCreated(order):
 *    - Publish event payload to exchange 'ecommerce.order.events' with routing key 'order.created'.
 *    - Include orderId, userId, items, totalAmount, currency, createdAt.
 * 2. publishOrderCancelled(order, reason):
 *    - Publish event payload to exchange 'ecommerce.order.events' with routing key 'order.cancelled'.
 *    - Include orderId, userId, reason, cancelledAt.
 */
