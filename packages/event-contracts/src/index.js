/**
 * Event Contracts Package
 * Event schemas, topics, and payload contract definitions for message broker.
 */

export const EVENT_EXCHANGES = {
  ORDER: 'ecommerce.order.events',
  PAYMENT: 'ecommerce.payment.events',
  INVENTORY: 'ecommerce.inventory.events',
};

export const ROUTING_KEYS = {
  ORDER_CREATED: 'order.created',
  ORDER_CANCELLED: 'order.cancelled',
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',
  INVENTORY_RESERVED: 'inventory.reserved',
  INVENTORY_FAILED: 'inventory.failed',
};

export default {
  EVENT_EXCHANGES,
  ROUTING_KEYS,
};
