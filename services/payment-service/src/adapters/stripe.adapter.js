import Stripe from 'stripe';
import { PaymentAdapter } from './payment.adapter.js';
import env from '../config/env.js';

/**
 * Concrete payment adapter integrating with the official Stripe API SDK.
 */
export class StripeAdapter extends PaymentAdapter {
  /**
   * @param {string} [secretKey] - Stripe private secret key. Defaults to env.STRIPE_SECRET_KEY.
   */
  constructor(secretKey = env.STRIPE_SECRET_KEY) {
    super();
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2024-04-10',
    });
  }

  /**
   * Creates a Stripe PaymentIntent with automatic payment methods.
   * Converts decimal currency amounts into integer smallest currency unit (cents).
   *
   * @param {Object} params - Payment intent parameters.
   * @param {number} params.amount - Amount in primary currency unit (e.g. 99.99 USD).
   * @param {string} [params.currency='USD'] - ISO 3-letter currency code.
   * @param {string} params.orderId - Unique order ID.
   * @param {string} params.userId - Unique customer ID.
   * @param {Record<string, any>} [params.metadata={}] - Optional metadata.
   * @returns {Promise<{ transactionId: string, clientSecret: string, status: string }>}
   */
  async createPaymentIntent({ amount, currency = 'USD', orderId, userId, metadata = {} }) {
    // Stripe requires integer amounts in the smallest currency unit (e.g., cents for USD)
    const amountInCents = Math.round(amount * 100);

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId,
        userId,
        ...metadata,
      },
    });

    return {
      transactionId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
    };
  }

  /**
   * Confirms or captures a payment intent in Stripe.
   *
   * @param {Object} params - Capture parameters.
   * @param {string} params.transactionId - Stripe PaymentIntent ID (`pi_...`).
   * @param {string} [params.paymentMethod] - Optional payment method token (e.g. `pm_card_visa`).
   * @returns {Promise<{ transactionId: string, status: string, amount: number, currency: string }>}
   */
  async capturePayment({ transactionId, paymentMethod }) {
    let paymentIntent;

    if (paymentMethod) {
      paymentIntent = await this.stripe.paymentIntents.confirm(transactionId, {
        payment_method: paymentMethod,
      });
    } else {
      // If already authorized and requiring manual capture
      paymentIntent = await this.stripe.paymentIntents.capture(transactionId);
    }

    return {
      transactionId: paymentIntent.id,
      status: paymentIntent.status === 'succeeded' ? 'COMPLETED' : paymentIntent.status,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
    };
  }

  /**
   * Creates a refund for a previously succeeded charge in Stripe.
   *
   * @param {Object} params - Refund parameters.
   * @param {string} params.transactionId - Stripe PaymentIntent ID (`pi_...`).
   * @param {number} [params.amount] - Partial amount to refund in primary currency unit.
   * @param {string} [params.reason] - Reason for refund.
   * @returns {Promise<{ transactionId: string, refundId: string, status: string, amount: number, currency: string }>}
   */
  async refundPayment({ transactionId, amount, reason }) {
    const refundParams = {
      payment_intent: transactionId,
    };

    if (amount) {
      refundParams.amount = Math.round(amount * 100);
    }

    if (reason) {
      refundParams.reason = reason;
    }

    const refund = await this.stripe.refunds.create(refundParams);

    return {
      transactionId,
      refundId: refund.id,
      status: refund.status === 'succeeded' ? 'REFUNDED' : refund.status,
      amount: refund.amount / 100,
      currency: refund.currency.toUpperCase(),
    };
  }
}

export default StripeAdapter;
