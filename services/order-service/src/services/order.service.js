import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '@ecommerce/common-errors';
import orderRepository from '../repositories/order.repository.js';
import orderPublisher from '../events/order.publisher.js';
import { ORDER_STATUS, isValidStatusTransition } from '../models/order.model.js';

/**
 * Creates a new order, calculates totals, persists to PostgreSQL, and publishes the order.created event.
 *
 * @param {Object} params - Order creation parameters.
 * @param {string} params.userId - ID of the user creating the order.
 * @param {Array<Object>} params.items - List of line items.
 * @param {string} params.items[].productId - Unique product ID.
 * @param {string} [params.items[].name] - Product title/name.
 * @param {number} [params.items[].price] - Unit price.
 * @param {number} [params.items[].unitPrice] - Alternative unit price parameter.
 * @param {number} params.items[].quantity - Number of units.
 * @param {string} [params.currency='USD'] - Three-letter ISO currency code.
 * @returns {Promise<Object>} Persisted order with line items.
 */
export async function createOrder({ userId, items, currency = 'USD' }) {
  if (!userId) {
    throw new BadRequestError('User ID is required');
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new BadRequestError('Order must contain at least one item');
  }

  const processedItems = items.map((item, index) => {
    const rawPrice = item.price != null ? item.price : item.unitPrice;
    const price = Number(rawPrice);
    const quantity = parseInt(item.quantity, 10);

    if (isNaN(price) || price < 0) {
      throw new BadRequestError(`Invalid price for item at index ${index}`);
    }
    if (isNaN(quantity) || quantity <= 0) {
      throw new BadRequestError(`Invalid quantity for item at index ${index}. Must be greater than 0`);
    }

    const subtotal = Math.round(price * quantity * 100) / 100;

    return {
      productId: item.productId ?? item.product_id,
      name: item.name || 'Product Item',
      price,
      quantity,
      subtotal,
    };
  });

  const totalAmount = Math.round(
    processedItems.reduce((sum, item) => sum + item.subtotal, 0) * 100
  ) / 100;

  // Persist order and line items within repository transaction
  const order = await orderRepository.createOrder({
    userId,
    items: processedItems,
    totalAmount,
    currency,
  });

  // Publish domain event to RabbitMQ for downstream inventory reservation and payment processing
  orderPublisher.publishOrderCreated(order);

  return order;
}

/**
 * Retrieves an order by its UUID, validating resource ownership.
 *
 * @param {Object} params
 * @param {string} params.orderId - Unique order UUID.
 * @param {string} [params.userId] - Requesting user ID.
 * @param {boolean} [params.isAdmin=false] - Whether the requester has administrator privileges.
 * @returns {Promise<Object>} Order aggregate with nested items.
 */
export async function getOrderById({ orderId, userId, isAdmin = false }) {
  if (!orderId) {
    throw new BadRequestError('Order ID is required');
  }

  const order = await orderRepository.findOrderById(orderId);
  if (!order) {
    throw new NotFoundError(`Order with ID ${orderId} not found`);
  }

  const ownerId = order.user_id ?? order.userId;
  if (!isAdmin && ownerId !== userId) {
    throw new ForbiddenError('You do not have permission to access this order');
  }

  return order;
}

/**
 * Retrieves paginated orders for a user.
 *
 * @param {Object} params
 * @param {string} params.userId - ID of the target user.
 * @param {number} [params.page=1] - 1-based page number.
 * @param {number} [params.limit=10] - Number of orders per page.
 * @param {boolean} [params.isAdmin=false] - Whether the requester has admin rights.
 * @returns {Promise<{ orders: Array<Object>, pagination: Object }>} Paginated orders and metadata.
 */
export async function listOrders({ userId, page = 1, limit = 10, isAdmin = false }) {
  if (!isAdmin && !userId) {
    throw new ForbiddenError('User ID is required for non-admin requests');
  }

  const parsedPage = parseInt(page, 10);
  const parsedLimit = parseInt(limit, 10);

  const options = {
    page: isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage,
    limit: isNaN(parsedLimit) || parsedLimit < 1 ? 10 : parsedLimit,
  };

  return orderRepository.findOrdersByUserId(userId, options);
}

/**
 * Cancels an order, validating lifecycle transition and publishing a compensation event.
 *
 * @param {Object} params
 * @param {string} params.orderId - UUID of the order to cancel.
 * @param {string} params.userId - User initiating the cancellation.
 * @param {boolean} [params.isAdmin=false] - Whether the user is an admin.
 * @param {string} [params.reason='Order was cancelled'] - Cancellation reason.
 * @returns {Promise<Object>} Updated order in CANCELLED status.
 */
export async function cancelOrder({
  orderId,
  userId,
  isAdmin = false,
  reason = 'Order was cancelled',
}) {
  if (!orderId) {
    throw new BadRequestError('Order ID is required');
  }
  if (!userId && !isAdmin) {
    throw new BadRequestError('User ID is required');
  }

  const order = await orderRepository.findOrderById(orderId);
  if (!order) {
    throw new NotFoundError(`Order with ID ${orderId} not found`);
  }

  const ownerId = order.user_id ?? order.userId;
  if (!isAdmin && ownerId !== userId) {
    throw new ForbiddenError('You do not have permission to cancel this order');
  }

  if (!isValidStatusTransition(order.status, ORDER_STATUS.CANCELLED)) {
    throw new BadRequestError(`Cannot cancel order in status: ${order.status}`);
  }

  const updatedOrder = await orderRepository.updateOrderStatus(orderId, ORDER_STATUS.CANCELLED);

  // Publish compensation event for inventory and payment services
  orderPublisher.publishOrderCancelled(updatedOrder, reason);

  return updatedOrder;
}

export default {
  createOrder,
  getOrderById,
  listOrders,
  cancelOrder,
};
