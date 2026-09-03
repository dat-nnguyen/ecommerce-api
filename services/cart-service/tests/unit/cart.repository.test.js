import { jest } from '@jest/globals';
import redisManager from '../../src/config/redis.js';
import cartRepository from '../../src/repositories/cart.repository.js';

describe('Cart Repository Layer (Unit Tests)', () => {
  let mockRedis;
  let mockPipeline;

  beforeEach(() => {
    mockPipeline = {
      hset: jest.fn().mockReturnThis(),
      hdel: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    };

    mockRedis = {
      hgetall: jest.fn(),
      hget: jest.fn(),
      hdel: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(1),
      pipeline: jest.fn().mockReturnValue(mockPipeline),
    };

    jest.spyOn(redisManager, 'getRedisClient').mockReturnValue(mockRedis);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getCart', () => {
    it('should return empty array when cart hash is empty', async () => {
      mockRedis.hgetall.mockResolvedValue({});

      const result = await cartRepository.getCart('cart:user1');

      expect(result).toEqual([]);
      expect(mockRedis.hgetall).toHaveBeenCalledWith('cart:user1');
    });

    it('should parse and return all items in the cart hash', async () => {
      const item1 = { productId: 'p1', name: 'Keyboard', price: 100, quantity: 2 };
      const item2 = { productId: 'p2', name: 'Mouse', price: 50, quantity: 1 };
      mockRedis.hgetall.mockResolvedValue({
        p1: JSON.stringify(item1),
        p2: JSON.stringify(item2),
      });

      const result = await cartRepository.getCart('cart:user1');

      expect(result).toHaveLength(2);
      expect(result).toEqual([item1, item2]);
    });
  });

  describe('getCartItem', () => {
    it('should return null when product is not in the cart', async () => {
      mockRedis.hget.mockResolvedValue(null);

      const result = await cartRepository.getCartItem('cart:user1', 'p1');

      expect(result).toBeNull();
      expect(mockRedis.hget).toHaveBeenCalledWith('cart:user1', 'p1');
    });

    it('should parse and return item when found', async () => {
      const item = { productId: 'p1', name: 'Keyboard', price: 100, quantity: 1 };
      mockRedis.hget.mockResolvedValue(JSON.stringify(item));

      const result = await cartRepository.getCartItem('cart:user1', 'p1');

      expect(result).toEqual(item);
    });
  });

  describe('saveCartItem & updateCartItem', () => {
    it('should save item in pipeline with hset and expire', async () => {
      const item = { productId: 'p1', name: 'Keyboard', price: 100, quantity: 3 };

      const result = await cartRepository.saveCartItem('cart:user1', item);

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.hset).toHaveBeenCalledWith('cart:user1', 'p1', JSON.stringify(item));
      expect(mockPipeline.expire).toHaveBeenCalledWith('cart:user1', 604800);
      expect(mockPipeline.exec).toHaveBeenCalled();
      expect(result).toEqual(item);
    });

    it('updateCartItem should delegate to saveCartItem', async () => {
      const item = { productId: 'p1', name: 'Keyboard', price: 100, quantity: 5 };

      const result = await cartRepository.updateCartItem('cart:user1', item);

      expect(mockPipeline.hset).toHaveBeenCalledWith('cart:user1', 'p1', JSON.stringify(item));
      expect(result).toEqual(item);
    });
  });

  describe('deleteCartItem', () => {
    it('should delete product field from Redis hash using hdel', async () => {
      const result = await cartRepository.deleteCartItem('cart:user1', 'p1');

      expect(mockRedis.hdel).toHaveBeenCalledWith('cart:user1', 'p1');
      expect(result).toBe(true);
    });
  });

  describe('clearCart', () => {
    it('should delete entire cart key from Redis', async () => {
      const result = await cartRepository.clearCart('cart:user1');

      expect(mockRedis.del).toHaveBeenCalledWith('cart:user1');
      expect(result).toBe(true);
    });
  });

  describe('mergeCart', () => {
    it('should return target cart if source guest cart is empty', async () => {
      mockRedis.hgetall.mockResolvedValueOnce({}); // source empty
      const userItem = { productId: 'p1', name: 'Keyboard', price: 100, quantity: 1 };
      mockRedis.hgetall.mockResolvedValueOnce({ p1: JSON.stringify(userItem) }); // target items

      const result = await cartRepository.mergeCart('cart:guest:g1', 'cart:user:u1');

      expect(result).toEqual([userItem]);
    });

    it('should merge guest items into user cart, combine quantities (capped at 99), and delete guest cart', async () => {
      const guestItem1 = { productId: 'p1', name: 'Keyboard', price: 100, quantity: 5 };
      const guestItem2 = { productId: 'p2', name: 'Mouse', price: 50, quantity: 2 };
      const userItem1 = { productId: 'p1', name: 'Keyboard', price: 100, quantity: 96 };

      // First call is getCart(sourceKey)
      mockRedis.hgetall.mockResolvedValueOnce({
        p1: JSON.stringify(guestItem1),
        p2: JSON.stringify(guestItem2),
      });
      // Second call is getCart(targetKey)
      mockRedis.hgetall.mockResolvedValueOnce({
        p1: JSON.stringify(userItem1),
      });

      const result = await cartRepository.mergeCart('cart:guest:g1', 'cart:user:u1');

      // p1 quantity was 96 + 5 = 101 -> capped at 99
      const mergedP1 = result.find((i) => i.productId === 'p1');
      const mergedP2 = result.find((i) => i.productId === 'p2');

      expect(mergedP1.quantity).toBe(99);
      expect(mergedP2.quantity).toBe(2);

      // Verify pipeline saved items to targetKey and deleted sourceKey
      expect(mockPipeline.hset).toHaveBeenCalledWith('cart:user:u1', 'p1', expect.any(String));
      expect(mockPipeline.hset).toHaveBeenCalledWith('cart:user:u1', 'p2', expect.any(String));
      expect(mockPipeline.expire).toHaveBeenCalledWith('cart:user:u1', 604800);
      expect(mockPipeline.del).toHaveBeenCalledWith('cart:guest:g1');
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });
});
