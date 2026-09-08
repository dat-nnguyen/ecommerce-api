import { jest } from '@jest/globals';
import { EVENT_EXCHANGES, ROUTING_KEYS } from '@ecommerce/event-contracts';
import rabbitmqManager from '../../src/config/rabbitmq.js';
import {
  publishPaymentCompleted,
  publishPaymentFailed,
} from '../../src/events/payment.publisher.js';

describe('Payment Event Publisher (Unit Tests)', () => {
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

  describe('publishPaymentCompleted', () => {
    it('should publish payment.completed event with JSON payload to payment exchange', () => {
      const mockPayment = {
        id: 'pay-123',
        orderId: 'order-456',
        userId: 'user-789',
        amount: 99.99,
        currency: 'USD',
        transactionId: 'pi_test_abc',
      };

      const result = publishPaymentCompleted(mockPayment);

      expect(rabbitmqManager.getChannel).toHaveBeenCalled();
      expect(mockChannel.publish).toHaveBeenCalledWith(
        EVENT_EXCHANGES.PAYMENT,
        ROUTING_KEYS.PAYMENT_COMPLETED,
        expect.any(Buffer),
        { persistent: true, contentType: 'application/json' }
      );

      const bufferArg = mockChannel.publish.mock.calls[0][2];
      const payload = JSON.parse(bufferArg.toString('utf-8'));

      expect(payload).toEqual({
        paymentId: 'pay-123',
        orderId: 'order-456',
        userId: 'user-789',
        amount: 99.99,
        currency: 'USD',
        transactionId: 'pi_test_abc',
        completedAt: expect.any(String),
      });
      expect(result).toBe(true);
    });

    it('should support snake_case fallback properties', () => {
      const mockPayment = {
        id: 'pay-999',
        order_id: 'order-888',
        user_id: 'user-777',
        amount: 50.0,
        transaction_id: 'pi_stripe_111',
      };

      publishPaymentCompleted(mockPayment);

      const bufferArg = mockChannel.publish.mock.calls[0][2];
      const payload = JSON.parse(bufferArg.toString('utf-8'));

      expect(payload.orderId).toBe('order-888');
      expect(payload.userId).toBe('user-777');
      expect(payload.transactionId).toBe('pi_stripe_111');
      expect(payload.currency).toBe('USD');
    });
  });

  describe('publishPaymentFailed', () => {
    it('should publish payment.failed event with reason to payment exchange', () => {
      const mockPayment = {
        id: 'pay-123',
        orderId: 'order-456',
        userId: 'user-789',
        amount: 99.99,
      };

      const result = publishPaymentFailed(mockPayment, 'Card declined by issuing bank');

      expect(mockChannel.publish).toHaveBeenCalledWith(
        EVENT_EXCHANGES.PAYMENT,
        ROUTING_KEYS.PAYMENT_FAILED,
        expect.any(Buffer),
        { persistent: true, contentType: 'application/json' }
      );

      const bufferArg = mockChannel.publish.mock.calls[0][2];
      const payload = JSON.parse(bufferArg.toString('utf-8'));

      expect(payload).toEqual({
        paymentId: 'pay-123',
        orderId: 'order-456',
        userId: 'user-789',
        amount: 99.99,
        currency: 'USD',
        reason: 'Card declined by issuing bank',
        failedAt: expect.any(String),
      });
      expect(result).toBe(true);
    });

    it('should fallback to default reason if omitted', () => {
      const mockPayment = { id: 'pay-999', orderId: 'order-111' };

      publishPaymentFailed(mockPayment);

      const bufferArg = mockChannel.publish.mock.calls[0][2];
      const payload = JSON.parse(bufferArg.toString('utf-8'));

      expect(payload.reason).toBe('Payment processing failed');
    });
  });
});
