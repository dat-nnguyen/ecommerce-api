import { jest } from '@jest/globals';
import orderRepository from '../../src/repositories/order.repository.js';
import orderPublisher from '../../src/events/order.publisher.js';
import { ORDER_STATUS } from '../../src/models/order.model.js';
import * as orderService from '../../src/services/order.service.js';

describe('Order Service (Unit Tests)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createOrder', () => {
    it('should calculate totals, persist order, and emit order.created event', async () => {
      const mockCreatedOrder = {
        id: 'order-123',
        user_id: 'user-456',
        status: ORDER_STATUS.PENDING,
        total_amount: '49.98',
        currency: 'USD',
        items: [
          { productId: 'prod-1', name: 'Item 1', price: 19.99, quantity: 2, subtotal: 39.98 },
          { productId: 'prod-2', name: 'Item 2', price: 10.0, quantity: 1, subtotal: 10.0 },
        ],
      };

      jest.spyOn(orderRepository, 'createOrder').mockResolvedValue(mockCreatedOrder);
      jest.spyOn(orderPublisher, 'publishOrderCreated').mockReturnValue(true);

      const result = await orderService.createOrder({
        userId: 'user-456',
        items: [
          { productId: 'prod-1', name: 'Item 1', price: 19.99, quantity: 2 },
          { productId: 'prod-2', name: 'Item 2', unitPrice: 10.0, quantity: 1 },
        ],
        currency: 'USD',
      });

      expect(orderRepository.createOrder).toHaveBeenCalledWith({
        userId: 'user-456',
        items: [
          { productId: 'prod-1', name: 'Item 1', price: 19.99, quantity: 2, subtotal: 39.98 },
          { productId: 'prod-2', name: 'Item 2', price: 10.0, quantity: 1, subtotal: 10.0 },
        ],
        totalAmount: 49.98,
        currency: 'USD',
      });
      expect(orderPublisher.publishOrderCreated).toHaveBeenCalledWith(mockCreatedOrder);
      expect(result).toBe(mockCreatedOrder);
    });

    it('should throw BadRequestError if userId is missing', async () => {
      await expect(
        orderService.createOrder({ items: [{ productId: 'p1', price: 10, quantity: 1 }] })
      ).rejects.toThrow('User ID is required');
    });

    it('should throw BadRequestError if items are empty', async () => {
      await expect(
        orderService.createOrder({ userId: 'u1', items: [] })
      ).rejects.toThrow('Order must contain at least one item');
    });

    it('should throw BadRequestError on invalid item price or quantity', async () => {
      await expect(
        orderService.createOrder({
          userId: 'u1',
          items: [{ productId: 'p1', price: -5, quantity: 1 }],
        })
      ).rejects.toThrow('Invalid price for item at index 0');

      await expect(
        orderService.createOrder({
          userId: 'u1',
          items: [{ productId: 'p1', price: 10, quantity: 0 }],
        })
      ).rejects.toThrow('Invalid quantity for item at index 0');
    });
  });

  describe('getOrderById', () => {
    const mockOrder = {
      id: 'order-123',
      user_id: 'user-456',
      status: ORDER_STATUS.PENDING,
    };

    it('should return order when requesting user is owner', async () => {
      jest.spyOn(orderRepository, 'findOrderById').mockResolvedValue(mockOrder);

      const result = await orderService.getOrderById({
        orderId: 'order-123',
        userId: 'user-456',
      });

      expect(result).toBe(mockOrder);
    });

    it('should return order when requester is admin', async () => {
      jest.spyOn(orderRepository, 'findOrderById').mockResolvedValue(mockOrder);

      const result = await orderService.getOrderById({
        orderId: 'order-123',
        userId: 'different-user',
        isAdmin: true,
      });

      expect(result).toBe(mockOrder);
    });

    it('should throw ForbiddenError when requester is neither owner nor admin', async () => {
      jest.spyOn(orderRepository, 'findOrderById').mockResolvedValue(mockOrder);

      await expect(
        orderService.getOrderById({
          orderId: 'order-123',
          userId: 'stranger-user',
          isAdmin: false,
        })
      ).rejects.toThrow('You do not have permission to access this order');
    });

    it('should throw NotFoundError if order does not exist', async () => {
      jest.spyOn(orderRepository, 'findOrderById').mockResolvedValue(null);

      await expect(
        orderService.getOrderById({ orderId: 'non-existent', userId: 'u1' })
      ).rejects.toThrow('Order with ID non-existent not found');
    });

    it('should throw BadRequestError if orderId is omitted', async () => {
      await expect(orderService.getOrderById({})).rejects.toThrow('Order ID is required');
    });
  });

  describe('listOrders', () => {
    it('should retrieve paginated orders with defaulted page and limit', async () => {
      const mockResult = { orders: [], pagination: { total: 0, page: 1, limit: 10, totalPages: 0 } };
      jest.spyOn(orderRepository, 'findOrdersByUserId').mockResolvedValue(mockResult);

      const result = await orderService.listOrders({ userId: 'u1', page: 2, limit: 5 });

      expect(orderRepository.findOrdersByUserId).toHaveBeenCalledWith('u1', { page: 2, limit: 5 });
      expect(result).toBe(mockResult);
    });

    it('should throw ForbiddenError if userId missing for non-admin request', async () => {
      await expect(orderService.listOrders({ isAdmin: false })).rejects.toThrow(
        'User ID is required for non-admin requests'
      );
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order, update status, and publish order.cancelled event', async () => {
      const pendingOrder = {
        id: 'order-123',
        user_id: 'user-456',
        status: ORDER_STATUS.PENDING,
      };
      const cancelledOrder = {
        ...pendingOrder,
        status: ORDER_STATUS.CANCELLED,
      };

      jest.spyOn(orderRepository, 'findOrderById').mockResolvedValue(pendingOrder);
      jest.spyOn(orderRepository, 'updateOrderStatus').mockResolvedValue(cancelledOrder);
      jest.spyOn(orderPublisher, 'publishOrderCancelled').mockReturnValue(true);

      const result = await orderService.cancelOrder({
        orderId: 'order-123',
        userId: 'user-456',
        reason: 'Customer requested cancellation',
      });

      expect(orderRepository.updateOrderStatus).toHaveBeenCalledWith(
        'order-123',
        ORDER_STATUS.CANCELLED
      );
      expect(orderPublisher.publishOrderCancelled).toHaveBeenCalledWith(
        cancelledOrder,
        'Customer requested cancellation'
      );
      expect(result).toBe(cancelledOrder);
    });

    it('should allow admin to cancel any order', async () => {
      const pendingOrder = {
        id: 'order-123',
        user_id: 'user-456',
        status: ORDER_STATUS.PAYMENT_PENDING,
      };
      const cancelledOrder = { ...pendingOrder, status: ORDER_STATUS.CANCELLED };

      jest.spyOn(orderRepository, 'findOrderById').mockResolvedValue(pendingOrder);
      jest.spyOn(orderRepository, 'updateOrderStatus').mockResolvedValue(cancelledOrder);
      jest.spyOn(orderPublisher, 'publishOrderCancelled').mockReturnValue(true);

      const result = await orderService.cancelOrder({
        orderId: 'order-123',
        isAdmin: true,
      });

      expect(result).toBe(cancelledOrder);
    });

    it('should throw BadRequestError if order is already in a terminal status', async () => {
      const deliveredOrder = {
        id: 'order-123',
        user_id: 'user-456',
        status: ORDER_STATUS.DELIVERED,
      };

      jest.spyOn(orderRepository, 'findOrderById').mockResolvedValue(deliveredOrder);

      await expect(
        orderService.cancelOrder({
          orderId: 'order-123',
          userId: 'user-456',
        })
      ).rejects.toThrow('Cannot cancel order in status: DELIVERED');
    });

    it('should throw ForbiddenError if non-owner non-admin tries to cancel', async () => {
      const pendingOrder = {
        id: 'order-123',
        user_id: 'user-456',
        status: ORDER_STATUS.PENDING,
      };

      jest.spyOn(orderRepository, 'findOrderById').mockResolvedValue(pendingOrder);

      await expect(
        orderService.cancelOrder({
          orderId: 'order-123',
          userId: 'intruder-user',
        })
      ).rejects.toThrow('You do not have permission to cancel this order');
    });

    it('should throw NotFoundError if order does not exist', async () => {
      jest.spyOn(orderRepository, 'findOrderById').mockResolvedValue(null);

      await expect(
        orderService.cancelOrder({ orderId: 'non-existent', userId: 'u1' })
      ).rejects.toThrow('Order with ID non-existent not found');
    });
  });
});
