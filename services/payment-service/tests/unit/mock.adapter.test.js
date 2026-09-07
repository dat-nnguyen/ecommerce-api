import { MockPaymentAdapter } from '../../src/adapters/mock.adapter.js';

describe('MockPaymentAdapter (Unit Tests)', () => {
  let adapter;

  beforeEach(() => {
    adapter = new MockPaymentAdapter();
  });

  describe('createPaymentIntent', () => {
    it('should generate a mock payment intent with client secret', async () => {
      const result = await adapter.createPaymentIntent({
        amount: 79.99,
        currency: 'USD',
        orderId: 'order-123',
        userId: 'user-456',
        metadata: { note: 'Test order' },
      });

      expect(result.transactionId).toMatch(/^mock_pi_/);
      expect(result.clientSecret).toMatch(/^mock_secret_/);
      expect(result.status).toBe('REQUIRES_PAYMENT_METHOD');
    });
  });

  describe('capturePayment', () => {
    it('should simulate successful capture for an existing intent', async () => {
      const intent = await adapter.createPaymentIntent({
        amount: 50.0,
        currency: 'USD',
        orderId: 'order-123',
        userId: 'user-456',
      });

      const capture = await adapter.capturePayment({
        transactionId: intent.transactionId,
        paymentMethod: 'card',
      });

      expect(capture.transactionId).toBe(intent.transactionId);
      expect(capture.status).toBe('COMPLETED');
      expect(capture.amount).toBe(50.0);
      expect(capture.currency).toBe('USD');
    });

    it('should simulate failure when transactionId contains "fail"', async () => {
      await expect(
        adapter.capturePayment({ transactionId: 'mock_pi_fail_123' })
      ).rejects.toThrow('Mock gateway payment capture failed: Card declined');
    });

    it('should simulate failure when intent metadata requests simulateFailure', async () => {
      const intent = await adapter.createPaymentIntent({
        amount: 50.0,
        currency: 'USD',
        orderId: 'order-123',
        userId: 'user-456',
        metadata: { simulateFailure: true },
      });

      await expect(
        adapter.capturePayment({ transactionId: intent.transactionId })
      ).rejects.toThrow('Mock gateway payment capture failed: Card declined');
    });
  });

  describe('refundPayment', () => {
    it('should issue a mock refund and return refundId', async () => {
      const intent = await adapter.createPaymentIntent({
        amount: 120.0,
        currency: 'USD',
        orderId: 'order-123',
        userId: 'user-456',
      });

      const refund = await adapter.refundPayment({
        transactionId: intent.transactionId,
        amount: 60.0,
        reason: 'customer_requested',
      });

      expect(refund.transactionId).toBe(intent.transactionId);
      expect(refund.refundId).toMatch(/^mock_re_/);
      expect(refund.status).toBe('REFUNDED');
      expect(refund.amount).toBe(60.0);
      expect(refund.reason).toBe('customer_requested');
    });
  });
});
