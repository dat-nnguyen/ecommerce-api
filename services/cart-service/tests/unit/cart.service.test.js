import { jest } from '@jest/globals';
import { BadRequestError, NotFoundError } from '@ecommerce/common-errors';
import cartRepository from '../../src/repositories/cart.repository.js';
import cartService from '../../src/services/cart.service.js';

describe('Cart Domain Service Layer (Unit Tests)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('resolveCartKey', () => {
    it('should resolve user cart key when userId is provided', () => {
      const key = cartService.resolveCartKey({ userId: 'user-123' });
      expect(key).toBe('cart:user-123');
    });

    it('should resolve guest cart key when guestSessionId is provided', () => {
      const key = cartService.resolveCartKey({ guestSessionId: 'guest-abc' });
      expect(key).toBe('cart:guest:guest-abc');
    });

    it('should prioritize userId over guestSessionId if both provided', () => {
      const key = cartService.resolveCartKey({ userId: 'user-123', guestSessionId: 'guest-abc' });
      expect(key).toBe('cart:user-123');
    });

    it('should throw BadRequestError if neither identifier is provided', () => {
      expect(() => cartService.resolveCartKey({})).toThrow(BadRequestError);
      expect(() => cartService.resolveCartKey({})).toThrow(
        'Must provide either userId or guestSessionId'
      );
    });
  });

  describe('formatCartResponse', () => {
    it('should handle empty or omitted items array', () => {
      expect(cartService.formatCartResponse()).toEqual({
        items: [],
        itemCount: 0,
        subtotal: 0,
      });
      expect(cartService.formatCartResponse([])).toEqual({
        items: [],
        itemCount: 0,
        subtotal: 0,
      });
    });

    it('should correctly calculate total itemCount and rounded subtotal', () => {
      const items = [
        { productId: 'p1', name: 'Item 1', price: 19.99, quantity: 3 }, // 59.97
        { productId: 'p2', name: 'Item 2', price: 10.05, quantity: 2 }, // 20.10 -> total 80.07
      ];

      const response = cartService.formatCartResponse(items);

      expect(response.itemCount).toBe(5);
      expect(response.subtotal).toBe(80.07);
      expect(response.items).toEqual(items);
    });
  });

  describe('getCart', () => {
    it('should retrieve and format cart items from repository', async () => {
      const items = [{ productId: 'p1', price: 50, quantity: 2 }];
      jest.spyOn(cartRepository, 'getCart').mockResolvedValue(items);

      const result = await cartService.getCart({ userId: 'u1' });

      expect(cartRepository.getCart).toHaveBeenCalledWith('cart:u1');
      expect(result).toEqual({
        items,
        itemCount: 2,
        subtotal: 100,
      });
    });
  });

  describe('addItem', () => {
    it('should save new item if product not already in cart', async () => {
      const newItem = { productId: 'p1', name: 'Keyboard', price: 100, quantity: 1 };
      jest.spyOn(cartRepository, 'getCartItem').mockResolvedValue(null);
      const saveSpy = jest.spyOn(cartRepository, 'saveCartItem').mockResolvedValue(newItem);
      jest.spyOn(cartRepository, 'getCart').mockResolvedValue([newItem]);

      const result = await cartService.addItem({ userId: 'u1', item: newItem });

      expect(saveSpy).toHaveBeenCalledWith('cart:u1', newItem);
      expect(result.itemCount).toBe(1);
      expect(result.subtotal).toBe(100);
    });

    it('should increment quantity if product already exists in cart', async () => {
      const existing = { productId: 'p1', name: 'Keyboard', price: 100, quantity: 2 };
      const addition = { productId: 'p1', name: 'Keyboard', price: 100, quantity: 3 };
      jest.spyOn(cartRepository, 'getCartItem').mockResolvedValue({ ...existing });
      const saveSpy = jest.spyOn(cartRepository, 'saveCartItem').mockResolvedValue();
      jest.spyOn(cartRepository, 'getCart').mockResolvedValue([{ ...existing, quantity: 5 }]);

      const result = await cartService.addItem({ userId: 'u1', item: addition });

      expect(saveSpy).toHaveBeenCalledWith('cart:u1', { ...existing, quantity: 5 });
      expect(result.itemCount).toBe(5);
      expect(result.subtotal).toBe(500);
    });
  });

  describe('updateCartItem', () => {
    it('should throw NotFoundError if item does not exist in cart', async () => {
      jest.spyOn(cartRepository, 'getCartItem').mockResolvedValue(null);

      await expect(
        cartService.updateCartItem({ userId: 'u1', productId: 'p999', quantity: 3 })
      ).rejects.toThrow(NotFoundError);
    });

    it('should delete item if updated quantity is 0 or negative', async () => {
      const existing = { productId: 'p1', quantity: 2 };
      jest.spyOn(cartRepository, 'getCartItem').mockResolvedValue(existing);
      const deleteSpy = jest.spyOn(cartRepository, 'deleteCartItem').mockResolvedValue(true);
      jest.spyOn(cartRepository, 'getCart').mockResolvedValue([]);

      const result = await cartService.updateCartItem({
        userId: 'u1',
        productId: 'p1',
        quantity: 0,
      });

      expect(deleteSpy).toHaveBeenCalledWith('cart:u1', 'p1');
      expect(result.items).toHaveLength(0);
      expect(result.itemCount).toBe(0);
    });

    it('should update quantity if quantity is positive', async () => {
      const existing = { productId: 'p1', price: 20, quantity: 2 };
      jest.spyOn(cartRepository, 'getCartItem').mockResolvedValue({ ...existing });
      const saveSpy = jest.spyOn(cartRepository, 'saveCartItem').mockResolvedValue();
      jest.spyOn(cartRepository, 'getCart').mockResolvedValue([{ ...existing, quantity: 7 }]);

      const result = await cartService.updateCartItem({
        userId: 'u1',
        productId: 'p1',
        quantity: 7,
      });

      expect(saveSpy).toHaveBeenCalledWith('cart:u1', { ...existing, quantity: 7 });
      expect(result.itemCount).toBe(7);
      expect(result.subtotal).toBe(140);
    });
  });

  describe('removeCartItem', () => {
    it('should throw NotFoundError if item not in cart', async () => {
      jest.spyOn(cartRepository, 'getCartItem').mockResolvedValue(null);

      await expect(cartService.removeCartItem({ userId: 'u1', productId: 'p999' })).rejects.toThrow(
        NotFoundError
      );
    });

    it('should delete item from repository and return updated cart', async () => {
      const existing = { productId: 'p1', quantity: 1 };
      jest.spyOn(cartRepository, 'getCartItem').mockResolvedValue(existing);
      const deleteSpy = jest.spyOn(cartRepository, 'deleteCartItem').mockResolvedValue(true);
      jest.spyOn(cartRepository, 'getCart').mockResolvedValue([]);

      const result = await cartService.removeCartItem({ userId: 'u1', productId: 'p1' });

      expect(deleteSpy).toHaveBeenCalledWith('cart:u1', 'p1');
      expect(result.items).toHaveLength(0);
      expect(result.itemCount).toBe(0);
    });
  });

  describe('clearCart', () => {
    it('should clear cart and return empty formatted cart response', async () => {
      const clearSpy = jest.spyOn(cartRepository, 'clearCart').mockResolvedValue(true);

      const result = await cartService.clearCart({ userId: 'u1' });

      expect(clearSpy).toHaveBeenCalledWith('cart:u1');
      expect(result).toEqual({ items: [], itemCount: 0, subtotal: 0 });
    });
  });

  describe('mergeCart', () => {
    it('should throw BadRequestError if userId or guestSessionId is missing', async () => {
      await expect(cartService.mergeCart({ userId: 'u1' })).rejects.toThrow(BadRequestError);
      await expect(cartService.mergeCart({ guestSessionId: 'g1' })).rejects.toThrow(
        BadRequestError
      );
    });

    it('should delegate to cartRepository.mergeCart and format response', async () => {
      const mergedItems = [{ productId: 'p1', price: 50, quantity: 4 }];
      const mergeSpy = jest.spyOn(cartRepository, 'mergeCart').mockResolvedValue(mergedItems);

      const result = await cartService.mergeCart({ userId: 'u1', guestSessionId: 'g1' });

      expect(mergeSpy).toHaveBeenCalledWith('cart:guest:g1', 'cart:u1');
      expect(result.itemCount).toBe(4);
      expect(result.subtotal).toBe(200);
    });
  });
});
