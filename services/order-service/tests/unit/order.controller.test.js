import { jest } from '@jest/globals';
import orderService from '../../src/services/order.service.js';
import * as orderController from '../../src/controllers/order.controller.js';

describe('Order Controller (Unit Tests)', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      user: { id: 'user-123', role: 'CUSTOMER' },
      body: {},
      params: {},
      query: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createOrder', () => {
    it('should create order and respond with 201 Created', async () => {
      const mockOrder = { id: 'order-1', user_id: 'user-123' };
      req.body = {
        items: [{ productId: 'prod-1', price: 10, quantity: 2 }],
        currency: 'USD',
      };

      jest.spyOn(orderService, 'createOrder').mockResolvedValue(mockOrder);

      await orderController.createOrder(req, res, next);

      expect(orderService.createOrder).toHaveBeenCalledWith({
        userId: 'user-123',
        items: req.body.items,
        currency: 'USD',
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Order created successfully',
        data: mockOrder,
      });
    });

    it('should forward errors to next(error)', async () => {
      const error = new Error('Creation failed');
      jest.spyOn(orderService, 'createOrder').mockRejectedValue(error);

      await orderController.createOrder(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('getOrder', () => {
    it('should fetch order and respond with 200 OK', async () => {
      const mockOrder = { id: 'order-1', user_id: 'user-123' };
      req.params = { id: 'order-1' };

      jest.spyOn(orderService, 'getOrderById').mockResolvedValue(mockOrder);

      await orderController.getOrder(req, res, next);

      expect(orderService.getOrderById).toHaveBeenCalledWith({
        orderId: 'order-1',
        userId: 'user-123',
        isAdmin: false,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockOrder,
      });
    });

    it('should pass isAdmin true when user is admin', async () => {
      req.user = { id: 'admin-1', role: 'ADMIN' };
      req.params = { id: 'order-1' };

      jest.spyOn(orderService, 'getOrderById').mockResolvedValue({});

      await orderController.getOrder(req, res, next);

      expect(orderService.getOrderById).toHaveBeenCalledWith({
        orderId: 'order-1',
        userId: 'admin-1',
        isAdmin: true,
      });
    });

    it('should forward errors to next(error)', async () => {
      const error = new Error('Order not found');
      jest.spyOn(orderService, 'getOrderById').mockRejectedValue(error);

      await orderController.getOrder(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('listOrders', () => {
    it('should list paginated orders and return 200 with pagination metadata', async () => {
      const mockResult = {
        orders: [{ id: 'order-1' }],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      };
      req.query = { page: 1, limit: 10 };

      jest.spyOn(orderService, 'listOrders').mockResolvedValue(mockResult);

      await orderController.listOrders(req, res, next);

      expect(orderService.listOrders).toHaveBeenCalledWith({
        userId: 'user-123',
        page: 1,
        limit: 10,
        isAdmin: false,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult.orders,
        pagination: mockResult.pagination,
      });
    });

    it('should forward errors to next(error)', async () => {
      const error = new Error('Database query error');
      jest.spyOn(orderService, 'listOrders').mockRejectedValue(error);

      await orderController.listOrders(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order and return 200 with success message', async () => {
      const cancelledOrder = { id: 'order-1', status: 'CANCELLED' };
      req.params = { id: 'order-1' };
      req.body = { reason: 'Changed mind' };

      jest.spyOn(orderService, 'cancelOrder').mockResolvedValue(cancelledOrder);

      await orderController.cancelOrder(req, res, next);

      expect(orderService.cancelOrder).toHaveBeenCalledWith({
        orderId: 'order-1',
        userId: 'user-123',
        isAdmin: false,
        reason: 'Changed mind',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Order cancelled successfully',
        data: cancelledOrder,
      });
    });

    it('should forward errors to next(error)', async () => {
      const error = new Error('Cancellation not allowed');
      jest.spyOn(orderService, 'cancelOrder').mockRejectedValue(error);

      await orderController.cancelOrder(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
