import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import orderService from '../../src/services/order.service.js';

describe('Order HTTP Routes (Integration Tests)', () => {
  const validOrderId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const mockOrderResponse = {
    id: validOrderId,
    userId: 'user-123',
    status: 'PENDING',
    totalAmount: 199.98,
    currency: 'USD',
    items: [
      {
        id: 'item-uuid-1',
        orderId: validOrderId,
        productId: '507f1f77bcf86cd799439011',
        title: 'Mechanical Keyboard',
        price: 99.99,
        quantity: 2,
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Authentication Gate', () => {
    it('should return 401 Unauthorized when x-user-id header is missing', async () => {
      const response = await request(app).get('/api/v1/orders');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/v1/orders', () => {
    const validPayload = {
      currency: 'USD',
      items: [
        {
          productId: '507f1f77bcf86cd799439011',
          name: 'Mechanical Keyboard',
          price: 99.99,
          quantity: 2,
        },
      ],
    };

    it('should place order and return 201 on valid payload', async () => {
      jest.spyOn(orderService, 'createOrder').mockResolvedValue(mockOrderResponse);

      const response = await request(app)
        .post('/api/v1/orders')
        .set('x-user-id', 'user-123')
        .send(validPayload);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        message: 'Order created successfully',
        data: mockOrderResponse,
      });
      expect(orderService.createOrder).toHaveBeenCalledWith({
        userId: 'user-123',
        items: validPayload.items,
        currency: 'USD',
      });
    });

    it('should return 400 ValidationError when items array is empty', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('x-user-id', 'user-123')
        .send({ items: [] });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/orders', () => {
    it('should return 200 with paginated orders', async () => {
      const mockListResponse = {
        orders: [mockOrderResponse],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };
      jest.spyOn(orderService, 'listOrders').mockResolvedValue(mockListResponse);

      const response = await request(app)
        .get('/api/v1/orders?page=1&limit=10')
        .set('x-user-id', 'user-123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockListResponse.orders,
        pagination: mockListResponse.pagination,
      });
      expect(orderService.listOrders).toHaveBeenCalledWith({
        userId: 'user-123',
        page: 1,
        limit: 10,
        isAdmin: false,
      });
    });
  });

  describe('GET /api/v1/orders/:id', () => {
    it('should return 200 with order details for valid UUID', async () => {
      jest.spyOn(orderService, 'getOrderById').mockResolvedValue(mockOrderResponse);

      const response = await request(app)
        .get(`/api/v1/orders/${validOrderId}`)
        .set('x-user-id', 'user-123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockOrderResponse,
      });
      expect(orderService.getOrderById).toHaveBeenCalledWith({
        orderId: validOrderId,
        userId: 'user-123',
        isAdmin: false,
      });
    });

    it('should return 400 ValidationError for non-UUID orderId', async () => {
      const response = await request(app)
        .get('/api/v1/orders/invalid-uuid-format')
        .set('x-user-id', 'user-123');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/v1/orders/:id/cancel', () => {
    it('should cancel order and return 200', async () => {
      const cancelledOrder = { ...mockOrderResponse, status: 'CANCELLED' };
      jest.spyOn(orderService, 'cancelOrder').mockResolvedValue(cancelledOrder);

      const response = await request(app)
        .patch(`/api/v1/orders/${validOrderId}/cancel`)
        .set('x-user-id', 'user-123')
        .send({ reason: 'Customer requested cancellation' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'Order cancelled successfully',
        data: cancelledOrder,
      });
      expect(orderService.cancelOrder).toHaveBeenCalledWith({
        orderId: validOrderId,
        userId: 'user-123',
        isAdmin: false,
        reason: 'Customer requested cancellation',
      });
    });

    it('should return 400 ValidationError if order ID is invalid', async () => {
      const response = await request(app)
        .patch('/api/v1/orders/not-a-uuid/cancel')
        .set('x-user-id', 'user-123')
        .send({ reason: 'Changed mind' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
