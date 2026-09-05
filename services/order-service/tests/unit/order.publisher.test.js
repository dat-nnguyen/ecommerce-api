import { jest } from '@jest/globals';
import { EVENT_EXCHANGES, ROUTING_KEYS } from '@ecommerce/event-contracts';
import rabbitmqManager from '../../src/config/rabbitmq.js';
import {
  publishOrderCreated,
  publishOrderCancelled,
} from '../../src/events/order.publisher.js';

describe('Order Event Publisher (Unit Tests)', () => {
  const mockChannel = {
    publish: jest.fn().mockReturnValue(true),
  };

  beforeEach(() => {
    mockChannel.publish.mockClear();
    jest.spyOn(rabbitmqManager, 'getChannel').mockReturnValue(mockChannel);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('publishOrderCreated', () => {
    it('should publish order.created event with JSON payload to order exchange', () => {
      const mockOrder = {
        id: 'order-123',
        user_id: 'user-456',
        items: [{ productId: 'prod-1', name: 'Item 1', price: 10, quantity: 2, subtotal: 20 }],
        total_amount: '20.00',
        currency: 'USD',
        created_at: '2026-09-05T10:00:00.000Z',
      };

      const result = publishOrderCreated(mockOrder);

      expect(rabbitmqManager.getChannel).toHaveBeenCalled();
      expect(mockChannel.publish).toHaveBeenCalledWith(
        EVENT_EXCHANGES.ORDER,
        ROUTING_KEYS.ORDER_CREATED,
        expect.any(Buffer),
        { persistent: true, contentType: 'application/json' }
      );

      const bufferArg = mockChannel.publish.mock.calls[0][2];
      const payload = JSON.parse(bufferArg.toString('utf-8'));

      expect(payload).toEqual({
        orderId: 'order-123',
        userId: 'user-456',
        items: mockOrder.items,
        totalAmount: 20,
        currency: 'USD',
        createdAt: '2026-09-05T10:00:00.000Z',
      });
      expect(result).toBe(true);
    });

    it('should handle camelCase properties and defaults', () => {
      const mockOrder = {
        id: 'order-789',
        userId: 'user-999',
        totalAmount: 55.5,
      };

      publishOrderCreated(mockOrder);

      const bufferArg = mockChannel.publish.mock.calls[0][2];
      const payload = JSON.parse(bufferArg.toString('utf-8'));

      expect(payload.orderId).toBe('order-789');
      expect(payload.userId).toBe('user-999');
      expect(payload.totalAmount).toBe(55.5);
      expect(payload.currency).toBe('USD');
      expect(payload.items).toEqual([]);
      expect(payload.createdAt).toBeDefined();
    });
  });

  describe('publishOrderCancelled', () => {
    it('should publish order.cancelled event with reason to order exchange', () => {
      const mockOrder = {
        id: 'order-123',
        user_id: 'user-456',
      };

      const result = publishOrderCancelled(mockOrder, 'Payment failed during checkout');

      expect(mockChannel.publish).toHaveBeenCalledWith(
        EVENT_EXCHANGES.ORDER,
        ROUTING_KEYS.ORDER_CANCELLED,
        expect.any(Buffer),
        { persistent: true, contentType: 'application/json' }
      );

      const bufferArg = mockChannel.publish.mock.calls[0][2];
      const payload = JSON.parse(bufferArg.toString('utf-8'));

      expect(payload.orderId).toBe('order-123');
      expect(payload.userId).toBe('user-456');
      expect(payload.reason).toBe('Payment failed during checkout');
      expect(payload.cancelledAt).toBeDefined();
      expect(result).toBe(true);
    });

    it('should fallback to default reason if omitted', () => {
      const mockOrder = { id: 'order-999', userId: 'user-111' };

      publishOrderCancelled(mockOrder);

      const bufferArg = mockChannel.publish.mock.calls[0][2];
      const payload = JSON.parse(bufferArg.toString('utf-8'));

      expect(payload.reason).toBe('Order was cancelled');
    });
  });
});
