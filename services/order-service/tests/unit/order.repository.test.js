import { jest } from '@jest/globals';
import dbManager from '../../src/config/db.js';
import * as orderRepository from '../../src/repositories/order.repository.js';

describe('Order Repository (Unit Tests)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createOrder', () => {
    it('should create order and items within a database transaction', async () => {
      const mockOrder = {
        id: 'order-uuid-1',
        user_id: 'user-123',
        status: 'PENDING',
        total_amount: '100.00',
        currency: 'USD',
      };
      const mockItem = {
        id: 'item-uuid-1',
        order_id: 'order-uuid-1',
        product_id: 'prod-1',
        name: 'Test Product',
        price: '50.00',
        quantity: 2,
        subtotal: '100.00',
      };

      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rows: [mockOrder] }) // INSERT orders
          .mockResolvedValueOnce({ rows: [mockItem] }) // INSERT order_items
          .mockResolvedValueOnce({}), // COMMIT
        release: jest.fn(),
      };

      jest.spyOn(dbManager, 'getClient').mockResolvedValue(mockClient);

      const result = await orderRepository.createOrder({
        userId: 'user-123',
        totalAmount: 100,
        currency: 'USD',
        items: [
          {
            productId: 'prod-1',
            name: 'Test Product',
            price: 50,
            quantity: 2,
            subtotal: 100,
          },
        ],
      });

      expect(dbManager.getClient).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO orders'),
        ['user-123', 100, 'USD']
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO order_items'),
        ['order-uuid-1', 'prod-1', 'Test Product', 50, 2, 100]
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual({ ...mockOrder, items: [mockItem] });
    });

    it('should rollback transaction and release client on error', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockRejectedValueOnce(new Error('Insert error')), // Error on insert
        release: jest.fn(),
      };

      jest.spyOn(dbManager, 'getClient').mockResolvedValue(mockClient);

      await expect(
        orderRepository.createOrder({
          userId: 'user-123',
          totalAmount: 100,
          items: [],
        })
      ).rejects.toThrow('Insert error');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findOrderById', () => {
    it('should return order with items when found', async () => {
      const mockOrder = { id: 'order-1', user_id: 'user-1' };
      const mockItems = [{ id: 'item-1', order_id: 'order-1' }];

      jest
        .spyOn(dbManager, 'query')
        .mockResolvedValueOnce({ rows: [mockOrder] })
        .mockResolvedValueOnce({ rows: mockItems });

      const result = await orderRepository.findOrderById('order-1');

      expect(dbManager.query).toHaveBeenNthCalledWith(
        1,
        'SELECT * FROM orders WHERE id = $1',
        ['order-1']
      );
      expect(dbManager.query).toHaveBeenNthCalledWith(
        2,
        'SELECT * FROM order_items WHERE order_id = $1',
        ['order-1']
      );
      expect(result).toEqual({ ...mockOrder, items: mockItems });
    });

    it('should return null if order is not found', async () => {
      jest.spyOn(dbManager, 'query').mockResolvedValueOnce({ rows: [] });

      const result = await orderRepository.findOrderById('non-existent');

      expect(result).toBeNull();
      expect(dbManager.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOrdersByUserId', () => {
    it('should return paginated orders with metadata', async () => {
      const mockOrders = [{ id: 'order-1' }, { id: 'order-2' }];

      jest
        .spyOn(dbManager, 'query')
        .mockResolvedValueOnce({ rows: mockOrders })
        .mockResolvedValueOnce({ rows: [{ count: '15' }] });

      const result = await orderRepository.findOrdersByUserId('user-1', {
        page: 2,
        limit: 5,
      });

      expect(result).toEqual({
        orders: mockOrders,
        pagination: {
          total: 15,
          page: 2,
          limit: 5,
          totalPages: 3,
        },
      });
    });

    it('should handle zero orders gracefully', async () => {
      jest
        .spyOn(dbManager, 'query')
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const result = await orderRepository.findOrdersByUserId('user-empty');

      expect(result).toEqual({
        orders: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
        },
      });
    });
  });

  describe('updateOrderStatus', () => {
    it('should update and return updated order', async () => {
      const updatedOrder = { id: 'order-1', status: 'CONFIRMED' };
      jest.spyOn(dbManager, 'query').mockResolvedValueOnce({ rows: [updatedOrder] });

      const result = await orderRepository.updateOrderStatus('order-1', 'CONFIRMED');

      expect(dbManager.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE orders SET status = $1'),
        ['CONFIRMED', 'order-1']
      );
      expect(result).toEqual(updatedOrder);
    });

    it('should return null if order to update does not exist', async () => {
      jest.spyOn(dbManager, 'query').mockResolvedValueOnce({ rows: [] });

      const result = await orderRepository.updateOrderStatus('unknown-id', 'CANCELLED');

      expect(result).toBeNull();
    });
  });
});
