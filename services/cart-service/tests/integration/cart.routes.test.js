import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import cartService from '../../src/services/cart.service.js';

describe('Cart HTTP Routes (Integration Tests)', () => {
  const validProductId = '507f1f77bcf86cd799439011';
  const mockCartResponse = {
    items: [{ productId: validProductId, name: 'Mechanical Keyboard', price: 99.99, quantity: 2 }],
    itemCount: 2,
    subtotal: 199.98,
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/v1/cart', () => {
    it('should return 200 and cart contents for guest user via header', async () => {
      jest.spyOn(cartService, 'getCart').mockResolvedValue(mockCartResponse);

      const response = await request(app)
        .get('/api/v1/cart')
        .set('x-guest-session-id', 'guest-uuid-123');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockCartResponse,
      });
      expect(cartService.getCart).toHaveBeenCalledWith({
        userId: undefined,
        guestSessionId: 'guest-uuid-123',
      });
    });

    it('should return 200 and cart contents for authenticated user via header', async () => {
      jest.spyOn(cartService, 'getCart').mockResolvedValue(mockCartResponse);

      const response = await request(app).get('/api/v1/cart').set('x-user-id', 'user-123');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockCartResponse);
      expect(cartService.getCart).toHaveBeenCalledWith({
        userId: 'user-123',
        guestSessionId: undefined,
      });
    });
  });

  describe('POST /api/v1/cart/items', () => {
    it('should add item and return 200 on valid payload', async () => {
      jest.spyOn(cartService, 'addItem').mockResolvedValue(mockCartResponse);

      const payload = {
        productId: validProductId,
        name: 'Mechanical Keyboard',
        price: 99.99,
        quantity: 2,
      };

      const response = await request(app)
        .post('/api/v1/cart/items')
        .set('x-user-id', 'user-123')
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockCartResponse);
      expect(cartService.addItem).toHaveBeenCalledWith({
        userId: 'user-123',
        guestSessionId: undefined,
        item: payload,
      });
    });

    it('should return 400 ValidationError when payload is invalid', async () => {
      const invalidPayload = {
        productId: 'invalid-id',
        name: '',
        price: -5,
      };

      const response = await request(app)
        .post('/api/v1/cart/items')
        .set('x-user-id', 'user-123')
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/v1/cart/items/:productId', () => {
    it('should update item quantity and return 200 on valid input', async () => {
      jest.spyOn(cartService, 'updateCartItem').mockResolvedValue(mockCartResponse);

      const response = await request(app)
        .patch(`/api/v1/cart/items/${validProductId}`)
        .set('x-user-id', 'user-123')
        .send({ quantity: 5 });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockCartResponse);
      expect(cartService.updateCartItem).toHaveBeenCalledWith({
        userId: 'user-123',
        guestSessionId: undefined,
        productId: validProductId,
        quantity: 5,
      });
    });

    it('should return 400 if productId route param is not a valid 24-hex ObjectId', async () => {
      const response = await request(app)
        .patch('/api/v1/cart/items/non-hex-id')
        .set('x-user-id', 'user-123')
        .send({ quantity: 5 });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if quantity is negative', async () => {
      const response = await request(app)
        .patch(`/api/v1/cart/items/${validProductId}`)
        .set('x-user-id', 'user-123')
        .send({ quantity: -1 });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/v1/cart/items/:productId', () => {
    it('should remove item and return 200 on valid productId', async () => {
      jest.spyOn(cartService, 'removeCartItem').mockResolvedValue(mockCartResponse);

      const response = await request(app)
        .delete(`/api/v1/cart/items/${validProductId}`)
        .set('x-user-id', 'user-123');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockCartResponse);
      expect(cartService.removeCartItem).toHaveBeenCalledWith({
        userId: 'user-123',
        guestSessionId: undefined,
        productId: validProductId,
      });
    });

    it('should return 400 if productId route param is invalid', async () => {
      const response = await request(app)
        .delete('/api/v1/cart/items/bad-id')
        .set('x-user-id', 'user-123');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /api/v1/cart', () => {
    it('should clear cart and return 200', async () => {
      const emptyCart = { items: [], itemCount: 0, subtotal: 0 };
      jest.spyOn(cartService, 'clearCart').mockResolvedValue(emptyCart);

      const response = await request(app).delete('/api/v1/cart').set('x-user-id', 'user-123');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(emptyCart);
      expect(cartService.clearCart).toHaveBeenCalledWith({
        userId: 'user-123',
        guestSessionId: undefined,
      });
    });
  });

  describe('POST /api/v1/cart/merge', () => {
    it('should merge guest cart into user cart and return 200', async () => {
      jest.spyOn(cartService, 'mergeCart').mockResolvedValue(mockCartResponse);

      const response = await request(app)
        .post('/api/v1/cart/merge')
        .set('x-user-id', 'user-123')
        .send({ guestSessionId: 'guest-session-uuid-789' });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockCartResponse);
      expect(cartService.mergeCart).toHaveBeenCalledWith({
        userId: 'user-123',
        guestSessionId: 'guest-session-uuid-789',
      });
    });

    it('should return 400 if guestSessionId is missing in request body', async () => {
      const response = await request(app)
        .post('/api/v1/cart/merge')
        .set('x-user-id', 'user-123')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
