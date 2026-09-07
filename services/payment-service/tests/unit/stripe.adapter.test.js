import { jest } from '@jest/globals';
import { StripeAdapter } from '../../src/adapters/stripe.adapter.js';

describe('StripeAdapter (Unit Tests)', () => {
  let adapter;

  beforeEach(() => {
    adapter = new StripeAdapter('sk_test_mock_key');
    adapter.stripe = {
      paymentIntents: {
        create: jest.fn(),
        confirm: jest.fn(),
        capture: jest.fn(),
      },
      refunds: {
        create: jest.fn(),
      },
    };
  });

  describe('createPaymentIntent', () => {
    it('should convert amount to cents and invoke Stripe SDK', async () => {
      adapter.stripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_abc',
        status: 'requires_payment_method',
      });

      const result = await adapter.createPaymentIntent({
        amount: 49.99,
        currency: 'USD',
        orderId: 'order-uuid-1',
        userId: 'user-uuid-2',
        metadata: { source: 'web' },
      });

      expect(adapter.stripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 4999,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        metadata: {
          orderId: 'order-uuid-1',
          userId: 'user-uuid-2',
          source: 'web',
        },
      });

      expect(result).toEqual({
        transactionId: 'pi_test_123',
        clientSecret: 'pi_test_123_secret_abc',
        status: 'requires_payment_method',
      });
    });
  });

  describe('capturePayment', () => {
    it('should confirm payment when paymentMethod is passed', async () => {
      adapter.stripe.paymentIntents.confirm.mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 4999,
        currency: 'usd',
      });

      const result = await adapter.capturePayment({
        transactionId: 'pi_test_123',
        paymentMethod: 'pm_card_visa',
      });

      expect(adapter.stripe.paymentIntents.confirm).toHaveBeenCalledWith('pi_test_123', {
        payment_method: 'pm_card_visa',
      });
      expect(result).toEqual({
        transactionId: 'pi_test_123',
        status: 'COMPLETED',
        amount: 49.99,
        currency: 'USD',
      });
    });

    it('should capture authorized payment when no paymentMethod is passed', async () => {
      adapter.stripe.paymentIntents.capture.mockResolvedValue({
        id: 'pi_test_123',
        status: 'succeeded',
        amount: 3000,
        currency: 'usd',
      });

      const result = await adapter.capturePayment({
        transactionId: 'pi_test_123',
      });

      expect(adapter.stripe.paymentIntents.capture).toHaveBeenCalledWith('pi_test_123');
      expect(result.status).toBe('COMPLETED');
      expect(result.amount).toBe(30.0);
    });
  });

  describe('refundPayment', () => {
    it('should invoke Stripe refunds.create with converted cents', async () => {
      adapter.stripe.refunds.create.mockResolvedValue({
        id: 're_test_999',
        status: 'succeeded',
        amount: 2000,
        currency: 'usd',
      });

      const result = await adapter.refundPayment({
        transactionId: 'pi_test_123',
        amount: 20.0,
        reason: 'requested_by_customer',
      });

      expect(adapter.stripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test_123',
        amount: 2000,
        reason: 'requested_by_customer',
      });
      expect(result).toEqual({
        transactionId: 'pi_test_123',
        refundId: 're_test_999',
        status: 'REFUNDED',
        amount: 20.0,
        currency: 'USD',
      });
    });
  });
});
