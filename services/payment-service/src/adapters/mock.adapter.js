import crypto from 'node:crypto';
import { PaymentAdapter } from './payment.adapter.js';

/**
 * Mock payment adapter for offline development and isolated automated testing.
 * Simulates payment intents, captures, and refunds in memory without making external API calls.
 */
export class MockPaymentAdapter extends PaymentAdapter {
  constructor() {
    super();
    /** @type {Map<string, { transactionId: string, clientSecret: string, amount: number, currency: string, orderId: string, userId: string, status: string, metadata: Record<string, any> }>} */
    this.intents = new Map();
  }

  /**
   * Initializes a mock payment intent.
   *
   * @param {Object} params - Intent parameters.
   * @param {number} params.amount - Transaction amount.
   * @param {string} [params.currency='USD'] - Currency code.
   * @param {string} params.orderId - Associated order ID.
   * @param {string} params.userId - Associated user ID.
   * @param {Record<string, any>} [params.metadata={}] - Metadata tags.
   * @returns {Promise<{ transactionId: string, clientSecret: string, status: string }>}
   */
  async createPaymentIntent({ amount, currency = 'USD', orderId, userId, metadata = {} }) {
    const transactionId = `mock_pi_${crypto.randomUUID()}`;
    const clientSecret = `mock_secret_${crypto.randomUUID()}`;

    const intent = {
      transactionId,
      clientSecret,
      amount,
      currency: currency.toUpperCase(),
      orderId,
      userId,
      status: 'REQUIRES_PAYMENT_METHOD',
      metadata,
    };

    this.intents.set(transactionId, intent);

    return {
      transactionId,
      clientSecret,
      status: intent.status,
    };
  }

  /**
   * Simulates capturing an authorized payment intent.
   * If metadata or transaction ID includes 'fail' or 'decline', simulates a gateway rejection.
   *
   * @param {Object} params - Capture parameters.
   * @param {string} params.transactionId - Transaction ID to capture.
   * @param {string} [params.paymentMethod='card'] - Payment method used.
   * @returns {Promise<{ transactionId: string, status: string, amount: number, currency: string }>}
   */
  async capturePayment({ transactionId, paymentMethod = 'card' }) {
    const intent = this.intents.get(transactionId);

    // Support simulating card decline or network failure
    if (transactionId.includes('fail') || (intent && intent.metadata?.simulateFailure)) {
      throw new Error('Mock gateway payment capture failed: Card declined');
    }

    const amount = intent ? intent.amount : 99.99;
    const currency = intent ? intent.currency : 'USD';

    if (intent) {
      intent.status = 'COMPLETED';
      intent.paymentMethod = paymentMethod;
    }

    return {
      transactionId,
      status: 'COMPLETED',
      amount,
      currency,
    };
  }

  /**
   * Simulates refunding a previously captured payment intent.
   *
   * @param {Object} params - Refund parameters.
   * @param {string} params.transactionId - Transaction ID to refund.
   * @param {number} [params.amount] - Refund amount.
   * @param {string} [params.reason='requested_by_customer'] - Reason for refund.
   * @returns {Promise<{ transactionId: string, refundId: string, status: string, amount: number, currency: string, reason: string }>}
   */
  async refundPayment({ transactionId, amount, reason = 'requested_by_customer' }) {
    const intent = this.intents.get(transactionId);
    const refundAmount = amount || (intent ? intent.amount : 99.99);
    const currency = intent ? intent.currency : 'USD';
    const refundId = `mock_re_${crypto.randomUUID()}`;

    if (intent) {
      intent.status = 'REFUNDED';
    }

    return {
      transactionId,
      refundId,
      status: 'REFUNDED',
      amount: refundAmount,
      currency,
      reason,
    };
  }
}

export default MockPaymentAdapter;
