import { jest } from '@jest/globals';
import cartService from '../../src/services/cart.service.js';
import cartController from '../../src/controllers/cart.controller.js';

describe('Cart Controller (Unit Tests)', () => {
  let req;
  let res;
  let next;

  const mockCart = {
    items: [{ productId: '507f1f77bcf86cd799439011', name: 'Keyboard', price: 100, quantity: 2 }],
    itemCount: 2,
    subtotal: 200,
  };

  beforeEach(() => {
    req = {
      user: { id: 'user-123' },
      headers: {},
      params: {},
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getCart', () => {
    it('should return 200 with cart data', async () => {
      jest.spyOn(cartService, 'getCart').mockResolvedValue(mockCart);

      await cartController.getCart(req, res, next);

      expect(cartService.getCart).toHaveBeenCalledWith({
        userId: 'user-123',
        guestSessionId: undefined,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockCart });
      expect(next).not.toHaveBeenCalled();
    });

    it('should forward service errors to next', async () => {
      const error = new Error('Service error');
      jest.spyOn(cartService, 'getCart').mockRejectedValue(error);

      await cartController.getCart(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('addItem', () => {
    it('should add item and return 200 with updated cart', async () => {
      const item = {
        productId: '507f1f77bcf86cd799439011',
        name: 'Keyboard',
        price: 100,
        quantity: 1,
      };
      req.body = item;
      jest.spyOn(cartService, 'addItem').mockResolvedValue(mockCart);

      await cartController.addItem(req, res, next);

      expect(cartService.addItem).toHaveBeenCalledWith({
        userId: 'user-123',
        guestSessionId: undefined,
        item,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockCart });
    });

    it('should forward service errors to next', async () => {
      const error = new Error('Add item failed');
      jest.spyOn(cartService, 'addItem').mockRejectedValue(error);

      await cartController.addItem(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('updateItemQuantity', () => {
    it('should update item quantity and return 200 with updated cart', async () => {
      req.params = { productId: '507f1f77bcf86cd799439011' };
      req.body = { quantity: 5 };
      jest.spyOn(cartService, 'updateCartItem').mockResolvedValue(mockCart);

      await cartController.updateItemQuantity(req, res, next);

      expect(cartService.updateCartItem).toHaveBeenCalledWith({
        userId: 'user-123',
        guestSessionId: undefined,
        productId: '507f1f77bcf86cd799439011',
        quantity: 5,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockCart });
    });

    it('should forward service errors to next', async () => {
      const error = new Error('Update failed');
      jest.spyOn(cartService, 'updateCartItem').mockRejectedValue(error);

      await cartController.updateItemQuantity(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('removeItem', () => {
    it('should remove item and return 200 with updated cart', async () => {
      req.params = { productId: '507f1f77bcf86cd799439011' };
      jest.spyOn(cartService, 'removeCartItem').mockResolvedValue(mockCart);

      await cartController.removeItem(req, res, next);

      expect(cartService.removeCartItem).toHaveBeenCalledWith({
        userId: 'user-123',
        guestSessionId: undefined,
        productId: '507f1f77bcf86cd799439011',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockCart });
    });

    it('should forward service errors to next', async () => {
      const error = new Error('Remove failed');
      jest.spyOn(cartService, 'removeCartItem').mockRejectedValue(error);

      await cartController.removeItem(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('clearCart', () => {
    it('should empty cart and return 200 with empty cart structure', async () => {
      const emptyCart = { items: [], itemCount: 0, subtotal: 0 };
      jest.spyOn(cartService, 'clearCart').mockResolvedValue(emptyCart);

      await cartController.clearCart(req, res, next);

      expect(cartService.clearCart).toHaveBeenCalledWith({
        userId: 'user-123',
        guestSessionId: undefined,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: emptyCart });
    });

    it('should forward service errors to next', async () => {
      const error = new Error('Clear failed');
      jest.spyOn(cartService, 'clearCart').mockRejectedValue(error);

      await cartController.clearCart(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('mergeCart', () => {
    it('should merge cart and return 200 with merged cart', async () => {
      req.body = { guestSessionId: 'guest-session-456' };
      jest.spyOn(cartService, 'mergeCart').mockResolvedValue(mockCart);

      await cartController.mergeCart(req, res, next);

      expect(cartService.mergeCart).toHaveBeenCalledWith({
        userId: 'user-123',
        guestSessionId: 'guest-session-456',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockCart });
    });

    it('should forward service errors to next', async () => {
      const error = new Error('Merge failed');
      jest.spyOn(cartService, 'mergeCart').mockRejectedValue(error);

      await cartController.mergeCart(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
